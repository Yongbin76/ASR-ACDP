const {
  readSourceOfTruth,
  validateState,
  writeAllDocuments,
} = require('../lib/project-docs');

/**
 * 功能：从单一真源渲染仓库级与工作区级派生文档并写回仓库。
 * 输入：无。
 * 输出：标准输出一行同步结果；失败时抛出错误并退出非 0。
 */
function main() {
  const state = readSourceOfTruth();
  const validation = validateState(state);
  if (!validation.ok) {
    throw new Error(`source_of_truth invalid:\n- ${validation.errors.join('\n- ')}`);
  }
  writeAllDocuments(state);
  process.stdout.write(`rendered docs for jobs=${(state.jobs || []).length}\n`);
}

if (require.main === module) {
  main();
}
