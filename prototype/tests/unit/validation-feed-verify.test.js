const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const { createAppConfig } = require('../../src/lib/config');
const { verifyValidationFeeds } = require('../../src/cli/verify-validation-feeds');

test('verify validation feeds produces a successful mock cg3 report with cursor and replay evidence', async () => {
  const baseConfig = createAppConfig();
  const result = await verifyValidationFeeds(baseConfig);

  assert.equal(result.ok, true);
  assert.equal(result.preflight.ok, true);
  assert.equal(result.steps.length, 3);
  assert.equal(result.steps[0].result.importedCount, 1);
  assert.equal(result.steps[0].sourceState.currentCursor, 'cg3-cursor-1');
  assert.equal(result.steps[1].result.ackFailedCount, 1);
  assert.equal(result.steps[1].sourceState.currentCursor, 'cg3-cursor-1');
  assert.equal(result.steps[2].result.ackedCount, 1);
  assert.equal(result.steps[2].sourceState.currentCursor, 'cg3-cursor-2');
  assert.ok(Array.isArray((result.remote || {}).pullCalls));
  assert.equal(fs.existsSync(result.reportFile), true);
});
