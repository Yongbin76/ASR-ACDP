# runtime-control 接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：runtime 到 admin 的控制与汇报接口

## 1. 接口范围

本文档定义 runtime 与 admin 之间的控制链接口。

当前覆盖：

1. `POST /api/runtime-nodes/register`
2. `POST /api/runtime-nodes/heartbeat`
3. `GET /api/runtime-control/me`
4. `POST /api/runtime-nodes/{nodeId}/apply-result`
5. `POST /api/runtime-nodes/{nodeId}/stats/upload`
6. `GET /api/runtime-artifacts/releases/{releaseId}/{fileName}`

## 2. 代码入口

主要代码文件：

1. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)
2. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
3. [`runtime-control-client.js`](/Codex/ACDP/prototype/src/lib/runtime-control-client.js)
4. [`artifact-store.js`](/Codex/ACDP/prototype/src/lib/artifact-store.js)

## 3. 统一鉴权规则

这组接口统一要求：

1. `requireRuntimeToken(req)`
2. 节点身份校验
3. 备案密钥校验

### 3.1 节点身份来源

节点身份来自：

1. `x-runtime-node-id` header
2. 请求体 `nodeId`
3. 路径参数中的 `{nodeId}`

### 3.2 备案密钥来源

备案密钥来自：

1. `x-runtime-node-secret` header
2. 请求体 `registrationSecret`
3. 查询串 `registrationSecret`

### 3.3 关键约束

1. 节点必须先在 `runtime_node_registry` 中备案且启用。
2. address 校验失败时，不允许进入注册链。

## 4. 接口明细

### 4.1 `POST /api/runtime-nodes/register`

#### 作用

runtime 首次接入或重启后向 admin 注册。

#### 请求字段

| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `nodeId` | `string` | 是 | 节点 ID |
| `nodeName` | `string` | 否 | 节点名称 |
| `address` | `string` | 是 | 节点地址 |
| `env` | `string` | 否 | 环境 |
| `currentVersion` | `string` | 否 | 当前版本 |
| `runtimeVersion` | `string` | 否 | runtime 程序版本 |
| `registrationSecret` | `string` | 否 | 备案密钥 |

#### 响应

```json
{
  "ok": true,
  "item": {
    "nodeId": "ACDP_AGENT_001",
    "status": "online"
  }
}
```

### 4.2 `POST /api/runtime-nodes/heartbeat`

#### 作用

runtime 周期性上报心跳。

#### 请求字段

与 `register` 基本一致，允许携带：

1. 当前版本
2. 最近应用状态
3. 最近错误
4. 统计游标

#### 响应

```json
{
  "ok": true,
  "item": {
    "nodeId": "ACDP_AGENT_001",
    "status": "online"
  }
}
```

### 4.3 `GET /api/runtime-control/me`

#### 作用

runtime 读取当前节点的控制视图。

#### 请求参数

| 参数 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `nodeId` | `string` | 是 | 节点 ID |
| `registrationSecret` | `string` | 否 | 备案密钥 |

#### 响应字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `nodeId` | `string` | 节点 ID |
| `currentVersion` | `string` | 当前版本 |
| `desiredVersion` | `string` | 目标版本 |
| `artifactUrl` | `string` | 主下载地址 |
| `checksum` | `string` | 主制品校验值 |
| `issuedAt` | `string|null` | 下发时间 |
| `configVersion` | `number` | 控制配置版本 |
| `artifactMetadata` | `object|null` | 完整制品元数据 |

### 4.4 `POST /api/runtime-nodes/{nodeId}/apply-result`

#### 作用

runtime 安装或切换版本后回传 apply 结果。

#### 请求字段

| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `status` | `string` | 是 | `success/failed/rolled_back` |
| `currentVersion` | `string` | 否 | 当前版本 |
| `desiredVersion` | `string` | 否 | 目标版本 |
| `lastError` | `string` | 否 | 最近错误 |
| `registrationSecret` | `string` | 否 | 备案密钥 |

#### 响应

```json
{
  "ok": true,
  "item": {
    "nodeId": "ACDP_AGENT_001",
    "lastApplyStatus": "success"
  }
}
```

### 4.5 `POST /api/runtime-nodes/{nodeId}/stats/upload`

#### 作用

runtime 批量上传本地统计。

#### 请求字段

| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `batchId` | `string` | 是 | 上传批次 ID |
| `records` | `array` | 是 | 上传记录数组 |
| `registrationSecret` | `string` | 否 | 备案密钥 |

#### `records[]` 典型字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `sequence` | `number` | 批次内序号 |
| `type` | `string` | 记录类型 |
| `payload` | `object` | 统计载荷 |

#### 响应

响应为 `uploadRuntimeNodeStats()` 的汇总结果，通常包含：

1. `insertedCount`
2. `duplicateCount`
3. `batchId`

### 4.6 `GET /api/runtime-artifacts/releases/{releaseId}/{fileName}`

#### 作用

在 `admin_http_signed` 模式下，由 admin 直接提供 runtime 制品下载。

#### 查询参数

| 参数 | 类型 | 含义 |
|---|---|---|
| `nodeId` | `string` | 节点 ID |
| `expires` | `string` | 过期时间 |
| `configVersion` | `string` | 控制版本 |
| `signature` | `string` | 签名 |

#### 校验内容

1. 签名有效性。
2. 过期时间。
3. 节点备案状态。
4. release 是否存在。
5. 文件是否存在。

## 5. 典型错误码

| 错误码 | 场景 |
|---|---|
| `runtime_node_registry_missing` | 节点未备案 |
| `runtime_node_registry_disabled` | 备案被禁用 |
| `runtime_node_secret_required` | 未提供备案密钥 |
| `runtime_node_secret_invalid` | 备案密钥错误 |
| `runtime_node_address_mismatch` | 地址与备案不一致 |
| `runtime_node_not_found` | 节点未注册到 `runtime_nodes` |
| `runtime_control_release_id_required` | 未提供目标 releaseId |
| `runtime_control_release_not_found` | 目标 release 不存在 |
| `runtime_stats_batch_id_required` | 统计上传缺少 batchId |
| `runtime_artifact_release_not_found` | 下载的 release 不存在 |
| `runtime_artifact_file_missing` | 下载的文件不存在 |
| `runtime_artifact_node_not_registered` | 节点没有下载权限 |

## 6. 相关测试

至少覆盖：

1. [`runtime-control.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-control.test.js)
2. [`runtime-node-registry.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-node-registry.test.js)
3. [`runtime-nodes.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-nodes.test.js)
4. [`runtime-stats-sync.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-stats-sync.test.js)

## 7. 修改接口时必须同步

1. `platform-db.js`
2. `admin-surface.js`
3. `runtime-control-client.js`
4. 运行治理相关帮助和部署说明
5. 控制面与 runtime-control 相关测试
