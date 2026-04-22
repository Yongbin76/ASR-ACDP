const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const buildSnapshot = require('../../src/cli/build-snapshot');
const { createPrototypeApp } = require('../../src/server');
const { getTermPinyinProfile, getRuntimeNodeRegistryItem } = require('../../src/lib/platform-db');

/**
 * 功能：创建当前测试场景使用的配置对象。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createTestConfig() {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(
    baseConfig.projectRoot,
    'prototype',
    `workspace-unit-console-workflows-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
  };
}

/**
 * 功能：构建当前调用场景使用的请求头对象。
 * 输入：`role`（角色标识）、`operator`（操作人标识）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function headers(role = 'dict_admin', operator = 'console_workflow') {
  return {
    'x-role': role,
    'x-operator': operator,
  };
}

test('console workflow supports pinyin candidate submit and review approve', { timeout: 120000 }, async () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console workflow baseline build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8801,
    },
  });
  try {
    const createdTerm = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/terms',
      headers: headers(),
      body: {
        categoryCode: 'proper_noun',
        canonicalText: '单于桥',
        aliases: [],
        priority: 70,
        riskLevel: 'medium',
        replaceMode: 'replace',
        baseConfidence: 0.9,
        sourceType: 'manual',
        pinyinRuntimeMode: 'candidate',
      },
    });
    const termId = createdTerm.json.item.termId;
    const candidateList = await app.inject({
      method: 'POST',
      url: `/api/console/dictionary/terms/${encodeURIComponent(termId)}/generate-pinyin-candidates`,
      headers: headers(),
      body: { limit: 8 },
    });
    assert.equal(candidateList.statusCode, 200);
    const candidate = candidateList.json.item.items.find((item) => item.fullPinyinNoTone === 'dan yu qiao');
    assert.ok(candidate);

    const submitCandidate = await app.inject({
      method: 'POST',
      url: `/api/console/dictionary/terms/${encodeURIComponent(termId)}/pinyin-candidates`,
      headers: headers('dict_editor', 'editor_user'),
      body: {
        fullPinyinNoTone: candidate.fullPinyinNoTone,
        comment: 'submit candidate',
      },
    });
    assert.equal(submitCandidate.statusCode, 201);
    const taskId = submitCandidate.json.item.taskId;
    assert.ok(taskId);

    const approveCandidate = await app.inject({
      method: 'POST',
      url: `/api/console/dictionary/reviews/${encodeURIComponent(taskId)}/approve`,
      headers: headers('dict_reviewer', 'reviewer_user'),
      body: { comment: 'approve candidate' },
    });
    assert.equal(approveCandidate.statusCode, 200);
    assert.equal(approveCandidate.json.item.status, 'approved');

    const profile = getTermPinyinProfile(app.db, termId, '单于桥');
    assert.ok((profile.alternativeReadings || []).includes('dan yu qiao'));
  } finally {
    await app.stop();
  }
});

test('console workflow supports release review and publish with separate operators', { timeout: 120000 }, async () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console workflow baseline build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8802,
    },
  });
  try {
    const createdTerm = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/terms',
      headers: headers(),
      body: {
        categoryCode: 'proper_noun',
        canonicalText: '控制台发布词',
        aliases: ['控制台发布别名'],
        priority: 90,
        riskLevel: 'medium',
        replaceMode: 'replace',
        baseConfidence: 0.94,
        sourceType: 'manual',
        pinyinRuntimeMode: 'candidate',
      },
    });
    const termId = createdTerm.json.item.termId;

    const reviewTask = await app.inject({
      method: 'POST',
      url: `/api/console/dictionary/terms/${encodeURIComponent(termId)}/submit-review`,
      headers: headers('dict_editor', 'editor_user'),
      body: { comment: 'submit term' },
    });
    const approveTask = await app.inject({
      method: 'POST',
      url: `/api/console/dictionary/reviews/${encodeURIComponent(reviewTask.json.item.taskId)}/approve`,
      headers: headers('dict_reviewer', 'reviewer_user'),
      body: { comment: 'approve term' },
    });
    assert.equal(approveTask.statusCode, 200);

    const release = await app.inject({
      method: 'POST',
      url: '/api/console/releases/build',
      headers: headers('dict_publisher', 'publisher_user'),
      body: { summary: 'console release build' },
    });
    assert.equal(release.statusCode, 201);
    const releaseId = release.json.item.releaseId;

    const releaseReview = await app.inject({
      method: 'POST',
      url: `/api/console/releases/${encodeURIComponent(releaseId)}/submit-review`,
      headers: headers('dict_publisher', 'publisher_user'),
      body: { comment: 'submit release review' },
    });
    assert.equal(releaseReview.statusCode, 201);

    const contentReviews = await app.inject({
      method: 'GET',
      url: '/api/console/dictionary/reviews',
      headers: headers('dict_publisher', 'publisher_user'),
    });
    assert.equal(contentReviews.statusCode, 200);
    assert.ok((contentReviews.json.items || []).every((item) => item.targetType !== 'release'));

    const releaseReviews = await app.inject({
      method: 'GET',
      url: '/api/console/dictionary/reviews?taskType=release_publish_review',
      headers: headers('dict_publisher', 'publisher_user'),
    });
    assert.equal(releaseReviews.statusCode, 200);
    const releaseReviewSummary = (releaseReviews.json.items || []).find((item) => item.taskId === releaseReview.json.item.taskId);
    assert.ok(releaseReviewSummary);
    assert.equal(releaseReviewSummary.targetSummary.releaseState.status, 'built');
    assert.equal(releaseReviewSummary.targetSummary.approval.status, 'pending');
    assert.equal(releaseReviewSummary.targetSummary.traffic.status, 'no_gray');

    const approveReleaseReview = await app.inject({
      method: 'POST',
      url: `/api/console/dictionary/reviews/${encodeURIComponent(releaseReview.json.item.taskId)}/approve`,
      headers: headers('dict_reviewer', 'reviewer_user2'),
      body: { comment: 'approve release' },
    });
    assert.equal(approveReleaseReview.statusCode, 200);

    const releasesAfterApproval = await app.inject({
      method: 'GET',
      url: '/api/console/releases?status=built',
      headers: headers('dict_publisher', 'publisher_user'),
    });
    assert.equal(releasesAfterApproval.statusCode, 200);
    const approvedReleaseSummary = (releasesAfterApproval.json.items || []).find((item) => item.releaseId === releaseId);
    assert.ok(approvedReleaseSummary);
    assert.equal(approvedReleaseSummary.approval.status, 'approved');
    assert.ok(Number(approvedReleaseSummary.approval.approvedCount || 0) >= 1);
    assert.equal(approvedReleaseSummary.traffic.status, 'no_gray');

    const releaseDetail = await app.inject({
      method: 'GET',
      url: `/api/console/releases/${encodeURIComponent(releaseId)}`,
      headers: headers('dict_publisher', 'publisher_user'),
    });
    assert.equal(releaseDetail.statusCode, 200);
    assert.ok(releaseDetail.json.item.reviewTask);
    assert.equal(releaseDetail.json.item.reviewTask.taskId, releaseReview.json.item.taskId);

    const publishRelease = await app.inject({
      method: 'POST',
      url: `/api/console/releases/${encodeURIComponent(releaseId)}/publish`,
      headers: headers('dict_publisher', 'publisher_user'),
      body: { mode: 'publish' },
    });
    assert.equal(publishRelease.statusCode, 200);
    assert.equal(publishRelease.json.item.release.status, 'published');
  } finally {
    await app.stop();
  }
});

test('console workflow supports validation case creation and related terms lookup', { timeout: 120000 }, async () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console workflow baseline build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8803,
    },
  });
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/console/validation/cases',
      headers: headers(),
      body: {
        caseId: 'console-workflow-case-001',
        description: 'workflow validation case',
        text: '我想了解工商认定的办理材料。',
        expectedCanonicals: ['工伤认定'],
        sourceType: 'manual',
        notes: 'workflow',
      },
    });
    assert.equal(created.statusCode, 201);

    const related = await app.inject({
      method: 'GET',
      url: '/api/console/validation/cases/console-workflow-case-001/related-terms',
      headers: headers(),
    });
    assert.equal(related.statusCode, 200);
    assert.ok((related.json.items || []).some((item) => item.canonicalText === '工伤认定'));
  } finally {
    await app.stop();
  }
});

test('console workflow keeps blocked rows downloadable after importing passable rows', { timeout: 120000 }, async () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console workflow import skip blocked build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8806,
    },
  });
  try {
    const importCsv = [
      'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
      '工作流可导入词,工作流可导入别名,proper_noun,80,medium,replace,0.9,candidate,,,manual,workflow-ready',
      '办理材料,,gov_term,80,medium,replace,0.9,candidate,,,manual,workflow-blocked',
    ].join('\n');
    const createdImportJob = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/import-jobs',
      headers: headers('dict_editor', 'editor_user'),
      body: {
        templateCode: 'structured_terms_csv_v2',
        sourceType: 'manual',
        fileName: 'workflow_import_skip_blocked.csv',
        contentType: 'text/csv',
        fileContent: importCsv,
        comment: 'console workflow import skip blocked',
      },
    });
    assert.equal(createdImportJob.statusCode, 201);
    const importJobId = createdImportJob.json.item.jobId;

    const confirmed = await app.inject({
      method: 'POST',
      url: `/api/console/dictionary/import-jobs/${encodeURIComponent(importJobId)}/confirm`,
      headers: headers('dict_editor', 'editor_user'),
      body: { importMode: 'upsert' },
    });
    assert.equal(confirmed.statusCode, 200);
    assert.equal(confirmed.json.item.resultSummary.importedReadyCount, 1);
    assert.equal(confirmed.json.item.resultSummary.skippedBlockedCount, 1);

    const detail = await app.inject({
      method: 'GET',
      url: `/api/console/dictionary/import-jobs/${encodeURIComponent(importJobId)}`,
      headers: headers('dict_editor', 'editor_user'),
    });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json.item.resultSummary.skippedBlockedCount, 1);

    const rows = await app.inject({
      method: 'GET',
      url: `/api/console/dictionary/import-jobs/${encodeURIComponent(importJobId)}/rows?status=error&decision=skipped_blocked`,
      headers: headers('dict_editor', 'editor_user'),
    });
    assert.equal(rows.statusCode, 200);
    assert.equal((rows.json.items || []).length, 1);

    const download = await app.inject({
      method: 'GET',
      url: `/api/console/dictionary/import-jobs/${encodeURIComponent(importJobId)}/errors/download`,
      headers: headers('dict_editor', 'editor_user'),
    });
    assert.equal(download.statusCode, 200);
    assert.match(String(download.body || ''), /办理材料/);
  } finally {
    await app.stop();
  }
});

test('console workflow supports import-batch scoped term review bulk approve', { timeout: 120000 }, async () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console workflow import batch review build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8805,
    },
  });
  try {
    const importCsv = [
      'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
      '批量审核导入词一,批量审核导入别名一,proper_noun,80,medium,replace,0.9,candidate,,,manual,workflow-import-1',
      '批量审核导入词二,批量审核导入别名二,proper_noun,81,medium,replace,0.9,candidate,,,manual,workflow-import-2',
    ].join('\n');
    const createdImportJob = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/import-jobs',
      headers: headers('dict_editor', 'editor_user'),
      body: {
        templateCode: 'structured_terms_csv_v2',
        sourceType: 'manual',
        fileName: 'bulk_review_import.csv',
        contentType: 'text/csv',
        fileContent: importCsv,
        comment: 'console workflow bulk review import',
      },
    });
    assert.equal(createdImportJob.statusCode, 201);
    const importJobId = createdImportJob.json.item.jobId;

    const confirmed = await app.inject({
      method: 'POST',
      url: `/api/console/dictionary/import-jobs/${encodeURIComponent(importJobId)}/confirm`,
      headers: headers('dict_editor', 'editor_user'),
      body: { importMode: 'upsert' },
    });
    assert.equal(confirmed.statusCode, 200);

    const reviewList = await app.inject({
      method: 'GET',
      url: `/api/console/dictionary/reviews?taskType=term_review&targetType=term&importJobId=${encodeURIComponent(importJobId)}`,
      headers: headers('dict_reviewer', 'reviewer_user'),
    });
    assert.equal(reviewList.statusCode, 200);
    assert.equal(reviewList.json.importJobContext.jobId, importJobId);
    assert.ok((reviewList.json.items || []).length >= 2);
    assert.ok((reviewList.json.items || []).every((item) => item.taskType === 'term_review'));

    const bulkApprove = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/reviews/batch-approve',
      headers: headers('dict_reviewer', 'reviewer_user'),
      body: {
        scope: 'import_job',
        importJobId,
        comment: 'approve imported term reviews',
      },
    });
    assert.equal(bulkApprove.statusCode, 200);
    assert.ok(Number(bulkApprove.json.item.approvedCount || 0) >= 2);
    assert.equal(bulkApprove.json.item.scope, 'import_job');
  } finally {
    await app.stop();
  }
});

test('console workflow supports current-filter scoped term review bulk approve', { timeout: 120000 }, async () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console workflow current filter review build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8807,
    },
  });
  try {
    for (const [canonicalText, aliasText] of [['筛选审核词一', '筛选审核别名一'], ['筛选审核词二', '筛选审核别名二']]) {
      const created = await app.inject({
        method: 'POST',
        url: '/api/console/dictionary/terms',
        headers: headers('dict_editor', 'editor_user'),
        body: {
          categoryCode: 'proper_noun',
          canonicalText,
          aliases: [aliasText],
          priority: 80,
          riskLevel: 'medium',
          replaceMode: 'replace',
          baseConfidence: 0.9,
          sourceType: 'manual',
          pinyinRuntimeMode: 'candidate',
        },
      });
      assert.equal(created.statusCode, 201);
      const submit = await app.inject({
        method: 'POST',
        url: `/api/console/dictionary/terms/${encodeURIComponent(created.json.item.termId)}/submit-review`,
        headers: headers('dict_editor', 'editor_user'),
        body: { comment: 'current filter submit review' },
      });
      assert.equal(submit.statusCode, 200);
    }

    const bulkApprove = await app.inject({
      method: 'POST',
      url: '/api/console/dictionary/reviews/batch-approve',
      headers: headers('dict_reviewer', 'reviewer_user'),
      body: {
        scope: 'current_filter',
        filters: {
          status: 'pending',
          taskType: 'term_review',
          targetType: 'term',
        },
      },
    });
    assert.equal(bulkApprove.statusCode, 200);
    assert.equal(bulkApprove.json.item.scope, 'current_filter');
    assert.ok(Number(bulkApprove.json.item.approvedCount || 0) >= 2);
  } finally {
    await app.stop();
  }
});

test('console workflow supports runtime node registry create and rotate secret', { timeout: 120000 }, async () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console workflow runtime registry build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8804,
    },
  });
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/console/runtime-node-registry',
      headers: headers('dict_admin', 'registry_admin'),
      body: {
        nodeId: 'workflow-runtime-node-001',
        nodeName: 'Workflow Runtime Node 001',
        env: 'test',
        address: 'http://127.0.0.1:9951',
      },
    });
    assert.equal(created.statusCode, 201);
    assert.ok(created.json.secretPlaintext);

    const rotated = await app.inject({
      method: 'POST',
      url: '/api/console/runtime-node-registry/workflow-runtime-node-001/rotate-secret',
      headers: headers('dict_admin', 'registry_admin'),
      body: {},
    });
    assert.equal(rotated.statusCode, 200);
    assert.ok(rotated.json.secretPlaintext);
    assert.notEqual(rotated.json.secretPlaintext, created.json.secretPlaintext);

    const detail = getRuntimeNodeRegistryItem(app.db, 'workflow-runtime-node-001');
    assert.ok(detail);
    assert.equal(detail.nodeId, 'workflow-runtime-node-001');
  } finally {
    await app.stop();
  }
});
