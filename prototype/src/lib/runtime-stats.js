const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

/**
 * 功能：确保`dir`相关逻辑。
 * 输入：`dirPath`（目录路径）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：处理`statsDatabasePath`相关逻辑。
 * 输入：`appConfig`（应用配置对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function statsDatabasePath(appConfig) {
  return path.join(appConfig.resolvedPaths.runtimeStateDir, 'runtime_stats.db');
}

/**
 * 功能：打开`runtime stats database`相关逻辑。
 * 输入：`appConfig`（应用配置对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function openRuntimeStatsDatabase(appConfig) {
  const dbFile = statsDatabasePath(appConfig);
  ensureDir(path.dirname(dbFile));
  const db = new DatabaseSync(dbFile);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS runtime_stats_events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      hour_key TEXT NOT NULL,
      channel TEXT NOT NULL,
      hits_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runtime_stats_state (
      state_key TEXT PRIMARY KEY,
      state_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runtime_stats_peak (
      stat_key TEXT PRIMARY KEY,
      peak_concurrency INTEGER NOT NULL DEFAULT 0,
      peak_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_runtime_stats_events_hour ON runtime_stats_events(hour_key, event_id);
  `);
  return db;
}

function hourKey(date = new Date()) {
  return date.toISOString().slice(0, 13);
}

/**
 * 功能：处理`nowIso`相关逻辑。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * 功能：读取`state value`相关逻辑。
 * 输入：`db`（数据库连接）、`key`（键名）、`fallback`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function readStateValue(db, key, fallback = '') {
  const row = db.prepare('SELECT state_value FROM runtime_stats_state WHERE state_key = ?').get(String(key || '').trim());
  return row ? row.state_value : fallback;
}

/**
 * 功能：写入`state value`相关逻辑。
 * 输入：`db`（数据库连接）、`key`（键名）、`value`（待处理值）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function writeStateValue(db, key, value) {
  const now = nowIso();
  db.prepare(`
    INSERT INTO runtime_stats_state(state_key, state_value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(state_key) DO UPDATE SET
      state_value = excluded.state_value,
      updated_at = excluded.updated_at
  `).run(String(key || '').trim(), String(value || ''), now);
}

/**
 * 功能：处理`localStatsCursor`相关逻辑。
 * 输入：`db`（数据库连接）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function localStatsCursor(db) {
  return Number(readStateValue(db, 'last_uploaded_event_id', '0') || 0);
}

/**
 * 功能：处理`localPeakUploadedValue`相关逻辑。
 * 输入：`db`（数据库连接）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function localPeakUploadedValue(db) {
  return Number(readStateValue(db, 'last_uploaded_peak', '0') || 0);
}

/**
 * 功能：记录`runtime correction local`相关逻辑。
 * 输入：`db`（数据库连接）、`payload`（业务载荷对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function recordRuntimeCorrectionLocal(db, payload = {}) {
  const key = hourKey(payload.now || new Date());
  const channel = String(payload.channel || 'http');
  const hits = []
    .concat(payload.result && payload.result.matches ? payload.result.matches : [])
    .concat(payload.result && payload.result.candidates ? payload.result.candidates : [])
    .concat(payload.result && payload.result.blocked ? payload.result.blocked : [])
    .map((item) => ({
      canonical: String(item && item.canonical ? item.canonical : '').trim(),
    }))
    .filter((item) => item.canonical);
  db.prepare(`
    INSERT INTO runtime_stats_events(hour_key, channel, hits_json, created_at)
    VALUES (?, ?, ?, ?)
  `).run(
    key,
    channel,
    JSON.stringify(hits),
    nowIso(),
  );
}

/**
 * 功能：记录`runtime peak local`相关逻辑。
 * 输入：`db`（数据库连接）、`concurrency`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function recordRuntimePeakLocal(db, concurrency) {
  const current = db.prepare('SELECT peak_concurrency FROM runtime_stats_peak WHERE stat_key = ?').get('global');
  const peak = Number(current && current.peak_concurrency ? current.peak_concurrency : 0);
  if (Number(concurrency || 0) <= peak) {
    return;
  }
  const now = nowIso();
  db.prepare(`
    INSERT INTO runtime_stats_peak(stat_key, peak_concurrency, peak_at, updated_at)
    VALUES ('global', ?, ?, ?)
    ON CONFLICT(stat_key) DO UPDATE SET
      peak_concurrency = excluded.peak_concurrency,
      peak_at = excluded.peak_at,
      updated_at = excluded.updated_at
  `).run(Number(concurrency || 0), now, now);
}

/**
 * 功能：获取当前`runtime peak local`相关逻辑。
 * 输入：`db`（数据库连接）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function currentRuntimePeakLocal(db) {
  const row = db.prepare('SELECT * FROM runtime_stats_peak WHERE stat_key = ?').get('global');
  return row ? {
    peakConcurrency: Number(row.peak_concurrency || 0),
    peakAt: row.peak_at,
    updatedAt: row.updated_at,
  } : {
    peakConcurrency: 0,
    peakAt: null,
    updatedAt: null,
  };
}

/**
 * 功能：构建`runtime stats upload payload`相关逻辑。
 * 输入：`db`（数据库连接）、`nodeId`（运行节点 ID）、`options`（扩展选项）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function buildRuntimeStatsUploadPayload(db, nodeId, options = {}) {
  const normalizedNodeId = String(nodeId || '').trim();
  if (!normalizedNodeId) {
    throw new Error('nodeId is required for stats upload payload');
  }
  const maxBatchSize = Math.max(1, Math.min(5000, Number(options.maxBatchSize || 1000)));
  const cursor = localStatsCursor(db);
  const rows = db.prepare(`
    SELECT *
    FROM runtime_stats_events
    WHERE event_id > ?
    ORDER BY event_id ASC
    LIMIT ?
  `).all(cursor, maxBatchSize);

  const hourlyMap = new Map();
  const termMap = new Map();
  for (const row of rows) {
    const hourlyKey = row.hour_key;
    const current = hourlyMap.get(hourlyKey) || {
      hourKey: row.hour_key,
      requestCount: 0,
      httpRequestCount: 0,
      wsRequestCount: 0,
      hitTermCount: 0,
    };
    current.requestCount += 1;
    if (row.channel === 'ws') {
      current.wsRequestCount += 1;
    } else {
      current.httpRequestCount += 1;
    }
    const hits = JSON.parse(row.hits_json || '[]');
    current.hitTermCount += hits.length;
    for (const hit of hits) {
      const termKey = `${row.hour_key}::${hit.canonical}`;
      const term = termMap.get(termKey) || {
        hourKey: row.hour_key,
        canonicalText: hit.canonical,
        hitCount: 0,
      };
      term.hitCount += 1;
      termMap.set(termKey, term);
    }
    hourlyMap.set(hourlyKey, current);
  }

  const records = [];
  let sequence = 1;
  for (const item of Array.from(hourlyMap.values()).sort((a, b) => a.hourKey.localeCompare(b.hourKey))) {
    records.push({
      sequence,
      type: 'hourly_stats',
      payload: item,
    });
    sequence += 1;
  }
  for (const item of Array.from(termMap.values()).sort((a, b) => `${a.hourKey}:${a.canonicalText}`.localeCompare(`${b.hourKey}:${b.canonicalText}`))) {
    records.push({
      sequence,
      type: 'hourly_terms',
      payload: item,
    });
    sequence += 1;
  }

  const peak = currentRuntimePeakLocal(db);
  if (peak.peakConcurrency > localPeakUploadedValue(db)) {
    records.push({
      sequence,
      type: 'peak',
      payload: peak,
    });
  }

  if (records.length === 0) {
    return null;
  }

  const toEventId = rows.length > 0 ? Number(rows[rows.length - 1].event_id) : cursor;
  return {
    nodeId: normalizedNodeId,
    batchId: `${normalizedNodeId}_${cursor + 1}_${toEventId}_${records.length}`,
    fromEventId: rows.length > 0 ? Number(rows[0].event_id) : cursor,
    toEventId,
    records,
    generatedAt: nowIso(),
  };
}

/**
 * 功能：标记`runtime stats uploaded`相关逻辑。
 * 输入：`db`（数据库连接）、`payload`（业务载荷对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function markRuntimeStatsUploaded(db, payload = {}) {
  if (payload.toEventId != null) {
    writeStateValue(db, 'last_uploaded_event_id', String(Number(payload.toEventId || 0)));
  }
  const peakRecord = (payload.records || []).find((item) => item.type === 'peak');
  if (peakRecord && peakRecord.payload) {
    writeStateValue(db, 'last_uploaded_peak', String(Number(peakRecord.payload.peakConcurrency || 0)));
  }
}

module.exports = {
  buildRuntimeStatsUploadPayload,
  currentRuntimePeakLocal,
  localPeakUploadedValue,
  localStatsCursor,
  markRuntimeStatsUploaded,
  openRuntimeStatsDatabase,
  recordRuntimeCorrectionLocal,
  recordRuntimePeakLocal,
  statsDatabasePath,
};
