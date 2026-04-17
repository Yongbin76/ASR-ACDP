const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildRuntimeInstanceConfig(baseConfig, options = {}) {
  const instanceId = String(options.instanceId || '').trim();
  if (!instanceId) {
    throw new Error('instanceId is required');
  }
  const workspaceRoot = String(options.workspaceRoot || path.join(baseConfig.projectRoot, 'prototype', 'runtime_instances')).trim();
  const instanceRoot = path.join(workspaceRoot, instanceId);
  const workspaceDir = path.join(instanceRoot, 'workspace');
  const catalogDir = path.join(workspaceDir, 'catalog');
  const releasesDir = path.join(workspaceDir, 'releases');
  ensureDir(catalogDir);
  ensureDir(releasesDir);
  const host = String(options.host || baseConfig.server.host || '127.0.0.1').trim() || '127.0.0.1';
  const port = Math.max(1, Number(options.port || baseConfig.server.runtimePort || baseConfig.server.port));
  const nodeId = String(options.nodeId || instanceId).trim() || instanceId;
  const nodeName = String(options.nodeName || nodeId).trim() || nodeId;
  const nodeEnv = String(options.nodeEnv || baseConfig.runtimeControl.nodeEnv || '').trim();
  const nodeAddress = String(options.nodeAddress || `http://${host}:${port}`).trim() || `http://${host}:${port}`;
  const adminBaseUrl = String(options.adminBaseUrl || baseConfig.runtimeControl.adminBaseUrl || '').trim();

  return {
    ...baseConfig,
    server: {
      ...baseConfig.server,
      host,
      port,
      runtimePort: port,
    },
    runtimeControl: {
      ...baseConfig.runtimeControl,
      adminBaseUrl,
      nodeId,
      nodeName,
      nodeEnv,
      nodeAddress,
      registrationSecret: String(options.registrationSecret || baseConfig.runtimeControl.registrationSecret || '').trim(),
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
  };
}

module.exports = {
  buildRuntimeInstanceConfig,
};
