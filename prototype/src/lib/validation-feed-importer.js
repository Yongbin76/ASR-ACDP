const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { importValidationCases } = require('./platform-db');

const DEFAULT_FEED_SOURCES = ['cg3', 'qa_feedback', 'online_feedback'];

/**
 * 功能：确保 feed 目录存在。
 * 输入：`dirPath` 目录路径。
 * 输出：无显式返回。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：返回当前时间的 ISO 字符串。
 * 输入：无。
 * 输出：ISO 8601 时间字符串。
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * 功能：把任意来源标识标准化为小写 sourceType。
 * 输入：任意 sourceType 值。
 * 输出：标准化后的 sourceType 字符串。
 */
function normalizeSourceType(sourceType) {
  return String(sourceType || '').trim().toLowerCase();
}

/**
 * 功能：返回 validation feed source 的默认配置。
 * 输入：`sourceType` 来源类型。
 * 输出：默认 source 配置对象。
 */
function defaultFeedSourceDefinition(sourceType) {
  return {
    sourceType: normalizeSourceType(sourceType),
    enabled: true,
    description: normalizeSourceType(sourceType),
    transportType: 'file_inbox',
    endpoint: '',
    httpMethod: 'GET',
    timeoutMs: 10000,
    authType: 'none',
    authHeaderName: 'Authorization',
    authToken: '',
    authQueryKey: 'token',
    authValue: '',
    ackType: 'none',
    ackEndpoint: '',
    ackMethod: 'POST',
    retryMaxAttempts: 3,
    replayFromErrorDir: true,
  };
}

/**
 * 功能：基于配置构建所有 validation feed source 的目录与 connector 信息。
 * 输入：`appConfig` 应用配置对象。
 * 输出：包含 transport/目录信息的 source 数组。
 */
function configuredFeedSources(appConfig) {
  const inboxRoot = appConfig.resolvedPaths.validationFeedInboxDir;
  const archiveRoot = appConfig.resolvedPaths.validationFeedArchiveDir;
  const errorRoot = appConfig.resolvedPaths.validationFeedErrorDir;
  const receiptRoot = appConfig.resolvedPaths.validationFeedReceiptDir;
  const configured = Array.isArray((((appConfig || {}).validationFeedConnectors || {}).sources))
    ? appConfig.validationFeedConnectors.sources
    : [];
  const sourceMap = new Map();

  for (const source of configured) {
    const sourceType = normalizeSourceType(source.sourceType);
    if (!sourceType) {
      continue;
    }
    sourceMap.set(sourceType, {
      ...defaultFeedSourceDefinition(sourceType),
      ...source,
      sourceType,
    });
  }

  for (const sourceType of DEFAULT_FEED_SOURCES) {
    if (!sourceMap.has(sourceType)) {
      sourceMap.set(sourceType, defaultFeedSourceDefinition(sourceType));
    }
  }

  return Array.from(sourceMap.values())
    .sort((left, right) => left.sourceType.localeCompare(right.sourceType, 'en'))
    .map((source) => ({
      ...source,
      inboxDir: path.join(inboxRoot, source.sourceType),
      archiveDir: path.join(archiveRoot, source.sourceType),
      errorDir: path.join(errorRoot, source.sourceType),
      receiptDir: path.join(receiptRoot, source.sourceType),
    }));
}

/**
 * 功能：创建所有 feed source 目录。
 * 输入：`appConfig` 应用配置对象。
 * 输出：无显式返回。
 */
function ensureFeedDirectories(appConfig) {
  for (const source of configuredFeedSources(appConfig)) {
    ensureDir(source.inboxDir);
    ensureDir(source.archiveDir);
    ensureDir(source.errorDir);
    ensureDir(source.receiptDir);
  }
}

/**
 * 功能：列出目录中的 JSON 文件。
 * 输入：`dirPath` 目录路径。
 * 输出：JSON 文件绝对路径数组。
 */
function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs.readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((name) => path.join(dirPath, name));
}

/**
 * 功能：列出单个 source 的 delivery receipt 文件，不包含内部 cursor 状态文件。
 * 输入：receipt 目录路径。
 * 输出：delivery receipt 文件绝对路径数组。
 */
function listReceiptFiles(dirPath) {
  return listJsonFiles(dirPath).filter((filePath) => path.basename(filePath) !== '_cursor_state.json');
}

/**
 * 功能：返回 feed source 支持的原始 payload 格式说明。
 * 输入：`sourceType` 来源类型。
 * 输出：格式说明字符串。
 */
