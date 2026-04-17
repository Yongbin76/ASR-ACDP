# 本地 MinIO 与制品仓凭据注入说明

## 1. 目的

本说明用于明确：

- 本地开发环境如何启动和停止 MinIO
- `artifact_store.config.json` 如何继续作为唯一配置入口
- 宿主 / 生产环境如何通过环境变量注入制品仓敏感信息

## 2. 本地开发基线

当前推荐的本地基线：

- 使用 `artifact_store.config.json` 作为唯一制品仓配置入口
- 当前仓库默认 runtime 快照下发模式为 `admin_http_signed`
- `artifactStore` 当前默认仍指向本地 `file://` 目录作为 release 文件存储位置
- docker MinIO 继续保留为可选联调链路，而不是当前默认下发基线
- 使用以下命令管理本地 MinIO：
  - `npm run local:minio:start`
  - `npm run local:minio:status`
  - `npm run local:minio:stop`

说明：

- `npm run local:minio:start` 会读取 `prototype/config/artifact_store.config.json`
- 若当前 endpoint 为本机地址，且凭据字段为空，则会自动生成一组本地开发凭据并写回配置文件
- 该行为仅用于本地开发，不应直接照搬到生产环境
- `npm run local:minio:status` 当前会明确返回：
  - `defaultLocalDevBaseline=true`
  - 若 docker daemon 不可达，还会返回 `container.blocker`
  - 常见阻塞值为 `docker_socket_permission_denied`

## 3. 控制面验证命令

本地验证建议同时保留两条链路：

- `npm run check:control-config`
- `npm run verify:runtime-control -- --artifact-store-mode=admin_http_signed`
- `npm run verify:runtime-control -- --artifact-store-mode=configured`
- `npm run verify:runtime-control -- --artifact-store-mode=file`

用途：

- `check:control-config`：在真实宿主 / 目标集群切换前检查当前值来自配置文件还是环境变量，并检查 MinIO 健康与 runtime token
- `admin_http_signed`：验证 admin 作为 runtime 快照下载源站时的本地链路
- `configured`：验证真实 MinIO 配置模式
- `file`：验证不依赖远端对象存储的本地回归链路

说明：

- `check:control-config` 会把 `ACDP_RUNTIME_TOKEN` 也纳入检查
- `check:control-config` 默认会对敏感字段脱敏显示
- `check:control-config` 当前还会显式标记：
  - `artifactStore.localCredentialMode.active=true`
  - 用于提示“当前仍处于本地开发凭据模式，尚未切换到真实环境的 *Env 注入口径”
- 如果要强制检查关键字段必须来自环境变量，而不是回退到文件值，可这样执行：

```bash
ACDP_RUNTIME_TOKEN=real-token npm run check:control-config -- --require-env-sources
```
- 如果当前 shell 尚未注入 runtime token，可这样执行：

```bash
ACDP_RUNTIME_TOKEN=local-wrapup-token npm run check:control-config
```

## 4. 配置文件驱动原则

MinIO 相关信息必须通过：

- `prototype/config/artifact_store.config.json`

读取，不能硬编码进业务代码。

当前配置文件已支持以下“配置驱动 + 环境变量注入”模式：

- 直接值字段，例如：
  - `endpoint`
  - `publicBaseUrl`
  - `bucket`
  - `rootUser`
  - `rootPassword`
  - `accessKey`
  - `secretKey`
- 对应的环境变量名字段，例如：
  - `endpointEnv`
  - `publicBaseUrlEnv`
  - `bucketEnv`
  - `regionEnv`
  - `rootUserEnv`
  - `rootPasswordEnv`
  - `accessKeyEnv`
  - `secretKeyEnv`

`runtimeControl` 中当前也支持以下 `*Env` 字段：

- `adminBaseUrlEnv`
- `nodeIdEnv`
- `nodeNameEnv`
- `nodeEnvEnv`
- `nodeAddressEnv`

解析规则：

1. 先读取配置中的 `xxxEnv`
2. 如果该环境变量已注入，则使用环境变量值
3. 否则回退到配置文件中的直接值

这样可以保证：

- 配置入口仍然是 `artifact_store.config.json`
- 宿主 / 生产环境的敏感值不需要直接写死在仓库文件中

## 5. 推荐环境变量

建议统一使用：

- `ACDP_ARTIFACT_ENDPOINT`
- `ACDP_ARTIFACT_PUBLIC_BASE_URL`
- `ACDP_ARTIFACT_BUCKET`
- `ACDP_ARTIFACT_REGION`
- `ACDP_ARTIFACT_ROOT_USER`
- `ACDP_ARTIFACT_ROOT_PASSWORD`
- `ACDP_ARTIFACT_ACCESS_KEY`
- `ACDP_ARTIFACT_SECRET_KEY`
- `ACDP_RUNTIME_TOKEN`

## 6. 宿主 / 生产环境建议

建议区分两类环境：

### 本地开发

- 允许配置文件中保留本地开发用 endpoint
- 允许使用 `npm run local:minio:start` 自动生成本地开发凭据

### 宿主 / 生产

- `artifact_store.config.json` 中保留 `xxxEnv` 字段
- 通过 systemd、shell env、K8S Secret、容器 env 注入真实值
- 不建议把真实 root/access 凭据直接提交到仓库

K8S 示例：

- `k8s/artifact-store-secret.example.yaml`
- `k8s/runtime-deployment.yaml`
- `k8s/admin-deployment.yaml`

## 7. 当前收尾建议

当前建议按以下顺序推进：

1. 本地默认按 `admin_http_signed + file artifact store` 跑通 runtime 安装链路
2. 如需对象存储链路，再额外启用本地 docker MinIO
3. 在宿主 / 生产环境切换为 `xxxEnv` 注入真实凭据
4. 保持 `admin_http_signed`、`configured` 和 `file` 三条验证链路都可重跑
5. 再进入真实宿主 / 集群控制面验证

当前在本机/沙箱中的常见阻塞：

- docker daemon socket 无权限
- 本机 MinIO 未启动导致 `check:control-config` 健康检查失败

这两类阻塞不影响“本地基线口径已经确定”，但会阻塞继续收集新的本机 `configured` 验证证据。
