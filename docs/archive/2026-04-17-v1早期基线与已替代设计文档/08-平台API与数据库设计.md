# 平台 API 与数据库设计

## 1. 文档定位

本文件以 `ACDP/prototype/` 当前可运行实现为准，说明：

- 当前实际 SQLite 表结构
- 当前实际 API 路径与能力
- 当前状态流转与权限模型
- 与更远期正式平台设计的差异

如果本文件与代码不一致，以以下代码为最终准绳：

- 数据库：`prototype/src/lib/platform-db.js`
- HTTP / WebSocket API：`prototype/src/server.js`
- 权限模型：`prototype/src/lib/admin-auth.js`

## 2. 当前实现总览

当前原型采用：

- 控制面与运行时合并在同一个 Node 进程
- SQLite 作为管理库存储
- 发布产物以文件快照形式落盘
- 管理 API 使用 `/api/admin/*`
- 运行时 API 使用 `/api/runtime/*`
- 模拟接口使用 `/api/simulate`
- WebSocket 运行时接口使用 `/ws/runtime/correct`

当前原型中的“核心词典库”不是单独一张表，而是以下 4 张核心表共同构成：

- `terms`
- `aliases`
- `term_rules`
- `pinyin_profiles`

其中：

- `terms` 保存标准词主信息
- `aliases` 保存标准词的字面别名/错误写法
- `term_rules` 保存命中后的约束规则
- `pinyin_profiles` 保存拼音治理信息

## 3. 当前状态流转

### 3.1 词条状态

当前原型实际使用到的词条状态包括：

- `draft`
- `pending_review`
- `approved`
- `published`
- `disabled`

当前主要流转为：

1. 新建词条后默认进入 `draft`
2. 提交审核后进入 `pending_review`
3. 审核通过后进入 `approved`
4. 被已发布 release 引用后，可处于 `published`
5. 人工停用后进入 `disabled`

说明：

- 当前原型未使用 `archived` 状态
- release 构建时只会选择 `approved/published` 词条

### 3.2 发布状态

当前原型实际使用到的 release 状态包括：

- `built`
- `canary`
- `published`

说明：

- 构建完成后为 `built`
- 创建灰度策略后目标 release 会被标记为 `canary`
- 正式发布后目标 release 会被标记为 `published`
- 当前原型没有单独持久化 `building/failed/abandoned` 等中间状态

### 3.3 审核任务状态

当前原型实际使用到的审核任务状态包括：

- `pending`
- `approved`
- `rejected`

当前审核任务类型包括：

- `term_review`
- `pinyin_candidate_review`
- `release_publish_review`

## 4. 当前 SQLite 表结构

当前 SQLite 文件路径：

- `prototype/workspace/platform.db`

表结构由 `prototype/src/lib/platform-db.js` 在启动时自动创建。

### 4.1 `terms`

标准词主表。

字段：

- `term_id`：主键，业务词条 ID
- `category_code`：类别编码，如 `gov_term` / `poi_road` / `proper_noun`
- `canonical_text`：标准词
- `status`：词条状态
- `priority`：优先级
- `risk_level`：风险等级
- `replace_mode`：`replace/candidate/block`
- `base_confidence`：基础置信度
- `source_type`：来源类型
- `pinyin_runtime_mode`：拼音运行模式
- `revision`：修订号
- `created_at`
- `updated_at`

主要索引：

- `idx_terms_category`
- `idx_terms_status`
- `idx_terms_canonical`

### 4.2 `aliases`

词条字面别名表。

字段：

- `id`：自增主键
- `term_id`：关联 `terms.term_id`
- `alias_text`：别名文本

约束：

- `UNIQUE(term_id, alias_text)`

主要索引：

- `idx_aliases_alias`

说明：

- 当前原型没有独立 `dict_variant` 复杂模型
- 当前所有字面变体先收敛到 `aliases`

### 4.3 `term_rules`

词条规则表，当前为“一词一规则记录”。

字段：

- `term_id`：主键，关联词条
- `candidate_only`
- `min_text_len`
- `max_text_len`
- `boundary_policy`
- `left_context_allow`
- `right_context_allow`
- `left_context_block`
- `right_context_block`
- `regex_allow`
- `regex_block`
- `updated_at`

说明：

- 上下文和正则字段以 JSON 字符串形式保存
- 当前运行时实际执行这些字段

### 4.4 `pinyin_profiles`

词条拼音画像表。

字段：

- `term_id`：主键，关联词条
- `full_pinyin_no_tone`
- `initials`
- `syllables_json`
- `runtime_mode`
- `polyphone_mode`
- `custom_full_pinyin_no_tone`
- `alternative_readings_json`
- `notes`
- `updated_at`

说明：

