# ACDP 项目整体文档

## 1. 文档目的

本文档用于对 ACDP 当前仓库中的实现做一次以代码为准的收敛说明，覆盖项目定位、目录结构、服务划分、数据模型、运行链路、部署方式、验证现状与当前边界。

当前代码基线：

- 项目根目录：`/Codex/ACDP`
- 主实现目录：`prototype/src`
- 控制台前端目录：`console/client`
- 主配置目录：`prototype/config`
- K8S 资产目录：`k8s`

## 2. 项目定位

ACDP 当前实现的是一个面向中文 ASR 热词纠错场景的原型平台，已落地三类能力：

- 控制面：词条、规则、拼音画像、审核、发布、灰度、验证样本、运行节点、审计
- 数据面：运行时纠错、运行时版本切换、运行时本地统计、运行节点主动汇报
- 运营面：`/console` 新后台、`/admin` MVP 页面、帮助说明、Smoke 与宿主验证脚本

当前不是单一的 AC 自动机脚本，而是“词典管理 + 发布编译 + 运行时控制”的一体化原型。

## 3. 当前实现范围

### 3.1 已实现能力

- 原始数据清洗：
  - 路名原始文本
  - 政务部门原始 CSV
  - Demo 词条补充
- SQLite 主数据管理：
  - 词条
  - 别名
  - 规则
  - 拼音画像
  - 审核任务
  - 发布版本
  - 灰度策略
  - Validation Cases
  - Import Jobs
  - Runtime Nodes / Runtime Control / Runtime Stats
  - 审计日志
- 运行时能力：
  - HTTP 纠错
  - WebSocket 纠错
  - 运行时当前版本读取
  - 运行时热重载
  - 本地版本安装与回滚
  - 统计缓冲与定时上传
- 管理能力：
  - `/admin` MVP 管理页
  - `/console` 独立新后台
  - 角色/权限/页面功能映射
  - 运行节点管理和发布确认
- 部署与验证：
  - 单进程启动
  - runtime/admin 双进程拆分
  - Dockerfile / split Dockerfile
  - K8S Deployment / Service / PVC / Secret 模板
  - unit / integration / smoke / host verification

### 3.2 当前未覆盖或仅到原型级

- 多副本状态管理与高可用数据库
- 外部对象存储之外的生产级制品治理
- 外部真实回流系统的稳定联机接入
- 生产级 caller identity、配额和限流体系
- 更细粒度的控制台前端模块拆分

## 4. 仓库结构

### 4.1 关键目录

- `prototype/src/lib`
  - 核心业务库，包含数据库、运行时、拼音、发布、制品仓、导入、控制台聚合服务
- `prototype/src/http`
  - runtime/admin 两个 HTTP surface 的路由权限和请求处理
- `prototype/src/cli`
  - 初始化、构建、验证、Smoke、宿主检查、MinIO 辅助脚本
- `prototype/src/server.js`
  - 单进程应用装配器，同时暴露 runtime/admin split 启动能力
- `prototype/src/runtime-server.js`
  - runtime 独立进程入口
- `prototype/src/admin-server.js`
  - admin 独立进程入口
- `console/client`
  - `/console` 的单页前端
- `prototype/public/test-client.html`
  - `/admin` 使用的 MVP 页面
- `prototype/config`
  - app、artifact store、release validation、导入模板等静态配置
- `data_sources`
  - 原始数据和清洗结果
- `k8s`
  - 原型 K8S 资产和 Secret 示例

### 4.2 当前代码模块职责

核心模块如下：

- `config.js`
  - 统一读取项目配置、路径配置、artifact store 配置和 env 注入
- `platform-db.js`
  - SQLite 表结构、主数据读写、审核、发布、运行节点、统计聚合
- `runtime.js`
  - 运行时纠错、快照加载、规则与拼音协同
- `runtime-artifacts.js`
  - runtime 侧版本安装、当前版本状态、回滚与本地状态落盘
