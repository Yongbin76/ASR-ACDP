const { createAppConfig } = require('./lib/config');
const { startAdminServer } = require('./server');

const baseConfig = createAppConfig();
const adminConfig = {
  ...baseConfig,
  server: {
    ...baseConfig.server,
    host: String(process.env.ACDP_ADMIN_HOST || baseConfig.server.host),
    port: Math.max(1, Number(process.env.ACDP_ADMIN_PORT || baseConfig.server.adminPort || baseConfig.server.port)),
  },
};

let activeApp = null;

/**
 * 功能：执行当前服务的优雅停机流程。
 * 输入：`signal`（调用参数）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function shutdown(signal) {
  if (!activeApp) {
    process.exit(0);
    return;
  }
  try {
    await activeApp.stop();
    console.log(`ACDP admin server stopped by ${signal}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => { shutdown('SIGTERM'); });
process.on('SIGINT', () => { shutdown('SIGINT'); });

startAdminServer(adminConfig)
  .then((app) => {
    activeApp = app;
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
