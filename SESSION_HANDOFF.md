# ACDP Session Handoff

> 此文件由 `project_management/source_of_truth.json` 自动生成。
> 它只保留当前可执行交接信息；旧的大段历史已归档到 `project_management/legacy/`。

## Current Snapshot

- 当前未关闭项全部集中在单一真源；派生文档只保留当前视图，不再手工维护 3 份状态。
- 当前未关闭 job：`JOB-006`、`JOB-007`、`JOB-009`、`JOB-030`、`JOB-090`、`JOB-104`、`JOB-105`。
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
- 已新开 `JOB-104`，用于把 `JOB-100` 已冻结的发布包边界继续推进到可自动执行的发布流水线与交付元数据标准化。
- 已新开 `JOB-105`，用于把批量导入从“整批阻断”收口为“按行阻断、可通过记录继续导入”。
- `JOB-098` 已完成 `prototype/workspace-*` 历史测试/验证工作区清理；`JOB-099` 现明确为三步流程，其中第一步可直接复用 `JOB-098` 结果。
- 旧版超长交接文档已归档到 `project_management/legacy/`，只在需要追旧上下文时再查阅。
- 已建立 `docs/2026-04-17-v1.0正式文档工作区/`，并将其接入单一真源与 `pm:sync / pm:check` 的管理链。
- `docs/` 根目录已完成首批历史文档归档分层；已关单且被正式文档工作区覆盖的阶段文档已迁入 `docs/archive/`。
- 已新开 `JOB-103`，开始把正式文档工作区细化为详细设计说明书与 Codex 开发依据文档集。
- `JOB-103` 已完成首版详细设计化：当前正式文档工作区已经覆盖详细设计、数据字典、接口规范、页面设计和 Codex 开发依据。

## Open Jobs

- `JOB-006` | `blocked` | 真实目标 K8S 集群 split 部署验证
  当前目标：在真实目标集群完成 split runtime/admin 验证
  下一步：提供真实 kubeconfig 与镜像仓库后重跑部署验证
- `JOB-030` | `blocked` | `v1.0` R7 真实环境验证与发布准备
  当前目标：为正式 `v1.0` 发布准备 go / no-go 证据，并吸收真实部署和真实并发验证工作
  下一步：等待 `JOB-006` 与 `JOB-009` 的外部条件就绪后，按 `docs/83` 进入真实部署、真实并发和发布前证据收口
- `JOB-090` | `in_progress` | `v1.0` 测试体系建设与流水线验证准备
  当前目标：已完成一轮新的本地完整回归：`test:unit`、`check:api-contracts`、`smoke:console`、`test:console`、`check:v1-local-readiness` 已通过；当前本地阶段已无阻塞，下一步等待外部条件进入 `L4 ~ L6`。
  下一步：若真实部署与压测资源就绪，则按 `docs/105`~`docs/107` 进入 `L4 ~ L6`；否则保持当前本地 readiness 全绿基线，等待外部条件
- `JOB-106` | `pending` | `v1.0` 词典准入与 runtime 输出统一方案
  当前目标：统一词典治理与 runtime 执行标准：准入层只保留 `blocked / ready`，而 `ready` 再按运行方式分成 `replace / candidate`，并要求系统在录入时直接给处理建议，用户按建议批量处理。
  下一步：已完成实现、本地回归和 JOB-090 本地测试主链；后续若再扩候选分流、存量重评估或更细粒度审核提示，按新批次重开，不复用 JOB-106。
- `JOB-007` | `blocked` | validation feeds 真实外部系统集成
  当前目标：本地可完成的 connector contract、HTTP pull/ack/replay 与 mock 验证已完成，剩余真实联通部分受外部系统条件阻塞
  下一步：提供真实 `cg3` endpoint/auth/ack 条件后再做联调与证据留档
- `JOB-009` | `blocked` | 并发与吞吐验证
  当前目标：本地可做的脚本、统计接口、报告留档与基础/目标吞吐分离口径已具备，剩余吞吐数据采集受真实宿主机条件阻塞
  下一步：在目标宿主机运行 `test:concurrency` 基础并发与 `--target-rps 200` 验证；若复用已运行服务，可加 `--base-url`
