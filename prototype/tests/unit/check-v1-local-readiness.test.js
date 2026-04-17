const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { exists } = require('../../src/cli/check-v1-local-readiness');

test('v1 local readiness prerequisites exist', () => {
  [
    'docs/86-v1.0发布手册.md',
    'docs/87-v1.0回滚手册.md',
    'docs/88-v1.0发布说明模板.md',
    'docs/89-v1.0-go-no-go清单模板.md',
    'docs/128-v1.0发布前本地前置检查清单.md',
    'prototype/src/cli/check-api-contract-snapshots.js',
    'prototype/src/cli/check-visual-regression.js',
    'prototype/src/cli/prepare-release-bundle.js',
    'release_bundle_templates/deployment_bundle/README.md',
    'release_bundle_templates/release_notes_bundle/README.md',
  ].forEach((relativePath) => {
    assert.equal(exists(relativePath), true, `${relativePath} should exist`);
  });
});
