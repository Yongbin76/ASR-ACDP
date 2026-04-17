const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const { createAppConfig } = require('../lib/config');
const prepareData = require('./prepare-data');
const bootstrapDb = require('./bootstrap-db');
const buildSnapshot = require('./build-snapshot');
const { createPrototypeApp } = require('../server');
const {
  openDatabase,
  createRuntimeNodeRegistryItem,
  registerRuntimeNode,
  setRuntimeDesiredRelease,
} = require('../lib/platform-db');

/**
 * 功能：创建 contract snapshot 检查使用的隔离配置。
 * 输入：端口号。
 * 输出：带独立 workspace 的配置对象。
 */
function createTestConfig(port) {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', `workspace-contract-snapshots-${port}-${Date.now()}`);
  const catalogDir = path.join(workspaceDir, 'catalog');
  const releasesDir = path.join(workspaceDir, 'releases');
  fs.mkdirSync(catalogDir, { recursive: true });
  fs.mkdirSync(releasesDir, { recursive: true });
  return {
    ...baseConfig,
    auth: {
      ...baseConfig.auth,
      runtimeBearerToken: 'contract-token',
    },
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
      catalogDir,
      releasesDir,
      latestReleaseDir: path.join(releasesDir, 'latest'),
      databaseFile: path.join(workspaceDir, 'platform.db'),
      seedCatalogFile: path.join(catalogDir, 'seed_terms.json'),
      validationFeedInboxDir: path.join(workspaceDir, 'validation_feeds', 'inbox'),
      validationFeedArchiveDir: path.join(workspaceDir, 'validation_feeds', 'archive'),
      validationFeedErrorDir: path.join(workspaceDir, 'validation_feeds', 'error'),
    },
    server: {
      ...baseConfig.server,
      host: '127.0.0.1',
      port,
      adminPort: port,
      runtimePort: port,
    },
  };
}

/**
 * 功能：读取 contract snapshot fixture。
 * 输入：fixture 文件名。
 * 输出：fixture JSON 对象。
 */
function readFixture(name) {
  const projectRoot = createAppConfig().projectRoot;
  const filePath = path.join(projectRoot, 'prototype', 'tests', 'fixtures', 'api_contract_snapshots', name);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * 功能：归一化动态字段，固定 contract snapshot。
 * 输入：任意 JSON 值和键名。
 * 输出：归一化后的 JSON 值。
 */
function normalizeDynamic(value, key = '') {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeDynamic(item));
  }
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') {
      if (/(At|builtAt)$/i.test(key)) return '<timestamp>';
      if (/(^|_)(release|task|job|term|case|report|policy|node)Id$/i.test(key) || /^(releaseId|taskId|jobId|termId|caseId|reportId|policyId|nodeId)$/i.test(key)) return '<id>';
      if (/secretFingerprint/i.test(key)) return '<fingerprint>';
      if (/(^|_)version$/i.test(key) || key === 'desiredVersion' || key === 'currentVersion') return '<version>';
      if (/heartbeatAgeSeconds/i.test(key)) return '<number>';
    }
    if (typeof value === 'number' && /heartbeatAgeSeconds/i.test(key)) return '<number>';
    return value;
  }
  const output = {};
  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    output[nestedKey] = normalizeDynamic(nestedValue, nestedKey);
  }
  return output;
}

/**
 * 功能：创建包含 release 和 runtime 节点的 contract snapshot 场景。
 * 输入：配置对象。
 * 输出：带 app 的对象。
 */
function createContractScenario(config) {
  prepareData.main(config);
  bootstrapDb.main(config);
  const release = buildSnapshot.main('contract snapshot build', config);
  const db = openDatabase(config);
  try {
    createRuntimeNodeRegistryItem(db, {
      nodeId: 'contract-node-001',
      nodeName: 'Contract Node 001',
      env: 'test',
      address: 'http://127.0.0.1:9901',
      registrationSecret: 'contract-secret',
    }, 'unit_test');
    registerRuntimeNode(db, {
      nodeId: 'contract-node-001',
      nodeName: 'Contract Node 001',
      env: 'test',
      address: 'http://127.0.0.1:9901',
      currentVersion: release.version,
      runtimeVersion: '0.5.0',
      registrationSecret: 'contract-secret',
    }, config);
    setRuntimeDesiredRelease(db, { releaseId: release.releaseId }, config, 'contract_test');
  } finally {
    db.close();
  }
  return { app: createPrototypeApp(config) };
}

/**
 * 功能：执行关键接口的 contract snapshot 校验。
 * 输入：无。
 * 输出：校验结果对象。
 */
async function main() {
  const config = createTestConfig(8892);
  const { app } = createContractScenario(config);
  const headers = { 'x-role': 'dict_admin', 'x-operator': 'contract_tester' };
  try {
    const help = await app.inject({ method: 'GET', url: '/api/console/help', headers });
    const releases = await app.inject({ method: 'GET', url: '/api/console/releases?page=1&pageSize=1', headers });
    const runtimeNodes = await app.inject({ method: 'GET', url: '/api/console/runtime-nodes?page=1&pageSize=1', headers });
    const runtimeVerify = await app.inject({ method: 'GET', url: '/api/console/runtime-verify/current', headers });
    const runtimeCurrent = await app.inject({
      method: 'GET',
      url: '/api/runtime/current',
      headers: { authorization: 'Bearer contract-token' },
    });
    const runtimeStats = await app.inject({
      method: 'GET',
      url: '/api/runtime/stats',
      headers,
    });
    const correctCand = await app.inject({
      method: 'POST',
      url: '/api/runtime/correct_cand',
      headers: { authorization: 'Bearer contract-token' },
      body: { text: '我想咨询旗顺路和工商认定。' },
    });

    const consoleActual = {
      helpList: {
        sampleItems: (help.json.items || [])
          .filter((item) => ['flow-release-lifecycle', 'page-master-terms', 'page-release-list', 'page-runtime-home', 'page-system-users'].includes(item.slug))
          .sort((left, right) => left.slug.localeCompare(right.slug))
          .map((item) => ({
            slug: item.slug,
            title: item.title,
            kicker: item.kicker,
            hasSourceDocPath: Boolean(item.sourceDocPath),
          })),
      },
      releaseList: normalizeDynamic(releases.json),
      runtimeNodes: normalizeDynamic(runtimeNodes.json),
      runtimeVerifyCurrent: normalizeDynamic(runtimeVerify.json),
    };

    const runtimeActual = {
      runtimeCurrent: normalizeDynamic(runtimeCurrent.json),
      runtimeStats: normalizeDynamic(runtimeStats.json),
      correctCand: normalizeDynamic(correctCand.json),
    };

    assert.deepEqual(consoleActual, readFixture('console_core.json'));
    assert.deepEqual(runtimeActual, readFixture('runtime_public.json'));

    const result = {
      ok: true,
      consoleSnapshot: 'passed',
      runtimeSnapshot: 'passed',
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    await app.stop();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  createContractScenario,
  createTestConfig,
  main,
  normalizeDynamic,
  readFixture,
};
