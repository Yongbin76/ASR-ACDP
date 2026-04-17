const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const { openDatabase } = require('../../src/lib/platform-db');
const {
  normalizeFeedItems,
  configuredFeedSources,
  listValidationFeedSources,
  importValidationFeeds,
} = require('../../src/lib/validation-feed-importer');

/**
 * 功能：创建 validation feed 测试场景使用的配置对象。
 * 输入：工作目录名称与 source 配置数组。
 * 输出：带独立 workspace 的应用配置对象。
 */
function createValidationFeedTestConfig(workspaceName, sources = []) {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', workspaceName);
  if (fs.existsSync(workspaceDir)) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
  return {
    ...baseConfig,
    validationFeedConnectors: {
      configPath: path.join(baseConfig.projectRoot, 'prototype', 'config', 'validation_feed_connectors.config.json'),
      sources,
    },
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
      databaseFile: path.join(workspaceDir, 'platform.db'),
      validationFeedInboxDir: path.join(workspaceDir, 'validation_feeds', 'inbox'),
      validationFeedArchiveDir: path.join(workspaceDir, 'validation_feeds', 'archive'),
      validationFeedErrorDir: path.join(workspaceDir, 'validation_feeds', 'error'),
      validationFeedReceiptDir: path.join(workspaceDir, 'validation_feeds', 'receipts'),
    },
  };
}

test('normalizeFeedItems supports cg3 records payload', () => {
  const items = normalizeFeedItems({
    records: [{ recordId: 'cg3-1', snippet: '旗顺路', canonicalTexts: ['祁顺路'] }],
  }, 'cg3');
  assert.deepEqual(items[0], {
    caseId: 'cg3-1',
    description: 'cg3 sample',
    text: '旗顺路',
    expectedCanonicals: ['祁顺路'],
    notes: '',
  });
});

test('normalizeFeedItems supports qa feedback payload', () => {
  const items = normalizeFeedItems({
    feedbacks: [{ feedbackId: 'qa-1', utterance: '工商认定', expectedCanonical: '工伤认定' }],
  }, 'qa_feedback');
  assert.equal(items[0].caseId, 'qa-1');
  assert.equal(items[0].text, '工商认定');
  assert.deepEqual(items[0].expectedCanonicals, ['工伤认定']);
});

test('normalizeFeedItems supports online feedback payload', () => {
  const items = normalizeFeedItems({
    events: [{ eventId: 'online-1', transcript: '婚姻检查所', expectedTerms: ['婚姻介绍所'] }],
  }, 'online_feedback');
  assert.equal(items[0].caseId, 'online-1');
  assert.equal(items[0].text, '婚姻检查所');
  assert.deepEqual(items[0].expectedCanonicals, ['婚姻介绍所']);
});

test('configured feed sources surface transport and receipt directories from connector config', () => {
  const config = createValidationFeedTestConfig('workspace-unit-validation-feed-config', [{
    sourceType: 'cg3',
    transportType: 'http_pull_json',
    endpoint: 'https://example.test/cg3',
    ackType: 'http_post',
    ackEndpoint: 'https://example.test/cg3/ack',
  }]);
  const sources = configuredFeedSources(config);
  const cg3 = sources.find((item) => item.sourceType === 'cg3');
  assert.equal(cg3.transportType, 'http_pull_json');
  assert.equal(cg3.receiptDir.endsWith(path.join('validation_feeds', 'receipts', 'cg3')), true);
});

