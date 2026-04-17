# 控制面 / 数据面架构与 RBAC 重构方案

## 1. 目标

本方案用于把当前 `acdp-admin` / `acdp-runtime` 的第一阶段拆分，进一步演进为真正可独立部署、可多节点扩展的控制面 / 数据面架构。

同时，本方案把 `/console` 当前相对混杂的角色权限模型，整理为：

- 用户
- 角色
- 权限
- 页面功能

四层对应关系，便于后续产品、实现、联调和审计统一口径。

## 2. 当前问题

虽然当前已经完成了 runtime/admin 拆分，但仍存在高耦合：

1. `runtime` 与 `admin` 共享 `prototype/workspace`
2. `runtime` 依赖共享 `latest snapshot` 才能启动
3. `runtime` 与 `admin` 仍共享同一份 SQLite 管理库
4. 发布时仍由 `admin` 侧写共享目录，而不是向独立 runtime 节点分发制品
5. `/console` 当前角色与页面操作关系偏隐式，易出现“切角色但 operator 不变”的认知混乱

## 3. 目标架构

### 3.1 总体模型

建议明确分为两个层面：

### A. `acdp-admin` 控制面

负责：

- 词条管理
- 审核
- 发布
- 版本构建
- runtime 节点注册与状态管理
- 版本下发控制
- 运行统计汇总
- 权限管理与操作审计

### B. `acdp-runtime` 数据面 / agent

负责：

- 本地加载 snapshot
- 对外提供纠错服务
- 本地持久化运行状态
- 本地持久化运行统计
- 主动向 admin 心跳
- 主动向 admin 上报运行统计
- 主动拉取 admin 的“目标版本状态”

## 4. 发布与制品分发模型

### 4.0 第一版制品仓选择

当前建议：

- 第一版制品仓采用 **MinIO**
- 第一版先部署在现有服务器上

原因：

- 可直接在现有服务器上落地
- 可作为对象存储最小实现，先完成架构解耦
- 后续若切换到 COS / OSS / S3，制品模型和接口习惯仍可复用

要求：

- MinIO 的存储目录、端口、访问方式、账号密钥等必须保存在独立配置文件中
- 不允许把这些值硬编码进业务代码
- 当前建议配置文件：
  - `prototype/config/artifact_store.config.json`

当前已确认：

- 第一版制品仓：MinIO
- 第一版部署位置：现有服务器
- bucket：`acdp-artifacts`
- 制品路径结构：
  - `releases/<releaseId>/manifest.json`
  - `releases/<releaseId>/snapshot.json`
  - 可选扩展：`releases/<releaseId>/package.tar.gz`

### 4.1 建议方式

建议采用：

- **控制状态由 admin 发布**
- **制品本体由 runtime 主动拉取**

更具体地说：

1. admin 构建出 versioned artifact
2. admin 发布 `desiredVersion`
3. runtime 心跳或轮询时拿到：
   - `desiredVersion`
   - `artifactUrl`
   - `checksum`
   - `issuedAt`
4. runtime 自己拉取 artifact
5. runtime 校验 checksum
6. runtime 本地原子切换版本
7. runtime 把 apply 结果回报 admin

这样做之后：

- runtime 不再依赖共享 volume 中的 `latest`
- runtime 可以本地独立持有当前版本
- admin 只负责控制，不负责长期占连接传大包

## 5. runtime 节点管理模型

建议新增 runtime 节点注册表，例如：

- `nodeId`
- `nodeName`
- `env`
- `address`
- `status`
- `lastHeartbeatAt`
- `currentVersion`
- `desiredVersion`
- `lastApplyAt`
- `lastApplyStatus`
- `lastError`
- `runtimeStatsCursor`

建议接口：

### runtime -> admin

- `POST /api/runtime-nodes/register`
- `POST /api/runtime-nodes/heartbeat`
- `POST /api/runtime-nodes/{nodeId}/apply-result`
- `POST /api/runtime-nodes/{nodeId}/stats/upload`

### runtime 读取控制状态

- `GET /api/runtime-control/me`

返回：

- `desiredVersion`
- `artifactUrl`
- `checksum`
- `issuedAt`
- `configVersion`

## 6. 统计回传模型

建议 runtime 先本地落：

- 当前版本信息
- 最近错误
- 请求统计
- 延迟分位
- 命中词条统计
- 可选采样事件

可先使用：

- 本地 SQLite
- 或本地 WAL / append-only 文件

建议：

- 默认每 `300s` 一次批量回传
- 支持配置化调整
- 支持达到条数阈值后提前回传
- 支持手工 flush

