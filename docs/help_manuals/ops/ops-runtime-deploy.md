# 部署手册：runtime 启动与部署

## 1. 基本命令

```bash
npm run start:runtime
```

## 2. 作用

- 启动单实例 runtime
- 提供 runtime 对外纠错接口

## 3. 快照下发模式

runtime 当前支持三种快照下发模式：

- `file`
- `admin_http_signed`
- `minio`

其中：

- `file` 适合同机或共享挂载目录
- `admin_http_signed` 适合跨机但不依赖 MinIO 的轻量部署
- `minio` 适合对象存储部署

## 4. 当前默认配置

当前仓库默认：

- `runtimeDelivery.mode = admin_http_signed`

因此 runtime 部署时，至少要关注：

- `ACDP_RUNTIME_CONTROL_ADMIN_BASE_URL`
- `ACDP_RUNTIME_ARTIFACT_BASE_URL`

如果 runtime 和 admin 不在同一台机器，`ACDP_RUNTIME_ARTIFACT_BASE_URL` 不能继续用 `127.0.0.1`。

补充：

- `ACDP_RUNTIME_ARTIFACT_SIGNED_URL_SECRET` 主要由 admin 侧加载
- runtime 启动命令通常不需要单独携带该变量
