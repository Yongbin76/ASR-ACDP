# 故障排查：制品下载失败

## 1. 常见现象

- `artifact download failed: 404`
- `artifact download failed: 401/403`

## 2. 优先检查

- 目标版本是否已经下发
- 当前使用的是哪一种下发模式：
  - `file`
  - `admin_http_signed`
  - `minio`
- 对应模式下制品是否存在且可访问
- 下载 URL 是否过期
- 下载鉴权是否正确

## 3. 按模式排查

### 3.1 `file`

- 检查 admin 和 runtime 是否共享同一目录或挂载点
- 检查目标 `snapshot.json` / `manifest.json` 是否存在
- 检查 runtime 读取到的 `file://` 路径是否正确

### 3.2 `admin_http_signed`

- 检查 `runtimeDelivery.adminArtifactBaseUrl` 是否可达
- 检查 `runtimeDelivery.signedUrlSecret` 是否已配置
- 检查节点是否已备案且启用
- 检查签名 URL 是否已过期
- 检查下载路由：
  - `GET /api/runtime-artifacts/releases/:releaseId/:fileName`

### 3.3 `minio`

- 检查 MinIO / 对象存储中制品是否存在
- 检查预签名 URL 是否过期
- 检查对象存储凭据和访问权限
