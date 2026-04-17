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
  registerRuntimeNode,
  heartbeatRuntimeNode,
  getRuntimeNode,
  listRuntimeNodes,
} = require('../../src/lib/platform-db');
const { createAdminApp, createRuntimeApp } = require('../../src/server');

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
    auth: {
      ...baseConfig.auth,
      runtimeBearerToken: 'runtime-unit-token',
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

function seedRuntimeNodeRegistry(config, nodeId, address, secret = 'runtime-node-secret') {
  const db = openDatabase(config);
  try {
    createRuntimeNodeRegistryItem(db, {
      nodeId,
      nodeName: nodeId,
      env: 'test',
      address,
      registrationSecret: secret,
    }, 'unit_test');
  } finally {
    db.close();
  }
  return secret;
}

test('platform-db runtime node register and heartbeat persist online/offline state', () => {
  const config = createTestConfig('workspace-unit-runtime-nodes-db', 8814);
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const registered = registerRuntimeNode(db, {
      nodeId: 'runtime-node-001',
      nodeName: 'Runtime Node 001',
      env: 'dev',
      address: 'http://127.0.0.1:9787',
      runtimeVersion: '0.1.0',
      currentVersion: 'rel_bootstrap',
      metadata: {
        zone: 'local',
      },
    }, config);
    assert.equal(registered.nodeId, 'runtime-node-001');
    assert.equal(registered.status, 'online');
    assert.equal(registered.statusReason, 'heartbeat_ok');
    assert.equal(registered.metadata.zone, 'local');

    const heartbeated = heartbeatRuntimeNode(db, {
      nodeId: 'runtime-node-001',
      currentVersion: 'rel_20260401',
      runtimeStatsCursor: 'cursor-001',
      lastError: '',
    }, config);
    assert.equal(heartbeated.currentVersion, 'rel_20260401');
    assert.equal(heartbeated.runtimeStatsCursor, 'cursor-001');
    assert.equal(listRuntimeNodes(db, {}, config).total, 1);

    const staleIso = new Date(Date.now() - (10 * 60 * 1000)).toISOString();
    db.prepare('UPDATE runtime_nodes SET last_heartbeat_at = ?, updated_at = ? WHERE node_id = ?')
      .run(staleIso, staleIso, 'runtime-node-001');

    const staleConfig = {
      ...config,
      runtimeControl: {
        ...config.runtimeControl,
        nodeOfflineThresholdSeconds: 60,
      },
    };
    const staleNode = getRuntimeNode(db, 'runtime-node-001', staleConfig);
    assert.equal(staleNode.status, 'offline');
    assert.equal(staleNode.statusReason, 'heartbeat_timeout');
    assert.ok((staleNode.heartbeatAgeSeconds || 0) >= 600);
  } finally {
    db.close();
  }
});

test('admin app accepts runtime node register and heartbeat with runtime token only', async () => {
  const config = createTestConfig('workspace-unit-runtime-nodes-api', 8815);
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('runtime nodes api baseline build', config);
  const secret = seedRuntimeNodeRegistry(config, 'runtime-node-002', 'http://127.0.0.1:9888');
  const app = createAdminApp(config);
  try {
    const unauthorized = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/register',
      body: {
        nodeId: 'runtime-node-002',
      },
    });
    assert.equal(unauthorized.statusCode, 401);
    assert.match(String(unauthorized.json.error || ''), /runtime_token_required/);

    const registered = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/register',
      headers: {
        authorization: 'Bearer runtime-unit-token',
      },
      body: {
        nodeId: 'runtime-node-002',
        nodeName: 'Runtime Node 002',
        env: 'test',
        address: 'http://127.0.0.1:9888',
        runtimeVersion: '0.2.0',
        currentVersion: 'rel_api_register',
        registrationSecret: secret,
      },
    });
    assert.equal(registered.statusCode, 201);
    assert.equal(registered.json.item.nodeId, 'runtime-node-002');
    assert.equal(registered.json.item.status, 'online');

    const heartbeated = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/heartbeat',
      headers: {
        authorization: 'Bearer runtime-unit-token',
      },
      body: {
        nodeId: 'runtime-node-002',
        currentVersion: 'rel_api_heartbeat',
        runtimeStatsCursor: 'batch-002',
        registrationSecret: secret,
      },
    });
    assert.equal(heartbeated.statusCode, 200);
    assert.equal(heartbeated.json.item.currentVersion, 'rel_api_heartbeat');
    assert.equal(heartbeated.json.item.runtimeStatsCursor, 'batch-002');
  } finally {
    await app.stop();
  }
});

test('runtime-only app does not expose runtime node register endpoint', async () => {
  const config = createTestConfig('workspace-unit-runtime-nodes-runtime-surface', 8816);
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('runtime nodes surface baseline build', config);
  const app = createRuntimeApp(config);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/register',
      headers: {
        authorization: 'Bearer runtime-unit-token',
      },
      body: {
        nodeId: 'runtime-node-003',
      },
    });
    assert.equal(response.statusCode, 404);
    assert.equal(response.json.error, 'not found');
  } finally {
    await app.stop();
  }
});
