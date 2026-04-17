const fs = require('fs');
const path = require('path');

// Resolve all runtime paths from a single JSON config so code does not scatter
// absolute path rules or directory structure assumptions across modules.
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'prototype', 'config', 'app.config.json');
const ARTIFACT_STORE_CONFIG_PATH = path.join(PROJECT_ROOT, 'prototype', 'config', 'artifact_store.config.json');
const VALIDATION_FEED_CONNECTOR_CONFIG_PATH = path.join(PROJECT_ROOT, 'prototype', 'config', 'validation_feed_connectors.config.json');
const BUSINESS_PROPERTIES_CONFIG_PATH = path.join(PROJECT_ROOT, 'prototype', 'config', 'business_properties.json');
const SOURCE_TYPES_CONFIG_PATH = path.join(PROJECT_ROOT, 'prototype', 'config', 'source_types.json');
const ACCESS_CONTROL_CONFIG_PATH = path.join(PROJECT_ROOT, 'prototype', 'config', 'access_control.json');
const GOVERNANCE_POLICIES_CONFIG_PATH = path.join(PROJECT_ROOT, 'prototype', 'config', 'governance_policies.json');

/**
 * 功能：读取并解析 JSON 配置文件。
 * 输入：`filePath`，待读取的 JSON 文件路径。
 * 输出：解析后的 JavaScript 对象。
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：从配置对象读取字符串参数，并支持通过 `<key>Env` 指向环境变量覆盖。
 * 输入：配置对象、字段名和默认值。
 * 输出：解析后的字符串值。
 */
function readConfigStringWithEnv(source = {}, key, fallback = '') {
  const envName = String(source[`${key}Env`] || '').trim();
  if (envName && Object.prototype.hasOwnProperty.call(process.env, envName)) {
    return String(process.env[envName] || '').trim();
  }
  return String(source[key] || fallback).trim();
}

/**
 * 功能：从配置对象读取布尔参数。
 * 输入：配置对象、字段名和默认值。
 * 输出：解析后的布尔值。
 */
function readConfigBoolean(source = {}, key, fallback = false) {
  if (!Object.prototype.hasOwnProperty.call(source, key)) {
    return Boolean(fallback);
  }
  return source[key] === true;
}

/**
 * 功能：从配置对象读取字符串数组参数。
 * 输入：配置对象、字段名和默认值数组。
 * 输出：去空去重后的字符串数组。
 */
function readConfigStringArray(source = {}, key, fallback = []) {
  const input = Array.isArray(source[key]) ? source[key] : fallback;
  const values = [];
  for (const item of input) {
    const normalized = String(item || '').trim();
    if (!normalized || values.includes(normalized)) {
      continue;
    }
    values.push(normalized);
  }
  return values;
}

/**
 * 功能：根据当前制品仓配置推导默认的 runtime 快照下发模式。
 * 输入：artifact store 原始配置对象。
 * 输出：`file` 或 `minio`。
 */
function deriveRuntimeDeliveryMode(artifactStore = {}) {
  const endpoint = readConfigStringWithEnv(artifactStore, 'endpoint', '');
  if (endpoint) {
    try {
      const protocol = new URL(endpoint).protocol;
      if (protocol === 'file:') {
        return 'file';
      }
      if (['http:', 'https:'].includes(protocol)) {
        return 'minio';
      }
    } catch {}
  }
  return 'file';
}

/**
 * 功能：标准化单个 WebSocket caller 配置。
 * 输入：caller 原始配置对象。
 * 输出：标准化后的 caller 治理配置对象。
 */
function normalizeWebSocketCallerConfig(caller = {}) {
  const callerId = readConfigStringWithEnv(caller, 'callerId', '');
  if (!callerId) {
    return null;
  }
  return {
    callerId,
    displayName: readConfigStringWithEnv(caller, 'displayName', callerId) || callerId,
    secret: readConfigStringWithEnv(caller, 'secret', ''),
    enabled: readConfigBoolean(caller, 'enabled', true),
    blacklisted: readConfigBoolean(caller, 'blacklisted', false),
    blacklistReason: readConfigStringWithEnv(caller, 'blacklistReason', ''),
    maxConnections: Math.max(0, Number(caller.maxConnections || 0)),
    maxRequestsPerMinute: Math.max(0, Number(caller.maxRequestsPerMinute || 0)),
  };
}

