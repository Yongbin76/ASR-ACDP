const prepareData = require('./prepare-data');
const bootstrapDb = require('./bootstrap-db');
const buildSnapshot = require('./build-snapshot');
const { createAppConfig } = require('../lib/config');

const appConfig = createAppConfig();

/**
 * 功能：一键完成数据准备、数据库导入和 release 构建。
 * 输入：`config` 应用配置对象。
 * 输出：prepare/bootstrap/build 三步结果的汇总对象。
 */
function main(config = appConfig) {
  const prepared = prepareData.main(config);
  const bootstrapped = bootstrapDb.main(config);
  const release = buildSnapshot.main('setup prototype build', config);
  return {
    prepared,
    bootstrapped,
    release,
  };
}

if (require.main === module) {
  console.log(JSON.stringify(main(), null, 2));
}

module.exports = {
  main,
};
