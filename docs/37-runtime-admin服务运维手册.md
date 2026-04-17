# Runtime / Admin 服务运维手册

## 1. 目的

本手册面向交接和运维执行，统一说明拆分后的两个服务：

- `acdp-runtime`
- `acdp-admin`

需要怎么安装依赖、如何部署、如何配置、如何启动、如何检测、如何停止。

## 2. 服务边界

### 2.1 `acdp-runtime`

负责：

- `GET /health`
- `GET /api/runtime/current`
- `GET /api/runtime/stats`
- `POST /api/runtime/reload`
- `POST /api/runtime/correct`
- `POST /api/runtime/correct_cand`
- `GET /ws/runtime/correct`
- `GET /ws/runtime/correct_cand`
- `POST /api/simulate`

不负责：

- `/admin`
- `/console`
- `/api/admin/*`
- `/api/console/*`

### 2.2 `acdp-admin`

负责：

- `/console`
- `/api/admin/*`
- `/api/console/*`

不负责：

- `/api/runtime/*`
- `/ws/runtime/correct`

补充：

- `/admin` 不再承载后台页面
- 访问 `/admin` 时应跳转到 `/console`

## 3. 前置安装

### 3.1 基础运行环境

宿主机要求：

- Ubuntu/Linux
- Node.js `>= 22.13.0`
- 当前仓库位于 `/Codex/ACDP`

基础检查：

```bash
cd /Codex/ACDP
npm run check:env
```

### 3.2 宿主机工具链

如需做容器/K8S 部署验证，宿主机还需要：

- `docker`
- `kubectl`

Ubuntu 24.04 可参考：

```bash
apt-get update
apt-get install -y docker.io
snap install kubectl --classic
```

### 3.3 可选本地 K8S 测试集群

如宿主机没有现成 K8S 集群，可使用 `kind` 做本地验证：

```bash
curl -L -o /usr/local/bin/kind https://github.com/kubernetes-sigs/kind/releases/download/v0.27.0/kind-linux-amd64
chmod +x /usr/local/bin/kind
kind version
kind create cluster --name acdp-split-test --wait 120s
```

## 4. 配置

统一配置文件：

- `prototype/config/app.config.json`
- `prototype/config/artifact_store.config.json`

当前拆分相关默认端口：

- `runtimePort = 8787`
- `adminPort = 8788`

### 4.1 `acdp-runtime` 关键配置

可通过环境变量覆盖：

- `ACDP_RUNTIME_PORT`
- `ACDP_RUNTIME_HOST`
- `ACDP_RUNTIME_TOKEN`
- `ACDP_RUNTIME_CONTROL_ADMIN_BASE_URL`
- `ACDP_RUNTIME_CONTROL_NODE_ID`
- `ACDP_RUNTIME_CONTROL_NODE_NAME`
- `ACDP_RUNTIME_CONTROL_NODE_ENV`
- `ACDP_RUNTIME_CONTROL_NODE_ADDRESS`
- `ACDP_RUNTIME_CONTROL_REGISTRATION_SECRET`
- `ACDP_RUNTIME_ARTIFACT_BASE_URL`
- `ACDP_RUNTIME_ARTIFACT_SIGNED_URL_SECRET`
- `ACDP_ARTIFACT_ENDPOINT`
- `ACDP_ARTIFACT_PUBLIC_BASE_URL`
- `ACDP_ARTIFACT_BUCKET`
- `ACDP_ARTIFACT_REGION`
- `ACDP_ARTIFACT_ROOT_USER`
- `ACDP_ARTIFACT_ROOT_PASSWORD`
- `ACDP_ARTIFACT_ACCESS_KEY`
- `ACDP_ARTIFACT_SECRET_KEY`

默认行为：

- 监听 `0.0.0.0:8787`
- 如果未启用 control-managed 模式，则读取共享 workspace 中的 `releases/latest/snapshot.json`
- 如果已配置 `runtimeControl.adminBaseUrl + nodeId`，则进入 control-managed 模式

### 4.2 `acdp-admin` 关键配置

可通过环境变量覆盖：

