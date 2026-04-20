# SQLite 之后的状态管理升级路线

## 1. 目标

本方案用于关闭 `JOB-010`，为 ACDP 在 split runtime/admin 之后的继续扩容，给出一条可执行的状态管理升级路线。

本方案回答四个问题：

1. 当前到底有哪些状态
2. 哪些状态不能继续依赖共享 PVC + 单库 SQLite
3. 下一阶段应替换成什么
4. 应该按什么顺序迁移，才能不打断现有 `/admin`、`/console`、runtime 控制链路

## 2. 当前状态分类

当前状态不要再笼统看成“一份 SQLite + 一堆文件”，而应拆成四类。

### 2.1 控制面事务状态

当前主要落在 `prototype/workspace/platform.db`，由 `prototype/src/lib/platform-db.js` 管理。

核心表包括：

- 词条与规则：
  - `terms`
  - `aliases`
  - `term_sources`
  - `alias_sources`
  - `term_rules`
  - `pinyin_profiles`
- 审核与发布：
  - `releases`
  - `release_terms`
  - `gray_policies`
  - `review_tasks`
- 导入与验证：
  - `validation_cases`
  - `import_jobs`
  - `import_job_files`
  - `import_job_rows`
  - `import_job_results`
  - `import_templates`
- 控制面 / 数据面桥接：
  - `runtime_nodes`
  - `runtime_control_state`
- 汇总统计与审计：
  - `runtime_node_hourly_stats`
  - `runtime_node_hourly_terms`
  - `runtime_node_peak_stats`
  - `runtime_node_stat_upload_records`
  - `runtime_hourly_stats`
  - `runtime_hourly_terms`
  - `runtime_peak_stats`
  - `audit_logs`

这些状态的特点：

- 需要事务一致性
- 需要多接口并发读写
- 未来需要被 admin 多副本共享
- 未来需要更稳定的备份、恢复和迁移

### 2.2 发布产物与不可变证据

当前主要落在文件系统 / MinIO：

- release snapshot / manifest / package
- `prototype/workspace/releases/*`
- artifact store 中的 `releases/<releaseId>/...`
- `prototype/workspace/host_verification/*`
- validation feed inbox / archive / error 目录

这些状态的特点：

- 大对象 / 文件型为主
- 天然适合对象存储或目录归档
- 不适合塞回关系型事务库

### 2.3 runtime 节点本地状态

当前主要落在 runtime 本地目录：

- `runtime_artifacts/releases/<releaseId>`
- `runtime_state/current.json`
- `runtime_state/runtime_stats.db`

这些状态的特点：

- 只服务于单个 runtime 节点
- 需要离 admin 独立存活
- 要在网络闪断、admin 不可达时继续工作
- 不应反向依赖控制面共享卷

### 2.4 运行统计与分析状态

当前实际上分两层：

1. runtime 本地缓冲：
   - `runtime_stats_events`
   - `runtime_stats_state`
   - `runtime_stats_peak`
2. admin 聚合汇总：
   - `runtime_node_hourly_stats`
   - `runtime_node_hourly_terms`
   - `runtime_node_peak_stats`
   - `runtime_hourly_stats`
   - `runtime_hourly_terms`
   - `runtime_peak_stats`

这些状态的特点：

- 写入量会先于词条管理流量扩张
- 原始事件和聚合结果不应长期混在同一控制库里无限增长
- 后续要区分“控制态事务库”和“统计 / 分析库”

## 3. 为什么当前方案只能支撑 MVP

当前“共享 PVC + 单库 SQLite + 文件目录”能支撑 MVP，但继续扩容会遇到四个硬限制。

### 3.1 admin 多副本会先遇到写竞争与运维风险

SQLite 适合单机、低并发、嵌入式场景，不适合把控制面长期建立在：

- 多 Pod 共享同一数据库文件
- 多实例跨节点共享 PVC
- 高频写入审计、导入、审核、发布控制态

### 3.2 控制事务与统计增长混在同一库里

当前控制库既承接：

- 词条、审核、发布
- runtime 节点状态
- 小时级统计聚合
- 审计日志

