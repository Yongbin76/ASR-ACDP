const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');
const { Readable } = require('stream');
const { permissionForRuntimeRoute, handleRuntimeRequest, handleRuntimeUpgrade } = require('./http/runtime-surface');
const { permissionForAdminRoute, handleAdminRequest } = require('./http/admin-surface');

const { PrototypeRuntime, latestSnapshotPath } = require('./lib/runtime');
const { buildCorrectedTexts } = require('./lib/runtime-candidates');
const { buildReleaseArtifactPlan } = require('./lib/artifact-store');
const { createAppConfig } = require('./lib/config');
const { loadGovernancePolicies } = require('./lib/governance-policies');
const { createRuntimeWebSocketGovernance } = require('./lib/runtime-ws-governance');
const {
  installRuntimeReleaseFromControl,
  loadRuntimeCurrentState,
  rollbackRuntimeDeployment,
} = require('./lib/runtime-artifacts');
const {
  buildRuntimeStatsUploadPayload,
  currentRuntimePeakLocal,
  localStatsCursor,
  markRuntimeStatsUploaded,
  openRuntimeStatsDatabase,
  recordRuntimeCorrectionLocal,
  recordRuntimePeakLocal,
} = require('./lib/runtime-stats');
const {
  getRuntimeControlRemote,
  heartbeatRuntimeNodeRemote,
  registerRuntimeNodeRemote,
  reportRuntimeApplyResultRemote,
  uploadRuntimeStatsRemote,
  runtimeControlClientEnabled,
} = require('./lib/runtime-control-client');
const { knownRoles, knownUsers, buildAuthContext, requirePermission } = require('./lib/admin-auth');
const { buildReleaseGateSummary } = require('./lib/release-gates');
const { importValidationFeeds, listValidationFeedSources } = require('./lib/validation-feed-importer');
const { listImportTemplates, getImportTemplate, resolveImportTemplateAsset } = require('./lib/import-templates');
const { createImportJob, confirmImportJob, cancelImportJob } = require('./lib/import-jobs');
const {
  listConsoleHelpArticles,
  getConsoleHelpArticle,
  resolveConsoleHelpSourceFile,
} = require('./lib/console-help');
const {
  getConsoleOverview,
  getConsoleWorkbench,
  getConsoleRuntimeRollout,
  getRuntimeControlVerificationReport,
  listConsoleRuntimeNodes,
  listConsoleRuntimeNodeRegistry,
  getConsoleRuntimeNodeDetail,
  getConsoleRuntimeNodeRegistryDetail,
  listConsoleTerms,
  getConsoleTermDetail,
  listConsoleReviews,
  getConsoleReviewDetail,
  listConsoleReleases,
  getConsoleReleaseGateDetail,
  getConsoleReleaseDetail,
  listConsoleBusinessProperties,
  listConsoleBusinessAttributeDefinitions,
  listConsoleSourceTypes,
  listConsoleValidationCases,
  getConsoleValidationCaseDetail,
  listRelatedTermsForValidationCase,
  listConsoleImportJobs,
  getConsoleImportJobDetail,
} = require('./lib/console-service');
const {
  openDatabase,
  countTerms,
  getDashboardSummary,
  listTerms,
  listTermIdsByFilters,
  getTerm,
  getTermRules,
  getTermPinyinProfile,
  listPinyinProfiles,
  listPinyinConflicts,
  getPinyinConflictDetail,
  listPinyinComparisons,
  getTermPinyinComparison,
  generateTermPinyinCandidates,
  submitPinyinCandidateReview,
  createTerm,
  updateTerm,
  updateTermStatus,
  upsertTermRules,
  upsertTermPinyinProfile,
  importSeedTerms,
  getBuildableTerms,
  createRelease,
  getRelease,
  listReleases,
  getCurrentPublishedRelease,
  getCurrentCanaryRelease,
  listGrayPolicies,
  getActiveGrayPolicy,
  createGrayPolicy,
  disableGrayPolicy,
  markPublishedRelease,
  getLatestReviewTaskByTarget,
  getReleaseApprovalPolicy,
  getReleaseReviewSummary,
  submitTermReview,
  batchSubmitTermReview,
  submitReleaseReview,
  listReviewTasks,
  batchApproveReviewTasks,
  batchRejectReviewTasks,
  approveReviewTask,
  rejectReviewTask,
  listValidationCases,
  listValidationCaseIdsByFilters,
  listAllValidationCasesByFilters,
  getImportJob,
  listImportJobRows,
  importValidationCases,
  createValidationCase,
  disableValidationCase,
  batchDisableValidationCases,
  listAuditLogs,
  getRuntimeNode,
  listRuntimeNodes,
  listRuntimeNodeRegistry,
  getRuntimeNodeRegistryItem,
  createRuntimeNodeRegistryItem,
  updateRuntimeNodeRegistryItem,
  enableRuntimeNodeRegistryItem,
  disableRuntimeNodeRegistryItem,
  rotateRuntimeNodeRegistrySecret,
  assertRuntimeNodeRegistryAccess,
  registerRuntimeNode,
  heartbeatRuntimeNode,
  getRuntimeControlState,
  setRuntimeDesiredRelease,
  getRuntimeControlViewForNode,
  recordRuntimeNodeApplyResult,
  uploadRuntimeNodeStats,
  recordRuntimeCorrection,
  recordRuntimePeak,
  getRuntimePeakStat,
  batchDisableTerms,
} = require('./lib/platform-db');
const { buildSnapshot, writeSnapshot, publishToLatest } = require('./lib/snapshot-builder');

/**
 * 功能：构建原型 HTTP/WebSocket 服务应用实例。
 * 输入：`appConfig` 应用配置对象，可选 `surfaceOptions` 控制启用的服务面。
 * 输出：包含 `start/stop`、`server`、`db` 和运行时刷新能力的应用对象。
 */