/**
 * 功能：标准化单个 validation feed connector source 配置。
 * 输入：source 原始配置对象。
 * 输出：标准化后的 source 配置对象；缺少 `sourceType` 时返回 `null`。
 */
function normalizeValidationFeedConnectorSourceConfig(source = {}) {
  const sourceType = readConfigStringWithEnv(source, 'sourceType', '').toLowerCase();
  if (!sourceType) {
    return null;
  }
  const transportType = readConfigStringWithEnv(source, 'transportType', 'file_inbox').toLowerCase();
  const authType = readConfigStringWithEnv(source, 'authType', 'none').toLowerCase();
  const ackType = readConfigStringWithEnv(source, 'ackType', 'none').toLowerCase();
  return {
    sourceType,
    enabled: readConfigBoolean(source, 'enabled', true),
    description: readConfigStringWithEnv(source, 'description', sourceType) || sourceType,
    transportType: transportType === 'http_pull_json' ? 'http_pull_json' : 'file_inbox',
    endpoint: readConfigStringWithEnv(source, 'endpoint', ''),
    httpMethod: readConfigStringWithEnv(source, 'httpMethod', 'GET').toUpperCase() || 'GET',
    timeoutMs: Math.max(1000, Number(source.timeoutMs || 10000)),
    authType: ['none', 'bearer', 'header', 'query'].includes(authType) ? authType : 'none',
    authHeaderName: readConfigStringWithEnv(source, 'authHeaderName', 'Authorization') || 'Authorization',
    authToken: readConfigStringWithEnv(source, 'authToken', ''),
    authQueryKey: readConfigStringWithEnv(source, 'authQueryKey', 'token') || 'token',
    authValue: readConfigStringWithEnv(source, 'authValue', ''),
    cursorQueryKey: readConfigStringWithEnv(source, 'cursorQueryKey', ''),
    cursorResponseField: readConfigStringWithEnv(source, 'cursorResponseField', ''),
    initialCursor: readConfigStringWithEnv(source, 'initialCursor', ''),
    includeCursorInAck: readConfigBoolean(source, 'includeCursorInAck', true),
    ackType: ackType === 'http_post' ? 'http_post' : 'none',
    ackEndpoint: readConfigStringWithEnv(source, 'ackEndpoint', ''),
    ackMethod: readConfigStringWithEnv(source, 'ackMethod', 'POST').toUpperCase() || 'POST',
    retryMaxAttempts: Math.max(1, Number(source.retryMaxAttempts || 3)),
    replayFromErrorDir: readConfigBoolean(source, 'replayFromErrorDir', true),
  };
}

/**
 * 功能：构建 validation feed connector 配置对象。
 * 输入：可选 `filePath`，默认为 `validation_feed_connectors.config.json`。
 * 输出：包含 source 配置数组的 connector 配置对象。
 */
function createValidationFeedConnectorConfig(filePath = VALIDATION_FEED_CONNECTOR_CONFIG_PATH) {
  if (!fs.existsSync(filePath)) {
    return {
      configPath: filePath,
      sources: [],
    };
  }
  const raw = readJson(filePath);
  return {
    configPath: filePath,
    sources: Array.isArray(raw.sources)
      ? raw.sources.map((source) => normalizeValidationFeedConnectorSourceConfig(source)).filter(Boolean)
      : [],
  };
}

/**
 * 功能：构建制品仓与 runtime control 配置对象。
 * 输入：可选 `filePath`，默认为 `artifact_store.config.json`。
 * 输出：包含 artifactStore 和 runtimeControl 的配置对象。
 */
