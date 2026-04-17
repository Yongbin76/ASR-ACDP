const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const buildSnapshot = require('../../src/cli/build-snapshot');
const {
  createRuntimeNodeRegistryItem,
  registerRuntimeNode,
  heartbeatRuntimeNode,
  setRuntimeDesiredRelease,
} = require('../../src/lib/platform-db');
const { createPrototypeApp } = require('../../src/server');

/**
 * 功能：创建当前测试场景使用的配置对象。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createTestConfig(port) {
  const baseConfig = createAppConfig();
  const resolvedPort = 20000 + Math.floor(Math.random() * 20000);
  const workspaceDir = path.join(
    baseConfig.projectRoot,
    'prototype',
    `workspace-unit-console-api-${port}-${resolvedPort}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const catalogDir = path.join(workspaceDir, 'catalog');
  const releasesDir = path.join(workspaceDir, 'releases');
  if (fs.existsSync(workspaceDir)) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
  fs.mkdirSync(catalogDir, { recursive: true });
  fs.mkdirSync(releasesDir, { recursive: true });
  return {
    ...baseConfig,
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
      catalogDir,
      releasesDir,
      latestReleaseDir: path.join(releasesDir, 'latest'),
      databaseFile: path.join(workspaceDir, 'platform.db'),
      seedCatalogFile: path.join(catalogDir, 'seed_terms.json'),
      validationFeedInboxDir: path.join(workspaceDir, 'validation_feeds', 'inbox'),
      validationFeedArchiveDir: path.join(workspaceDir, 'validation_feeds', 'archive'),
      validationFeedErrorDir: path.join(workspaceDir, 'validation_feeds', 'error'),
    },
    server: {
      ...baseConfig.server,
      host: '127.0.0.1',
      port: resolvedPort,
    },
  };
}

/**
 * 功能：构建当前调用场景使用的请求头对象。
 * 输入：`extra`（附加数据对象）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function consoleHeaders(extra = {}) {
  return {
    'x-role': 'dict_admin',
    'x-operator': 'console_test',
    ...extra,
  };
}

test('console API exposes business properties for unified main-data inputs', { timeout: 120000 }, async () => {
  const config = createTestConfig(8794);
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console api business properties baseline build', config);
  const app = createPrototypeApp(config);
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/console/business-properties',
      headers: consoleHeaders(),
    });
    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.json.items));
    assert.ok(response.json.items.length > 0);
    assert.ok(response.json.items.some((item) => item.value && item.label));
  } finally {
    await app.stop();
  }
});

test('console API blocks term admission violations and returns structured issues', { timeout: 120000 }, async () => {
  const config = createTestConfig(8795);
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console api admission blocked build', config);
  const app = createPrototypeApp(config);
  try {
    const blocked = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/terms',
      headers: consoleHeaders(),
      body: {
        categoryCode: 'gov_term',
        canonicalText: '办理材料',
        aliases: [],
        priority: 80,
        riskLevel: 'medium',
        replaceMode: 'replace',
        baseConfidence: 0.9,
        sourceType: 'manual',
        pinyinRuntimeMode: 'candidate',
      },
    });
    assert.equal(blocked.statusCode, 409);
    assert.equal(blocked.json.admissionLevel, 'blocked');
    assert.ok(Array.isArray(blocked.json.issues));
    assert.ok(blocked.json.issues.some((entry) => entry.code === 'dictionary_phrase_blocked'));
    assert.ok(blocked.json.issues.some((entry) => entry.code === 'gov_term_shape_blocked'));
  } finally {
    await app.stop();
  }
});

test('console API applies single-character canonical admission exception rules', { timeout: 120000 }, async () => {
  const config = createTestConfig(87955);
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console api single-character admission build', config);
  const app = createPrototypeApp(config);
  try {
    const blockedSingleAlias = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/terms',
      headers: consoleHeaders(),
      body: {
        categoryCode: 'proper_noun',
        canonicalText: '王',
        aliases: ['汪'],
        priority: 80,
        riskLevel: 'medium',
        replaceMode: 'replace',
        baseConfidence: 0.9,
        sourceType: 'manual',
        pinyinRuntimeMode: 'candidate',
      },
    });
    assert.equal(blockedSingleAlias.statusCode, 409);
    assert.equal(blockedSingleAlias.json.admissionLevel, 'blocked');
    assert.ok((blockedSingleAlias.json.issues || []).some((entry) => entry.code === 'single_character_blocked'));

    const blockedWithoutAlias = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/terms',
      headers: consoleHeaders(),
      body: {
        categoryCode: 'proper_noun',
        canonicalText: '李',
        aliases: [],
        priority: 80,
        riskLevel: 'medium',
        replaceMode: 'replace',
        baseConfidence: 0.9,
        sourceType: 'manual',
        pinyinRuntimeMode: 'candidate',
      },
    });
    assert.equal(blockedWithoutAlias.statusCode, 409);
    assert.ok((blockedWithoutAlias.json.issues || []).some((entry) => entry.code === 'single_character_blocked'));

    const allowed = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/terms',
      headers: consoleHeaders(),
      body: {
        categoryCode: 'proper_noun',
        canonicalText: '李',
        aliases: ['李某'],
        priority: 80,
        riskLevel: 'medium',
        replaceMode: 'replace',
        baseConfidence: 0.9,
        sourceType: 'manual',
        pinyinRuntimeMode: 'candidate',
      },
    });
    assert.equal(allowed.statusCode, 201);
    assert.equal(allowed.json.item.canonicalText, '李');
  } finally {
    await app.stop();
  }
});

test('console release gate and validation endpoints return console-formatted sections', { timeout: 120000 }, async () => {
  const config = createTestConfig(8796);
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console api gate format baseline build', config);
  const app = createPrototypeApp(config);
  try {
    const terms = await app.inject({
      method: 'GET',
      url: '/api/console/dictionary/terms?page=1&pageSize=20',
      headers: consoleHeaders(),
    });
    assert.equal(terms.statusCode, 200);
    assert.ok(terms.json.summary.totalCount >= terms.json.total);
    assert.ok(terms.json.filteredSummary.totalCount >= terms.json.total);

    const validationList = await app.inject({
      method: 'GET',
      url: '/api/console/validation/cases?page=1&pageSize=20',
      headers: consoleHeaders(),
    });
    assert.equal(validationList.statusCode, 200);
    assert.ok(validationList.json.summary.totalCount >= validationList.json.total);
    assert.ok(validationList.json.filteredSummary.totalCount >= validationList.json.total);

    const createdValidationCase = await app.inject({
      method: 'POST',
      url: '/api/console/validation/cases',
      headers: consoleHeaders(),
      body: {
        caseId: 'console-api-gate-format-case-001',
        description: 'console api gate format sample',
        text: '这里是一条不会命中目标词的样本。',
        expectedCanonicals: ['工伤认定'],
        notes: 'console api format regression',
        sourceType: 'manual',
      },
    });
    assert.equal(createdValidationCase.statusCode, 201);

    const buildReleaseResponse = await app.inject({
      method: 'POST',
      url: '/api/console/releases/build',
      headers: consoleHeaders(),
      body: {
        summary: 'console api gate format release',
      },
    });
    assert.equal(buildReleaseResponse.statusCode, 201);
    const releaseId = buildReleaseResponse.json.item.releaseId;

    const gate = await app.inject({
      method: 'GET',
      url: `/api/console/releases/${encodeURIComponent(releaseId)}/gate`,
      headers: consoleHeaders(),
    });
    assert.equal(gate.statusCode, 200);
    assert.equal(gate.json.item.blocked, true);
    assert.ok(Array.isArray(gate.json.item.blockers));
    assert.equal(gate.json.item.blockers[0].title, '业务样本验证失败');
    assert.equal(gate.json.item.blockers[0].items[0].title, 'console-api-gate-format-case-001');
    assert.match(gate.json.item.blockers[0].items[0].detail, /业务样本没有命中期望标准词/);

    const validation = await app.inject({
      method: 'GET',
      url: `/api/console/releases/${encodeURIComponent(releaseId)}/validation`,
      headers: consoleHeaders(),
    });
    assert.equal(validation.statusCode, 200);
    assert.equal(validation.json.item.failedCount > 0, true);
    assert.ok(Array.isArray(validation.json.item.cases));
    const failedCase = validation.json.item.cases.find((item) => item.caseId === 'console-api-gate-format-case-001');
    assert.ok(failedCase);
    assert.equal(failedCase.caseTypeLabel, '业务样本验证');
    assert.equal(failedCase.reasonLabel, '业务样本未命中期望标准词');
    assert.match(failedCase.resultDetail, /仍未命中/);
  } finally {
    await app.stop();
  }
});

test('console API exposes runtime node list and detail', { timeout: 120000 }, async () => {
  const config = createTestConfig(8797);
  prepareData.main(config);
  bootstrapDb.main(config);
  const release = buildSnapshot.main('console runtime node baseline build', config);
  const app = createPrototypeApp({
    ...config,
    auth: {
      ...config.auth,
      runtimeBearerToken: 'console-runtime-node-token',
    },
  });
  try {
    createRuntimeNodeRegistryItem(app.db, {
      nodeId: 'console-runtime-node-001',
      nodeName: 'Console Runtime Node 001',
      env: 'test',
      address: 'http://127.0.0.1:9901',
      registrationSecret: 'console-runtime-node-secret-1',
    }, 'unit_test');
    createRuntimeNodeRegistryItem(app.db, {
      nodeId: 'console-runtime-node-002',
      nodeName: 'Console Runtime Node 002',
      env: 'test',
      address: 'http://127.0.0.1:9902',
      registrationSecret: 'console-runtime-node-secret-2',
    }, 'unit_test');

    const register = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/register',
      headers: {
        authorization: 'Bearer console-runtime-node-token',
      },
      body: {
        nodeId: 'console-runtime-node-001',
        nodeName: 'Console Runtime Node 001',
        env: 'test',
        address: 'http://127.0.0.1:9901',
        runtimeVersion: '0.1.0',
        currentVersion: release.version,
        registrationSecret: 'console-runtime-node-secret-1',
      },
    });
    assert.equal(register.statusCode, 201);

    const registerFailedNode = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/register',
      headers: {
        authorization: 'Bearer console-runtime-node-token',
      },
      body: {
        nodeId: 'console-runtime-node-002',
        nodeName: 'Console Runtime Node 002',
        env: 'test',
        address: 'http://127.0.0.1:9902',
        runtimeVersion: '0.1.0',
        currentVersion: 'rel_old_runtime',
        lastApplyStatus: 'failed',
        lastError: 'artifact download failed: 404 Not Found',
        registrationSecret: 'console-runtime-node-secret-2',
      },
    });
    assert.equal(registerFailedNode.statusCode, 201);

    const setDesired = await app.inject({
      method: 'POST',
      url: '/api/console/runtime-control/desired-version',
      headers: consoleHeaders(),
      body: {
        releaseId: release.releaseId,
      },
    });
    assert.equal(setDesired.statusCode, 201);
    const staleMetadata = JSON.parse(JSON.stringify((setDesired.json.item || {}).artifactMetadata || {}));
    if (staleMetadata.primaryArtifact) {
      staleMetadata.primaryArtifact.artifactUrl = 'http://127.0.0.1:9000/acdp-artifacts/releases/rel_old/snapshot.json?expired=true';
    }
    staleMetadata.files = (staleMetadata.files || []).map((file) => ({
      ...file,
      artifactUrl: `http://127.0.0.1:9000/acdp-artifacts/releases/rel_old/${file.kind}.json?expired=true`,
    }));
    app.db.prepare('UPDATE runtime_control_state SET artifact_metadata_json = ? WHERE control_key = ?')
      .run(JSON.stringify(staleMetadata), 'global');

    const heartbeatRecoveredNode = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/heartbeat',
      headers: {
        authorization: 'Bearer console-runtime-node-token',
      },
      body: {
        nodeId: 'console-runtime-node-001',
        currentVersion: release.version,
        lastApplyStatus: 'success',
        lastError: 'artifact download failed: 404 Not Found',
        registrationSecret: 'console-runtime-node-secret-1',
      },
    });
    assert.equal(heartbeatRecoveredNode.statusCode, 200);

    const uploadStats = await app.inject({
      method: 'POST',
      url: '/api/runtime-nodes/console-runtime-node-001/stats/upload',
      headers: {
        authorization: 'Bearer console-runtime-node-token',
      },
      body: {
        registrationSecret: 'console-runtime-node-secret-1',
        batchId: 'console_runtime_stats_batch_001',
        toEventId: 2,
        records: [
          {
            sequence: 1,
            type: 'hourly_stats',
            payload: {
              hourKey: '2026-04-01T12',
              requestCount: 5,
              httpRequestCount: 5,
              wsRequestCount: 0,
              hitTermCount: 3,
            },
          },
          {
            sequence: 2,
            type: 'hourly_terms',
            payload: {
              hourKey: '2026-04-01T12',
              canonicalText: '工伤认定',
              hitCount: 3,
            },
          },
        ],
      },
    });
    assert.equal(uploadStats.statusCode, 200);

    registerRuntimeNode(app.db, {
      nodeId: 'console-runtime-node-orphan',
      nodeName: 'Console Runtime Node Orphan',
      env: 'test',
      address: 'http://127.0.0.1:9909',
      currentVersion: '',
      runtimeVersion: '0.1.0',
      lastApplyStatus: '',
    }, config);

    const list = await app.inject({
      method: 'GET',
      url: '/api/console/runtime-nodes?page=1&pageSize=20',
      headers: consoleHeaders(),
    });
    assert.equal(list.statusCode, 200);
    assert.equal(list.json.total, 2);
    assert.equal(list.json.orphanRuntimeCount, 1);
    assert.equal(list.json.issueSummary.activeCount, 1);
    assert.equal(list.json.issueSummary.recoveredCount, 1);
    assert.equal(list.json.issueSummary.orphanRuntimeCount, 1);
    assert.equal(list.json.summary.totalCount, 2);
    assert.equal(list.json.summary.activeIssueCount, 1);
    assert.equal(list.json.filteredSummary.totalCount, 2);
    assert.ok(list.json.items.every((item) => item.nodeId !== 'console-runtime-node-orphan'));
    assert.ok(list.json.items.every((item) => item.registry));
    assert.ok(list.json.items.every((item) => item.registration));
    assert.ok(list.json.items.every((item) => item.realtime));
    assert.ok(list.json.items.every((item) => item.target));

    const detail = await app.inject({
      method: 'GET',
      url: '/api/console/runtime-nodes/console-runtime-node-001',
      headers: consoleHeaders(),
    });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json.item.basic.nodeId, 'console-runtime-node-001');
    assert.equal(detail.json.item.control.desiredVersion, release.version);
    assert.equal(detail.json.item.requestSummary.requestCount24h, 5);
    assert.equal(detail.json.item.issue.lifecycle, 'recovered');
    assert.ok((detail.json.item.topTerms || []).some((item) => item.canonicalText === '工伤认定'));
    assert.match(
      String((((detail.json.item.control || {}).artifactMetadata || {}).primaryArtifact || {}).artifactUrl || ''),
      /^http:\/\/122\.51\.13\.230:8788\/api\/runtime-artifacts\/releases\//,
    );
    assert.doesNotMatch(
      String((((detail.json.item.control || {}).artifactMetadata || {}).primaryArtifact || {}).artifactUrl || ''),
      /127\.0\.0\.1:9000/,
    );

    const failedDetail = await app.inject({
      method: 'GET',
      url: '/api/console/runtime-nodes/console-runtime-node-002',
      headers: consoleHeaders(),
    });
    assert.equal(failedDetail.statusCode, 200);
    assert.equal(failedDetail.json.item.issue.lifecycle, 'active');
    assert.equal(failedDetail.json.item.issue.title, '制品下载失败（404）');

    const orphanDetail = await app.inject({
      method: 'GET',
      url: '/api/console/runtime-nodes/console-runtime-node-orphan',
      headers: consoleHeaders(),
    });
    assert.equal(orphanDetail.statusCode, 404);
  } finally {
    await app.stop();
  }
});

test('console API supports import-job scoped review filtering and batch review endpoints', { timeout: 120000 }, async () => {
  const config = createTestConfig(8798);
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console api batch review build', config);
  const app = createPrototypeApp(config);
  try {
    const importCsv = [
      'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
      '接口批量审核词一,接口批量审核别名一,proper_noun,80,medium,replace,0.9,candidate,,,manual,api-import-1',
      '接口批量审核词二,接口批量审核别名二,proper_noun,81,medium,replace,0.9,candidate,,,manual,api-import-2',
    ].join('\n');
    const createdImportJob = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/import-jobs',
      headers: consoleHeaders(),
      body: {
        templateCode: 'structured_terms_csv_v2',
        sourceType: 'manual',
        fileName: 'console_api_batch_review.csv',
        contentType: 'text/csv',
        fileContent: importCsv,
        comment: 'console api batch review',
      },
    });
    assert.equal(createdImportJob.statusCode, 201);
    const importJobId = createdImportJob.json.item.jobId;

    const confirmed = await app.inject({
      method: 'POST',
      url: `/api/console/dictionary/import-jobs/${encodeURIComponent(importJobId)}/confirm`,
      headers: consoleHeaders(),
      body: { importMode: 'upsert' },
    });
    assert.equal(confirmed.statusCode, 200);

    const filteredReviews = await app.inject({
      method: 'GET',
      url: `/api/console/dictionary/reviews?taskType=term_review&targetType=term&importJobId=${encodeURIComponent(importJobId)}`,
      headers: consoleHeaders(),
    });
    assert.equal(filteredReviews.statusCode, 200);
    assert.equal(filteredReviews.json.importJobContext.jobId, importJobId);
    assert.ok(Number(filteredReviews.json.summary.totalCount || 0) >= 2);
    assert.ok(Number(filteredReviews.json.filteredSummary.pendingCount || 0) >= 2);
    assert.ok((filteredReviews.json.items || []).length >= 2);

    const batchReject = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/reviews/batch-reject',
      headers: consoleHeaders(),
      body: {
        scope: 'selected_tasks',
        taskIds: (filteredReviews.json.items || []).slice(0, 1).map((item) => item.taskId),
        comment: 'console api batch reject',
      },
    });
    assert.equal(batchReject.statusCode, 200);
    assert.equal(batchReject.json.item.rejectedCount, 1);

    const invalidBatch = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/reviews/batch-approve',
      headers: consoleHeaders(),
      body: {
        scope: 'selected_tasks',
        taskIds: [],
      },
    });
    assert.equal(invalidBatch.statusCode, 400);
    assert.match(String(invalidBatch.json.error || ''), /review_batch_task_ids_required/);
  } finally {
    await app.stop();
  }
});
