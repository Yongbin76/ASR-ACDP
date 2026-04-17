const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { createAppConfig } = require('../../src/lib/config');
const { checkValidationFeedConnectors } = require('../../src/cli/check-validation-feed-connectors');

/**
 * 功能：创建 validation feed connector 预检测试使用的配置对象。
 * 输入：source 配置数组。
 * 输出：带临时 connector 配置文件路径的应用配置对象。
 */
function createValidationFeedConnectorCheckConfig(sources = []) {
  const baseConfig = createAppConfig();
  const configPath = path.join(os.tmpdir(), `acdp-validation-feed-connectors-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  fs.writeFileSync(configPath, JSON.stringify({ sources }, null, 2), 'utf8');
  return {
    ...baseConfig,
    validationFeedConnectorConfigPath: configPath,
    validationFeedConnectors: {
      configPath,
      sources,
    },
  };
}

test('validation feed connector check fails when remote cg3 connector is required but endpoint/auth/ack config is missing', () => {
  const config = createValidationFeedConnectorCheckConfig([{
    sourceType: 'cg3',
    enabled: true,
    transportType: 'http_pull_json',
    authType: 'bearer',
    authToken: '',
    ackType: 'http_post',
    ackEndpoint: '',
    cursorQueryKey: 'cursor',
    cursorResponseField: 'meta.nextCursor',
  }]);

  try {
    const result = checkValidationFeedConnectors(config, {
      sourceTypes: ['cg3'],
      requireRemoteConfigured: true,
      requireAckConfigured: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.checks.length, 1);
    assert.equal(result.checks[0].ok, false);
    assert.ok(result.checks[0].notes.some((item) => item.includes('endpoint missing')));
    assert.ok(result.checks[0].notes.some((item) => item.includes('bearer token missing')));
    assert.ok(result.checks[0].notes.some((item) => item.includes('ack endpoint missing')));
  } finally {
    fs.rmSync(config.validationFeedConnectorConfigPath, { force: true });
  }
});

test('validation feed connector check passes when remote cg3 connector config is complete', () => {
  const config = createValidationFeedConnectorCheckConfig([{
    sourceType: 'cg3',
    enabled: true,
    transportType: 'http_pull_json',
    endpoint: 'https://example.test/cg3',
    authType: 'bearer',
    authToken: 'cg3-token',
    ackType: 'http_post',
    ackEndpoint: 'https://example.test/cg3/ack',
    cursorQueryKey: 'cursor',
    cursorResponseField: 'meta.nextCursor',
    initialCursor: 'cg3-cursor-0',
    includeCursorInAck: true,
  }]);

  try {
    const result = checkValidationFeedConnectors(config, {
      sourceTypes: ['cg3'],
      requireRemoteConfigured: true,
      requireAckConfigured: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.checks.length, 1);
    assert.equal(result.checks[0].ok, true);
    assert.equal(result.checks[0].transportType, 'http_pull_json');
    assert.equal(result.checks[0].includeCursorInAck, true);
  } finally {
    fs.rmSync(config.validationFeedConnectorConfigPath, { force: true });
  }
});
