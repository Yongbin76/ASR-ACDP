const fs = require('fs');
const { openDatabase, countTerms, importSeedTerms } = require('../lib/platform-db');
const { createAppConfig } = require('../lib/config');

const appConfig = createAppConfig();

/**
 * 功能：把 seed catalog 导入 SQLite 管理库。
 * 输入：`config` 应用配置对象。
 * 输出：导入前数量、导入数量和导入后数量摘要。
 */
function main(config = appConfig) {
  const db = openDatabase(config);
  try {
    const before = countTerms(db);
    const seedFile = config.resolvedPaths.seedCatalogFile;
    if (!fs.existsSync(seedFile)) {
      throw new Error(`seed catalog not found: ${seedFile}`);
    }
    const seeds = JSON.parse(fs.readFileSync(seedFile, 'utf8').replace(/^\uFEFF/, ''));
    const imported = importSeedTerms(db, seeds);
    const after = countTerms(db);
    return { before, imported, after };
  } finally {
    if (typeof db.close === 'function') {
      db.close();
    }
  }
}

if (require.main === module) {
  console.log(JSON.stringify(main(), null, 2));
}

module.exports = {
  main,
};
