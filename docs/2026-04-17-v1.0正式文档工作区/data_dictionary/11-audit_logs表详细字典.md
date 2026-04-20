# `audit_logs` 表详细字典

- 文档状态：active
- 适用版本：v1.0
- 文档类型：data_dictionary
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`audit_logs`

## 1. 表作用

`audit_logs` 用于记录关键业务动作的前后快照。

当前系统里，大部分高风险写操作都会通过 `appendAudit()` 写这张表。

## 2. 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `audit_id` | `TEXT` | 否 | 无 | `PRIMARY KEY` | 审计主键 |
| `request_id` | `TEXT` | 是 | `NULL` | - | 请求 ID |
| `operator` | `TEXT` | 否 | 无 | - | 操作人 |
| `operation` | `TEXT` | 否 | 无 | - | 操作类型 |
| `target_type` | `TEXT` | 否 | 无 | - | 目标类型 |
| `target_id` | `TEXT` | 否 | 无 | - | 目标对象 ID |
| `before_snapshot` | `TEXT` | 是 | `NULL` | - | 变更前快照 JSON |
| `after_snapshot` | `TEXT` | 是 | `NULL` | - | 变更后快照 JSON |
| `note` | `TEXT` | 是 | `NULL` | - | 备注 |
| `created_at` | `TEXT` | 否 | 无 | - | 创建时间 |

## 3. 索引

当前显式索引：

1. `idx_audits_created` on `created_at DESC`
2. `idx_audits_target` on `(target_type, target_id)`

## 4. 典型 `operation`

当前常见操作类型包括：

1. `term.create`
2. `term.update`
3. `term.status.update`
4. `term.rules.update`
5. `term.pinyin.update`
6. `review.create`
7. `review.approve`
8. `review.reject`
9. `release.create`
10. `gray.disable`
11. `runtime_control.set_desired_version`
12. `validation_case.*`

## 5. 写入路径

大部分写入由：

1. `appendAudit()`

在以下业务函数内部调用：

1. `createTerm()`
2. `updateTerm()`
3. `updateTermStatus()`
4. `upsertTermRules()`
5. `upsertTermPinyinProfile()`
6. `createReviewTask()`
7. `approveReviewTask()`
8. `rejectReviewTask()`
9. `createRelease()`
10. `disableGrayPolicy()`
11. `setRuntimeDesiredRelease()`
12. validation case 相关写入函数

## 6. 读取路径

主要读取函数：

1. `listAuditLogs()`

当前消费位置：

1. `/api/admin/audits`
2. 管理端审计相关页面与后续排查

## 7. 典型案例

```json
{
  "audit_id": "audit_001",
  "operator": "editor_user",
  "operation": "term.update",
  "target_type": "term",
  "target_id": "term_001",
  "before_snapshot": {
    "status": "draft"
  },
  "after_snapshot": {
    "status": "pending_review"
  },
  "note": "submit review",
  "created_at": "2026-04-18T10:00:00.000Z"
}
```

解释：

1. 审计不是单独的业务主语，而是附属留痕。
2. `before_snapshot` / `after_snapshot` 是否有值，取决于具体操作。

## 8. 关键约束

1. 审计是追加写，不做就地更新。
2. 快照字段采用 JSON 文本保存。
3. 如果关键高风险动作未写审计，就会破坏追溯链。

## 9. 修改风险

1. 改审计字段会影响历史追溯和页面读取。
2. 改 `operation` 命名规则会影响查询和筛选口径。

## 10. 必须同步的代码与测试

代码：

1. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
2. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)

测试：

1. [`platform-db.test.js`](/Codex/ACDP/prototype/tests/unit/platform-db.test.js)
2. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
