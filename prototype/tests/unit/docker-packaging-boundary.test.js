const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * 功能：读取仓库中的文本文件。
 * 输入：相对仓库根目录的文件路径。
 * 输出：文件文本内容。
 */
function readRepoText(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

test('admin and prototype dockerfiles only copy console help minimum set', () => {
  const dockerfile = readRepoText('Dockerfile');
  const adminDockerfile = readRepoText('Dockerfile.admin');

  for (const content of [dockerfile, adminDockerfile]) {
    assert.match(content, /COPY console \.\/console/);
    assert.match(content, /COPY docs\/help_manuals \.\/docs\/help_manuals/);
    assert.match(content, /COPY docs\/25-console宿主环境联调与smoke执行说明\.md \.\/docs\/25-console宿主环境联调与smoke执行说明\.md/);
    assert.match(content, /COPY docs\/26-console内部试用说明\.md \.\/docs\/26-console内部试用说明\.md/);
    assert.doesNotMatch(content, /COPY docs \.\/docs/);
    assert.doesNotMatch(content, /COPY README\.md/);
    assert.doesNotMatch(content, /COPY SESSION_HANDOFF\.md/);
    assert.doesNotMatch(content, /COPY NEXT_STEPS\.md/);
  }
});

test('runtime dockerfile excludes docs and process materials', () => {
  const runtimeDockerfile = readRepoText('Dockerfile.runtime');
  assert.doesNotMatch(runtimeDockerfile, /COPY docs /);
  assert.doesNotMatch(runtimeDockerfile, /COPY README\.md/);
  assert.doesNotMatch(runtimeDockerfile, /COPY SESSION_HANDOFF\.md/);
  assert.doesNotMatch(runtimeDockerfile, /COPY NEXT_STEPS\.md/);
  assert.doesNotMatch(runtimeDockerfile, /COPY data_sources /);
});

test('dockerignore excludes process docs, tests, and keeps help minimum set', () => {
  const dockerignore = readRepoText('.dockerignore');
  assert.match(dockerignore, /^project_management$/m);
  assert.match(dockerignore, /^prototype\/tests$/m);
  assert.match(dockerignore, /^SESSION_HANDOFF\.md$/m);
  assert.match(dockerignore, /^NEXT_STEPS\.md$/m);
  assert.match(dockerignore, /^docs\/\*\*$/m);
  assert.match(dockerignore, /^!docs\/help_manuals\/\*\*$/m);
  assert.match(dockerignore, /^!docs\/25-console宿主环境联调与smoke执行说明\.md$/m);
  assert.match(dockerignore, /^!docs\/26-console内部试用说明\.md$/m);
});
