# WebSocket caller identity 与 quota 治理首轮方案

## 1. 目标

本方案用于为 `GET /ws/runtime/correct` 提供第一轮更细粒度的外部治理能力，同时保持当前原型的最小兼容性。

首轮目标只覆盖：

- caller identity
- caller 级并发配额
- caller 级消息速率配额
- caller / IP blacklist
- 运行时观测快照

不在本轮范围内：

- 持久化额度中心
- 分布式多实例共享限流
- CIDR 级网段匹配
- 审计后台页面

## 2. caller identity 模型

当前 WebSocket caller 识别按以下优先级执行：

1. 优先读取 `callerId`
   - header：`x-acdp-caller-id`
   - query：`callerId`
2. 若 `callerId` 命中注册表：
   - 优先要求 caller 自己的 secret
   - secret 可来自：
     - header：`x-acdp-caller-secret`
     - query：`callerSecret`
     - `Authorization: Bearer <secret>`
3. 若未命中注册表，或当前未启用 caller 注册表：
   - 回退到 legacy runtime token 模式
   - caller 视为 `legacy_runtime_token` 或 `anonymous`

补充约束：

- 当 `websocketRejectUnknownCallers=true` 且 caller 注册表非空时：
  - 未注册 caller 会被拒绝
  - 未提供 `callerId` 也不会再回退到 legacy caller

这样做的目的：

- 保持当前 Bearer Token 路径兼容
- 允许逐步切到 per-caller secret
- 不把 caller 身份硬编码到业务逻辑里

## 3. quota 模型

首轮 quota 采用内存态、单实例模型：

- 全局连接上限：
  - `websocketMaxConnections`
- 默认 caller 并发连接上限：
  - `websocketDefaultMaxConnectionsPerCaller`
- 默认 caller 每分钟消息上限：
  - `websocketDefaultMaxRequestsPerMinute`
- caller 覆盖项：
  - `maxConnections`
  - `maxRequestsPerMinute`

当前速率限制窗口固定为最近 60 秒滚动窗口。

首轮结论：

- 适合当前单实例 prototype / MVP runtime
- 若后续进入多副本 runtime，需要把 quota 状态移出进程内存

## 4. blacklist 策略

首轮支持两层 blacklist：

- caller blacklist
  - `enabled=false`
  - `blacklisted=true`
  - `blacklistReason`
- IP blacklist
  - `websocketBlacklistIps`
  - 首轮按精确 IP 文本匹配

地址解析优先读取：

- `x-forwarded-for`

否则回退：

- `req.socket.remoteAddress`

## 5. 配置模型

`prototype/config/app.config.json` 的 `auth` 新增以下治理参数：

- `websocketCallerIdHeader`
- `websocketCallerSecretHeader`
- `websocketCallerIdQueryKey`
- `websocketCallerSecretQueryKey`
- `websocketCallerIpHeader`
- `websocketRejectUnknownCallers`
- `websocketDefaultMaxConnectionsPerCaller`
- `websocketDefaultMaxRequestsPerMinute`
- `websocketBlacklistIps`
- `websocketCallers[]`

`websocketCallers[]` 单项结构：

- `callerId`
- `displayName`
- `secret` / `secretEnv`
- `enabled`
- `blacklisted`
- `blacklistReason`
- `maxConnections`
- `maxRequestsPerMinute`

## 6. 首轮实现落点

已落代码：

- `prototype/src/lib/runtime-ws-governance.js`
  - caller 识别
  - caller 认证
  - blacklist
  - 连接数配额
  - 消息速率配额
  - 治理快照
- `prototype/src/server.js`
  - `/ws/runtime/correct` 升级路径已接入治理器
  - `/api/runtime/stats` 已暴露 `websocketGovernance` 快照
- `prototype/src/lib/config.js`
  - 已增加治理相关配置解析

## 7. 当前限制

- 配额与 blacklist 状态仅在单进程内存中生效
- 未接入外部 caller 管理中心
- 未提供 CIDR / ASN / 地域级策略
- 未提供管理端 UI，仅保留运行时 stats 观测

## 8. 后续扩展建议

若未来 WebSocket 成为正式生产入口，下一步建议：

1. 把 caller registry 挪到控制面或独立配置中心
2. 把 quota 计数挪到 Redis 等共享状态
3. 补 caller 审计日志与封禁操作链路
4. 视接入形态补 CIDR、来源应用、环境标签等治理维度
