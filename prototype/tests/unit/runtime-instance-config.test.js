const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const { buildRuntimeInstanceConfig } = require('../../src/lib/runtime-instance-config');
const { servicePaths } = require('../../src/cli/service-manager');

test('runtime instance config builds isolated workspace and runtime identity', () => {
  const baseConfig = createAppConfig();
  const workspaceRoot = path.join(baseConfig.projectRoot, 'prototype', 'workspace-unit-runtime-instance-config');
  if (fs.existsSync(workspaceRoot)) {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
  const instance = buildRuntimeInstanceConfig(baseConfig, {
    instanceId: 'runtime-01',
    port: 9901,
    workspaceRoot,
    nodeId: 'runtime-node-01',
    nodeName: 'Runtime Node 01',
    nodeEnv: 'test',
    nodeAddress: 'http://127.0.0.1:9901',
    adminBaseUrl: 'http://127.0.0.1:8788',
    registrationSecret: 'runtime-secret-01',
  });
  assert.equal(instance.server.port, 9901);
  assert.equal(instance.runtimeControl.nodeId, 'runtime-node-01');
  assert.equal(instance.runtimeControl.registrationSecret, 'runtime-secret-01');
  assert.ok(instance.resolvedPaths.workspaceDir.endsWith(path.join('workspace-unit-runtime-instance-config', 'runtime-01', 'workspace')));
  assert.ok(instance.resolvedPaths.runtimeStateDir.includes(path.join('runtime-01', 'workspace', 'runtime_state')));
  assert.equal(fs.existsSync(instance.resolvedPaths.catalogDir), true);
  assert.equal(fs.existsSync(instance.resolvedPaths.releasesDir), true);
});

test('service manager derives instance-specific pid and log paths for runtime', () => {
  const baseConfig = createAppConfig();
  const paths = servicePaths(baseConfig, 'runtime', {
    instance: 'runtime-02',
    port: 9902,
  });
  assert.ok(paths.pidFile.endsWith('runtime-runtime-02.pid'));
  assert.ok(paths.outLog.endsWith('runtime-runtime-02.out.log'));
  assert.ok(paths.serverEntry.endsWith(path.join('prototype', 'src', 'cli', 'start-runtime-instance.js')));
  assert.deepEqual(paths.serverArgs, ['--instance', 'runtime-02', '--port', '9902']);
});
