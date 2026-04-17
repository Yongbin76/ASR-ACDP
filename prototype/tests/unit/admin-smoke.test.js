const test = require('node:test');
const assert = require('node:assert/strict');

const { main: adminSmoke } = require('../../src/cli/admin-smoke');
const { createAppConfig } = require('../../src/lib/config');

test('admin smoke reports runtime route is blocked on admin-only app', async () => {
  const baseConfig = createAppConfig();
  const result = await adminSmoke({
    ...baseConfig,
    server: {
      ...baseConfig.server,
      host: '0.0.0.0',
      port: 8788,
      adminPort: 8788,
    },
  });

  assert.equal(result.ok, true);
  assert.ok(['http', 'inject'].includes(result.mode));
  assert.equal(result.isolation.runtimeBlocked, true);
  assert.ok((result.results || []).some((item) => item.pathname === '/admin' && item.status === 302));
  assert.ok((result.results || []).some((item) => item.pathname === '/console' && item.status === 200));
});
