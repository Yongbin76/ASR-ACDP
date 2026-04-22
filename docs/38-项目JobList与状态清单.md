# 项目 JobList 与状态清单

> 此文件由 `project_management/source_of_truth.json` 自动生成。
> 请勿直接手改；如需更新状态，请修改单一真源后执行 `npm run pm:sync`。
> 口径说明：本清单同时保留历史已关单 job 的原始命名与详情，因此正文中会出现旧目录、旧术语和旧路由；当前直接编码时，请优先以进行中 job、当前正式文档工作区与现行帮助文档为准。

## 1. 文档目的

本文件用于从项目管理视角统一管理 ACDP 当前各项工作，避免后续开发、验证、部署和交接只依赖零散对话或临时待办。

每个 job 都应明确：

- 目标
- 当前状态
- 优先级
- 当前负责人
- 最近更新时间
- 外部依赖
- 是否可关闭
- 后续动作
- 风险
- 完成标准

## 2. 状态定义

| 状态 | 含义 |
|---|---|
| `pending` | 已识别，未启动 |
| `in_progress` | 已启动，正在执行 |
| `blocked` | 已确认需要做，但被外部条件阻塞 |
| `done` | 已完成，当前无需继续推进 |
| `maintenance` | 长期维护项，不是一次性关闭任务 |

## 3. Job 总表

| Job ID | 阶段/分组 | 名称 | 状态 | 优先级 | 当前负责人 | 最近更新时间 | 当前目标 | 下一步动作 | 外部依赖 | 是否可关闭 | 主要阻塞/风险 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `JOB-001` | `Console` | `/console` 运营闭环收尾 | `done` | `P0` | Codex / 待指定业务验收人 | `2026-04-03` | 已在不影响 `/admin` 的前提下，把 `/console` 从“功能集合”收口为可运营的控制台工作台 | 后续 `/console` 残余体验问题转入 `JOB-012` 维护；主线回到宿主验证与真实环境证据整理 | 业务验收反馈、现有 `/console` 与 RBAC 基线 | 是 | 若后续再收到新一轮实测反馈，应按维护项增量收口而不是重开主线 |
| `JOB-001A` | `Console` | `/console` 总览工作台化 | `done` | `P0` | Codex | `2026-04-02` | 已把首页从摘要页升级为待办/异常驱动的最小工作台 | 进入 `JOB-001B`，补齐发布中心到运行节点中心的目标版本下发闭环 | `/console` 总览现状、RBAC 页面功能矩阵 | 是 | 若后续待办定义继续膨胀，需要在 `JOB-001D` 控制首页信息密度 |
| `JOB-001B` | `Console` | `/console` 发布到运行节点控制闭环 | `done` | `P0` | Codex | `2026-04-02` | 已让发布中心与运行节点中心形成目标版本下发与收敛可见的最小闭环 | 进入 `JOB-001C`，把发布后验证、证据和异常收口到 release 详情 | `JOB-002C`~`JOB-002G` 已落地基线 | 是 | 当前下发范围仍是全局 control state，按环境差异化下发仍待后续扩展 |
| `JOB-001C` | `Console` | `/console` 发布确认与异常收口 | `done` | `P1` | Codex | `2026-04-02` | 已把发布后验证、节点 apply、异常摘要和本地验证证据收敛到 release 详情 | 进入 `JOB-001D`，收尾聚合查询和剩余体验问题 | `JOB-001B`、release gate/validation/runtime stats | 是 | 当前证据入口仍以本地 `host_verification` 报告为第一版基线 |
| `JOB-001D` | `Console` | `/console` 聚合查询与体验收尾 | `done` | `P1` | Codex | `2026-04-03` | 已完成 workbench、rollout、release detail、release gate/validation 旁路接口的轻量化与控制台格式统一，`/console` 主收尾已结束 | 后续若出现新增截图问题或文案/布局回归，转入 `JOB-012` 维护；不再作为未完成主线保留 | `JOB-001A`~`JOB-001C` 完成后的真实使用反馈 | 是 | 后续扩量时仍需持续关注分页与缓存策略，但不再阻塞当前收尾关闭 |
| `JOB-002` | `Console` | `/console` 宿主验证与证据留档 | `done` | `P1` | Codex / 宿主验证执行人 | `2026-04-04` | 已完成 `/console` 宿主验证闭环并沉淀自动化、人工记录与收尾结论 | 后续若需要更强演示材料，可补真实宿主浏览器截图，但不再阻塞关单 | 当前授权已接受 inject 证据替代截图 | 是 | 当前收口基于授权接受的 inject 证据；若未来要求更强展示证据，再增补真实宿主截图 |
| `JOB-002A` | `Architecture` | 控制面/数据面架构与 RBAC 重构方案确认 | `done` | `P0` | Codex / 你已确认关键节点 | `2026-04-01` | 将 admin 控制面 / runtime 数据面 + RBAC 三层模型整理为可落地方案 | 已可进入实现拆解 | 方案确认 | 是 | 若实现阶段偏离方案，仍可能返工 |
| `JOB-002B` | `Architecture` | 第一版 MinIO 制品仓配置与接入设计 | `done` | `P0` | Codex / 待指定运维支持 | `2026-04-02` | 已在保持 `artifact_store.config.json` 驱动的前提下，完成本机 MinIO docker 形态、远端上传/同步链路、configured/file 双模式验证，以及 `*Env` 凭据注入口径与真实宿主二次证据 | 后续转入真实目标集群验证与 `JOB-006` | MinIO 部署口径、生产 secret 注入方案 | 是 | 目标集群验证仍受 kube context 缺失阻塞，但已转移到 `JOB-006` 范围 |
| `JOB-002C` | `Architecture` | runtime 节点注册与心跳能力 | `done` | `P0` | Codex | `2026-04-01` | 已完成 runtime node registry、register、heartbeat 和在线/离线状态判定的最小闭环 | 进入 `JOB-002D`/`JOB-002E`，把控制状态与本地切换接到当前节点模型 | 方案已确认 | 是 | 后续若 desired/current version 归口变更，需要与 `JOB-002D` 一起校正 |
| `JOB-002D` | `Architecture` | desiredVersion 与制品元数据下发 | `done` | `P0` | Codex | `2026-04-01` | 已完成 desiredVersion、artifact metadata、runtime control read 和 apply-result 基础回传 | 进入 `JOB-002F` | 制品仓接入 | 是 | 若后续需要节点级 override，需在现有全局 control 状态上扩展 |
| `JOB-002E` | `Architecture` | runtime 本地制品拉取与原子切换 | `done` | `P0` | Codex | `2026-04-02` | 已完成本地制品目录、下载/校验、原子切换、rollback 与失败恢复的代码闭环，并补了一轮本机真实 HTTP 控制面模式验证证据 | 继续在真实 MinIO / 宿主 / 集群环境补 configured 模式证据 | MinIO、desiredVersion | 是 | 本机 file 模式验证已通过，但真实 MinIO 配置模式仍受 `JOB-002B` 阻塞 |
| `JOB-002F` | `Architecture` | runtime 本地统计缓冲与定时回传 | `done` | `P1` | Codex | `2026-04-01` | 已完成 runtime 本地统计缓存、周期 flush 与 admin 幂等入库的代码闭环 | 进入 `JOB-002G` 页面层，消费当前节点与统计模型 | 本地 SQLite、admin 接收接口 | 是 | 若后续统计维度扩展，需在当前上传批次模型上增量演进 |
| `JOB-002G` | `Architecture` | `/console/runtime-nodes` 页面与节点管理视图 | `done` | `P1` | Codex | `2026-04-02` | 已完成 `/console/runtime-nodes` 列表、详情和节点统计摘要展示，并补充节点页自动刷新与心跳距今/离线阈值显示 | 继续在真实宿主环境观察节点离线判定体验 | runtime 节点模型、RBAC | 是 | 若后续加节点控制动作，需要与 `JOB-002H` 一起做权限收口 |
| `JOB-002H` | `Architecture` | RBAC 四层重构与页面功能映射 | `done` | `P0` | Codex | `2026-04-01` | 已完成四层 RBAC 首轮落地，包括页面功能矩阵、动作级映射和高风险约束元数据 | 进入真实控制面模式验证与剩余工程化收尾 | 方案确认 | 是 | 后续若新增页面或动作，需要继续维护页面功能矩阵一致性 |
| `JOB-003` | `Split-Architecture` | runtime/admin 代码层拆分 | `done` | `P2` | Codex | `2026-04-01` | 拆出 runtime 与 admin/console route composition | 无 | 无 | 是 | 后续改边界要同步 smoke |
| `JOB-004` | `Split-Architecture` | runtime/admin 进程层拆分 | `done` | `P2` | Codex | `2026-04-01` | 提供独立启动、独立守护、独立 smoke 的入口 | 无 | 无 | 是 | 端口和 workspace 依赖需持续保持一致 |
| `JOB-005` | `Split-Deployment` | runtime/admin 部署资产拆分 | `done` | `P2` | Codex | `2026-04-01` | 提供 split Dockerfile 与 K8S 清单 | 无 | 无 | 是 | 当前仍依赖共享 PVC |
| `JOB-006` | `Split-Deployment` | 真实目标 K8S 集群 split 部署验证 | `blocked` | `P0` | 待指定运维 / Codex 支持 | `2026-04-01` | 在真实目标集群完成 split runtime/admin 验证 | 提供真实 kubeconfig 与镜像仓库后重跑部署验证 | 真实集群访问、镜像仓库 | 否 | 当前只完成 Docker 与本地 `kind` 验证 |
| `JOB-007` | `External-Integration` | validation feeds 真实外部系统集成 | `blocked` | `P1` | Codex | `2026-04-04` | 本地可完成的 connector contract、HTTP pull/ack/replay 与 mock 验证已完成，剩余真实联通部分受外部系统条件阻塞 | 提供真实 `cg3` endpoint/auth/ack 条件后再做联调与证据留档 | 外部系统访问条件 | 否 | 真实网络、认证和对端 ack 语义仍依赖外部系统条件 |
| `JOB-008` | `External-Integration` | file-based feed 文档与示例维护 | `done` | `P3` | Codex | `2026-04-04` | 已完成当前 file-based feed 文档、模板、示例和 payload 示例的同步复核，并补自动一致性校验 | 若后续 payload/模板再变化，按新的维护批次同步文档与示例，不复用当前关单 | 无 | 是 | 若未来绕过当前测试与文档同步链路直接改资产，仍可能再次漂移 |
| `JOB-009` | `Runtime-Validation` | 并发与吞吐验证 | `blocked` | `P1` | 待指定测试/运维负责人 | `2026-04-15` | 本地可做的脚本、统计接口、报告留档与基础/目标吞吐分离口径已具备，剩余吞吐数据采集受真实宿主机条件阻塞 | 在目标宿主机运行 `test:concurrency` 基础并发与 `--target-rps 200` 验证；若复用已运行服务，可加 `--base-url` | 真实宿主机环境 | 否 | 需要真实宿主机环境 |
| `JOB-010` | `Architecture` | SQLite 之后的状态管理规划 | `done` | `P2` | Codex | `2026-04-04` | 已形成控制库 / 对象存储 / runtime 本地状态三层拆分的可执行升级路线 | 若后续进入多副本 admin 或正式生产控制面，按升级路线进入实施阶段，不再重复做概念规划 | 架构决策 | 是 | 实施仍需要真实 PostgreSQL/运维条件，但规划本身已完成 |
| `JOB-011` | `Governance` | WebSocket caller identity / quota 治理 | `done` | `P2` | Codex | `2026-04-04` | 已完成 WebSocket caller registry / quota / blacklist 首轮治理落地，并保留 legacy token 兼容路径 | 若后续进入多实例或正式生产接入，再扩共享限流与控制面化管理 | 生产接入需求 | 是 | 当前 caller quota 仍是单进程内存态，多实例场景仍需共享状态支撑 |
| `JOB-012` | `Maintenance` | 遗留问题与体验型待办维护 | `done` | `P2` | Codex | `2026-04-04` | 已完成当前 `/console` 视觉、布局、文案和轻交互维护批次，并清空当前挂起待办 | 若后续再收到 `/console` 回归反馈，以新维护批次重开，不继续沿用当前关单 | 无 | 是 | 若未来维护越界成重设计，会重新扰动已关闭的 `/console` 主线 |
| `JOB-013` | `Console` | `/console` B01 信息架构与视觉层级优化批次 | `done` | `P2` | Codex | `2026-04-04` | 已完成 `ACDP-CONSOLE-20260404-B01` 的 `T01`~`T06`，并落地首页/列表页/详情页的信息架构与风险动作分区优化 | 如后续再收到新的 Console IA/结构反馈，按新批次重开，不复用 `JOB-013` | 无 | 是 | 若后续把新一轮 Console 批次混回 `JOB-001D` / `JOB-012` / `JOB-013`，会再次打乱回溯口径 |
| `JOB-014` | `Console` | `/console` B02 二级工作页与详情页层级一致性批次 | `done` | `P2` | Codex | `2026-04-04` | 已完成 `ACDP-CONSOLE-20260404-B02` 的 `T01`~`T06`，并收口 validation / term detail / runtime detail / release detail / import template detail 的结构一致性 | 如后续再收到新的 Console 二级页或详情页结构反馈，按新批次重开，不复用 `JOB-014` | 无 | 是 | 若误并入 `JOB-013` 或旧 `/console` 收尾批次，会打乱回溯口径与验收边界 |
| `JOB-015` | `Console` | `/console` B03 跨页模式收敛与系统感一致性批次 | `done` | `P2` | Codex | `2026-04-04` | 已完成 `ACDP-CONSOLE-20260404-B03` 的 `T01`~`T06`，并收口帮助页、跨页过滤/状态/导航/侧栏语法的一致性 | 如后续再收到新的 Console 模式收敛或系统感一致性反馈，按新批次重开，不复用 `JOB-015` | 无 | 是 | 若误并入 `JOB-013` / `JOB-014` 或旧 `/console` 收尾批次，会打乱回溯口径与验收边界 |
| `JOB-016` | `Console` | `/console` B04 收尾批次与低风险视觉基础增强 | `done` | `P2` | Codex | `2026-04-04` | 已完成 `ACDP-CONSOLE-20260404-B04` 的 `T01`~`T05`，并在复核补丁后通过 `T05` 黑盒验收 | 如后续再收到新的 Console 收尾/视觉基础一致性反馈，按新批次重开，不复用 `JOB-016` | 无 | 是 | 若误并入 `JOB-013` / `JOB-014` / `JOB-015` 或旧 `/console` 收尾批次，会打乱回溯口径与验收边界 |
| `JOB-017` | `Console` | `/console` B05 视觉系统升级批次 | `done` | `P2` | Codex | `2026-04-04` | 已完成 `ACDP-CONSOLE-20260404-B05` 的 `T01`~`T05`，并把 `/console` 升级为更鲜明但仍稳定的视觉系统基线 | 如后续再收到新的 Console 视觉系统升级反馈，按新批次重开，不复用 `JOB-017` | 无 | 是 | 若误回头重开 B04 结构收口，或把未来视觉轮次混回 `JOB-017`，会破坏系统级目标和回溯口径 |
| `JOB-018` | `Console` | 导入中心统一结构化词条导入重构 | `done` | `P1` | Codex | `2026-04-07` | 已完成导入中心统一结构化词条导入重构；模板下载体验问题已收口，首页宽度对齐问题保留为后续统一处理的遗留项 | 后续若统一处理 `/console` 首页与工作区宽度系统，再把导入中心首页宽度对齐问题作为同批遗留项一起收口；其余导入中心反馈按新批次重开，不复用 `JOB-018` | 现有 `terms/aliases/import_jobs` 数据模型、旧模板兼容要求 | 是 | 若未来继续在同一页面混入新的词条导入变体而不回到统一合同，导入中心复杂度会再次反弹；首页宽度系统若继续零碎 patch，也会反复出现视觉不齐问题 |
| `JOB-019` | `Console` | 统一词条准入规则与跨中心收口 | `done` | `P1` | Codex | `2026-04-14` | 已完成统一词条准入校验器、导入中心/词条中心接入、审核中心准入摘要和相关回归；后续 follow-up 已补单字标准词特例准入与导入批次批量审核 pending-only 处理 | 后续若要继续扩到更强的 alias 冲突策略、数据库唯一约束或 NLP 辅助判词，按新批次重开，不复用 `JOB-019` | 无 | 是 | 若继续只在导入中心局部补规则、而不把词条中心和审核中心一起收口，会再次形成双轨准入口径；若把历史数据清洗或数据库唯一约束强绑进同一批次，也容易把实现范围拉爆 |
| `JOB-020` | `Split-Architecture` | runtime 候选纠错接口与输入验证工作台 | `done` | `P1` | Codex | `2026-04-07` | 已完成 `correct_cand` / `ws correct_cand`、runtime 候选整句构造、console 镜像接口以及独立 `/console/runtime-verify` 页面，总览中的重交互演示已收口为入口 | 后续若要扩到指定 runtime 节点验证或 stable/canary 差异对比，依赖 `JOB-021` 基线后按新批次重开，不复用 `JOB-020` | 无 | 是 | 若直接改现有 `correct` / `ws correct` 合同，会破坏现有调用方稳定性；若继续把重交互 demo 留在总览页并叠加候选/节点/灰度验证，首页复杂度会再次失控；若第一阶段就把节点定向与灰度对比一起硬做，范围容易拉爆 |
| `JOB-021` | `Split-Architecture` | 多 runtime 实例验证与节点备案注册治理 | `done` | `P1` | Codex | `2026-04-07` | 已完成多 runtime 实例隔离、`runtime_node_registry` 备案台账、注册密钥治理、console 备案页与 `verify-multi-runtime` 报告产出，`1 admin + 2 runtime` 本机验证已通过 | 后续若要继续扩到真实 LB/Ingress、节点级 desiredVersion override、`runtime-verify targetMode=runtime_node`，或把 runtime 快照下发扩到 `admin_http_signed`，按新批次重开，不复用 `JOB-021` | 无 | 是 | 若继续沿用当前“共享 token + 自动入库”注册机制，多 runtime 节点虽然能并行运行，但接入治理仍然不可控；若只做多开端口、不做 workspace / state / stats / 日志隔离，也很容易出现节点状态串写；若把正式 LB/Ingress 或节点级版本 override 一起硬做，范围容易拉爆 |
| `JOB-022` | `Console` | 发布中心状态分层与页面收口 | `done` | `P1` | Codex | `2026-04-08` | 已完成发布中心与审核中心中 release publish review 的三层状态收口：版本状态、审批状态、流量状态现在已在 release list/detail 与 review list/detail 中统一展示 | 后续若要扩到多环境版本矩阵、更多灰度策略类型或更复杂的发布动作引导，按新批次重开，不复用 `JOB-022` | 现有 release / review / gray policy 聚合基线 | 是 | 若继续把 release status、approval status、traffic status 混为一个状态展示，发布中心会持续制造误解；若把数据库 schema 变更或灰度模型升级硬绑进本批，也会把范围拉爆 |
| `JOB-023` | `Architecture` | 控制台整体信息架构与治理重构 | `done` | `P1` | Codex | `2026-04-08` | 已完成业务属性配置页的增删改与节点备案页部署配置说明补充，`JOB-023` 所有收尾项已完成 | 后续若要继续扩到业务属性与主数据联动校验、节点安装向导或更复杂的系统管理能力，按新批次重开，不复用 `JOB-023` | 无 | 是 | 若继续按当前页面逐个 patch，信息架构和职责边界仍会继续漂移；若直接删除发布/审批分离限制而不引入治理策略，会降低正式环境治理能力；若继续把业务属性、角色权限、中文术语散落硬编码在代码中，后续维护成本会持续放大 |
| `JOB-024` | `Release-v1.0` | `v1.0` R1 运行治理域重构 | `done` | `P0` | Codex | `2026-04-08` | 已完成运行治理域首轮重构：运行治理以备案节点为主对象，运行节点主列表、详情、部署说明和基础帮助链路已经收口 | 进入 `JOB-025`，按 `docs/78` 重构版本发布域；运行治理后续若继续扩到节点级控制或更细粒度异常归档，按新批次重开 | 无 | 是 | 若后续又把未备案 runtime 混回主列表，或重新把历史异常当成当前状态展示，运行治理域会再次失真 |
| `JOB-025` | `Release-v1.0` | `v1.0` R2 版本发布域重构 | `done` | `P0` | Codex | `2026-04-08` | 已完成版本发布域首轮重构：release 只保留 `built / canary / published`，版本校验、发布审核、流量状态、发布后风险和回滚记录已经分层 | 进入 `JOB-026`，按 `docs/79` 重构主数据域；发布域后续若继续扩到独立回滚记录页或更复杂 rollout 视图，按新批次重开 | 无 | 是 | 若后续又把当前主数据状态、发布审核、流量状态和发布后风险重新混读，发布中心会再次失去生命周期边界 |
| `JOB-026` | `Release-v1.0` | `v1.0` R3 主数据域重构 | `done` | `P1` | Codex | `2026-04-08` | 已完成主数据域首轮重构：词条、批量导入、业务属性、样本与回流已统一归口到主数据，并从页面主语义中移除了 release 依附关系 | 进入 `JOB-027`，按 `docs/80` 收口系统配置域；主数据域后续若要继续做更细的只读聚合或导入历史治理，按新批次重开 | 无 | 是 | 若后续又把样本、业务属性或词条列表重新挂回系统配置或 release 语义，主数据域边界会再次变模糊 |
| `JOB-027` | `Release-v1.0` | `v1.0` R4 系统配置域重构 | `done` | `P1` | Codex | `2026-04-08` | 已完成系统配置域首轮重构：用户、角色、权限、治理策略已明确归口，且 RBAC 与治理策略边界已经在页面和帮助中收口 | 进入 `JOB-028`，把现有页面手册、流程手册、运维说明和接口帮助统一接入帮助中心；系统配置域后续若继续扩到更复杂的 IAM 生命周期，按新批次重开 | 无 | 是 | 若后续又把权限规则和治理策略散落回后端逻辑或页面文案，系统配置域会重新失去边界 |
| `JOB-028` | `Release-v1.0` | `v1.0` R5 帮助域与接口文档体系 | `done` | `P1` | Codex | `2026-04-08` | 已完成帮助域与接口文档体系首轮重构：帮助文档、slug 配置、帮助 API 和帮助中心页面已经统一打通 | 进入 `JOB-029`，按 `docs/82` 重构工作台；帮助域后续若继续扩到全文检索或更强的帮助导航，可按新批次重开 | 无 | 是 | 若后续又退回到少量硬编码帮助文章，帮助域会重新失去完整性和配置驱动能力 |
| `JOB-029` | `Release-v1.0` | `v1.0` R6 工作台重构 | `done` | `P2` | Codex | `2026-04-08` | 已完成工作台首页首轮重构：工作台现在只承担稳定聚合、待办引导和风险提醒，不再挂重交互验证和跨域解释 | 进入 `JOB-024 ~ JOB-029` 总复核；工作台后续若继续扩到更复杂的角色化排序或个性化配置，按新批次重开 | 无 | 是 | 若后续又把运行验证、版本解释或跨域大段说明塞回首页，工作台会再次膨胀成混合页面 |
| `JOB-030` | `Release-v1.0` | `v1.0` R7 真实环境验证与发布准备 | `blocked` | `P0` | 待定测试/运维负责人 | `2026-04-08` | 为正式 `v1.0` 发布准备 go / no-go 证据，并吸收真实部署和真实并发验证工作 | 等待 `JOB-006` 与 `JOB-009` 的外部条件就绪后，按 `docs/83` 进入真实部署、真实并发和发布前证据收口 | `JOB-006` 真实目标集群条件、`JOB-009` 真实宿主机压测条件 | 否 | 若没有真实部署和真实吞吐证据，`v1.0` 不应正式发布 |
| `JOB-031` | `Release-v1.0` | `v1.0` 控制台导航、标题与中文化最终收口 | `done` | `P1` | Codex | `2026-04-09` | 把当前 `/console` 中仍保留的旧导航命名、旧页面标题、旧 breadcrumb、英文品牌和过渡态文案统一收口到 `v1.0` 最终口径 | 已完成；下一步进入 `JOB-032`，继续收口页面职责与二级工作页 | 当前 `/console` 过渡态代码、`docs/20`、`docs/21`、`docs/70`、`docs/72`、`docs/113` | 否 | 如果不把导航、标题和中文化统一收口，`/console` 会持续呈现“逻辑已重构、观感仍是过渡态”的割裂感，影响 `v1.0` 成品判断 |
| `JOB-032` | `Release-v1.0` | `v1.0` 控制台页面职责与二级工作页最终收口 | `done` | `P1` | Codex | `2026-04-09` | 把仍处于“可复用但需重构”的 `/console/reviews`、`/console/releases`、`/console/help`、`/console/system` 收口到更接近 `v1.0` 成品的职责边界 | 已完成；下一步进入 `JOB-033`，继续收口页面内帮助入口与引导 | 当前页面骨架、`docs/21` 线框说明、`docs/71` 页面映射表、`docs/72` 重构原则 | 否 | 如果这些页面继续保持泛入口和过度堆叠职责，即使后端逻辑正确，`/console` 观感仍然不会达到 `v1.0` 完工态 |
| `JOB-033` | `Release-v1.0` | `v1.0` 控制台帮助入口与页面内引导最终收口 | `done` | `P1` | Codex | `2026-04-09` | 把当前 `/console` 中“帮助文档很多但页面内帮助与下一步引导仍不够成品化”的部分收口完成 | 已完成；下一步转入 `JOB-090` 总复核和真实环境阶段，或在需要时开始 `JOB-100` 的发布包装清理 | 帮助配置 `console_help.json`、帮助文档目录、现有页面内入口位置 | 否 | 如果帮助入口、页面内说明和帮助内容继续分裂，`v1.0` 即使功能能用，仍然不具备可运营、可交接的成品体验 |
| `JOB-034` | `Release-v1.0` | `v1.0` 词条审核批量审核能力补齐 | `done` | `P1` | Codex | `2026-04-13` | 已完成 `term_review` 批量审核能力补齐，CSV 导入后的词条审核任务现在可以按当前页勾选或按导入批次上下文集中处理 | 已完成；后续若要扩展到拼音审核、发布审核或更复杂的跨页批量能力，按新批次重开，不复用 `JOB-034` | 无 | 是 | 若后续把“按当前筛选结果全部审核”重新放开，仍会重新引入宽筛选误审全站任务的风险；若扩到其他审核类型而不重新做范围隔离，也会把语义重新搞混 |
| `JOB-035` | `Release-v1.0` | `v1.0` 词典建设域与验证回流域重构 | `done` | `P0` | Codex | `2026-04-13` | 已完成词典建设域与验证回流域首轮重构：页面、接口、配置模型、审核快照和帮助口径已切到 `dictionary/*` / `validation/*` 新语义 | 已完成；后续若继续扩到验证导入独立页、引用配置项禁删门禁或更细粒度回流视图，按新批次重开，不复用 `JOB-035` | 当前 `terms / import jobs / review tasks / business properties / validation cases` 代码基线，以及 `JOB-034` 已落地的批量审核能力 | 是 | 若把词典建设与验证回流继续混在一个域内，或继续保留手工创建与 CSV 导入两套审核口径，后续页面、接口、帮助和状态语义仍会持续打架 |
| `JOB-036` | `Split-Architecture` | `admin_http_signed` runtime 快照下发模式落地 | `done` | `P1` | Codex | `2026-04-15` | 已完成 `admin_http_signed` 快照下发模式、admin 下载路由、按节点动态签名 URL 和相关回归；当前可直接由 `JOB-090` 继续做更大范围测试 | 已完成；后续若要继续扩到 LB/Ingress 源站、下载审计留痕或更复杂的节点绑定策略，按新批次重开，不复用 `JOB-036` | `JOB-021` 多 runtime 节点备案基线、现有 runtime control / artifact metadata / runtime 安装链路 | 是 | 若继续把“制品存储方式”和“运行节点下发方式”混成一个配置维度，后续 `file / admin_http_signed / minio` 会持续互相污染；若直接暴露固定 admin 文件 URL 而不做签名、过期和节点绑定，会把 runtime 制品下载面变成长期裸露入口；若把该批次和 MinIO 重构、LB/Ingress 灰度、节点级版本 override 一起硬做，范围会明显失控 |
| `JOB-037` | `Release-v1.0` | 左侧目录树表现优化 | `done` | `P1` | Codex | `2026-04-15` | 已完成左侧目录树优化并确认可封板：导航数据源抽离、目录名称同步、层级视觉增强、收起态图标化、hover 提示和背景色收口 | 已封板；后续若继续扩到更细粒度图标体系、拖拽排序或完整导航配置平台化，按新批次重开，不复用 `JOB-037` | 当前 `/console` 壳层、导航文案现状、帮助目录与 breadcrumb 现行口径 | 是 | 若继续只做零碎样式 patch，而不把左侧目录树的层级、交互和配置化一起收口，后续新增页面时会再次出现层级弱、当前页难定位、收起态不可用和名称不一致的问题；若本批顺手扩大到整站壳层重构或全量页面改版，范围会失控 |
| `JOB-098` | `Release-v1.0` | 测试/验证工作区历史副产物清理 | `done` | `P1` | Codex | `2026-04-21` | 已完成 `prototype/workspace-*` 历史测试/验证工作区清理，回收约 `63G` 空间，且未触碰主工作区与 runtime 实例工作区。 | 已完成；后续若测试再次产生大规模 `workspace-*` 副产物，按同口径重复执行，不需要重开更大范围清库任务。 | 无 | 是 | 如果把 `prototype/workspace-*`、`prototype/workspace` 和 `prototype/runtime_instances/*/workspace` 混为一谈，容易在清理磁盘时误删主系统数据或 runtime 实例数据。 |
| `JOB-099` | `Release-v1.0` | 零数据底座初始化与系统清库 | `done` | `P1` | Codex | `2026-04-21` | 已把零数据底座收口为三步流程：历史测试工作区清理、runtime 实例工作区清理、主工作区零数据化；其中第一步可独立由 `JOB-098` 执行。备份口径已明确为执行前必须留存 1 份主库备份、1 份 `seed_terms.json` 备份和 1 份 `release_validation_cases.json` 备份。 | 已完成；后续若需要再次执行零数据化，可先复用 `JOB-098` 完成第一步，再按 `docs/137` 执行第二步和第三步。若当前系统已重新产生词条、版本或实例运行态，应把 `JOB-099` 作为重置 runbook 重新执行。 | 当前 workspace、`JOB-098` 清理结果（可选）、自动种子回灌逻辑、运行态目录与 service 状态 | 是 | 如果把三步流程混成一次粗暴删目录，容易误删主工作区或实例工作区；如果只做第一步而不同时置空 `seed_terms.json` 和 `release_validation_cases.json`，系统仍不是真正的零数据底座；如果在清库前不保留主库和两个自动回灌源的备份，会失去回滚到清库前状态的入口。 |
| `JOB-100` | `Release-v1.0` | `v1.0` 最终发布包组成与发布包装清理 | `done` | `P1` | Codex | `2026-04-21` | 已完成最终发布包边界收紧、交付模板目录、release bundle 生成脚本和三条正式镜像构建验证，并补充真实环境最小交付建议：只交付 admin/runtime 镜像与 release bundle，默认 `1 admin + N runtime + admin_http_signed`。 | 已完成；后续若发布包边界、镜像内容或交付模板发生变化，按新批次重开，不复用 `JOB-100` | `JOB-030` 发布准备基线、当前 Docker 打包方式、帮助与发布文档目录 | 是 | 如果不在正式发布前把打包边界和交付物边界收紧，过程文档、handoff 文档、测试脚本和无关资产可能继续进入正式镜像，导致交付边界不清 |
| `JOB-090` | `Release-v1.0` | `v1.0` 测试体系建设与流水线验证准备 | `in_progress` | `P0` | Codex / 待定测试与运维协作人 | `2026-04-21` | 已完成一轮新的本地完整回归：`test:unit`、`check:api-contracts`、`smoke:console`、`test:console`、`check:v1-local-readiness` 已通过；当前本地阶段已无阻塞，下一步等待外部条件进入 `L4 ~ L6`。 | 若真实部署与压测资源就绪，则按 `docs/105`~`docs/107` 进入 `L4 ~ L6`；否则保持当前本地 readiness 全绿基线，等待外部条件 | 本地执行无额外依赖；进入 `L4 ~ L6` 时仍依赖外部资源与工具获取授权、真实部署与压测环境 | 否 | 若继续只在修功能后被动跑零散回归，`v1.0` 风险会在真实发布前集中暴露，且无法形成稳定的测试证据链 |
| `JOB-101` | `Governance` | `v1.0` 正式文档工作区与单一真源绑定 | `done` | `P1` | Codex | `2026-04-17` | 已建立封闭边界的正式文档工作区，并完成与单一真源、JOBLIST、CHECKLIST 和 pm:sync / pm:check 的首轮绑定。 | 后续若要继续自动化扩展到更多工作区或版本快照治理，按新批次重开，不复用当前关单。 | 无 | 是 | 若后续不继续沿本工作区和真源规则新增文档，仍可能重新长出目录外散落文档。 |
| `JOB-102` | `Governance` | `v1.0` docs 历史文档首批归档收边 | `done` | `P1` | Codex | `2026-04-17` | 已完成 `docs/` 根目录历史文档两批归档分层：保留现行与在用文档，把已被当前正式文档工作区覆盖的旧基线、旧设计、已关单阶段文档迁入 `docs/archive/`。 | 后续若还有第三批特殊归档需求，只按新增依赖盘点结果新开 job，不再重用当前关单。 | 无 | 是 | 若后续不继续遵守“现行 / 在用 / 历史归档”三层规则，`docs/` 根目录仍可能重新堆积旧文档。 |
| `JOB-103` | `Governance` | `v1.0` 正式文档工作区详细设计化与 Codex 开发依据补齐 | `done` | `P0` | Codex | `2026-04-18` | 已完成详细设计层、数据字典层、接口规范层、页面设计层和 Codex 开发依据层的首版补齐。 | 后续若要继续加深字段级案例、页面交互细节或开发矩阵颗粒度，按新批次重开，不复用当前关单。 | 无 | 是 | 若后续只改代码而不继续同步这些详细设计文档，工作区仍可能重新失去开发依据价值。 |
| `JOB-104` | `Release-v1.0` | `v1.0` 发布流水线自动化与交付产物标准化 | `pending` | `P1` | Codex | `2026-04-21` | 把 `JOB-100` 已收口的发布包边界推进到可自动执行的流水线：镜像构建/推送、release bundle 生成、元数据落盘和交付物命名规则标准化。 | 先冻结自动化边界、输入输出、环境变量与收尾标准，再实现脚本和模板扩展。 | 镜像仓库地址、镜像推送凭据、发布版本号策略、releaseId 规则、可选的制品签名/扫描工具。 | 否 | 如果直接在 `JOB-100` 里继续堆功能，容易把“边界收口”和“自动化实现”混成一个批次；如果不先固定输入输出、命名和失败回滚口径，后续发布流水线会反复返工。 |
| `JOB-105` | `Release-v1.0` | `v1.0` 批量导入按行阻断与可通过记录导入 | `done` | `P1` | Codex | `2026-04-21` | 已完成批量导入“按行阻断、可通过记录继续导入”主路径：阻断行跳过、结果汇总扩展、详情页按钮/下拉/卡片改造、错误报表字段增强和页面中文化，并完成本地回归。 | 已完成；后续若要继续扩到更细粒度导入状态、批次级重试、自动纠正建议或阻断原因智能分组，按新批次重开，不复用 `JOB-105`。 | 现有 import-jobs 预览模型、导入详情页、审核任务生成逻辑、导入结果汇总结构。 | 是 | 如果直接把所有 block 降成 warning，会把坏数据放进主库；如果继续保留整批阻断，批量导入在真实场景下操作成本过高；如果不先统一页面、接口和结果汇总口径，后续实现会出现状态含义不一致。 |
| `JOB-106` | `Release-v1.0` | `v1.0` 词典准入与 runtime 输出统一方案 | `pending` | `P0` | Codex | `2026-04-22` | 统一词典治理与 runtime 执行标准：准入层只保留 `blocked / ready`，而 `ready` 再按运行方式分成 `replace / candidate`，并要求系统在录入时直接给处理建议，用户按建议批量处理。 | 已完成实现、本地回归和 JOB-090 本地测试主链；后续若再扩候选分流、存量重评估或更细粒度审核提示，按新批次重开，不复用 JOB-106。 | 当前 term-admission、词典录入页、批量导入页、runtime literal/pinyin 执行链、`correct / correct_cand` 接口合同。 | 是 | 如果继续沿用当前“治理逻辑”和“runtime 真实触发逻辑”两套不完全一致的标准，后续词条录入、批量导入、候选输出和替换输出会持续出现解释不一致；如果不先把系统建议和批量处理口径冻结，页面实现会继续让用户逐条判断，操作成本很高。 |

