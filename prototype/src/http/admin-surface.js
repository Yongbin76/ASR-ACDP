const fs = require('fs');
const path = require('path');
const { listReleasesPaged } = require('../lib/platform-db');
const { buildReleaseGateSummaryMap } = require('../lib/release-gates');
const {
  loadAccessControlDefinitions,
  upsertAccessControlRole,
  upsertAccessControlUser,
} = require('../lib/access-control');
const {
  loadBusinessPropertyDefinitions,
  upsertBusinessProperty,
  setBusinessPropertyEnabled,
  deleteBusinessProperty,
} = require('../lib/business-properties');
const {
  loadSourceTypeDefinitions,
  upsertSourceType,
  setSourceTypeEnabled,
  deleteSourceType,
} = require('../lib/source-types');
const {
  loadGovernancePolicies,
  saveGovernancePolicies,
} = require('../lib/governance-policies');
const { loadConsoleNavigation, renderConsoleNavigationHtml } = require('../lib/console-navigation');
const {
  evaluateTermAdmission,
  summarizeTermAdmission,
  createBlockedAdmissionError,
} = require('../lib/term-admission');
const {
  buildReleaseArtifactMetadata,
  normalizeRuntimeArtifactFileName,
  validateRuntimeArtifactDownloadRequest,
} = require('../lib/artifact-store');

function buildAdmissionPayloadForPersist(payload = {}, currentTerm = null) {
  return {
    categoryCode: payload.categoryCode ?? (currentTerm ? currentTerm.categoryCode : ''),
    canonicalText: payload.canonicalText ?? (currentTerm ? currentTerm.canonicalText : ''),
    aliases: payload.aliases ?? (currentTerm ? currentTerm.aliases : []),
    priority: payload.priority ?? (currentTerm ? currentTerm.priority : 80),
    riskLevel: payload.riskLevel ?? (currentTerm ? currentTerm.riskLevel : 'medium'),
    replaceMode: payload.replaceMode ?? (currentTerm ? currentTerm.replaceMode : 'replace'),
    baseConfidence: payload.baseConfidence ?? (currentTerm ? currentTerm.baseConfidence : 0.9),
    sourceType: payload.sourceType ?? (currentTerm ? currentTerm.sourceType : 'manual'),
    pinyinRuntimeMode: payload.pinyinRuntimeMode ?? (currentTerm ? currentTerm.pinyinRuntimeMode : 'candidate'),
    pinyinProfile: payload.pinyinProfile ?? (currentTerm ? currentTerm.pinyinProfile : {}),
  };
}

function enforceTermAdmission(db, payload = {}, options = {}) {
  const admission = evaluateTermAdmission(db, payload, options);
  const summary = summarizeTermAdmission(admission);
  if (summary.level === 'blocked') {
    throw createBlockedAdmissionError(summary, {
      code: 'term_admission_blocked',
      message: options.message || (summary.primaryIssue ? summary.primaryIssue.message : '当前词条内容不满足准入规则。'),
    });
  }
  return admission;
}

function createAdmissionActionRequiredError(admission, message = '') {
  const summary = summarizeTermAdmission(admission);
  const error = new Error(message || summary.reasonSummary || '当前词条需要按系统建议处理。');
  error.statusCode = 409;
  error.code = 'term_admission_action_required';
  error.payload = {
    error: `${error.code}: ${error.message}`,
    admissionLevel: summary.level,
    runtimeSuitability: summary.runtimeSuitability,
    recommendedAction: summary.recommendedAction,
    reasonCodes: summary.reasonCodes,
    reasonSummary: summary.reasonSummary,
    reviewHints: summary.reviewHints,
    targetTermId: summary.targetTermId,
    targetCanonicalText: summary.targetCanonicalText,
    blockedCount: summary.blockedCount,
    warningCount: summary.warningCount,
    issues: summary.issues,
  };
  return error;
}

function buildAdmissionSummaryPayload(admission = {}) {
  const summary = summarizeTermAdmission(admission);
  return {
    level: summary.level,
    admissionLevel: summary.level,
    runtimeSuitability: summary.runtimeSuitability,
    recommendedAction: summary.recommendedAction,
    reasonCodes: summary.reasonCodes,
    reasonSummary: summary.reasonSummary,
    reviewHints: summary.reviewHints,
    targetTermId: summary.targetTermId,
    targetCanonicalText: summary.targetCanonicalText,
    blockedCount: summary.blockedCount,
    warningCount: summary.warningCount,
    issueCount: summary.issueCount,
    issues: summary.issues,
  };
}

function buildConflictSummaryPayload(admission = {}) {
  const summary = summarizeTermAdmission(admission);
  if (!Array.isArray(summary.issues) || !summary.issues.length) {
    return null;
  }
  return {
    level: summary.level,
    blockedCount: summary.blockedCount,
    warningCount: summary.warningCount,
    issueCount: summary.issueCount,
    primaryCode: summary.primaryIssue ? String(summary.primaryIssue.code || '').trim() : '',
    primaryMessage: summary.primaryIssue ? String(summary.primaryIssue.message || '').trim() : '',
    items: summary.issues,
  };
}

function buildManualTermReviewOptions(term, admission = {}) {
  return {
    sourceContext: {
      sourceType: String(term.sourceType || '').trim(),
      sourceTypeCode: String(term.sourceType || '').trim(),
      importJobId: '',
      sourceMode: 'manual',
      sourceFileName: '',
      sourceRowNo: null,
      sourceRef: '',
    },
    admissionSummary: buildAdmissionSummaryPayload(admission),
    conflictSummary: buildConflictSummaryPayload(admission),
  };
}

function buildPersistableTermPayload(payload = {}, admission = {}, currentTerm = null) {
  const next = {
    ...payload,
  };
  const currentRules = currentTerm && currentTerm.rules ? currentTerm.rules : {};
  const incomingRules = payload && payload.rules ? payload.rules : {};
  if (String(admission.runtimeSuitability || '').trim() === 'candidate') {
    next.replaceMode = 'candidate';
    if (String(next.pinyinRuntimeMode || '').trim() !== 'off') {
      next.pinyinRuntimeMode = 'candidate';
    }
    next.rules = {
      ...currentRules,
      ...incomingRules,
      candidateOnly: true,
    };
    return next;
  }
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'rules')) {
    next.rules = {
      ...currentRules,
      ...incomingRules,
    };
  }
  return next;
}

function assertSaveActionAllowed(admission, message = '') {
  const action = String((admission && admission.recommendedAction) || '').trim();
  if (action === 'save_replace' || action === 'save_candidate') {
    return;
  }
  throw createAdmissionActionRequiredError(admission, message);
}

function countBusinessAttributeReferences(db, code) {
  const normalized = String(code || '').trim();
  if (!normalized) {
    return 0;
  }
  const row = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM terms WHERE category_code = ?) AS term_count,
      (SELECT COUNT(*) FROM import_job_rows WHERE json_extract(normalized_payload_json, '$.categoryCode') = ?) AS import_row_count,
      (SELECT COUNT(*) FROM review_tasks
        WHERE json_extract(target_snapshot, '$.categoryCode') = ?
           OR json_extract(target_snapshot, '$.businessAttributeCode') = ?) AS review_count
  `).get(normalized, normalized, normalized, normalized);
  return Number((row.term_count || 0) + (row.import_row_count || 0) + (row.review_count || 0));
}

function countSourceTypeReferences(db, code) {
  const normalized = String(code || '').trim();
  if (!normalized) {
    return 0;
  }
  const row = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM terms WHERE source_type = ?) AS term_count,
      (SELECT COUNT(*) FROM validation_cases WHERE source_type = ?) AS validation_count,
      (SELECT COUNT(*) FROM import_jobs WHERE source_type = ?) AS import_job_count,
      (SELECT COUNT(*) FROM import_job_rows WHERE json_extract(normalized_payload_json, '$.sourceType') = ?) AS import_row_count,
      (SELECT COUNT(*) FROM review_tasks
        WHERE json_extract(target_snapshot, '$.sourceType') = ?
           OR json_extract(target_snapshot, '$.sourceTypeCode') = ?) AS review_count
  `).get(normalized, normalized, normalized, normalized, normalized, normalized);
  return Number(
    (row.term_count || 0)
    + (row.validation_count || 0)
    + (row.import_job_count || 0)
    + (row.import_row_count || 0)
    + (row.review_count || 0)
  );
}

function assertConfigDeleteAllowed(referenceCount, kind, code) {
  if (Number(referenceCount || 0) <= 0) {
    return;
  }
  const error = new Error(`${kind} is referenced and cannot be deleted: ${code}`);
  error.statusCode = 409;
  error.code = `${kind}_referenced`;
  throw error;
}

function resolveRuntimeNodeIdFromRequest(req, fallbackNodeId = '') {
  const headerNodeId = String(req.headers['x-runtime-node-id'] || '').trim();
  const normalizedFallback = String(fallbackNodeId || '').trim();
  if (headerNodeId && normalizedFallback && headerNodeId !== normalizedFallback) {
    const error = new Error(`runtime node identity mismatch: ${headerNodeId} !== ${normalizedFallback}`);
    error.statusCode = 403;
    error.code = 'runtime_node_identity_mismatch';
    throw error;
  }
  return headerNodeId || normalizedFallback;
}

function normalizeRuntimeVerifyTarget(input = {}) {
  const targetMode = String(input.targetMode || 'cluster_current').trim() || 'cluster_current';
  if (targetMode !== 'cluster_current') {
    const error = new Error(`unsupported runtime verify targetMode: ${targetMode}`);
    error.statusCode = 400;
    error.code = 'runtime_verify_target_mode_invalid';
    throw error;
  }
  return {
    targetMode,
    nodeId: String(input.nodeId || '').trim(),
    trafficKey: String(input.trafficKey || '').trim(),
  };
}

/**
 * 功能：声明 admin/console 面路由权限映射。
 * 输入：HTTP 方法和路径。
 * 输出：权限字符串或 `null`。
 */
