# JOB 索引

- 文档状态：active
- 适用版本：v1.0
- 文档类型：generated_view
- 所属工作区：docs/2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-17
- 责任对象：本工作区内 job 文档组织方式

> 此文件由 `project_management/source_of_truth.json` 自动生成。

## 1. 当前与本工作区直接相关的主要 job

| Job | 状态 | 说明 |
|---|---|---|
| `JOB-035` | `done` | 已完成词典建设域与验证回流域首轮重构：页面、接口、配置模型、审核快照和帮助口径已切到 `dictionary/*` / `validation/*` 新语义 |
| `JOB-036` | `done` | 已完成 `admin_http_signed` 快照下发模式、admin 下载路由、按节点动态签名 URL 和相关回归；当前可直接由 `JOB-090` 继续做更大范围测试 |
| `JOB-037` | `done` | 已完成左侧目录树优化并确认可封板：导航数据源抽离、目录名称同步、层级视觉增强、收起态图标化、hover 提示和背景色收口 |
| `JOB-099` | `done` | 已完成 ACDP 主工作区与 runtime 实例工作区清理，并把系统切换为不会自动回灌默认词条、样本和 release 的零数据底座 |
| `JOB-100` | `done` | 已完成最终发布包边界收紧、交付模板目录、release bundle 生成脚本和三条正式镜像构建验证 |
| `JOB-090` | `in_progress` | 已完成包含 `JOB-036 admin_http_signed` 在内的本地回归确认：`test:unit`、`test:console`、`smoke:console`、`check:api-contracts`、`test:unit:coverage`、`check:v1-local-readiness` 已通过；当前本地阶段已无阻塞，下一步等待外部条件进入 `L4 ~ L6` |
| `JOB-006` | `blocked` | 在真实目标集群完成 split runtime/admin 验证 |
| `JOB-009` | `blocked` | 本地可做的脚本、统计接口、报告留档与基础/目标吞吐分离口径已具备，剩余吞吐数据采集受真实宿主机条件阻塞 |
| `JOB-030` | `blocked` | 为正式 `v1.0` 发布准备 go / no-go 证据，并吸收真实部署和真实并发验证工作 |
| `JOB-101` | `done` | 已建立封闭边界的正式文档工作区，并完成与单一真源、JOBLIST、CHECKLIST 和 pm:sync / pm:check 的首轮绑定。 |
| `JOB-102` | `done` | 已完成 `docs/` 根目录历史文档两批归档分层：保留现行与在用文档，把已被当前正式文档工作区覆盖的旧基线、旧设计、已关单阶段文档迁入 `docs/archive/`。 |
| `JOB-103` | `done` | 已完成详细设计层、数据字典层、接口规范层、页面设计层和 Codex 开发依据层的首版补齐。 |
