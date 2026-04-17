# JOB-030 发布前证据收口命令级 runbook

## 1. 目的

本文档用于在 `JOB-006` 和 `JOB-009` 完成后，执行 `JOB-030` 的发布前证据收口。

## 2. 前提

执行前必须已满足：

- `JOB-006` 完成
- `JOB-009` 完成
- 发布与回滚手册齐备

## 3. 执行顺序

### 3.1 运行最终回归

```bash
cd /Codex/ACDP
npm run smoke:console > console/smoke-console.txt
npm run test:console > console/test-console.txt
npm run test:unit > console/test-unit.txt
```

### 3.2 导出发布相关证据

建议通过 console/admin 接口或已有脚本导出：

- release list
- release detail
- release risk
- rollback evidence

示意：

```bash
curl http://<admin-host>:8788/api/console/releases > release/release-list.json
curl http://<admin-host>:8788/api/console/releases/<releaseId> > release/release-detail.json
```

### 3.3 归档文档快照

建议复制或整理：

- 发布说明
- 部署手册
- 回滚手册
- go / no-go 检查清单

## 4. 输出文件建议

建议统一归档到：

- `console/`
- `release/`
- `docs/`

建议文件名：

- `console/smoke-console.txt`
- `console/test-console.txt`
- `console/test-unit.txt`
- `release/release-list.json`
- `release/release-detail.json`
- `release/release-risk.json`
- `release/rollback-evidence.json`
- `docs/release-notes.md`
- `docs/deployment-manual.md`
- `docs/rollback-manual.md`
- `summary.json`
- `go-no-go.md`

## 5. 通过标准

- 最终回归通过
- 证据包完整
- `summary.json` 完整
- `go-no-go.md` 完整

## 6. 当前用途

本文档当前作为：

- `JOB-090` 对 `JOB-030` 的命令级执行 runbook
