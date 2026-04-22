const fs = require('fs');
const path = require('path');

const { parseCsv } = require('./csv');
const { getImportTemplate, resolveImportTemplateAsset } = require('./import-templates');
const {
  createTerm,
  updateTerm,
  getTerm,
  submitTermReview,
  importValidationCases,
} = require('./platform-db');
const {
  evaluateTermAdmission,
  summarizeTermAdmission,
} = require('./term-admission');

const DEFAULT_TERM_IMPORT_RUNTIME_MODE = 'candidate';
const SYSTEM_RECOMMENDATION_KEY = '__systemRecommendation';

/**
 * 功能：处理`nowIso`相关逻辑。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * 功能：处理`generateId`相关逻辑。
 * 输入：`prefix`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * 功能：确保`dir`相关逻辑。
 * 输入：`dirPath`（目录路径）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：清洗`alias list`相关逻辑。
 * 输入：`value`（待处理值）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function sanitizeAliasList(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
  }
  return Array.from(new Set(String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)));
}

/**
 * 功能：标准化导入时使用的类别编码。
 * 输入：原始类别编码值和可选默认值。
 * 输出：标准化后的类别编码。
 */
function normalizeImportedCategoryCode(value, fallback = '') {
  const direct = String(value || '').trim();
  if (direct) {
    return direct;
  }
  return String(fallback || '').trim();
}

/**
 * 功能：从导入行中提取拼音画像补充字段。
 * 输入：导入行对象和当前词条拼音运行模式。
 * 输出：用于 `pinyin_profiles` 的画像对象。
 */
function normalizeImportedPinyinProfile(row = {}, runtimeMode = DEFAULT_TERM_IMPORT_RUNTIME_MODE) {
  return {
    runtimeMode: String(runtimeMode || DEFAULT_TERM_IMPORT_RUNTIME_MODE).trim() || DEFAULT_TERM_IMPORT_RUNTIME_MODE,
    customFullPinyinNoTone: String(row.customFullPinyinNoTone || '').trim(),
    alternativeReadings: sanitizeAliasList(row.alternativeReadings),
  };
}

function primaryIssueSummary(issues = []) {
  const summary = summarizeTermAdmission({ issues });
  return summary.primaryIssue || null;
}

function buildRecommendationSummary(rows = []) {
  const summary = {
    saveReplaceCount: 0,
    saveCandidateCount: 0,
    mergeExistingCount: 0,
    appendAliasCount: 0,
    skipBlockedCount: 0,
  };
  for (const row of rows || []) {
    const action = String((row && row.recommendedAction) || '').trim();
    if (action === 'save_replace') {
      summary.saveReplaceCount += 1;
    } else if (action === 'save_candidate') {
      summary.saveCandidateCount += 1;
    } else if (action === 'merge_existing') {
      summary.mergeExistingCount += 1;
    } else if (action === 'append_alias_to_existing') {
      summary.appendAliasCount += 1;
    } else if (action === 'skip_blocked') {
      summary.skipBlockedCount += 1;
    }
  }
  return summary;
}

function buildStoredImportRowPayload(normalizedPayload = {}, row = {}) {
  return {
    ...normalizedPayload,
    [SYSTEM_RECOMMENDATION_KEY]: {
      recommendedAction: String(row.recommendedAction || '').trim(),
      runtimeSuitability: String(row.runtimeSuitability || '').trim(),
      reasonCodes: Array.isArray(row.reasonCodes) ? row.reasonCodes : [],
      reasonSummary: String(row.reasonSummary || '').trim(),
      reviewHints: Array.isArray(row.reviewHints) ? row.reviewHints : [],
      targetTermId: String(row.targetTermId || '').trim(),
      targetCanonicalText: String(row.targetCanonicalText || '').trim(),
    },
  };
}

function extractStoredImportRowPayload(storedPayload = {}) {
  const payload = { ...(storedPayload || {}) };
  const meta = payload[SYSTEM_RECOMMENDATION_KEY] && typeof payload[SYSTEM_RECOMMENDATION_KEY] === 'object'
    ? payload[SYSTEM_RECOMMENDATION_KEY]
    : {};
  delete payload[SYSTEM_RECOMMENDATION_KEY];
  return {
    normalizedPayload: payload,
    systemRecommendation: {
      recommendedAction: String(meta.recommendedAction || '').trim(),
      runtimeSuitability: String(meta.runtimeSuitability || '').trim(),
      reasonCodes: Array.isArray(meta.reasonCodes) ? meta.reasonCodes : [],
      reasonSummary: String(meta.reasonSummary || '').trim(),
      reviewHints: Array.isArray(meta.reviewHints) ? meta.reviewHints : [],
      targetTermId: String(meta.targetTermId || '').trim(),
      targetCanonicalText: String(meta.targetCanonicalText || '').trim(),
    },
  };
}

function importRowFromAdmission(rowNo, rawPayload, normalizedPayload, admission = {}) {
  const primaryIssue = primaryIssueSummary(admission.issues);
  const recommendedAction = String(admission.recommendedAction || '').trim() || 'save_replace';
  const admissionLevel = admission.level || (recommendedAction === 'skip_blocked' ? 'blocked' : 'ready');
  const needsAttention = recommendedAction !== 'save_replace'
    || (Array.isArray(admission.issues) && admission.issues.some((entry) => entry && entry.level === 'warning'));
  const decision = recommendedAction === 'merge_existing'
    ? 'merge_existing'
    : recommendedAction === 'append_alias_to_existing'
      ? 'append_alias_to_existing'
      : recommendedAction === 'skip_blocked'
        ? 'skipped_blocked'
        : 'accept';
  return {
    rowNo,
    rawPayload,
    normalizedPayload: admission.normalizedInput || normalizedPayload || {},
    issues: Array.isArray(admission.issues) ? admission.issues : [],
    targetTermKey: admission.normalizedInput && admission.normalizedInput.categoryCode && admission.normalizedInput.canonicalText
      ? `${admission.normalizedInput.categoryCode}|${admission.normalizedInput.canonicalText}`
      : '',
    status: admissionLevel === 'blocked' ? 'error' : (needsAttention ? 'warning' : 'ready'),
    decision,
    recommendedAction,
    runtimeSuitability: String(admission.runtimeSuitability || (admissionLevel === 'blocked' ? 'blocked' : 'replace')).trim() || 'replace',
    reasonCodes: Array.isArray(admission.reasonCodes) ? admission.reasonCodes : [],
    reasonSummary: String(admission.reasonSummary || '').trim(),
    reviewHints: Array.isArray(admission.reviewHints) ? admission.reviewHints : [],
    targetTermId: String(admission.targetTermId || '').trim(),
    targetCanonicalText: String(admission.targetCanonicalText || '').trim(),
    errorCode: primaryIssue ? primaryIssue.code : '',
    errorMessage: primaryIssue ? primaryIssue.message : (admissionLevel === 'blocked' ? String(admission.reasonSummary || '').trim() : ''),
  };
}

