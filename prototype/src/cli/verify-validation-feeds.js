const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../lib/config');
const { openDatabase } = require('../lib/platform-db');
const { importValidationFeeds, listValidationFeedSources } = require('../lib/validation-feed-importer');
const { checkValidationFeedConnectors } = require('./check-validation-feed-connectors');

const defaultConfig = createAppConfig();

/**
 * 功能：确保目录存在，不存在时递归创建。
 * 输入：`dirPath` 目录路径。
 * 输出：无显式返回。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：清空并重建目录。
 * 输入：`dirPath` 目录路径。
 * 输出：无显式返回。
 */
function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：把对象保存为 JSON 文件。
 * 输入：`filePath` 输出路径和 `value` 任意对象。
 * 输出：无显式返回。
 */
function saveJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

/**
 * 功能：生成适合文件名的时间戳标识。
 * 输入：无。
 * 输出：时间戳字符串。
 */
function timestampId() {
  return new Date().toISOString().replace(/[:]/g, '-');
}

/**
 * 功能：基于基础配置创建隔离的验证工作目录配置。
 * 输入：基础配置对象和工作目录名。
 * 输出：用于验证的应用配置对象。
 */
function createWorkspaceConfig(baseConfig, workspaceName) {
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', workspaceName);
  resetDir(workspaceDir);
  return {
    ...baseConfig,
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
      databaseFile: path.join(workspaceDir, 'platform.db'),
      validationFeedInboxDir: path.join(workspaceDir, 'validation_feeds', 'inbox'),
      validationFeedArchiveDir: path.join(workspaceDir, 'validation_feeds', 'archive'),
      validationFeedErrorDir: path.join(workspaceDir, 'validation_feeds', 'error'),
      validationFeedReceiptDir: path.join(workspaceDir, 'validation_feeds', 'receipts'),
    },
  };
}

/**
 * 功能：构造用于 mock 验证的 cg3 connector 配置。
 * 输入：基础配置对象。
 * 输出：带 cg3 远端 connector 配置的应用配置对象。
 */
function createValidationFeedVerificationConfig(baseConfig = defaultConfig) {
  const config = createWorkspaceConfig(baseConfig, `workspace-verify-validation-feeds-${Date.now()}`);
  return {
    ...config,
    validationFeedConnectors: {
      configPath: config.validationFeedConnectorConfigPath,
      sources: [{
        sourceType: 'cg3',
        enabled: true,
        description: 'CG3 mock validation feed source',
        transportType: 'http_pull_json',
        endpoint: 'https://mock.acdp.local/cg3/feed',
        httpMethod: 'GET',
        timeoutMs: 10000,
        authType: 'bearer',
        authHeaderName: 'Authorization',
        authToken: 'cg3-mock-token',
        cursorQueryKey: 'cursor',
        cursorResponseField: 'meta.nextCursor',
        initialCursor: 'cg3-cursor-0',
        includeCursorInAck: true,
        ackType: 'http_post',
        ackEndpoint: 'https://mock.acdp.local/cg3/ack',
        ackMethod: 'POST',
        retryMaxAttempts: 3,
        replayFromErrorDir: true,
      }],
    },
  };
}

/**
 * 功能：统计当前数据库中的 validation case 数量。
 * 输入：数据库连接。
 * 输出：样本总数。
 */
function countValidationCases(db) {
  const row = db.prepare('SELECT COUNT(*) AS count FROM validation_cases').get();
  return Number((row || {}).count || 0);
}

/**
 * 功能：从 feed source 列表中读取指定 source 的状态。
 * 输入：应用配置对象和 sourceType。
 * 输出：source 状态对象；不存在时返回 `null`。
 */
function sourceState(config, sourceType) {
  return listValidationFeedSources(config).find((item) => item.sourceType === sourceType) || null;
}

/**
 * 功能：在当前验证过程中安装 mock 远端 fetch，实现 cg3 pull/ack 的可重复场景。
 * 输入：无。
 * 输出：包含 `restore()` 与远端状态的对象。
 */
