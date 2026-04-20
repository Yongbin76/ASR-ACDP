# 灰度分流与 trafficKey 详细设计

- 文档状态：active
- 适用版本：v1.0
- 文档类型：design
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：stable/canary 路由选择

## 1. 设计目标

让 runtime 能在同一套接口合同下，按灰度策略把请求路由到 stable 或 canary。

## 2. 分流键

当前分流优先级：

1. `trafficKey`
2. `callId`

若两者都为空，则默认走 stable。

## 3. 分流逻辑

1. 读取当前 canary runtime 与 gray policy
2. 计算 `hashTrafficKey(trafficKey) % 100`
3. 得到 bucket
4. 若 bucket 小于 `grayPolicy.percentage`，走 canary
5. 否则走 stable

## 4. 返回字段

当前 runtime 侧可带回：

1. `route`
2. `trafficKey`
3. `bucket`

## 5. 关键代码入口

1. [`server.js`](/Codex/ACDP/prototype/src/server.js)
2. `selectRuntime(payload)`

## 6. 修改风险

1. 改 hash 或 bucket 逻辑会改变灰度命中结果。
2. 改默认行为会影响无 `trafficKey` 请求的稳定性。

## 7. 相关测试

1. [`runtime-service.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-service.test.js)
2. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
