# runtime 候选纠错接口与验证工作台方案

## 1. 文档目的

本文件用于承接 `JOB-020` 的设计基线，明确以下内容：

- 保持现有正式纠错接口 `POST /api/runtime/correct` 与 `GET /ws/runtime/correct` 不变
- 新增候选版正式接口 `POST /api/runtime/correct_cand` 与 `GET /ws/runtime/correct_cand`
- 将 `/console` 总览中的“输入与纠错演示”拆出为独立页面，与“总览”平级
- 在控制台页面中同时验证 `correct` 与 `correct_cand`
- 为后续“指定 runtime 节点验证”“灰度路由验证”预留统一扩展位

本文件描述的是下一轮实现方案，不代表当前代码已经具备这些能力。当前已实现能力仍以 [12-原型实现与当前能力](./12-原型实现与当前能力.md) 和 [14-正式对外纠错接口说明](./14-正式对外纠错接口说明.md) 为准。

## 2. 当前基线

当前 runtime 正式接口如下：

- `POST /api/runtime/correct`
- `GET /ws/runtime/correct`

两者都复用同一套底层纠错执行链路 `executeCorrection()`，当前对外只返回最小黑盒结果：

```json
{
  "correctedText": "..."
}
```

当前还存在一条内部调试接口：

- `POST /api/simulate`

它会返回 `matches`、`candidates`、`blocked` 等调试明细，但不适合作为正式对外候选输出接口。

当前 `/console` 总览页内嵌了“输入与纠错演示”区块，并通过 admin/console 侧镜像接口访问 runtime 能力；该区块已经不适合继续承接更复杂的候选结果验证、节点定向验证和灰度验证。

后续如果要正式支持 `targetMode=runtime_node`，需依赖新的多 runtime 与节点备案治理基线，见：

- [55-多runtime实例与节点备案注册方案](./55-多runtime实例与节点备案注册方案.md)
- [56-JOB-021多runtime实例与节点备案注册实施拆解与验收标准](./56-JOB-021多runtime实例与节点备案注册实施拆解与验收标准.md)

## 3. 本批目标

本批目标不是改造现有 `correct` / `ws correct` 合同，而是：

1. 保持现有正式接口完全不变。
2. 新增一组候选版正式接口。
3. 对外仍保持黑盒风格，只返回“整句结果集合”，不返回内部候选槽位、明细 hit 或调试 trace。
4. 在 `/console` 中新增独立验证页面，承接正式接口验证，而不继续把重交互堆在总览页。

## 4. 正式接口方案

### 4.1 保持不变的接口

- `POST /api/runtime/correct`
- `GET /ws/runtime/correct`

这两个接口保持现有请求体与响应体不变：

```json
{
  "correctedText": "..."
}
```

### 4.2 新增接口

- `POST /api/runtime/correct_cand`
- `GET /ws/runtime/correct_cand`

两者沿用与 `correct` 相同的请求体字段：

- `text`
- `trafficKey`
- `enablePinyinChannel`
- `enablePinyinAutoReplace`

当前不新增新的必填字段。

### 4.3 新接口响应合同

新接口只返回整句结果集合，不暴露内部命中结构：

```json
{
  "correctedTexts": [
    "我想咨询祁顺路和上海市发展和改革委员会。",
    "我想咨询岐顺路和上海市发展和改革委员会。",
    "我想咨询祁顺路和市发展改革委。"
  ]
}
```

约束如下：

- `correctedTexts[0]` 永远是当前主替换结果
- 后续元素为推荐整句，最多再返回 3 条
- 推荐结果与主结果去重
- 若没有可用候选，则只返回 1 条
- 排序即最终推荐顺序
- 若当前主结果与原文相同，`correctedTexts[0]` 仍保持原文
- 即使主结果与原文相同，只要存在可提升为整句建议的候选结果，后续元素仍可返回推荐整句
- 被规则阻断的 hit 不进入候选输出

### 4.4 为什么不改现有 `correctedText`

不把现有 `correctedText` 改成数组，原因是：

- 现有调用方兼容成本最低
- `correct` / `ws correct` 可以继续作为稳定正式合同
- 候选能力可单独灰度、单独验证、单独接入

## 5. 候选生成策略

### 5.1 总体原则

对外接口继续保持黑盒；多点候选、排序、组合逻辑全部收敛在 runtime 内部。

第一阶段采用“受限多点候选生成”，而不是无上限全句组合。

### 5.2 内部概念

内部建议引入 `slot` 概念，但不对外暴露：

- 一个 `slot` 对应原文中的一个替换点
- 每个 `slot` 包含：
  - 原文片段
  - 主选替换词
  - 备选词集合

`slot` 的生成时机建议在规则评估之后、重叠裁剪之前。原因是当前 `match()` 在重叠裁剪后只保留最终 `matches/candidates`，会丢失同位置的其他候选。

### 5.3 slot 内排序规则

每个 `slot` 内候选按如下顺序排序：

1. `confidence` 降序
2. 同分时 `literal` 优先于 `pinyin_exact`
3. 同一个 `canonical` 去重

