const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { main: runtimeSmoke } = require('../../src/cli/runtime-smoke');
const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const buildSnapshot = require('../../src/cli/build-snapshot');

function createRuntimeSmokeConfig() {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(
    baseConfig.projectRoot,
    'prototype',
    `workspace-unit-runtime-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
  };
}

test('runtime smoke reports admin route is blocked on runtime-only app', async () => {
  const baseConfig = createRuntimeSmokeConfig();
  prepareData.main(baseConfig);
  bootstrapDb.main(baseConfig);
  buildSnapshot.main('runtime smoke test build', baseConfig);
  const result = await runtimeSmoke({
    ...baseConfig,
    server: {
      ...baseConfig.server,
      host: '0.0.0.0',
      port: 8796,
      runtimePort: 8796,
    },
  });

  assert.equal(result.ok, true);
  assert.ok(['http', 'inject'].includes(result.mode));
  assert.equal(result.isolation.adminBlocked, true);
  assert.ok((result.results || []).some((item) => item.pathname === '/health' && item.status === 200));
  assert.ok((result.results || []).some((item) => item.pathname === '/api/runtime/current' && item.status === 200));
});
