# `import_jobs` 相关表详细字典

- 文档状态：active
- 适用版本：v1.0
- 文档类型：data_dictionary
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-17
- 责任对象：`import_jobs`、`import_job_files`、`import_job_rows`、`import_job_results`、`import_templates`

## 1. 表组作用

这组表共同承接“批量导入”的完整链路：

1. 批次主对象。
2. 上传文件。
3. 逐行预览结果。
4. 导入结果汇总。
5. 模板注册表。

## 2. `import_jobs`

### 2.1 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `job_id` | `TEXT` | 否 | 无 | `PRIMARY KEY` | 导入批次 ID |
| `job_type` | `TEXT` | 否 | 无 | - | 批次类型 |
| `source_type` | `TEXT` | 否 | 无 | - | 来源类型 |
| `template_code` | `TEXT` | 否 | 无 | - | 使用的模板代码 |
| `template_version` | `TEXT` | 否 | 无 | - | 模板版本 |
| `status` | `TEXT` | 否 | 无 | - | 批次状态 |
| `summary` | `TEXT` | 否 | `''` | - | 摘要 |
| `submitted_by` | `TEXT` | 否 | 无 | - | 提交人 |
| `confirmed_by` | `TEXT` | 是 | `NULL` | - | 确认人 |
| `created_at` | `TEXT` | 否 | 无 | - | 创建时间 |
| `confirmed_at` | `TEXT` | 是 | `NULL` | - | 确认时间 |
| `finished_at` | `TEXT` | 是 | `NULL` | - | 完成时间 |

### 2.2 状态

常见值：

1. `uploaded`
2. `parsed`
3. `preview_ready`
4. `imported`
5. `cancelled`

## 3. `import_job_files`

| 字段 | SQLite 类型 | 可空 | 默认值 | 含义 |
|---|---|---|---|---|
| `file_id` | `TEXT` | 否 | 无 | 文件主键 |
| `job_id` | `TEXT` | 否 | 无 | 所属批次 |
| `file_role` | `TEXT` | 否 | 无 | 文件角色 |
| `original_name` | `TEXT` | 否 | 无 | 原始文件名 |
| `stored_path` | `TEXT` | 否 | 无 | 存储路径 |
| `content_type` | `TEXT` | 否 | `''` | 内容类型 |
| `file_size` | `INTEGER` | 否 | `0` | 文件大小 |
| `checksum` | `TEXT` | 否 | `''` | 校验值 |
| `uploaded_at` | `TEXT` | 否 | 无 | 上传时间 |

## 4. `import_job_rows`

### 4.1 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 含义 |
|---|---|---|---|---|
| `row_id` | `TEXT` | 否 | 无 | 行主键 |
| `job_id` | `TEXT` | 否 | 无 | 所属批次 |
| `row_no` | `INTEGER` | 否 | 无 | 原始行号 |
| `raw_payload_json` | `TEXT` | 否 | 无 | 原始行 JSON |
| `normalized_payload_json` | `TEXT` | 否 | 无 | 归一化结果 JSON |
| `issues_json` | `TEXT` | 否 | `'[]'` | 问题列表 |
| `target_term_key` | `TEXT` | 否 | `''` | 目标词键 |
| `status` | `TEXT` | 否 | 无 | 行状态 |
| `decision` | `TEXT` | 否 | `pending` | 行决策 |
| `error_code` | `TEXT` | 否 | `''` | 错误码 |
| `error_message` | `TEXT` | 否 | `''` | 错误说明 |
| `created_at` | `TEXT` | 否 | 无 | 创建时间 |
| `updated_at` | `TEXT` | 否 | 无 | 更新时间 |

### 4.2 行状态

常见值：

1. `ready`
2. `warning`
3. `error`
4. `imported`

### 4.3 行决策

常见值：

1. `pending`
2. `accept`
3. `merge_existing`

## 5. `import_job_results`

