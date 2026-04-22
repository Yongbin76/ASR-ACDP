# JOB-097B v1.0 清理 platform.db 历史过程表并 VACUUM

- 文档状态：active
- 适用版本：v1.0
- 文档类型：job
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-22

## 1. 目标

在保留当前主词典和发布成果的前提下，清理 `platform.db` 中的历史过程表，并通过 `VACUUM` 回收空间。

## 2. 清理范围

本批只清：

1. `review_tasks`
2. `import_job_rows`
3. `import_jobs`
4. `import_job_files`
5. `import_job_results`
6. `alias_sources`
7. `term_sources`

## 3. 保留范围

本批明确不清：

1. `terms`
2. `aliases`
3. `term_rules`
4. `pinyin_profiles`
5. `releases`
6. `release_terms`
7. `runtime_control_state`
8. `runtime_nodes`
9. `runtime_node_registry`
10. 全部 `runtime_*` 统计表

## 4. 执行顺序

建议删除顺序：

1. `review_tasks`
2. `import_job_rows`
3. `import_job_files`
4. `import_job_results`
5. `import_jobs`
6. `alias_sources`
7. `term_sources`

完成后执行：

```sql
PRAGMA wal_checkpoint(TRUNCATE);
VACUUM;
```

## 5. 影响说明

会失去：

1. 历史审核任务
2. 历史导入批次与逐行明细
3. 错误词来源追溯
4. 词条来源追溯

仍然保留：

1. 当前词条主数据
2. 当前错误词集合
3. 当前规则与拼音画像
4. 当前版本发布与 release 关系
5. runtime 当前控制状态

## 6. Checklist

- [ ] 停止主库写入进程
- [ ] 备份 `platform.db`
- [ ] 记录清理前各目标表行数
- [ ] 删除 `review_tasks`
- [ ] 删除 `import_job_rows`
- [ ] 删除 `import_job_files`
- [ ] 删除 `import_job_results`
- [ ] 删除 `import_jobs`
- [ ] 删除 `alias_sources`
- [ ] 删除 `term_sources`
- [ ] 执行 `wal_checkpoint(TRUNCATE)`
- [ ] 执行 `VACUUM`
- [ ] 验证主词典、发布、runtime 控制链仍可读

## 7. 命令级 Runbook

### 7.1 停止写入进程

```bash
cd /Codex/ACDP
npm run service:stop || true
npm run service:stop:admin || true
npm run service:stop:runtime || true
```

### 7.2 checkpoint 并备份主库

```bash
TS=$(date +%Y%m%d%H%M%S)

node - <<'EOF'
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/Codex/ACDP/prototype/workspace/platform.db');
db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
db.close();
EOF

cp /Codex/ACDP/prototype/workspace/platform.db \
  /Codex/ACDP/prototype/workspace/backups/platform.db.pre-job097b-${TS}.bak
```

### 7.3 记录清理前基线

```bash
node - <<'EOF'
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const dbPath = '/Codex/ACDP/prototype/workspace/platform.db';
const db = new DatabaseSync(dbPath);
const tables = ['review_tasks','import_job_rows','import_jobs','import_job_files','import_job_results','alias_sources','term_sources'];
const counts = {};
for (const table of tables) counts[table] = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
const pageSize = db.prepare('PRAGMA page_size').get().page_size;
const pageCount = db.prepare('PRAGMA page_count').get().page_count;
const freelistCount = db.prepare('PRAGMA freelist_count').get().freelist_count;
const fileSize = fs.statSync(dbPath).size;
console.log(JSON.stringify({ before: { dbPath, fileSize, pageSize, pageCount, freelistCount, counts } }, null, 2));
db.close();
EOF
```

### 7.4 删除历史过程表

```bash
node - <<'EOF'
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/Codex/ACDP/prototype/workspace/platform.db');
db.exec('BEGIN');
try {
  db.exec('DELETE FROM review_tasks;');
  db.exec('DELETE FROM import_job_rows;');
  db.exec('DELETE FROM import_job_files;');
  db.exec('DELETE FROM import_job_results;');
  db.exec('DELETE FROM import_jobs;');
  db.exec('DELETE FROM alias_sources;');
  db.exec('DELETE FROM term_sources;');
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}
db.close();
EOF
```

### 7.5 执行 checkpoint 和 VACUUM

```bash
node - <<'EOF'
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/Codex/ACDP/prototype/workspace/platform.db');
db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
db.exec('VACUUM;');
db.close();
EOF
```

### 7.6 记录清理后基线

```bash
node - <<'EOF'
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const dbPath = '/Codex/ACDP/prototype/workspace/platform.db';
const db = new DatabaseSync(dbPath);
const tables = ['review_tasks','import_job_rows','import_jobs','import_job_files','import_job_results','alias_sources','term_sources','terms','aliases','releases','release_terms','runtime_control_state','runtime_nodes'];
const counts = {};
for (const table of tables) counts[table] = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
const pageSize = db.prepare('PRAGMA page_size').get().page_size;
const pageCount = db.prepare('PRAGMA page_count').get().page_count;
const freelistCount = db.prepare('PRAGMA freelist_count').get().freelist_count;
const fileSize = fs.statSync(dbPath).size;
console.log(JSON.stringify({ after: { dbPath, fileSize, pageSize, pageCount, freelistCount, counts } }, null, 2));
db.close();
EOF
```

## 8. 收尾标准

1. 目标历史过程表均为 `0`
2. `terms / aliases / releases / release_terms / runtime_control_state / runtime_nodes` 数据仍在
3. `platform.db` 体积进一步下降
4. 主系统启动和只读查询正常
