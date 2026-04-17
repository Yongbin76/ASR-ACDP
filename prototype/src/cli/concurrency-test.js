const fs = require('fs');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');

const { createAppConfig } = require('../lib/config');
const prepareData = require('./prepare-data');
const bootstrapDb = require('./bootstrap-db');
const buildSnapshot = require('./build-snapshot');
const { startRuntimeServer } = require('../server');

const defaultConfig = createAppConfig();

/**
 * 功能：读取命令行 flag 的值。
 * 输入：`flag` 参数名，`fallback` 默认值，`argv` 参数数组。
 * 输出：解析值或默认值。
 */
function readArg(flag, fallback, argv = process.argv.slice(2)) {
  const inline = argv.find((item) => String(item).startsWith(`${flag}=`));
  if (inline) {
    return String(inline).slice(flag.length + 1);
  }
  const index = argv.indexOf(flag);
  return index >= 0 && index + 1 < argv.length ? argv[index + 1] : fallback;
}

/**
 * 功能：判断字符串是否为非空文本。
 * 输入：任意值。
 * 输出：非空字符串返回 `true`，否则返回 `false`。
 */
function hasText(value) {
  return String(value || '').trim().length > 0;
}

/**
 * 功能：标准化基础地址，移除结尾多余斜杠。
 * 输入：基础地址字符串。
 * 输出：标准化后的地址字符串。
 */
function normalizeBaseUrl(value = '') {
  return String(value || '').trim().replace(/\/+$/, '');
}

/**
 * 功能：确保目录存在。
 * 输入：目录路径。
 * 输出：无显式返回。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：把对象保存为 JSON 文件。
 * 输入：文件路径和任意对象。
 * 输出：无显式返回。
 */
function saveJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

/**
 * 功能：生成可用于报告目录名的时间戳标识。
 * 输入：无。
 * 输出：时间戳字符串。
 */
function timestampId() {
  return new Date().toISOString().replace(/[:]/g, '-');
}

/**
 * 功能：计算延迟数组的百分位数。
 * 输入：`sortedValues` 数值数组，`ratio` 百分位比例。
 * 输出：对应百分位的数值。
 */
function percentile(sortedValues, ratio) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * ratio) - 1));
  return sortedValues[index];
}

/**
 * 功能：构造当前宿主机环境摘要。
 * 输入：无。
 * 输出：宿主机信息对象。
 */
function hostSummary() {
  const cpus = os.cpus() || [];
  const firstCpu = cpus[0] || {};
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpuModel: String(firstCpu.model || ''),
    cpuCount: cpus.length,
    totalMemoryBytes: os.totalmem(),
    freeMemoryBytes: os.freemem(),
  };
}

/**
 * 功能：生成并发压测报告路径。
 * 输入：配置对象和可选报告标签。
 * 输出：报告路径对象。
 */
function buildReportPaths(config, reportLabel = 'runtime_concurrency_verify') {
  const reportId = `${timestampId()}_${String(reportLabel || 'runtime_concurrency_verify').trim() || 'runtime_concurrency_verify'}`;
  const reportDir = path.join(config.resolvedPaths.hostVerificationDir, reportId);
  return {
    reportId,
    reportDir,
    reportFile: path.join(reportDir, 'summary.json'),
  };
}

/**
 * 功能：构建并发测试专用配置和独立工作目录。
 * 输入：基础配置和附加选项。
 * 输出：压测专用配置对象。
 */
function createLoadTestConfig(baseConfig = defaultConfig, options = {}) {
  const argv = Array.isArray(options.argv) ? options.argv : process.argv.slice(2);
  const workspaceName = String(options.workspaceName || 'workspace-loadtest').trim() || 'workspace-loadtest';
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', workspaceName);
  const catalogDir = path.join(workspaceDir, 'catalog');
  const releasesDir = path.join(workspaceDir, 'releases');
  fs.mkdirSync(catalogDir, { recursive: true });
  fs.mkdirSync(releasesDir, { recursive: true });

  return {
    ...baseConfig,
    server: {
      ...baseConfig.server,
      host: '127.0.0.1',
      port: Math.max(1, Number(readArg('--port', 8792, argv))),
    },
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
      catalogDir,
      releasesDir,
      latestReleaseDir: path.join(releasesDir, 'latest'),
      databaseFile: path.join(workspaceDir, 'platform.db'),
      seedCatalogFile: path.join(catalogDir, 'seed_terms.json'),
      validationFeedInboxDir: path.join(workspaceDir, 'validation_feeds', 'inbox'),
      validationFeedArchiveDir: path.join(workspaceDir, 'validation_feeds', 'archive'),
      validationFeedErrorDir: path.join(workspaceDir, 'validation_feeds', 'error'),
    }
  };
}

/**
 * 功能：构造 runtime 纠错请求所需请求头。
 * 输入：应用配置对象。
 * 输出：请求头对象。
 */
