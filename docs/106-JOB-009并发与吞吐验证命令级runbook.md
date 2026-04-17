# JOB-009 并发与吞吐验证命令级 runbook

## 1. 目的

本文档用于在真实宿主机上，执行 `JOB-009` 的命令级压测与留档。

## 2. 前提

执行前必须已具备：

- 可访问 runtime base URL
- 如需鉴权，已提供 `ACDP_RUNTIME_TOKEN`
- 允许压测的时间窗口

## 3. 执行顺序

### 3.1 记录环境

```bash
uname -a > host-info.txt
node -v >> host-info.txt
nproc >> host-info.txt
free -m >> host-info.txt
```

### 3.2 采集运行前状态

```bash
curl -H "Authorization: Bearer ${ACDP_RUNTIME_TOKEN}" http://<runtime-host>:<port>/api/runtime/stats > runtime-stats-before.json
```

如未启用 token，则去掉 `Authorization` 头。

### 3.3 基础并发验证

```bash
cd /Codex/ACDP
npm run test:concurrency -- --base-url http://<runtime-host>:<port> --users 1 --iterations 20 > baseline-users-1.txt
npm run test:concurrency -- --base-url http://<runtime-host>:<port> --users 3 --iterations 20 > baseline-users-3.txt
npm run test:concurrency -- --base-url http://<runtime-host>:<port> --users 5 --iterations 20 > baseline-users-5.txt
```

### 3.4 目标吞吐验证

```bash
cd /Codex/ACDP
npm run test:concurrency -- --base-url http://<runtime-host>:<port> --users 5 --iterations 50 --target-rps 200 > target-rps-200.txt
```

### 3.5 采集运行后状态

```bash
curl -H "Authorization: Bearer ${ACDP_RUNTIME_TOKEN}" http://<runtime-host>:<port>/api/runtime/stats > runtime-stats-after.json
```

## 4. 输出文件建议

建议统一归档到：

- `concurrency/`

建议文件名：

- `concurrency/host-info.txt`
- `concurrency/runtime-stats-before.json`
- `concurrency/runtime-stats-after.json`
- `concurrency/baseline-users-1.txt`
- `concurrency/baseline-users-3.txt`
- `concurrency/baseline-users-5.txt`
- `concurrency/target-rps-200.txt`
- `concurrency/concurrency-summary.json`
- `concurrency/test-concurrency-command.txt`

## 5. 通过标准

- 基础并发命令可完成
- 无不可接受错误率
- 有明确 p50 / p95 / max 延迟
- 有目标吞吐结论

## 6. 当前用途

本文档当前作为：

- `JOB-090` 对 `JOB-009` 的命令级执行 runbook
