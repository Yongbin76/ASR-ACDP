# `runtime_nodes` 与 `runtime_node_registry` 表详细字典

- 文档状态：active
- 适用版本：v1.0
- 文档类型：data_dictionary
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`runtime_nodes`、`runtime_node_registry`

## 1. 表组作用

这两张表用于把“备案台账”和“实时节点”分开。

### 1.1 `runtime_node_registry`

作用：

1. 管理允许接入 admin 的 runtime 节点。
2. 记录人工备案信息和注册密钥指纹。

### 1.2 `runtime_nodes`

作用：

1. 记录实际已接入 runtime 的实时状态。
2. 展示当前版本、目标版本、最近心跳和应用结果。

## 2. `runtime_nodes`

### 2.1 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 含义 |
|---|---|---|---|---|
| `node_id` | `TEXT` | 否 | 无 | 节点主键 |
| `node_name` | `TEXT` | 否 | 无 | 节点名称 |
| `env` | `TEXT` | 否 | `''` | 环境 |
| `address` | `TEXT` | 否 | `''` | 运行地址 |
| `runtime_version` | `TEXT` | 否 | `''` | runtime 程序版本 |
| `current_version` | `TEXT` | 否 | `''` | 当前词典版本 |
| `desired_version` | `TEXT` | 否 | `''` | 目标词典版本 |
| `status` | `TEXT` | 否 | `online` | 节点状态基值 |
| `last_heartbeat_at` | `TEXT` | 是 | `NULL` | 最近心跳 |
| `last_register_at` | `TEXT` | 是 | `NULL` | 最近注册时间 |
| `last_apply_at` | `TEXT` | 是 | `NULL` | 最近应用时间 |
| `last_apply_status` | `TEXT` | 否 | `''` | 最近应用状态 |
| `last_error` | `TEXT` | 否 | `''` | 最近错误 |
| `runtime_stats_cursor` | `TEXT` | 否 | `''` | 统计游标 |
| `metadata_json` | `TEXT` | 否 | `'{}'` | 节点元数据 |
| `created_at` | `TEXT` | 否 | 无 | 创建时间 |
| `updated_at` | `TEXT` | 否 | 无 | 更新时间 |

### 2.2 运行状态

数据库原始 `status` 当前只是基础值。

最终页面和聚合读取时，实际状态会结合：

1. `last_heartbeat_at`
2. offline threshold

重新判定为：

1. `online`
2. `offline`
3. `unknown`

## 3. `runtime_node_registry`

### 3.1 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 含义 |
|---|---|---|---|---|
| `node_id` | `TEXT` | 否 | 无 | 节点主键 |
| `node_name` | `TEXT` | 否 | 无 | 备案名称 |
| `env` | `TEXT` | 否 | `''` | 环境 |
| `address` | `TEXT` | 否 | `''` | 备案地址 |
| `enabled` | `INTEGER` | 否 | `1` | 是否允许接入 |
| `registration_secret_hash` | `TEXT` | 否 | `''` | 注册密钥 hash |
| `secret_fingerprint` | `TEXT` | 否 | `''` | 密钥指纹 |
| `remarks` | `TEXT` | 否 | `''` | 备注 |
| `created_by` | `TEXT` | 否 | 无 | 创建人 |
| `updated_by` | `TEXT` | 否 | 无 | 更新人 |
| `created_at` | `TEXT` | 否 | 无 | 创建时间 |
| `updated_at` | `TEXT` | 否 | 无 | 更新时间 |

## 4. 索引

### 4.1 `runtime_nodes`

1. `idx_runtime_nodes_status`
2. `idx_runtime_nodes_heartbeat`

### 4.2 `runtime_node_registry`

1. `idx_runtime_node_registry_enabled`

## 5. 写入路径

### 5.1 `runtime_node_registry`

主要写入函数：

1. `createRuntimeNodeRegistryItem()`
2. `updateRuntimeNodeRegistryItem()`
3. `enableRuntimeNodeRegistryItem()`
4. `disableRuntimeNodeRegistryItem()`
5. `rotateRuntimeNodeRegistrySecret()`

### 5.2 `runtime_nodes`

主要写入函数：

1. `registerRuntimeNode()`
2. `heartbeatRuntimeNode()`
3. `recordRuntimeNodeApplyResult()`

## 6. 典型案例

### 6.1 备案节点

```json
{
  "node_id": "ACDP_AGENT_001",
  "node_name": "ACDP_AGENT_001",
  "env": "test",
  "address": "http://127.0.0.1:8791",
  "enabled": 1,
  "secret_fingerprint": "07ae56d38782"
}
```

### 6.2 已注册运行节点

```json
{
  "node_id": "ACDP_AGENT_001",
  "node_name": "ACDP_AGENT_001",
  "env": "test",
  "address": "http://127.0.0.1:8791",
  "current_version": "v1.0.0",
  "desired_version": "v1.0.0",
  "last_apply_status": "success",
  "last_error": "",
  "status": "online"
}
```

## 7. 关键约束

1. runtime 注册前必须先有备案记录。
2. `registration_secret_hash` 校验失败时，不允许注册和心跳进入主链。
3. 运行节点主列表只应围绕备案节点展开，不应把未备案节点当成正式对象。

## 8. 修改风险

1. 改 registry 结构会影响：
   - 节点备案页面
   - 部署说明
   - 注册校验
2. 改 runtime node 结构会影响：
   - 节点列表
   - 节点详情
   - rollout 收敛摘要

## 9. 必须同步的代码与测试

代码：

1. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
2. [`runtime-control-client.js`](/Codex/ACDP/prototype/src/lib/runtime-control-client.js)
3. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)
4. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)

测试：

1. [`runtime-node-registry.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-node-registry.test.js)
2. [`runtime-nodes.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-nodes.test.js)
3. [`runtime-control.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-control.test.js)
4. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
