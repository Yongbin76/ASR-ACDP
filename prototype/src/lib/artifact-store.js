const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

const RELEASES_PREFIX = 'releases';
const RUNTIME_ARTIFACT_DOWNLOAD_PATH_PREFIX = '/api/runtime-artifacts/releases';
const RUNTIME_ALLOWED_ARTIFACT_FILES = new Set(['manifest.json', 'snapshot.json', 'package.tar.gz']);

/**
 * 功能：清洗对象存储 key 片段并用 `/` 拼接。
 * 输入：任意 key 片段数组。
 * 输出：规范化后的对象 key。
 */
function joinArtifactKey(...segments) {
  return segments
    .map((segment) => String(segment || '').trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

/**
 * 功能：为某个 release 生成标准制品 key。
 * 输入：`releaseId` 和 `fileName`。
 * 输出：`releases/<releaseId>/<fileName>` 形式的对象 key。
 */
function buildReleaseArtifactKey(releaseId, fileName) {
  return joinArtifactKey(RELEASES_PREFIX, releaseId, fileName);
}

/**
 * 功能：根据文件名推断内容类型。
 * 输入：`fileName` 文件名。
 * 输出：content-type 字符串。
 */
function contentTypeForFileName(fileName) {
  const normalized = String(fileName || '').trim().toLowerCase();
  if (normalized.endsWith('.json')) {
    return 'application/json';
  }
  if (normalized.endsWith('.tar.gz')) {
    return 'application/gzip';
  }
  return 'application/octet-stream';
}

/**
 * 功能：计算本地文件的 SHA-256。
 * 输入：`filePath` 本地文件路径。
 * 输出：十六进制摘要字符串。
 */
function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

/**
 * 功能：计算任意 Buffer 或字符串的 SHA-256 十六进制摘要。
 * 输入：`value`，可为 Buffer 或字符串。
 * 输出：十六进制摘要字符串。
 */
function sha256Hex(value) {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.isBuffer(value) ? value : Buffer.from(String(value || ''), 'utf8'));
  return hash.digest('hex');
}

/**
 * 功能：使用 HMAC-SHA256 对输入数据签名。
 * 输入：`key` 签名密钥，`value` 待签名文本。
 * 输出：签名结果 Buffer。
 */
function hmacSha256(key, value) {
  return crypto.createHmac('sha256', key).update(String(value || ''), 'utf8').digest();
}

/**
 * 功能：确保指定目录存在，不存在时递归创建。
 * 输入：`dirPath` 目录路径。
 * 输出：无显式返回。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：校验并规范化 runtime 可下载的制品文件名。
 * 输入：原始文件名。
 * 输出：合法文件名；非法时返回空串。
 */
function normalizeRuntimeArtifactFileName(fileName = '') {
  const normalized = path.posix.basename(String(fileName || '').trim());
  return RUNTIME_ALLOWED_ARTIFACT_FILES.has(normalized) ? normalized : '';
}

/**
 * 功能：获取当前 runtime 快照下发模式。
 * 输入：应用配置对象或直接的 runtimeDelivery 配置对象。
 * 输出：`file`、`admin_http_signed` 或 `minio`。
 */
function runtimeDeliveryMode(appConfigOrRuntimeDelivery = {}) {
  const runtimeDelivery = appConfigOrRuntimeDelivery && appConfigOrRuntimeDelivery.runtimeDelivery
    ? appConfigOrRuntimeDelivery.runtimeDelivery
    : appConfigOrRuntimeDelivery;
  const mode = String((runtimeDelivery || {}).mode || '').trim().toLowerCase();
  return ['file', 'admin_http_signed', 'minio'].includes(mode) ? mode : 'file';
}

/**
 * 功能：构造 runtime 快照下载签名的规范化原文。
 * 输入：签名载荷对象与 runtimeDelivery 配置对象。
 * 输出：稳定的签名原文字符串。
 */
function runtimeArtifactSignaturePayload(payload = {}, runtimeDelivery = {}) {
  const normalizedFileName = normalizeRuntimeArtifactFileName(payload.fileName || '');
  const bindNodeId = (runtimeDelivery || {}).bindNodeId !== false;
  const bindConfigVersion = (runtimeDelivery || {}).bindConfigVersion !== false;
  return [
    `releaseId=${String(payload.releaseId || '').trim()}`,
    `fileName=${normalizedFileName}`,
    `nodeId=${bindNodeId ? String(payload.nodeId || '').trim() : ''}`,
    `expires=${String(payload.expires || '').trim()}`,
    `configVersion=${bindConfigVersion ? String(payload.configVersion || '').trim() : ''}`,
  ].join('\n');
}

/**
 * 功能：为 runtime 快照下载链接生成签名。
 * 输入：签名密钥、签名载荷对象与 runtimeDelivery 配置。
 * 输出：十六进制签名字符串。
 */
function signRuntimeArtifactDownload(secret, payload = {}, runtimeDelivery = {}) {
  const normalizedSecret = String(secret || '').trim();
  if (!normalizedSecret) {
    return '';
  }
  return crypto
    .createHmac('sha256', normalizedSecret)
    .update(runtimeArtifactSignaturePayload(payload, runtimeDelivery), 'utf8')
    .digest('hex');
}

/**
 * 功能：使用常量时间比较校验 runtime 快照下载签名。
 * 输入：签名密钥、签名载荷、待校验签名与 runtimeDelivery 配置。
 * 输出：布尔值。
 */
function verifyRuntimeArtifactDownloadSignature(secret, payload = {}, signature, runtimeDelivery = {}) {
  const expected = Buffer.from(signRuntimeArtifactDownload(secret, payload, runtimeDelivery), 'hex');
  const actualValue = String(signature || '').trim();
  if (!expected.length || !/^[0-9a-f]+$/i.test(actualValue) || actualValue.length !== expected.length * 2) {
    return false;
  }
  const actual = Buffer.from(actualValue, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(expected, actual);
}

/**
 * 功能：校验 runtime 快照下载请求参数。
 * 输入：应用配置对象和请求载荷对象。
 * 输出：规范化后的下载请求对象；非法时抛错。
 */
function validateRuntimeArtifactDownloadRequest(appConfig = {}, payload = {}) {
  const runtimeDelivery = (appConfig || {}).runtimeDelivery || {};
  const releaseId = String(payload.releaseId || '').trim();
  const fileName = normalizeRuntimeArtifactFileName(payload.fileName || '');
  if (!fileName) {
    const error = new Error(`runtime artifact file is not allowed: ${payload.fileName || ''}`);
    error.statusCode = 403;
    error.code = 'runtime_artifact_file_not_allowed';
    throw error;
  }
  const nodeId = String(payload.nodeId || '').trim();
  if (runtimeDelivery.bindNodeId !== false && !nodeId) {
    const error = new Error('runtime artifact nodeId is required');
    error.statusCode = 400;
    error.code = 'runtime_artifact_node_id_required';
    throw error;
  }
  const expires = Number(payload.expires || 0);
  if (!Number.isFinite(expires) || expires <= 0) {
    const error = new Error('runtime artifact expires is invalid');
    error.statusCode = 400;
    error.code = 'runtime_artifact_signature_invalid';
    throw error;
  }
  if (Math.floor(Date.now() / 1000) > Math.floor(expires)) {
    const error = new Error('runtime artifact signature has expired');
    error.statusCode = 403;
    error.code = 'runtime_artifact_signature_expired';
    throw error;
  }
  if (runtimeDelivery.bindConfigVersion !== false && !String(payload.configVersion || '').trim()) {
    const error = new Error('runtime artifact configVersion is required');
    error.statusCode = 400;
    error.code = 'runtime_artifact_signature_invalid';
    throw error;
  }
  const secret = String(runtimeDelivery.signedUrlSecret || '').trim();
  if (!secret) {
    const error = new Error('runtime artifact signed url secret is not configured');
    error.statusCode = 500;
    error.code = 'runtime_artifact_signing_not_configured';
    throw error;
  }
  const normalized = {
    releaseId,
    fileName,
    nodeId,
    expires: String(Math.floor(expires)),
    configVersion: String(payload.configVersion || '').trim(),
  };
  if (!verifyRuntimeArtifactDownloadSignature(secret, normalized, payload.signature, runtimeDelivery)) {
    const error = new Error('runtime artifact signature is invalid');
    error.statusCode = 403;
    error.code = 'runtime_artifact_signature_invalid';
    throw error;
  }
  return normalized;
}

/**
 * 功能：为 admin_http_signed 模式构造 runtime 可直接下载的 URL。
 * 输入：应用配置对象与下载参数。
 * 输出：下载 URL；缺少关键配置时返回空串。
 */
function buildAdminRuntimeArtifactUrl(appConfig = {}, payload = {}) {
  const runtimeDelivery = (appConfig || {}).runtimeDelivery || {};
  const baseUrl = String(runtimeDelivery.adminArtifactBaseUrl || '').trim();
  const secret = String(runtimeDelivery.signedUrlSecret || '').trim();
  const releaseId = String(payload.releaseId || '').trim();
  const fileName = normalizeRuntimeArtifactFileName(payload.fileName || '');
  if (!baseUrl || !secret || !releaseId || !fileName) {
    return '';
  }
  const nodeId = String(payload.nodeId || '').trim();
  if (runtimeDelivery.bindNodeId !== false && !nodeId) {
    return '';
  }
  const configVersion = String(payload.configVersion || '').trim();
  if (runtimeDelivery.bindConfigVersion !== false && !configVersion) {
    return '';
  }
  const expires = Math.floor(Date.now() / 1000) + Math.max(1, Number(runtimeDelivery.signedUrlExpiresSeconds || 300));
  const signingPayload = {
    releaseId,
    fileName,
    nodeId,
    expires: String(expires),
    configVersion,
  };
  const signature = signRuntimeArtifactDownload(secret, signingPayload, runtimeDelivery);
  const url = new URL(`${RUNTIME_ARTIFACT_DOWNLOAD_PATH_PREFIX}/${encodeURIComponent(releaseId)}/${encodeURIComponent(fileName)}`, baseUrl.replace(/\/+$/, '/') || '/');
  if (runtimeDelivery.bindNodeId !== false) {
    url.searchParams.set('nodeId', nodeId);
  }
  url.searchParams.set('expires', String(expires));
  if (runtimeDelivery.bindConfigVersion !== false) {
    url.searchParams.set('configVersion', configVersion);
  }
  url.searchParams.set('signature', signature);
  return url.toString();
}

/**
 * 功能：把对象 key 解析为对象访问 URL。
 * 输入：baseUrl、bucket、key 和访问风格。
 * 输出：对象 URL 字符串；baseUrl 缺失时返回空串。
 */
function buildObjectUrl(baseUrl, bucket, key, accessStyle = 'path') {
  const normalizedBaseUrl = String(baseUrl || '').trim();
  if (!normalizedBaseUrl) {
    return '';
  }
  const normalizedBucket = String(bucket || '').trim();
  const normalizedKey = String(key || '').trim().replace(/^\/+/, '');
  const url = new URL(normalizedBaseUrl);
  if (url.protocol === 'file:') {
    url.pathname = path.posix.join(url.pathname || '/', normalizedBucket, normalizedKey);
    return url.toString();
  }
  if (String(accessStyle || 'path').trim().toLowerCase() === 'virtual_host' && normalizedBucket) {
    url.hostname = `${normalizedBucket}.${url.hostname}`;
    url.pathname = `/${normalizedKey}`;
    return url.toString();
  }
  url.pathname = `/${joinArtifactKey(normalizedBucket, normalizedKey)}`;
  return url.toString();
}

/**
 * 功能：把对象描述中的文件 URL 收集为唯一目标列表。
 * 输入：制品描述对象。
 * 输出：唯一的目标 URL 字符串数组。
 */
function artifactTargetUrls(descriptor = {}) {
  return Array.from(new Set([
    String(descriptor.objectUrl || '').trim(),
    String(descriptor.publicUrl || '').trim(),
  ].filter(Boolean)));
}

/**
 * 功能：判断某个 URL 是否为本地 `file://` 协议。
 * 输入：URL 字符串。
 * 输出：布尔值；可解析且协议为 `file:` 时返回 `true`。
 */
function isFileArtifactUrl(url) {
  try {
    return new URL(String(url || '').trim()).protocol === 'file:';
  } catch {
    return false;
  }
}

/**
 * 功能：把 `file://` 对象 URL 解析为本地文件路径。
 * 输入：对象 URL 字符串。
 * 输出：本地绝对路径；无效时抛错。
 */
function artifactFilePathFromUrl(url) {
  const parsed = new URL(String(url || '').trim());
  if (parsed.protocol !== 'file:') {
    const error = new Error(`artifact file sync requires file:// target, received ${parsed.protocol || 'unknown'}`);
    error.code = 'artifact_store_sync_target_invalid';
    throw error;
  }
  return fileURLToPath(parsed);
}

/**
 * 功能：把对象 key 编码为 S3/MinIO 兼容的规范路径。
 * 输入：对象 key 字符串。
 * 输出：带前导 `/` 的规范路径。
 */
function encodeArtifactKeyForPath(key = '') {
  const segments = String(key || '').split('/').map((segment) => encodeURIComponent(segment));
  return `/${segments.join('/')}`.replace(/\/+/g, '/');
}

/**
 * 功能：规范化 SigV4 所需的请求头值。
 * 输入：请求头值。
 * 输出：去除多余空白后的字符串。
 */
function canonicalHeaderValue(value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
}

/**
 * 功能：把请求头对象转成 SigV4 规范头串与已签名头列表。
 * 输入：请求头对象。
 * 输出：包含 `canonicalHeaders` 和 `signedHeaders` 的对象。
 */
function canonicalizeHeaders(headers = {}) {
  const entries = Object.entries(headers)
    .map(([key, value]) => [String(key || '').trim().toLowerCase(), canonicalHeaderValue(value)])
    .filter(([key, value]) => key && value !== '')
    .sort((left, right) => left[0].localeCompare(right[0]));
  return {
    canonicalHeaders: entries.map(([key, value]) => `${key}:${value}\n`).join(''),
    signedHeaders: entries.map(([key]) => key).join(';'),
  };
}

/**
 * 功能：生成 AWS SigV4 所需的时间戳片段。
 * 输入：可选 `date` 对象，默认使用当前时间。
 * 输出：包含 `amzDate` 与 `dateStamp` 的对象。
 */
function sigV4DateParts(date = new Date()) {
  const iso = new Date(date).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const amzDate = iso.replace(/[:-]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return {
    amzDate,
    dateStamp: amzDate.slice(0, 8),
  };
}

/**
 * 功能：解析 MinIO 访问凭据，优先使用 accessKey/secretKey，缺省时回退到 rootUser/rootPassword。
 * 输入：artifact store 配置对象。
 * 输出：包含 `accessKey` 和 `secretKey` 的对象；缺失时抛错。
 */
function resolveMinioCredentials(config = {}) {
  const accessKey = String(config.accessKey || config.rootUser || '').trim();
  const secretKey = String(config.secretKey || config.rootPassword || '').trim();
  if (!accessKey || !secretKey) {
    const error = new Error('artifact store accessKey/secretKey or rootUser/rootPassword is required for remote MinIO sync');
    error.code = 'artifact_store_credentials_missing';
    throw error;
  }
  return {
    accessKey,
    secretKey,
  };
}

/**
 * 功能：根据 bucket/key 生成 MinIO 请求目标 URL 与 Host 头。
 * 输入：artifact store 配置、bucket 与对象 key。
 * 输出：包含请求 URL、host 头和 canonical URI 的对象。
 */
function buildMinioRequestTarget(config = {}, bucket, key = '') {
  const endpoint = String(config.baseUrl || config.endpoint || '').trim();
  if (!endpoint) {
    const error = new Error('artifact store endpoint is required');
    error.code = 'artifact_store_endpoint_missing';
    throw error;
  }
  const url = new URL(endpoint);
  const normalizedBucket = String(bucket || '').trim();
  const encodedKeyPath = key ? encodeArtifactKeyForPath(key) : '/';
  if (String(config.accessStyle || 'path').trim().toLowerCase() === 'virtual_host' && normalizedBucket) {
    url.hostname = `${normalizedBucket}.${url.hostname}`;
    url.pathname = encodedKeyPath;
  } else {
    url.pathname = normalizedBucket
      ? `${encodeArtifactKeyForPath(normalizedBucket).replace(/\/$/, '')}${encodedKeyPath}`
      : encodedKeyPath;
  }
  return {
    url,
    hostHeader: url.host,
    canonicalUri: url.pathname || '/',
  };
}

/**
 * 功能：按 RFC 3986 规则编码查询参数值。
 * 输入：任意查询参数值。
 * 输出：编码后的字符串。
 */
function encodeQueryValue(value) {
  return encodeURIComponent(String(value == null ? '' : value))
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * 功能：为 MinIO 请求生成 AWS SigV4 鉴权头。
 * 输入：artifact store 配置、HTTP 方法、bucket、对象 key、请求头与 payload 摘要。
 * 输出：带鉴权头的请求信息对象。
 */
function signMinioRequest(config = {}, payload = {}) {
  const bucket = String(payload.bucket || config.bucket || '').trim();
  const key = String(payload.key || '').trim();
  const method = String(payload.method || 'GET').trim().toUpperCase();
  const region = String(config.region || '').trim() || 'us-east-1';
  const service = 's3';
  const { accessKey, secretKey } = resolveMinioCredentials(config);
  const { amzDate, dateStamp } = sigV4DateParts(payload.date || new Date());
  const target = buildMinioRequestTarget(config, bucket, key);
  const payloadSha256 = String(payload.payloadSha256 || sha256Hex(payload.body || '')).trim();
  const headers = {
    ...(payload.headers || {}),
    host: target.hostHeader,
    'x-amz-content-sha256': payloadSha256,
    'x-amz-date': amzDate,
  };
  const canonical = canonicalizeHeaders(headers);
  const canonicalRequest = [
    method,
    target.canonicalUri,
    '',
    canonical.canonicalHeaders,
    canonical.signedHeaders,
    payloadSha256,
  ].join('\n');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signingKey = hmacSha256(
    hmacSha256(
      hmacSha256(
        hmacSha256(`AWS4${secretKey}`, dateStamp),
        region
      ),
      service
    ),
    'aws4_request'
  );
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
  return {
    method,
    url: target.url.toString(),
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${canonical.signedHeaders}, Signature=${signature}`,
    },
  };
}

/**
 * 功能：为 MinIO 对象生成带时效的预签名 GET URL。
 * 输入：artifact store 配置、bucket、对象 key 和过期秒数。
 * 输出：可直接下载对象的预签名 URL。
 */
function buildMinioPresignedGetUrl(config = {}, bucket, key, expiresSeconds) {
  const region = String(config.region || '').trim() || 'us-east-1';
  const service = 's3';
  const { accessKey, secretKey } = resolveMinioCredentials(config);
  const { amzDate, dateStamp } = sigV4DateParts(new Date());
  const target = buildMinioRequestTarget({
    ...config,
    baseUrl: String(config.publicBaseUrl || config.endpoint || '').trim(),
  }, bucket, key);
  const expires = Math.max(1, Number(expiresSeconds || config.presignExpiresSeconds || 900));
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const queryEntries = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKey}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expires)],
    ['X-Amz-SignedHeaders', 'host'],
  ];
  const canonicalQueryString = queryEntries
    .map(([queryKey, queryValue]) => `${encodeQueryValue(queryKey)}=${encodeQueryValue(queryValue)}`)
    .sort()
    .join('&');
  const canonicalRequest = [
    'GET',
    target.canonicalUri,
    canonicalQueryString,
    `host:${target.hostHeader}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signingKey = hmacSha256(
    hmacSha256(
      hmacSha256(
        hmacSha256(`AWS4${secretKey}`, dateStamp),
        region
      ),
      service
    ),
    'aws4_request'
  );
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
  target.url.search = `${canonicalQueryString}&X-Amz-Signature=${signature}`;
  return target.url.toString();
}

/**
 * 功能：执行一次签名后的 MinIO HTTP 请求。
 * 输入：artifact store 配置、请求参数和可选 fetch 实现。
 * 输出：Promise，解析为 fetch 响应对象。
 */
async function executeSignedMinioRequest(config = {}, payload = {}, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const signed = signMinioRequest(config, payload);
  const method = String(signed.method || 'GET').trim().toUpperCase();
  return fetchImpl(signed.url, {
    method,
    headers: signed.headers,
    body: ['GET', 'HEAD'].includes(method) ? undefined : payload.body,
  });
}

/**
 * 功能：确保远端 MinIO bucket 已存在，不存在时自动创建。
 * 输入：artifact store 配置和可选 fetch 实现。
 * 输出：Promise，解析为 bucket 检查/创建结果。
 */
async function ensureRemoteMinioBucket(config = {}, options = {}) {
  const bucket = String(config.bucket || '').trim();
  if (!bucket) {
    const error = new Error('artifact store bucket is required');
    error.code = 'artifact_store_bucket_missing';
    throw error;
  }
  const headResponse = await executeSignedMinioRequest(config, {
    method: 'HEAD',
    bucket,
    key: '',
    headers: {},
    body: '',
    payloadSha256: sha256Hex(''),
  }, options);
  if (headResponse.ok) {
    return {
      bucket,
      created: false,
      status: headResponse.status,
    };
  }
  if (headResponse.status !== 404) {
    const errorBody = await headResponse.text().catch(() => '');
    const error = new Error(`minio bucket head failed: ${headResponse.status} ${errorBody}`.trim());
    error.code = 'artifact_store_bucket_head_failed';
    throw error;
  }
  const createResponse = await executeSignedMinioRequest(config, {
    method: 'PUT',
    bucket,
    key: '',
    headers: {},
    body: '',
    payloadSha256: sha256Hex(''),
  }, options);
  if (createResponse.ok || createResponse.status === 409) {
    return {
      bucket,
      created: createResponse.ok,
      status: createResponse.status,
    };
  }
  const errorBody = await createResponse.text().catch(() => '');
  const error = new Error(`minio bucket create failed: ${createResponse.status} ${errorBody}`.trim());
  error.code = 'artifact_store_bucket_create_failed';
  throw error;
}

/**
 * 功能：把单个本地制品上传到远端 MinIO 对象路径。
 * 输入：artifact store 配置、制品描述对象和可选 fetch 实现。
 * 输出：Promise，解析为上传结果摘要。
 */
async function uploadDescriptorToRemoteMinio(config = {}, descriptor = {}, options = {}) {
  const body = fs.readFileSync(descriptor.localFilePath);
  const response = await executeSignedMinioRequest(config, {
    method: 'PUT',
    bucket: descriptor.bucket || config.bucket || '',
    key: descriptor.key,
    headers: {
      'content-type': descriptor.contentType || contentTypeForFileName(descriptor.key || ''),
    },
    body,
    payloadSha256: sha256Hex(body),
  }, options);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const error = new Error(`minio object upload failed: ${response.status} ${descriptor.key} ${errorBody}`.trim());
    error.code = 'artifact_store_object_upload_failed';
    throw error;
  }
  return {
    kind: descriptor.kind,
    key: descriptor.key,
    objectUrl: descriptor.objectUrl || '',
    publicUrl: descriptor.publicUrl || '',
    eTag: response.headers.get('etag') || '',
    status: response.status,
  };
}

/**
 * 功能：把 release 制品同步到远端 MinIO 制品仓。
 * 输入：应用配置对象、release 本地文件信息和可选 fetch 实现。
 * 输出：包含同步结果与计划信息的对象。
 */
async function syncReleaseArtifactsToRemoteMinio(appConfig, payload = {}, options = {}) {
  const plan = buildReleaseArtifactPlan(appConfig, payload);
  const bucketResult = await ensureRemoteMinioBucket(appConfig.artifactStore || appConfig, options);
  const syncedTargets = [];
  for (const descriptor of plan.artifacts) {
    syncedTargets.push(await uploadDescriptorToRemoteMinio(appConfig.artifactStore || appConfig, descriptor, options));
  }
  return {
    ...plan,
    syncMode: 'remote_minio',
    bucketResult,
    syncedTargets,
  };
}

/**
 * 功能：构建 MinIO 制品仓客户端抽象。
 * 输入：`config` 中的 artifactStore 配置。
 * 输出：包含 key/url/本地文件描述能力的客户端对象。
 */
function createMinioArtifactStoreClient(config = {}) {
  const bucket = String(config.bucket || '').trim();
  const endpoint = String(config.endpoint || '').trim();
  const publicBaseUrl = String(config.publicBaseUrl || endpoint).trim();
  const accessStyle = String(config.accessStyle || 'path').trim().toLowerCase() === 'virtual_host' ? 'virtual_host' : 'path';

  return {
    provider: 'minio',
    bucket,
    endpoint,
    publicBaseUrl,
    region: String(config.region || '').trim(),
    accessStyle,
    presignExpiresSeconds: Math.max(1, Number(config.presignExpiresSeconds || 900)),
    buildKey(releaseId, fileName) {
      return buildReleaseArtifactKey(releaseId, fileName);
    },
    buildObjectUrl(key) {
      return buildObjectUrl(endpoint, bucket, key, accessStyle);
    },
    buildPublicUrl(key) {
      return buildObjectUrl(publicBaseUrl, bucket, key, accessStyle);
    },
    buildPresignedGetUrl(key, expiresSeconds) {
      return buildMinioPresignedGetUrl({
        ...config,
        bucket,
        endpoint,
        publicBaseUrl,
        accessStyle,
      }, bucket, key, expiresSeconds);
    },
    describeLocalFile(key, filePath, options = {}) {
      const stats = fs.statSync(filePath);
      return {
        kind: String(options.kind || '').trim() || path.posix.basename(key),
        provider: 'minio',
        bucket,
        key,
        localFilePath: filePath,
        contentType: String(options.contentType || contentTypeForFileName(key)).trim(),
        sizeBytes: stats.size,
        checksumSha256: sha256File(filePath),
        objectUrl: buildObjectUrl(endpoint, bucket, key, accessStyle),
        publicUrl: buildObjectUrl(publicBaseUrl, bucket, key, accessStyle),
      };
    },
  };
}

/**
 * 功能：根据应用配置创建制品仓客户端。
 * 输入：应用配置对象或直接的 artifactStore 配置对象。
 * 输出：具体 provider 的客户端对象。
 */
function createArtifactStoreClient(appConfigOrArtifactStore = {}) {
  const artifactStore = appConfigOrArtifactStore && appConfigOrArtifactStore.artifactStore
    ? appConfigOrArtifactStore.artifactStore
    : appConfigOrArtifactStore;
  const provider = String((artifactStore || {}).provider || 'minio').trim().toLowerCase() || 'minio';
  if (provider !== 'minio') {
    throw new Error(`unsupported artifact store provider: ${provider}`);
  }
  return createMinioArtifactStoreClient(artifactStore);
}

/**
 * 功能：为 release 构建本地文件到对象存储 key 的上传规划。
 * 输入：应用配置对象和 release 本地文件信息。
 * 输出：包含 provider、bucket、rootPrefix 和 artifacts 的计划对象。
 */
function buildReleaseArtifactPlan(appConfig, payload = {}) {
  const releaseId = String(payload.releaseId || '').trim();
  if (!releaseId) {
    throw new Error('releaseId is required for artifact planning');
  }

  const client = createArtifactStoreClient(appConfig);
  const descriptors = [];
  const candidates = [
    { kind: 'manifest', fileName: 'manifest.json', filePath: payload.manifestPath },
    { kind: 'snapshot', fileName: 'snapshot.json', filePath: payload.snapshotPath },
    { kind: 'package', fileName: 'package.tar.gz', filePath: payload.packagePath },
  ];

  for (const item of candidates) {
    if (!item.filePath || !fs.existsSync(item.filePath)) {
      continue;
    }
    const key = client.buildKey(releaseId, item.fileName);
    descriptors.push(client.describeLocalFile(key, item.filePath, {
      kind: item.kind,
      contentType: contentTypeForFileName(item.fileName),
    }));
  }

  return {
    provider: client.provider,
    bucket: client.bucket,
    releaseId,
    rootPrefix: joinArtifactKey(RELEASES_PREFIX, releaseId),
    artifacts: descriptors,
  };
}

/**
 * 功能：把 release 制品同步到本地 `file://` 制品仓目标。
 * 输入：应用配置对象和 release 本地文件信息。
 * 输出：包含同步结果与计划信息的对象。
 */
function syncReleaseArtifactsToFileStore(appConfig, payload = {}) {
  const plan = buildReleaseArtifactPlan(appConfig, payload);
  const syncedTargets = [];

  for (const descriptor of plan.artifacts) {
    const targetUrls = artifactTargetUrls(descriptor);
    if (targetUrls.length === 0) {
      continue;
    }
    for (const targetUrl of targetUrls) {
      if (!isFileArtifactUrl(targetUrl)) {
        const error = new Error(`artifact file sync only supports file:// urls, received ${targetUrl}`);
        error.code = 'artifact_store_remote_sync_not_supported';
        throw error;
      }
      const targetPath = artifactFilePathFromUrl(targetUrl);
      ensureDir(path.dirname(targetPath));
      fs.copyFileSync(descriptor.localFilePath, targetPath);
      syncedTargets.push({
        kind: descriptor.kind,
        key: descriptor.key,
        targetUrl,
        targetPath,
      });
    }
  }

  return {
    ...plan,
    syncMode: 'file',
    syncedTargets,
  };
}

/**
 * 功能：按当前配置把 release 制品同步到验证可用的制品仓。
 * 输入：应用配置对象和 release 本地文件信息。
 * 输出：同步结果对象；当前仅支持 `file://` 目标。
 */
async function syncReleaseArtifactsToStore(appConfig, payload = {}, options = {}) {
  const plan = buildReleaseArtifactPlan(appConfig, payload);
  const artifactStore = appConfig && appConfig.artifactStore ? appConfig.artifactStore : appConfig;
  const endpoint = String((artifactStore || {}).endpoint || '').trim();
  const endpointProtocol = endpoint ? new URL(endpoint).protocol : '';
  const targetUrls = plan.artifacts.flatMap((descriptor) => artifactTargetUrls(descriptor));
  if (targetUrls.length === 0) {
    return {
      ...plan,
      syncMode: 'noop',
      syncedTargets: [],
    };
  }
  if (targetUrls.every((item) => isFileArtifactUrl(item))) {
    return syncReleaseArtifactsToFileStore(appConfig, payload);
  }
  if (['http:', 'https:'].includes(endpointProtocol)) {
    return syncReleaseArtifactsToRemoteMinio(appConfig, payload, options);
  }
  const error = new Error(`unsupported artifact store endpoint protocol: ${endpointProtocol || 'unknown'}`);
  error.code = 'artifact_store_endpoint_protocol_unsupported';
  throw error;
}

/**
 * 功能：基于 release 本地文件构造 runtime 可消费的制品元数据。
 * 输入：应用配置对象和 release 本地文件信息。
 * 输出：包含主制品和完整文件列表的 artifact metadata。
 */
function buildReleaseArtifactMetadata(appConfig, payload = {}, options = {}) {
  const plan = buildReleaseArtifactPlan(appConfig, payload);
  const client = createArtifactStoreClient(appConfig);
  const artifactStore = appConfig && appConfig.artifactStore ? appConfig.artifactStore : appConfig;
  const deliveryMode = runtimeDeliveryMode(appConfig);
  const endpointProtocol = String((artifactStore || {}).endpoint || '').trim()
    ? new URL(String((artifactStore || {}).endpoint || '').trim()).protocol
    : '';
  const canPresign = deliveryMode === 'minio'
    && typeof client.buildPresignedGetUrl === 'function'
    && ['http:', 'https:'].includes(endpointProtocol);
  const primaryArtifact = plan.artifacts.find((item) => item.kind === 'package')
    || plan.artifacts.find((item) => item.kind === 'snapshot')
    || plan.artifacts.find((item) => item.kind === 'manifest')
    || null;

  /**
   * 功能：为制品条目生成 runtime 可直接下载的 URL。
   * 输入：制品条目对象。
   * 输出：优先使用预签名 URL 的下载地址。
   */
  function runtimeDownloadUrlFor(item) {
    if (!item) {
      return '';
    }
    if (deliveryMode === 'admin_http_signed') {
      return buildAdminRuntimeArtifactUrl(appConfig, {
        releaseId: plan.releaseId,
        fileName: path.posix.basename(String(item.key || '').trim()),
        nodeId: options.nodeId,
        configVersion: options.configVersion,
      });
    }
    if (canPresign) {
      try {
        return client.buildPresignedGetUrl(item.key);
      } catch {}
    }
    return item.publicUrl || item.objectUrl || '';
  }

  return {
    provider: plan.provider,
    deliveryMode,
    bucket: plan.bucket,
    releaseId: plan.releaseId,
    rootPrefix: plan.rootPrefix,
    primaryArtifact: primaryArtifact ? (() => {
      const runtimeUrl = runtimeDownloadUrlFor(primaryArtifact);
      return {
        kind: primaryArtifact.kind,
        key: primaryArtifact.key,
        contentType: primaryArtifact.contentType,
        sizeBytes: primaryArtifact.sizeBytes,
        checksumSha256: primaryArtifact.checksumSha256,
        artifactUrl: runtimeUrl,
        objectUrl: deliveryMode === 'admin_http_signed' ? runtimeUrl : (primaryArtifact.objectUrl || ''),
        publicUrl: runtimeUrl,
      };
    })() : null,
    files: plan.artifacts.map((item) => {
      const runtimeUrl = runtimeDownloadUrlFor(item);
      return {
        kind: item.kind,
        key: item.key,
        contentType: item.contentType,
        sizeBytes: item.sizeBytes,
        checksumSha256: item.checksumSha256,
        artifactUrl: runtimeUrl,
        objectUrl: deliveryMode === 'admin_http_signed' ? runtimeUrl : (item.objectUrl || ''),
        publicUrl: runtimeUrl,
      };
    }),
  };
}

module.exports = {
  buildAdminRuntimeArtifactUrl,
  artifactFilePathFromUrl,
  artifactTargetUrls,
  buildObjectUrl,
  buildMinioRequestTarget,
  buildMinioPresignedGetUrl,
  buildReleaseArtifactKey,
  buildReleaseArtifactMetadata,
  buildReleaseArtifactPlan,
  normalizeRuntimeArtifactFileName,
  canonicalHeaderValue,
  canonicalizeHeaders,
  contentTypeForFileName,
  createArtifactStoreClient,
  createMinioArtifactStoreClient,
  ensureRemoteMinioBucket,
  executeSignedMinioRequest,
  hmacSha256,
  encodeArtifactKeyForPath,
  isFileArtifactUrl,
  joinArtifactKey,
  resolveMinioCredentials,
  runtimeArtifactSignaturePayload,
  runtimeDeliveryMode,
  sha256Hex,
  sha256File,
  signMinioRequest,
  signRuntimeArtifactDownload,
  sigV4DateParts,
  syncReleaseArtifactsToRemoteMinio,
  syncReleaseArtifactsToFileStore,
  syncReleaseArtifactsToStore,
  uploadDescriptorToRemoteMinio,
  validateRuntimeArtifactDownloadRequest,
  verifyRuntimeArtifactDownloadSignature,
};
