const { spawnSync } = require('child_process');

/**
 * 功能：从命令行读取某个 flag 的值。
 * 输入：`flag` 参数名，`fallback` 默认值。
 * 输出：解析到的参数值或默认值。
 */
function readArg(flag, fallback = '') {
  const args = process.argv.slice(2);
  const inline = args.find((item) => String(item).startsWith(`${flag}=`));
  if (inline) {
    return String(inline).slice(flag.length + 1);
  }
  const index = args.indexOf(flag);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
}

/**
 * 功能：执行 kubectl 命令并收集标准输出、标准错误和退出码。
 * 输入：kubectl 参数数组。
 * 输出：命令执行结果对象。
 */
function runKubectl(args = []) {
  const result = spawnSync('kubectl', args, {
    encoding: 'utf8',
  });
  return {
    ok: result.status === 0,
    status: result.status == null ? 1 : result.status,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
  };
}

/**
 * 功能：把命令输出规范为单行字符串。
 * 输入：命令输出文本。
 * 输出：去首尾空白后的字符串。
 */
function normalizeText(value = '') {
  return String(value || '').trim();
}

/**
 * 功能：检查 kubectl 客户端是否已安装且可执行。
 * 输入：无。
 * 输出：kubectl 客户端检查结果对象。
 */
function kubectlClientCheck() {
  const result = runKubectl(['version', '--client', '--output=json']);
  return {
    ok: result.ok,
    stdout: normalizeText(result.stdout),
    error: normalizeText(result.stderr),
  };
}

/**
 * 功能：读取当前 kubectl context。
 * 输入：无。
 * 输出：context 检查结果对象。
 */
function currentContextCheck() {
  const result = runKubectl(['config', 'current-context']);
  return {
    ok: result.ok && normalizeText(result.stdout).length > 0,
    currentContext: normalizeText(result.stdout),
    error: normalizeText(result.stderr),
  };
}

/**
 * 功能：检查某个 namespace 是否存在。
 * 输入：namespace 名称。
 * 输出：namespace 检查结果对象。
 */
function namespaceCheck(namespace) {
  const result = runKubectl(['get', 'namespace', namespace, '-o', 'name']);
  return {
    ok: result.ok,
    namespace,
    output: normalizeText(result.stdout),
    error: normalizeText(result.stderr),
  };
}

/**
 * 功能：检查某个 Secret 是否存在。
 * 输入：namespace 和 secret 名称。
 * 输出：Secret 检查结果对象。
 */
function secretCheck(namespace, secretName) {
  const result = runKubectl(['get', 'secret', secretName, '-n', namespace, '-o', 'name']);
  return {
    ok: result.ok,
    namespace,
    secretName,
    output: normalizeText(result.stdout),
    error: normalizeText(result.stderr),
  };
}

/**
 * 功能：检查目标集群的基础前置条件。
 * 输入：无；从命令行读取 namespace 与 secret 参数。
 * 输出：目标集群前置条件检查结果对象。
 */
function main() {
  const namespace = normalizeText(readArg('--namespace', 'acdp')) || 'acdp';
  const artifactSecretName = normalizeText(readArg('--artifact-secret', 'acdp-artifact-store')) || 'acdp-artifact-store';
  const runtimeSecretName = normalizeText(readArg('--runtime-secret', 'acdp-runtime-auth')) || 'acdp-runtime-auth';

  const kubectlClient = kubectlClientCheck();
  if (!kubectlClient.ok) {
    return {
      ok: false,
      blocked: true,
      blockers: ['kubectl_client_unavailable'],
      kubectlClient,
      namespace,
      artifactSecretName,
      runtimeSecretName,
      recommendations: [
        '当前主机未能执行 kubectl，请先安装或修复 kubectl 客户端。',
      ],
    };
  }

  const context = currentContextCheck();
  if (!context.ok) {
    return {
      ok: false,
      blocked: true,
      blockers: ['kube_context_missing'],
      kubectlClient,
      context,
      namespace,
      artifactSecretName,
      runtimeSecretName,
      recommendations: [
        '当前 kubectl 没有可用 current-context，请先提供目标集群 kubeconfig 或设置当前 context。',
      ],
    };
  }

  const namespaceResult = namespaceCheck(namespace);
  const artifactSecret = secretCheck(namespace, artifactSecretName);
  const runtimeSecret = secretCheck(namespace, runtimeSecretName);
  const blockers = [];
  if (!namespaceResult.ok) {
    blockers.push('namespace_missing');
  }
  if (!artifactSecret.ok) {
    blockers.push('artifact_secret_missing');
  }
  if (!runtimeSecret.ok) {
    blockers.push('runtime_secret_missing');
  }

  return {
    ok: blockers.length === 0,
    blocked: blockers.length > 0,
    blockers,
    kubectlClient,
    context,
    namespace: namespaceResult,
    artifactSecret,
    runtimeSecret,
    recommendations: [
      namespaceResult.ok ? null : `目标 namespace 不存在：${namespace}`,
      artifactSecret.ok ? null : `制品仓 Secret 不存在：${artifactSecretName}`,
      runtimeSecret.ok ? null : `runtime token Secret 不存在：${runtimeSecretName}`,
    ].filter(Boolean),
  };
}

if (require.main === module) {
  try {
    const result = main();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

module.exports = {
  currentContextCheck,
  kubectlClientCheck,
  main,
  namespaceCheck,
  normalizeText,
  readArg,
  runKubectl,
  secretCheck,
};
