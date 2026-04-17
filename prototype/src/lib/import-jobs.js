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
  createBlockedAdmissionError,
} = require('./term-admission');

const DEFAULT_TERM_IMPORT_RUNTIME_MODE = 'candidate';

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

function importRowFromAdmission(rowNo, rawPayload, normalizedPayload, admission = {}) {
  const primaryIssue = primaryIssueSummary(admission.issues);
  const mergedExisting = Array.isArray(admission.issues)
    && admission.issues.some((entry) => entry && entry.code === 'exact_match_existing');
  const admissionLevel = admission.level || 'ready';
  return {
    rowNo,
    rawPayload,
    normalizedPayload: admission.normalizedInput || normalizedPayload || {},
    issues: Array.isArray(admission.issues) ? admission.issues : [],
    targetTermKey: admission.normalizedInput && admission.normalizedInput.categoryCode && admission.normalizedInput.canonicalText
      ? `${admission.normalizedInput.categoryCode}|${admission.normalizedInput.canonicalText}`
      : '',
    status: admissionLevel === 'blocked' ? 'error' : (admissionLevel === 'warning' ? 'warning' : 'ready'),
    decision: admissionLevel === 'blocked' ? 'pending' : (mergedExisting ? 'merge_existing' : 'accept'),
    errorCode: primaryIssue ? primaryIssue.code : '',
    errorMessage: primaryIssue ? primaryIssue.message : (mergedExisting ? 'term already exists and will be merged' : ''),
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
    },
    admissionSummary: {
      admissionLevel: blockedCount > 0 ? 'blocked' : (warningCount > 0 ? 'warning' : 'ready'),
      blockedCount,
      warningCount,
      issues,
    },
    conflictSummary: buildConflictSummaryFromIssues(issues),
  };
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
        JSON.stringify(row.normalizedPayload || {}),
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
  if (rows.some((item) => item.status === 'error')) {
    const error = new Error('当前批次仍存在 blocked/error 行，请先修正文件后重新上传。');
    error.statusCode = 409;
    error.code = 'import_job_blocked_rows';
    error.payload = {
      error: `${error.code}: ${error.message}`,
      blockedRowCount: rows.filter((item) => item.status === 'error').length,
      warningRowCount: rows.filter((item) => item.status === 'warning').length,
      issues: [],
    };
    throw error;
  }
  for (const row of rows) {
    if (job.template_code === 'validation_cases_csv_v1') {
      continue;
    }
    const payload = JSON.parse(row.normalized_payload_json || '{}');
    if (job.template_code === 'term_aliases_csv_v1') {
      const target = db.prepare('SELECT term_id FROM terms WHERE category_code = ? AND canonical_text = ?').get(payload.categoryCode, payload.canonicalText);
      if (!target) {
        const error = new Error('确认导入时发现 alias 目标词条不存在，请重新生成预览。');
        error.statusCode = 409;
        error.code = 'import_job_alias_target_missing';
        throw error;
      }
      const current = getTerm(db, target.term_id);
      const admission = evaluateTermAdmission(db, {
        ...current,
        aliases: Array.from(new Set([...(current.aliases || []), payload.aliasText])),
        pinyinProfile: current.pinyinProfile || {},
      }, {
        currentTermId: current.termId,
        currentTerm: current,
        sourceMode: 'import',
      });
      if (admission.level === 'blocked') {
        throw createBlockedAdmissionError(admission, {
          code: 'import_job_term_admission_blocked',
          message: `导入第 ${row.row_no} 行在确认阶段触发准入阻断，请重新生成预览后再导入。`,
        });
      }
      continue;
    }
    const existingRow = payload.categoryCode && payload.canonicalText
      ? db.prepare('SELECT term_id FROM terms WHERE category_code = ? AND canonical_text = ?').get(payload.categoryCode, payload.canonicalText)
      : null;
    const currentTerm = existingRow ? getTerm(db, existingRow.term_id) : null;
    const admission = evaluateTermAdmission(db, payload, {
      currentTermId: currentTerm ? currentTerm.termId : '',
      currentTerm,
      sourceMode: 'import',
    });
    if (admission.level === 'blocked') {
      throw createBlockedAdmissionError(admission, {
        code: 'import_job_term_admission_blocked',
        message: `导入第 ${row.row_no} 行在确认阶段触发准入阻断，请重新生成预览后再导入。`,
      });
    }
  }
  const changedTermIds = new Set();
  const reviewOptionsByTermId = new Map();
  const summary = {
    newTermCount: 0,
    updatedTermCount: 0,
    newAliasCount: 0,
    updatedAliasCount: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errorCount: rows.filter((item) => item.status === 'error').length,
    changedTermIds: [],
  };
  for (const row of rows) {
    if (row.status === 'error') {
      continue;
    }
    const payload = JSON.parse(row.normalized_payload_json || '{}');
    if (job.template_code === 'validation_cases_csv_v1') {
      const result = importValidationCases(db, {
        sourceType: payload.sourceType || job.source_type || 'validation_import',
        mode: 'upsert',
        items: [payload],
      }, operator);
      summary.createdCount += Number(result.createdCount || 0);
      summary.updatedCount += Number(result.updatedCount || 0);
      summary.skippedCount += result.skippedCount;
    } else if (job.template_code === 'term_aliases_csv_v1') {
      const existingRow = db.prepare('SELECT term_id FROM terms WHERE category_code = ? AND canonical_text = ?').get(payload.categoryCode, payload.canonicalText);
      if (!existingRow) {
        db.prepare('UPDATE import_job_rows SET status = ?, error_code = ?, error_message = ?, updated_at = ? WHERE row_id = ?')
          .run('error', 'target_term_not_found', 'target term not found during confirm', nowIso(), row.row_id);
        summary.errorCount += 1;
        continue;
      }
      const current = getTerm(db, existingRow.term_id);
      const mergedAliases = Array.from(new Set([...(current.aliases || []), payload.aliasText])).sort((a, b) => a.localeCompare(b, 'zh-CN'));
      const beforeCount = (current.aliases || []).length;
      const updated = updateTerm(db, existingRow.term_id, {
        aliases: mergedAliases,
      }, operator);
      changedTermIds.add(updated.termId);
      if (mergedAliases.length > beforeCount) {
        summary.newAliasCount += mergedAliases.length - beforeCount;
      } else {
        summary.updatedAliasCount += 1;
      }
      upsertAliasSource(db, updated.termId, payload.aliasText, {
        sourceType: payload.sourceType || job.source_type,
        importJobId: jobId,
        sourceFileName: file ? file.original_name : '',
        sourceRowNo: row.row_no,
        sourceRef: `${job.template_code}:${row.row_no}`,
      });
      reviewOptionsByTermId.set(updated.termId, buildImportedTermReviewOptions(job, row, file, updated));
    } else {
      const existingRow = db.prepare('SELECT term_id FROM terms WHERE category_code = ? AND canonical_text = ?').get(payload.categoryCode, payload.canonicalText);
      if (existingRow) {
        const current = getTerm(db, existingRow.term_id);
        const mergedAliases = Array.from(new Set([...(current.aliases || []), ...(payload.aliases || [])])).sort((a, b) => a.localeCompare(b, 'zh-CN'));
        const beforeAliasCount = (current.aliases || []).length;
        const updated = updateTerm(db, existingRow.term_id, {
          ...payload,
          aliases: mergedAliases,
          sourceType: payload.sourceType || current.sourceType,
        }, operator);
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
        reviewOptionsByTermId.set(updated.termId, buildImportedTermReviewOptions(job, row, file, updated));
      } else {
        const created = createTerm(db, {
          ...payload,
          status: 'draft',
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
        reviewOptionsByTermId.set(created.termId, buildImportedTermReviewOptions(job, row, file, created));
      }
    }
    db.prepare('UPDATE import_job_rows SET status = ?, decision = ?, updated_at = ? WHERE row_id = ?')
      .run('imported', 'accept', nowIso(), row.row_id);
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
        result_id, job_id, new_term_count, updated_term_count, new_alias_count,
        updated_alias_count, skipped_count, error_count, imported_by, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        new_term_count = excluded.new_term_count,
        updated_term_count = excluded.updated_term_count,
        new_alias_count = excluded.new_alias_count,
        updated_alias_count = excluded.updated_alias_count,
        skipped_count = excluded.skipped_count,
        error_count = excluded.error_count,
        imported_by = excluded.imported_by,
        imported_at = excluded.imported_at
    `).run(
      generateId('import_result'),
      jobId,
      summary.newTermCount,
      summary.updatedTermCount,
      summary.newAliasCount,
      summary.updatedAliasCount,
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
        result_id, job_id, new_term_count, updated_term_count, new_alias_count,
        updated_alias_count, skipped_count, error_count, imported_by, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        new_term_count = excluded.new_term_count,
        updated_term_count = excluded.updated_term_count,
        new_alias_count = excluded.new_alias_count,
        updated_alias_count = excluded.updated_alias_count,
        skipped_count = excluded.skipped_count,
        error_count = excluded.error_count,
        imported_by = excluded.imported_by,
        imported_at = excluded.imported_at
    `).run(
      generateId('import_result'),
      jobId,
      summary.createdCount,
      summary.updatedCount,
      0,
      0,
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