- `JOB-097` | `pending` | `v1.0` 清理 platform.db 数据库
  当前目标：按三步方式优化 `prototype/workspace/platform.db`：先清 `audit_logs`，再清历史过程表，最后做索引健康检查与优化。
  下一步：已完成 `JOB-097C`；下一步先完成 `JOB-097A`，验证空间回收和主链无回归后，再进入 `JOB-097B`。
- `JOB-097A` | `pending` | `v1.0` 清理 platform.db 的 audit_logs 并 VACUUM
  当前目标：先清理 `audit_logs` 及其索引占用，再通过 `VACUUM` 完成第一轮数据库瘦身。
  下一步：停写入、备份、记录基线后，执行 `DELETE FROM audit_logs`、`wal_checkpoint(TRUNCATE)` 与 `VACUUM`。
- `JOB-097B` | `pending` | `v1.0` 清理 platform.db 历史过程表并 VACUUM
  当前目标：清理审核、导入和来源追溯这些历史过程表，并通过 `VACUUM` 完成第二轮数据库瘦身。
  下一步：在 `JOB-097A` 完成后，按既定顺序删除 `review_tasks / import_job_* / alias_sources / term_sources` 并执行 `VACUUM`。
- `JOB-104` | `pending` | `v1.0` 发布流水线自动化与交付产物标准化
  当前目标：把 `JOB-100` 已收口的发布包边界推进到可自动执行的流水线：镜像构建/推送、release bundle 生成、元数据落盘和交付物命名规则标准化。
  下一步：先冻结自动化边界、输入输出、环境变量与收尾标准，再实现脚本和模板扩展。

## Recently Closed Console Batches

- `JOB-098` | 测试/验证工作区历史副产物清理
- `JOB-102` | `v1.0` docs 历史文档首批归档收边
- `JOB-101` | `v1.0` 正式文档工作区与单一真源绑定
- `JOB-013` | `/console` B01 信息架构与视觉层级优化批次
- `JOB-014` | `/console` B02 二级工作页与详情页层级一致性批次
- `JOB-015` | `/console` B03 跨页模式收敛与系统感一致性批次
- `JOB-016` | `/console` B04 收尾批次与低风险视觉基础增强

## New Session

1. 进入仓库后先执行 `cd /Codex/ACDP && npm run pm:brief`，不要先翻旧长文档。
2. 先阅读生成后的 `docs/38-项目JobList与状态清单.md`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md`，再决定是否需要查 `project_management/legacy/`。
3. 如需理解当前正式口径，优先阅读 `docs/2026-04-17-v1.0正式文档工作区/00-文档总索引.md`，不要再回目录外旧文档里找现行依据。
4. 如果本轮要开新批次或切状态，先修改 `project_management/source_of_truth.json`，再执行 `npm run pm:sync`，然后再动代码。
5. 如果只是继续已有未关闭 job，先确认它在 `pm:brief` 输出里仍是 active/blocker 状态，再开始实现。

### Prompt Template

```text
继续 ACDP 工作。先运行 `cd /Codex/ACDP && npm run pm:brief`，再阅读自动生成的 `docs/38-项目JobList与状态清单.md`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md`，以及当前正式文档工作区 `docs/2026-04-17-v1.0正式文档工作区/00-文档总索引.md`。如需变更状态，先改 `project_management/source_of_truth.json` 并执行 `npm run pm:sync`，然后再开始代码或文档实现。
```

## Before Exit

1. 在退出当前 Codex session 前，先把本轮涉及的 job/batch 状态更新到 `project_management/source_of_truth.json`。
2. 执行 `cd /Codex/ACDP && npm run pm:sync`，确保 `docs/38`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md` 与单一真源同步。
3. 如果本轮改了正式文档工作区内容，同时确认工作区内生成视图和治理文档已同步。
4. 如果本轮动了代码或正式改了文档，按项目约束补跑 `npm run smoke:console`、`npm run test:console`、`npm run test:unit`。
5. 在最终回传里明确说明：本轮状态变化、回归结果、以及是否还有未关闭 follow-up。

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
