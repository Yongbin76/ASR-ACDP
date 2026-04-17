const fs = require('fs')
const path = require('path')
const net = require('net')

const { createAppConfig } = require('../lib/config')
const prepareData = require('./prepare-data')
const bootstrapDb = require('./bootstrap-db')
const buildSnapshot = require('./build-snapshot')
const { resolveMinioCredentials, syncReleaseArtifactsToStore } = require('../lib/artifact-store')
const { createAdminApp, createRuntimeApp } = require('../server')

const defaultConfig = createAppConfig()

/**
 * 功能：从命令行读取某个 flag 的值。
 * 输入：`flag` 参数名，`fallback` 默认值。
 * 输出：解析到的参数值或默认值。
 */
function readArg(flag, fallback = '') {
  const args = process.argv.slice(2)
  const inline = args.find((item) => String(item).startsWith(`${flag}=`))
  if (inline) {
    return String(inline).slice(flag.length + 1)
  }
  const index = args.indexOf(flag)
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback
}

/**
 * 功能：判断命令行中是否包含某个布尔 flag。
 * 输入：`flag` 参数名。
 * 输出：布尔值。
 */
function hasFlag(flag) {
  return process.argv.slice(2).includes(flag)
}

/**
 * 功能：确保目录存在，不存在时递归创建。
 * 输入：`dirPath` 目录路径。
 * 输出：无显式返回。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

/**
 * 功能：清空并重建目录。
 * 输入：`dirPath` 目录路径。
 * 输出：无显式返回。
 */
function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true })
  fs.mkdirSync(dirPath, { recursive: true })
}

/**
 * 功能：把对象保存为 JSON 文件。
 * 输入：`filePath` 输出路径，`value` 任意对象。
 * 输出：无显式返回。
 */
function saveJson(filePath, value) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8')
}

/**
 * 功能：生成适合文件名的时间戳标识。
 * 输入：无。
 * 输出：时间戳字符串。
 */
function timestampId() {
  return new Date().toISOString().replace(/[:]/g, '-')
}

/**
 * 功能：等待指定毫秒数。
 * 输入：`ms` 毫秒数。
 * 输出：Promise，在等待结束后完成。
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 功能：申请一个当前可用的本地 TCP 端口。
 * 输入：无。
 * 输出：Promise，解析为端口号。
 */
function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = address && typeof address === 'object' ? Number(address.port || 0) : 0
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve(port)
      })
    })
  })
}

/**
 * 功能：基于基础配置创建隔离的验证工作目录配置。
 * 输入：基础配置、工作目录名和监听端口。
 * 输出：用于验证的应用配置对象。
 */
function createWorkspaceConfig(baseConfig, workspaceName, port) {
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', workspaceName)
  const catalogDir = path.join(workspaceDir, 'catalog')
  const releasesDir = path.join(workspaceDir, 'releases')
  resetDir(workspaceDir)
  ensureDir(catalogDir)
  ensureDir(releasesDir)
  return {
    ...baseConfig,
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
      runtimeArtifactsDir: path.join(workspaceDir, 'runtime_artifacts'),
      runtimeStateDir: path.join(workspaceDir, 'runtime_state'),
      hostVerificationDir: path.join(workspaceDir, 'host_verification'),
      catalogDir,
      releasesDir,
      latestReleaseDir: path.join(releasesDir, 'latest'),
      databaseFile: path.join(workspaceDir, 'platform.db'),
      seedCatalogFile: path.join(catalogDir, 'seed_terms.json'),
      validationFeedInboxDir: path.join(workspaceDir, 'validation_feeds', 'inbox'),
      validationFeedArchiveDir: path.join(workspaceDir, 'validation_feeds', 'archive'),
      validationFeedErrorDir: path.join(workspaceDir, 'validation_feeds', 'error'),
    },
    server: {
      ...baseConfig.server,
      host: '127.0.0.1',
      port,
      adminPort: port,
      runtimePort: port,
    },
  }
}

