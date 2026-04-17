# 页面手册：节点备案

## 1. 页面目标

`节点备案` 页用于先建立 runtime 节点台账，再为后续 runtime 注册、心跳、目标版本收敛和运行验证提供唯一身份。

## 2. 适用角色

- 运维操作人
- 管理员

## 3. 页面主对象

- 备案节点

说明：

- 本页不以在线 runtime 为主对象
- 本页以“应该存在的节点”作为治理基线

## 4. 页面区块

### 4.1 备案节点列表

展示：

- 节点 ID
- 节点名称
- 备案状态
- 注册状态
- 实时状态
- 地址
- 最近心跳
- 密钥指纹

### 4.2 新增 / 编辑备案节点

用于维护：

- `nodeId`
- `nodeName`
- `env`
- `address`
- `remarks`

### 4.3 节点操作

用于执行高风险动作：

- 启用备案
- 禁用备案
- 轮换密钥

### 4.4 部署与注册说明

用于查看：

- 当前节点的推荐环境变量
- 直接启动命令
- `start:runtime:instance` 启动命令
- 守护启动命令
- 当前 admin 是否启用了 `ACDP_RUNTIME_TOKEN`
- 当前 runtime 快照下发模式
- `admin_http_signed` 跨机部署时需要改哪些地址

## 5. 主要按钮

### 5.1 `创建备案`

- 作用：新增一条节点备案记录
- 点击后结果：系统返回一次性明文 `registration-secret`
- 下一步：立即保存明文密钥，然后部署 runtime

### 5.2 `保存备案`

- 作用：更新节点名称、环境、地址和备注
- 下一步：如果地址有变化，需同步更新 runtime 启动参数

### 5.3 `禁用备案`

- 作用：将节点备案置为禁用
- 影响：该节点不应继续注册

### 5.4 `启用备案`

- 作用：恢复一个已禁用的备案节点

### 5.5 `轮换密钥`

- 作用：生成新的明文 `registration-secret`
- 影响：旧密钥立即失效
- 下一步：用新的明文密钥重启 runtime

## 6. 关键概念

### 6.1 `registration-secret`

- 用途：runtime 注册和心跳时的节点级明文密钥
- 来源：创建备案或轮换密钥时一次性返回
- 注意：页面不会长期回显明文

### 6.2 密钥指纹

- 用途：核对当前备案所使用的是哪一把密钥
- 注意：不是明文密钥，不能用于启动 runtime

### 6.3 `ACDP_RUNTIME_TOKEN`

- 用途：runtime 到 admin 的 Bearer Token
- 是否需要：取决于当前 admin 是否启用该 token

### 6.4 `ACDP_RUNTIME_ARTIFACT_BASE_URL`

- 用途：`admin_http_signed` 模式下，runtime 下载 `snapshot.json / manifest.json / package.tar.gz` 时访问的 admin 地址
- 默认值：常见为 `http://127.0.0.1:8788`
- 跨机时必须改成 runtime 实际可访问的 admin 地址

### 6.5 `ACDP_RUNTIME_ARTIFACT_SIGNED_URL_SECRET`

- 用途：admin 生成运行快照签名 URL 的密钥
- 要求：admin 侧必须配置；建议通过环境变量注入
- 说明：runtime 不需要自己计算签名，但运维应确保 admin 实际加载了这把密钥

## 7. 当前默认口径

当前仓库默认：

- `runtimeDelivery.mode = admin_http_signed`
- runtime 通过 admin 的签名下载接口拉取快照文件
- release 文件底座仍默认保存在本地 `file://` 目录

## 8. 跨机部署时必须改什么

如果 admin 和 runtime 不在同一台机器，不能继续用：

- `http://127.0.0.1:8788`

应至少改成 runtime 实际可访问的 admin 地址，例如：

```bash
export ACDP_RUNTIME_CONTROL_ADMIN_BASE_URL=http://122.51.13.230:8788
export ACDP_RUNTIME_ARTIFACT_BASE_URL=http://122.51.13.230:8788
```

说明：

- `ACDP_RUNTIME_CONTROL_ADMIN_BASE_URL` 决定 runtime 去哪里读 `/api/runtime-control/me`
- `ACDP_RUNTIME_ARTIFACT_BASE_URL` 决定 runtime 去哪里拉签名快照文件
- 两者通常可以指向同一个 admin 地址
- `ACDP_RUNTIME_ARTIFACT_SIGNED_URL_SECRET` 主要由 admin 侧加载，不是 runtime 启动命令必须携带的变量

## 9. 启动命令示例

### 9.1 同机

```bash
cd /Codex/ACDP
export ACDP_RUNTIME_ARTIFACT_BASE_URL=http://127.0.0.1:8788
npm run start:runtime:instance -- \
  --instance ACDP_AGENT_001 \
  --port 8791 \
  --node-id ACDP_AGENT_001 \
  --node-name "ACDP_AGENT_001" \
  --node-env test \
  --node-address http://127.0.0.1:8791 \
  --admin-base-url http://127.0.0.1:8788 \
  --registration-secret 你的明文备案密钥
```

### 9.2 跨机

```bash
cd /Codex/ACDP
export ACDP_RUNTIME_CONTROL_ADMIN_BASE_URL=http://122.51.13.230:8788
export ACDP_RUNTIME_ARTIFACT_BASE_URL=http://122.51.13.230:8788
npm run start:runtime:instance -- \
  --instance ACDP_AGENT_001 \
  --port 8791 \
  --node-id ACDP_AGENT_001 \
  --node-name "ACDP_AGENT_001" \
  --node-env test \
  --node-address http://122.51.13.230:8791 \
  --admin-base-url http://122.51.13.230:8788 \
  --registration-secret 你的明文备案密钥
```
