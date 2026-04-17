# ACDP 阶段性总结

## 时间

- 2026-03-30

## 当前阶段结论

当前 ACDP 已完成“基于文档的原型功能闭环”与“正式运行时服务 MVP”两部分工作，已具备：

- 原型管理后台
- 词条/规则/拼音画像治理
- 候选审批、发布审批、双人审批、发布门禁
- 验证样本管理、feed import、file-based feed connector
- 正式 HTTP 接口 `POST /api/runtime/correct`
- 正式 WebSocket 接口 `GET /ws/runtime/correct`
- 后台常驻服务命令
- 本地演示脚本
- 并发测试入口
- Dockerfile 与 K8S MVP 资产

## 已完成能力

### 1. 原型管理与治理能力

- term CRUD、规则持久化、审核任务、审计日志
- 拼音画像治理、冲突排序、多音字候选生成
- persisted candidate review queue
- pinyin comparison 与 character-level discrepancy
- 发布/回滚/灰度
- release review、high-risk dual approval、release gates

### 2. 业务校验与外部样本能力

- validation cases 持久化到 SQLite
- validation gate 支持 smoke simulation 与 business sample replay
- 批量导入 validation cases
- file-based connectors:
  - `cg3`
  - `qa_feedback`
  - `online_feedback`
- source-specific payload adapters:
  - `cg3.records[]`
  - `qa_feedback.feedbacks[]`
  - `online_feedback.events[]`
- inbox/archive/error 目录模型
- 单个坏文件不会阻塞整批导入

### 3. 正式服务能力

- HTTP：
  - `POST /api/runtime/correct`
- WebSocket：
  - `GET /ws/runtime/correct`
- 正式接口返回契约已简化：
  - 成功：`{ "correctedText": "..." }`
  - 失败：`{ "error": "错误码: 错误描述" }`
- Bearer Token：
  - `ACDP_RUNTIME_TOKEN`
- 后台服务命令：
  - `npm run service:start`
  - `npm run service:status`
  - `npm run service:stop`
- 运行时观测：
  - `GET /api/runtime/stats`

### 4. 交付与部署能力

- `npm run setup:prototype`
- `npm run demo:prototype`
- `npm run test:concurrency`
- `Dockerfile`
- `k8s/namespace.yaml`
- `k8s/pvc.yaml`
- `k8s/deployment.yaml`
- `k8s/service.yaml`

## 当前验证情况

### 已验证

- `npm run setup:prototype` 通过
- `npm run demo:prototype` 通过
- `npm run test:unit` 通过
- 单元测试当前共 6 组，全部通过
- 真实主机并发结果已反馈：
  - `throughputRps = 458.49`
  - `targetRps = 200`
  - `meetsTarget = true`

### 未在当前沙箱内完成的验证

- 端口监听受限，无法在本沙箱内直接执行 HTTP/WS 集成测试
- `test:prototype`
- `test:concurrency`

这两类测试需要在真实主机环境执行。

## 仍待完成项

### 1. 代码规范化

- 当前纳入原型源码扫描范围的函数都已补齐“功能/输入/输出”三项注释
- 已覆盖：
  - `prototype/src/lib/*.js`
  - `prototype/src/cli/*.js`
  - `prototype/src/server.js`

### 2. 测试体系

- 已新增 unit tests 并已跑通
- 已覆盖：
  - normalizer/csv/ac
  - pinyin/auth
  - validation feed adapter
  - release gate 基础逻辑
  - runtime/service manager 基础逻辑
  - platform-db 的 term CRUD / review 主链路
- integration test 已持续扩展，但在当前沙箱无法执行
- 仍可继续补更多单元测试覆盖率，但当前已经形成基础可维护测试集

### 3. 真实系统接入

- 当前 validation feed 仍是 file-based connector
- 尚未直连 CG3 / QA / online feedback 的真实网络接口

### 4. K8S 正式化

- 当前仅有 MVP 级单副本方案
- 尚未解决多副本共享状态与 SQLite 限制

## 建议的下一步

1. 继续补全源码函数注释，尤其是 `server.js` 和 `platform-db.js`
2. 继续补单元测试，覆盖 `server`、`service-manager`、`validation feed` 和 `runtime` 更多边界
3. 在真实主机执行并保留：
   - `npm run test:prototype`
   - `npm run test:concurrency -- --users 200 --iterations 20 --target-rps 200`
4. 再决定是否优先推进：
   - 真实外部系统接入
   - K8S 正式化
