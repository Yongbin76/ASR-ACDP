const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawnSync } = require('child_process');

const { createAppConfig } = require('../lib/config');
const { createPrototypeApp, startServer } = require('../server');
const serviceManager = require('./service-manager');

const appConfig = createAppConfig();

/**
 * 功能：确保`dir`相关逻辑。
 * 输入：`dirPath`（目录路径）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：处理`npmCommand`相关逻辑。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

/**
 * 功能：处理`timestampId`相关逻辑。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function timestampId() {
  return new Date().toISOString().replace(/[:]/g, '-');
}

/**
 * 功能：申请一个当前可用的本地回环 TCP 端口。
 * 输入：无。
 * 输出：`Promise`，解析为端口号。
 */
function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address && typeof address === 'object' ? Number(address.port || 0) : 0;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

/**
 * 功能：创建仅用于当前验证的本地回环监听配置。
 * 输入：基础应用配置和监听端口。
 * 输出：指向 `127.0.0.1` 的临时应用配置对象。
 */
function createLoopbackConfig(config, port) {
  return {
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port,
      runtimePort: port,
      adminPort: port,
    },
  };
}

/**
 * 功能：写入`text`相关逻辑。
 * 输入：`filePath`（文件路径）、`content`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function writeText(filePath, content) {
  fs.writeFileSync(filePath, String(content || ''), 'utf8');
}

/**
 * 功能：保存`json`相关逻辑。
 * 输入：`filePath`（文件路径）、`value`（待处理值）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function saveJson(filePath, value) {
  writeText(filePath, JSON.stringify(value, null, 2));
}

/**
 * 功能：处理`runCommand`相关逻辑。
 * 输入：`reportDir`（调用参数）、`index`（调用参数）、`name`（调用参数）、`args`（调用参数）、`options`（扩展选项）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function runCommand(reportDir, index, name, args, options = {}) {
  const command = npmCommand();
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd || appConfig.projectRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });
  const endedAt = new Date().toISOString();
  const baseName = `${String(index).padStart(2, '0')}_${name}`;
  const stdoutFile = path.join(reportDir, `${baseName}.stdout.log`);
  const stderrFile = path.join(reportDir, `${baseName}.stderr.log`);
  writeText(stdoutFile, result.stdout || '');
  writeText(stderrFile, result.stderr || '');
  return {
    name,
    command: [command, ...args].join(' '),
    startedAt,
    endedAt,
    durationMs: Date.now() - startedMs,
    exitCode: result.status == null ? 1 : result.status,
    stdoutFile,
    stderrFile,
    ok: result.status === 0,
  };
}

/**
 * 功能：等待`for health`相关逻辑。
 * 输入：`baseUrl`（基础地址）、`timeoutMs`（超时时间（毫秒））。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function waitForHealth(baseUrl, timeoutMs = 30000) {
  const startedMs = Date.now();
  const attempts = [];
  while (Date.now() - startedMs < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      attempts.push({
        at: new Date().toISOString(),
        status: res.status,
      });
      if (res.ok) {
        return {
          ok: true,
          attempts,
          response: json || text,
        };
      }
    } catch (error) {
      attempts.push({
        at: new Date().toISOString(),
        error: error.message,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return {
    ok: false,
    attempts,
  };
}

/**
 * 功能：采集`http`相关逻辑。
 * 输入：`reportDir`（调用参数）、`index`（调用参数）、`name`（调用参数）、`url`（URL 地址）、`options`（扩展选项）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function captureHttp(reportDir, index, name, url, options = {}) {
  const startedMs = Date.now();
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
  });
  const contentType = String(res.headers.get('content-type') || '');
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  const baseName = `${String(index).padStart(2, '0')}_${name}`;
  const metaFile = path.join(reportDir, `${baseName}.meta.json`);
  const bodyExt = inferBodyExtension(contentType, text, json);
  const bodyFile = path.join(reportDir, `${baseName}.body.${bodyExt}`);
  writeText(bodyFile, text);
  saveJson(metaFile, {
    name,
    url,
    method: options.method || 'GET',
    status: res.status,
    ok: res.ok,
    durationMs: Date.now() - startedMs,
    contentType,
    headers: Object.fromEntries(res.headers.entries()),
    bodyFile,
  });
  return {
    name,
    url,
    status: res.status,
    ok: res.ok,
    durationMs: Date.now() - startedMs,
    contentType,
    metaFile,
    bodyFile,
    json,
    text,
  };
}

/**
 * 功能：在无法监听端口时，通过应用注入模式采集响应并落盘。
 * 输入：报告目录、序号、名称、应用实例、路径以及请求选项。
 * 输出：`Promise`，解析为采集结果对象。
 */
