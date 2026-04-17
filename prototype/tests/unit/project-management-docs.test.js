const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  DOC_38_PATH,
  NEXT_STEPS_PATH,
  SESSION_HANDOFF_PATH,
  readSourceOfTruth,
  renderAllDocuments,
  validateState,
} = require('../../../project_management/lib/project-docs');

test('project management source of truth validates and generated docs stay in sync', () => {
  const state = readSourceOfTruth();
  const validation = validateState(state);
  assert.equal(validation.ok, true, validation.errors.join('\n'));

  const rendered = renderAllDocuments(state);
  assert.equal(fs.readFileSync(DOC_38_PATH, 'utf8'), rendered[DOC_38_PATH]);
  assert.equal(fs.readFileSync(SESSION_HANDOFF_PATH, 'utf8'), rendered[SESSION_HANDOFF_PATH]);
  assert.equal(fs.readFileSync(NEXT_STEPS_PATH, 'utf8'), rendered[NEXT_STEPS_PATH]);
});
