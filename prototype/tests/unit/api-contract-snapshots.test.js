const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const path = require('path');

test('api contract snapshot checker passes', () => {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, '../../src/cli/check-api-contract-snapshots.js')],
    {
      cwd: path.join(__dirname, '../../..'),
      encoding: 'utf8',
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
