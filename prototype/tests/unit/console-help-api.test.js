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
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createTestConfig() {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(
    baseConfig.projectRoot,
    'prototype',
    `workspace-unit-console-help-api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
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
      port: 8795,
    },
  };
}

function consoleHeaders() {
  return {
    'x-role': 'dict_admin',
    'x-operator': 'console_admin',
  };
}

test('console help index and markdown article are readable', async () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console help baseline build', config);
  const app = createPrototypeApp(config);
  try {
    const list = await app.inject({
      method: 'GET',
      url: '/api/console/help',
      headers: consoleHeaders(),
    });
    assert.equal(list.statusCode, 200);
    assert.ok((list.json.items || []).some((item) => item.slug === 'page-runtime-home'));

    const article = await app.inject({
      method: 'GET',
      url: '/api/console/help/page-runtime-home',
      headers: consoleHeaders(),
    });
    assert.equal(article.statusCode, 200);
    assert.match(String((article.json.item || {}).markdown || ''), /运行治理/);

    const source = await app.inject({
      method: 'GET',
      url: '/api/console/help/page-runtime-home/source',
      headers: consoleHeaders(),
    });
    assert.equal(source.statusCode, 200);
    assert.match(String(source.body || ''), /页面手册：运行治理/);
  } finally {
    await app.stop();
  }
});
