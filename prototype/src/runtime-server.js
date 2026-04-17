const { createAppConfig } = require('./lib/config');
const { startRuntimeServer } = require('./server');

const baseConfig = createAppConfig();
const runtimeConfig = {
  ...baseConfig,
  server: {
    ...baseConfig.server,
    host: String(process.env.ACDP_RUNTIME_HOST || baseConfig.server.host),
    port: Math.max(1, Number(process.env.ACDP_RUNTIME_PORT || baseConfig.server.runtimePort || baseConfig.server.port)),
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
    console.log(`ACDP runtime server stopped by ${signal}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => { shutdown('SIGTERM'); });
process.on('SIGINT', () => { shutdown('SIGINT'); });

startRuntimeServer(runtimeConfig)
  .then((app) => {
    activeApp = app;
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
