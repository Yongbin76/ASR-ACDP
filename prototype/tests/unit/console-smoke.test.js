const test = require('node:test');
const assert = require('node:assert/strict');

const { main: consoleSmoke } = require('../../src/cli/console-smoke');
const { createAppConfig } = require('../../src/lib/config');

test('console smoke reports admin/console entry isolation in inject mode', async () => {
  const baseConfig = createAppConfig();
  const result = await consoleSmoke({
    ...baseConfig,
    server: {
      ...baseConfig.server,
      host: '0.0.0.0',
      port: 8799,
    },
  });

  assert.equal(result.ok, true);
  assert.ok(['http', 'inject'].includes(result.mode));
  assert.equal(result.entryIsolation.adminOk, true);
  assert.equal(result.entryIsolation.consoleOk, true);
  assert.equal(result.entryIsolation.adminIndependentFromConsole, true);
  assert.ok((result.results || []).some((item) => item.pathname === '/admin' && item.status === 302));
  assert.ok((result.results || []).some((item) => item.pathname === '/console' && item.status === 200));
});
