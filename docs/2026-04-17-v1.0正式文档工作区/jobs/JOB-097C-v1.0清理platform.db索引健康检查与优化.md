# JOB-097C v1.0 清理 platform.db 索引健康检查与优化

- 文档状态：active
- 实施状态：done
- 适用版本：v1.0
- 文档类型：job
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-22

## 1. 目标

对 [platform.db](/Codex/ACDP/prototype/workspace/platform.db) 做索引健康检查与定向优化，目的不是机械“重建所有索引”，而是：

1. 校验库与索引完整性
2. 刷新统计信息
3. 执行 SQLite 自带优化
4. 对关键查询做 `EXPLAIN QUERY PLAN`
5. 只在必要时对目标索引做 `REINDEX`

## 2. 范围

本 job 处理：

1. `PRAGMA integrity_check`
2. `ANALYZE`
3. `PRAGMA optimize`
4. 关键查询计划采样
5. 定向 `REINDEX`

## 3. 不在范围

本 job 不处理：

1. 审计日志清理
2. 历史过程表清理
3. 主数据清理
4. release 文件清理
5. runtime 实例目录清理

## 4. 执行原则

1. 它是 `JOB-097` 下的性能优化子任务
2. 和 `097A / 097B` 可以独立执行
3. 不是“全量重建所有索引”
4. 若检查结果正常，不强行执行 `REINDEX`

## 5. Checklist

- [x] 停止主库写入进程
- [x] 备份 `platform.db`
- [x] 记录优化前基线
- [x] 执行 `PRAGMA integrity_check`
- [x] 执行 `ANALYZE`
- [x] 执行 `PRAGMA optimize`
- [x] 采样关键查询 `EXPLAIN QUERY PLAN`
- [x] 如有必要，执行目标索引 `REINDEX`
- [x] 回读优化后基线
- [x] 验证主链查询与服务可读

## 6. 命令级 Runbook

### 6.1 停止写入进程

```bash
cd /Codex/ACDP
npm run service:stop || true
npm run service:stop:admin || true
npm run service:stop:runtime || true
```

### 6.2 checkpoint 并备份主库

```bash
TS=$(date +%Y%m%d%H%M%S)

node - <<'EOF'
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/Codex/ACDP/prototype/workspace/platform.db');
db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
db.close();
EOF

cp /Codex/ACDP/prototype/workspace/platform.db \
  /Codex/ACDP/prototype/workspace/backups/platform.db.pre-job097c-${TS}.bak
```

### 6.3 记录优化前基线

```bash
node - <<'EOF'
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const dbPath = '/Codex/ACDP/prototype/workspace/platform.db';
const db = new DatabaseSync(dbPath);
const pageSize = db.prepare('PRAGMA page_size').get().page_size;
const pageCount = db.prepare('PRAGMA page_count').get().page_count;
const freelistCount = db.prepare('PRAGMA freelist_count').get().freelist_count;
const fileSize = fs.statSync(dbPath).size;
console.log(JSON.stringify({ before: { dbPath, fileSize, pageSize, pageCount, freelistCount } }, null, 2));
db.close();
EOF
```

### 6.4 完整性检查

```bash
node - <<'EOF'
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/Codex/ACDP/prototype/workspace/platform.db');
const result = db.prepare('PRAGMA integrity_check').all();
console.log(JSON.stringify(result, null, 2));
db.close();
EOF
```

### 6.5 统计刷新与优化

```bash
node - <<'EOF'
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/Codex/ACDP/prototype/workspace/platform.db');
db.exec('ANALYZE;');
db.exec('PRAGMA optimize;');
db.close();
EOF
```

### 6.6 关键查询计划采样

```bash
node - <<'EOF'
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/Codex/ACDP/prototype/workspace/platform.db');
const plans = {
  termsByStatus: db.prepare(\"EXPLAIN QUERY PLAN SELECT term_id FROM terms WHERE status = 'approved' ORDER BY updated_at DESC LIMIT 20\").all(),
  reviewsByStatus: db.prepare(\"EXPLAIN QUERY PLAN SELECT task_id FROM review_tasks WHERE status = 'pending' AND target_type = 'term' ORDER BY created_at DESC LIMIT 20\").all(),
  importRowsByJob: db.prepare(\"EXPLAIN QUERY PLAN SELECT row_id FROM import_job_rows WHERE job_id = 'dummy' AND status = 'error' ORDER BY row_no ASC LIMIT 20\").all(),
};
console.log(JSON.stringify(plans, null, 2));
db.close();
EOF
```

### 6.7 必要时定向 REINDEX

只有在查询计划或完整性检查显示某个索引异常时才执行，例如：

```bash
node - <<'EOF'
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/Codex/ACDP/prototype/workspace/platform.db');
db.exec('REINDEX idx_reviews_status_target;');
db.exec('REINDEX idx_import_job_rows_status;');
db.exec('REINDEX idx_aliases_alias;');
db.close();
EOF
```

### 6.8 记录优化后基线

```bash
node - <<'EOF'
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const dbPath = '/Codex/ACDP/prototype/workspace/platform.db';
const db = new DatabaseSync(dbPath);
const pageSize = db.prepare('PRAGMA page_size').get().page_size;
const pageCount = db.prepare('PRAGMA page_count').get().page_count;
const freelistCount = db.prepare('PRAGMA freelist_count').get().freelist_count;
const fileSize = fs.statSync(dbPath).size;
console.log(JSON.stringify({ after: { dbPath, fileSize, pageSize, pageCount, freelistCount } }, null, 2));
db.close();
EOF
```

## 7. 收尾标准

1. `PRAGMA integrity_check` 返回 `ok`
2. `ANALYZE` 与 `PRAGMA optimize` 已执行
3. 关键查询计划已留档
4. 如执行了 `REINDEX`，目标索引重建完成且无报错
5. 主系统启动和只读查询正常

## 8. 本轮执行结果

1. 已确认 service manager 管理的 `prototype / admin / runtime` 当前为 `stopped`
2. 已生成备份：
   - `/Codex/ACDP/prototype/workspace/backups/platform.db.pre-job097c-20260422153122.bak`
3. `PRAGMA integrity_check`
   - 返回：`ok`
4. 已执行：
   - `ANALYZE`
   - `PRAGMA optimize`
5. 已采样关键查询计划：
   - `termsByStatus`
   - `reviewsByStatus`
   - `importRowsByJob`
6. 本轮未执行 `REINDEX`
   - 原因：完整性检查通过，关键查询计划未出现索引损坏或明显异常
7. 执行后基线：
   - `fileSize = 327356416`
   - `pageCount = 79921`
   - `freelistCount = 0`
8. 主链只读验证：
   - `terms = 14145`
   - `aliases = 65951`
   - `releases = 2`
   - `release_terms = 27241`
   - `runtime_control_state = 1`
   - `runtime_nodes = 2`
