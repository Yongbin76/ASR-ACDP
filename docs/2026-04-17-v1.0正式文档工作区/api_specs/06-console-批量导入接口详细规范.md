# console 批量导入接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`/api/console/import/templates*`、`/api/console/dictionary/import-jobs*`

## 1. 覆盖范围

本文档覆盖：

1. `GET /api/console/import/templates`
2. `GET /api/console/import/templates/{templateCode}`
3. `GET /api/console/import/templates/{templateCode}/download`
4. `GET /api/console/dictionary/import-jobs`
5. `GET /api/console/dictionary/import-jobs/{jobId}`
6. `GET /api/console/dictionary/import-jobs/{jobId}/rows`
7. `GET /api/console/dictionary/import-jobs/{jobId}/errors/download`
8. `POST /api/console/dictionary/import-jobs`
9. `POST /api/console/dictionary/import-jobs/{jobId}/confirm`
10. `POST /api/console/dictionary/import-jobs/{jobId}/cancel`

## 2. 代码入口

主要代码文件：

1. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)
2. [`import-jobs.js`](/Codex/ACDP/prototype/src/lib/import-jobs.js)
3. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
4. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)

## 3. 权限

| 接口类别 | 权限 |
|---|---|
| 模板查看/下载 | `term.read` |
| 导入批次查看 | `term.read` |
| 创建导入批次 | `term.write` |
| 确认导入 | `term.write` |
| 取消导入 | `term.write` |

## 4. 模板接口

### 4.1 `GET /api/console/import/templates`

作用：

1. 返回模板清单。

### 4.2 `GET /api/console/import/templates/{templateCode}`

作用：

1. 返回单个模板详情。

典型字段：

1. `templateCode`
2. `templateName`
3. `templateVersion`
4. `fields`
5. `rules`
6. `templateFile`
7. `exampleFile`

### 4.3 `GET /api/console/import/templates/{templateCode}/download`

查询参数：

1. `kind=template|example`

作用：

1. 下载模板文件或示例文件。

## 5. 导入批次列表与详情

### 5.1 `GET /api/console/dictionary/import-jobs`

查询参数：

1. `status`
2. `jobType`
3. `sourceType`
4. `submittedBy`
5. `page`
6. `pageSize`

输出通常包含：

1. `items`
2. `summary`
3. `total`

### 5.2 `GET /api/console/dictionary/import-jobs/{jobId}`

作用：

1. 返回导入批次详情。

典型区块：

1. `job`
2. `files`
3. `previewSummary`
4. `createdReviewTasks`
5. `result`

### 5.3 `GET /api/console/dictionary/import-jobs/{jobId}/rows`

查询参数：

1. `status`
2. `decision`
3. `pageSize`

作用：

1. 查看导入逐行预览。

### 5.4 `GET /api/console/dictionary/import-jobs/{jobId}/errors/download`

作用：

1. 下载错误行 CSV。

输出列：

1. `rowNo`
2. `errorCode`
3. `errorMessage`
4. `issueCodes`
5. `issueMessages`
6. `traceSummary`

## 6. 创建导入批次

### 6.1 `POST /api/console/dictionary/import-jobs`

支持两种输入：

1. `multipart/form-data`
2. `application/json`

#### 关键字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `templateCode` | `string` | 模板代码 |
| `defaultCategoryCode` | `string` | 默认业务属性 |
| `sourceType` | `string` | 来源类型 |
| `comment` | `string` | 备注 |
| `fileName` | `string` | 文件名 |
| `fileContent` | `Buffer/string` | 文件内容 |

#### 副作用

1. 创建 `import_jobs`
2. 保存文件
3. 解析模板
4. 逐行写入 `import_job_rows`
5. 生成预览摘要

## 7. 确认与取消

### 7.1 `POST /api/console/dictionary/import-jobs/{jobId}/confirm`

作用：

1. 确认导入。

关键约束：

1. 只有 `preview_ready / uploaded / parsed` 状态才允许确认。
2. 只要当前批次存在 `error` 行，就阻断确认。

副作用：

1. 写入 / 更新词条。
2. 写入别名与来源。
3. 生成审核任务。
4. 写入 `import_job_results`
5. 批次状态切到 `imported`

### 7.2 `POST /api/console/dictionary/import-jobs/{jobId}/cancel`

作用：

1. 取消导入批次。

允许状态：

1. `preview_ready`
2. `uploaded`
3. `parsed`

## 8. 常见错误码

| 错误码 | 场景 |
|---|---|
| `missing_file` | 未上传文件 |
| `template not found` | 模板不存在 |
| `import job not found` | 批次不存在 |
| `import_job_status_invalid` | 当前状态不允许确认或取消 |
| `term_admission_blocked` | 行级准入阻断 |

## 9. 相关测试

至少覆盖：

1. [`import-jobs.test.js`](/Codex/ACDP/prototype/tests/unit/import-jobs.test.js)
2. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
3. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
4. [`console-workflows.test.js`](/Codex/ACDP/prototype/tests/unit/console-workflows.test.js)
