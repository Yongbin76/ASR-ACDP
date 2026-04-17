const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { createAppConfig, createArtifactStoreConfig, readConfigStringWithEnv } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const buildSnapshot = require('../../src/cli/build-snapshot');
const {
  buildMinioRequestTarget,
  buildReleaseArtifactMetadata,
  buildReleaseArtifactKey,
  buildReleaseArtifactPlan,
  createArtifactStoreClient,
  buildMinioPresignedGetUrl,
  buildAdminRuntimeArtifactUrl,
  resolveMinioCredentials,
  signMinioRequest,
  signRuntimeArtifactDownload,
  syncReleaseArtifactsToStore,
  validateRuntimeArtifactDownloadRequest,
  verifyRuntimeArtifactDownloadSignature,
} = require('../../src/lib/artifact-store');

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
    `workspace-unit-artifact-store-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const catalogDir = path.join(workspaceDir, 'catalog');
  const releasesDir = path.join(workspaceDir, 'releases');
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

test('artifact store config is loaded into app config without hardcoded overrides', () => {
  const artifactStoreConfig = createArtifactStoreConfig();
  const appConfig = createAppConfig();

  assert.equal(artifactStoreConfig.artifactStore.provider, 'minio');
  assert.equal(artifactStoreConfig.artifactStore.bucket, 'acdp-artifacts');
  assert.equal(artifactStoreConfig.runtimeControl.statsFlushIntervalSeconds, 300);
  assert.ok(appConfig.artifactStoreConfigPath.endsWith(path.join('prototype', 'config', 'artifact_store.config.json')));
  assert.equal(appConfig.artifactStore.endpoint, artifactStoreConfig.artifactStore.endpoint);
  assert.equal(appConfig.runtimeControl.nodeOfflineThresholdSeconds, 120);
});

test('artifact store config can resolve environment-backed values while remaining config-driven', () => {
  const tempConfigPath = path.join(os.tmpdir(), `acdp-artifact-store-${Date.now()}.json`);
  fs.writeFileSync(tempConfigPath, JSON.stringify({
    artifactStore: {
      provider: 'minio',
      endpoint: 'http://127.0.0.1:9000',
      endpointEnv: 'ACDP_TEST_ARTIFACT_ENDPOINT',
      bucket: 'fallback-bucket',
      bucketEnv: 'ACDP_TEST_ARTIFACT_BUCKET',
      rootUser: 'fallback-user',
      rootUserEnv: 'ACDP_TEST_ARTIFACT_ROOT_USER',
      rootPassword: 'fallback-password',
      rootPasswordEnv: 'ACDP_TEST_ARTIFACT_ROOT_PASSWORD',
      accessKey: 'fallback-access',
      accessKeyEnv: 'ACDP_TEST_ARTIFACT_ACCESS_KEY',
      secretKey: 'fallback-secret',
      secretKeyEnv: 'ACDP_TEST_ARTIFACT_SECRET_KEY',
    },
    runtimeControl: {
      adminBaseUrl: 'http://127.0.0.1:8788',
      adminBaseUrlEnv: 'ACDP_TEST_RUNTIME_CONTROL_ADMIN_BASE_URL',
      nodeId: 'fallback-node',
      nodeIdEnv: 'ACDP_TEST_RUNTIME_CONTROL_NODE_ID',
      nodeName: 'fallback-node',
      nodeNameEnv: 'ACDP_TEST_RUNTIME_CONTROL_NODE_NAME',
      nodeEnv: 'fallback-env',
      nodeEnvEnv: 'ACDP_TEST_RUNTIME_CONTROL_NODE_ENV',
      nodeAddress: 'http://127.0.0.1:8787',
      nodeAddressEnv: 'ACDP_TEST_RUNTIME_CONTROL_NODE_ADDRESS',
    },
    runtimeDelivery: {
      mode: 'admin_http_signed',
      adminArtifactBaseUrl: 'http://127.0.0.1:8788',
      adminArtifactBaseUrlEnv: 'ACDP_TEST_RUNTIME_DELIVERY_BASE_URL',
      signedUrlSecret: 'fallback-signed-secret',
      signedUrlSecretEnv: 'ACDP_TEST_RUNTIME_DELIVERY_SIGNED_SECRET',
      signedUrlExpiresSeconds: 180,
      bindNodeId: true,
      bindConfigVersion: true,
    },
  }, null, 2), 'utf8');

  process.env.ACDP_TEST_ARTIFACT_ENDPOINT = 'http://127.0.0.1:19000';
  process.env.ACDP_TEST_ARTIFACT_BUCKET = 'env-bucket';
  process.env.ACDP_TEST_ARTIFACT_ROOT_USER = 'env-root-user';
  process.env.ACDP_TEST_ARTIFACT_ROOT_PASSWORD = 'env-root-password';
  process.env.ACDP_TEST_ARTIFACT_ACCESS_KEY = 'env-access-key';
  process.env.ACDP_TEST_ARTIFACT_SECRET_KEY = 'env-secret-key';
  process.env.ACDP_TEST_RUNTIME_CONTROL_ADMIN_BASE_URL = 'http://127.0.0.1:18788';
  process.env.ACDP_TEST_RUNTIME_CONTROL_NODE_ID = 'env-node-id';
  process.env.ACDP_TEST_RUNTIME_CONTROL_NODE_NAME = 'env-node-name';
  process.env.ACDP_TEST_RUNTIME_CONTROL_NODE_ENV = 'env-node-env';
  process.env.ACDP_TEST_RUNTIME_CONTROL_NODE_ADDRESS = 'http://127.0.0.1:18787';
  process.env.ACDP_TEST_RUNTIME_DELIVERY_BASE_URL = 'http://127.0.0.1:28788';
  process.env.ACDP_TEST_RUNTIME_DELIVERY_SIGNED_SECRET = 'env-signed-secret';

  try {
    const loaded = createArtifactStoreConfig(tempConfigPath);
    assert.equal(loaded.artifactStore.endpoint, 'http://127.0.0.1:19000');
    assert.equal(loaded.artifactStore.bucket, 'env-bucket');
    assert.equal(loaded.artifactStore.rootUser, 'env-root-user');
    assert.equal(loaded.artifactStore.rootPassword, 'env-root-password');
    assert.equal(loaded.artifactStore.accessKey, 'env-access-key');
    assert.equal(loaded.artifactStore.secretKey, 'env-secret-key');
    assert.equal(loaded.runtimeControl.adminBaseUrl, 'http://127.0.0.1:18788');
    assert.equal(loaded.runtimeControl.nodeId, 'env-node-id');
    assert.equal(loaded.runtimeControl.nodeName, 'env-node-name');
    assert.equal(loaded.runtimeControl.nodeEnv, 'env-node-env');
    assert.equal(loaded.runtimeControl.nodeAddress, 'http://127.0.0.1:18787');
    assert.equal(loaded.runtimeDelivery.mode, 'admin_http_signed');
    assert.equal(loaded.runtimeDelivery.adminArtifactBaseUrl, 'http://127.0.0.1:28788');
    assert.equal(loaded.runtimeDelivery.signedUrlSecret, 'env-signed-secret');
    assert.equal(readConfigStringWithEnv({ bucket: 'fallback', bucketEnv: 'ACDP_TEST_ARTIFACT_BUCKET' }, 'bucket', ''), 'env-bucket');
  } finally {
    delete process.env.ACDP_TEST_ARTIFACT_ENDPOINT;
    delete process.env.ACDP_TEST_ARTIFACT_BUCKET;
    delete process.env.ACDP_TEST_ARTIFACT_ROOT_USER;
    delete process.env.ACDP_TEST_ARTIFACT_ROOT_PASSWORD;
    delete process.env.ACDP_TEST_ARTIFACT_ACCESS_KEY;
    delete process.env.ACDP_TEST_ARTIFACT_SECRET_KEY;
    delete process.env.ACDP_TEST_RUNTIME_CONTROL_ADMIN_BASE_URL;
    delete process.env.ACDP_TEST_RUNTIME_CONTROL_NODE_ID;
    delete process.env.ACDP_TEST_RUNTIME_CONTROL_NODE_NAME;
    delete process.env.ACDP_TEST_RUNTIME_CONTROL_NODE_ENV;
    delete process.env.ACDP_TEST_RUNTIME_CONTROL_NODE_ADDRESS;
    delete process.env.ACDP_TEST_RUNTIME_DELIVERY_BASE_URL;
    delete process.env.ACDP_TEST_RUNTIME_DELIVERY_SIGNED_SECRET;
    fs.rmSync(tempConfigPath, { force: true });
  }
});

test('artifact store client generates release keys and urls from config', () => {
  const config = createAppConfig();
  const client = createArtifactStoreClient(config);
  const key = buildReleaseArtifactKey('rel_unit_001', 'manifest.json');

  assert.equal(key, 'releases/rel_unit_001/manifest.json');
  assert.equal(client.buildObjectUrl(key), `${String(config.artifactStore.endpoint || '').replace(/\/+$/, '')}/${config.artifactStore.bucket}/releases/rel_unit_001/manifest.json`);
  assert.equal(client.buildPublicUrl(key), `${String(config.artifactStore.publicBaseUrl || '').replace(/\/+$/, '')}/${config.artifactStore.bucket}/releases/rel_unit_001/manifest.json`);
});

test('build snapshot returns artifact plan based on configured artifact store', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);

  const release = buildSnapshot.main('artifact store unit build', config);
  const manifestArtifact = release.artifactStore.artifacts.find((item) => item.kind === 'manifest');
  const snapshotArtifact = release.artifactStore.artifacts.find((item) => item.kind === 'snapshot');

  assert.ok(release.releaseId.startsWith('rel_'));
  assert.equal(release.artifactStore.provider, 'minio');
  assert.equal(release.artifactStore.bucket, config.artifactStore.bucket);
  assert.equal(release.artifactStore.rootPrefix, `releases/${release.releaseId}`);
  assert.equal(release.artifactStore.artifacts.length, 2);
  assert.equal(manifestArtifact.key, `releases/${release.releaseId}/manifest.json`);
  assert.equal(snapshotArtifact.key, `releases/${release.releaseId}/snapshot.json`);
  assert.equal(
    manifestArtifact.objectUrl,
    `${String(config.artifactStore.endpoint || '').replace(/\/+$/, '')}/${config.artifactStore.bucket}/releases/${release.releaseId}/manifest.json`,
  );
  assert.ok(manifestArtifact.checksumSha256);
  assert.ok(fs.existsSync(manifestArtifact.localFilePath));
  assert.ok(fs.existsSync(snapshotArtifact.localFilePath));

  const rebuiltPlan = buildReleaseArtifactPlan(config, {
    releaseId: release.releaseId,
    manifestPath: release.manifestPath,
    snapshotPath: release.snapshotPath,
  });
  assert.deepEqual(rebuiltPlan.artifacts.map((item) => item.key), [
    `releases/${release.releaseId}/manifest.json`,
    `releases/${release.releaseId}/snapshot.json`,
  ]);
});

test('artifact store sync copies release files when config points to file urls', async () => {
  const baseConfig = createTestConfig();
  const artifactRoot = path.join(baseConfig.resolvedPaths.workspaceDir, 'artifact_store');
  const config = {
    ...baseConfig,
    artifactStore: {
      ...baseConfig.artifactStore,
      endpoint: `file://${artifactRoot}`,
      publicBaseUrl: `file://${artifactRoot}`,
      bucket: 'test-artifacts',
    },
  };
  prepareData.main(config);
  bootstrapDb.main(config);

  const release = buildSnapshot.main('artifact store file sync build', config);
  const syncResult = await syncReleaseArtifactsToStore(config, {
    releaseId: release.releaseId,
    manifestPath: release.manifestPath,
    snapshotPath: release.snapshotPath,
  });

  assert.equal(syncResult.syncMode, 'file');
  assert.equal(syncResult.syncedTargets.length, 2);
  assert.equal(
    fs.existsSync(path.join(artifactRoot, config.artifactStore.bucket, 'releases', release.releaseId, 'manifest.json')),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(artifactRoot, config.artifactStore.bucket, 'releases', release.releaseId, 'snapshot.json')),
    true,
  );
});

