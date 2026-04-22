# console 批量导入接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-22
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

典型响应摘要：

```json
{
  "item": {
    "job": {
      "jobId": "import_job_xxx",
      "status": "preview_ready"
    },
    "previewSummary": {
      "totalRows": 530,
      "readyRows": 489,
      "warningRows": 30,
      "errorRows": 11,
      "importableRows": 519
    },
    "blockedRowCount": 11,
    "warningRowCount": 30,
    "canConfirm": true
  }
}
```

JOB-106 扩展字段：

1. `previewSummary.recommendationSummary`
   - `saveReplaceCount`
   - `saveCandidateCount`
   - `mergeExistingCount`
   - `appendAliasCount`
   - `skipBlockedCount`

### 5.3 `GET /api/console/dictionary/import-jobs/{jobId}/rows`

查询参数：

1. `status`
2. `decision`
3. `pageSize`
4. `recommendedAction`

作用：

1. 查看导入逐行预览。

典型响应摘要：

```json
{
  "items": [
    {
      "rowNo": 116,
      "status": "error",
      "decision": "skipped_blocked",
      "targetTermKey": "",
      "errorCode": "alias_conflict",
      "errorMessage": "当前标准词命中了其他词条的错误词或别名，不能直接作为新的标准词录入。"
    }
  ],
  "total": 11
}
```

JOB-106 行级扩展字段：

1. `recommendedAction`
2. `runtimeSuitability`
3. `reasonSummary`
4. `reviewHints`
5. `targetTermId`
6. `targetCanonicalText`

扩展示例：

```json
{
  "items": [
    {
      "rowNo": 116,
      "status": "warning",
      "decision": "accept",
      "recommendedAction": "save_candidate",
      "runtimeSuitability": "candidate",
      "targetTermId": "",
      "targetCanonicalText": "",
      "reasonSummary": "当前词条存在有限歧义，仅允许作为推荐候选导入。",
      "reviewHints": [
        "当前词条不适合直接替换，只能进入候选推荐链。"
      ]
    },
    {
      "rowNo": 203,
      "status": "warning",
      "decision": "merge_existing",
      "recommendedAction": "merge_existing",
      "runtimeSuitability": "replace",
      "targetTermId": "term_abc",
      "targetCanonicalText": "民政局",
      "reasonSummary": "建议并入已有词条“民政局”。",
      "reviewHints": [
        "当前标准词与现有词条关系明确，建议不要新建。"
      ]
    }
  ],
  "total": 2
}
```

页面映射要求：

1. `decision = skipped_blocked` 的页面中文 label 必须显示为 `阻断跳过`
2. `status = error` 在导入完成后页面说明文案应解释为 `阻断未导入`
3. 不允许直接把 `skipped_blocked` 原值暴露给最终用户
4. `recommendedAction` 必须支持页面单独筛选项：
   - `全部建议动作`
   - `建议替换导入`
   - `建议候选导入`
   - `建议并入已有`
   - `建议补录已有`
   - `建议阻断跳过`

### 5.4 `GET /api/console/dictionary/import-jobs/{jobId}/errors/download`

作用：

1. 下载错误行 CSV。

输出列：

1. `rowNo`
2. `canonicalText`
3. `errorCode`
4. `errorMessage`
5. `issueCodes`
6. `issueMessages`
7. `traceSummary`

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

#### JOB-106 预览阶段口径

预览阶段除现有行状态外，还需要同步生成：

1. `recommendedAction`
2. `runtimeSuitability`
3. `reasonSummary`
4. `reviewHints`
5. `targetTermId`
6. `targetCanonicalText`

若批次详情页展示“建议动作”汇总卡片，则接口需要同时返回：

1. `previewSummary.recommendationSummary.saveReplaceCount`
2. `previewSummary.recommendationSummary.saveCandidateCount`
3. `previewSummary.recommendationSummary.mergeExistingCount`
4. `previewSummary.recommendationSummary.appendAliasCount`
5. `previewSummary.recommendationSummary.skipBlockedCount`

## 7. 确认与取消

### 7.1 `POST /api/console/dictionary/import-jobs/{jobId}/confirm`

作用：

1. 导入当前批次中可通过的记录。

关键约束：

1. 只有 `preview_ready / uploaded / parsed` 状态才允许确认。
2. 模板级、文件级、系统级异常仍可阻断整批。
3. 行级 `error` 不再阻断整批确认，而是只跳过对应行。

副作用：

1. 写入 / 更新词条。
2. 写入别名与来源。
3. 生成审核任务。
4. 写入 `import_job_results`
5. 批次状态切到 `imported`
6. 行级 `error` 保留在批次中，且不入库

导入结果汇总建议至少包含：

1. `importedReadyCount`
2. `importedWarningCount`
3. `skippedBlockedCount`
4. `newTermCount`
5. `updatedTermCount`
6. `newAliasCount`
7. `updatedAliasCount`
8. `errorCount`

JOB-106 扩展汇总字段：

1. `replaceImportedCount`
2. `candidateImportedCount`
3. `mergedExistingCount`
4. `aliasAppendedCount`

页面口径要求：

1. 页面按钮展示中文：
   - `导入可通过记录`
2. 页面状态展示中文：
   - `可直接导入`
   - `需人工确认`
   - `错误行`
   - `已导入`
   - `阻断跳过`

示例响应摘要：

```json
{
  "jobId": "import_job_xxx",
  "status": "imported",
  "resultSummary": {
    "importedReadyCount": 489,
    "importedWarningCount": 30,
    "skippedBlockedCount": 11,
    "newTermCount": 120,
    "updatedTermCount": 399,
    "newAliasCount": 620,
    "updatedAliasCount": 0,
    "errorCount": 0
  }
}
```

页面中文化约束：

1. 按钮中文：`导入可通过记录 / 取消批次 / 下载阻断报表`
2. 卡片中文：`成功导入 / warning 导入 / 跳过阻断 / 新增词条 / 更新词条 / 新增错误词 / 错误数`
3. 下拉中文：`全部预览状态 / 可直接导入 / 需人工确认 / 错误行 / 已导入 / 阻断跳过`

页面按钮、下拉、卡片口径要求：

1. 主按钮：`导入可通过记录`
2. 次按钮：`取消批次`
3. 报表按钮：`下载阻断报表`
4. 处理决策新增中文展示：`阻断跳过`
5. 批量建议主按钮：`按系统建议处理`
6. 建议动作汇总卡片至少包括：
   - `建议替换导入`
   - `建议候选导入`
   - `建议并入已有`
   - `建议补录已有`
   - `建议阻断跳过`

说明：

1. 内部枚举值可继续保持英文
2. 页面呈现必须中文化
3. `merge_existing` 与 `append_alias_to_existing` 第一版不做全自动落库
4. 即使存在唯一目标词条，也必须由用户触发“按系统建议处理”后批量执行

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
| `term_admission_blocked` | 确认阶段再次触发行级准入阻断 |
| `import_job_blocked_rows` | 旧口径：存在 `error` 行时整批阻断；`JOB-105` 落地后仅保留给整批级错误 |

## 9. 相关测试

至少覆盖：

1. [`import-jobs.test.js`](/Codex/ACDP/prototype/tests/unit/import-jobs.test.js)
2. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
3. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
4. [`console-workflows.test.js`](/Codex/ACDP/prototype/tests/unit/console-workflows.test.js)