每个 `slot` 最多保留：

- 1 个主选
- 2 到 3 个备选

### 5.4 多点组合规则

第一阶段不做全量组合穷举，采用受限组合：

- 最多参与组合的高价值 `slot`：前 5 个
- 每个 `slot` 最多参与组合的备选：前 2 到 3 个
- 每条推荐结果最多偏离主结果 2 个替换点
- 生成结果后按整句去重
- 最终只保留 top3 推荐整句

组合排序建议按“候选总分”排序：

- 基础分为各选中候选的 `confidence` 累加
- 偏离主结果的 slot 数越多，惩罚越高
- 优先保留更接近主结果、但又有实际区分度的结果

### 5.5 当前不做的事

当前不做：

- 暴露候选 slot 明细
- 暴露词级 `matches/candidates/blocked`
- 提供无上限全句组合搜索
- 把 `/api/simulate` 直接升级成正式接口

### 5.6 第一阶段实现规则补充

为了避免后续实现时口径漂移，第一阶段补充以下规则：

1. 候选输出始终以“当前主结果”为基线。
2. 候选整句只来自非阻断候选，不允许把 `blocked` 命中提升为推荐结果。
3. 如果某个候选组合生成的整句与主结果完全一致，则该结果直接丢弃。
4. 如果某个候选组合生成的整句与其他候选整句重复，则仅保留排序更高的一条。
5. 第一阶段不要求把候选来源、槽位、替换点明细返回给调用方，这些信息仅可在内部实现中使用。

## 6. 控制台验证工作台方案

### 6.1 页面定位

将当前总览下的“输入与纠错演示”拆出为独立页面：

- 页面标题：`输入与纠错演示`
- 建议路由：`/console/runtime-verify`

它与“总览”平级，不再作为总览主页面中的重交互区块长期存在。

### 6.2 总览页调整方向

总览页不再承接完整纠错验证交互，改为：

- 保留轻量摘要
- 保留当前 stable / canary 版本信息
- 保留进入“输入与纠错演示”页面的跳转入口

也就是从“总览内直接试跑”调整为“总览可进入专门验证页”。

### 6.3 控制台后台镜像接口

为了避免 admin-only 模式直接访问 `/api/runtime/*`，控制台页面仍通过 admin/console 侧镜像接口访问 runtime。

建议新增独立命名空间：

- `GET /api/console/runtime-verify/current`
- `POST /api/console/runtime-verify/correct`
- `POST /api/console/runtime-verify/correct-cand`

当前已存在的 `/api/console/runtime-demo/*` 可保留兼容，不作为新页面的主路径。

### 6.4 页面能力

`/console/runtime-verify` 页面第一阶段支持：

- 查看当前 stable / canary / grayPolicy 摘要
- 输入原文
- 调用 `correct`
- 调用 `correct_cand`
- 展示返回结果，并明确区分：
  - `correct` 返回单条正式结果
  - `correct_cand` 返回 `correctedTexts` 结果集合
- 控制 `trafficKey`
- 控制 `enablePinyinChannel`
- 控制 `enablePinyinAutoReplace`

页面不要求第一阶段直接暴露 `/api/simulate` 的调试明细。

## 7. 未来扩展：单节点验证与灰度验证

### 7.1 设计目标

虽然第一阶段页面只要求验证“当前 runtime 集群口径”的 `correct` / `correct_cand`，但设计上应预留两类扩展：

- 指定 runtime 节点验证
- 灰度/路由验证

### 7.2 建议的目标选择模型

后台镜像接口和控制台页面请求体建议预留：

- `targetMode`
- `nodeId`
- `trafficKey`

建议枚举口径：

- `cluster_current`
- `gray_preview`
- `runtime_node`

第一阶段只正式启用：

- `cluster_current`

### 7.3 未来扩展方式

后续若进入第二阶段，可在不改页面主骨架的前提下增加：

- 针对指定 runtime node 的验证代理
- 针对 gray policy / trafficKey 的命中路由验证
- 对 `correct` 与 `correct_cand` 的 stable / canary 对比输出

## 8. 非目标范围

本批不包含：

- 改造现有 `POST /api/runtime/correct` 返回合同
- 改造现有 `GET /ws/runtime/correct` 返回合同
- 把 `/api/simulate` 对外正式化
- 暴露候选生成明细给外部调用方
- 第一阶段直接实现指定节点调用或灰度对比调用

## 9. 关键信息架构结论

本批的核心信息架构结论如下：

1. `correct` / `ws correct` 继续作为稳定正式接口。
2. `correct_cand` / `ws correct_cand` 作为候选版正式接口单独新增。
3. 候选接口仍保持黑盒风格，只返回 `correctedTexts`。
4. `/console` 总览不再长期承接重交互验证区。
5. 新增独立 `/console/runtime-verify` 页面，统一承接 runtime 正式接口验证。
6. 后端通过 `/api/console/runtime-verify/*` 镜像接口承接控制台验证。
7. 指定节点验证与灰度验证作为第二阶段扩展位预留，不绑到第一阶段关单。
