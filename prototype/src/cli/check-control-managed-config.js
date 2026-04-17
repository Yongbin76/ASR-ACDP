const { createAppConfig, readJson } = require('../lib/config');

const appConfig = createAppConfig();
const SENSITIVE_KEYS = new Set(['rootUser', 'rootPassword', 'accessKey', 'secretKey']);

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
 * 功能：读取当前 artifact_store 原始配置内容。
 * 输入：无。
 * 输出：artifact_store 原始配置对象。
 */
function loadRawArtifactStoreConfig() {
  return readJson(appConfig.artifactStoreConfigPath);
}

/**
 * 功能：判断某个配置字段是否通过 `*Env` 从环境变量解析得到。
 * 输入：原始配置对象、配置分组名和字段名。
 * 输出：包含来源、环境变量名和值是否存在的摘要对象。
 */
function configSource(rawConfig = {}, groupName, key) {
  const group = rawConfig[groupName] || {};
  const envName = String(group[`${key}Env`] || '').trim();
  const envPresent = Boolean(envName && Object.prototype.hasOwnProperty.call(process.env, envName));
  return {
    key,
    envName,
    source: envPresent ? 'env' : 'file',
    envPresent,
  };
}

/**
 * 功能：判断字符串值是否有效。
 * 输入：任意值。
 * 输出：布尔值；非空字符串时返回 `true`。
 */
function hasText(value) {
  return String(value || '').trim().length > 0;
}

/**
 * 功能：判断给定 endpoint 是否指向本机地址。
 * 输入：endpoint URL 字符串。
 * 输出：布尔值；仅 `127.0.0.1/localhost` 等本机地址返回 `true`。
 */
function isLocalEndpoint(endpoint = '') {
  try {
    const url = new URL(String(endpoint || '').trim());
    return ['127.0.0.1', 'localhost'].includes(String(url.hostname || '').trim().toLowerCase());
  } catch {
    return false;
  }
}

/**
 * 功能：对敏感配置值做脱敏显示。
 * 输入：字段名和实际值。
 * 输出：可安全打印的字段值。
 */
function maskFieldValue(key, value) {
  const text = String(value || '');
  if (!SENSITIVE_KEYS.has(String(key || ''))) {
    return text;
  }
  if (!text) {
    return '';
  }
  if (text.length <= 4) {
    return '****';
  }
  return `${text.slice(0, 2)}****${text.slice(-2)}`;
}

/**
 * 功能：为某个配置字段生成状态摘要。
 * 输入：原始配置对象、分组名、字段名和实际解析值。
 * 输出：字段状态对象。
 */
function fieldStatus(rawConfig, groupName, key, value) {
  const source = configSource(rawConfig, groupName, key);
  return {
    key,
    value: maskFieldValue(key, value),
    ok: hasText(value),
    source: source.source,
    envName: source.envName,
    envPresent: source.envPresent,
  };
}

/**
 * 功能：判断当前 artifact store 是否仍处于本地开发凭据模式。
 * 输入：artifact store 配置对象和字段状态数组。
 * 输出：本地开发凭据模式摘要对象。
 */
function localCredentialModeStatus(artifactStore = {}, fields = []) {
  const endpointLocal = isLocalEndpoint(artifactStore.endpoint);
  const sourceMap = new Map((fields || []).map((item) => [item.key, item]));
  const accessKeySource = sourceMap.get('accessKey');
  const secretKeySource = sourceMap.get('secretKey');
  const rootUserSource = sourceMap.get('rootUser');
  const rootPasswordSource = sourceMap.get('rootPassword');
  const fileBackedCredential = (
    (accessKeySource && accessKeySource.source === 'file' && accessKeySource.ok)
    || (secretKeySource && secretKeySource.source === 'file' && secretKeySource.ok)
    || (rootUserSource && rootUserSource.source === 'file' && rootUserSource.ok)
    || (rootPasswordSource && rootPasswordSource.source === 'file' && rootPasswordSource.ok)
  );
  return {
    endpointLocal,
    fileBackedCredential,
    active: endpointLocal && fileBackedCredential,
  };
}

