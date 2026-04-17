const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { createAppConfig } = require('../src/lib/config');
const prepareData = require('../src/cli/prepare-data');
const bootstrapDb = require('../src/cli/bootstrap-db');
const buildSnapshot = require('../src/cli/build-snapshot');
const { startServer } = require('../src/server');

const baseConfig = createAppConfig();

/**
 * 功能：创建当前测试场景使用的配置对象。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createTestConfig() {
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', 'workspace-test');
  const catalogDir = path.join(workspaceDir, 'catalog');
  const releasesDir = path.join(workspaceDir, 'releases');
  const latestReleaseDir = path.join(releasesDir, 'latest');
  const databaseFile = path.join(workspaceDir, 'platform.db');
  fs.mkdirSync(catalogDir, { recursive: true });
  fs.mkdirSync(releasesDir, { recursive: true });

  return {
    ...baseConfig,
    server: {
      ...baseConfig.server,
      host: '127.0.0.1',
      port: 8791,
    },
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
      catalogDir,
      releasesDir,
      latestReleaseDir,
      databaseFile,
      seedCatalogFile: path.join(catalogDir, 'seed_terms.json'),
    }
  };
}

/**
 * 功能：处理`request`相关逻辑。
 * 输入：`baseUrl`（基础地址）、`route`（路由对象）、`method`（HTTP 方法）、`body`（请求体数据）、`extraHeaders`（附加请求头）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function request(baseUrl, route, method = 'GET', body = null, extraHeaders = {}) {
  const options = {
    method,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-operator': 'integration_test',
      'x-role': 'dict_admin',
      ...extraHeaders,
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const resolvedUrl = new URL(route, baseUrl + '/').toString();
  const res = await fetch(resolvedUrl, options);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`request failed ${res.status} ${method} ${route}: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * 功能：通过 WebSocket 调用运行时纠错接口并返回测试结果。
 * 输入：`wsBaseUrl`（调用参数）、`body`（请求体数据）、`extraHeaders`（附加请求头）。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function websocketCorrect(wsBaseUrl, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'x-operator': 'integration_test',
      'x-role': 'dict_admin',
      ...extraHeaders,
    };
    const ws = new WebSocket(new URL('./ws/runtime/correct', wsBaseUrl + '/').toString(), { headers });
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify(body));
    });
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(String(event.data));
        ws.close();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
    ws.addEventListener('error', (event) => {
      reject(event.error || new Error('websocket request failed'));
    });
  });
}

/**
 * 功能：执行当前脚本或模块的主流程。
 * 输入：无。
 * 输出：`Promise`，解析值为当前处理结果。
 */
