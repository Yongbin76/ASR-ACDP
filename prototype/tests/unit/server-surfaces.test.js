const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const buildSnapshot = require('../../src/cli/build-snapshot');
const { createRuntimeApp, createAdminApp } = require('../../src/server');

/**
 * 功能：创建当前测试场景使用的配置对象。
 * 输入：`workspaceName`（调用参数）、`port`（端口号）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createTestConfig(workspaceName, port) {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', workspaceName);
  const catalogDir = path.join(workspaceDir, 'catalog');
  const releasesDir = path.join(workspaceDir, 'releases');
  if (fs.existsSync(workspaceDir)) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
  fs.mkdirSync(catalogDir, { recursive: true });
  fs.mkdirSync(releasesDir, { recursive: true });
  return {
    ...baseConfig,
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
    },
  };
}

test('runtime app exposes runtime routes but not admin html entry', async () => {
  const config = createTestConfig('workspace-unit-runtime-surface', 8812);
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('runtime surface baseline build', config);
  const app = createRuntimeApp(config);
  try {
    const runtimeCurrent = await app.inject({
      method: 'GET',
      url: '/api/runtime/current',
    });
    assert.equal(runtimeCurrent.statusCode, 200);
    assert.ok(runtimeCurrent.json.stable);

    const correctCand = await app.inject({
      method: 'POST',
      url: '/api/runtime/correct_cand',
      headers: {
        authorization: `Bearer ${config.auth.runtimeBearerToken}`,
      },
      body: {
        text: '我想咨询旗顺路和工商认定。',
      },
    });
    assert.equal(correctCand.statusCode, 200);
    assert.ok(Array.isArray(correctCand.json.correctedTexts));
    assert.ok(correctCand.json.correctedTexts.length >= 1);

    const adminEntry = await app.inject({
      method: 'GET',
      url: '/admin',
    });
    assert.equal(adminEntry.statusCode, 404);
    assert.equal(adminEntry.json.error, 'not found');
  } finally {
    await app.stop();
  }
});

test('admin app redirects /admin to /console and blocks runtime api route', async () => {
  const config = createTestConfig('workspace-unit-admin-surface', 8813);
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('admin surface baseline build', config);
  const app = createAdminApp(config);
  try {
    const adminEntry = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'surface_test',
      },
    });
    assert.equal(adminEntry.statusCode, 302);
    assert.equal(adminEntry.headers.location || adminEntry.headers.Location, '/console');

    const consoleEntry = await app.inject({
      method: 'GET',
      url: '/console',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'surface_test',
      },
    });
    assert.equal(consoleEntry.statusCode, 200);
    assert.match(String(consoleEntry.body), /ACDP 后台/);

    const runtimeCurrent = await app.inject({
      method: 'GET',
      url: '/api/runtime/current',
    });
    assert.equal(runtimeCurrent.statusCode, 404);
    assert.equal(runtimeCurrent.json.error, 'not found');
  } finally {
    await app.stop();
  }
});