function permissionForAdminRoute(method, pathname) {
  const termRootPattern = /^\/api\/admin\/terms\/[^/]+$/;
  const termRulesPattern = /^\/api\/admin\/terms\/[^/]+\/rules$/;
  const termPinyinPattern = /^\/api\/admin\/terms\/[^/]+\/pinyin$/;
  const termCandidatePattern = /^\/api\/admin\/terms\/[^/]+\/generate-pinyin-candidates$/;
  const termCandidateSubmitPattern = /^\/api\/admin\/terms\/[^/]+\/pinyin-candidates$/;
  const termSubmitReviewPattern = /^\/api\/admin\/terms\/[^/]+\/submit-review$/;
  const termReviewDecisionPattern = /^\/api\/admin\/terms\/[^/]+\/(approve|disable)$/;
  const reviewDecisionPattern = /^\/api\/admin\/reviews\/[^/]+\/(approve|reject)$/;
  const validationCaseDisablePattern = /^\/api\/admin\/validation-cases\/[^/]+\/disable$/;
  const releaseSubmitReviewPattern = /^\/api\/admin\/releases\/[^/]+\/submit-review$/;
  const releasePublishPattern = /^\/api\/admin\/releases\/[^/]+\/publish$/;
  const releaseRollbackPattern = /^\/api\/admin\/releases\/[^/]+\/rollback$/;
  const grayDisablePattern = /^\/api\/admin\/gray-policies\/[^/]+\/disable$/;
  const consoleTermPattern = /^\/api\/console\/terms(\/[^/]+(\/validation-cases)?)?$/;
  const consoleDictionaryTermPattern = /^\/api\/console\/dictionary\/terms(\/[^/]+(\/validation-cases|\/generate-pinyin-candidates|\/pinyin-candidates|\/submit-review|\/disable)?)?$/;
  const consoleImportPattern = /^\/api\/console\/import\/(templates(?:\/[^/]+(?:\/download)?)?|jobs(?:\/[^/]+(?:\/rows|\/errors\/download)?)?)$/;
  const consoleDictionaryImportPattern = /^\/api\/console\/dictionary\/import-jobs(?:\/[^/]+(?:\/rows|\/errors\/download|\/confirm|\/cancel)?)?$/;
  const consoleBusinessPropertiesPattern = /^\/api\/console\/business-properties$/;
  const consoleSystemBusinessPropertiesPattern = /^\/api\/console\/system\/business-properties(?:\/[^/]+(?:\/(enable|disable|delete))?)?$/;
  const consoleDictionaryBusinessAttributesPattern = /^\/api\/console\/dictionary-config\/business-attributes(?:\/[^/]+(?:\/(enable|disable|delete))?)?$/;
  const consoleDictionarySourceTypesPattern = /^\/api\/console\/dictionary-config\/source-types(?:\/[^/]+(?:\/(enable|disable|delete))?)?$/;
  const consoleSystemAccessControlPattern = /^\/api\/console\/system\/access-control$/;
  const consoleSystemUsersPattern = /^\/api\/console\/system\/users(?:\/[^/]+)?$/;
  const consoleSystemRolesPattern = /^\/api\/console\/system\/roles(?:\/[^/]+)?$/;
  const consoleSystemGovernancePattern = /^\/api\/console\/system\/governance-policies$/;
  const consoleHelpPattern = /^\/api\/console\/help(?:\/[^/]+(?:\/source)?)?$/;
  const consoleReviewPattern = /^\/api\/console\/reviews(\/[^/]+)?$/;
  const consoleDictionaryReviewPattern = /^\/api\/console\/dictionary\/reviews(?:\/[^/]+)?$/;
  const consoleReleasePattern = /^\/api\/console\/releases(\/[^/]+(?:\/gate|\/validation)?)?$/;
  const consoleRuntimeNodeRegistryPattern = /^\/api\/console\/runtime-node-registry(\/[^/]+(?:\/(enable|disable|rotate-secret))?)?$/;
  const consoleRuntimeNodeRegistryDeploymentGuidePattern = /^\/api\/console\/runtime-node-registry\/[^/]+\/deployment-guide$/;
  const consoleRuntimeNodePattern = /^\/api\/console\/runtime-nodes(\/[^/]+)?$/;
  const consoleRuntimeDemoPattern = /^\/api\/console\/runtime-demo\/(current|simulate)$/;
  const consoleRuntimeVerifyPattern = /^\/api\/console\/runtime-verify\/(current|correct|correct-cand)$/;
  const consoleValidationPattern = /^\/api\/console\/validation-cases(\/[^/]+(?:\/related-terms)?)?$/;
  const consoleValidationDomainPattern = /^\/api\/console\/validation\/cases(\/[^/]+(?:\/related-terms)?)?$/;
  const consoleTermSubmitReviewPattern = /^\/api\/console\/(?:dictionary\/)?terms\/[^/]+\/submit-review$/;
  const consoleTermDisablePattern = /^\/api\/console\/(?:dictionary\/)?terms\/[^/]+\/disable$/;
  const consoleTermBatchSubmitReviewPattern = /^\/api\/console\/(?:dictionary\/)?terms\/batch-submit-review$/;
  const consoleTermBatchDisablePattern = /^\/api\/console\/(?:dictionary\/)?terms\/batch-disable$/;
  const consoleTermPinyinGeneratePattern = /^\/api\/console\/(?:dictionary\/)?terms\/[^/]+\/generate-pinyin-candidates$/;
  const consoleTermPinyinSubmitPattern = /^\/api\/console\/(?:dictionary\/)?terms\/[^/]+\/pinyin-candidates$/;
  const consoleImportConfirmPattern = /^\/api\/console\/(?:(?:dictionary\/)?import-jobs|import\/jobs)\/[^/]+\/confirm$/;
  const consoleImportCancelPattern = /^\/api\/console\/(?:(?:dictionary\/)?import-jobs|import\/jobs)\/[^/]+\/cancel$/;
  const consoleReviewBatchApprovePattern = /^\/api\/console\/(?:(?:dictionary\/)?reviews)\/batch-approve$/;
  const consoleReviewBatchRejectPattern = /^\/api\/console\/(?:(?:dictionary\/)?reviews)\/batch-reject$/;
  const consoleReviewDecisionPattern = /^\/api\/console\/(?:(?:dictionary\/)?reviews)\/[^/]+\/(approve|reject)$/;
  const consoleReleaseBuildPattern = /^\/api\/console\/releases\/build$/;
  const consoleReleaseSubmitReviewPattern = /^\/api\/console\/releases\/[^/]+\/submit-review$/;
  const consoleReleasePublishPattern = /^\/api\/console\/releases\/[^/]+\/publish$/;
  const consoleReleaseRollbackPattern = /^\/api\/console\/releases\/[^/]+\/rollback$/;
  const consoleGrayCreatePattern = /^\/api\/console\/gray-policies$/;
  const consoleValidationDisablePattern = /^\/api\/console\/(?:validation\/cases|validation-cases)\/[^/]+\/disable$/;
  const consoleValidationBatchDisablePattern = /^\/api\/console\/(?:validation\/cases|validation-cases)\/batch-disable$/;

  if (method === 'GET' && pathname === '/api/admin/me') return 'auth.read';
  if (method === 'GET' && pathname === '/api/admin/dashboard') return 'dashboard.read';
  if (method === 'GET' && pathname === '/api/admin/validation-cases') return 'validation.read';
  if (method === 'GET' && pathname === '/api/admin/validation-cases/feed-sources') return 'validation.read';
  if (method === 'POST' && pathname === '/api/admin/validation-cases') return 'validation.write';
  if (method === 'POST' && pathname === '/api/admin/validation-cases/import') return 'validation.write';
  if (method === 'POST' && pathname === '/api/admin/validation-cases/import-feeds') return 'validation.write';
  if (method === 'POST' && validationCaseDisablePattern.test(pathname)) return 'validation.write';
  if (method === 'POST' && pathname === '/api/admin/terms') return 'term.write';
  if (method === 'PUT' && termRootPattern.test(pathname)) return 'term.write';
  if (method === 'PUT' && termRulesPattern.test(pathname)) return 'term.write';
  if (method === 'PUT' && termPinyinPattern.test(pathname)) return 'pinyin.write';
  if (method === 'POST' && termCandidatePattern.test(pathname)) return 'pinyin.candidate.generate';
  if (method === 'POST' && termCandidateSubmitPattern.test(pathname)) return 'pinyin.candidate.submit';
  if (method === 'POST' && termSubmitReviewPattern.test(pathname)) return 'term.review.submit';
  if (method === 'POST' && termReviewDecisionPattern.test(pathname)) return 'term.review.decide';
  if (method === 'POST' && reviewDecisionPattern.test(pathname)) return 'review.decide';
  if (method === 'POST' && releaseSubmitReviewPattern.test(pathname)) return 'release.review.submit';
  if (method === 'POST' && pathname === '/api/admin/releases/build') return 'release.build';
  if (method === 'POST' && releasePublishPattern.test(pathname)) return 'release.publish';
  if (method === 'POST' && releaseRollbackPattern.test(pathname)) return 'release.rollback';
  if (method === 'POST' && pathname === '/api/admin/gray-policies') return 'gray.write';
  if (method === 'POST' && grayDisablePattern.test(pathname)) return 'gray.write';
  if (method === 'GET' && pathname === '/api/console/overview') return 'dashboard.read';
  if (method === 'GET' && pathname === '/api/console/workbench') return 'dashboard.read';
  if (method === 'GET' && pathname === '/api/console/runtime-control') return 'dashboard.read';
  if (method === 'GET' && /^\/api\/console\/runtime-control\/evidence\/[^/]+$/.test(pathname)) return 'dashboard.read';
  if (method === 'GET' && (consoleTermPattern.test(pathname) || consoleDictionaryTermPattern.test(pathname))) return 'term.read';
  if (method === 'GET' && (consoleImportPattern.test(pathname) || consoleDictionaryImportPattern.test(pathname))) return 'term.read';
  if (method === 'GET' && consoleBusinessPropertiesPattern.test(pathname)) return 'term.read';
  if (method === 'GET' && consoleSystemBusinessPropertiesPattern.test(pathname)) return 'term.read';
  if (method === 'GET' && consoleDictionaryBusinessAttributesPattern.test(pathname)) return 'term.read';
  if (method === 'GET' && consoleDictionarySourceTypesPattern.test(pathname)) return 'term.read';
  if ((method === 'POST' || method === 'PUT') && consoleSystemBusinessPropertiesPattern.test(pathname)) return 'system.governance.manage';
  if ((method === 'POST' || method === 'PUT') && consoleDictionaryBusinessAttributesPattern.test(pathname)) return 'system.governance.manage';
  if ((method === 'POST' || method === 'PUT') && consoleDictionarySourceTypesPattern.test(pathname)) return 'system.governance.manage';
  if (method === 'GET' && consoleSystemAccessControlPattern.test(pathname)) return 'system.permission.read';
  if (method === 'GET' && consoleSystemUsersPattern.test(pathname)) return 'system.user.read';
  if ((method === 'POST' || method === 'PUT') && consoleSystemUsersPattern.test(pathname)) return 'system.user.manage';
  if (method === 'GET' && consoleSystemRolesPattern.test(pathname)) return 'system.role.read';
  if ((method === 'POST' || method === 'PUT') && consoleSystemRolesPattern.test(pathname)) return 'system.role.manage';
  if (method === 'GET' && consoleSystemGovernancePattern.test(pathname)) return 'system.governance.read';
  if ((method === 'POST' || method === 'PUT') && consoleSystemGovernancePattern.test(pathname)) return 'system.governance.manage';
  if (method === 'GET' && consoleHelpPattern.test(pathname)) return 'dashboard.read';
  if (method === 'GET' && (consoleReviewPattern.test(pathname) || consoleDictionaryReviewPattern.test(pathname))) return 'review.read';
  if (method === 'GET' && consoleReleasePattern.test(pathname)) return 'release.read';
  if (method === 'GET' && consoleRuntimeNodeRegistryPattern.test(pathname)) return 'runtime.node.registry.read';
  if (method === 'GET' && consoleRuntimeNodeRegistryDeploymentGuidePattern.test(pathname)) return 'runtime.node.registry.manage';
  if (method === 'GET' && consoleRuntimeNodePattern.test(pathname)) return 'dashboard.read';
  if (method === 'GET' && pathname === '/api/console/runtime-demo/current') return 'runtime.read';
  if (method === 'GET' && pathname === '/api/console/runtime-verify/current') return 'runtime.read';
  if (method === 'GET' && (consoleValidationPattern.test(pathname) || consoleValidationDomainPattern.test(pathname))) return 'validation.read';
  if (method === 'POST' && (pathname === '/api/console/terms' || pathname === '/api/console/dictionary/terms')) return 'term.write';
  if (method === 'PUT' && (/^\/api\/console\/terms\/[^/]+$/.test(pathname) || /^\/api\/console\/dictionary\/terms\/[^/]+$/.test(pathname))) return 'term.write';
  if (method === 'POST' && consoleTermSubmitReviewPattern.test(pathname)) return 'term.review.submit';
  if (method === 'POST' && consoleTermDisablePattern.test(pathname)) return 'term.review.decide';
  if (method === 'POST' && consoleTermBatchSubmitReviewPattern.test(pathname)) return 'term.review.submit';
  if (method === 'POST' && consoleTermBatchDisablePattern.test(pathname)) return 'term.review.decide';
  if (method === 'POST' && consoleTermPinyinGeneratePattern.test(pathname)) return 'pinyin.candidate.generate';
  if (method === 'POST' && consoleTermPinyinSubmitPattern.test(pathname)) return 'pinyin.candidate.submit';
  if (method === 'POST' && (pathname === '/api/console/import/jobs' || pathname === '/api/console/dictionary/import-jobs')) return 'term.write';
  if (method === 'POST' && consoleImportConfirmPattern.test(pathname)) return 'term.write';
  if (method === 'POST' && consoleImportCancelPattern.test(pathname)) return 'term.write';
  if (method === 'POST' && consoleReviewBatchApprovePattern.test(pathname)) return 'review.decide';
  if (method === 'POST' && consoleReviewBatchRejectPattern.test(pathname)) return 'review.decide';
  if (method === 'POST' && consoleReviewDecisionPattern.test(pathname)) return 'review.decide';
  if (method === 'POST' && consoleReleaseBuildPattern.test(pathname)) return 'release.build';
  if (method === 'POST' && consoleReleaseSubmitReviewPattern.test(pathname)) return 'release.review.submit';
  if (method === 'POST' && consoleReleasePublishPattern.test(pathname)) return 'release.publish';
  if (method === 'POST' && consoleReleaseRollbackPattern.test(pathname)) return 'release.rollback';
  if (method === 'POST' && consoleGrayCreatePattern.test(pathname)) return 'gray.write';
  if (method === 'POST' && pathname === '/api/console/runtime-control/desired-version') return 'release.publish';
  if (method === 'POST' && pathname === '/api/console/runtime-demo/simulate') return 'simulate.run';
  if (method === 'POST' && pathname === '/api/console/runtime-verify/correct') return 'runtime.correct';
  if (method === 'POST' && pathname === '/api/console/runtime-verify/correct-cand') return 'runtime.correct';
  if (method === 'POST' && /^\/api\/console\/runtime-node-registry$/.test(pathname)) return 'runtime.node.registry.manage';
  if (method === 'POST' && /^\/api\/console\/runtime-node-registry\/[^/]+\/(enable|disable|rotate-secret)$/.test(pathname)) return 'runtime.node.registry.manage';
  if (method === 'PUT' && /^\/api\/console\/runtime-node-registry\/[^/]+$/.test(pathname)) return 'runtime.node.registry.manage';
  if (method === 'POST' && (pathname === '/api/console/validation-cases' || pathname === '/api/console/validation/cases')) return 'validation.write';
  if (method === 'POST' && (pathname === '/api/console/validation-cases/import' || pathname === '/api/console/validation/cases/import')) return 'validation.write';
  if (method === 'POST' && consoleValidationDisablePattern.test(pathname)) return 'validation.write';
  if (method === 'POST' && consoleValidationBatchDisablePattern.test(pathname)) return 'validation.write';
  return null;
}

