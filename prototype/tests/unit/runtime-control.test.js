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
  getRuntimeNode,
  getRuntimeControlState,
  setRuntimeDesiredRelease,
  getRuntimeControlViewForNode,
  listReleases,
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
      runtimeBearerToken: 'runtime-control-token',
    },
    runtimeDelivery: {
      ...baseConfig.runtimeDelivery,
      mode: 'file',
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

function seedRuntimeNodeRegistry(config, nodeId, address, secret = 'runtime-control-node-secret') {
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

test('platform-db persists desiredVersion and artifact metadata for runtime control', () => {
  const config = createTestConfig('workspace-unit-runtime-control-db', 8817);
  prepareData.main(config);
  bootstrapDb.main(config);
  const release = buildSnapshot.main('runtime control db baseline build', config);
  const db = openDatabase(config);
  try {
    registerRuntimeNode(db, {
      nodeId: 'runtime-control-node-001',
      nodeName: 'Runtime Control Node 001',
      currentVersion: release.version,
      runtimeVersion: '0.3.0',
    }, config);

    const control = setRuntimeDesiredRelease(db, {
      releaseId: release.releaseId,
    }, config, 'unit_runtime_control');
    const node = getRuntimeNode(db, 'runtime-control-node-001', config);
    const runtimeView = getRuntimeControlViewForNode(db, 'runtime-control-node-001', config);

    assert.equal(control.releaseId, release.releaseId);
    assert.equal(control.desiredVersion, release.version);
    assert.equal(control.configVersion, 1);
    assert.equal(control.artifactMetadata.releaseId, release.releaseId);
    assert.equal(control.artifactMetadata.primaryArtifact.kind, 'snapshot');
    assert.ok(control.artifactMetadata.primaryArtifact.artifactUrl.includes(`/acdp-artifacts/releases/${release.releaseId}/snapshot.json`));
    assert.equal(node.desiredVersion, release.version);
    assert.equal(runtimeView.nodeId, 'runtime-control-node-001');
    assert.equal(runtimeView.desiredVersion, release.version);
    assert.equal(runtimeView.checksum, control.artifactMetadata.primaryArtifact.checksumSha256);

    const bumped = setRuntimeDesiredRelease(db, {
      releaseId: release.releaseId,
    }, config, 'unit_runtime_control');
    assert.equal(bumped.configVersion, 2);
    assert.ok(getRuntimeControlState(db));
  } finally {
    db.close();
  }
});

test('runtime control view refreshes presigned artifact url instead of replaying stale stored url', () => {
  const config = createTestConfig('workspace-unit-runtime-control-refresh', 8824);
  prepareData.main(config);
  bootstrapDb.main(config);
  const release = buildSnapshot.main('runtime control refresh build', config);
  const db = openDatabase(config);
  try {
    registerRuntimeNode(db, {
      nodeId: 'runtime-control-node-refresh-001',
      nodeName: 'Runtime Control Refresh Node 001',
      currentVersion: release.version,
      runtimeVersion: '0.3.1',
    }, config);

    const control = setRuntimeDesiredRelease(db, {
      releaseId: release.releaseId,
    }, config, 'unit_runtime_control');
    const staleMetadata = JSON.parse(JSON.stringify(control.artifactMetadata || {}));
    staleMetadata.primaryArtifact.artifactUrl = 'http://expired.example.invalid/snapshot.json?expired=true';
    staleMetadata.files = (staleMetadata.files || []).map((item) => ({
      ...item,
      artifactUrl: `http://expired.example.invalid/${item.kind}.json?expired=true`,
    }));
    db.prepare('UPDATE runtime_control_state SET artifact_metadata_json = ? WHERE control_key = ?')
      .run(JSON.stringify(staleMetadata), 'global');

    const runtimeView = getRuntimeControlViewForNode(db, 'runtime-control-node-refresh-001', config);
    assert.ok(String(runtimeView.artifactUrl || '').includes(`/acdp-artifacts/releases/${release.releaseId}/snapshot.json`));
    assert.ok(!String(runtimeView.artifactUrl || '').includes('expired.example.invalid'));
    assert.ok((runtimeView.artifactMetadata.files || []).every((item) => !String(item.artifactUrl || '').includes('expired.example.invalid')));
  } finally {
    db.close();
  }
});

test('admin app exposes desiredVersion control and runtime-control/me on control plane only', async () => {
  const config = createTestConfig('workspace-unit-runtime-control-api', 8818);
  prepareData.main(config);
  bootstrapDb.main(config);
  const release = buildSnapshot.main('runtime control api baseline build', config);
  const registrySecret = seedRuntimeNodeRegistry(config, 'runtime-control-node-002', 'http://127.0.0.1:8818');
  const app = createAdminApp(config);
  try {
    const registered = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/register',
      headers: {
        authorization: 'Bearer runtime-control-token',
      },
      body: {
        nodeId: 'runtime-control-node-002',
        nodeName: 'Runtime Control Node 002',
        address: 'http://127.0.0.1:8818',
        currentVersion: release.version,
        runtimeVersion: '0.4.0',
        registrationSecret: registrySecret,
      },
    });
    assert.equal(registered.statusCode, 201);

    const controlSet = await app.inject({
      method: 'POST',
      url: '/api/admin/runtime-control/desired-version',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'runtime_control_admin',
      },
      body: {
        releaseId: release.releaseId,
      },
    });
    assert.equal(controlSet.statusCode, 201);
    assert.equal(controlSet.json.item.desiredVersion, release.version);
    assert.equal(controlSet.json.item.artifactMetadata.primaryArtifact.kind, 'snapshot');

    const controlRead = await app.inject({
      method: 'GET',
      url: '/api/admin/runtime-control',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'runtime_control_admin',
      },
    });
    assert.equal(controlRead.statusCode, 200);
    assert.equal(controlRead.json.item.releaseId, release.releaseId);

    const runtimeControl = await app.inject({
      method: 'GET',
      url: `/api/runtime-control/me?nodeId=${encodeURIComponent('runtime-control-node-002')}&registrationSecret=${encodeURIComponent(registrySecret)}`,
      headers: {
        authorization: 'Bearer runtime-control-token',
      },
    });
    assert.equal(runtimeControl.statusCode, 200);
    assert.equal(runtimeControl.json.nodeId, 'runtime-control-node-002');
    assert.equal(runtimeControl.json.desiredVersion, release.version);
    assert.ok(String(runtimeControl.json.artifactUrl || '').includes(`/acdp-artifacts/releases/${release.releaseId}/snapshot.json`));
    assert.ok(runtimeControl.json.configVersion >= 1);
  } finally {
    await app.stop();
  }
});

