const { createAppConfig, readJson } = require('../lib/config');
const { configuredFeedSources } = require('../lib/validation-feed-importer');

const appConfig = createAppConfig();

/**
 * 功能：从命令行读取某个 flag 的值。
 * 输入：`flag` 参数名，`fallback` 默认值。
 * 输出：解析到的参数值或默认值。
 */
function readArg(flag, fallback = '') {
  const args = process.argv.slice(2);
  const inline = args.find((item) => String(item).startsWith(`${flag}=`));
  if (inline) {
    return String(inline).slice(flag.length + 1);
  }
  const index = args.indexOf(flag);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
}

/**
 * 功能：判断命令行中是否包含某个布尔 flag。
 * 输入：`flag` 参数名。
 * 输出：布尔值。
 */
function hasFlag(flag) {
  return process.argv.slice(2).includes(flag);
}

/**
 * 功能：判断字符串值是否有效。
 * 输入：任意值。
 * 输出：非空字符串时返回 `true`，否则返回 `false`。
 */
function hasText(value) {
  return String(value || '').trim().length > 0;
}

/**
 * 功能：读取当前 validation feed connector 原始配置内容。
 * 输入：无。
 * 输出：validation feed connector 原始配置对象。
 */
function loadRawValidationFeedConnectorConfig(config = appConfig) {
  return readJson(config.validationFeedConnectorConfigPath);
}

/**
 * 功能：按 sourceType 从原始配置中查找单个 source 定义。
 * 输入：原始配置对象和 sourceType。
 * 输出：命中的 source 原始配置对象；不存在时返回空对象。
 */
function rawSourceConfig(rawConfig = {}, sourceType = '') {
  const sources = Array.isArray(rawConfig.sources) ? rawConfig.sources : [];
  return sources.find((item) => String(item.sourceType || '').trim().toLowerCase() === String(sourceType || '').trim().toLowerCase()) || {};
}

/**
 * 功能：判断某个 connector 字段是否通过 `*Env` 从环境变量解析得到。
 * 输入：原始 source 配置对象和字段名。
 * 输出：来源摘要对象。
 */
function sourceConfigSource(rawSource = {}, key) {
  const envName = String(rawSource[`${key}Env`] || '').trim();
  const envPresent = Boolean(envName && Object.prototype.hasOwnProperty.call(process.env, envName));
  return {
    key,
    envName,
    source: envPresent ? 'env' : 'file',
    envPresent,
  };
}

/**
 * 功能：为单个 connector 字段构造状态摘要。
 * 输入：原始 source 配置、字段名、实际值和是否必填。
 * 输出：字段状态对象。
 */
function connectorFieldStatus(rawSource, key, value, required = false) {
  const source = sourceConfigSource(rawSource, key);
  return {
    key,
    value: String(value || ''),
    required,
    ok: required ? hasText(value) : true,
    source: source.source,
    envName: source.envName,
    envPresent: source.envPresent,
  };
}

/**
 * 功能：把 sourceTypes 选项标准化为去重后的数组。
 * 输入：字符串数组。
 * 输出：标准化后的 sourceType 数组。
 */
function normalizeSourceTypes(items = []) {
  return Array.from(new Set((items || [])
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean)));
}

/**
 * 功能：根据 sourceType 过滤当前应检查的 connector source。
 * 输入：应用配置对象和 sourceType 数组。
 * 输出：待检查 source 数组。
 */
function selectedConnectorSources(config, sourceTypes = []) {
  const selectedTypes = normalizeSourceTypes(sourceTypes);
  return configuredFeedSources(config).filter((source) => selectedTypes.length === 0 || selectedTypes.includes(source.sourceType));
}

/**
 * 功能：检查单个 validation feed connector source 的配置是否齐备。
 * 输入：原始配置、source 配置和检查选项。
 * 输出：source 检查结果对象。
 */
