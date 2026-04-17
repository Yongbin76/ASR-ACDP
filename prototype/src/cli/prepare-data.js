const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../lib/csv');
const { createAppConfig } = require('../lib/config');

const defaultConfig = createAppConfig();

/**
 * 功能：确保目录存在，不存在时递归创建。
 * 输入：`dirPath` 目录路径。
 * 输出：无显式返回。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：以原子写方式输出 JSON 文件。
 * 输入：`filePath` 目标路径，`value` 要写入的对象。
 * 输出：无显式返回。
 */
function writeJson(filePath, value) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

// Road input is still a raw text source, so the prototype extracts candidate roads
// by suffix and deduplication instead of assuming a pre-cleaned source file.
/**
 * 功能：从原始路名文本中抽取可用道路条目。
 * 输入：`text` 原始文本，`sourceFileName` 来源文件名。
 * 输出：标准化后的道路条目数组。
 */
function parseRoads(text, sourceFileName) {
  const unique = new Set();
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const value = line.replace(/^\uFEFF/, '').trim();
    if (!value) continue;
    if (/^\d{3}-\d{2,3}$/.test(value)) continue;
    if (!/(路|街|弄|支弄|公路|大道|大街|道|巷)$/.test(value)) continue;
    if (unique.has(value)) continue;
    unique.add(value);
    rows.push({
      standardName: value,
      roadType: detectRoadType(value),
      sourceFile: sourceFileName,
    });
  }
  return rows;
}

/**
 * 功能：根据道路名称后缀识别道路类型。
 * 输入：`name` 道路名称。
 * 输出：道路类型字符串。
 */
function detectRoadType(name) {
  const types = ['支弄', '公路', '大道', '大街', '路', '街', '弄', '道', '巷'];
  return types.find((item) => name.endsWith(item)) || 'unknown';
}

/**
 * 功能：解析政府部门 CSV 为标准化行对象。
 * 输入：`text` CSV 文本，`sourceFileName` 来源文件名。
 * 输出：政府部门条目数组。
 */
function parseGovernment(text, sourceFileName) {
  const rows = parseCsv(text);
  return rows.map((row) => ({
    standardName: row['部门名称'] || '',
    shortName: row['简称'] || '',
    district: row['所属区域'] || '',
    address: row['地址'] || '',
    level: row['级别'] || '',
    category: row['类别'] || '',
    sourceFile: sourceFileName,
  })).filter((row) => row.standardName);
}

/**
 * 功能：标准化别名列表并去重。
 * 输入：`values` 别名数组。
 * 输出：清洗后的别名数组。
 */
function normalizeAliasList(values) {
  return Array.from(new Set(values.map((item) => String(item || '').trim()).filter(Boolean)));
}

/**
 * 功能：把道路、政府部门和 demo 词条合并为 seed term 集合。
 * 输入：道路数组、政府部门数组、demo 词条数组。
 * 输出：seed term 数组。
 */
function buildSeedTerms(roads, govRows, demoTerms) {
  const terms = [];
  let termSeq = 1;

  for (const row of roads) {
    terms.push({
      termId: `POI_${String(termSeq++).padStart(6, '0')}`,
      categoryCode: 'poi_road',
      canonicalText: row.standardName,
      aliases: [],
      replaceMode: 'replace',
      priority: 80,
      baseConfidence: 0.9,
      sourceType: 'raw_roads',
      pinyinRuntimeMode: 'candidate',
    });
  }

  for (const row of govRows) {
    terms.push({
      termId: `GOV_${String(termSeq++).padStart(6, '0')}`,
      categoryCode: 'gov_term',
      canonicalText: row.standardName,
      aliases: normalizeAliasList([row.shortName]),
      replaceMode: 'replace',
      priority: 88,
      baseConfidence: 0.92,
      sourceType: 'raw_government',
      pinyinRuntimeMode: 'candidate',
    });
  }

  for (const item of demoTerms) {
    terms.push({
      termId: `DEMO_${String(termSeq++).padStart(6, '0')}`,
      categoryCode: item.categoryCode,
      canonicalText: item.canonicalText,
      aliases: normalizeAliasList(item.aliases || []),
      replaceMode: item.replaceMode || 'replace',
      priority: item.priority || 90,
      baseConfidence: item.baseConfidence || 0.9,
      sourceType: item.sourceType || 'demo_seed',
      pinyinRuntimeMode: item.pinyinRuntimeMode || 'candidate',
    });
  }

  return mergeTerms(terms);
}

/**
 * 功能：按类别和标准词对 seed term 去重合并。
 * 输入：`terms` 词条数组。
 * 输出：合并去重后的词条数组。
 */
function mergeTerms(terms) {
  const map = new Map();
  for (const term of terms) {
    const key = `${term.categoryCode}|${term.canonicalText}`;
    if (!map.has(key)) {
      map.set(key, { ...term, aliases: [...term.aliases] });
      continue;
    }
    const current = map.get(key);
    current.aliases = normalizeAliasList(current.aliases.concat(term.aliases || []));
    current.priority = Math.max(current.priority, term.priority || current.priority);
    current.baseConfidence = Math.max(current.baseConfidence, term.baseConfidence || current.baseConfidence);
  }
  return Array.from(map.values());
}

/**
 * 功能：执行原始数据清洗并生成 seed catalog。
 * 输入：`config` 应用配置对象。
 * 输出：包含清洗数量和 seed catalog 路径的摘要对象。
 */
function main(config = defaultConfig) {
  const cleanedRoot = config.resolvedPaths.cleanedDir;
  const catalogRoot = config.resolvedPaths.catalogDir;
  const rawRoads = config.resolvedPaths.rawRoadsFile;
  const rawGov = config.resolvedPaths.rawGovernmentFile;
  const demoTermsPath = config.resolvedPaths.demoTermsConfig;

  ensureDir(cleanedRoot);
  ensureDir(catalogRoot);

  const roads = parseRoads(fs.readFileSync(rawRoads, 'utf8'), path.basename(rawRoads));
  const govRows = parseGovernment(fs.readFileSync(rawGov, 'utf8'), path.basename(rawGov));
  const demoTerms = JSON.parse(fs.readFileSync(demoTermsPath, 'utf8').replace(/^\uFEFF/, ''));
  const seedTerms = buildSeedTerms(roads, govRows, demoTerms);

  writeJson(path.join(cleanedRoot, 'shanghai_roads.cleaned.json'), roads);
  writeJson(path.join(cleanedRoot, 'shanghai_government.cleaned.json'), govRows);
  writeJson(path.join(catalogRoot, 'seed_terms.json'), seedTerms);

  return {
    roads: roads.length,
    government: govRows.length,
    seedTerms: seedTerms.length,
    seedCatalog: path.join(catalogRoot, 'seed_terms.json'),
  };
}

if (require.main === module) {
  console.log(JSON.stringify(main(), null, 2));
}

module.exports = {
  main,
};