async function captureInject(reportDir, index, name, app, pathname, options = {}) {
  const startedMs = Date.now();
  const response = await app.inject({
    method: options.method || 'GET',
    url: pathname,
    headers: options.headers || {},
  });
  const contentType = String(response.headers['content-type'] || '');
  const text = String(response.body || '');
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  const baseName = `${String(index).padStart(2, '0')}_${name}`;
  const metaFile = path.join(reportDir, `${baseName}.meta.json`);
  const bodyExt = inferBodyExtension(contentType, text, json);
  const bodyFile = path.join(reportDir, `${baseName}.body.${bodyExt}`);
  writeText(bodyFile, text);
  saveJson(metaFile, {
    name,
    url: pathname,
    method: options.method || 'GET',
    mode: 'inject',
    status: response.statusCode,
    ok: response.statusCode < 400,
    durationMs: Date.now() - startedMs,
    contentType,
    headers: response.headers,
    bodyFile,
  });
  return {
    name,
    url: pathname,
    status: response.statusCode,
    ok: response.statusCode < 400,
    durationMs: Date.now() - startedMs,
    contentType,
    metaFile,
    bodyFile,
    json,
    text,
  };
}

/**
 * 功能：根据响应头和响应体内容推断证据文件扩展名。
 * 输入：`contentType`（响应类型）、`text`（响应文本）、`json`（已解析的 JSON 结果或 `null`）。
 * 输出：字符串；返回 `html`、`json` 或 `txt`。
 */
function inferBodyExtension(contentType, text, json) {
  if (contentType.includes('html')) {
    return 'html';
  }
  if (contentType.includes('json')) {
    return 'json';
  }
  if (json !== null) {
    return 'json';
  }
  if (/^\s*<!doctype html\b/i.test(text) || /^\s*<html\b/i.test(text)) {
    return 'html';
  }
  return 'txt';
}

