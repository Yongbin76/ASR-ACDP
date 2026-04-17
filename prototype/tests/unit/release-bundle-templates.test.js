const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * 功能：检查模板文件是否存在。
 * 输入：相对仓库根目录的文件路径。
 * 输出：无显式返回；不存在时抛异常。
 */
function assertRepoFile(relativePath) {
  assert.equal(fs.existsSync(path.join(REPO_ROOT, relativePath)), true, `${relativePath} should exist`);
}

test('deployment bundle templates exist', () => {
  [
    'release_bundle_templates/deployment_bundle/README.md',
    'release_bundle_templates/deployment_bundle/images/image-tags.json.example',
    'release_bundle_templates/deployment_bundle/env/admin.env.example',
    'release_bundle_templates/deployment_bundle/env/runtime.env.example',
    'release_bundle_templates/deployment_bundle/secrets/secrets-template.md',
    'release_bundle_templates/deployment_bundle/docs/deployment-manual.md',
    'release_bundle_templates/deployment_bundle/docs/rollback-manual.md',
    'release_bundle_templates/deployment_bundle/docs/release-notes.md',
  ].forEach(assertRepoFile);
});

test('release notes bundle templates exist', () => {
  [
    'release_bundle_templates/release_notes_bundle/README.md',
    'release_bundle_templates/release_notes_bundle/release-notes.md',
    'release_bundle_templates/release_notes_bundle/deployment-manual.md',
    'release_bundle_templates/release_notes_bundle/rollback-manual.md',
    'release_bundle_templates/release_notes_bundle/go-no-go.md',
    'release_bundle_templates/release_notes_bundle/help-index.md',
    'release_bundle_templates/release_notes_bundle/api-index.md',
  ].forEach(assertRepoFile);
});
