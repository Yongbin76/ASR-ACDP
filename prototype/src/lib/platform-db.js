const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const { buildPinyinProfile, buildPinyinCandidates, joinPinyin } = require('./pinyin');
const { buildReleaseArtifactMetadata } = require('./artifact-store');
const { loadGovernancePolicies } = require('./governance-policies');
const { usableSourceType } = require('./source-types');

/**
 * 功能：生成当前 UTC ISO 时间字符串。
 * 输入：无。
 * 输出：ISO 8601 时间字符串。
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * 功能：确保数据库或工作目录存在。
 * 输入：`dirPath` 目录路径。
 * 输出：无显式返回。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：解析数据库文件路径。
 * 输入：配置对象或直接的数据库路径字符串。
 * 输出：数据库文件路径字符串。
 */
function databasePath(appConfigOrPath) {
  if (appConfigOrPath && appConfigOrPath.resolvedPaths && appConfigOrPath.resolvedPaths.databaseFile) {
    return appConfigOrPath.resolvedPaths.databaseFile;
  }
  return String(appConfigOrPath || '');
}

/**
 * 功能：生成带前缀的业务 ID。
 * 输入：`prefix` 业务前缀。
 * 输出：唯一 ID 字符串。
 */
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * 功能：标准化别名数组并去重。
 * 输入：`aliases` 别名数组。
 * 输出：清洗后的别名数组。
 */
function sanitizeAliases(aliases) {
  return Array.from(new Set((aliases || []).map((item) => String(item || '').trim()).filter(Boolean)));
}

/**
 * 功能：标准化普通字符串数组并去重。
 * 输入：`items` 任意字符串数组。
 * 输出：清洗后的字符串数组。
 */
function sanitizeArray(items) {
  return Array.from(new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean)));
}

// Keep rule normalization in one place so browser payloads, seed imports and
// runtime persistence all share the same contract.
/**
 * 功能：把规则输入标准化为统一的规则结构。
 * 输入：`rules` 原始规则对象。
 * 输出：标准化后的规则对象。
 */
function sanitizeRules(rules) {
  const input = rules || {};
  return {
    candidateOnly: Boolean(input.candidateOnly),
    minTextLen: input.minTextLen == null || input.minTextLen === '' ? null : Math.max(1, Number(input.minTextLen)),
    maxTextLen: input.maxTextLen == null || input.maxTextLen === '' ? null : Math.max(1, Number(input.maxTextLen)),
    boundaryPolicy: ['none', 'char_type'].includes(String(input.boundaryPolicy || 'none'))
      ? String(input.boundaryPolicy || 'none')
      : 'none',
    leftContextAllow: sanitizeArray(input.leftContextAllow),
    rightContextAllow: sanitizeArray(input.rightContextAllow),
    leftContextBlock: sanitizeArray(input.leftContextBlock),
    rightContextBlock: sanitizeArray(input.rightContextBlock),
    regexAllow: sanitizeArray(input.regexAllow),
    regexBlock: sanitizeArray(input.regexBlock),
  };
}

/**
 * 功能：把任意值序列化为 JSON 字符串。
 * 输入：`value` 任意 JavaScript 值。
 * 输出：JSON 字符串。
 */
function serializeJson(value) {
  return JSON.stringify(value == null ? null : value);
}

/**
 * 功能：把 JSON 字符串反序列化为对象，失败时返回兜底值。
 * 输入：`value` JSON 字符串，`fallback` 兜底值。
 * 输出：解析结果或兜底值。
 */
function deserializeJson(value, fallback = null) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * 功能：把字符串数组清洗后序列化为 JSON。
 * 输入：`items` 字符串数组。
 * 输出：JSON 字符串。
 */
function serializeArray(items) {
  return JSON.stringify(sanitizeArray(items));
}

/**
 * 功能：把数组 JSON 反序列化并标准化为字符串数组。
 * 输入：`value` JSON 字符串。
 * 输出：清洗后的字符串数组。
 */
function deserializeArray(value) {
  return sanitizeArray(deserializeJson(value, []));
}

/**
 * 功能：根据数组长度构造 SQL `IN (...)` 所需的占位符片段。
 * 输入：任意数组。
 * 输出：由 `?` 组成的逗号分隔字符串；空数组时返回空字符串。
 */
function buildInClausePlaceholders(items = []) {
  return (items || []).map(() => '?').join(',');
}

/**
 * 功能：检查指定表是否存在某个列。
 * 输入：数据库连接、表名、列名。
 * 输出：布尔值。
 */
function hasTableColumn(db, tableName, columnName) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return rows.some((row) => String(row.name || '').trim() === String(columnName || '').trim());
}

/**
 * 功能：确保既有数据库补齐新增列定义。
 * 输入：数据库连接、表名、列名、列定义 SQL。
 * 输出：无显式返回。
 */
function ensureTableColumn(db, tableName, columnName, definitionSql) {
  if (hasTableColumn(db, tableName, columnName)) {
    return;
  }
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
}

/**
 * 功能：打开 SQLite 数据库并确保原型所需表结构存在。
 * 输入：配置对象或数据库路径。
 * 输出：`DatabaseSync` 数据库连接实例。
 */
