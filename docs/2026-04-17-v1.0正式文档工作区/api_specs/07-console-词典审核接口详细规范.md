# console 词典审核接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`/api/console/dictionary/reviews*`

## 1. 覆盖范围

本文档覆盖：

1. `GET /api/console/dictionary/reviews`
2. `GET /api/console/dictionary/reviews/{taskId}`
3. `POST /api/console/dictionary/reviews/{taskId}/approve`
4. `POST /api/console/dictionary/reviews/{taskId}/reject`
5. `POST /api/console/dictionary/reviews/batch-approve`
6. `POST /api/console/dictionary/reviews/batch-reject`

## 2. 代码入口

主要代码文件：

1. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)
2. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
3. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)

## 3. 权限

| 接口 | 权限 |
|---|---|
| 列表/详情 | `review.read` |
| 单条通过/驳回 | `review.decide` |
| 批量通过/驳回 | `review.decide` |

## 4. 列表接口

### 4.1 `GET /api/console/dictionary/reviews`

查询参数：

1. `taskType`
2. `targetType`
3. `status`
4. `importJobId`
5. `submittedBy`
6. `reviewedBy`
7. `page`
8. `pageSize`

作用：

1. 查询词条审核任务列表。

输出通常包含：

1. `items`
2. `summary`
3. `importJobContext`

### 4.2 `GET /api/console/dictionary/reviews/{taskId}`

作用：

1. 查看单个审核任务详情。

典型输出：

1. `basic`
2. `targetSummary`
3. `targetSnapshot`
4. `sourceContext`
5. `conflictSummary`

## 5. 单条决策接口

### 5.1 `POST /api/console/dictionary/reviews/{taskId}/approve`

作用：

1. 审核通过。

副作用：

1. `term_review`
   - 词条状态切到 `approved`
2. `pinyin_candidate_review`
   - 写拼音备用读音
3. `release_publish_review`
   - 仅推进审批结果

### 5.2 `POST /api/console/dictionary/reviews/{taskId}/reject`

请求字段：

1. `comment`

副作用：

1. `term_review`
   - 词条状态回到 `draft`

## 6. 批量接口

### 6.1 `POST /api/console/dictionary/reviews/batch-approve`

### 6.2 `POST /api/console/dictionary/reviews/batch-reject`

当前作用域支持：

1. `selected_tasks`
2. `current_filter`
3. `import_job`

当前关键约束：

1. 当前批量审核只支持 `term_review + term`。
2. 非 `pending` 任务会被跳过。

## 7. 常见错误码

| 错误码 | 场景 |
|---|---|
| `review task not found` | 任务不存在 |
| `review_batch_scope_invalid` | 批量范围不合法 |
| `review_batch_task_ids_required` | 选中任务范围未提供 taskIds |
| `review_batch_import_job_id_required` | 批次范围未提供 importJobId |

## 8. 相关测试

至少覆盖：

1. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
2. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
3. [`console-workflows.test.js`](/Codex/ACDP/prototype/tests/unit/console-workflows.test.js)
