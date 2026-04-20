# 多 runtime 实例启动与配置说明

## 1. 文档目的

本文件用于说明 ACDP 当前 `JOB-021` 落地后的多 runtime 实例运行方式，重点回答：

- 多实例 runtime 现在怎么启动
- 相关配置文件在哪里
- 哪些配置项会影响实例行为
- 这些配置项分别代表什么含义
- 多实例下目录、数据库、日志如何隔离
- 当前 runtime 快照下发可以选哪种模式

本文档描述的是当前代码已经具备的实现口径，而不是未来规划。

如需了解当前 `file / admin_http_signed / minio` 三种下发模式的差异，参见：

- [138-v1.0运行快照下发模式对照与admin_http_signed落地方案](./138-v1.0运行快照下发模式对照与admin_http_signed落地方案.md)

相关实现文件：

- [runtime-instance-config.js](../prototype/src/lib/runtime-instance-config.js)
- [start-runtime-instance.js](../prototype/src/cli/start-runtime-instance.js)
- [service-manager.js](../prototype/src/cli/service-manager.js)
- [config.js](../prototype/src/lib/config.js)
- [artifact_store.config.json](../prototype/config/artifact_store.config.json)
- [app.config.json](../prototype/config/app.config.json)

## 2. 多实例启动方式

当前支持三种使用方式。

### 2.1 直接启动单个 runtime 实例

命令：

```bash
cd /Codex/ACDP
npm run start:runtime:instance -- \
  --instance runtime-01 \
  --port 8789 \
  --node-id runtime-node-01 \
  --node-name "Runtime Node 01" \
  --node-env prod \
  --node-address http://127.0.0.1:8789 \
  --admin-base-url http://127.0.0.1:8788 \
  --registration-secret your-secret
```

特点：

- 适合手工调试
- 前台运行
- 直接使用实例化隔离目录

### 2.2 以守护方式启动单个 runtime 实例

命令：

```bash
cd /Codex/ACDP
npm run service:start:runtime -- \
  --instance runtime-01 \
  --port 8789 \
  --node-id runtime-node-01 \
  --node-name "Runtime Node 01" \
  --node-env prod \
  --node-address http://127.0.0.1:8789 \
  --admin-base-url http://127.0.0.1:8788 \
  --registration-secret your-secret
```

查看状态：

```bash
npm run service:status:runtime -- --instance runtime-01
```

停止：

```bash
npm run service:stop:runtime -- --instance runtime-01
```

特点：

- 适合宿主机常驻运行
- 支持实例级 PID / 日志文件

### 2.3 一次性验证 `1 admin + 2 runtime`

命令：

```bash
cd /Codex/ACDP
npm run verify:multi-runtime
```

作用：

- 自动准备一套 admin workspace
- 自动准备 2 个 runtime 实例配置
- 自动写入节点备案台账
- 自动完成 control sync
- 自动验证两个 runtime 的 `/api/runtime/correct`
- 自动输出验证报告

## 3. 配置来源与优先级

当前多实例 runtime 不是“每个实例各有一个静态 JSON 配置文件”。

实际生效逻辑是三层：

1. 基础配置文件
2. 环境变量覆盖
3. 实例启动参数覆盖

优先级从低到高：

1. [app.config.json](../prototype/config/app.config.json)
2. [artifact_store.config.json](../prototype/config/artifact_store.config.json)
3. `config.js` 中通过 `*Env` 读取到的环境变量
4. `start-runtime-instance.js` / `service-manager.js` 传入的实例参数

最终由 [runtime-instance-config.js](../prototype/src/lib/runtime-instance-config.js) 生成该实例的完整配置对象。

## 4. 配置文件位置

### 4.1 基础服务配置

文件：

- [app.config.json](../prototype/config/app.config.json)

用途：

- 服务监听端口默认值
- 默认 workspace 路径
- 默认数据库路径
- 默认 release / catalog / validation feed 路径
- 通用 auth 和 WebSocket 治理配置

### 4.2 制品仓与 runtime control 配置

文件：

- [artifact_store.config.json](../prototype/config/artifact_store.config.json)

用途：

- artifact store 连接参数
- runtime 到 admin 的 control 参数
- runtime 快照下发模式参数
- runtime 节点身份参数
- 节点级 `registrationSecret`

### 4.3 运行时实例化配置构造器

