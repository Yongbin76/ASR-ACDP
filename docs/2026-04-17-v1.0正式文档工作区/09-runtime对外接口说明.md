# ACDP runtime 对外接口说明

- 文档状态：active
- 适用版本：v1.0
- 文档类型：baseline
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-17
- 责任对象：runtime HTTP / WebSocket 对外合同

## 1. 接口范围

本文件说明 runtime 直接对外提供的接口。

当前接口包括：

1. `GET /health`
2. `GET /api/runtime/current`
3. `GET /api/runtime/stats`
4. `POST /api/runtime/reload`
5. `POST /api/runtime/correct`
6. `POST /api/runtime/correct_cand`
7. `POST /api/simulate`
8. `GET /ws/runtime/correct`
9. `GET /ws/runtime/correct_cand`

## 2. 鉴权说明

### 2.1 HTTP runtime 接口

以下接口按 runtime 权限校验：

1. `/api/runtime/current`
2. `/api/runtime/stats`
3. `/api/runtime/reload`
4. `/api/runtime/correct`
5. `/api/runtime/correct_cand`

其中：

1. `correct` 和 `correct_cand` 在当前代码中要求 runtime token。
2. token 来源由 `app.config.json` 中的 `auth.runtimeBearerToken` 或环境变量 `ACDP_RUNTIME_TOKEN` 决定。

### 2.2 模拟接口

`/api/simulate` 用于模拟验证，不等同于正式 runtime 接口合同。

### 2.3 WebSocket 接口

WebSocket 接口使用运行时权限校验和 WebSocket caller 治理规则。

当前治理能力包括：

1. 最大连接数。
2. 空闲超时。
3. 单消息大小限制。
4. caller 级黑名单与配额。

## 3. 请求路由与分流

runtime 在执行纠错前，会先根据请求体选择 stable 或 canary。

当前逻辑：

1. 读取 `trafficKey`，若为空则尝试 `callId`。
2. 若当前存在 canary runtime 且存在灰度策略，则对分流键进行 hash。
3. 根据 bucket 与灰度百分比决定进入 stable 还是 canary。
4. 响应中可返回：
   - `route`
   - `trafficKey`
   - `bucket`

## 4. 接口明细

### 4.1 `GET /health`

作用：输出 runtime 当前健康摘要。

返回字段：

1. `status`
2. `stableVersion`
3. `canaryVersion`
4. `grayPolicy`
5. `termCount`
6. `currentRelease`

### 4.2 `GET /api/runtime/current`

作用：查看 runtime 当前 stable/canary 版本。

返回字段：

1. `stable`
2. `canary`
3. `grayPolicy`

### 4.3 `GET /api/runtime/stats`

作用：查看 runtime 当前统计快照。

返回字段主要包括：

1. `startedAt`
2. `inFlight`
3. `peak`
4. `totalCorrections`
5. `httpCorrections`
6. `wsCorrections`
7. `totalErrors`
8. `lastCorrectionAt`
9. `lastErrorAt`
10. `activeWebSocketConnections`
11. `latency`
12. `websocketGovernance`

### 4.4 `POST /api/runtime/reload`

作用：手动重载 runtime 当前 snapshot。

返回字段：

1. `status`
2. `stable`
3. `canary`

### 4.5 `POST /api/runtime/correct`

作用：执行正式纠错，返回单一替换结果。

请求体主要字段：

| 字段 | 含义 |
|---|---|
| `text` | 待纠错文本，必填 |
| `trafficKey` | 灰度分流键，可选 |
| `callId` | 灰度分流备用键，可选 |
| `enablePinyinChannel` | 是否启用拼音召回，默认启用 |
| `enablePinyinAutoReplace` | 是否启用拼音自动替换，默认启用 |

返回字段：

| 字段 | 含义 |
|---|---|
| `correctedText` | 纠错后的单一文本 |

底层引擎实际还能生成 `matches/candidates/blocked` 等结构，但该接口当前不直接对外返回。

### 4.6 `POST /api/runtime/correct_cand`

作用：执行候选纠错，返回整句候选集合。

请求体字段与 `correct` 相同。

返回字段：

| 字段 | 含义 |
|---|---|
| `correctedTexts` | 候选整句数组，第一个元素为主结果 |

### 4.7 `POST /api/simulate`

作用：用于模拟和验证，不作为正式 runtime 对外合同主接口。

请求体主要字段：

1. `text`
2. `enablePinyinAutoReplace`

返回字段通常比正式 runtime 接口更完整，可能包含：

1. `rawText`
2. `correctedText`
3. `dictVersion`
4. `matches`
5. `candidates`
6. `blocked`
7. `route`
8. `trafficKey`
9. `bucket`

## 5. WebSocket 接口

### 5.1 `GET /ws/runtime/correct`

作用：通过 WebSocket 连续提交纠错请求，返回单一 `correctedText`。

消息体要求：

1. 文本帧 JSON。
2. 至少包含 `text` 字段。

响应体：

1. `correctedText`
2. 或 `error`

### 5.2 `GET /ws/runtime/correct_cand`

作用：通过 WebSocket 连续提交候选纠错请求，返回 `correctedTexts` 数组。

消息体要求与 `ws correct` 相同。

响应体：

1. `correctedTexts`
2. 或 `error`

## 6. 错误语义

当前典型错误包括：

1. `missing_text`
   - 请求体缺少 `text`
2. `runtime_not_ready`
   - 当前 runtime snapshot 尚未准备完成
3. 鉴权失败
   - token 缺失或无权限
4. WebSocket 策略错误
   - caller 限额、黑名单、消息大小超限、空闲超时

## 7. 当前接口边界

1. `correct` 与 `ws correct` 只返回单一 `correctedText`。
2. `correct_cand` 与 `ws correct_cand` 返回整句候选集合 `correctedTexts`。
3. runtime 当前不直接对外暴露完整匹配细节合同。
4. `/api/simulate` 主要用于验证，不建议替代正式 runtime 接口。
