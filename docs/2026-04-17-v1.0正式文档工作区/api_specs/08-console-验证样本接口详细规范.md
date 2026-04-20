# console 验证样本接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`/api/console/validation/cases*`

## 1. 覆盖范围

本文档覆盖：

1. `GET /api/console/validation/cases`
2. `GET /api/console/validation/cases/export`
3. `GET /api/console/validation/cases/{caseId}`
4. `GET /api/console/validation/cases/{caseId}/related-terms`
5. `POST /api/console/validation/cases`
6. `POST /api/console/validation/cases/import`
7. `POST /api/console/validation/cases/{caseId}/disable`
8. `POST /api/console/validation/cases/batch-disable`

## 2. 权限

| 接口类别 | 权限 |
|---|---|
| 查看/导出/详情 | `validation.read` |
| 创建/导入/停用 | `validation.write` |

## 3. 列表与导出

### 3.1 `GET /api/console/validation/cases`

查询参数：

1. `enabled`
2. `sourceType`
3. `query`
4. `page`
5. `pageSize`

### 3.2 `GET /api/console/validation/cases/export`

导出列：

1. `caseId`
2. `description`
3. `text`
4. `expectedCanonicals`
5. `enabled`
6. `sourceType`
7. `notes`
8. `updatedAt`

## 4. 详情与关联词条

### 4.1 `GET /api/console/validation/cases/{caseId}`

作用：

1. 查看单个样本详情。

### 4.2 `GET /api/console/validation/cases/{caseId}/related-terms`

作用：

1. 返回和该样本期望标准词相关联的词条。

## 5. 创建与导入

### 5.1 `POST /api/console/validation/cases`

关键字段：

1. `caseId`
2. `description`
3. `text`
4. `expectedCanonicals`
5. `sourceType`
6. `notes`

约束：

1. `text` 必填
2. `expectedCanonicals` 至少一个值

### 5.2 `POST /api/console/validation/cases/import`

作用：

1. 批量导入样本。

支持：

1. `upsert`
2. `insert_only`

## 6. 停用接口

### 6.1 `POST /api/console/validation/cases/{caseId}/disable`

### 6.2 `POST /api/console/validation/cases/batch-disable`

说明：

1. 单条和批量停用最终都更新 `enabled = 0`。

## 7. 相关测试

至少覆盖：

1. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
2. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
3. [`validation-feed.test.js`](/Codex/ACDP/prototype/tests/unit/validation-feed.test.js)
