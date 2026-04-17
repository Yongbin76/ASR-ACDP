const crypto = require('crypto');
const { URL } = require('url');

/**
 * 功能：对文本值做定长安全比较。
 * 输入：左右两个待比较字符串。
 * 输出：相等时返回 `true`，否则返回 `false`。
 */
function timingSafeEqualText(left, right) {
  const leftText = String(left || '');
  const rightText = String(right || '');
  if (!leftText || !rightText) {
    return false;
  }
  if (Buffer.byteLength(leftText) !== Buffer.byteLength(rightText)) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(leftText), Buffer.from(rightText));
}

/**
 * 功能：标准化 IP / socket 地址文本，便于黑名单与统计复用。
 * 输入：原始地址字符串。
 * 输出：标准化后的地址字符串。
 */
function normalizeAddress(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  if (raw.startsWith('::ffff:')) {
    return raw.slice(7);
  }
  return raw;
}

/**
 * 功能：创建统一的 WebSocket 治理错误对象。
 * 输入：HTTP 状态码、错误码、错误消息和附加字段。
 * 输出：带扩展字段的 Error 实例。
 */
function createGovernanceError(statusCode, code, message, extras = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  Object.assign(error, extras);
  return error;
}

/**
 * 功能：基于运行时鉴权配置构建 WebSocket caller 治理器。
 * 输入：`authConfig` 鉴权配置对象。
 * 输出：具备连接认证、配额校验和快照统计能力的治理器对象。
 */
