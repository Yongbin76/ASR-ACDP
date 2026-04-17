# JOB-090 外部条件测试 runbook

## 1. 文档目的

本文档用于把 `JOB-090` 需要衔接的外部条件测试执行入口固定下来。

当前重点覆盖：

- `JOB-006`
- `JOB-009`
- `JOB-030`

## 2. 使用原则

- 当前会话环境无法直接替代真实外部环境执行
- 人工或运维负责提供环境并执行必要命令
- 测试 Codex 负责命令清单、结果分析、证据归档和 blocker 判断

## 3. JOB-006 runbook

目标：

- 验证真实目标 K8S 集群 split 部署

执行前提：

- `kubeconfig`
- 目标 namespace
- 镜像仓库与凭据
- 可访问的 admin / runtime service

建议执行步骤：

1. 检查 kube context
2. 检查 namespace 和 secret
3. 应用 admin / runtime 资源清单
4. 等待 pod ready
5. 获取 admin / runtime service 访问结果
6. 导出 pod describe 与日志
7. 归档到 `deployment/`

补充要求：

- 若本轮采用 `admin_http_signed`，需额外校验：
  - `runtimeDelivery.adminArtifactBaseUrl`
  - `runtimeDelivery.signedUrlSecret`
  - runtime 节点是否能从 admin 直接拉到 `snapshot.json`

建议命令：

```bash
cd /Codex/ACDP
npm run check:k8s-target
kubectl config current-context
kubectl get ns
kubectl -n <namespace> get pods,svc,ingress
kubectl -n <namespace> describe pods > kubectl-describe-pods.txt
kubectl -n <namespace> logs deploy/acdp-admin > kubectl-logs-admin.txt
kubectl -n <namespace> logs deploy/acdp-runtime > kubectl-logs-runtime.txt
```

输出证据：

- `cluster-check.txt`
- `kubectl-get-all.txt`
- `kubectl-describe-pods.txt`
- `kubectl-logs-*.txt`
- `service-curl-*.txt`

建议文件名：

- `deployment/cluster-check.txt`
- `deployment/kubectl-get-all.txt`
- `deployment/kubectl-describe-pods.txt`
- `deployment/kubectl-logs-admin.txt`
- `deployment/kubectl-logs-runtime-1.txt`
- `deployment/kubectl-logs-runtime-2.txt`
- `deployment/service-curl-admin.txt`
- `deployment/service-curl-runtime.txt`

## 4. JOB-009 runbook

目标：

- 验证真实宿主机并发与吞吐

执行前提：

- 可访问 runtime base URL
- 如有需要，提供 `ACDP_RUNTIME_TOKEN`
- 压测窗口

建议执行步骤：

1. 记录宿主机信息
2. 记录 runtime stats before
3. 跑基础并发验证
4. 跑目标吞吐验证
5. 记录 runtime stats after
6. 输出压测结论
7. 归档到 `concurrency/`

补充要求：

- 并发验证前先记录当前运行快照下发模式
- 若采用 `admin_http_signed`，要额外观察 admin 是否因 runtime 下载制品而出现异常峰值

建议命令：

```bash
cd /Codex/ACDP
npm run test:concurrency -- --base-url http://<runtime-host>:<port> --users 1 --iterations 20
npm run test:concurrency -- --base-url http://<runtime-host>:<port> --users 3 --iterations 20
npm run test:concurrency -- --base-url http://<runtime-host>:<port> --users 5 --iterations 20
npm run test:concurrency -- --base-url http://<runtime-host>:<port> --users 5 --iterations 50 --target-rps 200
```

输出证据：

- `host-info.txt`
- `runtime-stats-before.json`
- `runtime-stats-after.json`
- `concurrency-summary.json`
- `test-concurrency-command.txt`

建议文件名：

- `concurrency/host-info.txt`
- `concurrency/runtime-stats-before.json`
- `concurrency/runtime-stats-after.json`
- `concurrency/concurrency-summary.json`
- `concurrency/test-concurrency-command.txt`

## 5. JOB-030 runbook

目标：

- 形成发布前最终证据包和 go / no-go 结论

前提：

- `JOB-006` 完成
- `JOB-009` 完成

建议执行步骤：

1. 归档部署证据
2. 归档吞吐证据
3. 归档 console 回归结果
4. 归档发布 / 回滚演练结果
5. 汇总 `summary.json`
6. 输出 `go-no-go.md`

建议命令：

```bash
cd /Codex/ACDP
npm run smoke:console
npm run test:console
npm run test:unit
```

输出证据：

- `deployment/`
- `concurrency/`
- `console/`
- `release/`
- `docs/`
- `summary.json`
- `go-no-go.md`

建议文件名：

- `console/smoke-console.txt`
- `console/test-console.txt`
- `release/release-list.json`
- `release/release-detail.json`
- `release/release-risk.json`
- `release/rollback-evidence.json`
- `docs/release-notes.md`
- `docs/deployment-manual.md`
- `docs/rollback-manual.md`
- `summary.json`
- `go-no-go.md`

## 6. 当前用途

本文档当前作为：

- `JOB-090` 的外部条件 runbook 基线
- 后续测试 Codex 接手 `JOB-006 / JOB-009 / JOB-030` 的直接入口

如需命令级直接执行入口，继续阅读：

- [105-JOB-006真实部署验证命令级runbook](./105-JOB-006真实部署验证命令级runbook.md)
- [106-JOB-009并发与吞吐验证命令级runbook](./106-JOB-009并发与吞吐验证命令级runbook.md)
- [107-JOB-030发布前证据收口命令级runbook](./107-JOB-030发布前证据收口命令级runbook.md)