- `ACDP_ADMIN_PORT`
- `ACDP_ADMIN_HOST`
- `ACDP_RUNTIME_TOKEN`
- `ACDP_RUNTIME_ARTIFACT_BASE_URL`
- `ACDP_RUNTIME_ARTIFACT_SIGNED_URL_SECRET`
- `ACDP_ARTIFACT_ENDPOINT`
- `ACDP_ARTIFACT_PUBLIC_BASE_URL`
- `ACDP_ARTIFACT_BUCKET`
- `ACDP_ARTIFACT_REGION`
- `ACDP_ARTIFACT_ROOT_USER`
- `ACDP_ARTIFACT_ROOT_PASSWORD`
- `ACDP_ARTIFACT_ACCESS_KEY`
- `ACDP_ARTIFACT_SECRET_KEY`

默认行为：

- 监听 `0.0.0.0:8788`
- 启动前可执行 `setup:prototype`
- 负责初始化/维护共享 workspace、数据库和最新发布产物
- 负责下发 `desiredVersion` 并上传 release 制品到配置指向的 artifact store

### 4.3 制品仓配置与 Secret 注入

当前建议：

- `artifact_store.config.json` 继续作为唯一配置入口
- 运行快照下发模式通过 `runtimeDelivery.mode` 管理
- 宿主 / 生产环境通过 `*Env` 字段指向环境变量
- 真实 endpoint / bucket / 凭据通过 systemd env、容器 env 或 K8S Secret 注入

当前支持三种下发模式：

- `file`
  - 适合同机或共享挂载目录
- `admin_http_signed`
  - 适合 `1 admin + 1~3 runtime` 的跨机轻量部署
  - 依赖：
    - `runtimeDelivery.adminArtifactBaseUrl`
    - `runtimeDelivery.signedUrlSecret`
- `minio`
  - 适合正式对象存储场景

当前仓库默认配置：

- `runtimeDelivery.mode = admin_http_signed`
- `artifactStore.endpoint = file://...`

`admin_http_signed` 当前下载接口为：

```text
GET /api/runtime-artifacts/releases/:releaseId/:fileName
```

会校验：

- 签名
- 过期时间
- 节点备案状态
- 文件名白名单

参考：

- `docs/41-本地MinIO与制品仓凭据注入说明.md`
- `k8s/artifact-store-secret.example.yaml`

切换到真实宿主 / 集群前，建议先执行：

```bash
cd /Codex/ACDP
npm run check:control-config
npm run check:k8s-target
```

用途：

- 检查 artifact store / runtimeControl 当前值来自配置文件还是环境变量
- 检查 MinIO 健康接口是否可达
- 检查 runtime token 是否已注入
- 检查 kubectl client / current-context / namespace / Secret 是否齐备

## 5. 直接启动

### 5.1 启动 `acdp-runtime`

```bash
cd /Codex/ACDP
npm run start:runtime
```

如需启动独立 runtime 实例：

```bash
cd /Codex/ACDP
npm run start:runtime:instance -- --instance runtime-01 --port 8789 --node-id runtime-node-01 --node-name "Runtime Node 01" --node-env prod --node-address http://127.0.0.1:8789 --admin-base-url http://127.0.0.1:8788
```

### 5.2 启动 `acdp-admin`

```bash
cd /Codex/ACDP
npm run setup:prototype
npm run start:admin
```

说明：

- 如果未启用 control-managed 模式，`acdp-runtime` 依赖共享 workspace 中已有 `latest snapshot`
- 如果已启用 control-managed 模式，需先确保当前下发模式可达：
  - `file` 需要共享目录可访问
  - `admin_http_signed` 需要 admin 可访问，且签名密钥已配置
  - `minio` 需要对象存储可访问
- 正常顺序通常是先由 `acdp-admin` 完成初始化或发布，再启动 `acdp-runtime`

## 6. 后台守护运行

### 6.1 `acdp-runtime`

```bash
cd /Codex/ACDP
npm run service:start:runtime
npm run service:status:runtime
npm run service:stop:runtime
```

如需多实例守护：

```bash
cd /Codex/ACDP
npm run service:start:runtime -- --instance runtime-01 --port 8789 --node-id runtime-node-01 --node-address http://127.0.0.1:8789
npm run service:status:runtime -- --instance runtime-01
npm run service:stop:runtime -- --instance runtime-01
```

