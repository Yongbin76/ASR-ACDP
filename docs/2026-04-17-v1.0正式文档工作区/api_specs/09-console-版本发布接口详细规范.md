# console 版本发布接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`/api/console/releases*`、`/api/console/gray-policies`

## 1. 覆盖范围

本文档覆盖：

1. `GET /api/console/releases`
2. `GET /api/console/releases/{releaseId}`
3. `GET /api/console/releases/{releaseId}/gate`
4. `GET /api/console/releases/{releaseId}/validation`
5. `POST /api/console/releases/build`
6. `POST /api/console/releases/{releaseId}/submit-review`
7. `POST /api/console/releases/{releaseId}/publish`
8. `POST /api/console/releases/{releaseId}/rollback`
9. `POST /api/console/gray-policies`

## 2. 权限

| 接口 | 权限 |
|---|---|
| 列表/详情/gate/validation | `release.read` |
| build | `release.build` |
| submit review | `release.review.submit` |
| publish | `release.publish` |
| rollback | `release.rollback` |
| gray policy | `gray.write` |

## 3. 列表与详情

### 3.1 `GET /api/console/releases`

查询参数：

1. `view`
2. `status`
3. `page`
4. `pageSize`

作用：

1. 返回 release 列表。
2. 支持 `list/review/canary/risk/rollback` 视图切分。

### 3.2 `GET /api/console/releases/{releaseId}`

作用：

1. 返回 release 详情。

典型输出区块：

1. `release`
2. `approval`
3. `releaseState`
4. `trafficState`
5. `rollout`
6. `confirmation`
7. `gate`
8. `validation`

### 3.3 `GET /api/console/releases/{releaseId}/gate`

作用：

1. 返回 release 门禁详情。

### 3.4 `GET /api/console/releases/{releaseId}/validation`

作用：

1. 返回 release 验证详情。

## 4. build 与审批

### 4.1 `POST /api/console/releases/build`

请求字段：

1. `summary`

作用：

1. 基于当前 buildable 词条构建 release。

### 4.2 `POST /api/console/releases/{releaseId}/submit-review`

请求字段：

1. `comment`

作用：

1. 提交发布审核任务。

## 5. 灰度、发布与回滚

### 5.1 `POST /api/console/gray-policies`

关键字段：

1. `releaseId`
2. `scopeType`
3. `percentage`

副作用：

1. 创建新灰度策略。
2. 关闭旧启用中的灰度策略。
3. `refreshRuntimeState()`

### 5.2 `POST /api/console/releases/{releaseId}/publish`

副作用：

1. 检查 release 是否满足 exposure 条件。
2. 激活 published release。
3. 刷新 runtime state。

### 5.3 `POST /api/console/releases/{releaseId}/rollback`

请求字段：

1. `reason`

副作用：

1. 激活目标 release 作为 published。
2. 刷新 runtime state。

## 6. 常见错误

| 错误码 | 场景 |
|---|---|
| `release_status_invalid` | 当前状态不允许提审 |
| `release_review_submitter_conflict` | 提交人与审核人冲突 |
| `release_review_duplicate_reviewer` | 双人审批时审核人重复 |
| `release_gate_blocked` | 门禁未通过 |

## 7. 相关测试

至少覆盖：

1. [`release-gates.test.js`](/Codex/ACDP/prototype/tests/unit/release-gates.test.js)
2. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
3. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
4. [`console-workflows.test.js`](/Codex/ACDP/prototype/tests/unit/console-workflows.test.js)
