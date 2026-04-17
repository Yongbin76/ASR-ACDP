# R5 帮助文档清单与 slug 映射表

> 历史说明
>
> 本文档形成于 `JOB-035` 之前或与 `JOB-035` 并行的旧口径阶段，文中仍可能出现旧目录、旧术语和旧路由示例。
>
> 当前现行编码与帮助口径，请优先以以下内容为准：
>
> - `docs/38-项目JobList与状态清单.md`
> - `docs/131` ~ `docs/135`
> - `docs/help_manuals/*`
>
> 本文档继续保留，作为历史讨论或阶段收尾依据，不再作为当前直接编码基线。

## 1. 文档目的

本文档用于把 `R5` 需要产出的在线帮助手册，细化到可直接执行的文档清单与 slug 映射层级。

目标是让后续 Codex 不需要再自己设计：

- 该写哪些帮助文档
- 每篇文档的 slug 是什么
- 页面帮助、流程帮助、运维帮助、接口帮助之间如何分层

## 2. 统一命名规则

建议帮助文档统一按以下 5 类组织：

1. 页面手册
2. 流程手册
3. 部署手册
4. 接口手册
5. 故障排查

### 2.1 slug 规则

建议统一采用：

- 页面手册：`page-<domain>-<page>`
- 流程手册：`flow-<process>`
- 部署手册：`ops-<topic>`
- 接口手册：`api-<topic>`
- 故障排查：`troubleshoot-<topic>`

### 2.2 建议目录

建议新增帮助源文档目录：

- `docs/help_manuals/`

可继续按子目录细分：

- `docs/help_manuals/pages/`
- `docs/help_manuals/flows/`
- `docs/help_manuals/ops/`
- `docs/help_manuals/apis/`
- `docs/help_manuals/troubleshooting/`

## 3. 页面手册清单

### 3.1 工作台

| slug | 页面 | 建议文件 |
|---|---|---|
| `page-workbench-home` | 工作台 | `docs/help_manuals/pages/page-workbench-home.md` |

### 3.2 主数据域

| slug | 页面 | 建议文件 |
|---|---|---|
| `page-master-terms` | 词条 | `docs/help_manuals/pages/page-master-terms.md` |
| `page-master-import` | 批量导入 | `docs/help_manuals/pages/page-master-import.md` |
| `page-master-business-properties` | 业务属性 | `docs/help_manuals/pages/page-master-business-properties.md` |
| `page-master-validation-cases` | 样本与回流 | `docs/help_manuals/pages/page-master-validation-cases.md` |

### 3.3 内容审核域

| slug | 页面 | 建议文件 |
|---|---|---|
| `page-review-terms` | 词条审核 | `docs/help_manuals/pages/page-review-terms.md` |
| `page-review-pinyin` | 拼音审核 | `docs/help_manuals/pages/page-review-pinyin.md` |

### 3.4 版本发布域

| slug | 页面 | 建议文件 |
|---|---|---|
| `page-release-list` | 版本列表 | `docs/help_manuals/pages/page-release-list.md` |
| `page-release-review` | 发布审核 | `docs/help_manuals/pages/page-release-review.md` |
| `page-release-canary` | 灰度发布 | `docs/help_manuals/pages/page-release-canary.md` |
| `page-release-risk` | 发布后风险 | `docs/help_manuals/pages/page-release-risk.md` |
| `page-release-rollback` | 回滚记录 | `docs/help_manuals/pages/page-release-rollback.md` |

### 3.5 运行治理域

| slug | 页面 | 建议文件 |
|---|---|---|
| `page-runtime-home` | 运行治理 | `docs/help_manuals/pages/page-runtime-home.md` |
| `page-runtime-node-registry` | 节点备案 | `docs/help_manuals/pages/page-runtime-node-registry.md` |
| `page-runtime-nodes` | 运行节点 | `docs/help_manuals/pages/page-runtime-nodes.md` |
| `page-runtime-verify` | 运行验证 | `docs/help_manuals/pages/page-runtime-verify.md` |

### 3.6 系统配置域