test('artifact store resolves remote MinIO credentials from accessKey/secretKey first', () => {
  const credentials = resolveMinioCredentials({
    rootUser: 'root-user',
    rootPassword: 'root-password',
    accessKey: 'access-key',
    secretKey: 'secret-key',
  });

  assert.deepEqual(credentials, {
    accessKey: 'access-key',
    secretKey: 'secret-key',
  });
});

test('artifact store signs MinIO requests using configured path-style endpoint', () => {
  const target = buildMinioRequestTarget({
    endpoint: 'http://127.0.0.1:9000',
    accessStyle: 'path',
  }, 'acdp-artifacts', 'releases/rel_demo/snapshot.json');
  const signed = signMinioRequest({
    endpoint: 'http://127.0.0.1:9000',
    bucket: 'acdp-artifacts',
    region: '',
    accessStyle: 'path',
    accessKey: 'demo-access',
    secretKey: 'demo-secret',
  }, {
    method: 'PUT',
    bucket: 'acdp-artifacts',
    key: 'releases/rel_demo/snapshot.json',
    headers: {
      'content-type': 'application/json',
    },
    body: Buffer.from('{"ok":true}', 'utf8'),
  });

  assert.equal(target.url.toString(), 'http://127.0.0.1:9000/acdp-artifacts/releases/rel_demo/snapshot.json');
  assert.equal(target.canonicalUri, '/acdp-artifacts/releases/rel_demo/snapshot.json');
  assert.match(String(signed.headers.authorization || ''), /Credential=demo-access\//);
  assert.ok(signed.headers['x-amz-date']);
  assert.ok(signed.headers['x-amz-content-sha256']);
});

test('artifact store can generate presigned MinIO download urls for runtime metadata', () => {
  const config = {
    artifactStore: {
      provider: 'minio',
      endpoint: 'http://127.0.0.1:9000',
      publicBaseUrl: 'http://127.0.0.1:9000',
      bucket: 'acdp-artifacts',
      accessStyle: 'path',
      presignExpiresSeconds: 900,
      accessKey: 'demo-access',
      secretKey: 'demo-secret',
    },
  };
  const presigned = buildMinioPresignedGetUrl(config.artifactStore, 'acdp-artifacts', 'releases/rel_demo/snapshot.json', 900);

  assert.match(presigned, /^http:\/\/127\.0\.0\.1:9000\/acdp-artifacts\/releases\/rel_demo\/snapshot\.json\?/);
  assert.match(presigned, /X-Amz-Algorithm=AWS4-HMAC-SHA256/);
  assert.match(presigned, /X-Amz-Signature=/);
});

test('artifact store sync uploads release files to remote MinIO-compatible endpoint', async () => {
  const baseConfig = createTestConfig();
  const config = {
    ...baseConfig,
    artifactStore: {
      ...baseConfig.artifactStore,
      endpoint: 'http://127.0.0.1:9000',
      publicBaseUrl: 'http://127.0.0.1:9000',
      bucket: 'remote-artifacts',
      accessStyle: 'path',
      accessKey: 'remote-access',
      secretKey: 'remote-secret',
      rootUser: '',
      rootPassword: '',
    },
  };
  prepareData.main(config);
  bootstrapDb.main(config);

  const release = buildSnapshot.main('artifact store remote sync build', config);
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({
      url: String(url || ''),
      method: String(options.method || 'GET'),
      headers: { ...(options.headers || {}) },
      body: options.body,
    });
    if (options.method === 'HEAD') {
      return {
        ok: false,
        status: 404,
        headers: {
          get() {
            return '';
          },
        },
        async text() {
          return '';
        },
      };
    }
    return {
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return String(name || '').toLowerCase() === 'etag' ? '"mock-etag"' : '';
        },
      },
      async text() {
        return '';
      },
    };
  };

  const syncResult = await syncReleaseArtifactsToStore(config, {
    releaseId: release.releaseId,
    manifestPath: release.manifestPath,
    snapshotPath: release.snapshotPath,
  }, {
    fetchImpl,
  });

  assert.equal(syncResult.syncMode, 'remote_minio');
  assert.equal(syncResult.bucketResult.created, true);
  assert.equal(syncResult.syncedTargets.length, 2);
  assert.equal(requests[0].method, 'HEAD');
  assert.equal(requests[0].url, 'http://127.0.0.1:9000/remote-artifacts/');
  assert.equal(requests[1].method, 'PUT');
  assert.equal(requests[1].url, 'http://127.0.0.1:9000/remote-artifacts/');
  assert.equal(requests[2].method, 'PUT');
  assert.match(String(requests[2].headers.authorization || ''), /Credential=remote-access\//);
  assert.equal(requests[2].url, `http://127.0.0.1:9000/remote-artifacts/releases/${release.releaseId}/manifest.json`);
  assert.equal(requests[3].url, `http://127.0.0.1:9000/remote-artifacts/releases/${release.releaseId}/snapshot.json`);
});

