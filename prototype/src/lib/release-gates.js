const fs = require('fs');
const path = require('path');

const { PrototypeRuntime } = require('./runtime');
const {
  getRelease,
  listReleaseTerms,
  listReleaseTermsByReleaseIds,
  listAllValidationCasesByFilters,
} = require('./platform-db');

const DEFAULT_VALIDATION_CASES_PATH = path.resolve(__dirname, '..', 'config', 'release_validation_cases.json');
const RELEASE_VALIDATION_SUMMARY_CACHE = new Map();
const NORMALIZED_VALIDATION_CASES_CACHE = new Map();

/**
 * 功能：返回风险等级排序优先级。
 * 输入：`value` 风险等级字符串。
 * 输出：数值优先级，值越小优先级越高。
 */
function riskLevelPriority(value) {
  if (value === 'high') return 0;
  if (value === 'medium') return 1;
  return 2;
}

/**
 * 功能：从 release 词条中挑选 smoke validation 样本。
 * 输入：`terms` 词条数组，`limit` 最大样本数量。
 * 输出：排序后的样本词条数组。
 */
function releaseValidationSampleTerms(terms, limit = 5) {
  return [...(terms || [])]
    .sort((left, right) => {
      const riskDelta = riskLevelPriority(left.riskLevel) - riskLevelPriority(right.riskLevel);
      if (riskDelta !== 0) {
        return riskDelta;
      }
      if (left.priority !== right.priority) {
        return Number(right.priority || 0) - Number(left.priority || 0);
      }
      return String(left.canonicalText || '').localeCompare(String(right.canonicalText || ''), 'zh-CN');
    })
    .slice(0, limit);
}

/**
 * 功能：为 smoke validation 选择一个可触发运行时召回的样本文本。
 * 输入：`term` release 词条对象，`runtime` 运行时实例。
 * 输出：包含 sampleText/mode 的对象；若当前词条没有可测样本则返回 `null`。
 */
function releaseSmokeSample(term, runtime) {
  const termMeta = runtime && runtime.termMetaMap ? runtime.termMetaMap.get(term.termId) : null;
  const aliases = Array.isArray(termMeta && termMeta.aliases)
    ? termMeta.aliases
    : [];
  const uniqueAliases = Array.from(new Set(aliases
    .map((item) => String(item || '').trim())
    .filter((item) => item && item !== String(term.canonicalText || ''))));
  if (uniqueAliases.length > 0) {
    return {
      sampleText: uniqueAliases[0],
      mode: 'alias_literal',
    };
  }
  return null;
}

/**
 * 功能：对单个 release 词条执行 smoke simulation 校验。
 * 输入：`term` 词条对象，`runtime` 运行时实例。
 * 输出：校验结果对象。
 */
function releaseValidationCase(term, runtime) {
  const smokeSample = releaseSmokeSample(term, runtime);
  if (!smokeSample) {
    return {
      termId: term.termId,
      canonicalText: term.canonicalText,
      sampleText: '',
      passed: true,
      skipped: true,
      channel: null,
      action: null,
      validationMode: 'not_applicable',
      reason: 'no_noncanonical_smoke_sample_available',
    };
  }
  const sampleText = smokeSample.sampleText;
  const result = runtime.match(sampleText, {
    enablePinyinChannel: true,
    enablePinyinAutoReplace: false,
  });
  const allHits = []
    .concat(result.matches || [])
    .concat(result.candidates || [])
    .concat(result.blocked || []);
  const hit = allHits.find((item) => item.termId === term.termId);
  return {
    termId: term.termId,
    canonicalText: term.canonicalText,
    sampleText,
    passed: Boolean(hit),
    skipped: false,
    channel: hit ? hit.channel : null,
    action: hit ? hit.action : null,
    validationMode: smokeSample.mode,
    reason: hit ? null : 'term_not_detected_in_smoke_simulation',
  };
}

/**
 * 功能：读取 release validation 所需的业务样本集合。
 * 输入：`options`，可包含显式样本数组或数据库句柄。
 * 输出：原始 validation case 数组。
 */
