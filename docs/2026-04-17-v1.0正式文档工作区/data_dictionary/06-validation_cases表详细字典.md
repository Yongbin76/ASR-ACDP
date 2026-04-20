# `validation_cases` 表详细字典

- 文档状态：active
- 适用版本：v1.0
- 文档类型：data_dictionary
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`validation_cases`

## 1. 表作用

`validation_cases` 是验证与回流域的主表。

它承担三类用途：

1. 存储业务验证样本。
2. 为 release gate / 发布后风险提供验证输入。
3. 承接手工录入、CSV 导入与外部回流三类来源。

## 2. 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `case_id` | `TEXT` | 否 | 无 | `PRIMARY KEY` | 样本 ID |
| `description` | `TEXT` | 否 | 无 | - | 样本描述 |
| `sample_text` | `TEXT` | 否 | 无 | - | 原始文本 |
| `expected_canonicals_json` | `TEXT` | 否 | 无 | - | 期望标准词数组 JSON |
| `enabled` | `INTEGER` | 否 | `1` | - | 是否启用 |
| `source_type` | `TEXT` | 否 | `manual` | - | 来源类型 |
| `notes` | `TEXT` | 否 | `''` | - | 备注 |
| `created_at` | `TEXT` | 否 | 无 | - | 创建时间 |
| `updated_at` | `TEXT` | 否 | 无 | - | 更新时间 |

## 3. 状态与来源

### 3.1 `enabled`

当前业务语义：

1. `1`
   - 启用，参与现行验证与 gate。
2. `0`
   - 停用，仅保留追溯。

### 3.2 `source_type`

当前常见值：

1. `manual`
2. `validation_import`
3. `qa_feedback`
4. `cg3`
5. `online_feedback`

## 4. 索引

当前显式索引：

1. `idx_validation_enabled` on `enabled`

## 5. 写入路径

主要写入函数：

1. `createValidationCase()`
2. `upsertValidationCase()`
3. `importValidationCases()`
4. `disableValidationCase()`
5. `batchDisableValidationCases()`
6. `validation-feed-importer.js` 相关导入链路

## 6. 读取路径

主要读取函数：

1. `listValidationCases()`
2. `listValidationCasesPaged()`
3. `listValidationCasesWithoutKnownCanonicals()`
4. `listAllValidationCasesByFilters()`
5. `countEnabledValidationCasesByCanonicalTexts()`

主要消费位置：

1. `/console/validation/cases`
2. release gate
3. 发布后风险观察
4. 工作台“待关注样本”

## 7. 典型案例

```json
{
  "case_id": "qa-feedback-001",
  "description": "工伤认定误识别样本",
  "sample_text": "我想了解工商认定的办理材料。",
  "expected_canonicals_json": "[\"工伤认定\"]",
  "enabled": 1,
  "source_type": "qa_feedback",
  "notes": "reported by qa replay",
  "created_at": "2026-04-17T14:00:00.000Z",
  "updated_at": "2026-04-17T14:00:00.000Z"
}
```

解释：

1. 该样本来自 QA 回流。
2. 当前启用，参与验证。
3. 期望标准词是 `工伤认定`。

## 8. 关键约束

1. `sample_text` 必填。
2. `expectedCanonicals` 至少要有一个值。
3. `source_type` 需要通过来源类型配置校验。
4. 样本启用后可能直接影响 release gate 结果。

## 9. 修改风险

1. 改样本文本字段会影响：
   - 样本导入
   - gate 逻辑
   - 页面展示
2. 改 `enabled` 语义会影响所有 release gate 统计。
3. 改 `source_type` 口径会影响 validation feed 导入链。

## 10. 必须同步的代码与测试

代码：

1. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
2. [`validation-feed-importer.js`](/Codex/ACDP/prototype/src/lib/validation-feed-importer.js)
3. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)
4. [`release-gates.js`](/Codex/ACDP/prototype/src/lib/release-gates.js)

测试：

1. [`validation-feed.test.js`](/Codex/ACDP/prototype/tests/unit/validation-feed.test.js)
2. [`validation-feed-verify.test.js`](/Codex/ACDP/prototype/tests/unit/validation-feed-verify.test.js)
3. [`release-gates.test.js`](/Codex/ACDP/prototype/tests/unit/release-gates.test.js)
4. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
