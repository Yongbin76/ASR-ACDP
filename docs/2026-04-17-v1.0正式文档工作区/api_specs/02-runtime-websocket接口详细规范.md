# runtime WebSocket 接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`/ws/runtime/correct`、`/ws/runtime/correct_cand`

## 1. 作用

本文档定义 runtime 对外 WebSocket 纠错接口。

当前覆盖：

1. `GET /ws/runtime/correct`
2. `GET /ws/runtime/correct_cand`

## 2. 代码入口

主要代码文件：

1. [`runtime-surface.js`](/Codex/ACDP/prototype/src/http/runtime-surface.js)
2. [`server.js`](/Codex/ACDP/prototype/src/server.js)
3. [`runtime-ws-governance.js`](/Codex/ACDP/prototype/src/lib/runtime-ws-governance.js)

## 3. 升级与鉴权规则

### 3.1 升级条件

服务器会校验：

1. `Upgrade: websocket`
2. `Connection: Upgrade`
3. `Sec-WebSocket-Key`

若条件不满足，返回普通 HTTP 错误并关闭连接。

### 3.2 权限

两条 WS 路由都走：

1. `authorize(req, 'runtime.correct')`

### 3.3 caller 治理

连接建立后，还会进入 WS 治理层，当前能力包括：

1. caller identity 解析
2. caller secret 校验
3. IP blacklist
4. caller 连接数限制
5. caller 每分钟请求数限制
6. idle timeout
7. message size 限制

## 4. 消息格式

### 4.1 输入

客户端发送 JSON 文本帧。

最小输入：

```json
{
  "text": "原始ASR文本"
}
```

可携带字段与 HTTP 基本一致：

1. `text`
2. `trafficKey`
3. `callId`
4. `enablePinyinChannel`
5. `enablePinyinAutoReplace`

### 4.2 输出：`/ws/runtime/correct`

```json
{
  "correctedText": "修正后的文本"
}
```

### 4.3 输出：`/ws/runtime/correct_cand`

```json
{
  "correctedTexts": [
    "主修正文本",
    "候选整句 1",
    "候选整句 2"
  ]
}
```

### 4.4 错误输出

```json
{
  "error": "runtime_not_ready: runtime snapshot is not ready"
}
```

## 5. 路由差异

### 5.1 `/ws/runtime/correct`

作用：

1. 返回单一 `correctedText`

### 5.2 `/ws/runtime/correct_cand`

作用：

1. 返回 `correctedTexts`
2. 第一个元素为主修正结果

## 6. 连接管理

### 6.1 心跳帧

当前实现会响应 WebSocket ping 帧，返回 pong。

### 6.2 关闭帧

当前实现支持关闭帧：

1. 收到关闭帧时，返回 `1000` 并结束连接。

### 6.3 空闲超时

若超过配置中的 `websocketIdleTimeoutMs` 未活动，会主动关闭连接。

### 6.4 消息大小

若消息超过 `websocketMaxMessageBytes`，会以 `1009` 关闭连接。

## 7. 典型错误场景

| 场景 | 行为 |
|---|---|
| caller 黑名单 | 连接建立阶段直接拒绝 |
| caller 配额超限 | 返回 WS 策略错误并关闭 |
| JSON 解析失败 | 返回 `error` 帧 |
| runtime 未准备好 | 返回 `error` 帧 |
| 请求体缺少 `text` | 返回 `error` 帧 |

## 8. 相关测试

至少覆盖：

1. [`runtime-ws-governance.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-ws-governance.test.js)
2. [`runtime-service.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-service.test.js)
3. [`api-contract-snapshots.test.js`](/Codex/ACDP/prototype/tests/unit/api-contract-snapshots.test.js)

## 9. 修改接口时必须同步

1. `server.js` 中的 WS 升级与帧处理逻辑
2. `runtime-ws-governance.js`
3. `app.config.json` 中的 WS 配置
4. 控制台帮助文档与接口文档
