# JOB-097A v1.0 清理 platform.db 的 audit_logs 并 VACUUM

- 文档状态：active
- 适用版本：v1.0
- 文档类型：job
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-22

## 1. 目标

清理 [platform.db](/Codex/ACDP/prototype/workspace/platform.db) 中的 `audit_logs`，并通过 `VACUUM` 真正回收磁盘空间。

## 2. 范围

只处理：

1. `audit_logs`

连带收益：

1. `idx_audits_target`
2. `idx_audits_created`
3. `sqlite_autoindex_audit_logs_1`

## 3. 不在范围

不处理：

1. `review_tasks`
2. `import_job_*`
3. `alias_sources`
4. `term_sources`
5. 主词典与发布相关表

## 4. 执行顺序

1. 停止会写入主库的进程
2. 备份 `platform.db`
3. 记录：
   - `SELECT COUNT(*) FROM audit_logs`
   - `PRAGMA page_count`
   - `PRAGMA freelist_count`
   - 文件大小
4. 执行：

```sql
DELETE FROM audit_logs;
PRAGMA wal_checkpoint(TRUNCATE);
VACUUM;
```

5. 记录清理后：
   - `SELECT COUNT(*) FROM audit_logs`
   - `PRAGMA page_count`
   - `PRAGMA freelist_count`
   - 文件大小

## 5. 风险

影响：

1. 会丢失全部历史审计日志
2. 不影响当前词条、导入结果、审核状态、发布状态继续使用

## 6. Checklist

- [ ] 停止主库写入进程
- [ ] 备份 `platform.db`
- [ ] 记录清理前 `audit_logs` 行数和文件大小
- [ ] 删除 `audit_logs`
- [ ] 执行 `wal_checkpoint(TRUNCATE)`
- [ ] 执行 `VACUUM`
- [ ] 记录清理后体积变化
- [ ] 验证主数据与发布表仍在

## 7. 命令级 Runbook

以下命令就是后续由 Codex 直接执行的标准动作。

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
  /Codex/ACDP/prototype/workspace/backups/platform.db.pre-job097a-${TS}.bak
```

### 7.3 记录清理前基线

```bash
node - <<'EOF'
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const dbPath = '/Codex/ACDP/prototype/workspace/platform.db';
const db = new DatabaseSync(dbPath);
const pageSize = db.prepare('PRAGMA page_size').get().page_size;
const pageCount = db.prepare('PRAGMA page_count').get().page_count;
const freelistCount = db.prepare('PRAGMA freelist_count').get().freelist_count;
const auditCount = db.prepare('SELECT COUNT(*) AS c FROM audit_logs').get().c;
const fileSize = fs.statSync(dbPath).size;
console.log(JSON.stringify({ before: { dbPath, fileSize, auditLogs: auditCount, pageSize, pageCount, freelistCount } }, null, 2));
db.close();
EOF
```

### 7.4 删除审计日志

```bash
node - <<'EOF'
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/Codex/ACDP/prototype/workspace/platform.db');
db.exec('BEGIN');
try {
  db.exec('DELETE FROM audit_logs;');
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
const pageSize = db.prepare('PRAGMA page_size').get().page_size;
const pageCount = db.prepare('PRAGMA page_count').get().page_count;
const freelistCount = db.prepare('PRAGMA freelist_count').get().freelist_count;
const auditCount = db.prepare('SELECT COUNT(*) AS c FROM audit_logs').get().c;
const fileSize = fs.statSync(dbPath).size;
console.log(JSON.stringify({ after: { dbPath, fileSize, auditLogs: auditCount, pageSize, pageCount, freelistCount } }, null, 2));
db.close();
EOF
```

## 8. 收尾标准

1. `audit_logs` 行数为 `0`
2. `platform.db` 体积明显下降
3. `terms / aliases / releases / release_terms` 未受影响