test('runtime-only app does not expose runtime-control/me endpoint', async () => {
  const config = createTestConfig('workspace-unit-runtime-control-runtime-surface', 8819);
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('runtime control runtime surface baseline build', config);
  const app = createRuntimeApp(config);
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/runtime-control/me?nodeId=runtime-control-node-003',
      headers: {
        authorization: 'Bearer runtime-control-token',
      },
    });
    assert.equal(response.statusCode, 404);
    assert.equal(response.json.error, 'not found');
  } finally {
    await app.stop();
  }
});

test('runtime app can pull desired snapshot into local artifacts and report apply result without latest fallback', async () => {
  const adminConfigBase = createTestConfig('workspace-unit-runtime-sync-admin', 8820);
  const artifactRoot = path.join(adminConfigBase.resolvedPaths.workspaceDir, 'artifact_store');
  const adminConfig = {
    ...adminConfigBase,
    artifactStore: {
      ...adminConfigBase.artifactStore,
      endpoint: `file://${artifactRoot}`,
      publicBaseUrl: `file://${artifactRoot}`,
      bucket: 'test-artifacts',
    },
  };
  prepareData.main(adminConfig);
  bootstrapDb.main(adminConfig);
  const release = buildSnapshot.main('runtime sync baseline build', adminConfig);
  const runtimeSyncSecret = seedRuntimeNodeRegistry(adminConfig, 'runtime-sync-node-001', 'http://127.0.0.1:8821');
  const releaseArtifactDir = path.join(artifactRoot, adminConfig.artifactStore.bucket, 'releases', release.releaseId);
  fs.mkdirSync(releaseArtifactDir, { recursive: true });
  fs.copyFileSync(release.snapshotPath, path.join(releaseArtifactDir, 'snapshot.json'));
  fs.copyFileSync(release.manifestPath, path.join(releaseArtifactDir, 'manifest.json'));

  const adminApp = createAdminApp(adminConfig);
  try {
    const setDesired = await adminApp.inject({
      method: 'POST',
      url: '/api/admin/runtime-control/desired-version',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'runtime_sync_admin',
      },
      body: {
        releaseId: release.releaseId,
      },
    });
    assert.equal(setDesired.statusCode, 201);

    const runtimeConfigBase = createTestConfig('workspace-unit-runtime-sync-runtime', 8821);
      const runtimeConfig = {
        ...runtimeConfigBase,
        auth: {
          ...runtimeConfigBase.auth,
          runtimeBearerToken: 'runtime-control-token',
        },
        runtimeControl: {
          ...runtimeConfigBase.runtimeControl,
          nodeId: 'runtime-sync-node-001',
          nodeName: 'Runtime Sync Node 001',
          nodeEnv: 'test',
          nodeAddress: 'http://127.0.0.1:8821',
          registrationSecret: runtimeSyncSecret,
          syncIntervalSeconds: 60,
          client: {
            async registerRuntimeNodeRemote(payload) {
              const response = await adminApp.inject({
                method: 'POST',
                url: '/api/runtime-nodes/register',
                headers: {
                  authorization: 'Bearer runtime-control-token',
                },
                body: { ...payload, registrationSecret: runtimeSyncSecret },
              });
              if (response.statusCode >= 400) {
                throw new Error(String((response.json || {}).error || response.body || response.statusCode));
              }
              return response.json;
            },
            async heartbeatRuntimeNodeRemote(payload) {
              const response = await adminApp.inject({
                method: 'POST',
                url: '/api/runtime-nodes/heartbeat',
                headers: {
                  authorization: 'Bearer runtime-control-token',
                },
                body: { ...payload, registrationSecret: runtimeSyncSecret },
              });
              if (response.statusCode >= 400) {
                throw new Error(String((response.json || {}).error || response.body || response.statusCode));
              }
              return response.json;
            },
            async getRuntimeControlRemote(nodeId) {
              const response = await adminApp.inject({
                method: 'GET',
                url: `/api/runtime-control/me?nodeId=${encodeURIComponent(nodeId)}&registrationSecret=${encodeURIComponent(runtimeSyncSecret)}`,
                headers: {
                  authorization: 'Bearer runtime-control-token',
                },
              });
              if (response.statusCode >= 400) {
                throw new Error(String((response.json || {}).error || response.body || response.statusCode));
              }
              return response.json;
            },
            async reportRuntimeApplyResultRemote(nodeId, payload) {
              const response = await adminApp.inject({
                method: 'POST',
                url: `/api/runtime-nodes/${encodeURIComponent(nodeId)}/apply-result`,
                headers: {
                  authorization: 'Bearer runtime-control-token',
                },
                body: { ...payload, registrationSecret: runtimeSyncSecret },
              });
              if (response.statusCode >= 400) {
                throw new Error(String((response.json || {}).error || response.body || response.statusCode));
              }
              return response.json;
            },
          },
        },
        resolvedPaths: {
          ...runtimeConfigBase.resolvedPaths,
        seedCatalogFile: path.join(runtimeConfigBase.resolvedPaths.workspaceDir, 'missing_seed_terms.json'),
      },
    };

    const runtimeApp = createRuntimeApp(runtimeConfig);
    try {
      const before = await runtimeApp.inject({
        method: 'GET',
        url: '/api/runtime/current',
      });
      assert.equal(before.statusCode, 200);
      assert.equal(before.json.stable, null);

      const syncResult = await runtimeApp.syncRuntimeControl();
      assert.equal(syncResult.ok, true);
      assert.equal(syncResult.applied, true);
      assert.equal(syncResult.currentVersion, release.version);

      const after = await runtimeApp.inject({
        method: 'GET',
        url: '/api/runtime/current',
      });
      assert.equal(after.statusCode, 200);
      assert.equal(after.json.stable.version, release.version);

      const correction = await runtimeApp.inject({
        method: 'POST',
        url: '/api/runtime/correct',
        headers: {
          authorization: 'Bearer runtime-control-token',
        },
        body: {
          text: '我想咨询旗顺路和工商认定。',
        },
      });
      assert.equal(correction.statusCode, 200);
      assert.equal(correction.json.correctedText, '我想咨询祁顺路和工伤认定。');

      const currentStatePath = path.join(runtimeConfig.resolvedPaths.runtimeStateDir, 'current.json');
      assert.equal(fs.existsSync(currentStatePath), true);
      assert.equal(fs.existsSync(path.join(runtimeConfig.resolvedPaths.runtimeArtifactsDir, 'releases', release.releaseId, 'snapshot.json')), true);

      const node = getRuntimeNode(adminApp.db, 'runtime-sync-node-001', adminConfig);
      assert.ok(node);
      assert.equal(node.currentVersion, release.version);
      assert.equal(node.lastApplyStatus, 'success');
    } finally {
      await runtimeApp.stop();
    }
  } finally {
    await adminApp.stop();
  }
});

