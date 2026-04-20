# validation feed 外部 connector 首轮契约

## 1. 目标

本文件用于推进 `JOB-007` 的第一轮真实外部系统接入基线。

本轮不解决“真实网络已接通”本身，而是先把以下内容固定下来：

- 首个优先接入源
- connector 配置模型
- cursor 增量拉取模型
- 认证模型
- ack / retry / replay 机制
- 代码落点

## 2. 首个优先接入源

首个推荐真实接入源：

- `cg3`

原因：

- 当前业务语义最接近“自动发现新误识别样本并回流为 validation case”
- 现有 source-specific adapter 已经有 `cg3.records[]` 形态
- 先打通 `cg3` 后，同一套 connector contract 可以平移到：
  - `qa_feedback`
  - `online_feedback`

## 3. connector 配置模型

当前统一配置文件：

- `prototype/config/validation_feed_connectors.config.json`

每个 source 统一按以下字段配置：

- `sourceType`
- `enabled`
- `transportType`
- `endpoint` / `endpointEnv`
- `httpMethod`
- `timeoutMs`
- `authType`
- `authHeaderName`
- `authToken` / `authTokenEnv`
- `authQueryKey`
- `authValue` / `authValueEnv`
- `ackType`
- `ackEndpoint` / `ackEndpointEnv`
- `ackMethod`
- `retryMaxAttempts`
- `replayFromErrorDir`
- `cursorQueryKey`
- `cursorResponseField`
- `initialCursor` / `initialCursorEnv`
- `includeCursorInAck`

当前 transport 仅定义两类：

- `file_inbox`
- `http_pull_json`

这样做的目的：

- 保持当前 file-based 基线可继续用
- 让真实外部系统接入不需要再改业务代码入口

## 4. 认证模型

首轮认证只做最小集合：

- `none`
- `bearer`
- `header`
- `query`

默认建议：

- `cg3` 先走 `bearer`

原因：

- 最常见
- 配置简单
- 不需要把 token 写入仓库

## 5. cursor 增量拉取模型

若 connector 配置了：

- `cursorQueryKey`
- `cursorResponseField`

则 `http_pull_json` 会进入增量拉取模式。

行为规则：

1. 发起拉取时：
   - 优先读取当前 source 已确认推进的 cursor state
   - 若没有，再退回 `initialCursor`
2. 远端返回后：
   - 通过 `cursorResponseField` 读取下一个 cursor
3. 只有在“导入成功且 ack 成功”或“导入成功且无需 ack”后：
   - 才推进本地 cursor state
4. 若导入失败或 ack 失败：
   - cursor 不推进

这样做的原因：

- 避免因为 ack 失败把远端批次跳过去
- 保持 replay / ack recovery 时仍可安全补偿

## 6. 远端 payload 契约

当前 `http_pull_json` 期望远端返回 JSON。

支持以下 payload 标识：

- `deliveryId`
- `batchId`
- `cursor`
- `requestId`

系统会按以下优先级生成 delivery 唯一键：

1. `deliveryId`
2. `batchId`
3. `cursor`
4. `requestId`
5. 若都没有，则退回 payload 稳定哈希

业务记录体仍沿用当前 source-specific 适配：

- `cg3.records[]`
- `qa_feedback.feedbacks[]`
- `online_feedback.events[]`
- 或统一 `items[]`

## 7. ack / retry / replay 机制

### 6.1 ack

若 `ackType=http_post`：

- ACDP 在导入成功后向 `ackEndpoint` 回传确认
- ack body 包含：
  - `sourceType`
  - `deliveryId`
  - `mode`
  - 导入结果计数
  - 可选 `pulledCursor`
  - 可选 `nextCursor`
  - `acknowledgedAt`

### 6.2 retry

当前不做复杂的内存重试调度器，而是采用“失败留痕 + 下次重试”模型：

- receipt 会记录导入成功、ack 失败、导入失败等状态
- 同一 delivery 若已 `imported`，再次拉到时直接跳过
- 同一 delivery 若为 `imported_ack_failed`，再次处理时优先补 ack，不重复导入

### 6.3 replay

若远端 delivery 导入失败或 ack 失败：

- 原始 payload 会包装成 replay envelope 落到 `errorDir`
- 可通过以下方式重放：
  - `POST /api/admin/validation-cases/import-feeds` 携带 `replayErrors=true`
  - `npm run import:validation-feeds -- --replay-errors`

## 8. receipt 机制

当前 receipt 目录：

- `validationFeedReceiptDir/<sourceType>/`

receipt 用途：

- delivery 去重
- cursor 推进
- ack 补偿
- 导入/ack 结果留痕

这保证远端 connector 至少有第一轮“幂等 + 可补偿”基础，而不必依赖人工记忆当前批次是否已经导入过。

## 9. 当前代码落点

本轮已落：

- `prototype/src/lib/validation-feed-importer.js`
  - connector 配置解析后的 source 执行
  - `file_inbox`
  - `http_pull_json`
  - delivery receipt
  - cursor state
  - `http_post` ack
  - replay envelope
- `prototype/src/cli/import-validation-feeds.js`
  - `--source-type`
  - `--replay-errors`
- `POST /api/admin/validation-cases/import-feeds`
  - `sourceTypes`
  - `replayErrors`

## 10. 当前边界

本轮仍未完成：

- 与真实 `cg3` 网络端点的联通验证
- 外部系统真实 token / 网络策略确认
- 真实外部系统返回码与 ack 语义的联调留档

所以 `JOB-007` 只能进入 `in_progress`，不能关单。

## 11. 下一步

当拿到真实环境条件后，下一步顺序应为：

1. 把 `cg3` source 从 `file_inbox` 切到 `http_pull_json`
2. 注入：
   - `ACDP_VALIDATION_FEED_CG3_ENDPOINT`
   - `ACDP_VALIDATION_FEED_CG3_TOKEN`
   - `ACDP_VALIDATION_FEED_CG3_ACK_ENDPOINT`
3. 先跑单源：
   - `npm run check:validation-feeds -- --source-type cg3 --require-remote-configured --require-ack-configured`
   - `npm run import:validation-feeds -- --source-type cg3`
4. 再验证失败回放：
   - `npm run import:validation-feeds -- --source-type cg3 --replay-errors`
5. 留档远端接通证据、ack 结果和 replay 行为