- `runtime-control-client.js`
  - runtime 调 admin 控制面的 HTTP 客户端
- `runtime-stats.js`
  - runtime 本地统计 SQLite 缓冲与上传载荷组装
- `artifact-store.js`
  - file/minio 制品仓访问、对象 key 规划、上传与预签名下载
- `release-gates.js`
  - 发布前 gate / validation 汇总
- `console-service.js`
  - `/console` 页面的后端聚合查询和展示口径收口
- `admin-auth.js`
  - 用户、角色、权限、页面功能映射
- `import-jobs.js`
  - 导入批次预览、确认、取消和来源追踪
- `validation-feed-importer.js`
  - 验证样本回流文件扫描与导入

## 5. 服务划分与入口

### 5.1 单进程模式

入口：

- `npm run start:prototype`

特点：

- runtime surface 与 admin/console surface 在同一进程
- 统一使用 `prototype/workspace`
- 适合本地开发、原型验证和集成测试

### 5.2 拆分模式

入口：

- `npm run start:runtime`
- `npm run start:admin`

职责划分：

- `acdp-runtime`
  - 暴露运行时纠错接口
  - 管理本地安装版本
  - 定期向 admin 注册、心跳、上报 apply 结果和统计
- `acdp-admin`
  - 提供 `/admin` 和 `/console`
  - 管理词典、发布、审核、验证样本、运行节点和审计
  - 负责构建版本、维护 desiredVersion、生成运行节点可下载的制品信息

### 5.3 浏览器入口

- `/admin`
  - MVP 管理页
- `/console`
  - 独立新后台
- `/test-client`
  - 当前测试入口仍保留在原型页面中

## 6. 业务主链路

### 6.1 词典与发布链路

1. 通过 `prepare:data` 生成 seed 数据
2. 通过 `bootstrap:db` 初始化 SQLite
3. 在 `/admin` 或 `/console` 中维护词条、规则、拼音画像、验证样本
4. 构建 release，生成 `manifest.json` 和 `snapshot.json`
5. 提交审核并通过 gate / validation
6. 发布正式版本或灰度版本
7. admin 控制面更新当前控制状态

### 6.2 runtime 控制链路

1. runtime 启动后注册节点
2. runtime 周期性发送 heartbeat
3. runtime 拉取 admin 返回的控制态
4. 发现 desiredVersion 变化后下载制品
5. 安装到本地 `runtime_artifacts/releases/<releaseId>`
6. 原子切换 `runtime_state/current.json`
7. 上报 apply 结果
8. 周期性上传本地统计批次

### 6.3 导入与样本回流链路

1. 下载导入模板
2. 词条导入主路径统一使用结构化词条模板，并在上传前选择业务属性
3. 上传文件创建 import job
4. 系统生成预览、警告与错误
5. 人工确认后写入主表
6. Validation feed 可从文件 inbox 目录导入并自动 archive/error 分流

补充说明：

- 路名 / 政府部门 / 常用词等词条导入差异，当前通过业务属性承接
- `raw_roads_text_v1`、`gov_departments_csv_v1`、`structured_terms_csv_v1` 仅保留 legacy 兼容入口

## 7. 数据模型

### 7.1 SQLite 主表

当前代码实际创建以下表：

- `terms`
- `aliases`
- `term_sources`
- `alias_sources`
- `term_rules`
- `pinyin_profiles`
- `releases`
- `release_terms`
- `gray_policies`
- `review_tasks`
- `validation_cases`
- `import_jobs`
- `import_job_files`
- `import_job_rows`
- `import_job_results`
- `import_templates`
- `runtime_nodes`
- `runtime_control_state`
- `runtime_node_hourly_stats`
- `runtime_node_hourly_terms`
- `runtime_node_peak_stats`
- `runtime_node_stat_upload_records`
- `runtime_hourly_stats`
- `runtime_hourly_terms`
- `runtime_peak_stats`
- `audit_logs`

### 7.2 Workspace 关键文件/目录

- `prototype/workspace/platform.db`
  - 控制面主 SQLite