test('http pull validation feed imports batch, writes receipt, and acknowledges delivery', async () => {
  const config = createValidationFeedTestConfig('workspace-unit-validation-feed-http-success', [{
    sourceType: 'cg3',
    transportType: 'http_pull_json',
    endpoint: 'https://example.test/cg3',
    authType: 'bearer',
    authToken: 'cg3-token',
    ackType: 'http_post',
    ackEndpoint: 'https://example.test/cg3/ack',
  }]);
  const db = openDatabase(config);
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/ack')) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({
      sourceType: 'cg3',
      batchId: 'cg3-batch-001',
      records: [{ recordId: 'cg3-1', snippet: '旗顺路', canonicalTexts: ['祁顺路'] }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const summary = await importValidationFeeds(db, config, 'validation_feed_test', { sourceTypes: ['cg3'] });
    assert.equal(summary.sourceCount, 1);
    assert.equal(summary.pulledBatchCount, 1);
    assert.equal(summary.ackedCount, 1);
    assert.equal(summary.importedCount, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM validation_cases WHERE case_id = ?').get('cg3-1').count, 1);

    const sourceState = listValidationFeedSources(config).find((item) => item.sourceType === 'cg3');
    assert.equal(sourceState.receiptFileCount, 1);
    assert.equal(sourceState.transportType, 'http_pull_json');
    assert.equal(calls.length, 2);
    assert.match(String(calls[0].options.headers.authorization || ''), /^Bearer cg3-token$/);
  } finally {
    global.fetch = originalFetch;
    db.close();
  }
});

test('http pull validation feed advances source cursor only after confirmed import', async () => {
  const config = createValidationFeedTestConfig('workspace-unit-validation-feed-http-cursor', [{
    sourceType: 'cg3',
    transportType: 'http_pull_json',
    endpoint: 'https://example.test/cg3',
    cursorQueryKey: 'cursor',
    cursorResponseField: 'meta.nextCursor',
    initialCursor: 'cg3-cursor-0',
    ackType: 'none',
  }]);
  const db = openDatabase(config);
  const originalFetch = global.fetch;
  const urls = [];
  let deliveryIndex = 0;
  global.fetch = async (url) => {
    urls.push(String(url));
    deliveryIndex += 1;
    if (deliveryIndex === 1) {
      return new Response(JSON.stringify({
        sourceType: 'cg3',
        batchId: 'cg3-cursor-batch-1',
        meta: { nextCursor: 'cg3-cursor-1' },
        records: [{ recordId: 'cg3-cursor-1', snippet: '旗顺路', canonicalTexts: ['祁顺路'] }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      sourceType: 'cg3',
      batchId: 'cg3-cursor-batch-2',
      meta: { nextCursor: 'cg3-cursor-2' },
      records: [{ recordId: 'cg3-cursor-2', snippet: '工商认定', canonicalTexts: ['工伤认定'] }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const first = await importValidationFeeds(db, config, 'validation_feed_test', { sourceTypes: ['cg3'] });
    assert.equal(first.importedCount, 1);
    let sourceState = listValidationFeedSources(config).find((item) => item.sourceType === 'cg3');
    assert.equal(sourceState.currentCursor, 'cg3-cursor-1');
    assert.match(urls[0], /cursor=cg3-cursor-0/);

    const second = await importValidationFeeds(db, config, 'validation_feed_test', { sourceTypes: ['cg3'] });
    assert.equal(second.importedCount, 1);
    sourceState = listValidationFeedSources(config).find((item) => item.sourceType === 'cg3');
    assert.equal(sourceState.currentCursor, 'cg3-cursor-2');
    assert.match(urls[1], /cursor=cg3-cursor-1/);
  } finally {
    global.fetch = originalFetch;
    db.close();
  }
});

test('duplicate http delivery is skipped after imported receipt is written', async () => {
  const config = createValidationFeedTestConfig('workspace-unit-validation-feed-http-duplicate', [{
    sourceType: 'cg3',
    transportType: 'http_pull_json',
    endpoint: 'https://example.test/cg3',
    ackType: 'none',
  }]);
  const db = openDatabase(config);
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({
    sourceType: 'cg3',
    batchId: 'cg3-batch-duplicate',
    records: [{ recordId: 'cg3-dup-1', snippet: '旗顺路', canonicalTexts: ['祁顺路'] }],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  try {
    const first = await importValidationFeeds(db, config, 'validation_feed_test', { sourceTypes: ['cg3'] });
    const second = await importValidationFeeds(db, config, 'validation_feed_test', { sourceTypes: ['cg3'] });
    assert.equal(first.importedCount, 1);
    assert.equal(second.duplicateSkippedCount, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM validation_cases WHERE case_id = ?').get('cg3-dup-1').count, 1);
  } finally {
    global.fetch = originalFetch;
    db.close();
  }
});

test('ack failure writes replay envelope and replay-errors recovers ack without duplicate import', async () => {
  const config = createValidationFeedTestConfig('workspace-unit-validation-feed-http-replay', [{
    sourceType: 'cg3',
    transportType: 'http_pull_json',
    endpoint: 'https://example.test/cg3',
    cursorQueryKey: 'cursor',
    cursorResponseField: 'meta.nextCursor',
    initialCursor: 'cg3-cursor-0',
    ackType: 'http_post',
    ackEndpoint: 'https://example.test/cg3/ack',
  }]);
  const db = openDatabase(config);
  const originalFetch = global.fetch;
  let ackAttempts = 0;
  global.fetch = async (url) => {
    if (String(url).includes('/ack')) {
      ackAttempts += 1;
      return ackAttempts === 1
        ? new Response(JSON.stringify({ error: 'ack failed' }), { status: 500 })
        : new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({
      sourceType: 'cg3',
      batchId: 'cg3-batch-replay',
      meta: { nextCursor: 'cg3-cursor-1' },
      records: [{ recordId: 'cg3-replay-1', snippet: '旗顺路', canonicalTexts: ['祁顺路'] }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const first = await importValidationFeeds(db, config, 'validation_feed_test', { sourceTypes: ['cg3'] });
    assert.equal(first.ackFailedCount, 1);
    assert.equal(first.importedCount, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM validation_cases WHERE case_id = ?').get('cg3-replay-1').count, 1);
    let sourceState = listValidationFeedSources(config).find((item) => item.sourceType === 'cg3');
    assert.equal(sourceState.currentCursor, '');

    const second = await importValidationFeeds(db, config, 'validation_feed_test', { sourceTypes: ['cg3'], replayErrors: true });
    assert.equal(second.ackedCount, 1);
    assert.equal(second.importedCount, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM validation_cases WHERE case_id = ?').get('cg3-replay-1').count, 1);
    sourceState = listValidationFeedSources(config).find((item) => item.sourceType === 'cg3');
    assert.equal(sourceState.currentCursor, 'cg3-cursor-1');
  } finally {
    global.fetch = originalFetch;
    db.close();
  }
});