test('runtime app can install release through admin_http_signed delivery without shared artifact store', async () => {
  const adminConfigBase = createTestConfig('workspace-unit-runtime-admin-http-signed-admin', 8826);
  const adminConfig = {
    ...adminConfigBase,
    runtimeDelivery: {
      mode: 'admin_http_signed',
      adminArtifactBaseUrl: 'http://127.0.0.1:8826',
      signedUrlSecret: 'runtime-admin-http-signed-secret',
      signedUrlExpiresSeconds: 300,
      bindNodeId: true,
      bindConfigVersion: true,
    },
  };
  prepareData.main(adminConfig);
  bootstrapDb.main(adminConfig);
  const release = buildSnapshot.main('runtime admin http signed build', adminConfig);
  const runtimeSyncSecret = seedRuntimeNodeRegistry(adminConfig, 'runtime-admin-http-node-001', 'http://127.0.0.1:8827');

  const adminApp = createAdminApp(adminConfig);
  let originalFetch = null;
  try {
    const setDesired = await adminApp.inject({
      method: 'POST',
      url: '/api/admin/runtime-control/desired-version',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'runtime_admin_http_signed_admin',
      },
      body: {
        releaseId: release.releaseId,
      },
    });
    assert.equal(setDesired.statusCode, 201);
    assert.equal(setDesired.json.item.artifactMetadata.deliveryMode, 'admin_http_signed');
    assert.equal(String(setDesired.json.item.artifactMetadata.primaryArtifact.artifactUrl || ''), '');

    const runtimeConfigBase = createTestConfig('workspace-unit-runtime-admin-http-signed-runtime', 8827);
    originalFetch = global.fetch;
    global.fetch = async (url, options = {}) => {
      const parsed = new URL(String(url || ''));
      const response = await adminApp.inject({
        method: String(options.method || 'GET').toUpperCase(),
        url: `${parsed.pathname}${parsed.search}`,
        headers: options.headers || {},
      });
      const bodyBuffer = Buffer.isBuffer(response.body)
        ? response.body
        : Buffer.from(String(response.body || ''), 'utf8');
      return {
        ok: response.statusCode >= 200 && response.statusCode < 300,
        status: response.statusCode,
        statusText: response.statusCode === 200 ? 'OK' : 'ERROR',
        headers: {
          get(name) {
            return response.headers[String(name || '').toLowerCase()] || '';
          },
        },
        async arrayBuffer() {
          return bodyBuffer.buffer.slice(bodyBuffer.byteOffset, bodyBuffer.byteOffset + bodyBuffer.byteLength);
        },
        async text() {
          return bodyBuffer.toString('utf8');
        },
      };
    };
    const runtimeConfig = {
      ...runtimeConfigBase,
      auth: {
        ...runtimeConfigBase.auth,
        runtimeBearerToken: 'runtime-control-token',
      },
      runtimeControl: {
        ...runtimeConfigBase.runtimeControl,
        nodeId: 'runtime-admin-http-node-001',
        nodeName: 'Runtime Admin Http Signed Node 001',
        nodeEnv: 'test',
        nodeAddress: 'http://127.0.0.1:8827',
        registrationSecret: runtimeSyncSecret,
        syncIntervalSeconds: 60,
        client: {
          async registerRuntimeNodeRemote(payload) {
            const response = await adminApp.inject({
              method: 'POST',
              url: '/api/runtime-nodes/register',
              headers: {
                authorization: 'Bearer runtime-control-token',
              },
              body: { ...payload, registrationSecret: runtimeSyncSecret },
            });
            if (response.statusCode >= 400) {
              throw new Error(String((response.json || {}).error || response.body || response.statusCode));
            }
            return response.json;
          },
          async heartbeatRuntimeNodeRemote(payload) {
            const response = await adminApp.inject({
              method: 'POST',
              url: '/api/runtime-nodes/heartbeat',
              headers: {
                authorization: 'Bearer runtime-control-token',
              },
              body: { ...payload, registrationSecret: runtimeSyncSecret },
            });
            if (response.statusCode >= 400) {
              throw new Error(String((response.json || {}).error || response.body || response.statusCode));
            }
            return response.json;
          },
          async getRuntimeControlRemote(nodeId) {
            const response = await adminApp.inject({
              method: 'GET',
              url: `/api/runtime-control/me?nodeId=${encodeURIComponent(nodeId)}&registrationSecret=${encodeURIComponent(runtimeSyncSecret)}`,
              headers: {
                authorization: 'Bearer runtime-control-token',
              },
            });
            if (response.statusCode >= 400) {
              throw new Error(String((response.json || {}).error || response.body || response.statusCode));
            }
            return response.json;
          },
          async reportRuntimeApplyResultRemote(nodeId, payload) {
            const response = await adminApp.inject({
              method: 'POST',
              url: `/api/runtime-nodes/${encodeURIComponent(nodeId)}/apply-result`,
              headers: {
                authorization: 'Bearer runtime-control-token',
              },
              body: { ...payload, registrationSecret: runtimeSyncSecret },
            });
            if (response.statusCode >= 400) {
              throw new Error(String((response.json || {}).error || response.body || response.statusCode));
            }
            return response.json;
          },
        },
      },
      resolvedPaths: {
        ...runtimeConfigBase.resolvedPaths,
        seedCatalogFile: path.join(runtimeConfigBase.resolvedPaths.workspaceDir, 'missing_seed_terms.json'),
      },
    };

    const runtimeApp = createRuntimeApp(runtimeConfig);
    try {
      const syncResult = await runtimeApp.syncRuntimeControl();
      assert.equal(syncResult.ok, true);
      assert.equal(syncResult.applied, true);
      assert.equal(syncResult.currentVersion, release.version);

      const controlView = await runtimeConfig.runtimeControl.client.getRuntimeControlRemote('runtime-admin-http-node-001');
      assert.equal(controlView.artifactMetadata.deliveryMode, 'admin_http_signed');
      assert.match(String(controlView.artifactUrl || ''), /^http:\/\/127\.0\.0\.1:8826\/api\/runtime-artifacts\/releases\//);
      assert.match(String(controlView.artifactUrl || ''), /signature=/);
      assert.match(String(controlView.artifactUrl || ''), /nodeId=runtime-admin-http-node-001/);

      const correction = await runtimeApp.inject({
        method: 'POST',
        url: '/api/runtime/correct',
        headers: {
          authorization: 'Bearer runtime-control-token',
        },
        body: {
          text: '我想咨询旗顺路和工商认定。',
        },
      });
      assert.equal(correction.statusCode, 200);
      assert.equal(correction.json.correctedText, '我想咨询祁顺路和工伤认定。');

      const node = getRuntimeNode(adminApp.db, 'runtime-admin-http-node-001', adminConfig);
      assert.ok(node);
      assert.equal(node.currentVersion, release.version);
      assert.equal(node.lastApplyStatus, 'success');
    } finally {
      await runtimeApp.stop();
    }
  } finally {
    if (originalFetch !== null) {
      global.fetch = originalFetch;
    }
    await adminApp.stop();
  }
});