test('artifact metadata prefers presigned download urls when MinIO credentials are present', () => {
  const baseConfig = createTestConfig();
  const config = {
    ...baseConfig,
    artifactStore: {
      ...baseConfig.artifactStore,
      endpoint: 'http://127.0.0.1:9000',
      publicBaseUrl: 'http://127.0.0.1:9000',
      bucket: 'acdp-artifacts',
      accessStyle: 'path',
      presignExpiresSeconds: 900,
      accessKey: 'demo-access',
      secretKey: 'demo-secret',
      rootUser: '',
      rootPassword: '',
    },
    runtimeDelivery: {
      ...baseConfig.runtimeDelivery,
      mode: 'minio',
    },
  };
  prepareData.main(config);
  bootstrapDb.main(config);

  const release = buildSnapshot.main('artifact metadata presign build', config);
  const metadata = buildReleaseArtifactMetadata(config, {
    releaseId: release.releaseId,
    manifestPath: release.manifestPath,
    snapshotPath: release.snapshotPath,
  });

  assert.match(String((metadata.primaryArtifact || {}).artifactUrl || ''), /X-Amz-Signature=/);
  assert.ok((metadata.files || []).every((item) => String(item.artifactUrl || '').includes('X-Amz-Signature=')));
});

test('artifact metadata can generate node-bound admin_http_signed urls and validate them', () => {
  const baseConfig = createTestConfig();
  const config = {
    ...baseConfig,
    runtimeDelivery: {
      mode: 'admin_http_signed',
      adminArtifactBaseUrl: 'http://127.0.0.1:8788',
      signedUrlSecret: 'admin-http-signed-secret',
      signedUrlExpiresSeconds: 300,
      bindNodeId: true,
      bindConfigVersion: true,
    },
  };
  prepareData.main(config);
  bootstrapDb.main(config);

  const release = buildSnapshot.main('artifact metadata admin http signed build', config);
  const metadata = buildReleaseArtifactMetadata(config, {
    releaseId: release.releaseId,
    manifestPath: release.manifestPath,
    snapshotPath: release.snapshotPath,
  }, {
    nodeId: 'runtime-node-001',
    configVersion: 7,
  });

  const snapshotUrl = new URL(String((metadata.primaryArtifact || {}).artifactUrl || ''));
  const payload = {
    releaseId: release.releaseId,
    fileName: 'snapshot.json',
    nodeId: snapshotUrl.searchParams.get('nodeId'),
    expires: snapshotUrl.searchParams.get('expires'),
    configVersion: snapshotUrl.searchParams.get('configVersion'),
  };

  assert.equal(metadata.deliveryMode, 'admin_http_signed');
  assert.equal(snapshotUrl.pathname, `/api/runtime-artifacts/releases/${release.releaseId}/snapshot.json`);
  assert.equal(snapshotUrl.searchParams.get('nodeId'), 'runtime-node-001');
  assert.equal(snapshotUrl.searchParams.get('configVersion'), '7');
  assert.ok(verifyRuntimeArtifactDownloadSignature(
    config.runtimeDelivery.signedUrlSecret,
    payload,
    snapshotUrl.searchParams.get('signature'),
    config.runtimeDelivery,
  ));
  assert.deepEqual(validateRuntimeArtifactDownloadRequest(config, {
    ...payload,
    signature: snapshotUrl.searchParams.get('signature'),
  }), {
    releaseId: release.releaseId,
    fileName: 'snapshot.json',
    nodeId: 'runtime-node-001',
    expires: payload.expires,
    configVersion: '7',
  });
});

test('admin_http_signed url builder returns empty when node binding or secret is missing', () => {
  const config = {
    runtimeDelivery: {
      mode: 'admin_http_signed',
      adminArtifactBaseUrl: 'http://127.0.0.1:8788',
      signedUrlSecret: '',
      signedUrlExpiresSeconds: 300,
      bindNodeId: true,
      bindConfigVersion: true,
    },
  };

  assert.equal(buildAdminRuntimeArtifactUrl(config, {
    releaseId: 'rel_demo',
    fileName: 'snapshot.json',
    nodeId: 'runtime-node-001',
    configVersion: 2,
  }), '');
  assert.equal(signRuntimeArtifactDownload('', {
    releaseId: 'rel_demo',
    fileName: 'snapshot.json',
    nodeId: 'runtime-node-001',
    expires: '123',
    configVersion: '2',
  }, config.runtimeDelivery), '');
});