/**
 * 功能：把导入阶段 issues 转换为审核详情可直接展示的冲突摘要。
 * 输入：issues 数组。
 * 输出：冲突摘要对象；无 issues 时返回 `null`。
 */
function buildConflictSummaryFromIssues(issues = []) {
  const items = Array.isArray(issues)
    ? issues
      .filter(Boolean)
      .map((entry) => ({
        level: String(entry.level || '').trim() || 'warning',
        code: String(entry.code || '').trim() || 'admission_issue',
        field: String(entry.field || '').trim(),
        message: String(entry.message || '').trim(),
        evidence: entry.evidence == null ? null : entry.evidence,
        trace: entry.trace || null,
        suggestion: String(entry.suggestion || '').trim(),
      }))
    : [];
  if (!items.length) {
    return null;
  }
  const blockedItems = items.filter((item) => item.level === 'blocked');
  const warningItems = items.filter((item) => item.level === 'warning');
  const primary = blockedItems[0] || warningItems[0] || items[0] || null;
  return {
    level: blockedItems.length ? 'blocked' : (warningItems.length ? 'warning' : 'ready'),
    blockedCount: blockedItems.length,
    warningCount: warningItems.length,
    issueCount: items.length,
    primaryCode: primary ? primary.code : '',
    primaryMessage: primary ? primary.message : '',
    items,
  };
}

/**
 * 功能：为导入生成的词条审核任务构造来源上下文和冲突摘要。
 * 输入：导入批次、导入行、源文件和当前词条对象。
 * 输出：`submitTermReview()` 可直接消费的选项对象。
 */
function buildImportedTermReviewOptions(job = {}, row = {}, file = null, term = {}) {
  const issues = Array.isArray(row.issues)
    ? row.issues
    : (() => {
      try {
        return JSON.parse(row.issues_json || '[]');
      } catch {
        return [];
      }
    })();
  const blockedCount = issues.filter((item) => item && item.level === 'blocked').length;
  const warningCount = issues.filter((item) => item && item.level === 'warning').length;
  return {
    sourceContext: {
      sourceType: String((term && term.sourceType) || (job && job.source_type) || '').trim(),
      sourceTypeCode: String((term && term.sourceType) || (job && job.source_type) || '').trim(),
      importJobId: String((job && job.job_id) || '').trim(),
      sourceMode: 'import',
      sourceFileName: file ? String(file.original_name || '').trim() : '',
      sourceRowNo: row.row_no == null ? null : Number(row.row_no),
      sourceRef: `${String((job && job.template_code) || '').trim()}:${Number(row.row_no || 0)}`,
    },
    importRow: {
      importJobId: String((job && job.job_id) || '').trim(),
      rowNo: row.row_no == null ? null : Number(row.row_no),
      issues,
      admissionLevel: blockedCount > 0 ? 'blocked' : (warningCount > 0 ? 'warning' : 'ready'),
      recommendedAction: row.recommendedAction || '',
      runtimeSuitability: row.runtimeSuitability || '',
      targetTermId: row.targetTermId || '',
      targetCanonicalText: row.targetCanonicalText || '',
      reasonSummary: row.reasonSummary || '',
      reviewHints: Array.isArray(row.reviewHints) ? row.reviewHints : [],
    },
    admissionSummary: {
      admissionLevel: blockedCount > 0 ? 'blocked' : (warningCount > 0 ? 'warning' : 'ready'),
      blockedCount,
      warningCount,
      issues,
      recommendedAction: row.recommendedAction || '',
      runtimeSuitability: row.runtimeSuitability || '',
      reasonSummary: row.reasonSummary || '',
      reviewHints: Array.isArray(row.reviewHints) ? row.reviewHints : [],
      targetTermId: row.targetTermId || '',
      targetCanonicalText: row.targetCanonicalText || '',
    },
    conflictSummary: buildConflictSummaryFromIssues(issues),
  };
}

/**
 * 功能：把确认阶段被跳过的阻断行写回数据库。
 * 输入：数据库连接、导入行对象、错误码、错误信息。
 * 输出：无显式返回。
 */
function markImportRowSkippedBlocked(db, row, errorCode, errorMessage) {
  db.prepare(`
    UPDATE import_job_rows
    SET status = ?, decision = ?, error_code = ?, error_message = ?, updated_at = ?
    WHERE row_id = ?
  `).run(
    'error',
    'skipped_blocked',
    String(errorCode || row.error_code || '').trim(),
    String(errorMessage || row.error_message || '').trim(),
    nowIso(),
    row.row_id,
  );
}

