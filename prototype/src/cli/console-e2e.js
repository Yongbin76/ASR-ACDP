const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const { createAppConfig } = require('../lib/config');
const prepareData = require('./prepare-data');
const bootstrapDb = require('./bootstrap-db');
const buildSnapshot = require('./build-snapshot');
const { createPrototypeApp } = require('../server');

/**
 * 功能：创建`e2 econfig`相关逻辑。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createE2EConfig() {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', 'workspace-console-e2e');
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
      port: 8809,
    },
  };
}

/**
 * 功能：构建当前调用场景使用的请求头对象。
 * 输入：`role`（角色标识）、`operator`（操作人标识）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function headers(role = 'dict_admin', operator = 'console_e2e') {
  return {
    'x-role': role,
    'x-operator': operator,
  };
}

/**
 * 功能：向目标应用注入 JSON 请求并返回响应结果。
 * 输入：`app`（应用实例）、`method`（HTTP 方法）、`url`（URL 地址）、`body`（请求体数据）、`extraHeaders`（附加请求头）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function injectJson(app, method, url, body = null, extraHeaders = {}) {
  const response = await app.inject({
    method,
    url,
    headers: headers(extraHeaders['x-role'], extraHeaders['x-operator']),
    body,
  });
  return response;
}

async function main(config = createE2EConfig()) {
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('console e2e baseline build', config);
  const app = createPrototypeApp(config);
  const report = {
    ok: false,
    steps: [],
  };

  /**
   * 功能：处理`record`相关逻辑。
   * 输入：`name`（调用参数）、`response`（响应对象）、`extra`（附加数据对象）。
   * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
   */
  function record(name, response, extra = {}) {
    report.steps.push({
      name,
      statusCode: response.statusCode,
      body: response.json || response.body,
      ...extra,
    });
  }

  try {
    const createdTerm = await injectJson(app, 'POST', '/api/console/terms', {
      categoryCode: 'proper_noun',
      canonicalText: '控制台E2E词条',
      aliases: ['控制台E2E别名'],
      priority: 88,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.92,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
    });
    record('create_term', createdTerm);
    assert.equal(createdTerm.statusCode, 201);
    const termId = createdTerm.json.item.termId;

    const generatedCandidates = await injectJson(app, 'POST', `/api/console/terms/${encodeURIComponent(termId)}/generate-pinyin-candidates`, { limit: 6 });
    record('generate_pinyin_candidates', generatedCandidates);
    assert.equal(generatedCandidates.statusCode, 200);

    const submitTermReview = await injectJson(app, 'POST', `/api/console/terms/${encodeURIComponent(termId)}/submit-review`, {
      comment: 'submit term review',
    }, { 'x-role': 'dict_editor', 'x-operator': 'editor_user' });
    record('submit_term_review', submitTermReview);
    assert.equal(submitTermReview.statusCode, 200);
    const termReviewTaskId = submitTermReview.json.item.taskId;

    const approveTermReview = await injectJson(app, 'POST', `/api/console/reviews/${encodeURIComponent(termReviewTaskId)}/approve`, {
      comment: 'approve term',
    }, { 'x-role': 'dict_reviewer', 'x-operator': 'reviewer_user' });
    record('approve_term_review', approveTermReview);
    assert.equal(approveTermReview.statusCode, 200);

    const createdImportJob = await injectJson(app, 'POST', '/api/console/import/jobs', {
      templateCode: 'structured_terms_csv_v2',
      defaultCategoryCode: 'proper_noun',
      sourceType: 'import_csv',
      fileName: 'console_e2e_terms.csv',
      fileContent: [
        'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
        '控制台E2E导入词,控制台E2E导入别名,,86,medium,replace,0.91,candidate,,,import_csv,示例'
      ].join('\n'),
    });
    record('create_import_job', createdImportJob);
    assert.equal(createdImportJob.statusCode, 201);
    const importJobId = createdImportJob.json.item.jobId;

    const confirmImportJob = await injectJson(app, 'POST', `/api/console/import/jobs/${encodeURIComponent(importJobId)}/confirm`, {
      importMode: 'upsert',
    });
    record('confirm_import_job', confirmImportJob);
    assert.equal(confirmImportJob.statusCode, 200);

    const createdValidationCase = await injectJson(app, 'POST', '/api/console/validation-cases', {
      caseId: 'console-e2e-case-001',
      description: 'console e2e sample',
      text: '我想了解工商认定的办理材料。',
      expectedCanonicals: ['工伤认定'],
      sourceType: 'manual',
      notes: 'console e2e',
    });
    record('create_validation_case', createdValidationCase);
    assert.equal(createdValidationCase.statusCode, 201);

    const relatedTerms = await injectJson(app, 'GET', '/api/console/validation-cases/console-e2e-case-001/related-terms');
    record('related_terms', relatedTerms);
    assert.equal(relatedTerms.statusCode, 200);
    assert.ok((relatedTerms.json.items || []).some((item) => item.canonicalText === '工伤认定'));

    const buildReleaseResponse = await injectJson(app, 'POST', '/api/console/releases/build', {
      summary: 'console e2e release build',
    }, { 'x-role': 'dict_publisher', 'x-operator': 'publisher_user' });
    record('build_release', buildReleaseResponse);
    assert.equal(buildReleaseResponse.statusCode, 201);
    const releaseId = buildReleaseResponse.json.item.releaseId;

    const submitReleaseReview = await injectJson(app, 'POST', `/api/console/releases/${encodeURIComponent(releaseId)}/submit-review`, {
      comment: 'submit release review',
    }, { 'x-role': 'dict_publisher', 'x-operator': 'publisher_user' });
    record('submit_release_review', submitReleaseReview);
    assert.equal(submitReleaseReview.statusCode, 201);
    const releaseReviewTaskId = submitReleaseReview.json.item.taskId;

    const approveReleaseReview = await injectJson(app, 'POST', `/api/console/reviews/${encodeURIComponent(releaseReviewTaskId)}/approve`, {
      comment: 'approve release review',
    }, { 'x-role': 'dict_reviewer', 'x-operator': 'reviewer_user_2' });
    record('approve_release_review', approveReleaseReview);
    assert.equal(approveReleaseReview.statusCode, 200);

    const publishRelease = await injectJson(app, 'POST', `/api/console/releases/${encodeURIComponent(releaseId)}/publish`, {
      mode: 'publish',
    }, { 'x-role': 'dict_publisher', 'x-operator': 'publisher_user' });
    record('publish_release', publishRelease);
    assert.equal(publishRelease.statusCode, 200);

    const releaseGate = await injectJson(app, 'GET', `/api/console/releases/${encodeURIComponent(releaseId)}/gate`);
    record('release_gate', releaseGate);
    assert.equal(releaseGate.statusCode, 200);

    report.ok = true;
    return report;
  } finally {
    await app.stop();
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  main,
};
