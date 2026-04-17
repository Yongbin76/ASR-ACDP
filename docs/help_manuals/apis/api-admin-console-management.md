# 接口手册：admin / console 管理接口

## 1. 范围

- 词典建设管理接口
- 审核接口
- 发布接口
- 运行治理接口
- 系统配置接口

## 2. 核心原则

- 面向控制台与管理动作
- 不属于 runtime 对外业务合同

## 3. 与 runtime 快照下发相关的 admin 接口

- `POST /api/admin/runtime-control/desired-version`
  - 设置当前目标版本
- `GET /api/runtime-control/me`
  - runtime 节点读取自身 control 视图
- `GET /api/runtime-artifacts/releases/:releaseId/:fileName`
  - `admin_http_signed` 模式下，runtime 下载受控快照文件