### 6.2 `acdp-admin`

```bash
cd /Codex/ACDP
npm run service:start:admin
npm run service:status:admin
npm run service:stop:admin
```

### 6.3 日志位置

PID / 日志目录：

- `prototype/workspace/service/`

文件名：

- `runtime.pid`
- `runtime.out.log`
- `runtime.err.log`
- `runtime-<instance>.pid`
- `runtime-<instance>.out.log`
- `runtime-<instance>.err.log`
- `admin.pid`
- `admin.out.log`
- `admin.err.log`

## 6.4 节点备案与注册

当前 runtime 节点接入 admin 前，必须先在 admin 侧完成备案。

接入约束：

- 节点必须存在于 `runtime_node_registry`
- 节点必须是 `enabled=true`
- runtime 请求除 shared runtime bearer token 外，还必须带节点级 `registrationSecret`
- `register / heartbeat` 上报地址必须与备案地址一致

可在控制台页面维护：

- `/console/runtime-node-registry`

## 7. 独立检测

### 7.1 `acdp-runtime`

Smoke：

```bash
cd /Codex/ACDP
npm run smoke:runtime
```

直接探测：

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/api/runtime/current
curl -X POST http://127.0.0.1:8787/api/runtime/correct \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d '{"text":"我想咨询旗顺路和工商认定。"}'
curl -X POST http://127.0.0.1:8787/api/runtime/correct_cand \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d '{"text":"我想咨询旗顺路和工商认定。"}'
curl -i http://127.0.0.1:8787/admin
```

预期：

- `/health` 200
- `/api/runtime/current` 200
- `/api/runtime/correct` 200
- `/admin` 404

### 7.2 `acdp-admin`

Smoke：

```bash
cd /Codex/ACDP
npm run smoke:admin
```

直接探测：

```bash
curl -i http://127.0.0.1:8788/admin
curl -i http://127.0.0.1:8788/console
curl -H 'x-role: dict_admin' -H 'x-operator: admin_verify' \
  http://127.0.0.1:8788/api/admin/dashboard
curl -H 'x-role: dict_admin' -H 'x-operator: admin_verify' \
  http://127.0.0.1:8788/api/console/overview
curl -i http://127.0.0.1:8788/api/runtime/current
```

预期：

- `/admin` 302 -> `/console`
- `/console` 200
- `/api/admin/dashboard` 200
- `/api/console/overview` 200
- `/api/runtime/current` 404

## 8. Docker 部署

### 8.1 构建镜像

```bash
cd /Codex/ACDP
docker build -f Dockerfile.runtime -t acdp-runtime:latest .
docker build -f Dockerfile.admin -t acdp-admin:latest .
```

### 8.2 本地容器验证

推荐用共享 volume 模拟共享 PVC：

```bash
docker volume create acdp-workspace-test

docker run -d --name acdp-admin-test \
  -p 18788:8788 \
  -v acdp-workspace-test:/app/prototype/workspace \
  -e ACDP_RUNTIME_TOKEN=replace-with-runtime-token \
  -e ACDP_ARTIFACT_ENDPOINT=http://host.docker.internal:9000 \
  -e ACDP_ARTIFACT_PUBLIC_BASE_URL=http://host.docker.internal:9000 \
  -e ACDP_ARTIFACT_BUCKET=acdp-artifacts \
  -e ACDP_ARTIFACT_ACCESS_KEY=replace-with-access-key \
  -e ACDP_ARTIFACT_SECRET_KEY=replace-with-secret-key \
  acdp-admin:latest

