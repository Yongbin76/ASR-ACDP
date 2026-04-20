# JOB-036 `admin_http_signed` 运行快照下发实施拆解与收尾标准

## 1. 目标

本文档用于记录 [138-v1.0运行快照下发模式对照与admin_http_signed落地方案](./138-v1.0运行快照下发模式对照与admin_http_signed落地方案.md) 的实际实施拆解与收尾结果。

本批次的目标是：

- 在保留现有 `file / minio` 兼容能力的前提下
- 新增第三种 runtime 快照下发模式 `admin_http_signed`
- 让 `1 admin + 1~3 runtime` 在无 MinIO、无共享目录的场景下也能完成版本安装

当前状态：

- `JOB-036` 已完成编码
- 当前代码已落地：
  - `file`
  - `admin_http_signed`
  - `minio`

## 2. 范围边界

### 2.1 本批次要做

- 新增 `runtimeDelivery` 配置段
- 新增 `admin_http_signed` 模式
- admin 新增运行快照下载接口
- runtime control 根据模式生成对应 `artifactUrl`
- 补单元测试、集成测试、帮助文档和运维说明

### 2.2 本批次不做

- 不重构 runtime 安装主流程
- 不移除现有 `file / minio` 模式
- 不引入新的外部对象存储组件
- 不实现节点级 `desiredVersion override`
- 不实现基于 LB/Ingress 的流量层灰度
- 不把 admin 变成通用文件服务器

## 3. 实施前约束

编码时必须遵守以下约束：

1. 不把 `admin_http_signed` 混进 `artifactStore.provider`
2. “制品存储方式”和“制品下发方式”必须分开建模
3. 只允许下载受控文件：
   - `snapshot.json`
   - `manifest.json`
   - `package.tar.gz`
4. 下载链接必须带过期时间
5. 下载链接必须可绑定 `nodeId`
6. 运行节点未备案、签名错误、链接过期、文件名越权时必须显式报错
7. 现有 `file / minio` 回归不能被打断

## 4. 推荐改动文件与 ownership

### 4.1 配置层

- `prototype/config/artifact_store.config.json`
- `prototype/src/lib/config.js`

### 4.2 下发元数据层

- `prototype/src/lib/artifact-store.js`
- `prototype/src/lib/platform-db.js`

### 4.3 admin 接口层

- `prototype/src/http/admin-surface.js`

### 4.4 runtime 安装与控制链路验证层

- `prototype/src/lib/runtime-artifacts.js`
- `prototype/src/lib/runtime-control-client.js`
- `prototype/src/cli/verify-multi-runtime.js`
- 视需要新增：
  - `prototype/src/cli/verify-runtime-delivery.js`

### 4.5 测试层

- `prototype/tests/unit/*.test.js`
- 如需新增：
  - `prototype/tests/unit/runtime-delivery-config.test.js`
  - `prototype/tests/unit/runtime-artifact-signature.test.js`
  - `prototype/tests/unit/runtime-artifact-download-route.test.js`

### 4.6 文档层

- `docs/37-runtime-admin服务运维手册.md`
- `docs/58-多runtime实例启动与配置说明.md`
- `docs/138-v1.0运行快照下发模式对照与admin_http_signed落地方案.md`
- `docs/help_manuals/apis/*`
- `docs/help_manuals/troubleshooting/*`

## 5. 配置模型拆解

### T01-A 新增 `runtimeDelivery` 配置段

建议增加：

```json
{
  "runtimeDelivery": {
    "mode": "file",
    "adminArtifactBaseUrl": "http://127.0.0.1:8788",
    "adminArtifactBaseUrlEnv": "ACDP_RUNTIME_ARTIFACT_BASE_URL",
    "signedUrlSecret": "",
    "signedUrlSecretEnv": "ACDP_RUNTIME_ARTIFACT_SIGNED_URL_SECRET",
    "signedUrlExpiresSeconds": 300,
    "bindNodeId": true,
    "bindConfigVersion": true
  }
}
```

### T01-B `config.js` 接入解析

要求：

- 从配置文件读取 `runtimeDelivery`
- 支持 `*Env` 注入
- 给出默认值
- 对 `mode` 做白名单约束：
  - `file`
  - `admin_http_signed`
  - `minio`

### T01-C 保持向后兼容

要求：

- 老配置不填 `runtimeDelivery` 时，默认按当前行为执行
- 现有 `artifactStore.endpoint = file://...` 的联调方式仍可用
- 现有 `http(s)` MinIO 方式仍可用

## 6. 签名与下载接口拆解

### T02-A 新增签名辅助函数

建议在共享库中新增：

- 生成签名
- 校验签名
- 规范化受控文件名
- 判断是否过期

签名原文至少包含：

- `releaseId`
- `fileName`
- `nodeId`
- `expires`

可选绑定：

- `configVersion`
- `desiredVersion`

### T02-B admin 新增下载路由

建议路由：

```text
GET /api/runtime-artifacts/releases/:releaseId/:fileName
```

query 参数：

- `nodeId`
- `expires`
- `signature`
- 可选：
  - `configVersion`

要求：

