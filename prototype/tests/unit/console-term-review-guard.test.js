const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('node:vm');

/**
 * 功能：从前端脚本源码中提取指定函数定义。
 * 输入：脚本源码、函数名。
 * 输出：完整的函数源码字符串。
 */
function extractFunctionSource(source, functionName) {
  const marker = `function ${functionName}`;
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(`missing function: ${functionName}`);
  }
  let signatureDepth = 0;
  let braceStart = -1;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') {
      signatureDepth += 1;
    } else if (char === ')') {
      signatureDepth = Math.max(0, signatureDepth - 1);
    } else if (char === '{' && signatureDepth === 0) {
      braceStart = index;
      break;
    }
  }
  if (braceStart < 0) {
    throw new Error(`missing function body: ${functionName}`);
  }
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  throw new Error(`unterminated function: ${functionName}`);
}

test('canSubmitTermReview hides submit for approved terms without new revisions', () => {
  const appScriptSource = fs.readFileSync('/Codex/ACDP/console/client/app.js', 'utf8');
  const functionSource = extractFunctionSource(appScriptSource, 'canSubmitTermReview');
  const context = vm.createContext({});
  vm.runInContext(`${functionSource}; this.canSubmitTermReview = canSubmitTermReview;`, context);
  const fn = context.canSubmitTermReview;

  assert.equal(fn('approved', 5, { latestStatus: 'approved', latestSnapshotRevision: 5 }), false);
  assert.equal(fn('approved', 6, { latestStatus: 'approved', latestSnapshotRevision: 5 }), true);
  assert.equal(fn('pending_review', 6, { latestStatus: 'pending', latestSnapshotRevision: 6 }), false);
  assert.equal(fn('disabled', 6, { latestStatus: 'approved', latestSnapshotRevision: 5 }), false);
  assert.equal(fn('draft', 1, { latestStatus: 'rejected', latestSnapshotRevision: 1 }), true);
});
