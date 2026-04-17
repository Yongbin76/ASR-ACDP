const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const buildSnapshot = require('../../src/cli/build-snapshot');
const {
  openDatabase,
  createRuntimeNodeRegistryItem,
  getRuntimeNodeRegistryItem,
  rotateRuntimeNodeRegistrySecret,
  assertRuntimeNodeRegistryAccess,
  setRuntimeDesiredRelease,
} = require('../../src/lib/platform-db');
const { createAdminApp } = require('../../src/server');

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
    auth: {
      ...baseConfig.auth,
      runtimeBearerToken: 'runtime-registry-token',
    },
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
      runtimeArtifactsDir: path.join(workspaceDir, 'runtime_artifacts'),
      runtimeStateDir: path.join(workspaceDir, 'runtime_state'),
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

test('runtime node registry persists items and secret rotation invalidates old secret', () => {
  const config = createTestConfig('workspace-unit-runtime-node-registry-db', 8831);
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const created = createRuntimeNodeRegistryItem(db, {
      nodeId: 'runtime-registry-node-001',
      nodeName: 'Runtime Registry Node 001',
      env: 'test',
      address: 'http://127.0.0.1:9931',
      registrationSecret: 'secret-001',
    }, 'unit');
    assert.equal(created.item.nodeId, 'runtime-registry-node-001');
    assert.equal(created.secretPlaintext, 'secret-001');
    assert.ok(created.item.secretFingerprint);
    assert.ok(assertRuntimeNodeRegistryAccess(db, 'runtime-registry-node-001', 'secret-001'));

    const rotated = rotateRuntimeNodeRegistrySecret(db, 'runtime-registry-node-001', 'unit');
    assert.ok(rotated.secretPlaintext);
    assert.notEqual(rotated.secretPlaintext, 'secret-001');
    assert.throws(() => assertRuntimeNodeRegistryAccess(db, 'runtime-registry-node-001', 'secret-001'), /invalid/);
    assert.ok(assertRuntimeNodeRegistryAccess(db, 'runtime-registry-node-001', rotated.secretPlaintext));
    assert.ok(getRuntimeNodeRegistryItem(db, 'runtime-registry-node-001'));
  } finally {
    db.close();
  }
});

test('admin app runtime register requires registry item and node secret', async () => {
  const config = createTestConfig('workspace-unit-runtime-node-registry-api', 8832);
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('runtime node registry api build', config);
  const db = openDatabase(config);
  createRuntimeNodeRegistryItem(db, {
    nodeId: 'runtime-registry-node-002',
    nodeName: 'Runtime Registry Node 002',
    env: 'test',
    address: 'http://127.0.0.1:9932',
    registrationSecret: 'secret-002',
  }, 'unit');
  db.close();
  const app = createAdminApp(config);
  try {
    const missingRegistry = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/register',
      headers: {
        authorization: 'Bearer runtime-registry-token',
      },
      body: {
        nodeId: 'runtime-registry-node-missing',
      },
    });
    assert.equal(missingRegistry.statusCode, 403);

    const missingSecret = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/register',
      headers: {
        authorization: 'Bearer runtime-registry-token',
      },
      body: {
        nodeId: 'runtime-registry-node-002',
        address: 'http://127.0.0.1:9932',
      },
    });
    assert.equal(missingSecret.statusCode, 401);

    const register = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/register',
      headers: {
        authorization: 'Bearer runtime-registry-token',
      },
      body: {
        nodeId: 'runtime-registry-node-002',
        nodeName: 'Runtime Registry Node 002',
        address: 'http://127.0.0.1:9932',
        currentVersion: 'rel_registry',
        runtimeVersion: '0.1.0',
        registrationSecret: 'secret-002',
      },
    });
    assert.equal(register.statusCode, 201);
    assert.equal(register.json.item.nodeId, 'runtime-registry-node-002');
  } finally {
    await app.stop();
  }
});

test('console runtime node registry CRUD endpoints work end to end', async () => {
  const config = createTestConfig('workspace-unit-runtime-node-registry-console', 8833);
  prepareData.main(config);
  bootstrapDb.main(config);
  const release = buildSnapshot.main('runtime node registry console build', config);
  const app = createAdminApp(config);
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/console/runtime-node-registry',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'registry_console_admin',
      },
      body: {
        nodeId: 'runtime-registry-node-003',
        nodeName: 'Runtime Registry Node 003',
        env: 'test',
        address: 'http://127.0.0.1:9933',
      },
    });
    assert.equal(created.statusCode, 201);
    assert.ok(created.json.secretPlaintext);

    const list = await app.inject({
      method: 'GET',
      url: '/api/console/runtime-node-registry',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'registry_console_admin',
      },
    });
    assert.equal(list.statusCode, 200);
    assert.ok((list.json.items || []).some((item) => item.nodeId === 'runtime-registry-node-003'));

    const updated = await app.inject({
      method: 'PUT',
      url: '/api/console/runtime-node-registry/runtime-registry-node-003',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'registry_console_admin',
      },
      body: {
        nodeName: 'Runtime Registry Node 003 Updated',
        env: 'prod',
        address: 'http://127.0.0.1:9943',
        remarks: 'updated',
      },
    });
    assert.equal(updated.statusCode, 200);
    assert.equal(updated.json.item.env, 'prod');

    const rotated = await app.inject({
      method: 'POST',
      url: '/api/console/runtime-node-registry/runtime-registry-node-003/rotate-secret',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'registry_console_admin',
      },
      body: {},
    });
    assert.equal(rotated.statusCode, 200);
    assert.ok(rotated.json.secretPlaintext);

    setRuntimeDesiredRelease(app.db, {
      releaseId: release.releaseId,
    }, config, 'registry_console_admin');

    const deploymentGuide = await app.inject({
      method: 'GET',
      url: '/api/console/runtime-node-registry/runtime-registry-node-003/deployment-guide',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'registry_console_admin',
      },
    });
    assert.equal(deploymentGuide.statusCode, 200);
    assert.equal(deploymentGuide.json.item.nodeId, 'runtime-registry-node-003');
    assert.equal(deploymentGuide.json.item.runtimeTokenConfigured, true);
    assert.equal(deploymentGuide.json.item.runtimeTokenValue, 'runtime-registry-token');
    assert.equal(deploymentGuide.json.item.runtimeDeliveryMode, 'admin_http_signed');
    assert.equal(deploymentGuide.json.item.runtimeArtifactBaseUrl, config.runtimeDelivery.adminArtifactBaseUrl);
    assert.equal(deploymentGuide.json.item.runtimeArtifactSignedUrlConfigured, true);
    assert.equal(deploymentGuide.json.item.currentReleaseId, release.releaseId);
    assert.match(
      String(deploymentGuide.json.item.currentArtifactUrl || ''),
      new RegExp(`^${String(config.runtimeDelivery.adminArtifactBaseUrl || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/api\\/runtime-artifacts\\/releases\\/`),
    );
  } finally {
    await app.stop();
  }
});
