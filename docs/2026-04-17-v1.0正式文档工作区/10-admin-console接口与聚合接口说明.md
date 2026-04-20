# ACDP admin / console 接口与聚合接口说明

- 文档状态：active
- 适用版本：v1.0
- 文档类型：baseline
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-17
- 责任对象：控制面接口、console 聚合接口、runtime-admin 控制接口

## 1. 接口分层

当前 admin / console 相关接口分为 4 层：

1. `/api/admin/*`
   - 兼容与原型接口。
2. `/api/console/*`
   - `/console` 主后台接口。
3. runtime-admin 控制接口
   - runtime 节点注册、心跳、拉控制状态、上传统计。
4. artifact 下载接口
   - runtime 获取 snapshot 使用。

## 2. `/api/console/*` 主后台接口

### 2.1 工作台与首页

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/console/overview` | 工作台首页摘要 |
| GET | `/api/console/workbench` | 待办、异常与快捷入口聚合 |

### 2.2 词典记录

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/console/dictionary/terms` | 词典记录列表 |
| GET | `/api/console/dictionary/terms/export` | 导出词典记录 |
| POST | `/api/console/dictionary/terms` | 创建词典记录 |
| POST | `/api/console/dictionary/terms/{termId}/submit-review` | 提交词条审核 |
| POST | `/api/console/dictionary/terms/{termId}/disable` | 停用词条 |
| POST | `/api/console/dictionary/terms/batch-submit-review` | 批量提交审核 |
| POST | `/api/console/dictionary/terms/batch-disable` | 批量停用 |
| POST | `/api/console/dictionary/terms/{termId}/generate-pinyin-candidates` | 生成拼音候选 |
| POST | `/api/console/dictionary/terms/{termId}/pinyin-candidates` | 提交拼音候选审核 |

主要筛选参数：

1. `page`
2. `pageSize`
3. `query`
4. `categoryCode`
5. `status`
6. `sourceType`
7. `riskLevel`
8. `sortBy`
9. `sortDirection`

### 2.3 批量导入

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/console/import/templates` | 导入模板列表 |
| GET | `/api/console/dictionary/import-jobs` | 导入批次列表 |
| GET | `/api/console/dictionary/import-jobs/{jobId}/rows` | 导入行明细 |
| POST | `/api/console/dictionary/import-jobs` | 创建导入批次 |
| POST | `/api/console/dictionary/import-jobs/{jobId}/confirm` | 确认导入 |
| POST | `/api/console/dictionary/import-jobs/{jobId}/cancel` | 取消导入 |

主要筛选参数：

1. `page`
2. `pageSize`
3. `status`
4. `sourceType`

### 2.4 词典审核

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/console/dictionary/reviews` | 审核任务列表 |
| POST | `/api/console/dictionary/reviews/{taskId}/approve` | 审核通过 |
| POST | `/api/console/dictionary/reviews/{taskId}/reject` | 审核驳回 |
| POST | `/api/console/dictionary/reviews/batch-approve` | 批量通过 |
| POST | `/api/console/dictionary/reviews/batch-reject` | 批量驳回 |

主要筛选参数：

1. `page`
2. `pageSize`
3. `status`
4. `taskType`
5. `targetType`
6. `importJobId`

### 2.5 基础配置

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/console/dictionary-config/business-attributes` | 业务属性列表 |
| POST | `/api/console/dictionary-config/business-attributes` | 创建业务属性 |
| GET | `/api/console/dictionary-config/source-types` | 来源类型列表 |
| POST | `/api/console/dictionary-config/source-types` | 创建来源类型 |

扩展路由：

1. `/{value}/enable`
2. `/{value}/disable`
3. `/{value}/delete`

### 2.6 验证样本

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/console/validation/cases` | 验证样本列表 |
| GET | `/api/console/validation/cases/export` | 导出验证样本 |
| GET | `/api/console/validation/cases/{caseId}/related-terms` | 查看关联词条 |
| POST | `/api/console/validation/cases` | 创建验证样本 |
| POST | `/api/console/validation/cases/import` | 导入验证样本 |
| POST | `/api/console/validation/cases/batch-disable` | 批量停用 |

主要筛选参数：

1. `page`
2. `pageSize`
3. `query`
4. `sourceType`
5. `enabled`

