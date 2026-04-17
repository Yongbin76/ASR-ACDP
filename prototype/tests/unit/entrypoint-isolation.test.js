const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const buildSnapshot = require('../../src/cli/build-snapshot');
const { createPrototypeApp } = require('../../src/server');

/**
 * 功能：创建当前测试场景使用的配置对象。
 * 输入：`workspaceName`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createTestConfig(workspaceName) {
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
      port: 8811,
    },
  };
}

/**
 * 功能：构建当前调用场景使用的请求头对象。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function adminHeaders() {
  return {
    'x-role': 'dict_admin',
    'x-operator': 'entrypoint_isolation_test',
  };
}

test('/admin redirects to /console even when console client assets are missing', async () => {
  const config = createTestConfig('workspace-unit-entrypoint-isolation-missing-console');
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('entrypoint isolation baseline build', config);
  const app = createPrototypeApp({
    ...config,
    resolvedPaths: {
      ...config.resolvedPaths,
      consoleClientDir: path.join(config.resolvedPaths.workspaceDir, 'missing-console-client'),
    },
  });

  try {
    const adminPage = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: adminHeaders(),
    });
    assert.equal(adminPage.statusCode, 302);
    assert.equal(adminPage.headers.location || adminPage.headers.Location, '/console');

    const testClientPage = await app.inject({
      method: 'GET',
      url: '/test-client',
      headers: adminHeaders(),
    });
    assert.equal(testClientPage.statusCode, 200);
    assert.match(String(testClientPage.body), /ACDP 管理原型/);

    const adminDashboard = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: adminHeaders(),
    });
    assert.equal(adminDashboard.statusCode, 200);
    assert.ok(adminDashboard.json);
    assert.ok(adminDashboard.json.overview);
    assert.ok(Number(adminDashboard.json.overview.releaseCount || 0) >= 1);
    assert.equal(typeof adminDashboard.json.overview.gateBlockedReleaseCount, 'number');

    const adminReleases = await app.inject({
      method: 'GET',
      url: '/api/admin/releases',
      headers: adminHeaders(),
    });
    assert.equal(adminReleases.statusCode, 200);
    assert.ok(Array.isArray(adminReleases.json.items));
    assert.ok(adminReleases.json.items.length >= 1);

    const consolePage = await app.inject({
      method: 'GET',
      url: '/console',
      headers: adminHeaders(),
    });
    assert.equal(consolePage.statusCode, 404);
    assert.equal(consolePage.json.error, 'console_not_built: console client not found');
  } finally {
    await app.stop();
  }
});

test('/admin redirects to /console when both entries are present', async () => {
  const config = createTestConfig('workspace-unit-entrypoint-isolation-dual');
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('entrypoint dual baseline build', config);
  const app = createPrototypeApp(config);

  try {
    const adminPage = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: adminHeaders(),
    });
    assert.equal(adminPage.statusCode, 302);
    assert.equal(adminPage.headers.location || adminPage.headers.Location, '/console');

    const consolePage = await app.inject({
      method: 'GET',
      url: '/console',
      headers: adminHeaders(),
    });
    assert.equal(consolePage.statusCode, 200);
    assert.match(String(consolePage.body), /ACDP 后台/);
    assert.match(String(consolePage.body), /\/console\/app\.js/);
  } finally {
    await app.stop();
  }
});
