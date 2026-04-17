# JOB-021 多 runtime 实例与节点备案注册实施拆解与验收标准

## 1. JOB 定义

- Job ID：`JOB-021`
- 主题：多 runtime 实例验证与节点备案注册治理
- 当前阶段：方案与拆解已定，后续可直接按本文件进入代码实现

## 2. 目标

建立一条可正式交接的多 runtime 验证与接入治理基线。

本批目标包括：

- 支持 `1 admin + 2 runtime`，可选扩到 `3 runtime`
- 让每个 runtime 实例具备独立 workspace / runtime state / runtime stats / 日志
- 新增人工备案台账 `runtime_node_registry`
- runtime 必须先备案、再凭节点级密钥注册到 admin
- 补齐控制台备案管理页与宿主验证脚本

## 3. 不变边界

本批必须保持以下边界：

- 不改现有 `POST /api/runtime/correct` 与 `GET /ws/runtime/correct` 合同
- 不把 ACDP 本体升级为正式流量网关 / LB 产品
- 不在本批引入节点级 `desiredVersion override`
- 不把灰度对比、候选纠错、统一验证工作台一起强绑进同一批次

## 4. 关键业务规则

### 4.1 节点准入规则

1. runtime 节点必须先在 admin 侧备案。
2. 未备案节点不得注册。
3. 已备案但 `enabled=false` 的节点不得注册。
4. 节点注册必须同时通过：
   - shared runtime bearer token
   - 节点级 `registrationSecret`
5. `register / heartbeat` 的 runtime 上报地址必须与备案地址一致。
6. `apply-result / stats-upload / runtime-control/me` 必须校验节点身份一致性。

### 4.2 多实例隔离规则

1. 每个 runtime 实例必须有独立 `workspaceDir`。
2. 每个 runtime 实例必须有独立 `runtimeStateDir`。
3. 每个 runtime 实例必须有独立 `runtimeArtifactsDir`。
4. 每个 runtime 实例必须有独立 `databaseFile`。
5. 每个 runtime 实例必须有独立 PID / stdout / stderr 日志文件。

### 4.3 验证规则

1. 第一阶段必须完成 `1 admin + 2 runtime` 宿主验证。
2. `3 runtime` 为建议扩展项，但实现时应直接支持。
3. 本批关单不强制依赖统一 LB/Ingress，只强制要求多 runtime 节点与 admin 管控闭环跑通。
4. 如果环境提供 `clusterBaseUrl`，可补做统一入口验证，但不作为本批唯一关单前提。

## 5. 实施拆解

### T01 文档与单一真源准备

目标：

- 固定多 runtime 拓扑、备案模型、注册规则和关单标准

本轮已完成：

- [55-多runtime实例与节点备案注册方案](./55-多runtime实例与节点备案注册方案.md)
- [56-JOB-021多runtime实例与节点备案注册实施拆解与验收标准](./56-JOB-021多runtime实例与节点备案注册实施拆解与验收标准.md)
- [57-多runtime实例与节点备案注册文档索引](./57-多runtime实例与节点备案注册文档索引.md)

验收点：