test('admin runtime artifact download route rejects invalid admin_http_signed signature', async () => {
  const adminConfigBase = createTestConfig('workspace-unit-runtime-admin-http-signed-invalid', 8828);
  const adminConfig = {
    ...adminConfigBase,
    runtimeDelivery: {
      mode: 'admin_http_signed',
      adminArtifactBaseUrl: 'http://127.0.0.1:8828',
      signedUrlSecret: 'runtime-admin-http-invalid-secret',
      signedUrlExpiresSeconds: 300,
      bindNodeId: true,
      bindConfigVersion: true,
    },
  };
  prepareData.main(adminConfig);
  bootstrapDb.main(adminConfig);
  const release = buildSnapshot.main('runtime admin http invalid signature build', adminConfig);
  const runtimeSyncSecret = seedRuntimeNodeRegistry(adminConfig, 'runtime-admin-http-node-002', 'http://127.0.0.1:8829');

  const adminApp = createAdminApp(adminConfig);
  try {
    const register = await adminApp.inject({
      method: 'POST',
      url: '/api/runtime-nodes/register',
      headers: {
        authorization: 'Bearer runtime-control-token',
      },
      body: {
        nodeId: 'runtime-admin-http-node-002',
        nodeName: 'Runtime Admin Http Signed Node 002',
        address: 'http://127.0.0.1:8829',
        currentVersion: release.version,
        runtimeVersion: '0.4.0',
        registrationSecret: runtimeSyncSecret,
      },
    });
    assert.equal(register.statusCode, 201);

    const setDesired = await adminApp.inject({
      method: 'POST',
      url: '/api/admin/runtime-control/desired-version',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'runtime_admin_http_signed_admin',
      },
      body: {
        releaseId: release.releaseId,
      },
    });
    assert.equal(setDesired.statusCode, 201);

    const runtimeControl = await adminApp.inject({
      method: 'GET',
      url: `/api/runtime-control/me?nodeId=${encodeURIComponent('runtime-admin-http-node-002')}&registrationSecret=${encodeURIComponent(runtimeSyncSecret)}`,
      headers: {
        authorization: 'Bearer runtime-control-token',
      },
    });
    assert.equal(runtimeControl.statusCode, 200);
    const artifactUrl = new URL(String(runtimeControl.json.artifactUrl || ''));
    artifactUrl.searchParams.set('signature', 'deadbeef');

    const download = await adminApp.inject({
      method: 'GET',
      url: `${artifactUrl.pathname}${artifactUrl.search}`,
    });
    assert.equal(download.statusCode, 403);
    assert.match(String(download.json.error || ''), /runtime_artifact_signature_invalid/);
  } finally {
    await adminApp.stop();
  }
});