## 3.1 分组说明

| 分组 | 说明 |
|---|---|
| `Console` | `/console` 收尾、验证和体验改进 |
| `Split-Architecture` | runtime/admin 拆分的代码和进程层能力 |
| `Split-Deployment` | runtime/admin 拆分后的 Docker/K8S 资产与真实集群验证 |
| `External-Integration` | 外部 feed 集成及其维护 |
| `Runtime-Validation` | runtime 并发、吞吐、压力和运行验证 |
| `Architecture` | 中长期架构演进规划 |
| `Release-v1.0` | 面向 v1.0 正式发布的系统级重构主线 |
| `Governance` | 运行时身份、额度、治理策略 |
| `Maintenance` | 遗留问题与长期维护项 |

## 4. Job 详情

### JOB-001 `/console` 运营闭环收尾

- 当前负责人：Codex / 待指定业务验收人
- 最近更新时间：`2026-04-02`
- 外部依赖：业务试用反馈、现有 `/console` 与 RBAC 基线
- 是否可关闭：否
- 目标：
  在不影响 `/admin` 的前提下，把 `/console` 从“现有功能可试用”继续收口为“待办驱动、发布可确认、异常可消项”的运营控制台。
- 已完成：
  - `/console` 双轨独立性约束已明确
  - 高风险动作二次确认已补齐
  - 重复提交保护已补齐
  - 状态不允许时的按钮禁用态约束已补齐
  - `test:console`、`smoke:console`、`verify:host:console` 路径已建立
  - 已完成一轮 `/console` 整体能力盘点，确认当前强项是词条/导入/审核/发布/样本/运行节点各域已成页成接口
  - 已确认后续收尾方向不再是继续堆散点页面，而是按 `JOB-001A`~`JOB-001D` 做运营闭环收口
  - 已确认执行规则：
    - 每完成一批，同步更新 `docs/38-项目JobList与状态清单.md`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md`
    - 代码开发遵循开发规范，对所有函数补注释（作用、输入、输出）
    - 配置文件参数需补充作用说明
    - 每批完成后必须自测并汇报
  - `JOB-001A` 已完成：
    - 已新增 `GET /api/console/workbench`
    - 已把首页升级为待办/异常驱动的工作台布局
    - 已引入待审核、待确认导入、阻塞发布、离线节点、apply 异常、无关联样本 6 类聚合事项
    - 已补充首页工作台样式和最小单测/API 测试覆盖
    - 已完成本批自测：
      - `npm run test:unit`
      - `npm run smoke:console`
      - `npm run test:console`
  - `JOB-001B` 已完成：
    - 已新增 `GET /api/console/runtime-control`
    - 已新增 `POST /api/console/runtime-control/desired-version`
    - 已在 release detail 中补齐“下发为目标版本”动作和节点收敛摘要
    - 已在 runtime-nodes 中补齐当前目标版本、configVersion、对齐节点、待收敛节点、失败节点和重新下发动作
    - 已补充 console 侧 rollout 聚合与单测/API 测试覆盖
    - 已完成本批自测：
      - `npm run test:unit`
      - `npm run smoke:console`
      - `npm run test:console`
  - `JOB-001C` 已完成：
    - 已把 release detail 收敛为发布确认页，统一展示：
      - 发布确认状态
      - Gate / validation / rollout / offline 节点异常摘要
      - 回处理入口
      - 匹配到的 runtime control 本地验证证据
    - 已新增 `GET /api/console/runtime-control/evidence/{reportId}`
    - 已让 release detail 直接聚合 `confirmation / rollout / evidence`
    - 已以本地 `host_verification/*runtime_control_verify*/summary.json` 作为第一版证据入口基线
    - 已补充单测/API 测试覆盖
    - 已完成本批自测：
      - `npm run test:unit`
      - `npm run smoke:console`
      - `npm run test:console`
  - `JOB-001D` 首轮已完成：
    - 已把导入详情中的预览统计、错误预览、关联审核任务改为更直接的查询聚合
    - 已把 validation case 详情与 related terms 改为按主键/目标 canonical 直接读取，不再走 `limit 500 + 内存过滤`
    - 已把工作台“待关注样本”中的词条 canonical 读取改为直接 SQL 查询，不再依赖 `listTerms(limit=500)`
    - 已把 `listConsoleReviews()` 改为基于分页查询，不再先取一批任务再内存过滤/切页
    - 已把 `listConsoleValidationCases()` 改为基于分页查询，不再先取固定 500 条再内存切页
    - 已把 `listConsoleRuntimeNodes()` 的请求/峰值聚合收敛到当前页节点，不再对整批筛选结果做页外聚合
    - 已完成本批自测：
      - `npm run test:unit`
      - `npm run test:console`
- 后续要做：
  - 进入 `JOB-001D`，收尾查询性能和剩余体验问题
  - 在上述闭环批次之外，继续完成宿主人工试用记录与截图归档
- 依赖 / 风险：
  - 仍依赖人工试用反馈
  - 需要与 `JOB-002B` 的真实控制面模式验证并行推进，避免完全偏离控制面主线
  - 某些问题属于信息架构问题，不能只靠补按钮或后端报错兜底
- 完成标准：
  - `/console` 首页可作为角色化工作台使用
  - 发布中心、运行节点中心和发布确认链路形成可执行闭环
  - 异常发现、定位、处理和消项具备最小闭环
  - 宿主自动化验证通过，且人工浏览器验证完成并留档
- 关键文档：
  - [31-console现有功能收尾与独立性约束](./archive/2026-04-17-v1早期基线与已替代设计文档/31-console现有功能收尾与独立性约束.md)
  - [34-console收尾待办清单](./archive/2026-04-17-v1早期基线与已替代设计文档/34-console收尾待办清单.md)

子任务 checklist：

- [x] 明确 `/admin` 与 `/console` 双轨独立约束
- [x] 补齐高风险动作二次确认
- [x] 补齐重复提交保护
- [x] 补齐状态不允许时的按钮禁用态约束
- [x] 完成 `/console` 整体能力盘点与闭环优化方案确认
- [x] 确认按 `JOB-001A`~`JOB-001D` 四批推进
- [x] 完成 `JOB-001A` 总览工作台化
- [x] 完成 `JOB-001B` 发布到运行节点控制闭环
- [x] 完成 `JOB-001C` 发布确认与异常收口
- [ ] 完成人工浏览器试用记录
- [ ] 完成截图归档
- [x] 完成 `JOB-001D` 聚合查询与体验收尾
- [x] 复核 `/console` 待办清单并清理已完成项

### JOB-001A `/console` 总览工作台化

- 当前负责人：Codex
- 最近更新时间：`2026-04-02`
- 外部依赖：现有 `/console` 总览、RBAC 页面功能矩阵
- 是否可关闭：是
- 目标：
  把 `/console` 首页从“摘要页”升级为“待办/异常驱动工作台”，让不同角色登录后能直接看到当前应处理事项。
- 已完成：
  - 已确认首页现状主要是指标卡、版本摘要、快速入口和词典规模信息
  - 已确认工作台第一批只做最小闭环，不先做复杂图表和大规模视觉重构
  - 已确认优先聚合事项：
    - 待处理审核
    - 待确认导入批次
    - gate 阻塞版本
    - 离线 runtime 节点
    - 最近 apply 失败/回滚节点
    - 需要关注的验证样本或回流问题
  - 已新增 `prototype/src/lib/console-service.js` 中的 `getConsoleWorkbench()` 聚合
  - 已新增 `GET /api/console/workbench`
  - 已把 `/console` 首页升级为工作台布局，增加：
    - 当前优先事项摘要
    - 待办工作台
    - 运行与异常
    - 待审核 / 待确认导入 / 阻塞发布 / 离线节点 / 应用异常节点 / 待关注样本 分组区块
  - 已保证首页区块与现有 RBAC 页面访问能力兼容，不暴露无权限页面入口
  - 已补充 `console-read.test.js` 与 `console-api.test.js`
  - 已完成本批自测：
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run test:console`
- 后续要做：
  - 若后续工作台事项继续扩展，在 `JOB-001D` 中控制信息密度和查询成本
- 依赖 / 风险：
  - 如果聚合过重，首页可能先变慢
  - 如果待办定义不清，首页容易退化成信息堆砌
- 完成标准：
  - 首页具备角色化工作台能力
  - 待办事项可直接跳转到可执行页面
  - `test:console` / `smoke:console` / `test:unit` 保持通过
- 关键文档：
  - [40-控制面数据面实施分解与开发前自审](./archive/2026-04-17-v1早期基线与已替代设计文档/40-控制面数据面实施分解与开发前自审.md)

子任务 checklist：

- [x] 设计 `workbench` 聚合接口结构
- [x] 设计首页待办/异常区块
- [x] 设计角色化默认入口
- [x] 接入 RBAC 页面功能控制
- [x] 补齐最小测试并完成自测

### JOB-001B `/console` 发布到运行节点控制闭环

- 当前负责人：Codex
- 最近更新时间：`2026-04-02`
- 外部依赖：`JOB-002C`~`JOB-002G` 已落地基线
- 是否可关闭：是
- 目标：
  让发布中心与运行节点中心形成“目标版本下发 -> 节点收敛可见”的控制闭环。
- 已完成：
  - 已确认当前 `/console/runtime-nodes` 主要是观测视图，还没有真正的控制动作闭环
  - 已确认第一批控制动作只做全局或按环境下发，不先做单节点强制动作
  - 已确认需复用现有 `runtime_control_state`、`desiredVersion`、`configVersion` 口径
  - 已新增 console 侧 rollout 读写接口：
    - `GET /api/console/runtime-control`
    - `POST /api/console/runtime-control/desired-version`
  - 已新增 `getConsoleRuntimeRollout()`，用于聚合：
    - 当前 control state
    - 目标 release
    - 节点总数 / 已对齐 / 待收敛 / 失败 / 未切到目标版本
    - 节点级收敛列表
  - 已在 release detail 中补齐：
    - 当前版本是否已下发为目标版本
    - “下发为目标版本”动作
    - 节点收敛摘要
    - 运行节点跳转入口
  - 已在 runtime-nodes 中补齐：
    - 当前目标版本摘要
    - configVersion / issuedAt
    - 已对齐 / 待收敛 / 失败 / 未切到目标版本
    - “重新下发当前目标版本”动作
  - 已为 console 动作补齐 `releases.rollout` feature
  - 已补充 `console-read.test.js` 与 `console-api.test.js`
  - 已完成本批自测：
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run test:console`
- 后续要做：
  - 如需按环境或更细粒度下发，可在后续基于当前全局 control state 继续扩展
- 依赖 / 风险：
  - 如果另起控制状态模型，容易与现有 admin control state 分叉
  - 需要严格保证不影响现有 `/admin` 与 runtime 控制链路
- 完成标准：
  - 可在 `/console` 内完成最小版本下发
  - 可在 `/console` 内看到节点收敛状态
  - `test:console` / `smoke:console` / `test:unit` / 控制面验证回归通过
- 关键文档：
  - [39-控制面数据面架构与RBAC重构方案](./archive/2026-04-17-v1早期基线与已替代设计文档/39-控制面数据面架构与RBAC重构方案.md)

子任务 checklist：

- [x] 设计 console runtime control 接口
- [x] 设计 release detail 的版本下发入口
- [x] 设计 runtime-nodes 收敛摘要
- [x] 补齐动作级 RBAC feature
- [x] 补齐最小测试并完成自测

### JOB-001C `/console` 发布确认与异常收口

- 当前负责人：Codex
- 最近更新时间：`2026-04-02`
- 外部依赖：`JOB-001B`、release gate/validation/runtime stats
- 是否可关闭：是
- 目标：
  把发布后验证、节点 apply 结果、样本验证和证据入口收敛到 release 详情，形成发布确认闭环。
- 已完成：
  - 已确认当前发布后确认信息分散在 release、runtime-nodes、验证样本等多个页面
  - 已确认第一版先做 release detail 内的发布确认区块，不单独新建复杂页面
  - 已确认第一版证据口径可先接 summary 报告与结果摘要
  - 已新增本地 runtime control 报告聚合：
    - `listRuntimeControlVerificationReports()`
    - `getRuntimeControlVerificationReport()`
    - `listRuntimeControlEvidenceForRelease()`
  - 已新增 `buildReleaseConfirmation()`，统一收敛：
    - 是否已下发为目标版本
    - Gate 阻塞
    - 验证失败
    - 节点待收敛 / 失败 / 离线
    - 异常项列表与回处理入口
  - 已让 `getConsoleReleaseDetail()` 直接返回：
    - `rollout`
    - `confirmation`
    - `evidence.runtimeControlReports`
  - 已新增 `GET /api/console/runtime-control/evidence/{reportId}`
  - 已把 release detail 升级为发布确认页，增加：
    - 发布确认摘要
    - 异常项表格
    - 本地 runtime control 验证证据表格
    - 报告 JSON 查看入口
  - 已补充 `console-api.test.js` 对 release confirmation / evidence endpoint 的覆盖
  - 已完成本批自测：
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run test:console`
- 后续要做：
  - 如后续需要更强证据治理，可把本地报告入口扩展为更正式的证据归档模型
- 依赖 / 风险：
  - 若证据和确认口径不统一，页面会退化成信息罗列
- 完成标准：
  - 发布员可在一个详情页判断“是否真的发布完成”
  - 异常节点、验证失败和阻塞项可直接回到处理入口
  - 自测与回归通过
- 关键文档：
  - [40-控制面数据面实施分解与开发前自审](./archive/2026-04-17-v1早期基线与已替代设计文档/40-控制面数据面实施分解与开发前自审.md)

子任务 checklist：

- [x] 设计发布确认摘要模型
- [x] 聚合节点收敛与 apply 结果
- [x] 聚合验证与证据入口
- [x] 增加异常高亮和跳转入口
- [x] 补齐最小测试并完成自测

### JOB-001D `/console` 聚合查询与体验收尾

- 当前负责人：Codex
- 最近更新时间：`2026-04-03`
- 外部依赖：`JOB-001A`~`JOB-001C` 完成后的真实使用反馈
- 是否可关闭：是
- 目标：
  对工作台、发布确认和异常收口相关页面的聚合查询和交互体验做最后一轮性能与可用性收尾。