docker run -d --name acdp-runtime-test \
  -p 18787:8787 \
  -v acdp-workspace-test:/app/prototype/workspace \
  -e ACDP_RUNTIME_TOKEN=replace-with-runtime-token \
  -e ACDP_RUNTIME_CONTROL_ADMIN_BASE_URL=http://host.docker.internal:18788 \
  -e ACDP_RUNTIME_CONTROL_NODE_ID=runtime-docker-001 \
  -e ACDP_RUNTIME_CONTROL_NODE_NAME=runtime-docker-001 \
  -e ACDP_RUNTIME_CONTROL_NODE_ENV=docker \
  -e ACDP_RUNTIME_CONTROL_NODE_ADDRESS=http://127.0.0.1:18787 \
  -e ACDP_ARTIFACT_ENDPOINT=http://host.docker.internal:9000 \
  -e ACDP_ARTIFACT_PUBLIC_BASE_URL=http://host.docker.internal:9000 \
  -e ACDP_ARTIFACT_BUCKET=acdp-artifacts \
  -e ACDP_ARTIFACT_ACCESS_KEY=replace-with-access-key \
  -e ACDP_ARTIFACT_SECRET_KEY=replace-with-secret-key \
  acdp-runtime:latest
```

验证命令：

```bash
curl http://127.0.0.1:18787/health
curl http://127.0.0.1:18787/api/runtime/current
curl -i http://127.0.0.1:18787/admin

curl -i http://127.0.0.1:18788/admin
curl -i http://127.0.0.1:18788/console
curl -i http://127.0.0.1:18788/api/runtime/current
```

清理：

```bash
docker rm -f acdp-runtime-test acdp-admin-test
docker volume rm acdp-workspace-test
```

## 9. K8S 部署

### 9.1 资产

- `k8s/runtime-deployment.yaml`
- `k8s/runtime-service.yaml`
- `k8s/admin-deployment.yaml`
- `k8s/admin-service.yaml`
- `k8s/artifact-store-secret.example.yaml`
- `k8s/namespace.yaml`
- `k8s/pvc.yaml`

### 9.2 应用顺序

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/artifact-store-secret.example.yaml
kubectl apply -f k8s/runtime-deployment.yaml
kubectl apply -f k8s/runtime-service.yaml
kubectl apply -f k8s/admin-deployment.yaml
kubectl apply -f k8s/admin-service.yaml
```

### 9.3 说明

- `acdp-runtime` 与 `acdp-admin` 共享 `acdp-workspace-pvc`
- `runtime-deployment.yaml` 已增加 `initContainer`，会等待 `latest/snapshot.json` 存在后再启动 runtime
- 这样可以避免 admin 尚未初始化完成时 runtime 先 CrashLoop

### 9.4 K8S 验证

查看状态：

```bash
kubectl get pods -n acdp -o wide
kubectl get svc -n acdp
kubectl get pvc -n acdp
```

Port-forward 验证：

```bash
kubectl port-forward svc/acdp-runtime 28787:8787 -n acdp
kubectl port-forward svc/acdp-admin 28788:8788 -n acdp
```

然后执行：

```bash
curl http://127.0.0.1:28787/health
curl http://127.0.0.1:28787/api/runtime/current
curl -i http://127.0.0.1:28787/admin

curl -i http://127.0.0.1:28788/admin
curl -i http://127.0.0.1:28788/console
curl -i http://127.0.0.1:28788/api/runtime/current
```

## 10. 停止与清理

### 10.1 进程方式

```bash
npm run service:stop:runtime
npm run service:stop:admin
```

### 10.2 Docker 方式

```bash
docker rm -f acdp-runtime-test acdp-admin-test
docker volume rm acdp-workspace-test
```

### 10.3 K8S 方式

```bash
kubectl delete -f k8s/admin-service.yaml
kubectl delete -f k8s/admin-deployment.yaml
kubectl delete -f k8s/runtime-service.yaml
kubectl delete -f k8s/runtime-deployment.yaml
kubectl delete -f k8s/pvc.yaml
kubectl delete -f k8s/namespace.yaml
```

## 11. 当前已验证结论

截至当前代码版本：

- `acdp-runtime` / `acdp-admin` 代码层拆分已完成
- 独立启动、独立 service 管理、独立 smoke 已完成
- Docker 级 split 验证已通过
- 本地 `kind` 集群上的 split K8S 首轮验证已通过

仍需注意：

- 共享 PVC 仍是当前拆分方案成立的前提
- admin 仍是 snapshot 初始化与管理链路的源头
- runtime 当前仍依赖共享 workspace 中的最新发布产物