/**
 * 功能：检查 MinIO HTTP 健康接口是否可达。
 * 输入：endpoint URL 字符串。
 * 输出：Promise，解析为健康检查结果对象。
 */
async function checkMinioHealth(endpoint = '') {
  const result = {
    endpoint: String(endpoint || '').trim(),
    ok: false,
    status: 0,
    healthUrl: '',
    error: '',
  };
  if (!hasText(endpoint)) {
    result.error = 'endpoint missing';
    return result;
  }
  try {
    const healthUrl = new URL('/minio/health/live', endpoint).toString();
    result.healthUrl = healthUrl;
    const response = await fetch(healthUrl);
    result.status = response.status;
    result.ok = response.ok;
    if (!response.ok) {
      result.error = `unexpected status ${response.status}`;
    }
    return result;
  } catch (error) {
    result.error = error.message || String(error);
    return result;
  }
}

/**
 * 功能：构造 artifact store 配置体检结果。
 * 输入：原始配置对象和应用配置对象。
 * 输出：Promise，解析为 artifact store 检查摘要。
 */
async function artifactStoreCheck(rawConfig, config) {
  const artifactStore = (config || {}).artifactStore || {};
  const fields = [
    fieldStatus(rawConfig, 'artifactStore', 'endpoint', artifactStore.endpoint),
    fieldStatus(rawConfig, 'artifactStore', 'publicBaseUrl', artifactStore.publicBaseUrl),
    fieldStatus(rawConfig, 'artifactStore', 'bucket', artifactStore.bucket),
    fieldStatus(rawConfig, 'artifactStore', 'rootUser', artifactStore.rootUser),
    fieldStatus(rawConfig, 'artifactStore', 'rootPassword', artifactStore.rootPassword),
    fieldStatus(rawConfig, 'artifactStore', 'accessKey', artifactStore.accessKey),
    fieldStatus(rawConfig, 'artifactStore', 'secretKey', artifactStore.secretKey),
  ];
  const credentialsOk = hasText(artifactStore.accessKey) && hasText(artifactStore.secretKey)
    || hasText(artifactStore.rootUser) && hasText(artifactStore.rootPassword);
  const endpointProtocol = hasText(artifactStore.endpoint) ? new URL(artifactStore.endpoint).protocol : '';
  const health = ['http:', 'https:'].includes(endpointProtocol)
    ? await checkMinioHealth(artifactStore.endpoint)
    : {
      endpoint: artifactStore.endpoint,
      ok: endpointProtocol === 'file:',
      status: 0,
      healthUrl: '',
      error: endpointProtocol === 'file:' ? '' : 'unsupported endpoint protocol',
    };
  const localCredentialMode = localCredentialModeStatus(artifactStore, fields);

  return {
    provider: artifactStore.provider,
    endpoint: artifactStore.endpoint,
    publicBaseUrl: artifactStore.publicBaseUrl,
    bucket: artifactStore.bucket,
    accessStyle: artifactStore.accessStyle,
    fields,
    credentialsOk,
    localCredentialMode,
    health,
    ok: fields.every((item) => item.ok || ['rootUser', 'rootPassword', 'accessKey', 'secretKey'].includes(item.key)) && credentialsOk && health.ok,
  };
}

/**
 * 功能：检查关键字段是否全部来自环境变量注入。
 * 输入：字段状态数组。
 * 输出：检查结果对象。
 */
function requiredEnvSourceCheck(fields = []) {
  const violations = (fields || []).filter((item) => item.envName && item.source !== 'env');
  return {
    ok: violations.length === 0,
    violations: violations.map((item) => ({
      key: item.key,
      envName: item.envName,
      source: item.source,
    })),
  };
}

/**
 * 功能：构造 runtime control 配置体检结果。
 * 输入：原始配置对象和应用配置对象。
 * 输出：runtime control 检查摘要。
 */