| 字段 | SQLite 类型 | 可空 | 默认值 | 含义 |
|---|---|---|---|---|
| `result_id` | `TEXT` | 否 | 无 | 结果主键 |
| `job_id` | `TEXT` | 否 | 无 | 所属批次 |
| `new_term_count` | `INTEGER` | 否 | `0` | 新增标准词数量 |
| `updated_term_count` | `INTEGER` | 否 | `0` | 更新标准词数量 |
| `new_alias_count` | `INTEGER` | 否 | `0` | 新增别名数量 |
| `updated_alias_count` | `INTEGER` | 否 | `0` | 更新别名数量 |
| `skipped_count` | `INTEGER` | 否 | `0` | 跳过数量 |
| `error_count` | `INTEGER` | 否 | `0` | 错误数量 |
| `imported_by` | `TEXT` | 否 | 无 | 导入执行人 |
| `imported_at` | `TEXT` | 否 | 无 | 导入时间 |

约束：

1. `idx_import_job_results_job` 唯一保证每个批次只有一条汇总结果。

## 6. `import_templates`

| 字段 | SQLite 类型 | 可空 | 默认值 | 含义 |
|---|---|---|---|---|
| `template_code` | `TEXT` | 否 | 无 | 模板代码 |
| `template_name` | `TEXT` | 否 | 无 | 模板名称 |
| `template_version` | `TEXT` | 否 | 无 | 模板版本 |
| `import_type` | `TEXT` | 否 | 无 | 导入类型 |
| `file_format` | `TEXT` | 否 | 无 | 文件格式 |
| `schema_json` | `TEXT` | 否 | 无 | 字段定义 |
| `template_file_path` | `TEXT` | 否 | 无 | 模板文件路径 |
| `example_file_path` | `TEXT` | 否 | 无 | 示例文件路径 |
| `enabled` | `INTEGER` | 否 | `1` | 是否启用 |
| `created_at` | `TEXT` | 否 | 无 | 创建时间 |
| `updated_at` | `TEXT` | 否 | 无 | 更新时间 |

## 7. 写入路径

主要函数：

1. `createImportJob()`
2. `confirmImportJob()`
3. `cancelImportJob()`
4. `getImportJobResult()`
5. `listImportJobRows()`

导入解析主逻辑位于：

1. [`import-jobs.js`](/Codex/ACDP/prototype/src/lib/import-jobs.js)

## 8. 典型案例

### 8.1 `preview_ready` 批次

```json
{
  "job_id": "import_job_001",
  "job_type": "structured_terms",
  "source_type": "import_csv",
  "template_code": "structured_terms_csv_v2",
  "template_version": "v2",
  "status": "preview_ready",
  "submitted_by": "editor_user"
}
```

解释：

1. 文件已上传并解析。
2. 已生成逐行预览。
3. 等待人工确认导入。

### 8.2 `import_job_rows` 中的阻断行

```json
{
  "row_id": "row_001",
  "job_id": "import_job_001",
  "row_no": 12,
  "status": "error",
  "decision": "pending",
  "error_code": "term_admission_blocked",
  "error_message": "当前词条内容不满足准入规则。"
}
```

解释：

1. 该行当前阻断批次确认。
2. 如果批次里仍有 `error` 行，`confirmImportJob()` 不允许继续。

## 9. 关键约束

1. `preview_ready` 但仍有 `error` 行的批次，不可确认导入。
2. 导入确认后，逐行结果会进入 `imported` 或形成汇总结果。
3. 批量导入和手工录入的审核主语最终统一到 `review_tasks`。

## 10. 必须同步的代码与测试

代码：

1. [`import-jobs.js`](/Codex/ACDP/prototype/src/lib/import-jobs.js)
2. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
3. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)
4. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)

测试：

1. [`import-jobs.test.js`](/Codex/ACDP/prototype/tests/unit/import-jobs.test.js)
2. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
3. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
4. [`console-workflows.test.js`](/Codex/ACDP/prototype/tests/unit/console-workflows.test.js)