### 2.7 发布与灰度

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/console/releases` | release 列表与分视图数据 |
| GET | `/api/console/releases/{releaseId}` | release 详情 |
| GET | `/api/console/releases/{releaseId}/gate` | release 门禁详情 |
| GET | `/api/console/releases/{releaseId}/validation` | release 验证详情 |
| POST | `/api/console/releases/build` | 构建 release |
| POST | `/api/console/releases/{releaseId}/submit-review` | 提交发布审核 |
| POST | `/api/console/releases/{releaseId}/publish` | 正式发布 |
| POST | `/api/console/releases/{releaseId}/rollback` | 回滚版本 |
| POST | `/api/console/gray-policies` | 创建或更新灰度策略 |

列表主要参数：

1. `page`
2. `pageSize`
3. `status`
4. `view`

### 2.8 runtime 治理

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/console/runtime-control` | 目标版本与 rollout 摘要 |
| POST | `/api/console/runtime-control/desired-version` | 下发目标版本 |
| GET | `/api/console/runtime-node-registry` | 备案节点列表 |
| GET | `/api/console/runtime-node-registry/{nodeId}` | 备案详情 |
| GET | `/api/console/runtime-node-registry/{nodeId}/deployment-guide` | 部署说明 |
| POST | `/api/console/runtime-node-registry` | 新增备案节点 |
| POST | `/api/console/runtime-node-registry/{nodeId}/enable` | 启用备案 |
| POST | `/api/console/runtime-node-registry/{nodeId}/disable` | 禁用备案 |
| POST | `/api/console/runtime-node-registry/{nodeId}/rotate-secret` | 轮换注册密钥 |
| GET | `/api/console/runtime-nodes` | 运行节点列表 |
| GET | `/api/console/runtime-nodes/{nodeId}` | 运行节点详情 |

### 2.9 运行验证

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/console/runtime-verify/current` | 当前 stable/canary 版本 |
| POST | `/api/console/runtime-verify/correct` | 调用正式纠错接口 |
| POST | `/api/console/runtime-verify/correct-cand` | 调用候选纠错接口 |
| GET | `/api/console/runtime-demo/current` | 首页演示读取当前版本 |
| POST | `/api/console/runtime-demo/simulate` | 首页演示执行模拟纠错 |

### 2.10 系统管理

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/console/system/access-control` | 读取用户、角色、权限总览 |
| GET | `/api/console/system/governance-policies` | 读取治理策略 |
| PUT/POST | `/api/console/system/governance-policies` | 保存治理策略 |
| POST | `/api/console/system/users` | 创建用户 |
| POST | `/api/console/system/roles` | 创建角色 |

### 2.11 帮助

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/console/help` | 帮助目录 |
| GET | `/api/console/help/{slug}` | 帮助正文 |
| GET | `/api/console/help/{slug}/source` | 下载帮助原文 |

## 3. runtime-admin 控制接口

这组接口由 runtime 调用 admin。

| 方法 | 路径 | 作用 |
|---|---|---|
| POST | `/api/runtime-nodes/register` | runtime 注册 |
| POST | `/api/runtime-nodes/heartbeat` | runtime 心跳 |
| GET | `/api/runtime-control/me?nodeId=...` | 读取当前节点控制状态 |
| POST | `/api/runtime-nodes/{nodeId}/apply-result` | 回传版本应用结果 |
| POST | `/api/runtime-nodes/{nodeId}/stats/upload` | 上传统计 |

## 4. runtime 快照下载接口

当前 admin 侧存在 runtime 快照下载能力，主要用于 `admin_http_signed` 模式。

路径模式：

`/api/runtime-artifacts/releases/{releaseId}/{fileName}`

用途：

1. runtime 基于签名参数下载 snapshot 或 manifest。
2. admin 校验签名、时效、节点绑定后返回文件。

## 5. `/api/admin/*` 兼容接口

当前 `/api/admin/*` 仍保留兼容路径，主要包括：

1. `/api/admin/me`
2. `/api/admin/dashboard`
3. `/api/admin/terms`
4. `/api/admin/validation-cases`
5. `/api/admin/pinyin-*`
6. `/api/admin/reviews`
7. `/api/admin/releases`
8. `/api/admin/gray-policies`
9. `/api/admin/audits`
10. `/api/admin/runtime-control`

这些接口仍可用，但当前正式后台主流程应以 `/api/console/*` 为准。

## 6. 参数与输出说明

### 6.1 通用分页参数

多数列表接口支持：

1. `page`
2. `pageSize`

### 6.2 通用筛选参数

不同域的常见筛选参数包括：

1. `status`
2. `query`
3. `sourceType`
4. `categoryCode`
5. `targetType`
6. `taskType`
7. `importJobId`
8. `view`
9. `env`

### 6.3 聚合输出特点

`/api/console/*` 并不只返回数据库行，而是返回页面需要的聚合结构，例如：

1. `summary`
2. `approval`
3. `releaseState`
4. `trafficState`
5. `confirmation`
6. `rollout`
7. `issueSummary`
8. `targetSummary`

## 7. 当前接口边界

1. `/api/console/*` 是主后台合同。
2. `/api/admin/*` 是兼容合同。
3. runtime-control 接口属于 admin 控制面，不属于 runtime 对外合同。
4. 节点备案、节点状态、运行验证和 release 详情均依赖聚合接口，而不是单表直出。
