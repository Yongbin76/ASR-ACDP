# 多 runtime 实例与节点备案注册方案

## 1. 文档目的

本文件用于承接一条新的 runtime 治理与验证主线，统一回答以下问题：

- 当前 ACDP 是否具备同时运行多个 runtime 实例的架构基础
- 如何以 `1 admin + 2/3 runtime` 的形态验证多 runtime 对外服务能力
- runtime 到 admin 的注册机制为什么需要从“自动入库”升级为“人工备案后注册”
- 后续 `/console/runtime-verify`、`/console/runtime-nodes` 与运行控制能力应如何衔接

本文件描述的是下一轮实现方案，不代表当前代码已经全部具备这些能力。当前已实现能力仍以 [12-原型实现与当前能力](./12-原型实现与当前能力.md)、[14-正式对外纠错接口说明](./14-正式对外纠错接口说明.md)、[37-runtime-admin服务运维手册](./37-runtime-admin服务运维手册.md) 为准。

## 2. 当前基线与问题

当前代码已经具备多 runtime 节点的架构基础：

- admin 侧已有 `runtime_nodes` 在线状态与版本收敛模型
- runtime 已具备 `register / heartbeat / apply-result / stats-upload` 主动上报链路
- runtime control 已支持按 `nodeId` 拉取当前目标版本
- 控制台已有 `/console/runtime-nodes` 列表页与详情页

但当前正式启动入口和注册机制仍有两个明显问题。

### 2.1 多 runtime 启动仍偏单实例友好

当前 `start:runtime` 和 `service:start:runtime` 只天然支持：

- 覆盖 runtime 监听端口
- 复用同一套默认 workspace
- 复用同一套 runtime 状态目录与本地统计库
- 复用同一套 `runtime.pid / runtime.out.log / runtime.err.log`

这意味着：

- 多开进程在端口层面是可行的
- 但多实例在工作目录、状态文件、统计库、日志与 PID 管理上并不真正隔离

### 2.2 runtime 注册当前仍是“拿 token 就能自注册”

当前 `POST /api/runtime-nodes/register` 只校验共享 runtime bearer token，然后：

- 如果节点存在就更新
- 如果节点不存在就直接插入

这会带来 3 个问题：

1. admin 无法先确认“哪些节点被允许接入”
2. runtime 自报的 `address` 缺少 admin 侧强校验
3. 只靠共享 token，无法做到节点级身份治理

因此，当前机制更像“自动发现”，而不是“受控接入”。

## 3. 目标状态

本批目标收敛为两条主线：

1. 支持 `1 admin + 2/3 runtime` 的多实例验证基线
2. 将 runtime 注册机制升级为“人工备案后注册”

### 3.1 多实例验证拓扑

建议第一阶段采用以下宿主机拓扑：

- `admin-01`
  - 端口：`8788`
  - 职责：控制面、console、runtime control、节点台账、节点状态汇总
- `runtime-01`
  - 端口：`8787`
  - 职责：对外提供 `correct / ws correct / simulate`
- `runtime-02`
  - 端口：`8789`
  - 职责：对外提供同等服务
- `runtime-03`
  - 端口：`8790`
  - 职责：可选，用于验证 3 节点场景

每个 runtime 必须使用独立工作目录，例如：

- `prototype/runtime_instances/runtime-01/`
- `prototype/runtime_instances/runtime-02/`
- `prototype/runtime_instances/runtime-03/`

每个实例至少要独立以下项：

- `server.port`
- `runtimeControl.nodeId`
- `runtimeControl.nodeName`
- `runtimeControl.nodeAddress`
- `resolvedPaths.workspaceDir`
- `resolvedPaths.runtimeStateDir`
- `resolvedPaths.runtimeArtifactsDir`
- `resolvedPaths.databaseFile`

### 3.2 注册治理目标

runtime 不再允许“第一次带 token 来就自动落表”。目标机制应改为：

1. admin 先人工备案节点
2. admin 为节点生成注册密钥
3. runtime 带 `nodeId + registrationSecret` 发起注册
4. admin 校验备案记录、密钥和地址后，才允许上线

也就是说：

- `runtime_node_registry` 负责“是否允许接入”
- `runtime_nodes` 负责“当前是否在线、版本是什么、最近状态如何”

## 4. 建议数据模型

### 4.1 备案表：`runtime_node_registry`

建议新增一张人工备案表：

- `node_id`
- `node_name`
- `env`
- `access_host`
- `access_port`
- `advertised_base_url`
- `enabled`
- `registration_secret_hash`
- `remarks`
- `created_by`
- `created_at`
- `updated_at`

字段口径：

- `node_id`：runtime 唯一身份，运行时必须与上报值完全一致
- `access_host / access_port / advertised_base_url`：备案期望接入地址
- `enabled`：节点是否允许注册
- `registration_secret_hash`：节点级密钥，不保存明文

### 4.2 状态表：`runtime_nodes`

当前 `runtime_nodes` 继续保留，职责限定为：

- 当前在线/离线状态
- 当前版本 / 目标版本
- 最近心跳
- 最近应用状态
- 最近错误
- 本地统计游标

也就是说：

- `runtime_node_registry` 是静态接入台账
- `runtime_nodes` 是动态运行状态

## 5. 注册与鉴权流程

建议把当前 runtime 到 admin 的请求分成两层校验。

### 5.1 传输层校验

继续保留当前 shared runtime bearer token。

作用：

- 过滤完全未授权调用
- 继续作为 runtime 面统一保护层

