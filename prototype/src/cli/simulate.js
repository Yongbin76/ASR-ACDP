const { PrototypeRuntime, latestSnapshotPath } = require('../lib/runtime');
const { createAppConfig } = require('../lib/config');

const appConfig = createAppConfig();
const args = process.argv.slice(2);

/**
 * 功能：从命令行读取某个 flag 的值。
 * 输入：`flag` 参数名，`fallback` 默认值。
 * 输出：解析值或默认值。
 */
function readArg(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
}

/**
 * 功能：判断命令行中是否存在某个布尔开关。
 * 输入：`flag` 参数名。
 * 输出：布尔值。
 */
function hasFlag(flag) {
  return args.includes(flag);
}

/**
 * 功能：加载 latest snapshot 并执行一次模拟纠错。
 * 输入：`text` 原始文本。
 * 输出：运行时 match 结果对象。
 */
function main(text) {
  const runtime = PrototypeRuntime.fromSnapshot(latestSnapshotPath(appConfig));
  return runtime.match(text, {
    enablePinyinChannel: !hasFlag('--disable-pinyin'),
    enablePinyinAutoReplace: hasFlag('--pinyin-auto-replace'),
  });
}

if (require.main === module) {
  const text = readArg('--text', '我想咨询旗顺路和市发改委，还有工商认定');
  console.log(JSON.stringify(main(text), null, 2));
}

module.exports = {
  main,
};
