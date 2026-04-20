# runtime HTTP 接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`/health`、`/api/runtime/*`、`/api/simulate`

## 1. 作用

本文档定义 ACDP runtime 直接对外提供的 HTTP 接口合同。

当前覆盖：

1. `GET /health`
2. `GET /api/runtime/current`
3. `GET /api/runtime/stats`
4. `POST /api/runtime/reload`
5. `POST /api/runtime/correct`
6. `POST /api/runtime/correct_cand`
7. `POST /api/simulate`

## 2. 代码入口

主要代码文件：

1. [`runtime-surface.js`](/Codex/ACDP/prototype/src/http/runtime-surface.js)
2. [`server.js`](/Codex/ACDP/prototype/src/server.js)
3. [`runtime.js`](/Codex/ACDP/prototype/src/lib/runtime.js)
4. [`runtime-candidates.js`](/Codex/ACDP/prototype/src/lib/runtime-candidates.js)

## 3. 鉴权规则

### 3.1 需要 runtime 权限的接口

1. `/api/runtime/current`
2. `/api/runtime/stats`
3. `/api/runtime/reload`
4. `/api/runtime/correct`
5. `/api/runtime/correct_cand`

其中：

1. `correct` 与 `correct_cand` 在请求处理时调用 `requireRuntimeToken(req)`。
2. token 来源通常由 `ACDP_RUNTIME_TOKEN` 注入。

### 3.2 不走 runtime token 的接口

1. `/health`
2. `/api/simulate`

说明：

`/api/simulate` 当前用于验证和演示，不建议把它当正式外部合同。

## 4. 接口明细

### 4.1 `GET /health`

#### 作用

输出 runtime 当前健康摘要。

#### 调用方

1. 健康检查
2. 本地 smoke
3. 运维探活

#### 响应字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `status` | `string` | 固定为 `ok` |
| `stableVersion` | `string|null` | 当前 stable 版本 |
| `canaryVersion` | `string|null` | 当前 canary 版本 |
| `grayPolicy` | `object|null` | 当前灰度策略 |
| `termCount` | `number` | 词条数量 |
| `currentRelease` | `object|null` | 当前 published release |

#### 示例响应

```json
{
  "status": "ok",
  "stableVersion": "v1.0.0",
  "canaryVersion": null,
  "grayPolicy": null,
  "termCount": 120,
  "currentRelease": {
    "releaseId": "rel_001",
    "version": "v1.0.0",
    "status": "published"
  }
}
```

### 4.2 `GET /api/runtime/current`

#### 作用

查看当前 stable / canary runtime 版本。

#### 响应字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `stable` | `object|null` | stable manifest |
| `canary` | `object|null` | canary manifest |
| `grayPolicy` | `object|null` | 当前灰度策略 |

#### 典型用途

1. 后台运行验证页。
2. 运行状态观察。

### 4.3 `GET /api/runtime/stats`

#### 作用

输出 runtime 当前统计快照。

#### 响应字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `startedAt` | `string` | runtime 启动时间 |
| `inFlight` | `number` | 当前进行中的请求数 |
| `peak` | `object` | 峰值统计 |
| `totalCorrections` | `number` | 总纠错次数 |
| `httpCorrections` | `number` | HTTP 纠错次数 |
| `wsCorrections` | `number` | WebSocket 纠错次数 |
| `totalErrors` | `number` | 错误总数 |
| `lastCorrectionAt` | `string|null` | 最近一次纠错时间 |
| `lastErrorAt` | `string|null` | 最近一次错误时间 |
| `activeWebSocketConnections` | `number` | 当前 WS 连接数 |
| `latency` | `object` | 延迟摘要 |
| `websocketGovernance` | `object` | WS caller 治理快照 |

### 4.4 `POST /api/runtime/reload`

#### 作用

手动重载当前 runtime snapshot。

#### 响应字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `status` | `string` | 固定为 `reloaded` |
| `stable` | `string|null` | 当前 stable 版本号 |
| `canary` | `string|null` | 当前 canary 版本号 |

### 4.5 `POST /api/runtime/correct`

#### 作用

执行正式纠错，只返回单一替换结果。

#### 请求字段

| 字段 | 类型 | 必填 | 默认值 | 含义 |
|---|---|---|---|---|
| `text` | `string` | 是 | 无 | 待纠错文本 |
| `trafficKey` | `string` | 否 | `''` | 灰度分流键 |
| `callId` | `string` | 否 | `''` | 分流备用键 |
| `enablePinyinChannel` | `boolean` | 否 | `true` | 是否启用拼音召回 |
| `enablePinyinAutoReplace` | `boolean` | 否 | `true` | 是否允许拼音自动替换 |

#### 响应字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `correctedText` | `string` | 主修正文本 |

#### 典型请求

```json
{
  "text": "我想了解工商认定的办理材料。",
  "trafficKey": "case-001",
  "enablePinyinChannel": true
}
```

#### 典型响应

```json
{
  "correctedText": "我想了解工伤认定的办理材料。"
}
```

#### 关键说明

1. 该接口底层仍会生成 `matches/candidates/blocked`，但当前不会直接对外返回。
2. 对现有调用方，合同保持最小稳定形状。

### 4.6 `POST /api/runtime/correct_cand`

#### 作用

执行候选纠错，返回整句候选集合。

#### 请求字段

与 `correct` 保持一致。

#### 响应字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `correctedTexts` | `string[]` | 整句候选集合 |

#### 关键说明

1. `correctedTexts[0]` 始终是主修正结果。
2. 后续元素来自 `runtime-candidates.js` 基于替换槽位构造的候选整句。

#### 典型响应

```json
{
  "correctedTexts": [
    "我想了解工伤认定的办理材料。",
    "我想了解工商认定的办理材料。"
  ]
}
```

### 4.7 `POST /api/simulate`

#### 作用

提供更完整的模拟结果，供控制台演示和验证使用。

#### 请求字段

| 字段 | 类型 | 必填 | 默认值 | 含义 |
|---|---|---|---|---|
| `text` | `string` | 是 | 无 | 待验证文本 |
| `trafficKey` | `string` | 否 | `''` | 灰度分流键 |
| `enablePinyinAutoReplace` | `boolean` | 否 | `false` | 是否打开拼音自动替换 |

#### 响应特点

除了主修正结果外，还可能包含：

1. `route`
2. `trafficKey`
3. `bucket`
4. `matches`
5. `candidates`
6. `blocked`

## 5. 错误码

| 错误码 | 场景 |
|---|---|
| `missing_text` | 请求体缺少 `text` |
| `runtime_not_ready` | 当前 snapshot 尚未可用 |
| 鉴权失败 | runtime token 缺失或不合法 |

## 6. 相关测试

至少覆盖：

1. [`runtime-smoke.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-smoke.test.js)
2. [`runtime-service.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-service.test.js)
3. [`runtime-candidates.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-candidates.test.js)
4. [`api-contract-snapshots.test.js`](/Codex/ACDP/prototype/tests/unit/api-contract-snapshots.test.js)

## 7. 修改接口时必须同步

1. `runtime-surface.js`
2. `server.js`
3. runtime 相关测试
4. [runtime对外接口说明](/Codex/ACDP/docs/2026-04-17-v1.0正式文档工作区/09-runtime对外接口说明.md)
5. 控制台运行验证页相关文档
