# Console 联调记录模板

> 口径说明
>
> 本模板若出现旧页面名称或旧域名称，当前统一按现行口径记录：
>
> - `词典建设`
> - `词典审核`
> - `验证与回流`

## 0. 最近一次收口记录

- 联调时间：`2026-04-03`
- 联调环境：`/Codex` sandbox shell，`verify:host:console` 走 `inject://prototype`
- 执行人：Codex
- Node 版本：见 [summary.json](/Codex/ACDP/prototype/workspace/host_verification/2026-04-03T16-11-07.176Z_host_console_verify/summary.json) 对应运行环境
- 执行命令：
  - `npm run verify:host:console`
  - `npm run smoke:console`
  - `npm run test:console`
  - `npm run test:unit`
- 关联报告：
  - [summary.json](/Codex/ACDP/prototype/workspace/host_verification/2026-04-03T16-11-07.176Z_host_console_verify/summary.json)
  - [operator-summary.md](/Codex/ACDP/prototype/workspace/host_verification/2026-04-03T16-11-07.176Z_host_console_verify/notes/operator-summary.md)
- 结果摘要：
  - `check:env` / `test:unit` / `test:console` / `smoke:console` 全部通过
  - `entryIsolation.adminOk=true`
  - `entryIsolation.consoleOk=true`
  - `entryIsolation.adminIndependentFromConsole=true`
  - 当前环境无法监听 `127.0.0.1`，因此本轮按授权接受 inject 模式 HTML/JSON 证据替代真实宿主浏览器截图
- 联调结论：
  - 可继续内部试用
  - `JOB-002` 关闭

## 1. 使用目的

本模板用于在宿主环境执行 `/console` 联调时记录结果，保证每次联调都有统一口径。

## 2. 基本信息

- 联调时间：
- 联调环境：
- 执行人：
- Node 版本：
- 执行命令：
- 当前代码版本/目录：

## 3. 基础检查

### 3.1 环境检查

- [ ] `npm run check:env` 通过
- [ ] `npm run test:unit` 通过
- [ ] `npm run test:console` 通过
- [ ] `npm run smoke:console` 通过
- [ ] `npm run verify:host:console` 已产出报告目录

备注：

## 4. 页面联调记录

### 4.1 `/console`

- [ ] 页面可访问
- [ ] 左侧导航可切换
- [ ] 静态资源正常加载
- [ ] 顶部身份切换正常

问题记录：

### 4.1A `/admin` 独立性复核

- [ ] `/admin` 页面可访问
- [ ] `/admin` 基础操作未受 `/console` 影响
- [ ] 两个入口的静态资源未串用

问题记录：

### 4.2 词条中心

- [ ] 词条列表可加载
- [ ] 词条详情可打开
- [ ] 词条基础信息可编辑
- [ ] 规则可保存
- [ ] 拼音画像可保存
- [ ] 拼音候选可生成
- [ ] 已提交/已通过候选不会重复误提审

问题记录：

### 4.3 导入中心

- [ ] 模板详情可查看
- [ ] 模板可下载
- [ ] 示例可下载
- [ ] 导入批次可创建
- [ ] 导入预览可查看
- [ ] 导入确认可执行
- [ ] 导入结果可看到影响词条
- [ ] 导入结果可看到审核任务
- [ ] 无错误行时错误报表按钮表现正确

问题记录：

### 4.4 审核中心

- [ ] 审核任务列表可加载
- [ ] 审核详情可查看
- [ ] 审核通过可执行
- [ ] 审核驳回可执行

问题记录：

### 4.5 发布中心

- [ ] release 可构建
- [ ] release 详情可查看
- [ ] 发布审核可提交
- [ ] 发布可执行
- [ ] gate blocker 可查看
- [ ] validation 结果可查看
- [ ] 发布/回滚高风险动作有明确二次确认

问题记录：

### 4.6 样本与回流中心

- [ ] 样本可新建
- [ ] 样本详情可查看
- [ ] 关联词条可跳转

问题记录：

## 5. 问题汇总

### P0

- 

### P1

- 

### P2

- 

### P3

- 

## 6. 联调结论

- [ ] 可继续内部试用
- [ ] 需要修复后再试用
- [ ] 暂不建议试用

结论说明：