function openDatabase(appConfigOrPath) {
  const dbFile = databasePath(appConfigOrPath);
  ensureDir(path.dirname(dbFile));
  const db = new DatabaseSync(dbFile);
  if (appConfigOrPath && typeof appConfigOrPath === 'object') {
    db.appConfig = appConfigOrPath;
  }
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS terms (
      term_id TEXT PRIMARY KEY,
      category_code TEXT NOT NULL,
      canonical_text TEXT NOT NULL,
      status TEXT NOT NULL,
      priority INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      replace_mode TEXT NOT NULL,
      base_confidence REAL NOT NULL,
      source_type TEXT NOT NULL,
      pinyin_runtime_mode TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_id TEXT NOT NULL,
      alias_text TEXT NOT NULL,
      UNIQUE(term_id, alias_text),
      FOREIGN KEY(term_id) REFERENCES terms(term_id)
    );
    CREATE TABLE IF NOT EXISTS term_sources (
      term_id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      import_job_id TEXT,
      source_file_name TEXT NOT NULL DEFAULT '',
      source_row_no INTEGER,
      source_ref TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(term_id) REFERENCES terms(term_id)
    );
    CREATE TABLE IF NOT EXISTS alias_sources (
      term_id TEXT NOT NULL,
      alias_text TEXT NOT NULL,
      source_type TEXT NOT NULL,
      import_job_id TEXT,
      source_file_name TEXT NOT NULL DEFAULT '',
      source_row_no INTEGER,
      source_ref TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (term_id, alias_text),
      FOREIGN KEY(term_id) REFERENCES terms(term_id)
    );
    CREATE TABLE IF NOT EXISTS term_rules (
      term_id TEXT PRIMARY KEY,
      candidate_only INTEGER NOT NULL DEFAULT 0,
      min_text_len INTEGER NULL,
      max_text_len INTEGER NULL,
      boundary_policy TEXT NOT NULL DEFAULT 'none',
      left_context_allow TEXT NOT NULL DEFAULT '[]',
      right_context_allow TEXT NOT NULL DEFAULT '[]',
      left_context_block TEXT NOT NULL DEFAULT '[]',
      right_context_block TEXT NOT NULL DEFAULT '[]',
      regex_allow TEXT NOT NULL DEFAULT '[]',
      regex_block TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      FOREIGN KEY(term_id) REFERENCES terms(term_id)
    );
    CREATE TABLE IF NOT EXISTS pinyin_profiles (
      term_id TEXT PRIMARY KEY,
      full_pinyin_no_tone TEXT NOT NULL,
      initials TEXT NOT NULL,
      syllables_json TEXT NOT NULL,
      runtime_mode TEXT NOT NULL DEFAULT 'candidate',
      polyphone_mode TEXT NOT NULL DEFAULT 'default',
      custom_full_pinyin_no_tone TEXT NOT NULL DEFAULT '',
      alternative_readings_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      FOREIGN KEY(term_id) REFERENCES terms(term_id)
    );
    CREATE TABLE IF NOT EXISTS releases (
      release_id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      artifact_dir TEXT NOT NULL,
      snapshot_path TEXT NOT NULL,
      manifest_path TEXT NOT NULL,
      term_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      published_at TEXT
    );
    CREATE TABLE IF NOT EXISTS release_terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id TEXT NOT NULL,
      term_id TEXT NOT NULL,
      FOREIGN KEY(release_id) REFERENCES releases(release_id),
      FOREIGN KEY(term_id) REFERENCES terms(term_id)
    );
    CREATE TABLE IF NOT EXISTS gray_policies (
      policy_id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      percentage INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(release_id) REFERENCES releases(release_id)
    );
    CREATE TABLE IF NOT EXISTS review_tasks (
      task_id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      status TEXT NOT NULL,
      submitted_by TEXT NOT NULL,
      reviewed_by TEXT,
      comment TEXT,
      target_snapshot TEXT,
      created_at TEXT NOT NULL,
      reviewed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS validation_cases (
      case_id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      sample_text TEXT NOT NULL,
      expected_canonicals_json TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      source_type TEXT NOT NULL DEFAULT 'manual',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS import_jobs (
      job_id TEXT PRIMARY KEY,
      job_type TEXT NOT NULL,
      source_type TEXT NOT NULL,
      template_code TEXT NOT NULL,
      template_version TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      submitted_by TEXT NOT NULL,
      confirmed_by TEXT,
      created_at TEXT NOT NULL,
      confirmed_at TEXT,
      finished_at TEXT
    );
    CREATE TABLE IF NOT EXISTS import_job_files (
      file_id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      file_role TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT '',
      file_size INTEGER NOT NULL DEFAULT 0,
      checksum TEXT NOT NULL DEFAULT '',
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY(job_id) REFERENCES import_jobs(job_id)
    );
    CREATE TABLE IF NOT EXISTS import_job_rows (
      row_id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      row_no INTEGER NOT NULL,
      raw_payload_json TEXT NOT NULL,
      normalized_payload_json TEXT NOT NULL,
      issues_json TEXT NOT NULL DEFAULT '[]',
      target_term_key TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      decision TEXT NOT NULL DEFAULT 'pending',
      error_code TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(job_id) REFERENCES import_jobs(job_id)
    );
    CREATE TABLE IF NOT EXISTS import_job_results (
      result_id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      new_term_count INTEGER NOT NULL DEFAULT 0,
      updated_term_count INTEGER NOT NULL DEFAULT 0,
      new_alias_count INTEGER NOT NULL DEFAULT 0,
      updated_alias_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      imported_by TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      FOREIGN KEY(job_id) REFERENCES import_jobs(job_id)
    );
    CREATE TABLE IF NOT EXISTS import_templates (
      template_code TEXT PRIMARY KEY,
      template_name TEXT NOT NULL,
      template_version TEXT NOT NULL,
      import_type TEXT NOT NULL,
      file_format TEXT NOT NULL,
      schema_json TEXT NOT NULL,
      template_file_path TEXT NOT NULL,
      example_file_path TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runtime_nodes (
      node_id TEXT PRIMARY KEY,
      node_name TEXT NOT NULL,
      env TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      runtime_version TEXT NOT NULL DEFAULT '',
      current_version TEXT NOT NULL DEFAULT '',
      desired_version TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'online',
      last_heartbeat_at TEXT,
      last_register_at TEXT,
      last_apply_at TEXT,
      last_apply_status TEXT NOT NULL DEFAULT '',
      last_error TEXT NOT NULL DEFAULT '',
      runtime_stats_cursor TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runtime_node_registry (
      node_id TEXT PRIMARY KEY,
      node_name TEXT NOT NULL,
      env TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      registration_secret_hash TEXT NOT NULL DEFAULT '',
      secret_fingerprint TEXT NOT NULL DEFAULT '',
      remarks TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runtime_control_state (
      control_key TEXT PRIMARY KEY,
      release_id TEXT NOT NULL,
      desired_version TEXT NOT NULL,
      artifact_metadata_json TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      config_version INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runtime_node_hourly_stats (
      node_id TEXT NOT NULL,
      hour_key TEXT NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      http_request_count INTEGER NOT NULL DEFAULT 0,
      ws_request_count INTEGER NOT NULL DEFAULT 0,
      hit_term_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (node_id, hour_key)
    );
    CREATE TABLE IF NOT EXISTS runtime_node_hourly_terms (
      node_id TEXT NOT NULL,
      hour_key TEXT NOT NULL,
      canonical_text TEXT NOT NULL,
      hit_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (node_id, hour_key, canonical_text)
    );
    CREATE TABLE IF NOT EXISTS runtime_node_peak_stats (
      node_id TEXT PRIMARY KEY,
      peak_concurrency INTEGER NOT NULL DEFAULT 0,
      peak_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runtime_node_stat_upload_records (
      node_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      record_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (node_id, batch_id, sequence)
    );
    CREATE TABLE IF NOT EXISTS runtime_hourly_stats (
      hour_key TEXT PRIMARY KEY,
      request_count INTEGER NOT NULL DEFAULT 0,
      http_request_count INTEGER NOT NULL DEFAULT 0,
      ws_request_count INTEGER NOT NULL DEFAULT 0,
      hit_term_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runtime_hourly_terms (
      hour_key TEXT NOT NULL,
      canonical_text TEXT NOT NULL,
      hit_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (hour_key, canonical_text)
    );
    CREATE TABLE IF NOT EXISTS runtime_peak_stats (
      stat_key TEXT PRIMARY KEY,
      peak_concurrency INTEGER NOT NULL DEFAULT 0,
      peak_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      audit_id TEXT PRIMARY KEY,
      request_id TEXT,
      operator TEXT NOT NULL,
      operation TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      before_snapshot TEXT,
      after_snapshot TEXT,
      note TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_terms_category ON terms(category_code);
    CREATE INDEX IF NOT EXISTS idx_terms_status ON terms(status);
    CREATE INDEX IF NOT EXISTS idx_terms_canonical ON terms(canonical_text);
    CREATE INDEX IF NOT EXISTS idx_aliases_alias ON aliases(alias_text);
    CREATE INDEX IF NOT EXISTS idx_term_sources_job ON term_sources(import_job_id);
    CREATE INDEX IF NOT EXISTS idx_alias_sources_job ON alias_sources(import_job_id, term_id);
    CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);
    CREATE INDEX IF NOT EXISTS idx_releases_created ON releases(created_at DESC, release_id DESC);
    CREATE INDEX IF NOT EXISTS idx_release_terms_release ON release_terms(release_id, term_id);
    CREATE INDEX IF NOT EXISTS idx_release_terms_term ON release_terms(term_id, release_id);
    CREATE INDEX IF NOT EXISTS idx_gray_enabled ON gray_policies(enabled);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON review_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_reviews_target ON review_tasks(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_status_target ON review_tasks(status, target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_status_pinyin_term ON review_tasks(
      status,
      target_type,
      json_extract(target_snapshot, '$.termId')
    );
    CREATE INDEX IF NOT EXISTS idx_validation_enabled ON validation_cases(enabled);
    CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_import_jobs_source ON import_jobs(source_type, job_type);
    CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON import_jobs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_import_job_files_job ON import_job_files(job_id, file_role);
    CREATE INDEX IF NOT EXISTS idx_import_job_rows_job ON import_job_rows(job_id, row_no);
    CREATE INDEX IF NOT EXISTS idx_import_job_rows_status ON import_job_rows(job_id, status, decision);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_import_job_results_job ON import_job_results(job_id);
    CREATE INDEX IF NOT EXISTS idx_import_templates_enabled ON import_templates(enabled, import_type);
    CREATE INDEX IF NOT EXISTS idx_runtime_nodes_status ON runtime_nodes(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runtime_nodes_heartbeat ON runtime_nodes(last_heartbeat_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runtime_node_registry_enabled ON runtime_node_registry(enabled, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runtime_control_updated ON runtime_control_state(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runtime_node_stats_hour ON runtime_node_hourly_stats(hour_key, node_id);
    CREATE INDEX IF NOT EXISTS idx_runtime_node_terms_hour ON runtime_node_hourly_terms(hour_key, node_id, hit_count DESC);
    CREATE INDEX IF NOT EXISTS idx_runtime_upload_records_batch ON runtime_node_stat_upload_records(batch_id, node_id);
    CREATE INDEX IF NOT EXISTS idx_runtime_terms_hour ON runtime_hourly_terms(hour_key, hit_count DESC);
    CREATE INDEX IF NOT EXISTS idx_audits_created ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audits_target ON audit_logs(target_type, target_id);
  `);
  ensureTableColumn(db, 'import_job_rows', 'issues_json', "TEXT NOT NULL DEFAULT '[]'");
  seedValidationCases(db, appConfigOrPath);
  return db;
}

/**
 * 功能：解析默认 validation case 配置文件路径。
 * 输入：应用配置对象或路径对象。
 * 输出：配置文件路径字符串。
 */
function validationCasesConfigPath(appConfigOrPath) {
  if (appConfigOrPath && appConfigOrPath.projectRoot) {
    return path.join(appConfigOrPath.projectRoot, 'prototype', 'config', 'release_validation_cases.json');
  }
  return '';
}

/**
 * 功能：标准化 validation case 中的 expected canonical 列表。
 * 输入：`items` canonical 数组。
 * 输出：去重清洗后的 canonical 数组。
 */
function normalizeExpectedCanonicals(items) {
  return Array.from(new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean)));
}

/**
 * 功能：根据样本文本和期望 canonical 生成稳定指纹。
 * 输入：`payload` validation case 输入对象。
 * 输出：指纹字符串。
 */
function validationCaseFingerprint(payload = {}) {
  const seed = [
    String(payload.sourceType || 'manual').trim().toLowerCase(),
    String(payload.text || '').trim(),
    normalizeExpectedCanonicals(payload.expectedCanonicals).join('|'),
  ].join('::');
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * 功能：为 validation case 生成默认 caseId。
 * 输入：`payload` validation case 输入对象。
 * 输出：默认 caseId 字符串。
 */
function defaultValidationCaseId(payload = {}) {
  return `${String(payload.sourceType || 'manual').trim().toLowerCase() || 'manual'}_${validationCaseFingerprint(payload)}`;
}

/**
 * 功能：把 validation case 输入标准化为统一结构。
 * 输入：`payload` 原始输入对象，`fallbackCaseId` 兜底 caseId。
 * 输出：标准化后的 validation case 对象。
 */
function normalizeValidationCaseInput(payload = {}, fallbackCaseId = '') {
  return {
    caseId: String(payload.caseId || fallbackCaseId || defaultValidationCaseId(payload) || generateId('validation_case')).trim(),
    description: String(payload.description || '').trim(),
    text: String(payload.text || '').trim(),
    expectedCanonicals: normalizeExpectedCanonicals(payload.expectedCanonicals),
    enabled: payload.enabled == null ? true : Boolean(payload.enabled),
    sourceType: String(payload.sourceType || 'manual').trim() || 'manual',
    notes: String(payload.notes || '').trim(),
  };
}

/**
 * 功能：校验验证样本来源类型是否可在当前录入方式下使用。
 * 输入：数据库连接、来源类型编码和校验选项。
 * 输出：合法来源类型对象；不合法时抛出异常。
 */
function assertValidationSourceTypeUsable(db, sourceType, options = {}) {
  const usable = usableSourceType(db.appConfig, sourceType, {
    currentCode: options.currentCode || '',
    scope: 'validation',
    entryMode: options.entryMode || 'manual',
  });
  if (usable) {
    return usable;
  }
  const error = new Error(`validation source type invalid: ${sourceType}`);
  error.statusCode = 400;
  error.code = 'validation_source_type_invalid';
  throw error;
}

/**
 * 功能：在 validation case 表为空时从仓库配置文件导入默认样本。
 * 输入：`db` 数据库连接，`appConfigOrPath` 应用配置对象。
 * 输出：无显式返回。
 */
function seedValidationCases(db, appConfigOrPath) {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM validation_cases').get();
  if (existing && Number(existing.count || 0) > 0) {
    return;
  }
  const configPath = validationCasesConfigPath(appConfigOrPath);
  if (!configPath || !fs.existsSync(configPath)) {
    return;
  }
  const items = deserializeJson(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''), []);
  for (const item of items) {
    const normalized = normalizeValidationCaseInput(item);
    if (!normalized.text || normalized.expectedCanonicals.length === 0) {
      continue;
    }
    db.prepare(`
      INSERT INTO validation_cases(
        case_id, description, sample_text, expected_canonicals_json,
        enabled, source_type, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      normalized.caseId,
      normalized.description,
      normalized.text,
      serializeJson(normalized.expectedCanonicals),
      normalized.enabled ? 1 : 0,
      normalized.sourceType || 'seed_config',
      normalized.notes,
      nowIso(),
      nowIso(),
    );
  }
}

/**
 * 功能：在单个事务中执行数据库操作。
 * 输入：`db` 数据库连接，`fn` 事务函数。
 * 输出：事务函数的返回结果；失败时回滚并抛错。
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
 * 功能：向审计日志表追加一条操作记录。
 * 输入：`db` 数据库连接，`payload` 审计记录输入对象。
 * 输出：无显式返回。
 */
function appendAudit(db, payload) {
  const record = {
    auditId: generateId('audit'),
    requestId: payload.requestId || null,
    operator: payload.operator || 'system',
    operation: payload.operation,
    targetType: payload.targetType,
    targetId: payload.targetId,
    beforeSnapshot: payload.beforeSnapshot ?? null,
    afterSnapshot: payload.afterSnapshot ?? null,
    note: payload.note || '',
    createdAt: nowIso(),
  };
  db.prepare(`
    INSERT INTO audit_logs(
      audit_id, request_id, operator, operation, target_type, target_id,
      before_snapshot, after_snapshot, note, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.auditId,
    record.requestId,
    record.operator,
    record.operation,
    record.targetType,
    record.targetId,
    serializeJson(record.beforeSnapshot),
    serializeJson(record.afterSnapshot),
    record.note,
    record.createdAt,
  );
}

/**
 * 功能：统计当前数据库中的词条数量。
 * 输入：`db` 数据库连接。
 * 输出：词条总数。
 */
function countTerms(db) {
  return db.prepare('SELECT COUNT(*) AS count FROM terms').get().count;
}

/**
 * 功能：按类别统计当前词典中的种子词条数量。
 * 输入：`db` 数据库连接。
 * 输出：按 `categoryCode/count` 组成的数组。
 */
function countTermsByCategory(db) {
  return db.prepare(`
    SELECT category_code, COUNT(*) AS count
    FROM terms
    GROUP BY category_code
    ORDER BY category_code
  `).all().map((row) => ({
    categoryCode: row.category_code,
    count: row.count,
  }));
}

/**
 * 功能：按类别统计当前词条别名数量，可视为原型错误词库规模。
 * 输入：`db` 数据库连接。
 * 输出：按 `categoryCode/aliasCount` 组成的数组。
 */
function countAliasTermsByCategory(db) {
  return db.prepare(`
    SELECT t.category_code, COUNT(a.id) AS alias_count
    FROM terms t
    LEFT JOIN aliases a ON a.term_id = t.term_id
    GROUP BY t.category_code
    ORDER BY t.category_code
  `).all().map((row) => ({
    categoryCode: row.category_code,
    aliasCount: row.alias_count,
  }));
}

/**
 * 功能：把时间转换为小时粒度的聚合键。
 * 输入：可选 `date` 对象。
 * 输出：`YYYY-MM-DDTHH` 形式的小时键字符串。
 */
function hourKey(date = new Date()) {
  return date.toISOString().slice(0, 13);
}

/**
 * 功能：读取 runtime 节点离线阈值秒数。
 * 输入：应用配置对象。
 * 输出：正整数秒数。
 */
function runtimeNodeOfflineThresholdSeconds(appConfig = {}) {
  return Math.max(1, Number((((appConfig || {}).runtimeControl || {}).nodeOfflineThresholdSeconds) || 120));
}

/**
 * 功能：把原始 metadata 规范化为普通对象。
 * 输入：任意 metadata 值。
 * 输出：普通对象。
 */
function sanitizeRuntimeNodeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  return metadata;
}

/**
 * 功能：把 runtime_nodes 数据库行转换为业务对象，并计算在线状态。
 * 输入：数据库行和应用配置对象。
 * 输出：runtime node 业务对象。
 */
function composeRuntimeNode(row, appConfig = {}) {
  const thresholdSeconds = runtimeNodeOfflineThresholdSeconds(appConfig);
  const nowMs = Date.now();
  const heartbeatMs = row.last_heartbeat_at ? Date.parse(row.last_heartbeat_at) : Number.NaN;
  const heartbeatAgeSeconds = Number.isFinite(heartbeatMs)
    ? Math.max(0, Math.floor((nowMs - heartbeatMs) / 1000))
    : null;
  const heartbeatExpired = heartbeatAgeSeconds != null && heartbeatAgeSeconds > thresholdSeconds;
  const status = row.last_heartbeat_at
    ? (heartbeatExpired ? 'offline' : 'online')
    : String(row.status || 'unknown');

  return {
    nodeId: row.node_id,
    nodeName: row.node_name,
    env: row.env,
    address: row.address,
    runtimeVersion: row.runtime_version,
    currentVersion: row.current_version,
    desiredVersion: row.desired_version,
    status,
    statusReason: row.last_heartbeat_at ? (heartbeatExpired ? 'heartbeat_timeout' : 'heartbeat_ok') : 'not_registered',
    lastHeartbeatAt: row.last_heartbeat_at,
    lastRegisterAt: row.last_register_at,
    lastApplyAt: row.last_apply_at,
    lastApplyStatus: row.last_apply_status,
    lastError: row.last_error,
    runtimeStatsCursor: row.runtime_stats_cursor,
    metadata: deserializeJson(row.metadata_json, {}),
    heartbeatAgeSeconds,
    offlineThresholdSeconds: thresholdSeconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 功能：按 nodeId 读取单个 runtime 节点。
 * 输入：数据库连接、nodeId 和应用配置对象。
 * 输出：runtime node 对象；不存在时返回 `null`。
 */
function getRuntimeNode(db, nodeId, appConfig = {}) {
  const row = db.prepare('SELECT * FROM runtime_nodes WHERE node_id = ?').get(String(nodeId || '').trim());
  return row ? composeRuntimeNode(row, appConfig) : null;
}

/**
 * 功能：生成 runtime 节点 SQL 查询使用的状态表达式。
 * 输入：应用配置对象。
 * 输出：可内联到 SQL 中的状态表达式字符串。
 */
function runtimeNodeStatusSqlExpression(appConfig = {}) {
  const thresholdSeconds = runtimeNodeOfflineThresholdSeconds(appConfig);
  return `
    CASE
      WHEN last_heartbeat_at IS NULL THEN COALESCE(NULLIF(status, ''), 'unknown')
      WHEN (CAST(strftime('%s', 'now') AS INTEGER) - CAST(strftime('%s', last_heartbeat_at) AS INTEGER)) > ${thresholdSeconds} THEN 'offline'
      ELSE 'online'
    END
  `;
}

/**
 * 功能：列出 runtime 节点。
 * 输入：数据库连接、查询条件和应用配置对象。
 * 输出：节点列表结果。
 */
function listRuntimeNodes(db, filters = {}, appConfig = {}) {
  const limit = Math.max(1, Math.min(500, Number(filters.limit || 100)));
  const offset = Math.max(0, Number(filters.offset || 0));
  const conditions = [];
  const values = [];
  if (filters.env) {
    conditions.push('env = ?');
    values.push(String(filters.env).trim());
  }
  if (filters.status) {
    conditions.push(`${runtimeNodeStatusSqlExpression(appConfig)} = ?`);
    values.push(String(filters.status).trim());
  }
  const lastApplyStatuses = Array.isArray(filters.lastApplyStatuses)
    ? filters.lastApplyStatuses.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (lastApplyStatuses.length > 0) {
    conditions.push(`last_apply_status IN (${lastApplyStatuses.map(() => '?').join(',')})`);
    values.push(...lastApplyStatuses);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = String(filters.orderBy || 'updated_at_desc').trim();
  const orderSql = orderBy === 'last_apply_at_desc'
    ? 'ORDER BY COALESCE(last_apply_at, updated_at, created_at) DESC, node_id ASC'
    : 'ORDER BY updated_at DESC, node_id ASC';
  const rows = db.prepare(`
    SELECT *
    FROM runtime_nodes
    ${where}
    ${orderSql}
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset);
  const count = db.prepare(`
    SELECT COUNT(*) AS count
    FROM runtime_nodes
    ${where}
  `).get(...values);
  return {
    total: Number((count || {}).count || 0),
    items: rows.map((row) => composeRuntimeNode(row, appConfig)),
  };
}

/**
 * 功能：按目标版本直接汇总 runtime 节点收敛摘要。
 * 输入：数据库连接、目标版本字符串和应用配置对象。
 * 输出：节点收敛摘要对象。
 */
function summarizeRuntimeNodesForTargetVersion(db, targetVersion = '', appConfig = {}) {
  const normalizedTargetVersion = String(targetVersion || '').trim();
  const statusExpr = runtimeNodeStatusSqlExpression(appConfig);
  const base = db.prepare(`
    SELECT
      COUNT(*) AS total_nodes,
      COALESCE(SUM(CASE WHEN ${statusExpr} = 'online' THEN 1 ELSE 0 END), 0) AS online_nodes,
      COALESCE(SUM(CASE WHEN ${statusExpr} = 'offline' THEN 1 ELSE 0 END), 0) AS offline_nodes
    FROM runtime_nodes
  `).get();
  const totalNodes = Number((base || {}).total_nodes || 0);
  const onlineNodes = Number((base || {}).online_nodes || 0);
  const offlineNodes = Number((base || {}).offline_nodes || 0);
  if (!normalizedTargetVersion) {
    return {
      totalNodes,
      onlineNodes,
      offlineNodes,
      desiredNodes: 0,
      alignedNodes: 0,
      pendingNodes: 0,
      failedNodes: 0,
      untouchedNodes: totalNodes,
    };
  }
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN COALESCE(desired_version, '') = ? THEN 1 ELSE 0 END), 0) AS desired_nodes,
      COALESCE(SUM(CASE WHEN COALESCE(current_version, '') = ? THEN 1 ELSE 0 END), 0) AS aligned_nodes,
      COALESCE(SUM(CASE WHEN
        COALESCE(desired_version, '') = ?
        AND COALESCE(current_version, '') <> ?
        AND COALESCE(last_apply_status, '') NOT IN ('failed', 'rolled_back')
      THEN 1 ELSE 0 END), 0) AS pending_nodes,
      COALESCE(SUM(CASE WHEN
        COALESCE(desired_version, '') = ?
        AND COALESCE(last_apply_status, '') IN ('failed', 'rolled_back')
      THEN 1 ELSE 0 END), 0) AS failed_nodes,
      COALESCE(SUM(CASE WHEN COALESCE(desired_version, '') <> ? THEN 1 ELSE 0 END), 0) AS untouched_nodes
    FROM runtime_nodes
  `).get(
    normalizedTargetVersion,
    normalizedTargetVersion,
    normalizedTargetVersion,
    normalizedTargetVersion,
    normalizedTargetVersion,
    normalizedTargetVersion,
  );
  return {
    totalNodes,
    onlineNodes,
    offlineNodes,
    desiredNodes: Number((row || {}).desired_nodes || 0),
    alignedNodes: Number((row || {}).aligned_nodes || 0),
    pendingNodes: Number((row || {}).pending_nodes || 0),
    failedNodes: Number((row || {}).failed_nodes || 0),
    untouchedNodes: Number((row || {}).untouched_nodes || 0),
  };
}

/**
 * 功能：按 rollout 关注优先级读取目标版本的节点样本。
 * 输入：数据库连接、目标版本字符串、过滤条件和应用配置对象。
 * 输出：已按关注优先级排序的 runtime node 数组。
 */
function listRuntimeRolloutAttentionNodes(db, targetVersion = '', filters = {}, appConfig = {}) {
  const normalizedTargetVersion = String(targetVersion || '').trim();
  const limit = Math.max(1, Math.min(200, Number(filters.limit || 10)));
  const offset = Math.max(0, Number(filters.offset || 0));
  const statusExpr = runtimeNodeStatusSqlExpression(appConfig);
  const rows = db.prepare(`
    SELECT *
    FROM runtime_nodes
    ORDER BY
      CASE
        WHEN ? <> '' AND COALESCE(current_version, '') = ? AND ${statusExpr} <> 'offline' THEN 4
        WHEN ? <> '' AND COALESCE(current_version, '') = ? AND ${statusExpr} = 'offline' THEN 3
        WHEN ? <> '' AND COALESCE(desired_version, '') = ? AND COALESCE(last_apply_status, '') IN ('failed', 'rolled_back') THEN 1
        WHEN ? <> '' AND COALESCE(desired_version, '') = ? THEN 2
        ELSE 0
      END ASC,
      CASE
        WHEN COALESCE(last_apply_status, '') IN ('failed', 'rolled_back') THEN 0
        ELSE 1
      END ASC,
      COALESCE(last_apply_at, updated_at, last_heartbeat_at, created_at) DESC,
      node_id ASC
    LIMIT ? OFFSET ?
  `).all(
    normalizedTargetVersion,
    normalizedTargetVersion,
    normalizedTargetVersion,
    normalizedTargetVersion,
    normalizedTargetVersion,
    normalizedTargetVersion,
    normalizedTargetVersion,
    normalizedTargetVersion,
    limit,
    offset,
  );
  return rows.map((row) => composeRuntimeNode(row, appConfig));
}

/**
 * 功能：标准化 runtime 节点上报载荷。
 * 输入：原始请求载荷和已存在节点对象。
 * 输出：标准化后的 runtime node 输入对象。
 */
function normalizeRuntimeNodePayload(payload = {}, existing = null) {
  const nodeId = String(payload.nodeId || '').trim();
  if (!nodeId) {
    const error = new Error('nodeId is required');
    error.statusCode = 400;
    error.code = 'runtime_node_id_required';
    throw error;
  }
  return {
    nodeId,
    nodeName: payload.nodeName == null ? String((existing || {}).nodeName || nodeId) : String(payload.nodeName || '').trim() || nodeId,
    env: payload.env == null ? String((existing || {}).env || '') : String(payload.env || '').trim(),
    address: payload.address == null ? String((existing || {}).address || '') : String(payload.address || '').trim(),
    runtimeVersion: payload.runtimeVersion == null ? String((existing || {}).runtimeVersion || '') : String(payload.runtimeVersion || '').trim(),
    currentVersion: payload.currentVersion == null ? String((existing || {}).currentVersion || '') : String(payload.currentVersion || '').trim(),
    lastApplyStatus: payload.lastApplyStatus == null ? String((existing || {}).lastApplyStatus || '') : String(payload.lastApplyStatus || '').trim(),
    lastError: payload.lastError == null ? String((existing || {}).lastError || '') : String(payload.lastError || '').trim(),
    runtimeStatsCursor: payload.runtimeStatsCursor == null ? String((existing || {}).runtimeStatsCursor || '') : String(payload.runtimeStatsCursor || '').trim(),
    metadata: payload.metadata == null ? sanitizeRuntimeNodeMetadata((existing || {}).metadata) : sanitizeRuntimeNodeMetadata(payload.metadata),
  };
}

function hashRegistrationSecret(secret) {
  return crypto.createHash('sha256').update(String(secret || '')).digest('hex');
}

function fingerprintRegistrationSecret(secret) {
  const hashed = hashRegistrationSecret(secret);
  return hashed ? hashed.slice(0, 12) : '';
}

function generateRegistrationSecret() {
  return crypto.randomBytes(24).toString('base64url');
}

function composeRuntimeNodeRegistry(row) {
  return {
    nodeId: row.node_id,
    nodeName: row.node_name,
    env: row.env,
    address: row.address,
    enabled: Boolean(row.enabled),
    secretFingerprint: row.secret_fingerprint || '',
    remarks: row.remarks || '',
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRuntimeNodeRegistryPayload(payload = {}, existing = null) {
  const nodeId = String(payload.nodeId || (existing || {}).nodeId || '').trim();
  if (!nodeId) {
    const error = new Error('nodeId is required');
    error.statusCode = 400;
    error.code = 'runtime_node_registry_node_id_required';
    throw error;
  }
  const address = String(payload.address || (existing || {}).address || '').trim();
  if (!address) {
    const error = new Error('address is required');
    error.statusCode = 400;
    error.code = 'runtime_node_registry_address_required';
    throw error;
  }
  return {
    nodeId,
    nodeName: String(payload.nodeName || (existing || {}).nodeName || nodeId).trim() || nodeId,
    env: String(payload.env || (existing || {}).env || '').trim(),
    address,
    remarks: String(payload.remarks || (existing || {}).remarks || '').trim(),
  };
}

function listRuntimeNodeRegistry(db, filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.enabled === true || filters.enabled === false) {
    conditions.push('enabled = ?');
    values.push(filters.enabled ? 1 : 0);
  } else if (String(filters.enabled || '').trim() !== '') {
    conditions.push('enabled = ?');
    values.push(String(filters.enabled) === 'true' ? 1 : 0);
  }
  if (filters.env) {
    conditions.push('env = ?');
    values.push(String(filters.env || '').trim());
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.max(1, Math.min(500, Number(filters.limit || filters.pageSize || 100)));
  const offset = Math.max(0, Number(filters.offset || 0));
  const rows = db.prepare(`
    SELECT *
    FROM runtime_node_registry
    ${where}
    ORDER BY updated_at DESC, node_id ASC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset);
  const count = db.prepare(`SELECT COUNT(*) AS count FROM runtime_node_registry ${where}`).get(...values).count;
  return {
    items: rows.map(composeRuntimeNodeRegistry),
    total: Number(count || 0),
    limit,
    offset,
  };
}

function getRuntimeNodeRegistryItem(db, nodeId) {
  const row = db.prepare('SELECT * FROM runtime_node_registry WHERE node_id = ?').get(String(nodeId || '').trim());
  return row ? composeRuntimeNodeRegistry(row) : null;
}

function getRuntimeNodeRegistrySecretRecord(db, nodeId) {
  return db.prepare('SELECT * FROM runtime_node_registry WHERE node_id = ?').get(String(nodeId || '').trim()) || null;
}

function createRuntimeNodeRegistryItem(db, payload = {}, operator = 'system') {
  const input = normalizeRuntimeNodeRegistryPayload(payload);
  if (getRuntimeNodeRegistryItem(db, input.nodeId)) {
    const error = new Error(`runtime node registry already exists: ${input.nodeId}`);
    error.statusCode = 409;
    error.code = 'runtime_node_registry_exists';
    throw error;
  }
  const now = nowIso();
  const secretPlaintext = String(payload.registrationSecret || '').trim() || generateRegistrationSecret();
  db.prepare(`
    INSERT INTO runtime_node_registry(
      node_id, node_name, env, address, enabled, registration_secret_hash, secret_fingerprint,
      remarks, created_by, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.nodeId,
    input.nodeName,
    input.env,
    input.address,
    hashRegistrationSecret(secretPlaintext),
    fingerprintRegistrationSecret(secretPlaintext),
    input.remarks,
    operator,
    operator,
    now,
    now,
  );
  return {
    item: getRuntimeNodeRegistryItem(db, input.nodeId),
    secretPlaintext,
  };
}

function updateRuntimeNodeRegistryItem(db, nodeId, payload = {}, operator = 'system') {
  const existing = getRuntimeNodeRegistryItem(db, nodeId);
  if (!existing) {
    const error = new Error(`runtime node registry not found: ${nodeId}`);
    error.statusCode = 404;
    error.code = 'runtime_node_registry_not_found';
    throw error;
  }
  const input = normalizeRuntimeNodeRegistryPayload(payload, existing);
  db.prepare(`
    UPDATE runtime_node_registry
    SET node_name = ?, env = ?, address = ?, remarks = ?, updated_by = ?, updated_at = ?
    WHERE node_id = ?
  `).run(
    input.nodeName,
    input.env,
    input.address,
    input.remarks,
    operator,
    nowIso(),
    input.nodeId,
  );
  return getRuntimeNodeRegistryItem(db, input.nodeId);
}

function enableRuntimeNodeRegistryItem(db, nodeId, operator = 'system') {
  const existing = getRuntimeNodeRegistryItem(db, nodeId);
  if (!existing) {
    const error = new Error(`runtime node registry not found: ${nodeId}`);
    error.statusCode = 404;
    error.code = 'runtime_node_registry_not_found';
    throw error;
  }
  db.prepare('UPDATE runtime_node_registry SET enabled = 1, updated_by = ?, updated_at = ? WHERE node_id = ?').run(operator, nowIso(), existing.nodeId);
  return getRuntimeNodeRegistryItem(db, existing.nodeId);
}

function disableRuntimeNodeRegistryItem(db, nodeId, operator = 'system') {
  const existing = getRuntimeNodeRegistryItem(db, nodeId);
  if (!existing) {
    const error = new Error(`runtime node registry not found: ${nodeId}`);
    error.statusCode = 404;
    error.code = 'runtime_node_registry_not_found';
    throw error;
  }
  db.prepare('UPDATE runtime_node_registry SET enabled = 0, updated_by = ?, updated_at = ? WHERE node_id = ?').run(operator, nowIso(), existing.nodeId);
  return getRuntimeNodeRegistryItem(db, existing.nodeId);
}

function rotateRuntimeNodeRegistrySecret(db, nodeId, operator = 'system') {
  const existing = getRuntimeNodeRegistryItem(db, nodeId);
  if (!existing) {
    const error = new Error(`runtime node registry not found: ${nodeId}`);
    error.statusCode = 404;
    error.code = 'runtime_node_registry_not_found';
    throw error;
  }
  const secretPlaintext = generateRegistrationSecret();
  db.prepare(`
    UPDATE runtime_node_registry
    SET registration_secret_hash = ?, secret_fingerprint = ?, updated_by = ?, updated_at = ?
    WHERE node_id = ?
  `).run(
    hashRegistrationSecret(secretPlaintext),
    fingerprintRegistrationSecret(secretPlaintext),
    operator,
    nowIso(),
    existing.nodeId,
  );
  return {
    item: getRuntimeNodeRegistryItem(db, existing.nodeId),
    secretPlaintext,
  };
}

function assertRuntimeNodeRegistryAccess(db, nodeId, providedSecret, options = {}) {
  const normalizedNodeId = String(nodeId || '').trim();
  if (!normalizedNodeId) {
    const error = new Error('nodeId is required');
    error.statusCode = 400;
    error.code = 'runtime_node_registry_node_id_required';
    throw error;
  }
  const record = getRuntimeNodeRegistrySecretRecord(db, normalizedNodeId);
  if (!record) {
    const error = new Error(`runtime node is not registered in registry: ${normalizedNodeId}`);
    error.statusCode = 403;
    error.code = 'runtime_node_registry_missing';
    throw error;
  }
  if (!record.enabled) {
    const error = new Error(`runtime node registry item is disabled: ${normalizedNodeId}`);
    error.statusCode = 403;
    error.code = 'runtime_node_registry_disabled';
    throw error;
  }
  const normalizedSecret = String(providedSecret || '').trim();
  if (!normalizedSecret) {
    const error = new Error('runtime node registration secret is required');
    error.statusCode = 401;
    error.code = 'runtime_node_secret_required';
    throw error;
  }
  if (hashRegistrationSecret(normalizedSecret) !== String(record.registration_secret_hash || '')) {
    const error = new Error(`runtime node registration secret is invalid: ${normalizedNodeId}`);
    error.statusCode = 403;
    error.code = 'runtime_node_secret_invalid';
    throw error;
  }
  if (options.address != null && String(options.address || '').trim() !== String(record.address || '').trim()) {
    const error = new Error(`runtime node address does not match registry: ${normalizedNodeId}`);
    error.statusCode = 409;
    error.code = 'runtime_node_address_mismatch';
    throw error;
  }
  return composeRuntimeNodeRegistry(record);
}

/**
 * 功能：注册 runtime 节点，并记录首次/最近注册与心跳时间。
 * 输入：数据库连接、节点载荷、应用配置对象。
 * 输出：注册后的 runtime node 对象。
 */
function registerRuntimeNode(db, payload = {}, appConfig = {}) {
  const existing = getRuntimeNode(db, payload.nodeId, appConfig);
  const input = normalizeRuntimeNodePayload(payload, existing);
  const now = nowIso();

  if (existing) {
    db.prepare(`
      UPDATE runtime_nodes
      SET node_name = ?, env = ?, address = ?, runtime_version = ?, current_version = ?,
          status = 'online', last_heartbeat_at = ?, last_register_at = ?, last_error = ?,
          runtime_stats_cursor = ?, metadata_json = ?, updated_at = ?
      WHERE node_id = ?
    `).run(
      input.nodeName,
      input.env,
      input.address,
      input.runtimeVersion,
      input.currentVersion,
      now,
      now,
      input.lastError,
      input.runtimeStatsCursor,
      serializeJson(input.metadata),
      now,
      input.nodeId,
    );
  } else {
    db.prepare(`
      INSERT INTO runtime_nodes(
        node_id, node_name, env, address, runtime_version, current_version, desired_version,
        status, last_heartbeat_at, last_register_at, last_apply_at, last_apply_status,
        last_error, runtime_stats_cursor, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, '', 'online', ?, ?, NULL, ?, ?, ?, ?, ?, ?)
    `).run(
      input.nodeId,
      input.nodeName,
      input.env,
      input.address,
      input.runtimeVersion,
      input.currentVersion,
      now,
      now,
      input.lastApplyStatus,
      input.lastError,
      input.runtimeStatsCursor,
      serializeJson(input.metadata),
      now,
      now,
    );
  }

  return getRuntimeNode(db, input.nodeId, appConfig);
}

/**
 * 功能：更新 runtime 节点心跳。
 * 输入：数据库连接、节点载荷、应用配置对象。
 * 输出：心跳更新后的 runtime node 对象。
 */
function heartbeatRuntimeNode(db, payload = {}, appConfig = {}) {
  const existing = getRuntimeNode(db, payload.nodeId, appConfig);
  if (!existing) {
    const error = new Error(`runtime node not found: ${payload.nodeId || ''}`);
    error.statusCode = 404;
    error.code = 'runtime_node_not_found';
    throw error;
  }
  const input = normalizeRuntimeNodePayload(payload, existing);
  const now = nowIso();

  db.prepare(`
    UPDATE runtime_nodes
    SET node_name = ?, env = ?, address = ?, runtime_version = ?, current_version = ?,
        status = 'online', last_heartbeat_at = ?, last_apply_status = ?, last_error = ?,
        runtime_stats_cursor = ?, metadata_json = ?, updated_at = ?
    WHERE node_id = ?
  `).run(
    input.nodeName,
    input.env,
    input.address,
    input.runtimeVersion,
    input.currentVersion,
    now,
    input.lastApplyStatus,
    input.lastError,
    input.runtimeStatsCursor,
    serializeJson(input.metadata),
    now,
    input.nodeId,
  );

  return getRuntimeNode(db, input.nodeId, appConfig);
}

/**
 * 功能：把 runtime control 状态数据库行转换为业务对象。
 * 输入：数据库行对象。
 * 输出：runtime control 状态对象。
 */
function composeRuntimeControlState(row) {
  return {
    controlKey: row.control_key,
    releaseId: row.release_id,
    desiredVersion: row.desired_version,
    artifactMetadata: deserializeJson(row.artifact_metadata_json, null),
    issuedAt: row.issued_at,
    configVersion: Number(row.config_version || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 功能：读取当前全局 runtime control 状态。
 * 输入：数据库连接。
 * 输出：runtime control 状态对象；不存在时返回 `null`。
 */
function getRuntimeControlState(db) {
  const row = db.prepare('SELECT * FROM runtime_control_state WHERE control_key = ?').get('global');
  return row ? composeRuntimeControlState(row) : null;
}

/**
 * 功能：把 release 对象转成 runtime control 所需的制品元数据。
 * 输入：应用配置对象和 release 对象。
 * 输出：artifact metadata 对象。
 */
function artifactMetadataForRelease(appConfig, release, options = {}) {
  if (!release) {
    throw new Error('release is required');
  }
  return buildReleaseArtifactMetadata(appConfig, {
    releaseId: release.releaseId,
    manifestPath: release.manifestPath,
    snapshotPath: release.snapshotPath,
    packagePath: path.join(release.artifactDir, 'package.tar.gz'),
  }, options);
}

/**
 * 功能：基于当前 release 文件重新生成 runtime 可消费的制品元数据。
 * 输入：数据库连接、应用配置对象和 runtime control 状态对象。
 * 输出：刷新后的 artifact metadata；无法刷新时回退原始元数据。
 */
function refreshArtifactMetadataFromControl(db, appConfig, control = null, options = {}) {
  if (!control || !control.releaseId) {
    return control ? control.artifactMetadata : null;
  }
  const release = getRelease(db, control.releaseId);
  if (!release) {
    return control.artifactMetadata || null;
  }
  try {
    return artifactMetadataForRelease(appConfig, release, options);
  } catch {
    return control.artifactMetadata || null;
  }
}

/**
 * 功能：设置当前全局 desiredVersion 与制品元数据。
 * 输入：数据库连接、输入载荷、应用配置对象和操作人。
 * 输出：更新后的 runtime control 状态对象。
 */
function setRuntimeDesiredRelease(db, payload = {}, appConfig = {}, operator = 'system') {
  const releaseId = String(payload.releaseId || '').trim();
  if (!releaseId) {
    const error = new Error('releaseId is required');
    error.statusCode = 400;
    error.code = 'runtime_control_release_id_required';
    throw error;
  }
  const release = getRelease(db, releaseId);
  if (!release) {
    const error = new Error(`release not found: ${releaseId}`);
    error.statusCode = 404;
    error.code = 'runtime_control_release_not_found';
    throw error;
  }

  const current = getRuntimeControlState(db);
  const now = nowIso();
  const configVersion = current ? Number(current.configVersion || 0) + 1 : 1;
  const artifactMetadata = artifactMetadataForRelease(appConfig, release, {
    configVersion,
  });

  db.prepare(`
    INSERT INTO runtime_control_state(
      control_key, release_id, desired_version, artifact_metadata_json,
      issued_at, config_version, created_at, updated_at
    ) VALUES ('global', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(control_key) DO UPDATE SET
      release_id = excluded.release_id,
      desired_version = excluded.desired_version,
      artifact_metadata_json = excluded.artifact_metadata_json,
      issued_at = excluded.issued_at,
      config_version = excluded.config_version,
      updated_at = excluded.updated_at
  `).run(
    release.releaseId,
    release.version,
    serializeJson(artifactMetadata),
    now,
    configVersion,
    current ? current.createdAt : now,
    now,
  );

  db.prepare(`
    UPDATE runtime_nodes
    SET desired_version = ?, updated_at = ?
  `).run(
    release.version,
    now,
  );

  const updated = getRuntimeControlState(db);
  appendAudit(db, {
    operator,
    operation: 'runtime_control.set_desired_version',
    targetType: 'runtime_control',
    targetId: 'global',
    beforeSnapshot: current,
    afterSnapshot: updated,
    note: `releaseId=${release.releaseId}`,
  });
  return updated;
}

/**
 * 功能：读取某个节点的 runtime control 视图。
 * 输入：数据库连接、nodeId 和应用配置对象。
 * 输出：runtime control 读取结果对象。
 */
function getRuntimeControlViewForNode(db, nodeId, appConfig = {}) {
  const normalizedNodeId = String(nodeId || '').trim();
  if (!normalizedNodeId) {
    const error = new Error('nodeId is required');
    error.statusCode = 400;
    error.code = 'runtime_control_node_id_required';
    throw error;
  }
  const node = getRuntimeNode(db, normalizedNodeId, appConfig);
  if (!node) {
    const error = new Error(`runtime node not found: ${normalizedNodeId}`);
    error.statusCode = 404;
    error.code = 'runtime_control_node_not_found';
    throw error;
  }
  const control = getRuntimeControlState(db);
  const artifactMetadata = refreshArtifactMetadataFromControl(db, appConfig, control, {
    nodeId: normalizedNodeId,
    configVersion: control ? control.configVersion : 0,
  });
  const primaryArtifact = artifactMetadata && artifactMetadata.primaryArtifact ? artifactMetadata.primaryArtifact : null;

  return {
    nodeId: node.nodeId,
    currentVersion: node.currentVersion || '',
    desiredVersion: control ? control.desiredVersion : (node.desiredVersion || ''),
    artifactUrl: primaryArtifact ? String(primaryArtifact.artifactUrl || '') : '',
    checksum: primaryArtifact ? String(primaryArtifact.checksumSha256 || '') : '',
    issuedAt: control ? control.issuedAt : null,
    configVersion: control ? control.configVersion : 0,
    artifactMetadata,
  };
}

/**
 * 功能：记录 runtime 节点的 apply 结果。
 * 输入：数据库连接、nodeId、apply 结果载荷和应用配置对象。
 * 输出：更新后的 runtime node 对象。
 */
function recordRuntimeNodeApplyResult(db, nodeId, payload = {}, appConfig = {}) {
  const normalizedNodeId = String(nodeId || '').trim();
  const existing = getRuntimeNode(db, normalizedNodeId, appConfig);
  if (!existing) {
    const error = new Error(`runtime node not found: ${normalizedNodeId}`);
    error.statusCode = 404;
    error.code = 'runtime_node_not_found';
    throw error;
  }
  const status = String(payload.status || '').trim().toLowerCase();
  if (!['success', 'failed', 'rolled_back'].includes(status)) {
    const error = new Error('apply result status must be success, failed, or rolled_back');
    error.statusCode = 400;
    error.code = 'runtime_apply_status_invalid';
    throw error;
  }
  const now = nowIso();
  const currentVersion = status === 'success'
    ? String(payload.currentVersion || payload.desiredVersion || existing.currentVersion || '').trim()
    : String(existing.currentVersion || '').trim();
  const lastError = status === 'success'
    ? ''
    : String(payload.lastError || payload.error || '').trim();

  db.prepare(`
    UPDATE runtime_nodes
    SET current_version = ?, last_apply_at = ?, last_apply_status = ?, last_error = ?, updated_at = ?
    WHERE node_id = ?
  `).run(
    currentVersion,
    now,
    status,
    lastError,
    now,
    normalizedNodeId,
  );

  return getRuntimeNode(db, normalizedNodeId, appConfig);
}

/**
 * 功能：应用`hourly stats aggregate`相关逻辑。
 * 输入：`db`（数据库连接）、`payload`（业务载荷对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function applyHourlyStatsAggregate(db, payload = {}) {
  const now = nowIso();
  db.prepare(`
    INSERT INTO runtime_hourly_stats(
      hour_key, request_count, http_request_count, ws_request_count, hit_term_count, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(hour_key) DO UPDATE SET
      request_count = request_count + excluded.request_count,
      http_request_count = http_request_count + excluded.http_request_count,
      ws_request_count = ws_request_count + excluded.ws_request_count,
      hit_term_count = hit_term_count + excluded.hit_term_count,
      updated_at = excluded.updated_at
  `).run(
    payload.hourKey,
    Number(payload.requestCount || 0),
    Number(payload.httpRequestCount || 0),
    Number(payload.wsRequestCount || 0),
    Number(payload.hitTermCount || 0),
    now,
  );
}

/**
 * 功能：应用`node hourly stats aggregate`相关逻辑。
 * 输入：`db`（数据库连接）、`nodeId`（运行节点 ID）、`payload`（业务载荷对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function applyNodeHourlyStatsAggregate(db, nodeId, payload = {}) {
  const now = nowIso();
  db.prepare(`
    INSERT INTO runtime_node_hourly_stats(
      node_id, hour_key, request_count, http_request_count, ws_request_count, hit_term_count, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(node_id, hour_key) DO UPDATE SET
      request_count = request_count + excluded.request_count,
      http_request_count = http_request_count + excluded.http_request_count,
      ws_request_count = ws_request_count + excluded.ws_request_count,
      hit_term_count = hit_term_count + excluded.hit_term_count,
      updated_at = excluded.updated_at
  `).run(
    nodeId,
    payload.hourKey,
    Number(payload.requestCount || 0),
    Number(payload.httpRequestCount || 0),
    Number(payload.wsRequestCount || 0),
    Number(payload.hitTermCount || 0),
    now,
  );
}

/**
 * 功能：应用`hourly term aggregate`相关逻辑。
 * 输入：`db`（数据库连接）、`payload`（业务载荷对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function applyHourlyTermAggregate(db, payload = {}) {
  const now = nowIso();
  db.prepare(`
    INSERT INTO runtime_hourly_terms(hour_key, canonical_text, hit_count, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(hour_key, canonical_text) DO UPDATE SET
      hit_count = hit_count + excluded.hit_count,
      updated_at = excluded.updated_at
  `).run(
    payload.hourKey,
    payload.canonicalText,
    Number(payload.hitCount || 0),
    now,
  );
}

/**
 * 功能：应用`node hourly term aggregate`相关逻辑。
 * 输入：`db`（数据库连接）、`nodeId`（运行节点 ID）、`payload`（业务载荷对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function applyNodeHourlyTermAggregate(db, nodeId, payload = {}) {
  const now = nowIso();
  db.prepare(`
    INSERT INTO runtime_node_hourly_terms(node_id, hour_key, canonical_text, hit_count, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(node_id, hour_key, canonical_text) DO UPDATE SET
      hit_count = hit_count + excluded.hit_count,
      updated_at = excluded.updated_at
  `).run(
    nodeId,
    payload.hourKey,
    payload.canonicalText,
    Number(payload.hitCount || 0),
    now,
  );
}

/**
 * 功能：应用`node peak aggregate`相关逻辑。
 * 输入：`db`（数据库连接）、`nodeId`（运行节点 ID）、`payload`（业务载荷对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function applyNodePeakAggregate(db, nodeId, payload = {}) {
  const now = nowIso();
  const current = db.prepare('SELECT peak_concurrency FROM runtime_node_peak_stats WHERE node_id = ?').get(nodeId);
  const existingPeak = Number(current && current.peak_concurrency ? current.peak_concurrency : 0);
  const nextPeak = Number(payload.peakConcurrency || 0);
  if (nextPeak > existingPeak) {
    db.prepare(`
      INSERT INTO runtime_node_peak_stats(node_id, peak_concurrency, peak_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(node_id) DO UPDATE SET
        peak_concurrency = excluded.peak_concurrency,
        peak_at = excluded.peak_at,
        updated_at = excluded.updated_at
    `).run(nodeId, nextPeak, payload.peakAt || now, now);
  }
  recordRuntimePeak(db, nextPeak);
}

/**
 * 功能：上传`runtime node stats`相关逻辑。
 * 输入：`db`（数据库连接）、`nodeId`（运行节点 ID）、`payload`（业务载荷对象）、`appConfig`（应用配置对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function uploadRuntimeNodeStats(db, nodeId, payload = {}, appConfig = {}) {
  const normalizedNodeId = String(nodeId || '').trim();
  const existing = getRuntimeNode(db, normalizedNodeId, appConfig);
  if (!existing) {
    const error = new Error(`runtime node not found: ${normalizedNodeId}`);
    error.statusCode = 404;
    error.code = 'runtime_node_not_found';
    throw error;
  }
  const batchId = String(payload.batchId || '').trim();
  if (!batchId) {
    const error = new Error('batchId is required');
    error.statusCode = 400;
    error.code = 'runtime_stats_batch_id_required';
    throw error;
  }
  const records = Array.isArray(payload.records) ? payload.records : [];
  let insertedCount = 0;
  let duplicateCount = 0;
  for (const record of records) {
    const sequence = Number(record.sequence || 0);
    const recordType = String(record.type || '').trim();
    if (!sequence || !recordType) {
      continue;
    }
    const insert = db.prepare(`
      INSERT OR IGNORE INTO runtime_node_stat_upload_records(
        node_id, batch_id, sequence, record_type, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      normalizedNodeId,
      batchId,
      sequence,
      recordType,
      serializeJson(record.payload || {}),
      nowIso(),
    );
    if (Number(insert.changes || 0) === 0) {
      duplicateCount += 1;
      continue;
    }
    insertedCount += 1;
    if (recordType === 'hourly_stats') {
      applyHourlyStatsAggregate(db, record.payload || {});
      applyNodeHourlyStatsAggregate(db, normalizedNodeId, record.payload || {});
    } else if (recordType === 'hourly_terms') {
      applyHourlyTermAggregate(db, record.payload || {});
      applyNodeHourlyTermAggregate(db, normalizedNodeId, record.payload || {});
    } else if (recordType === 'peak') {
      applyNodePeakAggregate(db, normalizedNodeId, record.payload || {});
    }
  }
  const now = nowIso();
  db.prepare(`
    UPDATE runtime_nodes
    SET runtime_stats_cursor = ?, updated_at = ?
    WHERE node_id = ?
  `).run(
    String(payload.toEventId == null ? existing.runtimeStatsCursor || '' : payload.toEventId),
    now,
    normalizedNodeId,
  );
  return {
    ok: true,
    nodeId: normalizedNodeId,
    batchId,
    insertedCount,
    duplicateCount,
    toEventId: payload.toEventId == null ? null : Number(payload.toEventId),
  };
}

/**
 * 功能：记录一次运行时纠错的聚合统计。
 * 输入：数据库连接和统计输入对象。
 * 输出：无显式返回。
 */
function recordRuntimeCorrection(db, payload = {}) {
  const key = hourKey(payload.now || new Date());
  const channel = String(payload.channel || 'http');
  const hits = []
    .concat(payload.result && payload.result.matches ? payload.result.matches : [])
    .concat(payload.result && payload.result.candidates ? payload.result.candidates : [])
    .concat(payload.result && payload.result.blocked ? payload.result.blocked : []);

  db.prepare(`
    INSERT INTO runtime_hourly_stats(
      hour_key, request_count, http_request_count, ws_request_count, hit_term_count, updated_at
    ) VALUES (?, 1, ?, ?, ?, ?)
    ON CONFLICT(hour_key) DO UPDATE SET
      request_count = request_count + 1,
      http_request_count = http_request_count + excluded.http_request_count,
      ws_request_count = ws_request_count + excluded.ws_request_count,
      hit_term_count = hit_term_count + excluded.hit_term_count,
      updated_at = excluded.updated_at
  `).run(
    key,
    channel === 'ws' ? 0 : 1,
    channel === 'ws' ? 1 : 0,
    hits.length,
    nowIso(),
  );

  const termStmt = db.prepare(`
    INSERT INTO runtime_hourly_terms(hour_key, canonical_text, hit_count, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(hour_key, canonical_text) DO UPDATE SET
      hit_count = hit_count + 1,
      updated_at = excluded.updated_at
  `);
  for (const hit of hits) {
    if (hit && hit.canonical) {
      termStmt.run(key, String(hit.canonical), nowIso());
    }
  }
}

/**
 * 功能：在并发峰值被刷新时记录全局最高并发。
 * 输入：数据库连接和当前并发值。
 * 输出：无显式返回。
 */
function recordRuntimePeak(db, concurrency) {
  const current = db.prepare('SELECT peak_concurrency FROM runtime_peak_stats WHERE stat_key = ?').get('global');
  const peak = Number(current && current.peak_concurrency ? current.peak_concurrency : 0);
  if (Number(concurrency || 0) <= peak) {
    return;
  }
  db.prepare(`
    INSERT INTO runtime_peak_stats(stat_key, peak_concurrency, peak_at, updated_at)
    VALUES ('global', ?, ?, ?)
    ON CONFLICT(stat_key) DO UPDATE SET
      peak_concurrency = excluded.peak_concurrency,
      peak_at = excluded.peak_at,
      updated_at = excluded.updated_at
  `).run(Number(concurrency || 0), nowIso(), nowIso());
}

/**
 * 功能：读取按小时汇总的运行时调用统计。
 * 输入：数据库连接，可选 `hours` 小时窗口。
 * 输出：小时聚合数组。
 */
function listRuntimeHourlyStats(db, hours = 24) {
  const limit = Math.max(1, Math.min(168, Number(hours || 24)));
  return db.prepare(`
    SELECT * FROM runtime_hourly_stats
    ORDER BY hour_key DESC
    LIMIT ?
  `).all(limit).reverse().map((row) => ({
    hourKey: row.hour_key,
    requestCount: row.request_count,
    httpRequestCount: row.http_request_count,
    wsRequestCount: row.ws_request_count,
    hitTermCount: row.hit_term_count,
    updatedAt: row.updated_at,
  }));
}

/**
 * 功能：读取最近一个小时的 TOP 命中词条。
 * 输入：数据库连接，可选 `limit`。
 * 输出：按命中次数排序的词条数组。
 */
function listTopRuntimeHitTerms(db, limit = 10) {
  const currentHour = db.prepare('SELECT hour_key FROM runtime_hourly_stats ORDER BY hour_key DESC LIMIT 1').get();
  if (!currentHour) {
    return [];
  }
  return db.prepare(`
    SELECT canonical_text, hit_count
    FROM runtime_hourly_terms
    WHERE hour_key = ?
    ORDER BY hit_count DESC, canonical_text ASC
    LIMIT ?
  `).all(currentHour.hour_key, Math.max(1, Math.min(50, Number(limit || 10)))).map((row) => ({
    canonicalText: row.canonical_text,
    hitCount: row.hit_count,
    hourKey: currentHour.hour_key,
  }));
}

/**
 * 功能：读取全局历史最高并发摘要。
 * 输入：数据库连接。
 * 输出：峰值并发对象。
 */
function getRuntimePeakStat(db) {
  const row = db.prepare('SELECT * FROM runtime_peak_stats WHERE stat_key = ?').get('global');
  return row ? {
    peakConcurrency: row.peak_concurrency,
    peakAt: row.peak_at,
    updatedAt: row.updated_at,
  } : {
    peakConcurrency: 0,
    peakAt: null,
    updatedAt: null,
  };
}

/**
 * 功能：汇总后台数据画板所需的词典规模与运行统计。
 * 输入：数据库连接。
 * 输出：dashboard 摘要对象。
 */
function getDashboardSummary(db) {
  return {
    dictionary: {
      totalSeedTerms: countTerms(db),
      byCategory: countTermsByCategory(db),
      aliasByCategory: countAliasTermsByCategory(db),
    },
    runtime: {
      hourly: listRuntimeHourlyStats(db, 24),
      topHitTerms: listTopRuntimeHitTerms(db, 10),
      peak: getRuntimePeakStat(db),
    },
  };
}

/**
 * 功能：把导入批次数据库行转换为业务对象。
 * 输入：`row` 数据库行对象。
 * 输出：导入批次对象。
 */
function composeImportJob(row) {
  return {
    jobId: row.job_id,
    importJobId: row.job_id,
    jobType: row.job_type,
    sourceType: row.source_type,
    sourceTypeCode: row.source_type,
    sourceMode: 'import',
    templateCode: row.template_code,
    templateVersion: row.template_version,
    status: row.status,
    summary: row.summary,
    submittedBy: row.submitted_by,
    confirmedBy: row.confirmed_by,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    finishedAt: row.finished_at,
  };
}

/**
 * 功能：把导入文件数据库行转换为业务对象。
 * 输入：`row` 数据库行对象。
 * 输出：导入文件对象。
 */
function composeImportJobFile(row) {
  return {
    fileId: row.file_id,
    jobId: row.job_id,
    fileRole: row.file_role,
    originalName: row.original_name,
    storedPath: row.stored_path,
    contentType: row.content_type,
    fileSize: row.file_size,
    checksum: row.checksum,
    uploadedAt: row.uploaded_at,
  };
}

/**
 * 功能：把导入行数据库行转换为业务对象。
 * 输入：`row` 数据库行对象。
 * 输出：导入行对象。
 */
function composeImportJobRow(row) {
  const issues = deserializeJson(row.issues_json, []);
  const blockedCount = issues.filter((item) => item && item.level === 'blocked').length;
  const warningCount = issues.filter((item) => item && item.level === 'warning').length;
  return {
    rowId: row.row_id,
    jobId: row.job_id,
    importJobId: row.job_id,
    rowNo: row.row_no,
    rawPayload: deserializeJson(row.raw_payload_json, {}),
    normalizedPayload: deserializeJson(row.normalized_payload_json, {}),
    issues,
    targetTermKey: row.target_term_key,
    status: row.status,
    admissionLevel: blockedCount > 0 ? 'blocked' : (warningCount > 0 ? 'warning' : 'ready'),
    decision: row.decision,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 功能：把导入结果数据库行转换为业务对象。
 * 输入：`row` 数据库行对象。
 * 输出：导入结果对象。
 */
function composeImportJobResult(row) {
  return {
    resultId: row.result_id,
    jobId: row.job_id,
    newTermCount: row.new_term_count,
    updatedTermCount: row.updated_term_count,
    newAliasCount: row.new_alias_count,
    updatedAliasCount: row.updated_alias_count,
    skippedCount: row.skipped_count,
    errorCount: row.error_count,
    importedBy: row.imported_by,
    importedAt: row.imported_at,
  };
}

/**
 * 功能：按条件列出导入批次。
 * 输入：数据库连接和过滤条件。
 * 输出：分页结果对象。
 */
function listImportJobs(db, filters = {}) {
  const { where, values } = buildImportJobWhere(filters);
  const limit = Math.max(1, Math.min(200, Number(filters.limit || filters.pageSize || 20)));
  const offset = Math.max(0, Number(filters.offset || 0));
  const rows = db.prepare(`
    SELECT * FROM import_jobs
    ${where}
    ORDER BY created_at DESC, job_id DESC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset);
  const count = db.prepare(`SELECT COUNT(*) AS count FROM import_jobs ${where}`).get(...values).count;
  return {
    items: rows.map(composeImportJob),
    total: count,
    limit,
    offset,
  };
}

/**
 * 功能：构造导入批次查询的条件片段和值数组。
 * 输入：导入批次过滤条件对象。
 * 输出：包含 `where` 与 `values` 的查询描述对象。
 */
function buildImportJobWhere(filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.status) {
    conditions.push('status = ?');
    values.push(String(filters.status).trim());
  }
  if (filters.jobType) {
    conditions.push('job_type = ?');
    values.push(String(filters.jobType).trim());
  }
  if (filters.sourceType) {
    conditions.push('source_type = ?');
    values.push(String(filters.sourceType).trim());
  }
  if (filters.submittedBy) {
    conditions.push('submitted_by = ?');
    values.push(String(filters.submittedBy).trim());
  }
  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

/**
 * 功能：汇总导入批次在当前过滤条件下的状态分布。
 * 输入：数据库连接和导入批次过滤条件对象。
 * 输出：导入批次摘要对象。
 */
function summarizeImportJobs(db, filters = {}) {
  const { where, values } = buildImportJobWhere(filters);
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN status = 'preview_ready' THEN 1 ELSE 0 END) AS preview_ready_count,
      SUM(CASE WHEN status = 'imported' THEN 1 ELSE 0 END) AS imported_count,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
    FROM import_jobs
    ${where}
  `).get(...values) || {};
  return {
    totalCount: Number(row.total_count || 0),
    previewReadyCount: Number(row.preview_ready_count || 0),
    importedCount: Number(row.imported_count || 0),
    cancelledCount: Number(row.cancelled_count || 0),
  };
}

/**
 * 功能：读取单个导入批次。
 * 输入：数据库连接、jobId。
 * 输出：导入批次对象或 `null`。
 */
function getImportJob(db, jobId) {
  const row = db.prepare('SELECT * FROM import_jobs WHERE job_id = ?').get(jobId);
  return row ? composeImportJob(row) : null;
}

/**
 * 功能：读取导入批次关联文件。
 * 输入：数据库连接、jobId。
 * 输出：导入文件数组。
 */
function listImportJobFiles(db, jobId) {
  return db.prepare(`
    SELECT * FROM import_job_files
    WHERE job_id = ?
    ORDER BY uploaded_at ASC, file_id ASC
  `).all(jobId).map(composeImportJobFile);
}

/**
 * 功能：读取导入批次结果。
 * 输入：数据库连接、jobId。
 * 输出：导入结果对象或 `null`。
 */
function getImportJobResult(db, jobId) {
  const row = db.prepare('SELECT * FROM import_job_results WHERE job_id = ?').get(jobId);
  return row ? composeImportJobResult(row) : null;
}

/**
 * 功能：按条件列出导入批次行。
 * 输入：数据库连接、jobId、过滤条件。
 * 输出：分页结果对象。
 */
function listImportJobRows(db, jobId, filters = {}) {
  const conditions = ['job_id = ?'];
  const values = [jobId];
  if (filters.status) {
    conditions.push('status = ?');
    values.push(String(filters.status).trim());
  }
  if (filters.decision) {
    conditions.push('decision = ?');
    values.push(String(filters.decision).trim());
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.max(1, Math.min(500, Number(filters.limit || filters.pageSize || 100)));
  const offset = Math.max(0, Number(filters.offset || 0));
  const rows = db.prepare(`
    SELECT * FROM import_job_rows
    ${where}
    ORDER BY row_no ASC, row_id ASC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset);
  const count = db.prepare(`SELECT COUNT(*) AS count FROM import_job_rows ${where}`).get(...values).count;
  return {
    items: rows.map(composeImportJobRow),
    total: count,
    limit,
    offset,
  };
}

/**
 * 功能：按类别编码和标准词读取词条摘要，用于准入冲突判断。
 * 输入：数据库连接、类别编码、标准词、可选过滤条件。
 * 输出：词条摘要或 `null`。
 */
function findTermByCategoryAndCanonical(db, categoryCode, canonicalText, options = {}) {
  const normalizedCategoryCode = String(categoryCode || '').trim();
  const normalizedCanonical = String(canonicalText || '').trim();
  if (!normalizedCategoryCode || !normalizedCanonical) {
    return null;
  }
  const excludeTermId = String(options.excludeTermId || '').trim();
  const row = db.prepare(`
    SELECT term_id, category_code, canonical_text, status, source_type
    FROM terms
    WHERE category_code = ?
      AND canonical_text = ?
      AND (? = '' OR term_id <> ?)
    ORDER BY updated_at DESC, term_id DESC
    LIMIT 1
  `).get(normalizedCategoryCode, normalizedCanonical, excludeTermId, excludeTermId);
  return row ? {
    termId: row.term_id,
    categoryCode: row.category_code,
    canonicalText: row.canonical_text,
    status: row.status,
    sourceType: row.source_type,
  } : null;
}

/**
 * 功能：按别名文本读取冲突词条及来源，用于准入 trace。
 * 输入：数据库连接、别名文本、可选过滤条件。
 * 输出：冲突词条数组。
 */
function findTermsByAliasText(db, aliasText, options = {}) {
  const normalizedAlias = String(aliasText || '').trim();
  if (!normalizedAlias) {
    return [];
  }
  const excludeTermId = String(options.excludeTermId || '').trim();
  return db.prepare(`
    SELECT
      t.term_id,
      t.category_code,
      t.canonical_text,
      t.status,
      t.source_type,
      a.alias_text,
      src.import_job_id,
      src.source_file_name,
      src.source_row_no,
      src.source_type AS alias_source_type
    FROM aliases a
    JOIN terms t ON t.term_id = a.term_id
    LEFT JOIN alias_sources src
      ON src.term_id = a.term_id
      AND src.alias_text = a.alias_text
    WHERE a.alias_text = ?
      AND (? = '' OR t.term_id <> ?)
    ORDER BY t.updated_at DESC, t.term_id DESC
  `).all(normalizedAlias, excludeTermId, excludeTermId).map((row) => ({
    termId: row.term_id,
    categoryCode: row.category_code,
    canonicalText: row.canonical_text,
    status: row.status,
    sourceType: row.alias_source_type || row.source_type,
    aliasText: row.alias_text,
    importJobId: row.import_job_id,
    sourceFileName: row.source_file_name,
    sourceRowNo: row.source_row_no,
  }));
}

/**
 * 功能：按标准词文本读取冲突词条，用于 alias 警示。
 * 输入：数据库连接、标准词文本、可选过滤条件。
 * 输出：词条摘要数组。
 */
function findTermsByCanonicalText(db, canonicalText, options = {}) {
  const normalizedCanonical = String(canonicalText || '').trim();
  if (!normalizedCanonical) {
    return [];
  }
  const excludeTermId = String(options.excludeTermId || '').trim();
  return db.prepare(`
    SELECT term_id, category_code, canonical_text, status, source_type
    FROM terms
    WHERE canonical_text = ?
      AND (? = '' OR term_id <> ?)
    ORDER BY updated_at DESC, term_id DESC
  `).all(normalizedCanonical, excludeTermId, excludeTermId).map((row) => ({
    termId: row.term_id,
    categoryCode: row.category_code,
    canonicalText: row.canonical_text,
    status: row.status,
    sourceType: row.source_type,
  }));
}

/**
 * 功能：批量加载词条别名映射。
 * 输入：`db` 数据库连接，`termIds` 词条 ID 数组。
 * 输出：`termId -> aliases[]` 的 Map。
 */
function aliasMapForTermIds(db, termIds) {
  if (!termIds.length) {
    return new Map();
  }
  const placeholders = termIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT term_id, alias_text FROM aliases WHERE term_id IN (${placeholders}) ORDER BY alias_text`).all(...termIds);
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.term_id)) {
      map.set(row.term_id, []);
    }
    map.get(row.term_id).push(row.alias_text);
  }
  return map;
}

/**
 * 功能：批量加载词条规则映射。
 * 输入：`db` 数据库连接，`termIds` 词条 ID 数组。
 * 输出：`termId -> rules` 的 Map。
 */
function ruleMapForTermIds(db, termIds) {
  if (!termIds.length) {
    return new Map();
  }
  const placeholders = termIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM term_rules WHERE term_id IN (${placeholders})`).all(...termIds);
  const map = new Map();
  for (const row of rows) {
    map.set(row.term_id, {
      candidateOnly: Boolean(row.candidate_only),
      minTextLen: row.min_text_len,
      maxTextLen: row.max_text_len,
      boundaryPolicy: row.boundary_policy || 'none',
      leftContextAllow: deserializeArray(row.left_context_allow),
      rightContextAllow: deserializeArray(row.right_context_allow),
      leftContextBlock: deserializeArray(row.left_context_block),
      rightContextBlock: deserializeArray(row.right_context_block),
      regexAllow: deserializeArray(row.regex_allow),
      regexBlock: deserializeArray(row.regex_block),
    });
  }
  return map;
}

/**
 * 功能：读取单个词条的规则，若无存储记录则返回默认规则。
 * 输入：`db` 数据库连接，`termId` 词条 ID。
 * 输出：规则对象。
 */
function getTermRules(db, termId) {
  return ruleMapForTermIds(db, [termId]).get(termId) || sanitizeRules({});
}

/**
 * 功能：批量加载词条拼音画像映射。
 * 输入：`db` 数据库连接，`termIds` 词条 ID 数组。
 * 输出：`termId -> pinyinProfile` 的 Map。
 */
function pinyinProfileMapForTermIds(db, termIds) {
  if (!termIds.length) {
    return new Map();
  }
  const placeholders = termIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM pinyin_profiles WHERE term_id IN (${placeholders})`).all(...termIds);
  const map = new Map();
  for (const row of rows) {
    map.set(row.term_id, composeStoredPinyinProfile(row));
  }
  return map;
}

/**
 * 功能：把数据库中的拼音画像行对象转换为业务对象。
 * 输入：`row` 数据库行对象。
 * 输出：标准化后的拼音画像对象。
 */
function composeStoredPinyinProfile(row) {
  return {
    fullPinyinNoTone: row.full_pinyin_no_tone,
    initials: row.initials,
    syllables: deserializeJson(row.syllables_json, []),
    runtimeMode: row.runtime_mode,
    polyphoneMode: row.polyphone_mode,
    customFullPinyinNoTone: row.custom_full_pinyin_no_tone,
    alternativeReadings: deserializeJson(row.alternative_readings_json, []),
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

/**
 * 功能：把词条和可选拼音画像行组合成统一的拼音画像记录。
 * 输入：`row` 词条/拼音画像联合查询结果。
 * 输出：标准化后的拼音画像记录对象。
 */
function composePinyinProfileRecord(row) {
  const stored = row.full_pinyin_no_tone == null
    ? buildPinyinProfile(row.canonical_text || '', { runtimeMode: row.pinyin_runtime_mode || 'candidate' })
    : composeStoredPinyinProfile(row);
  return {
    termId: row.term_id,
    categoryCode: row.category_code,
    canonicalText: row.canonical_text,
    hasStoredProfile: row.full_pinyin_no_tone != null,
    fullPinyinNoTone: stored.fullPinyinNoTone,
    initials: stored.initials,
    syllables: stored.syllables,
    runtimeMode: stored.runtimeMode,
    polyphoneMode: stored.polyphoneMode,
    customFullPinyinNoTone: stored.customFullPinyinNoTone,
    alternativeReadings: stored.alternativeReadings,
    notes: stored.notes,
    updatedAt: row.updated_at || stored.updatedAt,
  };
}

/**
 * 功能：标准化首字母冲突键。
 * 输入：`value` 原始首字母字符串。
 * 输出：小写且去空白后的首字母键。
 */
function normalizeInitialsKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * 功能：获取某个词条当前生效的拼音画像。
 * 输入：`db` 数据库连接，`termId` 词条 ID，可选 `canonicalText`。
 * 输出：拼音画像对象。
 */
function getTermPinyinProfile(db, termId, canonicalText = '') {
  const stored = pinyinProfileMapForTermIds(db, [termId]).get(termId);
  if (stored) {
    return stored;
  }
  if (!canonicalText) {
    const term = getTerm(db, termId);
    canonicalText = term ? term.canonicalText : '';
  }
  return buildPinyinProfile(canonicalText || '');
}

/**
 * 功能：创建或更新词条拼音画像，并写审计日志。
 * 输入：数据库连接、词条 ID、标准词文本、画像输入、操作人。
 * 输出：更新后的拼音画像对象。
 */
function upsertTermPinyinProfile(db, termId, canonicalText, profile, operator = 'system') {
  const before = getTermPinyinProfile(db, termId, canonicalText);
  const next = buildPinyinProfile(canonicalText, profile);
  db.prepare(`
    INSERT INTO pinyin_profiles(
      term_id, full_pinyin_no_tone, initials, syllables_json,
      runtime_mode, polyphone_mode, custom_full_pinyin_no_tone,
      alternative_readings_json, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(term_id) DO UPDATE SET
      full_pinyin_no_tone = excluded.full_pinyin_no_tone,
      initials = excluded.initials,
      syllables_json = excluded.syllables_json,
      runtime_mode = excluded.runtime_mode,
      polyphone_mode = excluded.polyphone_mode,
      custom_full_pinyin_no_tone = excluded.custom_full_pinyin_no_tone,
      alternative_readings_json = excluded.alternative_readings_json,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(
    termId,
    next.fullPinyinNoTone,
    next.initials,
    serializeJson(next.syllables),
    next.runtimeMode,
    next.polyphoneMode,
    next.customFullPinyinNoTone,
    serializeJson(next.alternativeReadings),
    next.notes,
    nowIso(),
  );
  appendAudit(db, {
    operator,
    operation: 'term.pinyin.update',
    targetType: 'term',
    targetId: termId,
    beforeSnapshot: before,
    afterSnapshot: next,
  });
  return getTermPinyinProfile(db, termId, canonicalText);
}

/**
 * 功能：分页列出当前已存储的拼音画像。
 * 输入：`db` 数据库连接，`filters` 查询参数。
 * 输出：拼音画像记录数组。
 */
function listPinyinProfiles(db, filters = {}) {
  const rows = db.prepare(`
    SELECT t.term_id, t.category_code, t.canonical_text, p.*
    FROM pinyin_profiles p
    JOIN terms t ON t.term_id = p.term_id
    ORDER BY p.updated_at DESC
    LIMIT ?
  `).all(Math.max(1, Math.min(200, Number(filters.limit || 50))));
  return rows.map(composePinyinProfileRecord);
}

/**
 * 功能：计算词条当前生效的拼音画像记录集合。
 * 输入：`db` 数据库连接，`filters` 过滤条件。
 * 输出：词条级生效拼音画像记录数组。
 */
function effectivePinyinProfileRecords(db, filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.categoryCode) {
    conditions.push('t.category_code = ?');
    values.push(filters.categoryCode);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT
      t.term_id,
      t.category_code,
      t.canonical_text,
      t.pinyin_runtime_mode,
      p.full_pinyin_no_tone,
      p.initials,
      p.syllables_json,
      p.runtime_mode,
      p.polyphone_mode,
      p.custom_full_pinyin_no_tone,
      p.alternative_readings_json,
      p.notes,
      COALESCE(p.updated_at, t.updated_at) AS updated_at
    FROM terms t
    LEFT JOIN pinyin_profiles p ON p.term_id = t.term_id
    ${where}
    ORDER BY COALESCE(p.updated_at, t.updated_at) DESC, t.term_id DESC
  `).all(...values);
  return rows.map(composePinyinProfileRecord);
}

/**
 * 功能：标准化备用读音列表并按字典序排序。
 * 输入：`items` 读音数组。
 * 输出：标准化后的读音数组。
 */
function normalizedPinyinReadingList(items) {
  return Array.from(new Set((items || []).map((item) => joinPinyin(item)).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, 'en'));
}

/**
 * 功能：比较两个字符串数组是否逐项完全一致。
 * 输入：`left/right` 两个字符串数组。
 * 输出：布尔值。
 */
function equalStringArrays(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

/**
 * 功能：生成词条级拼音画像的字位差异列表。
 * 输入：标准词文本、默认音节数组、当前音节数组。
 * 输出：逐字位 comparison 数组。
 */
function comparePinyinChars(canonicalText, defaultSyllables, currentSyllables) {
  const chars = Array.from(String(canonicalText || ''));
  const maxLength = Math.max(chars.length, defaultSyllables.length, currentSyllables.length);
  const items = [];

  for (let index = 0; index < maxLength; index += 1) {
    const char = chars[index] || '';
    const defaultSyllable = String(defaultSyllables[index] || '').trim();
    const currentSyllable = String(currentSyllables[index] || '').trim();
    const changed = defaultSyllable !== currentSyllable;
    items.push({
      index,
      char,
      defaultSyllable,
      currentSyllable,
      changed,
      reason: changed ? 'syllable_changed' : 'same',
    });
  }

  return items;
}

/**
 * 功能：比较词条默认拼音画像与当前画像的差异。
 * 输入：`record` 生效拼音画像记录。
 * 输出：包含字段差异、字位差异和状态的 comparison 对象。
 */
function comparePinyinProfileRecord(record) {
  const defaultProfile = buildPinyinProfile(record.canonicalText || '');
  const currentSyllables = (record.syllables || []).map((item) => String(item || '').trim()).filter(Boolean);
  const defaultSyllables = (defaultProfile.syllables || []).map((item) => String(item || '').trim()).filter(Boolean);
  const currentAlternativeReadings = normalizedPinyinReadingList(record.alternativeReadings);
  const defaultAlternativeReadings = normalizedPinyinReadingList(defaultProfile.alternativeReadings);
  const differences = [];
  const currentFullPinyinNoTone = joinPinyin(record.fullPinyinNoTone);
  const currentCustomFullPinyinNoTone = joinPinyin(record.customFullPinyinNoTone);
  const defaultFullPinyinNoTone = joinPinyin(defaultProfile.fullPinyinNoTone);
  const currentInitials = String(record.initials || '').trim();
  const defaultInitials = String(defaultProfile.initials || '').trim();
  const fullPinyinNoToneChanged = currentFullPinyinNoTone !== defaultFullPinyinNoTone;
  const initialsChanged = currentInitials !== defaultInitials;
  const syllablesChanged = !equalStringArrays(currentSyllables, defaultSyllables);
  const alternativeReadingsChanged = !equalStringArrays(currentAlternativeReadings, defaultAlternativeReadings);
  const polyphoneModeChanged = String(record.polyphoneMode || 'default') !== String(defaultProfile.polyphoneMode || 'default');
  const charComparisons = comparePinyinChars(record.canonicalText, defaultSyllables, currentSyllables);
  const changedCharCount = charComparisons.filter((item) => item.changed).length;

  if (fullPinyinNoToneChanged) {
    differences.push({ field: 'fullPinyinNoTone', defaultValue: defaultFullPinyinNoTone, currentValue: currentFullPinyinNoTone });
  }
  if (initialsChanged) {
    differences.push({ field: 'initials', defaultValue: defaultInitials, currentValue: currentInitials });
  }
  if (syllablesChanged) {
    differences.push({ field: 'syllables', defaultValue: defaultSyllables.join(' '), currentValue: currentSyllables.join(' ') });
  }
  if (alternativeReadingsChanged) {
    differences.push({ field: 'alternativeReadings', defaultValue: defaultAlternativeReadings.join(' | '), currentValue: currentAlternativeReadings.join(' | ') });
  }
  if (polyphoneModeChanged) {
    differences.push({ field: 'polyphoneMode', defaultValue: String(defaultProfile.polyphoneMode || 'default'), currentValue: String(record.polyphoneMode || 'default') });
  }

  const hasCustomFullPinyin = Boolean(currentCustomFullPinyinNoTone);
  const hasAlternativeReadings = currentAlternativeReadings.length > 0;
  let status = 'default_generated';
  if (differences.length > 0) {
    status = 'changed';
  } else if (record.hasStoredProfile || hasCustomFullPinyin || hasAlternativeReadings) {
    status = 'aligned_override';
  }

  return {
    termId: record.termId,
    categoryCode: record.categoryCode,
    canonicalText: record.canonicalText,
    hasStoredProfile: Boolean(record.hasStoredProfile),
    status,
    differenceCount: differences.length,
    changedCharCount,
    differenceFields: differences.map((item) => item.field),
    differences,
    charComparisons,
    flags: {
      hasCustomFullPinyin,
      hasAlternativeReadings,
      fullPinyinNoToneChanged,
      initialsChanged,
      syllablesChanged,
      alternativeReadingsChanged,
      polyphoneModeChanged,
    },
    defaultProfile: {
      fullPinyinNoTone: defaultFullPinyinNoTone,
      initials: defaultInitials,
      syllables: defaultSyllables,
      alternativeReadings: defaultAlternativeReadings,
      polyphoneMode: String(defaultProfile.polyphoneMode || 'default'),
    },
    currentProfile: {
      fullPinyinNoTone: currentFullPinyinNoTone,
      initials: currentInitials,
      syllables: currentSyllables,
      customFullPinyinNoTone: currentCustomFullPinyinNoTone,
      alternativeReadings: currentAlternativeReadings,
      runtimeMode: String(record.runtimeMode || 'candidate'),
      polyphoneMode: String(record.polyphoneMode || 'default'),
      notes: String(record.notes || ''),
    },
    updatedAt: record.updatedAt,
  };
}

/**
 * 功能：按条件列出拼音画像 comparison 摘要。
 * 输入：数据库连接，`filters` 查询条件。
 * 输出：包含 comparison 列表和统计信息的对象。
 */
function listPinyinComparisons(db, filters = {}) {
  const limit = Math.max(1, Math.min(200, Number(filters.limit || 50)));
  const onlyChanged = filters.onlyChanged == null || filters.onlyChanged === ''
    ? true
    : !['0', 'false', 'no'].includes(String(filters.onlyChanged).trim().toLowerCase());
  const comparisons = effectivePinyinProfileRecords(db, {
    categoryCode: filters.categoryCode,
  }).map(comparePinyinProfileRecord);
  const filtered = comparisons.filter((item) => {
    if (filters.termId && item.termId !== filters.termId) {
      return false;
    }
    if (filters.query && !item.canonicalText.includes(filters.query)) {
      return false;
    }
    return onlyChanged ? item.differenceCount > 0 : true;
  });
  filtered.sort((left, right) => {
    if (left.differenceCount !== right.differenceCount) {
      return right.differenceCount - left.differenceCount;
    }
    if (left.status !== right.status) {
      return left.status === 'changed' ? -1 : 1;
    }
    if (left.updatedAt !== right.updatedAt) {
      return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''), 'en');
    }
    return left.canonicalText.localeCompare(right.canonicalText, 'zh-CN');
  });
  return {
    items: filtered.slice(0, limit).map((item) => ({
      termId: item.termId,
      categoryCode: item.categoryCode,
      canonicalText: item.canonicalText,
      status: item.status,
      differenceCount: item.differenceCount,
      changedCharCount: item.changedCharCount,
      differenceFields: item.differenceFields,
      hasStoredProfile: item.hasStoredProfile,
      flags: item.flags,
      defaultFullPinyinNoTone: item.defaultProfile.fullPinyinNoTone,
      currentFullPinyinNoTone: item.currentProfile.fullPinyinNoTone,
      updatedAt: item.updatedAt,
    })),
    total: filtered.length,
    limit,
    stats: {
      changedCount: comparisons.filter((item) => item.status === 'changed').length,
      alignedOverrideCount: comparisons.filter((item) => item.status === 'aligned_override').length,
      defaultGeneratedCount: comparisons.filter((item) => item.status === 'default_generated').length,
    },
  };
}

/**
 * 功能：获取单个词条的拼音画像 comparison 详情。
 * 输入：数据库连接、`termId`。
 * 输出：comparison 对象；不存在时返回 `null`。
 */
function getTermPinyinComparison(db, termId) {
  const record = effectivePinyinProfileRecords(db, {}).find((item) => item.termId === termId);
  return record ? comparePinyinProfileRecord(record) : null;
}

/**
 * 功能：返回拼音冲突类型的排序优先级。
 * 输入：`conflictType` 冲突类型字符串。
 * 输出：数值优先级。
 */
function conflictTypePriority(conflictType) {
  switch (conflictType) {
    case 'full_pinyin_no_tone':
      return 0;
    case 'alternative_reading':
      return 1;
    case 'initials':
      return 2;
    default:
      return 9;
  }
}

/**
 * 功能：计算标准词的字符长度。
 * 输入：`value` 文本值。
 * 输出：字符长度数值。
 */
function canonicalTextLength(value) {
  return Array.from(String(value || '').trim()).length;
}

/**
 * 功能：把文本按字符拆分为数组。
 * 输入：`value` 文本值。
 * 输出：字符数组。
 */
function canonicalChars(value) {
  return Array.from(String(value || '').trim());
}

/**
 * 功能：计算两个文本的公共前缀长度。
 * 输入：`left/right` 两个文本。
 * 输出：公共前缀长度。
 */
function commonPrefixLength(left, right) {
  const leftChars = canonicalChars(left);
  const rightChars = canonicalChars(right);
  const limit = Math.min(leftChars.length, rightChars.length);
  let count = 0;
  while (count < limit && leftChars[count] === rightChars[count]) {
    count += 1;
  }
  return count;
}

/**
 * 功能：计算两个文本共享字符的数量。
 * 输入：`left/right` 两个文本。
 * 输出：共享字符数量。
 */
function sharedCharacterCount(left, right) {
  const remaining = new Map();
  for (const char of canonicalChars(left)) {
    remaining.set(char, (remaining.get(char) || 0) + 1);
  }
  let count = 0;
  for (const char of canonicalChars(right)) {
    const current = remaining.get(char) || 0;
    if (current > 0) {
      remaining.set(char, current - 1);
      count += 1;
    }
  }
  return count;
}

/**
 * 功能：汇总冲突词组的短词、包含关系和重叠度指标。
 * 输入：`terms` 冲突词条数组。
 * 输出：文本度量摘要对象。
 */
function summarizeConflictTextMetrics(terms) {
  const texts = terms
    .map((item) => String(item.canonicalText || '').trim())
    .filter(Boolean);
  const lengths = texts.map(canonicalTextLength);
  const metrics = {
    minCanonicalLength: lengths.length ? Math.min(...lengths) : 0,
    shortTermCount: lengths.filter((length) => length > 0 && length <= 3).length,
    veryShortTermCount: lengths.filter((length) => length > 0 && length <= 2).length,
    pairCount: 0,
    containmentPairCount: 0,
    sharedPrefixPairCount: 0,
    highOverlapPairCount: 0,
  };

  for (let leftIndex = 0; leftIndex < texts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < texts.length; rightIndex += 1) {
      const left = texts[leftIndex];
      const right = texts[rightIndex];
      const leftLength = canonicalTextLength(left);
      const rightLength = canonicalTextLength(right);
      const shorterLength = Math.min(leftLength, rightLength);
      if (!shorterLength) {
        continue;
      }

      metrics.pairCount += 1;
      const shorter = leftLength <= rightLength ? left : right;
      const longer = leftLength <= rightLength ? right : left;
      if (shorter && longer.includes(shorter)) {
        metrics.containmentPairCount += 1;
      }

      const prefixLength = commonPrefixLength(left, right);
      if (prefixLength >= Math.max(1, shorterLength - 1)) {
        metrics.sharedPrefixPairCount += 1;
      }

      const overlapRatio = sharedCharacterCount(left, right) / shorterLength;
      if (overlapRatio >= 0.67) {
        metrics.highOverlapPairCount += 1;
      }
    }
  }

  return metrics;
}

/**
 * 功能：向 reason 列表去重追加原因。
 * 输入：`reasons` 原因数组，`value` 原因字符串。
 * 输出：无显式返回。
 */
function pushReason(reasons, value) {
  if (!reasons.includes(value)) {
    reasons.push(value);
  }
}

/**
 * 功能：根据严重度分值映射风险等级。
 * 输入：`score` 严重度分值。
 * 输出：`high/medium/low` 等级字符串。
 */
function severityLevelFromScore(score) {
  if (score >= 10) {
    return 'high';
  }
  if (score >= 6) {
    return 'medium';
  }
  return 'low';
}

/**
 * 功能：为拼音冲突分组计算严重度分值和原因。
 * 输入：冲突类型、冲突词条数组、分类编码数组。
 * 输出：严重度摘要对象。
 */
function scorePinyinConflict(conflictType, terms, categoryCodes) {
  const metrics = summarizeConflictTextMetrics(terms);
  const reasons = [];
  let score = 0;

  if (conflictType === 'full_pinyin_no_tone') {
    score += 6;
    pushReason(reasons, 'shared_full_pinyin');
  } else if (conflictType === 'alternative_reading') {
    score += 4;
    pushReason(reasons, 'shared_alternative_reading');
  } else if (conflictType === 'initials') {
    score += 2;
    pushReason(reasons, 'shared_initials');
  }

  if (terms.length >= 4) {
    score += 4;
    pushReason(reasons, 'many_terms');
  } else if (terms.length >= 3) {
    score += 2;
    pushReason(reasons, 'multiple_terms');
  }

  if (metrics.veryShortTermCount > 0) {
    score += 4;
    pushReason(reasons, 'very_short_term_present');
  } else if (metrics.shortTermCount > 0) {
    score += 2;
    pushReason(reasons, 'short_term_present');
  }

  if (metrics.shortTermCount >= 2) {
    score += 1;
    pushReason(reasons, 'multiple_short_terms');
  }

  if (metrics.containmentPairCount > 0) {
    score += 3;
    pushReason(reasons, 'text_contains_text');
  }

  if (metrics.highOverlapPairCount > 0) {
    score += 2;
    pushReason(reasons, 'high_text_overlap');
  } else if (metrics.sharedPrefixPairCount > 0) {
    score += 1;
    pushReason(reasons, 'shared_text_prefix');
  }

  if ((categoryCodes || []).length > 1) {
    score += 1;
    pushReason(reasons, 'cross_category_spread');
  }

  return {
    severityScore: score,
    severityLevel: severityLevelFromScore(score),
    severityReasons: reasons,
    ...metrics,
  };
}

/**
 * 功能：把冲突词条压缩为冲突列表展示所需摘要。
 * 输入：`term` 冲突词条对象。
 * 输出：摘要对象。
 */
function summarizeConflictTerm(term) {
  return {
    termId: term.termId,
    categoryCode: term.categoryCode,
    canonicalText: term.canonicalText,
    fullPinyinNoTone: term.fullPinyinNoTone,
    initials: term.initials,
    customFullPinyinNoTone: term.customFullPinyinNoTone,
    alternativeReadings: term.alternativeReadings,
    runtimeMode: term.runtimeMode,
    polyphoneMode: term.polyphoneMode,
    notes: term.notes,
    updatedAt: term.updatedAt,
  };
}

/**
 * 功能：把冲突匹配结果压缩为计数和样例列表。
 * 输入：`items` 冲突词条数组，`limit` 样例上限。
 * 输出：摘要对象。
 */
function summarizePinyinConflictMatches(items, limit = 5) {
  return {
    count: items.length,
    items: items.slice(0, limit).map(summarizeConflictTerm),
  };
}

/**
 * 功能：把单个词条注册到冲突分组中。
 * 输入：冲突 Map、冲突类型、冲突键、词条对象。
 * 输出：无显式返回。
 */
function registerPinyinConflict(groups, conflictType, key, term) {
  const normalizedKey = conflictType === 'initials'
    ? normalizeInitialsKey(key)
    : joinPinyin(key);
  if (!normalizedKey) {
    return;
  }
  const groupKey = `${conflictType}:${normalizedKey}`;
  if (!groups.has(groupKey)) {
    groups.set(groupKey, {
      conflictType,
      key: normalizedKey,
      categoryCodes: new Set(),
      terms: new Map(),
    });
  }
  const group = groups.get(groupKey);
  group.categoryCodes.add(term.categoryCode);
  if (!group.terms.has(term.termId)) {
    group.terms.set(term.termId, summarizeConflictTerm(term));
  }
}

/**
 * 功能：收集并排序所有拼音冲突分组详情。
 * 输入：数据库连接，`filters` 过滤条件。
 * 输出：冲突分组数组。
 */
function collectPinyinConflictItems(db, filters = {}) {
  const terms = effectivePinyinProfileRecords(db, filters);
  const conflictType = ['full_pinyin_no_tone', 'initials', 'alternative_reading'].includes(filters.conflictType)
    ? filters.conflictType
    : 'all';
  const requestedKey = String(filters.key || '').trim();
  const normalizedRequestedKey = conflictType === 'initials'
    ? normalizeInitialsKey(requestedKey)
    : joinPinyin(requestedKey);
  const groups = new Map();

  for (const term of terms) {
    if (conflictType === 'all' || conflictType === 'full_pinyin_no_tone') {
      const key = joinPinyin(term.fullPinyinNoTone);
      if (key && (!normalizedRequestedKey || conflictType !== 'full_pinyin_no_tone' || key === normalizedRequestedKey)) {
        registerPinyinConflict(groups, 'full_pinyin_no_tone', key, term);
      }
    }

    if (conflictType === 'all' || conflictType === 'initials') {
      const key = normalizeInitialsKey(term.initials);
      if (key && (!normalizedRequestedKey || conflictType !== 'initials' || key === normalizedRequestedKey)) {
        registerPinyinConflict(groups, 'initials', key, term);
      }
    }

    if (conflictType === 'all' || conflictType === 'alternative_reading') {
      for (const alternativeReading of term.alternativeReadings || []) {
        const key = joinPinyin(alternativeReading);
        if (key && (!normalizedRequestedKey || conflictType !== 'alternative_reading' || key === normalizedRequestedKey)) {
          registerPinyinConflict(groups, 'alternative_reading', key, term);
        }
      }
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...scorePinyinConflict(
        group.conflictType,
        Array.from(group.terms.values()),
        Array.from(group.categoryCodes),
      ),
      conflictType: group.conflictType,
      key: group.key,
      termCount: group.terms.size,
      categoryCodes: Array.from(group.categoryCodes).sort((left, right) => left.localeCompare(right, 'en')),
      terms: Array.from(group.terms.values()).sort((left, right) => {
        if (left.categoryCode !== right.categoryCode) {
          return left.categoryCode.localeCompare(right.categoryCode, 'en');
        }
        return left.canonicalText.localeCompare(right.canonicalText, 'zh-CN');
      }),
    }))
    .filter((item) => item.termCount > 1)
    .sort((left, right) => {
      if (left.severityScore !== right.severityScore) {
        return right.severityScore - left.severityScore;
      }
      if (left.minCanonicalLength !== right.minCanonicalLength) {
        return left.minCanonicalLength - right.minCanonicalLength;
      }
      if (left.termCount !== right.termCount) {
        return right.termCount - left.termCount;
      }
      if (left.conflictType !== right.conflictType) {
        return conflictTypePriority(left.conflictType) - conflictTypePriority(right.conflictType);
      }
      return left.key.localeCompare(right.key, 'zh-CN');
    });
}

/**
 * 功能：列出拼音冲突摘要列表和统计信息。
 * 输入：数据库连接，`filters` 查询条件。
 * 输出：冲突列表结果对象。
 */
function listPinyinConflicts(db, filters = {}) {
  const limit = Math.max(1, Math.min(200, Number(filters.limit || 50)));
  const items = collectPinyinConflictItems(db, filters);
  const stats = {
    fullPinyinNoTone: 0,
    initials: 0,
    alternativeReading: 0,
    severity: {
      high: 0,
      medium: 0,
      low: 0,
    },
  };

  for (const item of items) {
    if (item.conflictType === 'full_pinyin_no_tone') {
      stats.fullPinyinNoTone += 1;
    } else if (item.conflictType === 'initials') {
      stats.initials += 1;
    } else if (item.conflictType === 'alternative_reading') {
      stats.alternativeReading += 1;
    }
    stats.severity[item.severityLevel] += 1;
  }

  return {
    items: items.slice(0, limit).map((item) => ({
      conflictType: item.conflictType,
      key: item.key,
      termCount: item.termCount,
      severityLevel: item.severityLevel,
      severityScore: item.severityScore,
      severityReasons: item.severityReasons,
      minCanonicalLength: item.minCanonicalLength,
      shortTermCount: item.shortTermCount,
      veryShortTermCount: item.veryShortTermCount,
      containmentPairCount: item.containmentPairCount,
      sharedPrefixPairCount: item.sharedPrefixPairCount,
      highOverlapPairCount: item.highOverlapPairCount,
      categoryCodes: item.categoryCodes,
      sampleTerms: item.terms.slice(0, 5),
    })),
    total: items.length,
    limit,
    stats,
  };
}

/**
 * 功能：读取单个拼音冲突分组详情。
 * 输入：数据库连接，`filters` 中的冲突类型和冲突键。
 * 输出：冲突详情对象或 `null`。
 */
function getPinyinConflictDetail(db, filters = {}) {
  if (!filters.conflictType || !filters.key) {
    return null;
  }
  return collectPinyinConflictItems(db, {
    categoryCode: filters.categoryCode,
    conflictType: filters.conflictType,
    key: filters.key,
  })[0] || null;
}

/**
 * 功能：把候选生成规则转换为中文标签。
 * 输入：`sourceRule` 规则标识。
 * 输出：标签字符串。
 */
function pinyinCandidateSourceLabel(sourceRule) {
  switch (sourceRule) {
    case 'polyphonic_single_char_swap':
      return '单字多音替换';
    case 'polyphonic_multi_char_combo':
      return '多字多音组合';
    default:
      return sourceRule;
  }
}

/**
 * 功能：根据候选风险分值映射风险等级。
 * 输入：`score` 风险分值。
 * 输出：`high/medium/low` 等级字符串。
 */
function riskLevelFromScore(score) {
  if (score >= 4) {
    return 'high';
  }
  if (score >= 2) {
    return 'medium';
  }
  return 'low';
}

/**
 * 功能：按分类和标准词排序拼音匹配词条。
 * 输入：`items` 词条数组。
 * 输出：排序后的词条数组。
 */
function sortPinyinMatchTerms(items) {
  return [...items].sort((left, right) => {
    if (left.categoryCode !== right.categoryCode) {
      return left.categoryCode.localeCompare(right.categoryCode, 'en');
    }
    return left.canonicalText.localeCompare(right.canonicalText, 'zh-CN');
  });
}

/**
 * 功能：计算多音字候选的风险等级、分值和原因。
 * 输入：词条对象、候选对象、冲突提示对象。
 * 输出：风险摘要对象。
 */
function buildPinyinCandidateRisk(term, candidate, conflictHints) {
  const textLength = Array.from(String(term.canonicalText || '')).length;
  let score = 0;
  const reasons = [];

  if (textLength <= 2) {
    score += 3;
    reasons.push('short_term');
  } else if (textLength === 3) {
    score += 2;
    reasons.push('three_char_term');
  } else {
    score += 1;
  }

  if ((candidate.changes || []).length > 1) {
    score += 1;
    reasons.push('multi_char_combo');
  }

  if ((conflictHints.fullPinyinNoTone && conflictHints.fullPinyinNoTone.count > 0) || (conflictHints.alternativeReadings && conflictHints.alternativeReadings.count > 0)) {
    score += 2;
    reasons.push('full_reading_conflict');
  }

  if (conflictHints.initials && conflictHints.initials.count > 2) {
    score += 1;
    reasons.push('initials_overlap');
  }

  if (['gov_term', 'poi_road', 'proper_noun', 'GOV_INFO', 'ROAD_INFO', 'COMM_WORDS', 'SURNAME'].includes(term.categoryCode)) {
    score = Math.max(0, score - 1);
  }

  return {
    riskLevel: riskLevelFromScore(score),
    riskScore: score,
    reasons,
  };
}

/**
 * 功能：为指定词条生成可提交审核的拼音候选列表。
 * 输入：数据库连接、词条 ID、过滤参数。
 * 输出：包含默认读音、候选列表、跳过项和统计的对象。
 */
function generateTermPinyinCandidates(db, termId, filters = {}) {
  const term = getTerm(db, termId);
  if (!term) {
    throw new Error(`term not found: ${termId}`);
  }

  const currentProfile = getTermPinyinProfile(db, termId, term.canonicalText);
  const generated = buildPinyinCandidates(term.canonicalText, {
    limit: Math.max(1, Math.min(30, Number(filters.limit || 12))),
  });
  const currentKey = joinPinyin(currentProfile.fullPinyinNoTone);
  const existingAlternativeKeys = new Set((currentProfile.alternativeReadings || []).map((item) => joinPinyin(item)));
  const profileRecords = effectivePinyinProfileRecords(db, {});
  const items = [];
  const skippedExisting = [];

  for (const candidate of generated.candidates) {
    const candidateKey = joinPinyin(candidate.fullPinyinNoTone);
    if (!candidateKey) {
      continue;
    }

    if (candidateKey === currentKey) {
      skippedExisting.push({
        fullPinyinNoTone: candidateKey,
        status: 'already_current_profile',
      });
      continue;
    }

    if (existingAlternativeKeys.has(candidateKey)) {
      skippedExisting.push({
        fullPinyinNoTone: candidateKey,
        status: 'already_alternative_reading',
      });
      continue;
    }

    const fullMatches = sortPinyinMatchTerms(profileRecords.filter((item) => item.termId !== termId && joinPinyin(item.fullPinyinNoTone) === candidateKey));
    const alternativeMatches = sortPinyinMatchTerms(profileRecords.filter((item) => item.termId !== termId && (item.alternativeReadings || []).some((reading) => joinPinyin(reading) === candidateKey)));
    const initialsMatches = sortPinyinMatchTerms(profileRecords.filter((item) => item.termId !== termId && normalizeInitialsKey(item.initials) === normalizeInitialsKey(candidate.initials)));

    const conflictHints = {
      fullPinyinNoTone: summarizePinyinConflictMatches(fullMatches),
      alternativeReadings: summarizePinyinConflictMatches(alternativeMatches),
      initials: summarizePinyinConflictMatches(initialsMatches),
    };
    const risk = buildPinyinCandidateRisk(term, candidate, conflictHints);
    const candidateTargetId = buildPinyinCandidateTargetId(term.termId, candidateKey);
    const latestReview = getLatestReviewTaskByTarget(db, 'pinyin_candidate', candidateTargetId);

    items.push({
      candidateTargetId,
      fullPinyinNoTone: candidateKey,
      initials: candidate.initials,
      syllables: candidate.syllables,
      sourceRule: candidate.sourceRule,
      sourceRuleLabel: pinyinCandidateSourceLabel(candidate.sourceRule),
      changes: candidate.changes,
      conflictHints,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      riskReasons: risk.reasons,
      reviewStatus: latestReview ? latestReview.status : 'not_submitted',
      reviewTaskId: latestReview ? latestReview.taskId : null,
    });
  }

  return {
    termId: term.termId,
    canonicalText: term.canonicalText,
    categoryCode: term.categoryCode,
    currentProfile,
    generatedDefault: {
      fullPinyinNoTone: generated.defaultFullPinyinNoTone,
      initials: generated.defaultInitials,
    },
    polyphonicSlots: generated.polyphonicSlots,
    items,
    skippedExisting,
    stats: {
      polyphonicSlotCount: generated.polyphonicSlots.length,
      candidateCount: items.length,
      skippedExistingCount: skippedExisting.length,
    },
  };
}

/**
 * 功能：构造拼音候选审核任务的 targetId。
 * 输入：`termId` 词条 ID，`fullPinyinNoTone` 候选读音。
 * 输出：targetId 字符串。
 */
function buildPinyinCandidateTargetId(termId, fullPinyinNoTone) {
  return `${termId}:${joinPinyin(fullPinyinNoTone)}`;
}

/**
 * 功能：按目标读取最近一条 review task。
 * 输入：数据库连接、目标类型、目标 ID、可选任务类型。
 * 输出：review task 对象或 `null`。
 */
function getLatestReviewTaskByTarget(db, targetType, targetId, taskType = '') {
  const row = db.prepare(`
    SELECT * FROM review_tasks
    WHERE target_type = ? AND target_id = ?
      AND (? = '' OR task_type = ?)
    ORDER BY created_at DESC
    LIMIT 1
  `).get(targetType, targetId, taskType, taskType);
  return row ? {
    taskId: row.task_id,
    taskType: row.task_type,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by,
    comment: row.comment,
    targetSnapshot: deserializeJson(row.target_snapshot, null),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  } : null;
}

/**
 * 功能：按目标读取最近一条“已审核通过”的 review task。
 * 输入：数据库连接、目标类型、目标 ID、可选任务类型。
 * 输出：review task 对象或 `null`。
 */
function getLatestApprovedReviewTaskByTarget(db, targetType, targetId, taskType = '') {
  const row = db.prepare(`
    SELECT * FROM review_tasks
    WHERE target_type = ? AND target_id = ?
      AND status = 'approved'
      AND (? = '' OR task_type = ?)
    ORDER BY reviewed_at DESC, created_at DESC, task_id DESC
    LIMIT 1
  `).get(targetType, targetId, taskType, taskType);
  return row ? {
    taskId: row.task_id,
    taskType: row.task_type,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by,
    comment: row.comment,
    targetSnapshot: deserializeJson(row.target_snapshot, null),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  } : null;
}

/**
 * 功能：判断词条当前是否仍需要重新提交审核。
 * 输入：数据库连接和词条对象。
 * 输出：包含是否允许送审及原因的对象。
 */
function termReviewSubmissionGuard(db, term = null) {
  if (!term) {
    return {
      allowed: false,
      reasonCode: 'term_not_found',
    };
  }
  if (String(term.status || '').trim() === 'disabled') {
    return {
      allowed: false,
      reasonCode: 'term_review_status_invalid',
    };
  }
  const latestApproved = getLatestApprovedReviewTaskByTarget(db, 'term', term.termId, 'term_review');
  const latestSnapshotRevision = latestApproved && latestApproved.targetSnapshot && latestApproved.targetSnapshot.revision != null
    ? Number(latestApproved.targetSnapshot.revision)
    : null;
  const currentRevision = term.revision != null ? Number(term.revision) : null;
  if (
    String(term.status || '').trim() === 'approved'
    && Number.isFinite(currentRevision)
    && Number.isFinite(latestSnapshotRevision)
    && currentRevision <= latestSnapshotRevision
  ) {
    return {
      allowed: false,
      reasonCode: 'term_review_already_satisfied',
    };
  }
  return {
    allowed: true,
    reasonCode: '',
  };
}

/**
 * 功能：把多音字候选提交为持久化审核任务。
 * 输入：数据库连接、词条 ID、候选输入、操作人。
 * 输出：创建或复用的 review task 对象。
 */
function submitPinyinCandidateReview(db, termId, payload = {}, operator = 'system') {
  const term = getTerm(db, termId);
  if (!term) {
    throw new Error(`term not found: ${termId}`);
  }

  const requestedReading = joinPinyin(payload.fullPinyinNoTone);
  if (!requestedReading) {
    const error = new Error('fullPinyinNoTone is required');
    error.statusCode = 400;
    error.code = 'invalid_pinyin_candidate';
    throw error;
  }
  const targetId = buildPinyinCandidateTargetId(termId, requestedReading);
  const latestReview = getLatestReviewTaskByTarget(db, 'pinyin_candidate', targetId, 'pinyin_candidate_review');
  if (latestReview && latestReview.status === 'pending') {
    return latestReview;
  }
  if (latestReview && latestReview.status === 'approved') {
    const error = new Error('pinyin candidate review already satisfied');
    error.statusCode = 409;
    error.code = 'pinyin_candidate_review_already_satisfied';
    throw error;
  }

  const generated = generateTermPinyinCandidates(db, termId, {
    limit: Math.max(1, Math.min(30, Number(payload.limit || 30))),
  });
  const candidate = (generated.items || []).find((item) => item.fullPinyinNoTone === requestedReading);
  if (!candidate) {
    const error = new Error(`generated candidate not found for reading: ${requestedReading}`);
    error.statusCode = 404;
    error.code = 'pinyin_candidate_not_found';
    throw error;
  }
  const targetSnapshot = {
    termId: term.termId,
    canonicalText: term.canonicalText,
    categoryCode: term.categoryCode,
    fullPinyinNoTone: candidate.fullPinyinNoTone,
    initials: candidate.initials,
    syllables: candidate.syllables,
    sourceRule: candidate.sourceRule,
    sourceRuleLabel: candidate.sourceRuleLabel,
    changes: candidate.changes,
    conflictHints: candidate.conflictHints,
    riskLevel: candidate.riskLevel,
    riskScore: candidate.riskScore,
    riskReasons: candidate.riskReasons,
    currentProfile: generated.currentProfile,
  };

  return createReviewTask(db, {
    taskType: 'pinyin_candidate_review',
    targetType: 'pinyin_candidate',
    targetId,
    targetSnapshot,
    comment: payload.comment || '',
  }, operator);
}

/**
 * 功能：为某个 release 创建发布审核任务。
 * 输入：数据库连接、releaseId、操作人、审核备注。
 * 输出：创建或复用的 release review task 对象。
 */
function submitReleaseReview(db, releaseId, operator = 'system', comment = '') {
  const release = getRelease(db, releaseId);
  if (!release) {
    throw new Error(`release not found: ${releaseId}`);
  }
  if (!['built', 'canary'].includes(String(release.status || ''))) {
    const error = new Error(`release is not reviewable in status: ${release.status}`);
    error.statusCode = 409;
    error.code = 'release_status_invalid';
    throw error;
  }
  const approvalPolicy = getReleaseApprovalPolicy(db, releaseId);
  const approvalSummary = getReleaseReviewSummary(db, releaseId);
  if (approvalSummary.approvedCount >= approvalPolicy.requiredApprovals) {
    const error = new Error('release review already satisfies approval requirement');
    error.statusCode = 409;
    error.code = 'release_review_already_satisfied';
    throw error;
  }
  const existing = getLatestReviewTaskByTarget(db, 'release', releaseId, 'release_publish_review');
  if (existing && existing.status === 'pending') {
    return existing;
  }
  return createReviewTask(db, {
    taskType: 'release_publish_review',
    targetType: 'release',
    targetId: releaseId,
    targetSnapshot: {
      ...release,
      approvalPolicy,
      approvalSummary,
      governancePolicy: loadGovernancePolicies(db.appConfig).releasePolicies,
    },
    comment,
  }, operator);
}

/**
 * 功能：列出某个 release 的所有发布审核任务。
 * 输入：数据库连接、releaseId。
 * 输出：release review task 数组。
 */
function listReleaseReviewTasks(db, releaseId) {
  const rows = db.prepare(`
    SELECT * FROM review_tasks
    WHERE target_type = 'release' AND target_id = ? AND task_type = 'release_publish_review'
    ORDER BY created_at ASC
  `).all(releaseId);
  return rows.map((row) => ({
    taskId: row.task_id,
    taskType: row.task_type,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by,
    comment: row.comment,
    targetSnapshot: deserializeJson(row.target_snapshot, null),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  }));
}

/**
 * 功能：根据 release 中包含的词条计算审批策略。
 * 输入：数据库连接、releaseId。
 * 输出：包含审批次数、高风险标记和样例高风险词条的策略对象。
 */
function getReleaseApprovalPolicy(db, releaseId) {
  const governancePolicies = loadGovernancePolicies(db.appConfig).releasePolicies;
  const rows = db.prepare(`
    SELECT t.term_id, t.category_code, t.canonical_text, t.risk_level
    FROM release_terms rt
    JOIN terms t ON t.term_id = rt.term_id
    WHERE rt.release_id = ?
    ORDER BY t.category_code, t.canonical_text
  `).all(releaseId);
  const reasons = [];
  const highRiskTerms = rows.filter((row) => String(row.risk_level || '') === 'high');
  if (highRiskTerms.length > 0) {
    reasons.push('high_risk_term_included');
  }
  const defaultRequiredApprovals = Math.max(1, Number(governancePolicies.defaultRequiredApprovals || 1));
  const highRiskRequiredApprovals = governancePolicies.highRiskReleaseRequiresDualApproval !== false
    ? Math.max(defaultRequiredApprovals, Number(governancePolicies.highRiskReleaseRequiredApprovals || 2))
    : defaultRequiredApprovals;
  return {
    releaseId,
    requiredApprovals: highRiskTerms.length > 0 ? highRiskRequiredApprovals : defaultRequiredApprovals,
    isHighRisk: highRiskTerms.length > 0,
    reasons,
    highRiskTermCount: highRiskTerms.length,
    sampleHighRiskTerms: highRiskTerms.slice(0, 5).map((row) => ({
      termId: row.term_id,
      categoryCode: row.category_code,
      canonicalText: row.canonical_text,
      riskLevel: row.risk_level,
    })),
  };
}

/**
 * 功能：把 release_terms 联表行转换为 release 词条对象。
 * 输入：包含 `t.*` 字段和可选 `release_id` 的数据库行对象。
 * 输出：release 词条业务对象。
 */
function composeReleaseTerm(row) {
  return {
    releaseId: row.release_id,
    termId: row.term_id,
    categoryCode: row.category_code,
    canonicalText: row.canonical_text,
    status: row.status,
    priority: row.priority,
    riskLevel: row.risk_level,
    replaceMode: row.replace_mode,
    baseConfidence: row.base_confidence,
    sourceType: row.source_type,
    pinyinRuntimeMode: row.pinyin_runtime_mode,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 功能：列出某个 release 包含的词条集合。
 * 输入：数据库连接、releaseId。
 * 输出：release term 数组。
 */
function listReleaseTerms(db, releaseId) {
  const rows = db.prepare(`
    SELECT rt.release_id, t.*
    FROM release_terms rt
    JOIN terms t ON t.term_id = rt.term_id
    WHERE rt.release_id = ?
    ORDER BY t.category_code, t.canonical_text
  `).all(releaseId);
  return rows.map(composeReleaseTerm);
}

/**
 * 功能：批量列出多个 release 包含的词条集合。
 * 输入：数据库连接、releaseId 数组。
 * 输出：`releaseId -> release term 数组` 的映射。
 */
function listReleaseTermsByReleaseIds(db, releaseIds = []) {
  const normalizedIds = Array.from(new Set((releaseIds || []).map((item) => String(item || '').trim()).filter(Boolean)));
  const result = new Map();
  for (const releaseId of normalizedIds) {
    result.set(releaseId, []);
  }
  if (!normalizedIds.length) {
    return result;
  }
  const placeholders = buildInClausePlaceholders(normalizedIds);
  const rows = db.prepare(`
    SELECT rt.release_id, t.*
    FROM release_terms rt
    JOIN terms t ON t.term_id = rt.term_id
    WHERE rt.release_id IN (${placeholders})
    ORDER BY rt.release_id, t.category_code, t.canonical_text, t.term_id
  `).all(...normalizedIds);
  for (const row of rows) {
    const releaseId = String(row.release_id || '').trim();
    if (!releaseId || !result.has(releaseId)) {
      continue;
    }
    result.get(releaseId).push(composeReleaseTerm(row));
  }
  return result;
}

/**
 * 功能：汇总某个 release 的审核进度。
 * 输入：数据库连接、releaseId。
 * 输出：包含 approved/pending/rejected 统计的摘要对象。
 */
function getReleaseReviewSummary(db, releaseId) {
  const items = listReleaseReviewTasks(db, releaseId);
  const governancePolicies = loadGovernancePolicies(db.appConfig).releasePolicies;
  const approvedTasks = items.filter((item) => item.status === 'approved');
  const approvedReviewers = Array.from(new Set(approvedTasks
    .filter((item) => item.reviewedBy)
    .map((item) => item.reviewedBy)));
  return {
    releaseId,
    totalCount: items.length,
    pendingCount: items.filter((item) => item.status === 'pending').length,
    approvedCount: governancePolicies.distinctApprovalReviewersRequired === false
      ? approvedTasks.length
      : approvedReviewers.length,
    rejectedCount: items.filter((item) => item.status === 'rejected').length,
    approvedReviewers,
    latestTaskId: items.length > 0 ? items[items.length - 1].taskId : null,
  };
}

/**
 * 功能：把 validation case 数据库行转换为业务对象。
 * 输入：`row` 数据库行对象。
 * 输出：validation case 对象。
 */
function composeValidationCase(row) {
  return {
    caseId: row.case_id,
    description: row.description,
    text: row.sample_text,
    expectedCanonicals: normalizeExpectedCanonicals(deserializeJson(row.expected_canonicals_json, [])),
    enabled: Boolean(row.enabled),
    sourceType: row.source_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 功能：构造 validation case 查询的条件片段和值数组。
 * 输入：validation case 过滤条件对象。
 * 输出：包含 `where` 与 `values` 的查询描述对象。
 */
function buildValidationCaseWhere(filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.enabled != null && filters.enabled !== '') {
    conditions.push('enabled = ?');
    values.push(['0', 'false', 'no'].includes(String(filters.enabled).trim().toLowerCase()) ? 0 : 1);
  }
  if (filters.sourceType) {
    conditions.push('source_type = ?');
    values.push(String(filters.sourceType).trim());
  }
  if (filters.query) {
    conditions.push('(case_id LIKE ? OR description LIKE ? OR sample_text LIKE ?)');
    const pattern = `%${String(filters.query).trim()}%`;
    values.push(pattern, pattern, pattern);
  }
  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

/**
 * 功能：按启用状态、来源和关键字列出 validation cases。
 * 输入：数据库连接，`filters` 查询条件。
 * 输出：validation case 数组。
 */
function listValidationCases(db, filters = {}) {
  const { where, values } = buildValidationCaseWhere(filters);
  const limit = Math.max(1, Math.min(500, Number(filters.limit || 200)));
  const rows = db.prepare(`
    SELECT * FROM validation_cases
    ${where}
    ORDER BY enabled DESC, updated_at DESC, case_id DESC
    LIMIT ?
  `).all(...values, limit);
  return rows.map(composeValidationCase);
}

/**
 * 功能：按条件分页列出 validation case。
 * 输入：数据库连接和 validation case 过滤条件对象。
 * 输出：分页结果对象，包含 `items/total/limit/offset`。
 */
function listValidationCasesPaged(db, filters = {}) {
  const { where, values } = buildValidationCaseWhere(filters);
  const limit = Math.max(1, Math.min(500, Number(filters.limit || filters.pageSize || 50)));
  const offset = Math.max(0, Number(filters.offset || 0));
  const rows = db.prepare(`
    SELECT *
    FROM validation_cases
    ${where}
    ORDER BY enabled DESC, updated_at DESC, case_id DESC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset);
  const count = db.prepare(`SELECT COUNT(*) AS count FROM validation_cases ${where}`).get(...values).count;
  return {
    items: rows.map(composeValidationCase),
    total: Number(count || 0),
    limit,
    offset,
  };
}

/**
 * 功能：汇总 validation case 在当前过滤条件下的状态分布。
 * 输入：数据库连接和 validation case 过滤条件对象。
 * 输出：validation case 摘要对象。
 */
function summarizeValidationCases(db, filters = {}) {
  const { where, values } = buildValidationCaseWhere(filters);
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) AS enabled_count,
      SUM(CASE WHEN enabled = 0 THEN 1 ELSE 0 END) AS disabled_count,
      SUM(CASE WHEN source_type IN ('cg3', 'qa_feedback', 'online_feedback') THEN 1 ELSE 0 END) AS feedback_count
    FROM validation_cases
    ${where}
  `).get(...values) || {};
  return {
    totalCount: Number(row.total_count || 0),
    enabledCount: Number(row.enabled_count || 0),
    disabledCount: Number(row.disabled_count || 0),
    feedbackCount: Number(row.feedback_count || 0),
  };
}

/**
 * 功能：按标准词集合统计启用中的 validation case 关联数量。
 * 输入：数据库连接、标准词文本数组。
 * 输出：`canonicalText -> relatedCaseCount` 的 Map。
 */
function countEnabledValidationCasesByCanonicalTexts(db, canonicalTexts = []) {
  const normalizedTexts = Array.from(new Set((canonicalTexts || []).map((item) => String(item || '').trim()).filter(Boolean)));
  const result = new Map();
  for (const canonicalText of normalizedTexts) {
    result.set(canonicalText, 0);
  }
  if (!normalizedTexts.length) {
    return result;
  }
  const placeholders = buildInClausePlaceholders(normalizedTexts);
  const rows = db.prepare(`
    SELECT
      je.value AS canonical_text,
      COUNT(DISTINCT vc.case_id) AS case_count
    FROM validation_cases vc
    JOIN json_each(vc.expected_canonicals_json) je
    WHERE vc.enabled = 1
      AND je.value IN (${placeholders})
    GROUP BY je.value
  `).all(...normalizedTexts);
  for (const row of rows) {
    result.set(String(row.canonical_text || '').trim(), Number(row.case_count || 0));
  }
  return result;
}

/**
 * 功能：分页列出未能关联到任何现有标准词的启用 validation case。
 * 输入：数据库连接和分页条件对象。
 * 输出：分页结果对象，包含 `items/total/limit/offset`。
 */
function listValidationCasesWithoutKnownCanonicals(db, filters = {}) {
  const limit = Math.max(1, Math.min(500, Number(filters.limit || filters.pageSize || 50)));
  const offset = Math.max(0, Number(filters.offset || 0));
  const where = `
    WHERE vc.enabled = 1
      AND NOT EXISTS (
        SELECT 1
        FROM json_each(vc.expected_canonicals_json) je
        JOIN terms t ON t.canonical_text = je.value
      )
  `;
  const rows = db.prepare(`
    SELECT vc.*
    FROM validation_cases vc
    ${where}
    ORDER BY vc.updated_at DESC, vc.case_id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  const count = db.prepare(`
    SELECT COUNT(*) AS count
    FROM validation_cases vc
    ${where}
  `).get().count;
  return {
    items: rows.map(composeValidationCase),
    total: Number(count || 0),
    limit,
    offset,
  };
}

/**
 * 功能：按条件返回所有匹配的 validation case ID。
 * 输入：数据库连接，validation case 过滤条件对象。
 * 输出：样本 ID 数组。
 */
function listValidationCaseIdsByFilters(db, filters = {}) {
  const { where, values } = buildValidationCaseWhere(filters);
  return db.prepare(`
    SELECT case_id
    FROM validation_cases
    ${where}
    ORDER BY enabled DESC, updated_at DESC, case_id DESC
  `).all(...values).map((row) => row.case_id);
}

/**
 * 功能：按条件返回所有匹配的 validation case 对象。
 * 输入：数据库连接，validation case 过滤条件对象。
 * 输出：样本对象数组。
 */
function listAllValidationCasesByFilters(db, filters = {}) {
  const { where, values } = buildValidationCaseWhere(filters);
  return db.prepare(`
    SELECT *
    FROM validation_cases
    ${where}
    ORDER BY enabled DESC, updated_at DESC, case_id DESC
  `).all(...values).map(composeValidationCase);
}

/**
 * 功能：创建或更新单条 validation case，并记录审计。
 * 输入：数据库连接、validation case 输入、操作人、模式名。
 * 输出：保存后的 validation case 对象。
 */
function upsertValidationCase(db, payload, operator = 'system', mode = 'upsert') {
  const next = normalizeValidationCaseInput(payload);
  if (!next.text || next.expectedCanonicals.length === 0) {
    const error = new Error('validation case requires text and expectedCanonicals');
    error.statusCode = 400;
    error.code = 'invalid_validation_case';
    throw error;
  }
  const before = db.prepare('SELECT * FROM validation_cases WHERE case_id = ?').get(next.caseId);
  assertValidationSourceTypeUsable(db, next.sourceType, {
    currentCode: before ? before.source_type : '',
    entryMode: mode === 'manual' ? 'manual' : 'import',
  });
  const now = nowIso();
  db.prepare(`
    INSERT INTO validation_cases(
      case_id, description, sample_text, expected_canonicals_json,
      enabled, source_type, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(case_id) DO UPDATE SET
      description = excluded.description,
      sample_text = excluded.sample_text,
      expected_canonicals_json = excluded.expected_canonicals_json,
      enabled = excluded.enabled,
      source_type = excluded.source_type,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(
    next.caseId,
    next.description,
    next.text,
    serializeJson(next.expectedCanonicals),
    next.enabled ? 1 : 0,
    next.sourceType,
    next.notes,
    before ? before.created_at : now,
    now,
  );
  const after = db.prepare('SELECT * FROM validation_cases WHERE case_id = ?').get(next.caseId);
  appendAudit(db, {
    operator,
    operation: before ? `validation_case.${mode}.update` : `validation_case.${mode}.create`,
    targetType: 'validation_case',
    targetId: next.caseId,
    beforeSnapshot: before ? composeValidationCase(before) : null,
    afterSnapshot: composeValidationCase(after),
  });
  return composeValidationCase(after);
}

/**
 * 功能：创建单条新的 validation case。
 * 输入：数据库连接、validation case 输入、操作人。
 * 输出：新建的 validation case 对象。
 */
function createValidationCase(db, payload, operator = 'system') {
  const next = normalizeValidationCaseInput(payload);
  if (!next.text || next.expectedCanonicals.length === 0) {
    const error = new Error('validation case requires text and expectedCanonicals');
    error.statusCode = 400;
    error.code = 'invalid_validation_case';
    throw error;
  }
  const exists = db.prepare('SELECT case_id FROM validation_cases WHERE case_id = ?').get(next.caseId);
  if (exists) {
    const error = new Error(`validation case already exists: ${next.caseId}`);
    error.statusCode = 409;
    error.code = 'validation_case_exists';
    throw error;
  }
  assertValidationSourceTypeUsable(db, next.sourceType, {
    entryMode: 'manual',
  });
  return upsertValidationCase(db, next, operator, 'manual');
}

/**
 * 功能：批量导入 validation cases，支持 upsert 和 insert_only。
 * 输入：数据库连接、导入 payload、操作人。
 * 输出：包含 created/updated/skipped 统计的汇总对象。
 */
function importValidationCases(db, payload = {}, operator = 'system') {
  const sourceType = String(payload.sourceType || 'validation_import').trim() || 'validation_import';
  const mode = String(payload.mode || 'upsert').trim().toLowerCase();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const results = [];

  for (const item of items) {
    const normalized = normalizeValidationCaseInput({
      ...item,
      sourceType: item.sourceType || sourceType,
    });
    const exists = db.prepare('SELECT case_id FROM validation_cases WHERE case_id = ?').get(normalized.caseId);
    if (mode === 'insert_only' && exists) {
      results.push({ caseId: normalized.caseId, status: 'skipped_existing' });
      continue;
    }
    const saved = upsertValidationCase(db, normalized, operator, 'import');
    results.push({ caseId: saved.caseId, status: exists ? 'updated' : 'created' });
  }

  return {
    sourceType,
    mode,
    total: items.length,
    createdCount: results.filter((item) => item.status === 'created').length,
    updatedCount: results.filter((item) => item.status === 'updated').length,
    skippedCount: results.filter((item) => item.status === 'skipped_existing').length,
    items: results,
  };
}

/**
 * 功能：停用单条 validation case，并记录审计。
 * 输入：数据库连接、caseId、操作人。
 * 输出：停用后的 validation case 对象。
 */
function disableValidationCase(db, caseId, operator = 'system') {
  const before = db.prepare('SELECT * FROM validation_cases WHERE case_id = ?').get(caseId);
  if (!before) {
    throw new Error(`validation case not found: ${caseId}`);
  }
  db.prepare('UPDATE validation_cases SET enabled = 0, updated_at = ? WHERE case_id = ?').run(nowIso(), caseId);
  const after = db.prepare('SELECT * FROM validation_cases WHERE case_id = ?').get(caseId);
  appendAudit(db, {
    operator,
    operation: 'validation_case.disable',
    targetType: 'validation_case',
    targetId: caseId,
    beforeSnapshot: composeValidationCase(before),
    afterSnapshot: composeValidationCase(after),
  });
  return composeValidationCase(after);
}

/**
 * 功能：批量停用验证样本并返回处理汇总。
 * 输入：数据库连接、样本 ID 数组、操作人。
 * 输出：包含处理明细和数量统计的汇总对象。
 */
function batchDisableValidationCases(db, caseIds = [], operator = 'system') {
  const normalizedIds = Array.from(new Set((Array.isArray(caseIds) ? caseIds : []).map((item) => String(item || '').trim()).filter(Boolean)));
  const items = [];
  withTransaction(db, () => {
    for (const caseId of normalizedIds) {
      const before = db.prepare('SELECT enabled FROM validation_cases WHERE case_id = ?').get(caseId);
      const updated = disableValidationCase(db, caseId, operator);
      items.push({
        caseId: updated.caseId,
        status: before && before.enabled ? 'disabled' : 'already_disabled',
      });
    }
  });
  return {
    total: normalizedIds.length,
    disabledCount: items.filter((item) => item.status === 'disabled').length,
    alreadyDisabledCount: items.filter((item) => item.status === 'already_disabled').length,
    items,
  };
}

/**
 * 功能：把 release gate 联表查询中的 review task 行标准化为业务对象。
 * 输入：包含 review task 字段的数据库行对象。
 * 输出：review task 业务对象。
 */
function composeGateReviewTask(row) {
  return {
    taskId: row.task_id,
    taskType: row.task_type,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by,
    comment: row.comment,
    targetSnapshot: deserializeJson(row.target_snapshot, null),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

/**
 * 功能：向指定 release gate 摘要映射追加同类 blocker 聚合结果。
 * 输入：摘要映射、blocker 编码、联表查询结果、行到 blocker item 的转换函数。
 * 输出：无显式返回；直接修改摘要映射。
 */
function appendReleaseGateBlockers(summaryMap, code, rows = [], toItem) {
  const grouped = new Map();
  for (const row of rows) {
    const releaseId = String(row.release_id || '').trim();
    if (!releaseId || !summaryMap.has(releaseId)) {
      continue;
    }
    if (!grouped.has(releaseId)) {
      grouped.set(releaseId, {
        count: 0,
        items: [],
      });
    }
    const entry = grouped.get(releaseId);
    entry.count += 1;
    if (entry.items.length < 10) {
      entry.items.push(toItem(row));
    }
  }
  for (const [releaseId, entry] of grouped.entries()) {
    const summary = summaryMap.get(releaseId);
    summary.blockers.push({
      code,
      count: entry.count,
      items: entry.items,
    });
    summary.blockerCount += entry.count;
    summary.blocked = true;
  }
}

/**
 * 功能：批量计算多个 release 的数据库层 gate 摘要。
 * 输入：数据库连接、releaseId 数组。
 * 输出：`releaseId -> gate 摘要` 的映射。
 */
function listReleaseDatabaseGateSummariesByIds(db, releaseIds = []) {
  const normalizedIds = Array.from(new Set((releaseIds || []).map((item) => String(item || '').trim()).filter(Boolean)));
  const summaryMap = new Map();
  for (const releaseId of normalizedIds) {
    summaryMap.set(releaseId, {
      releaseId,
      blockerCount: 0,
      blocked: false,
      blockers: [],
    });
  }
  if (!normalizedIds.length) {
    return summaryMap;
  }

  const placeholders = buildInClausePlaceholders(normalizedIds);
  const invalidStatusRows = db.prepare(`
    SELECT rt.release_id, t.term_id, t.canonical_text, t.status
    FROM release_terms rt
    JOIN terms t ON t.term_id = rt.term_id
    WHERE rt.release_id IN (${placeholders})
      AND COALESCE(t.status, '') NOT IN ('approved', 'published')
    ORDER BY rt.release_id, t.category_code, t.canonical_text, t.term_id
  `).all(...normalizedIds);
  appendReleaseGateBlockers(summaryMap, 'release_term_status_invalid', invalidStatusRows, (row) => ({
    termId: row.term_id,
    canonicalText: row.canonical_text,
    status: row.status,
    blockerCode: 'release_term_status_invalid',
  }));

  const pendingTermReviewRows = db.prepare(`
    SELECT rt.release_id, rv.*
    FROM release_terms rt
    JOIN review_tasks rv
      ON rv.target_id = rt.term_id
     AND rv.target_type = 'term'
     AND rv.status = 'pending'
    WHERE rt.release_id IN (${placeholders})
    ORDER BY rt.release_id, rv.created_at DESC, rv.task_id DESC
  `).all(...normalizedIds);
  appendReleaseGateBlockers(summaryMap, 'pending_term_review', pendingTermReviewRows, (row) => {
    const task = composeGateReviewTask(row);
    return {
      taskId: task.taskId,
      termId: task.targetId,
      canonicalText: task.targetSnapshot && task.targetSnapshot.canonicalText ? task.targetSnapshot.canonicalText : '',
      blockerCode: 'pending_term_review',
    };
  });

  const pendingCandidateReviewRows = db.prepare(`
    SELECT rt.release_id, rv.*
    FROM release_terms rt
    JOIN review_tasks rv
      ON json_extract(rv.target_snapshot, '$.termId') = rt.term_id
     AND rv.target_type = 'pinyin_candidate'
     AND rv.status = 'pending'
    WHERE rt.release_id IN (${placeholders})
    ORDER BY rt.release_id, rv.created_at DESC, rv.task_id DESC
  `).all(...normalizedIds);
  appendReleaseGateBlockers(summaryMap, 'pending_pinyin_candidate_review', pendingCandidateReviewRows, (row) => {
    const task = composeGateReviewTask(row);
    const snapshot = task.targetSnapshot || {};
    return {
      taskId: task.taskId,
      termId: snapshot.termId,
      canonicalText: snapshot.canonicalText || '',
      fullPinyinNoTone: snapshot.fullPinyinNoTone || '',
      blockerCode: 'pending_pinyin_candidate_review',
    };
  });

  return summaryMap;
}

/**
 * 功能：根据 release 当前引用词条和待审任务计算数据库层 gate blocker。
 * 输入：数据库连接、releaseId。
 * 输出：包含 blocker 列表和 blocked 状态的 gate 摘要对象。
 */
function getReleaseGateSummary(db, releaseId) {
  const summaryMap = listReleaseDatabaseGateSummariesByIds(db, [releaseId]);
  return summaryMap.get(releaseId) || {
    releaseId,
    blockerCount: 0,
    blocked: false,
    blockers: [],
  };
}
/**
 * 功能：创建或更新词条规则，并记录审计日志。
 * 输入：数据库连接、词条 ID、规则对象、操作人。
 * 输出：更新后的规则对象。
 */
function upsertTermRules(db, termId, rules, operator = 'system') {
  const before = getTermRules(db, termId);
  const next = sanitizeRules(rules);
  db.prepare(`
    INSERT INTO term_rules(
      term_id, candidate_only, min_text_len, max_text_len, boundary_policy,
      left_context_allow, right_context_allow,
      left_context_block, right_context_block,
      regex_allow, regex_block, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(term_id) DO UPDATE SET
      candidate_only = excluded.candidate_only,
      min_text_len = excluded.min_text_len,
      max_text_len = excluded.max_text_len,
      boundary_policy = excluded.boundary_policy,
      left_context_allow = excluded.left_context_allow,
      right_context_allow = excluded.right_context_allow,
      left_context_block = excluded.left_context_block,
      right_context_block = excluded.right_context_block,
      regex_allow = excluded.regex_allow,
      regex_block = excluded.regex_block,
      updated_at = excluded.updated_at
  `).run(
    termId,
    next.candidateOnly ? 1 : 0,
    next.minTextLen,
    next.maxTextLen,
    next.boundaryPolicy,
    serializeArray(next.leftContextAllow),
    serializeArray(next.rightContextAllow),
    serializeArray(next.leftContextBlock),
    serializeArray(next.rightContextBlock),
    serializeArray(next.regexAllow),
    serializeArray(next.regexBlock),
    nowIso(),
  );
  appendAudit(db, {
    operator,
    operation: 'term.rules.update',
    targetType: 'term',
    targetId: termId,
    beforeSnapshot: before,
    afterSnapshot: next,
  });
  return getTermRules(db, termId);
}

/**
 * 功能：把词条数据库行及其关联数据拼装成业务对象。
 * 输入：词条行对象、别名数组、规则对象、可选拼音画像对象。
 * 输出：词条业务对象。
 */
function composeTerm(row, aliases, rules, pinyinProfile) {
  return {
    termId: row.term_id,
    categoryCode: row.category_code,
    businessAttributeCode: row.category_code,
    canonicalText: row.canonical_text,
    status: row.status,
    priority: row.priority,
    riskLevel: row.risk_level,
    replaceMode: row.replace_mode,
    baseConfidence: row.base_confidence,
    sourceType: row.source_type,
    sourceTypeCode: row.source_type,
    pinyinRuntimeMode: row.pinyin_runtime_mode,
    revision: row.revision,
    aliases,
    rules,
    pinyinProfile,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 功能：构造词条查询的条件片段和值数组。
 * 输入：词条过滤条件对象。
 * 输出：包含 `where` 与 `values` 的查询描述对象。
 */
function buildTermWhere(filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.categoryCode) {
    conditions.push('t.category_code = ?');
    values.push(filters.categoryCode);
  }
  if (filters.status) {
    conditions.push('t.status = ?');
    values.push(filters.status);
  }
  if (filters.sourceType) {
    conditions.push('t.source_type = ?');
    values.push(filters.sourceType);
  }
  if (filters.riskLevel) {
    conditions.push('t.risk_level = ?');
    values.push(filters.riskLevel);
  }
  if (filters.query) {
    conditions.push('(t.canonical_text LIKE ? OR EXISTS (SELECT 1 FROM aliases a WHERE a.term_id = t.term_id AND a.alias_text LIKE ?))');
    values.push(`%${filters.query}%`, `%${filters.query}%`);
  }
  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

/**
 * 功能：按条件分页列出词条。
 * 输入：数据库连接，`filters` 过滤和分页条件。
 * 输出：包含 `items/total/limit/offset` 的分页结果对象。
 */
function listTerms(db, filters = {}) {
  const { where, values } = buildTermWhere(filters);
  const limit = Math.max(1, Math.min(500, Number(filters.limit || 50)));
  const offset = Math.max(0, Number(filters.offset || 0));
  const sortBy = ['updated_at', 'priority', 'canonical_text', 'created_at'].includes(String(filters.sortBy || ''))
    ? String(filters.sortBy)
    : 'updated_at';
  const sortDirection = String(filters.sortDirection || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const orderBy = sortBy === 'canonical_text'
    ? `t.${sortBy} ${sortDirection}, t.updated_at DESC, t.term_id DESC`
    : `t.${sortBy} ${sortDirection}, t.updated_at DESC, t.term_id DESC`;
  const rows = db.prepare(`
    SELECT t.*
    FROM terms t
    ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset);
  const count = db.prepare(`SELECT COUNT(*) AS count FROM terms t ${where}`).get(...values).count;
  const termIds = rows.map((row) => row.term_id);
  const aliasMap = aliasMapForTermIds(db, termIds);
  const ruleMap = ruleMapForTermIds(db, termIds);
  return {
    items: rows.map((row) => composeTerm(row, aliasMap.get(row.term_id) || [], ruleMap.get(row.term_id) || sanitizeRules({}))),
    total: count,
    limit,
    offset,
  };
}

/**
 * 功能：汇总词条在当前过滤条件下的状态分布和审核状态。
 * 输入：数据库连接和词条过滤条件对象。
 * 输出：词条摘要对象。
 */
function summarizeTerms(db, filters = {}) {
  const { where, values } = buildTermWhere(filters);
  const row = db.prepare(`
    WITH filtered_terms AS (
      SELECT
        t.term_id,
        t.status,
        t.risk_level
      FROM terms t
      ${where}
    ),
    latest_reviews AS (
      SELECT target_id, status
      FROM (
        SELECT
          rt.target_id,
          rt.status,
          ROW_NUMBER() OVER (PARTITION BY rt.target_id ORDER BY rt.created_at DESC, rt.task_id DESC) AS row_no
        FROM review_tasks rt
        WHERE rt.task_type = 'term_review'
          AND rt.target_type = 'term'
      )
      WHERE row_no = 1
    )
    SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN filtered_terms.status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
      SUM(CASE WHEN filtered_terms.risk_level = 'high' THEN 1 ELSE 0 END) AS high_risk_count,
      SUM(CASE WHEN latest_reviews.status = 'pending' THEN 1 ELSE 0 END) AS pending_review_count
    FROM filtered_terms
    LEFT JOIN latest_reviews ON latest_reviews.target_id = filtered_terms.term_id
  `).get(...values) || {};
  return {
    totalCount: Number(row.total_count || 0),
    approvedCount: Number(row.approved_count || 0),
    highRiskCount: Number(row.high_risk_count || 0),
    pendingReviewCount: Number(row.pending_review_count || 0),
  };
}

/**
 * 功能：按条件返回所有匹配的词条 ID。
 * 输入：数据库连接，词条过滤条件对象。
 * 输出：词条 ID 数组。
 */
function listTermIdsByFilters(db, filters = {}) {
  const { where, values } = buildTermWhere(filters);
  return db.prepare(`
    SELECT t.term_id
    FROM terms t
    ${where}
    ORDER BY t.updated_at DESC, t.term_id DESC
  `).all(...values).map((row) => row.term_id);
}

/**
 * 功能：读取单个词条及其别名、规则。
 * 输入：数据库连接、`termId`。
 * 输出：词条对象；不存在时返回 `null`。
 */
function getTerm(db, termId) {
  const row = db.prepare('SELECT * FROM terms WHERE term_id = ?').get(termId);
  if (!row) {
    return null;
  }
  const aliases = db.prepare('SELECT alias_text FROM aliases WHERE term_id = ? ORDER BY alias_text').all(termId).map((item) => item.alias_text);
  const rules = getTermRules(db, termId);
  return composeTerm(row, aliases, rules);
}

/**
 * 功能：用新别名集合替换词条当前所有别名。
 * 输入：数据库连接、词条 ID、别名数组。
 * 输出：无显式返回。
 */
function replaceAliases(db, termId, aliases) {
  db.prepare('DELETE FROM aliases WHERE term_id = ?').run(termId);
  const stmt = db.prepare('INSERT OR IGNORE INTO aliases(term_id, alias_text) VALUES(?, ?)');
  for (const alias of sanitizeAliases(aliases)) {
    stmt.run(termId, alias);
  }
}

/**
 * 功能：创建新词条，并初始化规则和拼音画像。
 * 输入：数据库连接、词条输入 payload、操作人。
 * 输出：创建后的词条对象。
 */
function createTerm(db, payload, operator = 'system') {
  const termId = payload.termId || generateId(payload.categoryCode || 'TERM');
  const now = nowIso();
  const record = {
    termId,
    categoryCode: String(payload.categoryCode || 'proper_noun').trim(),
    canonicalText: String(payload.canonicalText || '').trim(),
    status: String(payload.status || 'draft').trim(),
    priority: Number(payload.priority || 80),
    riskLevel: String(payload.riskLevel || 'medium').trim(),
    replaceMode: String(payload.replaceMode || 'replace').trim(),
    baseConfidence: Number(payload.baseConfidence || 0.9),
    sourceType: String(payload.sourceType || 'manual').trim(),
    pinyinRuntimeMode: String(payload.pinyinRuntimeMode || 'candidate').trim(),
    aliases: sanitizeAliases(payload.aliases),
    rules: sanitizeRules(payload.rules),
  };
  if (!record.canonicalText) {
    throw new Error('canonicalText is required');
  }
  withTransaction(db, () => {
    db.prepare(`
      INSERT INTO terms(
        term_id, category_code, canonical_text, status, priority, risk_level,
        replace_mode, base_confidence, source_type, pinyin_runtime_mode,
        revision, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      record.termId,
      record.categoryCode,
      record.canonicalText,
      record.status,
      record.priority,
      record.riskLevel,
      record.replaceMode,
      record.baseConfidence,
      record.sourceType,
      record.pinyinRuntimeMode,
      now,
      now,
    );
    replaceAliases(db, record.termId, record.aliases);
    upsertTermRules(db, record.termId, record.rules, operator);
    upsertTermPinyinProfile(db, record.termId, record.canonicalText, payload.pinyinProfile || {}, operator);
  });
  const created = getTerm(db, record.termId);
  appendAudit(db, {
    operator,
    operation: 'term.create',
    targetType: 'term',
    targetId: record.termId,
    beforeSnapshot: null,
    afterSnapshot: created,
  });
  return created;
}

/**
 * 功能：更新现有词条的主属性、别名、规则和拼音画像。
 * 输入：数据库连接、词条 ID、更新 payload、操作人。
 * 输出：更新后的词条对象。
 */
function updateTerm(db, termId, payload, operator = 'system') {
  const current = getTerm(db, termId);
  if (!current) {
    throw new Error(`term not found: ${termId}`);
  }
  const next = {
    categoryCode: payload.categoryCode ?? current.categoryCode,
    canonicalText: payload.canonicalText ?? current.canonicalText,
    status: payload.status ?? current.status,
    priority: payload.priority ?? current.priority,
    riskLevel: payload.riskLevel ?? current.riskLevel,
    replaceMode: payload.replaceMode ?? current.replaceMode,
    baseConfidence: payload.baseConfidence ?? current.baseConfidence,
    sourceType: payload.sourceType ?? current.sourceType,
    pinyinRuntimeMode: payload.pinyinRuntimeMode ?? current.pinyinRuntimeMode,
    aliases: payload.aliases ? sanitizeAliases(payload.aliases) : current.aliases,
    rules: payload.rules ? sanitizeRules(payload.rules) : current.rules,
  };
  const now = nowIso();
  withTransaction(db, () => {
    db.prepare(`
      UPDATE terms
      SET category_code = ?, canonical_text = ?, status = ?, priority = ?,
          risk_level = ?, replace_mode = ?, base_confidence = ?, source_type = ?,
          pinyin_runtime_mode = ?, revision = revision + 1, updated_at = ?
      WHERE term_id = ?
    `).run(
      next.categoryCode,
      next.canonicalText,
      next.status,
      Number(next.priority),
      next.riskLevel,
      next.replaceMode,
      Number(next.baseConfidence),
      next.sourceType,
      next.pinyinRuntimeMode,
      now,
      termId,
    );
    replaceAliases(db, termId, next.aliases);
    upsertTermRules(db, termId, next.rules, operator);
    upsertTermPinyinProfile(db, termId, next.canonicalText, payload.pinyinProfile || current.pinyinProfile || {}, operator);
  });
  const updated = getTerm(db, termId);
  appendAudit(db, {
    operator,
    operation: 'term.update',
    targetType: 'term',
    targetId: termId,
    beforeSnapshot: current,
    afterSnapshot: updated,
  });
  return updated;
}

/**
 * 功能：更新词条状态并写审计日志。
 * 输入：数据库连接、词条 ID、新状态、操作人、备注。
 * 输出：更新后的词条对象。
 */
function updateTermStatus(db, termId, status, operator = 'system', note = '') {
  const current = getTerm(db, termId);
  if (!current) {
    throw new Error(`term not found: ${termId}`);
  }
  db.prepare('UPDATE terms SET status = ?, updated_at = ? WHERE term_id = ?').run(status, nowIso(), termId);
  const updated = getTerm(db, termId);
  appendAudit(db, {
    operator,
    operation: 'term.status.update',
    targetType: 'term',
    targetId: termId,
    beforeSnapshot: current,
    afterSnapshot: updated,
    note,
  });
  return updated;
}

/**
 * 功能：按类别和标准词对导入词条执行插入或更新。
 * 输入：数据库连接、词条 payload、操作人。
 * 输出：创建或更新后的词条对象。
 */
function upsertImportedTerm(db, payload, operator = 'system') {
  const exists = db.prepare('SELECT term_id FROM terms WHERE category_code = ? AND canonical_text = ?').get(payload.categoryCode, payload.canonicalText);
  if (exists) {
    return updateTerm(db, exists.term_id, payload, operator);
  }
  return createTerm(db, payload, operator);
}

/**
 * 功能：批量导入 seed terms 到数据库。
 * 输入：数据库连接、seed term 数组。
 * 输出：导入数量。
 */
function importSeedTerms(db, terms) {
  let imported = 0;
  for (const item of terms) {
    upsertImportedTerm(db, {
      categoryCode: item.categoryCode,
      canonicalText: item.canonicalText,
      status: 'approved',
      priority: item.priority,
      riskLevel: item.riskLevel || 'medium',
      replaceMode: item.replaceMode,
      baseConfidence: item.baseConfidence,
      sourceType: item.sourceType || 'seed_import',
      pinyinRuntimeMode: item.pinyinRuntimeMode || 'candidate',
      aliases: item.aliases || [],
      rules: item.rules || {},
      termId: item.termId,
    }, 'bootstrap');
    imported += 1;
  }
  return imported;
}

/**
 * 功能：获取当前可用于构建 release 的词条集合。
 * 输入：数据库连接。
 * 输出：可构建词条数组。
 */
function getBuildableTerms(db) {
  const rows = db.prepare(`
    SELECT * FROM terms
    WHERE status IN ('approved', 'published')
    ORDER BY category_code, canonical_text
  `).all();
  const termIds = rows.map((row) => row.term_id);
  const aliasMap = aliasMapForTermIds(db, termIds);
  const ruleMap = ruleMapForTermIds(db, termIds);
  return rows.map((row) => ({
    termId: row.term_id,
    categoryCode: row.category_code,
    canonicalText: row.canonical_text,
    aliases: aliasMap.get(row.term_id) || [],
    replaceMode: row.replace_mode,
    priority: row.priority,
    baseConfidence: row.base_confidence,
    sourceType: row.source_type,
    pinyinRuntimeMode: row.pinyin_runtime_mode,
    rules: ruleMap.get(row.term_id) || sanitizeRules({}),
  }));
}

/**
 * 功能：把 release 数据库行转换为业务对象。
 * 输入：`row` release 数据库行。
 * 输出：release 对象。
 */
function composeRelease(row) {
  return {
    releaseId: row.release_id,
    version: row.version,
    status: row.status,
    summary: row.summary,
    artifactDir: row.artifact_dir,
    snapshotPath: row.snapshot_path,
    manifestPath: row.manifest_path,
    termCount: row.term_count,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  };
}

/**
 * 功能：创建新 release 并建立 release_terms 关系，同时写审计日志。
 * 输入：数据库连接、release payload、操作人。
 * 输出：新建的 release 对象。
 */
function createRelease(db, payload, operator = 'system') {
  const now = nowIso();
  db.prepare(`
    INSERT INTO releases(
      release_id, version, status, summary, artifact_dir, snapshot_path,
      manifest_path, term_count, created_at, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(
    payload.releaseId,
    payload.version,
    payload.status,
    payload.summary,
    payload.artifactDir,
    payload.snapshotPath,
    payload.manifestPath,
    payload.termCount,
    now,
  );
  const stmt = db.prepare('INSERT INTO release_terms(release_id, term_id) VALUES(?, ?)');
  for (const termId of payload.termIds || []) {
    stmt.run(payload.releaseId, termId);
  }
  const release = getRelease(db, payload.releaseId);
  appendAudit(db, {
    operator,
    operation: 'release.create',
    targetType: 'release',
    targetId: payload.releaseId,
    beforeSnapshot: null,
    afterSnapshot: release,
  });
  return release;
}

/**
 * 功能：读取单个 release。
 * 输入：数据库连接、releaseId。
 * 输出：release 对象；不存在时返回 `null`。
 */
function getRelease(db, releaseId) {
  const row = db.prepare('SELECT * FROM releases WHERE release_id = ?').get(releaseId);
  return row ? composeRelease(row) : null;
}

/**
 * 功能：按创建时间倒序列出所有 release。
 * 输入：数据库连接。
 * 输出：release 数组。
 */
function listReleases(db) {
  return db.prepare('SELECT * FROM releases ORDER BY created_at DESC').all().map(composeRelease);
}

/**
 * 功能：按条件分页列出 release。
 * 输入：数据库连接和 release 过滤条件对象。
 * 输出：分页结果对象，包含 `items/total/limit/offset`。
 */
function listReleasesPaged(db, filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.status) {
    conditions.push('status = ?');
    values.push(String(filters.status).trim());
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.max(1, Math.min(500, Number(filters.limit || filters.pageSize || 20)));
  const offset = Math.max(0, Number(filters.offset || 0));
  const rows = db.prepare(`
    SELECT *
    FROM releases
    ${where}
    ORDER BY created_at DESC, release_id DESC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset);
  const count = db.prepare(`SELECT COUNT(*) AS count FROM releases ${where}`).get(...values).count;
  return {
    items: rows.map(composeRelease),
    total: Number(count || 0),
    limit,
    offset,
  };
}

/**
 * 功能：获取当前已发布的稳定 release。
 * 输入：数据库连接。
 * 输出：release 对象；不存在时返回 `null`。
 */
function getCurrentPublishedRelease(db) {
  const row = db.prepare("SELECT * FROM releases WHERE status = 'published' ORDER BY published_at DESC, created_at DESC LIMIT 1").get();
  return row ? composeRelease(row) : null;
}

/**
 * 功能：获取当前 canary release。
 * 输入：数据库连接。
 * 输出：release 对象；不存在时返回 `null`。
 */
function getCurrentCanaryRelease(db) {
  const row = db.prepare("SELECT * FROM releases WHERE status = 'canary' ORDER BY created_at DESC LIMIT 1").get();
  return row ? composeRelease(row) : null;
}

/**
 * 功能：列出所有灰度策略。
 * 输入：数据库连接。
 * 输出：gray policy 数组。
 */
function listGrayPolicies(db) {
  return db.prepare('SELECT * FROM gray_policies ORDER BY created_at DESC').all().map((row) => ({
    policyId: row.policy_id,
    releaseId: row.release_id,
    scopeType: row.scope_type,
    percentage: row.percentage,
    enabled: Boolean(row.enabled),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 功能：获取当前启用中的灰度策略。
 * 输入：数据库连接。
 * 输出：gray policy 对象；不存在时返回 `null`。
 */
function getActiveGrayPolicy(db) {
  const row = db.prepare('SELECT * FROM gray_policies WHERE enabled = 1 ORDER BY created_at DESC LIMIT 1').get();
  if (!row) {
    return null;
  }
  return {
    policyId: row.policy_id,
    releaseId: row.release_id,
    scopeType: row.scope_type,
    percentage: row.percentage,
    enabled: Boolean(row.enabled),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 功能：停用灰度策略并记录审计。
 * 输入：数据库连接、policyId、操作人。
 * 输出：停用后的 gray policy 对象。
 */
function disableGrayPolicy(db, policyId, operator = 'system') {
  const before = db.prepare('SELECT * FROM gray_policies WHERE policy_id = ?').get(policyId);
  if (!before) {
    throw new Error(`gray policy not found: ${policyId}`);
  }
  db.prepare('UPDATE gray_policies SET enabled = 0, updated_at = ? WHERE policy_id = ?').run(nowIso(), policyId);
  const after = db.prepare('SELECT * FROM gray_policies WHERE policy_id = ?').get(policyId);
  appendAudit(db, {
    operator,
    operation: 'gray.disable',
    targetType: 'gray_policy',
    targetId: policyId,
    beforeSnapshot: before,
    afterSnapshot: after,
  });
  return {
    policyId: after.policy_id,
    releaseId: after.release_id,
    scopeType: after.scope_type,
    percentage: after.percentage,
    enabled: Boolean(after.enabled),
    createdBy: after.created_by,
    createdAt: after.created_at,
    updatedAt: after.updated_at,
  };
}

/**
 * 功能：创建新的灰度策略，并把对应 release 标记为 canary。
 * 输入：数据库连接、gray policy payload、操作人。
 * 输出：新启用的 gray policy 对象。
 */
function createGrayPolicy(db, payload, operator = 'system') {
  const release = getRelease(db, payload.releaseId);
  if (!release) {
    throw new Error(`release not found: ${payload.releaseId}`);
  }
  const beforeActive = getActiveGrayPolicy(db);
  withTransaction(db, () => {
    db.prepare('UPDATE gray_policies SET enabled = 0, updated_at = ? WHERE enabled = 1').run(nowIso());
    db.prepare(`
      INSERT INTO gray_policies(
        policy_id, release_id, scope_type, percentage, enabled,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      generateId('gray'),
      payload.releaseId,
      String(payload.scopeType || 'traffic_key_hash'),
      Math.max(1, Math.min(100, Number(payload.percentage || 5))),
      operator,
      nowIso(),
      nowIso(),
    );
    db.prepare("UPDATE releases SET status = 'built' WHERE status = 'canary' AND release_id <> ?").run(payload.releaseId);
    db.prepare("UPDATE releases SET status = 'canary' WHERE release_id = ?").run(payload.releaseId);
  });
  const active = getActiveGrayPolicy(db);
  appendAudit(db, {
    operator,
    operation: 'gray.create',
    targetType: 'gray_policy',
    targetId: active.policyId,
    beforeSnapshot: beforeActive,
    afterSnapshot: active,
  });
  return active;
}

/**
 * 功能：把目标 release 标记为 published，并处理历史 published/canary 状态。
 * 输入：数据库连接、releaseId、操作人、模式（publish/rollback）。
 * 输出：目标 release 的最新状态对象。
 */
function markPublishedRelease(db, releaseId, operator = 'system', mode = 'publish') {
  const beforePublished = getCurrentPublishedRelease(db);
  const beforeCanary = getCurrentCanaryRelease(db);
  const targetBefore = getRelease(db, releaseId);
  withTransaction(db, () => {
    db.prepare("UPDATE releases SET status = 'built' WHERE status IN ('published', 'canary') AND release_id <> ?").run(releaseId);
    db.prepare("UPDATE releases SET status = 'published', published_at = ? WHERE release_id = ?").run(nowIso(), releaseId);
    db.prepare('UPDATE gray_policies SET enabled = 0, updated_at = ? WHERE enabled = 1').run(nowIso());
  });
  const targetAfter = getRelease(db, releaseId);
  appendAudit(db, {
    operator,
    operation: mode === 'rollback' ? 'release.rollback' : 'release.publish',
    targetType: 'release',
    targetId: releaseId,
    beforeSnapshot: { published: beforePublished, canary: beforeCanary, target: targetBefore },
    afterSnapshot: { published: targetAfter },
  });
  return targetAfter;
}

/**
 * 功能：创建通用 review task 并写审计日志。
 * 输入：数据库连接、review task payload、操作人。
 * 输出：创建后的 review task 对象。
 */
function createReviewTask(db, payload, operator = 'system') {
  const task = {
    taskId: generateId('review'),
    taskType: payload.taskType,
    targetType: payload.targetType,
    targetId: payload.targetId,
    status: 'pending',
    submittedBy: operator,
    reviewedBy: null,
    comment: payload.comment || '',
    targetSnapshot: payload.targetSnapshot || null,
    createdAt: nowIso(),
    reviewedAt: null,
  };
  db.prepare(`
    INSERT INTO review_tasks(
      task_id, task_type, target_type, target_id, status,
      submitted_by, reviewed_by, comment, target_snapshot,
      created_at, reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.taskId,
    task.taskType,
    task.targetType,
    task.targetId,
    task.status,
    task.submittedBy,
    task.reviewedBy,
    task.comment,
    serializeJson(task.targetSnapshot),
    task.createdAt,
    task.reviewedAt,
  );
  appendAudit(db, {
    operator,
    operation: 'review.create',
    targetType: task.targetType,
    targetId: task.targetId,
    beforeSnapshot: null,
    afterSnapshot: task,
  });
  return getReviewTask(db, task.taskId);
}

/**
 * 功能：提交词条审核任务，必要时将词条状态改为 `pending_review`。
 * 输入：数据库连接、词条 ID、操作人、审核备注。
 * 输出：创建或复用的 term review task 对象。
 */
function submitTermReview(db, termId, operator = 'system', comment = '', options = {}) {
  const term = getTerm(db, termId);
  if (!term) {
    throw new Error(`term not found: ${termId}`);
  }
  const existing = db.prepare("SELECT task_id FROM review_tasks WHERE target_type = 'term' AND target_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(termId);
  if (existing) {
    return getReviewTask(db, existing.task_id);
  }
  const guard = termReviewSubmissionGuard(db, term);
  if (!guard.allowed) {
    const error = new Error(guard.reasonCode === 'term_review_status_invalid'
      ? `term review is not allowed in status: ${term.status}`
      : 'term review already satisfies latest approved revision');
    error.statusCode = 409;
    error.code = guard.reasonCode;
    throw error;
  }
  updateTermStatus(db, termId, 'pending_review', operator, 'submit review');
  return createReviewTask(db, {
    taskType: 'term_review',
    targetType: 'term',
    targetId: termId,
    targetSnapshot: buildTermReviewTargetSnapshot(db, term, options),
    comment,
  }, operator);
}

/**
 * 功能：批量提交词条审核任务并返回处理汇总。
 * 输入：数据库连接、词条 ID 数组、操作人、审核备注。
 * 输出：包含任务明细和数量统计的汇总对象。
 */
function batchSubmitTermReview(db, termIds = [], operator = 'system', comment = '', options = {}) {
  const normalizedIds = Array.from(new Set((Array.isArray(termIds) ? termIds : []).map((item) => String(item || '').trim()).filter(Boolean)));
  const items = [];
  withTransaction(db, () => {
    for (const termId of normalizedIds) {
      const current = getTerm(db, termId);
      if (!current) {
        throw new Error(`term not found: ${termId}`);
      }
      if (current.status === 'disabled') {
        items.push({
          termId,
          taskId: null,
          status: 'skipped_disabled',
        });
        continue;
      }
      const existing = db.prepare("SELECT task_id FROM review_tasks WHERE target_type = 'term' AND target_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(termId);
      if (existing) {
        items.push({
          termId,
          taskId: existing.task_id,
          status: 'reused_pending',
        });
        continue;
      }
      const guard = termReviewSubmissionGuard(db, current);
      if (!guard.allowed) {
        items.push({
          termId,
          taskId: null,
          status: guard.reasonCode === 'term_review_already_satisfied' ? 'skipped_already_satisfied' : 'skipped_disabled',
        });
        continue;
      }
      const task = submitTermReview(db, termId, operator, comment, options);
      items.push({
        termId,
        taskId: task.taskId,
        status: 'submitted',
      });
    }
  });
  return {
    total: normalizedIds.length,
    submittedCount: items.filter((item) => item.status === 'submitted').length,
    reusedCount: items.filter((item) => item.status === 'reused_pending').length,
    skippedDisabledCount: items.filter((item) => item.status === 'skipped_disabled').length,
    skippedAlreadySatisfiedCount: items.filter((item) => item.status === 'skipped_already_satisfied').length,
    items,
  };
}

/**
 * 功能：批量停用词条并返回处理汇总。
 * 输入：数据库连接、词条 ID 数组、操作人、备注。
 * 输出：包含处理明细和数量统计的汇总对象。
 */
function batchDisableTerms(db, termIds = [], operator = 'system', note = 'batch disable') {
  const normalizedIds = Array.from(new Set((Array.isArray(termIds) ? termIds : []).map((item) => String(item || '').trim()).filter(Boolean)));
  const items = [];
  withTransaction(db, () => {
    for (const termId of normalizedIds) {
      const current = getTerm(db, termId);
      if (!current) {
        throw new Error(`term not found: ${termId}`);
      }
      const updated = updateTermStatus(db, termId, 'disabled', operator, note);
      items.push({
        termId: updated.termId,
        status: current.status === 'disabled' ? 'already_disabled' : 'disabled',
      });
    }
  });
  return {
    total: normalizedIds.length,
    disabledCount: items.filter((item) => item.status === 'disabled').length,
    alreadyDisabledCount: items.filter((item) => item.status === 'already_disabled').length,
    items,
  };
}

/**
 * 功能：读取词条当前来源上下文。
 * 输入：数据库连接、词条 ID。
 * 输出：来源上下文对象。
 */
function getTermSourceContext(db, termId) {
  const source = db.prepare('SELECT * FROM term_sources WHERE term_id = ?').get(termId) || null;
  const importJobId = source ? String(source.import_job_id || '').trim() : '';
  return {
    sourceType: source ? String(source.source_type || '').trim() : '',
    sourceTypeCode: source ? String(source.source_type || '').trim() : '',
    importJobId: importJobId || '',
    sourceMode: importJobId ? 'import' : 'manual',
    sourceFileName: source ? String(source.source_file_name || '').trim() : '',
    sourceRowNo: source && source.source_row_no != null ? Number(source.source_row_no) : null,
    sourceRef: source ? String(source.source_ref || '').trim() : '',
  };
}

/**
 * 功能：按导入批次与行号读取对应导入行。
 * 输入：数据库连接、导入批次 ID 和行号。
 * 输出：导入行对象；不存在时返回 `null`。
 */
function getImportJobRowBySource(db, importJobId, sourceRowNo) {
  const normalizedImportJobId = String(importJobId || '').trim();
  if (!normalizedImportJobId || sourceRowNo == null) {
    return null;
  }
  const row = db.prepare(`
    SELECT *
    FROM import_job_rows
    WHERE job_id = ?
      AND row_no = ?
    LIMIT 1
  `).get(normalizedImportJobId, Number(sourceRowNo));
  return row ? composeImportJobRow(row) : null;
}

/**
 * 功能：把录入阶段 issues 转换为审核详情可直接展示的冲突摘要。
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
 * 功能：构造词条审核任务使用的目标快照。
 * 输入：数据库连接、词条对象和可选扩展参数。
 * 输出：包含来源上下文与冲突摘要的快照对象。
 */
function buildTermReviewTargetSnapshot(db, term, options = {}) {
  const sourceContext = {
    ...getTermSourceContext(db, term.termId),
    ...(options.sourceContext || {}),
  };
  const importRow = options.importRow || getImportJobRowBySource(db, sourceContext.importJobId, sourceContext.sourceRowNo);
  const admissionSummary = options.admissionSummary
    || (importRow ? {
      admissionLevel: importRow.admissionLevel,
      blockedCount: (importRow.issues || []).filter((item) => item && item.level === 'blocked').length,
      warningCount: (importRow.issues || []).filter((item) => item && item.level === 'warning').length,
      issues: importRow.issues || [],
    } : null);
  const conflictSummary = options.conflictSummary
    || buildConflictSummaryFromIssues((importRow || {}).issues || (admissionSummary || {}).issues || []);
  return {
    ...term,
    businessAttributeCode: term.categoryCode,
    sourceTypeCode: term.sourceType,
    importJobId: sourceContext.importJobId,
    sourceMode: sourceContext.sourceMode,
    sourceContext,
    admissionSummary,
    conflictSummary,
  };
}

/**
 * 功能：把 review_tasks 数据库行转换为业务对象。
 * 输入：review_tasks 表行对象。
 * 输出：review task 业务对象。
 */
function composeReviewTask(row) {
  return {
    taskId: row.task_id,
    taskType: row.task_type,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by,
    comment: row.comment,
    targetSnapshot: deserializeJson(row.target_snapshot, null),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

/**
 * 功能：读取单个 review task。
 * 输入：数据库连接、taskId。
 * 输出：review task 对象；不存在时返回 `null`。
 */
function getReviewTask(db, taskId) {
  const row = db.prepare('SELECT * FROM review_tasks WHERE task_id = ?').get(taskId);
  if (!row) {
    return null;
  }
  return composeReviewTask(row);
}

/**
 * 功能：按状态和目标类型列出 review tasks。
 * 输入：数据库连接，`filters` 查询条件。
 * 输出：review task 数组。
 */
function listReviewTasks(db, filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.status) {
    conditions.push('status = ?');
    values.push(filters.status);
  }
  if (filters.targetType) {
    conditions.push('target_type = ?');
    values.push(filters.targetType);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.max(1, Math.min(200, Number(filters.limit || 50)));
  const rows = db.prepare(`SELECT * FROM review_tasks ${where} ORDER BY created_at DESC LIMIT ?`).all(...values, limit);
  return rows.map(composeReviewTask);
}

/**
 * 功能：按条件分页列出 review task。
 * 输入：数据库连接和 review task 过滤条件对象。
 * 输出：分页结果对象，包含 `items/total/limit/offset`。
 */
function listReviewTasksPaged(db, filters = {}) {
  const { where, values } = buildReviewTaskWhere(filters);
  const limit = Math.max(1, Math.min(500, Number(filters.limit || filters.pageSize || 50)));
  const offset = Math.max(0, Number(filters.offset || 0));
  const rows = db.prepare(`
    SELECT *
    FROM review_tasks
    ${where}
    ORDER BY created_at DESC, task_id DESC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset);
  const count = db.prepare(`SELECT COUNT(*) AS count FROM review_tasks ${where}`).get(...values).count;
  return {
    items: rows.map(composeReviewTask),
    total: Number(count || 0),
    limit,
    offset,
  };
}

/**
 * 功能：构造审核任务查询的条件片段和值数组。
 * 输入：审核任务过滤条件对象。
 * 输出：包含 `where` 与 `values` 的查询描述对象。
 */
function buildReviewTaskWhere(filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.status) {
    conditions.push('status = ?');
    values.push(String(filters.status).trim());
  }
  if (filters.targetType) {
    conditions.push('target_type = ?');
    values.push(String(filters.targetType).trim());
  }
  if (filters.taskType) {
    conditions.push('task_type = ?');
    values.push(String(filters.taskType).trim());
  }
  if (filters.submittedBy) {
    conditions.push('submitted_by = ?');
    values.push(String(filters.submittedBy).trim());
  }
  if (filters.reviewedBy) {
    conditions.push('reviewed_by = ?');
    values.push(String(filters.reviewedBy).trim());
  }
  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

/**
 * 功能：汇总审核任务在当前过滤条件下的状态分布。
 * 输入：数据库连接和审核任务过滤条件对象。
 * 输出：审核任务摘要对象。
 */
function summarizeReviewTasks(db, filters = {}) {
  const { where, values } = buildReviewTaskWhere(filters);
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
    FROM review_tasks
    ${where}
  `).get(...values) || {};
  return {
    totalCount: Number(row.total_count || 0),
    pendingCount: Number(row.pending_count || 0),
    approvedCount: Number(row.approved_count || 0),
    rejectedCount: Number(row.rejected_count || 0),
  };
}

/**
 * 功能：按词条 ID 集合读取待审核词条 review task。
 * 输入：数据库连接、词条 ID 数组。
 * 输出：待审核 review task 数组。
 */
function listPendingTermReviewsByTargetIds(db, targetIds = []) {
  const normalizedIds = Array.from(new Set((targetIds || []).map((item) => String(item || '').trim()).filter(Boolean)));
  if (!normalizedIds.length) {
    return [];
  }
  const placeholders = buildInClausePlaceholders(normalizedIds);
  const rows = db.prepare(`
    SELECT *
    FROM review_tasks
    WHERE status = 'pending'
      AND target_type = 'term'
      AND target_id IN (${placeholders})
    ORDER BY created_at DESC, task_id DESC
  `).all(...normalizedIds);
  return rows.map(composeReviewTask);
}

/**
 * 功能：按词条 ID 集合读取待审核拼音候选 review task。
 * 输入：数据库连接、词条 ID 数组。
 * 输出：待审核拼音候选 review task 数组。
 */
function listPendingPinyinCandidateReviewsByTermIds(db, termIds = []) {
  const normalizedIds = Array.from(new Set((termIds || []).map((item) => String(item || '').trim()).filter(Boolean)));
  if (!normalizedIds.length) {
    return [];
  }
  const placeholders = buildInClausePlaceholders(normalizedIds);
  const rows = db.prepare(`
    SELECT *
    FROM review_tasks
    WHERE status = 'pending'
      AND target_type = 'pinyin_candidate'
      AND json_extract(target_snapshot, '$.termId') IN (${placeholders})
    ORDER BY created_at DESC, task_id DESC
  `).all(...normalizedIds);
  return rows.map(composeReviewTask);
}

/**
 * 功能：按导入批次分页读取词条审核任务。
 * 输入：数据库连接、导入批次 ID、分页与过滤条件。
 * 输出：分页结果对象，包含 `items/total/limit/offset`。
 */
function listTermReviewTasksByImportJobIdPaged(db, importJobId, filters = {}) {
  const { where, values } = buildTermReviewTaskByImportJobWhere(importJobId, filters);
  const normalizedImportJobId = String(importJobId || '').trim();
  const limit = Math.max(1, Math.min(500, Number(filters.limit || filters.pageSize || 50)));
  const offset = Math.max(0, Number(filters.offset || 0));
  if (!normalizedImportJobId) {
    return {
      items: [],
      total: 0,
      limit,
      offset,
    };
  }
  const rows = db.prepare(`
    SELECT rt.*
    FROM review_tasks rt
    JOIN term_sources ts ON ts.term_id = rt.target_id
    ${where}
    ORDER BY rt.created_at DESC, rt.task_id DESC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset);
  const count = db.prepare(`
    SELECT COUNT(*) AS count
    FROM review_tasks rt
    JOIN term_sources ts ON ts.term_id = rt.target_id
    ${where}
  `).get(...values).count;
  return {
    items: rows.map(composeReviewTask),
    total: Number(count || 0),
    limit,
    offset,
  };
}

/**
 * 功能：构造按导入批次查询词条审核任务的条件片段和值数组。
 * 输入：导入批次 ID 和审核任务过滤条件对象。
 * 输出：包含 `where` 与 `values` 的查询描述对象。
 */
function buildTermReviewTaskByImportJobWhere(importJobId, filters = {}) {
  const normalizedImportJobId = String(importJobId || '').trim();
  const conditions = [
    'ts.import_job_id = ?',
    "rt.task_type = 'term_review'",
    "rt.target_type = 'term'",
  ];
  const values = [normalizedImportJobId];
  if (filters.status) {
    conditions.push('rt.status = ?');
    values.push(String(filters.status).trim());
  }
  if (filters.submittedBy) {
    conditions.push('rt.submitted_by = ?');
    values.push(String(filters.submittedBy).trim());
  }
  if (filters.reviewedBy) {
    conditions.push('rt.reviewed_by = ?');
    values.push(String(filters.reviewedBy).trim());
  }
  return {
    where: `WHERE ${conditions.join(' AND ')}`,
    values,
  };
}

/**
 * 功能：汇总指定导入批次词条审核任务的状态分布。
 * 输入：数据库连接、导入批次 ID 和审核任务过滤条件对象。
 * 输出：词条审核任务摘要对象。
 */
function summarizeTermReviewTasksByImportJobId(db, importJobId, filters = {}) {
  const normalizedImportJobId = String(importJobId || '').trim();
  if (!normalizedImportJobId) {
    return {
      totalCount: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
    };
  }
  const { where, values } = buildTermReviewTaskByImportJobWhere(normalizedImportJobId, filters);
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN rt.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN rt.status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
      SUM(CASE WHEN rt.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
    FROM review_tasks rt
    JOIN term_sources ts ON ts.term_id = rt.target_id
    ${where}
  `).get(...values) || {};
  return {
    totalCount: Number(row.total_count || 0),
    pendingCount: Number(row.pending_count || 0),
    approvedCount: Number(row.approved_count || 0),
    rejectedCount: Number(row.rejected_count || 0),
  };
}

/**
 * 功能：按导入批次读取全部词条审核任务。
 * 输入：数据库连接、导入批次 ID、过滤条件。
 * 输出：词条审核任务数组。
 */
function listTermReviewTasksByImportJobId(db, importJobId, filters = {}) {
  const normalizedImportJobId = String(importJobId || '').trim();
  if (!normalizedImportJobId) {
    return [];
  }
  const { where, values } = buildTermReviewTaskByImportJobWhere(normalizedImportJobId, filters);
  return db.prepare(`
    SELECT rt.*
    FROM review_tasks rt
    JOIN term_sources ts ON ts.term_id = rt.target_id
    ${where}
    ORDER BY rt.created_at DESC, rt.task_id DESC
  `).all(...values).map(composeReviewTask);
}

/**
 * 功能：按任务 ID 集合批量读取审核任务。
 * 输入：数据库连接、任务 ID 数组。
 * 输出：审核任务数组。
 */
function listReviewTasksByIds(db, taskIds = []) {
  const normalizedIds = Array.from(new Set((taskIds || []).map((item) => String(item || '').trim()).filter(Boolean)));
  if (!normalizedIds.length) {
    return [];
  }
  const placeholders = buildInClausePlaceholders(normalizedIds);
  const rows = db.prepare(`
    SELECT *
    FROM review_tasks
    WHERE task_id IN (${placeholders})
    ORDER BY created_at DESC, task_id DESC
  `).all(...normalizedIds);
  return rows.map(composeReviewTask);
}

/**
 * 功能：按过滤条件返回全部匹配的审核任务 ID。
 * 输入：数据库连接和审核任务过滤条件对象。
 * 输出：审核任务 ID 数组。
 */
function listReviewTaskIdsByFilters(db, filters = {}) {
  const { where, values } = buildReviewTaskWhere(filters);
  return db.prepare(`
    SELECT task_id
    FROM review_tasks
    ${where}
    ORDER BY created_at DESC, task_id DESC
  `).all(...values).map((row) => row.task_id);
}

/**
 * 功能：校验批量审核作用域并返回标准值。
 * 输入：批量审核请求对象。
 * 输出：标准化后的作用域字符串。
 */
function normalizeBatchReviewScope(payload = {}) {
  const scope = String(payload.scope || 'selected_tasks').trim() || 'selected_tasks';
  if (scope === 'selected_tasks' || scope === 'import_job' || scope === 'current_filter') {
    return scope;
  }
  const error = new Error(`unsupported review batch scope: ${scope}`);
  error.statusCode = 400;
  error.code = 'review_batch_scope_invalid';
  throw error;
}

/**
 * 功能：解析批量词条审核请求对应的任务集合。
 * 输入：数据库连接和批量审核请求对象。
 * 输出：包含作用域、导入批次和任务列表的解析结果对象。
 */
function resolveBatchTermReviewRequest(db, payload = {}) {
  const scope = normalizeBatchReviewScope(payload);
  if (scope === 'selected_tasks') {
    const taskIds = Array.from(new Set((payload.taskIds || []).map((item) => String(item || '').trim()).filter(Boolean)));
    if (!taskIds.length) {
      const error = new Error('taskIds is required for selected_tasks');
      error.statusCode = 400;
      error.code = 'review_batch_task_ids_required';
      throw error;
    }
    const taskMap = new Map(listReviewTasksByIds(db, taskIds).map((item) => [String(item.taskId || '').trim(), item]));
    return {
      scope,
      importJobId: '',
      importJob: null,
      requestedTaskIds: taskIds,
      tasks: taskIds.map((taskId) => taskMap.get(taskId) || null),
    };
  }
  if (scope === 'current_filter') {
    const filters = payload.filters || {};
    const taskIds = listReviewTaskIdsByFilters(db, {
      status: filters.status || '',
      taskType: filters.taskType || '',
      targetType: filters.targetType || '',
      submittedBy: filters.submittedBy || '',
      reviewedBy: filters.reviewedBy || '',
    });
    const taskMap = new Map(listReviewTasksByIds(db, taskIds).map((item) => [String(item.taskId || '').trim(), item]));
    return {
      scope,
      importJobId: '',
      importJob: null,
      requestedTaskIds: taskIds,
      tasks: taskIds.map((taskId) => taskMap.get(taskId) || null),
    };
  }
  const importJobId = String(payload.importJobId || '').trim();
  if (!importJobId) {
    const error = new Error('importJobId is required for import_job');
    error.statusCode = 400;
    error.code = 'review_batch_import_job_id_required';
    throw error;
  }
  const importJob = getImportJob(db, importJobId);
  if (!importJob) {
    const error = new Error(`import job not found: ${importJobId}`);
    error.statusCode = 404;
    error.code = 'import_job_not_found';
    throw error;
  }
  const tasks = listTermReviewTasksByImportJobId(db, importJobId, { status: 'pending' });
  return {
    scope,
    importJobId,
    importJob,
    requestedTaskIds: tasks.map((item) => String(item.taskId || '').trim()),
    tasks,
  };
}

/**
 * 功能：执行批量词条审核决策并返回处理汇总。
 * 输入：数据库连接、批量审核请求、操作人和决策类型。
 * 输出：批量审核处理汇总对象。
 */
function executeBatchTermReviewDecision(db, payload = {}, operator = 'reviewer', decision = 'approve') {
  const resolved = resolveBatchTermReviewRequest(db, payload);
  const items = [];
  withTransaction(db, () => {
    for (let index = 0; index < resolved.requestedTaskIds.length; index += 1) {
      const requestedTaskId = resolved.requestedTaskIds[index];
      const task = resolved.tasks[index] || null;
      if (!task) {
        items.push({
          taskId: requestedTaskId,
          targetId: '',
          status: 'skipped_not_found',
        });
        continue;
      }
      if (task.taskType !== 'term_review' || task.targetType !== 'term') {
        items.push({
          taskId: task.taskId,
          targetId: task.targetId,
          status: 'skipped_unsupported',
        });
        continue;
      }
      if (task.status !== 'pending') {
        items.push({
          taskId: task.taskId,
          targetId: task.targetId,
          status: 'skipped_non_pending',
        });
        continue;
      }
      const updated = decision === 'reject'
        ? rejectReviewTask(db, task.taskId, operator, payload.comment || '')
        : approveReviewTask(db, task.taskId, operator);
      items.push({
        taskId: updated.taskId,
        targetId: updated.targetId,
        status: decision === 'reject' ? 'rejected' : 'approved',
      });
    }
  });
  return {
    scope: resolved.scope,
    decision,
    importJobId: resolved.importJobId,
    totalRequested: resolved.requestedTaskIds.length,
    processedCount: items.filter((item) => item.status === 'approved' || item.status === 'rejected').length,
    approvedCount: items.filter((item) => item.status === 'approved').length,
    rejectedCount: items.filter((item) => item.status === 'rejected').length,
    skippedNotFoundCount: items.filter((item) => item.status === 'skipped_not_found').length,
    skippedNonPendingCount: items.filter((item) => item.status === 'skipped_non_pending').length,
    skippedUnsupportedCount: items.filter((item) => item.status === 'skipped_unsupported').length,
    items,
  };
}

/**
 * 功能：批量审核通过词条审核任务。
 * 输入：数据库连接、批量审核请求、操作人。
 * 输出：批量审核通过处理汇总对象。
 */
function batchApproveReviewTasks(db, payload = {}, operator = 'reviewer') {
  return executeBatchTermReviewDecision(db, payload, operator, 'approve');
}

/**
 * 功能：批量驳回词条审核任务。
 * 输入：数据库连接、批量审核请求、操作人。
 * 输出：批量驳回处理汇总对象。
 */
function batchRejectReviewTasks(db, payload = {}, operator = 'reviewer') {
  return executeBatchTermReviewDecision(db, payload, operator, 'reject');
}

/**
 * 功能：批准 review task，并按目标类型触发相应副作用。
 * 输入：数据库连接、taskId、审核人。
 * 输出：批准后的 review task 对象。
 */
function approveReviewTask(db, taskId, operator = 'reviewer') {
  const task = getReviewTask(db, taskId);
  if (!task) {
    throw new Error(`review task not found: ${taskId}`);
  }
  if (task.status !== 'pending') {
    return task;
  }
  if (task.targetType === 'release' && task.taskType === 'release_publish_review') {
    const releasePolicies = loadGovernancePolicies(db.appConfig).releasePolicies;
    if (
      releasePolicies.submitterReviewerSeparationRequired !== false
      && String(task.submittedBy || '') === String(operator || '')
    ) {
      const error = new Error('release review requires submitter and reviewer to be different operators');
      error.statusCode = 409;
      error.code = 'release_review_submitter_conflict';
      throw error;
    }
    const releaseReviews = listReleaseReviewTasks(db, task.targetId);
    if (
      releasePolicies.distinctApprovalReviewersRequired !== false
      && releaseReviews.some((item) => item.status === 'approved' && String(item.reviewedBy || '') === String(operator || ''))
    ) {
      const error = new Error('release dual approval requires distinct reviewers');
      error.statusCode = 409;
      error.code = 'release_review_duplicate_reviewer';
      throw error;
    }
  }
  if (task.targetType === 'term') {
    updateTermStatus(db, task.targetId, 'approved', operator, 'review approved');
  } else if (task.targetType === 'pinyin_candidate') {
    const snapshot = task.targetSnapshot || {};
    const term = getTerm(db, snapshot.termId);
    if (!term) {
      throw new Error(`term not found: ${snapshot.termId}`);
    }
    const currentProfile = getTermPinyinProfile(db, term.termId, term.canonicalText);
    const candidateReading = joinPinyin(snapshot.fullPinyinNoTone);
    const currentFull = joinPinyin(currentProfile.fullPinyinNoTone);
    const alternativeReadings = normalizedPinyinReadingList(currentProfile.alternativeReadings);

    if (candidateReading && candidateReading !== currentFull && !alternativeReadings.includes(candidateReading)) {
      upsertTermPinyinProfile(db, term.termId, term.canonicalText, {
        runtimeMode: currentProfile.runtimeMode,
        polyphoneMode: currentProfile.polyphoneMode,
        customFullPinyinNoTone: currentProfile.customFullPinyinNoTone,
        alternativeReadings: [...alternativeReadings, candidateReading],
        notes: currentProfile.notes,
      }, operator);
    }
  }
  db.prepare('UPDATE review_tasks SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE task_id = ?').run('approved', operator, nowIso(), taskId);
  const updated = getReviewTask(db, taskId);
  appendAudit(db, {
    operator,
    operation: 'review.approve',
    targetType: task.targetType,
    targetId: task.targetId,
    beforeSnapshot: task,
    afterSnapshot: updated,
  });
  return updated;
}

/**
 * 功能：驳回 review task，并按目标类型触发相应副作用。
 * 输入：数据库连接、taskId、审核人、审核备注。
 * 输出：驳回后的 review task 对象。
 */
function rejectReviewTask(db, taskId, operator = 'reviewer', comment = '') {
  const task = getReviewTask(db, taskId);
  if (!task) {
    throw new Error(`review task not found: ${taskId}`);
  }
  if (task.status !== 'pending') {
    return task;
  }
  if (task.targetType === 'term') {
    updateTermStatus(db, task.targetId, 'draft', operator, 'review rejected');
  }
  db.prepare('UPDATE review_tasks SET status = ?, reviewed_by = ?, reviewed_at = ?, comment = ? WHERE task_id = ?').run('rejected', operator, nowIso(), comment || task.comment || '', taskId);
  const updated = getReviewTask(db, taskId);
  appendAudit(db, {
    operator,
    operation: 'review.reject',
    targetType: task.targetType,
    targetId: task.targetId,
    beforeSnapshot: task,
    afterSnapshot: updated,
    note: comment,
  });
  return updated;
}

/**
 * 功能：按目标和操作条件列出审计日志。
 * 输入：数据库连接，`filters` 查询条件。
 * 输出：审计日志数组。
 */
function listAuditLogs(db, filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.targetType) {
    conditions.push('target_type = ?');
    values.push(filters.targetType);
  }
  if (filters.targetId) {
    conditions.push('target_id = ?');
    values.push(filters.targetId);
  }
  if (filters.operation) {
    conditions.push('operation = ?');
    values.push(filters.operation);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.max(1, Math.min(200, Number(filters.limit || 50)));
  const rows = db.prepare(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ?`).all(...values, limit);
  return rows.map((row) => ({
    auditId: row.audit_id,
    requestId: row.request_id,
    operator: row.operator,
    operation: row.operation,
    targetType: row.target_type,
    targetId: row.target_id,
    beforeSnapshot: deserializeJson(row.before_snapshot, null),
    afterSnapshot: deserializeJson(row.after_snapshot, null),
    note: row.note,
    createdAt: row.created_at,
  }));
}

module.exports = {
  openDatabase,
  databasePath,
  countTerms,
  countTermsByCategory,
  countAliasTermsByCategory,
  listTerms,
  listTermIdsByFilters,
  getTerm,
  getTermRules,
  getTermPinyinProfile,
  listPinyinProfiles,
  listPinyinConflicts,
  getPinyinConflictDetail,
  listPinyinComparisons,
  getTermPinyinComparison,
  generateTermPinyinCandidates,
  submitPinyinCandidateReview,
  getLatestReviewTaskByTarget,
  submitReleaseReview,
  listReleaseReviewTasks,
  getReleaseApprovalPolicy,
  listReleaseTerms,
  listReleaseTermsByReleaseIds,
  getReleaseReviewSummary,
  getReleaseGateSummary,
  listReleaseDatabaseGateSummariesByIds,
  listValidationCases,
  listValidationCasesPaged,
  summarizeValidationCases,
  countEnabledValidationCasesByCanonicalTexts,
  listValidationCasesWithoutKnownCanonicals,
  listValidationCaseIdsByFilters,
  listAllValidationCasesByFilters,
  listImportJobs,
  summarizeImportJobs,
  getImportJob,
  listImportJobFiles,
  getImportJobResult,
  listImportJobRows,
  findTermByCategoryAndCanonical,
  findTermsByAliasText,
  findTermsByCanonicalText,
  upsertValidationCase,
  createValidationCase,
  importValidationCases,
  disableValidationCase,
  batchDisableValidationCases,
  recordRuntimeCorrection,
  recordRuntimePeak,
  listRuntimeHourlyStats,
  listTopRuntimeHitTerms,
  getRuntimePeakStat,
  getDashboardSummary,
  summarizeTerms,
  createTerm,
  updateTerm,
  updateTermStatus,
  batchDisableTerms,
  upsertTermRules,
  upsertTermPinyinProfile,
  importSeedTerms,
  getBuildableTerms,
  createRelease,
  getRelease,
  listReleases,
  listReleasesPaged,
  getCurrentPublishedRelease,
  getCurrentCanaryRelease,
  listGrayPolicies,
  getActiveGrayPolicy,
  createGrayPolicy,
  disableGrayPolicy,
  markPublishedRelease,
  createReviewTask,
  submitTermReview,
  batchSubmitTermReview,
  getReviewTask,
  listReviewTasksByIds,
  listReviewTaskIdsByFilters,
  listReviewTasks,
  listReviewTasksPaged,
  summarizeReviewTasks,
  listPendingTermReviewsByTargetIds,
  listTermReviewTasksByImportJobId,
  listTermReviewTasksByImportJobIdPaged,
  summarizeTermReviewTasksByImportJobId,
  listPendingPinyinCandidateReviewsByTermIds,
  batchApproveReviewTasks,
  batchRejectReviewTasks,
  approveReviewTask,
  rejectReviewTask,
  listAuditLogs,
  getRuntimeNode,
  listRuntimeNodes,
  listRuntimeNodeRegistry,
  getRuntimeNodeRegistryItem,
  createRuntimeNodeRegistryItem,
  updateRuntimeNodeRegistryItem,
  enableRuntimeNodeRegistryItem,
  disableRuntimeNodeRegistryItem,
  rotateRuntimeNodeRegistrySecret,
  assertRuntimeNodeRegistryAccess,
  summarizeRuntimeNodesForTargetVersion,
  listRuntimeRolloutAttentionNodes,
  registerRuntimeNode,
  heartbeatRuntimeNode,
  getRuntimeControlState,
  setRuntimeDesiredRelease,
  getRuntimeControlViewForNode,
  recordRuntimeNodeApplyResult,
  uploadRuntimeNodeStats,
  sanitizeRules,
};
