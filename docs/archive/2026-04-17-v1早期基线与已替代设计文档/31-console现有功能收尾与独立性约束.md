# Console 现有功能收尾与独立性约束

## 1. 目标

当前阶段的首要目标不是继续扩功能，而是在不影响 `/admin` 的前提下，尽快完成 `/console` 的现有功能收尾、宿主验证和交付口径统一。

## 2. 硬约束

必须始终满足：

- `/admin` 与 `/console` 是双轨独立入口
- `/console` 的静态资源、路由和接口异常不能影响 `/admin` 与 `/api/admin/*`
- `/admin` 继续承担 MVP 演示与历史能力对照
- `/console` 继续承担新后台试用、联调和后续正式后台演进

## 3. 当前收尾范围

本轮收尾只覆盖已存在能力的完善，不新增大块新功能：

- `/console` 六大模块现有链路补齐和小缺陷修复
- 高风险动作确认、重复提交保护、状态不允许时的按钮约束
- 模板下载、错误报表下载、帮助中心、筛选/分页/导出体验修整
- 词条、导入、审核、发布、样本主链路的宿主联调
- `/admin` 与 `/console` 入口独立性的自动化回归和宿主复核
- 文档、测试命令、交接口径统一

## 4. Definition Of Done

满足以下条件，才算本轮 `/console` 收尾完成：

1. `npm run test:unit` 通过
2. `npm run test:console` 通过
3. `npm run smoke:console` 在宿主机至少完成一轮验证，且返回 `/admin` 与 `/console` 入口独立性结果
4. `npm run verify:host:console` 生成完整报告目录
5. `/admin` 与 `/console` 双入口独立性复核通过
6. 联调记录和试用反馈已沉淀到宿主测试报告目录

## 5. 当前不纳入本轮

本轮不做：

- 真实外部 validation feed connector 接入
- 后台与对外 runtime 服务的代码/部署彻底拆分
- 新一轮大规模 UI 重构
- 超出当前 `/console` 范围的新业务域
