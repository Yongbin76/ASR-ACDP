# 流程手册：节点备案到 runtime 接入

## 1. 目标

把一台新的 runtime 节点纳入 admin 控制面。

## 2. 标准流程

1. 进入 `节点备案`
2. 创建备案
3. 记录一次性返回的明文 `registration-secret`
4. 按页面中的部署与注册说明启动 runtime
5. 到 `运行节点` 页面确认：
   - 节点已注册
   - 节点产生心跳
   - 节点可见目标版本
6. 到 `运行验证` 页面验证当前 runtime 行为

补充：

- 当前默认下发模式为 `admin_http_signed`
- 如果 admin 和 runtime 跨机，启动前必须确认 `ACDP_RUNTIME_ARTIFACT_BASE_URL` 已改成 runtime 可访问的 admin 地址

## 3. 常见中断点

### 3.1 启动成功但未注册

优先检查：

- `nodeId`
- `nodeAddress`
- `registration-secret`
- `ACDP_RUNTIME_TOKEN`
- `ACDP_RUNTIME_ARTIFACT_BASE_URL`

### 3.2 注册成功但一直未收敛

优先检查：

- 当前是否已经下发目标版本
- runtime 是否能下载制品
- `lastApplyStatus`
- 签名下载地址是否过期或仍指向 `127.0.0.1`