function createArtifactStoreConfig(filePath = ARTIFACT_STORE_CONFIG_PATH) {
  const raw = readJson(filePath);
  const artifactStore = raw.artifactStore || {};
  const runtimeControl = raw.runtimeControl || {};
  const runtimeDelivery = raw.runtimeDelivery || {};
  const endpoint = readConfigStringWithEnv(artifactStore, 'endpoint', '');
  const publicBaseUrl = readConfigStringWithEnv(artifactStore, 'publicBaseUrl', endpoint);
  const runtimeDeliveryMode = readConfigStringWithEnv(runtimeDelivery, 'mode', deriveRuntimeDeliveryMode(artifactStore)).toLowerCase();

  return {
    configPath: filePath,
    artifactStore: {
      provider: readConfigStringWithEnv(artifactStore, 'provider', 'minio').toLowerCase() || 'minio',
      endpoint,
      publicBaseUrl,
      bucket: readConfigStringWithEnv(artifactStore, 'bucket', ''),
      region: readConfigStringWithEnv(artifactStore, 'region', ''),
      accessStyle: readConfigStringWithEnv(artifactStore, 'accessStyle', 'path').toLowerCase() === 'virtual_host' ? 'virtual_host' : 'path',
      useSsl: artifactStore.useSsl == null ? endpoint.startsWith('https://') : Boolean(artifactStore.useSsl),
      presignExpiresSeconds: Math.max(1, Number(artifactStore.presignExpiresSeconds || 900)),
      rootUser: readConfigStringWithEnv(artifactStore, 'rootUser', ''),
      rootPassword: readConfigStringWithEnv(artifactStore, 'rootPassword', ''),
      accessKey: readConfigStringWithEnv(artifactStore, 'accessKey', ''),
      secretKey: readConfigStringWithEnv(artifactStore, 'secretKey', ''),
      serverDataDir: readConfigStringWithEnv(artifactStore, 'serverDataDir', ''),
      apiPort: Math.max(1, Number(artifactStore.apiPort || 9000)),
      consolePort: Math.max(1, Number(artifactStore.consolePort || 9001)),
    },
    runtimeControl: {
      adminBaseUrl: readConfigStringWithEnv(runtimeControl, 'adminBaseUrl', ''),
      nodeId: readConfigStringWithEnv(runtimeControl, 'nodeId', ''),
      nodeName: readConfigStringWithEnv(runtimeControl, 'nodeName', ''),
      nodeEnv: readConfigStringWithEnv(runtimeControl, 'nodeEnv', ''),
      nodeAddress: readConfigStringWithEnv(runtimeControl, 'nodeAddress', ''),
      registrationSecret: readConfigStringWithEnv(runtimeControl, 'registrationSecret', ''),
      heartbeatIntervalSeconds: Math.max(1, Number(runtimeControl.heartbeatIntervalSeconds || 30)),
      syncIntervalSeconds: Math.max(1, Number(runtimeControl.syncIntervalSeconds || runtimeControl.heartbeatIntervalSeconds || 30)),
      nodeOfflineThresholdSeconds: Math.max(1, Number(runtimeControl.nodeOfflineThresholdSeconds || 120)),
      downloadTimeoutMs: Math.max(1000, Number(runtimeControl.downloadTimeoutMs || 15000)),
      statsFlushIntervalSeconds: Math.max(1, Number(runtimeControl.statsFlushIntervalSeconds || 300)),
      statsFlushMaxBatchSize: Math.max(1, Number(runtimeControl.statsFlushMaxBatchSize || 1000)),
      statsRetentionHours: Math.max(1, Number(runtimeControl.statsRetentionHours || 72)),
    },
    runtimeDelivery: {
      mode: ['file', 'admin_http_signed', 'minio'].includes(runtimeDeliveryMode) ? runtimeDeliveryMode : deriveRuntimeDeliveryMode(artifactStore),
      adminArtifactBaseUrl: readConfigStringWithEnv(runtimeDelivery, 'adminArtifactBaseUrl', ''),
      signedUrlSecret: readConfigStringWithEnv(runtimeDelivery, 'signedUrlSecret', ''),
      signedUrlExpiresSeconds: Math.max(1, Number(runtimeDelivery.signedUrlExpiresSeconds || artifactStore.presignExpiresSeconds || 300)),
      bindNodeId: readConfigBoolean(runtimeDelivery, 'bindNodeId', true),
      bindConfigVersion: readConfigBoolean(runtimeDelivery, 'bindConfigVersion', true),
    },
  };
}