文件：

- [runtime-instance-config.js](../prototype/src/lib/runtime-instance-config.js)

用途：

- 根据基础配置 + 实例参数，派生独立的实例配置
- 自动生成实例级目录和路径
- 自动覆盖 runtime 节点身份信息

## 5. `app.config.json` 相关配置项说明

### 5.1 `server`

| 配置项 | 含义 |
|---|---|
| `host` | 默认监听地址 |
| `port` | 默认服务端口 |
| `runtimePort` | runtime 默认端口 |
| `adminPort` | admin 默认端口 |
| `urlBaseForParsing` | 服务端内部解析相对 URL 时的基准地址 |

说明：

- 多实例 runtime 启动时，`port` / `runtimePort` 会被实例参数覆盖
- admin 默认仍走单实例口径

### 5.2 `paths`

| 配置项 | 含义 |
|---|---|
| `workspaceDir` | 默认共享 workspace 根目录 |
| `hostVerificationDir` | 默认验证报告目录 |
| `catalogDir` | 默认 catalog 目录 |
| `releasesDir` | 默认 release 目录 |
| `latestReleaseDir` | 默认 latest 目录 |
| `databaseFile` | 默认 SQLite 文件 |
| `validationFeedInboxDir` | feed inbox |
| `validationFeedArchiveDir` | feed archive |
| `validationFeedErrorDir` | feed error |
| `validationFeedReceiptDir` | feed receipt |
| `seedCatalogFile` | 种子词典文件 |

说明：

- 这些是单实例基线
- 多实例 runtime 不直接复用这些路径，而是派生成实例级路径

### 5.3 `auth`

| 配置项 | 含义 |
|---|---|
| `runtimeBearerToken` | runtime 对外接口和 runtime->admin 控制链路共用的 Bearer Token |
| `runtimeBearerTokenEnv` | 读取 runtime token 的环境变量名 |
| `websocketMaxConnections` | WebSocket 最大连接数 |
| `websocketIdleTimeoutMs` | WebSocket 空闲超时 |
| `websocketMaxMessageBytes` | WebSocket 单消息最大字节数 |
| `websocketCallerIdHeader` | callerId 请求头名 |
| `websocketCallerSecretHeader` | callerSecret 请求头名 |
| `websocketCallerIdQueryKey` | callerId query 参数名 |
| `websocketCallerSecretQueryKey` | callerSecret query 参数名 |
| `websocketRejectUnknownCallers` | 是否拒绝未知 caller |
| `websocketBlacklistIps` | 黑名单 IP |

说明：

- 这些配置本身不按实例拆开
- 多实例 runtime 会共享同一套对外 auth 口径，除非你另外传环境变量或改基础配置

## 6. `artifact_store.config.json` 相关配置项说明

### 6.1 `artifactStore`

| 配置项 | 含义 |
|---|---|
| `provider` | 制品仓类型，当前主要是 `minio` |
| `endpoint` | 制品仓内部访问地址 |
| `endpointEnv` | `endpoint` 对应环境变量名 |
| `publicBaseUrl` | runtime / 外部访问制品时使用的公开地址 |
| `publicBaseUrlEnv` | `publicBaseUrl` 对应环境变量名 |
| `bucket` | 制品所在 bucket |
| `bucketEnv` | `bucket` 对应环境变量名 |
| `region` | 对象存储 region |
| `regionEnv` | `region` 对应环境变量名 |
| `accessStyle` | path 或 virtual host 访问模式 |
| `useSsl` | 是否使用 SSL |
| `presignExpiresSeconds` | 预签名 URL 过期时间 |
| `rootUser/rootPassword` | 本地或管理用途账号 |
| `accessKey/secretKey` | runtime / admin 实际访问凭据 |
| `serverDataDir` | 本地 MinIO 数据目录 |
| `apiPort` | MinIO API 端口 |
| `consolePort` | MinIO Console 端口 |

说明：

- 多实例 runtime 通常共享同一套 artifact store
- 差异主要在“谁拉、拉到哪个实例目录”

### 6.2 `runtimeDelivery`

