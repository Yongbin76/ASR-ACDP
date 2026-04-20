# `aliases` 与来源表详细字典

- 文档状态：active
- 适用版本：v1.0
- 文档类型：data_dictionary
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-17
- 责任对象：`aliases`、`term_sources`、`alias_sources`

## 1. 表作用

这三张表共同解决“错误词 / 别名”和“来源追踪”问题。

### 1.1 `aliases`

用于存储某个标准词的错误词 / 别名集合。

### 1.2 `term_sources`

用于存储标准词的来源上下文。

### 1.3 `alias_sources`

用于存储别名的来源上下文。

## 2. 建表来源

建表代码位于：

[`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)

## 3. `aliases` 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `id` | `INTEGER` | 否 | 自增 | `PRIMARY KEY AUTOINCREMENT` | 行主键 |
| `term_id` | `TEXT` | 否 | 无 | `FOREIGN KEY -> terms(term_id)` | 所属词条 |
| `alias_text` | `TEXT` | 否 | 无 | `UNIQUE(term_id, alias_text)` | 错误词 / 别名文本 |

当前索引：

1. `idx_aliases_alias` on `alias_text`

## 4. `term_sources` 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `term_id` | `TEXT` | 否 | 无 | `PRIMARY KEY` / `FOREIGN KEY -> terms(term_id)` | 对应词条 |
| `source_type` | `TEXT` | 否 | 无 | - | 来源类型 |
| `import_job_id` | `TEXT` | 是 | `NULL` | - | 导入批次 ID |
| `source_file_name` | `TEXT` | 否 | `''` | - | 来源文件名 |
| `source_row_no` | `INTEGER` | 是 | `NULL` | - | 来源行号 |
| `source_ref` | `TEXT` | 否 | `''` | - | 来源引用 |
| `created_at` | `TEXT` | 否 | 无 | - | 创建时间 |
| `updated_at` | `TEXT` | 否 | 无 | - | 更新时间 |

当前索引：

1. `idx_term_sources_job` on `import_job_id`

## 5. `alias_sources` 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `term_id` | `TEXT` | 否 | 无 | `PRIMARY KEY(term_id, alias_text)` / `FOREIGN KEY -> terms(term_id)` | 所属词条 |
| `alias_text` | `TEXT` | 否 | 无 | `PRIMARY KEY(term_id, alias_text)` | 别名文本 |
| `source_type` | `TEXT` | 否 | 无 | - | 来源类型 |
| `import_job_id` | `TEXT` | 是 | `NULL` | - | 导入批次 ID |
| `source_file_name` | `TEXT` | 否 | `''` | - | 来源文件名 |
| `source_row_no` | `INTEGER` | 是 | `NULL` | - | 来源行号 |
| `source_ref` | `TEXT` | 否 | `''` | - | 来源引用 |
| `created_at` | `TEXT` | 否 | 无 | - | 创建时间 |
| `updated_at` | `TEXT` | 否 | 无 | - | 更新时间 |

当前索引：

1. `idx_alias_sources_job` on `(import_job_id, term_id)`

## 6. 写入路径

### 6.1 `aliases`

主要写入路径：

1. `saveTermAliases()`
2. `createTerm()`
3. `updateTerm()`
4. `upsertImportedTerm()`

### 6.2 `term_sources`

主要写入路径：

1. 手工创建词条时，作为 `manual` 来源写入。
2. 导入确认后，按 `import_job_id + row_no` 写入。

### 6.3 `alias_sources`

主要写入路径：

1. 导入确认时，对每个新写入的 alias 同步写入来源。
2. 错误词补录模板导入时写入。

## 7. 读取路径

### 7.1 `aliases`

主要读取路径：

1. `getTerm()`
2. `listTerms()`
3. runtime snapshot build

### 7.2 来源上下文

主要读取路径：

1. `getTermSourceContext()`
2. 审核详情页
3. 导入详情页
4. review `targetSnapshot`

## 8. 典型案例

### 8.1 手工创建词条并写入来源

标准词：

```json
{
  "term_id": "term_001",
  "source_type": "manual",
  "import_job_id": null,
  "source_file_name": "",
  "source_row_no": null,
  "source_ref": "",
  "created_at": "2026-04-17T10:00:00.000Z",
  "updated_at": "2026-04-17T10:00:00.000Z"
}
```

解释：

1. 手工录入没有 `import_job_id`。
2. 但后续审核和详情页仍可通过来源上下文识别它是 `manual`。

### 8.2 导入批次写入别名来源

```json
{
  "term_id": "term_002",
  "alias_text": "工商认定",
  "source_type": "import_csv",
  "import_job_id": "import_job_001",
  "source_file_name": "structured_terms_csv_v2.csv",
  "source_row_no": 12,
  "source_ref": "structured import",
  "created_at": "2026-04-17T11:00:00.000Z",
  "updated_at": "2026-04-17T11:00:00.000Z"
}
```

解释：

1. 这个 alias 可以被反向追到具体导入批次和导入行。
2. 导入后若进入审核任务，审核详情也能看到这些来源信息。

## 9. 修改风险

1. 改 `aliases` 唯一约束会直接影响错误词去重语义。
2. 改来源表字段会影响：
   - 审核快照
   - 导入详情
   - review 详情
3. 如果来源追踪字段丢失，后续就无法回答“这条词从哪里来的”。

## 10. 必须同步的代码与测试

代码：

1. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
2. [`import-jobs.js`](/Codex/ACDP/prototype/src/lib/import-jobs.js)
3. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)

测试：

1. [`import-jobs.test.js`](/Codex/ACDP/prototype/tests/unit/import-jobs.test.js)
2. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
3. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
