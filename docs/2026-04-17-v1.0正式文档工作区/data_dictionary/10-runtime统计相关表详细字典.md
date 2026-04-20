# runtime 统计相关表详细字典

- 文档状态：active
- 适用版本：v1.0
- 文档类型：data_dictionary
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：runtime 统计相关表

## 1. 表组作用

runtime 统计分两层：

1. 节点级统计。
2. 全局聚合统计。

对应表如下：

### 节点级

1. `runtime_node_hourly_stats`
2. `runtime_node_hourly_terms`
3. `runtime_node_peak_stats`
4. `runtime_node_stat_upload_records`

### 全局级

1. `runtime_hourly_stats`
2. `runtime_hourly_terms`
3. `runtime_peak_stats`

## 2. `runtime_node_hourly_stats`

| 字段 | SQLite 类型 | 含义 |
|---|---|---|
| `node_id` | `TEXT` | 节点 ID |
| `hour_key` | `TEXT` | 小时键 |
| `request_count` | `INTEGER` | 请求总数 |
| `http_request_count` | `INTEGER` | HTTP 请求数 |
| `ws_request_count` | `INTEGER` | WebSocket 请求数 |
| `hit_term_count` | `INTEGER` | 命中词条数 |
| `updated_at` | `TEXT` | 更新时间 |

主键：

1. `(node_id, hour_key)`

## 3. `runtime_node_hourly_terms`

| 字段 | SQLite 类型 | 含义 |
|---|---|---|
| `node_id` | `TEXT` | 节点 ID |
| `hour_key` | `TEXT` | 小时键 |
| `canonical_text` | `TEXT` | 标准词 |
| `hit_count` | `INTEGER` | 命中次数 |
| `updated_at` | `TEXT` | 更新时间 |

主键：

1. `(node_id, hour_key, canonical_text)`

## 4. `runtime_node_peak_stats`

| 字段 | SQLite 类型 | 含义 |
|---|---|---|
| `node_id` | `TEXT` | 节点 ID |
| `peak_concurrency` | `INTEGER` | 峰值并发 |
| `peak_at` | `TEXT` | 峰值时间 |
| `updated_at` | `TEXT` | 更新时间 |

主键：

1. `node_id`

## 5. `runtime_node_stat_upload_records`

| 字段 | SQLite 类型 | 含义 |
|---|---|---|
| `node_id` | `TEXT` | 节点 ID |
| `batch_id` | `TEXT` | 上传批次 ID |
| `sequence` | `INTEGER` | 批次内序号 |
| `record_type` | `TEXT` | 记录类型 |
| `payload_json` | `TEXT` | 原始载荷 |
| `created_at` | `TEXT` | 创建时间 |

主键：

1. `(node_id, batch_id, sequence)`

作用：

1. 保证 runtime stats upload 幂等。
2. 保存上传留痕。

## 6. `runtime_hourly_stats`

| 字段 | SQLite 类型 | 含义 |
|---|---|---|
| `hour_key` | `TEXT` | 小时键 |
| `request_count` | `INTEGER` | 全局请求总数 |
| `http_request_count` | `INTEGER` | 全局 HTTP 请求数 |
| `ws_request_count` | `INTEGER` | 全局 WS 请求数 |
| `hit_term_count` | `INTEGER` | 全局命中词条数 |
| `updated_at` | `TEXT` | 更新时间 |

主键：

1. `hour_key`

## 7. `runtime_hourly_terms`

| 字段 | SQLite 类型 | 含义 |
|---|---|---|
| `hour_key` | `TEXT` | 小时键 |
| `canonical_text` | `TEXT` | 标准词 |
| `hit_count` | `INTEGER` | 命中次数 |
| `updated_at` | `TEXT` | 更新时间 |

主键：

1. `(hour_key, canonical_text)`

## 8. `runtime_peak_stats`

| 字段 | SQLite 类型 | 含义 |
|---|---|---|
| `stat_key` | `TEXT` | 主键，当前固定为全局键 |
| `peak_concurrency` | `INTEGER` | 全局峰值并发 |
| `peak_at` | `TEXT` | 峰值时间 |
| `updated_at` | `TEXT` | 更新时间 |

## 9. 写入路径

主要写入函数：

1. `uploadRuntimeNodeStats()`
2. `applyHourlyStatsAggregate()`
3. `applyNodeHourlyStatsAggregate()`
4. `applyHourlyTermAggregate()`
5. `applyNodeHourlyTermAggregate()`
6. `applyNodePeakAggregate()`
7. `recordRuntimeCorrection()`
8. `recordRuntimePeak()`

## 10. 典型案例

### 10.1 节点小时统计

```json
{
  "node_id": "ACDP_AGENT_001",
  "hour_key": "2026-04-18T09",
  "request_count": 120,
  "http_request_count": 110,
  "ws_request_count": 10,
  "hit_term_count": 38
}
```

### 10.2 统计上传留痕

```json
{
  "node_id": "ACDP_AGENT_001",
  "batch_id": "stats_batch_001",
  "sequence": 1,
  "record_type": "hourly_stats"
}
```

## 11. 关键约束

1. 节点上传统计时，以 `(node_id, batch_id, sequence)` 去重。
2. 节点级统计写入后，还会继续汇总到全局级统计。
3. 页面展示通常优先消费聚合结果，不直接消费 upload 原始载荷。

## 12. 修改风险

1. 改统计表字段会影响：
   - runtime upload
   - `/api/runtime/stats`
   - `/console/runtime-nodes`
2. 改主键或去重逻辑，会直接破坏幂等上报。

## 13. 必须同步的代码与测试

代码：

1. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
2. [`runtime-stats.js`](/Codex/ACDP/prototype/src/lib/runtime-stats.js)
3. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)

测试：

1. [`runtime-stats-sync.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-stats-sync.test.js)
2. [`runtime-nodes.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-nodes.test.js)
3. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
