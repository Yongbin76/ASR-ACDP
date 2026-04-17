const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const { createRuntimeApp } = require('../../src/server');
const { createRuntimeWebSocketGovernance } = require('../../src/lib/runtime-ws-governance');

/**
 * 功能：创建 WebSocket 治理测试使用的 runtime 配置对象。
 * 输入：工作目录名称、端口号和 auth 覆盖项。
 * 输出：可直接启动 runtime app 的测试配置对象。
 */
function createRuntimeTestConfig(workspaceName, port, authOverrides = {}) {
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
      ...authOverrides,
    },
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
      port,
      runtimePort: port,
    },
  };
}

test('runtime websocket governance authenticates registered caller and enforces per-caller connection quota', () => {
  const governance = createRuntimeWebSocketGovernance({
    websocketMaxConnections: 10,
    websocketCallers: [{
      callerId: 'partner_demo',
      displayName: 'Partner Demo',
      secret: 'partner-secret',
      maxConnections: 1,
      maxRequestsPerMinute: 5,
    }],
  });
  const req = {
    url: '/ws/runtime/correct?callerId=partner_demo&callerSecret=partner-secret',
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  };

  const session = governance.openConnection(req, 0);
  assert.equal(session.callerId, 'partner_demo');
  assert.equal(session.authSource, 'caller_secret');

  assert.throws(
    () => governance.openConnection(req, 1),
    (error) => error.code === 'websocket_caller_connection_limit_reached' && error.statusCode === 429
  );

  session.release();
  assert.equal(governance.snapshot().activeCallerCount, 0);
});

test('runtime websocket governance rejects blacklisted ip and unknown callers when configured', () => {
  const governance = createRuntimeWebSocketGovernance({
    runtimeBearerToken: 'shared-runtime-token',
    websocketRejectUnknownCallers: true,
    websocketBlacklistIps: ['10.20.30.40'],
    websocketCallers: [{
      callerId: 'partner_demo',
      secret: 'partner-secret',
      maxConnections: 1,
      maxRequestsPerMinute: 10,
    }],
  });

  assert.throws(
    () => governance.openConnection({
      url: '/ws/runtime/correct?callerId=partner_demo&callerSecret=partner-secret',
      headers: {},
      socket: { remoteAddress: '10.20.30.40' },
    }, 0),
    (error) => error.code === 'websocket_ip_blacklisted' && error.statusCode === 403
  );

  assert.throws(
    () => governance.openConnection({
      url: '/ws/runtime/correct?callerId=unknown_caller',
      headers: {
        authorization: 'Bearer shared-runtime-token',
      },
      socket: { remoteAddress: '127.0.0.1' },
    }, 0),
    (error) => error.code === 'websocket_unknown_caller' && error.statusCode === 403
  );

  assert.throws(
    () => governance.openConnection({
      url: '/ws/runtime/correct',
      headers: {
        authorization: 'Bearer shared-runtime-token',
      },
      socket: { remoteAddress: '127.0.0.1' },
    }, 0),
    (error) => error.code === 'websocket_registered_caller_required' && error.statusCode === 403
  );
});

test('runtime websocket governance enforces per-caller message rate limit', () => {
  const governance = createRuntimeWebSocketGovernance({
    websocketMaxConnections: 10,
    websocketCallers: [{
      callerId: 'partner_demo',
      secret: 'partner-secret',
      maxConnections: 2,
      maxRequestsPerMinute: 1,
    }],
  });
  const session = governance.openConnection({
    url: '/ws/runtime/correct?callerId=partner_demo&callerSecret=partner-secret',
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  }, 0);

  governance.consumeMessage(session);
  assert.throws(
    () => governance.consumeMessage(session),
    (error) => error.code === 'websocket_rate_limit_exceeded' && error.websocketCloseCode === 1008
  );
  session.release();
});

test('runtime websocket governance falls back to legacy runtime token caller when registry is not required', () => {
  const governance = createRuntimeWebSocketGovernance({
    runtimeBearerToken: 'shared-runtime-token',
    websocketDefaultMaxRequestsPerMinute: 3,
  });
  const session = governance.openConnection({
    url: '/ws/runtime/correct',
    headers: {
      authorization: 'Bearer shared-runtime-token',
    },
    socket: { remoteAddress: '127.0.0.1' },
  }, 0);

  assert.equal(session.callerId, 'legacy_runtime_token');
  assert.equal(session.authSource, 'runtime_token');
  governance.consumeMessage(session);
  session.release();
});

test('runtime stats expose websocket governance snapshot for observability', async () => {
  const config = createRuntimeTestConfig('workspace-unit-runtime-ws-governance-stats', 8815, {
    runtimeBearerToken: '',
    websocketCallers: [{
      callerId: 'partner_demo',
      displayName: 'Partner Demo',
      secret: 'partner-secret',
      maxConnections: 2,
      maxRequestsPerMinute: 10,
    }],
    websocketRejectUnknownCallers: true,
  });
  const app = createRuntimeApp(config);

  try {
    const result = await app.inject({
      method: 'GET',
      url: '/api/runtime/stats',
    });
    assert.equal(result.statusCode, 200);
    assert.equal(result.json.websocketGovernance.registryEnabled, true);
    assert.equal(result.json.websocketGovernance.registeredCallerCount, 1);
    assert.equal(typeof result.json.websocketGovernance.rejections.auth, 'number');
  } finally {
    await app.stop();
  }
});
