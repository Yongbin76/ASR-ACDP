const test = require('node:test');
const assert = require('node:assert/strict');

const { main: runtimeSmoke } = require('../../src/cli/runtime-smoke');
const { createAppConfig } = require('../../src/lib/config');

test('runtime smoke reports admin route is blocked on runtime-only app', async () => {
  const baseConfig = createAppConfig();
  const result = await runtimeSmoke({
    ...baseConfig,
    server: {
      ...baseConfig.server,
      host: '0.0.0.0',
      port: 8796,
      runtimePort: 8796,
    },
  });

  assert.equal(result.ok, true);
  assert.ok(['http', 'inject'].includes(result.mode));
  assert.equal(result.isolation.adminBlocked, true);
  assert.ok((result.results || []).some((item) => item.pathname === '/health' && item.status === 200));
  assert.ok((result.results || []).some((item) => item.pathname === '/api/runtime/current' && item.status === 200));
});