/**
 * 功能：为验证模式生成生效的制品仓配置。
 * 输入：基础配置、验证模式和工作目录。
 * 输出：制品仓配置对象。
 */
function createArtifactStoreForMode(baseConfig, mode, workspaceDir) {
  if (mode === 'configured') {
    return {
      ...baseConfig.artifactStore,
    }
  }
  if (mode === 'file' || mode === 'admin_http_signed') {
    const artifactRoot = path.join(workspaceDir, 'artifact_store')
    return {
      ...baseConfig.artifactStore,
      endpoint: `file://${artifactRoot}`,
      publicBaseUrl: `file://${artifactRoot}`,
    }
  }
  const error = new Error(`unsupported artifact store mode: ${mode}`)
  error.code = 'runtime_control_verify_mode_invalid'
  throw error
}

/**
 * 功能：对当前制品仓模式做验证前预检。
 * 输入：验证模式和应用配置对象。
 * 输出：Promise，解析为预检摘要对象。
 */
async function artifactStorePreflight(mode, config) {
  const artifactStore = config.artifactStore || {}
  const runtimeDelivery = config.runtimeDelivery || {}
  const endpoint = String(artifactStore.endpoint || '').trim()
  const summary = {
    mode,
    provider: String(artifactStore.provider || '').trim(),
    endpoint,
    publicBaseUrl: String(artifactStore.publicBaseUrl || '').trim(),
    bucket: String(artifactStore.bucket || '').trim(),
    ok: true,
    blockers: [],
  }

  if (mode === 'admin_http_signed') {
    summary.runtimeDelivery = {
      mode: String(runtimeDelivery.mode || '').trim(),
      adminArtifactBaseUrl: String(runtimeDelivery.adminArtifactBaseUrl || '').trim(),
      signedUrlSecretConfigured: Boolean(String(runtimeDelivery.signedUrlSecret || '').trim()),
      signedUrlExpiresSeconds: Number(runtimeDelivery.signedUrlExpiresSeconds || 0),
    }
    if (!summary.runtimeDelivery.adminArtifactBaseUrl) {
      summary.ok = false
      summary.blockers.push({
        code: 'runtime_delivery_base_url_missing',
        message: 'runtimeDelivery.adminArtifactBaseUrl 缺失，无法生成 admin_http_signed 下载地址',
      })
    }
    if (!summary.runtimeDelivery.signedUrlSecretConfigured) {
      summary.ok = false
      summary.blockers.push({
        code: 'runtime_delivery_signed_secret_missing',
        message: 'runtimeDelivery.signedUrlSecret 缺失，无法生成签名下载地址',
      })
    }
    return summary
  }

  if (!summary.bucket) {
    summary.ok = false
    summary.blockers.push({
      code: 'artifact_store_bucket_missing',
      message: 'artifact_store.config.json 缺少 artifactStore.bucket，无法规划制品路径',
    })
  }

  if (!endpoint) {
    summary.ok = false
    summary.blockers.push({
      code: 'artifact_store_endpoint_missing',
      message: 'artifact_store.config.json 缺少 artifactStore.endpoint，无法执行控制面模式验证',
    })
    return summary
  }

  let parsed = null
  try {
    parsed = new URL(endpoint)
  } catch (error) {
    summary.ok = false
    summary.blockers.push({
      code: 'artifact_store_endpoint_invalid',
      message: `artifactStore.endpoint 不是合法 URL: ${error.message}`,
    })
    return summary
  }

  if (mode === 'configured' && ['http:', 'https:'].includes(parsed.protocol)) {
    try {
      const healthUrl = new URL('/minio/health/live', endpoint).toString()
      const response = await fetch(healthUrl)
      summary.healthCheck = {
        url: healthUrl,
        status: response.status,
        ok: response.ok,
      }
      if (!response.ok) {
        summary.ok = false
        summary.blockers.push({
          code: 'artifact_store_endpoint_unhealthy',
          message: `当前配置指向的 MinIO 端点返回 ${response.status}，无法进入真实制品拉取验证`,
        })
      }
    } catch (error) {
      summary.ok = false
      summary.blockers.push({
        code: 'artifact_store_endpoint_unreachable',
        message: `当前配置指向的 MinIO 端点不可达：${error.message}`,
      })
    }
    try {
      const credentials = resolveMinioCredentials(artifactStore)
      summary.credentials = {
        accessKeyPresent: Boolean(credentials.accessKey),
        secretKeyPresent: Boolean(credentials.secretKey),
      }
    } catch (error) {
      summary.ok = false
      summary.blockers.push({
        code: error.code || 'artifact_store_credentials_missing',
        message: error.message,
      })
    }
  }

  return summary
}

