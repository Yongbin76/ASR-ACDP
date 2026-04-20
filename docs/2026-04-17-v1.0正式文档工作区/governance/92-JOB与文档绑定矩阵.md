# JOB 与文档绑定矩阵

- 文档状态：active
- 适用版本：v1.0
- 文档类型：generated_view
- 所属工作区：docs/2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-17
- 责任对象：当前主要 job 与正式文档之间的绑定关系

> 此文件由 `project_management/source_of_truth.json` 自动生成。

## 1. 文档编号

| 文档编号 | 文档 | 类型 | 域 |
|---|---|---|---|
| `ADR-00` | ADR索引 | `generated_view` | `adr` |
| `ADR-001` | ADR-001-控制面与数据面分离 | `adr` | `adr` |
| `ADR-002` | ADR-002-console为主后台-admin为兼容入口 | `adr` | `adr` |
| `ADR-003` | ADR-003-正式文档工作区与单一真源强绑定 | `adr` | `adr` |
| `DOC-00` | 文档总索引 | `workspace_index` | `workspace` |
| `DOC-01` | 项目总览与版本边界 | `baseline` | `overview` |
| `DOC-02` | 系统架构与服务拓扑 | `baseline` | `architecture` |
| `DOC-03` | 前后台功能模块总览 | `baseline` | `modules` |
| `DOC-04` | 系统目录结构与代码入口说明 | `baseline` | `repository` |
| `DOC-05` | 词典与核心数据模型 | `baseline` | `dictionary` |
| `DOC-06` | 中文拼音增强与词条准入设计 | `baseline` | `pinyin` |
| `DOC-07` | 运行发布与治理机制 | `baseline` | `release_runtime` |
| `DOC-08` | 数据库字典与字段说明 | `baseline` | `database` |
| `DOC-09` | runtime对外接口说明 | `baseline` | `runtime_api` |
| `DOC-10` | admin-console接口与聚合接口说明 | `baseline` | `control_api` |
| `DOC-11` | 配置项与部署运行说明 | `baseline` | `config_ops` |
| `DOC-12` | 测试、验收依据与当前边界 | `baseline` | `testing_acceptance` |
| `DOC-13` | 术语表与状态机定义 | `baseline` | `terminology` |
| `DOC-14` | 详细设计索引 | `design_index` | `design` |
| `DOC-14-01` | 词典建设域详细设计 | `design` | `design` |
| `DOC-14-02` | 批量导入域详细设计 | `design` | `design` |
| `DOC-14-03` | 词典审核域详细设计 | `design` | `design` |
| `DOC-14-04` | 验证与回流域详细设计 | `design` | `design` |
| `DOC-14-05` | 版本发布域详细设计 | `design` | `design` |
| `DOC-14-06` | 运行治理域详细设计 | `design` | `design` |
| `DOC-14-07` | 系统管理域详细设计 | `design` | `design` |
| `DOC-14-08` | runtime纠错执行链详细设计 | `design` | `design` |
| `DOC-14-09` | runtime快照下发与本地切换详细设计 | `design` | `design` |
| `DOC-14-10` | runtime统计回传与聚合详细设计 | `design` | `design` |
| `DOC-14-11` | 灰度分流与trafficKey详细设计 | `design` | `design` |
| `DOC-14-12` | 帮助系统与导航配置详细设计 | `design` | `design` |
| `DOC-14-13` | 发布包与交付物详细设计 | `design` | `design` |
| `DOC-15` | 数据字典索引 | `data_dictionary_index` | `data_dictionary` |
| `DOC-15-01` | terms表详细字典 | `data_dictionary` | `data_dictionary` |
| `DOC-15-02` | aliases与来源表详细字典 | `data_dictionary` | `data_dictionary` |
| `DOC-15-03` | rules与pinyin_profiles表详细字典 | `data_dictionary` | `data_dictionary` |
| `DOC-15-04` | review_tasks表详细字典 | `data_dictionary` | `data_dictionary` |
| `DOC-15-05` | import_jobs相关表详细字典 | `data_dictionary` | `data_dictionary` |
| `DOC-15-06` | validation_cases表详细字典 | `data_dictionary` | `data_dictionary` |
| `DOC-15-07` | releases与gray_policies表详细字典 | `data_dictionary` | `data_dictionary` |
| `DOC-15-08` | runtime_nodes与runtime_node_registry表详细字典 | `data_dictionary` | `data_dictionary` |
| `DOC-15-09` | runtime_control_state表详细字典 | `data_dictionary` | `data_dictionary` |
| `DOC-15-10` | runtime统计相关表详细字典 | `data_dictionary` | `data_dictionary` |
| `DOC-15-11` | audit_logs表详细字典 | `data_dictionary` | `data_dictionary` |
| `DOC-16` | 接口规范索引 | `api_spec_index` | `api_specs` |
| `DOC-16-01` | runtime HTTP接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-02` | runtime WebSocket接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-03` | runtime-control接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-04` | console-工作台与首页接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-05` | console-词典记录接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-06` | console-批量导入接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-07` | console-词典审核接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-08` | console-验证样本接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-09` | console-版本发布接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-10` | console-运行治理接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-11` | console-系统管理接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-12` | console-帮助中心接口详细规范 | `api_spec` | `api_specs` |
| `DOC-16-13` | admin兼容接口说明 | `api_spec` | `api_specs` |
| `DOC-17` | 页面设计索引 | `page_design_index` | `pages` |
| `DOC-17-01` | 工作台页面详细设计 | `page_design` | `pages` |
| `DOC-17-02` | 词典记录页面详细设计 | `page_design` | `pages` |
| `DOC-17-03` | 批量导入页面详细设计 | `page_design` | `pages` |
| `DOC-17-04` | 词典审核页面详细设计 | `page_design` | `pages` |
| `DOC-17-05` | 基础配置页面详细设计 | `page_design` | `pages` |
| `DOC-17-06` | 验证样本页面详细设计 | `page_design` | `pages` |
| `DOC-17-07` | 版本列表与发布页面详细设计 | `page_design` | `pages` |
| `DOC-17-08` | 运行治理页面详细设计 | `page_design` | `pages` |
| `DOC-17-09` | 节点备案页面详细设计 | `page_design` | `pages` |
| `DOC-17-10` | 运行节点页面详细设计 | `page_design` | `pages` |
| `DOC-17-11` | 运行验证页面详细设计 | `page_design` | `pages` |
| `DOC-17-12` | 系统管理页面详细设计 | `page_design` | `pages` |
| `DOC-17-13` | 帮助中心页面详细设计 | `page_design` | `pages` |
| `DOC-18` | Codex开发索引 | `codex_dev_index` | `codex_dev` |
| `DOC-18-01` | 按功能域开发阅读顺序 | `codex_dev` | `codex_dev` |
| `DOC-18-02` | 按改动类型的落点矩阵 | `codex_dev` | `codex_dev` |
| `DOC-18-03` | 改数据库时必须同步的文件与测试 | `codex_dev` | `codex_dev` |
| `DOC-18-04` | 改接口时必须同步的文件与测试 | `codex_dev` | `codex_dev` |
| `DOC-18-05` | 改页面时必须同步的文件与测试 | `codex_dev` | `codex_dev` |
| `DOC-18-06` | 改配置时必须同步的文件与测试 | `codex_dev` | `codex_dev` |
| `DOC-18-07` | 改runtime纠错链时必须同步的文件与测试 | `codex_dev` | `codex_dev` |
| `DOC-18-08` | 改发布与节点治理时必须同步的文件与测试 | `codex_dev` | `codex_dev` |
| `DOC-18-09` | 常见开发任务操作手册 | `codex_dev` | `codex_dev` |
| `DOC-18-10` | 开发交付检查清单 | `codex_dev` | `codex_dev` |
| `GOV-90` | 文档治理总则 | `governance` | `governance` |
| `GOV-91` | 单一真源与文档管理绑定规则 | `governance` | `governance` |
| `GOV-92` | JOB与文档绑定矩阵 | `generated_view` | `governance` |
| `GOV-93` | CHECKLIST与收尾标准 | `governance` | `governance` |
| `GOV-94` | 文档变更记录 | `generated_view` | `governance` |
| `GOV-95` | 归档与版本快照规则 | `governance` | `governance` |
| `GOV-96` | 真源文档注册表视图 | `generated_view` | `governance` |
| `JOB-00` | JOB索引 | `generated_view` | `jobs` |
| `JOB-103-DOC` | JOB-103-v1.0正式文档工作区详细设计化与Codex开发依据补齐 | `job` | `jobs` |

## 2. 当前主要 job 绑定关系

| Job | 当前状态 | 影响文档 | 交付文档 | 说明 |
|---|---|---|---|---|
| `JOB-035` | `done` | `DOC-03 DOC-05 DOC-06 DOC-08 DOC-10 DOC-11 DOC-12 DOC-13` | `` | 词典建设域与验证回流域重构 |
| `JOB-036` | `done` | `DOC-02 DOC-07 DOC-09 DOC-10 DOC-11 DOC-12 DOC-13` | `` | admin_http_signed 快照下发落地 |
| `JOB-037` | `done` | `DOC-03 DOC-11 DOC-12` | `` | 左侧目录树与主后台体验收口 |
| `JOB-099` | `done` | `DOC-01 DOC-05 DOC-08 DOC-11 DOC-12 DOC-13` | `` | 零数据底座与系统清库 |
| `JOB-100` | `done` | `DOC-01 DOC-07 DOC-11 DOC-12` | `` | 最终发布包组成与边界收紧 |
| `JOB-090` | `in_progress` | `DOC-09 DOC-10 DOC-11 DOC-12` | `` | 测试体系建设与回归闭环 |
| `JOB-006` | `blocked` | `DOC-02 DOC-11 DOC-12` | `` | 真实目标 K8S 集群验证 |
| `JOB-009` | `blocked` | `DOC-09 DOC-12` | `` | 真实宿主机并发与吞吐验证 |
| `JOB-030` | `blocked` | `DOC-01 DOC-07 DOC-11 DOC-12` | `` | 发布前真实证据与 go/no-go 收口 |
| `JOB-101` | `done` | `DOC-00 DOC-01 DOC-02 DOC-03 DOC-04 DOC-05 DOC-06 DOC-07 DOC-08 DOC-09 DOC-10 DOC-11 DOC-12 DOC-13 GOV-90 GOV-91 GOV-92 GOV-93 GOV-94 GOV-95 GOV-96 ADR-00 ADR-001 ADR-002 ADR-003 JOB-00 TPL-01 TPL-02 TPL-03 ARC-00` | `DOC-00 GOV-90 GOV-91 GOV-92 GOV-93 GOV-94 GOV-95 GOV-96 ADR-00 JOB-00` | 正式文档工作区与单一真源绑定 |
| `JOB-102` | `done` | `DOC-00 GOV-94 GOV-95` | `GOV-94` | docs 根目录首批历史文档归档分层 |
| `JOB-103` | `done` | `DOC-00 DOC-14 DOC-15 DOC-16 DOC-17 DOC-18 JOB-103-DOC GOV-94 DOC-15-01 DOC-15-02 DOC-15-04 DOC-15-05 DOC-15-03 DOC-15-06 DOC-15-07 DOC-15-08 DOC-15-09 DOC-15-10 DOC-15-11 DOC-16-01 DOC-16-02 DOC-16-03 DOC-16-04 DOC-16-05 DOC-16-06 DOC-16-07 DOC-16-08 DOC-16-09 DOC-16-10 DOC-14-01 DOC-14-02 DOC-14-03 DOC-14-04 DOC-14-05 DOC-14-06 DOC-14-07 DOC-14-08 DOC-14-09 DOC-14-10 DOC-14-11 DOC-14-12 DOC-14-13 DOC-16-11 DOC-16-12 DOC-16-13 DOC-17-01 DOC-17-02 DOC-17-03 DOC-17-04 DOC-17-05 DOC-17-06 DOC-17-07 DOC-17-08 DOC-17-09 DOC-17-10 DOC-17-11 DOC-17-12 DOC-17-13 DOC-18-01 DOC-18-02 DOC-18-03 DOC-18-04 DOC-18-05 DOC-18-06 DOC-18-07 DOC-18-08 DOC-18-09 DOC-18-10` | `DOC-14 DOC-15 DOC-16 DOC-17 DOC-18 JOB-103-DOC DOC-15-01 DOC-15-02 DOC-15-04 DOC-15-05 DOC-15-03 DOC-15-06 DOC-15-07 DOC-15-08 DOC-15-09 DOC-15-10 DOC-15-11 DOC-16-01 DOC-16-02 DOC-16-03 DOC-16-04 DOC-16-05 DOC-16-06 DOC-16-07 DOC-16-08 DOC-16-09 DOC-16-10 DOC-14-01 DOC-14-02 DOC-14-03 DOC-14-04 DOC-14-05 DOC-14-06 DOC-14-07 DOC-14-08 DOC-14-09 DOC-14-10 DOC-14-11 DOC-14-12 DOC-14-13 DOC-16-11 DOC-16-12 DOC-16-13 DOC-17-01 DOC-17-02 DOC-17-03 DOC-17-04 DOC-17-05 DOC-17-06 DOC-17-07 DOC-17-08 DOC-17-09 DOC-17-10 DOC-17-11 DOC-17-12 DOC-17-13 DOC-18-01 DOC-18-02 DOC-18-03 DOC-18-04 DOC-18-05 DOC-18-06 DOC-18-07 DOC-18-08 DOC-18-09 DOC-18-10` | 详细设计层、数据字典层、接口规范层、页面设计层与 Codex 开发依据层补齐 |
