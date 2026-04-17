const path = require('path');
const { openDatabase, getBuildableTerms, createRelease } = require('../lib/platform-db');
const { buildReleaseArtifactPlan } = require('../lib/artifact-store');
const { buildSnapshot, writeSnapshot } = require('../lib/snapshot-builder');
const { createAppConfig } = require('../lib/config');

const appConfig = createAppConfig();

/**
 * 功能：从命令行读取某个 flag 的值。
 * 输入：`flag` 参数名，`fallback` 默认值。
 * 输出：解析值或默认值。
 */
function readArg(flag, fallback) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
}

/**
 * 功能：从当前数据库构建并注册一个新 release。
 * 输入：`summary` 构建摘要，`config` 应用配置对象。
 * 输出：新 release 的版本对象。
 */
function main(summary = 'manual build', config = appConfig) {
  const db = openDatabase(config);
  try {
    const terms = getBuildableTerms(db);
    if (terms.length === 0) {
      throw new Error('no approved or published terms available for build');
    }

    const snapshot = buildSnapshot(terms);
    const releaseId = `rel_${Date.now()}`;
    const releaseDir = path.join(config.resolvedPaths.releasesDir, releaseId);
    const files = writeSnapshot(releaseDir, snapshot);
    const artifactStore = buildReleaseArtifactPlan(config, {
      releaseId,
      manifestPath: files.manifestPath,
      snapshotPath: files.snapshotPath,
      packagePath: path.join(releaseDir, 'package.tar.gz'),
    });
    const release = createRelease(db, {
      releaseId,
      version: snapshot.manifest.version,
      status: 'built',
      summary,
      artifactDir: releaseDir,
      snapshotPath: files.snapshotPath,
      manifestPath: files.manifestPath,
      termCount: terms.length,
      termIds: terms.map((item) => item.termId),
    });
    return {
      ...release,
      artifactStore,
    };
  } finally {
    if (typeof db.close === 'function') {
      db.close();
    }
  }
}

if (require.main === module) {
  console.log(JSON.stringify(main(readArg('--summary', 'manual build')), null, 2));
}

module.exports = {
  main,
};