- 当前原型支持词条级拼音治理
- 当前尚未实现字符级 override 编辑流

### 4.5 `releases`

发布版本表。

字段：

- `release_id`：主键
- `version`：版本号
- `status`：`built/canary/published`
- `summary`：构建摘要
- `artifact_dir`：产物目录
- `snapshot_path`：快照文件路径
- `manifest_path`：manifest 文件路径
- `term_count`：release 包含的词条数
- `created_at`
- `published_at`

主要索引：

- `idx_releases_status`

### 4.6 `release_terms`

release 与词条关系表。

字段：

- `id`：自增主键
- `release_id`
- `term_id`

说明：

- 当前原型用该表表达“某个 release 包含哪些词条”
- 当前未额外保存 included rules / included aliases 的单独快照关系

### 4.7 `gray_policies`

灰度策略表。

字段：

- `policy_id`：主键
- `release_id`：关联 release
- `scope_type`：当前原型实际只支持 `traffic_key_hash`
- `percentage`：灰度比例 `1..100`
- `enabled`：是否启用
- `created_by`
- `created_at`
- `updated_at`

主要索引：

- `idx_gray_enabled`

说明：

- 当前原型只允许单个启用中的灰度策略

### 4.8 `review_tasks`

审核任务表。

字段：

- `task_id`：主键
- `task_type`
- `target_type`
- `target_id`
- `status`
- `submitted_by`
- `reviewed_by`
- `comment`
- `target_snapshot`
- `created_at`
- `reviewed_at`

主要索引：

- `idx_reviews_status`
- `idx_reviews_target`

说明：

- `target_snapshot` 保存提交审核时的目标快照
- release 审核、词条审核、拼音候选审核都复用这张表

### 4.9 `validation_cases`

业务验证样本表。

字段：

- `case_id`：主键
- `description`
- `sample_text`
- `expected_canonicals_json`
- `enabled`
- `source_type`
- `notes`
- `created_at`
- `updated_at`

主要索引：

- `idx_validation_enabled`

说明：

- 该表保存“业务验证样本库”
- 这些样本会参与 release gate 的业务回放校验

### 4.10 `runtime_hourly_stats`

运行时小时级汇总表。

字段：

- `hour_key`
- `request_count`
- `http_request_count`
- `ws_request_count`
- `hit_term_count`
- `updated_at`

### 4.11 `runtime_hourly_terms`

运行时小时级高频命中词表。

字段：

- `hour_key`
- `canonical_text`
- `hit_count`
- `updated_at`

主要索引：

- `idx_runtime_terms_hour`

### 4.12 `runtime_peak_stats`

运行时峰值统计表。

字段：

- `stat_key`
- `peak_concurrency`
- `peak_at`
- `updated_at`

### 4.13 `audit_logs`

审计日志表。

字段：

- `audit_id`
- `request_id`
- `operator`
- `operation`
- `target_type`
- `target_id`
- `before_snapshot`
- `after_snapshot`
- `note`
- `created_at`

主要索引：

- `idx_audits_created`

## 5. 运行时产物结构

当前原型不会直接让运行时读取 SQLite，而是先把可发布词条编译为快照。

当前快照生成逻辑见：

- `prototype/src/lib/snapshot-builder.js`

当前快照主要包含：

- `manifest`
- `terms`
- `literalPatterns`
- `pinyinExactIndex`

其中：

- `literalPatterns` 来自词条别名
- `pinyinExactIndex` 来自标准词、别名和拼音画像
- `terms` 保存运行时需要的轻量元信息

## 6. 当前 API 设计

## 6.1 浏览器与健康检查

- `GET /`
- `GET /admin`
- `GET /test-client`
- `GET /health`

## 6.2 运行时 API

- `GET /api/runtime/current`
- `GET /api/runtime/stats`
- `POST /api/runtime/reload`
- `POST /api/runtime/correct`
- `GET /ws/runtime/correct`

说明：

- `POST /api/runtime/correct` 为正式运行时纠错接口
- `GET /ws/runtime/correct` 为长连接纠错接口
- 两者支持可选 Bearer Token 鉴权

## 6.3 模拟与调试 API

- `POST /api/simulate`

说明：

- 用于管理端模拟文本纠错结果
- 支持 `trafficKey`，可观察 stable/canary 分流结果

## 6.4 身份与看板 API

- `GET /api/admin/me`
- `GET /api/admin/dashboard`

## 6.5 词条管理 API

- `GET /api/admin/terms`
- `GET /api/admin/terms/{termId}`
- `POST /api/admin/terms`
- `PUT /api/admin/terms/{termId}`
- `POST /api/admin/terms/{termId}/submit-review`
- `POST /api/admin/terms/{termId}/approve`
- `POST /api/admin/terms/{termId}/disable`

