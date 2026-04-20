# 单一真源项目管理与 Codex 衔接说明

## 1. 目的

本说明用于替代过去“只靠手工同步项目状态文档”的旧做法。

现在的唯一真源只有一份：

- `project_management/source_of_truth.json`

以下仓库级与工作区级视图都已改为派生视图，不再手工维护：

- `docs/38-项目JobList与状态清单.md`
- `SESSION_HANDOFF.md`
- `NEXT_STEPS.md`
- `docs/2026-04-17-v1.0正式文档工作区/governance/92-JOB与文档绑定矩阵.md`
- `docs/2026-04-17-v1.0正式文档工作区/governance/94-文档变更记录.md`
- `docs/2026-04-17-v1.0正式文档工作区/governance/96-真源文档注册表视图.md`
- `docs/2026-04-17-v1.0正式文档工作区/adr/00-ADR索引.md`
- `docs/2026-04-17-v1.0正式文档工作区/jobs/00-JOB索引.md`

如果直接手改这些派生视图，状态和文档迟早会再次漂移。

## 2. 新结构

### 2.1 单一真源

- `project_management/source_of_truth.json`

内容包括：

- 全部 job 摘要字段
- `docs/38` 详情区正文
- 正式文档工作区元数据
- 文档注册表
- job 与文档绑定关系
- ADR 注册表
- 文档变更记录
- 当前活动 job 与外部阻塞
- 新 session 接力说明
- 退出 session 前检查清单
- 单 session 内的同步规则

### 2.2 派生文档

由真源自动生成：

- `docs/38-项目JobList与状态清单.md`
- `SESSION_HANDOFF.md`
- `NEXT_STEPS.md`
- `docs/2026-04-17-v1.0正式文档工作区/governance/92-JOB与文档绑定矩阵.md`
- `docs/2026-04-17-v1.0正式文档工作区/governance/94-文档变更记录.md`
- `docs/2026-04-17-v1.0正式文档工作区/governance/96-真源文档注册表视图.md`
- `docs/2026-04-17-v1.0正式文档工作区/adr/00-ADR索引.md`
- `docs/2026-04-17-v1.0正式文档工作区/jobs/00-JOB索引.md`

### 2.3 旧版归档

迁移前快照保存在：

- `project_management/legacy/docs38_legacy_2026-04-04.md`
- `project_management/legacy/SESSION_HANDOFF_legacy_2026-04-04.md`
- `project_management/legacy/NEXT_STEPS_legacy_2026-04-04.md`

需要追历史长文档时去 `legacy/`，不要再把新状态写回旧长文档模式。

## 3. 常用命令

### 3.1 快速查看当前状态

```bash
cd /Codex/ACDP
npm run pm:brief
```

用途：

- 看当前未关闭 job
- 看近期关闭批次
- 看外部前提
- 看下一步建议命令

### 3.2 重新生成全部受管派生文档

```bash
cd /Codex/ACDP
npm run pm:sync
```

这个命令会顺序执行：

1. `pm:render`
2. `pm:check`

也就是说：

- 先根据真源重写仓库级与工作区级受管派生视图
- 再校验派生文档是否和真源一致

### 3.3 只做一致性检查

```bash
cd /Codex/ACDP
npm run pm:check
```

适合：

- 开新 session 时确认文档没有漂移
- 准备退出当前 session 前再做一次核对

### 3.4 一次性迁移旧文档

```bash
cd /Codex/ACDP
npm run pm:migrate
```

说明：

- 这个命令已经在本轮迁移里跑过
- 之后通常不需要再跑
- 后续日常维护只用 `pm:sync` / `pm:check`

## 4. 新开 Codex Session 如何无缝衔接

新 session 启动后，不要直接从旧聊天历史倒推状态，也不要先翻长篇 handoff。

标准做法：

1. 进入仓库并执行：

```bash
cd /Codex/ACDP
npm run pm:brief
```

2. 阅读这几份自动生成文档：

- `docs/38-项目JobList与状态清单.md`
- `SESSION_HANDOFF.md`
- `NEXT_STEPS.md`
- `docs/2026-04-17-v1.0正式文档工作区/00-文档总索引.md`

3. 如果需要更旧的上下文，再去看：

- `project_management/legacy/`

4. 如果本轮准备真正开工：

