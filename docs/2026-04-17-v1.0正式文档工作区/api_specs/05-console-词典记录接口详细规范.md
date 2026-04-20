# console 词典记录接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`/api/console/dictionary/terms*`

## 1. 覆盖范围

本文档覆盖：

1. `GET /api/console/dictionary/terms`
2. `GET /api/console/dictionary/terms/export`
3. `GET /api/console/dictionary/terms/{termId}`
4. `GET /api/console/dictionary/terms/{termId}/validation-cases`
5. `POST /api/console/dictionary/terms`
6. `PUT /api/console/dictionary/terms/{termId}`
7. `POST /api/console/dictionary/terms/{termId}/submit-review`
8. `POST /api/console/dictionary/terms/{termId}/disable`
9. `POST /api/console/dictionary/terms/batch-submit-review`
10. `POST /api/console/dictionary/terms/batch-disable`
11. `POST /api/console/dictionary/terms/{termId}/generate-pinyin-candidates`
12. `POST /api/console/dictionary/terms/{termId}/pinyin-candidates`

旧别名路由 `/api/console/terms*` 仍兼容，但当前正式口径以 `dictionary/terms` 为准。

## 2. 代码入口

主要代码文件：

1. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)
2. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
3. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)
4. [`term-admission.js`](/Codex/ACDP/prototype/src/lib/term-admission.js)

## 3. 权限点

| 接口类别 | 权限 |
|---|---|
| 列表/详情/导出 | `term.read` |
| 创建/更新 | `term.write` |
| 提交审核 | `term.review.submit` |
| 停用 | `term.review.decide` |
| 批量提交审核 | `term.review.submit` |
| 批量停用 | `term.review.decide` |
| 生成拼音候选 | `pinyin.candidate.generate` |
| 提交拼音候选审核 | `pinyin.candidate.submit` |

## 4. 列表接口

### 4.1 `GET /api/console/dictionary/terms`

#### 查询参数

| 参数 | 类型 | 默认值 | 含义 |
|---|---|---|---|
| `page` | `number` | `1` | 页码 |
| `pageSize` | `number` | `20` | 每页大小 |
| `query` | `string` | `''` | 关键字 |
| `categoryCode` | `string` | `''` | 业务属性 |
| `status` | `string` | `''` | 词条状态 |
| `sourceType` | `string` | `''` | 来源类型 |
| `riskLevel` | `string` | `''` | 风险等级 |
| `sortBy` | `string` | `updated_at` | 排序字段 |
| `sortDirection` | `string` | `desc` | 排序方向 |

#### 返回结构

通常包含：

1. `items`
2. `summary`
3. `total`
4. `page`
5. `pageSize`

### 4.2 `GET /api/console/dictionary/terms/export`

作用：

1. 按当前筛选条件导出词典记录 CSV。

导出列：

1. `termId`
2. `categoryCode`
3. `canonicalText`
4. `status`
5. `sourceType`
6. `riskLevel`
7. `priority`
8. `aliases`
9. `updatedAt`

## 5. 详情与关联样本

### 5.1 `GET /api/console/dictionary/terms/{termId}`

作用：

1. 查看词条详情。

典型输出区块：

1. `basic`
2. `rules`
3. `pinyinProfile`
4. `reviewSummary`
5. `sourceContext`

### 5.2 `GET /api/console/dictionary/terms/{termId}/validation-cases`

作用：

1. 查看关联验证样本。

当前实现：

1. 取启用中的样本。
2. 过滤 `expectedCanonicals` 中包含当前标准词的记录。

## 6. 创建与更新

### 6.1 `POST /api/console/dictionary/terms`

#### 关键请求字段

| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `categoryCode` | `string` | 是 | 业务属性 |
| `canonicalText` | `string` | 是 | 标准词 |
| `aliases` | `string[]` | 否 | 错误词 / 别名 |
| `priority` | `number` | 否 | 优先级 |
| `riskLevel` | `string` | 否 | 风险等级 |
| `replaceMode` | `string` | 否 | 替换模式 |
| `baseConfidence` | `number` | 否 | 基础置信度 |
| `sourceType` | `string` | 否 | 来源类型 |
| `pinyinRuntimeMode` | `string` | 否 | 拼音运行模式 |
| `rules` | `object` | 否 | 规则对象 |
| `pinyinProfile` | `object` | 否 | 拼音画像 |

#### 副作用

1. 进入统一准入校验。
2. 通过后写入 `terms/aliases/term_rules/pinyin_profiles`。

### 6.2 `PUT /api/console/dictionary/terms/{termId}`

作用：

1. 更新现有词条。

副作用：

1. 更新主表。
2. 替换别名集合。
3. 更新规则和拼音画像。
4. `revision` 自增。

## 7. 审核动作

### 7.1 `POST /api/console/dictionary/terms/{termId}/submit-review`

作用：

1. 提交词条审核任务。

副作用：

1. 执行准入摘要校验。
2. 词条状态切到 `pending_review`。
3. 创建或复用 `term_review` 任务。

### 7.2 `POST /api/console/dictionary/terms/{termId}/disable`

作用：

1. 直接停用词条。

副作用：

1. 调用 `updateTermStatus(..., 'disabled')`

### 7.3 批量接口

1. `POST /batch-submit-review`
2. `POST /batch-disable`

说明：

1. 若未显式传 `termIds`，会回落到当前筛选结果。
2. 这是高风险批量动作。

## 8. 拼音候选接口

### 8.1 `POST /generate-pinyin-candidates`

请求字段：

1. `limit`

输出：

1. 当前词条的候选读音列表。

### 8.2 `POST /pinyin-candidates`

作用：

1. 提交某个候选读音进入审核任务。

副作用：

1. 创建 `pinyin_candidate_review`

## 9. 常见错误码

| 错误码 | 场景 |
|---|---|
| `term not found` | 词条不存在 |
| `term_admission_blocked` | 准入规则阻断 |
| `term_review_status_invalid` | 当前状态不允许提交审核 |
| `pinyin_candidate_not_found` | 指定候选读音不存在 |

## 10. 相关测试

至少覆盖：

1. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
2. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
3. [`console-workflows.test.js`](/Codex/ACDP/prototype/tests/unit/console-workflows.test.js)
4. [`term-admission.test.js`](/Codex/ACDP/prototype/tests/unit/term-admission.test.js)