function readValidationCases(options = {}) {
  if (Array.isArray(options.validationCases)) {
    return options.validationCases;
  }
  if (options.db) {
    const stored = listAllValidationCasesByFilters(options.db, { enabled: true });
    if (stored.length > 0) {
      return stored;
    }
  }
  if (!fs.existsSync(DEFAULT_VALIDATION_CASES_PATH)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(DEFAULT_VALIDATION_CASES_PATH, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：把业务样本标准化为统一字段格式。
 * 输入：`items` 原始样本数组。
 * 输出：标准化后的样本数组。
 */
function normalizeValidationCases(items) {
  return (items || []).map((item, index) => ({
    caseId: String(item.caseId || `validation_case_${index + 1}`),
    description: String(item.description || ''),
    text: String(item.text || ''),
    expectedCanonicals: Array.from(new Set((item.expectedCanonicals || [])
      .map((entry) => String(entry || '').trim())
      .filter(Boolean))),
  })).filter((item) => item.text && item.expectedCanonicals.length > 0);
}

/**
 * 功能：筛选与当前 release 词条集合相关的业务样本。
 * 输入：`cases` 样本数组，`releaseTerms` release 词条数组。
 * 输出：适用于当前 release 的样本数组。
 */
function relevantBusinessValidationCases(cases, releaseTerms) {
  const canonicalSet = new Set((releaseTerms || []).map((item) => String(item.canonicalText || '').trim()).filter(Boolean));
  return (cases || []).filter((item) => item.expectedCanonicals.every((canonical) => canonicalSet.has(canonical)));
}

/**
 * 功能：读取默认 validation case 文件状态，用于缓存键。
 * 输入：无。
 * 输出：默认 validation case 文件状态字符串。
 */
function defaultValidationCasesState() {
  if (!fs.existsSync(DEFAULT_VALIDATION_CASES_PATH)) {
    return 'missing';
  }
  const stat = fs.statSync(DEFAULT_VALIDATION_CASES_PATH);
  return `${stat.size}:${Math.floor(stat.mtimeMs)}`;
}

/**
 * 功能：读取启用中的 validation case 版本摘要，用于校验缓存键。
 * 输入：数据库连接。
 * 输出：包含启用数量与最近更新时间的摘要对象。
 */
function enabledValidationCaseVersion(db) {
  if (!db || typeof db.prepare !== 'function') {
    return {
      enabledCount: 0,
      latestUpdatedAt: '',
      fallbackState: defaultValidationCasesState(),
    };
  }
  const row = db.prepare(`
    SELECT
      COUNT(*) AS enabled_count,
      COALESCE(MAX(updated_at), '') AS latest_updated_at
    FROM validation_cases
    WHERE enabled = 1
  `).get();
  return {
    enabledCount: Number((row || {}).enabled_count || 0),
    latestUpdatedAt: String((row || {}).latest_updated_at || ''),
    fallbackState: Number((row || {}).enabled_count || 0) > 0 ? '' : defaultValidationCasesState(),
  };
}

/**
 * 功能：生成标准化 validation case 集合的缓存键。
 * 输入：数据库连接和额外校验选项。
 * 输出：可用于缓存命中的字符串键；禁用缓存时返回空字符串。
 */
function normalizedValidationCasesCacheKey(db, options = {}) {
  if (options.disableCache || Array.isArray(options.validationCases)) {
    return '';
  }
  const version = enabledValidationCaseVersion(db);
  return [
    String(version.enabledCount || 0),
    String(version.latestUpdatedAt || ''),
    String(version.fallbackState || ''),
  ].join('|');
}

/**
 * 功能：读取并标准化 release validation 所需的业务样本集合。
 * 输入：数据库连接与额外校验选项。
 * 输出：标准化后的 validation case 数组。
 */
function getNormalizedValidationCases(db, options = {}) {
  if (Array.isArray(options.normalizedValidationCases)) {
    return options.normalizedValidationCases;
  }
  if (Array.isArray(options.validationCases)) {
    return normalizeValidationCases(options.validationCases);
  }
  const cacheKey = normalizedValidationCasesCacheKey(db, options);
  if (cacheKey && NORMALIZED_VALIDATION_CASES_CACHE.has(cacheKey)) {
    return NORMALIZED_VALIDATION_CASES_CACHE.get(cacheKey);
  }
  const normalized = normalizeValidationCases(readValidationCases({ ...options, db }));
  if (cacheKey) {
    NORMALIZED_VALIDATION_CASES_CACHE.set(cacheKey, normalized);
    if (NORMALIZED_VALIDATION_CASES_CACHE.size > 20) {
      const oldestKey = NORMALIZED_VALIDATION_CASES_CACHE.keys().next().value;
      if (oldestKey) {
        NORMALIZED_VALIDATION_CASES_CACHE.delete(oldestKey);
      }
    }
  }
  return normalized;
}

/**
 * 功能：生成 release validation 摘要的缓存键。
 * 输入：数据库连接与 release 对象。
 * 输出：可用于缓存命中的字符串键。
 */
function releaseValidationCacheKey(db, release = null) {
  if (!release) {
    return '';
  }
  const snapshotPath = String(release.snapshotPath || '').trim();
  let snapshotState = 'missing';
  if (snapshotPath && fs.existsSync(snapshotPath)) {
    const stat = fs.statSync(snapshotPath);
    snapshotState = `${stat.size}:${Math.floor(stat.mtimeMs)}`;
  }
  const validationVersion = enabledValidationCaseVersion(db);
  return [
    String(release.releaseId || '').trim(),
    snapshotState,
    String(validationVersion.enabledCount || 0),
    String(validationVersion.latestUpdatedAt || ''),
    String(validationVersion.fallbackState || ''),
  ].join('|');
}

/**
 * 功能：读取 release validation 摘要缓存。
 * 输入：缓存键字符串。
 * 输出：命中时返回缓存对象，否则返回 `null`。
 */
function getCachedReleaseValidationSummary(cacheKey = '') {
  if (!cacheKey) {
    return null;
  }
  return RELEASE_VALIDATION_SUMMARY_CACHE.get(cacheKey) || null;
}

/**
 * 功能：写入 release validation 摘要缓存，并控制缓存规模。
 * 输入：缓存键与待缓存摘要对象。
 * 输出：写入后的摘要对象。
 */
function setCachedReleaseValidationSummary(cacheKey = '', summary = null) {
  if (!cacheKey || !summary) {
    return summary;
  }
  RELEASE_VALIDATION_SUMMARY_CACHE.set(cacheKey, summary);
  if (RELEASE_VALIDATION_SUMMARY_CACHE.size > 200) {
    const oldestKey = RELEASE_VALIDATION_SUMMARY_CACHE.keys().next().value;
    if (oldestKey) {
      RELEASE_VALIDATION_SUMMARY_CACHE.delete(oldestKey);
    }
  }
  return summary;
}

/**
 * 功能：执行单条业务样本文本回放校验。
 * 输入：`caseItem` 业务样本对象，`runtime` 运行时实例。
 * 输出：校验结果对象。
 */
function businessValidationCase(caseItem, runtime) {
  const result = runtime.match(caseItem.text, {
    enablePinyinChannel: true,
    enablePinyinAutoReplace: true,
  });
  const allHits = []
    .concat(result.matches || [])
    .concat(result.candidates || [])
    .concat(result.blocked || []);
  const missingCanonicals = caseItem.expectedCanonicals.filter((canonical) => !allHits.some((item) => item.canonical === canonical));
  return {
    caseId: caseItem.caseId,
    description: caseItem.description,
    text: caseItem.text,
    expectedCanonicals: caseItem.expectedCanonicals,
    passed: missingCanonicals.length === 0,
    missingCanonicals,
    hitCanonicals: Array.from(new Set(allHits.map((item) => item.canonical).filter(Boolean))),
    reason: missingCanonicals.length === 0 ? null : 'expected_canonical_not_detected_in_business_sample',
  };
}

/**
 * 功能：构建 release 的自动校验摘要。
 * 输入：数据库连接、releaseId、额外校验选项。
 * 输出：包含 blocker、caseCount、failedCount 的校验摘要对象。
 */
function buildReleaseValidationSummary(db, releaseId, options = {}) {
  const release = options.release || getRelease(db, releaseId);
  if (!release) {
    return {
      releaseId,
      blocked: true,
      blockerCount: 1,
      blockers: [{
        code: 'release_not_found',
        count: 1,
        items: [{ releaseId }],
      }],
      caseCount: 0,
      failedCount: 0,
      cases: [],
    };
  }
  const cacheKey = options.disableCache ? '' : releaseValidationCacheKey(db, release);
  if (cacheKey) {
    const cached = getCachedReleaseValidationSummary(cacheKey);
    if (cached) {
      return cached;
    }
  }

  if (!release.snapshotPath || !fs.existsSync(release.snapshotPath)) {
    return setCachedReleaseValidationSummary(cacheKey, {
      releaseId,
      blocked: true,
      blockerCount: 1,
      blockers: [{
        code: 'release_snapshot_missing',
        count: 1,
        items: [{ releaseId, snapshotPath: release.snapshotPath || '' }],
      }],
      caseCount: 0,
      failedCount: 0,
      cases: [],
    });
  }

  let runtime;
  try {
    runtime = PrototypeRuntime.fromSnapshot(release.snapshotPath);
  } catch (error) {
    return setCachedReleaseValidationSummary(cacheKey, {
      releaseId,
      blocked: true,
      blockerCount: 1,
      blockers: [{
        code: 'release_snapshot_load_failed',
        count: 1,
        items: [{ releaseId, snapshotPath: release.snapshotPath, error: error.message }],
      }],
      caseCount: 0,
      failedCount: 0,
      cases: [],
    });
  }

  const releaseTerms = Array.isArray(options.releaseTerms)
    ? options.releaseTerms
    : listReleaseTerms(db, releaseId);
  const normalizedValidationCases = getNormalizedValidationCases(db, options);
  const smokeCases = releaseValidationSampleTerms(releaseTerms).map((term) => ({
    caseType: 'term_smoke',
    ...releaseValidationCase(term, runtime),
  }));
  const businessCases = relevantBusinessValidationCases(
    normalizedValidationCases,
    releaseTerms,
  ).map((item) => ({
    caseType: 'business_sample',
    ...businessValidationCase(item, runtime),
  }));
  const cases = smokeCases.concat(businessCases);
  const failedSmokeCases = smokeCases.filter((item) => !item.passed);
  const failedBusinessCases = businessCases.filter((item) => !item.passed);
  const skippedSmokeCases = smokeCases.filter((item) => item.skipped);
  const blockers = [];
  if (failedSmokeCases.length > 0) {
    blockers.push({
      code: 'release_validation_smoke_failed',
      count: failedSmokeCases.length,
      items: failedSmokeCases.slice(0, 10),
    });
  }
  if (failedBusinessCases.length > 0) {
    blockers.push({
      code: 'release_validation_business_sample_failed',
      count: failedBusinessCases.length,
      items: failedBusinessCases.slice(0, 10),
    });
  }

  return setCachedReleaseValidationSummary(cacheKey, {
    releaseId,
    blocked: blockers.length > 0,
    blockerCount: blockers.reduce((sum, item) => sum + item.count, 0),
    blockers,
    caseCount: cases.length,
    smokeCaseCount: smokeCases.length,
    skippedSmokeCaseCount: skippedSmokeCases.length,
    businessCaseCount: businessCases.length,
    failedCount: failedSmokeCases.length + failedBusinessCases.length,
    cases,
  });
}

/**
 * 功能：批量构建多个 release 的统一 gate 摘要。
 * 输入：数据库连接、releaseId 数组、额外校验选项。
 * 输出：`releaseId -> gate 摘要` 的映射。
 */
function buildReleaseGateSummaryMap(db, releaseIds = [], options = {}) {
  const normalizedIds = Array.from(new Set((releaseIds || []).map((item) => String(item || '').trim()).filter(Boolean)));
  const result = new Map();
  if (!normalizedIds.length) {
    return result;
  }
  const releaseSeedItems = Array.isArray(options.releases)
    ? [...options.releases]
    : [];
  if (options.release) {
    releaseSeedItems.push(options.release);
  }
  const releaseMap = new Map(releaseSeedItems
    .map((item) => [String(item.releaseId || '').trim(), item])
    .filter((entry) => entry[0]));
  const releaseTermsMap = options.releaseTermsMap instanceof Map
    ? new Map(options.releaseTermsMap)
    : listReleaseTermsByReleaseIds(db, normalizedIds);
  if (Array.isArray(options.releaseTerms) && normalizedIds.length === 1) {
    releaseTermsMap.set(normalizedIds[0], options.releaseTerms);
  }
  const normalizedValidationCases = getNormalizedValidationCases(db, options);

  for (const releaseId of normalizedIds) {
    const release = releaseMap.get(releaseId) || getRelease(db, releaseId);
    const validation = buildReleaseValidationSummary(db, releaseId, {
      ...options,
      release,
      releaseTerms: releaseTermsMap.get(releaseId) || [],
      normalizedValidationCases,
    });
    result.set(releaseId, {
      releaseId,
      blocked: Boolean(validation.blocked),
      blockerCount: Number(validation.blockerCount || 0),
      blockers: [...(validation.blockers || [])],
      validation,
    });
  }
  return result;
}

/**
 * 功能：合并数据库门禁与自动校验结果，形成统一 release gate 摘要。
 * 输入：数据库连接、releaseId、额外校验选项。
 * 输出：统一的 gate 摘要对象。
 */
function buildReleaseGateSummary(db, releaseId, options = {}) {
  const summaryMap = buildReleaseGateSummaryMap(db, [releaseId], options);
  if (summaryMap.has(releaseId)) {
    return summaryMap.get(releaseId);
  }
  const validation = buildReleaseValidationSummary(db, releaseId, options);
  return {
    releaseId,
    blocked: Boolean(validation.blocked),
    blockerCount: Number(validation.blockerCount || 0),
    blockers: [...(validation.blockers || [])],
    validation,
  };
}

module.exports = {
  buildReleaseValidationSummary,
  buildReleaseGateSummaryMap,
  buildReleaseGateSummary,
};
