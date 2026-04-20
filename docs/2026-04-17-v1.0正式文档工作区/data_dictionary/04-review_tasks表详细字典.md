# `review_tasks` 表详细字典

- 文档状态：active
- 适用版本：v1.0
- 文档类型：data_dictionary
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-17
- 责任对象：`review_tasks`

## 1. 表作用

`review_tasks` 是 ACDP 审核链的统一原子对象。

无论是：

1. 词条审核
2. 拼音候选审核
3. 发布审核

最终都落在这张表。

## 2. 建表来源

建表代码位于：

[`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)

## 3. 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `task_id` | `TEXT` | 否 | 无 | `PRIMARY KEY` | 审核任务 ID |
| `task_type` | `TEXT` | 否 | 无 | - | 任务类型 |
| `target_type` | `TEXT` | 否 | 无 | - | 目标类型 |
| `target_id` | `TEXT` | 否 | 无 | - | 目标对象 ID |
| `status` | `TEXT` | 否 | 无 | - | 审核状态 |
| `submitted_by` | `TEXT` | 否 | 无 | - | 提交人 |
| `reviewed_by` | `TEXT` | 是 | `NULL` | - | 审核人 |
| `comment` | `TEXT` | 是 | `NULL` | - | 备注 |
| `target_snapshot` | `TEXT` | 是 | `NULL` | - | 审核快照 JSON |
| `created_at` | `TEXT` | 否 | 无 | - | 创建时间 |
| `reviewed_at` | `TEXT` | 是 | `NULL` | - | 审核时间 |

## 4. 任务类型

当前核心任务类型：

1. `term_review`
2. `pinyin_candidate_review`
3. `release_publish_review`

## 5. 目标类型

当前核心目标类型：

1. `term`
2. `pinyin_candidate`
3. `release`

## 6. 审核状态

当前核心状态：

1. `pending`
2. `approved`
3. `rejected`

## 7. 索引

当前显式索引：

1. `idx_reviews_status`
2. `idx_reviews_target`
3. `idx_reviews_status_target`
4. `idx_reviews_status_pinyin_term`

说明：

1. 既支持按状态查任务。
2. 也支持按目标对象查当前任务。
3. 还支持按拼音候选任务中的 `termId` 做辅助查询。

## 8. 写入路径

核心写入函数：

1. `createReviewTask()`
2. `submitTermReview()`
3. `submitPinyinCandidateReview()`
4. `submitReleaseReview()`

核心状态更新函数：

1. `approveReviewTask()`
2. `rejectReviewTask()`
3. `batchApproveReviewTasks()`
4. `batchRejectReviewTasks()`

## 9. 副作用

### 9.1 `term_review`

1. 提交时：
   - 词条状态切到 `pending_review`
2. 通过时：
   - 词条状态切到 `approved`
3. 驳回时：
   - 词条状态回到 `draft`

### 9.2 `pinyin_candidate_review`

通过时：

1. 若候选读音不在当前画像中，则写入 `pinyin_profiles.alternative_readings_json`

### 9.3 `release_publish_review`

通过时：

1. 不直接改 release 生命周期状态。
2. 只改变审批进度与审批结果。

## 10. 典型案例

### 10.1 词条审核任务

```json
{
  "task_id": "review_001",
  "task_type": "term_review",
  "target_type": "term",
  "target_id": "term_001",
  "status": "pending",
  "submitted_by": "editor_user",
  "reviewed_by": null,
  "comment": "submit review",
  "created_at": "2026-04-17T10:10:00.000Z",
  "reviewed_at": null
}
```

### 10.2 发布审核任务

```json
{
  "task_id": "review_002",
  "task_type": "release_publish_review",
  "target_type": "release",
  "target_id": "rel_001",
  "status": "approved",
  "submitted_by": "publisher_user",
  "reviewed_by": "reviewer_user",
  "comment": "",
  "created_at": "2026-04-17T12:00:00.000Z",
  "reviewed_at": "2026-04-17T12:10:00.000Z"
}
```

## 11. 关键约束

1. 同一词条如果已有 `pending` 的 `term_review`，再次提交会复用已有任务。
2. 发布审核受治理策略控制：
   - 提交人与审核人分离
   - 可要求不同审核人完成双人审批
3. 批量审核当前只支持 `term_review`。

## 12. 必须同步的代码与测试

代码：

1. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
2. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)
3. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)

测试：

1. [`platform-db.test.js`](/Codex/ACDP/prototype/tests/unit/platform-db.test.js)
2. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
3. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
4. [`console-workflows.test.js`](/Codex/ACDP/prototype/tests/unit/console-workflows.test.js)
