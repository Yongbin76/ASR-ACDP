const fs = require('fs');
const path = require('path');
const { buildManifestFromDir, readArg } = require('./check-visual-regression');

const DEFAULT_CONSOLE_SCREENSHOT_FILES = [
  '01_admin_home.png',
  '02_console_overview.png',
  '03_console_terms.png',
  '04_console_import.png',
  '05_console_reviews.png',
  '06_console_releases.png',
  '07_console_validation_cases.png',
];

/**
 * 功能：从 JSON 文件读取截图文件名列表。
 * 输入：文件路径。
 * 输出：截图文件名数组。
 */
function readFileList(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('file list json must be an array');
  }
  return parsed.map((item) => String(item || '').trim()).filter(Boolean);
}

/**
 * 功能：准备视觉回归基线 manifest。
 * 输入：截图目录、输出文件和可选文件列表。
 * 输出：生成结果对象。
 */
function main() {
  const screenshotDir = path.resolve(String(readArg('--screenshot-dir', '')).trim());
  const outputManifestPath = path.resolve(String(readArg('--output-manifest', '')).trim());
  const fileListPath = String(readArg('--files-json', '')).trim();

  if (!screenshotDir || !fs.existsSync(screenshotDir)) {
    throw new Error('screenshot dir is required');
  }
  if (!outputManifestPath) {
    throw new Error('output manifest path is required');
  }

  const files = fileListPath
    ? readFileList(path.resolve(fileListPath))
    : DEFAULT_CONSOLE_SCREENSHOT_FILES.filter((fileName) => fs.existsSync(path.join(screenshotDir, fileName)));

  if (!files.length) {
    throw new Error('no baseline screenshots found');
  }

  const manifest = buildManifestFromDir(screenshotDir, files);
  fs.mkdirSync(path.dirname(outputManifestPath), { recursive: true });
  fs.writeFileSync(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = {
    ok: true,
    screenshotDir,
    outputManifestPath,
    fileCount: files.length,
    files,
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_CONSOLE_SCREENSHOT_FILES,
  main,
  readFileList,
};
