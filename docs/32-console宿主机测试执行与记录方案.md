# Console 宿主机测试执行与记录方案

## 1. 目标

本方案用于交给其他 Codex 或测试执行人，直接在宿主机完成：

- `/console` 现有能力验证
- `/admin` 与 `/console` 双轨独立性验证
- 自动化测试结果、HTTP 结果、手工记录和截图的统一归档

## 2. 执行入口

在宿主机执行：

```bash
cd /Codex/ACDP
npm run verify:host:console
```

该命令会依次执行：

1. `npm run check:env`
2. `npm run test:unit`
3. `npm run test:console`
4. `npm run smoke:console`
5. 启动宿主机上的原型服务
6. 采集 `/health`、`/admin`、`/console`、`/api/admin/dashboard`、`/api/console/overview`、`/api/runtime/current`
7. 输出完整报告目录

额外说明：

- `smoke:console` 当前也会检查 `/admin` 是否正常返回
- 该检查用于验证 `/console` 改动没有误伤 MVP 入口

## 3. 采集数据保存位置

自动采集数据统一写入：

- `prototype/workspace/host_verification/<timestamp>_host_console_verify/`

其中关键文件包括：

- `summary.json`
- `01_check_env.stdout.log`
- `02_test_unit.stdout.log`
- `03_test_console.stdout.log`
- `04_smoke_console.stdout.log`
- `05_health.meta.json`
- `06_admin_page.body.html`
- `07_console_page.body.html`
- `08_admin_dashboard.body.json`
- `09_console_overview.body.json`
- `10_runtime_current.body.json`

宿主常驻服务日志位置：

- `prototype/workspace/service/prototype.out.log`
- `prototype/workspace/service/prototype.err.log`

手工记录与截图位置：

- `prototype/workspace/host_verification/<report>/notes/manual-checklist.md`
- `prototype/workspace/host_verification/<report>/notes/operator-summary.md`
- `prototype/workspace/host_verification/<report>/screenshots/`
- `prototype/workspace/host_verification/<report>/screenshots.actual.manifest.json`

## 4. 其他 Codex 需要做什么

除了执行 `npm run verify:host:console`，还要补齐手工项：

1. 打开 `/admin`，确认 MVP 页面可访问且不受 `/console` 影响
2. 打开 `/console`，确认首页、词条、导入、审核、发布、样本页面可访问
3. 对照 `notes/manual-checklist.md` 补充结果
4. 把关键问题、截图、复现步骤写入 `notes/operator-summary.md`
5. 如需正式留档，可再把结果摘录到：
   - `docs/27-console联调记录模板.md`
   - `docs/28-console试用反馈收集模板.md`

## 4.1 视觉回归建议动作

如果本轮宿主机验证已经补齐截图，建议继续执行：

```bash
cd /Codex/ACDP
npm run check:visual-regression -- \
  --baseline-manifest ./prototype/tests/fixtures/visual_regression/console/baseline.manifest.json \
  --candidate-dir ./prototype/workspace/host_verification/<report>/screenshots \
  --write-actual-manifest ./prototype/workspace/host_verification/<report>/screenshots.actual.manifest.json
```

若当前还没有正式基线，可先生成：

```bash
cd /Codex/ACDP
npm run prepare:visual-baseline -- \
  --screenshot-dir ./prototype/workspace/host_verification/<report>/screenshots \
  --output-manifest ./prototype/tests/fixtures/visual_regression/console/baseline.manifest.json
```

## 5. 判定标准

本轮宿主测试通过，至少应满足：

- `summary.json` 中 `ok=true`
- `entryIsolation.adminOk=true`
- `entryIsolation.consoleOk=true`
- `entryIsolation.adminIndependentFromConsole=true`
- 手工复核确认 `/admin` 和 `/console` 静态资源未串用

## 6. 失败时优先排查

优先看：

1. `summary.json`
2. `04_smoke_console.stdout.log`
3. `prototype/workspace/service/prototype.err.log`
4. `06_admin_page.body.html`
5. `07_console_page.body.html`

如果失败来自宿主环境而非业务代码，先记录：

- Node 版本
- 端口监听是否受限
- 防火墙/安全组状态
- 当前工作目录
- 是否存在旧服务残留
