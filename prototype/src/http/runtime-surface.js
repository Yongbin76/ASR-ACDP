/**
 * 功能：声明 runtime 面向外部服务所使用的路由权限映射。
 * 输入：HTTP 方法和路径。
 * 输出：权限字符串或 `null`。
 */
function permissionForRuntimeRoute(method, pathname) {
  if (method === 'GET' && pathname === '/health') return 'health.read';
  if (method === 'GET' && pathname === '/api/runtime/current') return 'runtime.read';
  if (method === 'GET' && pathname === '/api/runtime/stats') return 'runtime.read';
  if (method === 'POST' && pathname === '/api/runtime/reload') return 'runtime.reload';
  if (method === 'POST' && pathname === '/api/runtime/correct') return 'runtime.correct';
  if (method === 'POST' && pathname === '/api/runtime/correct_cand') return 'runtime.correct';
  if (method === 'POST' && pathname === '/api/simulate') return 'simulate.run';
  return null;
}

/**
 * 功能：处理 runtime 面向外部服务的 HTTP 请求。
 * 输入：请求对象、响应对象、已解析路径上下文和运行时依赖。
 * 输出：命中时返回 `true`，否则返回 `false`。
 */
async function handleRuntimeRequest(req, res, context = {}) {
  const {
    pathname,
    sendJson,
    readJson,
    requireRuntimeToken,
    executeCorrection,
    executeCorrectionCandidates,
    refreshRuntimeState,
    runtimeState,
    currentRuntimeStats,
    countTerms,
    db,
    getCurrentPublishedRelease,
  } = context;

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      stableVersion: runtimeState.stable ? runtimeState.stable.getCurrentVersion().version : null,
      canaryVersion: runtimeState.canary ? runtimeState.canary.getCurrentVersion().version : null,
      grayPolicy: runtimeState.grayPolicy,
      termCount: countTerms(db),
      currentRelease: getCurrentPublishedRelease(db),
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/runtime/current') {
    sendJson(res, 200, {
      stable: runtimeState.stable ? runtimeState.stable.getCurrentVersion() : null,
      canary: runtimeState.canary ? runtimeState.canary.getCurrentVersion() : null,
      grayPolicy: runtimeState.grayPolicy,
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/runtime/stats') {
    sendJson(res, 200, currentRuntimeStats());
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/runtime/reload') {
    refreshRuntimeState();
    sendJson(res, 200, {
      status: 'reloaded',
      stable: runtimeState.stable ? runtimeState.stable.getCurrentVersion().version : null,
      canary: runtimeState.canary ? runtimeState.canary.getCurrentVersion().version : null,
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/runtime/correct') {
    const payload = await readJson(req);
    requireRuntimeToken(req);
    const result = executeCorrection(payload, 'http');
    sendJson(res, 200, {
      correctedText: result.correctedText,
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/runtime/correct_cand') {
    const payload = await readJson(req);
    requireRuntimeToken(req);
    const result = executeCorrectionCandidates(payload, 'http');
    sendJson(res, 200, {
      correctedTexts: result.correctedTexts,
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/simulate') {
    const payload = await readJson(req);
    const result = executeCorrection({
      ...payload,
      enablePinyinAutoReplace: payload.enablePinyinAutoReplace === true,
    }, 'http');
    sendJson(res, 200, result);
    return true;
  }

  return false;
}

/**
 * 功能：处理 runtime WebSocket 升级请求。
 * 输入：请求对象、socket 和运行时依赖。
 * 输出：命中时返回 `true`，否则返回 `false`。
 */
function handleRuntimeUpgrade(req, socket, context = {}) {
  const { pathname, handleRuntimeCorrectWebSocket, handleRuntimeCorrectCandWebSocket } = context;
  if (req.method === 'GET' && pathname === '/ws/runtime/correct') {
    handleRuntimeCorrectWebSocket(req, socket);
    return true;
  }
  if (req.method === 'GET' && pathname === '/ws/runtime/correct_cand') {
    handleRuntimeCorrectCandWebSocket(req, socket);
    return true;
  }
  return false;
}

module.exports = {
  permissionForRuntimeRoute,
  handleRuntimeRequest,
  handleRuntimeUpgrade,
};