admin 侧要保证：

- 按 `nodeId + batchId + sequence` 幂等入库
- 可做全站聚合
- 可做节点级下钻
- 回传失败时不丢数据

## 7. RBAC 重构范围

本次方案中，RBAC 不是附带项，而是同步重构项。

## 7.1 三层模型

建议明确：

### 用户（User）

表示真实操作主体，例如：

- `alice`
- `ops_bj_01`
- `reviewer_qa_02`

### 角色（Role）

表示职责边界，例如：

- `dict_viewer`
- `dict_editor`
- `dict_reviewer`
- `dict_publisher`
- `dict_operator`
- `dict_admin`

### 权限（Permission）

表示系统可执行动作，例如：

- `term.read`
- `term.write`
- `review.decide`
- `release.publish`
- `runtime.node.read`
- `runtime.node.control`
- `runtime.stats.read`

## 7.2 页面功能映射

权限必须映射到具体页面功能，而不只是 API。

建议整理为：

### `/console` 总览

- 查看总览指标
- 查看 runtime 节点状态
- 查看版本分发状态

### `/console/terms`

- 查看词条列表
- 创建词条
- 编辑基础信息
- 编辑规则
- 编辑拼音
- 提交审核
- 停用词条

### `/console/reviews`

- 查看审核列表
- 审核通过
- 审核驳回

### `/console/releases`

- 构建 release
- 提交发布审核
- 查看 gate / validation
- 正式发布
- 回滚

### `/console/runtime-nodes`（建议新增）

- 查看节点列表
- 查看节点在线状态
- 查看当前版本 / 目标版本
- 查看最近 apply 结果
- 查看节点统计
- 触发节点刷新 / 重拉配置 / 重试 apply

### `/console/validation-cases`

- 查看样本
- 创建样本
- 批量导入
- 停用样本

## 7.3 关键建议

前端页面必须同时显示：

- 当前用户
- 当前角色
- 该页面可执行动作

并且：

- 高风险操作必须同时校验 `user` 和 `role`
- 不要只切角色，不切用户
- 审核 / 发布 / 运维动作必须把“当前用户”作为真实边界主体

## 8. 推荐实施顺序

### 阶段 1：方案冻结

先确认：

1. runtime 节点模型
2. artifact 分发模型
3. 统计回传模型
4. RBAC 三层模型
5. `/console` 页面功能权限映射

### 阶段 2：最小控制面能力

先落：

- runtime node registry
- heartbeat
- desiredVersion 查询
- basic apply result 上报

### 阶段 3：制品分发

再落：

- versioned artifact 元数据
- runtime 拉取并本地切换
- checksum 校验

### 阶段 4：统计回传

再落：

- runtime 本地统计缓冲
- admin 幂等入库
- 聚合视图

### 阶段 5：RBAC 重构

再落：

- 用户 / 角色 / 权限模型
- 页面功能映射
- `/console` 顶部身份切换与操作约束收口

## 9. 当前需要你确认的关键节点

1. **runtime 是否采用“admin 下发目标版本，runtime 自己拉制品”**
   - 已确认：是
2. **制品仓形态**
   - 已确认：第一版使用 **MinIO**
3. **runtime 本地状态存储**
   - 已确认：先本地 SQLite
4. **统计回传周期**
   - 已确认：默认 300 秒，可配置
5. **是否新增 `/console/runtime-nodes` 页面**
   - 已确认：是
6. **RBAC 是否按“用户-角色-权限-页面功能”四层一起重构**
   - 已确认：是，而且和本方案一起推进

补充确认：

7. **敏感配置最终方式**
   - 当前确认：第一阶段先放在配置文件中
   - 后续再统一纳入系统安全治理

## 10. 当前建议

- 先把这份方案作为新的最高优先级工作项
- 先做一轮关键节点确认
- 确认后再开始动手，而不是边做边改方向

## 11. 第一版 MinIO 配置要求

第一版 MinIO 至少需要可配置以下项：

- `serverDataDir`
- `apiPort`
- `consolePort`
- `endpoint`
- `publicBaseUrl`
- `bucket`
- `rootUser`
- `rootPassword`
- `accessKey`
- `secretKey`
- `useSsl`
- `accessStyle`

这些值当前统一建议放在：

- `prototype/config/artifact_store.config.json`

补充说明：

- 凭证字段允许为空，待宿主机部署时填入
- 当前第一阶段确认：敏感字段先保存在配置文件中
- 后续如果进入生产，再统一迁移到 Secret 或环境变量注入