function acceptedFormatLabel(sourceType) {
  if (sourceType === 'cg3') return 'items[] | records[]';
  if (sourceType === 'qa_feedback') return 'items[] | feedbacks[]';
  if (sourceType === 'online_feedback') return 'items[] | events[]';
  return 'items[]';
}

/**
 * 功能：返回 feed source 的目录状态、connector 方式和 replay/receipt 信息。
 * 输入：`appConfig` 应用配置对象。
 * 输出：feed source 状态数组。
 */
function listValidationFeedSources(appConfig) {
  ensureFeedDirectories(appConfig);
  return configuredFeedSources(appConfig).map((source) => {
    const inboxFiles = listJsonFiles(source.inboxDir);
    const archiveFiles = listJsonFiles(source.archiveDir);
    const errorFiles = listJsonFiles(source.errorDir);
    const receiptFiles = listReceiptFiles(source.receiptDir);
    const cursorState = readFeedCursorState(source);
    return {
      sourceType: source.sourceType,
      enabled: source.enabled !== false,
      description: source.description || source.sourceType,
      transportType: source.transportType || 'file_inbox',
      inboxDir: source.inboxDir,
      archiveDir: source.archiveDir,
      errorDir: source.errorDir,
      receiptDir: source.receiptDir,
      pendingFileCount: inboxFiles.length,
      archivedFileCount: archiveFiles.length,
      errorFileCount: errorFiles.length,
      receiptFileCount: receiptFiles.length,
      pendingFiles: inboxFiles.map((filePath) => path.basename(filePath)),
      errorFiles: errorFiles.map((filePath) => path.basename(filePath)),
      acceptedFormat: acceptedFormatLabel(source.sourceType),
      endpointConfigured: Boolean(String(source.endpoint || '').trim()),
      cursorConfigured: Boolean(String(source.cursorQueryKey || '').trim()),
      cursorResponseField: String(source.cursorResponseField || '').trim(),
      currentCursor: String((cursorState || {}).cursorValue || '').trim(),
      ackType: source.ackType || 'none',
      retryMaxAttempts: Math.max(1, Number(source.retryMaxAttempts || 3)),
      replayFromErrorDir: source.replayFromErrorDir !== false,
    };
  });
}

/**
 * 功能：把 CG3 原始记录映射为统一 validation case 结构。
 * 输入：`item` 原始记录对象，`index` 兜底序号。
 * 输出：标准化 validation case 对象。
 */
function normalizeCg3Record(item = {}, index = 0) {
  const canonicals = Array.isArray(item.expectedCanonicals)
    ? item.expectedCanonicals
    : Array.isArray(item.canonicalTexts)
      ? item.canonicalTexts
      : [item.canonicalText];
  return {
    caseId: item.caseId || item.recordId || item.sampleId || `cg3_record_${index + 1}`,
    description: item.description || item.summary || item.title || 'cg3 sample',
    text: item.text || item.sampleText || item.snippet || item.utterance || '',
    expectedCanonicals: canonicals,
    notes: item.notes || item.note || '',
  };
}

/**
 * 功能：把质检反馈记录映射为统一 validation case 结构。
 * 输入：`item` 原始反馈对象，`index` 兜底序号。
 * 输出：标准化 validation case 对象。
 */
function normalizeQaFeedback(item = {}, index = 0) {
  return {
    caseId: item.caseId || item.feedbackId || item.ticketId || `qa_feedback_${index + 1}`,
    description: item.description || item.label || item.feedbackType || 'qa feedback sample',
    text: item.text || item.sampleText || item.utterance || item.transcript || '',
    expectedCanonicals: Array.isArray(item.expectedCanonicals)
      ? item.expectedCanonicals
      : [item.expectedCanonical || item.canonicalText || item.termCanonical],
    notes: item.notes || item.note || item.comment || '',
  };
}

/**
 * 功能：把线上反馈事件映射为统一 validation case 结构。
 * 输入：`item` 原始事件对象，`index` 兜底序号。
 * 输出：标准化 validation case 对象。
 */
function normalizeOnlineFeedback(item = {}, index = 0) {
  return {
    caseId: item.caseId || item.eventId || item.feedbackId || `online_feedback_${index + 1}`,
    description: item.description || item.scene || item.eventType || 'online feedback sample',
    text: item.text || item.transcript || item.sampleText || item.rawText || '',
    expectedCanonicals: Array.isArray(item.expectedCanonicals)
      ? item.expectedCanonicals
      : Array.isArray(item.expectedTerms)
        ? item.expectedTerms
        : [item.expectedCanonical || item.canonicalText],
    notes: item.notes || item.note || item.reason || '',
  };
}

