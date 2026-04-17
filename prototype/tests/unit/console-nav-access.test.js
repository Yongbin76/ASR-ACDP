const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
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
  const braceStart = source.indexOf('{', start);
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

/**
 * 功能：创建导航权限测试使用的最小文档对象。
 * 输入：导航键数组。
 * 输出：包含锚点与分组的最小 DOM 模拟对象。
 */
function createNavDocument(navKeys = []) {
  const group = {
    style: {},
    querySelectorAll(selector) {
      if (selector === 'a') {
        return anchors;
      }
      return [];
    },
  };
  const anchors = navKeys.map((key) => ({
    style: {},
    getAttribute(name) {
      if (name === 'data-nav') {
        return key;
      }
      return '';
    },
  }));
  return {
    anchors,
    groups: [group],
    querySelectorAll(selector) {
      if (selector === '#mainNav a') {
        return anchors;
      }
      if (selector === '#mainNav [data-nav-group]') {
        return [group];
      }
      return [];
    },
  };
}

test('applyPageAccess keeps query-based nav entries visible when base page access exists', () => {
  const appScriptPath = path.join(__dirname, '..', '..', '..', 'console', 'client', 'app.js');
  const appScriptSource = fs.readFileSync(appScriptPath, 'utf8');
  const pageKeyForPathSource = extractFunctionSource(appScriptSource, 'pageKeyForPath');
  const applyPageAccessSource = extractFunctionSource(appScriptSource, 'applyPageAccess');
  const document = createNavDocument([
    '/dictionary/reviews?targetType=term',
    '/releases?view=review',
    '/releases?view=canary',
    '/help?pageGroup=pages',
    '/help?pageGroup=flows',
  ]);

  const context = vm.createContext({
    document,
    currentAccessMeta: {
      pageAccess: {
        '/dictionary/reviews': true,
        '/releases': true,
        '/help': true,
      },
    },
  });

  vm.runInContext(`${pageKeyForPathSource}\n${applyPageAccessSource}\napplyPageAccess();`, context);

  assert.equal(document.anchors[0].style.display, '');
  assert.equal(document.anchors[1].style.display, '');
  assert.equal(document.anchors[2].style.display, '');
  assert.equal(document.anchors[3].style.display, '');
  assert.equal(document.anchors[4].style.display, '');
  assert.equal(document.groups[0].style.display, '');
});
