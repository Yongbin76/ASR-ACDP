const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { createAppConfig } = require('../lib/config');

const appConfig = createAppConfig();

function parseCli(argv = process.argv.slice(2)) {
  const positional = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] || '').trim();
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next == null || String(next).startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return {
    command: positional[0] || 'status',
    target: positional[1] || 'prototype',
    options,
  };
}

const cli = parseCli();
const command = cli.command;
const target = cli.target;
const targetOptions = cli.options;

/**
 * 功能：确保服务工作目录存在。
 * 输入：`dirPath` 目录路径。
 * 输出：无显式返回。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：构建后台服务相关路径。
 * 输入：`config` 应用配置对象，`targetName` 服务目标名。
 * 输出：包含 PID、日志和服务入口路径的对象。
 */
function servicePaths(config = appConfig, targetName = 'prototype', options = {}) {
  const serviceDir = path.join(config.resolvedPaths.workspaceDir, 'service');
  const safeTarget = ['prototype', 'runtime', 'admin'].includes(String(targetName || '')) ? String(targetName || '') : 'prototype';
  const instanceId = String(options.instance || '').trim();
  const entryFile = safeTarget === 'runtime' && instanceId
    ? path.join('cli', 'start-runtime-instance.js')
    : safeTarget === 'runtime'
      ? 'runtime-server.js'
    : safeTarget === 'admin'
      ? 'admin-server.js'
      : 'server.js';
  const runtimeInstanceArgs = [];
  if (safeTarget === 'runtime' && instanceId) {
    runtimeInstanceArgs.push('--instance', instanceId);
    for (const key of ['port', 'workspace-root', 'node-id', 'node-name', 'node-env', 'node-address', 'admin-base-url', 'registration-secret']) {
      if (options[key] != null && options[key] !== false && options[key] !== '') {
        runtimeInstanceArgs.push(`--${key}`, String(options[key]));
      }
    }
  }
  return {
    serviceDir,
    target: safeTarget,
    instanceId,
    pidFile: path.join(serviceDir, safeTarget === 'runtime' && instanceId ? `runtime-${instanceId}.pid` : `${safeTarget}.pid`),
    outLog: path.join(serviceDir, safeTarget === 'runtime' && instanceId ? `runtime-${instanceId}.out.log` : `${safeTarget}.out.log`),
    errLog: path.join(serviceDir, safeTarget === 'runtime' && instanceId ? `runtime-${instanceId}.err.log` : `${safeTarget}.err.log`),
    serverEntry: path.join(config.projectRoot, 'prototype', 'src', entryFile),
    serverArgs: runtimeInstanceArgs,
  };
}

/**
 * 功能：读取 PID 文件中的进程号。
 * 输入：`pidFile` PID 文件路径。
 * 输出：有效 PID 数字或 `null`。
 */
function readPid(pidFile) {
  if (!fs.existsSync(pidFile)) {
    return null;
  }
  const value = String(fs.readFileSync(pidFile, 'utf8') || '').trim();
  const pid = Number(value);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

/**
 * 功能：判断指定 PID 是否仍在运行。
 * 输入：`pid` 进程号。
 * 输出：布尔值。
 */
function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * 功能：以守护进程方式启动原型服务。
 * 输入：`config` 应用配置对象，`targetName` 服务目标名。
 * 输出：包含服务状态、PID 和日志路径的结果对象。
 */
function start(config = appConfig, targetName = target, options = targetOptions) {
  const paths = servicePaths(config, targetName, options);
  ensureDir(paths.serviceDir);

  const existingPid = readPid(paths.pidFile);
  if (existingPid && isRunning(existingPid)) {
    return {
      status: 'already_running',
      pid: existingPid,
      pidFile: paths.pidFile,
      outLog: paths.outLog,
      errLog: paths.errLog,
    };
  }

  if (existingPid && !isRunning(existingPid)) {
    fs.rmSync(paths.pidFile, { force: true });
  }

  const outFd = fs.openSync(paths.outLog, 'a');
  const errFd = fs.openSync(paths.errLog, 'a');
  const child = spawn(process.execPath, [paths.serverEntry, ...(paths.serverArgs || [])], {
    cwd: config.projectRoot,
    detached: true,
    stdio: ['ignore', outFd, errFd],
  });
  child.unref();
  fs.writeFileSync(paths.pidFile, `${child.pid}\n`, 'utf8');

  return {
    status: 'started',
    pid: child.pid,
    pidFile: paths.pidFile,
    outLog: paths.outLog,
    errLog: paths.errLog,
  };
}

/**
 * 功能：停止后台服务进程。
 * 输入：`config` 应用配置对象，`targetName` 服务目标名。
 * 输出：包含停止结果和 PID 信息的结果对象。
 */
function stop(config = appConfig, targetName = target, options = targetOptions) {
  const paths = servicePaths(config, targetName, options);
  const pid = readPid(paths.pidFile);
  if (!pid) {
    return {
      status: 'not_running',
      pid: null,
      pidFile: paths.pidFile,
    };
  }

  if (!isRunning(pid)) {
    fs.rmSync(paths.pidFile, { force: true });
    return {
      status: 'stale_pid_removed',
      pid,
      pidFile: paths.pidFile,
    };
  }

  process.kill(pid, 'SIGTERM');
  fs.rmSync(paths.pidFile, { force: true });
  return {
    status: 'stopped',
    pid,
    pidFile: paths.pidFile,
  };
}

/**
 * 功能：查询后台服务状态。
 * 输入：`config` 应用配置对象，`targetName` 服务目标名。
 * 输出：包含运行状态、PID 和日志路径的结果对象。
 */
function status(config = appConfig, targetName = target, options = targetOptions) {
  const paths = servicePaths(config, targetName, options);
  const pid = readPid(paths.pidFile);
  return {
    target: paths.target,
    instanceId: paths.instanceId || '',
    status: pid && isRunning(pid) ? 'running' : 'stopped',
    pid: pid && isRunning(pid) ? pid : null,
    pidFile: paths.pidFile,
    outLog: paths.outLog,
    errLog: paths.errLog,
  };
}

/**
 * 功能：根据命令行子命令执行服务启动、停止或状态查询。
 * 输入：命令行中的 `start|stop|status`。
 * 输出：对应命令的结果对象。
 */
function main() {
  if (command === 'start') {
    return start(appConfig, target, targetOptions);
  }
  if (command === 'stop') {
    return stop(appConfig, target, targetOptions);
  }
  return status(appConfig, target, targetOptions);
}

if (require.main === module) {
  console.log(JSON.stringify(main(), null, 2));
}

module.exports = {
  servicePaths,
  start,
  stop,
  status,
  main,
};