/**
 * 功能：把不同来源的原始 payload 统一归一化为 validation case 数组。
 * 输入：`raw` 原始 payload，`sourceType` 来源类型。
 * 输出：标准化 validation case 数组。
 */
function normalizeFeedItems(raw, sourceType) {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (Array.isArray(raw.items)) {
    return raw.items;
  }
  if (sourceType === 'cg3' && Array.isArray(raw.records)) {
    return raw.records.map((item, index) => normalizeCg3Record(item, index));
  }
  if (sourceType === 'qa_feedback' && Array.isArray(raw.feedbacks)) {
    return raw.feedbacks.map((item, index) => normalizeQaFeedback(item, index));
  }
  if (sourceType === 'online_feedback' && Array.isArray(raw.events)) {
    return raw.events.map((item, index) => normalizeOnlineFeedback(item, index));
  }
  return [];
}

/**
 * 功能：为任意原始 payload 生成稳定 deliveryId。
 * 输入：原始 payload 与 sourceType。
 * 输出：deliveryId 字符串。
 */
function deliveryIdFromPayload(raw, sourceType) {
  const explicit = String(
    raw.deliveryId
    || raw.batchId
    || raw.cursor
    || raw.requestId
    || (((raw || {}).meta || {}).deliveryId)
    || ''
  ).trim();
  if (explicit) {
    return explicit;
  }
  const hash = crypto.createHash('sha256').update(JSON.stringify(raw || {})).digest('hex').slice(0, 16);
  return `${normalizeSourceType(sourceType) || 'feed'}_${hash}`;
}

/**
 * 功能：把原始 payload 规范为导入用 payload，并补齐 deliveryId。
 * 输入：原始 payload 和默认 sourceType。
 * 输出：包含 sourceType、mode、items、deliveryId 的导入 payload。
 */
function normalizeFeedPayload(raw, fallbackSourceType) {
  const normalizedSourceType = normalizeSourceType(raw.sourceType || fallbackSourceType);
  const items = normalizeFeedItems(raw, normalizedSourceType);
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error(`no supported feed items found for source ${normalizedSourceType}`);
    error.code = 'invalid_feed_payload';
    throw error;
  }
  return {
    sourceType: normalizedSourceType,
    mode: raw.mode || 'upsert',
    items,
    deliveryId: deliveryIdFromPayload(raw, normalizedSourceType),
  };
}

/**
 * 功能：读取并解析单个 feed 文件，可兼容 replay envelope。
 * 输入：`filePath` 文件路径，`sourceType` 来源类型。
 * 输出：标准化导入 payload。
 */
function readFeedPayload(filePath, sourceType) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  const payload = raw && raw.replayEnvelope === true && raw.payload ? raw.payload : raw;
  const normalized = normalizeFeedPayload(payload, raw.sourceType || sourceType);
  return {
    ...normalized,
    rawPayload: payload,
    replayEnvelope: raw && raw.replayEnvelope === true,
    replayMeta: raw && raw.replayEnvelope === true ? {
      deliveryId: String(raw.deliveryId || normalized.deliveryId).trim() || normalized.deliveryId,
      capturedAt: String(raw.capturedAt || '').trim(),
      transportType: String(raw.transportType || '').trim(),
      attempt: Number(raw.attempt || 1),
    } : null,
  };
}

/**
 * 功能：把处理后的 feed 文件移动到目标目录并附加时间戳。
 * 输入：`filePath` 原文件路径，`targetDir` 目标目录。
 * 输出：目标文件路径。
 */
function moveProcessedFile(filePath, targetDir) {
  ensureDir(targetDir);
  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  const targetPath = path.join(targetDir, `${timestamp}_${path.basename(filePath)}`);
  fs.renameSync(filePath, targetPath);
  return targetPath;
}

/**
 * 功能：返回单个 source 的 cursor 状态文件路径。
 * 输入：source 配置对象。
 * 输出：cursor 状态文件绝对路径。
 */
function cursorStateFilePath(source) {
  return path.join(source.receiptDir, '_cursor_state.json');
}

/**
 * 功能：读取单个 source 当前已确认推进的 cursor 状态。
 * 输入：source 配置对象。
 * 输出：cursor 状态对象；不存在时返回 `null`。
 */
