# 部署手册：多 runtime 实例部署

## 1. 适用场景

- 1 admin + 2/3 runtime

## 2. 推荐命令

```bash
npm run start:runtime:instance -- --instance <instanceId> --port <port> --node-id <nodeId> --node-name <nodeName> --node-env <env> --node-address <address> --admin-base-url <adminBaseUrl> --registration-secret <secret>
```

## 3. 当前默认下发模式

当前仓库默认按 `admin_http_signed` 下发 runtime 快照。

因此多 runtime 跨机部署时，建议统一注入：

```bash
export ACDP_RUNTIME_CONTROL_ADMIN_BASE_URL=http://<admin-host>:8788
export ACDP_RUNTIME_ARTIFACT_BASE_URL=http://<admin-host>:8788
```

说明：

- 多个 runtime 实例通常可以共用同一个 `ACDP_RUNTIME_ARTIFACT_BASE_URL`
- 但每个实例仍必须使用自己备案对应的 `nodeId`、`nodeAddress` 和 `registration-secret`
- `ACDP_RUNTIME_ARTIFACT_SIGNED_URL_SECRET` 主要由 admin 侧加载，不是每个 runtime 实例都必须显式携带