function runtimeRequestHeaders(config = defaultConfig) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'x-operator': 'concurrency_test',
    'x-role': 'dict_admin',
  };
  const runtimeToken = String((((config || {}).auth || {}).runtimeBearerToken) || '').trim();
  if (runtimeToken) {
    headers.authorization = `Bearer ${runtimeToken}`;
  }
  return headers;
}

/**
 * 功能：发送任意 HTTP 请求并解析返回内容。
 * 输入：基础地址、路由和请求选项。
 * 输出：包含状态码、响应头和解析后数据的对象。
 */
async function requestJson(baseUrl, route, options = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const res = await fetch(new URL(route, `${normalizedBaseUrl}/`).toString(), {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body,
  });
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawText: text };
    }
  }
  return {
    status: res.status,
    contentType: res.headers.get('content-type') || '',
    data,
    rawText: text,
  };
}

/**
 * 功能：读取当前 runtime 服务统计快照。
 * 输入：基础地址。
 * 输出：runtime stats 对象。
 */
async function readRuntimeStats(baseUrl) {
  const result = await requestJson(baseUrl, '/api/runtime/stats');
  if (result.status >= 400) {
    throw new Error(`runtime stats request failed ${result.status}: ${JSON.stringify(result.data)}`);
  }
  return result.data;
}

/**
 * 功能：发送单次压测请求并记录耗时。
 * 输入：基础地址、路由、请求体和应用配置对象。
 * 输出：包含 `durationMs` 和响应数据的对象。
 */
async function request(baseUrl, route, body, config = defaultConfig) {
  const startedAt = performance.now();
  const result = await requestJson(baseUrl, route, {
    method: 'POST',
    headers: runtimeRequestHeaders(config),
    body: JSON.stringify(body),
  });
  const durationMs = performance.now() - startedAt;
  if (result.status >= 400) {
    throw new Error(`request failed ${result.status}: ${JSON.stringify(result.data)}`);
  }
  return {
    durationMs,
    data: result.data,
  };
}

/**
 * 功能：执行单个并发 worker 的多次请求。
 * 输入：基础地址、接口路径、迭代次数、测试文本、worker 编号和应用配置对象。
 * 输出：包含该 worker 延迟列表和样例纠正文本的对象。
 */
async function worker(baseUrl, endpoint, iterations, text, workerId, config = defaultConfig) {
  const durations = [];
  let correctedText = '';
  for (let index = 0; index < iterations; index += 1) {
    const result = await request(baseUrl, endpoint, {
      text,
      trafficKey: `loadtest-${workerId}-${index}`,
    }, config);
    durations.push(result.durationMs);
    correctedText = result.data.correctedText;
  }
  return {
    workerId,
    iterations,
    correctedText,
    durations,
  };
}

/**
 * 功能：汇总并发压测指标，并合并 runtime stats 中的关键观测。
 * 输入：worker 结果、runtime stats 快照和压测选项。
 * 输出：并发指标对象。
 */
function buildConcurrencySummary(results = [], runtimeStats = {}, options = {}) {
  const durations = results.flatMap((item) => item.durations).sort((left, right) => left - right);
  const totalDurationMs = Number(options.totalDurationMs || 0);
  const totalRequests = Number(options.totalRequests || 0);
  const requestedTargetRps = Number(options.targetRps);
  const hasTargetRps = Number.isFinite(requestedTargetRps) && requestedTargetRps > 0;
  const avgLatencyMs = durations.length > 0
    ? Number((durations.reduce((sum, item) => sum + item, 0) / durations.length).toFixed(2))
    : 0;
  const throughputRps = Number((totalRequests / Math.max(totalDurationMs / 1000, 0.001)).toFixed(2));
  return {
    endpoint: String(options.endpoint || ''),
    concurrency: Number(options.users || 0),
    iterationsPerUser: Number(options.iterations || 0),
    totalRequests,
    totalDurationMs: Number(totalDurationMs.toFixed(2)),
    throughputRps,
    targetRps: hasTargetRps ? requestedTargetRps : null,
    meetsTarget: hasTargetRps ? throughputRps >= requestedTargetRps : null,
    avgLatencyMs,
    p50LatencyMs: Number(percentile(durations, 0.5).toFixed(2)),
    p95LatencyMs: Number(percentile(durations, 0.95).toFixed(2)),
    maxLatencyMs: Number((durations[durations.length - 1] || 0).toFixed(2)),
    peakConcurrency: Number((((runtimeStats || {}).peak || {}).peakConcurrency) || 0),
    runtimeTotalCorrections: Number(runtimeStats.totalCorrections || 0),
    runtimeTotalErrors: Number(runtimeStats.totalErrors || 0),
    runtimeInFlightAfter: Number(runtimeStats.inFlight || 0),
    sampleCorrectedText: results[0] ? results[0].correctedText : '',
  };
}

