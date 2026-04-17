const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

/**
 * 功能：校验控制台前端脚本在 Node 解析器下不存在基础语法错误。
 * 输入：无。
 * 输出：无显式返回；断言失败时抛出错误。
 */
test('console client app.js remains syntactically valid', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const targetFile = path.join(projectRoot, 'console', 'client', 'app.js');
  const source = fs.readFileSync(targetFile, 'utf8');

  let error = null;
  try {
    new vm.Script(source, {
      filename: targetFile,
    });
  } catch (caught) {
    error = caught;
  }

  assert.equal(error, null, error ? String(error.stderr || error.message || error) : '');
});
