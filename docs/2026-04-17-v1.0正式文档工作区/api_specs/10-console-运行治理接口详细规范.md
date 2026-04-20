# console 运行治理接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：runtime registry、nodes、verify、control

## 1. 覆盖范围

本文档覆盖：

1. `GET /api/console/runtime-control`
2. `GET /api/console/runtime-control/evidence/{reportId}`
3. `POST /api/console/runtime-control/desired-version`
4. `GET /api/console/runtime-node-registry`
5. `GET /api/console/runtime-node-registry/{nodeId}`
6. `GET /api/console/runtime-node-registry/{nodeId}/deployment-guide`
7. `POST /api/console/runtime-node-registry`
8. `PUT /api/console/runtime-node-registry/{nodeId}`
9. `POST /api/console/runtime-node-registry/{nodeId}/enable`
10. `POST /api/console/runtime-node-registry/{nodeId}/disable`
11. `POST /api/console/runtime-node-registry/{nodeId}/rotate-secret`
12. `GET /api/console/runtime-nodes`
13. `GET /api/console/runtime-nodes/{nodeId}`
14. `GET /api/console/runtime-verify/current`
15. `POST /api/console/runtime-verify/correct`
16. `POST /api/console/runtime-verify/correct-cand`
17. `GET /api/console/runtime-demo/current`
18. `POST /api/console/runtime-demo/simulate`

## 2. 权限

| 接口类别 | 权限 |
|---|---|
| runtime-control 查看 | `dashboard.read` |
| 下发目标版本 | `release.publish` |
| registry 查看 | `runtime.node.registry.read` |
| registry 管理 | `runtime.node.registry.manage` |
| 节点查看 | `dashboard.read` / `runtime.node.read` |
| 运行验证查看 | `runtime.read` |
| 运行验证执行 | `runtime.correct` |
| demo simulate | `simulate.run` |

## 3. runtime-control

### 3.1 `GET /api/console/runtime-control`

作用：

1. 返回当前目标版本和 rollout 摘要。

查询参数：

1. `releaseId`

### 3.2 `GET /api/console/runtime-control/evidence/{reportId}`

作用：

1. 读取 runtime-control 验证证据。

### 3.3 `POST /api/console/runtime-control/desired-version`

请求字段：

1. `releaseId`

作用：

1. 设置当前目标版本。

副作用：

1. 写 `runtime_control_state`
2. 同步 `runtime_nodes.desired_version`

## 4. 节点备案接口

### 4.1 `GET /api/console/runtime-node-registry`

支持参数：

1. `page`
2. `pageSize`

### 4.2 `GET /api/console/runtime-node-registry/{nodeId}`

作用：

1. 查看备案详情。

### 4.3 `GET /api/console/runtime-node-registry/{nodeId}/deployment-guide`

作用：

1. 返回该节点的部署说明和启动命令示例。

### 4.4 `POST /api/console/runtime-node-registry`

关键字段：

1. `nodeId`
2. `nodeName`
3. `env`
4. `address`
5. `remarks`
6. `registrationSecret`

### 4.5 管理动作

1. `PUT /{nodeId}`
2. `POST /{nodeId}/enable`
3. `POST /{nodeId}/disable`
4. `POST /{nodeId}/rotate-secret`

## 5. 运行节点接口

### 5.1 `GET /api/console/runtime-nodes`

查询参数：

1. `status`
2. `env`
3. `page`
4. `pageSize`

作用：

1. 返回节点列表、状态摘要和版本对齐信息。

### 5.2 `GET /api/console/runtime-nodes/{nodeId}`

作用：

1. 返回节点详情、issueSummary、统计摘要和控制视图。

## 6. 运行验证接口

### 6.1 `GET /api/console/runtime-verify/current`

作用：

1. 返回当前 stable/canary 版本。

支持参数：

1. `targetMode`
2. `nodeId`
3. `trafficKey`

当前约束：

1. 仅支持 `targetMode=cluster_current`

### 6.2 `POST /api/console/runtime-verify/correct`

作用：

1. 调用正式纠错接口并只返回 `correctedText`

### 6.3 `POST /api/console/runtime-verify/correct-cand`

作用：

1. 调用候选纠错接口并返回 `correctedTexts`

## 7. runtime-demo 接口

### 7.1 `GET /api/console/runtime-demo/current`

作用：

1. 首页轻量演示读取当前版本。

### 7.2 `POST /api/console/runtime-demo/simulate`

作用：

1. 首页轻量演示执行模拟纠错。

## 8. 相关测试

至少覆盖：

1. [`runtime-control.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-control.test.js)
2. [`runtime-node-registry.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-node-registry.test.js)
3. [`runtime-nodes.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-nodes.test.js)
4. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
5. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