/**
 * 功能：写入`uploaded file`相关逻辑。
 * 输入：`appConfig`（应用配置对象）、`jobId`（导入批次 ID）、`fileName`（文件名）、`content`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function writeUploadedFile(appConfig, jobId, fileName, content) {
  const dir = path.join(appConfig.resolvedPaths.workspaceDir, 'import_jobs', jobId, 'source');
  ensureDir(dir);
  const safeName = String(fileName || 'upload.txt').replace(/[^\w.\-]+/g, '_');
  const filePath = path.join(dir, safeName);
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * 功能：解析`raw roads text`相关逻辑。
 * 输入：`db`（数据库连接）、`content`（调用参数）、`fileName`（文件名）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function parseRawRoadsText(db, content, fileName) {
  const rows = [];
  const lines = String(content || '').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const value = lines[index].replace(/^\uFEFF/, '').trim();
    if (!value) continue;
    if (/^\d{3}-\d{2,3}$/.test(value)) continue;
    if (!/(路|街|弄|支弄|公路|大道|大街|道|巷)$/.test(value)) continue;
    const normalizedPayload = {
      categoryCode: 'poi_road',
      canonicalText: value,
      aliases: [],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'raw_roads',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {
        runtimeMode: 'candidate',
        customFullPinyinNoTone: '',
        alternativeReadings: [],
      },
    };
    const admission = evaluateTermAdmission(db, normalizedPayload, { sourceMode: 'import' });
    rows.push(importRowFromAdmission(index + 1, { line: value, sourceFile: fileName }, normalizedPayload, admission));
  }
  return rows;
}

/**
 * 功能：解析`government rows`相关逻辑。
 * 输入：`db`（数据库连接）、`content`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function parseGovernmentRows(db, content) {
  return parseCsv(String(content || '')).map((row, index) => {
    const standardName = String(row.standardName || '').trim();
    const shortName = String(row.shortName || '').trim();
    const normalizedPayload = {
      categoryCode: 'gov_term',
      canonicalText: standardName,
      aliases: sanitizeAliasList(shortName),
      priority: 88,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.92,
      sourceType: 'raw_government',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {
        runtimeMode: 'candidate',
        customFullPinyinNoTone: '',
        alternativeReadings: [],
      },
    };
    const admission = evaluateTermAdmission(db, normalizedPayload, { sourceMode: 'import' });
    return importRowFromAdmission(index + 2, row, normalizedPayload, admission);
  });
}

/**
 * 功能：解析`structured terms`相关逻辑。
 * 输入：`db`（数据库连接）、`content`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function parseStructuredTerms(db, content, options = {}) {
  return parseCsv(String(content || '')).map((row, index) => {
    const categoryCode = normalizeImportedCategoryCode(row.categoryCode, options.defaultCategoryCode);
    const canonicalText = String(row.canonicalText || '').trim();
    const pinyinRuntimeMode = String(row.pinyinRuntimeMode || DEFAULT_TERM_IMPORT_RUNTIME_MODE).trim() || DEFAULT_TERM_IMPORT_RUNTIME_MODE;
    const normalizedPayload = {
      categoryCode,
      canonicalText,
      aliases: sanitizeAliasList(row.aliases),
      priority: row.priority ? Number(row.priority) : 80,
      riskLevel: String(row.riskLevel || 'medium').trim() || 'medium',
      replaceMode: String(row.replaceMode || 'replace').trim() || 'replace',
      baseConfidence: row.baseConfidence ? Number(row.baseConfidence) : 0.9,
      sourceType: String(row.sourceType || 'import_csv').trim() || 'import_csv',
      pinyinRuntimeMode,
      pinyinProfile: normalizeImportedPinyinProfile(row, pinyinRuntimeMode),
    };
    const admission = evaluateTermAdmission(db, normalizedPayload, { sourceMode: 'import' });
    return importRowFromAdmission(index + 2, row, normalizedPayload, admission);
  });
}

/**
 * 功能：解析`alias rows`相关逻辑。
 * 输入：`db`（数据库连接）、`content`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function parseAliasRows(db, content) {
  return parseCsv(String(content || '')).map((row, index) => {
    const categoryCode = String(row.categoryCode || '').trim();
    const canonicalText = String(row.canonicalText || '').trim();
    const aliasText = String(row.aliasText || '').trim();
    const termRow = categoryCode && canonicalText
      ? db.prepare('SELECT term_id FROM terms WHERE category_code = ? AND canonical_text = ?').get(categoryCode, canonicalText)
      : null;
    const errors = [];
    if (!categoryCode) errors.push('categoryCode is required');
    if (!canonicalText) errors.push('canonicalText is required');
    if (!aliasText) errors.push('aliasText is required');
    if (!termRow) errors.push('target term not found');
    const normalizedPayload = {
      categoryCode,
      canonicalText,
      aliasText,
      sourceType: String(row.sourceType || 'import_alias').trim() || 'import_alias',
    };
    if (errors.length > 0) {
      return {
        rowNo: index + 2,
        rawPayload: row,
        normalizedPayload,
        issues: errors.map((message) => ({
          level: 'blocked',
          code: 'invalid_alias_row',
          field: 'aliasText',
          message,
          evidence: null,
          trace: null,
          suggestion: '',
        })),
        targetTermKey: categoryCode && canonicalText ? `${categoryCode}|${canonicalText}` : '',
        status: 'error',
        decision: 'pending',
        errorCode: 'invalid_alias_row',
        errorMessage: errors.join('; '),
      };
    }
    const current = getTerm(db, termRow.term_id);
    const mergedPayload = {
      ...current,
      aliases: Array.from(new Set([...(current.aliases || []), aliasText])),
      pinyinProfile: current.pinyinProfile || {},
    };
    const admission = evaluateTermAdmission(db, mergedPayload, {
      currentTermId: current.termId,
      currentTerm: current,
      sourceMode: 'import',
    });
    return {
      ...importRowFromAdmission(index + 2, row, normalizedPayload, admission),
      normalizedPayload,
      targetTermKey: `${categoryCode}|${canonicalText}`,
    };
  });
}

/**
 * 功能：解析`validation rows`相关逻辑。
 * 输入：`content`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function parseValidationRows(content) {
  return parseCsv(String(content || '')).map((row, index) => {
    const text = String(row.text || '').trim();
    const expectedCanonicals = sanitizeAliasList(row.expectedCanonicals);
    const errors = [];
    if (!text) errors.push('text is required');
    if (!expectedCanonicals.length) errors.push('expectedCanonicals is required');
    const ready = errors.length === 0;
    return {
      rowNo: index + 2,
      rawPayload: row,
      normalizedPayload: ready ? {
        caseId: String(row.caseId || '').trim(),
        description: String(row.description || '').trim(),
        text,
        expectedCanonicals,
        sourceType: String(row.sourceType || 'validation_import').trim() || 'validation_import',
        notes: String(row.notes || '').trim(),
      } : {},
      issues: errors.map((message) => ({
        level: 'blocked',
        code: 'invalid_validation_case',
        field: 'text',
        message,
        evidence: null,
        trace: null,
        suggestion: '',
      })),
      targetTermKey: '',
      status: ready ? 'ready' : 'error',
      decision: ready ? 'accept' : 'pending',
      errorCode: ready ? '' : 'invalid_validation_case',
      errorMessage: errors.join('; '),
    };
  });
}

/**
 * 功能：解析`import rows`相关逻辑。
 * 输入：`db`（数据库连接）、`templateCode`（调用参数）、`content`（调用参数）、`fileName`（文件名）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function parseImportRows(db, templateCode, content, fileName, options = {}) {
  if (templateCode === 'raw_roads_text_v1') return parseRawRoadsText(db, content, fileName);
  if (templateCode === 'gov_departments_csv_v1') return parseGovernmentRows(db, content);
  if (templateCode === 'structured_terms_csv_v1' || templateCode === 'structured_terms_csv_v2') {
    return parseStructuredTerms(db, content, options);
  }
  if (templateCode === 'term_aliases_csv_v1') return parseAliasRows(db, content);
  if (templateCode === 'validation_cases_csv_v1') return parseValidationRows(content);
  throw new Error(`unsupported import template: ${templateCode}`);
}

/**
 * 功能：处理`withTransaction`相关逻辑。
 * 输入：`db`（数据库连接）、`fn`（回调函数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function withTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * 功能：创建`import job`相关逻辑。
 * 输入：`db`（数据库连接）、`appConfig`（应用配置对象）、`payload`（业务载荷对象）、`operator`（操作人标识）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createImportJob(db, appConfig, payload = {}, operator = 'console_user') {
  const templateCode = String(payload.templateCode || '').trim();
  const template = getImportTemplate(appConfig, templateCode);
  if (!template) {
    const error = new Error(`template not found: ${templateCode}`);
    error.statusCode = 404;
    error.code = 'template_not_found';
    throw error;
  }
  const fileName = String(payload.fileName || 'upload.txt').trim() || 'upload.txt';
  const extension = path.extname(fileName).toLowerCase().replace(/^\./, '');
  const allowedExtensions = String(template.fileFormat || '')
    .split('/')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const fileContent = payload.fileContent;
  if (fileContent == null) {
    const error = new Error('fileContent is required');
    error.statusCode = 400;
    error.code = 'missing_file_content';
    throw error;
  }
  if (allowedExtensions.length > 0 && extension && !allowedExtensions.includes(extension)) {
    const error = new Error(`invalid file extension: .${extension}, expected ${allowedExtensions.join('/')}`);
    error.statusCode = 400;
    error.code = 'invalid_file_extension';
    throw error;
  }
  const contentBuffer = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(String(fileContent), 'utf8');
  const rows = parseImportRows(db, templateCode, contentBuffer.toString('utf8'), fileName, {
    defaultCategoryCode: String(payload.defaultCategoryCode || '').trim(),
  });
  const jobId = generateId('import_job');
  const now = nowIso();
  const storedPath = writeUploadedFile(appConfig, jobId, fileName, contentBuffer);
  withTransaction(db, () => {
    db.prepare(`
      INSERT INTO import_jobs(
        job_id, job_type, source_type, template_code, template_version, status,
        summary, submitted_by, confirmed_by, created_at, confirmed_at, finished_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL)
    `).run(
      jobId,
      template.importType,
      String(payload.sourceType || template.sourceType || template.importType),
      template.templateCode,
      template.templateVersion,
      'preview_ready',
      String(payload.comment || '').trim(),
      operator,
      now,
    );
    db.prepare(`
      INSERT INTO import_job_files(
        file_id, job_id, file_role, original_name, stored_path, content_type,
        file_size, checksum, uploaded_at
      ) VALUES (?, ?, 'source_file', ?, ?, ?, ?, ?, ?)
    `).run(
      generateId('import_file'),
      jobId,
      fileName,
      storedPath,
      String(payload.contentType || ''),
      contentBuffer.length,
      '',
      now,
    );
    const stmt = db.prepare(`
      INSERT INTO import_job_rows(
        row_id, job_id, row_no, raw_payload_json, normalized_payload_json, issues_json, target_term_key,
        status, decision, error_code, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const row of rows) {
      stmt.run(
        generateId('import_row'),
        jobId,
        row.rowNo,
        JSON.stringify(row.rawPayload || {}),
        JSON.stringify(buildStoredImportRowPayload(row.normalizedPayload || {}, row)),
        JSON.stringify(row.issues || []),
        row.targetTermKey || '',
        row.status,
        row.decision || 'pending',
        row.errorCode || '',
        row.errorMessage || '',
        now,
        now,
      );
    }
  });
  return {
    jobId,
    status: 'preview_ready',
    templateCode: template.templateCode,
    sourceType: String(payload.sourceType || template.sourceType || template.importType),
    fileName,
    createdAt: now,
    previewSummary: {
      totalRows: rows.length,
      readyRows: rows.filter((item) => item.status === 'ready').length,
      warningRows: rows.filter((item) => item.status === 'warning').length,
      errorRows: rows.filter((item) => item.status === 'error').length,
      importableRows: rows.filter((item) => ['ready', 'warning'].includes(item.status)).length,
      recommendationSummary: buildRecommendationSummary(rows),
      newTermCount: rows.filter((item) => item.status === 'ready' && item.targetTermKey).length,
      updatedTermCount: rows.filter((item) => item.decision === 'merge_existing').length,
      newAliasCount: rows.reduce((sum, item) => sum + ((item.normalizedPayload && item.normalizedPayload.aliases) ? item.normalizedPayload.aliases.length : (item.normalizedPayload && item.normalizedPayload.aliasText ? 1 : 0)), 0),
    },
  };
}

/**
 * 功能：处理`upsertTermSource`相关逻辑。
 * 输入：`db`（数据库连接）、`termId`（词条 ID）、`payload`（业务载荷对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function upsertTermSource(db, termId, payload) {
  db.prepare(`
    INSERT INTO term_sources(
      term_id, source_type, import_job_id, source_file_name, source_row_no, source_ref, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(term_id) DO UPDATE SET
      source_type = excluded.source_type,
      import_job_id = excluded.import_job_id,
      source_file_name = excluded.source_file_name,
      source_row_no = excluded.source_row_no,
      source_ref = excluded.source_ref,
      updated_at = excluded.updated_at
  `).run(
    termId,
    payload.sourceType || '',
    payload.importJobId || null,
    payload.sourceFileName || '',
    payload.sourceRowNo == null ? null : Number(payload.sourceRowNo),
    payload.sourceRef || '',
    nowIso(),
    nowIso(),
  );
}

/**
 * 功能：处理`upsertAliasSource`相关逻辑。
 * 输入：`db`（数据库连接）、`termId`（词条 ID）、`aliasText`（调用参数）、`payload`（业务载荷对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function upsertAliasSource(db, termId, aliasText, payload) {
  db.prepare(`
    INSERT INTO alias_sources(
      term_id, alias_text, source_type, import_job_id, source_file_name, source_row_no, source_ref, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(term_id, alias_text) DO UPDATE SET
      source_type = excluded.source_type,
      import_job_id = excluded.import_job_id,
      source_file_name = excluded.source_file_name,
      source_row_no = excluded.source_row_no,
      source_ref = excluded.source_ref,
      updated_at = excluded.updated_at
  `).run(
    termId,
    aliasText,
    payload.sourceType || '',
    payload.importJobId || null,
    payload.sourceFileName || '',
    payload.sourceRowNo == null ? null : Number(payload.sourceRowNo),
    payload.sourceRef || '',
    nowIso(),
    nowIso(),
  );
}

function admissionTargetMatchesCurrent(currentTerm = null, payload = {}) {
  if (!currentTerm) {
    return false;
  }
  return String(currentTerm.categoryCode || '').trim() === String(payload.categoryCode || '').trim()
    && String(currentTerm.canonicalText || '').trim() === String(payload.canonicalText || '').trim();
}

function buildPersistableImportedTermPayload(payload = {}, admission = {}, currentTerm = null) {
  const next = {
    ...payload,
  };
  const currentRules = currentTerm && currentTerm.rules ? currentTerm.rules : {};
  if (String(admission.runtimeSuitability || '').trim() === 'candidate') {
    next.replaceMode = 'candidate';
    if (String(next.pinyinRuntimeMode || '').trim() !== 'off') {
      next.pinyinRuntimeMode = 'candidate';
    }
    next.rules = {
      ...currentRules,
      ...(payload.rules || {}),
      candidateOnly: true,
    };
    return next;
  }
  if (payload && payload.rules) {
    next.rules = {
      ...currentRules,
      ...payload.rules,
    };
  }
  return next;
}

/**
 * 功能：确认`import job`相关逻辑。
 * 输入：`db`（数据库连接）、`appConfig`（应用配置对象）、`jobId`（导入批次 ID）、`operator`（操作人标识）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function confirmImportJob(db, appConfig, jobId, operator = 'console_user') {
  const job = db.prepare('SELECT * FROM import_jobs WHERE job_id = ?').get(jobId);
  if (!job) {
    const error = new Error(`import job not found: ${jobId}`);
    error.statusCode = 404;
    error.code = 'import_job_not_found';
    throw error;
  }
  if (!['preview_ready', 'uploaded', 'parsed'].includes(String(job.status || ''))) {
    const error = new Error(`import job is not confirmable in status: ${job.status}`);
    error.statusCode = 409;
    error.code = 'import_job_status_invalid';
    throw error;
  }
  const file = db.prepare(`SELECT * FROM import_job_files WHERE job_id = ? AND file_role = 'source_file' ORDER BY uploaded_at ASC LIMIT 1`).get(jobId);
  const rows = db.prepare(`SELECT * FROM import_job_rows WHERE job_id = ? ORDER BY row_no ASC`).all(jobId);
  const importableRows = rows.filter((item) => ['ready', 'warning'].includes(String(item.status || '').trim()));
  if (importableRows.length === 0) {
    const error = new Error('当前批次没有可导入记录，仅剩阻断行，请修正后重新预览。');
    error.statusCode = 409;
    error.code = 'import_job_blocked_rows';
    error.payload = {
      error: `${error.code}: ${error.message}`,
      blockedRowCount: rows.filter((item) => item.status === 'error').length,
      warningRowCount: rows.filter((item) => item.status === 'warning').length,
      importableRowCount: 0,
      issues: [],
    };
    throw error;
  }

  const changedTermIds = new Set();
  const reviewOptionsByTermId = new Map();
  const summary = {
    newTermCount: 0,
    replaceImportedCount: 0,
    candidateImportedCount: 0,
    mergedExistingCount: 0,
    aliasAppendedCount: 0,
    updatedTermCount: 0,
    newAliasCount: 0,
    updatedAliasCount: 0,
    importedReadyCount: 0,
    importedWarningCount: 0,
    skippedBlockedCount: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    changedTermIds: [],
  };

  for (const row of rows) {
    if (row.status === 'error') {
      markImportRowSkippedBlocked(db, row, row.error_code || 'import_job_row_blocked', row.error_message || 'preview blocked row skipped during confirm');
      summary.skippedBlockedCount += 1;
      summary.skippedCount += 1;
      continue;
    }

    const { normalizedPayload: payload } = extractStoredImportRowPayload(JSON.parse(row.normalized_payload_json || '{}'));
    const originalStatus = String(row.status || '').trim();
    let finalDecision = String(row.decision || 'accept').trim() || 'accept';

    if (job.template_code === 'validation_cases_csv_v1') {
      const result = importValidationCases(db, {
        sourceType: payload.sourceType || job.source_type || 'validation_import',
        mode: 'upsert',
        items: [payload],
      }, operator);
      summary.createdCount += Number(result.createdCount || 0);
      summary.updatedCount += Number(result.updatedCount || 0);
      summary.skippedCount += Number(result.skippedCount || 0);
    } else if (job.template_code === 'term_aliases_csv_v1') {
      const existingAliasTarget = db.prepare('SELECT term_id FROM terms WHERE category_code = ? AND canonical_text = ?').get(payload.categoryCode, payload.canonicalText);
      if (!existingAliasTarget) {
        markImportRowSkippedBlocked(db, row, 'target_term_not_found', 'target term not found during confirm');
        summary.skippedBlockedCount += 1;
        summary.skippedCount += 1;
        summary.errorCount += 1;
        continue;
      }
      const current = getTerm(db, existingAliasTarget.term_id);
      const mergedAliases = Array.from(new Set([...(current.aliases || []), payload.aliasText])).sort((a, b) => a.localeCompare(b, 'zh-CN'));
      const admission = evaluateTermAdmission(db, {
        ...current,
        aliases: mergedAliases,
        pinyinProfile: current.pinyinProfile || {},
      }, {
        currentTermId: current.termId,
        currentTerm: current,
        sourceMode: 'import',
      });
      if (admission.level === 'blocked') {
        const admissionSummary = summarizeTermAdmission(admission);
        const blockedIssue = (admissionSummary.issues || [])[0] || {};
        markImportRowSkippedBlocked(
          db,
          row,
          blockedIssue.code || 'import_job_term_admission_blocked',
          blockedIssue.message || `导入第 ${row.row_no} 行在确认阶段触发准入阻断，请重新生成预览后再导入。`,
        );
        summary.skippedBlockedCount += 1;
        summary.skippedCount += 1;
        summary.errorCount += 1;
        continue;
      }
      const beforeCount = (current.aliases || []).length;
      const updated = updateTerm(db, existingAliasTarget.term_id, {
        aliases: mergedAliases,
      }, operator);
      changedTermIds.add(updated.termId);
      if (mergedAliases.length > beforeCount) {
        const appendedCount = mergedAliases.length - beforeCount;
        summary.newAliasCount += appendedCount;
        summary.aliasAppendedCount += appendedCount;
      } else {
        summary.updatedAliasCount += 1;
      }
      finalDecision = 'append_alias_to_existing';
      upsertAliasSource(db, updated.termId, payload.aliasText, {
        sourceType: payload.sourceType || job.source_type,
        importJobId: jobId,
        sourceFileName: file ? file.original_name : '',
        sourceRowNo: row.row_no,
        sourceRef: `${job.template_code}:${row.row_no}`,
      });
      reviewOptionsByTermId.set(updated.termId, buildImportedTermReviewOptions(job, row, file, updated));
    } else {
      const exactExistingRow = payload.categoryCode && payload.canonicalText
        ? db.prepare('SELECT term_id FROM terms WHERE category_code = ? AND canonical_text = ?').get(payload.categoryCode, payload.canonicalText)
        : null;
      const exactCurrentTerm = exactExistingRow ? getTerm(db, exactExistingRow.term_id) : null;
      const admission = evaluateTermAdmission(db, payload, {
        currentTermId: exactCurrentTerm ? exactCurrentTerm.termId : '',
        currentTerm: exactCurrentTerm,
        sourceMode: 'import',
      });
      const action = String(admission.recommendedAction || '').trim();
      if (admission.level === 'blocked' || action === 'skip_blocked') {
        const admissionSummary = summarizeTermAdmission(admission);
        const blockedIssue = (admissionSummary.issues || [])[0] || {};
        markImportRowSkippedBlocked(
          db,
          row,
          blockedIssue.code || (admissionSummary.reasonCodes || [])[0] || 'import_job_term_admission_blocked',
          blockedIssue.message || admissionSummary.reasonSummary || `导入第 ${row.row_no} 行在确认阶段触发准入阻断，请重新生成预览后再导入。`,
        );
        summary.skippedBlockedCount += 1;
        summary.skippedCount += 1;
        summary.errorCount += 1;
        continue;
      }

      if (action === 'merge_existing') {
        finalDecision = 'merge_existing';
        const targetTermId = String(admission.targetTermId || '').trim();
        const current = targetTermId ? getTerm(db, targetTermId) : null;
        if (!current) {
          markImportRowSkippedBlocked(db, row, 'merge_target_missing', 'merge target missing during confirm');
          summary.skippedBlockedCount += 1;
          summary.skippedCount += 1;
          summary.errorCount += 1;
          continue;
        }
        const mergedAliases = Array.from(new Set([...(current.aliases || []), ...(payload.aliases || [])])).sort((a, b) => a.localeCompare(b, 'zh-CN'));
        const beforeAliasCount = (current.aliases || []).length;
        const updated = updateTerm(db, current.termId, {
          ...buildPersistableImportedTermPayload({
            ...payload,
            aliases: mergedAliases,
            sourceType: payload.sourceType || current.sourceType,
          }, admission, current),
        }, operator);
        changedTermIds.add(updated.termId);
        summary.updatedTermCount += 1;
        summary.mergedExistingCount += 1;
        if (mergedAliases.length > beforeAliasCount) {
          summary.newAliasCount += mergedAliases.length - beforeAliasCount;
        }
        upsertTermSource(db, updated.termId, {
          sourceType: payload.sourceType || job.source_type,
          importJobId: jobId,
          sourceFileName: file ? file.original_name : '',
          sourceRowNo: row.row_no,
          sourceRef: `${job.template_code}:${row.row_no}`,
        });
        for (const aliasText of (payload.aliases || [])) {
          upsertAliasSource(db, updated.termId, aliasText, {
            sourceType: payload.sourceType || job.source_type,
            importJobId: jobId,
            sourceFileName: file ? file.original_name : '',
            sourceRowNo: row.row_no,
            sourceRef: `${job.template_code}:${row.row_no}`,
          });
        }
        reviewOptionsByTermId.set(updated.termId, buildImportedTermReviewOptions(job, {
          ...row,
          recommendedAction: action,
          runtimeSuitability: admission.runtimeSuitability,
          targetTermId: admission.targetTermId,
          targetCanonicalText: admission.targetCanonicalText,
          reasonSummary: admission.reasonSummary,
          reviewHints: admission.reviewHints,
        }, file, updated));
      } else if (action === 'append_alias_to_existing') {
        finalDecision = 'append_alias_to_existing';
        const targetTermId = String(admission.targetTermId || '').trim();
        const current = targetTermId ? getTerm(db, targetTermId) : null;
        if (!current) {
          markImportRowSkippedBlocked(db, row, 'append_target_missing', 'append target missing during confirm');
          summary.skippedBlockedCount += 1;
          summary.skippedCount += 1;
          summary.errorCount += 1;
          continue;
        }
        const appendedAliases = Array.from(new Set([payload.canonicalText, ...(payload.aliases || [])])).filter(Boolean);
        const mergedAliases = Array.from(new Set([...(current.aliases || []), ...appendedAliases])).sort((a, b) => a.localeCompare(b, 'zh-CN'));
        const beforeAliasCount = (current.aliases || []).length;
        const updated = updateTerm(db, current.termId, {
          aliases: mergedAliases,
        }, operator);
        changedTermIds.add(updated.termId);
        if (mergedAliases.length > beforeAliasCount) {
          const appendedCount = mergedAliases.length - beforeAliasCount;
          summary.newAliasCount += appendedCount;
          summary.aliasAppendedCount += appendedCount;
        } else {
          summary.updatedAliasCount += 1;
        }
        for (const aliasText of appendedAliases) {
          upsertAliasSource(db, updated.termId, aliasText, {
            sourceType: payload.sourceType || job.source_type,
            importJobId: jobId,
            sourceFileName: file ? file.original_name : '',
            sourceRowNo: row.row_no,
            sourceRef: `${job.template_code}:${row.row_no}`,
          });
        }
        reviewOptionsByTermId.set(updated.termId, buildImportedTermReviewOptions(job, {
          ...row,
          recommendedAction: action,
          runtimeSuitability: admission.runtimeSuitability,
          targetTermId: admission.targetTermId,
          targetCanonicalText: admission.targetCanonicalText,
          reasonSummary: admission.reasonSummary,
          reviewHints: admission.reviewHints,
        }, file, updated));
      } else {
        finalDecision = 'accept';
        if (exactExistingRow) {
          const current = getTerm(db, exactExistingRow.term_id);
          const mergedAliases = Array.from(new Set([...(current.aliases || []), ...(payload.aliases || [])])).sort((a, b) => a.localeCompare(b, 'zh-CN'));
          const beforeAliasCount = (current.aliases || []).length;
          const updated = updateTerm(db, exactExistingRow.term_id, buildPersistableImportedTermPayload({
            ...payload,
            aliases: mergedAliases,
            sourceType: payload.sourceType || current.sourceType,
          }, admission, current), operator);
          changedTermIds.add(updated.termId);
          summary.updatedTermCount += 1;
          if (mergedAliases.length > beforeAliasCount) {
            summary.newAliasCount += mergedAliases.length - beforeAliasCount;
          }
          upsertTermSource(db, updated.termId, {
            sourceType: payload.sourceType || job.source_type,
            importJobId: jobId,
            sourceFileName: file ? file.original_name : '',
            sourceRowNo: row.row_no,
            sourceRef: `${job.template_code}:${row.row_no}`,
          });
          for (const aliasText of (payload.aliases || [])) {
            upsertAliasSource(db, updated.termId, aliasText, {
              sourceType: payload.sourceType || job.source_type,
              importJobId: jobId,
              sourceFileName: file ? file.original_name : '',
              sourceRowNo: row.row_no,
              sourceRef: `${job.template_code}:${row.row_no}`,
            });
          }
          reviewOptionsByTermId.set(updated.termId, buildImportedTermReviewOptions(job, {
            ...row,
            recommendedAction: action,
            runtimeSuitability: admission.runtimeSuitability,
            targetTermId: admission.targetTermId,
            targetCanonicalText: admission.targetCanonicalText,
            reasonSummary: admission.reasonSummary,
            reviewHints: admission.reviewHints,
          }, file, updated));
        } else {
          const created = createTerm(db, {
            ...buildPersistableImportedTermPayload({
              ...payload,
              status: 'draft',
            }, admission, null),
          }, operator);
          changedTermIds.add(created.termId);
          summary.newTermCount += 1;
          summary.newAliasCount += (payload.aliases || []).length;
          upsertTermSource(db, created.termId, {
            sourceType: payload.sourceType || job.source_type,
            importJobId: jobId,
            sourceFileName: file ? file.original_name : '',
            sourceRowNo: row.row_no,
            sourceRef: `${job.template_code}:${row.row_no}`,
          });
          for (const aliasText of (payload.aliases || [])) {
            upsertAliasSource(db, created.termId, aliasText, {
              sourceType: payload.sourceType || job.source_type,
              importJobId: jobId,
              sourceFileName: file ? file.original_name : '',
              sourceRowNo: row.row_no,
              sourceRef: `${job.template_code}:${row.row_no}`,
            });
          }
          reviewOptionsByTermId.set(created.termId, buildImportedTermReviewOptions(job, {
            ...row,
            recommendedAction: action,
            runtimeSuitability: admission.runtimeSuitability,
            targetTermId: admission.targetTermId,
            targetCanonicalText: admission.targetCanonicalText,
            reasonSummary: admission.reasonSummary,
            reviewHints: admission.reviewHints,
          }, file, created));
        }
      }

      if (action === 'save_candidate') {
        summary.candidateImportedCount += 1;
      } else if (action === 'save_replace') {
        summary.replaceImportedCount += 1;
      }
    }

    if (originalStatus === 'warning') {
      summary.importedWarningCount += 1;
    } else {
      summary.importedReadyCount += 1;
    }
    db.prepare('UPDATE import_job_rows SET status = ?, decision = ?, updated_at = ? WHERE row_id = ?')
      .run('imported', finalDecision, nowIso(), row.row_id);
  }

  const createdReviewTaskIds = [];
  if (job.template_code !== 'validation_cases_csv_v1') {
    for (const termId of changedTermIds) {
      const task = submitTermReview(
        db,
        termId,
        operator,
        `import job ${jobId}`,
        reviewOptionsByTermId.get(termId) || {},
      );
      if (task && task.taskId) {
        createdReviewTaskIds.push(task.taskId);
      }
    }
    db.prepare(`
      INSERT INTO import_job_results(
        result_id, job_id, new_term_count, replace_imported_count, candidate_imported_count,
        merged_existing_count, alias_appended_count, updated_term_count, new_alias_count,
        updated_alias_count, imported_ready_count, imported_warning_count, skipped_blocked_count,
        skipped_count, error_count, imported_by, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        new_term_count = excluded.new_term_count,
        replace_imported_count = excluded.replace_imported_count,
        candidate_imported_count = excluded.candidate_imported_count,
        merged_existing_count = excluded.merged_existing_count,
        alias_appended_count = excluded.alias_appended_count,
        updated_term_count = excluded.updated_term_count,
        new_alias_count = excluded.new_alias_count,
        updated_alias_count = excluded.updated_alias_count,
        imported_ready_count = excluded.imported_ready_count,
        imported_warning_count = excluded.imported_warning_count,
        skipped_blocked_count = excluded.skipped_blocked_count,
        skipped_count = excluded.skipped_count,
        error_count = excluded.error_count,
        imported_by = excluded.imported_by,
        imported_at = excluded.imported_at
    `).run(
      generateId('import_result'),
      jobId,
      summary.newTermCount,
      summary.replaceImportedCount,
      summary.candidateImportedCount,
      summary.mergedExistingCount,
      summary.aliasAppendedCount,
      summary.updatedTermCount,
      summary.newAliasCount,
      summary.updatedAliasCount,
      summary.importedReadyCount,
      summary.importedWarningCount,
      summary.skippedBlockedCount,
      summary.skippedCount,
      summary.errorCount,
      operator,
      nowIso(),
    );
    db.prepare('UPDATE import_jobs SET status = ?, confirmed_by = ?, confirmed_at = ?, finished_at = ? WHERE job_id = ?')
      .run('imported', operator, nowIso(), nowIso(), jobId);
    summary.createdReviewTaskIds = createdReviewTaskIds;
    summary.changedTermIds = Array.from(changedTermIds);
  } else {
    db.prepare(`
      INSERT INTO import_job_results(
        result_id, job_id, new_term_count, replace_imported_count, candidate_imported_count,
        merged_existing_count, alias_appended_count, updated_term_count, new_alias_count,
        updated_alias_count, imported_ready_count, imported_warning_count, skipped_blocked_count,
        skipped_count, error_count, imported_by, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        new_term_count = excluded.new_term_count,
        replace_imported_count = excluded.replace_imported_count,
        candidate_imported_count = excluded.candidate_imported_count,
        merged_existing_count = excluded.merged_existing_count,
        alias_appended_count = excluded.alias_appended_count,
        updated_term_count = excluded.updated_term_count,
        new_alias_count = excluded.new_alias_count,
        updated_alias_count = excluded.updated_alias_count,
        imported_ready_count = excluded.imported_ready_count,
        imported_warning_count = excluded.imported_warning_count,
        skipped_blocked_count = excluded.skipped_blocked_count,
        skipped_count = excluded.skipped_count,
        error_count = excluded.error_count,
        imported_by = excluded.imported_by,
        imported_at = excluded.imported_at
    `).run(
      generateId('import_result'),
      jobId,
      summary.createdCount,
      0,
      0,
      0,
      0,
      summary.updatedCount,
      0,
      0,
      summary.importedReadyCount,
      summary.importedWarningCount,
      summary.skippedBlockedCount,
      summary.skippedCount,
      summary.errorCount,
      operator,
      nowIso(),
    );
    db.prepare('UPDATE import_jobs SET status = ?, confirmed_by = ?, confirmed_at = ?, finished_at = ? WHERE job_id = ?')
      .run('imported', operator, nowIso(), nowIso(), jobId);
    summary.createdReviewTaskIds = [];
    summary.changedTermIds = [];
  }
  return {
    jobId,
    status: 'imported',
    resultSummary: summary,
    createdReviewTaskIds: summary.createdReviewTaskIds || [],
    changedTermIds: summary.changedTermIds || [],
  };
}

/**
 * 功能：取消`import job`相关逻辑。
 * 输入：`db`（数据库连接）、`jobId`（导入批次 ID）、`operator`（操作人标识）、`reason`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function cancelImportJob(db, jobId, operator = 'console_user', reason = '') {
  const job = db.prepare('SELECT * FROM import_jobs WHERE job_id = ?').get(jobId);
  if (!job) {
    const error = new Error(`import job not found: ${jobId}`);
    error.statusCode = 404;
    error.code = 'import_job_not_found';
    throw error;
  }
  if (!['preview_ready', 'uploaded', 'parsed'].includes(String(job.status || ''))) {
    const error = new Error(`import job is not cancellable in status: ${job.status}`);
    error.statusCode = 409;
    error.code = 'import_job_status_invalid';
    throw error;
  }
  db.prepare('UPDATE import_jobs SET status = ?, finished_at = ? WHERE job_id = ?').run('cancelled', nowIso(), jobId);
  return {
    jobId,
    status: 'cancelled',
    cancelledAt: nowIso(),
    cancelledBy: operator,
    reason,
  };
}

module.exports = {
  createImportJob,
  confirmImportJob,
  cancelImportJob,
};
