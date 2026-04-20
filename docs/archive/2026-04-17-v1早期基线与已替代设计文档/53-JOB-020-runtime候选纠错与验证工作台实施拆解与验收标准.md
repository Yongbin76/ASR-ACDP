# JOB-020 runtime 候选纠错与验证工作台实施拆解与验收标准

## 1. JOB 定义

- Job ID：`JOB-020`
- 主题：runtime 候选纠错接口与独立“输入与纠错演示”验证工作台
- 当前阶段：方案与拆解已定，后续可直接按本文件进入代码实现

## 2. 目标

建立一条独立于现有 `correct` / `ws correct` 的候选纠错能力，并在 `/console` 中提供与“总览”平级的独立验证页面。

本批目标包括：

- 新增 `POST /api/runtime/correct_cand`
- 新增 `GET /ws/runtime/correct_cand`
- 新增 `/console/runtime-verify`
- 新增 `/api/console/runtime-verify/*` 镜像验证接口
- 将总览中的“输入与纠错演示”从首页重交互区拆出

## 3. 不变边界

本批必须保持以下内容不变：

- `POST /api/runtime/correct` 合同不变
- `GET /ws/runtime/correct` 合同不变
- `POST /api/simulate` 仍是内部调试接口，不转正
- 现有 runtime token、WebSocket governance、gray 路由基础逻辑不被破坏

## 4. 关键业务规则

### 4.1 新接口对外合同

新接口返回固定合同：

```json
{
  "correctedTexts": [
    "主结果",
    "候选结果1",
    "候选结果2",
    "候选结果3"
  ]
}
```

强约束：

1. `correctedTexts[0]` 永远是当前主结果。
2. 后续最多再返回 3 条推荐整句。
3. 推荐整句与主结果去重。
4. 推荐整句之间去重。
5. 若当前主结果等于原文，也允许后续返回推荐整句。
6. 被规则阻断的 hit 不进入候选输出。

### 4.2 第一阶段多点候选策略

第一阶段不做全量穷举，采用受限多点组合：

- 最多参与组合的高价值 slot：前 5 个
- 每个 slot 最多保留 1 个主选 + 2 到 3 个备选
- 每条推荐整句最多偏离主结果 2 个替换点
- 排序按候选总分，越接近主结果优先级越高

### 4.3 当前必须明确的实现口径

1. 如果没有候选整句，只返回 1 条主结果。
2. 如果主结果与原文相同，`correctedTexts[0]` 仍返回原文。
3. `correct_cand` 不暴露 `details`、`slots`、`matches`、`candidates`、`blocked`。
4. `correct_cand` 不是 `/api/simulate` 的别名，也不是调试接口的瘦包装。

## 5. 实施拆解

### T01 文档与单一真源准备

目标：

- 把接口设计、页面设计、扩展位和关单标准固定下来

本轮已完成：

- [52-runtime候选纠错接口与验证工作台方案](./52-runtime候选纠错接口与验证工作台方案.md)
- [53-JOB-020-runtime候选纠错与验证工作台实施拆解与验收标准](./53-JOB-020-runtime候选纠错与验证工作台实施拆解与验收标准.md)
- [54-runtime候选纠错文档索引](./54-runtime候选纠错文档索引.md)

验收点：