- 仅允许白名单文件名
- 先校验签名和过期时间
- 再校验节点备案状态
- 再定位 release 本地文件
- 返回实际文件流

### T02-C 错误语义固定

至少固定以下错误：

- `runtime_artifact_signature_invalid`
- `runtime_artifact_signature_expired`
- `runtime_artifact_file_not_allowed`
- `runtime_artifact_release_not_found`
- `runtime_artifact_file_missing`
- `runtime_artifact_node_not_registered`

## 7. control 下发逻辑拆解

### T03-A `artifactMetadata` 生成逻辑按模式分支

要求：

1. `file`
   - 继续返回 `file://...`
2. `minio`
   - 继续返回 MinIO 对象地址或预签名地址
3. `admin_http_signed`
   - 为当前 `nodeId` 动态生成 admin 下载 URL

### T03-B 节点视角动态下发

要求：

- `getRuntimeControlViewForNode()` 下发 `artifactMetadata` 时，按节点生成 URL
- 不允许把节点 A 的签名 URL 持久化成全局静态元数据再给节点 B 复用

### T03-C 保持刷新逻辑

要求：

- 延续当前“按 release 文件实时刷新 artifact metadata”的做法
- 避免把带过期时间的 URL 永久写死在数据库中

## 8. runtime 安装与验证拆解

### T04-A runtime 安装主流程尽量不改

要求：

- 仍按 `artifactMetadata.files[].artifactUrl` 下载
- 仍做 checksum 校验
- 仍做本地原子切换

### T04-B 只补最小兼容增强

若确有需要，只允许补：

- 更清晰的错误映射
- 更明确的下载失败日志
- 不允许大改 `installRuntimeReleaseFromControl()` 主干

### T04-C 新增验证脚本或扩展现有验证脚本

至少要覆盖：

- `1 admin + 1 runtime`
- `1 admin + 2 runtime`
- `admin_http_signed` 模式下成功安装
- 链接过期后的失败与重新下发成功

## 9. 测试拆解

### T05-A 单元测试

至少新增或补齐：

- `runtimeDelivery` 配置解析
- 签名生成与签名校验
- 过期判断
- 文件名白名单拦截
- 未备案节点拦截

### T05-B 接口测试

至少覆盖：

- 合法链接下载成功
- 非法签名返回 4xx
- 过期链接返回 4xx
- 非白名单文件名返回 4xx
- release 不存在返回 404

### T05-C 集成测试

至少覆盖：

- `file` 回归
- `minio` 回归
- `admin_http_signed` 新增成功链路

## 10. 文档与帮助拆解

### T06-A 运维文档

需要补清楚：

- 三种模式分别适合什么场景
- admin 如何启动
- runtime 如何启动
- `admin_http_signed` 需要哪些环境变量

### T06-B 帮助文档

需要补清楚：

- runtime 为什么安装失败
- 如何区分是签名过期、节点未备案、release 文件缺失，还是 MinIO 问题

### T06-C 页面帮助

若后续页面展示“当前下发模式”，需同步页面帮助口径，但本批次不要求一定先做 UI 呈现。

## 11. 收尾固定节奏

本 JOB 开工后，每完成一个编码批次，固定执行：

1. 代码实现
2. `/compact`
3. 回归测试
4. 文档更新
5. 单一真源同步
6. 进入下一批或关单

## 12. 完成标准

只有以下条件同时满足，`JOB-036` 才能关单：

- `runtimeDelivery.mode` 已正式接入
- `file / admin_http_signed / minio` 三种模式边界明确
- `admin_http_signed` 在无 MinIO、无共享目录场景下可完成安装
- 至少完成一轮 `1 admin + 2 runtime` 验证
- 单元测试、接口测试、集成验证通过
- 运维文档、帮助文档、真源同步完成

## 13. checklist

- [x] `T01-A` 新增 `runtimeDelivery` 配置段
- [x] `T01-B` 在 `config.js` 接入 `runtimeDelivery`
- [x] `T01-C` 验证老配置兼容
- [x] `T02-A` 新增签名与校验辅助函数
- [x] `T02-B` 新增 admin 运行快照下载路由
- [x] `T02-C` 固定下载失败错误码
- [x] `T03-A` 让 `artifactMetadata` 按模式生成 URL
- [x] `T03-B` 改为按节点动态生成 `admin_http_signed` URL
- [x] `T03-C` 保持带过期时间 URL 的动态刷新
- [x] `T04-A` 保持 runtime 安装主流程稳定
- [x] `T04-B` 收口 `admin_http_signed` 失败日志与错误映射
- [x] `T04-C` 扩展现有验证脚本
- [x] `T05-A` 补配置与签名单元测试
- [x] `T05-B` 补下载接口测试
- [x] `T05-C` 补三模式集成验证
- [x] `T06-A` 更新运维文档
- [x] `T06-B` 更新帮助文档
- [x] `T06-C` 更新页面帮助口径
- [x] `npm run test:unit`
- [x] `npm run test:console`
- [x] `npm run smoke:console`
- [x] `npm run pm:sync`
- [x] `npm run pm:check`
