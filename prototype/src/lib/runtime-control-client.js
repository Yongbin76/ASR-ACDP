/**
 * 功能：处理`runtimeControlClientEnabled`相关逻辑。
 * 输入：`appConfig`（应用配置对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function runtimeControlClientEnabled(appConfig = {}) {
  const runtimeControl = appConfig.runtimeControl || {};
  return Boolean(
    runtimeControl.client
    || (String(runtimeControl.adminBaseUrl || '').trim() && String(runtimeControl.nodeId || '').trim())
  );
}

/**
 * 功能：处理`runtimeControlBaseUrl`相关逻辑。
 * 输入：`appConfig`（应用配置对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function runtimeControlBaseUrl(appConfig = {}) {
  const baseUrl = String(((appConfig || {}).runtimeControl || {}).adminBaseUrl || '').trim();
  if (!baseUrl) {
    throw new Error('runtimeControl.adminBaseUrl is required');
  }
  return baseUrl.replace(/\/+$/, '');
}

/**
 * 功能：构建当前调用场景使用的请求头对象。
 * 输入：`appConfig`（应用配置对象）、`extraHeaders`（附加请求头）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function runtimeControlHeaders(appConfig = {}, extraHeaders = {}) {
  const headers = {};
  const token = String(((appConfig || {}).auth || {}).runtimeBearerToken || '').trim();
  const runtimeControl = (appConfig || {}).runtimeControl || {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  const nodeId = String(runtimeControl.nodeId || '').trim();
  const registrationSecret = String(runtimeControl.registrationSecret || '').trim();
  if (nodeId) {
    headers['x-runtime-node-id'] = nodeId;
  }
  if (registrationSecret) {
    headers['x-runtime-node-secret'] = registrationSecret;
  }
  for (const [key, value] of Object.entries(extraHeaders || {})) {
    if (value != null && value !== '') {
      headers[key] = value;
    }
  }
  return headers;
}

/**
 * 功能：处理`runtimeControlRequest`相关逻辑。
 * 输入：`appConfig`（应用配置对象）、`pathname`（路径名）、`options`（扩展选项）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function runtimeControlRequest(appConfig, pathname, options = {}) {
  const response = await fetch(`${runtimeControlBaseUrl(appConfig)}${pathname}`, {
    method: options.method || 'GET',
    headers: runtimeControlHeaders(appConfig, options.headers || {}),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!response.ok) {
    const message = json && json.error ? String(json.error) : `${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }
  return json;
}

/**
 * 功能：注册`runtime node remote`相关逻辑。
 * 输入：`appConfig`（应用配置对象）、`payload`（业务载荷对象）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function registerRuntimeNodeRemote(appConfig, payload) {
  return runtimeControlRequest(appConfig, '/api/runtime-nodes/register', {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: payload,
  });
}

/**
 * 功能：上报心跳并刷新`runtime node remote`相关逻辑。
 * 输入：`appConfig`（应用配置对象）、`payload`（业务载荷对象）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function heartbeatRuntimeNodeRemote(appConfig, payload) {
  return runtimeControlRequest(appConfig, '/api/runtime-nodes/heartbeat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: payload,
  });
}

/**
 * 功能：获取`runtime control remote`相关逻辑。
 * 输入：`appConfig`（应用配置对象）、`nodeId`（运行节点 ID）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function getRuntimeControlRemote(appConfig, nodeId) {
  return runtimeControlRequest(appConfig, `/api/runtime-control/me?nodeId=${encodeURIComponent(nodeId)}`, {
    method: 'GET',
    headers: {
      'content-type': undefined,
    },
  });
}

/**
 * 功能：处理`reportRuntimeApplyResultRemote`相关逻辑。
 * 输入：`appConfig`（应用配置对象）、`nodeId`（运行节点 ID）、`payload`（业务载荷对象）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function reportRuntimeApplyResultRemote(appConfig, nodeId, payload) {
  return runtimeControlRequest(appConfig, `/api/runtime-nodes/${encodeURIComponent(nodeId)}/apply-result`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: payload,
  });
}

/**
 * 功能：上传`runtime stats remote`相关逻辑。
 * 输入：`appConfig`（应用配置对象）、`nodeId`（运行节点 ID）、`payload`（业务载荷对象）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function uploadRuntimeStatsRemote(appConfig, nodeId, payload) {
  return runtimeControlRequest(appConfig, `/api/runtime-nodes/${encodeURIComponent(nodeId)}/stats/upload`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: payload,
  });
}

module.exports = {
  getRuntimeControlRemote,
  heartbeatRuntimeNodeRemote,
  registerRuntimeNodeRemote,
  reportRuntimeApplyResultRemote,
  uploadRuntimeStatsRemote,
  runtimeControlClientEnabled,
};