function createPrototypeApp(appConfig = createAppConfig(), surfaceOptions = {}) {
  const { server: serverConfig, resolvedPaths, auth: authConfig } = appConfig;
  const surfaces = {
    runtime: surfaceOptions.runtime !== false,
    admin: surfaceOptions.admin !== false,
  };
  const db = openDatabase(appConfig);
  const runtimeStats = {
    startedAt: new Date().toISOString(),
    inFlight: 0,
    totalCorrections: 0,
    httpCorrections: 0,
    wsCorrections: 0,
    totalErrors: 0,
    recentLatencyMs: [],
    lastCorrectionAt: null,
    lastErrorAt: null,
  };
  const runtimeStatsDb = surfaces.runtime ? openRuntimeStatsDatabase(appConfig) : null;
  const runtimeWebSocketGovernance = createRuntimeWebSocketGovernance(authConfig);

  /**
   * 功能：解析请求中的操作人。
   * 输入：`req` HTTP 请求对象，可选 `payload`。
   * 输出：操作人字符串。
   */
  function operatorFrom(req, payload = {}) {
    return payload.operator || req.headers['x-operator'] || 'prototype_user';
  }

  /**
   * 功能：解析请求中的角色名。
   * 输入：`req` HTTP 请求对象。
   * 输出：角色字符串。
   */
  function roleFrom(req) {
    return req.headers['x-role'] || 'dict_admin';
  }

  /**
   * 功能：解析请求中的用户 ID。
   * 输入：`req` HTTP 请求对象，可选 `payload`。
   * 输出：用户 ID 字符串。
   */
  function userIdFrom(req, payload = {}) {
    return payload.userId || req.headers['x-user-id'] || operatorFrom(req, payload);
  }

  /**
   * 功能：根据请求构建鉴权上下文。
   * 输入：`req` HTTP 请求对象，可选 `payload`。
   * 输出：鉴权上下文对象。
   */
  function authContextFrom(req, payload = {}) {
    return buildAuthContext({
      userId: userIdFrom(req, payload),
      operator: operatorFrom(req, payload),
      role: roleFrom(req),
      appConfig,
    });
  }

  /**
   * 功能：要求某个请求具备指定权限。
   * 输入：`req` 请求对象，`permission` 权限名，可选 `payload`。
   * 输出：通过时返回鉴权上下文，失败时抛错。
   */
  function authorize(req, permission, payload = {}) {
    return requirePermission(authContextFrom(req, payload), permission);
  }

  /**
   * 功能：从 Authorization 头中提取 Bearer Token。
   * 输入：`req` HTTP 请求对象。
   * 输出：Token 字符串；不存在时为空字符串。
   */
  function runtimeBearerTokenFrom(req) {
    const value = String(req.headers.authorization || '').trim();
    if (!value.toLowerCase().startsWith('bearer ')) {
      return '';
    }
    return value.slice(7).trim();
  }

  /**
   * 功能：要求运行时接口调用携带合法 Bearer Token。
   * 输入：`req` HTTP 请求对象。
   * 输出：通过时无显式返回，失败时抛错。
   */
  function requireRuntimeToken(req) {
    const requiredToken = String(authConfig.runtimeBearerToken || '').trim();
    if (!requiredToken) {
      return;
    }
    const providedToken = runtimeBearerTokenFrom(req);
    if (
      providedToken
      && Buffer.byteLength(providedToken) === Buffer.byteLength(requiredToken)
      && crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(requiredToken))
    ) {
      return;
    }
    const error = new Error('runtime token required');
    error.statusCode = 401;
    error.code = 'runtime_token_required';
    throw error;
  }

  /**
   * 功能：根据路由和方法映射所需权限。
   * 输入：HTTP 方法 `method`、路径 `pathname`。
   * 输出：权限字符串或 `null`。
   */
  function permissionForRoute(method, pathname) {
    const runtimePermission = surfaces.runtime ? permissionForRuntimeRoute(method, pathname) : null;
    if (runtimePermission) {
      return runtimePermission;
    }
    return surfaces.admin ? permissionForAdminRoute(method, pathname) : null;
  }

  /**
   * 功能：在空库场景下自动导入 seed 词条。
   * 输入：无。
   * 输出：无显式返回。
   */
  function ensureBootstrapped() {
    if (countTerms(db) === 0 && fs.existsSync(resolvedPaths.seedCatalogFile)) {
      const seeds = JSON.parse(fs.readFileSync(resolvedPaths.seedCatalogFile, 'utf8').replace(/^\uFEFF/, ''));
      importSeedTerms(db, seeds);
    }
  }

  /**
   * 功能：基于当前可发布词条构建新的 release。
   * 输入：构建摘要 `summary`、操作人 `operator`。
   * 输出：新 release 对象。
   */
  function buildRelease(summary, operator) {
    const terms = getBuildableTerms(db);
    if (terms.length === 0) {
      throw new Error('no approved or published terms available for build');
    }

    const snapshot = buildSnapshot(terms);
    const releaseId = `rel_${Date.now()}`;
    const releaseDir = path.join(resolvedPaths.releasesDir, releaseId);
    const files = writeSnapshot(releaseDir, snapshot);
    const artifactStore = buildReleaseArtifactPlan(appConfig, {
      releaseId,
      manifestPath: files.manifestPath,
      snapshotPath: files.snapshotPath,
      packagePath: path.join(releaseDir, 'package.tar.gz'),
    });
    const release = createRelease(db, {
      releaseId,
      version: snapshot.manifest.version,
      status: 'built',
      summary,
      artifactDir: releaseDir,
      snapshotPath: files.snapshotPath,
      manifestPath: files.manifestPath,
      termCount: terms.length,
      termIds: terms.map((item) => item.termId),
    }, operator);
    return {
      ...release,
      artifactStore,
    };
  }

  /**
   * 功能：把指定 release 激活为 published，并同步 latest 快照。
   * 输入：releaseId、操作人、模式（publish/rollback）。
   * 输出：激活后的 release 对象。
   */
  function activatePublishedRelease(releaseId, operator, mode = 'publish') {
    const release = getRelease(db, releaseId);
    if (!release) {
      throw new Error(`release not found: ${releaseId}`);
    }
    publishToLatest(appConfig, release);
    return markPublishedRelease(db, releaseId, operator, mode);
  }

  /**
   * 功能：汇总 release 当前审批状态。
   * 输入：`releaseId` 版本号。
   * 输出：审批状态摘要对象。
   */
  function releaseApprovalState(releaseId) {
    const review = getLatestReviewTaskByTarget(db, releaseId ? 'release' : '', releaseId || '', 'release_publish_review');
    const approvalPolicy = getReleaseApprovalPolicy(db, releaseId);
    const approvalSummary = getReleaseReviewSummary(db, releaseId);
    if (!review) {
      return {
        status: 'not_submitted',
        taskId: null,
        submittedBy: null,
        reviewedBy: null,
        reviewedAt: null,
        requiredApprovals: approvalPolicy.requiredApprovals,
        approvedCount: approvalSummary.approvedCount,
        approvedReviewers: approvalSummary.approvedReviewers,
        isHighRisk: approvalPolicy.isHighRisk,
        reasons: approvalPolicy.reasons,
        highRiskTermCount: approvalPolicy.highRiskTermCount,
      };
    }
    let status = review.status;
    if (approvalSummary.approvedCount > 0 && approvalSummary.approvedCount < approvalPolicy.requiredApprovals) {
      status = 'partially_approved';
    } else if (approvalSummary.approvedCount >= approvalPolicy.requiredApprovals) {
      status = 'approved';
    }
    return {
      status,
      taskId: review.taskId,
      submittedBy: review.submittedBy,
      reviewedBy: review.reviewedBy,
      reviewedAt: review.reviewedAt,
      requiredApprovals: approvalPolicy.requiredApprovals,
      approvedCount: approvalSummary.approvedCount,
      approvedReviewers: approvalSummary.approvedReviewers,
      isHighRisk: approvalPolicy.isHighRisk,
      reasons: approvalPolicy.reasons,
      highRiskTermCount: approvalPolicy.highRiskTermCount,
    };
  }

  /**
   * 功能：在 publish/canary 前校验审批状态与 release gate。
   * 输入：releaseId、操作人、动作名。
   * 输出：包含 release 和 approval 的对象；不满足条件时抛错。
   */
  function ensureReleaseApprovalForExposure(releaseId, operator, action = 'publish') {
    const release = getRelease(db, releaseId);
    if (!release) {
      throw new Error(`release not found: ${releaseId}`);
    }
    const approval = releaseApprovalState(releaseId);
    const gate = buildReleaseGateSummary(db, releaseId);
    const releasePolicies = loadGovernancePolicies(appConfig).releasePolicies;
    if (approval.status !== 'approved') {
      const error = new Error(`release ${action} requires an approved release review`);
      error.statusCode = 409;
      error.code = 'release_review_required';
      throw error;
    }
    if (gate.blocked) {
      const error = new Error(`release ${action} blocked by release gates`);
      error.statusCode = 409;
      error.code = 'release_gate_blocked';
      error.gate = gate;
      throw error;
    }
    if (
      releasePolicies.reviewerPublisherSeparationRequired !== false
      && Array.isArray(approval.approvedReviewers)
      && approval.approvedReviewers.includes(String(operator || ''))
    ) {
      const error = new Error(`release ${action} requires review and execution by different operators`);
      error.statusCode = 409;
      error.code = 'release_separation_required';
      throw error;
    }
    return { release, approval };
  }

  /**
   * 功能：在 latest 快照不存在时自动构建 bootstrap release。
   * 输入：无。
   * 输出：无显式返回。
   */
  function bootstrapInitialRelease() {
    const latestSnapshot = latestSnapshotPath(appConfig);
    if (fs.existsSync(latestSnapshot)) {
      return;
    }
    const terms = getBuildableTerms(db);
    if (terms.length === 0) {
      return;
    }
    const release = buildRelease('bootstrap release', 'bootstrap');
    publishToLatest(appConfig, release);
    markPublishedRelease(db, release.releaseId, 'bootstrap', 'publish');
  }

  /**
   * 功能：为 release 加载对应的运行时实例。
   * 输入：`release` 对象。
   * 输出：`PrototypeRuntime` 实例或 `null`。
   */
  function loadRuntimeForRelease(release) {
    if (!release || !release.snapshotPath || !fs.existsSync(release.snapshotPath)) {
      return null;
    }
    return PrototypeRuntime.fromSnapshot(release.snapshotPath);
  }

  const runtimeState = {
    stable: null,
    canary: null,
    grayPolicy: null,
  };
  const runtimeAgentState = {
    registered: false,
    syncTimer: null,
    statsFlushTimer: null,
    localDeployment: loadRuntimeCurrentState(appConfig),
    lastApplyStatus: '',
    lastApplyError: '',
  };
  const runtimeRemoteClient = ((appConfig || {}).runtimeControl || {}).client || null;

  /**
   * 功能：根据当前 stable/canary release 和灰度策略刷新运行时状态。
   * 输入：无。
   * 输出：无显式返回。
   */
  function refreshRuntimeState() {
    const localSnapshotPath = runtimeAgentState.localDeployment && runtimeAgentState.localDeployment.snapshotPath
      ? runtimeAgentState.localDeployment.snapshotPath
      : '';
    const localRuntime = localSnapshotPath && fs.existsSync(localSnapshotPath)
      ? PrototypeRuntime.fromSnapshot(localSnapshotPath)
      : null;
    const stableRelease = getCurrentPublishedRelease(db);
    const canaryRelease = getCurrentCanaryRelease(db);
    const grayPolicy = getActiveGrayPolicy(db);
    const latestSnapshot = latestSnapshotPath(appConfig);
    const latestRuntime = fs.existsSync(latestSnapshot)
      ? PrototypeRuntime.fromSnapshot(latestSnapshot)
      : null;

    runtimeState.stable = localRuntime
      || loadRuntimeForRelease(stableRelease)
      || latestRuntime;
    runtimeState.canary = grayPolicy && canaryRelease && grayPolicy.releaseId === canaryRelease.releaseId
      ? loadRuntimeForRelease(canaryRelease)
      : null;
    runtimeState.grayPolicy = runtimeState.canary ? grayPolicy : null;
  }

  /**
   * 功能：对流量键做稳定哈希，用于灰度路由。
   * 输入：`value` 流量键。
   * 输出：无符号 32 位整数哈希值。
   */
  function hashTrafficKey(value) {
    let hash = 2166136261;
    const input = String(value || '');
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /**
   * 功能：为一次运行时请求选择 stable 或 canary 运行时。
   * 输入：`payload` 请求体对象。
   * 输出：包含 runtime、route、trafficKey、bucket 的对象。
   */
  function selectRuntime(payload = {}) {
    const trafficKey = String(payload.trafficKey || payload.callId || '').trim();
    if (runtimeState.canary && runtimeState.grayPolicy && trafficKey) {
      const bucket = hashTrafficKey(trafficKey) % 100;
      if (bucket < Number(runtimeState.grayPolicy.percentage || 0)) {
        return { runtime: runtimeState.canary, route: 'canary', trafficKey, bucket };
      }
    }
    return { runtime: runtimeState.stable, route: 'stable', trafficKey, bucket: null };
  }

  ensureBootstrapped();
  bootstrapInitialRelease();
  refreshRuntimeState();
  const consoleClientRoot = resolvedPaths.consoleClientDir || path.join(appConfig.projectRoot, 'console', 'client');

  /**
   * 功能：处理`runtimeNodeIdentity`相关逻辑。
   * 输入：无。
   * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
   */
  function runtimeNodeIdentity() {
    const runtimeControl = appConfig.runtimeControl || {};
    const currentVersion = runtimeAgentState.localDeployment && runtimeAgentState.localDeployment.currentVersion
      ? runtimeAgentState.localDeployment.currentVersion
      : (runtimeState.stable ? String(runtimeState.stable.getCurrentVersion().version || '') : '');
    return {
      nodeId: String(runtimeControl.nodeId || '').trim(),
      nodeName: String(runtimeControl.nodeName || runtimeControl.nodeId || '').trim(),
      env: String(runtimeControl.nodeEnv || '').trim(),
      address: String(runtimeControl.nodeAddress || '').trim(),
      runtimeVersion: String((appConfig.project || {}).version || '').trim(),
      currentVersion,
      lastApplyStatus: String(runtimeAgentState.lastApplyStatus || '').trim(),
      lastError: String(runtimeAgentState.lastApplyError || '').trim(),
      runtimeStatsCursor: runtimeStatsDb ? String(localStatsCursor(runtimeStatsDb)) : '',
    };
  }

  /**
   * 功能：同步`runtime control`相关逻辑。
   * 输入：无。
   * 输出：`Promise`，解析值为当前处理结果。
   */
  async function syncRuntimeControl() {
    if (!surfaces.runtime || !runtimeControlClientEnabled(appConfig)) {
      return { skipped: true, reason: 'runtime_control_disabled' };
    }
    const identity = runtimeNodeIdentity();
    if (!identity.nodeId) {
      return { skipped: true, reason: 'runtime_node_id_missing' };
    }

    if (!runtimeAgentState.registered) {
      if (runtimeRemoteClient && typeof runtimeRemoteClient.registerRuntimeNodeRemote === 'function') {
        await runtimeRemoteClient.registerRuntimeNodeRemote(identity);
      } else {
        await registerRuntimeNodeRemote(appConfig, identity);
      }
      runtimeAgentState.registered = true;
    } else {
      if (runtimeRemoteClient && typeof runtimeRemoteClient.heartbeatRuntimeNodeRemote === 'function') {
        await runtimeRemoteClient.heartbeatRuntimeNodeRemote(identity);
      } else {
        await heartbeatRuntimeNodeRemote(appConfig, identity);
      }
    }

    const controlView = runtimeRemoteClient && typeof runtimeRemoteClient.getRuntimeControlRemote === 'function'
      ? await runtimeRemoteClient.getRuntimeControlRemote(identity.nodeId)
      : await getRuntimeControlRemote(appConfig, identity.nodeId);
    if (!controlView || !controlView.desiredVersion || !controlView.artifactMetadata) {
      return { skipped: true, reason: 'runtime_control_empty' };
    }

    if (
      runtimeAgentState.localDeployment
      && String(runtimeAgentState.localDeployment.currentVersion || '').trim() === String(controlView.desiredVersion || '').trim()
      && runtimeAgentState.localDeployment.snapshotPath
      && fs.existsSync(runtimeAgentState.localDeployment.snapshotPath)
    ) {
      return {
        skipped: true,
        reason: 'already_on_desired_version',
        currentVersion: runtimeAgentState.localDeployment.currentVersion,
      };
    }

    try {
      const installedState = await installRuntimeReleaseFromControl(appConfig, controlView);
      runtimeAgentState.localDeployment = installedState.activeRelease;
      if (((appConfig || {}).runtimeControl || {}).verifyInstalledRelease) {
        await Promise.resolve((appConfig.runtimeControl.verifyInstalledRelease)(installedState.activeRelease));
      }
      runtimeAgentState.lastApplyStatus = 'success';
      runtimeAgentState.lastApplyError = '';
      refreshRuntimeState();
      try {
        if (runtimeRemoteClient && typeof runtimeRemoteClient.reportRuntimeApplyResultRemote === 'function') {
          await runtimeRemoteClient.reportRuntimeApplyResultRemote(identity.nodeId, {
            status: 'success',
            desiredVersion: controlView.desiredVersion,
            currentVersion: installedState.activeRelease.currentVersion,
          });
        } else {
          await reportRuntimeApplyResultRemote(appConfig, identity.nodeId, {
            status: 'success',
            desiredVersion: controlView.desiredVersion,
            currentVersion: installedState.activeRelease.currentVersion,
          });
        }
      } catch {}
      return {
        ok: true,
        applied: true,
        currentVersion: installedState.activeRelease.currentVersion,
        desiredVersion: controlView.desiredVersion,
      };
    } catch (error) {
      let applyStatus = 'failed';
      let currentVersion = identity.currentVersion;
      runtimeAgentState.lastApplyError = error.message || String(error);
      try {
        const rolledBackState = rollbackRuntimeDeployment(appConfig, {
          releaseId: (((controlView || {}).artifactMetadata || {}).releaseId) || '',
          desiredVersion: controlView.desiredVersion,
          error: runtimeAgentState.lastApplyError,
        });
        runtimeAgentState.localDeployment = rolledBackState.activeRelease;
        runtimeAgentState.lastApplyStatus = 'rolled_back';
        applyStatus = 'rolled_back';
        currentVersion = rolledBackState.activeRelease ? rolledBackState.activeRelease.currentVersion : currentVersion;
        refreshRuntimeState();
      } catch {
        runtimeAgentState.lastApplyStatus = 'failed';
      }
      try {
        if (runtimeRemoteClient && typeof runtimeRemoteClient.reportRuntimeApplyResultRemote === 'function') {
          await runtimeRemoteClient.reportRuntimeApplyResultRemote(identity.nodeId, {
            status: applyStatus,
            desiredVersion: controlView.desiredVersion,
            currentVersion,
            lastError: runtimeAgentState.lastApplyError,
          });
        } else {
          await reportRuntimeApplyResultRemote(appConfig, identity.nodeId, {
            status: applyStatus,
            desiredVersion: controlView.desiredVersion,
            currentVersion,
            lastError: runtimeAgentState.lastApplyError,
          });
        }
      } catch {}
      throw error;
    }
  }

  /**
   * 功能：处理`flushRuntimeStats`相关逻辑。
   * 输入：无。
   * 输出：`Promise`，解析值为当前处理结果。
   */
  async function flushRuntimeStats() {
    if (!surfaces.runtime || !runtimeControlClientEnabled(appConfig) || !runtimeStatsDb) {
      return { skipped: true, reason: 'runtime_stats_disabled' };
    }
    const identity = runtimeNodeIdentity();
    if (!identity.nodeId) {
      return { skipped: true, reason: 'runtime_node_id_missing' };
    }
    const payload = buildRuntimeStatsUploadPayload(runtimeStatsDb, identity.nodeId, {
      maxBatchSize: Number((appConfig.runtimeControl || {}).statsFlushMaxBatchSize || 1000),
    });
    if (!payload) {
      return { skipped: true, reason: 'runtime_stats_empty' };
    }
    const response = runtimeRemoteClient && typeof runtimeRemoteClient.uploadRuntimeStatsRemote === 'function'
      ? await runtimeRemoteClient.uploadRuntimeStatsRemote(identity.nodeId, payload)
      : await uploadRuntimeStatsRemote(appConfig, identity.nodeId, payload);
    markRuntimeStatsUploaded(runtimeStatsDb, payload);
    return response;
  }

  /**
   * 功能：发送 JSON HTTP 响应。
   * 输入：响应对象、状态码、任意 payload。
   * 输出：无显式返回。
   */
  function sendJson(res, code, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  }

  /**
   * 功能：发送 HTML HTTP 响应。
   * 输入：响应对象、HTML 字符串。
   * 输出：无显式返回。
   */
  function sendHtml(res, html) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }

  /**
   * 功能：根据文件扩展名发送静态文件。
   * 输入：响应对象、文件绝对路径。
   * 输出：无显式返回。
   */
  function sendFile(res, filePath, options = {}) {
    const extension = path.extname(filePath).toLowerCase();
    const contentType = extension === '.css'
      ? 'text/css; charset=utf-8'
      : extension === '.js'
        ? 'application/javascript; charset=utf-8'
        : extension === '.json'
          ? 'application/json; charset=utf-8'
          : extension === '.md'
            ? 'text/markdown; charset=utf-8'
          : extension === '.csv'
            ? 'text/csv; charset=utf-8'
            : extension === '.txt'
              ? 'text/plain; charset=utf-8'
              : 'application/octet-stream';
    const rawBody = fs.readFileSync(filePath);
    const shouldPrefixUtf8Bom = extension === '.csv' && options.downloadName;
    const body = shouldPrefixUtf8Bom && !(rawBody[0] === 0xef && rawBody[1] === 0xbb && rawBody[2] === 0xbf)
      ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), rawBody])
      : rawBody;
    const headers = {
      'Content-Type': contentType,
      'Content-Length': body.length,
      ...(options.headers || {}),
    };
    if (options.downloadName) {
      const fallbackName = String(options.downloadName || 'download')
        .replace(/[^\w.\-]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'download';
      headers['Content-Disposition'] = `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(options.downloadName)}`;
    }
    res.writeHead(200, {
      ...headers,
    });
    res.end(body);
  }

  /**
   * 功能：读取并解析请求体 JSON。
   * 输入：`req` HTTP 请求对象。
   * 输出：Promise，解析为请求体对象。
   */
  function readJson(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * 功能：读取请求体原始 Buffer。
   * 输入：`req` HTTP 请求对象。
   * 输出：Promise，解析为 Buffer。
   */
  function readBodyBuffer(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  /**
   * 功能：解析简单 multipart/form-data 请求。
   * 输入：`req` HTTP 请求对象。
   * 输出：包含 `fields/files` 的对象。
   */
  async function readMultipartForm(req) {
    const contentType = String(req.headers['content-type'] || '');
    const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
    if (!boundaryMatch) {
      throw new Error('multipart boundary is required');
    }
    const boundary = `--${boundaryMatch[1]}`;
    const body = await readBodyBuffer(req);
    const text = body.toString('binary');
    const parts = text.split(boundary).slice(1, -1);
    const fields = {};
    const files = {};

    for (const part of parts) {
      const trimmed = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
      if (!trimmed) continue;
      const separatorIndex = trimmed.indexOf('\r\n\r\n');
      if (separatorIndex === -1) continue;
      const rawHeaders = trimmed.slice(0, separatorIndex);
      let rawValue = trimmed.slice(separatorIndex + 4);
      rawValue = rawValue.replace(/\r\n$/, '');
      const disposition = rawHeaders.split('\r\n').find((line) => /^content-disposition:/i.test(line));
      if (!disposition) continue;
      const nameMatch = disposition.match(/name="([^"]+)"/i);
      if (!nameMatch) continue;
      const fieldName = nameMatch[1];
      const fileNameMatch = disposition.match(/filename="([^"]*)"/i);
      const contentTypeLine = rawHeaders.split('\r\n').find((line) => /^content-type:/i.test(line));
      if (fileNameMatch && fileNameMatch[1]) {
        files[fieldName] = {
          fileName: fileNameMatch[1],
          contentType: contentTypeLine ? contentTypeLine.split(':').slice(1).join(':').trim() : 'application/octet-stream',
          buffer: Buffer.from(rawValue, 'binary'),
        };
      } else {
        fields[fieldName] = Buffer.from(rawValue, 'binary').toString('utf8');
      }
    }

    return { fields, files };
  }

  /**
   * 功能：根据正则模式提取路径参数。
   * 输入：`pathname` 路径字符串，`pattern` 正则表达式。
   * 输出：匹配到的捕获组数组或 `null`。
   */
  function routeParams(pathname, pattern) {
    const match = pathname.match(pattern);
    return match ? match.slice(1) : null;
  }

  /**
   * 功能：把任意值转成 CSV 单元格文本。
   * 输入：任意值。
   * 输出：符合 CSV 转义规则的字符串。
   */
  function csvCell(value) {
    const text = String(value == null ? '' : value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  /**
   * 功能：发送 CSV 附件下载响应。
   * 输入：响应对象、文件名、表头数组、数据行数组。
   * 输出：无显式返回；直接写出响应。
   */
  function sendCsvDownload(res, filename, headers, rows) {
    const body = [headers.join(',')]
      .concat(rows.map((row) => row.map(csvCell).join(',')))
      .join('\n');
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Content-Disposition': `attachment; filename="${filename}.csv"; filename*=UTF-8''${encodeURIComponent(`${filename}.csv`)}`,
    });
    res.end(body);
  }

  /**
   * 功能：从查询参数构造词条筛选条件。
   * 输入：URLSearchParams 对象。
   * 输出：词条筛选对象。
   */
  function termFiltersFromSearch(searchParams) {
    return {
      query: searchParams.get('query') || '',
      categoryCode: searchParams.get('categoryCode') || '',
      status: searchParams.get('status') || '',
      sourceType: searchParams.get('sourceType') || '',
      riskLevel: searchParams.get('riskLevel') || '',
      sortBy: searchParams.get('sortBy') || 'updated_at',
      sortDirection: searchParams.get('sortDirection') || 'desc',
    };
  }

  /**
   * 功能：从请求体构造词条筛选条件。
   * 输入：请求体对象。
   * 输出：词条筛选对象。
   */
  function termFiltersFromPayload(payload = {}) {
    const filters = payload.filters || {};
    return {
      query: filters.query || '',
      categoryCode: filters.categoryCode || '',
      status: filters.status || '',
      sourceType: filters.sourceType || '',
      riskLevel: filters.riskLevel || '',
      sortBy: filters.sortBy || 'updated_at',
      sortDirection: filters.sortDirection || 'desc',
    };
  }

  /**
   * 功能：从查询参数构造验证样本筛选条件。
   * 输入：URLSearchParams 对象。
   * 输出：验证样本筛选对象。
   */
  function validationFiltersFromSearch(searchParams) {
    return {
      enabled: searchParams.get('enabled'),
      sourceType: searchParams.get('sourceType') || '',
      query: searchParams.get('query') || '',
    };
  }

  /**
   * 功能：从请求体构造验证样本筛选条件。
   * 输入：请求体对象。
   * 输出：验证样本筛选对象。
   */
  function validationFiltersFromPayload(payload = {}) {
    const filters = payload.filters || {};
    return {
      enabled: filters.enabled,
      sourceType: filters.sourceType || '',
      query: filters.query || '',
    };
  }

  /**
   * 功能：记录单次运行时请求的延迟样本。
   * 输入：`durationMs` 请求耗时。
   * 输出：无显式返回。
   */
  function recordRuntimeLatency(durationMs) {
    runtimeStats.recentLatencyMs.push(Number(durationMs.toFixed(2)));
    if (runtimeStats.recentLatencyMs.length > 2000) {
      runtimeStats.recentLatencyMs.shift();
    }
  }

  /**
   * 功能：计算数值数组的百分位数。
   * 输入：`values` 数值数组，`ratio` 百分位比例。
   * 输出：对应百分位数值。
   */
  function percentile(values, ratio) {
    if (!values.length) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
    return sorted[index];
  }

  /**
   * 功能：生成当前运行时统计快照。
   * 输入：无。
   * 输出：运行时统计对象。
   */
  function currentRuntimeStats() {
    const latencies = runtimeStats.recentLatencyMs;
    const avgLatencyMs = latencies.length > 0
      ? Number((latencies.reduce((sum, value) => sum + value, 0) / latencies.length).toFixed(2))
      : 0;
    const peak = runtimeControlClientEnabled(appConfig) && runtimeStatsDb
      ? currentRuntimePeakLocal(runtimeStatsDb)
      : getRuntimePeakStat(db);
    return {
      startedAt: runtimeStats.startedAt,
      inFlight: runtimeStats.inFlight,
      peak,
      totalCorrections: runtimeStats.totalCorrections,
      httpCorrections: runtimeStats.httpCorrections,
      wsCorrections: runtimeStats.wsCorrections,
      totalErrors: runtimeStats.totalErrors,
      lastCorrectionAt: runtimeStats.lastCorrectionAt,
      lastErrorAt: runtimeStats.lastErrorAt,
      activeWebSocketConnections: webSocketClients.size,
      latency: {
        sampleCount: latencies.length,
        avgLatencyMs,
        p50LatencyMs: Number(percentile(latencies, 0.5).toFixed(2)),
        p95LatencyMs: Number(percentile(latencies, 0.95).toFixed(2)),
        maxLatencyMs: Number((latencies.length > 0 ? Math.max(...latencies) : 0).toFixed(2)),
      },
      websocketGovernance: runtimeWebSocketGovernance.snapshot(),
    };
  }

  /**
   * 功能：执行一次文本纠错。
   * 输入：`payload` 纠错请求体。
   * 输出：包含 correctedText、matches、candidates 等字段的结果对象。
   */
  function runCorrection(payload = {}) {
    if (!payload.text) {
      const error = new Error('text is required');
      error.statusCode = 400;
      error.code = 'missing_text';
      throw error;
    }
    const selected = selectRuntime(payload);
    if (!selected.runtime) {
      const error = new Error('runtime snapshot is not ready');
      error.statusCode = 503;
      error.code = 'runtime_not_ready';
      throw error;
    }
    const result = selected.runtime.match(payload.text, {
      enablePinyinChannel: payload.enablePinyinChannel !== false,
      enablePinyinAutoReplace: payload.enablePinyinAutoReplace !== false,
    });
    return {
      route: selected.route,
      trafficKey: selected.trafficKey,
      bucket: selected.bucket,
      ...result,
    };
  }

  /**
   * 功能：执行一次候选纠错，返回主结果与候选整句集合。
   * 输入：`payload` 候选纠错请求体。
   * 输出：包含 `correctedTexts` 以及底层匹配细节的结果对象。
   */
  function runCorrectionCandidates(payload = {}) {
    if (!payload.text) {
      const error = new Error('text is required');
      error.statusCode = 400;
      error.code = 'missing_text';
      throw error;
    }
    const selected = selectRuntime(payload);
    if (!selected.runtime) {
      const error = new Error('runtime snapshot is not ready');
      error.statusCode = 503;
      error.code = 'runtime_not_ready';
      throw error;
    }
    const detail = selected.runtime.matchDetailed(payload.text, {
      enablePinyinChannel: payload.enablePinyinChannel !== false,
      enablePinyinAutoReplace: payload.enablePinyinAutoReplace !== false,
    });
    return {
      route: selected.route,
      trafficKey: selected.trafficKey,
      bucket: selected.bucket,
      rawText: detail.rawText,
      correctedTexts: buildCorrectedTexts(detail),
      matches: detail.matches,
      candidates: detail.candidates,
      blocked: detail.blocked,
    };
  }

  /**
   * 功能：执行纠错并累计运行时统计。
   * 输入：`payload` 纠错请求体，`channel` 调用通道（http/ws）。
   * 输出：纠错结果对象。
   */
  function executeCorrection(payload, channel) {
    runtimeStats.inFlight += 1;
    if (runtimeControlClientEnabled(appConfig) && runtimeStatsDb) {
      recordRuntimePeakLocal(runtimeStatsDb, runtimeStats.inFlight);
    } else {
      recordRuntimePeak(db, runtimeStats.inFlight);
    }
    const startedAt = Date.now();
    try {
      const result = runCorrection(payload);
      runtimeStats.totalCorrections += 1;
      if (channel === 'ws') {
        runtimeStats.wsCorrections += 1;
      } else {
        runtimeStats.httpCorrections += 1;
      }
      runtimeStats.lastCorrectionAt = new Date().toISOString();
      recordRuntimeLatency(Date.now() - startedAt);
      if (runtimeControlClientEnabled(appConfig) && runtimeStatsDb) {
        recordRuntimeCorrectionLocal(runtimeStatsDb, {
          channel,
          result,
        });
      } else {
        recordRuntimeCorrection(db, {
          channel,
          result,
        });
      }
      return result;
    } catch (error) {
      runtimeStats.totalErrors += 1;
      runtimeStats.lastErrorAt = new Date().toISOString();
      throw error;
    } finally {
      runtimeStats.inFlight = Math.max(0, runtimeStats.inFlight - 1);
    }
  }

  /**
   * 功能：执行候选纠错并累计运行时统计。
   * 输入：`payload` 候选纠错请求体，`channel` 调用通道。
   * 输出：候选纠错结果对象。
   */
  function executeCorrectionCandidates(payload, channel) {
    runtimeStats.inFlight += 1;
    if (runtimeControlClientEnabled(appConfig) && runtimeStatsDb) {
      recordRuntimePeakLocal(runtimeStatsDb, runtimeStats.inFlight);
    } else {
      recordRuntimePeak(db, runtimeStats.inFlight);
    }
    const startedAt = Date.now();
    try {
      const result = runCorrectionCandidates(payload);
      runtimeStats.totalCorrections += 1;
      if (channel === 'ws') {
        runtimeStats.wsCorrections += 1;
      } else {
        runtimeStats.httpCorrections += 1;
      }
      runtimeStats.lastCorrectionAt = new Date().toISOString();
      recordRuntimeLatency(Date.now() - startedAt);
      if (runtimeControlClientEnabled(appConfig) && runtimeStatsDb) {
        recordRuntimeCorrectionLocal(runtimeStatsDb, {
          channel,
          result,
        });
      } else {
        recordRuntimeCorrection(db, {
          channel,
          result,
        });
      }
      return result;
    } catch (error) {
      runtimeStats.totalErrors += 1;
      runtimeStats.lastErrorAt = new Date().toISOString();
      throw error;
    } finally {
      runtimeStats.inFlight = Math.max(0, runtimeStats.inFlight - 1);
    }
  }

  /**
   * 功能：向未完成升级的 socket 返回普通 HTTP 错误并关闭连接。
   * 输入：socket 对象、状态码、错误消息。
   * 输出：无显式返回。
   */
  function sendPlainAndClose(socket, statusCode, message) {
    socket.write(`HTTP/1.1 ${statusCode} ${http.STATUS_CODES[statusCode] || 'Error'}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`);
    socket.destroy();
  }

  /**
   * 功能：编码单个 WebSocket 帧。
   * 输入：`opcode` 操作码，`payloadBuffer` 二进制 payload。
   * 输出：编码后的帧 Buffer。
   */
  function encodeWebSocketFrame(opcode, payloadBuffer = Buffer.alloc(0)) {
    const length = payloadBuffer.length;
    let header;
    if (length < 126) {
      header = Buffer.from([0x80 | opcode, length]);
    } else if (length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }
    return Buffer.concat([header, payloadBuffer]);
  }

  /**
   * 功能：通过 WebSocket 发送 JSON 消息。
   * 输入：socket 对象，任意 payload。
   * 输出：无显式返回。
   */
  function sendWebSocketJson(socket, payload) {
    socket.write(encodeWebSocketFrame(0x1, Buffer.from(JSON.stringify(payload), 'utf8')));
  }

  /**
   * 功能：发送 WebSocket close 帧。
   * 输入：socket 对象、关闭码、原因字符串。
   * 输出：无显式返回。
   */
  function sendWebSocketClose(socket, code = 1000, reason = '') {
    const reasonBuffer = Buffer.from(String(reason || ''), 'utf8');
    const payload = Buffer.alloc(2 + reasonBuffer.length);
    payload.writeUInt16BE(code, 0);
    reasonBuffer.copy(payload, 2);
    socket.write(encodeWebSocketFrame(0x8, payload));
  }

  /**
   * 功能：从缓冲区中解码尽可能多的 WebSocket 帧。
   * 输入：`buffer` 原始二进制缓冲区。
   * 输出：包含已解码帧数组和剩余 Buffer 的对象。
   */
  function decodeWebSocketFrames(buffer) {
    const frames = [];
    let offset = 0;

    while (offset + 2 <= buffer.length) {
      const firstByte = buffer[offset];
      const secondByte = buffer[offset + 1];
      const opcode = firstByte & 0x0f;
      const masked = (secondByte & 0x80) !== 0;
      let payloadLength = secondByte & 0x7f;
      let headerLength = 2;

      if (payloadLength === 126) {
        if (offset + 4 > buffer.length) break;
        payloadLength = buffer.readUInt16BE(offset + 2);
        headerLength = 4;
      } else if (payloadLength === 127) {
        if (offset + 10 > buffer.length) break;
        payloadLength = Number(buffer.readBigUInt64BE(offset + 2));
        headerLength = 10;
      }

      const maskLength = masked ? 4 : 0;
      const frameLength = headerLength + maskLength + payloadLength;
      if (offset + frameLength > buffer.length) break;

      let payloadOffset = offset + headerLength;
      let payload = buffer.subarray(payloadOffset + maskLength, payloadOffset + maskLength + payloadLength);
      if (masked) {
        const mask = buffer.subarray(payloadOffset, payloadOffset + 4);
        const unmasked = Buffer.alloc(payloadLength);
        for (let index = 0; index < payloadLength; index += 1) {
          unmasked[index] = payload[index] ^ mask[index % 4];
        }
        payload = unmasked;
      }

      frames.push({ opcode, payload });
      offset += frameLength;
    }

    return {
      frames,
      remaining: buffer.subarray(offset),
    };
  }

  const webSocketClients = new Set();

  /**
   * 功能：处理 `/ws/runtime/correct` 的 WebSocket 升级与消息循环。
   * 输入：HTTP 请求对象、底层 socket。
   * 输出：无显式返回。
   */
  function handleRuntimeCorrectionWebSocket(req, socket, executor, formatPayload) {
    let governanceSession = null;
    try {
      authorize(req, 'runtime.correct');
      const upgrade = String(req.headers.upgrade || '').toLowerCase();
      const connection = String(req.headers.connection || '').toLowerCase();
      const key = String(req.headers['sec-websocket-key'] || '');
      if (upgrade !== 'websocket' || !connection.includes('upgrade') || !key) {
        return sendPlainAndClose(socket, 400, 'invalid websocket upgrade request');
      }
      governanceSession = runtimeWebSocketGovernance.openConnection(req, webSocketClients.size);

      const acceptKey = crypto
        .createHash('sha1')
        .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
        .digest('base64');

      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n'
        + 'Upgrade: websocket\r\n'
        + 'Connection: Upgrade\r\n'
        + `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
      );

      webSocketClients.add(socket);
      let frameBuffer = Buffer.alloc(0);
      socket.setTimeout(Number(authConfig.websocketIdleTimeoutMs || 60000), () => {
        sendWebSocketClose(socket, 1001, 'idle timeout');
        socket.end();
      });

      socket.on('data', (chunk) => {
        frameBuffer = Buffer.concat([frameBuffer, chunk]);
        const parsed = decodeWebSocketFrames(frameBuffer);
        frameBuffer = parsed.remaining;

        for (const frame of parsed.frames) {
          if (frame.payload.length > Number(authConfig.websocketMaxMessageBytes || 65536)) {
            sendWebSocketClose(socket, 1009, 'message too large');
            socket.end();
            return;
          }
          if (frame.opcode === 0x8) {
            sendWebSocketClose(socket, 1000, 'bye');
            socket.end();
            return;
          }
          if (frame.opcode === 0x9) {
            socket.write(encodeWebSocketFrame(0xA, frame.payload));
            continue;
          }
          if (frame.opcode !== 0x1) {
            continue;
          }
          try {
            runtimeWebSocketGovernance.consumeMessage(governanceSession);
            const payload = JSON.parse(frame.payload.toString('utf8') || '{}');
            const result = executor(payload, 'ws');
            sendWebSocketJson(socket, formatPayload(result));
          } catch (error) {
            if (error && error.websocketCloseCode) {
              sendWebSocketClose(socket, error.websocketCloseCode, error.message || 'websocket policy violation');
              socket.end();
              return;
            }
            sendWebSocketJson(socket, {
              error: `${error.code || 'websocket_request_error'}: ${error.message}`,
            });
          }
        }
      });

      socket.on('close', () => {
        webSocketClients.delete(socket);
        if (governanceSession) {
          governanceSession.release();
          governanceSession = null;
        }
      });
      socket.on('end', () => {
        webSocketClients.delete(socket);
        if (governanceSession) {
          governanceSession.release();
          governanceSession = null;
        }
      });
      socket.on('error', () => {
        webSocketClients.delete(socket);
        if (governanceSession) {
          governanceSession.release();
          governanceSession = null;
        }
      });
    } catch (error) {
      if (governanceSession) {
        governanceSession.release();
        governanceSession = null;
      }
      return sendPlainAndClose(socket, Number(error.statusCode) || 403, error.message || 'websocket authorization failed');
    }
  }

  /**
   * 功能：处理 `/ws/runtime/correct` 的 WebSocket 升级与消息循环。
   * 输入：HTTP 请求对象、底层 socket。
   * 输出：无显式返回。
   */
  function handleRuntimeCorrectWebSocket(req, socket) {
    return handleRuntimeCorrectionWebSocket(req, socket, executeCorrection, (result) => ({
      correctedText: result.correctedText,
    }));
  }

  /**
   * 功能：处理 `/ws/runtime/correct_cand` 的 WebSocket 升级与消息循环。
   * 输入：HTTP 请求对象、底层 socket。
   * 输出：无显式返回。
   */
  function handleRuntimeCorrectCandWebSocket(req, socket) {
    return handleRuntimeCorrectionWebSocket(req, socket, executeCorrectionCandidates, (result) => ({
      correctedTexts: result.correctedTexts,
    }));
  }

  const requestListener = async (req, res) => {
    try {
      const url = new URL(req.url, serverConfig.urlBaseForParsing);
      const { pathname, searchParams } = url;
      const routePermission = permissionForRoute(req.method, pathname);
      if (routePermission) {
        authorize(req, routePermission);
      }
      if (surfaces.runtime) {
        const runtimeHandled = await handleRuntimeRequest(req, res, {
          pathname,
          sendJson,
          readJson,
          requireRuntimeToken,
          executeCorrection,
          executeCorrectionCandidates,
          refreshRuntimeState,
          runtimeState,
          currentRuntimeStats,
          countTerms,
          db,
          getCurrentPublishedRelease,
        });
        if (runtimeHandled) {
          return;
        }
      }

      if (surfaces.admin) {
        const adminHandled = await handleAdminRequest(req, res, {
          pathname,
          searchParams,
          resolvedPaths,
          consoleClientRoot,
          sendJson,
          sendHtml,
          sendFile,
          readJson,
          readMultipartForm,
          sendCsvDownload,
          routeParams,
          authContextFrom,
          authorize,
          requireRuntimeToken,
          knownRoles,
          knownUsers,
          db,
          listValidationFeedSources,
          appConfig,
          getDashboardSummary,
          getCurrentPublishedRelease,
          getCurrentCanaryRelease,
          getActiveGrayPolicy,
          listReleases,
          buildReleaseGateSummary,
          listTerms,
          listConsoleTerms,
          getConsoleWorkbench,
          getConsoleRuntimeRollout,
          getRuntimeControlVerificationReport,
          listConsoleRuntimeNodeRegistry,
          termFiltersFromSearch,
          termFiltersFromPayload,
          getConsoleOverview,
          listConsoleRuntimeNodes,
          getConsoleRuntimeNodeDetail,
          getConsoleRuntimeNodeRegistryDetail,
          getConsoleTermDetail,
          listValidationCases,
          generateTermPinyinCandidates,
          submitPinyinCandidateReview,
          getImportTemplate,
          listImportTemplates,
          listConsoleHelpArticles,
          getConsoleHelpArticle,
          resolveConsoleHelpSourceFile,
          resolveImportTemplateAsset,
          listConsoleImportJobs,
          getImportJob,
          listImportJobRows,
          getConsoleImportJobDetail,
          listConsoleReviews,
          getConsoleReviewDetail,
          listConsoleReleases,
          getConsoleReleaseGateDetail,
          getConsoleReleaseDetail,
          listConsoleBusinessProperties,
          listConsoleBusinessAttributeDefinitions,
          listConsoleSourceTypes,
          listConsoleValidationCases,
          listAllValidationCasesByFilters,
          validationFiltersFromSearch,
          validationFiltersFromPayload,
          listRelatedTermsForValidationCase,
          getConsoleValidationCaseDetail,
          createTerm,
          updateTerm,
          submitTermReview,
          updateTermStatus,
          batchSubmitTermReview,
          listTermIdsByFilters,
          batchDisableTerms,
          createImportJob,
          confirmImportJob,
          cancelImportJob,
          batchApproveReviewTasks,
          batchRejectReviewTasks,
          approveReviewTask,
          rejectReviewTask,
          buildRelease,
          submitReleaseReview,
          ensureReleaseApprovalForExposure,
          activatePublishedRelease,
          executeCorrection,
          executeCorrectionCandidates,
          refreshRuntimeState,
          runtimeState,
          createValidationCase,
          importValidationCases,
          disableValidationCase,
          batchDisableValidationCases,
          listValidationCaseIdsByFilters,
          getTerm,
          getTermRules,
          upsertTermRules,
          getTermPinyinProfile,
          upsertTermPinyinProfile,
          getTermPinyinComparison,
          listPinyinProfiles,
          listPinyinComparisons,
          listPinyinConflicts,
          getPinyinConflictDetail,
          listReviewTasks,
          listAuditLogs,
          getRuntimeNode,
          listRuntimeNodes,
          listRuntimeNodeRegistry,
          getRuntimeNodeRegistryItem,
          createRuntimeNodeRegistryItem,
          updateRuntimeNodeRegistryItem,
          enableRuntimeNodeRegistryItem,
          disableRuntimeNodeRegistryItem,
          rotateRuntimeNodeRegistrySecret,
          assertRuntimeNodeRegistryAccess,
          registerRuntimeNode,
          heartbeatRuntimeNode,
          getRuntimeControlState,
          setRuntimeDesiredRelease,
          getRuntimeControlViewForNode,
          recordRuntimeNodeApplyResult,
          uploadRuntimeNodeStats,
          releaseApprovalState,
          createGrayPolicy,
          disableGrayPolicy,
          importValidationFeeds,
          listGrayPolicies,
          getRelease,
        });
        if (adminHandled) {
          return;
        }
      }

      return sendJson(res, 404, { error: 'not found' });
    } catch (error) {
      const statusCode = Number(error.statusCode) || 500;
      const payload = error && error.payload && typeof error.payload === 'object'
        ? { ...error.payload }
        : {};
      if (!payload.error) {
        payload.error = `${error.code || 'request_error'}: ${error.message}`;
      }
      return sendJson(res, statusCode, payload);
    }
  };

  const server = http.createServer(requestListener);

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 15000;
  server.on('upgrade', (req, socket) => {
    const url = new URL(req.url, serverConfig.urlBaseForParsing);
    if (surfaces.runtime && handleRuntimeUpgrade(req, socket, {
      pathname: url.pathname,
      handleRuntimeCorrectWebSocket,
      handleRuntimeCorrectCandWebSocket,
    })) {
      return;
    }
    sendPlainAndClose(socket, 404, 'not found');
  });

  return {
    appConfig,
    db,
    server,
    refreshRuntimeState,
    syncRuntimeControl,
    flushRuntimeStats,
    async inject(options = {}) {
      const method = String(options.method || 'GET').toUpperCase();
      const url = String(options.url || options.path || '/');
      let body = options.body == null ? null : options.body;
      const headers = Object.fromEntries(Object.entries(options.headers || {}).map(([key, value]) => [String(key).toLowerCase(), value]));
      if (body && typeof body !== 'string' && !Buffer.isBuffer(body)) {
        body = JSON.stringify(body);
        if (!headers['content-type']) {
          headers['content-type'] = 'application/json; charset=utf-8';
        }
      }
      const req = Readable.from(body == null ? [] : [Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8')]);
      req.method = method;
      req.url = url;
      req.headers = headers;
      return new Promise((resolve, reject) => {
        const chunks = [];
        const res = {
          statusCode: 200,
          headers: {},
          writeHead(code, responseHeaders = {}) {
            this.statusCode = code;
            this.headers = { ...this.headers, ...responseHeaders };
          },
          end(chunk) {
            if (chunk) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8'));
            }
            const buffer = Buffer.concat(chunks);
            const text = buffer.toString('utf8');
            let json = null;
            try {
              json = text ? JSON.parse(text) : null;
            } catch {}
            resolve({
              statusCode: this.statusCode,
              headers: this.headers,
              body: text,
              json,
            });
          },
          write(chunk) {
            if (chunk) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8'));
            }
          },
        };
        Promise.resolve(requestListener(req, res)).catch(reject);
      });
    },
    start() {
      return new Promise((resolve, reject) => {
        /**
         * 功能：处理启动阶段的监听错误。
         * 输入：错误对象。
         * 输出：无显式返回。
         */
        function handleError(error) {
          server.off('listening', handleListening);
          reject(error);
        }

        /**
         * 功能：处理服务监听成功事件。
         * 输入：无。
         * 输出：监听中的 server 实例。
         */
        function handleListening() {
          server.off('error', handleError);
          if (surfaces.runtime && runtimeControlClientEnabled(appConfig)) {
            Promise.resolve(syncRuntimeControl()).catch(() => {});
            runtimeAgentState.syncTimer = setInterval(() => {
              Promise.resolve(syncRuntimeControl()).catch(() => {});
            }, Math.max(1000, Number((appConfig.runtimeControl || {}).syncIntervalSeconds || 30) * 1000));
            runtimeAgentState.statsFlushTimer = setInterval(() => {
              Promise.resolve(flushRuntimeStats()).catch(() => {});
            }, Math.max(1000, Number((appConfig.runtimeControl || {}).statsFlushIntervalSeconds || 300) * 1000));
          }
          resolve(server);
        }

        server.once('error', handleError);
        server.once('listening', handleListening);
        server.listen(serverConfig.port, serverConfig.host);
      });
    },
    async stop() {
      if (runtimeAgentState.syncTimer) {
        clearInterval(runtimeAgentState.syncTimer);
        runtimeAgentState.syncTimer = null;
      }
      if (runtimeAgentState.statsFlushTimer) {
        clearInterval(runtimeAgentState.statsFlushTimer);
        runtimeAgentState.statsFlushTimer = null;
      }
      for (const socket of webSocketClients) {
        try {
          sendWebSocketClose(socket, 1001, 'server shutdown');
          socket.end();
        } catch {}
      }
      await new Promise((resolve) => {
        if (!server.listening) {
          return resolve();
        }
        return server.close(() => resolve());
      });
      if (typeof db.close === 'function') {
        db.close();
      }
      if (runtimeStatsDb && typeof runtimeStatsDb.close === 'function') {
        runtimeStatsDb.close();
      }
    },
    surfaces,
  };
}

/**
 * 功能：构建只暴露 runtime 面的应用实例。
 * 输入：`appConfig` 应用配置对象。
 * 输出：仅启用 runtime surface 的应用对象。
 */
function createRuntimeApp(appConfig = createAppConfig()) {
  return createPrototypeApp(appConfig, { runtime: true, admin: false });
}

/**
 * 功能：构建只暴露 admin/console 面的应用实例。
 * 输入：`appConfig` 应用配置对象。
 * 输出：仅启用 admin surface 的应用对象。
 */
function createAdminApp(appConfig = createAppConfig()) {
  return createPrototypeApp(appConfig, { runtime: false, admin: true });
}

/**
 * 功能：启动原型 HTTP/WebSocket 服务。
 * 输入：`appConfig` 应用配置对象。
 * 输出：已启动的应用对象。
 */
async function startServer(appConfig = createAppConfig()) {
  const app = createPrototypeApp(appConfig);
  await app.start();
  console.log(`ACDP prototype listening on http://${appConfig.server.host}:${appConfig.server.port}`);
  return app;
}

/**
 * 功能：启动只包含 runtime surface 的服务。
 * 输入：`appConfig` 应用配置对象。
 * 输出：已启动的 runtime 应用对象。
 */
async function startRuntimeServer(appConfig = createAppConfig()) {
  const app = createRuntimeApp(appConfig);
  await app.start();
  console.log(`ACDP runtime server listening on http://${appConfig.server.host}:${appConfig.server.port}`);
  return app;
}

/**
 * 功能：启动只包含 admin/console surface 的服务。
 * 输入：`appConfig` 应用配置对象。
 * 输出：已启动的 admin 应用对象。
 */
async function startAdminServer(appConfig = createAppConfig()) {
  const app = createAdminApp(appConfig);
  await app.start();
  console.log(`ACDP admin server listening on http://${appConfig.server.host}:${appConfig.server.port}`);
  return app;
}

if (require.main === module) {
  let activeApp = null;
  const shutdown = async (signal) => {
    if (!activeApp) {
      process.exit(0);
      return;
    }
    try {
      await activeApp.stop();
      console.log(`ACDP prototype stopped by ${signal}`);
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => { shutdown('SIGTERM'); });
  process.on('SIGINT', () => { shutdown('SIGINT'); });

  startServer()
    .then((app) => {
      activeApp = app;
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  createPrototypeApp,
  createRuntimeApp,
  createAdminApp,
  startServer,
  startRuntimeServer,
  startAdminServer,
};
