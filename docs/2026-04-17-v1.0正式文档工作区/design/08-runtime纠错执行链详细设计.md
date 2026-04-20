# runtime 纠错执行链详细设计

- 文档状态：active
- 适用版本：v1.0
- 文档类型：design
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：runtime 文本纠错主链路

## 1. 设计目标

runtime 纠错链负责把输入文本转换为：

1. 单一修正结果
2. 候选整句结果
3. 命中与阻断信息

## 2. 主链路

1. 读取输入文本
2. 选择 stable 或 canary runtime
3. 规范化文本
4. 字面 AC 匹配
5. 拼音召回
6. 规则评估
7. 合并命中
8. 生成替换结果
9. 如走 `correct_cand`，再构造整句候选集合

## 3. 核心函数

1. `runCorrection()`
2. `runCorrectionCandidates()`
3. `PrototypeRuntime.match()`
4. `PrototypeRuntime.matchDetailed()`
5. `buildCorrectedTexts()`

## 4. 三种动作

规则评估后，命中项可落到：

1. `replace`
2. `candidate`
3. `block`

### 4.1 `replace`

直接进入 `correctedText`

### 4.2 `candidate`

不进入主替换，但可进入候选整句

### 4.3 `block`

记入 `blocked`，用于说明阻断原因

## 5. 候选整句构造

关键逻辑：

1. 对同 span 候选项去重
2. 保留高置信度候选
3. 优先主结果
4. 再尝试单槽位替换
5. 再尝试双槽位组合

## 6. 代码入口

1. [`runtime.js`](/Codex/ACDP/prototype/src/lib/runtime.js)
2. [`runtime-candidates.js`](/Codex/ACDP/prototype/src/lib/runtime-candidates.js)
3. [`server.js`](/Codex/ACDP/prototype/src/server.js)

## 7. 修改风险

1. 改 `matchDetailed()` 会同时影响：
   - `correct`
   - `correct_cand`
   - WebSocket
   - simulate
2. 改候选整句排序会改变 `correctedTexts` 合同语义。

## 8. 相关测试

1. [`runtime-candidates.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-candidates.test.js)
2. [`runtime-service.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-service.test.js)
3. [`runtime-smoke.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-smoke.test.js)