| 配置项 | 含义 |
|---|---|
| `mode` | runtime 快照下发模式：`file` / `admin_http_signed` / `minio` |
| `adminArtifactBaseUrl` | `admin_http_signed` 模式下 runtime 下载快照时使用的 admin 基准地址 |
| `adminArtifactBaseUrlEnv` | 对应环境变量名 |
| `signedUrlSecret` | `admin_http_signed` 下载签名密钥 |
| `signedUrlSecretEnv` | 对应环境变量名 |
| `signedUrlExpiresSeconds` | `admin_http_signed` 下载链接过期秒数 |
| `bindNodeId` | 是否把 `nodeId` 绑定进签名 URL |
| `bindConfigVersion` | 是否把 `configVersion` 绑定进签名 URL |

说明：

- `file` 适合同机或共享挂载目录
- `admin_http_signed` 适合 `1 admin + 1~3 runtime` 的跨机轻量部署
- `minio` 适合对象存储部署
- 当前仓库默认 `mode = admin_http_signed`

### 6.3 `runtimeControl`

| 配置项 | 含义 |
|---|---|
| `adminBaseUrl` | runtime 连接哪个 admin 控制面 |
| `adminBaseUrlEnv` | 对应环境变量名 |
| `nodeId` | runtime 节点唯一 ID |
| `nodeIdEnv` | 对应环境变量名 |
| `nodeName` | 节点展示名 |
| `nodeNameEnv` | 对应环境变量名 |
| `nodeEnv` | 节点环境标识 |
| `nodeEnvEnv` | 对应环境变量名 |
| `nodeAddress` | admin 备案和校验用的节点地址 |
| `nodeAddressEnv` | 对应环境变量名 |
| `registrationSecret` | 节点级注册密钥 |
| `registrationSecretEnv` | 对应环境变量名 |
| `heartbeatIntervalSeconds` | runtime 心跳间隔 |
| `syncIntervalSeconds` | runtime 拉 control 间隔 |
| `nodeOfflineThresholdSeconds` | admin 判离线阈值 |
| `downloadTimeoutMs` | 拉取制品超时 |
| `statsFlushIntervalSeconds` | 本地统计刷回间隔 |
| `statsFlushMaxBatchSize` | 单批统计上传最大记录数 |
| `statsRetentionHours` | 本地统计保留时长 |

说明：

- 在多实例场景下，`nodeId` / `nodeName` / `nodeEnv` / `nodeAddress` / `registrationSecret` 是最关键的实例身份参数
- 如果不覆盖这些值，多个 runtime 会被 admin 视为同一个节点

## 7. 实例启动参数说明

实例启动参数由 [start-runtime-instance.js](../prototype/src/cli/start-runtime-instance.js) 和 [service-manager.js](../prototype/src/cli/service-manager.js) 支持。

| 参数 | 含义 |
|---|---|
| `--instance` | 实例 ID，用于生成独立目录和日志文件名 |
| `--host` | 当前实例监听地址 |
| `--port` | 当前实例监听端口 |
| `--workspace-root` | 多实例根目录，默认 `prototype/runtime_instances` |
| `--node-id` | 当前实例在 admin 中的节点唯一 ID |
| `--node-name` | 当前实例展示名称 |
| `--node-env` | 当前实例环境标识 |
| `--node-address` | 当前实例在 admin 中登记的访问地址 |
| `--admin-base-url` | 当前实例连接的 admin 地址 |
| `--registration-secret` | 当前实例对应备案节点的密钥 |

说明：

- `--instance` 是实例化模式下的核心参数
- `--node-id` 和 `--registration-secret` 决定该实例能否通过 admin 节点备案校验

## 8. 实例级路径派生规则

当实例 ID 为 `runtime-01`，且 `workspaceRoot=/Codex/ACDP/prototype/runtime_instances` 时，当前实现会派生：

- `instanceRoot`
  - `/Codex/ACDP/prototype/runtime_instances/runtime-01`
- `workspaceDir`
  - `/Codex/ACDP/prototype/runtime_instances/runtime-01/workspace`
- `catalogDir`
  - `/Codex/ACDP/prototype/runtime_instances/runtime-01/workspace/catalog`
- `releasesDir`
  - `/Codex/ACDP/prototype/runtime_instances/runtime-01/workspace/releases`
- `latestReleaseDir`
  - `/Codex/ACDP/prototype/runtime_instances/runtime-01/workspace/releases/latest`
- `runtimeArtifactsDir`
  - `/Codex/ACDP/prototype/runtime_instances/runtime-01/workspace/runtime_artifacts`