function installMockValidationFeedFetch() {
  const originalFetch = global.fetch;
  const remote = {
    pullCalls: [],
    ackCalls: [],
    ackAttemptsByDelivery: {},
  };

  global.fetch = async (url, options = {}) => {
    const requestUrl = new URL(String(url));
    if (requestUrl.pathname.endsWith('/ack')) {
      const payload = options.body ? JSON.parse(String(options.body)) : {};
      const deliveryId = String(payload.deliveryId || '').trim();
      remote.ackCalls.push({
        url: requestUrl.toString(),
        payload,
      });
      remote.ackAttemptsByDelivery[deliveryId] = Number(remote.ackAttemptsByDelivery[deliveryId] || 0) + 1;
      if (deliveryId === 'cg3-batch-002' && remote.ackAttemptsByDelivery[deliveryId] === 1) {
        return new Response(JSON.stringify({ error: 'mock ack failed once' }), { status: 500 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    const cursor = requestUrl.searchParams.get('cursor') || '';
    remote.pullCalls.push({
      url: requestUrl.toString(),
      cursor,
      authorization: String((((options || {}).headers || {}).authorization) || ''),
    });

    if (cursor === '' || cursor === 'cg3-cursor-0') {
      return new Response(JSON.stringify({
        sourceType: 'cg3',
        batchId: 'cg3-batch-001',
        meta: { nextCursor: 'cg3-cursor-1' },
        records: [{
          recordId: 'cg3-record-001',
          summary: 'cg3 first batch sample',
          snippet: '我想咨询旗顺路附近的办事点。',
          canonicalTexts: ['祁顺路'],
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (cursor === 'cg3-cursor-1') {
      return new Response(JSON.stringify({
        sourceType: 'cg3',
        batchId: 'cg3-batch-002',
        meta: { nextCursor: 'cg3-cursor-2' },
        records: [{
          recordId: 'cg3-record-002',
          summary: 'cg3 second batch sample',
          snippet: '我想了解工商认定的办理材料。',
          canonicalTexts: ['工伤认定'],
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(null, { status: 204 });
  };

  return {
    remote,
    restore() {
      global.fetch = originalFetch;
    },
  };
}

/**
 * 功能：执行一轮 validation feed mock 验证。
 * 输入：基础配置对象。
 * 输出：Promise，解析为验证摘要对象。
 */
async function verifyValidationFeeds(baseConfig = defaultConfig) {
  const config = createValidationFeedVerificationConfig(baseConfig);
  const reportId = `${timestampId()}_validation_feed_verify_mock_cg3`;
  const reportDir = path.join(baseConfig.resolvedPaths.hostVerificationDir, reportId);
  const summary = {
    reportId,
    reportDir,
    reportFile: path.join(reportDir, 'summary.json'),
    startedAt: new Date().toISOString(),
    ok: false,
    sourceType: 'cg3',
    preflight: null,
    steps: [],
    remote: null,
  };
  ensureDir(reportDir);
  const db = openDatabase(config);
  const mock = installMockValidationFeedFetch();

  try {
    summary.preflight = checkValidationFeedConnectors(config, {
      sourceTypes: ['cg3'],
      requireRemoteConfigured: true,
      requireAckConfigured: true,
    });
    if (!summary.preflight.ok) {
      summary.endedAt = new Date().toISOString();
      saveJson(summary.reportFile, summary);
      return summary;
    }

    const firstImport = await importValidationFeeds(db, config, 'validation_feed_verify', { sourceTypes: ['cg3'] });
    summary.steps.push({
      name: 'first_import',
      result: firstImport,
      sourceState: sourceState(config, 'cg3'),
      validationCaseCount: countValidationCases(db),
    });

    const secondImport = await importValidationFeeds(db, config, 'validation_feed_verify', { sourceTypes: ['cg3'] });
    summary.steps.push({
      name: 'second_import_ack_failed',
      result: secondImport,
      sourceState: sourceState(config, 'cg3'),
      validationCaseCount: countValidationCases(db),
    });

    const replayImport = await importValidationFeeds(db, config, 'validation_feed_verify', {
      sourceTypes: ['cg3'],
      replayErrors: true,
    });
    summary.steps.push({
      name: 'replay_ack_recovery',
      result: replayImport,
      sourceState: sourceState(config, 'cg3'),
      validationCaseCount: countValidationCases(db),
    });

    summary.remote = mock.remote;
    summary.ok = (
      summary.preflight.ok
      && firstImport.importedCount === 1
      && firstImport.ackedCount === 1
      && String((summary.steps[0].sourceState || {}).currentCursor || '') === 'cg3-cursor-1'
      && secondImport.ackFailedCount === 1
      && String((summary.steps[1].sourceState || {}).currentCursor || '') === 'cg3-cursor-1'
      && replayImport.ackedCount === 1
      && replayImport.importedCount === 0
      && String((summary.steps[2].sourceState || {}).currentCursor || '') === 'cg3-cursor-2'
    );
    summary.endedAt = new Date().toISOString();
    saveJson(summary.reportFile, summary);
    return summary;
  } finally {
    mock.restore();
    if (typeof db.close === 'function') {
      db.close();
    }
  }
}

/**
 * 功能：执行当前脚本或模块的主流程。
 * 输入：可选基础配置对象。
 * 输出：Promise，解析为验证摘要对象。
 */
async function main(baseConfig = defaultConfig) {
  return verifyValidationFeeds(baseConfig);
}

if (require.main === module) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  createValidationFeedVerificationConfig,
  verifyValidationFeeds,
  main,
};
