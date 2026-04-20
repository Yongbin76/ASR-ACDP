# `releases` 与 `gray_policies` 表详细字典

- 文档状态：active
- 适用版本：v1.0
- 文档类型：data_dictionary
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`releases`、`release_terms`、`gray_policies`

## 1. 表组作用

这组三张表共同定义版本发布域：

1. `releases`
   - version 主对象
2. `release_terms`
   - release 与词条关系
3. `gray_policies`
   - 灰度发布策略

## 2. `releases`

### 2.1 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `release_id` | `TEXT` | 否 | 无 | `PRIMARY KEY` | release 主键 |
| `version` | `TEXT` | 否 | 无 | - | 版本号 |
| `status` | `TEXT` | 否 | 无 | - | 生命周期状态 |
| `summary` | `TEXT` | 否 | 无 | - | 版本摘要 |
| `artifact_dir` | `TEXT` | 否 | 无 | - | 制品目录 |
| `snapshot_path` | `TEXT` | 否 | 无 | - | snapshot 路径 |
| `manifest_path` | `TEXT` | 否 | 无 | - | manifest 路径 |
| `term_count` | `INTEGER` | 否 | 无 | - | 词条数 |
| `created_at` | `TEXT` | 否 | 无 | - | 创建时间 |
| `published_at` | `TEXT` | 是 | `NULL` | - | 正式发布时间 |

### 2.2 状态

当前常见值：

1. `built`
2. `canary`
3. `published`

## 3. `release_terms`

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `id` | `INTEGER` | 否 | 自增 | `PRIMARY KEY AUTOINCREMENT` | 关系行主键 |
| `release_id` | `TEXT` | 否 | 无 | `FOREIGN KEY -> releases(release_id)` | release ID |
| `term_id` | `TEXT` | 否 | 无 | `FOREIGN KEY -> terms(term_id)` | 词条 ID |

当前索引：

1. `idx_release_terms_release`
2. `idx_release_terms_term`

## 4. `gray_policies`

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `policy_id` | `TEXT` | 否 | 无 | `PRIMARY KEY` | 灰度策略主键 |
| `release_id` | `TEXT` | 否 | 无 | `FOREIGN KEY -> releases(release_id)` | 对应 release |
| `scope_type` | `TEXT` | 否 | 无 | - | 灰度范围类型 |
| `percentage` | `INTEGER` | 否 | 无 | - | 灰度百分比 |
| `enabled` | `INTEGER` | 否 | `1` | - | 是否启用 |
| `created_by` | `TEXT` | 否 | 无 | - | 创建人 |
| `created_at` | `TEXT` | 否 | 无 | - | 创建时间 |
| `updated_at` | `TEXT` | 否 | 无 | - | 更新时间 |

当前索引：

1. `idx_gray_enabled`

## 5. 写入路径

主要写入函数：

1. `createRelease()`
2. `createGrayPolicy()`
3. `disableGrayPolicy()`
4. `setRuntimeDesiredRelease()` 读取 release 并写控制状态

## 6. 读取路径

主要读取函数：

1. `getRelease()`
2. `listReleases()`
3. `listReleasesPaged()`
4. `getCurrentPublishedRelease()`
5. `getCurrentCanaryRelease()`
6. `listReleaseTerms()`
7. `getActiveGrayPolicy()`

主要消费位置：

1. `/console/releases`
2. release detail
3. runtime 当前版本与灰度信息
4. runtime 分流逻辑

## 7. 典型案例

### 7.1 已构建 release

```json
{
  "release_id": "rel_001",
  "version": "v1.0.0",
  "status": "built",
  "summary": "manual build",
  "artifact_dir": "prototype/workspace/releases/rel_001",
  "snapshot_path": "prototype/workspace/releases/rel_001/snapshot.json",
  "manifest_path": "prototype/workspace/releases/rel_001/manifest.json",
  "term_count": 120,
  "created_at": "2026-04-17T15:00:00.000Z",
  "published_at": null
}
```

### 7.2 启用中的灰度策略

```json
{
  "policy_id": "gray_001",
  "release_id": "rel_001",
  "scope_type": "percentage",
  "percentage": 10,
  "enabled": 1,
  "created_by": "operator_user",
  "created_at": "2026-04-17T15:10:00.000Z",
  "updated_at": "2026-04-17T15:10:00.000Z"
}
```

解释：

1. `rel_001` 进入 canary 后，10% 命中的 `trafficKey` 会路由到 canary。

## 8. 关键约束

1. `release` 生命周期只表示版本状态，不表示审批状态。
2. 灰度策略当前以“启用中的唯一策略”为主。
3. 正式发布后仍可有风险观察，但 release 生命周期状态仍是 `published`。

## 9. 修改风险

1. 改 `status` 取值会影响：
   - 列表页筛选
   - 审批逻辑
   - canary / published 判断
2. 改 `gray_policies` 结构会影响：
   - runtime 分流
   - 节点当前版本展示

## 10. 必须同步的代码与测试

代码：

1. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
2. [`release-gates.js`](/Codex/ACDP/prototype/src/lib/release-gates.js)
3. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)
4. [`server.js`](/Codex/ACDP/prototype/src/server.js)

测试：

1. [`release-gates.test.js`](/Codex/ACDP/prototype/tests/unit/release-gates.test.js)
2. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
3. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
4. [`console-workflows.test.js`](/Codex/ACDP/prototype/tests/unit/console-workflows.test.js)
