const fs = require('node:fs');

const {
  listManagedDocumentPaths,
  normalizeRenderedDocument,
  readSourceOfTruth,
  renderAllDocuments,
  validateState,
} = require('../lib/project-docs');

/**
 * 功能：校验单一真源是否有效，以及全部受管派生文档是否与当前渲染结果一致。
 * 输入：无。
 * 输出：标准输出校验结果；失败时抛出错误并退出非 0。
 */
function main() {
  const state = readSourceOfTruth();
  const validation = validateState(state);
  if (!validation.ok) {
    throw new Error(`source_of_truth invalid:\n- ${validation.errors.join('\n- ')}`);
  }
  const expected = renderAllDocuments(state);
  const targets = listManagedDocumentPaths(state);
  const mismatches = targets.filter((filePath) => fs.readFileSync(filePath, 'utf8') !== normalizeRenderedDocument(expected[filePath]));
  if (mismatches.length) {
    throw new Error(`generated docs are out of sync:\n- ${mismatches.join('\n- ')}`);
  }
  process.stdout.write('project management docs are in sync\n');
}

if (require.main === module) {
  main();
}
