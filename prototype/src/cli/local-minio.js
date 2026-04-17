const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { createAppConfig, readJson } = require('../lib/config');

const appConfig = createAppConfig();
const command = process.argv[2] || 'status';
const MINIO_IMAGE = process.env.ACDP_MINIO_IMAGE || 'minio/minio:latest';
const CONTAINER_NAME = process.env.ACDP_MINIO_CONTAINER || 'acdp-local-minio';

/**
 * 功能：确保目录存在，不存在时递归创建。
 * 输入：`dirPath` 目录路径。
 * 输出：无显式返回。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：原子写回 JSON 配置文件。
 * 输入：`filePath` 配置路径，`value` 配置对象。
 * 输出：无显式返回。
 */
function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

/**
 * 功能：读取当前 artifact store 原始配置文件。
 * 输入：无。
 * 输出：包含配置路径和原始对象的结果。
 */
function loadArtifactStoreConfig() {
  const filePath = appConfig.artifactStoreConfigPath;
  return {
    filePath,
    raw: readJson(filePath),
  };
}

/**
 * 功能：判断当前 endpoint 是否为本机地址。
 * 输入：endpoint URL 字符串。
 * 输出：布尔值。
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
 * 功能：从配置中解析当前 MinIO 凭据。
 * 输入：artifact store 配置对象。
 * 输出：包含 root/access 凭据的对象；为空时返回空字符串。
 */
function currentCredentials(artifactStore = {}) {
  return {
    rootUser: String(artifactStore.rootUser || '').trim(),
    rootPassword: String(artifactStore.rootPassword || '').trim(),
    accessKey: String(artifactStore.accessKey || '').trim(),
    secretKey: String(artifactStore.secretKey || '').trim(),
  };
}

/**
 * 功能：为本地开发环境生成一组 MinIO 凭据。
 * 输入：无。
 * 输出：包含 root/access 凭据的对象。
 */
function generateLocalCredentials() {
  const suffix = crypto.randomBytes(3).toString('hex');
  const secret = crypto.randomBytes(12).toString('base64url');
  return {
    rootUser: `acdp-${suffix}`,
    rootPassword: secret,
    accessKey: `acdp-${suffix}`,
    secretKey: secret,
  };
}

/**
 * 功能：确保本地 MinIO 场景具备可用凭据；若为空则生成并写回配置。
 * 输入：artifact store 配置文件路径和原始配置对象。
 * 输出：包含更新后配置与是否写回的结果对象。
 */
function ensureLocalCredentials(filePath, raw = {}) {
  const artifactStore = raw.artifactStore || {};
  const existing = currentCredentials(artifactStore);
  if (
    (existing.accessKey && existing.secretKey)
    || (existing.rootUser && existing.rootPassword)
  ) {
    return {
      updated: false,
      credentials: existing,
      raw,
    };
  }
  if (!isLocalEndpoint(artifactStore.endpoint || '')) {
    const error = new Error('artifact store credentials are empty and endpoint is not local, refusing to auto-generate credentials');
    error.code = 'local_minio_credentials_missing';
    throw error;
  }
  const generated = generateLocalCredentials();
  const nextRaw = {
    ...raw,
    artifactStore: {
      ...artifactStore,
      rootUser: generated.rootUser,
      rootPassword: generated.rootPassword,
      accessKey: generated.accessKey,
      secretKey: generated.secretKey,
    },
  };
  writeJson(filePath, nextRaw);
  return {
    updated: true,
    credentials: generated,
    raw: nextRaw,
  };
}

/**
 * 功能：执行一条 docker 命令并收集结果。
 * 输入：docker 参数数组。
 * 输出：命令执行结果对象。
 */
