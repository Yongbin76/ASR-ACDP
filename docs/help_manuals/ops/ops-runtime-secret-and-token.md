# 部署手册：registration-secret、密钥指纹与 runtime token

## 1. `registration-secret`

用途：

- runtime 节点向 admin 注册和心跳时使用的节点级明文密钥

特点：

- 创建备案或轮换密钥时一次性返回
- 页面不会长期展示
- 旧密钥在轮换后立即失效

## 2. 密钥指纹

用途：

- 只用于核对当前备案所使用的是哪一把密钥

注意：

- 不是明文密钥
- 不能作为 `--registration-secret` 使用

## 3. `ACDP_RUNTIME_TOKEN`

用途：

- runtime 到 admin 的 Bearer Token

特点：

- 只有 admin 启用了该 token，runtime 才需要配置
- 如果 admin 未启用，runtime 启动命令中无需附带该变量

## 4. 启动命令原则

### 4.1 一定要匹配备案的

- `nodeId`
- `nodeAddress`

### 4.2 一定要使用明文的

- `registration-secret`

### 4.3 视 admin 配置决定是否附带

- `ACDP_RUNTIME_TOKEN`

### 4.4 当前默认下发模式额外关注项

当前仓库默认按 `admin_http_signed` 下发 runtime 快照，因此还要确认：

- `ACDP_RUNTIME_ARTIFACT_BASE_URL`
- `ACDP_RUNTIME_ARTIFACT_SIGNED_URL_SECRET`

其中：

- `ACDP_RUNTIME_ARTIFACT_BASE_URL` 在跨机时必须改成 runtime 实际可访问的 admin 地址
- `ACDP_RUNTIME_ARTIFACT_SIGNED_URL_SECRET` 主要由 admin 侧加载，但运维应确认已正确注入
