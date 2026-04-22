const test = require('node:test');
const assert = require('node:assert/strict');
const { main } = require('../../src/cli/check-api-contract-snapshots');

test('api contract snapshot checker passes', async () => {
  const result = await main();
  assert.equal(result.ok, true);
  assert.equal(result.consoleSnapshot, 'passed');
  assert.equal(result.runtimeSnapshot, 'passed');
});
