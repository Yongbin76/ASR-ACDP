# ACDP Session Handoff

> 此文件由 `project_management/source_of_truth.json` 自动生成。
> 它只保留当前可执行交接信息；旧的大段历史已归档到 `project_management/legacy/`。

## Current Snapshot

- 当前未关闭项全部集中在单一真源；派生文档只保留当前视图，不再手工维护 3 份状态。
- 当前未关闭 job：`JOB-006`、`JOB-007`、`JOB-009`、`JOB-030`、`JOB-090`、`JOB-100`。
- `/console` 批次 `JOB-013`~`JOB-017` 当前都已关闭，不应默认继续推进。
- `JOB-018` 已完成导入中心统一结构化词条导入重构，不再作为未关闭项继续保留。
- `JOB-019` 已完成统一词条准入规则与跨中心收口，后续扩展按新批次重开。
- `JOB-020` 已完成 runtime 候选纠错接口与独立验证工作台，后续节点定向/灰度扩展按新批次重开。
- `JOB-021` 已完成多 runtime 实例与节点备案注册治理，并已产出本机 `1 admin + 2 runtime` 验证报告。
- `JOB-022` 已完成发布中心与审核中心中 release 状态分层收口。
- `JOB-023` 已完成控制台整体信息架构与治理重构；后续若再扩到更复杂的发布治理或系统管理能力，按新批次重开。
- `JOB-024` ~ `JOB-029` 已完成并关闭；`JOB-030` 仍保持 blocked，等待真实部署与真实并发条件。
- `JOB-031` ~ `JOB-033` 已完成，`/console` 产品面收口与总复核已通过；后续进入真实环境验证与发布包装阶段。
- 为避免过程文档、handoff 文档和无关测试资产进入正式镜像，已新增 `JOB-100`（最终发布包组成与发布包装清理）。
- `JOB-090` 当前已完成 `/console` 产品面相关本地测试与总复核；下一步在外部条件就绪后进入 `L4 ~ L6`，或视需要补可选增强项。
- 旧版超长交接文档已归档到 `project_management/legacy/`，只在需要追旧上下文时再查阅。

## Open Jobs

- `JOB-006` | `blocked` | 真实目标 K8S 集群 split 部署验证
  当前目标：在真实目标集群完成 split runtime/admin 验证
  下一步：提供真实 kubeconfig 与镜像仓库后重跑部署验证
- `JOB-030` | `blocked` | `v1.0` R7 真实环境验证与发布准备
  当前目标：为正式 `v1.0` 发布准备 go / no-go 证据，并吸收真实部署和真实并发验证工作
  下一步：等待 `JOB-006` 与 `JOB-009` 的外部条件就绪后，按 `docs/83` 进入真实部署、真实并发和发布前证据收口
- `JOB-090` | `in_progress` | `v1.0` 测试体系建设与流水线验证准备
  当前目标：已完成包含 `JOB-036 admin_http_signed` 在内的本地回归确认：`test:unit`、`test:console`、`smoke:console`、`check:api-contracts`、`test:unit:coverage`、`check:v1-local-readiness` 已通过；当前本地阶段已无阻塞，下一步等待外部条件进入 `L4 ~ L6`
  下一步：若真实部署与压测资源就绪，则按 `docs/105`~`docs/107` 进入 `L4 ~ L6`；否则保持当前本地 readiness 全绿基线，等待外部条件
- `JOB-007` | `blocked` | validation feeds 真实外部系统集成
  当前目标：本地可完成的 connector contract、HTTP pull/ack/replay 与 mock 验证已完成，剩余真实联通部分受外部系统条件阻塞
  下一步：提供真实 `cg3` endpoint/auth/ack 条件后再做联调与证据留档
- `JOB-009` | `blocked` | 并发与吞吐验证
  当前目标：本地可做的脚本、统计接口、报告留档与基础/目标吞吐分离口径已具备，剩余吞吐数据采集受真实宿主机条件阻塞
  下一步：在目标宿主机运行 `test:concurrency` 基础并发与 `--target-rps 200` 验证；若复用已运行服务，可加 `--base-url`

## Recently Closed Console Batches

- `JOB-013` | `/console` B01 信息架构与视觉层级优化批次
- `JOB-014` | `/console` B02 二级工作页与详情页层级一致性批次
- `JOB-015` | `/console` B03 跨页模式收敛与系统感一致性批次
- `JOB-016` | `/console` B04 收尾批次与低风险视觉基础增强
- `JOB-017` | `/console` B05 视觉系统升级批次

## New Session

1. 进入仓库后先执行 `cd /Codex/ACDP && npm run pm:brief`，不要先翻旧长文档。
2. 先阅读生成后的 `docs/38-项目JobList与状态清单.md`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md`，再决定是否需要查 `project_management/legacy/`。
3. 如果本轮要开新批次或切状态，先修改 `project_management/source_of_truth.json`，再执行 `npm run pm:sync`，然后再动代码。
4. 如果只是继续已有未关闭 job，先确认它在 `pm:brief` 输出里仍是 active/blocker 状态，再开始实现。

### Prompt Template

```text
继续 ACDP 工作。先运行 `cd /Codex/ACDP && npm run pm:brief`，再阅读自动生成的 `docs/38-项目JobList与状态清单.md`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md`。如需变更状态，先改 `project_management/source_of_truth.json` 并执行 `npm run pm:sync`，然后再开始代码或文档实现。
```

## Before Exit

1. 在退出当前 Codex session 前，先把本轮涉及的 job/batch 状态更新到 `project_management/source_of_truth.json`。
2. 执行 `cd /Codex/ACDP && npm run pm:sync`，确保 `docs/38`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md` 与单一真源同步。
3. 如果本轮动了代码或正式改了文档，按项目约束补跑 `npm run smoke:console`、`npm run test:console`、`npm run test:unit`。
4. 在最终回传里明确说明：本轮状态变化、回归结果、以及是否还有未关闭 follow-up。

## In-Session Sync Rules

| 场景 | Codex 需要说的话 | 然后做什么 |
|---|---|---|
| 只做阅读/盘点/评估，不打算改状态 | 本轮只做上下文读取，不变更项目状态，也不刷新派生文档。 | 只读单一真源和生成文档，不修改 source_of_truth.json。 |
| 准备启动新批次或把已有 job 从 pending 切到 in_progress | 先挂单或先切状态，再开工；我会先更新单一真源并执行 pm:sync，然后再改代码。 | 先修改 source_of_truth.json，再运行 npm run pm:sync。 |
| 本轮只是局部返工或 follow-up | 本轮只聚焦指定 task/job follow-up；我会只更新对应状态和 next action，不改无关批次。 | 只改相关 job 的状态、nextAction、updatedAt，并执行 npm run pm:sync。 |
| 准备关单或确认批次 accepted | 本轮将把 job 切到 done，并在回归通过后同步单一真源和派生文档。 | 先改 source_of_truth.json，再运行 npm run pm:sync，然后补跑回归。 |

## Legacy Archives

- project_management/legacy/SESSION_HANDOFF_legacy_2026-04-04.md
- project_management/legacy/NEXT_STEPS_legacy_2026-04-04.md
