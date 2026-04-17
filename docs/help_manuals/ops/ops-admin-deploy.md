# 部署手册：admin 启动与部署

## 1. 基本命令

```bash
npm run start:admin
```

## 2. 作用

- 启动 admin 控制面
- 提供 `/console`、管理接口、release 与节点控制能力

补充：

- `/admin` 不再作为后台页面入口
- 访问 `/admin` 时应跳转到 `/console`

## 3. 运行快照下发

admin 当前除控制面接口外，还可在 `admin_http_signed` 模式下提供 runtime 快照下载：

- `GET /api/runtime-artifacts/releases/:releaseId/:fileName`

该接口仅用于 runtime 拉取：

- `snapshot.json`
- `manifest.json`
- `package.tar.gz`

## 4. 当前默认建议

当前仓库默认建议：

- `runtimeDelivery.mode = admin_http_signed`
- admin 通过环境变量或配置提供：
  - `ACDP_RUNTIME_ARTIFACT_BASE_URL`
  - `ACDP_RUNTIME_ARTIFACT_SIGNED_URL_SECRET`

如果 runtime 和 admin 跨机，`ACDP_RUNTIME_ARTIFACT_BASE_URL` 必须配置成 runtime 实际可访问的 admin 地址。