function runDocker(args = []) {
  const result = spawnSync('docker', args, {
    cwd: appConfig.projectRoot,
    encoding: 'utf8',
  });
  return {
    ok: result.status === 0,
    status: result.status == null ? 1 : result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

/**
 * 功能：判断 docker 错误是否属于 daemon socket 权限受限。
 * 输入：docker 命令错误文本。
 * 输出：命中常见 docker socket 权限错误时返回 `true`。
 */
function isDockerPermissionError(message = '') {
  const text = String(message || '').toLowerCase();
  return text.includes('permission denied')
    && (text.includes('docker daemon socket') || text.includes('/var/run/docker.sock'));
}

/**
 * 功能：读取当前本地 MinIO 容器状态。
 * 输入：无。
 * 输出：包含容器状态、容器 ID 和镜像信息的对象。
 */
function containerStatus() {
  const inspect = runDocker([
    'ps',
    '-a',
    '--filter',
    `name=^/${CONTAINER_NAME}$`,
    '--format',
    '{{.ID}}\t{{.Image}}\t{{.Status}}',
  ]);
  if (!inspect.ok) {
    return {
      status: 'docker_error',
      error: inspect.stderr.trim() || inspect.stdout.trim(),
      blocker: isDockerPermissionError(inspect.stderr || inspect.stdout)
        ? 'docker_socket_permission_denied'
        : 'docker_unavailable',
    };
  }
  const line = String(inspect.stdout || '').trim();
  if (!line) {
    return {
      status: 'not_found',
      containerName: CONTAINER_NAME,
    };
  }
  const [containerId, image, dockerStatus] = line.split('\t');
  return {
    status: dockerStatus && dockerStatus.startsWith('Up') ? 'running' : 'stopped',
    containerName: CONTAINER_NAME,
    containerId: containerId || '',
    image: image || '',
    dockerStatus: dockerStatus || '',
  };
}

/**
 * 功能：轮询等待本地 MinIO 健康检查可用。
 * 输入：endpoint URL 字符串和超时毫秒数。
 * 输出：Promise，解析为健康检查摘要。
 */
async function waitForHealth(endpoint, timeoutMs = 30000) {
  const startedAt = Date.now();
  const healthUrl = new URL('/minio/health/live', endpoint).toString();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          healthUrl,
        };
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return {
    ok: false,
    healthUrl,
  };
}

/**
 * 功能：启动本地 MinIO docker 容器。
 * 输入：无。
 * 输出：Promise，解析为启动结果摘要。
 */
async function start() {
  const loaded = loadArtifactStoreConfig();
  const ensured = ensureLocalCredentials(loaded.filePath, loaded.raw);
  const artifactStore = ensured.raw.artifactStore || {};
  const current = containerStatus();
  if (current.status === 'running') {
    const health = await waitForHealth(artifactStore.endpoint, 5000);
    return {
      status: 'already_running',
      container: current,
      health,
      credentialsGenerated: ensured.updated,
      artifactStoreConfigPath: loaded.filePath,
    };
  }

  if (current.status === 'stopped') {
    runDocker(['rm', '-f', CONTAINER_NAME]);
  }

  const dataDir = String(artifactStore.serverDataDir || '').trim();
  if (!dataDir) {
    const error = new Error('artifactStore.serverDataDir is required');
    error.code = 'local_minio_data_dir_missing';
    throw error;
  }

  const args = [
    'run',
    '-d',
    '--name',
    CONTAINER_NAME,
    '-p',
    `${Number(artifactStore.apiPort || 9000)}:9000`,
    '-p',
    `${Number(artifactStore.consolePort || 9001)}:9001`,
    '-v',
    `${dataDir}:/data`,
    '-e',
    `MINIO_ROOT_USER=${artifactStore.rootUser}`,
    '-e',
    `MINIO_ROOT_PASSWORD=${artifactStore.rootPassword}`,
    MINIO_IMAGE,
    'server',
    '/data',
    '--console-address',
    ':9001',
  ];

  const result = runDocker(args);
  if (!result.ok) {
    const error = new Error(result.stderr.trim() || result.stdout.trim() || 'docker run failed');
    error.code = 'local_minio_start_failed';
    throw error;
  }

  const health = await waitForHealth(artifactStore.endpoint, 30000);
  if (!health.ok) {
    const error = new Error(`local MinIO started but health check did not pass: ${health.healthUrl}`);
    error.code = 'local_minio_health_timeout';
    throw error;
  }

  return {
    status: 'started',
    container: containerStatus(),
    health,
    image: MINIO_IMAGE,
    credentialsGenerated: ensured.updated,
    artifactStoreConfigPath: loaded.filePath,
  };
}

/**
 * 功能：停止并移除本地 MinIO docker 容器。
 * 输入：无。
 * 输出：停止结果摘要。
 */
function stop() {
  const current = containerStatus();
  if (current.status === 'not_found') {
    return {
      status: 'not_running',
      containerName: CONTAINER_NAME,
    };
  }
  const result = runDocker(['rm', '-f', CONTAINER_NAME]);
  if (!result.ok) {
    const error = new Error(result.stderr.trim() || result.stdout.trim() || 'docker rm failed');
    error.code = 'local_minio_stop_failed';
    throw error;
  }
  return {
    status: 'stopped',
    containerName: CONTAINER_NAME,
  };
}

/**
 * 功能：查询本地 MinIO 当前状态与配置摘要。
 * 输入：无。
 * 输出：状态摘要对象。
 */
function status() {
  const loaded = loadArtifactStoreConfig();
  const artifactStore = loaded.raw.artifactStore || {};
  const credentials = currentCredentials(artifactStore);
  return {
    defaultLocalDevBaseline: true,
    container: containerStatus(),
    artifactStoreConfigPath: loaded.filePath,
    endpoint: String(artifactStore.endpoint || '').trim(),
    publicBaseUrl: String(artifactStore.publicBaseUrl || '').trim(),
    bucket: String(artifactStore.bucket || '').trim(),
    serverDataDir: String(artifactStore.serverDataDir || '').trim(),
    apiPort: Number(artifactStore.apiPort || 9000),
    consolePort: Number(artifactStore.consolePort || 9001),
    credentialsPresent: {
      rootUser: Boolean(credentials.rootUser),
      rootPassword: Boolean(credentials.rootPassword),
      accessKey: Boolean(credentials.accessKey),
      secretKey: Boolean(credentials.secretKey),
    },
  };
}

/**
 * 功能：执行本地 MinIO 启停查命令入口。
 * 输入：命令行中的 `start|stop|status`。
 * 输出：Promise，解析为命令结果对象。
 */
async function main() {
  if (command === 'start') {
    return start();
  }
  if (command === 'stop') {
    return stop();
  }
  return status();
}

if (require.main === module) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  containerStatus,
  currentCredentials,
  ensureLocalCredentials,
  generateLocalCredentials,
  isLocalEndpoint,
  loadArtifactStoreConfig,
  main,
  runDocker,
  start,
  status,
  stop,
  waitForHealth,
};
