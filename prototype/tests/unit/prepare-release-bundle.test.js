const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { prepareReleaseBundle } = require('../../src/cli/prepare-release-bundle');

const REPO_ROOT = path.resolve(__dirname, '../../..');

test('prepareReleaseBundle creates deployment and release note bundles', () => {
  const outputDir = path.join(REPO_ROOT, 'prototype', `workspace-unit-release-bundle-${Date.now()}`);
  const result = prepareReleaseBundle({
    version: 'v1.0.0',
    releaseId: 'rel_test_001',
    imageRegistry: 'registry.test.local',
    outputDir,
  });

  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(path.join(outputDir, 'deployment_bundle', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(outputDir, 'deployment_bundle', 'images', 'image-tags.json')), true);
  assert.equal(fs.existsSync(path.join(outputDir, 'deployment_bundle', 'k8s', 'admin-deployment.yaml')), true);
  assert.equal(fs.existsSync(path.join(outputDir, 'deployment_bundle', 'env', 'admin.env.example')), true);
  assert.equal(fs.existsSync(path.join(outputDir, 'release_notes_bundle', 'release-notes.md')), true);
  assert.equal(fs.existsSync(path.join(outputDir, 'release_notes_bundle', 'go-no-go.md')), true);

  const imageTags = JSON.parse(fs.readFileSync(path.join(outputDir, 'deployment_bundle', 'images', 'image-tags.json'), 'utf8'));
  assert.equal(imageTags.version, 'v1.0.0');
  assert.equal(imageTags.releaseId, 'rel_test_001');
  assert.equal(imageTags.adminImage, 'registry.test.local/acdp-admin:v1.0.0');
  assert.equal(imageTags.runtimeReleaseTag, 'registry.test.local/acdp-runtime:release-rel_test_001');
});
