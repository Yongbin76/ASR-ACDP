# Console 宿主环境联调与 Smoke 执行说明

## 1. 文档目的

本文件用于指导在真实宿主环境执行 `/console` 的联调和 smoke 验证。

说明：

- 当前对话环境中的沙箱不允许本地端口监听
- 因此真实 `/console` HTTP 访问验证仍必须在宿主环境执行
- 当前 `npm run smoke:console` 已支持：
- 宿主环境优先走真实 HTTP smoke
- 受限环境自动 fallback 到 inject 模式做服务级 smoke
- 当前后台页面入口已收口到 `/console`
- `/admin` 不再承载后台页面，当前应跳转到 `/console`

## 2. 前置条件

执行前确认：

1. Node.js `>= 22.13.0`
2. `npm run check:env` 通过
3. `npm run test:unit` 通过
4. 防火墙或安全组允许本地调试所需端口访问

## 3. 推荐执行顺序

### 3.1 基础检查

```bash
cd /Codex/ACDP
npm run check:env
npm run test:unit
```

### 3.2 Console 自检

```bash
cd /Codex/ACDP
npm run test:console
```

说明：

- 该命令不依赖真实端口监听
- 用于先确认主链路服务级逻辑正常

### 3.3 Console Smoke

```bash
cd /Codex/ACDP
npm run smoke:console
```

说明：

- 该命令会在宿主环境启动临时服务并访问 `/console` 与若干 `/api/console/*`
- 当前 smoke 会检查 `/admin` 是否跳转到 `/console`
- 如果当前环境允许本地端口监听，应返回 `ok: true` 且 `mode: "http"`
- 若当前环境禁止端口监听，则会返回 `ok: true` 且 `mode: "inject"`

### 3.4 正式服务启动

```bash
cd /Codex/ACDP
npm run start:prototype
```

## 4. 浏览器访问地址

在宿主环境服务启动后，访问：

- `http://127.0.0.1:8787/console`
- `http://127.0.0.1:8787/admin`（应跳转到 `/console`）
- `http://127.0.0.1:8787/console/help/integration`
- `http://127.0.0.1:8787/console/help/trial`

如果宿主机需要通过外网 IP 联调，也可将 `127.0.0.1` 替换为实际宿主地址，例如：

- `http://122.51.13.230:8787/console`

说明：

- `/console`：当前后台页面唯一入口
- `/admin`：兼容跳转入口

## 5. 首轮联调清单

建议按以下路径走一遍：

1. 先访问 `/admin`，确认会跳转到 `/console`
2. 再访问 `/console`
3. 查看“总览”是否正常加载
4. 进入“导入中心”查看模板详情和模板下载
5. 验证模板、示例、错误报表是否都以附件方式下载
6. 创建一条导入批次
7. 确认导入
8. 查看导入结果中的“影响词条”和“审核任务”
9. 进入“审核中心”审批导入生成的任务
10. 进入“发布中心”构建 release
11. 提交发布审核并审批
12. 正式发布
13. 查看 gate / validation / 问题跳转
14. 回到 `/admin` 再确认仍会跳转到 `/console`

## 6. 重点关注项

联调时重点观察：

- `/admin` 是否始终正确跳转到 `/console`
- 静态资源是否正常加载
- `/console` 左侧导航是否可用
- `/console/help/*` 是否可直接在浏览器内阅读
- 各模块 API 是否返回正确
- 导入批次是否能真正写入 `terms/aliases`
- 审核通过后状态是否变更
- 发布是否被 gate 正确约束

## 7. 失败定位建议

若失败，优先区分：

1. 环境问题
   - Node 版本不对
   - 本地端口监听被拦截
   - 文件权限问题

2. API 问题
   - `/api/console/*` 返回 4xx/5xx
   - 权限头不正确

3. 页面问题
   - `/console` 静态资源未加载
   - 页面报错但 API 正常

4. 入口收敛问题
   - `/admin` 没有跳转到 `/console`
   - `/console` 静态资源异常
   - `/admin` 错误回到了旧页面而不是当前控制台

## 8. 联调结果建议记录

建议记录以下信息：

- 执行时间
- 宿主机环境
- 执行命令
- 通过/失败项
- 失败截图或日志
- 问题定位与修复建议
