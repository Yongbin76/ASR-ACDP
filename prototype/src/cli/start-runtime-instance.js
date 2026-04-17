const { createAppConfig } = require('../lib/config');
const { buildRuntimeInstanceConfig } = require('../lib/runtime-instance-config');
const { startRuntimeServer } = require('../server');

function parseArgs(argv = []) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] || '').trim();
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next == null || String(next).startsWith('--')) {
      result[key] = true;
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const baseConfig = createAppConfig();
  const runtimeConfig = buildRuntimeInstanceConfig(baseConfig, {
    instanceId: args.instance,
    host: args.host,
    port: args.port,
    workspaceRoot: args['workspace-root'],
    nodeId: args['node-id'],
    nodeName: args['node-name'],
    nodeEnv: args['node-env'],
    nodeAddress: args['node-address'],
    adminBaseUrl: args['admin-base-url'],
    registrationSecret: args['registration-secret'],
  });
  return startRuntimeServer(runtimeConfig);
}

if (require.main === module) {
  let activeApp = null;
  const shutdown = async (signal) => {
    if (!activeApp) {
      process.exit(0);
      return;
    }
    try {
      await activeApp.stop();
      console.log(`ACDP runtime instance stopped by ${signal}`);
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => { shutdown('SIGTERM'); });
  process.on('SIGINT', () => { shutdown('SIGINT'); });

  main()
    .then((app) => {
      activeApp = app;
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  parseArgs,
  main,
};
