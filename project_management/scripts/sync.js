const { execFileSync } = require('node:child_process');
const path = require('node:path');

/**
 * 功能：顺序执行项目管理文档渲染与一致性校验。
 * 输入：无。
 * 输出：成功时打印同步结果；失败时抛出错误并退出非 0。
 */
function main() {
  const root = path.resolve(__dirname, '..', '..');
  execFileSync(process.execPath, [path.join(root, 'project_management', 'scripts', 'render-docs.js')], {
    cwd: root,
    stdio: 'inherit',
  });
  execFileSync(process.execPath, [path.join(root, 'project_management', 'scripts', 'check-docs.js')], {
    cwd: root,
    stdio: 'inherit',
  });
}

if (require.main === module) {
  main();
}
