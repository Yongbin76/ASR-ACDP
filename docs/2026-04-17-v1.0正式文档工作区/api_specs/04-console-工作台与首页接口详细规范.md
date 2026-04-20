# console 工作台与首页接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`/api/console/overview`、`/api/console/workbench`

## 1. 覆盖范围

本文档覆盖：

1. `GET /api/console/overview`
2. `GET /api/console/workbench`

## 2. 代码入口

主要代码文件：

1. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)
2. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)

核心聚合函数：

1. `context.getConsoleOverview(db)`
2. `getConsoleWorkbench(db, appConfig, auth)`

## 3. 权限

### 3.1 `/api/console/overview`

权限：

1. `dashboard.read`

### 3.2 `/api/console/workbench`

权限：

1. `dashboard.read`

## 4. `GET /api/console/overview`

### 4.1 作用

返回首页概览指标。

### 4.2 主要输出内容

当前首页摘要主要围绕：

1. 待处理审核数
2. 待确认导入批次数
3. 阻塞发布数
4. 离线节点数
5. 当前版本摘要

### 4.3 典型响应结构

```json
{
  "item": {
    "pendingReviewCount": 12,
    "pendingImportJobCount": 2,
    "blockedReleaseCount": 1,
    "offlineRuntimeNodeCount": 0
  }
}
```

### 4.4 说明

1. `overview` 偏摘要，不承载复杂下一步引导。
2. 更细的待办、风险和高亮逻辑放在 `workbench`。

## 5. `GET /api/console/workbench`

### 5.1 作用

返回工作台级待办与异常聚合结果。

### 5.2 输出内容

当前工作台主要输出：

1. `summary`
2. `highlights`
3. `pendingItems`
4. `runtimeIssues`
5. `quickActions`

### 5.3 典型响应结构

```json
{
  "item": {
    "summary": {
      "pendingReviewCount": 12,
      "pendingImportJobCount": 2,
      "blockedReleaseCount": 1,
      "offlineRuntimeNodeCount": 0
    },
    "highlights": [
      {
        "title": "优先处理待审核词条",
        "href": "/console/dictionary/reviews"
      }
    ]
  }
}
```

### 5.4 主要依赖

工作台会聚合：

1. `review_tasks`
2. `import_jobs`
3. `releases`
4. `runtime_nodes`
5. `validation_cases`

### 5.5 改动风险

1. 改 `workbench` 输出字段会直接影响 `/console` 首页渲染。
2. 工作台是高聚合页，增加字段时要注意查询成本。

## 6. 错误语义

当前常见错误：

1. 鉴权失败
2. 页面聚合异常导致的 `500`

## 7. 相关测试

至少覆盖：

1. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
2. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
3. [`console-workflows.test.js`](/Codex/ACDP/prototype/tests/unit/console-workflows.test.js)