这会导致：

- 备份窗口和恢复复杂度上升
- 索引与 vacuum 压力混在一起
- 表增长后容易影响 `/admin`、`/console` 查询

### 3.3 runtime 独立性与共享卷之间还有历史惯性

虽然 control-managed 路径已经落地，但如果继续把“全局共享文件系统”视为长期基础，会反复把 runtime/admin 耦回去。

### 3.4 大对象和事务数据没有明确边界

release snapshot、验证证据、feed 归档这类对象，本来就不应该继续跟事务库一起设计为“同类状态”。

## 4. 替代方案候选

这里不再讨论抽象大词，只给当前 ACDP 真实可落地的候选。

### 4.1 候选 A：PostgreSQL + MinIO + runtime 本地 SQLite

组成：

- PostgreSQL：
  - 控制面事务库
  - runtime 聚合统计
  - 审计与导入元数据
- MinIO / S3-compatible object store：
  - release 产物
  - host verification 报告
  - feed 归档与错误件
- runtime 本地 SQLite / JSON：
  - deployment state
  - 本地统计缓冲

优点：

- 与当前数据模型最贴近
- 事务能力、索引能力、备份恢复路径成熟
- 可以先替换控制库，不需要同时推翻 runtime 本地缓冲模型
- 最适合当前已有 MinIO + control-managed 路线

缺点：

- 需要新增 PostgreSQL 运维面
- 需要做一轮 repository / migration 分层

结论：

- **推荐方案**

### 4.2 候选 B：MySQL + MinIO + runtime 本地 SQLite

优点：

- 如果目标环境 MySQL 更标准化，可以复用现有 DBA 体系

缺点：

- 对当前 JSON 字段、幂等 upsert、迁移脚本习惯没有 PostgreSQL 顺手
- 与后续分析型扩展的组合度略弱

结论：

- 可作为组织标准优先时的备选，不作为默认推荐

### 4.3 候选 C：继续 SQLite，但按功能拆库

例如拆成：

- control.db
- analytics.db
- audit.db

优点：

- 代码改造最小

缺点：

- 仍然无法解决多副本控制面的问题
- 只是把问题拆散，不是解决问题

结论：

- 只适合作为极短期缓冲，不建议作为正式路线

### 4.4 候选 D：控制库 PostgreSQL，统计再上独立分析存储

组成：

- PostgreSQL：事务态 + 节点控制态 + 聚合摘要
- ClickHouse / Timescale / Parquet Lake：高量统计与分析
- MinIO：对象存储

优点：

- 长期上限最高

缺点：

- 对当前阶段明显过重

结论：

- 作为第二阶段扩量预案，不作为第一步

## 5. 推荐目标架构

`JOB-010` 的推荐目标不是“一次性上很重的平台”，而是下面这条分层边界。

### 5.1 控制面权威状态

迁移到 PostgreSQL：

- 词条 / 别名 / 规则 / 拼音画像
- 审核任务
- release 元数据
- 灰度策略
- validation cases
- import job 元数据
- runtime node registry
- runtime control state
- audit logs

### 5.2 对象与不可变文件

统一归到 MinIO / S3-compatible object store：

- release artifact
- host verification 报告
- feed archive / error 文件
- 如后续需要，可把 import 原始文件也纳入对象存储

### 5.3 runtime 节点本地状态

继续保留在节点本地：

- 当前已安装 release
- 上一次切换结果
- 本地统计缓冲

原因：

- admin 不可达时 runtime 仍应能继续响应
- 节点切换、回滚、本地缓冲不应依赖中心库在线

### 5.4 统计状态

第一阶段：

- runtime 仍本地缓冲 SQLite
- admin 只接收并存聚合结果到 PostgreSQL

第二阶段：

- 若吞吐明显上升，再把高量明细或长留存分析迁出到专门分析存储

## 6. 三类状态的明确归属

这是本 job 的核心结论。

### 6.1 管理库

推荐归属：

- PostgreSQL

边界：

- 只放权威事务状态和必要聚合状态
- 不直接存大文件

### 6.2 发布产物

