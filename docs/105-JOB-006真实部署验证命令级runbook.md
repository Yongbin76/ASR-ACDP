# JOB-006 真实部署验证命令级 runbook

## 1. 目的

本文档用于在真实目标 K8S 集群环境中，执行 `JOB-006` 的命令级验证。

## 2. 前提

执行前必须已具备：

- `kubeconfig`
- 目标 namespace
- 镜像仓库与凭据
- `acdp-admin` / `acdp-runtime` 相关 K8S 资产

## 3. 执行顺序

### 3.1 环境预检

```bash
cd /Codex/ACDP
npm run check:k8s-target
kubectl config current-context > cluster-check.txt
kubectl get ns > kubectl-get-ns.txt
kubectl -n <namespace> get secret > kubectl-get-secrets.txt
```

### 3.2 应用资源

```bash
cd /Codex/ACDP
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/runtime-deployment.yaml
kubectl apply -f k8s/runtime-service.yaml
kubectl apply -f k8s/admin-deployment.yaml
kubectl apply -f k8s/admin-service.yaml
```

### 3.3 观察资源

```bash
kubectl -n <namespace> get pods,svc,ingress -o wide > kubectl-get-all.txt
kubectl -n <namespace> describe pods > kubectl-describe-pods.txt
kubectl -n <namespace> logs deploy/acdp-admin > kubectl-logs-admin.txt
kubectl -n <namespace> logs deploy/acdp-runtime > kubectl-logs-runtime.txt
```

### 3.4 服务验证

如有 port-forward：

```bash
kubectl -n <namespace> port-forward svc/acdp-admin 8788:8788
kubectl -n <namespace> port-forward svc/acdp-runtime 8787:8787
```

另开终端执行：

```bash
curl http://127.0.0.1:8788/admin > service-curl-admin.txt
curl http://127.0.0.1:8788/console > service-curl-console.txt
curl http://127.0.0.1:8787/health > service-curl-runtime-health.txt
curl http://127.0.0.1:8787/api/runtime/current > service-curl-runtime-current.json
```

## 4. 输出文件建议

建议统一归档到：

- `deployment/`

建议文件名：

- `deployment/cluster-check.txt`
- `deployment/kubectl-get-ns.txt`
- `deployment/kubectl-get-secrets.txt`
- `deployment/kubectl-get-all.txt`
- `deployment/kubectl-describe-pods.txt`
- `deployment/kubectl-logs-admin.txt`
- `deployment/kubectl-logs-runtime.txt`
- `deployment/service-curl-admin.txt`
- `deployment/service-curl-console.txt`
- `deployment/service-curl-runtime-health.txt`
- `deployment/service-curl-runtime-current.json`

## 5. 通过标准

- admin pod ready
- runtime pod ready
- `/admin` 可访问
- `/console` 可访问
- runtime `/health` 可访问
- runtime `/api/runtime/current` 可访问

## 6. 当前用途

本文档当前作为：

- `JOB-090` 对 `JOB-006` 的命令级执行 runbook
