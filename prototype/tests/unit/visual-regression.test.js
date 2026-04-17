const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  buildManifestFromDir,
  compareManifestToDir,
} = require('../../src/cli/check-visual-regression');

const TMP_ROOT = path.join('/tmp', 'acdp_visual_regression_tests');

/**
 * 功能：确保目录存在并清空。
 * 输入：目录绝对路径。
 * 输出：无显式返回。
 */
function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

test('visual regression checker marks unchanged screenshots as pass', () => {
  const baselineDir = path.join(TMP_ROOT, `baseline-${Date.now()}`);
  const candidateDir = path.join(TMP_ROOT, `candidate-${Date.now()}`);
  resetDir(baselineDir);
  resetDir(candidateDir);

  fs.writeFileSync(path.join(baselineDir, '01_workbench.png'), 'baseline-a');
  fs.writeFileSync(path.join(candidateDir, '01_workbench.png'), 'baseline-a');

  const manifest = buildManifestFromDir(baselineDir, ['01_workbench.png']);
  const result = compareManifestToDir(manifest, candidateDir);

  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.changed, []);
  assert.deepEqual(result.unchanged, ['01_workbench.png']);
});

test('visual regression checker reports changed screenshots', () => {
  const baselineDir = path.join(TMP_ROOT, `baseline-${Date.now()}-changed`);
  const candidateDir = path.join(TMP_ROOT, `candidate-${Date.now()}-changed`);
  resetDir(baselineDir);
  resetDir(candidateDir);

  fs.writeFileSync(path.join(baselineDir, '02_terms.png'), 'baseline-b');
  fs.writeFileSync(path.join(candidateDir, '02_terms.png'), 'candidate-b');

  const manifest = buildManifestFromDir(baselineDir, ['02_terms.png']);
  const result = compareManifestToDir(manifest, candidateDir);

  assert.equal(result.ok, false);
  assert.equal(result.changed.length, 1);
  assert.equal(result.changed[0].fileName, '02_terms.png');
});

test('visual regression checker reports missing screenshots', () => {
  const baselineDir = path.join(TMP_ROOT, `baseline-${Date.now()}-missing`);
  const candidateDir = path.join(TMP_ROOT, `candidate-${Date.now()}-missing`);
  resetDir(baselineDir);
  resetDir(candidateDir);

  fs.writeFileSync(path.join(baselineDir, '03_import.png'), 'baseline-c');

  const manifest = buildManifestFromDir(baselineDir, ['03_import.png']);
  const result = compareManifestToDir(manifest, candidateDir);

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ['03_import.png']);
});