/**
 * 功能：向指定 HTTP 端点发送 JSON 请求并解析响应。
 * 输入：`baseUrl`、`pathname` 和请求参数。
 * 输出：Promise，解析为状态码和 JSON/文本响应。
 */
async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body == null ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {}
  return {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    json,
    text,
  }
}

/**
 * 功能：轮询直到某个异步条件满足或超时。
 * 输入：`label` 条件名、异步断言函数和超时配置。
 * 输出：Promise，解析为满足条件时的结果对象。
 */
async function waitForCondition(label, check, options = {}) {
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || 15000))
  const intervalMs = Math.max(100, Number(options.intervalMs || 500))
  const startedAt = Date.now()
  let lastError = null
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await check()
      if (result && result.ok) {
        return result
      }
    } catch (error) {
      lastError = error
    }
    await delay(intervalMs)
  }
  const error = new Error(`${label} timed out after ${timeoutMs}ms${lastError ? `: ${lastError.message}` : ''}`)
  error.code = 'runtime_control_verify_timeout'
  throw error
}

/**
 * 功能：执行一轮真实 HTTP 控制面模式验证。
 * 输入：基础配置和验证模式。
 * 输出：Promise，解析为验证摘要对象。
 */
async function verifyRuntimeControlMode(baseConfig = defaultConfig, mode = 'configured') {
  const reportId = `${timestampId()}_runtime_control_verify_${mode}`
  const reportDir = path.join(baseConfig.resolvedPaths.hostVerificationDir, reportId)
  const summary = {
    reportId,
    reportDir,
    startedAt: new Date().toISOString(),
    mode,
    ok: false,
    blocked: false,
    blockers: [],
    steps: [],
    adminBaseUrl: '',
    runtimeBaseUrl: '',
    release: null,
    nodeId: `runtime-verify-${mode}-001`,
    reportFile: path.join(reportDir, 'summary.json'),
    originalArtifactStore: baseConfig.artifactStore,
    effectiveArtifactStore: null,
  }
  ensureDir(reportDir)

  const adminPort = await reservePort()
  const runtimePort = await reservePort()
  const adminConfigBase = createWorkspaceConfig(baseConfig, `workspace-verify-runtime-control-${mode}-admin`, adminPort)
  const adminConfig = {
    ...adminConfigBase,
    auth: {
      ...adminConfigBase.auth,
      runtimeBearerToken: 'runtime-control-verify-token',
    },
    artifactStore: createArtifactStoreForMode(baseConfig, mode, adminConfigBase.resolvedPaths.workspaceDir),
    runtimeDelivery: mode === 'admin_http_signed'
      ? {
        ...adminConfigBase.runtimeDelivery,
        mode: 'admin_http_signed',
        adminArtifactBaseUrl: `http://127.0.0.1:${adminPort}`,
        signedUrlSecret: 'runtime-control-verify-signed-secret',
        signedUrlExpiresSeconds: 300,
        bindNodeId: true,
        bindConfigVersion: true,
      }
      : {
        ...adminConfigBase.runtimeDelivery,
        mode: mode === 'file' ? 'file' : 'minio',
      },
  }
  summary.effectiveArtifactStore = adminConfig.artifactStore
  summary.effectiveRuntimeDelivery = adminConfig.runtimeDelivery

  const preflight = await artifactStorePreflight(mode, adminConfig)
  summary.preflight = preflight
  if (!preflight.ok) {
    summary.blocked = true
    summary.blockers = preflight.blockers
    summary.endedAt = new Date().toISOString()
    saveJson(summary.reportFile, summary)
    return summary
  }

  prepareData.main(adminConfig)
  summary.steps.push({
    name: 'prepare_data',
    ok: true,
  })
  bootstrapDb.main(adminConfig)
  summary.steps.push({
    name: 'bootstrap_db',
    ok: true,
  })
  const release = buildSnapshot.main(`runtime control verify ${mode}`, adminConfig)
  summary.release = {
    releaseId: release.releaseId,
    version: release.version,
  }
  summary.steps.push({
    name: 'build_snapshot',
    ok: true,
    releaseId: release.releaseId,
    version: release.version,
  })

  const syncResult = mode === 'admin_http_signed'
    ? {
      syncMode: 'admin_http_signed_no_store_sync',
      syncedTargets: [],
    }
    : await syncReleaseArtifactsToStore(adminConfig, {
      releaseId: release.releaseId,
      manifestPath: release.manifestPath,
      snapshotPath: release.snapshotPath,
      packagePath: path.join(release.artifactDir, 'package.tar.gz'),
    })
  summary.artifactSync = {
    syncMode: syncResult.syncMode,
    syncedTargets: syncResult.syncedTargets,
  }
  summary.steps.push({
    name: 'sync_artifacts',
    ok: true,
    syncMode: syncResult.syncMode,
    targetCount: (syncResult.syncedTargets || []).length,
  })

  const adminApp = createAdminApp(adminConfig)
  let runtimeApp = null
  try {
    await adminApp.start()
    summary.adminBaseUrl = `http://127.0.0.1:${adminPort}`
    await waitForCondition('admin readiness', async () => {
      const response = await requestJson(summary.adminBaseUrl, '/api/admin/me', {
        headers: {
          'x-role': 'dict_admin',
          'x-operator': 'runtime_control_verify',
        },
      })
      return {
        ok: response.ok,
        response,
      }
    }, {
      timeoutMs: 10000,
      intervalMs: 300,
    })
    summary.steps.push({
      name: 'admin_started',
      ok: true,
      baseUrl: summary.adminBaseUrl,
    })

    const setDesired = await requestJson(summary.adminBaseUrl, '/api/admin/runtime-control/desired-version', {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-role': 'dict_admin',
        'x-operator': 'runtime_control_verify',
      },
      body: {
        releaseId: release.releaseId,
      },
    })
    if (!setDesired.ok) {
      throw new Error(String(((setDesired.json || {}).error) || setDesired.text || setDesired.status))
    }
    summary.steps.push({
      name: 'set_desired_version',
      ok: true,
      desiredVersion: ((setDesired.json || {}).item || {}).desiredVersion || '',
    })

    const runtimeConfigBase = createWorkspaceConfig(baseConfig, `workspace-verify-runtime-control-${mode}-runtime`, runtimePort)
    runtimeApp = createRuntimeApp({
      ...runtimeConfigBase,
      auth: {
        ...runtimeConfigBase.auth,
        runtimeBearerToken: 'runtime-control-verify-token',
      },
      artifactStore: {
        ...adminConfig.artifactStore,
      },
      runtimeControl: {
        ...runtimeConfigBase.runtimeControl,
        adminBaseUrl: summary.adminBaseUrl,
        nodeId: summary.nodeId,
        nodeName: `Runtime Verify ${mode.toUpperCase()} Node`,
        nodeEnv: 'verify',
        nodeAddress: `http://127.0.0.1:${runtimePort}`,
        heartbeatIntervalSeconds: 1,
        syncIntervalSeconds: 1,
        statsFlushIntervalSeconds: 1,
      },
      resolvedPaths: {
        ...runtimeConfigBase.resolvedPaths,
        seedCatalogFile: path.join(runtimeConfigBase.resolvedPaths.workspaceDir, 'missing_seed_terms.json'),
      },
    })

    await runtimeApp.start()
    summary.runtimeBaseUrl = `http://127.0.0.1:${runtimePort}`
    await waitForCondition('runtime health', async () => {
      const response = await requestJson(summary.runtimeBaseUrl, '/health')
      return {
        ok: response.ok,
        response,
      }
    }, {
      timeoutMs: 10000,
      intervalMs: 300,
    })
    summary.steps.push({
      name: 'runtime_started',
      ok: true,
      baseUrl: summary.runtimeBaseUrl,
    })

    const runtimeCurrent = await waitForCondition('runtime desired version apply', async () => {
      const response = await requestJson(summary.runtimeBaseUrl, '/api/runtime/current')
      const stable = ((response.json || {}).stable) || null
      return {
        ok: response.ok && stable && stable.version === release.version,
        response,
        stable,
      }
    }, {
      timeoutMs: 20000,
      intervalMs: 500,
    })
    summary.steps.push({
      name: 'runtime_applied_desired_version',
      ok: true,
      currentVersion: runtimeCurrent.stable.version,
    })

    const correction = await requestJson(summary.runtimeBaseUrl, '/api/runtime/correct', {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: 'Bearer runtime-control-verify-token',
      },
      body: {
        text: '我想咨询旗顺路和工商认定。',
      },
    })
    if (!correction.ok) {
      throw new Error(String(((correction.json || {}).error) || correction.text || correction.status))
    }
    summary.correction = correction.json
    summary.steps.push({
      name: 'runtime_correct',
      ok: true,
      correctedText: (correction.json || {}).correctedText || '',
    })

    const nodeDetail = await waitForCondition('runtime stats upload', async () => {
      const response = await requestJson(summary.adminBaseUrl, `/api/console/runtime-nodes/${encodeURIComponent(summary.nodeId)}`, {
        headers: {
          'x-role': 'dict_admin',
          'x-operator': 'runtime_control_verify',
        },
      })
      const basic = ((response.json || {}).item || {}).basic || null
      const requestSummary = ((response.json || {}).item || {}).requestSummary || null
      return {
        ok: response.ok
          && basic
          && basic.currentVersion === release.version
          && basic.lastApplyStatus === 'success'
          && requestSummary
          && Number(requestSummary.requestCount24h || 0) >= 1,
        response,
        basic,
        requestSummary,
      }
    }, {
      timeoutMs: 20000,
      intervalMs: 500,
    })
    summary.nodeDetail = {
      basic: nodeDetail.basic,
      requestSummary: nodeDetail.requestSummary,
    }
    summary.steps.push({
      name: 'console_runtime_node_detail',
      ok: true,
      currentVersion: nodeDetail.basic.currentVersion,
      lastApplyStatus: nodeDetail.basic.lastApplyStatus,
      requestCount24h: nodeDetail.requestSummary.requestCount24h,
    })

    summary.ok = true
    summary.endedAt = new Date().toISOString()
    saveJson(summary.reportFile, summary)
    return summary
  } catch (error) {
    summary.ok = false
    summary.error = {
      code: error.code || 'runtime_control_verify_failed',
      message: error.message,
    }
    summary.endedAt = new Date().toISOString()
    saveJson(summary.reportFile, summary)
    return summary
  } finally {
    if (runtimeApp) {
      await runtimeApp.stop().catch(() => {})
    }
    await adminApp.stop().catch(() => {})
  }
}

/**
 * 功能：运行验证脚本主入口。
 * 输入：基础配置对象。
 * 输出：Promise，解析为验证结果摘要。
 */
async function main(config = defaultConfig) {
  const mode = String(readArg('--artifact-store-mode', 'configured') || 'configured').trim().toLowerCase()
  const result = await verifyRuntimeControlMode(config, mode)
  if (hasFlag('--print-report-path')) {
    console.log(result.reportFile)
  }
  return result
}

if (require.main === module) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.ok ? 0 : 1)
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = {
  artifactStorePreflight,
  createArtifactStoreForMode,
  createWorkspaceConfig,
  main,
  reservePort,
  verifyRuntimeControlMode,
}
