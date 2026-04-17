# 导入批次数据表 DDL 草案

## 1. 文档目的

本文件给出新后台导入中心首批建议新增表的 DDL 草案，供编码前确认。

本文件不替换当前 `platform-db.js` 中已有表，只补充新增表。

## 2. 设计目标

新增表需要承接：

- 文件上传
- 导入批次
- 清洗预览
- 错误行
- 确认导入
- 导入结果追踪

## 3. 新增表清单

建议新增：

- `import_jobs`
- `import_job_files`
- `import_job_rows`
- `import_job_results`
- `import_templates`

## 4. `import_jobs`

```sql
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

CREATE INDEX IF NOT EXISTS idx_import_jobs_status
  ON import_jobs(status);

CREATE INDEX IF NOT EXISTS idx_import_jobs_source
  ON import_jobs(source_type, job_type);

CREATE INDEX IF NOT EXISTS idx_import_jobs_created
  ON import_jobs(created_at DESC);
```

## 5. `import_job_files`

```sql
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

CREATE INDEX IF NOT EXISTS idx_import_job_files_job
  ON import_job_files(job_id, file_role);
```

## 6. `import_job_rows`

```sql
CREATE TABLE IF NOT EXISTS import_job_rows (
  row_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  row_no INTEGER NOT NULL,
  raw_payload_json TEXT NOT NULL,
  normalized_payload_json TEXT NOT NULL,
  target_term_key TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'pending',
  error_code TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(job_id) REFERENCES import_jobs(job_id)
);

CREATE INDEX IF NOT EXISTS idx_import_job_rows_job
  ON import_job_rows(job_id, row_no);

CREATE INDEX IF NOT EXISTS idx_import_job_rows_status
  ON import_job_rows(job_id, status, decision);
```

## 7. `import_job_results`

```sql
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_import_job_results_job
  ON import_job_results(job_id);
```

## 8. `import_templates`

```sql
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

CREATE INDEX IF NOT EXISTS idx_import_templates_enabled
  ON import_templates(enabled, import_type);
```

## 9. 可选增强表

如果首期需要更强追踪能力，可后续补：

- `term_sources`
- `alias_sources`

用于把 `terms/aliases` 与 `import_jobs`、原始文件、行号建立稳定映射。

建议不在第一批强制实现。

## 10. 首批状态值建议

### `import_jobs.status`

- `uploaded`
- `parsed`
- `preview_ready`
- `confirmed`
- `imported`
- `failed`
- `cancelled`

### `import_job_rows.status`

- `parsed`
- `warning`
- `error`
- `ready`
- `imported`
- `skipped`

### `import_job_rows.decision`

- `pending`
- `accept`
- `skip`
- `merge_existing`

## 11. 编码建议

编码时建议：

1. 先把 DDL 合并进 `platform-db.js`
2. 先只实现创建/查询批次
3. 再实现行级预览和确认导入
