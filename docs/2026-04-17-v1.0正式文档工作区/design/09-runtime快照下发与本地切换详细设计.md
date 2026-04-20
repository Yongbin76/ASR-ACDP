# runtime 快照下发与本地切换详细设计

- 文档状态：active
- 适用版本：v1.0
- 文档类型：design
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：runtime-control、artifact delivery、本地安装与回滚

## 1. 设计目标

让 runtime 能从 admin 获取目标版本，下载快照，本地安装并原子切换。

## 2. 主链路

1. admin 设置 `desiredRelease`
2. 写入 `runtime_control_state`
3. runtime heartbeat 时读取控制视图
4. runtime 拿到 `artifactMetadata`
5. 下载 snapshot / manifest
6. 安装到本地 release 目录
7. 更新 `runtime_state/current.json`
8. 回传 apply result

## 3. 支持的下发模式

1. `file`
2. `minio`
3. `admin_http_signed`

## 4. 本地状态

runtime 本地关键目录：

1. `runtime_artifacts/releases/<releaseId>/`
2. `runtime_state/current.json`

## 5. 关键代码入口

1. [`runtime-artifacts.js`](/Codex/ACDP/prototype/src/lib/runtime-artifacts.js)
2. [`runtime-control-client.js`](/Codex/ACDP/prototype/src/lib/runtime-control-client.js)
3. [`artifact-store.js`](/Codex/ACDP/prototype/src/lib/artifact-store.js)
4. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)

## 6. 回滚设计

当前回滚链：

1. 安装失败时保留当前 active 版本
2. 切换后验证失败时回滚到 previous 版本
3. 回传 `rolled_back`

## 7. 修改风险

1. 改 `artifactMetadata` 结构会影响所有 delivery mode
2. 改 `current.json` 结构会影响 runtime 启动与恢复

## 8. 相关测试

1. [`runtime-control.test.js`](/Codex/ACDP/prototype/tests/unit/runtime-control.test.js)
2. [`artifact-store.test.js`](/Codex/ACDP/prototype/tests/unit/artifact-store.test.js)
