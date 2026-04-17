# 故障排查：节点启动成功但未注册

## 1. 现象

- runtime 进程已经监听端口
- 但在 `运行节点` 页面看不到该节点已注册

## 2. 优先排查项

### 2.1 `nodeId`

必须与节点备案中的 `nodeId` 完全一致。

### 2.2 `nodeAddress`

必须与节点备案中的地址完全一致。

### 2.3 `registration-secret`

必须使用创建备案或轮换密钥时返回的明文密钥。

注意：

- 密钥指纹不能用来启动 runtime

### 2.4 `ACDP_RUNTIME_TOKEN`

如果 admin 当前启用了 `ACDP_RUNTIME_TOKEN`，runtime 启动时也必须带同一个值。

### 2.5 `ACDP_RUNTIME_ARTIFACT_BASE_URL`

如果当前下发模式是 `admin_http_signed`，跨机时不能继续使用：

- `http://127.0.0.1:8788`

必须改成 runtime 实际可访问的 admin 地址。

## 3. 推荐排查顺序

1. 先确认备案信息
2. 再确认启动命令是否与部署说明一致
3. 再确认是否拿错了密钥指纹
4. 再确认 admin 是否启用了 runtime token
5. 如果是跨机，再确认 `ACDP_RUNTIME_ARTIFACT_BASE_URL` 是否仍错误指向本机回环地址