function checkValidationFeedConnectorSource(rawConfig, source, options = {}) {
  const rawSource = rawSourceConfig(rawConfig, source.sourceType);
  const requireRemoteConfigured = options.requireRemoteConfigured === true;
  const requireAckConfigured = options.requireAckConfigured === true;
  const transportIsHttpPull = source.transportType === 'http_pull_json';
  const httpPullRequired = requireRemoteConfigured || transportIsHttpPull;
  const ackRequired = requireAckConfigured || source.ackType === 'http_post';
  const cursorRequired = httpPullRequired && hasText(source.cursorQueryKey) || hasText(source.cursorResponseField);
  const fields = [
    connectorFieldStatus(rawSource, 'endpoint', source.endpoint, httpPullRequired),
    connectorFieldStatus(rawSource, 'authToken', source.authToken, httpPullRequired && source.authType === 'bearer'),
    connectorFieldStatus(rawSource, 'authValue', source.authValue, httpPullRequired && ['header', 'query'].includes(source.authType)),
    connectorFieldStatus(rawSource, 'ackEndpoint', source.ackEndpoint, ackRequired),
    connectorFieldStatus(rawSource, 'cursorQueryKey', source.cursorQueryKey, cursorRequired),
    connectorFieldStatus(rawSource, 'cursorResponseField', source.cursorResponseField, cursorRequired),
    connectorFieldStatus(rawSource, 'initialCursor', source.initialCursor, false),
  ];
  const notes = [];
  if (source.enabled === false) {
    notes.push('source disabled');
  }
  if (source.transportType === 'file_inbox') {
    notes.push('currently still on file_inbox');
  }
  if (transportIsHttpPull && !hasText(source.endpoint)) {
    notes.push('http_pull_json endpoint missing');
  }
  if (transportIsHttpPull && source.authType === 'bearer' && !hasText(source.authToken)) {
    notes.push('bearer token missing');
  }
  if (transportIsHttpPull && ['header', 'query'].includes(source.authType) && !hasText(source.authValue)) {
    notes.push('custom auth value missing');
  }
  if (ackRequired && !hasText(source.ackEndpoint)) {
    notes.push('ack endpoint missing');
  }
  if (cursorRequired && !hasText(source.cursorQueryKey)) {
    notes.push('cursor query key missing');
  }
  if (cursorRequired && !hasText(source.cursorResponseField)) {
    notes.push('cursor response field missing');
  }
  return {
    sourceType: source.sourceType,
    enabled: source.enabled !== false,
    transportType: source.transportType,
    authType: source.authType,
    ackType: source.ackType,
    includeCursorInAck: source.includeCursorInAck === true,
    retryMaxAttempts: Number(source.retryMaxAttempts || 0),
    fields,
    ok: source.enabled !== false && fields.every((item) => item.ok),
    notes,
  };
}

/**
 * 功能：执行 validation feed connector 整体预检。
 * 输入：应用配置对象和检查选项。
 * 输出：connector 预检摘要对象。
 */
function checkValidationFeedConnectors(config = appConfig, options = {}) {
  const rawConfig = loadRawValidationFeedConnectorConfig(config);
  const sourceTypes = normalizeSourceTypes(options.sourceTypes || []);
  const checks = selectedConnectorSources(config, sourceTypes)
    .map((source) => checkValidationFeedConnectorSource(rawConfig, source, options));
  return {
    ok: checks.length > 0 && checks.every((item) => item.ok),
    configPath: config.validationFeedConnectorConfigPath,
    sourceTypes,
    requireRemoteConfigured: options.requireRemoteConfigured === true,
    requireAckConfigured: options.requireAckConfigured === true,
    checks,
  };
}

/**
 * 功能：执行当前脚本的主流程。
 * 输入：可选应用配置对象。
 * 输出：connector 预检摘要对象。
 */
function main(config = appConfig) {
  const sourceTypes = String(readArg('--source-type', '') || '')
    .split(',')
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return checkValidationFeedConnectors(config, {
    sourceTypes,
    requireRemoteConfigured: hasFlag('--require-remote-configured'),
    requireAckConfigured: hasFlag('--require-ack-configured'),
  });
}

if (require.main === module) {
  const result = main();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

module.exports = {
  checkValidationFeedConnectorSource,
  checkValidationFeedConnectors,
  main,
};
