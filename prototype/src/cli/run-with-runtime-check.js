const path = require('path');
const { spawnSync } = require('child_process');

/**
 * 功能：校验当前 Node 运行时是否支持内置 `node:sqlite`。
 * 输入：无。
 * 输出：通过时无显式返回，失败时退出进程。
 */
function ensureBuiltinSqlite() {
  try {
    require('node:sqlite');
    return;
  } catch (error) {
    const lines = [
      `[ACDP] Unsupported Node.js runtime: ${process.version}`,
      '[ACDP] This prototype depends on the built-in `node:sqlite` module.',
      '[ACDP] Use Node.js >= 22.13.0, then rerun `npm run check:env`.',
      '[ACDP] Current command was stopped before application startup.',
    ];
    if (error && error.code) {
      lines.push(`[ACDP] Detected module error: ${error.code}`);
    }
    console.error(lines.join('\n'));
    process.exit(1);
  }
}

/**
 * 功能：执行运行时检查并转发到目标脚本。
 * 输入：命令行中的 `--check-only` 或目标脚本路径。
 * 输出：检查结果或目标脚本退出状态。
 */
function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--check-only') {
    ensureBuiltinSqlite();
    console.log(`[ACDP] Environment OK: ${process.version} with node:sqlite available.`);
    return;
  }

  const [targetScript, ...scriptArgs] = args;
  if (!targetScript) {
    console.error('[ACDP] Missing target script for runtime wrapper.');
    process.exit(1);
  }

  ensureBuiltinSqlite();

  const resolvedTarget = path.resolve(process.cwd(), targetScript);
  const result = spawnSync(process.execPath, [resolvedTarget, ...scriptArgs], {
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message || String(result.error));
    process.exit(1);
  }

  process.exit(result.status == null ? 1 : result.status);
}

main();