### 5.2 节点层校验

在 shared token 之外，新增节点级校验：

- `nodeId`
- `registrationSecret`
- 备案地址匹配

建议 runtime 在所有 control 上报请求中带上：

- `x-runtime-node-id`
- `x-runtime-node-secret`

其中：

- `register / heartbeat` 仍在 body 中带 `nodeId`、`address`
- admin 需同时校验 header/body/path 一致性

### 5.3 各接口的治理口径

#### `POST /api/runtime-nodes/register`

必须同时满足：

- bearer token 合法
- `nodeId` 已在 `runtime_node_registry` 备案
- 备案记录 `enabled=true`
- `registrationSecret` 匹配
- runtime 上报的 `address` 与备案地址一致

校验通过后，才允许写 `runtime_nodes`

#### `POST /api/runtime-nodes/heartbeat`

必须同时满足：

- bearer token 合法
- 节点已备案且启用
- `registrationSecret` 匹配
- `nodeId` 与 header/body 一致
- `address` 与备案地址一致

#### `GET /api/runtime-control/me`

必须同时满足：

- bearer token 合法
- 节点已备案且启用
- `registrationSecret` 匹配
- `nodeId` 与 query/header 一致

#### `POST /api/runtime-nodes/{nodeId}/apply-result`

必须同时满足：

- bearer token 合法
- 节点已备案且启用
- `registrationSecret` 匹配
- path/header/body 中的 `nodeId` 一致

#### `POST /api/runtime-nodes/{nodeId}/stats/upload`

必须同时满足：

- bearer token 合法
- 节点已备案且启用
- `registrationSecret` 匹配
- path/header/body 中的 `nodeId` 一致

### 5.4 建议错误码

建议补充并统一以下错误码：

- `runtime_node_registry_not_found`
- `runtime_node_registry_disabled`
- `runtime_node_registration_secret_required`
- `runtime_node_registration_secret_invalid`
- `runtime_node_identity_mismatch`
- `runtime_node_address_mismatch`

## 6. 验证模式建议

### 6.1 第一阶段：节点直连验证

第一阶段先验证：

- `1 admin + 2 runtime` 可同时启动
- 每个 runtime 有独立 `nodeId`
- admin 中可看到 2 个节点在线
- 每个 runtime 可独立响应：
  - `GET /health`
  - `GET /api/runtime/current`
  - `POST /api/runtime/correct`
  - `GET /ws/runtime/correct`

这是本批必须完成的基线。

### 6.2 第二阶段：3 节点验证

在 2 节点稳定后，再扩到：

- `1 admin + 3 runtime`

重点验证：

- 节点台账与在线状态不会串
- 心跳、apply-result、stats-upload 不会互相覆盖
- `/console/runtime-nodes` 可正确展示 3 个节点

### 6.3 第三阶段：统一入口验证

真正意义上的“多 runtime 对外服务”还需要一个统一入口，例如：

- 宿主机上的 Nginx / HAProxy
- K8S `Service`
- 后续的 ingress / gateway

因此本批建议把统一入口验证定义为“扩展验证位”，可以接受两种方式：

1. 本批只完成多 runtime 直连与 admin 管控闭环
2. 若环境允许，再额外通过 `--cluster-base-url` 或反向代理补跑统一入口验证

本批不要求在 ACDP 产品代码内置正式 LB 功能。

## 7. 控制台建议

建议新增一条管理页面，而不是继续把所有职责都堆在 `/console/runtime-nodes`：

- 新页面：`/console/runtime-node-registry`

职责：

- 查看备案节点
- 新增备案节点
- 启用 / 禁用节点
- 轮换注册密钥
- 查看备案地址与最近注册状态

而现有 `/console/runtime-nodes` 保持职责纯粹：

- 查看在线状态
- 查看版本对齐
- 查看最近错误
- 查看 apply / stats 状态

这样分层更清晰：

- `runtime-node-registry`：准入台账
- `runtime-nodes`：运行态观测

## 8. 与 `/console/runtime-verify` 的关系

这条主线与 `JOB-020` 有明确衔接关系：

- `JOB-020` 已预留：
  - `targetMode=cluster_current`
  - `targetMode=runtime_node`
  - `targetMode=gray_preview`

而本批会为 `targetMode=runtime_node` 打基础：

- 节点具备稳定身份
- 节点具备 admin 侧备案台账
- 控制台可选择已备案 / 已在线节点做验证

因此建议：

- `JOB-020` 继续先做 `cluster_current`
- `JOB-021` 完成后，再扩 `runtime_node`

## 9. 非目标范围

本批当前不包含：

- 把 runtime 外部统一入口做成 ACDP 产品内建网关
- 节点级 `desiredVersion override`
- 灰度策略按节点差异化下发
- 真正的多租户 runtime 接入体系
- 替换现有 shared runtime bearer token 体系

## 10. 建议收尾标准

建议以以下标准作为本批关单依据：

1. 能同时稳定启动 `1 admin + 2 runtime`
2. admin 中能看到 2 个节点独立在线
3. 每个 runtime 均有独立 workspace / state / stats / 日志
4. 未备案节点不能注册
5. 已备案但禁用节点不能注册
6. 已备案但密钥错误节点不能注册
7. 已备案但地址不匹配节点不能注册
8. 备案通过后，节点可正常完成 register / heartbeat / control / apply-result / stats-upload
9. 形成至少一份多 runtime 宿主验证报告
10. 文档、joblist、handoff 已同步