- 已完成：
  - 已确认当前若干聚合仍存在 `limit + 内存过滤` 的原型实现
  - 已确认收尾优先级低于工作台与控制闭环本身
  - 已完成首轮查询优化：
    - `getConsoleImportJobDetail()` 不再依赖 `listImportJobRows(limit=1000)` + 多次数组过滤来生成预览摘要
    - `getConsoleImportJobDetail()` 改为直接查询错误预览和关联审核任务
    - `getConsoleValidationCaseDetail()` 改为按 `case_id` 直接读取
    - `listRelatedTermsForValidationCase()` 改为按 `canonical_text IN (...)` 直接读取
    - `buildWorkbenchValidationSection()` 改为直接查询全部词条 canonical 集合
    - `listConsoleReviews()` 改为直接使用 `listReviewTasksPaged()`
    - `listConsoleValidationCases()` 改为直接使用 `listValidationCasesPaged()`
    - `listConsoleRuntimeNodes()` 改为只对当前页节点计算请求/峰值聚合
    - `listConsoleReleases()` 改为直接使用 `listReleasesPaged()`
    - `getRuntimeControlVerificationReport()` 改为按 `reportId` 直接读取目标报告文件
    - 已完成一轮演示前体验修整：
      - runtime 页面自动刷新默认关闭，改为手动刷新 + 可选自动刷新
      - runtime 页自动刷新不再强制用户持续整页抖动
      - `/api/admin/me` 身份信息改为按 `operator/role` 缓存，减少每次进页面的重复请求
      - runtime 异常增加统一分类与恢复建议，`artifact download failed: 404` 不再裸露为单纯技术错误
      - 多数据区块开始统一采用“卡片内滚动”方案，优先覆盖：
        - 工作台事项
        - runtime 节点列表/详情统计
        - release 确认页中的异常、收敛、证据、变更词条
        - 样本详情中的关联词条
  - 已完成本轮自测：
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run test:console`
  - 已完成第二轮统一后台治理收口：
    - `listRuntimeNodes()` 已支持 SQL 级 `status/env` 过滤、`COUNT(*)` 和 `LIMIT/OFFSET`
    - `listConsoleRuntimeNodes()` 不再走“取 500 条再内存分页”，改为真实后端分页
    - runtime 节点 API 已补统一 `issue` 摘要，明确区分：
      - 当前异常
      - 历史异常（已恢复）
      - 当前无异常
    - runtime 节点详情页已按异常生命周期分层展示，不再把历史 `lastError` 直接当作当前线上故障
    - `/console` 路由渲染已补“最近页面结果回显 + 后台刷新”机制，降低再次进入重页面时的首屏空白等待
    - 卡片内滚动已补统一收边视觉，避免多数据区块继续无限铺开
  - 已完成内部试用说明与 RBAC 口径对齐：
    - `/console/help/trial` 已明确当前用户、角色、权限、页面功能四层关系
    - 已明确内置试用用户与各自可切换角色范围
    - 已明确当前限制条件，包括：
      - 试用态身份模拟不等于正式登录体系
      - 未内置新操作人只作为单角色模拟身份
      - 发布审核职责分离限制
      - 高风险动作仍受权限与二次确认共同限制
    - `docs/26-console内部试用说明.md` 已同步更新
  - 已收口顶部身份区交互：
    - “当前用户”已从可编辑输入框改为只可选择的下拉框
    - 用户下拉框始终保留默认值，不再允许落到空值或自由输入
    - “当前角色”会按所选用户的已分配角色即时联动更新
    - 单角色用户会自动锁定角色选择，避免产生无效切换
    - 页面刷新后会恢复上次选择的用户与角色
  - 已补首页“输入与纠错演示”区：
    - `/console` 总览页可直接输入文本执行试跑
    - 已展示 stable/canary 当前版本、纠错输出、命中替换项、候选项和命中路由
    - 演示区已接入现有 RBAC feature 模型，不走旁路权限
    - 演示区失败结果会在页面内回显，不需要跳到 `/admin`
    - 已修复 `npm run start:admin` 下首页“页面加载失败”问题：
      - 原因是总览页误直接访问 runtime 面 `/api/runtime/*`
      - 现已改为通过 console/admin 侧镜像入口 `/api/console/runtime-demo/*`
      - 保持 `/api/runtime/*` 在 admin-only 模式下仍不可直接访问
  - 已修复制品下载鉴权失败的一类真实根因：
    - 根因不是笼统的 MinIO 凭据缺失，而是 runtime control 持久化了带 15 分钟时效的预签名下载 URL
    - 当 runtime 延迟较久再同步时，旧 URL 已过期，MinIO 返回 `403 Forbidden`
    - 现已改为：runtime 每次读取 control 视图时，按当前 release 文件重新生成新的下载 URL
    - 保持：
      - `artifact_store.config.json` 仍是唯一配置来源
      - 不把 MinIO 凭据硬编码进代码
      - 不改成永久公开对象 URL
  - 已继续收尾 runtime 相关重聚合：
    - `buildWorkbenchFailedApplySection()` 改为直接按 `last_apply_status IN ('failed','rolled_back')` 查询，不再先取节点列表再内存过滤
    - `getConsoleRuntimeRollout()` 改为直接使用 runtime SQL 汇总收敛摘要，不再依赖 `listRuntimeNodes(limit=500)` 全量扫描
    - rollout 关注节点改为按目标版本优先级直接查询前 10 条，不再先全量取回再排序裁剪
  - 已继续收口 release confirmation / rollout 关注节点读取：
    - `getConsoleRuntimeRollout()` 不再复用旧的目标版本节点列表再做 JS 二次排序
    - rollout attention 节点已改为后台一次性输出稳定顺序：
      - 未下发节点
      - 已下发但 apply 失败节点
      - 已下发待收敛节点
      - 已对齐但离线节点
      - 已对齐在线节点
    - release detail 与 `/api/console/runtime-control` 现已共用同一条 rollout attention 轻查询路径
    - 已补 `prototype/tests/unit/console-read.test.js` 回归覆盖，固定该顺序与目标版本标记字段
  - 已继续收口 release gate / validation 旁路接口的一致性：
    - `getConsoleReleaseGateDetail()` 已把 release detail 内部使用的门禁/验证格式化逻辑收为共享 helper
    - `/api/console/releases/{releaseId}/gate` 与 `/api/console/releases/{releaseId}/validation` 现已改为返回控制台格式化后的区块对象
    - release detail 与旁路 gate/validation 接口现在使用同一套 blocker / validation 文案和技术详情折叠规则
    - 已补 `prototype/tests/unit/console-api.test.js` 回归，固定 gate/validation 接口的中文化字段输出
  - 已开始统一后台文字层级和中文文案：
    - `app.css` 已补统一字号层级变量，明确页面标题、区块标题、正文、说明、标签、代码等层级
    - 同层级文字大小已开始按统一变量收口
    - 总览、运行节点、版本列表、版本详情、验证证据等高频页的一批英文标签已改为中文
    - 一批高频提示条和动作反馈文案也已改为中文表述
    - 当前原则调整为：
      - 面向用户的显示文案优先中文
      - 保留少量确需暴露的技术值（如 ID、URL、代码字段）为等宽显示
  - 已完成本批重页面标准化与等待优化：
    - `terms / import / reviews / validation` 相关高频展示值已继续中文化，避免直接暴露：
      - `categoryCode`
      - `riskLevel`
      - `importType`
      - `jobType`
      - `row decision`
    - 审核中心依赖后端目标摘要的几类文案也已同步中文化，避免前端已改中文但卡片摘要仍混入英文
    - 导入模板卡片已补模板编码副标题，保留技术定位值但不再让主文案退化成底层枚举
    - 字号层级已继续收口到：
      - 指标值
      - callout 标题
      - review 卡标题
      - review 元信息
      - empty state / code block
    - 几个原本串行读取的重页面已改为并行请求，减少进入页面时的等待：
      - 词条详情
      - 词条关联样本
      - 导入中心首页
      - 导入批次详情
  - 已继续收口工作台摘要与发布确认页中的技术词：
    - 工作台摘要里的审核类型、导入来源、副标题和验证样本来源已继续改为中文化展示
    - 阻塞发布说明已统一改成“发布门禁阻塞”，不再混入 `Gate`
    - 运行异常里 `desiredVersion / artifact metadata` 的直接技术提示已改成中文说明
    - 发布详情页中的：
      - 阻断类型
      - 验证结果类型
      - 验证失败原因
      已统一走中文映射，不再直接展示内部 code
    - 首页、发布详情、样本详情中剩余几处裸 `categoryCode` 已继续收口
  - 已继续收口一批查询侧全量扫描：
    - `termValidationSummaryMap()` 不再读取最多 500 条样本后按 `canonicalText` 内存筛选，改为按标准词集合直接统计关联样本数
    - 工作台“待关注样本”不再：
      - 全量读取词条 canonical 集合
      - 再读取最多 500 条样本做内存判断
      已改为直接查询“未关联到任何现有标准词”的启用样本分页结果
    - `getReleaseGateSummary()` 不再通过：
      - `listReviewTasks(status='pending', targetType='term', limit=500)`
      - `listReviewTasks(status='pending', targetType='pinyin_candidate', limit=500)`
      再做 release 词条集合内存过滤，已改为按目标词条集合直接读取待审核任务
    - `getConsoleOverview()` 的待审核数不再受 `limit=200` 截断，改为使用分页查询的真实总数
  - 已修复 `/console/terms` 的界面交叉问题，并补统一布局规则：
    - 根据截图 `词条中心（界面交叉，数据列表没有按规则统一）_2026-04-02_210326_578.png`，确认问题根因是“宽表主区 + 右侧录入栏”在较窄宽度下仍强行双栏展示
    - 已把词条中心、导入中心、样本中心这类页面统一改为 `layout-priority-main` 规则：
      - 宽屏时主列表优先、右侧操作栏固定较窄宽度
      - 中等宽度下提前切为上下布局
      - 不再等到更窄断点才塌陷，避免表格与侧栏互相挤压交叉
  - 已补 release validation 摘要缓存，降低重复 gate 计算成本：
    - `buildReleaseValidationSummary()` 现在按：
      - release 快照文件状态
      - 启用中的 validation case 数量
      - 启用样本最近更新时间
      生成缓存键
    - 在 release、样本未变化时，工作台 / 版本列表 / dashboard / gate 接口复用同一份 validation 摘要，避免重复加载 snapshot 与重复跑业务样本校验
    - 保持：
      - 结果语义不变
      - release gate 详情仍返回完整 validation 结果
      - validation case 或 release snapshot 变化时会自动失效重算
  - 已完成本轮回归：
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run test:console`
  - 已继续收口 blocked release gate 的扫描成本：
    - `platform-db` 已补 release gate 批量数据库摘要读取：
      - `listReleaseDatabaseGateSummariesByIds()`
      - `listReleaseTermsByReleaseIds()`
    - `release-gates` 已补 `buildReleaseGateSummaryMap()`，对当前 release 页/批次复用：
      - 批量数据库 gate 摘要
      - 标准化 validation case 集合
      - 单 release validation 摘要缓存
    - `buildWorkbenchBlockedReleaseSection()` 不再：
      - `listReleases()` 全量取回全部 release
      - 再逐条单独计算 gate
      已改为按 `listReleasesPaged()` 分批扫描并保持精确阻塞总数
    - `listConsoleReleases()` 已改为复用当前页 release 的批量 gate 摘要，不再逐行重复做数据库 gate 扫描
    - release validation 缓存键已补 repo 默认 validation 文件状态，避免“数据库无启用样本、仅改本地配置文件”时旧缓存不失效
    - 已补 supporting indexes，覆盖：
      - `releases(created_at, release_id)`
      - `release_terms(release_id, term_id)`
      - `release_terms(term_id, release_id)`
      - `review_tasks(status, target_type, target_id)`
      - `review_tasks(status, target_type, json_extract(target_snapshot, '$.termId'))`
    - 已补单测，覆盖：
      - release gate 批量摘要
      - workbench blocked release 计数/列表
      - release list gate.blocked 回归
  - 已完成本批串行回归：
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
  - 已继续收口 release list / release detail 的辅助读取成本：
    - `listConsoleReleases()` 已补 release 审批摘要批量聚合，不再逐条调用：
      - `getLatestReviewTaskByTarget()`
      - `getReleaseApprovalPolicy()`
      - `getReleaseReviewSummary()`
    - 当前页 release 列表已复用同一份 `releaseTermsMap` 同时服务：
      - approval 摘要
      - gate 摘要
      避免同页重复读取 release terms
    - `getConsoleReleaseDetail()` 已复用：
      - 已读取的 `release`
      - 已读取的 `releaseTerms`
      - 已读取的 `runtimeControlState`
      不再为 detail 内部的 approval / gate / rollout / termChanges 各自重复读取
    - runtime-control evidence 列表已补目录状态缓存：
      - 目录未变化时复用已解析的报告摘要
      - 新增报告目录后可自动失效并重新收集
      - 已补回归验证“新增第二个报告后 release detail 可见”
  - 已继续收口 reviews 页面辅助扫描：
    - `listConsoleReviews()` 不再对当前页每条审核任务单独调用 `getTerm()` / `getRelease()` 生成目标摘要
    - 已补 reviews 页级目标摘要批量聚合，统一按当前页批量读取：
      - term 实时基础信息
      - release 实时基础信息
    - `getConsoleReviewDetail()` 继续复用同一套摘要构造逻辑，保持单条详情与列表口径一致
    - 已补回归验证：
      - reviews 列表中的 term review `targetSummary.title`
      - release publish review 在版本列表审批通过后的 approval 状态
  - 已确认截图目录位于 `/test/ACDP/`，并补了一轮 shared release helper-scan 收口：
    - `/api/admin/dashboard` 不再：
      - `listReleases()` 两次全量读取
      - 再逐条执行 gate 判定
      已改为分页读取 release 并按批量 gate 摘要统计 `releaseCount / gateBlockedReleaseCount`
    - `/api/admin/releases` 不再依赖“全量 release + 逐条 gate/approval 计算”的旧路径，已改为分页读取并按页复用：
      - console release summary
      - release gate batch map
    - `/test/ACDP/` 当前已确认可直接读取，后续截图驱动修复可按该目录继续推进
  - 已按 `版本发布报错.png` 收口一轮前端错误文案：
    - console 客户端已补统一错误解析与中文映射入口
    - 当前对以下高频错误会优先显示中文说明，而不再直接裸露内部 code/英文句子：
      - `release_review_submitter_conflict`
      - `release_review_duplicate_reviewer`
      - `release_review_required`
      - `release_gate_blocked`
      - `release_separation_required`
      - `release_status_invalid`
      - `runtime_not_ready`
      - `template_not_found`
      - `import_job_status_invalid`
      - `validation_case_exists`
      - `invalid_validation_case`
      - `pinyin_candidate_not_found`
    - 页面加载失败和动作失败提示现在都走同一套错误文案映射
  - 已继续收口 release confirmation 的下一步引导：
    - release 详情页“发布确认”区已补一张优先建议卡片
    - 建议卡片只基于现有 `confirmation.issues` 与确认状态生成，不新增接口或流程
    - 当存在阻断/警告时，会优先提示：
      - 当前最该先处理的异常项
      - 对应的中文说明
      - 直接跳转入口
    - 当当前版本已完成主要确认项时，会明确提示“当前版本已完成主要确认项”，避免用户停留在一组指标里自己猜下一步
  - 已继续收口 overview / runtime-nodes 的信息密度与异常分层：
    - `getConsoleWorkbench()` 已补 `highlights` 摘要：
      - 用现有工作台分组结果直接生成“先处理什么”的三条优先事项
      - 不新增接口流程，只复用已有审核/导入/release/runtime/validation 分组
    - 总览页“当前优先事项”已改为优先处理卡片：
      - 直接给出标题、数量、状态和跳转入口
      - 下方重复工作台分组改为“空分组不再渲染”，降低总览页空白卡片堆叠
    - `listConsoleRuntimeNodes()` 已补 `issueSummary`，并把当前页节点按以下顺序排序：
      - 当前异常
      - 需继续观察
      - 历史异常
      - 正常节点
    - runtime 节点列表页已根据 `issueSummary` 增加统一说明：
      - 明确区分“当前异常”与“历史异常”
      - 历史异常只作为追溯信息弱化展示
    - 顺手修复了一处已存在但未被 smoke 覆盖的 console 前端语法问题：
      - `'runtime control evidence not found'` 错误映射 key 已补引号，`console/client/app.js` 现可通过 `node --check`
  - 已继续收口 release gate 对 validation case 的旧上限：
    - `prototype/src/lib/release-gates.js` 读取启用样本时，已从旧的 `listValidationCases(enabled, limit=500)` 切到 `listAllValidationCasesByFilters(enabled)`
    - release gate / release confirmation / blocked release workbench 后续不再 silently 丢掉第 501 条及之后的启用样本
    - 这次不改接口形状，只修正 gate 输入集，避免规模扩大后 release 校验结果失真
    - 已补回归：
      - `prototype/tests/unit/release-gates.test.js` 新增 510 条样本场景
      - 验证 `businessCaseCount` / `caseCount` 和尾部样本均被完整读取
  - 已继续收口帮助页与 runtime 技术信息暴露：
    - `/api/console/help/{slug}` 现已补 `sourceDocPath`，并新增 `/api/console/help/{slug}/source`
    - 帮助详情页已补“返回帮助中心 / 下载 Markdown 原文”动作，避免再次依赖宿主浏览器直接打开仓库路径
    - runtime 节点详情中的原始错误信息与临时制品下载地址已改为折叠技术详情，主阅读区优先显示业务解释与恢复建议
    - 已补回归：
      - `prototype/tests/unit/console-api.test.js` 现校验 help article `sourceDocPath`
      - `prototype/tests/unit/console-api.test.js` 现校验 `/api/console/help/trial/source` 附件下载
  - 已继续收口 release detail 中确认 / 收敛摘要的规则分散问题：
    - `getConsoleRuntimeRollout()` 现已补统一 `guidance`，把“未下发 / 失败节点 / 待收敛 / 离线节点 / 已完成收敛”的下一步判断收回后端
    - `buildReleaseConfirmation()` 现已补更多确认摘要：
      - `gateBlockerCount`
      - `validationCaseCount`
      - `validationSkippedCount`
      - `totalNodes / desiredNodes / untouchedNodes`
    - release 详情页已改为直接消费这些摘要，不再在前端散落拼接同类判断
    - 同时把 `Gate 未通过` 文案统一为 `发布门禁未通过`
    - 已补回归：
      - `prototype/tests/unit/console-read.test.js` 现校验 rollout `guidance`
      - `prototype/tests/unit/console-read.test.js` 现校验 confirmation 新摘要字段
  - 已继续收口 release detail 中残留的机器值直出：
    - `getConsoleReleaseDetail()` 现已把 gate blocker 与 validation case 预格式化为控制台展示字段
    - release 详情页的“发布门禁结果 / 验证结果”现在优先展示业务说明
    - 原始 `taskId / snapshotPath / error / sampleText / validationMode / channel / action` 等技术值已下沉到折叠技术详情
    - 阻断项与验证项不再依赖前端兜底渲染原始 code 或 JSON
    - 已补回归：
      - `prototype/tests/unit/console-read.test.js` 现校验 pending review blocker 的中文标题与业务说明
  - 已继续收口 workbench blocked release 的辅助扫描：
    - `buildWorkbenchBlockedReleaseSection()` 当前页 release 先只跑数据库门禁汇总
    - 只有数据库门禁未阻断的版本，才继续进入 validation 扫描
    - 这样 workbench 统计 blocked release 时，不再对已被词条状态 / 待审核任务阻断的版本重复跑 validation
    - 已补回归：
      - `prototype/tests/unit/console-read.test.js` 现校验 validation-only blocked release 仍会被计入 blocked release 工作台
  - 已继续收口 workbench 离线节点区块的冗余聚合：
    - `buildWorkbenchOfflineRuntimeSection()` 不再走 `listConsoleRuntimeNodes()` 的列表页级请求量/峰值/issueSummary 聚合
    - 首页工作台现在只按 `status=offline` 直接读取前 5 个离线节点
    - 保持首页所需字段不变，但不再为工作台额外计算运行节点列表页才需要的聚合数据
    - 已补回归：
      - `prototype/tests/unit/console-read.test.js` 现单独校验 offline workbench summary 与节点条目
  - 已继续收口 workbench 待确认导入区块的冗余读取：
    - `buildWorkbenchImportSection()` 不再复用 `listConsoleImportJobs()` 的列表页级结果装配
    - 首页工作台现在直接读取 `preview_ready` 导入批次，并只批量查询预览统计
    - 不再为工作台额外读取 `resultSummary` 或逐条回退 `getImportJobResult()`
    - 已补回归：
      - `prototype/tests/unit/console-read.test.js` 现校验 workbench import summary 与导入条目
  - 已继续收口 workbench 待审核 / 待关注样本区块的页面级包装：
    - `buildWorkbenchReviewSection()` 不再复用 `listConsoleReviews()` 的分页包装
    - 首页工作台现在直接读取 `status=pending` 的前 5 条审核任务，并单独统计总数后复用批量 `targetSummary` 聚合
    - `buildWorkbenchValidationSection()` 不再复用 `listValidationCasesWithoutKnownCanonicals()` 的分页包装
    - 首页工作台现在直接读取未关联启用样本的前 5 条记录，并单独统计总数
    - 已补回归：
      - `prototype/tests/unit/console-read.test.js` 现校验 review / validation workbench summary 总数与 5 条封顶规则
  - 已完成本批串行回归：
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
  - 已确认 `JOB-001D` 关闭口径：
    - workbench 重聚合接口已梳理完成
    - 高风险 `limit + 内存过滤` 路径已完成主收口
    - 异常面板 / 异常中心相关交互已通过统一 issue lifecycle、优先事项卡片、确认建议卡片和技术详情折叠完成首轮收尾
    - 仍有新增问题时，统一转入 `JOB-012` 维护项
  - 已完成关闭前串行回归：
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
    - 最新结果：`23/23` 单测文件通过
- 依赖 / 风险：
  - 若不做这一批，数据量上来后 `/console` 会先暴露性能与阅读压力问题
- 完成标准：
  - 关键工作台与确认页查询性能稳定
  - 高优先级体验问题关闭或明确转移
  - 自测与回归通过
- 关键文档：
  - [30-console宿主反馈问题修复计划](./archive/2026-04-17-v1早期基线与已替代设计文档/30-console宿主反馈问题修复计划.md)

子任务 checklist：

- [x] 梳理工作台相关重聚合接口
- [x] 逐步替换高风险内存过滤路径
- [x] 收尾异常面板/异常中心交互
- [x] 复测关键页面响应和可读性
- [x] 同步更新文档与 handoff

### JOB-002 `/console` 宿主验证与证据留档

- 当前负责人：Codex / 宿主验证执行人
- 最近更新时间：`2026-04-04`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  形成 `/console` 的宿主级验证闭环，自动化结果、人工记录、截图和结论可交接。
- 已完成：
  - `npm run verify:host:console` 已实现
  - 宿主报告目录已可自动生成
  - `/admin` 与 `/console` 双轨独立性已纳入自动检查
  - 至少一轮宿主自动化报告已跑通
  - 已补强 inject fallback 留档：
    - 当前环境无法监听本地端口时，报告会回退到 `inject://prototype`
    - 新报告 `prototype/workspace/host_verification/2026-04-03T16-11-07.176Z_host_console_verify/summary.json` 已成功生成
    - inject 模式下的 HTML/JSON 证据文件后缀已修正为 `.body.html` / `.body.json`
  - 已补齐当前最新报告的人工文档：
    - `notes/manual-checklist.md` 已填写自动化结果和人工待补说明
    - `notes/operator-summary.md` 已填写本轮结论与截图缺口说明
    - `screenshots/README.md` 已明确当前环境为何不能产出真实浏览器截图
  - 已按当前授权接受截图例外：
    - `docs/27-console联调记录模板.md` 已同步本轮联调结论
    - 当前报告中的 HTML/JSON 证据与自动化回归结果作为本轮截图替代证据
- 后续要做：
  - 无强制后续动作
  - 如后续需要演示型材料或更强宿主证据，可在真实宿主机补拍浏览器截图并归档
  - 如有新版本发布，重复执行宿主验证并归档
- 依赖 / 风险：
  - 当前关单基于授权接受 inject 证据替代截图；若未来要求强制保留真实浏览器截图，则需额外补拍
- 完成标准：
  - 自动化报告 `ok=true`
  - 手工记录完整
  - 关键截图已归档
- 关键文档：
  - [32-console宿主机测试执行与记录方案](./archive/2026-04-17-v1早期基线与已替代设计文档/32-console宿主机测试执行与记录方案.md)
  - [27-console联调记录模板](./27-console联调记录模板.md)

子任务 checklist：

- [x] 实现 `npm run verify:host:console`
- [x] 生成宿主验证报告目录
- [x] 将 `/admin` 与 `/console` 双轨独立性纳入自动验证
- [x] 跑通至少一轮宿主自动化验证
- [x] 补齐 `notes/operator-summary.md`
- [x] 补齐手工 checklist
- [x] 补齐关键截图
- [x] 将人工结论同步回联调记录模板

### JOB-002A 控制面/数据面架构与 RBAC 重构方案确认

- 当前负责人：Codex / 你已确认关键节点
- 最近更新时间：`2026-04-01`
- 外部依赖：方案确认
- 是否可关闭：是
- 目标：
  把下一代 `admin` 控制面 / `runtime` 数据面架构，以及 `/console` 的用户-角色-权限-页面功能模型，整理成可落地方案。
- 已完成：
  - 方向已对齐：admin 做控制面，runtime 做 agent / data plane
  - 方向已对齐：admin 下发目标版本，runtime 拉制品并本地应用
  - 方向已对齐：runtime 本地统计，定时回传 admin
  - 方向已对齐：RBAC 需按 用户-角色-权限-页面功能 四层梳理
- 后续要做：
  - 转入实现拆解
- 依赖 / 风险：
  - 若实现阶段偏离已确认方案，仍可能返工
- 完成标准：
  - 关键节点确认完毕
  - 本方案文档可作为实现基线
- 关键文档：
  - [39-控制面数据面架构与RBAC重构方案](./archive/2026-04-17-v1早期基线与已替代设计文档/39-控制面数据面架构与RBAC重构方案.md)

子任务 checklist：

- [x] 明确 admin 做控制面、runtime 做数据面
- [x] 明确 admin 下发目标版本、runtime 主动拉制品
- [x] 明确 runtime 本地统计、定时回传 admin
- [x] 明确 RBAC 需按 用户-角色-权限-页面功能 四层梳理
- [x] 确认制品仓形态
- [x] 确认 runtime 本地状态存储方案
- [x] 确认统计回传周期与粒度
- [x] 确认是否新增 `/console/runtime-nodes` 页面
- [x] 确认 RBAC 重构边界
- [x] 关键节点确认完成

### JOB-002B 第一版 MinIO 制品仓配置与接入设计

- 当前负责人：Codex / 待指定运维支持
- 最近更新时间：`2026-04-02`
- 外部依赖：MinIO 部署条件
- 是否可关闭：否
- 目标：
  将 MinIO 作为第一版制品仓接入控制面/数据面方案，并确保相关配置全部通过配置文件管理。
- 已完成：
  - 已确认第一版制品仓采用 MinIO
  - 已确认第一版部署在现有服务器上
  - 已确认 bucket 使用 `acdp-artifacts`
  - 已确认制品路径结构采用 `releases/<releaseId>/...`
  - 已确认制品仓相关信息不能硬编码到代码中
  - 已建立配置文件：
    - `prototype/config/artifact_store.config.json`
  - 已完成 `artifact_store.config.json` 的代码读取，并接入统一应用配置
  - 已新增 `prototype/src/lib/artifact-store.js`，提供 artifact store 抽象、MinIO client 基础封装和 release artifact key/path 规则
  - 已让 release build 生成基于配置的 artifact plan，包含 provider / bucket / key / URL / checksum / size 元数据
  - 已补充 `syncReleaseArtifactsToStore`，用于在不硬编码 MinIO 信息的前提下，把 release 制品同步到验证用 `file://` store 或远端 MinIO
  - 已新增远端 MinIO 上传/同步基础能力：
    - bucket 自动检查/创建
    - S3-compatible SigV4 签名请求
    - release artifact 远端 PUT 上传
    - runtime 下载用预签名 GET URL
  - 已新增本地 MinIO 管理脚本：
    - `prototype/src/cli/local-minio.js`
    - `npm run local:minio:start`
    - `npm run local:minio:status`
    - `npm run local:minio:stop`
  - 已新增控制面模式配置体检脚本：
    - `prototype/src/cli/check-control-managed-config.js`
    - `npm run check:control-config`
    - `npm run check:control-config -- --require-env-sources`
  - 已让 `artifact_store.config.json` 支持通过配置中的 `*Env` 字段读取环境变量：
    - `endpointEnv`
    - `publicBaseUrlEnv`
    - `bucketEnv`
    - `regionEnv`
    - `rootUserEnv`
    - `rootPasswordEnv`
    - `accessKeyEnv`
    - `secretKeyEnv`
  - 已让 `runtimeControl` 支持通过配置中的 `*Env` 字段读取环境变量：
    - `adminBaseUrlEnv`
    - `nodeIdEnv`
    - `nodeNameEnv`
    - `nodeEnvEnv`
    - `nodeAddressEnv`
  - 已明确“配置文件驱动 + 环境变量注入”的生产口径，并新增说明文档：
    - `docs/41-本地MinIO与制品仓凭据注入说明.md`
  - 已补充 K8S Secret 示例与 deployment env 注入模板：
    - `k8s/artifact-store-secret.example.yaml`
    - `k8s/runtime-deployment.yaml`
    - `k8s/admin-deployment.yaml`
  - 已同步运维/部署文档：
    - `docs/archive/2026-04-17-v1早期基线与已替代设计文档/35-拆分部署资产使用说明.md`
    - `docs/archive/2026-04-17-v1早期基线与已替代设计文档/36-拆分部署首轮验证执行清单.md`
    - `docs/37-runtime-admin服务运维手册.md`
  - 已在本机用 docker 拉起本地 MinIO，并按配置生成本地开发凭据回写到 `artifact_store.config.json`
  - 已新增真实控制面模式验证脚本：
    - `prototype/src/cli/verify-runtime-control.js`
    - `npm run verify:runtime-control`
  - 已完成 `file` 模式真实控制面验证：
    - admin/runtime 真实 HTTP 双进程启动
    - runtime 自动 register / heartbeat
    - runtime 拉取 desiredVersion 并完成本地切换
    - 纠错请求成功返回 `我想咨询祁顺路和工伤认定。`
    - 本地统计自动回传并在 `/console/runtime-nodes/{nodeId}` 可见
    - 报告路径：
      - `prototype/workspace/host_verification/2026-04-02T03-03-22.061Z_runtime_control_verify_file/summary.json`
  - 已完成本机 `configured` 模式真实控制面验证：
    - MinIO 健康检查通过
    - admin 将 release 上传到远端 MinIO bucket
    - runtime 基于预签名 URL 从 MinIO 拉取制品并完成本地切换
    - 纠错请求成功返回 `我想咨询祁顺路和工伤认定。`
    - 本地统计自动回传并在 `/console/runtime-nodes/{nodeId}` 可见
    - 报告路径：
      - `prototype/workspace/host_verification/2026-04-02T03-19-21.032Z_runtime_control_verify_configured/summary.json`
  - 已完成真实宿主 / `*Env` 注入口径二次体检：
    - `ACDP_RUNTIME_TOKEN=real-host-token ... npm run check:control-config -- --require-env-sources`
    - 结果：`ok=true`
    - 结论：
      - `artifactStore` 关键字段全部来自 env
      - `runtimeControl` 关键字段全部来自 env
      - `artifactStore.localCredentialMode.active=false`
      - MinIO 健康检查通过
  - 已完成真实宿主 / `*Env` 注入口径二次 `configured` 模式控制面验证：
    - admin/runtime 真实 HTTP 双进程启动
    - env 注入后的 artifact store / runtimeControl 生效
    - runtime 基于远端 MinIO 预签名 URL 完成本地切换
    - 纠错请求成功返回 `我想咨询祁顺路和工伤认定。`
    - 节点详情显示 `lastApplyStatus=success`
    - 报告路径：
      - `prototype/workspace/host_verification/2026-04-02T06-36-35.369Z_runtime_control_verify_configured/summary.json`
  - 已补充 `prototype/tests/unit/artifact-store.test.js`
  - 已明确本地 docker MinIO 继续保留为默认本地联调基线
  - 已增强 `npm run check:control-config`，可显式标记：
    - 当前是否仍处于本地开发凭据模式
    - 当前本机 endpoint 是否仍使用配置文件回写凭据
  - 已增强 `npm run local:minio:status`，可显式标记：
    - `defaultLocalDevBaseline=true`
    - docker daemon/socket 权限阻塞码
  - 已完成本批自测：
    - `npm run test:unit`
    - `ACDP_RUNTIME_TOKEN=local-wrapup-token npm run check:control-config`
    - `ACDP_RUNTIME_TOKEN=local-wrapup-token npm run check:control-config -- --require-env-sources`（预期在本地 file-source 基线下失败，用于提示尚未切换到 env 注入口径）
    - `npm run local:minio:start`
    - `npm run local:minio:status`
    - `npm run verify:runtime-control -- --artifact-store-mode=file`
    - `npm run verify:runtime-control -- --artifact-store-mode=configured`
- 后续要做：
  - 转入真实目标集群验证与 `JOB-006`
  - 若进入目标集群，继续沿 `*Env` 注入方式下发 Secret
- 依赖 / 风险：
  - 当前真实宿主级二次证据已补齐，但真实目标集群仍未就绪
  - 当前沙箱内还存在一类本机执行阻塞：
    - docker daemon/socket 权限受限，`npm run local:minio:status` 会返回 `docker_socket_permission_denied`
  - 当前集群侧显式阻塞：
    - `kubectl config current-context` 为空，说明目标集群 kube context 尚未提供
- 完成标准：
  - MinIO 相关配置项冻结
  - 实现阶段全部从配置读取，不写死
  - 真实 MinIO 配置模式验证通过
- 关键文档：
  - [39-控制面数据面架构与RBAC重构方案](./archive/2026-04-17-v1早期基线与已替代设计文档/39-控制面数据面架构与RBAC重构方案.md)

子任务 checklist：

- [x] 确认第一版制品仓使用 MinIO
- [x] 确认制品仓信息不能硬编码
- [x] 确认第一版部署在现有服务器上
- [x] 确认 bucket 名称
- [x] 确认 artifact 路径规范
- [x] 建立 `prototype/config/artifact_store.config.json`
- [x] 增加真实控制面模式验证脚本
- [x] 完成本机 `file` 模式真实控制面验证
- [x] 完成远端 MinIO 制品上传 / 同步链路
- [x] 确认 MinIO 实际部署方式
- [x] 确认 admin 上传配置读取方式
- [x] 确认 runtime 拉取配置读取方式
- [x] 完成真实 MinIO 配置模式验证
- [x] 确认第一阶段敏感信息先放配置文件
- [x] 明确后续生产阶段敏感信息注入方式

### JOB-002C runtime 节点注册与心跳能力

- 当前负责人：Codex
- 最近更新时间：`2026-04-01`
- 外部依赖：方案已确认
- 是否可关闭：是
- 目标：
  建立 runtime node registry，以及 runtime 主动 register / heartbeat 的最小控制面能力。
- 已完成：
  - 节点模型和方向已在方案中确认
  - 已新增 `runtime_nodes` 表，收纳 `nodeId/nodeName/env/address/status/lastHeartbeatAt/currentVersion/desiredVersion/lastApplyStatus/runtimeStatsCursor` 等字段
  - 已实现在线/离线状态判定：
    - `lastHeartbeatAt` 在 `nodeOfflineThresholdSeconds` 内为 `online`
    - 超出阈值自动判定为 `offline`
  - 已新增 runtime -> admin 接口：
    - `POST /api/runtime-nodes/register`
    - `POST /api/runtime-nodes/heartbeat`
  - 上述接口已使用 runtime Bearer token 校验，不复用 `/admin` 角色头
  - 已补充 `prototype/tests/unit/runtime-nodes.test.js`
  - 已完成本批自测：
    - `npm run test:unit`
    - `npm run smoke:runtime`
    - `npm run smoke:admin`
- 后续要做：
  - 在 `JOB-002D` 中把 `desiredVersion` 与制品元数据控制状态正式挂到当前节点模型
- 依赖 / 风险：
  - 若节点状态模型不先统一，后续控制面页面和统计会反复调整
- 完成标准：
  - 节点表和最小接口设计完成
  - 节点在线/离线口径明确
- 关键文档：
  - [39-控制面数据面架构与RBAC重构方案](./archive/2026-04-17-v1早期基线与已替代设计文档/39-控制面数据面架构与RBAC重构方案.md)

子任务 checklist：

- [x] 设计 `runtime_nodes` 表结构
- [x] 设计节点状态字段
- [x] 设计 `register` 接口
- [x] 设计 `heartbeat` 接口
- [x] 设计在线/离线判定规则
- [x] 设计节点版本状态字段

### JOB-002D desiredVersion 与制品元数据下发

- 当前负责人：Codex
- 最近更新时间：`2026-04-01`
- 外部依赖：制品仓接入
- 是否可关闭：否
- 目标：
  建立 admin 发布目标版本和 runtime 拉取控制状态的最小闭环。
- 已完成：
  - 方向已确认：admin 下发目标版本，runtime 主动拉制品
  - 已新增 `runtime_control_state` 存储结构，持久化：
    - `releaseId`
    - `desiredVersion`
    - `artifactMetadata`
    - `issuedAt`
    - `configVersion`
  - 已基于现有 release 本地产物和 artifact-store 抽象生成可持久化的 artifact metadata
  - 已新增 admin 控制接口：
    - `GET /api/admin/runtime-control`
    - `POST /api/admin/runtime-control/desired-version`
  - 已新增 runtime 读取控制状态接口：
    - `GET /api/runtime-control/me`
  - 已新增 apply result 上报接口：
    - `POST /api/runtime-nodes/{nodeId}/apply-result`
  - `GET /api/runtime-control/me` 已返回：
    - `desiredVersion`
    - `artifactUrl`
    - `checksum`
    - `issuedAt`
    - `configVersion`
    - `artifactMetadata`
  - 已让控制面设置 desired release 时同步更新现有 `runtime_nodes.desiredVersion`
  - 已让 runtime 在本地应用成功/失败后回传 `apply-result` 并更新节点 `currentVersion/lastApplyAt/lastApplyStatus/lastError`
  - 已补充 `prototype/tests/unit/runtime-control.test.js`
  - 已完成本批自测：
    - `npm run test:unit`
    - `npm run smoke:runtime`
    - `npm run smoke:admin`
- 后续要做：
  - 如后续需要节点级差异化 control，可在当前全局 control 状态上扩展
- 依赖 / 风险：
  - 若版本状态和制品元数据模型不稳，后续 runtime 应用链路会返工
- 完成标准：
  - 版本状态模型明确
  - runtime 拉取控制状态模型明确
- 关键文档：
  - [39-控制面数据面架构与RBAC重构方案](./archive/2026-04-17-v1早期基线与已替代设计文档/39-控制面数据面架构与RBAC重构方案.md)

子任务 checklist：

- [x] 设计 artifact metadata 结构
- [x] 设计 `desiredVersion` 接口
- [x] 设计 `apply-result` 上报结构
- [x] 明确 checksum / configVersion 字段
- [x] 明确版本切换状态机

### JOB-002E runtime 本地制品拉取与原子切换

- 当前负责人：Codex
- 最近更新时间：`2026-04-01`
- 外部依赖：MinIO、desiredVersion
- 是否可关闭：否
- 目标：
  让 runtime 脱离共享 `latest` 目录，改为本地拉取制品并独立运行。
- 已完成：
  - 方向已确认
  - 已新增 runtime 本地制品目录与状态目录：
    - `runtime_artifacts/releases/<releaseId>/...`
    - `runtime_state/current.json`
  - 已实现基于 `artifactMetadata.files[]` 的本地下载器，支持：
    - `file://`
    - `http://`
    - `https://`
  - 已实现 checksum 校验
  - 已实现本地 release 目录安装与 `current.json` 原子切换
  - 已让 runtime 在配置了 control-plane client 时优先加载本地 snapshot，不再依赖共享 `latest`
  - 当无本地 current 且无 `latest` 时，runtime 可先以 `runtime_not_ready` 状态启动，待控制链路同步后切换为可服务
  - 已新增运行时同步入口 `syncRuntimeControl()`，打通：
    - register / heartbeat
    - 读取 `GET /api/runtime-control/me`
    - 下载本地制品
    - 原子切换
    - 上报 apply result
  - 已新增本地部署状态机：
    - `activeRelease`
    - `previousRelease`
    - `lastAttempt`
  - 已实现 rollback 与失败恢复：
    - 安装失败时保留当前 active 版本
    - 安装后验证失败时回滚到 previous 版本
    - apply-result 状态支持 `success / failed / rolled_back`
  - 已补充 `prototype/tests/unit/runtime-control.test.js` 中的“无 latest fallback 启动后本地拉取并切换”覆盖
  - 已补充 `prototype/tests/unit/runtime-control.test.js` 中的 rollback 覆盖
  - 已完成本批自测：
    - `npm run test:unit`
    - `npm run smoke:runtime`
    - `npm run smoke:admin`
- 后续要做：
  - 做更接近真实部署形态的运行验证
- 依赖 / 风险：
  - 这是实现真正独立部署的核心环节
- 完成标准：
  - runtime 可以从本地制品独立启动
  - runtime 不再依赖共享 volume 中的 `latest`
- 关键文档：
  - [39-控制面数据面架构与RBAC重构方案](./archive/2026-04-17-v1早期基线与已替代设计文档/39-控制面数据面架构与RBAC重构方案.md)

子任务 checklist：

- [x] 设计本地制品目录结构
- [x] 设计下载流程
- [x] 设计 checksum 校验
- [x] 设计原子切换流程
- [x] 设计回滚流程
- [x] 设计 currentVersion 持久化

### JOB-002F runtime 本地统计缓冲与定时回传

- 当前负责人：Codex
- 最近更新时间：`2026-04-01`
- 外部依赖：本地 SQLite、admin 接收接口
- 是否可关闭：是
- 目标：
  建立 runtime 本地统计存储与 300s 周期回传 admin 的能力。
- 已完成：
  - 300s 周期已确认
  - 本地 SQLite 已确认
  - 已新增 runtime 本地统计 SQLite：
    - `runtime_stats_events`
    - `runtime_stats_state`
    - `runtime_stats_peak`
  - 已实现 runtime 侧本地记录：
    - correction event
    - peak concurrency
    - flush cursor
  - 已实现批量上传 payload 生成，包含：
    - `batchId`
    - `fromEventId/toEventId`
    - `records[]`
    - `sequence`
  - 已新增 admin 接口：
    - `POST /api/runtime-nodes/{nodeId}/stats/upload`
  - admin 侧已实现按 `nodeId + batchId + sequence` 幂等入库
  - admin 侧已新增节点级聚合表：
    - `runtime_node_hourly_stats`
    - `runtime_node_hourly_terms`
    - `runtime_node_peak_stats`
    - `runtime_node_stat_upload_records`
  - admin 侧上传后会继续汇总到现有全局 dashboard 聚合表
  - runtime 侧已接入定时 flush timer，并暴露 `flushRuntimeStats()` 便于测试/后续运维调用
  - 已补充 `prototype/tests/unit/runtime-stats-sync.test.js`
  - 已完成本批自测：
    - `npm run test:unit`
    - `npm run smoke:runtime`
    - `npm run smoke:admin`
- 后续要做：
  - 如需更多统计维度，可在当前 batch 记录类型上继续扩展
- 依赖 / 风险：
  - 若不上这层，多节点统计仍停留在共享库阶段
- 完成标准：
  - runtime 本地统计模型明确
  - admin 可收到多节点批量回传
  - 重复上报不产生重复统计
- 关键文档：
  - [39-控制面数据面架构与RBAC重构方案](./archive/2026-04-17-v1早期基线与已替代设计文档/39-控制面数据面架构与RBAC重构方案.md)

子任务 checklist：

- [x] 设计本地统计表
- [x] 设计 300s flush 机制
- [x] 设计 max batch size 机制
- [x] 设计 batchId / sequence 幂等模型
- [x] 设计 admin 汇总入库表
- [x] 设计节点级统计查询模型

### JOB-002G `/console/runtime-nodes` 页面与节点管理视图

- 当前负责人：Codex
- 最近更新时间：`2026-04-01`
- 外部依赖：runtime 节点模型、RBAC
- 是否可关闭：是
- 目标：
  在 `/console` 中提供 runtime 节点列表、状态、版本和结果查看。
- 已完成：
  - 已确认新增该页面
  - 已新增 console 侧接口：
    - `GET /api/console/runtime-nodes`
    - `GET /api/console/runtime-nodes/{nodeId}`
  - 已新增 console service 聚合：
    - 节点基础信息
    - 当前版本 / 目标版本
    - apply 结果
    - 近 24h 请求/命中摘要
    - 节点级 hourly 统计
    - 节点级 top 命中词条
    - control state 摘要
  - 已在 `/console` 左侧导航中新增“运行节点中心”
  - 已实现 `/console/runtime-nodes` 列表页
  - 已实现 `/console/runtime-nodes/{nodeId}` 详情页
  - 已完成本批自测：
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run smoke:admin`
    - `npm run smoke:runtime`
- 后续要做：
  - 如后续需要节点控制动作，再与 `JOB-002H` 一起收权限
- 依赖 / 风险：
  - 若控制面无节点视图，运维链路不可观测
- 完成标准：
  - `/console/runtime-nodes` 可查看节点、版本和基本状态
- 关键文档：
  - [39-控制面数据面架构与RBAC重构方案](./archive/2026-04-17-v1早期基线与已替代设计文档/39-控制面数据面架构与RBAC重构方案.md)

子任务 checklist：

- [x] 定义节点列表页字段
- [x] 定义节点详情页字段
- [x] 定义当前版本 / 目标版本展示
- [x] 定义 apply 结果展示
- [x] 定义统计入口
- [x] 定义可执行动作范围

### JOB-002H RBAC 四层重构与页面功能映射

- 当前负责人：Codex
- 最近更新时间：`2026-04-01`
- 外部依赖：方案确认
- 是否可关闭：是
- 目标：
  把 `/console` 权限从“角色散点控制”重构为 用户-角色-权限-页面功能 四层模型。
- 已完成：
  - 已确认一起做四层重构
  - 已新增用户层：
    - `knownUsers`
    - `userId`
    - `assignedRoles`
    - `defaultRole`
  - 已保留并标准化角色层：
    - `dict_viewer`
    - `dict_editor`
    - `dict_reviewer`
    - `dict_publisher`
    - `dict_operator`
    - `dict_admin`
  - 已扩充权限层：
    - `runtime.node.read`
    - `runtime.node.control`
    - `runtime.stats.read`
  - 已新增页面功能矩阵 `PAGE_FEATURE_MATRIX`
  - 已让 `buildAuthContext()` 返回：
    - `userId`
    - `assignedRoles`
    - `permissions`
    - `pageFeatures`
    - `pageAccess`
  - 已让 `/api/admin/me` 返回四层 RBAC 所需元数据
  - 已让 `/console` 顶部身份模型改为“当前用户 + 当前角色”
  - 已让 `/console` 根据 `pageAccess` 做左侧导航可见性收口
  - 已把多组高风险/高频动作显式挂到页面功能矩阵：
    - 审核通过 / 驳回
    - 提交发布审核 / 正式发布 / 回滚
    - 词条详情中的编辑、送审、停用、拼音候选动作
    - 导入确认 / 取消
    - 样本创建 / 导入 / 停用
  - 已为多组关键动作补充约束元数据：
    - `riskLevel`
    - `confirmRequired`
    - `constraintCode`
  - 已让 `/console` 前端 submit handler 按页面功能点做二次拦截，不只依赖按钮渲染
  - 已补充 `prototype/tests/unit/pinyin-auth.test.js`
  - 已完成本批自测：
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run smoke:admin`
    - `npm run smoke:runtime`
- 后续要做：
  - 后续新增页面/动作时继续维护矩阵一致性
- 依赖 / 风险：
  - 若不一起重构，后续新页面和高风险动作仍会混乱
- 完成标准：
  - 用户/角色/权限/页面功能关系清楚
  - 首轮权限矩阵可直接落代码
- 关键文档：
  - [39-控制面数据面架构与RBAC重构方案](./archive/2026-04-17-v1早期基线与已替代设计文档/39-控制面数据面架构与RBAC重构方案.md)

子任务 checklist：

- [x] 定义用户模型
- [x] 定义角色模型
- [x] 定义权限清单
- [x] 定义页面功能矩阵
- [x] 定义高风险操作约束
- [x] 定义 `/console` 顶部身份模型调整方案

### JOB-003 runtime/admin 代码层拆分

- 当前负责人：Codex
- 最近更新时间：`2026-04-01`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  把原单体 `server.js` 的 runtime 路由和 admin/console 路由拆成可独立装配的代码结构。
- 已完成：
  - runtime surface 已抽出
  - admin surface 已抽出
  - `createRuntimeApp()` / `createAdminApp()` 已建立
  - `server-surfaces.test.js` 已覆盖边界
- 后续要做：
  - 无强制后续动作，除非继续演进内部模块边界
- 完成标准：
  - 组合服务行为不变
  - surface 独立边界测试通过
- 关键文档：
  - [33-运行时对外服务与后台服务拆分建议](./archive/2026-04-17-v1早期基线与已替代设计文档/33-运行时对外服务与后台服务拆分建议.md)

子任务 checklist：

- [x] 抽出 runtime surface
- [x] 抽出 admin/console surface
- [x] 建立 `createRuntimeApp()`
- [x] 建立 `createAdminApp()`
- [x] 组合服务回归通过
- [x] surface 边界测试通过

### JOB-004 runtime/admin 进程层拆分

- 当前负责人：Codex
- 最近更新时间：`2026-04-01`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  提供 `acdp-runtime` 和 `acdp-admin` 两个可独立启动、独立守护、独立 smoke 的服务入口。
- 已完成：
  - `runtime-server.js` / `admin-server.js` 已建立
  - `start:runtime` / `start:admin` 已建立
  - `service:start|status|stop:runtime` 已建立
  - `service:start|status|stop:admin` 已建立
  - `smoke:runtime` / `smoke:admin` 已建立
- 后续要做：
  - 仅在真实运维环境继续使用和验证
- 完成标准：
  - 独立进程入口可启动
  - 独立 smoke 通过
- 关键文档：
  - [37-runtime-admin服务运维手册](./37-runtime-admin服务运维手册.md)

子任务 checklist：

- [x] 新增 `runtime-server.js`
- [x] 新增 `admin-server.js`
- [x] 新增 `start:runtime`
- [x] 新增 `start:admin`
- [x] 新增 runtime/admin 独立 service 管理命令
- [x] 新增 `smoke:runtime`
- [x] 新增 `smoke:admin`
- [x] 独立 smoke 测试通过

### JOB-005 runtime/admin 部署资产拆分

- 当前负责人：Codex
- 最近更新时间：`2026-04-01`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  提供 `acdp-runtime` / `acdp-admin` 的独立 Dockerfile 和 K8S 清单。
- 已完成：
  - `Dockerfile.runtime`
  - `Dockerfile.admin`
  - runtime/admin deployment/service 清单
  - runtime initContainer 等待 snapshot 逻辑
- 后续要做：
  - 在真实目标集群复用这套资产完成部署验证
- 完成标准：
  - Docker 级验证通过
  - 本地 `kind` K8S 验证通过
- 关键文档：
  - [35-拆分部署资产使用说明](./archive/2026-04-17-v1早期基线与已替代设计文档/35-拆分部署资产使用说明.md)
  - [36-拆分部署首轮验证执行清单](./archive/2026-04-17-v1早期基线与已替代设计文档/36-拆分部署首轮验证执行清单.md)

子任务 checklist：

- [x] 新增 `Dockerfile.runtime`
- [x] 新增 `Dockerfile.admin`
- [x] 新增 runtime deployment/service 清单
- [x] 新增 admin deployment/service 清单
- [x] 为 runtime 增加等待 snapshot 的 initContainer
- [x] Docker 级 split 验证通过
- [x] 本地 `kind` 集群 split K8S 验证通过

### JOB-006 真实目标 K8S 集群 split 部署验证

- 当前负责人：待指定运维 / Codex 支持
- 最近更新时间：`2026-04-02`
- 外部依赖：真实集群访问、镜像仓库
- 是否可关闭：否
- 目标：
  在真实目标集群完成 split runtime/admin 验证，并收集控制面模式与拆分部署证据。
- 已完成：
  - 已具备 split Dockerfile 与 K8S 清单
  - 已完成本地 `kind` 验证
  - 已新增目标集群前置体检命令：
    - `npm run check:k8s-target`
  - 已在当前主机执行 `npm run check:k8s-target`
  - 当前结果：
    - `kubectl` client 可用
    - blocker=`kube_context_missing`
    - 说明当前主机没有可用 `current-context`
- 后续要做：
  - 提供真实 kubeconfig 或设置可用 `current-context`
  - 之后重跑：
    - `npm run check:k8s-target`
    - `kubectl apply ...`
    - 真实目标集群 split 验证
- 依赖 / 风险：
  - 当前不是代码阻塞，而是目标集群访问条件阻塞
- 完成标准：
  - 真实目标集群 context 就绪
  - split 部署验证通过
  - 证据留档完成
- 关键文档：
  - [36-拆分部署首轮验证执行清单](./archive/2026-04-17-v1早期基线与已替代设计文档/36-拆分部署首轮验证执行清单.md)
  - [37-runtime-admin服务运维手册](./37-runtime-admin服务运维手册.md)

- 当前负责人：待指定运维 / Codex 支持
- 最近更新时间：`2026-04-01`
- 外部依赖：真实集群访问、镜像仓库
- 是否可关闭：否
- 目标：
  在真实目标 K8S 集群中验证 `acdp-runtime` / `acdp-admin` split 部署可实际落地。
- 已完成：
  - Docker 级验证完成
  - 本地 `kind` K8S 验证完成
- 后续要做：
  - 提供真实集群 `kubeconfig` / 可用 context
  - 提供可拉取的镜像仓库地址
  - 在真实集群 apply split 清单
  - 采集 rollout / pod / service / logs / service-level curl 结果
- 依赖 / 风险：
  - 当前缺少真实集群上下文
  - 当前缺少真实镜像仓库流程
  - 未完成这一步时，split 部署仍存在真实环境风险
- 完成标准：
  - 真实目标集群中的 runtime/admin pod 均 Ready
  - service 级访问正确
  - runtime/admin 边界验证通过
  - 部署证据留档
- 关键文档：
  - [37-runtime-admin服务运维手册](./37-runtime-admin服务运维手册.md)

子任务 checklist：

- [x] 完成本地 `kind` 集群验证
- [ ] 提供真实集群 `kubeconfig`
- [ ] 提供可拉取的镜像仓库地址
- [ ] 更新清单中的镜像地址到真实仓库
- [ ] 在真实集群 apply split 清单
- [ ] 采集 rollout / pod / svc / pvc 结果
- [ ] 采集 logs
- [ ] 采集 service 级 curl / port-forward 验证结果
- [ ] 形成真实集群部署证据包

### JOB-007 validation feeds 真实外部系统集成

- 当前负责人：Codex
- 最近更新时间：`2026-04-04`
- 外部依赖：外部系统访问条件
- 是否可关闭：否
- 目标：
  把当前 file-based feed connector 升级为真实 CG3 / QA / online feedback 系统接入。
- 已完成：
  - file-based connector 已完成
  - source-specific adapter 已完成
  - 已新增 connector 配置文件：
    - `prototype/config/validation_feed_connectors.config.json`
  - 已让 validation feed connector 支持配置驱动 source 定义，而不是只靠代码内置 source 列表
  - 已新增首轮真实 connector 骨架：
    - `file_inbox`
    - `http_pull_json`
  - 已新增远端 delivery receipt 机制：
    - `validationFeedReceiptDir/<sourceType>/`
    - 已支持按 `deliveryId / batchId / cursor / requestId / payload hash` 去重
  - 已新增 cursor 增量拉取语义：
    - 通过 `cursorQueryKey + cursorResponseField` 执行远端增量读取
    - 仅在导入成功且 ack 成功，或无需 ack 时推进 cursor
  - 已新增首轮 ack / replay 机制：
    - 成功导入后可选 `http_post` ack
    - ack 失败会保留 `imported_ack_failed` receipt
    - error 目录支持 replay envelope
    - `import-feeds` 已支持 `replayErrors`
  - 已新增首轮外部 connector 契约文档：
    - [45-validation-feed外部connector首轮契约](./archive/2026-04-17-v1早期基线与已替代设计文档/45-validation-feed外部connector首轮契约.md)
  - 已明确首个优先真实接入源：
    - `cg3`
  - 已完成本批代码落点：
    - `prototype/src/lib/validation-feed-importer.js`
    - `prototype/src/cli/import-validation-feeds.js`
    - `prototype/src/http/admin-surface.js`
    - `prototype/src/cli/check-validation-feed-connectors.js`
    - `prototype/src/cli/verify-validation-feeds.js`
  - 已新增 / 扩展单测：
    - `prototype/tests/unit/validation-feed.test.js`
    - `prototype/tests/unit/validation-feed-connectors-check.test.js`
    - `prototype/tests/unit/validation-feed-verify.test.js`
    - 覆盖：
      - `http_pull_json` 导入
      - delivery 去重
      - cursor 增量推进
      - ack 失败后的 replay 恢复
      - 远端 connector 预检通过 / 失败口径
  - 已新增真实联通前预检命令：
    - `cd /Codex/ACDP && npm run check:validation-feeds -- --source-type cg3 --require-remote-configured --require-ack-configured`
  - 已新增本地 mock 验证命令：
    - `cd /Codex/ACDP && npm run verify:validation-feeds`
    - 最新 mock 验证报告：
      - `prototype/workspace/host_verification/2026-04-04T09-34-11.620Z_validation_feed_verify_mock_cg3/summary.json`
- 已完成本批回归：
    - `cd /Codex/ACDP && npm run smoke:console`
    - `cd /Codex/ACDP && npm run test:console`
    - `cd /Codex/ACDP && npm run test:unit`
    - 最新结果：`23/23` 单测文件通过
- 当前状态判断：
  - 本地环境可完成的工作已收口
  - 剩余未完成部分只包含真实 `cg3` 外部 endpoint/auth/ack 联调与证据留档
  - 因此当前状态调整为 `blocked`，不再视为本地可继续推进的主线
- 后续要做：
  - 把 `cg3` 在真实环境切到 `http_pull_json`
  - 确认真实 endpoint / token / ack 语义
  - 留档真实联通、ack、replay 证据
- 外部条件清单：
  - [46-JOB-007与JOB-009外部条件清单](./archive/2026-04-17-v1早期基线与已替代设计文档/46-JOB-007与JOB-009外部条件清单.md)
- 依赖 / 风险：
  - 依赖外部系统访问条件
  - 依赖对接协议和网络策略
  - 当前 connector 已可运行，但仍缺少真实外部网络证据
- 完成标准：
  - 至少一个真实外部 feed 源接通并留档

子任务 checklist：

- [x] file-based connector 已具备
- [x] 明确首个真实接入源（CG3 / QA / online）
- [x] 明确认证方式
- [x] 明确 ack / retry / 回放机制
- [x] 设计接入契约
- [x] 实现首个真实 connector
- [ ] 补集成验证与留档

### JOB-008 file-based feed 文档与示例维护

- 当前负责人：Codex
- 最近更新时间：`2026-04-04`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  完成当前 file-based feed 相关文档、模板、示例和示例 payload 的同步复核，并补一层自动一致性校验，避免再次靠人工记忆维护。
- 已完成：
  - 已复核 `prototype/config/import_templates/index.json` 与 `prototype/config/import_templates/` 下的模板 / 示例文件
  - 已复核 `prototype/config/validation_feed_examples.json` 与当前仓库文档中的 payload 说明
  - 已确认以下文档/说明与当前资产一致：
    - `docs/archive/2026-04-17-v1早期基线与已替代设计文档/19-导入模板字段规范与示例文件定义.md`
    - `docs/archive/2026-04-17-v1早期基线与已替代设计文档/12-原型实现与当前能力.md`
    - `prototype/README.md`
  - 已新增 `prototype/tests/unit/template-assets-docs.test.js`，把模板注册、模板/示例文件、validation feed 示例 payload 与文档引用绑进 `test:unit`
- 后续要做：
  - 当前批次无剩余动作
  - 若后续 payload / 模板再次变化，应在同一批提交里同步文档、示例和自动校验，再按新维护批次处理
- 完成标准：
  - 当前仓库内模板、示例、payload 示例与关键文档已对齐
  - 已有自动化校验防止下一次静默漂移

子任务 checklist：

- [x] 当前模板与示例已完成一轮对齐
- [x] 当前 payload 说明已同步文档
- [x] 当前模板变化已同步示例文件
- [x] 已补自动化抽查，避免文档与代码再次漂移

### JOB-009 并发与吞吐验证

- 当前负责人：待指定测试/运维负责人
- 最近更新时间：`2026-04-07`
- 外部依赖：真实宿主机环境
- 是否可关闭：否
- 目标：
  对 runtime 服务做真实宿主机并发验证和目标吞吐验证。
- 已完成：
  - `test:concurrency` 已存在
  - `GET /api/runtime/stats` 已可提供并发、错误数、延迟观测
  - `GET /api/runtime/stats` 现已补充峰值并发摘要，可直接用于压测留档
  - `test:concurrency` 现已补宿主压测留档输出：
    - 自动记录宿主机信息
    - 自动记录 runtime stats 前后快照
    - 自动记录峰值并发、吞吐与延迟摘要
    - 自动落盘报告到 `prototype/workspace/host_verification/*_runtime_concurrency_verify/summary.json`
  - `test:concurrency` 现已支持：
    - 复用 `ACDP_RUNTIME_TOKEN` 自动附带 Bearer Token
    - 通过 `--base-url` 直连已运行中的 runtime 服务
  - `test:concurrency` 现已区分两类执行口径：
    - 未显式传 `--target-rps` 时，只记录实际吞吐与延迟，不默认按 200 RPS 判定
    - 显式传 `--target-rps` 时，才输出是否达到目标吞吐
  - 已补最小回归：
    - `prototype/tests/unit/concurrency-test.test.js`
    - `prototype/tests/unit/runtime-stats-sync.test.js`
  - 本地受限环境下已明确：
    - sandbox 不能提供真实 listen/bind 宿主条件
    - 当前只能保留脚本与观测口径，不能产出真实吞吐结论
- 当前状态判断：
  - 本地环境可完成的脚本、统计口径和留档准备已完成
  - 剩余工作必须在真实宿主机执行
  - 因此当前状态保持 `blocked`
- 后续要做：
  - 在目标宿主机跑 1~5 用户并发验证
  - 跑 `--target-rps 200` 的真实吞吐测试
  - 记录延迟、错误率、峰值并发
- 外部条件清单：
  - [46-JOB-007与JOB-009外部条件清单](./archive/2026-04-17-v1早期基线与已替代设计文档/46-JOB-007与JOB-009外部条件清单.md)
- 依赖 / 风险：
  - 需要真实宿主机环境，不适合沙箱
- 完成标准：
  - 有明确吞吐测试数据和结论

子任务 checklist：

- [x] `test:concurrency` 命令已存在
- [x] 为 `test:concurrency` 补宿主压测留档输出
- [ ] 在目标宿主机执行 1~5 用户并发验证
- [ ] 执行 `--target-rps 200` 吞吐验证
- [ ] 记录延迟、错误率、峰值并发
- [ ] 输出验证结论与瓶颈说明

### JOB-010 SQLite 之后的状态管理规划

- 当前负责人：Codex
- 最近更新时间：`2026-04-04`
- 外部依赖：架构决策
- 是否可关闭：是
- 目标：
  为 split 部署之后的后续演进准备非单副本 SQLite 的状态管理方案。
- 已完成：
  - 当前共享 PVC + SQLite 方案仅适合 MVP 的边界已明确
  - 已新增状态管理升级路线文档：
    - [44-SQLite之后状态管理升级路线](./archive/2026-04-17-v1早期基线与已替代设计文档/44-SQLite之后状态管理升级路线.md)
  - 已梳理三类核心状态：
    - 控制面事务状态
    - 发布产物 / 不可变证据
    - runtime 本地状态与运行统计
  - 已给出候选方案比较：
    - PostgreSQL + MinIO + runtime 本地 SQLite
    - MySQL + MinIO + runtime 本地 SQLite
    - 继续 SQLite 但拆库
    - PostgreSQL + 独立分析存储
  - 已明确推荐目标架构：
    - PostgreSQL 负责控制面权威事务状态
    - MinIO / 对象存储负责 release 与证据对象
    - runtime 本地 SQLite / JSON 保持节点自治
  - 已给出按阶段实施路线：
    - 阶段 0 边界冻结
    - 阶段 1 存储抽象
    - 阶段 2 PostgreSQL 控制库落地
    - 阶段 3 统计路径拆层
    - 阶段 4 共享状态增强
  - 已完成本批回归：
    - `cd /Codex/ACDP && npm run smoke:console`
    - `cd /Codex/ACDP && npm run test:console`
    - `cd /Codex/ACDP && npm run test:unit`
    - 最新结果：`23/23` 单测文件通过
- 后续要做：
  - 若后续进入多副本 admin 或正式生产控制面，按 `docs/44` 进入实施批次
- 依赖 / 风险：
  - 规划已完成，但真实实施仍需要 PostgreSQL、迁移窗口和运维接入条件
  - 若后续直接跳过阶段 1/2，在现有 SQLite 基线上继续扩量，瓶颈仍会回到控制面
- 完成标准：
  - 形成可执行的状态管理升级方案
  - 当前要求已满足

子任务 checklist：

- [x] 明确当前共享 PVC + SQLite 仅适合 MVP
- [x] 梳理管理库、发布产物、运行统计三类状态
- [x] 给出替代方案候选
- [x] 评估迁移成本与风险
- [x] 输出升级路线建议

### JOB-011 WebSocket caller identity / quota 治理

- 当前负责人：Codex
- 最近更新时间：`2026-04-04`
- 外部依赖：生产接入需求
- 是否可关闭：是
- 目标：
  为对外 runtime WebSocket 接口补充更强的 caller identity、quota、治理策略。
- 已完成：
  - Bearer Token、连接数、空闲超时、消息大小限制已存在
  - 已新增 `prototype/src/lib/runtime-ws-governance.js`，统一承接：
    - caller identity 解析
    - registered caller secret / legacy runtime token 兼容认证
    - caller blacklist / IP blacklist
    - caller 并发连接配额
    - caller 每分钟消息配额
    - 治理拒绝计数与快照输出
  - 已扩展 `prototype/config/app.config.json` 与 `prototype/src/lib/config.js`：
    - `websocketCallerIdHeader`
    - `websocketCallerSecretHeader`
    - `websocketCallerIdQueryKey`
    - `websocketCallerSecretQueryKey`
    - `websocketCallerIpHeader`
    - `websocketRejectUnknownCallers`
    - `websocketDefaultMaxConnectionsPerCaller`
    - `websocketDefaultMaxRequestsPerMinute`
    - `websocketBlacklistIps`
    - `websocketCallers[]`
  - 已把 `/ws/runtime/correct` 升级路径接入治理器，不影响现有 `/api/runtime/correct`、`/admin`、`/console`
  - 已让 `GET /api/runtime/stats` 输出 `websocketGovernance` 快照，便于观测 active caller / rejections
  - 已新增首轮方案文档：
    - [43-WebSocket caller identity 与 quota 治理首轮方案](./43-WebSocket%20caller%20identity%20与%20quota%20治理首轮方案.md)
  - 已新增单测：
    - `prototype/tests/unit/runtime-ws-governance.test.js`
  - 已完成本批回归：
    - `cd /Codex/ACDP && npm run smoke:console`
    - `cd /Codex/ACDP && npm run test:console`
    - `cd /Codex/ACDP && npm run test:unit`
    - 最新结果：`23/23` 单测文件通过
- 后续要做：
  - 若 WebSocket 进入正式生产接入，再把 caller registry / quota 计数迁到共享状态或控制面配置
- 依赖 / 风险：
  - 当前 caller quota 与 blacklist 仍是单实例内存态
  - 若未来 runtime 多副本对外服务，需要补共享限流与统一审计
- 完成标准：
  - 形成设计方案并落至少一轮实现
  - 当前要求已满足

子任务 checklist：

- [x] Bearer Token / 连接数 / 空闲超时 / 消息大小限制已存在
- [x] 明确 caller identity 模型
- [x] 明确 quota 模型
- [x] 明确 blacklist / 限流策略
- [x] 输出设计方案
- [x] 落首轮实现

### JOB-012 遗留问题与体验型待办维护

- 当前负责人：Codex
- 最近更新时间：`2026-04-04`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  收口当前 `/console` 的视觉回归、布局回归、文案回归和轻交互问题，并清理当前挂起待办，避免继续拖回主线。
- 已完成：
  - `/console` 待办清单文档已建立
  - 已完成一批不扩新功能的 `/console` 标准化维护收口：
    - `console/client/app.js` 已新增 `renderDenseTable()`，统一高密度表格区块的卡片内滚动和“大数据量默认折叠”规则
    - 剩余未统一的表格型重区块已全部接入该 helper，覆盖：
      - 首页输入演示中的命中替换 / 候选提示 / 阻断项
      - runtime 节点列表与节点详情统计
      - 词条列表、关联样本
      - 导入批次列表、模板字段说明、导入结果明细、预览行
      - release 列表、release detail 中的确认异常 / 节点收敛 / 验证证据 / 门禁结果 / 验证结果 / 变更词条
      - 样本列表、样本详情关联词条
    - `console/client/app.css` 已补 `dense-section*` 规则，统一折叠区摘要、展开态和滚动容器外框
    - 本批未新增 `/console` 业务能力，只收口页面文字层级、滚动、折叠、布局一致性
  - 已完成本批串行回归：
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
    - 最新结果：`23/23` 单测文件通过
  - 已新增一份受控视觉维护执行文档：
    - `docs/archive/2026-04-17-v1关闭批次与阶段文档/20260404_console-visual-only-plan.md` 已重写为 `JOB-012` 约束文档
    - 已明确第一轮只允许收口 token、背景、圆角、阴影、按钮 hover 和 `label` 字号
    - 已明确 dense-section、表格结构、页面结构和主视觉节奏不在本轮维护范围内
  - 已完成该视觉维护文档的首轮实现：
    - `console/client/app.css` 已完成中性化 token 收口，页面主背景与侧栏去蓝色渐变
    - 顶栏、卡片、表单控件、导航项圆角和阴影已收紧到维护基线
    - 按钮 hover 已移除明显上浮效果
    - `label` 档位已从 `12px` 提升到 `13px`
    - dense-section、表格结构、页面结构和全局字号层级保持不变
  - 已继续收一轮词条中心宽表可读性维护：
    - `console/client/app.js` 的统一表格渲染已支持按页面传入横向滚动提示、最小宽度和表格样式类
    - 词条中心列表结果区已增加“可左右滚动”的显式提示
    - 词条中心列表结果区已固定勾选列和标准词列，横向查看时不再容易丢失定位，同时避免与右侧新建词条区重叠
    - 词条中心页已单独提前切换为纵向堆叠断点；当屏宽不足以同时容纳宽表和右侧新建区时，右侧区块会先下移，不再与列表并排硬挤
    - 根据 `/test/ACDP/词条中心（界面交叉，数据列表没有按规则统一）_2026-04-02_210326_578.png` 的真实冲突截图，词条页双栏保留条件已再次收紧；现在仅在更宽的页面下保留右侧并排新建区，中等宽度会直接切回纵向堆叠
    - 词条列表宽表的页面级最小宽度也已下调，减少中等宽度下的硬挤和横向压迫感
    - 按最新页面要求，`/console/terms` 已不再保留“右侧新建词条”并排骨架，改为“新建词条在上、词条列表在下”的纵向主工作流
    - 新建词条表单已切为一行三列的专用栅格，窄屏下再自动回落为单列
    - 本批仍未新增 `/console` 业务能力，只改善宽表阅读体验
  - 已补齐发布审核前端护栏，解决宿主反馈的 release review 交互歧义：
    - `/console/reviews` 与 `/console/reviews/:taskId` 现在会明确区分“提交人与审核人为同一操作人”和“高风险双人审批中同一审核人重复审批”两类阻断
    - release 详情页已补齐已通过审核人与剩余审批数量提示
    - 当前不再需要把该问题单独挂在 `34-console收尾待办清单.md`
  - `docs/archive/2026-04-17-v1早期基线与已替代设计文档/34-console收尾待办清单.md` 已清理到“当前无挂起项”
- 后续要做：
  - 当前批次无剩余动作
  - 若后续再收到 `/console` 回归反馈，以新的维护批次重开，不继续沿用当前关单
- 完成标准：
  - 当前截图反馈与文档挂起项已清账
  - 当前 `/console` 维护项不再阻塞主线关闭
- 关键文档：
  - [34-console收尾待办清单](./archive/2026-04-17-v1早期基线与已替代设计文档/34-console收尾待办清单.md)

子任务 checklist：

- [x] 建立 `/console` 待办清单
- [x] 纯视觉维护执行文档已建立
- [x] 落首轮实现
- [x] 新发现但暂不处理的问题已统一复核；当前无剩余挂起项
- [x] 已修复问题已关闭或移除
- [x] 已完成一轮待办有效性回看

### JOB-013 `/console` B01 信息架构与视觉层级优化批次

- 当前负责人：Codex
- 最近更新时间：`2026-04-04`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  严格按 `ACDP-CONSOLE-20260404-B01` 的 6 张 task card，在不改业务流程、不改接口契约、不改后端数据模型的前提下，完成 `/console` 信息架构、模块层级、操作优先级和视觉一致性优化。
- 已完成：
  - 已完成批次材料阅读与实现边界评估：
    - `/test/ACDP/codex-handoff-conventions.md`
    - `/test/ACDP/batch.md`
    - `/test/ACDP/T01.md`
    - `/test/ACDP/T02.md`
    - `/test/ACDP/T03.md`
    - `/test/ACDP/T04.md`
    - `/test/ACDP/T05.md`
    - `/test/ACDP/T06.md`
  - 已在 Console 主仓前端层完成首轮共享页面骨架收口，主改动文件：
    - `console/client/app.js`
    - `console/client/app.css`
  - 已按 task card 落地并完成：
    - `T01`：总览首屏分层，KPI / 值守重点 / 待办与活动告警 / 快速入口 / demo 区解耦
    - `T02`：词条中心列表统一为筛选 / 批量动作 / 结果表格 / 分页的稳定结构
    - `T03`：审核中心卡片统一为状态优先、目标对象优先、风险动作独立分区
    - `T04`：运行节点中心与节点详情改为健康/异常优先、版本对齐优先、控制动作贴近状态
    - `T05`：导入中心首页拆开模板发现与批次跟进，模板详情改为结构化检查布局
    - `T06`：发布中心列表强化阶段可见性，版本详情把阶段判断与高风险操作从密集说明中前置拆开
  - 已保持以下边界不变：
    - 未改业务流程
    - 未改接口契约
    - 未改后端数据模型
    - 未破坏既有 `/admin` 和 `/console` 已完成能力
  - 已完成本批文档同步：
    - `docs/38-项目JobList与状态清单.md`
    - `SESSION_HANDOFF.md`
    - `NEXT_STEPS.md`
  - 已完成本批回归：
    - `cd /Codex/ACDP && npm run smoke:console`
    - `cd /Codex/ACDP && npm run test:console`
    - `cd /Codex/ACDP && npm run test:unit`
    - 最新结果：`23/23` 单测文件通过
- 后续要做：
  - 当前批次无继续动作
  - 如后续再收到新的 Console 信息架构 / 结构调整需求，按新批次重开，不复用 `JOB-013`
- 依赖 / 风险：
  - 本批已无实现阻塞
  - 未来若把新的 Console 结构调整混回已关闭批次，会导致验收和回溯口径混乱
- 完成标准：
  - `T01`~`T06` 全部按 task card 落地
  - 不改业务流程 / 接口契约 / 后端数据模型
  - `smoke:console` / `test:console` / `test:unit` 通过

子任务 checklist：

- [x] 完成批次材料阅读
- [x] 完成实现边界评估
- [x] 完成任务冲突评估
- [x] 给出建议实施顺序
- [x] 在项目 JobList 中独立挂单
- [x] 获批后启动主仓实施
- [x] 完成 `T01`
- [x] 完成 `T02`
- [x] 完成 `T03`
- [x] 完成 `T04`
- [x] 完成 `T05`
- [x] 完成 `T06`
- [x] 完成本批回归与关单

### JOB-014 `/console` B02 二级工作页与详情页层级一致性批次

- 当前负责人：Codex
- 最近更新时间：`2026-04-04`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  严格按 `ACDP-CONSOLE-20260404-B02` 的 6 张 task card，在不改业务流程、不改接口契约、不改后端数据模型的前提下，完成 `/console` 二级工作页和详情页的一致性层级优化。
- 已完成：
  - 已完成批次材料阅读：
    - `/test/ACDP/codex-handoff-conventions.md`
    - `/test/ACDP/batch.md`
    - `/test/ACDP/T01.md`
    - `/test/ACDP/T02.md`
    - `/test/ACDP/T03.md`
    - `/test/ACDP/T04.md`
    - `/test/ACDP/T05.md`
    - `/test/ACDP/T06.md`
  - 已确认该批次聚焦范围：
    - `/console/validation-cases`
    - `/console/validation-cases/:id`
    - `/console/terms/:id`
    - `/console/runtime-nodes/:id`
    - `/console/releases/:id`
    - `/console/import/templates/:id`
  - 已确认该批次可完全落在 Console 主仓前端层，不需要：
    - 改业务流程
    - 改接口契约
    - 改后端数据模型
  - 已确认当前 6 张 task card 无硬冲突，但都属于 `JOB-013` 之后的 detail/list refinement，不应推翻 B01 已落地骨架
  - 已给出建议实施顺序：
    - `T01 / T02`
    - `T03`
    - `T04 / T05`
    - `T06`
  - 已明确该批次不能复用已关闭的：
    - `JOB-001D`
    - `JOB-012`
    - `JOB-013`
  - 已在 Console 主仓前端层完成主改动，主文件：
    - `console/client/app.js`
    - `console/client/app.css`
  - 已按 task card 落地并完成：
    - `T01`：validation center 列表区拆成筛选 / 批量动作 / 结果主工作区，创建/导入/帮助下沉到侧边区
    - `T02`：validation detail 改为状态与样本文本优先、动作贴近状态、关联词条下沉为次级参考区
    - `T03`：term detail 改为状态/决策优先，基础信息、来源链路、规则治理、拼音治理分区
    - `T04`：runtime node detail 顶部诊断区强化，控制信息与动作贴近一线诊断区，趋势数据下沉
    - `T05`：release detail 顶部决策区补齐审批与下游状态摘要，高风险操作继续独立隔离
    - `T06`：import template detail 统一成模板元数据/下载区 + 字段说明区 + 导入规则区 + 检查顺序区
  - 已保持以下边界不变：
    - 未改业务流程
    - 未改接口契约
    - 未改后端数据模型
    - 未破坏既有 `/admin` 和 `/console` 已完成能力
  - 已完成本批文档同步：
    - `docs/38-项目JobList与状态清单.md`
    - `SESSION_HANDOFF.md`
    - `NEXT_STEPS.md`
  - 已完成本批回归：
    - `cd /Codex/ACDP && npm run smoke:console`
    - `cd /Codex/ACDP && npm run test:console`
    - `cd /Codex/ACDP && npm run test:unit`
    - 最新结果：`23/23` 单测文件通过
- 后续要做：
  - 当前批次无继续动作
  - 如后续再收到新的 Console 二级页或详情页结构反馈，按新批次重开，不复用 `JOB-014`
- 依赖 / 风险：
  - 本批已无实现阻塞
  - 若未来把新的 detail/list refinement 混回已关闭批次，会导致验收和回溯口径混乱
- 完成标准：
  - `T01`~`T06` 全部按 task card 落地
  - 不改业务流程 / 接口契约 / 后端数据模型
  - `smoke:console` / `test:console` / `test:unit` 通过

子任务 checklist：

- [x] 完成批次材料阅读
- [x] 完成实现边界评估
- [x] 完成任务冲突评估
- [x] 给出建议实施顺序
- [x] 在项目 JobList 中独立挂单
- [x] 获批后启动主仓实施
- [x] 完成 `T01`
- [x] 完成 `T02`
- [x] 完成 `T03`
- [x] 完成 `T04`
- [x] 完成 `T05`
- [x] 完成 `T06`
- [x] 完成本批回归与关单

### JOB-015 `/console` B03 跨页模式收敛与系统感一致性批次

- 当前负责人：Codex
- 最近更新时间：`2026-04-04`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  严格按 `ACDP-CONSOLE-20260404-B03` 的 6 张 task card，在不改业务流程、不改接口契约、不改后端数据模型的前提下，完成 `/console` 跨页模式收敛与系统感一致性优化。
- 已完成：
  - 已完成批次材料阅读：
    - `/test/ACDP/codex-handoff-conventions.md`
    - `/test/ACDP/batch.md`
    - `/test/ACDP/T01.md`
    - `/test/ACDP/T02.md`
    - `/test/ACDP/T03.md`
    - `/test/ACDP/T04.md`
    - `/test/ACDP/T05.md`
    - `/test/ACDP/T06.md`
  - 已确认该批次聚焦范围：
    - `/console/help`
    - `/console/help/integration`
    - `/console/help/trial`
    - `/console/terms`
    - `/console/reviews`
    - `/console/releases`
    - `/console/validation-cases`
    - 已接受的 B02 detail pages
  - 已确认该批次可完全落在 Console 主仓前端层，不需要：
    - 改业务流程
    - 改接口契约
    - 改后端数据模型
  - 已在 Console 主仓前端层完成主改动，主文件：
    - `console/client/app.js`
    - `console/client/app.css`
  - 已按 task card 落地并完成：
    - `T01`：help center index 改成次级支持工作区，帮助入口卡和支持区与主壳层结构对齐
    - `T02`：长文帮助页统一成 hero + 正文区 + 右侧元数据/动作区 + 阅读提示区
    - `T03`：terms / reviews / releases / validation-cases 的 filter / action / result-control pattern 进一步收敛
    - `T04`：badge、callout、状态面板的视觉语义进一步统一
    - `T05`：breadcrumb、pagination、返回/次级导航语言统一
    - `T06`：detail page 的右侧 metadata / side-panel / secondary action grammar 继续统一
  - 已保持以下边界不变：
    - 未改业务流程
    - 未改接口契约
    - 未改后端数据模型
    - 未破坏既有 `/admin` 和 `/console` 已完成能力
  - 已完成本批文档同步：
    - `docs/38-项目JobList与状态清单.md`
    - `SESSION_HANDOFF.md`
    - `NEXT_STEPS.md`
  - 已完成本批回归：
    - `cd /Codex/ACDP && npm run smoke:console`
    - `cd /Codex/ACDP && npm run test:console`
    - `cd /Codex/ACDP && npm run test:unit`
    - 最新结果：`23/23` 单测文件通过
- 后续要做：
  - 当前批次无继续动作
  - 如后续再收到新的 Console 模式收敛或系统感一致性反馈，按新批次重开，不复用 `JOB-015`
- 依赖 / 风险：
  - 本批已无实现阻塞
  - 若未来把新的 cross-page convergence 批次混回已关闭批次，会导致验收和回溯口径混乱
- 完成标准：
  - `T01`~`T06` 全部按 task card 落地
  - 不改业务流程 / 接口契约 / 后端数据模型
  - `smoke:console` / `test:console` / `test:unit` 通过

子任务 checklist：

- [x] 完成批次材料阅读
- [x] 完成实现边界评估
- [x] 完成任务冲突评估
- [x] 在项目 JobList 中独立挂单
- [x] 完成 `T01`
- [x] 完成 `T02`
- [x] 完成 `T03`
- [x] 完成 `T04`
- [x] 完成 `T05`
- [x] 完成 `T06`
- [x] 完成本批回归与关单

### JOB-016 `/console` B04 收尾批次与低风险视觉基础增强

- 当前负责人：Codex
- 最近更新时间：`2026-04-04`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  严格按 `ACDP-CONSOLE-20260404-B04` 的 5 张 task card，在不改业务流程、不改接口契约、不改后端数据模型的前提下，完成当前优化周期的收尾、低风险视觉基础增强和 wider rerun 残余问题清理。
- 已完成：
  - 已完成批次材料阅读：
    - `/test/ACDP/codex-handoff-conventions.md`
    - `/test/ACDP/batch.md`
    - `/test/ACDP/T01.md`
    - `/test/ACDP/T02.md`
    - `/test/ACDP/T03.md`
    - `/test/ACDP/T04.md`
    - `/test/ACDP/T05.md`
  - 已确认该批次聚焦范围：
    - `/console`
    - `/console/help`
    - `/console/help/integration`
    - `/console/help/trial`
    - `/console/releases`
    - `/console/runtime-nodes`
    - `/console/validation-cases`
    - representative detail pages
    - representative review-detail pages
  - 已确认该批次可完全落在 Console 主仓前端层，不需要：
    - 改业务流程
    - 改接口契约
    - 改后端数据模型
  - 已在 Console 主仓前端层完成主改动，主文件：
    - `console/client/app.js`
    - `console/client/app.css`
  - 已按 task card 落地并完成：
    - `T01`：全局 color token 和 state tint 做统一，success / warning / danger / support surface 语言收口
    - `T02`：card / panel / border / radius / shadow grammar 做跨页收口
    - `T03`：page header / section-header / support surface hierarchy 进一步增强
    - `T04`：breadcrumb / pagination / detail return navigation 做统一 closure
  - 已收到黑盒复核结论：
    - `blocking pages = 0`
    - `high-priority issue pages = 5`
    - 5 个遗留高优先级页面全部是 review detail route，问题标签均为 `too-few-buttons`
    - 当前批次因此只能记为 `partially accepted`
  - 已按复核意见对 `T05` 继续补丁：
    - review detail 的低风险导航动作改为更直接的真实按钮型动作
    - review detail 继续保持 decision context / target content / primary decision / risk decision 分区
    - terms / runtime / release detail 也补齐稳定“返回中心”次级导航，保持 B04 导航 closure 口径一致
  - 已收到最新复核结论：
    - `ACDP-CONSOLE-20260404-B04-T05` 已通过复核
    - 当前 `B04` 可正式关单
  - 已保持以下边界不变：
    - 未改业务流程
    - 未改接口契约
    - 未改后端数据模型
    - 未破坏既有 `/admin` 和 `/console` 已完成能力
  - 已完成本批文档同步：
    - `docs/38-项目JobList与状态清单.md`
    - `SESSION_HANDOFF.md`
    - `NEXT_STEPS.md`
  - 已完成本批回归：
    - `cd /Codex/ACDP && npm run smoke:console`
    - `cd /Codex/ACDP && npm run test:console`
    - `cd /Codex/ACDP && npm run test:unit`
    - 最新结果：`23/23` 单测文件通过
- 后续要做：
  - 当前批次无继续动作
  - 如后续再收到新的 Console 收尾或视觉基础一致性反馈，按新批次重开，不复用 `JOB-016`
- 依赖 / 风险：
  - 本批已无实现阻塞
  - 若未来把新的 closure / token / review-detail cleanup 批次混回已关闭批次，会导致验收和回溯口径混乱
- 完成标准：
  - `T01`~`T05` 全部按 task card 落地
  - `T05` 复核通过
  - `smoke:console` / `test:console` / `test:unit` 通过

子任务 checklist：

- [x] 完成批次材料阅读
- [x] 完成实现边界评估
- [x] 在项目 JobList 中独立挂单
- [x] 完成 `T01`
- [x] 完成 `T02`
- [x] 完成 `T03`
- [x] 完成 `T04`
- [x] 完成 `T05` 黑盒验收通过
- [x] 完成 `T05` 返工补丁
- [x] 完成本轮回归与最终关单

### JOB-017 `/console` B05 视觉系统升级批次

- 当前负责人：Codex
- 最近更新时间：`2026-04-04`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  严格按 `ACDP-CONSOLE-20260404-B05` 的 5 张 task card，在不改业务流程、不改接口契约、不改后端数据模型的前提下，把 `/console` 从“结构稳定但仍偏朴素”推进到“视觉更丰富、系统更鲜明”的 accepted-B04 之后新基线。
- 已完成：
  - 已完成批次材料阅读：
    - `/test/ACDP/batch.md`
    - `/test/ACDP/T01.md`
    - `/test/ACDP/T02.md`
    - `/test/ACDP/T03.md`
    - `/test/ACDP/T04.md`
    - `/test/ACDP/T05.md`
  - 已确认该批次是正式可开工批次，不是纠错批次：
    - `blocking pages = 0`
    - `high-priority issue pages = 0`
    - `issues.md` 无 actionable backlog
  - 已确认该批次边界：
    - 不重开 `B04` 结构收口问题
    - 不牺牲可读性、动作优先级、状态语义
    - 只做系统级、可复用的视觉升级
  - 已在 Console 主仓前端层完成主改动，主文件：
    - `console/client/app.js`
    - `console/client/app.css`
  - 已按 task card 落地并完成：
    - `T01`：Console shell theme uplift
      - 提升全局 palette、shell 背景、侧栏、topbar、导航和 shared shell surfaces 的视觉系统辨识度
    - `T02`：Overview and workspace visual language upgrade
      - 通过 `pageFamily` 机制区分 overview / workspace 页族，在 shared hero、metric card、surface zone 上做系统级差异化
    - `T03`：Support and documentation page visual identity
      - help index / help detail 形成更完整的 support visual identity，同时仍保持从属关系，不拆成独立站点
    - `T04`：Detail-page atmosphere and metadata panel styling
      - detail 页 summary zone、metadata side panel、support panel 和 page-side grammar 进一步抬升质感
    - `T05`：Iconography, visual accents, and final system polish
      - 统一按钮、badge、summary chip、section marker 等小型视觉提示语言，完成最终 polish
  - 已保持以下边界不变：
    - 未改业务流程
    - 未改接口契约
    - 未改后端数据模型
    - 未破坏既有 `/admin` 和 `/console` 已完成能力
  - 已完成本批文档同步：
    - `docs/38-项目JobList与状态清单.md`
    - `SESSION_HANDOFF.md`
    - `NEXT_STEPS.md`
  - 已完成本批回归：
    - `cd /Codex/ACDP && npm run smoke:console`
    - `cd /Codex/ACDP && npm run test:console`
    - `cd /Codex/ACDP && npm run test:unit`
    - 最新结果：`23/23` 单测文件通过
- 后续要做：
  - 当前批次无继续动作
  - 如后续再收到新的 Console 视觉系统升级反馈，按新批次重开，不复用 `JOB-017`
- 依赖 / 风险：
  - 本批已无实现阻塞
  - 若未来再做视觉升级时回到页面级零碎 patch，会直接违背 B05 建立的系统级目标
- 完成标准：
  - `T01`~`T05` 全部按 task card 落地
  - 不改业务流程 / 接口契约 / 后端数据模型
  - `smoke:console` / `test:console` / `test:unit` 通过

子任务 checklist：

- [x] 完成批次材料阅读
- [x] 在项目 JobList 中独立挂单
- [x] 完成 `T01`
- [x] 完成 `T02`
- [x] 完成 `T03`
- [x] 完成 `T04`
- [x] 完成 `T05`
- [x] 完成本批回归与关单

### JOB-018 导入中心统一结构化词条导入重构

- 当前负责人：Codex
- 最近更新时间：`2026-04-07`
- 外部依赖：现有 `terms/aliases/import_jobs` 数据模型、旧模板兼容要求
- 是否可关闭：是
- 目标：
  把当前“原始路名 / 政府部门 / 结构化词条”三套词条导入入口收敛为一套统一的结构化词条导入合同，并通过业务属性选择承接路名、政府部门、常用词等差异，降低导入中心复杂度。
- 已完成：
  - 已完成当前数据库结构梳理，确认词典系统真正的核心落库对象只有：
    - `terms`
    - `aliases`
    - `term_rules`
    - `pinyin_profiles`
    - `term_sources`
    - `alias_sources`
  - 已确认政府部门模板中的 `district/address/level/category/remark` 等字段当前不进入词典核心主数据，不应继续作为主合同字段保留
  - 已新增设计文档：
    - [2026-04-02/04-数据库字典与字段说明](./archive/2026-04-17-v1早期基线与已替代设计文档/2026-04-02/04-数据库字典与字段说明.md)
    - [48-导入中心统一结构化词条导入重构方案](./archive/2026-04-17-v1早期基线与已替代设计文档/48-导入中心统一结构化词条导入重构方案.md)
  - 已完成模板和合同收敛：
    - `prototype/config/import_templates/index.json` 已新增 `structured_terms_csv_v2` 作为统一词条导入主模板
    - `raw_roads_text_v1`、`gov_departments_csv_v1`、`structured_terms_csv_v1` 已标记为 legacy
    - 已新增统一模板资产：
      - `structured_terms_csv_v2.template.csv`
      - `structured_terms_csv_v2.example.csv`
    - `docs/archive/2026-04-17-v1早期基线与已替代设计文档/19-导入模板字段规范与示例文件定义.md` 已改为 `v2` 主路径 + legacy 兼容说明口径
  - 已完成词条导入解析主路径收敛：
    - `structured_terms_csv_v2` 与 `structured_terms_csv_v1` 统一走同一条结构化词条解析路径
    - 支持批次级 `defaultCategoryCode`
    - 支持把 `customFullPinyinNoTone` / `alternativeReadings` 写入统一导入载荷
    - legacy 路名 / 政府部门模板仍可兼容导入
  - 已完成 `/console/import` 收敛：
    - 主展示只保留统一词条导入、错误词补录、验证样本导入
    - 旧路名 / 政府部门模板下沉到 legacy 兼容区
    - 创建批次表单新增“业务属性”选择
    - 模板详情页和批次详情页已补充主路径 / legacy 状态与业务属性说明
    - 结构化词条导入模板卡已去掉业务属性描述文案
    - 首页三个任务卡已调整为一行三列布局，并与下方区域使用同一组宽度基线
  - 已完成测试与回归：
    - 主回归用例已切到 `structured_terms_csv_v2`
    - 同时保留 legacy 兼容测试
    - `cd /Codex/ACDP && npm run smoke:console`
    - `cd /Codex/ACDP && npm run test:console`
    - `cd /Codex/ACDP && npm run test:unit`
    - 最新结果：`25/25` 单测文件通过
- 后续要做：
  - 当前批次无继续动作
  - 若后续再收到导入中心分类、legacy 曝光、词条业务属性细分或首页布局反馈，按新批次重开，不复用 `JOB-018`
- 依赖 / 风险：
  - 第一阶段业务属性仍复用现有 `categoryCode`，后续若要把“常用词”从 `proper_noun` 中再细分，需要新批次处理
- 完成标准：
  - 导入中心只保留一套结构化词条导入主入口
  - 词条导入统一为单一字段合同
  - 路名 / 政府部门 / 常用词等差异通过业务属性承接
  - 旧模板与历史批次具备清晰兼容策略

子任务 checklist：

- [x] 梳理当前数据库结构和实际落库模型
- [x] 确认政府部门附加字段不属于词典核心主数据
- [x] 确认导入中心统一为单一结构化词条导入主入口
- [x] 确认路名 / 政府部门 / 常用词改为业务属性选择
- [x] 输出重构设计文档
- [x] 收敛模板元数据与模板说明
- [x] 收敛导入解析逻辑到统一合同
- [x] 收敛 `/console/import` 入口与上传表单
- [x] 补主回归与 legacy 兼容测试
- [x] 收尾 legacy 兼容提示与剩余说明口径
- [x] 收结构化词条导入卡片文案与三列布局 follow-up

### JOB-019 统一词条准入规则与跨中心收口

- 当前负责人：Codex
- 最近更新时间：`2026-04-14`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  建立统一词条准入能力，并同步收口导入中心、词条中心与审核中心相关说明，使什么词可以进入字典、什么词必须被拦住、为什么被拦住具备统一口径。
- 已完成：
  - 已新增统一准入层 `prototype/src/lib/term-admission.js`
  - 已补 alias 冲突查询与结构化 trace helper
  - 已将结构化词条导入预览接入统一准入，并持久化 `import_job_rows.issues_json`
  - 已收紧 `confirmImportJob()`，blocked/error 批次不可确认
  - 已将词条中心 create / update / pinyin 编辑接入统一准入
  - 已在词条详情、导入详情、审核详情中展示 admission summary / trace 摘要
  - 已补 `term-admission.test.js`、`import-jobs.test.js`、`console-api.test.js`、`console-read.test.js`、`console-workflows.test.js`
  - 已完成 `smoke:console`、`test:console`、`test:unit` 回归
  - 已补 follow-up 规则收口：
    - 单字标准词不再一刀切阻断
    - 单字标准词必须填写错误词 / 别名
    - 单字标准词只要存在任意单字错误词 / 别名即阻断
    - 单字标准词仅在错误词均为非单字时允许通过该条准入校验
  - 已补导入批次批量审核 follow-up：
    - `当前导入批次待审核任务` 现在只命中 `pending` 的 `term_review`
    - 不再把已通过 / 已驳回历史任务混入批量审核
    - 不再受旧的 500 条分页上限截断
- 非关单前置项：
  - 不要求同批完成数据库唯一约束
  - 不要求同批完成历史主数据清洗
  - 不要求引入 NLP / 模型判词

子任务 checklist：

- [x] 明确统一词条准入总体策略
- [x] 明确更激进字典准入首轮采用规则化方案
- [x] 明确单字词 / alias 冲突 / 业务属性 / 拼音字段口径
- [x] 输出跨中心收口方案文档
- [x] 输出实施拆解与关单标准文档
- [x] 把 `T02`~`T07` 细化到文件范围、接口行为与验收点粒度
- [x] `T02-A` 新增 `prototype/src/lib/term-admission.js`
- [x] `T02-B` 补 alias 冲突查询与 trace helper
- [x] `T03-A` 接入 `parseStructuredTerms()` 预览判定
- [x] `T03-B` 增加 `import_job_rows.issues_json` 并接通 read path
- [x] `T03-C` 收紧 `confirmImportJob()`，blocked/error 批次不可确认
- [x] `T04-A` 接入 `/api/console/terms` create / update
- [x] `T04-B` 接入词条中心拼音编辑与前端 callout
- [x] `T05` 页面化展示冲突 trace
- [x] `T06` 审核详情页补 admission summary
- [x] `T07` 更新文档 / 测试 / 回归并完成关单
- [x] `T07-followup-A` 单字标准词特例准入口径与代码同步
- [x] `T07-followup-B` 导入批次批量审核 pending-only 处理与提示同步

### JOB-020 runtime 候选纠错接口与输入验证工作台

- 当前负责人：Codex
- 最近更新时间：`2026-04-07`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  在保持现有 `POST /api/runtime/correct` 与 `GET /ws/runtime/correct` 合同不变的前提下，新增候选版正式接口 `correct_cand` / `ws correct_cand`，并将 `/console` 总览中的输入与纠错演示拆出为独立验证页面。
- 已完成：
  - 已在 `runtime.js` 增加 `matchDetailed()`
  - 已新增 `runtime-candidates.js` 与 `runtime-candidates.test.js`
  - 已新增 `POST /api/runtime/correct_cand` 与 `GET /ws/runtime/correct_cand`
  - 已新增 `/api/console/runtime-verify/current`、`/correct`、`/correct-cand`
  - 已新增 `/console/runtime-verify` 页面、导航与动作渲染
  - 已将总览中的重交互 demo 收口为轻摘要入口
  - 已预留 `targetMode/nodeId/trafficKey` 扩展位，并对非 `cluster_current` 返回 `runtime_verify_target_mode_invalid`
  - 已更新 `docs/archive/2026-04-17-v1早期基线与已替代设计文档/14-正式对外纠错接口说明.md`、`docs/archive/2026-04-17-v1早期基线与已替代设计文档/12-原型实现与当前能力.md`、`docs/archive/2026-04-17-v1早期基线与已替代设计文档/2026-04-02/03-接口与命令速查.md`
  - 已补 `console-api.test.js`、`console-read.test.js`、`console-workflows.test.js` 及 runtime 相关回归
  - 已完成 `smoke:console`、`test:console`、`test:unit` 回归
- 非关单前置项：
  - 不要求当前直接实现指定 runtime 节点代理验证
  - 不要求当前直接实现 stable / canary 差异对比输出
  - 不要求把 `/api/simulate` 正式化

子任务 checklist：

- [x] 明确 `correct` / `ws correct` 合同保持不变
- [x] 明确新增 `correct_cand` / `ws correct_cand`
- [x] 明确候选接口返回 `correctedTexts`
- [x] 明确独立 `/console/runtime-verify` 页面方向
- [x] 输出方案文档
- [x] 输出实施拆解与关单标准文档
- [x] `T02-A` 在 `runtime.js` 新增 `matchDetailed()` 或同级详细命中数据路径
- [x] `T02-B` 新增 `runtime-candidates.js` 并导出 `buildCandidateSlots()` / `buildCorrectedTexts()`
- [x] `T02-C` 补 `runtime-candidates.test.js`，覆盖无候选、主结果等于原文、双 slot 组合、去重与 blocked 排除
- [x] `T03-A` 在 `runtime-surface.js` 新增 `POST /api/runtime/correct_cand`
- [x] `T03-B` 在 `server.js` 新增 `runCorrectionCandidates()` / `executeCorrectionCandidates()`
- [x] `T03-C` 在 `server.js` 新增 `GET /ws/runtime/correct_cand` 处理链路并补 runtime surface / integration 回归
- [x] `T04-A` 在 `admin-surface.js` 新增 `/api/console/runtime-verify/current`
- [x] `T04-B` 在 `admin-surface.js` 新增 `/api/console/runtime-verify/correct`
- [x] `T04-C` 在 `admin-surface.js` 新增 `/api/console/runtime-verify/correct-cand` 并收紧 `targetMode=cluster_current`
- [x] `T05-A` 在 `admin-auth.js` / `index.html` / `app.js` 中新增 `/console/runtime-verify` 页面、导航和 page feature
- [x] `T05-B` 在 `app.js` 中新增 `run-runtime-verify-correct` / `run-runtime-verify-correct-cand` 动作与结果渲染
- [x] `T05-C` 将总览 `renderOverviewSimulationPanel()` 收口为轻摘要与跳转入口
- [x] `T06` 预留 `targetMode/nodeId/trafficKey` 扩展位，不在第一阶段实现节点代理与灰度对比
- [x] `T07-A` 更新 `docs/archive/2026-04-17-v1早期基线与已替代设计文档/14-正式对外纠错接口说明.md`、`docs/archive/2026-04-17-v1早期基线与已替代设计文档/12-原型实现与当前能力.md`、`docs/archive/2026-04-17-v1早期基线与已替代设计文档/2026-04-02/03-接口与命令速查.md
- [x] `T07-B` 补 `console-api.test.js`、`console-read.test.js`、`console-workflows.test.js`
- [x] `T07-C` 运行 `npm run smoke:console`、`npm run test:console`、`npm run test:unit` 并完成关单

### JOB-021 多 runtime 实例验证与节点备案注册治理

- 当前负责人：Codex
- 最近更新时间：`2026-04-15`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  建立多 runtime 实例验证与节点备案注册治理基线：既能稳定起 `1 admin + 2 runtime`，又能把 runtime 到 admin 的接入从自动入库升级为人工备案后注册。
- 已完成：
  - 已新增 `runtime-instance-config.js`、`start-runtime-instance.js`、实例化 `service-manager.js` 和 `start:runtime:instance`
  - 已新增 `runtime_node_registry` 表、CRUD、密钥轮换和 registry read path
  - 已新增 `/api/console/runtime-node-registry*` 与 `/console/runtime-node-registry`
  - 已新增 `runtime.node.registry.read/manage` 权限与页面 feature
  - 已在 `config.js` / `artifact_store.config.json` / `runtime-control-client.js` 接入 `registrationSecret` 与节点级头
  - 已将 `register / heartbeat / runtime-control/me / apply-result / stats-upload` 全部接入备案校验
  - 已新增 `verify-multi-runtime.js` 并产出本机 `1 admin + 2 runtime` 成功报告
  - 已补 `runtime-instance-config.test.js`、`runtime-node-registry.test.js`，并补强 `runtime-control.test.js`、`runtime-nodes.test.js`、`runtime-stats-sync.test.js`、`console-api.test.js`、`console-read.test.js`、`console-workflows.test.js`
  - 已更新 `docs/37-runtime-admin服务运维手册.md`、`docs/archive/2026-04-17-v1早期基线与已替代设计文档/12-原型实现与当前能力.md`、`docs/archive/2026-04-17-v1早期基线与已替代设计文档/2026-04-02/03-接口与命令速查.md`
  - 已补充 `docs/archive/2026-04-17-v1关闭批次与阶段文档/138-v1.0运行快照下发模式对照与admin_http_signed落地方案.md`，明确当前已落地模式为 `file / minio`，`admin_http_signed` 属于后续可选简化方案，不代表当前代码已实现
  - 已完成 `smoke:console`、`test:console`、`test:unit` 回归
- 非关单前置项：
  - 不要求当前内建正式 LB / Ingress
  - 不要求节点级 `desiredVersion override`
  - 不要求当前直接实现 `runtime-verify targetMode=runtime_node`
  - 不要求当前直接实现 `admin_http_signed` runtime 快照下发

子任务 checklist：

- [x] 明确多 runtime 当前基线与问题
- [x] 明确 `1 admin + 2/3 runtime` 目标拓扑
- [x] 明确人工备案后注册的节点治理口径
- [x] 输出总体方案文档
- [x] 输出实施拆解与关单标准文档
- [x] `T02-A` 新增 `prototype/src/lib/runtime-instance-config.js`
- [x] `T02-B` 新增 `prototype/src/cli/start-runtime-instance.js`
- [x] `T02-C` 改 `prototype/src/cli/service-manager.js` 支持 runtime `--instance`
- [x] `T02-D` 补 `package.json` runtime instance scripts
- [x] `T03-A` 在 `platform-db.js` 新增 `runtime_node_registry` 与 DB helper
- [x] `T03-B` 在 `console-service.js` 新增备案台账 read path
- [x] `T03-C` 在 `admin-surface.js` 新增 `/api/console/runtime-node-registry*` CRUD
- [x] `T03-D` 在 `admin-auth.js` / `app.js` / `index.html` / `app.css` 新增备案页面与 RBAC feature
- [x] `T04-A` 在 `config.js` / `artifact_store.config.json` 新增 `registrationSecret` 配置入口
- [x] `T04-B` 在 `runtime-control-client.js` 统一附加 `x-runtime-node-id` / `x-runtime-node-secret`
- [x] `T04-C` 在 `platform-db.js` / `admin-surface.js` 新增并接入节点备案校验 helper
- [x] `T05-A` 新增 `prototype/src/cli/verify-multi-runtime.js`
- [x] `T05-B` 产出至少一份 `1 admin + 2 runtime` 宿主验证报告
- [x] `T06` 收口 `/console/runtime-node-registry` 与 `/console/runtime-nodes` 的状态提示与跳转关系
- [x] `T07-A` 更新 `docs/37-runtime-admin服务运维手册.md`、`docs/archive/2026-04-17-v1早期基线与已替代设计文档/12-原型实现与当前能力.md`、`docs/archive/2026-04-17-v1早期基线与已替代设计文档/2026-04-02/03-接口与命令速查.md` 等文档
- [x] `T07-B` 补 `runtime-node-registry.test.js`、`runtime-control.test.js`、`runtime-nodes.test.js`、`console-api.test.js`、`console-read.test.js`、`console-workflows.test.js`
- [x] `T07-C` 运行 `npm run smoke:console`、`npm run test:console`、`npm run test:unit` 并完成关单

### JOB-022 发布中心状态分层与页面收口

- 当前负责人：Codex
- 最近更新时间：`2026-04-08`
- 外部依赖：现有 release / review / gray policy 聚合基线
- 是否可关闭：是
- 目标：
  把发布中心中的“版本状态 / 审批状态 / 流量状态”彻底拆开，并同步收口审核中心中的 release publish review，统一 `/console/releases`、`/console/releases/:id`、`/console/reviews` 与 release review 详情的展示和动作语义，避免继续把多个概念混成一个状态。
- 已完成：
  - 已确认当前 release 正式状态只有 `built / canary / published` 三种
  - 已确认 `pending / approved / rejected / partially_approved / not_submitted` 属于发布审批摘要，不属于 release status
  - 已确认灰度/流量状态应单独建模和展示，不应继续借用 release badge
  - 已确认审核中心中的 release publish review 也要按同一规则收口，不能继续保留旧的混合状态摘要
  - 已输出方案文档：
    - `docs/archive/2026-04-17-v1早期基线与已替代设计文档/59-发布中心状态分层与页面收口方案.md`
    - `docs/archive/2026-04-17-v1早期基线与已替代设计文档/60-JOB-022发布中心状态分层与页面收口实施拆解与验收标准.md`
    - `docs/archive/2026-04-17-v1早期基线与已替代设计文档/61-发布中心状态分层文档索引.md`
  - 已在 `console-service` 收口 release list/detail 与 release review target summary 的三层状态聚合
  - 已在 `/console/releases` 中拆开版本状态、发布审批、流量状态与门禁展示
  - 已在 `/console/releases/:id` 中新增“版本状态 / 发布审批 / 流量状态”三块主区，并收口动作区判断逻辑
  - 已在 `/console/reviews` 与 release review 详情中同步接入同一套三层状态语义
  - 已更新 `docs/archive/2026-04-17-v1早期基线与已替代设计文档/12-原型实现与当前能力.md`、`docs/archive/2026-04-17-v1早期基线与已替代设计文档/18-后台管理系统首批接口清单与字段定义.md`
  - 已完成回归：
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- 后续要做：
  - 当前批次无继续动作
  - 若后续再收到发布中心 / 审核中心中的 release 状态扩展需求，按新批次重开，不复用 `JOB-022`
- 依赖 / 风险：
  - 若继续让 release status、approval status、traffic status 混在一个 badge 或一个摘要块中，发布中心与审核中心都会持续让用户误判“是否可发布、是否已灰度、是否已审批”
  - 若在本批同时引入数据库 schema 变更、多环境版本矩阵或灰度模型升级，范围会明显失控
- 完成标准：
  - release list 已分层展示版本状态、审批状态、流量状态
  - release detail 已分成“版本状态 / 发布审批 / 流量状态”三个主区块
  - 审核中心中的 release publish review 列表与详情也已按相同语义收口
  - release 正式状态仍只保留 `built / canary / published`
  - 动作区可见性与禁用态和分层语义一致
  - `smoke:console` / `test:console` / `test:unit` 通过
- 关键文档：
  - [59-发布中心状态分层与页面收口方案](./archive/2026-04-17-v1早期基线与已替代设计文档/59-发布中心状态分层与页面收口方案.md)
  - [60-JOB-022发布中心状态分层与页面收口实施拆解与验收标准](./archive/2026-04-17-v1早期基线与已替代设计文档/60-JOB-022发布中心状态分层与页面收口实施拆解与验收标准.md)

子任务 checklist：

- [x] 明确 release status / approval status / traffic status 三层边界
- [x] 输出状态分层方案文档
- [x] 输出实施拆解与验收标准文档
- [x] 输出发布中心状态分层文档索引
- [x] 在单一真源中挂出 `JOB-022`
- [x] 确认审核中心中的 release publish review 也纳入本批范围
- [x] `T02` 收口 release list/detail 与 release review target summary 的后端状态聚合结构
- [x] `T03` 收口 `/console/releases` 列表页展示
- [x] `T04` 收口 `/console/releases/:id` 详情页结构
- [x] `T05` 收口发布/灰度/审核动作区与审核中心 release review 展示逻辑
- [x] `T06` 补 `console-read` / `console-api` / `console-workflows` 回归
- [x] `T07` 更新相关文档并完成关单回归

### JOB-023 控制台整体信息架构与治理重构

- 当前负责人：Codex
- 最近更新时间：`2026-04-08`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  围绕当前 `/console` 做一次系统级重构，统一主数据管理、内容审核、版本发布、系统管理四条主线，并同步完成中文化、术语统一、业务属性配置化、RBAC/治理策略配置化以及编码规范收口。
- 已完成：
  - 已完成一级导航目录树、二级目录折叠与 breadcrumb 归口
  - 已完成业务属性配置模型，以及词条中心 / 导入中心统一消费
  - 已完成内容审核收口，release publish review 已迁入发布中心内部流程
  - 已完成发布中心生命周期收口：`built` 候选快照、`canary` 灰度、`published` 正式版与“发布后风险”已分离表达
  - 已完成系统管理归口：节点备案、运行节点、运行验证工具、用户管理、角色管理、权限分配、治理策略
  - 已完成 RBAC 与治理策略配置化，用户 / 角色 / 权限与发布治理规则不再依赖散落硬编码
  - 已完成主文案中文化、关键术语统一与新增函数注释规范收口
  - 已完成 `smoke:console`、`test:console`、`test:unit` 全量回归
- 后续要做：
  - 当前批次无继续动作
- 收尾要求：
  - 一级导航已重组为总览 / 主数据管理 / 内容审核 / 版本发布 / 样本与验证 / 系统管理 / 帮助
  - 词条中心与导入中心已归口到主数据管理
  - 审核中心只保留内容审核，release publish review 已迁入发布中心
  - 发布中心已清晰表达 build / canary / published / 发布后风险
  - 节点备案与运行节点已归口到系统管理
  - 用户、角色、权限、治理策略已配置化
  - 页面主文案中文化，跨中心术语已统一
  - 新增函数均有“作用 / 输入 / 输出”注释
  - 不再新增散落硬编码
- 完成标准：
  - `docs/63` 中 checklist 全部完成
  - `smoke:console` / `test:console` / `test:unit` 通过
  - 文档和单一真源已同步

子任务 checklist：

- [x] 输出系统级重构方案文档
- [x] 输出实施拆解与收尾标准文档
- [x] 输出索引文档
- [x] 在单一真源中挂出 `JOB-023`
- [x] `T02-A` 重构一级导航与 route family
- [x] `T02-B` 重构二级入口归口与 breadcrumb
- [x] `T02-C` 重构 `pageFeature` / `pageKey` / `pageAccess` 归口
- [x] `T03-A` 统一“业务属性”术语，替换前台“类别编码 / 业务属性”混用
- [x] `T03-B` 新增业务属性配置模型与配置种子入口
- [x] `T03-C` 词条中心统一消费业务属性配置
- [x] `T03-D` 导入中心统一消费业务属性配置
- [x] `T03-E` 新增“业务属性配置”管理页
- [x] `T04-A` 审核中心主列表只保留词条审核与拼音审核
- [x] `T04-B` release publish review 迁入发布中心内部流程
- [x] `T04-C` 词条审核动作前补“本步目的 / 下一步”提示
- [x] `T04-D` 拼音候选审核动作前补“本步目的 / 下一步”提示
- [x] `T05-A` 明确 `built` 为候选快照状态，不受 gate 阻断
- [x] `T05-B` 把 gate 定义为 `built/canary` 升级前置条件
- [x] `T05-C` 把已发布后的异常改名为“发布后风险”
- [x] `T05-D` 重构发布中心动作引导和生命周期说明
- [x] `T05-E` 单独定义回滚逻辑的可见性与提示
- [x] `T06-A` 合并节点备案与运行节点到系统管理入口
- [x] `T06-B` 重整运行验证工具入口位置
- [x] `T06-C` 新增系统管理首页或二级导航骨架
- [x] `T07-A` 设计用户、角色、权限配置模型
- [x] `T07-B` 设计治理策略模型
- [x] `T07-C` 设计配置种子文件与初始化逻辑
- [x] `T07-D` 新增用户、角色、权限、治理策略管理页
- [x] `T07-E` 把发布/审批分离、双人审批等规则改成可配置策略
- [x] `T08-A` 输出统一术语清单
- [x] `T08-B` 完成主文案中文化
- [x] `T08-C` 完成术语映射配置化
- [x] `T08-D` 确保新增函数都有规范注释
- [x] `T09-A` 补齐主链路单测
- [x] `T09-B` 补齐 console workflow 回归
- [x] `T09-C` 同步关键文档并完成关单回归

### JOB-024 `v1.0` R1 运行治理域重构

- 当前负责人：Codex
- 最近更新时间：`2026-04-08`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  以已备案节点为主对象重建运行治理域，统一节点备案、运行节点、运行验证和节点部署帮助。
- 已完成：
  - 已新增 `/console/runtime` 运行治理落点页，并将节点备案、运行节点、运行验证从系统管理中分离归口
  - 已重构运行节点主列表 read model，只展示备案节点；未备案 runtime 改为单独异常接入事件
  - 已重构运行节点详情 read model，分离备案状态、注册状态、实时状态、目标状态、最近动作和历史异常
  - 已重构节点备案页，补齐部署与注册说明、runtime token 提示和未备案接入事件提示
  - 已补 runtime 相关页面与流程文档：
    - 运行治理首页
    - 节点备案
    - 运行节点
    - 运行验证
    - 节点接入流程
    - 节点未注册排查
    - `registration-secret` / 指纹 / token 说明
  - 已完成回归：
    - `runtime-node-registry.test.js`
    - `runtime-nodes.test.js`
    - `console-read.test.js`
    - `console-api.test.js`
    - `console-workflows.test.js`
    - `smoke:console`
    - `test:console`
    - `test:unit`
- 完成标准：
  - 运行节点中心主列表只展示已备案节点
  - 已备案未注册节点在主列表中可见且状态明确
  - 未备案 runtime 不再进入主列表
  - 节点详情页不再混读实时状态和历史状态
  - 节点部署说明、token、secret、指纹说明清晰
  - 运行治理相关回归通过
- 关键文档：
  - [72-v1.0重构原则定稿版](./archive/2026-04-17-v1早期基线与已替代设计文档/72-v1.0重构原则定稿版.md)
  - [77-R1运行治理域重构实施拆解草案](./archive/2026-04-17-v1早期基线与已替代设计文档/77-R1运行治理域重构实施拆解草案.md)

子任务 checklist：

- [x] 明确运行治理域主对象是已备案节点
- [x] 明确未备案 runtime 不进入主列表
- [x] 收口运行节点主列表 read model
- [x] 收口运行节点详情 read model
- [x] 收口部署提示 contract
- [x] 重构节点备案页
- [x] 重构运行节点中心列表
- [x] 重构运行节点详情页
- [x] 补节点接入流程帮助与排查帮助
- [x] 补运行治理相关回归

### JOB-025 `v1.0` R2 版本发布域重构

- 当前负责人：Codex
- 最近更新时间：`2026-04-08`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  重建 release 生命周期视图，清晰表达 build、发布审核、灰度发布、正式发布、回滚和发布后风险。
- 已完成：
  - 已把 release 前置校验切到“基于当前 release 快照”的版本校验，不再把当前主数据状态反向当作已构建 release 的 gate
  - 已在 release 列表读模型中补齐：
    - `releaseState`
    - `approval`
    - `traffic`
    - `releaseCheck`
    - `postPublishRisk`
  - 已在 release 详情中补齐：
    - 版本校验
    - 发布后风险
    - 回滚记录
  - 已将版本列表和详情页收口为生命周期视图，不再把审批、流量、风险和版本状态混成一个 badge
  - 已补发布域帮助文档：
    - 版本列表
    - 发布审核
    - 灰度发布
    - 发布后风险
    - 回滚记录
    - 发布生命周期流程
    - 回滚流程
    - 版本校验未通过排查
    - 发布后风险排查
  - 已完成回归：
    - `release-gates.test.js`
    - `console-read.test.js`
    - `console-api.test.js`
    - `console-workflows.test.js`
    - `smoke:console`
    - `test:console`
    - `test:unit`
- 完成标准：
  - release 生命周期语义彻底分层
  - `built` 之后不再被主数据 gate 反向阻断
  - 发布、灰度、回滚和发布后风险不再混读
  - 发布域帮助与流程说明齐全
  - 发布域相关回归通过

子任务 checklist：

- [x] 明确 release 正式状态只保留 `built / canary / published`
- [x] 明确 `built` 为候选快照状态
- [x] 明确 `gate` 只作为升级前置条件
- [x] 明确 `published` 后的问题统一叫“发布后风险”
- [x] 明确 rollback 是动作，不是新的 release 状态
- [x] 收口版本列表 read model
- [x] 收口版本详情 read model
- [x] 收口发布审核摘要模型
- [x] 收口版本校验模型
- [x] 收口发布后风险模型
- [x] 收口灰度摘要模型
- [x] 收口回滚记录模型
- [x] 重构版本列表页
- [x] 重构版本详情页
- [x] 补发布中心页面帮助
- [x] 补发布 / 灰度 / 回滚流程帮助
- [x] 补发布域相关回归

### JOB-026 `v1.0` R3 主数据域重构

- 当前负责人：Codex
- 最近更新时间：`2026-04-08`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  重建主数据域页面与读模型，统一词条、批量导入、业务属性和样本与回流的职责边界。
- 已完成：
  - 已把样本与回流从独立“样本与验证”归口回主数据导航和 breadcrumb
  - 已把业务属性保留在主数据域入口，不再在系统配置首页作为主配置入口展示
  - 已收口词条列表读模型，去掉主列表里的 release 状态表达，页面优先显示主数据状态、审核状态和风险等级
  - 已收口词条详情主文案，不再把 release 影响放在主阅读区域
  - 已把样本与回流页和详情页的主文案改成主数据域口径，强调它们服务于后续版本校验，而不是当前 release
  - 已补主数据域帮助文档：
    - 词条
    - 批量导入
    - 业务属性
    - 样本与回流
    - 主数据录入到进入发布输入池流程
  - 已完成回归：
    - `console-read.test.js`
    - `console-api.test.js`
    - `console-workflows.test.js`
    - `import-jobs.test.js`
    - `term-admission.test.js`
    - `system-management.test.js`
    - `smoke:console`
    - `test:console`
    - `test:unit`
- 完成标准：
  - 词条、导入、业务属性、样本与回流都已清晰归入主数据域
  - 页面和接口不再混读 release 语义
  - 主数据域帮助和流程说明齐全
  - 主数据域相关回归通过

子任务 checklist：

- [x] 明确词条、导入、业务属性、样本与回流都属于主数据域
- [x] 明确主数据与 release 完全解耦
- [x] 明确样本与回流在主数据域中的定位
- [x] 明确业务属性作为统一配置对象
- [x] 收口词条列表与详情 read model
- [x] 收口导入列表与详情 read model
- [x] 收口业务属性配置 read/write model
- [x] 收口样本与回流 read model
- [x] 收口主数据与审核关联摘要模型
- [x] 重构词条中心页面骨架
- [x] 重构导入中心页面骨架
- [x] 重构业务属性配置页
- [x] 重构样本与回流页面归口
- [x] 补词条 / 导入 / 业务属性 / 样本页帮助
- [x] 补主数据流程帮助
- [x] 补主数据域相关回归

### JOB-027 `v1.0` R4 系统配置域重构

- 当前负责人：Codex
- 最近更新时间：`2026-04-08`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  把系统治理相关能力统一收口到系统配置域。
- 已完成：
  - 已明确用户、角色、权限、治理策略全部归口到系统配置域
  - 已确认当前持久化仍采用统一配置文件：
    - `prototype/config/access_control.json`
    - `prototype/config/governance_policies.json`
  - 已收口系统配置页边界说明：
    - 权限回答“能不能做”
    - 治理策略回答“在什么条件下允许做”
  - 已补系统配置域帮助文档：
    - 用户
    - 角色
    - 权限
    - 治理策略
    - 权限 vs 治理策略边界说明
  - 已完成回归：
    - `system-management.test.js`
    - `console-api.test.js`
    - `console-read.test.js`
    - `smoke:console`
    - `test:console`
    - `test:unit`
- 完成标准：
  - 用户、角色、权限、治理策略全部清晰归口到系统配置域
  - 配置文件持久化与管理页行为一致
  - RBAC 与治理策略边界清楚
  - 系统配置域相关回归通过

子任务 checklist：

- [x] 明确用户、角色、权限、治理策略归属系统配置域
- [x] 明确 RBAC 与治理策略边界
- [x] 明确当前持久化采用统一配置文件
- [x] 收口用户配置读写模型
- [x] 收口角色配置读写模型
- [x] 收口权限映射读模型
- [x] 收口治理策略读写模型
- [x] 明确治理策略对发布链的作用点
- [x] 重构用户页
- [x] 重构角色页
- [x] 重构权限页
- [x] 重构治理策略页
- [x] 补系统配置页帮助
- [x] 补权限与治理策略关系说明手册
- [x] 补系统配置域相关回归

### JOB-028 `v1.0` R5 帮助域与接口文档体系

- 当前负责人：Codex
- 最近更新时间：`2026-04-08`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  建立页面帮助、流程帮助、运维帮助、排障帮助，以及 runtime/admin/console 接口帮助。
- 已完成：
  - 已新增 `prototype/config/console_help.json` 作为帮助中心目录和 slug 的唯一配置源
  - 已重写 `prototype/src/lib/console-help.js`，帮助 API 改为按配置读取并返回 Markdown 正文
  - 已让帮助中心首页按分组展示帮助内容
  - 已补齐页面手册、流程手册、部署手册、接口手册和排障手册基础文档
  - 已补帮助域回归：
    - `console-api.test.js`
    - `console-help-api.test.js`
    - `template-assets-docs.test.js`
    - `project-management-docs.test.js`
    - `smoke:console`
    - `test:console`
    - `test:unit`
- 完成标准：
  - 在线帮助手册可直接覆盖页面、流程、运维、排障和接口说明
  - 帮助中心目录与帮助内容体系一致
  - 相关回归通过

子任务 checklist：

- [x] 补工作台帮助
- [x] 补主数据域页面帮助
- [x] 补内容审核页帮助
- [x] 补版本发布页帮助
- [x] 补运行治理页帮助
- [x] 补系统配置页帮助
- [x] 补主数据录入到发布流程手册
- [x] 补内容审核流程手册
- [x] 补发布 / 灰度 / 正式发布 / 回滚流程手册
- [x] 补节点备案到 runtime 接入流程手册
- [x] 补运行验证流程手册
- [x] 补 admin 启动与部署手册
- [x] 补 runtime 启动与部署手册
- [x] 补多 runtime 实例部署手册
- [x] 补 `registration-secret` / 指纹说明
- [x] 补 `ACDP_RUNTIME_TOKEN` 说明
- [x] 补节点启动成功但未注册排查
- [x] 补发布失败与发布后风险排查
- [x] 补 runtime 对外 HTTP / WebSocket 接口帮助
- [x] 补 admin / console 管理接口帮助
- [x] 补帮助域相关回归

### JOB-029 `v1.0` R6 工作台重构

- 当前负责人：Codex
- 最近更新时间：`2026-04-08`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  在前 5 个域稳定后，重做工作台首页。
- 已完成：
  - 已把首页标题和主文案切到工作台语义
  - 已明确首页只保留：
    - 稳定摘要卡
    - 当前值守重点
    - 待办工作
    - 风险提醒
    - 快速入口
  - 已移除首页中会继续膨胀的运行验证入口卡，不再让首页承担运行验证说明
  - 已把工作台高亮与风险文案切到更准确的“版本校验 / 风险提醒”口径
  - 已补工作台使用说明文档并接入帮助配置
  - 已完成回归：
    - `console-read.test.js`
    - `console-workflows.test.js`
    - `console-api.test.js`
    - `console-help-api.test.js`
    - `smoke:console`
    - `test:console`
    - `test:unit`
- 完成标准：
  - 工作台只读稳定聚合结果
  - 工作台不再承担跨域解释
  - 工作台帮助齐全
  - 工作台相关回归通过

子任务 checklist：

- [x] 定义工作台只读聚合边界
- [x] 明确工作台不再承担跨域兜底解释
- [x] 明确工作台摘要项来源
- [x] 明确工作台待办项来源
- [x] 明确工作台风险项来源
- [x] 重构工作台布局
- [x] 重构工作台摘要卡
- [x] 重构待办区
- [x] 重构风险提醒区
- [x] 收口快速入口
- [x] 补工作台页面帮助
- [x] 补工作台使用说明
- [x] 补工作台相关回归

### JOB-030 `v1.0` R7 真实环境验证与发布准备

- 当前负责人：待定测试/运维负责人
- 最近更新时间：`2026-04-08`
- 外部依赖：`JOB-006`、`JOB-009`
- 是否可关闭：否
- 目标：
  为正式 `v1.0` 发布准备 go / no-go 证据。
- 当前状态：
  - 已完成本地可提前准备的发布文档：发布手册、回滚手册、发布说明模板、go / no-go 清单模板
  - 已确认 `JOB-007` 默认延期到 `v1.1`，不作为 `v1.0` 硬门槛
  - 当前剩余工作依赖 `JOB-006` 与 `JOB-009`
  - 在真实集群和真实宿主机条件准备完成前保持 blocked
- 完成标准：
  - 真实部署验证完成
  - 真实并发与吞吐验证完成
  - 发布与回滚手册齐全
  - go / no-go 清单齐全
  - 发布前最终回归通过

子任务 checklist：

- [ ] 完成 `JOB-006`
- [ ] 完成 `JOB-009`
- [x] 明确 `JOB-007` 是否延期到 `v1.1`
- [ ] 形成真实部署验证证据
- [ ] 形成真实吞吐验证证据
- [x] 发布手册收口
- [x] 回滚手册收口
- [x] 发布说明模板准备完成
- [x] go / no-go 清单收口
- [ ] `smoke:console`
- [ ] `test:console`
- [ ] `test:unit`
- [ ] 发布前最终核查通过

### JOB-031 `v1.0` 控制台导航、标题与中文化最终收口

- 当前负责人：Codex
- 最近更新时间：`2026-04-09`
- 外部依赖：当前 `/console` 过渡态代码与 UI 规范基线文档
- 是否可关闭：是
- 目标：
  把当前 `/console` 中仍保留的旧命名、英文品牌和过渡态文案统一收口到 `v1.0` 最终口径。
- 本轮完成：
  - 左侧一级、二级导航已切到 `工作台 / 主数据 / 内容审核 / 版本发布 / 运行治理 / 系统配置 / 帮助` 口径
  - 页面标题、breadcrumb、壳层品牌和主要英文 kicker 已收口
  - `admin-auth` 页面标题元数据已与最终口径对齐
  - `docs/21` / `docs/70` / `docs/71` / `docs/113` 已同步
  - 已形成 `JOB-090` 回归批次：
    - `prototype/workspace/test_runs/2026-04-09T07-25-07Z_job090_batch-03_job031-regression/summary.json`
    - `prototype/workspace/test_runs/2026-04-09T07-25-07Z_job090_batch-03_job031-regression/report.md`
- 完成标准：
  - 导航、页面标题、breadcrumb、品牌与帮助目录全部统一到 `v1.0` 最终口径
  - 不再保留明显的旧命名和英文主文案
  - `test:unit` / `test:console` / `smoke:console` 通过

子任务 checklist：

- [x] 左侧一级导航名称全部切到最终口径
- [x] 左侧二级目录名称全部切到最终口径
- [x] 页面标题全部切到最终口径
- [x] breadcrumb 全部切到最终口径
- [x] 顶部品牌和壳层标题全部中文化
- [x] 去掉无必要英文 kicker
- [x] 更新 `docs/21` / `docs/70` / `docs/71` / `docs/113`
- [x] `test:unit`
- [x] `test:console`
- [x] `smoke:console`

### JOB-032 `v1.0` 控制台页面职责与二级工作页最终收口

- 当前负责人：Codex
- 最近更新时间：`2026-04-09`
- 外部依赖：当前页面骨架与页面线框/映射基线文档
- 是否可关闭：是
- 目标：
  把当前仍属于“可复用但需重构”的关键页面收口到 `v1.0` 成品边界。
- 本轮完成：
  - `/console/reviews` 已固定为 `view=terms|pinyin` 两个显性工作视图
  - `/console/releases` 已固定为 `view=list|review|canary|risk|rollback` 五个显性工作视图
  - `/console/help` 已固定为 5 类帮助分组，并支持 `pageGroup=*` 进入分组视图
  - `/console/system` 已收口为系统配置工作台，不再是泛入口页
  - 已形成 `JOB-090` 回归批次：
    - `prototype/workspace/test_runs/2026-04-09T07-45-00Z_job090_batch-04_job032-regression/summary.json`
    - `prototype/workspace/test_runs/2026-04-09T07-45-00Z_job090_batch-04_job032-regression/report.md`
- 完成标准：
  - 内容审核、版本发布、帮助、系统配置不再是泛入口页
  - 主要二级工作页职责清晰
  - 页面内引导与真实操作路径一致
  - `test:unit` / `test:console` / `smoke:console` 通过

子任务 checklist：

- [x] `/console/reviews` 显性收口到词条审核 / 拼音审核视图
- [x] `/console/releases` 显性收口到版本列表 / 发布审核 / 灰度发布 / 发布后风险 / 回滚记录结构
- [x] `release detail` 继续去掉过度堆叠职责
- [x] `/console/help` 首页分组收口
- [x] `/console/help/:slug` 单篇帮助页结构收口
- [x] `/console/system` 收口为系统配置工作台
- [x] `test:unit`
- [x] `test:console`
- [x] `smoke:console`

### JOB-033 `v1.0` 控制台帮助入口与页面内引导最终收口

- 当前负责人：Codex
- 最近更新时间：`2026-04-09`
- 外部依赖：帮助配置、帮助文档目录和现有页面入口
- 是否可关闭：是
- 目标：
  把当前“有帮助文档，但页面内不够成品化”的部分收口到 `v1.0` 最终可交付状态。
- 本轮完成：
  - 工作台、主数据、内容审核、版本发布、运行治理、系统配置页已补齐页面内帮助入口
  - 关键页面已补统一“下一步去哪”说明和高风险动作前置说明
  - 帮助首页已固定为 5 类分组，并支持 `pageGroup=*` 直达
  - 单篇帮助页的 breadcrumb、文档类型和返回路径已收口
  - 已形成 `JOB-090` 总复核批次：
    - `prototype/workspace/test_runs/2026-04-09T08-05-00Z_job090_batch-05_console-final-review/summary.json`
    - `prototype/workspace/test_runs/2026-04-09T08-05-00Z_job090_batch-05_console-final-review/report.md`
- 完成标准：
  - 页面内帮助入口完整
  - 关键页面的下一步引导清晰
  - 帮助配置、帮助文档、页面入口三者一致
  - `console-help-api.test.js` / `template-assets-docs.test.js` / `test:unit` / `smoke:console` 通过

子任务 checklist：

- [x] 工作台补最终帮助入口
- [x] 主数据各页补最终帮助入口
- [x] 内容审核页补最终帮助入口
- [x] 版本发布页补最终帮助入口
- [x] 运行治理页补最终帮助入口
- [x] 系统配置页补最终帮助入口
- [x] 统一“本页作用 / 下一步去哪 / 关键按钮说明”
- [x] 帮助首页分组最终收口
- [x] 单篇帮助页结构最终收口
- [x] `console_help.json` 与页面入口一致性回归
- [x] `console-help-api.test.js`
- [x] `template-assets-docs.test.js`
- [x] `test:unit`
- [x] `smoke:console`

### JOB-034 `v1.0` 词条审核批量审核能力补齐

- 当前负责人：Codex
- 最近更新时间：`2026-04-13`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  为 `term_review` 增加安全可落地的批量审核能力，优先打通“CSV 导入 -> 生成审核任务 -> 批量审核 -> 进入 build 输入池”的高频闭环。
- 本轮完成：
  - 已在 `GET /api/console/reviews` 中增加 `importJobId` 过滤，并返回 `importJobContext`
  - 已新增 `POST /api/console/reviews/batch-approve`
  - 已新增 `POST /api/console/reviews/batch-reject`
  - 已新增 `reviews.bulk.approve / reviews.bulk.reject` 页面功能点
  - 已在 `词条审核` 视图补齐勾选框、批量操作条、二次确认与处理汇总 flash
  - 已在导入批次详情页补“前往词条审核本批任务”入口
  - 已同步更新帮助文档、能力文档和接口文档
  - 已完成回归：
    - `npm run test:unit`
    - `npm run test:console`
    - `npm run smoke:console`
- 完成标准：
  - `词条审核` 页支持批量勾选和批量决策
  - 导入批次详情可以进入“本批任务”的词条审核视图
  - 批量通过 / 驳回只作用于 `term_review`
  - 不存在宽筛选误审全站任务的入口
  - 单条审核与批量审核的状态副作用一致
  - 文档、帮助、单一真源同步

子任务 checklist：

- [x] 明确 `JOB-034` 只覆盖 `term_review`
- [x] 明确批量作用域为 `selected_tasks / import_job`
- [x] 为 `GET /api/console/reviews` 增加 `importJobId`
- [x] 实现按导入批次过滤词条审核任务
- [x] 新增批量通过服务函数
- [x] 新增批量驳回服务函数
- [x] 新增 `POST /api/console/reviews/batch-approve`
- [x] 新增 `POST /api/console/reviews/batch-reject`
- [x] 新增 `reviews.bulk.approve` 页面功能点
- [x] 新增 `reviews.bulk.reject` 页面功能点
- [x] `view=terms` 下补勾选框和批量审核条
- [x] 无 `importJobId` 时隐藏批次作用域
- [x] 导入批次详情补“前往词条审核本批任务”入口
- [x] 更新 `词条审核` 和 `批量导入` 帮助文档
- [x] 更新接口文档和当前能力文档
- [x] 补服务层、接口层、console 链路回归
- [x] `npm run test:unit`
- [x] `npm run test:console`
- [x] `npm run smoke:console`

### JOB-035 `v1.0` 词典建设域与验证回流域重构

- 当前负责人：Codex
- 最近更新时间：`2026-04-13`
- 外部依赖：无新增外部依赖；基于当前 `terms / import jobs / review tasks / business properties / validation cases` 代码基线落地
- 是否可关闭：是
- 目标：
  按 `131`~`134` 文档冻结口径，把现有主数据域重构为“词典建设 / 验证与回流”两个清晰业务域，并让手工创建与 CSV 导入共用同一套 `taskId` 审核逻辑。
- 本轮完成：
  - 已将页面主路由切换到：
    - `/console/dictionary/terms`
    - `/console/dictionary/import-jobs`
    - `/console/dictionary/reviews`
    - `/console/dictionary/config`
    - `/console/validation/cases`
  - 已将主接口切换到：
    - `/api/console/dictionary/terms*`
    - `/api/console/dictionary/import-jobs*`
    - `/api/console/dictionary/reviews*`
    - `/api/console/dictionary-config/business-attributes*`
    - `/api/console/dictionary-config/source-types*`
    - `/api/console/validation/cases*`
  - 已保留旧接口/旧页面短期兼容别名，避免存量测试和调用立即断裂
  - 已新增 `prototype/config/source_types.json` 与 `prototype/src/lib/source-types.js`
  - 已将 `业务属性 / 来源类型` 收口到 `词典建设 -> 基础配置` 单页双区块
  - 已补 `businessAttributeCode / sourceTypeCode / importJobId / sourceMode` 读模型字段
  - 已把手工提交审核与 CSV 导入生成审核任务统一收口到 `taskId`，并在 `review targetSnapshot` 中持久化：
    - `sourceContext`
    - `admissionSummary`
    - `conflictSummary`
  - 已把冲突固定为：
    - `exact_match_existing`
    - `alias_conflict`
    - `attribute_invalid`
    - `source_type_invalid`
  - 已把 `exact_match_existing` 收口为“更新现有词条”的审核语义
  - 已把验证样本来源类型接入统一配置校验，并按 `validation` 域过滤消费
  - 已同步更新 `admin-auth.js`、`admin-surface.js`、前端导航、页面帮助与相关测试口径
  - 已完成本轮 `JOB-090` 本地回归：
    - `npm run test:unit`
    - `npm run test:console`
    - `npm run smoke:console`
- 完成标准：
  - `词典建设` 与 `验证与回流` 的对象边界不再混淆
  - 手工创建与 CSV 导入共用同一套 `taskId` 审核逻辑
  - `业务属性 / 来源类型` 配置化并按域消费
  - 冲突在录入阶段识别，在审核阶段展示
  - 页面与 API 路由切到目标口径
  - 用户、角色、权限配置与页面能力保持一致
  - 文档、帮助和真源同步

子任务 checklist：

- [x] 收口 `词典建设 / 验证与回流` 页面与帮助命名
- [x] 收口 `businessAttributeCode / sourceTypeCode / taskId / importJobId / sourceMode`
- [x] 首批直接切换页面路由到 `dictionary/*` 与 `validation/*`
- [x] 首批直接切换 API 路由到 `dictionary/*` 与 `dictionary-config/*`
- [x] 重构 `词典记录` 页面，保留“保存草稿 -> 提交审核”两步
- [x] 重构 `批量导入` 页面，只承接词典建设域导入
- [x] 重构 `词典审核` 页面，固定三种视图
- [x] 重构 `基础配置` 页面，页内承接“业务属性配置 / 来源类型配置”两块
- [x] 补齐 `来源类型配置` 模型与接口
- [x] 同步 `admin-auth.js` / `admin-surface.js` / `access_control.json` 的用户、角色、权限配置映射
- [x] 收口手工创建与 CSV 导入共用的冲突识别引擎
- [x] 固定四类冲突：`exact_match_existing / alias_conflict / attribute_invalid / source_type_invalid`
- [x] 将 `exact_match_existing` 收口为“更新现有词条”任务语义
- [x] 在审核详情中展示来源、业务属性、`importJobId`、前后快照和冲突摘要
- [x] 将验证样本页从词典建设域语义中剥离
- [x] 更新帮助文档、接口文档和能力说明
- [x] `npm run test:unit`
- [x] `npm run test:console`
- [x] `npm run smoke:console`
- [x] `npm run pm:sync`
- [x] `npm run pm:check`

### JOB-036 `admin_http_signed` runtime 快照下发模式落地

- 当前负责人：Codex
- 最近更新时间：`2026-04-15`
- 外部依赖：无新增外部组件依赖；基于 `JOB-021` 已落地的多 runtime 节点备案与注册治理基线推进
- 是否可关闭：是
- 目标：
  在保留现有 `file / minio` 兼容能力的前提下，新增第三种 runtime 快照下发模式 `admin_http_signed`，使 `1 admin + 1~3 runtime` 在无 MinIO、无共享目录场景下也能完成版本安装。
- 本轮完成：
  - 已在 `artifact_store.config.json` 新增 `runtimeDelivery` 配置段
  - 已在 `config.js` 接入 `runtimeDelivery` 解析、缺省模式推导和 `adminArtifactBaseUrl` 回退逻辑
  - 已在 `artifact-store.js` 新增：
    - `admin_http_signed` URL 生成
    - 下载签名生成与校验
    - 文件名白名单
    - 下载请求校验
  - 已在 `admin-surface.js` 新增：
    - `GET /api/runtime-artifacts/releases/:releaseId/:fileName`
    - 签名、过期、节点备案和文件存在性校验
  - 已让 `platform-db.js` / `runtime control` 视图按节点动态生成 `admin_http_signed` `artifactUrl`
  - 已保持 runtime 安装主流程不改，只复用现有 `http(s)` 下载能力
  - 已扩展验证脚本：
    - `verify-runtime-control`
    - `verify-multi-runtime`
  - 已补齐帮助与运维文档
  - 已同步修正受当前业务属性新旧编码兼容影响的主数据/导入/console 回归基线
- 已完成本轮本地回归（`JOB-090` 支撑证据）：
  - `npm run test:unit`
  - `npm run test:console`
  - `npm run smoke:console`
- 完成标准：
  - `runtimeDelivery.mode` 已正式接入
  - `file / admin_http_signed / minio` 三种模式边界明确
  - `admin_http_signed` 在无 MinIO、无共享目录场景下可完成安装
  - 至少完成一轮 `1 admin + 2 runtime` 验证脚本支持
  - 单元测试、接口测试、集成验证通过
  - 运维文档、帮助文档、真源同步完成

子任务 checklist：

- [x] `T01-A` 新增 `runtimeDelivery` 配置段
- [x] `T01-B` 在 `config.js` 接入 `runtimeDelivery`
- [x] `T01-C` 验证老配置兼容
- [x] `T02-A` 新增签名与校验辅助函数
- [x] `T02-B` 新增 admin 运行快照下载路由
- [x] `T02-C` 固定下载失败错误码
- [x] `T03-A` 让 `artifactMetadata` 按模式生成 URL
- [x] `T03-B` 改为按节点动态生成 `admin_http_signed` URL
- [x] `T03-C` 保持带过期时间 URL 的动态刷新
- [x] `T04-A` 保持 runtime 安装主流程稳定
- [x] `T04-B` 收口 `admin_http_signed` 失败日志与错误映射
- [x] `T04-C` 扩展现有验证脚本
- [x] `T05-A` 补配置与签名单元测试
- [x] `T05-B` 补下载接口测试
- [x] `T05-C` 补三模式集成验证
- [x] `T06-A` 更新运维文档
- [x] `T06-B` 更新帮助文档
- [x] `T06-C` 更新页面帮助口径
- [x] `npm run test:unit`
- [x] `npm run test:console`
- [x] `npm run smoke:console`
- [x] `npm run pm:sync`
- [x] `npm run pm:check`

### JOB-037 左侧目录树表现优化

- 当前负责人：Codex
- 最近更新时间：`2026-04-15`
- 外部依赖：无新增外部依赖；基于当前 `/console` 壳层、帮助目录和导航命名基线推进
- 是否可关闭：是
- 目标：
  把当前后台左侧导航从“分组链接列表”进一步收口为“更清晰的目录树”，优化层级感、交互稳定性、收起态可读性和当前页定位，同时为后续配置驱动打基础。
- 本轮完成：
  - 已新增 `prototype/config/console_navigation.json` 作为左侧导航数据源第一版
  - 已新增 `prototype/src/lib/console-navigation.js`，统一读取和渲染导航分组/节点
  - 已让 `/console` 页面入口在服务端按导航配置渲染目录树，不再把整棵树硬写在 `index.html`
  - 已按冻结表完成目录名称同步：
    - `工作台 / 总览`
    - `运行治理 / 总览`
    - `系统管理 / 总览 / 用户管理 / 角色管理 / 权限管理`
  - 已优化左侧视觉层级：
    - 一级目录树根感增强
    - 二级目录树节点感增强
    - 激活分组与激活项更明确
  - 已优化左侧背景色：
    - 底色进一步收口到中性蓝灰，不再出现过深或过浅割裂
    - 与右侧内容区的视觉冲突继续减弱
  - 已优化收起态：
    - 收起后只保留一级目录图标，不再出现残留文字或边框干扰
    - hover / focus 时可显示一级目录名称提示
    - 当前激活分组在收起态仍保留高亮识别
  - 已同步调整系统管理相关页面标题与 breadcrumb 文案
  - 已同步更新现行文档与命名基线文档
  - 已确认本轮左侧导航条功能可封板，后续不再在 `JOB-037` 内继续追加零碎改动
- 完成标准：
  - 左侧目录树层级明显优于当前版本
  - 当前页所在分组与当前项一眼可见
  - 收起态仍保留最小可识别性，且可通过 hover / focus 恢复一级目录可读性
  - 展开 / 折叠行为稳定
  - 左侧背景色不再显得过深、过重
  - 导航结构不再完全依赖硬编码 HTML
  - 文档、真源、回归全部同步

子任务 checklist：

- [x] `T01-A` 梳理当前导航数据结构
- [x] `T01-B` 固定当前路径自动展开规则
- [x] `T01-C` 按冻结表同步目录名称
- [x] `T02-A` 强化一级目录视觉层级
- [x] `T02-B` 强化二级目录树节点层级
- [x] `T02-C` 优化激活态与分组激活态
- [x] `T02-D` 优化左侧背景色与左右分区对比
- [x] `T03-A` 收起态保留最小识别能力
- [x] `T03-B` 收起/展开切换保持稳定
- [x] `T03-C` 收起态文本残留与 hover 提示收口
- [x] `T04-A` 固定一级点击交互语义
- [x] `T04-B` 固定二级点击交互语义
- [x] `T04-C` 清理缓存与自动展开冲突
- [x] `T05-A` 提取导航配置源
- [x] `T05-B` 让 label/path/help slug 同源
- [x] `T06-A` 更新相关 UI/帮助文档
- [x] `T06-B` 补导航渲染/交互回归
- [x] `npm run test:unit`
- [x] `npm run smoke:console`
- [x] `npm run pm:sync`
- [x] `npm run pm:check`
- [x] `T07` 记录封板结论并冻结后续变更口径

### JOB-098 测试/验证工作区历史副产物清理

- 当前负责人：Codex
- 最近更新时间：`2026-04-21`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  只清理 `prototype/workspace-*` 这类测试、验证、调试、contract snapshot 和临时回归副产物，回收磁盘空间，但不改变当前主系统数据底座。
- 本轮完成：
  - 已识别 `prototype/` 目录中体积主要由 `prototype/workspace-*` 撑大，而不是代码或正式配置文件
  - 已确认 `prototype/workspace-*` 总量约 `63G`
  - 已确认主工作区 `prototype/workspace` 与 `prototype/runtime_instances/*/workspace` 不在本 job 清理范围
  - 已执行历史 `workspace-*` 清理，当前 `prototype/` 总量已回落到约 `1.2G`
- 范围边界：
  - 清理对象：`prototype/workspace-*`
  - 不清理：`prototype/workspace`
  - 不清理：`prototype/runtime_instances/*/workspace`
  - 不修改：数据库结构、种子文件、配置文件、代码、文档
- 与 `JOB-099` 的关系：
  - 本 job 对应 `JOB-099` 三步流程中的第一步
  - 它可以独立执行，用于磁盘瘦身
  - 它本身不等于“零数据底座”，也不自动完成主系统清库
- 完成标准：
  - `prototype/workspace-*` 已清空
  - `prototype/workspace` 保持不动
  - `prototype/runtime_instances/*/workspace` 保持不动
  - 已记录清理后的体积变化
- 关键文档：
  - [142-JOB-098测试验证工作区历史副产物清理实施说明](./archive/2026-04-17-v1关闭批次与阶段文档/142-JOB-098测试验证工作区历史副产物清理实施说明.md)
  - [137-JOB-099零数据底座初始化与系统清库实施说明](./archive/2026-04-17-v1关闭批次与阶段文档/137-JOB-099零数据底座初始化与系统清库实施说明.md)

子任务 checklist：

- [x] 识别 `prototype/workspace-*` 的体积占比
- [x] 确认主工作区与实例工作区不在本 job 范围内
- [x] 执行 `prototype/workspace-*` 清理
- [x] 回查剩余目录与体积变化
- [x] 同步 JobList 与文档边界说明

### JOB-099 零数据底座初始化与系统清库

- 当前负责人：Codex
- 最近更新时间：`2026-04-21`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  把当前 ACDP 恢复为真正的“零数据底座”，确保 admin 启动后不会自动回灌默认词条、默认样本或初始 release。
- 三步流程：
  - 第一步：清理 `prototype/workspace-*` 历史测试/验证工作区
  - 第二步：清理 `prototype/runtime_instances/*/workspace` 实例工作区
  - 第三步：清理 `prototype/workspace` 主工作区数据库与运行态，并完成零数据重建
- 与 `JOB-098` 的关系：
  - `JOB-098` 只负责第一步，可单独执行，用于磁盘瘦身
  - `JOB-099` 定义三步全流程，其中第一步可以直接复用 `JOB-098` 结果
  - 只完成第一步，不等于完成零数据底座
- 当前状态说明：
  - `JOB-099` 记录的是一次已经完成的零数据化执行
  - 后续只要重新录入词条、导入批次、创建 release、启动 runtime 实例或执行初始化命令，当前系统就可能再次离开零数据态
  - 因此它是“可重复执行的重置 runbook”，不是“持续保持当前系统为零数据”的永久状态声明
- 备份口径：
  - 执行 `JOB-099` 前，必须备份 1 份主库 `platform.db`
  - 执行 `JOB-099` 前，必须备份 1 份 `prototype/workspace/catalog/seed_terms.json`
  - 执行 `JOB-099` 前，必须备份 1 份 `prototype/config/release_validation_cases.json`
  - 不再把两份大体量主库备份同时保留作为标准动作
  - 当前历史备份文件如已确认无回滚价值，可在文档口径明确后单独清理，不影响 `JOB-099` 作为 runbook 的完整性
- 本轮完成：
  - 已确认 `prototype/src/server.js` 的空库自动回灌依赖 `prototype/workspace/catalog/seed_terms.json`
  - 已确认 `prototype/src/lib/platform-db.js` 的默认样本自动回灌依赖 `prototype/config/release_validation_cases.json`
  - 已完成第一步：清理 `prototype/workspace-*` 历史测试/验证工作区，释放约 `63G` 空间
  - 已完成第二步：清空当时已存在的 `prototype/runtime_instances/*/workspace` 实例工作区
  - 已完成第三步：清空主工作区数据库与运行态目录：`releases / import_jobs / runtime_artifacts / runtime_state / validation_feeds / host_verification / test_runs / release_bundle_preview`
  - 已将 `prototype/workspace/catalog/seed_terms.json` 置为空数组 `[]`
  - 已将 `prototype/config/release_validation_cases.json` 置为空数组 `[]`
  - 已重新建立空表结构，并验证主库关键表计数全部为 `0`
  - 已验证 service 管理脚本下当前无运行中的 `prototype/admin/runtime` 进程
- 完成标准：
  - `prototype/workspace-*` 已清理，或已有 `JOB-098` 执行结果可复用
  - 执行清库前已留存主库、`seed_terms.json`、`release_validation_cases.json` 的备份
  - `terms / aliases / import_jobs / review_tasks / releases / validation_cases / runtime_nodes / runtime_node_registry` 全部为 `0`
  - `seed_terms.json` 与 `release_validation_cases.json` 都是 `[]`
  - 启动 `npm run start:admin` 后，系统仍保持零数据，不会自动回灌默认词条、默认样本和 release
  - 主工作区与 `prototype/runtime_instances/*/workspace` 无历史运行态残留
  - 备份和恢复入口明确
- 注意事项：
  - 后续若执行 `npm run prepare:data`、`npm run bootstrap:db` 或 `npm run setup:prototype`，系统会退出零数据底座并重新生成标准初始化数据
  - 后续若重新启动 runtime 实例，其各自 `workspace` 中也会重新生成本地状态和制品目录
  - 如需恢复标准初始化态，应按 `docs/137` 中记录的标准初始化链路单独执行
- 关键文档：
  - [142-JOB-098测试验证工作区历史副产物清理实施说明](./archive/2026-04-17-v1关闭批次与阶段文档/142-JOB-098测试验证工作区历史副产物清理实施说明.md)
  - [137-JOB-099零数据底座初始化与系统清库实施说明](./archive/2026-04-17-v1关闭批次与阶段文档/137-JOB-099零数据底座初始化与系统清库实施说明.md)

子任务 checklist：

- [x] 识别并执行第一步历史测试/验证工作区清理（可由 `JOB-098` 独立完成）
- [x] 备份当前主库
- [x] 备份 `seed_terms.json`
- [x] 备份 `release_validation_cases.json`
- [x] 识别自动种子回灌入口
- [x] 清空 runtime 实例工作区
- [x] 清空主工作区数据库与运行态目录
- [x] 置空 `seed_terms.json`
- [x] 置空 `release_validation_cases.json`
- [x] 重建空表结构
- [x] 回读关键表计数为 `0`
- [x] 验证 service 处于停止状态
- [x] 新增零数据底座执行说明文档
- [x] 同步索引与真源

### JOB-100 `v1.0` 最终发布包组成与发布包装清理

- 当前负责人：Codex
- 最近更新时间：`2026-04-21`
- 外部依赖：`JOB-030` 发布准备基线、当前镜像与部署资产
- 是否可关闭：是
- 目标：
  在 `v1.0` 正式发布前，把运行制品包、部署交付包、发布证据包边界彻底分清，并完成正式打包清理。
- 本轮完成：
  - 已收紧 `Dockerfile`，补齐 `console/` 并只复制最小帮助文档集合
  - 已收紧 `Dockerfile.admin`，仅复制 `docs/help_manuals` 与 `docs/25`、`docs/26`
  - 已收紧 `Dockerfile.runtime`，去掉 `docs/`、`README.md`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md` 和 `data_sources/`
  - 已更新 `.dockerignore`，排除 `project_management`、`prototype/tests`、交接文档和非必要 `docs`
  - 已新增 `prototype/tests/unit/docker-packaging-boundary.test.js`，锁定打包边界回归
  - 已补齐镜像 tag 规则、部署交付包目录模板和发布说明包文档快照清单：
    - `docs/archive/2026-04-17-v1关闭批次与阶段文档/124-v1.0镜像标签与部署交付包目录模板.md`
    - `docs/archive/2026-04-17-v1关闭批次与阶段文档/125-v1.0发布说明包与文档快照清单.md`
  - 已落仓库模板目录：
    - `release_bundle_templates/deployment_bundle/`
    - `release_bundle_templates/release_notes_bundle/`
  - 已新增 release bundle 生成脚本：
    - `prototype/src/cli/prepare-release-bundle.js`
    - `npm run prepare:release-bundle`
  - 已新增模板与生成回归：
    - `prototype/tests/unit/release-bundle-templates.test.js`
    - `prototype/tests/unit/prepare-release-bundle.test.js`
  - 已在本地成功生成示例交付目录：
    - `prototype/workspace/release_bundle_preview/`
  - 已在外部宿主机完成三条正式镜像构建验证，并留档：
    - `prototype/workspace/job100_docker_build_logs/admin-build.log`
    - `prototype/workspace/job100_docker_build_logs/runtime-build.log`
    - `prototype/workspace/job100_docker_build_logs/prototype-build.log`
  - 已更新 `docs/86-v1.0发布手册.md`、`docs/archive/2026-04-17-v1关闭批次与阶段文档/122-v1.0最终发布包组成与发布包装清理清单.md`、`docs/archive/2026-04-17-v1关闭批次与阶段文档/123-JOB-100最终发布包组成与发布包装清理实施拆解.md` 以及索引文档，使最终发布包边界和交付目录口径一致
  - 已补充真实环境最小交付建议：
    - 不同步整个项目目录
    - 只交付 `acdp-admin` / `acdp-runtime` 镜像与 `release bundle`
    - `acdp-prototype` 仅保留给本地联调或演示一体模式，不作为真实环境最小交付物
    - 推荐拓扑为 `1 admin + N runtime`
    - 推荐下发方式为 `admin_http_signed`
    - 节点需先在 admin 完成人工备案，再部署 runtime 注册接入
  - 已补充最小部署顺序与最小验证命令，确保 `JOB-100` 不只是“边界说明”，也是“最小交付 runbook”入口
  - 已完成本地回归：
    - `node --test --test-concurrency=1 ./prototype/tests/unit/docker-packaging-boundary.test.js`
    - `node --test --test-concurrency=1 ./prototype/tests/unit/release-bundle-templates.test.js`
    - `node --test --test-concurrency=1 ./prototype/tests/unit/prepare-release-bundle.test.js`
    - `npm run prepare:release-bundle -- --version v1.0.0 --release-id rel_demo_001 --image-registry registry.test.local --output-dir ./prototype/workspace/release_bundle_preview`
    - `npm run test:unit`
    - `npm run test:console`
    - `npm run smoke:console`
- 完成标准：
  - 最终发布包三类交付物边界明确
  - 正式镜像不再混入无关过程文档和运行产物
  - 发布证据包结构与 `JOB-030` 收口口径一致
  - admin/runtime/全量镜像构建验证完成
  - 打包相关回归通过
  - 真实环境最小交付口径明确

子任务 checklist：

- [x] 明确运行制品包边界
- [x] 明确部署交付包边界
- [x] 明确发布证据包边界
- [x] 收紧 `Dockerfile.admin`
- [x] 收紧 `Dockerfile.runtime`
- [x] 收紧通用 `Dockerfile`
- [x] 更新 `.dockerignore`
- [x] 明确帮助文档进入正式镜像的范围
- [x] 确认 `SESSION_HANDOFF.md` / `NEXT_STEPS.md` 不进入正式镜像
- [x] 让 `JOB-030` 证据包结构与最终发布包边界一致
- [x] 固定镜像 tag 规则
- [x] 固定部署交付包目录模板
- [x] 固定发布说明包文档快照清单
- [x] 固定部署交付包模板目录
- [x] 固定发布说明包模板目录
- [x] 提供 release bundle 目录生成脚本
- [x] 验证 release bundle 目录生成正常
- [x] 验证 release 制品构建正常
- [x] 验证 admin/runtime/全量镜像构建正常
- [x] 明确真实环境最小交付物清单
- [x] 明确不应同步整个项目目录
- [x] 明确 `acdp-prototype` 非真实环境最小交付物
- [x] 明确 `1 admin + N runtime` 推荐拓扑
- [x] 明确 `admin_http_signed` 推荐下发方式
- [x] 明确 admin 先部署、节点先备案、再部署 runtime 的顺序
- [x] 明确最小验证命令
- [x] `test:unit`
- [x] `test:console`
- [x] `smoke:console`

### JOB-090 `v1.0` 测试体系建设与流水线验证准备

- 当前负责人：Codex / 待定测试与运维协作人
- 最近更新时间：`2026-04-09`
- 外部依赖：进入 `L4 ~ L6` 时仍依赖真实部署与压测环境；当前第一阶段本地测试执行无额外外部依赖
- 是否可关闭：否
- 目标：
  在已有测试体系准备文档基础上，先由 Codex 主导执行第一阶段 `L0 ~ L3` 本地流水线测试，形成首轮测试报告、缺陷结论与回流基线；后续再视情况进入 `L4 ~ L6`。
- 已完成：
  - 已输出测试总方案：
    - [90-v1.0测试目标与Codex主导测试总方案](./90-v1.0测试目标与Codex主导测试总方案.md)
  - 已输出实施拆解基线：
    - [91-JOB-090测试体系建设与流水线验证实施拆解草案](./91-JOB-090测试体系建设与流水线验证实施拆解草案.md)
  - 已输出测试数据与资源准备清单：
    - [92-v1.0测试数据与资源准备清单](./92-v1.0测试数据与资源准备清单.md)
  - 已输出测试文档索引：
    - [93-v1.0测试文档索引](./93-v1.0测试文档索引.md)
  - 已输出测试流水线与 Codex 协作闭环方案：
    - [94-v1.0测试流水线与Codex协作闭环方案](./94-v1.0测试流水线与Codex协作闭环方案.md)
  - 已输出测试覆盖矩阵与缺口盘点：
    - [95-v1.0测试覆盖矩阵与缺口盘点](./95-v1.0测试覆盖矩阵与缺口盘点.md)
  - 已输出测试报告与缺陷回流模板：
    - [96-v1.0测试报告模板与缺陷回流模板](./96-v1.0测试报告模板与缺陷回流模板.md)
  - 已输出外部条件测试 runbook：
    - [97-JOB-090外部条件测试runbook草案](./97-JOB-090外部条件测试runbook草案.md)
  - 已固定测试结果归档目录与命名规范：
    - [98-v1.0测试结果归档目录与命名规范](./98-v1.0测试结果归档目录与命名规范.md)
  - 已固定测试执行顺序与域级 owner 建议：
    - [99-v1.0测试执行顺序与域级owner建议](./99-v1.0测试执行顺序与域级owner建议.md)
  - 已输出第一轮测试缺口补齐清单：
    - [100-v1.0第一轮测试缺口补齐清单](./100-v1.0第一轮测试缺口补齐清单.md)
  - 已输出测试执行总入口与批次命名规范：
    - [101-JOB-090测试执行总入口与批次命名规范](./101-JOB-090测试执行总入口与批次命名规范.md)
  - 已输出测试账号与角色矩阵：
    - [102-v1.0测试账号与角色矩阵](./102-v1.0测试账号与角色矩阵.md)
  - 已输出测试样本与导入资产清单：
    - [103-v1.0测试样本与导入资产清单](./103-v1.0测试样本与导入资产清单.md)
  - 已输出真实环境与工具授权准备清单：
    - [104-v1.0真实环境与工具授权准备清单](./104-v1.0真实环境与工具授权准备清单.md)
  - 已输出 `JOB-006 / JOB-009 / JOB-030` 命令级 runbook：
    - [105-JOB-006真实部署验证命令级runbook](./105-JOB-006真实部署验证命令级runbook.md)
    - [106-JOB-009并发与吞吐验证命令级runbook](./106-JOB-009并发与吞吐验证命令级runbook.md)
    - [107-JOB-030发布前证据收口命令级runbook](./107-JOB-030发布前证据收口命令级runbook.md)
  - 已明确测试目标、测试分层、报告模板、缺陷回流格式、结果归档目录和执行顺序
  - 已完成第一阶段 `L0 ~ L3` 本地流水线：
    - `npm run pm:check`
    - `npm run test:unit`
    - `npm run test:console`
    - `npm run smoke:console`
  - 已生成首轮测试批次归档：
    - `prototype/workspace/test_runs/2026-04-09T02-02-38Z_job090_batch-01_l0-l3/summary.json`
    - `prototype/workspace/test_runs/2026-04-09T02-02-38Z_job090_batch-01_l0-l3/report.md`
    - `prototype/workspace/test_runs/2026-04-09T02-02-38Z_job090_batch-01_l0-l3/defects/index.json`
  - 首轮结果：
    - `L0 ~ L3` 全通过
    - 未发现 blocker
    - 未产生需要回流给开发 Codex 的缺陷
- 当前执行阶段：
  - 第一阶段 `L0 ~ L3` 已完成
  - 下一阶段：补第一轮测试缺口，或在外部条件就绪后进入 `L4 ~ L6`
- 后续要做：
  - 复核首轮批次报告
  - 按 [100-v1.0第一轮测试缺口补齐清单](./100-v1.0第一轮测试缺口补齐清单.md) 补第一轮测试缺口
  - 在具备外部条件后，按 `docs/105`~`docs/107` 进入 `L4 ~ L6`
- 完成标准：
  - 第一阶段 `L0 ~ L3` 报告形成
  - 缺陷回流方式可实际使用
  - 后续 Codex 可直接按文档继续执行下一轮测试或修正闭环

子任务 checklist：

- [x] 输出测试目标与总体方案文档
- [x] 输出测试实施拆解文档
- [x] 输出测试数据与资源准备清单
- [x] 输出测试文档索引
- [x] 输出测试流水线与 Codex 协作闭环方案
- [x] 输出测试覆盖矩阵与缺口盘点
- [x] 输出测试报告与缺陷回流模板
- [x] 为 `JOB-006` / `JOB-009` / `JOB-030` 输出测试执行 runbook
- [x] 固定测试结果归档目录
- [x] 明确各域测试 owner 与执行顺序
- [x] 输出第一轮缺口补齐清单
- [x] 形成 Codex 主导测试执行总入口
- [x] 确认测试账号与角色矩阵
- [x] 确认测试主数据、导入样本、validation 样本和节点备案样本
- [x] 明确需要在授权后获取的工具
- [x] 确认 `JOB-090` 进入第一阶段本地执行窗口
- [x] 形成首轮 `L0 ~ L3` 测试报告
- [x] 输出首轮缺陷结论与回流建议
- [ ] 确认真实部署与压测资源

### JOB-101 `v1.0` 正式文档工作区与单一真源绑定

- 当前负责人：Codex
- 最近更新时间：`2026-04-17`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  建立一套封闭边界的正式文档工作区，并把它接入单一真源、JOBLIST、CHECKLIST 和 `pm:sync / pm:check` 管理链。
- 本轮完成：
  - 已新增 `docs/2026-04-17-v1.0正式文档工作区/`
  - 已补齐正式基线文档 14 份
  - 已补齐治理文档、ADR、模板和归档入口
  - 已在 `source_of_truth.json` 中新增：
    - `docWorkspace`
    - `docRegistry`
    - `jobDocBindings`
    - `adrRegistry`
    - `docChangeLog`
    - `docRules`
  - 已扩展 `project_management/lib/project-docs.js`，让 `pm:sync / pm:check` 覆盖新工作区的生成视图与一致性校验
  - 已新增自动生成视图：
    - 工作区 `JOB 与文档绑定矩阵`
    - 工作区 `文档变更记录`
    - 工作区 `真源文档注册表视图`
    - 工作区 `ADR 索引`
    - 工作区 `JOB 索引`
  - 已同步更新工作区内治理规则和总索引
- 完成标准：
  - 新工作区形成封闭边界
  - 正式文档与真源建立结构化绑定
  - `pm:sync / pm:check` 能覆盖新工作区生成视图
  - 后续 Codex 可直接按新工作区继续衍生开发与文档维护

子任务 checklist：

- [x] 建立正式文档工作区
- [x] 建立正式基线文档
- [x] 建立治理规则、ADR、模板和归档入口
- [x] 设计 `docWorkspace / docRegistry / jobDocBindings / adrRegistry / docChangeLog / docRules`
- [x] 将新工作区接入单一真源
- [x] 扩展 `pm:sync / pm:check`
- [x] 生成工作区内的真源派生视图
- [x] 同步治理文档与索引
- [x] 完成本轮闭环自检

### JOB-102 `v1.0` docs 历史文档首批归档收边

- 当前负责人：Codex
- 最近更新时间：`2026-04-17`
- 外部依赖：无
- 是否可关闭：是
- 目标：
  对 `docs/` 根目录下的老旧文档做首批安全归档，保留当前仍被代码、镜像、帮助系统、测试脚本和 open job 使用的文档，把已关单且已被当前正式文档工作区覆盖的阶段文档迁入 `docs/archive/`。
- 本轮完成：
  - 已建立归档目录：`docs/archive/`
  - 已新增归档总索引：`docs/archive/00-归档总索引.md`
  - 已新增首批归档批次说明：`docs/archive/2026-04-17-v1关闭批次与阶段文档/00-归档说明.md`
  - 已完成首批安全迁移：把 `108~127` 中不再被运行链直接使用的阶段文档、`129~141` 的已完成批次拆解/映射/收尾文档，以及 `20260404_console-visual-only-plan.md` 迁入归档目录
  - 已保留在根目录不动的现行/在用文档包括：
    - `38-项目JobList与状态清单.md`
    - `47-单一真源项目管理与Codex衔接说明.md`
    - `25-console宿主环境联调与smoke执行说明.md`
    - `26-console内部试用说明.md`
    - `help_manuals/`
    - open job 仍在使用的 runbook、测试与发布准备文档
  - 已同步单一真源中对首批归档文档的引用路径，避免生成文档出现失效链接
- 完成标准：
  - `docs/` 根目录完成首批现行/在用/历史分层
  - 首批归档后的文档有索引和批次说明
  - 仓库级与工作区级派生文档不再指向失效路径
  - `pm:sync / pm:check` 通过

子任务 checklist：

- [x] 盘点代码、镜像、帮助系统、测试脚本和 open job 的文档依赖
- [x] 新增 docs 归档总索引
- [x] 新增首批归档批次说明
- [x] 执行首批安全归档迁移
- [x] 保留现行与在用文档在根目录
- [x] 同步单一真源中的归档文档引用路径
- [x] `npm run pm:sync`
- [x] `npm run pm:check`
- 第二批已完成：
  - 已更新 `README.md`，把旧总列表收口为“现行正式文档 / 项目管理与状态 / 在用手册 / 历史归档”四层入口
  - 已更新 `prototype/README.md`，补正式文档工作区入口
  - 已将 `01~24` 中除 `25/26` 外的早期基线、`29~36` 的早期 console/拆分部署文档、`39~82` 中已被新工作区替代的设计与阶段文档，以及 `2026-04-02/` 早期收敛目录整体迁入 `docs/archive/2026-04-17-v1早期基线与已替代设计文档/`
  - 已同步单一真源中对第二批归档文档的引用路径

### JOB-103 `v1.0` 正式文档工作区详细设计化与 Codex 开发依据补齐

- 当前负责人：Codex
- 最近更新时间：`2026-04-17`
- 外部依赖：无
- 是否可关闭：否
- 目标：
  将当前正式文档工作区从“正式基线文档集”升级为“详细设计说明书 + Codex 可直接编码的开发依据文档集”。
- 本轮已完成：
  - 已确认详细设计化方向与目录结构
  - 已建立以下子目录：
    - `design/`
    - `data_dictionary/`
    - `api_specs/`
    - `pages/`
    - `codex_dev/`
  - 已建立 5 份索引骨架：
    - `design/00-详细设计索引.md`
    - `data_dictionary/00-数据字典索引.md`
    - `api_specs/00-接口规范索引.md`
    - `pages/00-页面设计索引.md`
    - `codex_dev/00-Codex开发索引.md`
  - 已建立本 job 文档：
    - `jobs/JOB-103-v1.0正式文档工作区详细设计化与Codex开发依据补齐.md`
  - 已将上述索引骨架接入工作区总索引与单一真源注册表
- 目标交付：
  - `data_dictionary/`：表结构、字段类型、约束、索引、案例、改造影响
  - `api_specs/`：参数、响应、错误码、样例、代码入口、测试入口
  - `design/`：业务域和技术链路详细设计
  - `pages/`：页面区块、按钮、状态、权限、接口来源
  - `codex_dev/`：后续 Codex 开发阅读顺序与改动矩阵
- 完成标准：
  - 其他 Codex 不翻聊天记录也能直接按文档开工
  - 详细设计文档可指导数据库、接口、页面和配置修改
  - 文档、真源、索引和 checklist 保持同步

子任务 checklist：

- [x] 确认详细设计层目录结构
- [x] 建立 `design/` 索引骨架
- [x] 建立 `data_dictionary/` 索引骨架
- [x] 建立 `api_specs/` 索引骨架
- [x] 建立 `pages/` 索引骨架
- [x] 建立 `codex_dev/` 索引骨架
- [x] 建立 `JOB-103` 文档并挂单
- [x] 将新目录接入总索引与真源
- [x] 补 `data_dictionary/` 详细正文
- [x] 补 `api_specs/` 详细正文（核心层已完成）
- [x] 补 `design/` 详细正文
- [x] 补 `codex_dev/` 详细正文
- [x] 补 `pages/` 详细正文
- [x] 更新工作区总索引与变更记录
- [x] `npm run pm:sync`
- [x] `npm run pm:check`

### JOB-104 `v1.0` 发布流水线自动化与交付产物标准化

- 当前负责人：Codex
- 最近更新时间：`2026-04-21`
- 外部依赖：镜像仓库、镜像推送凭据、发布版本号与 releaseId 规则
- 是否可关闭：否
- 目标：
  在 `JOB-100` 已明确发布包边界的基础上，继续把 admin/runtime 双镜像构建与推送、release bundle 生成、镜像 tag 清单、构建元数据、checksum 与最小交付目录标准化为可重复执行的发布流水线。
- 范围：
  - 自动构建 `acdp-admin` / `acdp-runtime`
  - 自动推送到目标 registry
  - 自动生成 `deployment_bundle` / `release_notes_bundle`
  - 自动写出镜像 tag、commit id、构建时间、checksum 等元数据
  - 固定交付目录命名和发布批次命名规则
- 不在本 job 范围内：
  - 不改业务接口与业务逻辑
  - 不实现真实集群一键发布
  - 不实现 runtime 灰度策略本身
  - 不在本 job 内强制引入 SBOM/漏洞扫描平台，但要预留挂点
- 目标交付：
  - 可执行的发布流水线脚本或命令入口
  - 标准化镜像命名与 tag 规则
  - 标准化 release bundle 输出目录
  - 标准化构建元数据文件
  - 标准化发布前校验与失败退出口径
- 完成标准：
  - 其他 Codex 或运维同学不靠聊天记录，也能按文档执行完整发布流水线
  - 输入参数、输出目录、失败码、日志路径全部明确
  - 文档、真源、模板、脚本保持同步

子任务 checklist：

- [ ] 冻结镜像命名、tag 和 releaseId 规则
- [ ] 冻结发布流水线输入参数
- [ ] 冻结发布流水线输出目录结构
- [ ] 明确 registry 登录与凭据注入口径
- [ ] 明确构建元数据文件格式
- [ ] 明确 checksum / manifest 输出格式
- [ ] 明确失败退出与回滚提示口径
- [ ] 新增发布流水线脚本入口
- [ ] 让脚本自动构建 admin/runtime 镜像
- [ ] 让脚本自动推送 admin/runtime 镜像
- [ ] 让脚本自动生成 release bundle
- [ ] 让脚本自动写出 image-tags / build-metadata / checksums
- [ ] 补发布流水线模板或 README
- [ ] 补单元测试或 contract 测试
- [ ] 更新 `JOB-100` / 正式文档工作区相关文档
- [ ] `npm run pm:sync`
- [ ] `npm run pm:check`

### JOB-105 `v1.0` 批量导入按行阻断与可通过记录导入

- 当前负责人：Codex
- 最近更新时间：`2026-04-21`
- 外部依赖：现有 import preview / confirm / result summary 结构
- 是否可关闭：是
- 目标：
  在保留行级准入阻断的前提下，把当前“整批导入确认门禁”调整为“可导入行继续导入，阻断行只跳过不入库”，降低批量导入的操作成本。
- 当前问题：
  - 现状为：批次中只要存在任意 `error` 行，`confirmImportJob()` 就直接返回 `import_job_blocked_rows`
  - 这会导致大量 `ready` / `warning` 行也无法入库
  - 真实导入场景中，小量阻断行会拖死整批导入效率
- 已完成：
  - 已完成 `confirmImportJob()` 主路径改造：阻断行跳过、可通过记录继续导入
  - 已新增结果汇总字段：
    - `importedReadyCount`
    - `importedWarningCount`
    - `skippedBlockedCount`
  - 已让阻断行在确认导入后写成：
    - `status = error`
    - `decision = skipped_blocked`
  - 已调整批量导入详情页：
    - 主按钮改为 `导入可通过记录`
    - 报表按钮改为 `下载阻断报表`
    - 被跳过行显示为 `阻断未导入`
  - 已增强错误 CSV 下载，新增 `canonicalText` 列，提高阻断报表可读性
  - 已同步接口规范、详细设计、页面设计和 `JOB-105` 文档
  - 已完成页面中文化要求收口，按钮、卡片、下拉、提示均使用中文
  - 已完成本地回归：
    - `node --test /Codex/ACDP/prototype/tests/unit/import-jobs.test.js`
    - `node --test /Codex/ACDP/prototype/tests/unit/console-api.test.js`
    - `node --test /Codex/ACDP/prototype/tests/unit/console-workflows.test.js`
    - `node --test /Codex/ACDP/prototype/tests/unit/console-client-render.test.js`
    - `cd /Codex/ACDP && npm run test:unit`
    - `cd /Codex/ACDP && npm run test:console`
    - `cd /Codex/ACDP && npm run smoke:console`
    - `cd /Codex/ACDP && npm run check:api-contracts`
- 完成标准：
  - 存在 `error` 行的批次仍可导入 `ready` / `warning` 行
  - `error` 行不会入库
  - 页面与接口都能明确告诉用户哪些行已导入、哪些行被跳过
  - 不破坏词条审核任务生成链路
  - 文档、真源、测试同步

子任务 checklist：

- [x] 冻结批量导入“整批阻断”和“行级阻断”的边界
- [x] 冻结导入详情页按钮文案与提示文案
- [x] 冻结 `import_job_results` 汇总字段扩展口径
- [x] 调整 `confirmImportJob()`，允许跳过 `error` 行
- [x] 保持 `warning` 行可导入
- [x] 保持 `error` 行不入库且不生成审核任务
- [x] 导入结果中输出“导入成功数 / 跳过阻断数 / warning 数”
- [x] 调整 console 导入详情页展示与按钮可用性
- [x] 调整错误 CSV 下载内容，明确“未导入阻断行”
- [x] 补 `import-jobs.test.js`
- [x] 补 `console-api.test.js`
- [x] 补 `console-workflows.test.js`
- [x] 更新批量导入接口文档
- [x] 更新批量导入详细设计文档
- [x] `npm run pm:sync`
- [x] `npm run pm:check`
- [x] `npm run test:unit`

### JOB-106 `v1.0` 词典准入与 runtime 输出统一方案

- 当前负责人：Codex
- 最近更新时间：`2026-04-22`
- 外部依赖：无
- 是否可关闭：否
- 目标：
  把词典治理和 runtime 执行统一到一条主线：只允许那些能形成稳定、有限、可审计 `triggerText -> canonicalText` 映射的词条进入 runtime；准入层只保留 `blocked / ready` 两层，而 `ready` 再按运行方式分成 `replace / candidate`。
- 统一原则：
  - 词典不是通用词库存储系统，而是给 runtime 输出 `canonicalText` 的治理系统
  - `literal` 通道当前只看 `alias`
  - `pinyin` 通道当前会让 `canonical + alias` 进入拼音索引
  - 因此准入必须按 runtime 真实触发链而不是抽象关系判断
- 方案核心：
  - `blocked`
    - 不允许进入 runtime 词典
  - `ready + replace`
    - 允许进入 runtime，且允许 `/correct` 直接替换
  - `ready + candidate`
    - 允许进入 runtime，但只进入 `/correct_cand` 候选链，不允许自动替换
- 系统处理建议：
  - 录入或导入时，系统必须直接给每个词条/每一行输出：
    - `recommendedAction`
    - `reasonCodes`
    - `reasonSummary`
    - `reviewHints`
  - 用户不再逐条自己判断，而是按系统建议进行批量处理
- 已冻结口径：
  - 当 `triggerText` 命中其他已存在标准词时：
    - 一律不允许 `replace`
    - 建议优先顺序为 `merge_existing -> append_alias_to_existing -> save_candidate -> skip_blocked`
    - 仅在无明确并入目标、歧义范围有限且确有推荐价值时，才允许 `save_candidate`
  - `merge_existing` 与 `append_alias_to_existing` 只有在存在唯一目标词条时才允许进入批量确认执行；多目标或无目标时，只能降级为 `save_candidate` 或 `skip_blocked`
  - 第一版即使存在唯一目标词条，也不做全自动落库，而采用“系统建议 + 用户一键确认批量执行”模式
  - `ready + candidate` 第一版不允许没有 `alias`、只靠拼音参与推荐
  - `save_candidate` 的歧义阈值固定为 `< 4`，即候选标准词数量最多允许 `3` 个
  - `replaceMode = candidate` 第一版仍保留 `candidateOnly` 规则兜底
  - `reviewHints` 第一版不落库，按当前词条状态和当前词典现状动态计算；批量导入预览页可保留当次建议摘要
  - 第一版不对存量词条做全库自动重评估，只对新录入与新导入生效
- 页面原则：
  - 词典录入页和导入页必须中文化
  - 页面必须直接告诉用户“可替换 / 仅推荐 / 建议并入 / 建议补录 / 阻断跳过”
  - 对批量导入，提供“按系统建议处理”主动作，而不是要求用户逐行判断
  - `candidate` 词条在页面上必须明确标识为“仅推荐 / 不可直接替换”
  - 批量导入页必须增加“建议动作”汇总卡片
- runtime 原则：
  - `/api/runtime/correct` 与 `/ws/runtime/correct` 只允许 `replace` 生效
  - `/api/runtime/correct_cand` 与 `/ws/runtime/correct_cand` 允许 `replace + candidate`
  - 无 `replace` 命中时，`correct_cand` 主结果位保持原文，`candidate` 只出现在后续候选位
  - `literal` 通道必须真正尊重 `replaceMode`
  - `pinyin` 通道必须真正尊重 `pinyinRuntimeMode`
- 审核与发布原则：
  - `candidate` 与 `replace` 走同一审核链
  - `candidate` 审核通过后同样进入 release 与 snapshot
  - 是否直接替换由运行模式决定，不由审核状态决定
- 目标交付：
  - 统一方案文档
  - 代码改造清单
  - 页面改造清单
  - runtime 改造清单
  - 可直接编码的实施 checklist
- 完成标准：
  - 其他 Codex 不翻聊天记录，也能按方案直接拆实现
  - 方案内关于准入、页面、runtime、接口的逻辑自洽
  - 文档、真源、索引同步

子任务 checklist：

- [x] 冻结 `blocked / ready` 两层准入口径
- [x] 冻结 `ready + replace / ready + candidate` 运行方式口径
- [x] 明确 `triggerText` 定义
- [x] 明确哪些情况直接 `blocked`
- [x] 明确哪些情况降级成 `candidate`
- [x] 明确录入时的系统建议结构
- [x] 明确批量导入“按系统建议处理”的方案
- [x] 明确手工录入页页面行为
- [x] 明确导入页页面行为
- [x] 明确页面中文化要求
- [x] 明确 runtime `correct / correct_cand` 行为边界
- [x] 明确现有代码需要修改的文件
- [x] 明确页面需要修改的文件
- [x] 明确 runtime 需要修改的文件
- [x] 补 `correct_cand` 主结果规则
- [x] 补目标词条解析规则
- [x] 补存量词条收口口径
- [x] 补批量导入结果模型
- [x] 补 `candidate` 审核发布边界
- [x] 冻结并入/补录批量确认执行口径
- [x] 冻结 `candidate` 阈值 `<4`
- [x] 冻结建议动作汇总卡片要求
- [x] 收口主要方案遗留问题
- [x] 形成可直接编码的实施 checklist（见 JOB-106 文档第 14 节）
- [ ] `npm run pm:sync`
- [ ] `npm run pm:check`

## 5. 当前建议优先级

1. `JOB-103` `v1.0` 正式文档工作区详细设计化与 Codex 开发依据补齐
2. `JOB-024` `v1.0` R1 运行治理域重构
3. `JOB-025` `v1.0` R2 版本发布域重构
4. `JOB-026` `v1.0` R3 主数据域重构
5. `JOB-027` `v1.0` R4 系统配置域重构
6. `JOB-028` `v1.0` R5 帮助域与接口文档体系
7. `JOB-029` `v1.0` R6 工作台重构
8. `JOB-090` `v1.0` 测试体系建设与流水线验证准备
9. `JOB-031` `v1.0` 控制台导航、标题与中文化最终收口
10. `JOB-032` `v1.0` 控制台页面职责与二级工作页最终收口
11. `JOB-033` `v1.0` 控制台帮助入口与页面内引导最终收口
12. `JOB-100` `v1.0` 最终发布包组成与发布包装清理
13. `JOB-030` `v1.0` R7 真实环境验证与发布准备
14. `JOB-007` validation feeds 真实外部系统集成
15. `JOB-009` 并发与吞吐验证
16. `JOB-006` 保持挂起，直到真实目标集群访问条件恢复
17. 若后续再收到 `/console` 系统管理、发布生命周期或导航 IA 的扩展反馈，按新批次重开，不复用已关闭 `JOB-023`。
18. 若后续再收到发布中心 / 审核中心中 release 状态扩展反馈，按新批次重开，不复用已关闭 `JOB-022`。
19. 若后续要把 `/console/runtime-verify` 扩到 `targetMode=runtime_node`，先完成 `JOB-021` 的节点备案与多 runtime 基线，再扩 `JOB-020`。
20. 若后续再收到 runtime 候选输出、节点验证或灰度验证扩展反馈，按新批次重开，不直接回改已关闭接口合同
21. 若后续再收到导入中心分类、legacy 曝光或词条业务属性细分反馈，按新批次重开，不复用已关闭 `JOB-018`
22. 若后续再收到新的 `/console` 视觉系统升级反馈，按新批次重开，不复用已关闭 `JOB-017`
23. 若后续再收到 `/console` 回归反馈，再新开维护批次处理