/**
 * 功能：根据服务配置推导 admin 快照下载基准地址。
 * 输入：服务配置对象与 runtime control 配置对象。
 * 输出：可用于 runtime 下载的 admin base url。
 */
function resolveDefaultAdminArtifactBaseUrl(serverConfig = {}, runtimeControl = {}) {
  const configured = String(runtimeControl.adminBaseUrl || '').trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.hostname && !['0.0.0.0', '::'].includes(parsed.hostname)) {
        return configured.replace(/\/+$/, '');
      }
    } catch {}
  }
  const host = String((serverConfig || {}).host || '').trim();
  const adminPort = Math.max(1, Number((serverConfig || {}).adminPort || 8788));
  const normalizedHost = host && !['0.0.0.0', '::'].includes(host) ? host : '127.0.0.1';
  return `http://${normalizedHost}:${adminPort}`;
}

/**
 * 功能：构建原型运行时统一配置对象。
 * 输入：无，内部读取 `app.config.json`、`artifact_store.config.json` 和相关环境变量。
 * 输出：包含项目路径、服务配置、鉴权配置、制品仓配置和绝对路径解析结果的配置对象。
 */
function createAppConfig() {
  const raw = readJson(CONFIG_PATH);
  const artifactStoreConfig = createArtifactStoreConfig();
  const validationFeedConnectorConfig = createValidationFeedConnectorConfig();
  const resolvePath = (relativePath) => path.join(PROJECT_ROOT, relativePath);
  const auth = raw.auth || {};
  const runtimeBearerTokenEnv = String(auth.runtimeBearerTokenEnv || 'ACDP_RUNTIME_TOKEN').trim() || 'ACDP_RUNTIME_TOKEN';
  const websocketCallers = Array.isArray(auth.websocketCallers)
    ? auth.websocketCallers.map((caller) => normalizeWebSocketCallerConfig(caller)).filter(Boolean)
    : [];
  const resolvedRuntimeDelivery = {
    ...artifactStoreConfig.runtimeDelivery,
    adminArtifactBaseUrl: String(artifactStoreConfig.runtimeDelivery.adminArtifactBaseUrl || '').trim()
      || resolveDefaultAdminArtifactBaseUrl(raw.server || {}, artifactStoreConfig.runtimeControl || {}),
  };

  return {
    projectRoot: PROJECT_ROOT,
    configPath: CONFIG_PATH,
    artifactStoreConfigPath: artifactStoreConfig.configPath,
    validationFeedConnectorConfigPath: validationFeedConnectorConfig.configPath,
    businessPropertiesConfigPath: BUSINESS_PROPERTIES_CONFIG_PATH,
    sourceTypesConfigPath: SOURCE_TYPES_CONFIG_PATH,
    accessControlConfigPath: ACCESS_CONTROL_CONFIG_PATH,
    governancePoliciesConfigPath: GOVERNANCE_POLICIES_CONFIG_PATH,
    project: raw.project,
    server: {
      host: String((raw.server || {}).host || '0.0.0.0'),
      port: Math.max(1, Number((raw.server || {}).port || 8787)),
      runtimePort: Math.max(1, Number((raw.server || {}).runtimePort || (raw.server || {}).port || 8787)),
      adminPort: Math.max(1, Number((raw.server || {}).adminPort || 8788)),
      urlBaseForParsing: String((raw.server || {}).urlBaseForParsing || 'http://localhost'),
    },
    auth: {
      runtimeBearerToken: process.env[runtimeBearerTokenEnv] || String(auth.runtimeBearerToken || ''),
      runtimeBearerTokenEnv,
      websocketMaxConnections: Math.max(1, Number(auth.websocketMaxConnections || 200)),
      websocketIdleTimeoutMs: Math.max(1000, Number(auth.websocketIdleTimeoutMs || 60000)),
      websocketMaxMessageBytes: Math.max(1024, Number(auth.websocketMaxMessageBytes || 65536)),
      websocketCallerIdHeader: String(auth.websocketCallerIdHeader || 'x-acdp-caller-id').trim().toLowerCase() || 'x-acdp-caller-id',
      websocketCallerSecretHeader: String(auth.websocketCallerSecretHeader || 'x-acdp-caller-secret').trim().toLowerCase() || 'x-acdp-caller-secret',
      websocketCallerIdQueryKey: String(auth.websocketCallerIdQueryKey || 'callerId').trim() || 'callerId',
      websocketCallerSecretQueryKey: String(auth.websocketCallerSecretQueryKey || 'callerSecret').trim() || 'callerSecret',
      websocketCallerIpHeader: String(auth.websocketCallerIpHeader || 'x-forwarded-for').trim().toLowerCase(),
      websocketRejectUnknownCallers: readConfigBoolean(auth, 'websocketRejectUnknownCallers', false),
      websocketDefaultMaxConnectionsPerCaller: Math.max(0, Number(auth.websocketDefaultMaxConnectionsPerCaller || 0)),
      websocketDefaultMaxRequestsPerMinute: Math.max(0, Number(auth.websocketDefaultMaxRequestsPerMinute || 0)),
      websocketBlacklistIps: readConfigStringArray(auth, 'websocketBlacklistIps'),
      websocketCallers,
    },
    artifactStore: artifactStoreConfig.artifactStore,
    runtimeControl: artifactStoreConfig.runtimeControl,
    runtimeDelivery: resolvedRuntimeDelivery,
    validationFeedConnectors: validationFeedConnectorConfig,
    paths: raw.paths,
    resolvedPaths: {
      prototypeDir: resolvePath(raw.paths.prototypeDir),
      publicDir: resolvePath(raw.paths.publicDir),
      consoleClientDir: resolvePath(raw.paths.consoleClientDir || 'console/client'),
      workspaceDir: resolvePath(raw.paths.workspaceDir),
      runtimeArtifactsDir: path.join(resolvePath(raw.paths.workspaceDir), 'runtime_artifacts'),
      runtimeStateDir: path.join(resolvePath(raw.paths.workspaceDir), 'runtime_state'),
      hostVerificationDir: resolvePath(raw.paths.hostVerificationDir || 'prototype/workspace/host_verification'),
      catalogDir: resolvePath(raw.paths.catalogDir),
      releasesDir: resolvePath(raw.paths.releasesDir),
      latestReleaseDir: resolvePath(raw.paths.latestReleaseDir),
      databaseFile: resolvePath(raw.paths.databaseFile),
      validationFeedInboxDir: resolvePath(raw.paths.validationFeedInboxDir),
      validationFeedArchiveDir: resolvePath(raw.paths.validationFeedArchiveDir),
      validationFeedErrorDir: resolvePath(raw.paths.validationFeedErrorDir),
      validationFeedReceiptDir: resolvePath(raw.paths.validationFeedReceiptDir || 'prototype/workspace/validation_feeds/receipts'),
      demoTermsConfig: resolvePath(raw.paths.demoTermsConfig),
      seedCatalogFile: resolvePath(raw.paths.seedCatalogFile),
      rawRoadsFile: resolvePath(raw.paths.rawRoadsFile),
      rawGovernmentFile: resolvePath(raw.paths.rawGovernmentFile),
      cleanedDir: resolvePath(raw.paths.cleanedDir),
    },
  };
}

module.exports = {
  createArtifactStoreConfig,
  createValidationFeedConnectorConfig,
  createAppConfig,
  readJson,
  readConfigStringWithEnv,
  readConfigBoolean,
  readConfigStringArray,
  deriveRuntimeDeliveryMode,
  normalizeWebSocketCallerConfig,
  normalizeValidationFeedConnectorSourceConfig,
};
