const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 功能：从命令行读取某个 flag 的值。
 * 输入：flag 名称与默认值。
 * 输出：解析到的参数值或默认值。
 */
function readArg(flag, fallback = '') {
  const args = process.argv.slice(2);
  const inline = args.find((item) => String(item).startsWith(`${flag}=`));
  if (inline) {
    return String(inline).slice(flag.length + 1);
  }
  const index = args.indexOf(flag);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
}

/**
 * 功能：读取 JSON 文件。
 * 输入：JSON 文件绝对路径。
 * 输出：解析后的对象。
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：计算文件 SHA256。
 * 输入：文件绝对路径。
 * 输出：十六进制 SHA256 字符串。
 */
function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

/**
 * 功能：基于文件名列表生成截图 manifest。
 * 输入：截图目录绝对路径和文件名列表。
 * 输出：manifest 对象。
 */
function buildManifestFromDir(screenshotDir, files = []) {
  return {
    screenshotDir,
    items: files.map((fileName) => {
      const filePath = path.join(screenshotDir, fileName);
      const stat = fs.statSync(filePath);
      return {
        fileName,
        sizeBytes: stat.size,
        checksumSha256: sha256File(filePath),
      };
    }),
  };
}

/**
 * 功能：比较基线 manifest 与候选截图目录。
 * 输入：基线 manifest 对象与候选截图目录。
 * 输出：比较结果对象。
 */
function compareManifestToDir(baselineManifest, candidateDir) {
  const baselineItems = Array.isArray(baselineManifest.items) ? baselineManifest.items : [];
  const result = {
    ok: true,
    candidateDir,
    comparedCount: baselineItems.length,
    missing: [],
    changed: [],
    unchanged: [],
  };

  for (const item of baselineItems) {
    const fileName = String(item.fileName || '').trim();
    const candidatePath = path.join(candidateDir, fileName);
    if (!fs.existsSync(candidatePath)) {
      result.missing.push(fileName);
      result.ok = false;
      continue;
    }
    const stat = fs.statSync(candidatePath);
    const checksumSha256 = sha256File(candidatePath);
    const normalized = {
      fileName,
      expectedSizeBytes: Number(item.sizeBytes || 0),
      actualSizeBytes: stat.size,
      expectedChecksumSha256: String(item.checksumSha256 || ''),
      actualChecksumSha256: checksumSha256,
    };
    if (normalized.expectedSizeBytes !== normalized.actualSizeBytes || normalized.expectedChecksumSha256 !== normalized.actualChecksumSha256) {
      result.changed.push(normalized);
      result.ok = false;
    } else {
      result.unchanged.push(fileName);
    }
  }

  return result;
}

/**
 * 功能：执行视觉回归检查。
 * 输入：命令行参数。
 * 输出：检查结果对象。
 */
function main() {
  const baselineManifestPath = path.resolve(String(readArg('--baseline-manifest', '')).trim());
  const candidateDir = path.resolve(String(readArg('--candidate-dir', '')).trim());
  const writeActualManifestPath = String(readArg('--write-actual-manifest', '')).trim();

  if (!baselineManifestPath || !fs.existsSync(baselineManifestPath)) {
    throw new Error('baseline manifest is required');
  }
  if (!candidateDir || !fs.existsSync(candidateDir)) {
    throw new Error('candidate screenshot dir is required');
  }

  const baselineManifest = readJson(baselineManifestPath);
  const result = compareManifestToDir(baselineManifest, candidateDir);

  if (writeActualManifestPath) {
    const baselineFiles = (baselineManifest.items || []).map((item) => item.fileName).filter(Boolean);
    const actualManifest = buildManifestFromDir(candidateDir, baselineFiles);
    fs.writeFileSync(path.resolve(writeActualManifestPath), `${JSON.stringify(actualManifest, null, 2)}\n`);
    result.actualManifestPath = path.resolve(writeActualManifestPath);
  }

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
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
  buildManifestFromDir,
  compareManifestToDir,
  main,
  readArg,
  readJson,
  sha256File,
};
