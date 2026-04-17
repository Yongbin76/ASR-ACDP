# R7 证据包目录与 go/no-go 模板

## 1. 文档目的

本文档用于把 `R7` 需要的真实验证证据包目录结构和 `go / no-go` 模板固定下来。

目标是让后续 Codex、测试或运维在进入正式发布准备阶段时，不需要再自己决定：

- 证据放哪里
- 证据目录怎么组织
- go/no-go 结论怎么写

## 2. 证据包总目录建议

建议在：

- `prototype/workspace/host_verification/`

下，增加统一的 `v1_release_readiness` 目录。

建议结构：

```text
prototype/workspace/host_verification/
  2026-05-08T12-00-00Z_v1_release_readiness/
    deployment/
    concurrency/
    console/
    release/
    docs/
    summary.json
    go-no-go.md
```

其中：

- `deployment/`
  真实部署证据
- `concurrency/`
  真实宿主机并发与吞吐证据
- `console/`
  关键控制台回归与人工截图
- `release/`
  发布、灰度、回滚和风险相关证据
- `docs/`
  发布说明、回滚手册、操作手册快照

## 3. 子目录建议

### 3.1 `deployment/`

建议内容：

- `cluster-check.txt`
- `kubectl-get-all.txt`
- `kubectl-describe-pods.txt`
- `kubectl-logs-admin.txt`
- `kubectl-logs-runtime-1.txt`
- `kubectl-logs-runtime-2.txt`
- `service-curl-admin.txt`
- `service-curl-runtime.txt`

### 3.2 `concurrency/`

建议内容：

- `concurrency-summary.json`
- `runtime-stats-before.json`
- `runtime-stats-after.json`
- `host-info.txt`
- `test-concurrency-command.txt`

### 3.3 `console/`

建议内容：

- `smoke-console.txt`
- `test-console.txt`
- 关键截图：
  - `workbench.png`
  - `runtime-nodes.png`
  - `release-detail.png`
  - `help-center.png`

### 3.4 `release/`

建议内容：

- `release-list.json`
- `release-detail.json`
- `release-risk.json`
- `rollback-evidence.json`
- `gray-policy.json`

### 3.5 `docs/`

建议内容：

- `release-notes.md`
- `deployment-manual.md`
- `rollback-manual.md`
- `go-no-go-checklist.md`

当前仓库中的对应模板建议使用：

- [86-v1.0发布手册](./86-v1.0发布手册.md)
- [87-v1.0回滚手册](./87-v1.0回滚手册.md)
- [88-v1.0发布说明模板](./88-v1.0发布说明模板.md)
- [89-v1.0-go-no-go清单模板](./89-v1.0-go-no-go清单模板.md)

## 4. `summary.json` 模板建议

建议固定字段：

```json
{
  "version": "v1.0.0-rc1",
  "evaluatedAt": "2026-05-08T12:00:00Z",
  "deployment": {
    "ok": true,
    "evidenceDir": "deployment/"
  },
  "concurrency": {
    "ok": true,
    "evidenceDir": "concurrency/"
  },
  "consoleRegression": {
    "ok": true,
    "evidenceDir": "console/"
  },
  "releaseFlow": {
    "ok": true,
    "evidenceDir": "release/"
  },
  "docs": {
    "ok": true,
    "evidenceDir": "docs/"
  },
  "decision": {
    "result": "GO",
    "blockers": []
  }
}
```

## 5. `go-no-go.md` 模板建议

建议固定结构：

```md
# v1.0 GO / NO-GO

## 基础信息

- 版本：
- 评审时间：
- 评审人：
- 发布负责人：
- 回滚负责人：

## 必须项

- [ ] 真实部署验证完成
- [ ] 真实并发与吞吐验证完成
- [ ] 控制台回归通过
- [ ] 发布链路验证通过
- [ ] 回滚链路验证通过
- [ ] 在线帮助手册齐全
- [ ] 部署 / 回滚 / 发布说明齐全

## blocker

- blocker 1：
- blocker 2：

## 最终结论

- GO / NO-GO：
- 结论说明：
```

## 6. 与 `JOB-006 / JOB-009` 的关系

### 6.1 `JOB-006`

其产出应进入：

- `deployment/`

### 6.2 `JOB-009`

其产出应进入：

- `concurrency/`

## 7. 当前用途

本文档当前用于：

- 补足 `JOB-030` 的“固定证据结构与模板”能力
- 让后续 Codex、测试和运维在进入发布准备阶段时有一致模板可用
