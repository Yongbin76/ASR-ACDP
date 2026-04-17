const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { main: prepareVisualBaseline, DEFAULT_CONSOLE_SCREENSHOT_FILES } = require('../../src/cli/prepare-visual-baseline');

test('prepare visual baseline writes manifest for available screenshots', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'acdp-visual-baseline-'));
  const screenshotDir = path.join(root, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.writeFileSync(path.join(screenshotDir, DEFAULT_CONSOLE_SCREENSHOT_FILES[0]), 'admin-home');
  fs.writeFileSync(path.join(screenshotDir, DEFAULT_CONSOLE_SCREENSHOT_FILES[1]), 'console-overview');

  const outputManifestPath = path.join(root, 'baseline.manifest.json');
  const previousArgv = process.argv;
  process.argv = [
    process.argv[0],
    process.argv[1],
    '--screenshot-dir',
    screenshotDir,
    '--output-manifest',
    outputManifestPath,
  ];
  try {
    const result = prepareVisualBaseline();
    assert.equal(result.ok, true);
    assert.equal(result.fileCount, 2);
    assert.equal(fs.existsSync(outputManifestPath), true);
    const manifest = JSON.parse(fs.readFileSync(outputManifestPath, 'utf8'));
    assert.equal(manifest.items.length, 2);
  } finally {
    process.argv = previousArgv;
  }
});
