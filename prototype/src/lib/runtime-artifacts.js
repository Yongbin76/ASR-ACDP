const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const { PrototypeRuntime } = require('./runtime');

/**
 * 功能：确保`dir`相关逻辑。
 * 输入：`dirPath`（目录路径）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：处理`runtimeArtifactsRoot`相关逻辑。
 * 输入：`appConfig`（应用配置对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function runtimeArtifactsRoot(appConfig) {
  return appConfig.resolvedPaths.runtimeArtifactsDir;
}

/**
 * 功能：处理`runtimeStateRoot`相关逻辑。
 * 输入：`appConfig`（应用配置对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function runtimeStateRoot(appConfig) {
  return appConfig.resolvedPaths.runtimeStateDir;
}

/**
 * 功能：处理`runtimeCurrentStatePath`相关逻辑。
 * 输入：`appConfig`（应用配置对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function runtimeCurrentStatePath(appConfig) {
  return path.join(runtimeStateRoot(appConfig), 'current.json');
}

/**
 * 功能：处理`runtimeReleaseDir`相关逻辑。
 * 输入：`appConfig`（应用配置对象）、`releaseId`（发布版本 ID）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function runtimeReleaseDir(appConfig, releaseId) {
  return path.join(runtimeArtifactsRoot(appConfig), 'releases', String(releaseId || '').trim());
}

/**
 * 功能：读取`json if exists`相关逻辑。
 * 输入：`filePath`（文件路径）、`fallback`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function readJsonIfExists(filePath, fallback = null) {
  if (!filePath || !fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：处理`atomicWriteJson`相关逻辑。
 * 输入：`filePath`（文件路径）、`payload`（业务载荷对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function atomicWriteJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

/**
 * 功能：处理`sha256File`相关逻辑。
 * 输入：`filePath`（文件路径）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

/**
 * 功能：读取`file from url`相关逻辑。
 * 输入：`url`（URL 地址）、`timeoutMs`（超时时间（毫秒））。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function readFileFromUrl(url, timeoutMs) {
  const parsed = new URL(url);
  if (parsed.protocol === 'file:') {
    return fs.readFileSync(fileURLToPath(parsed));
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`unsupported artifact protocol: ${parsed.protocol}`);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(parsed, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`artifact download failed: ${response.status} ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 功能：处理`releaseSnapshotPathFromState`相关逻辑。
 * 输入：`state`（状态对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function releaseSnapshotPathFromState(state = {}) {
  return String(state.snapshotPath || '').trim();
}

/**
 * 功能：规范化`deployment record`相关逻辑。
 * 输入：`record`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function normalizeDeploymentRecord(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }
  const snapshotPath = releaseSnapshotPathFromState(record);
  if (!snapshotPath || !fs.existsSync(snapshotPath)) {
    return null;
  }
  return {
    releaseId: String(record.releaseId || '').trim(),
    desiredVersion: String(record.desiredVersion || record.currentVersion || '').trim(),
    currentVersion: String(record.currentVersion || record.desiredVersion || '').trim(),
    snapshotPath,
    manifestPath: String(record.manifestPath || '').trim(),
    appliedAt: String(record.appliedAt || '').trim() || null,
    artifactMetadata: record.artifactMetadata || null,
  };
}

/**
 * 功能：规范化`deployment state`相关逻辑。
 * 输入：`raw`（原始数据）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function normalizeDeploymentState(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      activeRelease: null,
      previousRelease: null,
      lastAttempt: null,
    };
  }
  if (!raw.activeRelease && (raw.releaseId || raw.snapshotPath)) {
    return {
      activeRelease: normalizeDeploymentRecord(raw),
      previousRelease: null,
      lastAttempt: null,
    };
  }
  return {
    activeRelease: normalizeDeploymentRecord(raw.activeRelease),
    previousRelease: normalizeDeploymentRecord(raw.previousRelease),
    lastAttempt: raw.lastAttempt && typeof raw.lastAttempt === 'object'
      ? {
        releaseId: String(raw.lastAttempt.releaseId || '').trim(),
        desiredVersion: String(raw.lastAttempt.desiredVersion || '').trim(),
        status: String(raw.lastAttempt.status || '').trim(),
        attemptedAt: String(raw.lastAttempt.attemptedAt || '').trim() || null,
        error: String(raw.lastAttempt.error || '').trim(),
      }
      : null,
  };
}

/**
 * 功能：加载`runtime deployment state`相关逻辑。
 * 输入：`appConfig`（应用配置对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function loadRuntimeDeploymentState(appConfig) {
  return normalizeDeploymentState(readJsonIfExists(runtimeCurrentStatePath(appConfig), null));
}

/**
 * 功能：加载`runtime current state`相关逻辑。
 * 输入：`appConfig`（应用配置对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function loadRuntimeCurrentState(appConfig) {
  return loadRuntimeDeploymentState(appConfig).activeRelease;
}

/**
 * 功能：记录`attempt base`相关逻辑。
 * 输入：`controlView`（控制面视图对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function recordAttemptBase(controlView = {}) {
  return {
    releaseId: String((((controlView || {}).artifactMetadata || {}).releaseId) || '').trim(),
    desiredVersion: String(controlView.desiredVersion || '').trim(),
    attemptedAt: new Date().toISOString(),
  };
}

/**
 * 功能：处理`validateInstalledSnapshot`相关逻辑。
 * 输入：`snapshotPath`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function validateInstalledSnapshot(snapshotPath) {
  const runtime = PrototypeRuntime.fromSnapshot(snapshotPath);
  return runtime.getCurrentVersion();
}

/**
 * 功能：处理`persistDeploymentState`相关逻辑。
 * 输入：`appConfig`（应用配置对象）、`state`（状态对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function persistDeploymentState(appConfig, state = {}) {
  atomicWriteJson(runtimeCurrentStatePath(appConfig), state);
  return state;
}

/**
 * 功能：处理`installRuntimeReleaseFromControl`相关逻辑。
 * 输入：`appConfig`（应用配置对象）、`controlView`（控制面视图对象）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function installRuntimeReleaseFromControl(appConfig, controlView = {}) {
  const desiredVersion = String(controlView.desiredVersion || '').trim();
  const artifactMetadata = controlView.artifactMetadata || null;
  if (!desiredVersion || !artifactMetadata || !artifactMetadata.releaseId) {
    throw new Error('runtime control is missing desiredVersion or artifact metadata');
  }
  const releaseId = String(artifactMetadata.releaseId || '').trim();
  const releaseDir = runtimeReleaseDir(appConfig, releaseId);
  const tempDir = `${releaseDir}.tmp.${process.pid}.${Date.now()}`;
  const downloadTimeoutMs = Math.max(1000, Number(((appConfig || {}).runtimeControl || {}).downloadTimeoutMs || 15000));
  const currentState = loadRuntimeDeploymentState(appConfig);
  const previousActive = currentState.activeRelease;
  const attemptBase = recordAttemptBase(controlView);

  fs.rmSync(tempDir, { recursive: true, force: true });
  ensureDir(tempDir);
  ensureDir(path.dirname(releaseDir));

  try {
    for (const file of artifactMetadata.files || []) {
      const artifactUrl = String(file.artifactUrl || file.publicUrl || file.objectUrl || '').trim();
      if (!artifactUrl) {
        continue;
      }
      const key = String(file.key || '').trim();
      const fileName = path.basename(key || artifactUrl);
      const targetPath = path.join(tempDir, fileName);
      const buffer = await readFileFromUrl(artifactUrl, downloadTimeoutMs);
      fs.writeFileSync(targetPath, buffer);
      if (file.checksumSha256) {
        const actual = sha256File(targetPath);
        if (actual !== String(file.checksumSha256)) {
          throw new Error(`artifact checksum mismatch for ${fileName}`);
        }
      }
    }

    const snapshotPath = path.join(tempDir, 'snapshot.json');
    if (!fs.existsSync(snapshotPath)) {
      throw new Error('snapshot.json is required for runtime install');
    }

    validateInstalledSnapshot(snapshotPath);
    fs.rmSync(releaseDir, { recursive: true, force: true });
    fs.renameSync(tempDir, releaseDir);

    const activeRelease = {
      releaseId,
      desiredVersion,
      currentVersion: desiredVersion,
      snapshotPath: path.join(releaseDir, 'snapshot.json'),
      manifestPath: fs.existsSync(path.join(releaseDir, 'manifest.json')) ? path.join(releaseDir, 'manifest.json') : '',
      appliedAt: new Date().toISOString(),
      artifactMetadata,
    };
    const state = {
      activeRelease,
      previousRelease: previousActive && previousActive.releaseId !== activeRelease.releaseId ? previousActive : currentState.previousRelease,
      lastAttempt: {
        ...attemptBase,
        status: 'success',
        error: '',
      },
    };
    return persistDeploymentState(appConfig, state);
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    persistDeploymentState(appConfig, {
      activeRelease: currentState.activeRelease,
      previousRelease: currentState.previousRelease,
      lastAttempt: {
        ...attemptBase,
        status: 'failed',
        error: error.message || String(error),
      },
    });
    throw error;
  }
}

/**
 * 功能：回滚`runtime deployment`相关逻辑。
 * 输入：`appConfig`（应用配置对象）、`payload`（业务载荷对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function rollbackRuntimeDeployment(appConfig, payload = {}) {
  const currentState = loadRuntimeDeploymentState(appConfig);
  const activeRelease = currentState.activeRelease;
  const previousRelease = currentState.previousRelease;
  if (!activeRelease || !previousRelease) {
    const error = new Error('no previous runtime release available for rollback');
    error.code = 'runtime_rollback_unavailable';
    throw error;
  }
  const rolledBackState = {
    activeRelease: previousRelease,
    previousRelease: activeRelease,
    lastAttempt: {
      releaseId: String(payload.releaseId || activeRelease.releaseId || '').trim(),
      desiredVersion: String(payload.desiredVersion || activeRelease.desiredVersion || '').trim(),
      status: 'rolled_back',
      attemptedAt: new Date().toISOString(),
      error: String(payload.error || '').trim(),
    },
  };
  return persistDeploymentState(appConfig, rolledBackState);
}

module.exports = {
  installRuntimeReleaseFromControl,
  loadRuntimeCurrentState,
  loadRuntimeDeploymentState,
  normalizeDeploymentState,
  readJsonIfExists,
  releaseSnapshotPathFromState,
  rollbackRuntimeDeployment,
  runtimeArtifactsRoot,
  runtimeCurrentStatePath,
  runtimeReleaseDir,
  runtimeStateRoot,
  sha256File,
};