function readFeedCursorState(source) {
  const filePath = cursorStateFilePath(source);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：写入单个 source 当前已确认推进的 cursor 状态。
 * 输入：source 配置对象和 cursor 载荷。
 * 输出：写入后的 cursor 状态对象。
 */
function writeFeedCursorState(source, payload = {}) {
  ensureDir(source.receiptDir);
  const nextState = {
    sourceType: source.sourceType,
    cursorValue: String(payload.cursorValue || '').trim(),
    fromDeliveryId: String(payload.fromDeliveryId || '').trim(),
    updatedAt: nowIso(),
  };
  fs.writeFileSync(cursorStateFilePath(source), JSON.stringify(nextState, null, 2), 'utf8');
  return nextState;
}

/**
 * 功能：按点路径从对象中读取字段值。
 * 输入：对象和字段路径字符串。
 * 输出：命中的字段值；未命中时返回 `undefined`。
 */
function readObjectPath(value, pathText) {
  const pathSegments = String(pathText || '').trim().split('.').filter(Boolean);
  if (pathSegments.length === 0) {
    return undefined;
  }
  let current = value;
  for (const segment of pathSegments) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

/**
 * 功能：返回当前 source 拉取远端时应使用的 cursor。
 * 输入：source 配置对象。
 * 输出：cursor 字符串；未配置时返回空字符串。
 */
function effectivePullCursor(source) {
  const current = readFeedCursorState(source);
  if (current && String(current.cursorValue || '').trim()) {
    return String(current.cursorValue || '').trim();
  }
  return String(source.initialCursor || '').trim();
}

/**
 * 功能：为 deliveryId 生成稳定的 receipt 文件路径。
 * 输入：source 配置对象、deliveryId。
 * 输出：receipt 文件绝对路径。
 */
function receiptFilePath(source, deliveryId) {
  const safeDeliveryId = String(deliveryId || '').replace(/[^a-zA-Z0-9._-]+/g, '_') || 'delivery';
  return path.join(source.receiptDir, `${safeDeliveryId}.json`);
}

/**
 * 功能：读取单个 delivery 的 connector receipt。
 * 输入：source 配置对象、deliveryId。
 * 输出：receipt 对象；不存在时返回 `null`。
 */
function readFeedReceipt(source, deliveryId) {
  const filePath = receiptFilePath(source, deliveryId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：写入单个 delivery 的 connector receipt。
 * 输入：source 配置对象、deliveryId 和 receipt 载荷。
 * 输出：写入后的 receipt 对象。
 */
function writeFeedReceipt(source, deliveryId, payload = {}) {
  ensureDir(source.receiptDir);
  const receipt = {
    sourceType: source.sourceType,
    transportType: source.transportType,
    deliveryId,
    updatedAt: nowIso(),
    ...payload,
  };
  fs.writeFileSync(receiptFilePath(source, deliveryId), JSON.stringify(receipt, null, 2), 'utf8');
  return receipt;
}

/**
 * 功能：把失败或待重放的远端 payload 落到 error 目录。
 * 输入：source 配置、原始 payload、deliveryId、错误对象和尝试次数。
 * 输出：error 文件路径。
 */
function writeReplayEnvelope(source, rawPayload, deliveryId, error, attempt = 1) {
  ensureDir(source.errorDir);
  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  const safeDeliveryId = String(deliveryId || '').replace(/[^a-zA-Z0-9._-]+/g, '_') || 'delivery';
  const filePath = path.join(source.errorDir, `${timestamp}_${safeDeliveryId}.json`);
  fs.writeFileSync(filePath, JSON.stringify({
    replayEnvelope: true,
    sourceType: source.sourceType,
    transportType: source.transportType,
    deliveryId,
    attempt,
    capturedAt: nowIso(),
    error: {
      message: String((error || {}).message || ''),
      code: String((error || {}).code || ''),
    },
    payload: rawPayload,
  }, null, 2), 'utf8');
  return filePath;
}

/**
 * 功能：为远端 connector 构建实际请求 URL，可选附加 query 认证参数。
 * 输入：基准 URL 和 source 配置。
 * 输出：最终请求 URL 字符串。
 */
function buildConnectorUrl(baseUrl, source, cursorValue = '') {
  const url = new URL(String(baseUrl || '').trim());
  if (source.authType === 'query') {
    const authValue = String(source.authValue || source.authToken || '').trim();
    if (!authValue) {
      const error = new Error(`query auth value missing for source ${source.sourceType}`);
      error.code = 'validation_feed_query_auth_missing';
      throw error;
    }
    url.searchParams.set(String(source.authQueryKey || 'token').trim() || 'token', authValue);
  }
  const cursorKey = String(source.cursorQueryKey || '').trim();
  if (cursorKey && String(cursorValue || '').trim()) {
    url.searchParams.set(cursorKey, String(cursorValue || '').trim());
  }
  return url.toString();
}

/**
 * 功能：为远端 connector 构建请求头。
 * 输入：source 配置和是否附加 JSON content-type。
 * 输出：请求头对象。
 */
function buildConnectorHeaders(source, includeJsonContentType = false) {
  const headers = {};
  if (includeJsonContentType) {
    headers['content-type'] = 'application/json; charset=utf-8';
  }
  if (source.authType === 'bearer') {
    const token = String(source.authToken || '').trim();
    if (!token) {
      const error = new Error(`bearer token missing for source ${source.sourceType}`);
      error.code = 'validation_feed_bearer_token_missing';
      throw error;
    }
    headers.authorization = `Bearer ${token}`;
  } else if (source.authType === 'header') {
    const headerName = String(source.authHeaderName || '').trim();
    const headerValue = String(source.authValue || '').trim();
    if (!headerName || !headerValue) {
      const error = new Error(`header auth config missing for source ${source.sourceType}`);
      error.code = 'validation_feed_header_auth_missing';
      throw error;
    }
    headers[headerName] = headerValue;
  }
  return headers;
}

/**
 * 功能：从远端 HTTP connector 拉取一批 validation feed payload。
 * 输入：source 配置对象。
 * 输出：拉取结果对象；无内容时返回 `null`。
 */
async function pullHttpFeedPayload(source) {
  const endpoint = String(source.endpoint || '').trim();
  if (!endpoint) {
    const error = new Error(`validation feed endpoint missing for source ${source.sourceType}`);
    error.code = 'validation_feed_endpoint_missing';
    throw error;
  }
  const timeoutMs = Math.max(1000, Number(source.timeoutMs || 10000));
  const pulledCursor = effectivePullCursor(source);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(buildConnectorUrl(endpoint, source, pulledCursor), {
      method: String(source.httpMethod || 'GET').toUpperCase() || 'GET',
      headers: buildConnectorHeaders(source, false),
      signal: controller.signal,
    });
    if (response.status === 204) {
      return null;
    }
    if (!response.ok) {
      const error = new Error(`validation feed pull failed: ${response.status} ${response.statusText}`);
      error.code = 'validation_feed_pull_failed';
      throw error;
    }
    const text = await response.text();
    if (!text.trim()) {
      return null;
    }
    const rawPayload = JSON.parse(text);
    const payload = normalizeFeedPayload(rawPayload, source.sourceType);
    const nextCursorValue = String(readObjectPath(rawPayload, source.cursorResponseField) || '').trim();
    return {
      rawPayload,
      payload,
      deliveryId: payload.deliveryId,
      transportType: source.transportType,
      pulledCursor,
      nextCursorValue,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 功能：向外部系统回传某个 delivery 的导入确认。
 * 输入：source 配置、deliveryId 和导入结果。
 * 输出：ack 结果对象；未启用 ack 时返回跳过结果。
 */
async function acknowledgeImportedFeed(source, deliveryId, importResult = {}, deliveryMeta = {}) {
  if (source.ackType !== 'http_post') {
    return {
      skipped: true,
      ackType: 'none',
    };
  }
  const endpoint = String(source.ackEndpoint || '').trim();
  if (!endpoint) {
    const error = new Error(`validation feed ack endpoint missing for source ${source.sourceType}`);
    error.code = 'validation_feed_ack_endpoint_missing';
    throw error;
  }
  const timeoutMs = Math.max(1000, Number(source.timeoutMs || 10000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(buildConnectorUrl(endpoint, source), {
      method: String(source.ackMethod || 'POST').toUpperCase() || 'POST',
      headers: buildConnectorHeaders(source, true),
      body: JSON.stringify({
        sourceType: source.sourceType,
        deliveryId,
        mode: importResult.mode || 'upsert',
        result: {
          total: Number(importResult.total || 0),
          createdCount: Number(importResult.createdCount || 0),
          updatedCount: Number(importResult.updatedCount || 0),
          skippedCount: Number(importResult.skippedCount || 0),
        },
        pulledCursor: source.includeCursorInAck === true ? String(deliveryMeta.pulledCursor || '').trim() : '',
        nextCursor: source.includeCursorInAck === true ? String(deliveryMeta.nextCursorValue || '').trim() : '',
        acknowledgedAt: nowIso(),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error(`validation feed ack failed: ${response.status} ${response.statusText}`);
      error.code = 'validation_feed_ack_failed';
      throw error;
    }
    return {
      skipped: false,
      ackType: source.ackType,
      statusCode: response.status,
      acknowledgedAt: nowIso(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 功能：尝试处理一批远端 delivery，并写入 receipt / replay 文件。
 * 输入：数据库、source 配置、原始 payload、导入 payload、操作人和尝试次数。
 * 输出：delivery 处理结果对象。
 */
async function importHttpDelivery(db, source, rawPayload, payload, operator, attempt = 1, deliveryMeta = {}) {
  const deliveryId = String(payload.deliveryId || deliveryIdFromPayload(rawPayload, source.sourceType)).trim();
  const receipt = readFeedReceipt(source, deliveryId);

  if (receipt && receipt.status === 'imported') {
    if (String(receipt.nextCursorValue || '').trim()) {
      writeFeedCursorState(source, {
        cursorValue: receipt.nextCursorValue,
        fromDeliveryId: deliveryId,
      });
    }
    return {
      deliveryId,
      status: 'duplicate_skipped',
      receipt,
    };
  }

  if (receipt && receipt.status === 'imported_ack_failed') {
    const ackResult = await acknowledgeImportedFeed(source, deliveryId, receipt.importResult || payload, {
      pulledCursor: receipt.pulledCursor || deliveryMeta.pulledCursor || '',
      nextCursorValue: receipt.nextCursorValue || deliveryMeta.nextCursorValue || '',
    });
    const updatedReceipt = writeFeedReceipt(source, deliveryId, {
      status: 'imported',
      importedAt: receipt.importedAt || nowIso(),
      ackResult,
      pulledCursor: receipt.pulledCursor || deliveryMeta.pulledCursor || '',
      nextCursorValue: receipt.nextCursorValue || deliveryMeta.nextCursorValue || '',
      importResult: receipt.importResult || {
        sourceType: payload.sourceType,
        mode: payload.mode,
        total: payload.items.length,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: payload.items.length,
      },
    });
    if (String(updatedReceipt.nextCursorValue || '').trim()) {
      writeFeedCursorState(source, {
        cursorValue: updatedReceipt.nextCursorValue,
        fromDeliveryId: deliveryId,
      });
    }
    return {
      deliveryId,
      status: 'ack_recovered',
      receipt: updatedReceipt,
      importResult: updatedReceipt.importResult,
      ackResult,
    };
  }

  try {
    const importResult = importValidationCases(db, payload, operator);
    try {
      const ackResult = await acknowledgeImportedFeed(source, deliveryId, importResult, deliveryMeta);
      const updatedReceipt = writeFeedReceipt(source, deliveryId, {
        status: 'imported',
        importedAt: nowIso(),
        attempt,
        importResult,
        ackResult,
        pulledCursor: String(deliveryMeta.pulledCursor || '').trim(),
        nextCursorValue: String(deliveryMeta.nextCursorValue || '').trim(),
      });
      if (String(updatedReceipt.nextCursorValue || '').trim()) {
        writeFeedCursorState(source, {
          cursorValue: updatedReceipt.nextCursorValue,
          fromDeliveryId: deliveryId,
        });
      }
      return {
        deliveryId,
        status: 'imported',
        receipt: updatedReceipt,
        importResult,
        ackResult,
      };
    } catch (error) {
      const replayPath = writeReplayEnvelope(source, rawPayload, deliveryId, error, attempt);
      const updatedReceipt = writeFeedReceipt(source, deliveryId, {
        status: 'imported_ack_failed',
        importedAt: nowIso(),
        attempt,
        importResult,
        error: {
          code: String(error.code || ''),
          message: String(error.message || ''),
        },
        pulledCursor: String(deliveryMeta.pulledCursor || '').trim(),
        nextCursorValue: String(deliveryMeta.nextCursorValue || '').trim(),
        replayPath,
      });
      error.replayPath = replayPath;
      error.receipt = updatedReceipt;
      throw error;
    }
  } catch (error) {
    if (error.code === 'validation_feed_ack_failed') {
      throw error;
    }
    const replayPath = writeReplayEnvelope(source, rawPayload, deliveryId, error, attempt);
    const updatedReceipt = writeFeedReceipt(source, deliveryId, {
      status: 'failed',
      attempt,
      error: {
        code: String(error.code || ''),
        message: String(error.message || ''),
      },
      replayPath,
    });
    error.replayPath = replayPath;
    error.receipt = updatedReceipt;
    throw error;
  }
}

/**
 * 功能：把 sourceTypes 选项标准化为去重后的数组。
 * 输入：导入选项对象。
 * 输出：sourceType 数组。
 */
function normalizedSelectedSourceTypes(options = {}) {
  return Array.from(new Set((Array.isArray(options.sourceTypes) ? options.sourceTypes : [])
    .map((item) => normalizeSourceType(item))
    .filter(Boolean)));
}

/**
 * 功能：根据导入选项过滤当前应执行的 source。
 * 输入：应用配置对象和导入选项。
 * 输出：待执行 source 数组。
 */
function selectedFeedSources(appConfig, options = {}) {
  const selectedTypes = normalizedSelectedSourceTypes(options);
  return configuredFeedSources(appConfig)
    .filter((source) => source.enabled !== false)
    .filter((source) => selectedTypes.length === 0 || selectedTypes.includes(source.sourceType));
}

/**
 * 功能：创建单个 source 的导入汇总对象。
 * 输入：source 配置对象。
 * 输出：source 汇总对象。
 */
function createSourceSummary(source) {
  return {
    sourceType: source.sourceType,
    transportType: source.transportType,
    inboxDir: source.inboxDir,
    archiveDir: source.archiveDir,
    errorDir: source.errorDir,
    receiptDir: source.receiptDir,
    fileCount: 0,
    replayFileCount: 0,
    pulledBatchCount: 0,
    duplicateSkippedCount: 0,
    ackedCount: 0,
    ackFailedCount: 0,
    importedFiles: [],
    failedFiles: [],
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
  };
}

/**
 * 功能：把单次成功导入结果累计进 source/全局汇总。
 * 输入：总汇总、source 汇总和导入结果。
 * 输出：无显式返回。
 */
function accumulateImportResult(summary, sourceSummary, importResult = {}) {
  sourceSummary.createdCount += Number(importResult.createdCount || 0);
  sourceSummary.updatedCount += Number(importResult.updatedCount || 0);
  sourceSummary.skippedCount += Number(importResult.skippedCount || 0);
  summary.importedCount += Number(importResult.createdCount || 0);
  summary.updatedCount += Number(importResult.updatedCount || 0);
  summary.skippedCount += Number(importResult.skippedCount || 0);
}

/**
 * 功能：处理 file_inbox connector 的待导入文件。
 * 输入：数据库、source、操作人、全局汇总、source 汇总和导入选项。
 * 输出：Promise，解析值为空。
 */
async function importFileInboxSource(db, source, operator, summary, sourceSummary, options = {}) {
  const inboxFiles = listJsonFiles(source.inboxDir);
  const replayFiles = options.replayErrors && source.replayFromErrorDir !== false ? listJsonFiles(source.errorDir) : [];
  const files = inboxFiles.concat(replayFiles);
  sourceSummary.fileCount = inboxFiles.length;
  sourceSummary.replayFileCount = replayFiles.length;
  summary.fileCount += inboxFiles.length;
  summary.replayFileCount += replayFiles.length;

  for (const filePath of files) {
    const replayMode = replayFiles.includes(filePath);
    try {
      const payload = readFeedPayload(filePath, source.sourceType);
      const result = importValidationCases(db, payload, operator);
      const archivedPath = moveProcessedFile(filePath, source.archiveDir);
      sourceSummary.importedFiles.push({
        filePath,
        archivedPath,
        total: result.total,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
        replayMode,
      });
      accumulateImportResult(summary, sourceSummary, result);
    } catch (error) {
      const errorPath = moveProcessedFile(filePath, source.errorDir);
      sourceSummary.failedFiles.push({
        filePath,
        errorPath,
        error: error.message,
        code: error.code || '',
        replayMode,
      });
      sourceSummary.failedCount += 1;
      summary.failedCount += 1;
    }
  }
}

/**
 * 功能：处理 HTTP connector 已落入 error 目录的 replay 文件。
 * 输入：数据库、source、操作人、全局汇总和 source 汇总。
 * 输出：Promise，解析值为空。
 */
async function importHttpReplayFiles(db, source, operator, summary, sourceSummary) {
  const replayFiles = listJsonFiles(source.errorDir);
  sourceSummary.replayFileCount = replayFiles.length;
  summary.replayFileCount += replayFiles.length;

  for (const filePath of replayFiles) {
    try {
      const payload = readFeedPayload(filePath, source.sourceType);
      const result = await importHttpDelivery(
        db,
        source,
        payload.rawPayload,
        payload,
        operator,
        (payload.replayMeta || {}).attempt || 1,
        {
          pulledCursor: (payload.replayMeta || {}).pulledCursor || '',
          nextCursorValue: (payload.replayMeta || {}).nextCursorValue || '',
        }
      );
      const archivedPath = moveProcessedFile(filePath, source.archiveDir);
      if (result.status === 'duplicate_skipped') {
        sourceSummary.duplicateSkippedCount += 1;
      } else if (result.status === 'ack_recovered') {
        // ack recovery only retries the acknowledgement and should not count as a fresh import.
      } else {
        accumulateImportResult(summary, sourceSummary, result.importResult || {});
      }
      if (result.ackResult && result.ackResult.skipped === false) {
        sourceSummary.ackedCount += 1;
        summary.ackedCount += 1;
      }
      sourceSummary.importedFiles.push({
        filePath,
        archivedPath,
        deliveryId: result.deliveryId,
        status: result.status,
        replayMode: true,
      });
    } catch (error) {
      if (error.code === 'validation_feed_ack_failed' && error.receipt && error.receipt.importResult) {
        accumulateImportResult(summary, sourceSummary, error.receipt.importResult);
      }
      sourceSummary.failedFiles.push({
        filePath,
        errorPath: error.replayPath || filePath,
        error: error.message,
        code: error.code || '',
        replayMode: true,
      });
      if (error.code === 'validation_feed_ack_failed') {
        sourceSummary.ackFailedCount += 1;
        summary.ackFailedCount += 1;
      } else {
        sourceSummary.failedCount += 1;
        summary.failedCount += 1;
      }
    }
  }
}

/**
 * 功能：处理 HTTP pull connector 的实时拉取。
 * 输入：数据库、source、操作人、全局汇总和 source 汇总。
 * 输出：Promise，解析值为空。
 */
async function importHttpPullSource(db, source, operator, summary, sourceSummary) {
  const pulled = await pullHttpFeedPayload(source);
  if (!pulled) {
    return;
  }
  sourceSummary.pulledBatchCount += 1;
  summary.pulledBatchCount += 1;

  try {
    const result = await importHttpDelivery(db, source, pulled.rawPayload, pulled.payload, operator, 1, {
      pulledCursor: pulled.pulledCursor,
      nextCursorValue: pulled.nextCursorValue,
    });
    if (result.status === 'duplicate_skipped') {
      sourceSummary.duplicateSkippedCount += 1;
      summary.duplicateSkippedCount += 1;
      return;
    }
    accumulateImportResult(summary, sourceSummary, result.importResult || {});
    if (result.ackResult && result.ackResult.skipped === false) {
      sourceSummary.ackedCount += 1;
      summary.ackedCount += 1;
    }
  } catch (error) {
    if (error.code === 'validation_feed_ack_failed' && error.receipt && error.receipt.importResult) {
      accumulateImportResult(summary, sourceSummary, error.receipt.importResult);
    }
    if (error.code === 'validation_feed_ack_failed') {
      sourceSummary.ackFailedCount += 1;
      summary.ackFailedCount += 1;
    } else {
      sourceSummary.failedCount += 1;
      summary.failedCount += 1;
    }
    sourceSummary.failedFiles.push({
      deliveryId: pulled.deliveryId,
      errorPath: error.replayPath || '',
      error: error.message,
      code: error.code || '',
      replayMode: false,
    });
  }
}

/**
 * 功能：批量扫描并导入所有 feed source 的待处理文件或远端 batch。
 * 输入：数据库连接、应用配置、操作人和导入选项。
 * 输出：包含各来源导入/失败统计的汇总对象。
 */
async function importValidationFeeds(db, appConfig, operator = 'system', options = {}) {
  ensureFeedDirectories(appConfig);
  const summary = {
    sourceCount: 0,
    fileCount: 0,
    replayFileCount: 0,
    pulledBatchCount: 0,
    importedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    duplicateSkippedCount: 0,
    failedCount: 0,
    ackedCount: 0,
    ackFailedCount: 0,
    sources: [],
  };

  for (const source of selectedFeedSources(appConfig, options)) {
    const sourceSummary = createSourceSummary(source);
    summary.sourceCount += 1;
    if (source.transportType === 'http_pull_json') {
      if (options.replayErrors && source.replayFromErrorDir !== false) {
        await importHttpReplayFiles(db, source, operator, summary, sourceSummary);
      }
      await importHttpPullSource(db, source, operator, summary, sourceSummary);
    } else {
      await importFileInboxSource(db, source, operator, summary, sourceSummary, options);
    }
    summary.sources.push(sourceSummary);
  }

  return summary;
}

module.exports = {
  DEFAULT_FEED_SOURCES,
  configuredFeedSources,
  ensureFeedDirectories,
  listValidationFeedSources,
  normalizeFeedItems,
  normalizeFeedPayload,
  readFeedPayload,
  deliveryIdFromPayload,
  importValidationFeeds,
};