- `prototype/workspace/catalog/seed_terms.json`
  - 预处理后的 seed 数据
- `prototype/workspace/releases/<releaseId>/manifest.json`
  - 发布清单
- `prototype/workspace/releases/<releaseId>/snapshot.json`
  - 快照文件
- `prototype/workspace/releases/latest/*`
  - 共享 latest 版本
- `prototype/workspace/runtime_artifacts/releases/<releaseId>`
  - runtime 本地安装的版本目录
- `prototype/workspace/runtime_state/current.json`
  - runtime 当前生效版本状态
- `prototype/workspace/runtime_state/runtime_stats.db`
  - runtime 本地统计缓冲 SQLite
- `prototype/workspace/host_verification/*`
  - 宿主联调、runtime-control 验证证据
- `prototype/workspace/validation_feeds/inbox|archive|error`
  - Validation feed 文件流转目录

## 8. 当前控制台范围

`/console` 当前路由范围：

- `/`
- `/runtime-nodes`
- `/runtime-nodes/:nodeId`
- `/terms`
- `/terms/:termId`
- `/terms/:termId/validation-cases`
- `/import`
- `/import/templates/:templateCode`
- `/import/jobs/:jobId`
- `/reviews`
- `/reviews/:taskId`
- `/releases`
- `/releases/:releaseId`
- `/validation-cases`
- `/validation-cases/:caseId`
- `/help`
- `/help/:slug`

`/console` 当前主要特性：

- 身份切换与 RBAC 可见性控制
- 路由级缓存首屏
- runtime 节点状态与发布确认页
- 导入中心模板/批次/错误下载
- 审核、发布、样本与帮助中心

## 9. 当前部署方式

### 9.1 本地直接运行

- 依赖 Node.js `>= 22.13.0`
- 使用 `node:sqlite`
- 适合开发、自测和脚本验证

### 9.2 Docker

镜像：

- `Dockerfile`
- `Dockerfile.runtime`
- `Dockerfile.admin`

### 9.3 Kubernetes

当前提供的原型资产：

- `namespace.yaml`
- `pvc.yaml`
- `deployment.yaml`
- `service.yaml`
- `runtime-deployment.yaml`
- `runtime-service.yaml`
- `admin-deployment.yaml`
- `admin-service.yaml`
- `artifact-store-secret.example.yaml`

当前 K8S 约束：

- 仍按单副本原型设计
- workspace 依赖 PVC 共享
- SQLite 仍是当前状态存储

## 10. 验证与测试

### 10.1 自动化验证

- `npm run test:unit`
- `npm run test:prototype`
- `npm run test:console`
- `npm run smoke:console`
- `npm run smoke:runtime`
- `npm run smoke:admin`
- `npm run verify:runtime-control -- --artifact-store-mode=configured`
- `npm run verify:runtime-control -- --artifact-store-mode=file`
- `npm run verify:host:console`

### 10.2 当前验证结论

根据仓库现有 README、handoff 和验证产物，当前已经完成：

- 本地单进程原型可运行
- runtime/admin 拆分可运行
- local/file 与 local/configured runtime-control 验证通过
- 第二轮 env 注入 configured 验证通过
- `/console` 已进入体验与查询优化收尾阶段

## 11. 当前边界与风险

- 生产级高可用和多副本尚未建立
- SQLite + PVC 仅适合原型/小规模验证
- 真实目标 K8S 集群验证仍依赖外部 kube context
- Validation feed 的真实外部集成仍未完全收口
- `/console` 前端当前仍是单文件应用，后续可再模块化

## 12. 结论

截至 `2026-04-02`，ACDP 已经从单体原型演进为具备控制面、运行时数据面、制品分发、运行节点控制、控制台后台和基础部署资产的完整原型平台。后续工作重点不再是“是否能跑起来”，而是：

- 继续收口 `/console` 体验和查询成本
- 完成真实目标集群验证
- 为后续生产化改造准备更稳定的状态与部署模型