/**
 * 功能：启动临时服务或复用现有 runtime 服务，并执行并发压测。
 * 输入：可选 `argv`、`baseConfig`、`workspaceName` 和 `reportLabel`。
 * 输出：包含报告路径、宿主机摘要、runtime stats 与并发指标的汇总对象。
 */
async function main(options = {}) {
  const argv = Array.isArray(options.argv) ? options.argv : process.argv.slice(2);
  const baseConfig = options.baseConfig || defaultConfig;
  const users = Math.max(1, Math.min(200, Number(readArg('--users', readArg('--concurrency', 5, argv), argv))));
  const iterations = Math.max(1, Math.min(1000, Number(readArg('--iterations', 10, argv))));
  const text = readArg('--text', '我想咨询旗顺路和市发改委，还有工商认定。', argv);
  const endpoint = readArg('--endpoint', '/api/runtime/correct', argv);
  const parsedTargetRps = Number(readArg('--target-rps', '', argv));
  const targetRps = Number.isFinite(parsedTargetRps) && parsedTargetRps > 0 ? parsedTargetRps : null;
  const explicitBaseUrl = normalizeBaseUrl(readArg('--base-url', '', argv));
  const config = createLoadTestConfig(baseConfig, {
    argv,
    workspaceName: options.workspaceName,
  });
  const reportPaths = buildReportPaths(config, options.reportLabel);
  const summary = {
    ...reportPaths,
    startedAt: new Date().toISOString(),
    endedAt: null,
    ok: false,
    mode: explicitBaseUrl ? 'external_runtime' : 'embedded_runtime',
    host: hostSummary(),
    loadTest: {
      baseUrl: explicitBaseUrl || `http://${config.server.host}:${config.server.port}`,
      endpoint,
      users,
      iterations,
      targetRps,
      text,
    },
    prepared: null,
    bootstrapped: null,
    release: null,
    runtimeStats: {
      before: null,
      after: null,
    },
    concurrency: null,
    error: null,
    recommendations: [],
  };
  ensureDir(summary.reportDir);

  let app = null;

  try {
    let baseUrl = summary.loadTest.baseUrl;

    if (!explicitBaseUrl) {
      if (fs.existsSync(config.resolvedPaths.workspaceDir)) {
        fs.rmSync(config.resolvedPaths.workspaceDir, { recursive: true, force: true });
        fs.mkdirSync(config.resolvedPaths.catalogDir, { recursive: true });
        fs.mkdirSync(config.resolvedPaths.releasesDir, { recursive: true });
      }

      summary.prepared = prepareData.main(config);
      summary.bootstrapped = bootstrapDb.main(config);
      const release = buildSnapshot.main('concurrency baseline build', config);
      summary.release = {
        releaseId: release.releaseId,
        version: release.version,
      };
      app = await startRuntimeServer(config);
      baseUrl = `http://${config.server.host}:${config.server.port}`;
      summary.loadTest.baseUrl = baseUrl;
    }

    summary.runtimeStats.before = await readRuntimeStats(baseUrl);

    const startedAt = performance.now();
    const results = await Promise.all(Array.from(
      { length: users },
      (_, index) => worker(baseUrl, endpoint, iterations, text, index + 1, config),
    ));
    const totalDurationMs = performance.now() - startedAt;

    summary.runtimeStats.after = await readRuntimeStats(baseUrl);
    summary.concurrency = buildConcurrencySummary(results, summary.runtimeStats.after, {
      endpoint,
      users,
      iterations,
      totalRequests: users * iterations,
      totalDurationMs,
      targetRps,
    });
    summary.ok = true;
    summary.endedAt = new Date().toISOString();
    saveJson(summary.reportFile, summary);
    return summary;
  } catch (error) {
    summary.error = {
      message: String(error && error.message ? error.message : error),
      code: String(error && error.code ? error.code : ''),
      stack: String(error && error.stack ? error.stack : ''),
    };
    if (error && error.code === 'EPERM') {
      summary.recommendations.push('当前环境不允许本地端口监听；请在真实宿主机运行 `npm run test:concurrency` 或改用 `--base-url` 指向已运行的 runtime。');
    }
    summary.endedAt = new Date().toISOString();
    saveJson(summary.reportFile, summary);
    error.reportFile = summary.reportFile;
    throw error;
  } finally {
    if (app) {
      await app.stop();
    }
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      console.log(`concurrency report: ${result.reportFile}`);
    })
    .catch((error) => {
      if (error && error.reportFile) {
        console.error(`concurrency report: ${error.reportFile}`);
      }
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  buildConcurrencySummary,
  buildReportPaths,
  createLoadTestConfig,
  hasText,
  main,
  normalizeBaseUrl,
  readArg,
  readRuntimeStats,
  requestJson,
  runtimeRequestHeaders,
};
