# `runtime_control_state` 表详细字典

- 文档状态：active
- 适用版本：v1.0
- 文档类型：data_dictionary
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`runtime_control_state`

## 1. 表作用

`runtime_control_state` 是 admin 向 runtime 下发目标版本的权威状态表。

当前版本采用单控制键：

1. `control_key = global`

即：全局一份当前控制状态。

## 2. 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `control_key` | `TEXT` | 否 | 无 | `PRIMARY KEY` | 控制键，当前固定为 `global` |
| `release_id` | `TEXT` | 否 | 无 | - | 目标 release |
| `desired_version` | `TEXT` | 否 | 无 | - | 目标版本号 |
| `artifact_metadata_json` | `TEXT` | 否 | 无 | - | 快照和制品元数据 |
| `issued_at` | `TEXT` | 否 | 无 | - | 下发时间 |
| `config_version` | `INTEGER` | 否 | 无 | - | 控制配置版本 |
| `created_at` | `TEXT` | 否 | 无 | - | 创建时间 |
| `updated_at` | `TEXT` | 否 | 无 | - | 更新时间 |

## 3. 索引

当前显式索引：

1. `idx_runtime_control_updated` on `updated_at DESC`

## 4. 业务语义

### 4.1 `desired_version`

表示 admin 当前希望 runtime 生效的词典版本号。

### 4.2 `artifact_metadata_json`

用于描述 runtime 如何取得目标快照，内容通常包括：

1. 主制品。
2. 文件列表。
3. 下载地址。
4. 校验值。
5. 文件名。
6. configVersion / node 绑定信息。

### 4.3 `config_version`

用于区分控制状态的版本迭代。

每次调用 `setRuntimeDesiredRelease()` 时：

1. 新配置版本号会在当前基础上递增。

## 5. 写入路径

核心写入函数：

1. `setRuntimeDesiredRelease()`

写入时会同时：

1. 更新 `runtime_control_state`
2. 把所有 `runtime_nodes.desired_version` 一并更新到当前目标版本

## 6. 读取路径

主要读取函数：

1. `getRuntimeControlState()`
2. `getRuntimeControlViewForNode()`
3. `refreshArtifactMetadataFromControl()`

消费位置：

1. admin runtime-control 接口
2. runtime heartbeat / sync 链
3. `/console/runtime-nodes`
4. `/console/releases` 中的 rollout 摘要

## 7. 典型案例

```json
{
  "control_key": "global",
  "release_id": "rel_001",
  "desired_version": "v1.0.0",
  "artifact_metadata_json": {
    "primaryArtifact": {
      "fileName": "snapshot.json",
      "artifactUrl": "http://admin/api/runtime-artifacts/releases/rel_001/snapshot.json?...",
      "checksumSha256": "abc123"
    }
  },
  "issued_at": "2026-04-18T09:00:00.000Z",
  "config_version": 7
}
```

解释：

1. admin 当前希望所有 runtime 对齐到 `v1.0.0`。
2. runtime 读取控制视图后，会拿 `artifact_metadata_json` 去执行下载与安装。

## 8. 关键约束

1. 当前表设计只支持全局单控制状态。
2. 当前不支持节点级 `desiredVersion override`。
3. `artifact_metadata_json` 是 runtime-control 与 artifact delivery 的桥梁。

## 9. 修改风险

1. 改 `artifact_metadata_json` 结构，会直接影响：
   - runtime 下载器
   - `admin_http_signed`
   - `minio` / `file` 模式兼容
2. 改 `config_version` 逻辑，会影响：
   - 节点收敛判定
   - 下载缓存与签名绑定

## 10. 必须同步的代码与测试

代码：

1. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
2. [`artifact-store.js`](/Codex/ACDP/prototype/src/lib/artifact-store.js)
3. [`runtime-control-client.js`](/Codex/ACDP/prototype/src/lib/runtime-control-client.js)
4. [`runtime-artifacts.js`](/Codex/ACDP/prototype/src/lib/runtime-artifacts.js)

测试：

1. [`runtime-control.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-control.test.js)
2. [`artifact-store.test.js`](/Codex/ACDP/prototype/tests/unit/artifact-store.test.js)
3. [`runtime-service.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-service.test.js)
