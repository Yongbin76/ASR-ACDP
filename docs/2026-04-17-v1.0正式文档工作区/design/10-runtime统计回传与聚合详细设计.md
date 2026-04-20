# runtime 统计回传与聚合详细设计

- 文档状态：active
- 适用版本：v1.0
- 文档类型：design
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：runtime 本地统计、批量上传、admin 聚合

## 1. 设计目标

让 runtime 在不依赖实时数据库连接的情况下，先本地缓存统计，再批量回传 admin。

## 2. 本地统计链

1. 请求执行后调用本地统计记录
2. 写 runtime 本地统计缓冲
3. 定时 flush
4. 生成 `batchId + sequence`
5. 上传到 admin

## 3. admin 聚合链

1. 记录 upload 留痕
2. 按节点聚合小时统计
3. 按节点聚合小时命中词
4. 更新节点峰值
5. 汇总全局统计

## 4. 关键代码入口

1. [`runtime-stats.js`](/Codex/ACDP/prototype/src/lib/runtime-stats.js)
2. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
3. [`console-service.js`](/Codex/ACDP/prototype/src/lib/console-service.js)

## 5. 关键约束

1. 上传按 `(node_id, batch_id, sequence)` 幂等。
2. 节点级和全局级统计同时维护。

## 6. 相关测试

1. [`runtime-stats-sync.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-stats-sync.test.js)
2. [`runtime-nodes.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-nodes.test.js)