- 单一真源已有 `JOB-020`
- `docs/38`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md` 能看到 `JOB-020`

### T02 runtime 候选结果构造能力

目标：

- 在不破坏现有 `match()` 输出的前提下，新增“候选整句结果集”构造能力

建议写入文件：

- `prototype/src/lib/runtime.js`
- `prototype/src/lib/runtime-candidates.js`（建议新增）
- `prototype/tests/unit/runtime-candidates.test.js`（建议新增）

建议实施方式：

#### T02-A 详细命中数据路径

在 [runtime.js](/Codex/ACDP/prototype/src/lib/runtime.js) 增补一条供候选构造复用的详细路径，建议命名为：

- `matchDetailed(rawText, options = {})`

建议返回至少包含：

- `rawText`
- `correctedText`
- `dictVersion`
- `normalizerVersion`
- `literalHits`
- `pinyinHits`
- `evaluated`
- `merged`
- `matches`
- `candidates`
- `blocked`

要求：

- 现有 `match()` 返回结构完全不变
- `match()` 可以继续作为 `matchDetailed()` 的瘦包装，或继续保留现状并只在内部调用 `matchDetailed()`

#### T02-B 候选整句构造模块

在新增的 [runtime-candidates.js](/Codex/ACDP/prototype/src/lib/runtime-candidates.js) 中承接以下能力，建议导出：

- `buildCandidateSlots(detail)`
- `buildCorrectedTexts(detail, options = {})`

`buildCandidateSlots(detail)` 职责：

- 从 `detail.evaluated` 或 `detail.merged` 中构造 slot
- 按 `start/end` 聚合同位置候选
- 去重同 `canonical`
- 排序规则：
  - `confidence` 降序
  - 同分时 `literal` 优先于 `pinyin_exact`

`buildCorrectedTexts(detail, options = {})` 职责：

- 固定把主结果放在 index 0
- 生成受限多点组合候选
- 结果去重
- 最终截断为最多 4 条

建议默认参数：

- `maxOutputs = 4`
- `maxSlots = 5`
- `maxAlternativesPerSlot = 3`
- `maxChangedSlots = 2`

#### T02-C 单元测试

新增 [runtime-candidates.test.js](/Codex/ACDP/prototype/tests/unit/runtime-candidates.test.js)，至少覆盖：

1. 无候选时仅返回主结果
2. 主结果等于原文时仍可返回候选整句
3. 单 slot 多候选去重与排序正确
4. 双 slot 组合结果可生成且不重复
5. 被 `blocked` 的候选不进入输出
6. 候选整句与主结果相同会被剔除

验收点：

- `match()` 现有结果完全不变
- 新候选构造能力能稳定输出 `correctedTexts`
- 单点、多点、无候选、重复候选场景均有单测

### T03 runtime surface 正式接口扩展

目标：

- 在 runtime surface 中新增 `correct_cand` HTTP / WS 接口

建议写入文件：

- `prototype/src/http/runtime-surface.js`
- `prototype/src/server.js`
- `prototype/tests/unit/server-surfaces.test.js`
- `prototype/tests/integration.js`
- 如需单独覆盖，可新增 `prototype/tests/unit/runtime-candidate-surface.test.js`

建议实施方式：

#### T03-A HTTP 路由

在 [runtime-surface.js](/Codex/ACDP/prototype/src/http/runtime-surface.js) 中新增：

- `permissionForRuntimeRoute()`:
  - `POST /api/runtime/correct_cand -> runtime.correct`
- `handleRuntimeRequest()`:
  - `POST /api/runtime/correct_cand`

响应固定为：

```json
{
  "correctedTexts": ["..."]
}
```

#### T03-B server 执行链路

在 [server.js](/Codex/ACDP/prototype/src/server.js) 中建议新增：

- `runCorrectionCandidates(payload = {})`
- `executeCorrectionCandidates(payload, channel)`

要求：

1. 与 `runCorrection()` 共用相同的 runtime 选择逻辑：
   - `trafficKey`
   - `stable/canary`
   - `runtime_not_ready`
2. 与 `executeCorrection()` 共用相同的统计语义：
   - `httpCorrections/wsCorrections`
   - `totalErrors`
   - `peak`
   - latency
3. 不改变现有 `executeCorrection()` 结果结构

#### T03-C WebSocket 路由

在 [server.js](/Codex/ACDP/prototype/src/server.js) 中新增：

- `handleRuntimeCorrectCandWebSocket(req, socket)`，或抽出公共 WS handler 后复用

在 [runtime-surface.js](/Codex/ACDP/prototype/src/http/runtime-surface.js) 中新增：

- `GET /ws/runtime/correct_cand`

要求：

- 权限继续沿用 `runtime.correct`
- governance 与 `ws/runtime/correct` 保持一致
- 每条消息只返回：

```json
{
  "correctedTexts": ["..."]
}
```

#### T03-D 接口级回归

至少覆盖：

1. `correct` 与 `correct_cand` 可并存
2. `correct` 返回类型仍是字符串
3. `correct_cand` 返回类型是数组
4. token、权限、400、503 等错误口径一致
5. `ws correct_cand` 握手与消息回路正常

验收点：

- 现有 `correct` / `ws correct` 回归不变
- 新增 `correct_cand` / `ws correct_cand` 路由可访问
- 401/403/400/503 等错误口径与现有正式接口一致

### T04 console 后台镜像验证接口

目标：

- 通过 admin/console 侧镜像接口承接控制台验证页

建议写入文件：

- `prototype/src/http/admin-surface.js`
- `prototype/tests/unit/console-api.test.js`

建议实施方式：

#### T04-A 权限映射

在 [admin-surface.js](/Codex/ACDP/prototype/src/http/admin-surface.js) 的权限映射中新增：

- `GET /api/console/runtime-verify/current -> runtime.read`
- `POST /api/console/runtime-verify/correct -> runtime.correct`
- `POST /api/console/runtime-verify/correct-cand -> runtime.correct`

#### T04-B 镜像接口

在 `handleAdminRequest()` 中新增：

- `GET /api/console/runtime-verify/current`
- `POST /api/console/runtime-verify/correct`
- `POST /api/console/runtime-verify/correct-cand`

第一阶段建议行为：

- `current` 返回当前 `stable/canary/grayPolicy`
- `correct` 直接走现有 `executeCorrection(..., 'http')`
- `correct-cand` 走新增 `executeCorrectionCandidates(..., 'http')`

建议同时接受但暂不开放的字段：

- `targetMode`
- `nodeId`

当前只支持：

- `targetMode = cluster_current`

对不支持值返回：

- `400 runtime_verify_target_mode_invalid`

#### T04-C 兼容边界

当前已有：

- `GET /api/console/runtime-demo/current`
- `POST /api/console/runtime-demo/simulate`

第一阶段要求：

- 保留旧接口兼容
- 新页面一律使用 `/api/console/runtime-verify/*`

#### T04-D API 测试

至少覆盖：

1. admin-only 模式下 `runtime-verify/current` 可读
2. `runtime-verify/correct` 能执行
3. `runtime-verify/correct-cand` 能执行
4. `targetMode` 非法时返回 400
5. 无权限角色无法访问动作接口

验收点：

- admin-only 模式下页面仍可验证 runtime
- `runtime-verify` 镜像接口能同时调用 `correct` 与 `correct_cand`
- 现有总览 demo 兼容不被破坏

### T05 控制台独立“输入与纠错演示”页面

目标：

- 将总览中的输入与纠错演示拆出为独立页面

建议写入文件：

- `console/client/index.html`
- `console/client/app.js`
- `console/client/app.css`
- `prototype/src/lib/admin-auth.js`
- `prototype/tests/unit/console-read.test.js`
- `prototype/tests/unit/console-workflows.test.js`

建议实施方式：

#### T05-A 导航与页面 feature

在 [index.html](/Codex/ACDP/console/client/index.html) 新增主导航项：

- `/console/runtime-verify`

在 [admin-auth.js](/Codex/ACDP/prototype/src/lib/admin-auth.js) 新增 page feature，建议命名：

- `runtimeVerify.view`
- `runtimeVerify.run.correct`
- `runtimeVerify.run.correctCand`

建议权限：

- `runtimeVerify.view -> runtime.read`
- `runtimeVerify.run.correct -> runtime.correct`
- `runtimeVerify.run.correctCand -> runtime.correct`

#### T05-B 路由与页面渲染

在 [app.js](/Codex/ACDP/console/client/app.js) 增补：

- `pageKeyForPath('/runtime-verify')`
- `renderRuntimeVerify()`
- 新 action：
  - `run-runtime-verify-correct`
  - `run-runtime-verify-correct-cand`

建议页面能力：

- 当前 stable / canary / grayPolicy 摘要
- 输入文本
- `trafficKey`
- `enablePinyinChannel`
- `enablePinyinAutoReplace`
- `correct` 结果卡
- `correct_cand` 结果列表卡

#### T05-C 总览收口

当前首页演示区使用：

- `renderOverviewSimulationPanel()`
- `run-overview-simulation`
- `/api/console/runtime-demo/simulate`

第一阶段建议：

- 总览页移除重交互表单
- 改为轻量摘要卡 + 跳转 `/console/runtime-verify`
- 旧 overview runtime demo state 与 action 可删除，或仅保留极薄兼容层，不再作为主交互入口

#### T05-D 页面级测试

至少覆盖：

1. `/console/runtime-verify` 可访问且带导航高亮
2. 无 `runtime.read` 时页面不可见
3. 无 `runtime.correct` 时按钮禁用或动作受阻
4. 总览页不再渲染重交互 demo 表单
5. 页面能分别展示 `correct` 与 `correct_cand` 结果

验收点：

- `/console/runtime-verify` 可独立完成 `correct` 与 `correct_cand` 验证
- 总览首页不再承担重交互验证区
- 导航、RBAC 和页面 feature 已纳入控制

### T06 面向单节点与灰度验证的扩展预留

目标：

- 让第一阶段实现不挡住第二阶段扩展

建议写入文件：

- `console/client/app.js`
- `prototype/src/http/admin-surface.js`

第一阶段要求：

1. 请求模型预留：
   - `targetMode`
   - `nodeId`
   - `trafficKey`
2. 当前后端只接受：
   - `targetMode = cluster_current`
3. 页面内部 state 预留：
   - `targetMode`
   - `nodeId`
4. 第一阶段 UI 不强制展示节点选择器

第一阶段不要求：

- 真正实现指定节点代理
- 真正实现 stable/canary 双路比较输出
- 真正实现单节点灰度命中验证

验收点：

- 代码与接口模型中已能看到未来扩展位
- 第一阶段页面和接口不需要返工重命名

### T07 文档、测试与回归收口

目标：

- 在代码完成后，补齐文档与回归

建议写入文件：

- `docs/14-正式对外纠错接口说明.md`
- `docs/12-原型实现与当前能力.md`
- `docs/2026-04-02/03-接口与命令速查.md`
- `docs/38-项目JobList与状态清单.md`（由 `pm:sync` 生成）

建议测试范围：

- `prototype/tests/unit/runtime-candidates.test.js`
- `prototype/tests/unit/server-surfaces.test.js`
- `prototype/tests/integration.js`
- `prototype/tests/unit/console-api.test.js`
- `prototype/tests/unit/console-read.test.js`
- `prototype/tests/unit/console-workflows.test.js`

建议回归命令：

- `cd /Codex/ACDP && npm run smoke:console`
- `cd /Codex/ACDP && npm run test:console`
- `cd /Codex/ACDP && npm run test:unit`

## 6. 关单标准

`JOB-020` 只有在以下条件同时满足时才能关单：

1. `POST /api/runtime/correct` 与 `GET /ws/runtime/correct` 合同保持不变。
2. `POST /api/runtime/correct_cand` 与 `GET /ws/runtime/correct_cand` 已可用。
3. 新接口返回 `correctedTexts`，且主结果稳定位于 index 0。
4. 新接口在“无候选”“主结果等于原文”“多点组合”场景下行为可预测且有测试。
5. `/console/runtime-verify` 已上线，并能验证 `correct` 与 `correct_cand`。
6. 总览页已从重交互 demo 区收口为轻摘要/入口。
7. console 后台镜像接口已完成，不直连 runtime surface。
8. 文档、测试和主回归通过。

## 7. 非关单前置项

以下内容不作为 `JOB-020` 第一阶段关单前置项：

- 指定单个 runtime 节点的真实代理调用
- stable / canary 双路差异对比页
- `/api/simulate` 的正式化
- 对外暴露候选明细 `details/slots`
- 多节点批量验证工作台

## 8. 推荐实施顺序

建议严格按以下顺序推进：

1. `T02` runtime 候选构造能力
2. `T03` runtime surface 新接口
3. `T04` console 后台镜像接口
4. `T05` 独立验证页面与总览收口
5. `T06` 扩展位预留
6. `T07` 文档、测试、回归、关单

## 9. 交接建议

后续 Codex 直接接手时，建议按以下顺序读文件并开工：

1. [52-runtime候选纠错接口与验证工作台方案](./52-runtime候选纠错接口与验证工作台方案.md)
2. [53-JOB-020-runtime候选纠错与验证工作台实施拆解与验收标准](./53-JOB-020-runtime候选纠错与验证工作台实施拆解与验收标准.md)
3. [source_of_truth.json](/Codex/ACDP/project_management/source_of_truth.json)
4. [runtime-surface.js](/Codex/ACDP/prototype/src/http/runtime-surface.js)
5. [server.js](/Codex/ACDP/prototype/src/server.js)
6. [admin-surface.js](/Codex/ACDP/prototype/src/http/admin-surface.js)
7. [admin-auth.js](/Codex/ACDP/prototype/src/lib/admin-auth.js)
8. [app.js](/Codex/ACDP/console/client/app.js)

## 10. 开发提醒

- 先保稳定合同，再加候选合同，不要反向改现有 `correct`
- 先做黑盒 `correctedTexts`，不要在第一阶段把内部候选细节一并外露
- 先把总览里的 demo 拆出去，再继续增加验证功能，避免首页继续膨胀
- 单节点验证和灰度验证只做设计预留，不在第一阶段把实现范围拉爆