async function main() {
  const testConfig = createTestConfig();
  const baseUrl = `http://${testConfig.server.host}:${testConfig.server.port}`;
  const wsBaseUrl = `ws://${testConfig.server.host}:${testConfig.server.port}`;

  if (fs.existsSync(testConfig.resolvedPaths.databaseFile)) {
    fs.rmSync(testConfig.resolvedPaths.workspaceDir, { recursive: true, force: true });
    fs.mkdirSync(testConfig.resolvedPaths.catalogDir, { recursive: true });
    fs.mkdirSync(testConfig.resolvedPaths.releasesDir, { recursive: true });
  }

  const prepared = prepareData.main(testConfig);
  assert.ok(prepared.seedTerms > 0);

  const bootstrapped = bootstrapDb.main(testConfig);
  assert.ok(bootstrapped.after > 0);

  const baselineRelease = buildSnapshot.main('integration baseline build', testConfig);
  assert.strictEqual(baselineRelease.status, 'built');

  const app = await startServer(testConfig);
  try {
    const health = await request(baseUrl, './health');
    assert.strictEqual(health.status, 'ok');

    const corrected = await request(baseUrl, './api/runtime/correct', 'POST', {
      text: '我想咨询旗顺路和市发改委，还有工商认定。'
    });
    assert.strictEqual(corrected.correctedText, '我想咨询祁顺路和上海市发展和改革委员会，还有工伤认定。');
    assert.deepStrictEqual(Object.keys(corrected), ['correctedText']);

    const correctedByWebSocket = await websocketCorrect(wsBaseUrl, {
      text: '我想咨询旗顺路和市发改委，还有工商认定。'
    });
    assert.strictEqual(correctedByWebSocket.correctedText, '我想咨询祁顺路和上海市发展和改革委员会，还有工伤认定。');
    assert.deepStrictEqual(Object.keys(correctedByWebSocket), ['correctedText']);

    const created = await request(baseUrl, './api/admin/terms', 'POST', {
      categoryCode: 'proper_noun',
      canonicalText: 'IntegrationCanonical',
      aliases: ['integrationalias'],
      priority: 70,
      baseConfidence: 0.91,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      rules: {
        candidateOnly: false,
        minTextLen: 3,
        maxTextLen: 20,
        boundaryPolicy: 'char_type',
        leftContextAllow: [],
        rightContextAllow: ['consult'],
        leftContextBlock: [],
        rightContextBlock: ['bank'],
        regexAllow: ['consult'],
        regexBlock: ['bank']
      }
    });
    assert.ok(created.termId);

    const fetched = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(created.termId)}`);
    assert.strictEqual(fetched.canonicalText, 'IntegrationCanonical');

    const savedPinyin = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(created.termId)}/pinyin`, 'PUT', {
      runtimeMode: 'replace',
      polyphoneMode: 'manual_with_alternatives',
      customFullPinyinNoTone: 'integration canonical',
      alternativeReadings: ['integration alt'],
      notes: 'integration test profile'
    });
    assert.strictEqual(savedPinyin.runtimeMode, 'replace');

    const conflictTerm = await request(baseUrl, './api/admin/terms', 'POST', {
      categoryCode: 'proper_noun',
      canonicalText: 'IntegrationCollision',
      aliases: ['collisionalias'],
      priority: 68,
      baseConfidence: 0.9,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      rules: {
        candidateOnly: false,
        minTextLen: 3,
        maxTextLen: 20,
        boundaryPolicy: 'none',
        leftContextAllow: [],
        rightContextAllow: [],
        leftContextBlock: [],
        rightContextBlock: [],
        regexAllow: [],
        regexBlock: []
      }
    });
    await request(baseUrl, `./api/admin/terms/${encodeURIComponent(conflictTerm.termId)}/pinyin`, 'PUT', {
      runtimeMode: 'candidate',
      polyphoneMode: 'manual_with_alternatives',
      customFullPinyinNoTone: 'integration canonical',
      alternativeReadings: ['integration alt'],
      notes: 'integration conflict profile'
    });

    const pinyinConflictSummary = await request(baseUrl, './api/admin/pinyin-conflicts?limit=20');
    assert.ok(Array.isArray(pinyinConflictSummary.items));
    assert.ok(pinyinConflictSummary.items.every((item) => ['high', 'medium', 'low'].includes(item.severityLevel)));
    assert.ok(pinyinConflictSummary.items.every((item) => Number.isFinite(item.severityScore)));

    const fullPinyinConflict = await request(baseUrl, './api/admin/pinyin-conflicts?conflictType=full_pinyin_no_tone&key=' + encodeURIComponent('integration canonical'));
    const integrationCanonicalConflict = fullPinyinConflict.items.find((item) => item.conflictType === 'full_pinyin_no_tone' && item.key === 'integration canonical' && item.termCount >= 2);
    assert.ok(integrationCanonicalConflict);

    const initialsConflict = await request(baseUrl, './api/admin/pinyin-conflicts?conflictType=initials&key=ic');
    assert.ok(initialsConflict.items.some((item) => item.conflictType === 'initials' && item.key === 'ic' && item.termCount >= 2));

    const alternativeConflict = await request(baseUrl, './api/admin/pinyin-conflicts?conflictType=alternative_reading&key=' + encodeURIComponent('integration alt'));
    assert.ok(alternativeConflict.items.some((item) => item.conflictType === 'alternative_reading' && item.key === 'integration alt' && item.termCount >= 2));

    const pinyinConflictDetail = await request(baseUrl, './api/admin/pinyin-conflicts/detail?conflictType=full_pinyin_no_tone&key=' + encodeURIComponent('integration canonical'));
    assert.ok(pinyinConflictDetail.item);
    assert.ok(Array.isArray(pinyinConflictDetail.item.terms));
    assert.ok(pinyinConflictDetail.item.termCount >= 2);
    assert.ok(['high', 'medium', 'low'].includes(pinyinConflictDetail.item.severityLevel));

    const shortConflictA = await request(baseUrl, './api/admin/terms', 'POST', {
      categoryCode: 'proper_noun',
      canonicalText: '甲乙丙',
      aliases: [],
      priority: 75,
      baseConfidence: 0.92,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      rules: {}
    });
    const shortConflictB = await request(baseUrl, './api/admin/terms', 'POST', {
      categoryCode: 'road',
      canonicalText: '甲乙丁',
      aliases: [],
      priority: 74,
      baseConfidence: 0.92,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      rules: {}
    });
    await request(baseUrl, `./api/admin/terms/${encodeURIComponent(shortConflictA.termId)}/pinyin`, 'PUT', {
      runtimeMode: 'replace',
      polyphoneMode: 'manual_with_alternatives',
      customFullPinyinNoTone: 'jia yi',
      alternativeReadings: [],
      notes: 'short conflict a'
    });
    await request(baseUrl, `./api/admin/terms/${encodeURIComponent(shortConflictB.termId)}/pinyin`, 'PUT', {
      runtimeMode: 'replace',
      polyphoneMode: 'manual_with_alternatives',
      customFullPinyinNoTone: 'jia yi',
      alternativeReadings: [],
      notes: 'short conflict b'
    });

    const rankedConflicts = await request(baseUrl, './api/admin/pinyin-conflicts?limit=20');
    const rankedFullConflicts = await request(baseUrl, './api/admin/pinyin-conflicts?conflictType=full_pinyin_no_tone&limit=50');
    const jiaYiIndex = rankedFullConflicts.items.findIndex((item) => item.key === 'jia yi');
    assert.ok(jiaYiIndex >= 0);
    assert.strictEqual(rankedFullConflicts.items[jiaYiIndex].severityLevel, 'high');
    assert.ok(rankedFullConflicts.items[jiaYiIndex].severityReasons.includes('short_term_present'));
    assert.ok(
      (rankedFullConflicts.items[jiaYiIndex].highOverlapPairCount || 0) > 0
      || (rankedFullConflicts.items[jiaYiIndex].sharedPrefixPairCount || 0) > 0
    );
    assert.ok(rankedFullConflicts.items[jiaYiIndex].severityScore > integrationCanonicalConflict.severityScore);
    assert.ok((rankedConflicts.stats?.severity?.high || 0) >= 1);

    const candidateTerm = await request(baseUrl, './api/admin/terms', 'POST', {
      categoryCode: 'proper_noun',
      canonicalText: '单于桥',
      aliases: [],
      priority: 66,
      baseConfidence: 0.9,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      rules: {
        candidateOnly: false,
        minTextLen: 2,
        maxTextLen: 20,
        boundaryPolicy: 'none',
        leftContextAllow: [],
        rightContextAllow: [],
        leftContextBlock: [],
        rightContextBlock: [],
        regexAllow: [],
        regexBlock: []
      }
    });

    const generatedCandidates = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(candidateTerm.termId)}/generate-pinyin-candidates`, 'POST', { limit: 10 });
    assert.strictEqual(generatedCandidates.generatedDefault.fullPinyinNoTone, 'chan yu qiao');
    assert.strictEqual(generatedCandidates.stats.polyphonicSlotCount, 1);
    assert.ok(generatedCandidates.items.some((item) => item.fullPinyinNoTone === 'dan yu qiao'));
    assert.ok(generatedCandidates.items.some((item) => item.fullPinyinNoTone === 'shan yu qiao'));
    assert.ok(generatedCandidates.items.every((item) => item.sourceRule === 'polyphonic_single_char_swap'));
    assert.ok(generatedCandidates.items.every((item) => item.reviewStatus === 'not_submitted'));

    const submittedCandidateReview = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(candidateTerm.termId)}/pinyin-candidates`, 'POST', {
      fullPinyinNoTone: 'dan yu qiao',
      comment: 'candidate submit'
    }, { 'x-role': 'dict_editor', 'x-operator': 'editor_user' });
    assert.strictEqual(submittedCandidateReview.taskType, 'pinyin_candidate_review');
    assert.strictEqual(submittedCandidateReview.targetType, 'pinyin_candidate');
    assert.strictEqual(submittedCandidateReview.status, 'pending');

    const generatedCandidatesWithQueue = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(candidateTerm.termId)}/generate-pinyin-candidates`, 'POST', { limit: 10 });
    const queuedCandidate = generatedCandidatesWithQueue.items.find((item) => item.fullPinyinNoTone === 'dan yu qiao');
    assert.ok(queuedCandidate);
    assert.strictEqual(queuedCandidate.reviewStatus, 'pending');
    assert.strictEqual(queuedCandidate.reviewTaskId, submittedCandidateReview.taskId);

    const candidateReviews = await request(baseUrl, './api/admin/reviews?targetType=pinyin_candidate&limit=20');
    assert.ok(candidateReviews.items.some((item) => item.taskId === submittedCandidateReview.taskId && item.targetSnapshot && item.targetSnapshot.fullPinyinNoTone === 'dan yu qiao'));

    const approvedCandidateReview = await request(baseUrl, `./api/admin/reviews/${encodeURIComponent(submittedCandidateReview.taskId)}/approve`, 'POST', {}, { 'x-role': 'dict_reviewer', 'x-operator': 'reviewer_user' });
    assert.strictEqual(approvedCandidateReview.status, 'approved');

    const candidateProfileAfterApproval = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(candidateTerm.termId)}/pinyin`, 'GET');
    assert.ok((candidateProfileAfterApproval.alternativeReadings || []).includes('dan yu qiao'));

    const rejectedCandidateTerm = await request(baseUrl, './api/admin/terms', 'POST', {
      categoryCode: 'proper_noun',
      canonicalText: '单于桥二',
      aliases: [],
      priority: 65,
      baseConfidence: 0.88,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      rules: {}
    });
    const rejectedGeneratedCandidates = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(rejectedCandidateTerm.termId)}/generate-pinyin-candidates`, 'POST', { limit: 10 });
    assert.ok(rejectedGeneratedCandidates.items.length > 0);
    const rejectedReading = rejectedGeneratedCandidates.items[0].fullPinyinNoTone;
    const rejectedCandidateReview = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(rejectedCandidateTerm.termId)}/pinyin-candidates`, 'POST', {
      fullPinyinNoTone: rejectedReading,
      comment: 'candidate reject'
    }, { 'x-role': 'dict_editor', 'x-operator': 'editor_user' });
    const rejectedCandidateDecision = await request(baseUrl, `./api/admin/reviews/${encodeURIComponent(rejectedCandidateReview.taskId)}/reject`, 'POST', { comment: 'reject candidate' }, { 'x-role': 'dict_reviewer', 'x-operator': 'reviewer_user' });
    assert.strictEqual(rejectedCandidateDecision.status, 'rejected');
    const rejectedCandidateProfile = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(rejectedCandidateTerm.termId)}/pinyin`, 'GET');
    assert.ok(!(rejectedCandidateProfile.alternativeReadings || []).includes(rejectedReading));

    const charComparisonTerm = await request(baseUrl, './api/admin/terms', 'POST', {
      categoryCode: 'proper_noun',
      canonicalText: '单于桥甲',
      aliases: [],
      priority: 64,
      baseConfidence: 0.9,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      rules: {}
    });
    await request(baseUrl, `./api/admin/terms/${encodeURIComponent(charComparisonTerm.termId)}/pinyin`, 'PUT', {
      runtimeMode: 'replace',
      polyphoneMode: 'manual_with_alternatives',
      customFullPinyinNoTone: 'dan yu qiao jia',
      alternativeReadings: [],
      notes: 'char level comparison profile'
    });

    const pinyinComparisonSummary = await request(baseUrl, './api/admin/pinyin-comparisons?query=' + encodeURIComponent('IntegrationCanonical') + '&onlyChanged=true&limit=10');
    assert.ok(Array.isArray(pinyinComparisonSummary.items));
    assert.ok(pinyinComparisonSummary.items.some((item) => item.termId === created.termId && item.differenceFields.includes('fullPinyinNoTone')));

    const charComparisonSummary = await request(baseUrl, './api/admin/pinyin-comparisons?query=' + encodeURIComponent('单于桥甲') + '&onlyChanged=true&limit=10');
    const charComparisonSummaryItem = charComparisonSummary.items.find((item) => item.termId === charComparisonTerm.termId);
    assert.ok(charComparisonSummaryItem);
    assert.ok(charComparisonSummaryItem.changedCharCount >= 1);

    const pinyinComparisonDetail = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(created.termId)}/pinyin-comparison`);
    assert.ok(pinyinComparisonDetail.item);
    assert.strictEqual(pinyinComparisonDetail.item.status, 'changed');
    assert.strictEqual(pinyinComparisonDetail.item.currentProfile.fullPinyinNoTone, 'integration canonical');
    assert.ok(pinyinComparisonDetail.item.differenceFields.includes('fullPinyinNoTone'));

    const charComparisonDetail = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(charComparisonTerm.termId)}/pinyin-comparison`);
    assert.ok(charComparisonDetail.item);
    assert.ok(Array.isArray(charComparisonDetail.item.charComparisons));
    assert.ok(charComparisonDetail.item.changedCharCount >= 1);
    const changedChar = charComparisonDetail.item.charComparisons.find((entry) => entry.char === '单');
    assert.ok(changedChar);
    assert.strictEqual(changedChar.defaultSyllable, 'chan');
    assert.strictEqual(changedChar.currentSyllable, 'dan');
    assert.strictEqual(changedChar.changed, true);

    const meAsEditor = await request(baseUrl, './api/admin/me', 'GET', null, { 'x-role': 'dict_editor', 'x-operator': 'editor_user' });
    assert.strictEqual(meAsEditor.role, 'dict_editor');
    assert.ok(meAsEditor.permissions.includes('term.write'));
    assert.ok(!meAsEditor.permissions.includes('review.decide'));

    await assert.rejects(
      () => request(baseUrl, './api/admin/terms', 'POST', {
        categoryCode: 'proper_noun',
        canonicalText: 'ViewerForbiddenTerm',
        aliases: [],
        priority: 60,
        baseConfidence: 0.9,
        replaceMode: 'replace',
        pinyinRuntimeMode: 'candidate',
        rules: {}
      }, { 'x-role': 'dict_viewer', 'x-operator': 'viewer_user' }),
      /request failed 403/
    );

    const editorCreated = await request(baseUrl, './api/admin/terms', 'POST', {
      categoryCode: 'proper_noun',
      canonicalText: 'EditorReviewTerm',
      aliases: [],
      priority: 61,
      baseConfidence: 0.9,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      rules: {}
    }, { 'x-role': 'dict_editor', 'x-operator': 'editor_user' });
    const editorReviewTask = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(editorCreated.termId)}/submit-review`, 'POST', { comment: 'editor submit' }, { 'x-role': 'dict_editor', 'x-operator': 'editor_user' });
    await assert.rejects(
      () => request(baseUrl, `./api/admin/reviews/${encodeURIComponent(editorReviewTask.taskId)}/approve`, 'POST', {}, { 'x-role': 'dict_editor', 'x-operator': 'editor_user' }),
      /request failed 403/
    );
    const reviewerApproved = await request(baseUrl, `./api/admin/reviews/${encodeURIComponent(editorReviewTask.taskId)}/approve`, 'POST', {}, { 'x-role': 'dict_reviewer', 'x-operator': 'reviewer_user' });
    assert.strictEqual(reviewerApproved.status, 'approved');

    await assert.rejects(
      () => request(baseUrl, './api/admin/releases/build', 'POST', { summary: 'editor forbidden build' }, { 'x-role': 'dict_editor', 'x-operator': 'editor_user' }),
      /request failed 403/
    );

    const highRiskReleaseTerm = await request(baseUrl, './api/admin/terms', 'POST', {
      categoryCode: 'proper_noun',
      canonicalText: '高危发布词',
      aliases: [],
      priority: 95,
      riskLevel: 'high',
      baseConfidence: 0.98,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      rules: {}
    });
    await request(baseUrl, `./api/admin/terms/${encodeURIComponent(highRiskReleaseTerm.termId)}/approve`, 'POST', {});

    const reviewTask = await request(baseUrl, `./api/admin/terms/${encodeURIComponent(created.termId)}/submit-review`, 'POST', { comment: 'integration review' });
    assert.strictEqual(reviewTask.status, 'pending');

    const approvedTask = await request(baseUrl, `./api/admin/reviews/${encodeURIComponent(reviewTask.taskId)}/approve`, 'POST', {});
    assert.strictEqual(approvedTask.status, 'approved');

    const built = await request(baseUrl, './api/admin/releases/build', 'POST', { summary: 'integration test build' }, { 'x-role': 'dict_publisher', 'x-operator': 'publisher_user' });
    assert.strictEqual(built.status, 'built');

    const releasesBeforeReview = await request(baseUrl, './api/admin/releases');
    const builtBeforeReview = (releasesBeforeReview.items || []).find((item) => item.releaseId === built.releaseId);
    assert.ok(builtBeforeReview);
    assert.strictEqual(builtBeforeReview.approval.isHighRisk, true);
    assert.strictEqual(builtBeforeReview.approval.requiredApprovals, 2);
    assert.ok(builtBeforeReview.gate);
    assert.ok(builtBeforeReview.gate.validation);
    assert.ok((builtBeforeReview.gate.validation.caseCount || 0) >= 1);
    assert.ok((builtBeforeReview.gate.validation.businessCaseCount || 0) >= 1);

    await assert.rejects(
      () => request(baseUrl, './api/admin/gray-policies', 'POST', {
        releaseId: built.releaseId,
        scopeType: 'traffic_key_hash',
        percentage: 100
      }, { 'x-role': 'dict_operator', 'x-operator': 'operator_user' }),
      /request failed 409/
    );

    await assert.rejects(
      () => request(baseUrl, `./api/admin/releases/${encodeURIComponent(built.releaseId)}/publish`, 'POST', {}, { 'x-role': 'dict_publisher', 'x-operator': 'publisher_user' }),
      /request failed 409/
    );

    const submittedReleaseReview = await request(baseUrl, `./api/admin/releases/${encodeURIComponent(built.releaseId)}/submit-review`, 'POST', {
      comment: 'release review submit'
    }, { 'x-role': 'dict_publisher', 'x-operator': 'publisher_user' });
    assert.strictEqual(submittedReleaseReview.taskType, 'release_publish_review');
    assert.strictEqual(submittedReleaseReview.targetType, 'release');
    assert.strictEqual(submittedReleaseReview.status, 'pending');

    const approvedReleaseReview = await request(baseUrl, `./api/admin/reviews/${encodeURIComponent(submittedReleaseReview.taskId)}/approve`, 'POST', {}, { 'x-role': 'dict_reviewer', 'x-operator': 'reviewer_user' });
    assert.strictEqual(approvedReleaseReview.status, 'approved');

    const releasesAfterFirstApproval = await request(baseUrl, './api/admin/releases');
    const builtAfterFirstApproval = (releasesAfterFirstApproval.items || []).find((item) => item.releaseId === built.releaseId);
    assert.ok(builtAfterFirstApproval);
    assert.strictEqual(builtAfterFirstApproval.approval.status, 'partially_approved');
    assert.strictEqual(builtAfterFirstApproval.approval.approvedCount, 1);
    assert.deepStrictEqual(builtAfterFirstApproval.approval.approvedReviewers, ['reviewer_user']);

    await assert.rejects(
      () => request(baseUrl, './api/admin/gray-policies', 'POST', {
        releaseId: built.releaseId,
        scopeType: 'traffic_key_hash',
        percentage: 100
      }, { 'x-role': 'dict_operator', 'x-operator': 'operator_user' }),
      /request failed 409/
    );

    const submittedSecondReleaseReview = await request(baseUrl, `./api/admin/releases/${encodeURIComponent(built.releaseId)}/submit-review`, 'POST', {
      comment: 'release review submit two'
    }, { 'x-role': 'dict_publisher', 'x-operator': 'publisher_user' });
    assert.strictEqual(submittedSecondReleaseReview.status, 'pending');

    await assert.rejects(
      () => request(baseUrl, `./api/admin/reviews/${encodeURIComponent(submittedSecondReleaseReview.taskId)}/approve`, 'POST', {}, { 'x-role': 'dict_reviewer', 'x-operator': 'reviewer_user' }),
      /request failed 409/
    );

    const approvedSecondReleaseReview = await request(baseUrl, `./api/admin/reviews/${encodeURIComponent(submittedSecondReleaseReview.taskId)}/approve`, 'POST', {}, { 'x-role': 'dict_reviewer', 'x-operator': 'reviewer_user2' });
    assert.strictEqual(approvedSecondReleaseReview.status, 'approved');

    await request(baseUrl, `./api/admin/terms/${encodeURIComponent(highRiskReleaseTerm.termId)}/disable`, 'POST', {}, { 'x-role': 'dict_admin', 'x-operator': 'gate_admin' });
    await assert.rejects(
      () => request(baseUrl, './api/admin/gray-policies', 'POST', {
        releaseId: built.releaseId,
        scopeType: 'traffic_key_hash',
        percentage: 100
      }, { 'x-role': 'dict_operator', 'x-operator': 'operator_user' }),
      /request failed 409/
    );
    await request(baseUrl, `./api/admin/terms/${encodeURIComponent(highRiskReleaseTerm.termId)}/approve`, 'POST', {}, { 'x-role': 'dict_admin', 'x-operator': 'gate_admin' });

    const gray = await request(baseUrl, './api/admin/gray-policies', 'POST', {
      releaseId: built.releaseId,
      scopeType: 'traffic_key_hash',
      percentage: 100
    });
    assert.strictEqual(gray.enabled, true);

    const canaryResult = await request(baseUrl, './api/simulate', 'POST', {
      text: 'please integrationalias consult',
      trafficKey: 'integration-canary',
      enablePinyinChannel: false,
      enablePinyinAutoReplace: false,
    });
    assert.strictEqual(canaryResult.route, 'canary');

    const pinyinProfiles = await request(baseUrl, './api/admin/pinyin-profiles?limit=10');
    assert.ok(Array.isArray(pinyinProfiles.items));

    await request(baseUrl, `./api/admin/gray-policies/${encodeURIComponent(gray.policyId)}/disable`, 'POST', {}, { 'x-role': 'dict_operator', 'x-operator': 'operator_user' });

    const releases = await request(baseUrl, './api/admin/releases');
    const builtRelease = (releases.items || []).find((item) => item.releaseId === built.releaseId);
    assert.ok(builtRelease);
    assert.strictEqual(builtRelease.approval.status, 'approved');
    assert.strictEqual(builtRelease.approval.approvedCount, 2);
    assert.ok((builtRelease.approval.approvedReviewers || []).includes('reviewer_user'));
    assert.ok((builtRelease.approval.approvedReviewers || []).includes('reviewer_user2'));

    const audits = await request(baseUrl, './api/admin/audits?limit=20');
    assert.ok(Array.isArray(audits.items));
    assert.ok(audits.items.length > 0);

    console.log('prototype integration test passed');
  } finally {
    await app.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