test('runtime app rolls back to previous local release when post-install verification fails', async () => {
  const adminConfigBase = createTestConfig('workspace-unit-runtime-rollback-admin', 8822);
  const artifactRoot = path.join(adminConfigBase.resolvedPaths.workspaceDir, 'artifact_store');
  const adminConfig = {
    ...adminConfigBase,
    artifactStore: {
      ...adminConfigBase.artifactStore,
      endpoint: `file://${artifactRoot}`,
      publicBaseUrl: `file://${artifactRoot}`,
      bucket: 'test-artifacts',
    },
  };
  prepareData.main(adminConfig);
  bootstrapDb.main(adminConfig);
  const releaseA = buildSnapshot.main('runtime rollback release A', adminConfig);
  const releaseB = buildSnapshot.main('runtime rollback release B', adminConfig);
  const runtimeRollbackSecret = seedRuntimeNodeRegistry(adminConfig, 'runtime-rollback-node-001', 'http://127.0.0.1:8823');
  for (const release of [releaseA, releaseB]) {
    const releaseArtifactDir = path.join(artifactRoot, adminConfig.artifactStore.bucket, 'releases', release.releaseId);
    fs.mkdirSync(releaseArtifactDir, { recursive: true });
    fs.copyFileSync(release.snapshotPath, path.join(releaseArtifactDir, 'snapshot.json'));
    fs.copyFileSync(release.manifestPath, path.join(releaseArtifactDir, 'manifest.json'));
  }

  const adminApp = createAdminApp(adminConfig);
  try {
    const runtimeConfigBase = createTestConfig('workspace-unit-runtime-rollback-runtime', 8823);
    let rejectReleaseId = '';
    const runtimeConfig = {
      ...runtimeConfigBase,
      auth: {
        ...runtimeConfigBase.auth,
        runtimeBearerToken: 'runtime-control-token',
      },
      runtimeControl: {
        ...runtimeConfigBase.runtimeControl,
        nodeId: 'runtime-rollback-node-001',
        nodeName: 'Runtime Rollback Node 001',
        nodeEnv: 'test',
        nodeAddress: 'http://127.0.0.1:8823',
        registrationSecret: runtimeRollbackSecret,
        syncIntervalSeconds: 60,
        async verifyInstalledRelease(installed) {
          if (installed.releaseId === rejectReleaseId) {
            throw new Error(`forced_verify_failure:${installed.releaseId}`);
          }
        },
        client: {
          async registerRuntimeNodeRemote(payload) {
            return (await adminApp.inject({
              method: 'POST',
              url: '/api/runtime-nodes/register',
              headers: {
                authorization: 'Bearer runtime-control-token',
              },
              body: { ...payload, registrationSecret: runtimeRollbackSecret },
            })).json;
          },
          async heartbeatRuntimeNodeRemote(payload) {
            return (await adminApp.inject({
              method: 'POST',
              url: '/api/runtime-nodes/heartbeat',
              headers: {
                authorization: 'Bearer runtime-control-token',
              },
              body: { ...payload, registrationSecret: runtimeRollbackSecret },
            })).json;
          },
          async getRuntimeControlRemote(nodeId) {
            return (await adminApp.inject({
              method: 'GET',
              url: `/api/runtime-control/me?nodeId=${encodeURIComponent(nodeId)}&registrationSecret=${encodeURIComponent(runtimeRollbackSecret)}`,
              headers: {
                authorization: 'Bearer runtime-control-token',
              },
            })).json;
          },
          async reportRuntimeApplyResultRemote(nodeId, payload) {
            return (await adminApp.inject({
              method: 'POST',
              url: `/api/runtime-nodes/${encodeURIComponent(nodeId)}/apply-result`,
              headers: {
                authorization: 'Bearer runtime-control-token',
              },
              body: { ...payload, registrationSecret: runtimeRollbackSecret },
            })).json;
          },
        },
      },
      resolvedPaths: {
        ...runtimeConfigBase.resolvedPaths,
        seedCatalogFile: path.join(runtimeConfigBase.resolvedPaths.workspaceDir, 'missing_seed_terms.json'),
      },
    };

    const runtimeApp = createRuntimeApp(runtimeConfig);
    try {
      let response = await adminApp.inject({
        method: 'POST',
        url: '/api/admin/runtime-control/desired-version',
        headers: {
          'x-role': 'dict_admin',
          'x-operator': 'runtime_rollback_admin',
        },
        body: {
          releaseId: releaseA.releaseId,
        },
      });
      assert.equal(response.statusCode, 201);
      let syncResult = await runtimeApp.syncRuntimeControl();
      assert.equal(syncResult.currentVersion, releaseA.version);

      rejectReleaseId = releaseB.releaseId;
      response = await adminApp.inject({
        method: 'POST',
        url: '/api/admin/runtime-control/desired-version',
        headers: {
          'x-role': 'dict_admin',
          'x-operator': 'runtime_rollback_admin',
        },
        body: {
          releaseId: releaseB.releaseId,
        },
      });
      assert.equal(response.statusCode, 201);

      await assert.rejects(() => runtimeApp.syncRuntimeControl(), /forced_verify_failure/);

      const after = await runtimeApp.inject({
        method: 'GET',
        url: '/api/runtime/current',
      });
      assert.equal(after.statusCode, 200);
      assert.equal(after.json.stable.version, releaseA.version);

      const node = getRuntimeNode(adminApp.db, 'runtime-rollback-node-001', adminConfig);
      assert.ok(node);
      assert.equal(node.currentVersion, releaseA.version);
      assert.equal(node.lastApplyStatus, 'rolled_back');
      assert.match(String(node.lastError || ''), /forced_verify_failure/);
    } finally {
      await runtimeApp.stop();
    }
  } finally {
    await adminApp.stop();
  }
});