| slug | 页面 | 建议文件 |
|---|---|---|
| `page-system-users` | 用户 | `docs/help_manuals/pages/page-system-users.md` |
| `page-system-roles` | 角色 | `docs/help_manuals/pages/page-system-roles.md` |
| `page-system-permissions` | 权限 | `docs/help_manuals/pages/page-system-permissions.md` |
| `page-system-governance` | 治理策略 | `docs/help_manuals/pages/page-system-governance.md` |

## 4. 流程手册清单

| slug | 流程 | 建议文件 |
|---|---|---|
| `flow-master-data-to-release` | 主数据录入到发布输入池 | `docs/help_manuals/flows/flow-master-data-to-release.md` |
| `flow-content-review` | 内容审核流程 | `docs/help_manuals/flows/flow-content-review.md` |
| `flow-release-lifecycle` | build / 审核 / 灰度 / 正式发布流程 | `docs/help_manuals/flows/flow-release-lifecycle.md` |
| `flow-release-rollback` | 回滚流程 | `docs/help_manuals/flows/flow-release-rollback.md` |
| `flow-runtime-node-onboarding` | 节点备案到 runtime 接入流程 | `docs/help_manuals/flows/flow-runtime-node-onboarding.md` |
| `flow-runtime-verification` | 运行验证流程 | `docs/help_manuals/flows/flow-runtime-verification.md` |
| `flow-system-access-governance` | 权限与治理策略边界说明 | `docs/help_manuals/flows/flow-system-access-governance.md` |
| `flow-workbench-usage` | 工作台使用说明 | `docs/help_manuals/flows/flow-workbench-usage.md` |

## 5. 部署手册清单

| slug | 主题 | 建议文件 |
|---|---|---|
| `ops-admin-deploy` | admin 启动与部署 | `docs/help_manuals/ops/ops-admin-deploy.md` |
| `ops-runtime-deploy` | runtime 启动与部署 | `docs/help_manuals/ops/ops-runtime-deploy.md` |
| `ops-multi-runtime-deploy` | 多 runtime 实例部署 | `docs/help_manuals/ops/ops-multi-runtime-deploy.md` |
| `ops-runtime-secret-and-token` | `registration-secret` / 指纹 / `ACDP_RUNTIME_TOKEN` 说明 | `docs/help_manuals/ops/ops-runtime-secret-and-token.md` |

## 6. 接口手册清单

| slug | 主题 | 建议文件 |
|---|---|---|
| `api-runtime-http` | runtime HTTP 对外接口 | `docs/help_manuals/apis/api-runtime-http.md` |
| `api-runtime-websocket` | runtime WebSocket 对外接口 | `docs/help_manuals/apis/api-runtime-websocket.md` |
| `api-admin-console-management` | admin / console 管理接口 | `docs/help_manuals/apis/api-admin-console-management.md` |

## 7. 故障排查清单

| slug | 主题 | 建议文件 |
|---|---|---|
| `troubleshoot-runtime-not-registered` | 节点启动成功但未注册 | `docs/help_manuals/troubleshooting/troubleshoot-runtime-not-registered.md` |
| `troubleshoot-artifact-download` | 制品下载失败 | `docs/help_manuals/troubleshooting/troubleshoot-artifact-download.md` |
| `troubleshoot-release-blocked` | 发布失败与升级前置条件阻断 | `docs/help_manuals/troubleshooting/troubleshoot-release-blocked.md` |
| `troubleshoot-post-publish-risk` | 发布后风险处理 | `docs/help_manuals/troubleshooting/troubleshoot-post-publish-risk.md` |
| `troubleshoot-business-properties` | 业务属性配置修改后不生效 | `docs/help_manuals/troubleshooting/troubleshoot-business-properties.md` |

## 8. 与 `console-help` 的关系

后续实现时，建议：

- `prototype/src/lib/console-help.js`
  负责维护 `slug -> 标题 / 摘要 / 原始文档路径` 映射
- 上述清单作为该映射的基线来源

## 9. 当前用途

本文档当前用于：

- 补足 `JOB-028` 的“直接可分工编写文档”能力
- 让后续 Codex 在进入帮助体系实现时，不需要自己再设计清单和 slug