/**
 * 功能：创建`manual files`相关逻辑。
 * 输入：`reportDir`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createManualFiles(reportDir) {
  ensureDir(path.join(reportDir, 'screenshots'));
  ensureDir(path.join(reportDir, 'notes'));
  writeText(path.join(reportDir, 'notes', 'manual-checklist.md'), [
    '# Host Manual Checklist',
    '',
    '## 1. Basic',
    '',
    '- Report directory:',
    `  - ${reportDir}`,
    '- Checker:',
    '- Host:',
    '- Time:',
    '',
    '## 2. Automated Verification',
    '',
    '- [ ] `npm run check:env` passed',
    '- [ ] `npm run test:unit` passed',
    '- [ ] `npm run test:console` passed',
    '- [ ] `npm run smoke:console` passed',
    '- [ ] `summary.json` shows `ok=true`',
    '- [ ] `entryIsolation.adminOk=true`',
    '- [ ] `entryIsolation.consoleOk=true`',
    '- [ ] `entryIsolation.adminIndependentFromConsole=true`',
    '',
    '## 3. Manual Page Review',
    '',
    '### 3.1 `/admin` Independence',
    '',
    '- [ ] `/admin` page opens normally',
    '- [ ] `/admin` base interactions remain usable',
    '- [ ] `/admin` static assets are not mixed with `/console` assets',
    '- Notes:',
    '',
    '### 3.2 `/console` Overview',
    '',
    '- [ ] `/console` page opens normally',
    '- [ ] left navigation switches normally',
    '- [ ] top current-user/current-role linkage works',
    '- [ ] overview/workbench loads normally',
    '- Notes:',
    '',
    '### 3.3 `/console/terms`',
    '',
    '- [ ] term list loads normally',
    '- [ ] term detail opens normally',
    '- [ ] right-side creation panel does not overlap the main table',
    '- Notes:',
    '',
    '### 3.4 `/console/import`',
    '',
    '- [ ] import home loads normally',
    '- [ ] template detail opens normally',
    '- [ ] template/example download actions are visible and usable',
    '- Notes:',
    '',
    '### 3.5 `/console/reviews`',
    '',
    '- [ ] review list loads normally',
    '- [ ] review detail opens normally',
    '- Notes:',
    '',
    '### 3.6 `/console/releases`',
    '',
    '- [ ] release list loads normally',
    '- [ ] release detail opens normally',
    '- [ ] confirmation/gate/validation dense blocks render with in-card scroll or folded dense block treatment',
    '- Notes:',
    '',
    '### 3.7 `/console/validation-cases`',
    '',
    '- [ ] validation-case list loads normally',
    '- [ ] validation-case detail opens normally',
    '- Notes:',
    '',
    '## 4. Screenshot Checklist',
    '',
    '- [ ] `screenshots/01_admin_home.png`',
    '- [ ] `screenshots/02_console_overview.png`',
    '- [ ] `screenshots/03_console_terms.png`',
    '- [ ] `screenshots/04_console_import.png`',
    '- [ ] `screenshots/05_console_reviews.png`',
    '- [ ] `screenshots/06_console_releases.png`',
    '- [ ] `screenshots/07_console_validation_cases.png`',
    '',
    '## 5. Issue Log',
    '',
    '- Route:',
    '- Operator/Role:',
    '- Expected:',
    '- Actual:',
    '- Severity:',
    '',
    'Suggested references:',
    '- docs/25-console宿主环境联调与smoke执行说明.md',
    '- docs/27-console联调记录模板.md',
    '- docs/28-console试用反馈收集模板.md',
  ].join('\n'));
  writeText(path.join(reportDir, 'notes', 'operator-summary.md'), [
    '# Operator Summary',
    '',
    '## 1. Execution Meta',
    '',
    '- Tester:',
    '- Host:',
    '- Time:',
    '- Report:',
    `  - ${path.join(reportDir, 'summary.json')}`,
    '',
    '## 2. Automated Result',
    '',
    '- Result:',
    '- check:env:',
    '- test:unit:',
    '- test:console:',
    '- smoke:console:',
    '- entry isolation:',
    '',
    '## 3. Manual Result',
    '',
    '- `/admin` independence:',
    '- `/console` overview:',
    '- `/console/terms`:',
    '- `/console/import`:',
    '- `/console/reviews`:',
    '- `/console/releases`:',
    '- `/console/validation-cases`:',
    '',
    '## 4. Screenshot Archive',
    '',
    '- `screenshots/01_admin_home.png`:',
    '- `screenshots/02_console_overview.png`:',
    '- `screenshots/03_console_terms.png`:',
    '- `screenshots/04_console_import.png`:',
    '- `screenshots/05_console_reviews.png`:',
    '- `screenshots/06_console_releases.png`:',
    '- `screenshots/07_console_validation_cases.png`:',
    '',
    '## 5. Key Findings',
    '',
    '- P0:',
    '- P1:',
    '- P2:',
    '- P3:',
    '',
    '## 6. Conclusion',
    '',
    '- Conclusion:',
    '- Next action:',
  ].join('\n'));
}

/**
 * 功能：执行当前脚本或模块的主流程。
 * 输入：`config`（配置对象）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function main(config = appConfig) {
  const reportRoot = config.resolvedPaths.hostVerificationDir;
  const reportId = `${timestampId()}_host_console_verify`;
  const reportDir = path.join(reportRoot, reportId);
  ensureDir(reportDir);
  createManualFiles(reportDir);

  const summary = {
    reportId,
    reportDir,
    startedAt: new Date().toISOString(),
    baseUrl: `http://127.0.0.1:${config.server.port}`,
    serviceLogs: serviceManager.servicePaths(config),
    commandSteps: [],
    httpChecks: [],
    serviceLifecycle: {},
    exitCode: 0,
    ok: false,
  };

  const commandMatrix = [
    ['check_env', ['run', 'check:env']],
    ['test_unit', ['run', 'test:unit']],
    ['test_console', ['run', 'test:console']],
    ['smoke_console', ['run', 'smoke:console']],
  ];

  for (let index = 0; index < commandMatrix.length; index += 1) {
    const [name, args] = commandMatrix[index];
    const step = runCommand(reportDir, index + 1, name, args);
    summary.commandSteps.push(step);
    if (!step.ok) {
      summary.exitCode = 1;
      summary.endedAt = new Date().toISOString();
      saveJson(path.join(reportDir, 'summary.json'), summary);
      return summary;
    }
  }

  const serviceStatusBefore = serviceManager.status(config);
  summary.serviceLifecycle.before = serviceStatusBefore;
  let startedByScript = false;
  let fallbackApp = null;
  let injectApp = null;
  let captureMode = 'http';
  if (serviceStatusBefore.status !== 'running') {
    summary.serviceLifecycle.start = serviceManager.start(config);
    startedByScript = summary.serviceLifecycle.start.status === 'started';
  }

  const healthCheck = await waitForHealth(summary.baseUrl, 30000);
  summary.serviceLifecycle.health = healthCheck;
  if (!healthCheck.ok) {
    if (startedByScript) {
      summary.serviceLifecycle.stop = serviceManager.stop(config);
      startedByScript = false;
    }
    try {
      const fallbackPort = await reservePort();
      const fallbackConfig = createLoopbackConfig(config, fallbackPort);
      summary.baseUrl = `http://127.0.0.1:${fallbackPort}`;
      fallbackApp = await startServer(fallbackConfig);
      captureMode = 'http';
      summary.serviceLifecycle.fallback = {
        status: 'started',
        host: fallbackConfig.server.host,
        port: fallbackPort,
        reason: 'managed_service_health_check_failed',
      };
      const fallbackHealth = await waitForHealth(summary.baseUrl, 30000);
      summary.serviceLifecycle.fallbackHealth = fallbackHealth;
      if (!fallbackHealth.ok) {
        summary.exitCode = 1;
      }
    } catch (error) {
      try {
        injectApp = createPrototypeApp(config);
        captureMode = 'inject';
        summary.baseUrl = 'inject://prototype';
        summary.serviceLifecycle.fallback = {
          status: 'inject',
          reason: 'managed_service_and_loopback_listen_failed',
          error: error.message,
        };
      } catch (injectError) {
        summary.serviceLifecycle.fallback = {
          status: 'failed',
          reason: 'managed_service_health_check_failed',
          error: injectError.message,
          previousError: error.message,
        };
        summary.exitCode = 1;
      }
    }
  }

  if (summary.exitCode === 0) {
    const adminHeaders = {
      'x-role': 'dict_admin',
      'x-operator': 'host_console_verify',
    };
    const capture = captureMode === 'inject'
      ? (index, name, pathname, options = {}) => captureInject(reportDir, index, name, injectApp, pathname, options)
      : (index, name, pathname, options = {}) => captureHttp(reportDir, index, name, `${summary.baseUrl}${pathname}`, options);
    summary.captureMode = captureMode;
    summary.httpChecks.push(await capture(5, 'health', '/health'));
    summary.httpChecks.push(await capture(6, 'admin_page', '/admin', { headers: adminHeaders }));
    summary.httpChecks.push(await capture(7, 'console_page', '/console', { headers: adminHeaders }));
    summary.httpChecks.push(await capture(8, 'admin_dashboard', '/api/admin/dashboard', { headers: adminHeaders }));
    summary.httpChecks.push(await capture(9, 'console_overview', '/api/console/overview', { headers: adminHeaders }));
    summary.httpChecks.push(await capture(10, 'runtime_current', '/api/runtime/current'));

    const adminPage = summary.httpChecks.find((item) => item.name === 'admin_page');
    const consolePage = summary.httpChecks.find((item) => item.name === 'console_page');
    summary.entryIsolation = {
      adminOk: Boolean(adminPage && adminPage.ok && /ACDP 管理原型/.test(adminPage.text)),
      consoleOk: Boolean(consolePage && consolePage.ok && /ACDP 后台/.test(consolePage.text)),
      adminIndependentFromConsole: Boolean(
        adminPage
        && consolePage
        && !/ACDP 后台/.test(adminPage.text)
        && !/console\/app\.js/.test(adminPage.text)
        && /ACDP 后台/.test(consolePage.text)
      ),
    };
    if (!summary.entryIsolation.adminOk || !summary.entryIsolation.consoleOk || !summary.entryIsolation.adminIndependentFromConsole) {
      summary.exitCode = 1;
    }
  }

  if (fallbackApp) {
    await fallbackApp.stop();
    summary.serviceLifecycle.stop = {
      status: 'stopped_in_process_fallback',
      reason: 'fallback_loopback_server_stopped',
    };
  } else if (injectApp) {
    await injectApp.stop();
    summary.serviceLifecycle.stop = {
      status: 'stopped_inject_fallback',
      reason: 'inject_fallback_app_stopped',
    };
  } else if (startedByScript) {
    summary.serviceLifecycle.stop = serviceManager.stop(config);
  } else if (!summary.serviceLifecycle.stop) {
    summary.serviceLifecycle.stop = {
      status: 'left_running',
      reason: 'service_was_already_running_before_verification',
    };
  }

  summary.ok = summary.exitCode === 0;
  summary.endedAt = new Date().toISOString();
  saveJson(path.join(reportDir, 'summary.json'), summary);
  return summary;
}

if (require.main === module) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      console.log(`host verification report: ${path.join(result.reportDir, 'summary.json')}`);
      process.exit(result.exitCode || 0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  main,
};
