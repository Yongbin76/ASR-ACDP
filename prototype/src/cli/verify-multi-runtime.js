const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../lib/config');
const { buildRuntimeInstanceConfig } = require('../lib/runtime-instance-config');
const prepareData = require('./prepare-data');
const bootstrapDb = require('./bootstrap-db');
const buildSnapshot = require('./build-snapshot');
const {
  openDatabase,
  createRuntimeNodeRegistryItem,
  setRuntimeDesiredRelease,
  listRuntimeNodes,
} = require('../lib/platform-db');
const { createAdminApp, createRuntimeApp } = require('../server');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  ensureDir(dirPath);
}

function createWorkspaceConfig(baseConfig, workspaceName, port, artifactRoot, deliveryMode = 'file') {
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', workspaceName);
  const catalogDir = path.join(workspaceDir, 'catalog');
  const releasesDir = path.join(workspaceDir, 'releases');
  resetDir(workspaceDir);
  ensureDir(catalogDir);
  ensureDir(releasesDir);
  return {
    ...baseConfig,
    artifactStore: {
      ...baseConfig.artifactStore,
      endpoint: `file://${artifactRoot}`,
      publicBaseUrl: `file://${artifactRoot}`,
      bucket: 'verify-artifacts',
    },
    runtimeDelivery: deliveryMode === 'admin_http_signed'
      ? {
        ...baseConfig.runtimeDelivery,
        mode: 'admin_http_signed',
        adminArtifactBaseUrl: `http://127.0.0.1:${port}`,
        signedUrlSecret: 'verify-multi-runtime-signed-secret',
        signedUrlExpiresSeconds: 300,
        bindNodeId: true,
        bindConfigVersion: true,
      }
      : {
        ...baseConfig.runtimeDelivery,
        mode: 'file',
      },
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
      runtimeArtifactsDir: path.join(workspaceDir, 'runtime_artifacts'),
      runtimeStateDir: path.join(workspaceDir, 'runtime_state'),
      hostVerificationDir: path.join(workspaceDir, 'host_verification'),
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
    auth: {
      ...baseConfig.auth,
      runtimeBearerToken: 'verify-multi-runtime-token',
    },
  };
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] || '').trim();
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next == null || String(next).startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const baseConfig = createAppConfig();
  const artifactRoot = path.join(baseConfig.projectRoot, 'prototype', 'workspace-multi-runtime-verify-artifacts');
  resetDir(artifactRoot);

  const adminPort = Math.max(1, Number(args['admin-port'] || 8840));
  const deliveryMode = String(args['delivery-mode'] || 'file').trim().toLowerCase();
  const runtimePorts = String(args['runtime-ports'] || '8841,8842')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  const adminConfig = createWorkspaceConfig(baseConfig, 'workspace-multi-runtime-verify-admin', adminPort, artifactRoot, deliveryMode);
  prepareData.main(adminConfig);
  bootstrapDb.main(adminConfig);
  const release = buildSnapshot.main('multi runtime verify build', adminConfig);
  if (deliveryMode !== 'admin_http_signed') {
    const releaseArtifactDir = path.join(artifactRoot, adminConfig.artifactStore.bucket, 'releases', release.releaseId);
    ensureDir(releaseArtifactDir);
    fs.copyFileSync(release.snapshotPath, path.join(releaseArtifactDir, 'snapshot.json'));
    fs.copyFileSync(release.manifestPath, path.join(releaseArtifactDir, 'manifest.json'));
  }

  const registryDb = openDatabase(adminConfig);
  const runtimeInstances = runtimePorts.map((port, index) => ({
    instanceId: `runtime-${index + 1}`,
    nodeId: `verify-runtime-node-${index + 1}`,
    nodeName: `Verify Runtime Node ${index + 1}`,
    nodeAddress: `http://127.0.0.1:${port}`,
    registrationSecret: `verify-runtime-secret-${index + 1}`,
    port,
  }));
  for (const item of runtimeInstances) {
    createRuntimeNodeRegistryItem(registryDb, {
      nodeId: item.nodeId,
      nodeName: item.nodeName,
      env: 'verify',
      address: item.nodeAddress,
      registrationSecret: item.registrationSecret,
    }, 'verify_multi_runtime');
  }
  registryDb.close();

  const adminApp = createAdminApp(adminConfig);
  const runtimeApps = [];
  try {
    setRuntimeDesiredRelease(adminApp.db, { releaseId: release.releaseId }, adminConfig, 'verify_multi_runtime');
    for (const item of runtimeInstances) {
      const runtimeConfig = buildRuntimeInstanceConfig(adminConfig, {
        instanceId: item.instanceId,
        port: item.port,
        workspaceRoot: path.join(baseConfig.projectRoot, 'prototype', 'workspace-multi-runtime-runtimes'),
        nodeId: item.nodeId,
        nodeName: item.nodeName,
        nodeEnv: 'verify',
        nodeAddress: item.nodeAddress,
        registrationSecret: item.registrationSecret,
      });
      runtimeConfig.runtimeControl.client = {
        async registerRuntimeNodeRemote(payload) {
          const response = await adminApp.inject({
            method: 'POST',
            url: '/api/runtime-nodes/register',
            headers: {
              authorization: 'Bearer verify-multi-runtime-token',
            },
            body: { ...payload, registrationSecret: item.registrationSecret },
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
              authorization: 'Bearer verify-multi-runtime-token',
            },
            body: { ...payload, registrationSecret: item.registrationSecret },
          });
          if (response.statusCode >= 400) {
            throw new Error(String((response.json || {}).error || response.body || response.statusCode));
          }
          return response.json;
        },
        async getRuntimeControlRemote(nodeId) {
          const response = await adminApp.inject({
            method: 'GET',
            url: `/api/runtime-control/me?nodeId=${encodeURIComponent(nodeId)}&registrationSecret=${encodeURIComponent(item.registrationSecret)}`,
            headers: {
              authorization: 'Bearer verify-multi-runtime-token',
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
              authorization: 'Bearer verify-multi-runtime-token',
            },
            body: { ...payload, registrationSecret: item.registrationSecret },
          });
          if (response.statusCode >= 400) {
            throw new Error(String((response.json || {}).error || response.body || response.statusCode));
          }
          return response.json;
        },
      };
      const runtimeApp = createRuntimeApp(runtimeConfig);
      runtimeApps.push({ app: runtimeApp, config: runtimeConfig, meta: item });
      await runtimeApp.syncRuntimeControl();
    }

    const nodeList = listRuntimeNodes(adminApp.db, {}, adminConfig).items;
    const checks = [];
    for (const item of runtimeApps) {
      const response = await item.app.inject({
        method: 'POST',
        url: '/api/runtime/correct',
        headers: {
          'content-type': 'application/json; charset=utf-8',
          authorization: 'Bearer verify-multi-runtime-token',
        },
        body: {
          text: '我想咨询旗顺路和工商认定。',
        },
      });
      const body = response.json;
      checks.push({
        nodeId: item.meta.nodeId,
        address: item.meta.nodeAddress,
        statusCode: response.statusCode,
        correctedText: body.correctedText || '',
      });
    }

    const reportDir = path.join(adminConfig.resolvedPaths.hostVerificationDir, `${new Date().toISOString().replace(/[:.]/g, '-')}_multi_runtime_verify`);
    ensureDir(reportDir);
    const summary = {
      ok: checks.every((item) => item.statusCode === 200 && item.correctedText === '我想咨询祁顺路和工伤认定。'),
      adminBaseUrl: `http://127.0.0.1:${adminPort}`,
      deliveryMode,
      releaseId: release.releaseId,
      releaseVersion: release.version,
      runtimeNodeCount: nodeList.length,
      checks,
    };
    fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({
      reportDir,
      ...summary,
    }, null, 2));
    return summary;
  } finally {
    for (const item of runtimeApps.reverse()) {
      await item.app.stop();
    }
    await adminApp.stop();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  main,
};