function createRuntimeWebSocketGovernance(authConfig = {}) {
  const callerRegistry = new Map(
    (Array.isArray(authConfig.websocketCallers) ? authConfig.websocketCallers : [])
      .filter((item) => item && item.callerId)
      .map((item) => [item.callerId, { ...item }])
  );
  const ipBlacklist = new Set(
    (Array.isArray(authConfig.websocketBlacklistIps) ? authConfig.websocketBlacklistIps : [])
      .map((item) => normalizeAddress(item))
      .filter(Boolean)
  );
  const activeConnectionsByCaller = new Map();
  const requestTimestampsByCaller = new Map();
  const rejectionStats = {
    auth: 0,
    blacklist: 0,
    connectionQuota: 0,
    rateLimit: 0,
  };
  let totalAcceptedConnections = 0;

  /**
   * 功能：记录一次治理拒绝计数。
   * 输入：拒绝类型。
   * 输出：无显式返回。
   */
  function recordRejection(kind) {
    if (Object.prototype.hasOwnProperty.call(rejectionStats, kind)) {
      rejectionStats[kind] += 1;
    }
  }

  /**
   * 功能：解析升级请求 URL，供 query 参数读取复用。
   * 输入：HTTP 请求对象。
   * 输出：URL 实例。
   */
  function requestUrl(req) {
    return new URL(String(req.url || '/'), 'http://localhost');
  }

  /**
   * 功能：从升级请求读取 callerId。
   * 输入：HTTP 请求对象和解析后的 URL。
   * 输出：callerId 字符串。
   */
  function callerIdFrom(req, parsedUrl = requestUrl(req)) {
    const headerName = String(authConfig.websocketCallerIdHeader || 'x-acdp-caller-id').trim().toLowerCase();
    const queryKey = String(authConfig.websocketCallerIdQueryKey || 'callerId').trim() || 'callerId';
    const headerValue = String((req.headers || {})[headerName] || '').trim();
    if (headerValue) {
      return headerValue;
    }
    return String(parsedUrl.searchParams.get(queryKey) || '').trim();
  }

  /**
   * 功能：从升级请求读取 caller secret 候选值。
   * 输入：HTTP 请求对象和解析后的 URL。
   * 输出：去空去重后的 secret 候选数组。
   */
  function callerSecretsFrom(req, parsedUrl = requestUrl(req)) {
    const headerName = String(authConfig.websocketCallerSecretHeader || 'x-acdp-caller-secret').trim().toLowerCase();
    const queryKey = String(authConfig.websocketCallerSecretQueryKey || 'callerSecret').trim() || 'callerSecret';
    const authHeader = String((req.headers || {}).authorization || '').trim();
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const values = [
      String((req.headers || {})[headerName] || '').trim(),
      String(parsedUrl.searchParams.get(queryKey) || '').trim(),
      bearerToken,
    ];
    const unique = [];
    for (const value of values) {
      if (!value || unique.includes(value)) {
        continue;
      }
      unique.push(value);
    }
    return unique;
  }

  /**
   * 功能：从升级请求解析调用方来源地址。
   * 输入：HTTP 请求对象。
   * 输出：标准化后的地址字符串。
   */
  function remoteAddressFrom(req) {
    const headerName = String(authConfig.websocketCallerIpHeader || '').trim().toLowerCase();
    const headerValue = headerName ? String((req.headers || {})[headerName] || '').trim() : '';
    if (headerValue) {
      const first = headerValue.split(',')[0];
      return normalizeAddress(first);
    }
    return normalizeAddress((req.socket && req.socket.remoteAddress) || '');
  }

  /**
   * 功能：校验当前请求是否满足 legacy runtime token 要求。
   * 输入：secret 候选数组。
   * 输出：满足时返回 `true`，否则返回 `false`。
   */
  function hasLegacyRuntimeToken(secretCandidates = []) {
    const runtimeToken = String(authConfig.runtimeBearerToken || '').trim();
    if (!runtimeToken) {
      return true;
    }
    return secretCandidates.some((item) => timingSafeEqualText(item, runtimeToken));
  }

  /**
   * 功能：解析并认证当前 WebSocket caller 身份。
   * 输入：HTTP 升级请求对象。
   * 输出：caller 身份对象，包含 callerId、配额和认证来源。
   */
  function identifyCaller(req) {
    const parsedUrl = requestUrl(req);
    const requestedCallerId = callerIdFrom(req, parsedUrl);
    const secretCandidates = callerSecretsFrom(req, parsedUrl);
    const registeredCaller = requestedCallerId ? callerRegistry.get(requestedCallerId) : null;
    const defaultMaxConnections = Math.max(0, Number(authConfig.websocketDefaultMaxConnectionsPerCaller || 0));
    const defaultMaxRequestsPerMinute = Math.max(0, Number(authConfig.websocketDefaultMaxRequestsPerMinute || 0));

    if (registeredCaller) {
      if (registeredCaller.enabled === false) {
        recordRejection('blacklist');
        throw createGovernanceError(403, 'websocket_caller_disabled', `websocket caller disabled: ${registeredCaller.callerId}`);
      }
      if (registeredCaller.blacklisted) {
        recordRejection('blacklist');
        throw createGovernanceError(
          403,
          'websocket_caller_blacklisted',
          registeredCaller.blacklistReason
            ? `websocket caller blacklisted: ${registeredCaller.blacklistReason}`
            : `websocket caller blacklisted: ${registeredCaller.callerId}`
        );
      }
      const configuredSecret = String(registeredCaller.secret || '').trim();
      if (configuredSecret) {
        const matched = secretCandidates.some((item) => timingSafeEqualText(item, configuredSecret));
        if (!matched) {
          recordRejection('auth');
          throw createGovernanceError(401, 'websocket_caller_secret_required', `websocket caller secret required: ${registeredCaller.callerId}`);
        }
        return {
          callerId: registeredCaller.callerId,
          displayName: registeredCaller.displayName || registeredCaller.callerId,
          authSource: 'caller_secret',
          maxConnections: Math.max(0, Number(registeredCaller.maxConnections || defaultMaxConnections)),
          maxRequestsPerMinute: Math.max(0, Number(registeredCaller.maxRequestsPerMinute || defaultMaxRequestsPerMinute)),
        };
      }
      if (!hasLegacyRuntimeToken(secretCandidates)) {
        recordRejection('auth');
        throw createGovernanceError(401, 'websocket_runtime_token_required', 'runtime token required');
      }
      return {
        callerId: registeredCaller.callerId,
        displayName: registeredCaller.displayName || registeredCaller.callerId,
        authSource: 'runtime_token_shared',
        maxConnections: Math.max(0, Number(registeredCaller.maxConnections || defaultMaxConnections)),
        maxRequestsPerMinute: Math.max(0, Number(registeredCaller.maxRequestsPerMinute || defaultMaxRequestsPerMinute)),
      };
    }

    if (authConfig.websocketRejectUnknownCallers && callerRegistry.size > 0) {
      recordRejection('auth');
      if (requestedCallerId) {
        throw createGovernanceError(403, 'websocket_unknown_caller', `unknown websocket caller: ${requestedCallerId}`);
      }
      throw createGovernanceError(403, 'websocket_registered_caller_required', 'registered websocket caller required');
    }

    if (!hasLegacyRuntimeToken(secretCandidates)) {
      recordRejection('auth');
      throw createGovernanceError(401, 'websocket_runtime_token_required', 'runtime token required');
    }

    return {
      callerId: requestedCallerId || (String(authConfig.runtimeBearerToken || '').trim() ? 'legacy_runtime_token' : 'anonymous'),
      displayName: requestedCallerId || (String(authConfig.runtimeBearerToken || '').trim() ? 'legacy_runtime_token' : 'anonymous'),
      authSource: String(authConfig.runtimeBearerToken || '').trim() ? 'runtime_token' : 'anonymous',
      maxConnections: defaultMaxConnections,
      maxRequestsPerMinute: defaultMaxRequestsPerMinute,
    };
  }

  /**
   * 功能：为新 WebSocket 连接执行认证、黑名单与并发配额校验。
   * 输入：HTTP 升级请求对象和当前全局活跃连接数。
   * 输出：当前连接的治理 session。
   */
  function openConnection(req, globalConnectionCount = 0) {
    if (globalConnectionCount >= Math.max(1, Number(authConfig.websocketMaxConnections || 200))) {
      recordRejection('connectionQuota');
      throw createGovernanceError(503, 'websocket_connection_limit_reached', 'websocket connection limit reached');
    }

    const remoteAddress = remoteAddressFrom(req);
    if (remoteAddress && ipBlacklist.has(remoteAddress)) {
      recordRejection('blacklist');
      throw createGovernanceError(403, 'websocket_ip_blacklisted', `websocket caller IP blacklisted: ${remoteAddress}`);
    }

    const identity = identifyCaller(req);
    const callerConnectionLimit = Math.max(0, Number(identity.maxConnections || 0));
    const activeCount = activeConnectionsByCaller.get(identity.callerId) || 0;
    if (callerConnectionLimit > 0 && activeCount >= callerConnectionLimit) {
      recordRejection('connectionQuota');
      throw createGovernanceError(429, 'websocket_caller_connection_limit_reached', `websocket caller connection limit reached: ${identity.callerId}`);
    }

    activeConnectionsByCaller.set(identity.callerId, activeCount + 1);
    totalAcceptedConnections += 1;
    let released = false;

    return {
      ...identity,
      remoteAddress,
      /**
       * 功能：在连接关闭时释放 caller 活跃连接计数。
       * 输入：无。
       * 输出：无显式返回。
       */
      release() {
        if (released) {
          return;
        }
        released = true;
        const current = activeConnectionsByCaller.get(identity.callerId) || 0;
        if (current <= 1) {
          activeConnectionsByCaller.delete(identity.callerId);
          return;
        }
        activeConnectionsByCaller.set(identity.callerId, current - 1);
      },
    };
  }

  /**
   * 功能：在处理一条业务消息前执行 caller 级速率配额校验。
   * 输入：治理 session。
   * 输出：通过时无显式返回，超限时抛错。
   */
  function consumeMessage(session) {
    const limit = Math.max(0, Number((session || {}).maxRequestsPerMinute || 0));
    if (limit <= 0) {
      return;
    }
    const windowStart = Date.now() - 60000;
    const timestamps = requestTimestampsByCaller.get(session.callerId) || [];
    const recent = timestamps.filter((item) => item > windowStart);
    if (recent.length >= limit) {
      requestTimestampsByCaller.set(session.callerId, recent);
      recordRejection('rateLimit');
      throw createGovernanceError(
        429,
        'websocket_rate_limit_exceeded',
        `websocket caller rate limit exceeded: ${session.callerId}`,
        { websocketCloseCode: 1008 }
      );
    }
    recent.push(Date.now());
    requestTimestampsByCaller.set(session.callerId, recent);
  }

  /**
   * 功能：生成当前 WebSocket 治理状态快照，供运行时观测接口复用。
   * 输入：无。
   * 输出：包含 caller 活跃连接与拒绝计数的快照对象。
   */
  function snapshot() {
    const active = {};
    for (const [callerId, count] of activeConnectionsByCaller.entries()) {
      if (count > 0) {
        active[callerId] = count;
      }
    }
    return {
      registryEnabled: callerRegistry.size > 0,
      registeredCallerCount: callerRegistry.size,
      rejectUnknownCallers: authConfig.websocketRejectUnknownCallers === true,
      blacklistedIpCount: ipBlacklist.size,
      totalAcceptedConnections,
      activeCallerCount: Object.keys(active).length,
      activeConnectionsByCaller: active,
      rejections: { ...rejectionStats },
    };
  }

  return {
    openConnection,
    consumeMessage,
    snapshot,
  };
}

module.exports = {
  createRuntimeWebSocketGovernance,
  createGovernanceError,
  timingSafeEqualText,
  normalizeAddress,
};