- `runtimeStateDir`
  - `/Codex/ACDP/prototype/runtime_instances/runtime-01/workspace/runtime_state`
- `hostVerificationDir`
  - `/Codex/ACDP/prototype/runtime_instances/runtime-01/workspace/host_verification`
- `databaseFile`
  - `/Codex/ACDP/prototype/runtime_instances/runtime-01/workspace/platform.db`
- `validationFeedInboxDir`
  - `/Codex/ACDP/prototype/runtime_instances/runtime-01/workspace/validation_feeds/inbox`

这意味着多个 runtime 实例不会共享：

- workspace
- runtime state
- runtime artifacts
- SQLite
- validation feed 目录

## 9. 守护模式下的 PID 与日志文件

如果通过 `service-manager` 启动 runtime 实例，当前会生成实例级文件名：

- `runtime-<instance>.pid`
- `runtime-<instance>.out.log`
- `runtime-<instance>.err.log`

目录位于：

- `<base workspace>/service/`

例如默认基线下：

- `/Codex/ACDP/prototype/workspace/service/runtime-runtime-01.pid`
- `/Codex/ACDP/prototype/workspace/service/runtime-runtime-01.out.log`
- `/Codex/ACDP/prototype/workspace/service/runtime-runtime-01.err.log`

说明：

- runtime 业务目录按实例隔离
- 守护日志按实例命名区分
- admin 仍维持单实例 `admin.pid/out.log/err.log`

## 10. 节点备案与实例参数的关系

当前多实例并不是“只要端口不冲突就能启动”。

一个 runtime 实例如果要接入 admin 控制面，必须同时满足：

1. `nodeId` 已在 `runtime_node_registry` 备案
2. 该备案项 `enabled=true`
3. runtime 实际使用的 `registrationSecret` 与备案记录匹配
4. `register / heartbeat` 上报的 `address` 与备案地址一致

所以在实际部署时，建议顺序是：

1. 先在 `/console/runtime-node-registry` 备案节点
2. 记录生成的明文 `registrationSecret`
3. 再用该 secret 启动对应实例

## 11. 推荐的 `1 admin + 2 runtime` 启动示例

### 11.1 启动 admin

```bash
cd /Codex/ACDP
npm run start:admin
```

### 11.2 在控制台备案两个节点

建议节点信息：

- `runtime-node-01`
  - `address=http://127.0.0.1:8789`
- `runtime-node-02`
  - `address=http://127.0.0.1:8790`

### 11.3 启动两个 runtime 实例

```bash
cd /Codex/ACDP
npm run start:runtime:instance -- \
  --instance runtime-01 \
  --port 8789 \
  --node-id runtime-node-01 \
  --node-name "Runtime Node 01" \
  --node-env test \
  --node-address http://127.0.0.1:8789 \
  --admin-base-url http://127.0.0.1:8788 \
  --registration-secret secret-for-node-01
```

```bash
cd /Codex/ACDP
npm run start:runtime:instance -- \
  --instance runtime-02 \
  --port 8790 \
  --node-id runtime-node-02 \
  --node-name "Runtime Node 02" \
  --node-env test \
  --node-address http://127.0.0.1:8790 \
  --admin-base-url http://127.0.0.1:8788 \
  --registration-secret secret-for-node-02
```

### 11.4 验证

可直接跑：

```bash
cd /Codex/ACDP
npm run verify:multi-runtime
```

当前最新多实例验证报告示例：

- [summary.json](../prototype/workspace-multi-runtime-verify-admin/host_verification/2026-04-07T11-30-49-867Z_multi_runtime_verify/summary.json)

## 12. 一句话总结

当前多实例 runtime 的配置方式是：

- 以 [app.config.json](../prototype/config/app.config.json) 和 [artifact_store.config.json](../prototype/config/artifact_store.config.json) 作为基础配置
- 通过环境变量覆盖敏感项或宿主差异项
- 通过实例启动参数覆盖实例身份与实例路径
- 最终由 [runtime-instance-config.js](../prototype/src/lib/runtime-instance-config.js) 动态生成该实例的完整隔离配置

如果后续要进入真实宿主或集群，建议优先保持这套规则不变：

- admin 单实例
- runtime 多实例
- 先备案，后注册
- 每实例独立 workspace / state / artifacts / db / log