- 单一真源已有 `JOB-021`
- `docs/38`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md` 能看到 `JOB-021`

### T02 多 runtime 实例隔离与启动能力

目标：

- 让 runtime 在宿主机上可用“实例化”方式并行启动，而不是继续共用默认 workspace

建议写入文件：

- `prototype/src/lib/runtime-instance-config.js`（建议新增）
- `prototype/src/cli/start-runtime-instance.js`（建议新增）
- `prototype/src/cli/service-manager.js`
- `package.json`
- `prototype/tests/unit/runtime-instance-config.test.js`（建议新增）
- `prototype/tests/unit/service-manager.test.js`

建议实施方式：

#### T02-A 实例配置构造器

新增 [runtime-instance-config.js](/Codex/ACDP/prototype/src/lib/runtime-instance-config.js)，建议导出：

- `buildRuntimeInstanceConfig(baseConfig, options = {})`

`options` 至少包括：

- `instanceId`
- `port`
- `workspaceRoot`
- `nodeId`
- `nodeName`
- `nodeEnv`
- `nodeAddress`
- `adminBaseUrl`

职责：

- 以 base config 为基线
- 派生独立 `resolvedPaths`
- 派生 runtime control 身份信息
- 保留现有 artifact store / auth 配置

#### T02-B 独立启动脚本

新增 [start-runtime-instance.js](/Codex/ACDP/prototype/src/cli/start-runtime-instance.js)，建议支持：

- `--instance`
- `--port`
- `--workspace-root`
- `--node-id`
- `--node-name`
- `--node-env`
- `--node-address`
- `--admin-base-url`

职责：

- 基于 `buildRuntimeInstanceConfig()` 启动单个 runtime 实例
- 不修改默认 `start:runtime`
- 允许后续宿主机和验证脚本复用

#### T02-C service manager 实例化

改 [service-manager.js](/Codex/ACDP/prototype/src/cli/service-manager.js)，增加 `--instance` 支持。

要求：

- 当目标是 runtime 且存在 `--instance` 时：
  - PID 文件改为 `runtime-<instance>.pid`
  - 日志文件改为 `runtime-<instance>.out.log / err.log`
  - 启动入口切到 `start-runtime-instance.js`
- admin 侧维持现状

#### T02-D package scripts

建议新增：

- `start:runtime:instance`
- 视需要补：
  - `service:start:runtime:instance`
  - 或继续复用 `service:start:runtime -- --instance runtime-01`

验收点：

- 可在同一宿主机并行起至少 2 个 runtime
- 不同实例的 workspace / state / stats / 日志不互相覆盖
- 默认 `start:runtime` 与 `service:start:runtime` 不回归

### T03 备案台账数据模型与 admin/console CRUD

目标：

- 新增人工备案表与管理接口

建议写入文件：

- `prototype/src/lib/platform-db.js`
- `prototype/src/lib/console-service.js`
- `prototype/src/http/admin-surface.js`
- `prototype/src/lib/admin-auth.js`
- `console/client/index.html`
- `console/client/app.js`
- `console/client/app.css`
- `prototype/tests/unit/runtime-node-registry.test.js`（建议新增）
- `prototype/tests/unit/console-api.test.js`
- `prototype/tests/unit/console-read.test.js`

建议实施方式：

#### T03-A 数据表与 DB helper

在 [platform-db.js](/Codex/ACDP/prototype/src/lib/platform-db.js) 新增：

- 表：`runtime_node_registry`

建议 helper：

- `listRuntimeNodeRegistry(db, filters = {})`
- `getRuntimeNodeRegistryItem(db, nodeId)`
- `createRuntimeNodeRegistryItem(db, payload, operator)`
- `updateRuntimeNodeRegistryItem(db, nodeId, payload, operator)`
- `enableRuntimeNodeRegistryItem(db, nodeId, operator)`
- `disableRuntimeNodeRegistryItem(db, nodeId, operator)`
- `rotateRuntimeNodeRegistrySecret(db, nodeId, operator)`

建议 `rotate` 返回：

- `secretPlaintext` 仅本次返回
- `secretFingerprint` 持久化可见

#### T03-B console service 聚合

在 [console-service.js](/Codex/ACDP/prototype/src/lib/console-service.js) 新增：

- `listConsoleRuntimeNodeRegistry()`
- `getConsoleRuntimeNodeRegistryDetail()`

职责：

- 返回备案节点列表
- 返回启用状态、地址信息、最近注册状态摘要

#### T03-C admin/console 接口

在 [admin-surface.js](/Codex/ACDP/prototype/src/http/admin-surface.js) 新增：

- `GET /api/console/runtime-node-registry`
- `GET /api/console/runtime-node-registry/{nodeId}`
- `POST /api/console/runtime-node-registry`
- `PUT /api/console/runtime-node-registry/{nodeId}`
- `POST /api/console/runtime-node-registry/{nodeId}/enable`
- `POST /api/console/runtime-node-registry/{nodeId}/disable`
- `POST /api/console/runtime-node-registry/{nodeId}/rotate-secret`

#### T03-D RBAC 与页面

在 [admin-auth.js](/Codex/ACDP/prototype/src/lib/admin-auth.js) 建议新增：

- 权限：
  - `runtime.node.registry.read`
  - `runtime.node.registry.manage`
- 页面功能：
  - `runtimeNodeRegistry.view`
  - `runtimeNodeRegistry.manage`

在 console 侧新增页面：

- 路由：`/console/runtime-node-registry`
- 导航名称：`节点备案`

页面能力：

- 列表
- 新建备案
- 编辑地址
- 启用 / 禁用
- 轮换密钥

验收点：

- admin 可人工备案节点
- 节点备案页可完成最小 CRUD
- 轮换密钥后旧密钥失效

### T04 runtime 注册链路治理收口

目标：

- 把 runtime 到 admin 的关键接口从“共享 token + 自动入库”升级到“共享 token + 节点级备案校验”

建议写入文件：

- `prototype/src/lib/config.js`
- `prototype/config/artifact_store.config.json`
- `prototype/src/lib/runtime-control-client.js`
- `prototype/src/http/admin-surface.js`
- `prototype/src/lib/platform-db.js`
- `prototype/tests/unit/runtime-control.test.js`
- `prototype/tests/unit/runtime-nodes.test.js`

建议实施方式：

#### T04-A 节点级密钥配置

在 [artifact_store.config.json](/Codex/ACDP/prototype/config/artifact_store.config.json) 的 `runtimeControl` 下建议新增：

- `registrationSecret`
- `registrationSecretEnv`

在 [config.js](/Codex/ACDP/prototype/src/lib/config.js) 读取并注入：

- `runtimeControl.registrationSecret`

#### T04-B runtime 请求头

在 [runtime-control-client.js](/Codex/ACDP/prototype/src/lib/runtime-control-client.js) 中，为以下请求统一附加：

- `x-runtime-node-id`
- `x-runtime-node-secret`

覆盖：

- `registerRuntimeNodeRemote()`
- `heartbeatRuntimeNodeRemote()`
- `getRuntimeControlRemote()`
- `reportRuntimeApplyResultRemote()`
- `uploadRuntimeStatsRemote()`

#### T04-C admin 侧准入校验 helper

在 [platform-db.js](/Codex/ACDP/prototype/src/lib/platform-db.js) 建议新增：

- `authorizeRuntimeNodeRegistryAccess(db, input, options = {})`

建议返回：

- 备案记录
- 是否启用
- 地址是否匹配
- secret 是否匹配

#### T04-D runtime 接口接入备案校验

在 [admin-surface.js](/Codex/ACDP/prototype/src/http/admin-surface.js) 中，把以下接口全部接到统一备案校验：

- `POST /api/runtime-nodes/register`
- `POST /api/runtime-nodes/heartbeat`
- `GET /api/runtime-control/me`
- `POST /api/runtime-nodes/{nodeId}/apply-result`
- `POST /api/runtime-nodes/{nodeId}/stats/upload`

要求：

1. 继续保留 `requireRuntimeToken(req)`
2. 再执行节点级备案校验
3. 对 `register / heartbeat` 强制校验地址一致
4. 对 path/query/body/header 中的 `nodeId` 做一致性校验

建议错误码：

- `runtime_node_registry_not_found`
- `runtime_node_registry_disabled`
- `runtime_node_registration_secret_required`
- `runtime_node_registration_secret_invalid`
- `runtime_node_identity_mismatch`
- `runtime_node_address_mismatch`

验收点：

- 未备案节点不能注册
- 已禁用节点不能注册
- 错误 secret 不能注册
- 地址不匹配不能注册
- 备案正确的节点可完成全链路上报

### T05 多 runtime 宿主验证脚本与报告

目标：

- 自动化拉起 `1 admin + 2/3 runtime`，并产出宿主验证报告

建议写入文件：

- `prototype/src/cli/verify-multi-runtime.js`（建议新增）
- `prototype/src/cli/verify-runtime-control.js`
- `prototype/tests/unit/verify-multi-runtime.test.js`（建议新增）

建议实施方式：

#### T05-A 验证脚本

新增 [verify-multi-runtime.js](/Codex/ACDP/prototype/src/cli/verify-multi-runtime.js)，建议支持：

- `--runtime-count 2|3`
- `--base-port`
- `--cluster-base-url`（可选）
- `--with-registration-governance`

脚本步骤建议为：

1. 起 admin
2. 人工写入或自动注入测试备案节点
3. 起 2/3 个 runtime 实例
4. 等待 register / heartbeat 成功
5. 验证 admin 可见所有节点在线
6. 逐个节点直连验证：
   - `/health`
   - `/api/runtime/current`
   - `/api/runtime/correct`
7. 如果提供 `cluster-base-url`，再补跑统一入口验证
8. 输出 summary 报告

#### T05-B 报告目录

沿用现有 `host_verification` 体系，建议报告名：

- `*_multi_runtime_verify_*`

报告至少包含：

- admin base url
- runtime 节点列表
- 备案结果
- 注册结果
- 心跳结果
- 各节点纠错结果
- 可选 cluster 验证结果

验收点：

- 宿主机可一键跑多 runtime 验证
- 至少产出一份 `1 admin + 2 runtime` 成功报告
- 如启用 3 节点，也能稳定产出报告

### T06 console 页面与运行态收口

目标：

- 让备案节点页和在线节点页形成最小运维闭环

建议写入文件：

- `console/client/app.js`
- `console/client/app.css`
- `prototype/tests/unit/console-workflows.test.js`

建议实施方式：

#### T06-A 页面关系

保持：

- `/console/runtime-nodes`：在线状态 / 版本收敛 / 错误 / 统计

新增：

- `/console/runtime-node-registry`：备案管理 / 密钥轮换 / 地址维护

#### T06-B 在线页辅助说明

建议在 `/console/runtime-nodes` 里增加：

- 节点是否已备案摘要
- 跳转到备案详情入口

这样便于快速区分：

- “节点没注册成功”
- “节点根本没备案”

验收点：

- 控制台内能完整看到“备案 -> 注册 -> 在线”链路
- 运维不需要直接翻 DB 才能判断节点为什么没上线

### T07 文档、测试与回归收口

目标：

- 补齐文档、单测、console 回归和宿主报告收口

建议写入文件：

- `docs/37-runtime-admin服务运维手册.md`
- `docs/12-原型实现与当前能力.md`
- `docs/2026-04-02/03-接口与命令速查.md`
- `docs/14-正式对外纠错接口说明.md`（如需补节点治理说明）

必须覆盖的测试：

- `runtime-instance-config.test.js`
- `runtime-node-registry.test.js`
- `runtime-nodes.test.js`
- `runtime-control.test.js`
- `console-api.test.js`
- `console-read.test.js`
- `console-workflows.test.js`

必须运行的回归：

- `cd /Codex/ACDP && npm run smoke:console`
- `cd /Codex/ACDP && npm run test:console`
- `cd /Codex/ACDP && npm run test:unit`

可选但强建议：

- `cd /Codex/ACDP && npm run smoke:runtime`
- `cd /Codex/ACDP && npm run verify:multi-runtime -- --runtime-count=2`

验收点：

- 文档与实现口径一致
- 回归全部通过
- 宿主验证报告已留档

## 6. 关单标准

`JOB-021` 只能在以下条件全部满足后关闭：

1. 能同时启动 `1 admin + 2 runtime`
2. 至少一轮多 runtime 宿主验证报告成功
3. 每个 runtime 实例的 workspace / state / stats / 日志完全隔离
4. 已存在 `runtime_node_registry` 数据模型与最小 console 管理页
5. 未备案节点不能注册
6. 已备案但禁用节点不能注册
7. secret 错误节点不能注册
8. 地址不匹配节点不能注册
9. register / heartbeat / control / apply-result / stats-upload 均已接备案校验
10. 文档、joblist、handoff、测试与回归全部同步

## 7. 非关单前置项

以下内容不作为 `JOB-021` 的关单前置条件：

- ACDP 内建正式负载均衡器
- 节点级 `desiredVersion override`
- 稳定版 / 灰度版差异对比验证
- `/console/runtime-verify` 的 `runtime_node` 模式正式实现
- K8S 真实集群中的 Service / Ingress 最终联调

## 8. 建议实施顺序

建议按以下顺序落地：

1. `T02` 先把多实例启动与隔离做实
2. `T03` 再补备案表与 console CRUD
3. `T04` 再把 runtime 注册链路全部接到备案校验
4. `T05` 再做宿主验证脚本与报告
5. `T06` 最后补 console 收口与状态提示
6. `T07` 收尾文档、测试与回归

## 9. 后续 Codex 开工前建议阅读顺序

1. [55-多runtime实例与节点备案注册方案](./55-多runtime实例与节点备案注册方案.md)
2. [56-JOB-021多runtime实例与节点备案注册实施拆解与验收标准](./56-JOB-021多runtime实例与节点备案注册实施拆解与验收标准.md)
3. [37-runtime-admin服务运维手册](./37-runtime-admin服务运维手册.md)
4. [52-runtime候选纠错接口与验证工作台方案](./52-runtime候选纠错接口与验证工作台方案.md)
5. `project_management/source_of_truth.json`