推荐归属：

- MinIO / S3-compatible object store

边界：

- 产物以 releaseId 为前缀管理
- manifest / snapshot / package 都走对象存储
- 控制库只存 metadata，不存文件本体

### 6.3 运行统计

推荐归属：

- runtime 节点本地缓冲：本地 SQLite
- 控制面聚合：PostgreSQL
- 超长留存分析：后续再拆

边界：

- 节点本地保“待上传事实”
- 控制面保“已聚合结果”和“幂等上传记录”
- 不要求把所有原始事件永久集中化

## 7. 迁移成本与主要风险

### 7.1 成本评估

低成本：

- 保持 artifact store 继续用 MinIO
- 保持 runtime 本地状态模型不变

中成本：

- 抽出 repository / storage adapter 层
- 为 PostgreSQL 重写 migration / bootstrap / query 适配

高成本：

- 把当前所有 SQLite SQL 直接无约束迁到新库
- 同时重做统计模型和导入模型

### 7.2 主要风险

- 若直接大迁移，容易同时扰动 `/admin`、`/console`、runtime control
- 若把 runtime 本地状态也强行中心化，会破坏节点独立性
- 若把高量统计长期压在事务库，会把问题从 SQLite 平移到 PostgreSQL

### 7.3 风险控制原则

- 先替换控制库，再看统计扩量
- 先保留 runtime 本地缓冲，不做反向耦合
- 先保留 API 契约，再替换底层存储

## 8. 可执行升级路线

### 阶段 0：边界冻结

目标：

- 不再新增“共享 PVC + SQLite”耦合点

动作：

- 继续保持 artifact store 配置驱动
- 新增状态时先明确属于：
  - control DB
  - object store
  - runtime local state

### 阶段 1：代码层存储抽象

目标：

- 让 `platform-db.js` 不再直接等于唯一控制库存储实现

动作：

- 抽出 control-plane repository 接口
- 抽出 runtime-aggregation repository 接口
- 保持 HTTP / console service / release gate 层调用不变

验收：

- SQLite 仍可跑
- 但 PostgreSQL 实现可并行接入

### 阶段 2：PostgreSQL 控制库落地

目标：

- 把控制面事务状态迁到 PostgreSQL

动作：

- 新建 PostgreSQL schema migration
- 完成 terms / reviews / releases / validation / import / runtime_nodes / runtime_control_state / audit_logs 迁移
- 保留对象存储路径不变

验收：

- `/admin`、`/console`、runtime control 主要读写都走 PostgreSQL

### 阶段 3：统计路径拆层

目标：

- 把“控制事务”和“统计增长”彻底分开看

动作：

- runtime 本地仍缓冲 SQLite
- admin 聚合结果写 PostgreSQL
- 为长留存统计预留独立分析存储入口

验收：

- 控制面查询不再被统计表增长明显拖慢

### 阶段 4：共享状态增强

按需追加，不作为第一阶段必做：

- Redis 做 caller quota / cache / coordination
- 分析库存长留存 runtime telemetry
- 控制面化 caller registry / 配额治理

## 9. 建议的实施顺序

建议实际顺序如下：

1. 先保持 `JOB-006`、`JOB-007`、`JOB-009` 当前主线不被打断
2. 一旦确定要上多副本 admin 或真实生产控制面，立即启动 `JOB-010` 阶段 1
3. 先做 PostgreSQL 控制库，不碰 runtime 本地缓冲
4. 统计分层放到 PostgreSQL 控制库稳定之后

## 10. 本 job 的结论

`JOB-010` 可以关闭，原因如下：

1. 已梳理管理库、发布产物、运行统计三类状态
2. 已给出替代方案候选并比较
3. 已明确推荐目标：
   - PostgreSQL 负责控制面权威事务状态
   - MinIO 负责 release 与证据对象
   - runtime 本地 SQLite / JSON 保持节点自治
4. 已给出按阶段执行的迁移路线，而不是只停留在概念讨论

后续如果真的进入多副本控制面或正式生产化，只需按本方案进入实施，不必重新从“SQLite 是否够用”开始争论。