function runtimeControlCheck(rawConfig, config) {
  const runtimeControl = (config || {}).runtimeControl || {};
  const fields = [
    fieldStatus(rawConfig, 'runtimeControl', 'adminBaseUrl', runtimeControl.adminBaseUrl),
    fieldStatus(rawConfig, 'runtimeControl', 'nodeId', runtimeControl.nodeId),
    fieldStatus(rawConfig, 'runtimeControl', 'nodeName', runtimeControl.nodeName),
    fieldStatus(rawConfig, 'runtimeControl', 'nodeEnv', runtimeControl.nodeEnv),
    fieldStatus(rawConfig, 'runtimeControl', 'nodeAddress', runtimeControl.nodeAddress),
  ];
  return {
    fields,
    ok: fields.every((item) => item.ok),
  };
}

/**
 * 功能：构造 runtime token 体检结果。
 * 输入：应用配置对象。
 * 输出：runtime token 检查摘要。
 */
function runtimeTokenCheck(config) {
  const auth = (config || {}).auth || {};
  return {
    envName: String(auth.runtimeBearerTokenEnv || '').trim(),
    present: hasText(auth.runtimeBearerToken),
  };
}

/**
 * 功能：执行控制面模式配置体检。
 * 输入：应用配置对象。
 * 输出：Promise，解析为总体体检结果。
 */
async function main(config = appConfig) {
  const requireEnvSources = hasFlag('--require-env-sources') || String(readArg('--require-env-sources', '')).trim() === 'true';
  const rawConfig = loadRawArtifactStoreConfig();
  const artifactStore = await artifactStoreCheck(rawConfig, config);
  const runtimeControl = runtimeControlCheck(rawConfig, config);
  const runtimeToken = runtimeTokenCheck(config);
  const envSourceCheck = requireEnvSources
    ? {
      artifactStore: requiredEnvSourceCheck(artifactStore.fields),
      runtimeControl: requiredEnvSourceCheck(runtimeControl.fields),
      runtimeToken: {
        ok: true,
        violations: [],
      },
    }
    : null;
  return {
    configPath: config.artifactStoreConfigPath,
    requireEnvSources,
    ok: artifactStore.ok
      && runtimeControl.ok
      && runtimeToken.present
      && (!envSourceCheck || (envSourceCheck.artifactStore.ok && envSourceCheck.runtimeControl.ok)),
    artifactStore,
    runtimeControl,
    runtimeToken,
    envSourceCheck,
    recommendations: [
      artifactStore.ok ? null : 'artifactStore 仍缺少有效 endpoint / bucket / 凭据或 MinIO 健康不可达',
      artifactStore.localCredentialMode && artifactStore.localCredentialMode.active
        ? '当前仍处于本地开发凭据模式：endpoint 指向本机且凭据来自配置文件；切换到真实宿主/生产前请改为 *Env 注入'
        : null,
      runtimeControl.ok ? null : 'runtimeControl 仍缺少 adminBaseUrl / nodeId / nodeName / nodeEnv / nodeAddress',
      runtimeToken.present ? null : `runtime token 未注入，请检查 ${runtimeToken.envName || 'ACDP_RUNTIME_TOKEN'}`,
      !envSourceCheck || envSourceCheck.artifactStore.ok ? null : 'artifactStore 关键字段仍来自配置文件，请切换到 *Env 注入口径',
      !envSourceCheck || envSourceCheck.runtimeControl.ok ? null : 'runtimeControl 关键字段仍来自配置文件，请切换到 *Env 注入口径',
    ].filter(Boolean),
  };
}

if (require.main === module) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  artifactStoreCheck,
  checkMinioHealth,
  configSource,
  fieldStatus,
  hasFlag,
  loadRawArtifactStoreConfig,
  main,
  maskFieldValue,
  readArg,
  requiredEnvSourceCheck,
  runtimeControlCheck,
  runtimeTokenCheck,
};
