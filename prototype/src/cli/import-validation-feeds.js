const { openDatabase } = require('../lib/platform-db');
const { createAppConfig } = require('../lib/config');
const { importValidationFeeds } = require('../lib/validation-feed-importer');

const appConfig = createAppConfig();
const args = process.argv.slice(2);

/**
 * 功能：读取命令行布尔开关。
 * 输入：参数名。
 * 输出：命中时返回 `true`，否则返回 `false`。
 */
function hasFlag(flag) {
  return args.includes(String(flag || ''));
}

/**
 * 功能：读取命令行字符串参数。
 * 输入：参数名和默认值。
 * 输出：参数值字符串。
 */
function readArg(flag, fallback = '') {
  const index = args.indexOf(String(flag || ''));
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
}

/**
 * 功能：扫描并导入 validation feed inbox 中的文件。
 * 输入：`config` 应用配置对象。
 * 输出：包含各来源导入/失败情况的汇总对象。
 */
async function main(config = appConfig) {
  const db = openDatabase(config);
  try {
    const sourceTypes = String(readArg('--source-type', '') || '')
      .split(',')
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    return await importValidationFeeds(db, config, 'feed_import_cli', {
      sourceTypes,
      replayErrors: hasFlag('--replay-errors'),
    });
  } finally {
    if (typeof db.close === 'function') {
      db.close();
    }
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  main,
};