- 先确认目标 job 在 `pm:brief` 里确实还是 active / blocked / pending
- 再修改 `project_management/source_of_truth.json`
- 运行 `npm run pm:sync`
- 然后才开始代码实现

### 推荐给新 session Codex 的开场提示词

```text
继续 ACDP 工作。先运行 `cd /Codex/ACDP && npm run pm:brief`，再阅读自动生成的 `docs/38-项目JobList与状态清单.md`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md`，以及 `docs/2026-04-17-v1.0正式文档工作区/00-文档总索引.md`。如需变更状态，先改 `project_management/source_of_truth.json` 并执行 `npm run pm:sync`，然后再开始代码或文档实现。
```

## 5. 退出当前 Session 前必须做什么

退出当前 Codex session 前，固定执行以下顺序：

1. 把本轮涉及的 job / batch 状态更新到：

- `project_management/source_of_truth.json`

2. 执行：

```bash
cd /Codex/ACDP
npm run pm:sync
```

3. 如果本轮有正式代码改动或批次状态变更，再补执行项目约束回归：

```bash
cd /Codex/ACDP
npm run smoke:console
npm run test:console
npm run test:unit
```

4. 最终回传时明确说清：

- 本轮改了哪个 job / batch
- 状态怎么变化
- 是否已同步真源和派生文档
- 回归是否通过

### 当前 session 结束前的最小检查清单

- [ ] `source_of_truth.json` 已更新
- [ ] `npm run pm:sync` 已执行
- [ ] 若改了代码，3 组回归已执行
- [ ] 最终消息里已说明状态变化和回归结果

## 6. 单一 Session 内，什么情况下说什么

目标不是“说好听的话”，而是让工作状态和文档始终同步。

### 场景 A：本轮只做阅读、盘点、评估

必须说：

```text
本轮只做上下文读取，不变更项目状态，也不刷新派生文档。
```

然后：

- 只读 `source_of_truth.json` 和生成文档
- 不改状态
- 不跑 `pm:sync`

### 场景 B：准备启动新批次，或把 job 从 `pending` 切到 `in_progress`

必须说：

```text
先挂单或先切状态，再开工；我会先更新单一真源并执行 pm:sync，然后再改代码。
```

然后：

1. 改 `source_of_truth.json`
2. 跑 `npm run pm:sync`
3. 再开始代码实现

### 场景 C：本轮只是某个 job 的局部返工 / follow-up

必须说：

```text
本轮只聚焦指定 task/job follow-up；我会只更新对应状态和 next action，不改无关批次。
```

然后：

1. 只改相关 job 的状态 / `nextAction` / `updatedAt`
2. 跑 `npm run pm:sync`
3. 再做针对性代码修改

### 场景 D：准备关单，或批次已经 accepted

必须说：

```text
本轮将把 job 切到 done，并在回归通过后同步单一真源和派生文档。
```

然后：

1. 改 `source_of_truth.json`
2. 跑 `npm run pm:sync`
3. 跑约束回归
4. 最终回传关单结果

## 7. 日常维护规则

### 只允许修改的地方

日常状态维护只改：

- `project_management/source_of_truth.json`

### 不允许直接手改的地方

不要直接手改：

- `docs/38-项目JobList与状态清单.md`
- `SESSION_HANDOFF.md`
- `NEXT_STEPS.md`

如果你手改了这些派生文档，下一次执行 `npm run pm:sync` 就会被覆盖。

## 8. 推荐最小工作流

### 只看状态

```bash
cd /Codex/ACDP
npm run pm:brief
```

### 改状态并同步

```bash
cd /Codex/ACDP
# 编辑 project_management/source_of_truth.json
npm run pm:sync
```

### 改状态、改代码、做回归

```bash
cd /Codex/ACDP
# 编辑 project_management/source_of_truth.json
npm run pm:sync
# 改代码
npm run smoke:console
npm run test:console
npm run test:unit
```

## 9. 当前结论

这套新体系的关键不是“换了 3 个文件”，而是：

- 状态只维护 1 次
- 交接文档自动生成
- 新 session 有固定接力命令
- 退出 session 有固定收尾顺序
- 单 session 里有固定话术和同步动作

只要坚持：

1. 改真源
2. 跑 `pm:sync`
3. 再改代码或关单

这套体系就能比原来的 3 文档手工同步稳定得多。