/**
 * 功能：处理 admin 与 console 面请求。
 * 输入：请求对象、响应对象、已解析路径上下文和依赖集合。
 * 输出：命中时返回 `true`，否则返回 `false`。
 */
async function handleAdminRequest(req, res, context = {}) {
  const {
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
    listConsoleRuntimeNodes,
    listConsoleRuntimeNodeRegistry,
    getConsoleWorkbench,
    getConsoleRuntimeRollout,
    getRuntimeControlVerificationReport,
    termFiltersFromSearch,
    termFiltersFromPayload,
    listConsoleTermDetail,
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
    listConsoleBusinessProperties,
    listConsoleBusinessAttributeDefinitions,
    listConsoleSourceTypes,
    listConsoleImportJobs,
    getImportJob,
    listImportJobRows,
    getConsoleImportJobDetail,
    listConsoleReviews,
    getConsoleReviewDetail,
    listConsoleReleases,
    getConsoleReleaseDetail,
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
    getRelease,
    setRuntimeDesiredRelease,
    getRuntimeControlViewForNode,
    recordRuntimeNodeApplyResult,
    uploadRuntimeNodeStats,
    releaseApprovalState,
    createGrayPolicy,
    disableGrayPolicy,
    importValidationFeeds,
  } = context;

  if (req.method === 'GET' && pathname === '/admin') {
    res.writeHead(302, {
      Location: '/console',
    });
    res.end('');
    return true;
  }

  if (req.method === 'GET' && (pathname === '/' || pathname === '/test-client')) {
    sendHtml(res, fs.readFileSync(path.join(resolvedPaths.publicDir, 'test-client.html'), 'utf8'));
    return true;
  }

  if (req.method === 'GET' && (pathname === '/console' || pathname.startsWith('/console/'))) {
    const relativePath = pathname.replace(/^\/console\/?/, '');
    if (relativePath && relativePath.includes('.') && !relativePath.includes('..')) {
      const assetPath = path.join(consoleClientRoot, relativePath);
      if (assetPath.startsWith(consoleClientRoot) && fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
        sendFile(res, assetPath);
        return true;
      }
    }
    const indexPath = path.join(consoleClientRoot, 'index.html');
    if (!fs.existsSync(indexPath)) {
      sendJson(res, 404, { error: 'console_not_built: console client not found' });
      return true;
    }
    const navigation = loadConsoleNavigation(appConfig);
    const indexHtml = fs.readFileSync(indexPath, 'utf8')
      .replace('<!--__CONSOLE_NAV_TREE__-->', renderConsoleNavigationHtml(navigation.groups));
    sendHtml(res, indexHtml);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/runtime-nodes/register') {
    requireRuntimeToken(req);
    const payload = await readJson(req);
    const nodeId = resolveRuntimeNodeIdFromRequest(req, payload.nodeId);
    assertRuntimeNodeRegistryAccess(
      db,
      nodeId,
      req.headers['x-runtime-node-secret'] || payload.registrationSecret,
      { address: payload.address },
    );
    sendJson(res, 201, {
      ok: true,
      item: registerRuntimeNode(db, { ...payload, nodeId }, appConfig),
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/runtime-nodes/heartbeat') {
    requireRuntimeToken(req);
    const payload = await readJson(req);
    const nodeId = resolveRuntimeNodeIdFromRequest(req, payload.nodeId);
    assertRuntimeNodeRegistryAccess(
      db,
      nodeId,
      req.headers['x-runtime-node-secret'] || payload.registrationSecret,
      { address: payload.address == null ? undefined : payload.address },
    );
    sendJson(res, 200, {
      ok: true,
      item: heartbeatRuntimeNode(db, { ...payload, nodeId }, appConfig),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/runtime-control/me') {
    requireRuntimeToken(req);
    const nodeId = resolveRuntimeNodeIdFromRequest(req, searchParams.get('nodeId') || '');
    assertRuntimeNodeRegistryAccess(db, nodeId, req.headers['x-runtime-node-secret'] || searchParams.get('registrationSecret'));
    sendJson(res, 200, getRuntimeControlViewForNode(db, nodeId, appConfig));
    return true;
  }

  const runtimeApplyResultMatch = routeParams(pathname, /^\/api\/runtime-nodes\/([^/]+)\/apply-result$/);
  if (req.method === 'POST' && runtimeApplyResultMatch) {
    requireRuntimeToken(req);
    const payload = await readJson(req);
    const nodeId = resolveRuntimeNodeIdFromRequest(req, decodeURIComponent(runtimeApplyResultMatch[0]));
    assertRuntimeNodeRegistryAccess(db, nodeId, req.headers['x-runtime-node-secret'] || payload.registrationSecret);
    sendJson(res, 200, {
      ok: true,
      item: recordRuntimeNodeApplyResult(db, nodeId, payload, appConfig),
    });
    return true;
  }

  const runtimeStatsUploadMatch = routeParams(pathname, /^\/api\/runtime-nodes\/([^/]+)\/stats\/upload$/);
  if (req.method === 'POST' && runtimeStatsUploadMatch) {
    requireRuntimeToken(req);
    const payload = await readJson(req);
    const nodeId = resolveRuntimeNodeIdFromRequest(req, decodeURIComponent(runtimeStatsUploadMatch[0]));
    assertRuntimeNodeRegistryAccess(db, nodeId, req.headers['x-runtime-node-secret'] || payload.registrationSecret);
    sendJson(res, 200, uploadRuntimeNodeStats(db, nodeId, payload, appConfig));
    return true;
  }

  const runtimeArtifactDownloadMatch = routeParams(pathname, /^\/api\/runtime-artifacts\/releases\/([^/]+)\/([^/]+)$/);
  if (req.method === 'GET' && runtimeArtifactDownloadMatch) {
    const releaseId = decodeURIComponent(runtimeArtifactDownloadMatch[0]);
    const requestedFileName = decodeURIComponent(runtimeArtifactDownloadMatch[1]);
    const downloadRequest = validateRuntimeArtifactDownloadRequest(appConfig, {
      releaseId,
      fileName: requestedFileName,
      nodeId: searchParams.get('nodeId') || '',
      expires: searchParams.get('expires') || '',
      configVersion: searchParams.get('configVersion') || '',
      signature: searchParams.get('signature') || '',
    });
    const registryItem = getRuntimeNodeRegistryItem(db, downloadRequest.nodeId);
    if (!registryItem || !registryItem.enabled) {
      const error = new Error(`runtime node is not allowed to download artifacts: ${downloadRequest.nodeId}`);
      error.statusCode = 403;
      error.code = 'runtime_artifact_node_not_registered';
      throw error;
    }
    const release = getRelease(db, releaseId);
    if (!release) {
      const error = new Error(`release not found: ${releaseId}`);
      error.statusCode = 404;
      error.code = 'runtime_artifact_release_not_found';
      throw error;
    }
    const fileName = normalizeRuntimeArtifactFileName(downloadRequest.fileName);
    const filePath = fileName === 'snapshot.json'
      ? String(release.snapshotPath || '').trim()
      : fileName === 'manifest.json'
        ? String(release.manifestPath || '').trim()
        : path.join(String(release.artifactDir || '').trim(), fileName);
    if (!filePath || !fs.existsSync(filePath)) {
      const error = new Error(`runtime artifact file not found: ${releaseId}/${fileName}`);
      error.statusCode = 404;
      error.code = 'runtime_artifact_file_missing';
      throw error;
    }
    sendFile(res, filePath, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/runtime-control') {
    authorize(req, 'release.read');
    sendJson(res, 200, {
      item: getRuntimeControlState(db),
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/runtime-control/desired-version') {
    const payload = await readJson(req);
    const auth = authorize(req, 'release.publish', payload);
    sendJson(res, 201, {
      ok: true,
      item: setRuntimeDesiredRelease(db, payload, appConfig, auth.operator),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/me') {
    const auth = authorize(req, 'auth.read');
    sendJson(res, 200, {
      userId: auth.userId,
      userDisplayName: auth.userDisplayName,
      operator: auth.operator,
      role: auth.role,
      assignedRoles: auth.assignedRoles,
      permissions: auth.permissions,
      pageFeatures: auth.pageFeatures,
      pageAccess: auth.pageAccess,
      availableRoles: auth.assignedRoles,
      knownRoles: knownRoles(appConfig).map((item) => item.roleId || item),
      knownUsers: knownUsers(appConfig),
      roleDefinitions: auth.roleDefinitions || knownRoles(appConfig),
      permissionDefinitions: auth.permissionDefinitions || loadAccessControlDefinitions(appConfig).permissions,
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/system/access-control') {
    const definitions = loadAccessControlDefinitions(appConfig);
    sendJson(res, 200, {
      permissions: definitions.permissions,
      roles: definitions.roles,
      users: definitions.users,
      configPath: definitions.configPath,
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/system/governance-policies') {
    const policies = loadGovernancePolicies(appConfig);
    sendJson(res, 200, policies);
    return true;
  }

  if ((req.method === 'PUT' || req.method === 'POST') && pathname === '/api/console/system/governance-policies') {
    const payload = await readJson(req);
    const item = saveGovernancePolicies(appConfig, payload);
    sendJson(res, 200, { item });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/system/users') {
    const payload = await readJson(req);
    const item = upsertAccessControlUser(appConfig, payload);
    sendJson(res, 201, { item });
    return true;
  }

  const consoleSystemUserMatch = routeParams(pathname, /^\/api\/console\/system\/users\/([^/]+)$/);
  if (req.method === 'PUT' && consoleSystemUserMatch) {
    const payload = await readJson(req);
    const item = upsertAccessControlUser(appConfig, {
      ...payload,
      userId: decodeURIComponent(consoleSystemUserMatch[0]),
    });
    sendJson(res, 200, { item });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/system/roles') {
    const payload = await readJson(req);
    const item = upsertAccessControlRole(appConfig, payload);
    sendJson(res, 201, { item });
    return true;
  }

  const consoleSystemRoleMatch = routeParams(pathname, /^\/api\/console\/system\/roles\/([^/]+)$/);
  if (req.method === 'PUT' && consoleSystemRoleMatch) {
    const payload = await readJson(req);
    const item = upsertAccessControlRole(appConfig, {
      ...payload,
      roleId: decodeURIComponent(consoleSystemRoleMatch[0]),
    });
    sendJson(res, 200, { item });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/terms') {
    sendJson(res, 200, listTerms(db, {
      query: searchParams.get('query') || '',
      categoryCode: searchParams.get('categoryCode') || '',
      status: searchParams.get('status') || '',
      limit: searchParams.get('limit') || 50,
      offset: searchParams.get('offset') || 0,
    }));
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/dashboard') {
    const feedSources = listValidationFeedSources(appConfig);
    let releaseCount = 0;
    let gateBlockedReleaseCount = 0;
    let releaseOffset = 0;
    let releaseTotal = Number.POSITIVE_INFINITY;
    const releasePageSize = 100;
    while (releaseOffset < releaseTotal) {
      const releasePageResult = listReleasesPaged(db, {
        limit: releasePageSize,
        offset: releaseOffset,
      });
      const releaseItems = releasePageResult.items || [];
      releaseTotal = Number(releasePageResult.total || 0);
      if (!releaseItems.length) {
        break;
      }
      const gateMap = buildReleaseGateSummaryMap(db, releaseItems.map((item) => item.releaseId), {
        releases: releaseItems,
      });
      releaseCount = releaseTotal;
      gateBlockedReleaseCount += releaseItems.filter((item) => {
        const gate = gateMap.get(item.releaseId);
        return gate && gate.blocked === true;
      }).length;
      releaseOffset += releaseItems.length;
    }
    sendJson(res, 200, {
      ...getDashboardSummary(db),
      overview: {
        currentRelease: getCurrentPublishedRelease(db),
        currentCanaryRelease: getCurrentCanaryRelease(db),
        currentGrayPolicy: getActiveGrayPolicy(db),
        releaseCount,
        gateBlockedReleaseCount,
        feedErrorFileCount: feedSources.reduce((sum, item) => sum + Number(item.errorFileCount || 0), 0),
      },
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/overview') {
    sendJson(res, 200, { item: context.getConsoleOverview(db) });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/workbench') {
    const auth = authorize(req, 'dashboard.read');
    sendJson(res, 200, {
      item: getConsoleWorkbench(db, appConfig, auth),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/business-properties') {
    sendJson(res, 200, listConsoleBusinessProperties(appConfig));
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/system/business-properties') {
    sendJson(res, 200, loadBusinessPropertyDefinitions(appConfig));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/system/business-properties') {
    const payload = await readJson(req);
    sendJson(res, 201, {
      item: upsertBusinessProperty(appConfig, payload),
    });
    return true;
  }

  const consoleSystemBusinessPropertyMatch = routeParams(pathname, /^\/api\/console\/system\/business-properties\/([^/]+)$/);
  if (req.method === 'PUT' && consoleSystemBusinessPropertyMatch) {
    const payload = await readJson(req);
    sendJson(res, 200, {
      item: upsertBusinessProperty(appConfig, {
        ...payload,
        value: decodeURIComponent(consoleSystemBusinessPropertyMatch[0]),
      }),
    });
    return true;
  }

  const consoleSystemBusinessPropertyEnableMatch = routeParams(pathname, /^\/api\/console\/system\/business-properties\/([^/]+)\/enable$/);
  if (req.method === 'POST' && consoleSystemBusinessPropertyEnableMatch) {
    sendJson(res, 200, {
      item: setBusinessPropertyEnabled(appConfig, decodeURIComponent(consoleSystemBusinessPropertyEnableMatch[0]), true),
    });
    return true;
  }

  const consoleSystemBusinessPropertyDisableMatch = routeParams(pathname, /^\/api\/console\/system\/business-properties\/([^/]+)\/disable$/);
  if (req.method === 'POST' && consoleSystemBusinessPropertyDisableMatch) {
    sendJson(res, 200, {
      item: setBusinessPropertyEnabled(appConfig, decodeURIComponent(consoleSystemBusinessPropertyDisableMatch[0]), false),
    });
    return true;
  }

  const consoleSystemBusinessPropertyDeleteMatch = routeParams(pathname, /^\/api\/console\/system\/business-properties\/([^/]+)\/delete$/);
  if (req.method === 'POST' && consoleSystemBusinessPropertyDeleteMatch) {
    const value = decodeURIComponent(consoleSystemBusinessPropertyDeleteMatch[0]);
    assertConfigDeleteAllowed(countBusinessAttributeReferences(db, value), 'business_attribute', value);
    sendJson(res, 200, {
      item: deleteBusinessProperty(appConfig, value),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/dictionary-config/business-attributes') {
    const includeDisabled = ['1', 'true', 'yes'].includes(String(searchParams.get('includeDisabled') || '').trim().toLowerCase());
    sendJson(res, 200, includeDisabled
      ? listConsoleBusinessAttributeDefinitions(appConfig)
      : listConsoleBusinessProperties(appConfig));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/dictionary-config/business-attributes') {
    const payload = await readJson(req);
    sendJson(res, 201, {
      item: upsertBusinessProperty(appConfig, payload),
    });
    return true;
  }

  const consoleDictionaryBusinessAttributeMatch = routeParams(pathname, /^\/api\/console\/dictionary-config\/business-attributes\/([^/]+)$/);
  if (req.method === 'PUT' && consoleDictionaryBusinessAttributeMatch) {
    const payload = await readJson(req);
    sendJson(res, 200, {
      item: upsertBusinessProperty(appConfig, {
        ...payload,
        value: decodeURIComponent(consoleDictionaryBusinessAttributeMatch[0]),
      }),
    });
    return true;
  }

  const consoleDictionaryBusinessAttributeEnableMatch = routeParams(pathname, /^\/api\/console\/dictionary-config\/business-attributes\/([^/]+)\/enable$/);
  if (req.method === 'POST' && consoleDictionaryBusinessAttributeEnableMatch) {
    sendJson(res, 200, {
      item: setBusinessPropertyEnabled(appConfig, decodeURIComponent(consoleDictionaryBusinessAttributeEnableMatch[0]), true),
    });
    return true;
  }

  const consoleDictionaryBusinessAttributeDisableMatch = routeParams(pathname, /^\/api\/console\/dictionary-config\/business-attributes\/([^/]+)\/disable$/);
  if (req.method === 'POST' && consoleDictionaryBusinessAttributeDisableMatch) {
    sendJson(res, 200, {
      item: setBusinessPropertyEnabled(appConfig, decodeURIComponent(consoleDictionaryBusinessAttributeDisableMatch[0]), false),
    });
    return true;
  }

  const consoleDictionaryBusinessAttributeDeleteMatch = routeParams(pathname, /^\/api\/console\/dictionary-config\/business-attributes\/([^/]+)\/delete$/);
  if (req.method === 'POST' && consoleDictionaryBusinessAttributeDeleteMatch) {
    const value = decodeURIComponent(consoleDictionaryBusinessAttributeDeleteMatch[0]);
    assertConfigDeleteAllowed(countBusinessAttributeReferences(db, value), 'business_attribute', value);
    sendJson(res, 200, {
      item: deleteBusinessProperty(appConfig, value),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/dictionary-config/source-types') {
    sendJson(res, 200, listConsoleSourceTypes(appConfig, {
      includeDisabled: ['1', 'true', 'yes'].includes(String(searchParams.get('includeDisabled') || '').trim().toLowerCase()),
      scope: searchParams.get('scope') || '',
      entryMode: searchParams.get('entryMode') || '',
    }));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/dictionary-config/source-types') {
    const payload = await readJson(req);
    sendJson(res, 201, {
      item: upsertSourceType(appConfig, payload),
    });
    return true;
  }

  const consoleDictionarySourceTypeMatch = routeParams(pathname, /^\/api\/console\/dictionary-config\/source-types\/([^/]+)$/);
  if (req.method === 'PUT' && consoleDictionarySourceTypeMatch) {
    const payload = await readJson(req);
    sendJson(res, 200, {
      item: upsertSourceType(appConfig, {
        ...payload,
        code: decodeURIComponent(consoleDictionarySourceTypeMatch[0]),
      }),
    });
    return true;
  }

  const consoleDictionarySourceTypeEnableMatch = routeParams(pathname, /^\/api\/console\/dictionary-config\/source-types\/([^/]+)\/enable$/);
  if (req.method === 'POST' && consoleDictionarySourceTypeEnableMatch) {
    sendJson(res, 200, {
      item: setSourceTypeEnabled(appConfig, decodeURIComponent(consoleDictionarySourceTypeEnableMatch[0]), true),
    });
    return true;
  }

  const consoleDictionarySourceTypeDisableMatch = routeParams(pathname, /^\/api\/console\/dictionary-config\/source-types\/([^/]+)\/disable$/);
  if (req.method === 'POST' && consoleDictionarySourceTypeDisableMatch) {
    sendJson(res, 200, {
      item: setSourceTypeEnabled(appConfig, decodeURIComponent(consoleDictionarySourceTypeDisableMatch[0]), false),
    });
    return true;
  }

  const consoleDictionarySourceTypeDeleteMatch = routeParams(pathname, /^\/api\/console\/dictionary-config\/source-types\/([^/]+)\/delete$/);
  if (req.method === 'POST' && consoleDictionarySourceTypeDeleteMatch) {
    const code = decodeURIComponent(consoleDictionarySourceTypeDeleteMatch[0]);
    assertConfigDeleteAllowed(countSourceTypeReferences(db, code), 'source_type', code);
    sendJson(res, 200, {
      item: deleteSourceType(appConfig, code),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/runtime-control') {
    sendJson(res, 200, {
      item: getConsoleRuntimeRollout(db, appConfig, {
        releaseId: searchParams.get('releaseId') || '',
      }),
    });
    return true;
  }

  const consoleRuntimeEvidenceMatch = routeParams(pathname, /^\/api\/console\/runtime-control\/evidence\/([^/]+)$/);
  if (req.method === 'GET' && consoleRuntimeEvidenceMatch) {
    const item = getRuntimeControlVerificationReport(appConfig, decodeURIComponent(consoleRuntimeEvidenceMatch[0]));
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'runtime control evidence not found' });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/runtime-demo/current') {
    sendJson(res, 200, {
      stable: runtimeState.stable ? runtimeState.stable.getCurrentVersion() : null,
      canary: runtimeState.canary ? runtimeState.canary.getCurrentVersion() : null,
      grayPolicy: runtimeState.grayPolicy,
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/runtime-verify/current') {
    normalizeRuntimeVerifyTarget({
      targetMode: searchParams.get('targetMode') || '',
      nodeId: searchParams.get('nodeId') || '',
      trafficKey: searchParams.get('trafficKey') || '',
    });
    sendJson(res, 200, {
      stable: runtimeState.stable ? runtimeState.stable.getCurrentVersion() : null,
      canary: runtimeState.canary ? runtimeState.canary.getCurrentVersion() : null,
      grayPolicy: runtimeState.grayPolicy,
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/runtime-demo/simulate') {
    const payload = await readJson(req);
    sendJson(res, 200, executeCorrection({
      ...payload,
      enablePinyinAutoReplace: payload.enablePinyinAutoReplace === true,
    }, 'http'));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/runtime-verify/correct') {
    const payload = await readJson(req);
    normalizeRuntimeVerifyTarget(payload);
    const result = executeCorrection(payload, 'http');
    sendJson(res, 200, {
      correctedText: result.correctedText,
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/runtime-verify/correct-cand') {
    const payload = await readJson(req);
    normalizeRuntimeVerifyTarget(payload);
    const result = executeCorrectionCandidates(payload, 'http');
    sendJson(res, 200, {
      correctedTexts: result.correctedTexts,
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/runtime-control/desired-version') {
    const payload = await readJson(req);
    const auth = authorize(req, 'release.publish', payload);
    sendJson(res, 201, {
      ok: true,
      item: setRuntimeDesiredRelease(db, payload, appConfig, auth.operator),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/runtime-node-registry') {
    sendJson(res, 200, listConsoleRuntimeNodeRegistry(db, {
      enabled: searchParams.get('enabled') || '',
      env: searchParams.get('env') || '',
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 50,
    }, appConfig));
    return true;
  }

  const consoleRuntimeNodeRegistryMatch = routeParams(pathname, /^\/api\/console\/runtime-node-registry\/([^/]+)$/);
  if (req.method === 'GET' && consoleRuntimeNodeRegistryMatch) {
    const item = getConsoleRuntimeNodeRegistryDetail(db, decodeURIComponent(consoleRuntimeNodeRegistryMatch[0]), appConfig);
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'runtime node registry not found' });
    return true;
  }

  const consoleRuntimeNodeRegistryDeploymentGuideMatch = routeParams(pathname, /^\/api\/console\/runtime-node-registry\/([^/]+)\/deployment-guide$/);
  if (req.method === 'GET' && consoleRuntimeNodeRegistryDeploymentGuideMatch) {
    const auth = authorize(req, 'runtime.node.registry.manage');
    const item = getConsoleRuntimeNodeRegistryDetail(db, decodeURIComponent(consoleRuntimeNodeRegistryDeploymentGuideMatch[0]), appConfig);
    if (!item) {
      sendJson(res, 404, { error: 'runtime node registry not found' });
      return true;
    }
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const protocol = forwardedProto || (req.socket && req.socket.encrypted ? 'https' : 'http');
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    const adminBaseUrl = host ? `${protocol}://${host}` : String((appConfig.runtimeControl || {}).adminBaseUrl || '').trim();
    const runtimeToken = String(((appConfig || {}).auth || {}).runtimeBearerToken || '').trim();
    const runtimeDelivery = (appConfig || {}).runtimeDelivery || {};
    const runtimeDeliveryMode = String(runtimeDelivery.mode || '').trim() || 'file';
    const runtimeArtifactBaseUrl = String(runtimeDelivery.adminArtifactBaseUrl || '').trim();
    const runtimeArtifactSignedUrlConfigured = Boolean(String(runtimeDelivery.signedUrlSecret || '').trim());
    const control = getRuntimeControlState(db);
    const currentRelease = control && control.releaseId ? getRelease(db, control.releaseId) : null;
    const artifactMetadata = currentRelease
      ? buildReleaseArtifactMetadata(appConfig, {
        releaseId: currentRelease.releaseId,
        manifestPath: currentRelease.manifestPath,
        snapshotPath: currentRelease.snapshotPath,
        packagePath: path.join(currentRelease.artifactDir, 'package.tar.gz'),
      }, {
        nodeId: item.nodeId,
        configVersion: control ? control.configVersion : 0,
      })
      : null;
    const primaryArtifact = artifactMetadata && artifactMetadata.primaryArtifact ? artifactMetadata.primaryArtifact : null;
    sendJson(res, 200, {
      item: {
        nodeId: item.nodeId,
        adminBaseUrl,
        runtimeTokenConfigured: Boolean(runtimeToken),
        runtimeTokenValue: runtimeToken,
        runtimeDeliveryMode,
        runtimeArtifactBaseUrl,
        runtimeArtifactSignedUrlConfigured,
        currentReleaseId: control ? String(control.releaseId || '').trim() : '',
        currentDesiredVersion: control ? String(control.desiredVersion || '').trim() : '',
        currentArtifactKind: primaryArtifact ? String(primaryArtifact.kind || '').trim() : '',
        currentArtifactUrl: primaryArtifact ? String(primaryArtifact.artifactUrl || '') : '',
        currentArtifactDownloadPathPattern: `${String(runtimeArtifactBaseUrl || adminBaseUrl || '').replace(/\/+$/, '')}/api/runtime-artifacts/releases/<releaseId>/<fileName>`,
        note: runtimeToken
          ? '当前 admin 已启用 runtime Bearer Token，部署命令可直接复用该值。'
          : '当前 admin 未启用 runtime Bearer Token，启动命令无需额外附带 ACDP_RUNTIME_TOKEN。',
        operator: auth.operator,
      },
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/runtime-node-registry') {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    const created = createRuntimeNodeRegistryItem(db, payload, auth.operator);
    sendJson(res, 201, { ok: true, ...created });
    return true;
  }

  if (req.method === 'PUT' && consoleRuntimeNodeRegistryMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      item: updateRuntimeNodeRegistryItem(db, decodeURIComponent(consoleRuntimeNodeRegistryMatch[0]), payload, auth.operator),
    });
    return true;
  }

  const consoleRuntimeNodeRegistryEnableMatch = routeParams(pathname, /^\/api\/console\/runtime-node-registry\/([^/]+)\/enable$/);
  if (req.method === 'POST' && consoleRuntimeNodeRegistryEnableMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      item: enableRuntimeNodeRegistryItem(db, decodeURIComponent(consoleRuntimeNodeRegistryEnableMatch[0]), auth.operator),
    });
    return true;
  }

  const consoleRuntimeNodeRegistryDisableMatch = routeParams(pathname, /^\/api\/console\/runtime-node-registry\/([^/]+)\/disable$/);
  if (req.method === 'POST' && consoleRuntimeNodeRegistryDisableMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      item: disableRuntimeNodeRegistryItem(db, decodeURIComponent(consoleRuntimeNodeRegistryDisableMatch[0]), auth.operator),
    });
    return true;
  }

  const consoleRuntimeNodeRegistryRotateMatch = routeParams(pathname, /^\/api\/console\/runtime-node-registry\/([^/]+)\/rotate-secret$/);
  if (req.method === 'POST' && consoleRuntimeNodeRegistryRotateMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      ...rotateRuntimeNodeRegistrySecret(db, decodeURIComponent(consoleRuntimeNodeRegistryRotateMatch[0]), auth.operator),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/runtime-nodes') {
    sendJson(res, 200, listConsoleRuntimeNodes(db, appConfig, {
      status: searchParams.get('status') || '',
      env: searchParams.get('env') || '',
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 20,
    }));
    return true;
  }

  const consoleRuntimeNodeMatch = routeParams(pathname, /^\/api\/console\/runtime-nodes\/([^/]+)$/);
  if (req.method === 'GET' && consoleRuntimeNodeMatch) {
    const item = getConsoleRuntimeNodeDetail(db, appConfig, decodeURIComponent(consoleRuntimeNodeMatch[0]));
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'runtime node not found' });
    return true;
  }

  if (req.method === 'GET' && (pathname === '/api/console/terms' || pathname === '/api/console/dictionary/terms')) {
    sendJson(res, 200, listConsoleTerms(db, {
      query: searchParams.get('query') || '',
      categoryCode: searchParams.get('categoryCode') || '',
      status: searchParams.get('status') || '',
      sourceType: searchParams.get('sourceType') || '',
      riskLevel: searchParams.get('riskLevel') || '',
      sortBy: searchParams.get('sortBy') || 'updated_at',
      sortDirection: searchParams.get('sortDirection') || 'desc',
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 20,
    }));
    return true;
  }

  if (req.method === 'GET' && (pathname === '/api/console/terms/export' || pathname === '/api/console/dictionary/terms/export')) {
    const filters = termFiltersFromSearch(searchParams);
    const rows = [];
    const pageSize = 500;
    let offset = 0;
    let total = 0;
    do {
      const result = listTerms(db, {
        ...filters,
        limit: pageSize,
        offset,
      });
      total = result.total || 0;
      rows.push(...(result.items || []).map((item) => ([
        item.termId,
        item.categoryCode,
        item.canonicalText,
        item.status,
        item.sourceType,
        item.riskLevel,
        item.priority,
        (item.aliases || []).join('|'),
        item.updatedAt,
      ])));
      offset += pageSize;
    } while (offset < total);
    sendCsvDownload(res, 'console_terms_export', [
      'termId',
      'categoryCode',
      'canonicalText',
      'status',
      'sourceType',
      'riskLevel',
      'priority',
      'aliases',
      'updatedAt',
    ], rows);
    return true;
  }

  const consoleTermValidationMatch = routeParams(pathname, /^\/api\/console\/(?:dictionary\/)?terms\/([^/]+)\/validation-cases$/);
  if (req.method === 'GET' && consoleTermValidationMatch) {
    const term = getConsoleTermDetail(db, decodeURIComponent(consoleTermValidationMatch[0]));
    if (!term) {
      sendJson(res, 404, { error: 'term not found' });
      return true;
    }
    sendJson(res, 200, {
      items: listValidationCases(db, { enabled: true, limit: 500 })
        .filter((item) => (item.expectedCanonicals || []).includes(term.basic.canonicalText)),
    });
    return true;
  }

  const consoleTermPinyinGenerateMatch = routeParams(pathname, /^\/api\/console\/(?:dictionary\/)?terms\/([^/]+)\/generate-pinyin-candidates$/);
  if (req.method === 'POST' && consoleTermPinyinGenerateMatch) {
    const payload = await readJson(req);
    sendJson(res, 200, {
      item: generateTermPinyinCandidates(db, decodeURIComponent(consoleTermPinyinGenerateMatch[0]), {
        limit: payload.limit || 12,
      }),
    });
    return true;
  }

  const consoleTermPinyinSubmitMatch = routeParams(pathname, /^\/api\/console\/(?:dictionary\/)?terms\/([^/]+)\/pinyin-candidates$/);
  if (req.method === 'POST' && consoleTermPinyinSubmitMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, {
      ok: true,
      item: submitPinyinCandidateReview(
        db,
        decodeURIComponent(consoleTermPinyinSubmitMatch[0]),
        payload,
        auth.operator,
      ),
    });
    return true;
  }

  const consoleTermMatch = routeParams(pathname, /^\/api\/console\/(?:dictionary\/)?terms\/([^/]+)$/);
  if (req.method === 'GET' && consoleTermMatch) {
    const item = getConsoleTermDetail(db, decodeURIComponent(consoleTermMatch[0]));
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'term not found' });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/import/templates') {
    sendJson(res, 200, {
      items: listImportTemplates(appConfig),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/help') {
    sendJson(res, 200, {
      items: listConsoleHelpArticles(appConfig),
    });
    return true;
  }

  const consoleHelpSourceMatch = routeParams(pathname, /^\/api\/console\/help\/([^/]+)\/source$/);
  if (req.method === 'GET' && consoleHelpSourceMatch) {
    const slug = decodeURIComponent(consoleHelpSourceMatch[0]);
    const sourceFile = resolveConsoleHelpSourceFile(appConfig.projectRoot, slug, appConfig);
    if (!sourceFile || !fs.existsSync(sourceFile)) {
      sendJson(res, 404, { error: 'help article source not found' });
      return true;
    }
    sendFile(res, sourceFile, {
      downloadName: `${slug}_help.md`,
    });
    return true;
  }

  const consoleHelpMatch = routeParams(pathname, /^\/api\/console\/help\/([^/]+)$/);
  if (req.method === 'GET' && consoleHelpMatch) {
    const item = getConsoleHelpArticle(decodeURIComponent(consoleHelpMatch[0]), appConfig);
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'help article not found' });
    return true;
  }

  const consoleTemplateDownloadMatch = routeParams(pathname, /^\/api\/console\/import\/templates\/([^/]+)\/download$/);
  if (req.method === 'GET' && consoleTemplateDownloadMatch) {
    const templateCode = decodeURIComponent(consoleTemplateDownloadMatch[0]);
    const kind = String(searchParams.get('kind') || 'template') === 'example' ? 'example' : 'template';
    const filePath = resolveImportTemplateAsset(appConfig, templateCode, kind);
    if (!filePath || !fs.existsSync(filePath)) {
      sendJson(res, 404, { error: 'template asset not found' });
      return true;
    }
    const downloadName = `${templateCode}${kind === 'example' ? '_示例' : '_模板'}${path.extname(filePath)}`;
    sendFile(res, filePath, { downloadName });
    return true;
  }

  const consoleTemplateMatch = routeParams(pathname, /^\/api\/console\/import\/templates\/([^/]+)$/);
  if (req.method === 'GET' && consoleTemplateMatch) {
    const item = getImportTemplate(appConfig, decodeURIComponent(consoleTemplateMatch[0]));
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'template not found' });
    return true;
  }

  if (req.method === 'GET' && (pathname === '/api/console/import/jobs' || pathname === '/api/console/dictionary/import-jobs')) {
    sendJson(res, 200, listConsoleImportJobs(db, {
      status: searchParams.get('status') || '',
      jobType: searchParams.get('jobType') || '',
      sourceType: searchParams.get('sourceType') || '',
      submittedBy: searchParams.get('submittedBy') || '',
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 20,
    }));
    return true;
  }

  const consoleImportJobRowsMatch = routeParams(pathname, /^\/api\/console\/(?:(?:dictionary\/)?import-jobs|import\/jobs)\/([^/]+)\/rows$/);
  if (req.method === 'GET' && consoleImportJobRowsMatch) {
    const jobId = decodeURIComponent(consoleImportJobRowsMatch[0]);
    if (!getImportJob(db, jobId)) {
      sendJson(res, 404, { error: 'import job not found' });
      return true;
    }
    sendJson(res, 200, listImportJobRows(db, jobId, {
      status: searchParams.get('status') || '',
      decision: searchParams.get('decision') || '',
      recommendedAction: searchParams.get('recommendedAction') || '',
      pageSize: searchParams.get('pageSize') || 100,
    }));
    return true;
  }

  const consoleImportJobErrorsDownloadMatch = routeParams(pathname, /^\/api\/console\/(?:(?:dictionary\/)?import-jobs|import\/jobs)\/([^/]+)\/errors\/download$/);
  if (req.method === 'GET' && consoleImportJobErrorsDownloadMatch) {
    const jobId = decodeURIComponent(consoleImportJobErrorsDownloadMatch[0]);
    if (!getImportJob(db, jobId)) {
      sendJson(res, 404, { error: 'import job not found' });
      return true;
    }
    const rows = listImportJobRows(db, jobId, { status: 'error', pageSize: 1000 }).items;
    const body = ['rowNo,canonicalText,errorCode,errorMessage,issueCodes,issueMessages,traceSummary']
      .concat(rows.map((item) => {
        const issues = Array.isArray(item.issues) ? item.issues : [];
        const canonicalText = String((((item || {}).normalizedPayload || {}).canonicalText) || '').trim();
        const issueCodes = issues.map((entry) => String(entry.code || '').trim()).filter(Boolean).join('|');
        const issueMessages = issues.map((entry) => String(entry.message || '').trim()).filter(Boolean).join(' | ');
        const traceSummary = issues.map((entry) => {
          if (!entry.trace) {
            return '';
          }
          const trace = entry.trace;
          return [trace.termId, trace.categoryCode, trace.canonicalText, trace.aliasText, trace.importJobId].filter(Boolean).join('/');
        }).filter(Boolean).join(' | ');
        return `${item.rowNo},"${canonicalText.replace(/"/g, '""')}","${String(item.errorCode || '').replace(/"/g, '""')}","${String(item.errorMessage || '').replace(/"/g, '""')}","${issueCodes.replace(/"/g, '""')}","${issueMessages.replace(/"/g, '""')}","${traceSummary.replace(/"/g, '""')}"`;
      }))
      .join('\n');
    const output = `\uFEFF${body}`;
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Length': Buffer.byteLength(output),
      'Content-Disposition': `attachment; filename="${jobId}_errors.csv"; filename*=UTF-8''${encodeURIComponent(`${jobId}_错误报表.csv`)}`,
    });
    res.end(output);
    return true;
  }

  const consoleImportJobMatch = routeParams(pathname, /^\/api\/console\/(?:(?:dictionary\/)?import-jobs|import\/jobs)\/([^/]+)$/);
  if (req.method === 'GET' && consoleImportJobMatch) {
    const item = getConsoleImportJobDetail(db, appConfig, decodeURIComponent(consoleImportJobMatch[0]));
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'import job not found' });
    return true;
  }

  if (req.method === 'GET' && (pathname === '/api/console/reviews' || pathname === '/api/console/dictionary/reviews')) {
    sendJson(res, 200, listConsoleReviews(db, {
      taskType: searchParams.get('taskType') || '',
      targetType: searchParams.get('targetType') || '',
      status: searchParams.get('status') || '',
      importJobId: searchParams.get('importJobId') || '',
      submittedBy: searchParams.get('submittedBy') || '',
      reviewedBy: searchParams.get('reviewedBy') || '',
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 50,
    }));
    return true;
  }

  const consoleReviewMatch = routeParams(pathname, /^\/api\/console\/(?:(?:dictionary\/)?reviews)\/([^/]+)$/);
  if (req.method === 'GET' && consoleReviewMatch) {
    const item = getConsoleReviewDetail(db, decodeURIComponent(consoleReviewMatch[0]));
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'review task not found' });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/console/releases') {
    sendJson(res, 200, listConsoleReleases(db, {
      view: searchParams.get('view') || '',
      status: searchParams.get('status') || '',
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 20,
    }));
    return true;
  }

  const consoleReleaseGateMatch = routeParams(pathname, /^\/api\/console\/releases\/([^/]+)\/gate$/);
  if (req.method === 'GET' && consoleReleaseGateMatch) {
    const releaseId = decodeURIComponent(consoleReleaseGateMatch[0]);
    const gateDetail = context.getConsoleReleaseGateDetail(db, releaseId);
    if (!gateDetail) {
      sendJson(res, 404, { error: 'release not found' });
      return true;
    }
    sendJson(res, 200, { item: gateDetail.gate });
    return true;
  }

  const consoleReleaseValidationMatch = routeParams(pathname, /^\/api\/console\/releases\/([^/]+)\/validation$/);
  if (req.method === 'GET' && consoleReleaseValidationMatch) {
    const releaseId = decodeURIComponent(consoleReleaseValidationMatch[0]);
    const gateDetail = context.getConsoleReleaseGateDetail(db, releaseId);
    if (!gateDetail) {
      sendJson(res, 404, { error: 'release not found' });
      return true;
    }
    sendJson(res, 200, { item: gateDetail.validation });
    return true;
  }

  const consoleReleaseMatch = routeParams(pathname, /^\/api\/console\/releases\/([^/]+)$/);
  if (req.method === 'GET' && consoleReleaseMatch) {
    const item = getConsoleReleaseDetail(db, appConfig, decodeURIComponent(consoleReleaseMatch[0]));
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'release not found' });
    return true;
  }

  if (req.method === 'GET' && (pathname === '/api/console/validation-cases' || pathname === '/api/console/validation/cases')) {
    sendJson(res, 200, listConsoleValidationCases(db, {
      enabled: searchParams.get('enabled'),
      sourceType: searchParams.get('sourceType') || '',
      query: searchParams.get('query') || '',
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 50,
    }));
    return true;
  }

  if (req.method === 'GET' && (pathname === '/api/console/validation-cases/export' || pathname === '/api/console/validation/cases/export')) {
    const items = listAllValidationCasesByFilters(db, validationFiltersFromSearch(searchParams));
    sendCsvDownload(res, 'console_validation_cases_export', [
      'caseId',
      'description',
      'text',
      'expectedCanonicals',
      'enabled',
      'sourceType',
      'notes',
      'updatedAt',
    ], items.map((item) => ([
      item.caseId,
      item.description || '',
      item.text || '',
      (item.expectedCanonicals || []).join('|'),
      item.enabled ? 'true' : 'false',
      item.sourceType || '',
      item.notes || '',
      item.updatedAt,
    ])));
    return true;
  }

  const consoleValidationRelatedTermsMatch = routeParams(pathname, /^\/api\/console\/(?:validation\/cases|validation-cases)\/([^/]+)\/related-terms$/);
  if (req.method === 'GET' && consoleValidationRelatedTermsMatch) {
    const caseId = decodeURIComponent(consoleValidationRelatedTermsMatch[0]);
    const item = getConsoleValidationCaseDetail(db, caseId);
    if (!item) {
      sendJson(res, 404, { error: 'validation case not found' });
      return true;
    }
    sendJson(res, 200, {
      items: listRelatedTermsForValidationCase(db, caseId),
    });
    return true;
  }

  const consoleValidationCaseMatch = routeParams(pathname, /^\/api\/console\/(?:validation\/cases|validation-cases)\/([^/]+)$/);
  if (req.method === 'GET' && consoleValidationCaseMatch) {
    const caseId = decodeURIComponent(consoleValidationCaseMatch[0]);
    const item = getConsoleValidationCaseDetail(db, caseId);
    if (!item) {
      sendJson(res, 404, { error: 'validation case not found' });
      return true;
    }
    sendJson(res, 200, {
      item: {
        ...item,
        relatedTerms: listRelatedTermsForValidationCase(db, caseId),
        latestValidationResults: [],
      },
    });
    return true;
  }

  if (req.method === 'POST' && (pathname === '/api/console/terms' || pathname === '/api/console/dictionary/terms')) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    const admission = enforceTermAdmission(db, buildAdmissionPayloadForPersist(payload), {
      sourceMode: 'manual',
      message: '当前词条内容不满足准入规则，请先修正后再保存。',
    });
    assertSaveActionAllowed(admission, '当前词条不能直接新建，请先按系统建议处理。');
    const persistPayload = buildPersistableTermPayload(payload, admission, null);
    sendJson(res, 201, {
      ok: true,
      item: createTerm(db, persistPayload, auth.operator),
      admission: buildAdmissionSummaryPayload(admission),
    });
    return true;
  }

  const consoleTermUpdateMatch = routeParams(pathname, /^\/api\/console\/(?:dictionary\/)?terms\/([^/]+)$/);
  if (req.method === 'PUT' && consoleTermUpdateMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    const termId = decodeURIComponent(consoleTermUpdateMatch[0]);
    const current = getTerm(db, termId);
    if (!current) {
      sendJson(res, 404, { error: 'term not found' });
      return true;
    }
    const currentPinyinProfile = getTermPinyinProfile(db, termId, current.canonicalText);
    const admission = enforceTermAdmission(db, buildAdmissionPayloadForPersist(payload, {
      ...current,
      pinyinProfile: currentPinyinProfile,
    }), {
      sourceMode: 'manual',
      currentTermId: current.termId,
      currentTerm: {
        ...current,
        pinyinProfile: currentPinyinProfile,
      },
      message: '当前词条内容不满足准入规则，请先修正后再保存。',
    });
    assertSaveActionAllowed(admission, '当前词条不能直接保存，请先按系统建议处理。');
    const persistPayload = buildPersistableTermPayload(payload, admission, {
      ...current,
      rules: current.rules || {},
    });
    sendJson(res, 200, {
      ok: true,
      item: updateTerm(db, decodeURIComponent(consoleTermUpdateMatch[0]), persistPayload, auth.operator),
      admission: buildAdmissionSummaryPayload(admission),
    });
    return true;
  }

  const consoleTermSubmitReviewMatch = routeParams(pathname, /^\/api\/console\/(?:dictionary\/)?terms\/([^/]+)\/submit-review$/);
  if (req.method === 'POST' && consoleTermSubmitReviewMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    const termId = decodeURIComponent(consoleTermSubmitReviewMatch[0]);
    const current = getTerm(db, termId);
    if (!current) {
      sendJson(res, 404, { error: 'term not found' });
      return true;
    }
    const currentPinyinProfile = getTermPinyinProfile(db, termId, current.canonicalText);
    const admission = evaluateTermAdmission(db, {
      ...current,
      pinyinProfile: currentPinyinProfile,
    }, {
      currentTermId: current.termId,
      currentTerm: {
        ...current,
        pinyinProfile: currentPinyinProfile,
      },
      sourceMode: 'manual',
    });
    const summary = summarizeTermAdmission(admission);
    if (summary.level === 'blocked') {
      throw createBlockedAdmissionError(summary, {
        code: 'term_admission_blocked',
        message: '当前词条内容不满足准入规则，请先修正后再提交审核。',
      });
    }
    sendJson(res, 200, {
      ok: true,
      item: submitTermReview(
        db,
        termId,
        auth.operator,
        payload.comment || '',
        buildManualTermReviewOptions(current, admission),
      ),
    });
    return true;
  }

  const consoleTermDisableMatch = routeParams(pathname, /^\/api\/console\/(?:dictionary\/)?terms\/([^/]+)\/disable$/);
  if (req.method === 'POST' && consoleTermDisableMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      item: updateTermStatus(db, decodeURIComponent(consoleTermDisableMatch[0]), 'disabled', auth.operator, payload.reason || 'console disable'),
    });
    return true;
  }

  if (req.method === 'POST' && (pathname === '/api/console/terms/batch-submit-review' || pathname === '/api/console/dictionary/terms/batch-submit-review')) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    const termIds = Array.isArray(payload.termIds) && payload.termIds.length
      ? payload.termIds
      : listTermIdsByFilters(db, termFiltersFromPayload(payload));
    sendJson(res, 200, {
      ok: true,
      item: batchSubmitTermReview(db, termIds, auth.operator, payload.comment || 'console batch submit review'),
    });
    return true;
  }

  if (req.method === 'POST' && (pathname === '/api/console/terms/batch-disable' || pathname === '/api/console/dictionary/terms/batch-disable')) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    const termIds = Array.isArray(payload.termIds) && payload.termIds.length
      ? payload.termIds
      : listTermIdsByFilters(db, termFiltersFromPayload(payload));
    sendJson(res, 200, {
      ok: true,
      item: batchDisableTerms(db, termIds, auth.operator, payload.reason || 'console batch disable'),
    });
    return true;
  }

  if (req.method === 'POST' && (pathname === '/api/console/reviews/batch-approve' || pathname === '/api/console/dictionary/reviews/batch-approve')) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      item: batchApproveReviewTasks(db, payload, auth.operator),
    });
    return true;
  }

  if (req.method === 'POST' && (pathname === '/api/console/reviews/batch-reject' || pathname === '/api/console/dictionary/reviews/batch-reject')) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      item: batchRejectReviewTasks(db, payload, auth.operator),
    });
    return true;
  }

  if (req.method === 'POST' && (pathname === '/api/console/import/jobs' || pathname === '/api/console/dictionary/import-jobs')) {
    const contentType = String(req.headers['content-type'] || '');
    let payload;
    if (contentType.toLowerCase().startsWith('multipart/form-data')) {
      const form = await readMultipartForm(req);
      if (!form.files.file) {
        sendJson(res, 400, { error: 'missing_file: file is required' });
        return true;
      }
      payload = {
        templateCode: form.fields.templateCode || '',
        defaultCategoryCode: form.fields.defaultCategoryCode || '',
        sourceType: form.fields.sourceType || '',
        comment: form.fields.comment || '',
        fileName: form.files.file.fileName,
        contentType: form.files.file.contentType,
        fileContent: form.files.file.buffer,
      };
    } else {
      payload = await readJson(req);
    }
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, {
      ok: true,
      item: createImportJob(db, appConfig, payload, auth.operator),
    });
    return true;
  }

  const consoleImportConfirmMatch = routeParams(pathname, /^\/api\/console\/(?:(?:dictionary\/)?import-jobs|import\/jobs)\/([^/]+)\/confirm$/);
  if (req.method === 'POST' && consoleImportConfirmMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      item: confirmImportJob(db, appConfig, decodeURIComponent(consoleImportConfirmMatch[0]), auth.operator),
    });
    return true;
  }

  const consoleImportCancelMatch = routeParams(pathname, /^\/api\/console\/(?:(?:dictionary\/)?import-jobs|import\/jobs)\/([^/]+)\/cancel$/);
  if (req.method === 'POST' && consoleImportCancelMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      item: cancelImportJob(db, decodeURIComponent(consoleImportCancelMatch[0]), auth.operator, payload.reason || ''),
    });
    return true;
  }

  const consoleReviewApproveMatch = routeParams(pathname, /^\/api\/console\/(?:(?:dictionary\/)?reviews)\/([^/]+)\/approve$/);
  if (req.method === 'POST' && consoleReviewApproveMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      item: approveReviewTask(db, decodeURIComponent(consoleReviewApproveMatch[0]), auth.operator),
    });
    return true;
  }

  const consoleReviewRejectMatch = routeParams(pathname, /^\/api\/console\/(?:(?:dictionary\/)?reviews)\/([^/]+)\/reject$/);
  if (req.method === 'POST' && consoleReviewRejectMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      item: rejectReviewTask(db, decodeURIComponent(consoleReviewRejectMatch[0]), auth.operator, payload.comment || ''),
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/releases/build') {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, {
      ok: true,
      item: buildRelease(payload.summary || 'console build', auth.operator),
    });
    return true;
  }

  const consoleReleaseSubmitReviewMatch = routeParams(pathname, /^\/api\/console\/releases\/([^/]+)\/submit-review$/);
  if (req.method === 'POST' && consoleReleaseSubmitReviewMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, {
      ok: true,
      item: submitReleaseReview(db, decodeURIComponent(consoleReleaseSubmitReviewMatch[0]), auth.operator, payload.comment || ''),
    });
    return true;
  }

  const consoleReleasePublishMatch = routeParams(pathname, /^\/api\/console\/releases\/([^/]+)\/publish$/);
  if (req.method === 'POST' && consoleReleasePublishMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    ensureReleaseApprovalForExposure(decodeURIComponent(consoleReleasePublishMatch[0]), auth.operator, 'publish');
    const release = activatePublishedRelease(decodeURIComponent(consoleReleasePublishMatch[0]), auth.operator, 'publish');
    refreshRuntimeState();
    sendJson(res, 200, {
      ok: true,
      item: { mode: payload.mode || 'publish', release },
    });
    return true;
  }

  const consoleReleaseRollbackMatch = routeParams(pathname, /^\/api\/console\/releases\/([^/]+)\/rollback$/);
  if (req.method === 'POST' && consoleReleaseRollbackMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    const release = activatePublishedRelease(decodeURIComponent(consoleReleaseRollbackMatch[0]), auth.operator, 'rollback');
    refreshRuntimeState();
    sendJson(res, 200, {
      ok: true,
      item: { mode: 'rollback', release, reason: payload.reason || '' },
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/console/gray-policies') {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    ensureReleaseApprovalForExposure(payload.releaseId, auth.operator, 'canary');
    const item = createGrayPolicy(db, payload, auth.operator);
    refreshRuntimeState();
    sendJson(res, 201, {
      ok: true,
      item,
    });
    return true;
  }

  if (req.method === 'POST' && (pathname === '/api/console/validation-cases' || pathname === '/api/console/validation/cases')) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, {
      ok: true,
      item: createValidationCase(db, payload, auth.operator),
    });
    return true;
  }

  if (req.method === 'POST' && (pathname === '/api/console/validation-cases/import' || pathname === '/api/console/validation/cases/import')) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, {
      ok: true,
      item: importValidationCases(db, payload, auth.operator),
    });
    return true;
  }

  const consoleValidationDisableMatch = routeParams(pathname, /^\/api\/console\/(?:validation\/cases|validation-cases)\/([^/]+)\/disable$/);
  if (req.method === 'POST' && consoleValidationDisableMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, {
      ok: true,
      item: disableValidationCase(db, decodeURIComponent(consoleValidationDisableMatch[0]), auth.operator || payload.operator || 'console_user'),
    });
    return true;
  }

  if (req.method === 'POST' && (pathname === '/api/console/validation-cases/batch-disable' || pathname === '/api/console/validation/cases/batch-disable')) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    const caseIds = Array.isArray(payload.caseIds) && payload.caseIds.length
      ? payload.caseIds
      : listValidationCaseIdsByFilters(db, validationFiltersFromPayload(payload));
    sendJson(res, 200, {
      ok: true,
      item: batchDisableValidationCases(db, caseIds, auth.operator || payload.operator || 'console_user'),
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/terms') {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    const admission = enforceTermAdmission(db, buildAdmissionPayloadForPersist(payload), {
      message: '当前词条内容不满足准入规则，请先修正后再保存。',
    });
    assertSaveActionAllowed(admission, '当前词条不能直接新建，请先按系统建议处理。');
    const persistPayload = buildPersistableTermPayload(payload, admission, null);
    sendJson(res, 201, {
      item: createTerm(db, persistPayload, auth.operator),
      admission: buildAdmissionSummaryPayload(admission),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/validation-cases') {
    sendJson(res, 200, {
      items: listValidationCases(db, {
        enabled: searchParams.get('enabled'),
        sourceType: searchParams.get('sourceType') || '',
        query: searchParams.get('query') || '',
        limit: searchParams.get('limit') || 200,
      }),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/validation-cases/feed-sources') {
    sendJson(res, 200, {
      items: listValidationFeedSources(appConfig),
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/validation-cases') {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, createValidationCase(db, payload, auth.operator));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/validation-cases/import') {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, importValidationCases(db, payload, auth.operator));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/validation-cases/import-feeds') {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, await importValidationFeeds(db, appConfig, auth.operator, {
      sourceTypes: Array.isArray(payload.sourceTypes) ? payload.sourceTypes : [],
      replayErrors: payload.replayErrors === true,
    }));
    return true;
  }

  const validationCaseDisableMatch = routeParams(pathname, /^\/api\/admin\/validation-cases\/([^/]+)\/disable$/);
  if (req.method === 'POST' && validationCaseDisableMatch) {
    const auth = authContextFrom(req);
    sendJson(res, 200, disableValidationCase(db, decodeURIComponent(validationCaseDisableMatch[0]), auth.operator));
    return true;
  }

  const termIdMatch = routeParams(pathname, /^\/api\/admin\/terms\/([^/]+)$/);
  if (req.method === 'GET' && termIdMatch) {
    const term = getTerm(db, decodeURIComponent(termIdMatch[0]));
    sendJson(res, term ? 200 : 404, term || { error: 'term not found' });
    return true;
  }

  if (req.method === 'PUT' && termIdMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    const termId = decodeURIComponent(termIdMatch[0]);
    const current = getTerm(db, termId);
    if (!current) {
      sendJson(res, 404, { error: 'term not found' });
      return true;
    }
    const currentPinyinProfile = getTermPinyinProfile(db, termId, current.canonicalText);
    const admission = enforceTermAdmission(db, buildAdmissionPayloadForPersist(payload, {
      ...current,
      pinyinProfile: currentPinyinProfile,
    }), {
      currentTermId: current.termId,
      currentTerm: {
        ...current,
        pinyinProfile: currentPinyinProfile,
      },
      message: '当前词条内容不满足准入规则，请先修正后再保存。',
    });
    assertSaveActionAllowed(admission, '当前词条不能直接保存，请先按系统建议处理。');
    const persistPayload = buildPersistableTermPayload(payload, admission, {
      ...current,
      rules: current.rules || {},
    });
    sendJson(res, 200, {
      item: updateTerm(db, termId, persistPayload, auth.operator),
      admission: buildAdmissionSummaryPayload(admission),
    });
    return true;
  }

  const termRulesMatch = routeParams(pathname, /^\/api\/admin\/terms\/([^/]+)\/rules$/);
  if (req.method === 'GET' && termRulesMatch) {
    const termId = decodeURIComponent(termRulesMatch[0]);
    const term = getTerm(db, termId);
    sendJson(res, term ? 200 : 404, term ? getTermRules(db, termId) : { error: 'term not found' });
    return true;
  }

  if (req.method === 'PUT' && termRulesMatch) {
    const termId = decodeURIComponent(termRulesMatch[0]);
    const term = getTerm(db, termId);
    if (!term) {
      sendJson(res, 404, { error: 'term not found' });
      return true;
    }
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, upsertTermRules(db, termId, payload, auth.operator));
    return true;
  }

  const termPinyinMatch = routeParams(pathname, /^\/api\/admin\/terms\/([^/]+)\/pinyin$/);
  if (req.method === 'GET' && termPinyinMatch) {
    const termId = decodeURIComponent(termPinyinMatch[0]);
    const term = getTerm(db, termId);
    sendJson(res, term ? 200 : 404, term ? getTermPinyinProfile(db, termId, term.canonicalText) : { error: 'term not found' });
    return true;
  }

  if (req.method === 'PUT' && termPinyinMatch) {
    const termId = decodeURIComponent(termPinyinMatch[0]);
    const term = getTerm(db, termId);
    if (!term) {
      sendJson(res, 404, { error: 'term not found' });
      return true;
    }
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    const currentPinyinProfile = getTermPinyinProfile(db, termId, term.canonicalText);
    enforceTermAdmission(db, buildAdmissionPayloadForPersist({
      ...term,
      pinyinProfile: payload,
    }, {
      ...term,
      pinyinProfile: currentPinyinProfile,
    }), {
      currentTermId: term.termId,
      currentTerm: {
        ...term,
        pinyinProfile: currentPinyinProfile,
      },
      message: '当前拼音配置不满足准入规则，请先修正后再保存。',
    });
    sendJson(res, 200, upsertTermPinyinProfile(db, termId, term.canonicalText, payload, auth.operator));
    return true;
  }

  const termPinyinComparisonMatch = routeParams(pathname, /^\/api\/admin\/terms\/([^/]+)\/pinyin-comparison$/);
  if (req.method === 'GET' && termPinyinComparisonMatch) {
    const item = getTermPinyinComparison(db, decodeURIComponent(termPinyinComparisonMatch[0]));
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'term not found' });
    return true;
  }

  const termCandidateMatch = routeParams(pathname, /^\/api\/admin\/terms\/([^/]+)\/generate-pinyin-candidates$/);
  if (req.method === 'POST' && termCandidateMatch) {
    const payload = await readJson(req);
    sendJson(res, 200, generateTermPinyinCandidates(db, decodeURIComponent(termCandidateMatch[0]), {
      limit: payload.limit || 12,
    }));
    return true;
  }

  const termCandidateSubmitMatch = routeParams(pathname, /^\/api\/admin\/terms\/([^/]+)\/pinyin-candidates$/);
  if (req.method === 'POST' && termCandidateSubmitMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, submitPinyinCandidateReview(
      db,
      decodeURIComponent(termCandidateSubmitMatch[0]),
      payload,
      auth.operator,
    ));
    return true;
  }

  const submitReviewMatch = routeParams(pathname, /^\/api\/admin\/terms\/([^/]+)\/submit-review$/);
  if (req.method === 'POST' && submitReviewMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, submitTermReview(db, decodeURIComponent(submitReviewMatch[0]), auth.operator, payload.comment || ''));
    return true;
  }

  const approveMatch = routeParams(pathname, /^\/api\/admin\/terms\/([^/]+)\/approve$/);
  if (req.method === 'POST' && approveMatch) {
    const auth = authContextFrom(req);
    sendJson(res, 200, updateTermStatus(db, decodeURIComponent(approveMatch[0]), 'approved', auth.operator, 'direct approve'));
    return true;
  }

  const disableMatch = routeParams(pathname, /^\/api\/admin\/terms\/([^/]+)\/disable$/);
  if (req.method === 'POST' && disableMatch) {
    const auth = authContextFrom(req);
    sendJson(res, 200, updateTermStatus(db, decodeURIComponent(disableMatch[0]), 'disabled', auth.operator, 'disable term'));
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/pinyin-profiles') {
    sendJson(res, 200, {
      items: listPinyinProfiles(db, {
        limit: searchParams.get('limit') || 50,
      }),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/pinyin-comparisons') {
    sendJson(res, 200, listPinyinComparisons(db, {
      categoryCode: searchParams.get('categoryCode') || '',
      query: searchParams.get('query') || '',
      onlyChanged: searchParams.get('onlyChanged'),
      limit: searchParams.get('limit') || 50,
    }));
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/pinyin-conflicts') {
    sendJson(res, 200, listPinyinConflicts(db, {
      categoryCode: searchParams.get('categoryCode') || '',
      conflictType: searchParams.get('conflictType') || '',
      key: searchParams.get('key') || '',
      limit: searchParams.get('limit') || 50,
    }));
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/pinyin-conflicts/detail') {
    const conflictType = searchParams.get('conflictType') || '';
    const key = searchParams.get('key') || '';
    if (!conflictType || !key) {
      sendJson(res, 400, { error: 'conflictType and key are required' });
      return true;
    }
    const item = getPinyinConflictDetail(db, {
      categoryCode: searchParams.get('categoryCode') || '',
      conflictType,
      key,
    });
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'pinyin conflict not found' });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/reviews') {
    sendJson(res, 200, {
      items: listReviewTasks(db, {
        status: searchParams.get('status') || '',
        targetType: searchParams.get('targetType') || '',
        limit: searchParams.get('limit') || 50,
      }),
    });
    return true;
  }

  const reviewApproveMatch = routeParams(pathname, /^\/api\/admin\/reviews\/([^/]+)\/approve$/);
  if (req.method === 'POST' && reviewApproveMatch) {
    const auth = authContextFrom(req);
    sendJson(res, 200, approveReviewTask(db, decodeURIComponent(reviewApproveMatch[0]), auth.operator));
    return true;
  }

  const reviewRejectMatch = routeParams(pathname, /^\/api\/admin\/reviews\/([^/]+)\/reject$/);
  if (req.method === 'POST' && reviewRejectMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 200, rejectReviewTask(db, decodeURIComponent(reviewRejectMatch[0]), auth.operator, payload.comment || ''));
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/audits') {
    sendJson(res, 200, {
      items: listAuditLogs(db, {
        targetType: searchParams.get('targetType') || '',
        targetId: searchParams.get('targetId') || '',
        operation: searchParams.get('operation') || '',
        limit: searchParams.get('limit') || 50,
      }),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/releases') {
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;
    const pageSize = 100;
    const items = [];
    while (offset < total) {
      const pageResult = listReleasesPaged(db, {
        limit: pageSize,
        offset,
      });
      const pageItems = pageResult.items || [];
      total = Number(pageResult.total || 0);
      if (!pageItems.length) {
        break;
      }
      const gateMap = buildReleaseGateSummaryMap(db, pageItems.map((item) => item.releaseId), {
        releases: pageItems,
      });
      const releaseSummaryPage = listConsoleReleases(db, {
        page: Math.floor(offset / pageSize) + 1,
        pageSize,
      });
      const approvalMap = new Map((releaseSummaryPage.items || []).map((item) => [item.releaseId, item.approval]));
      for (const item of pageItems) {
        items.push({
          ...item,
          approval: approvalMap.get(item.releaseId) || releaseApprovalState(item.releaseId),
          gate: gateMap.get(item.releaseId) || buildReleaseGateSummary(db, item.releaseId),
        });
      }
      offset += pageItems.length;
    }
    sendJson(res, 200, {
      current: getCurrentPublishedRelease(db),
      canary: getCurrentCanaryRelease(db),
      items,
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/releases/build') {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, buildRelease(payload.summary || 'api build', auth.operator));
    return true;
  }

  const releaseSubmitReviewMatch = routeParams(pathname, /^\/api\/admin\/releases\/([^/]+)\/submit-review$/);
  if (req.method === 'POST' && releaseSubmitReviewMatch) {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    sendJson(res, 201, submitReleaseReview(db, decodeURIComponent(releaseSubmitReviewMatch[0]), auth.operator, payload.comment || ''));
    return true;
  }

  const publishMatch = routeParams(pathname, /^\/api\/admin\/releases\/([^/]+)\/publish$/);
  if (req.method === 'POST' && publishMatch) {
    const auth = authContextFrom(req);
    ensureReleaseApprovalForExposure(decodeURIComponent(publishMatch[0]), auth.operator, 'publish');
    const release = activatePublishedRelease(decodeURIComponent(publishMatch[0]), auth.operator, 'publish');
    refreshRuntimeState();
    sendJson(res, 200, { mode: 'publish', release });
    return true;
  }

  const rollbackMatch = routeParams(pathname, /^\/api\/admin\/releases\/([^/]+)\/rollback$/);
  if (req.method === 'POST' && rollbackMatch) {
    const auth = authContextFrom(req);
    const release = activatePublishedRelease(decodeURIComponent(rollbackMatch[0]), auth.operator, 'rollback');
    refreshRuntimeState();
    sendJson(res, 200, { mode: 'rollback', release });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/admin/gray-policies') {
    sendJson(res, 200, {
      current: getActiveGrayPolicy(db),
      items: context.listGrayPolicies(db),
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/admin/gray-policies') {
    const payload = await readJson(req);
    const auth = authContextFrom(req, payload);
    ensureReleaseApprovalForExposure(payload.releaseId, auth.operator, 'canary');
    const policy = createGrayPolicy(db, payload, auth.operator);
    refreshRuntimeState();
    sendJson(res, 201, policy);
    return true;
  }

  const disablePolicyMatch = routeParams(pathname, /^\/api\/admin\/gray-policies\/([^/]+)\/disable$/);
  if (req.method === 'POST' && disablePolicyMatch) {
    const auth = authContextFrom(req);
    const policy = disableGrayPolicy(db, decodeURIComponent(disablePolicyMatch[0]), auth.operator);
    refreshRuntimeState();
    sendJson(res, 200, policy);
    return true;
  }

  return false;
}

module.exports = {
  permissionForAdminRoute,
  handleAdminRequest,
};