## 6.6 规则 API

- `GET /api/admin/terms/{termId}/rules`
- `PUT /api/admin/terms/{termId}/rules`

## 6.7 拼音治理 API

- `GET /api/admin/terms/{termId}/pinyin`
- `PUT /api/admin/terms/{termId}/pinyin`
- `GET /api/admin/terms/{termId}/pinyin-comparison`
- `POST /api/admin/terms/{termId}/generate-pinyin-candidates`
- `POST /api/admin/terms/{termId}/pinyin-candidates`
- `GET /api/admin/pinyin-profiles`
- `GET /api/admin/pinyin-comparisons`
- `GET /api/admin/pinyin-conflicts`
- `GET /api/admin/pinyin-conflicts/detail`

## 6.8 审核 API

- `GET /api/admin/reviews`
- `POST /api/admin/reviews/{taskId}/approve`
- `POST /api/admin/reviews/{taskId}/reject`

## 6.9 发布与灰度 API

- `GET /api/admin/releases`
- `POST /api/admin/releases/build`
- `POST /api/admin/releases/{releaseId}/submit-review`
- `POST /api/admin/releases/{releaseId}/publish`
- `POST /api/admin/releases/{releaseId}/rollback`
- `GET /api/admin/gray-policies`
- `POST /api/admin/gray-policies`
- `POST /api/admin/gray-policies/{policyId}/disable`

说明：

- 当前 `POST /api/admin/gray-policies` 的实际作用是把目标 release 设置为 `canary`
- 正式全量发布仍使用 `POST /api/admin/releases/{releaseId}/publish`

## 6.10 Validation Case API

- `GET /api/admin/validation-cases`
- `GET /api/admin/validation-cases/feed-sources`
- `POST /api/admin/validation-cases`
- `POST /api/admin/validation-cases/import`
- `POST /api/admin/validation-cases/import-feeds`
- `POST /api/admin/validation-cases/{caseId}/disable`

说明：

- `POST /api/admin/validation-cases/import` 为直接 JSON 导入
- `POST /api/admin/validation-cases/import-feeds` 为按 connector 配置执行 feed 导入
- 当前支持：
  - `file_inbox`
  - `http_pull_json`
- `http_pull_json` 当前支持 delivery receipt 去重、cursor 增量拉取、可选 ack 与 replay
- 该接口可选接受：
  - `sourceTypes`
  - `replayErrors`
- 当前原型没有 multipart 文件上传接口

## 6.11 审计 API

- `GET /api/admin/audits`

## 7. 当前权限模型

当前角色：

- `dict_viewer`
- `dict_editor`
- `dict_reviewer`
- `dict_publisher`
- `dict_operator`
- `dict_admin`

当前权限定义见：

- `prototype/src/lib/admin-auth.js`

权限边界概览：

- `dict_viewer`：只读、模拟、查看看板、查看审核与发布信息
- `dict_editor`：词条编辑、提交审核、拼音编辑、提交拼音候选、validation case 写入
- `dict_reviewer`：审核决策
- `dict_publisher`：release build、release review submit、publish
- `dict_operator`：runtime reload、rollback、灰度策略操作
- `dict_admin`：所有权限

当前原型通过请求头传递身份：

- `x-role`
- `x-operator`

## 8. 当前审计要求

当前原型已对以下动作落审计：

- 创建词条
- 更新词条
- 更新词条状态
- 更新规则
- 更新拼音画像
- 创建审核任务
- 审批/驳回审核任务
- 创建 release
- 发布/回滚 release
- 创建/停用灰度策略
- 创建/更新/停用 validation case

## 9. 当前原型与目标态设计的差异

当前原型与更远期正式平台设计相比，主要差异如下：

- 表名采用原型级命名：`terms/aliases/...`，而不是 `dict_term/dict_variant/...`
- 当前“错误变体”先收敛为简单 `aliases`，没有独立复杂 `variant` 模型
- 当前统计模型为 runtime 小时级统计，不是完整日报/版本统计体系
- 当前 review、validation、dashboard、runtime stats 都已落地为实现级表，而早期设计稿未完整覆盖
- 当前管理 API 为 `/api/admin/*`，不是早期设计稿中的 `/api/v1/*`
- 当前文件 feed 接入为本地目录扫描导入，不是独立上传接口或实时同步 connector

## 10. 文档维护建议

后续如果继续演进本文件，建议遵循以下原则：

1. 当前实现与目标设计分开展示，不再混写
2. 当前实现部分始终以代码为准同步更新
3. 目标态设计单独标注“未来演进”，避免与现状混淆
4. 若新增 SQLite 表或 API，应同步更新本文件第 4 节与第 6 节
