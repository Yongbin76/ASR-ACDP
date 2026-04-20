# ACDP

## 项目定位

ACDP是面向中文 ASR 实时纠错场景的独立项目，负责承接：

- 热词词典的录入、审核、发布、回滚与审计
- 词条变体生成与中文拼音增强
- 词典快照编译、热更新与灰度发布
- 运行时 AC 匹配引擎的配置管理与效果闭环

它不是单纯的“AC 自动机脚本”，而是“词典管理控制面 + 词典编译发布面 + 运行时数据面”的一体化平台。

## 目标

- 支撑 CG1 热词规则纠错层的生产落地
- 满足中文 ASR 实时场景下的高精度、低延迟、可运营、可回滚
- 将“词典维护”从 Excel + 脚本提升为可审计、可发布、可灰度的平台能力
- 为中文场景补齐拼音、近音、口音变体的治理与工程能力

## 文档入口

当前文档采用三层结构：

### 现行正式文档

- [v1.0正式文档工作区](docs/2026-04-17-v1.0正式文档工作区/00-文档总索引.md)

### 项目管理与状态

- [项目 JobList 与状态清单](docs/38-项目JobList与状态清单.md)
- [单一真源项目管理与 Codex 衔接说明](docs/47-单一真源项目管理与Codex衔接说明.md)

### 在用手册

- [Console 宿主环境联调与 Smoke 执行说明](docs/25-console宿主环境联调与smoke执行说明.md)
- [Console 内部试用说明](docs/26-console内部试用说明.md)
- [Console 联调记录模板](docs/27-console联调记录模板.md)
- [Console 试用反馈收集模板](docs/28-console试用反馈收集模板.md)
- [Runtime-Admin 服务运维手册](docs/37-runtime-admin服务运维手册.md)
- [本地 MinIO 与制品仓凭据注入说明](docs/41-本地MinIO与制品仓凭据注入说明.md)
- [帮助文档目录](docs/help_manuals)

### 历史归档

- [docs 归档总索引](docs/archive/00-归档总索引.md)

## 项目边界

本项目负责：

- 上海地名/路名、专有名词、政务专有词三类 AC 词典平台能力
- 百家姓相关的专项规则词典管理，但不把姓名全文盲匹配并入 AC 主引擎
- 词条的变体、拼音、上下文规则、风险等级等元数据管理
- 词典编译产物的构建、版本化、热更新、回滚、灰度

本项目暂不负责：

- LLM 纠错服务本身
- AIBOC 原始识别能力
- CG2 前端展示与数据库写入实现
- 复杂语义改写与全文语义纠错

## 当前实现状态

当前目录下已经有一版可跑原型，位于 `prototype/`，包含：

- 原始数据清洗
- SQLite 词典管理存储
- 规则持久化
- 快照构建、版本发布与灰度策略
- 版本回滚
- 运行时匹配与拼音增强
- `/admin` MVP 浏览器管理页
- `/console` 独立新后台入口

原型使用说明见 [prototype/README.md](prototype/README.md)、[v1.0正式文档工作区](docs/2026-04-17-v1.0正式文档工作区/00-文档总索引.md) 和 [25-Console宿主环境联调与Smoke执行说明](docs/25-console宿主环境联调与smoke执行说明.md)。

## 开发环境要求

- 当前原型依赖 Node 内置 `node:sqlite`
- Ubuntu 开发环境请使用 Node.js `>= 22.13.0`
- 进入项目后先执行 `npm run check:env`
- 如果当前 shell 在上级目录，也可执行 `npm --prefix /Codex/ACDP run check:env`

## 部署资产

- 已提供基础容器镜像定义：`Dockerfile`
- 已提供基础 K8S 资产：`k8s/namespace.yaml`、`k8s/pvc.yaml`、`k8s/deployment.yaml`、`k8s/service.yaml`
- 当前 K8S 形态按单副本原型部署，容器启动命令为 `npm run setup:prototype && npm run start:prototype`

## 首阶段产出

首阶段已完成文档与平台设计，并交付可运行原型，后续代码演进以本目录文档为准。
## Resume Work

- See SESSION_HANDOFF.md for the latest progress and the next task to continue.
- See NEXT_STEPS.md for the short todo list.
