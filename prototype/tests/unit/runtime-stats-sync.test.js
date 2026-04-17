const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const buildSnapshot = require('../../src/cli/build-snapshot');
const { createAdminApp, createRuntimeApp } = require('../../src/server');
const { getDashboardSummary, getRuntimeNode, openDatabase, createRuntimeNodeRegistryItem } = require('../../src/lib/platform-db');
const {
  buildRuntimeStatsUploadPayload,
  markRuntimeStatsUploaded,
  openRuntimeStatsDatabase,
} = require('../../src/lib/runtime-stats');

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
      runtimeBearerToken: 'runtime-stats-token',
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

function seedRuntimeNodeRegistry(config, nodeId, address, secret = 'runtime-stats-secret') {
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

test('runtime stats stay local until uploaded and admin upload is idempotent', async () => {
  const adminConfigBase = createTestConfig('workspace-unit-runtime-stats-admin', 8824);
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
  const release = buildSnapshot.main('runtime stats baseline build', adminConfig);
  const runtimeStatsSecret = seedRuntimeNodeRegistry(adminConfig, 'runtime-stats-node-001', 'http://127.0.0.1:8825');
  const releaseArtifactDir = path.join(artifactRoot, adminConfig.artifactStore.bucket, 'releases', release.releaseId);
  fs.mkdirSync(releaseArtifactDir, { recursive: true });
  fs.copyFileSync(release.snapshotPath, path.join(releaseArtifactDir, 'snapshot.json'));
  fs.copyFileSync(release.manifestPath, path.join(releaseArtifactDir, 'manifest.json'));

  const adminApp = createAdminApp(adminConfig);
  try {
    const runtimeConfigBase = createTestConfig('workspace-unit-runtime-stats-runtime', 8825);
    const runtimeConfig = {
      ...runtimeConfigBase,
      runtimeControl: {
        ...runtimeConfigBase.runtimeControl,
        nodeId: 'runtime-stats-node-001',
        nodeName: 'Runtime Stats Node 001',
        nodeEnv: 'test',
        nodeAddress: 'http://127.0.0.1:8825',
        registrationSecret: runtimeStatsSecret,
        statsFlushIntervalSeconds: 300,
        client: {
          async registerRuntimeNodeRemote(payload) {
            return (await adminApp.inject({
              method: 'POST',
              url: '/api/runtime-nodes/register',
              headers: {
                authorization: 'Bearer runtime-stats-token',
              },
              body: { ...payload, registrationSecret: runtimeStatsSecret },
            })).json;
          },
          async heartbeatRuntimeNodeRemote(payload) {
            return (await adminApp.inject({
              method: 'POST',
              url: '/api/runtime-nodes/heartbeat',
              headers: {
                authorization: 'Bearer runtime-stats-token',
              },
              body: { ...payload, registrationSecret: runtimeStatsSecret },
            })).json;
          },
          async getRuntimeControlRemote(nodeId) {
            return (await adminApp.inject({
              method: 'GET',
              url: `/api/runtime-control/me?nodeId=${encodeURIComponent(nodeId)}&registrationSecret=${encodeURIComponent(runtimeStatsSecret)}`,
              headers: {
                authorization: 'Bearer runtime-stats-token',
              },
            })).json;
          },
          async reportRuntimeApplyResultRemote(nodeId, payload) {
            return (await adminApp.inject({
              method: 'POST',
              url: `/api/runtime-nodes/${encodeURIComponent(nodeId)}/apply-result`,
              headers: {
                authorization: 'Bearer runtime-stats-token',
              },
              body: { ...payload, registrationSecret: runtimeStatsSecret },
            })).json;
          },
          async uploadRuntimeStatsRemote(nodeId, payload) {
            return (await adminApp.inject({
              method: 'POST',
              url: `/api/runtime-nodes/${encodeURIComponent(nodeId)}/stats/upload`,
              headers: {
                authorization: 'Bearer runtime-stats-token',
              },
              body: { ...payload, registrationSecret: runtimeStatsSecret },
            })).json;
          },
        },
      },
      resolvedPaths: {
        ...runtimeConfigBase.resolvedPaths,
        seedCatalogFile: path.join(runtimeConfigBase.resolvedPaths.workspaceDir, 'missing_seed_terms.json'),
      },
    };

    const setDesired = await adminApp.inject({
      method: 'POST',
      url: '/api/admin/runtime-control/desired-version',
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'runtime_stats_admin',
      },
      body: {
        releaseId: release.releaseId,
      },
    });
    assert.equal(setDesired.statusCode, 201);

    const runtimeApp = createRuntimeApp(runtimeConfig);
    try {
      await runtimeApp.syncRuntimeControl();

      const beforeUploadSummary = getDashboardSummary(adminApp.db);
      const latestHourlyBefore = beforeUploadSummary.runtime.hourly[beforeUploadSummary.runtime.hourly.length - 1];
      assert.ok(!latestHourlyBefore || Number(latestHourlyBefore.requestCount || 0) === 0);

      for (const text of ['我想咨询旗顺路。', '我想咨询工商认定。']) {
        const response = await runtimeApp.inject({
          method: 'POST',
          url: '/api/runtime/correct',
          headers: {
            authorization: 'Bearer runtime-stats-token',
          },
          body: {
            text,
          },
        });
        assert.equal(response.statusCode, 200);
      }

      const runtimeStats = await runtimeApp.inject({
        method: 'GET',
        url: '/api/runtime/stats',
      });
      assert.equal(runtimeStats.statusCode, 200);
      assert.ok(runtimeStats.json.peak);
      assert.ok(Number(runtimeStats.json.peak.peakConcurrency || 0) >= 1);
      assert.equal(Number(runtimeStats.json.totalCorrections || 0), 2);

      const statsDb = openRuntimeStatsDatabase(runtimeConfig);
      try {
        const payload = buildRuntimeStatsUploadPayload(statsDb, 'runtime-stats-node-001', {
          maxBatchSize: 1000,
        });
        assert.ok(payload);
        assert.ok((payload.records || []).length >= 1);

        const first = await adminApp.inject({
          method: 'POST',
          url: '/api/runtime-nodes/runtime-stats-node-001/stats/upload',
          headers: {
            authorization: 'Bearer runtime-stats-token',
          },
          body: { ...payload, registrationSecret: runtimeStatsSecret },
        });
        assert.equal(first.statusCode, 200);
        assert.ok(first.json.insertedCount >= 1);

        const second = await adminApp.inject({
          method: 'POST',
          url: '/api/runtime-nodes/runtime-stats-node-001/stats/upload',
          headers: {
            authorization: 'Bearer runtime-stats-token',
          },
          body: { ...payload, registrationSecret: runtimeStatsSecret },
        });
        assert.equal(second.statusCode, 200);
        assert.equal(second.json.insertedCount, 0);
        assert.ok(second.json.duplicateCount >= payload.records.length);

        markRuntimeStatsUploaded(statsDb, payload);

        const afterUploadSummary = getDashboardSummary(adminApp.db);
        const latestHourlyAfter = afterUploadSummary.runtime.hourly[afterUploadSummary.runtime.hourly.length - 1];
        assert.ok(latestHourlyAfter);
        assert.equal(Number(latestHourlyAfter.requestCount || 0), 2);
        assert.ok((afterUploadSummary.runtime.topHitTerms || []).length >= 2);

        const node = getRuntimeNode(adminApp.db, 'runtime-stats-node-001', adminConfig);
        assert.ok(node);
        assert.equal(String(node.runtimeStatsCursor), String(payload.toEventId));
      } finally {
        statsDb.close();
      }
    } finally {
      await runtimeApp.stop();
    }
  } finally {
    await adminApp.stop();
  }
});
