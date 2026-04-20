# `terms` 表详细字典

- 文档状态：active
- 适用版本：v1.0
- 文档类型：data_dictionary
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-17
- 责任对象：`terms` 主表

## 1. 表作用

`terms` 是 ACDP 词典建设域的标准词主表。

系统中的词典记录主语义都围绕这张表展开：

1. 标准词本身。
2. 审核状态。
3. 发布入池资格。
4. runtime 最终替换目标。

## 2. 建表来源

建表代码位于：

[`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)

具体位置：

- `openDatabase()` 中的 `CREATE TABLE IF NOT EXISTS terms`

## 3. 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `term_id` | `TEXT` | 否 | 无 | `PRIMARY KEY` | 词条主键 |
| `category_code` | `TEXT` | 否 | 无 | - | 业务属性 / 类别编码 |
| `canonical_text` | `TEXT` | 否 | 无 | - | 标准词文本 |
| `status` | `TEXT` | 否 | 无 | - | 词条状态 |
| `priority` | `INTEGER` | 否 | 无 | - | 优先级，参与词典排序和规则权重 |
| `risk_level` | `TEXT` | 否 | 无 | - | 风险等级 |
| `replace_mode` | `TEXT` | 否 | 无 | - | runtime 输出策略 |
| `base_confidence` | `REAL` | 否 | 无 | - | 基础置信度 |
| `source_type` | `TEXT` | 否 | 无 | - | 来源类型 |
| `pinyin_runtime_mode` | `TEXT` | 否 | 无 | - | 拼音运行模式 |
| `revision` | `INTEGER` | 否 | `1` | - | 词条修订号 |
| `created_at` | `TEXT` | 否 | 无 | - | 创建时间 ISO 字符串 |
| `updated_at` | `TEXT` | 否 | 无 | - | 更新时间 ISO 字符串 |

## 4. 字段值范围

### 4.1 `status`

当前常见值：

1. `draft`
2. `pending_review`
3. `approved`
4. `disabled`

说明：

1. `draft`
   - 已创建，但未通过审核。
2. `pending_review`
   - 已提交审核，等待审核结果。
3. `approved`
   - 已通过审核，可进入 release 构建输入池。
4. `disabled`
   - 已停用，不应继续作为正常可发布词条。

### 4.2 `risk_level`

当前常见值：

1. `low`
2. `medium`
3. `high`

### 4.3 `replace_mode`

当前常见值：

1. `replace`
2. `candidate`
3. `block`

含义：

1. `replace`
   - 允许直接替换。
2. `candidate`
   - 仅作为候选输出。
3. `block`
   - 命中后阻断。

### 4.4 `pinyin_runtime_mode`

当前常见值：

1. `off`
2. `candidate`
3. `replace`

## 5. 索引与约束

当前显式索引：

1. `idx_terms_category` on `category_code`
2. `idx_terms_status` on `status`
3. `idx_terms_canonical` on `canonical_text`

当前没有数据库级唯一约束来限制：

1. `(category_code, canonical_text)` 的重复创建

这类冲突当前主要由业务逻辑层识别，而不是由数据库强约束阻断。

## 6. 写入路径

直接写入或更新 `terms` 的主要函数：

1. `createTerm()`
2. `updateTerm()`
3. `updateTermStatus()`
4. `upsertImportedTerm()`

间接影响 `terms.status` 的主要函数：

1. `submitTermReview()`
2. `approveReviewTask()`
3. `rejectReviewTask()`
4. `batchDisableTerms()`

## 7. 读取路径

直接读取 `terms` 的主要函数：

1. `getTerm()`
2. `listTerms()`
3. `listTermIdsByFilters()`
4. `getBuildableTerms()`

聚合读取的主要调用点：

1. `console-service.js`
2. `release-gates.js`
3. `runtime snapshot build` 相关逻辑

## 8. 典型案例

### 8.1 手工创建后的初始记录

```json
{
  "term_id": "term_001",
  "category_code": "gov_term",
  "canonical_text": "工伤认定",
  "status": "draft",
  "priority": 92,
  "risk_level": "medium",
  "replace_mode": "replace",
  "base_confidence": 0.94,
  "source_type": "manual",
  "pinyin_runtime_mode": "candidate",
  "revision": 1,
  "created_at": "2026-04-17T10:00:00.000Z",
  "updated_at": "2026-04-17T10:00:00.000Z"
}
```

解释：

1. 新建词条默认先进入 `draft`。
2. 后续提交审核后，状态会切到 `pending_review`。

### 8.2 审核通过后的记录

```json
{
  "term_id": "term_001",
  "category_code": "gov_term",
  "canonical_text": "工伤认定",
  "status": "approved",
  "priority": 92,
  "risk_level": "medium",
  "replace_mode": "replace",
  "base_confidence": 0.94,
  "source_type": "manual",
  "pinyin_runtime_mode": "candidate",
  "revision": 1,
  "created_at": "2026-04-17T10:00:00.000Z",
  "updated_at": "2026-04-17T10:20:00.000Z"
}
```

解释：

1. `approved` 代表已可进入 build 输入池。
2. release 构建时，`getBuildableTerms()` 会从可发布口径中挑出这类词条。

## 9. 修改本表时必须同步的代码

至少同步检查：

1. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
2. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)
3. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)
4. 词条创建 / 编辑 / 审核相关前端页面
5. release build 和 release gate 逻辑

## 10. 修改本表时必须回归的测试

至少回归：

1. [`platform-db.test.js`](/Codex/ACDP/prototype/tests/unit/platform-db.test.js)
2. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
3. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
4. [`console-workflows.test.js`](/Codex/ACDP/prototype/tests/unit/console-workflows.test.js)
5. [`term-admission.test.js`](/Codex/ACDP/prototype/tests/unit/term-admission.test.js)

## 11. 改造风险

1. 改 `status` 的取值或迁移规则，会同时影响：
   - 词条审核
   - release gate
   - build 输入池
   - 页面状态渲染
2. 改 `replace_mode`，会直接影响 runtime 行为。
3. 改 `category_code` 口径，会影响基础配置和导入逻辑。
4. 改 `revision` 逻辑，会影响“已审核版本是否仍有效”的判断。
