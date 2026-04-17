const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const buildSnapshot = require('../../src/cli/build-snapshot');
const { createImportJob, confirmImportJob } = require('../../src/lib/import-jobs');
const { openDatabase, listImportJobs, createTerm, submitTermReview, submitReleaseReview, createValidationCase, createRelease, registerRuntimeNode, setRuntimeDesiredRelease, createRuntimeNodeRegistryItem } = require('../../src/lib/platform-db');
const { listImportTemplates, getImportTemplate, resolveImportTemplateAsset } = require('../../src/lib/import-templates');
const { getConsoleOverview, getConsoleWorkbench, getConsoleRuntimeRollout, listConsoleRuntimeNodes, getConsoleRuntimeNodeDetail, listConsoleTerms, listConsoleReleases, getConsoleReleaseDetail, getConsoleImportJobDetail, getConsoleTermDetail, listConsoleReviews, getConsoleReviewDetail, listConsoleRuntimeNodeRegistry, getConsoleRuntimeNodeRegistryDetail, listConsoleBusinessProperties, listConsoleImportJobs, listConsoleValidationCases } = require('../../src/lib/console-service');

/**
 * 功能：创建当前测试场景使用的配置对象。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createTestConfig() {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', 'workspace-unit-console-read');
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

test('import templates are discoverable with downloadable assets', { timeout: 120000 }, () => {
  const config = createAppConfig();
  const templates = listImportTemplates(config);
  assert.ok(templates.length >= 6);
  const structured = getImportTemplate(config, 'structured_terms_csv_v2');
  assert.ok(structured);
  assert.equal(structured.primary, true);
  assert.equal(structured.legacy, false);
  const templatePath = resolveImportTemplateAsset(config, structured.templateCode, 'template');
  const examplePath = resolveImportTemplateAsset(config, structured.templateCode, 'example');
  assert.ok(fs.existsSync(templatePath));
  assert.ok(fs.existsSync(examplePath));
  const businessProperties = listConsoleBusinessProperties(config);
  assert.ok(Array.isArray(businessProperties.items));
  assert.ok(businessProperties.items.length > 0);
  assert.ok(businessProperties.items.some((item) => item.value && item.label));
});

test('console services return basic overview and term/release lists', { timeout: 120000 }, () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const release = buildSnapshot.main('console read baseline build', config);
  const db = openDatabase(config);
  try {
    const pendingTerm = createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '控制台工作台词条',
      aliases: ['控制台工作台别名'],
      priority: 84,
      riskLevel: 'medium',
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
    }, 'unit_test');
    const pendingReviewTask = submitTermReview(db, pendingTerm.termId, 'unit_test', 'workbench pending review');
    createValidationCase(db, {
      caseId: 'console-workbench-case-001',
      description: '未关联样本',
      text: '这里出现一个还没有词条关联的业务样本。',
      expectedCanonicals: ['不存在的标准词'],
      sourceType: 'manual',
      notes: 'workbench test',
    }, 'unit_test');
    createImportJob(db, config, {
      templateCode: 'structured_terms_csv_v2',
      defaultCategoryCode: 'proper_noun',
      sourceType: 'import_csv',
      fileName: 'console_workbench_terms.csv',
      fileContent: [
        'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
        '控制台工作台导入词,控制台工作台导入别名,,80,medium,replace,0.9,candidate,,,import_csv,workbench test'
      ].join('\n'),
    }, 'unit_test');
    createRelease(db, {
      releaseId: 'console_read_blocked_release_001',
      version: 'v-console-read-blocked',
      status: 'built',
      summary: 'console read blocked release',
      artifactDir: path.join(config.resolvedPaths.releasesDir, 'console_read_blocked_release_001'),
      snapshotPath: path.join(config.resolvedPaths.releasesDir, 'console_read_blocked_release_001', 'snapshot.json'),
      manifestPath: path.join(config.resolvedPaths.releasesDir, 'console_read_blocked_release_001', 'manifest.json'),
      termCount: 1,
      termIds: [pendingTerm.termId],
    }, 'unit_test');
    createRelease(db, {
      releaseId: 'console_read_validation_only_blocked_001',
      version: 'v-console-read-validation-only',
      status: 'built',
      summary: 'console read validation only blocked release',
      artifactDir: path.join(config.resolvedPaths.releasesDir, 'console_read_validation_only_blocked_001'),
      snapshotPath: path.join(config.resolvedPaths.releasesDir, 'console_read_validation_only_blocked_001', 'snapshot.json'),
      manifestPath: path.join(config.resolvedPaths.releasesDir, 'console_read_validation_only_blocked_001', 'manifest.json'),
      termCount: 1,
      termIds: ['DEMO_008767'],
    }, 'unit_test');
    const releaseReviewTask = submitReleaseReview(db, 'console_read_blocked_release_001', 'publisher_user', 'console read release review');

    const overview = getConsoleOverview(db);
    assert.ok(overview.overview.totalTerms > 0);
    const workbench = getConsoleWorkbench(db, config);
    assert.ok(workbench.summary.pendingReviewCount >= 1);
    assert.ok(workbench.summary.pendingImportJobCount >= 1);
    assert.ok(workbench.summary.blockedReleaseCount >= 2);
    assert.ok(workbench.summary.attentionValidationCaseCount >= 1);
    assert.ok(Array.isArray(workbench.highlights));
    assert.equal(workbench.highlights[0].key, 'blocked_releases');
    assert.equal(workbench.highlights[0].href, '/console/releases');
    assert.ok(Array.isArray(workbench.reviews.items));
    assert.ok(Array.isArray(workbench.imports.items));
    assert.ok(workbench.imports.items.some((item) => item.title.startsWith('import_job_')));

    const importJob = listImportJobs(db, { limit: 1, offset: 0 }).items[0];
    assert.ok(importJob);
    const importDetail = getConsoleImportJobDetail(db, config, importJob.jobId);
    assert.equal(importDetail.template.templateCode, 'structured_terms_csv_v2');
    assert.equal(importDetail.template.legacy, false);
    assert.ok((importDetail.categoryCodes || []).includes('proper_noun'));
    assert.equal(importDetail.canConfirm, true);
    assert.ok(Array.isArray(workbench.blockedReleases.items));
    assert.ok(workbench.blockedReleases.items.some((item) => item.title === 'v-console-read-validation-only'));
    assert.ok(Array.isArray(workbench.attentionValidationCases.items));

    registerRuntimeNode(db, {
      nodeId: 'console-read-node-001',
      nodeName: 'Console Read Node 001',
      env: 'test',
      address: 'http://127.0.0.1:9911',
      currentVersion: release.version,
      runtimeVersion: '0.1.0',
    }, config);
    setRuntimeDesiredRelease(db, { releaseId: release.releaseId }, config, 'unit_test');
    const rollout = getConsoleRuntimeRollout(db, config, { releaseId: release.releaseId });
    assert.equal(rollout.selectedRelease.releaseId, release.releaseId);
    assert.ok(rollout.summary.totalNodes >= 1);
    assert.equal(rollout.guidance.status, 'success');
    assert.equal(rollout.guidance.href, '/console/runtime-nodes');
    assert.ok(Array.isArray(rollout.items));

    const releaseDetail = getConsoleReleaseDetail(db, config, release.releaseId);
    assert.equal(releaseDetail.releaseState.status, 'built');
    assert.equal(releaseDetail.releaseState.isCurrentPublished, false);
    assert.equal(releaseDetail.traffic.status, 'no_gray');
    assert.equal(releaseDetail.confirmation.summary.totalNodes, rollout.summary.totalNodes);
    assert.equal(releaseDetail.confirmation.summary.checkBlockerCount, 0);
    assert.ok(releaseDetail.confirmation.summary.validationCaseCount >= 1);
    assert.equal(releaseDetail.confirmation.issues.length, 0);
    assert.equal(releaseDetail.releaseCheck.blocked, false);
    assert.equal(Array.isArray(releaseDetail.rollbackHistory), true);
    if ((releaseDetail.validation.cases || []).length > 0) {
      assert.ok(releaseDetail.validation.cases[0].caseTypeLabel);
      assert.ok(Object.prototype.hasOwnProperty.call(releaseDetail.validation.cases[0], 'resultDetail'));
    }

    const blockedReleaseDetail = getConsoleReleaseDetail(db, config, 'console_read_blocked_release_001');
    assert.equal(blockedReleaseDetail.releaseState.status, 'built');
    assert.equal(blockedReleaseDetail.approval.status, 'pending');
    assert.ok(blockedReleaseDetail.reviewTask);
    assert.equal(blockedReleaseDetail.reviewTask.taskType, 'release_publish_review');
    assert.ok(blockedReleaseDetail.traffic);
    assert.equal(blockedReleaseDetail.releaseCheck.blocked, true);
    assert.ok((blockedReleaseDetail.releaseCheck.blockers || []).length > 0);
    const snapshotMissingBlocker = blockedReleaseDetail.releaseCheck.blockers.find((entry) => entry.code === 'release_snapshot_missing');
    assert.ok(snapshotMissingBlocker);
    assert.equal(snapshotMissingBlocker.title, '版本快照缺失');

    registerRuntimeNode(db, {
      nodeId: 'console-read-offline-node-001',
      nodeName: 'Console Read Offline Node 001',
      env: 'test',
      address: 'http://127.0.0.1:9921',
      currentVersion: '',
      runtimeVersion: '0.1.0',
    }, config);
    db.prepare(`
      UPDATE runtime_nodes
      SET last_heartbeat_at = ?, updated_at = ?
      WHERE node_id = ?
    `).run('2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z', 'console-read-offline-node-001');
    registerRuntimeNode(db, {
      nodeId: 'console-read-orphan-runtime-001',
      nodeName: 'Console Read Orphan Runtime 001',
      env: 'test',
      address: 'http://127.0.0.1:9922',
      currentVersion: '',
      runtimeVersion: '0.1.0',
      lastApplyStatus: '',
    }, config);
    const offlineWorkbench = getConsoleWorkbench(db, config);
    assert.ok(offlineWorkbench.summary.offlineRuntimeNodeCount >= 1);
    assert.ok(offlineWorkbench.offlineRuntimeNodes.items.some((entry) => entry.title === 'Console Read Offline Node 001'));

    const terms = listConsoleTerms(db, { page: 1, pageSize: 10 });
    assert.ok(terms.items.length > 0);
    assert.ok(terms.items[0].canonicalText);
    assert.ok(Number(terms.summary.totalCount || 0) >= Number(terms.total || 0));
    assert.ok(Number(terms.filteredSummary.totalCount || 0) >= Number(terms.total || 0));
    const termDetail = getConsoleTermDetail(db, pendingTerm.termId);
    assert.equal(termDetail.admissionSummary.level, 'ready');
    const reviewDetail = getConsoleReviewDetail(db, pendingReviewTask.taskId);
    assert.ok(reviewDetail.admissionSummary);
    const reviewList = listConsoleReviews(db, { page: 1, pageSize: 20 });
    assert.ok(reviewList.items.every((entry) => entry.targetType !== 'release'));
    assert.ok(Number(reviewList.summary.totalCount || 0) >= Number(reviewList.total || 0));
    const batchImportJob = createImportJob(db, config, {
      templateCode: 'structured_terms_csv_v2',
      sourceType: 'manual',
      fileName: 'console_read_batch.csv',
      fileContent: Buffer.from('categoryCode,canonicalText,aliases,priority,riskLevel,replaceMode,baseConfidence,sourceType,pinyinRuntimeMode\nproper_noun,控制台批次审核词,控制台批次审核别名,80,medium,replace,0.9,manual,candidate\n'),
      contentType: 'text/csv',
      comment: 'console read batch import',
    }, 'unit_test');
    confirmImportJob(db, config, batchImportJob.jobId, 'unit_test');
    const importReviewList = listConsoleReviews(db, {
      page: 1,
      pageSize: 20,
      taskType: 'term_review',
      targetType: 'term',
      importJobId: batchImportJob.jobId,
    });
    assert.equal(importReviewList.importJobContext.jobId, batchImportJob.jobId);
    assert.equal(importReviewList.importJobContext.found, true);
    assert.ok(importReviewList.items.length >= 1);
    assert.ok(importReviewList.items.every((entry) => entry.taskType === 'term_review'));
    assert.ok(Number(importReviewList.summary.totalCount || 0) >= Number(importReviewList.total || 0));
    const missingImportReviewList = listConsoleReviews(db, {
      page: 1,
      pageSize: 20,
      taskType: 'term_review',
      targetType: 'term',
      importJobId: 'missing_import_job_id',
    });
    assert.equal(missingImportReviewList.total, 0);
    assert.equal(missingImportReviewList.importJobContext.found, false);
    const releaseReviewDetail = getConsoleReviewDetail(db, releaseReviewTask.taskId);
    assert.equal(releaseReviewDetail.targetSummary.releaseState.status, 'built');
    assert.equal(releaseReviewDetail.targetSummary.approval.status, 'pending');
    assert.equal(releaseReviewDetail.targetSummary.traffic.status, 'no_gray');

    const releaseList = listConsoleReleases(db, { page: 1, pageSize: 10, view: 'review' });
    assert.ok(Number(releaseList.summary.totalCount || 0) >= Number(releaseList.total || 0));
    assert.ok(Number(releaseList.filteredSummary.totalCount || 0) >= Number(releaseList.total || 0));

    const importList = listConsoleImportJobs(db, { page: 1, pageSize: 10 });
    assert.ok(Number(importList.summary.totalCount || 0) >= Number(importList.total || 0));
    assert.ok(Number(importList.filteredSummary.totalCount || 0) >= Number(importList.total || 0));

    const validationList = listConsoleValidationCases(db, { page: 1, pageSize: 10 });
    assert.ok(Number(validationList.summary.totalCount || 0) >= Number(validationList.total || 0));
    assert.ok(Number(validationList.filteredSummary.totalCount || 0) >= Number(validationList.total || 0));

    createRuntimeNodeRegistryItem(db, {
      nodeId: 'console-registry-node-001',
      nodeName: 'Console Registry Node 001',
      env: 'test',
      address: 'http://127.0.0.1:9931',
      registrationSecret: 'console-registry-secret',
    }, 'unit_test');
    const registryList = listConsoleRuntimeNodeRegistry(db, { page: 1, pageSize: 20 }, config);
    assert.ok((registryList.items || []).some((entry) => entry.nodeId === 'console-registry-node-001'));
    assert.equal(registryList.orphanRuntimeCount, 3);
    assert.ok((registryList.orphanRuntimeEvents || []).some((entry) => entry.nodeId === 'console-read-orphan-runtime-001'));
    assert.ok((registryList.orphanRuntimeEvents || []).some((entry) => entry.nodeId === 'console-read-node-001'));
    assert.ok((registryList.orphanRuntimeEvents || []).some((entry) => entry.nodeId === 'console-read-offline-node-001'));
    const registryDetail = getConsoleRuntimeNodeRegistryDetail(db, 'console-registry-node-001', config);
    assert.ok(registryDetail);
    assert.equal(registryDetail.nodeId, 'console-registry-node-001');

    const runtimeNodes = listConsoleRuntimeNodes(db, config, { page: 1, pageSize: 20 });
    assert.equal(runtimeNodes.total, 1);
    assert.equal(runtimeNodes.orphanRuntimeCount, 3);
    assert.ok(runtimeNodes.items.every((entry) => entry.nodeId !== 'console-read-orphan-runtime-001'));
    assert.equal(runtimeNodes.items[0].nodeId, 'console-registry-node-001');
    assert.equal(runtimeNodes.items[0].registrationStatus, 'not_registered');
    assert.ok(runtimeNodes.items.every((entry) => entry.registry));
    assert.ok(runtimeNodes.items.every((entry) => entry.registration));
    assert.ok(runtimeNodes.items.every((entry) => entry.realtime));
    assert.ok(runtimeNodes.items.every((entry) => entry.target));
    assert.equal(getConsoleRuntimeNodeDetail(db, config, 'console-read-orphan-runtime-001'), null);

    const releases = listConsoleReleases(db, { page: 1, pageSize: 10 });
    assert.ok(Array.isArray(releases.items));
    assert.ok(releases.items.some((item) => item.releaseId === 'console_read_blocked_release_001' && item.releaseCheck.blocked));
    const publishedRelease = releases.items.find((entry) => entry.releaseId === release.releaseId);
    assert.equal(publishedRelease.releaseState.status, 'built');
    assert.equal(publishedRelease.releaseState.isCurrentPublished, false);
    assert.equal(publishedRelease.traffic.status, 'no_gray');
    assert.equal(publishedRelease.releaseCheck.blocked, false);
  } finally {
    db.close();
  }
});

test('console workbench review and validation sections keep full totals with five-row cap', { timeout: 120000 }, () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const baseline = getConsoleWorkbench(db, config);
    for (let index = 0; index < 7; index += 1) {
      const term = createTerm(db, {
        categoryCode: 'proper_noun',
        canonicalText: `工作台待审核词条-${index}`,
        aliases: [`工作台待审核别名-${index}`],
        priority: 70 + index,
        riskLevel: 'medium',
        sourceType: 'manual',
        pinyinRuntimeMode: 'candidate',
      }, 'unit_test');
      submitTermReview(db, term.termId, 'unit_test', `workbench pending review ${index}`);
      createValidationCase(db, {
        caseId: `console-workbench-unmatched-${index}`,
        description: `工作台未关联样本-${index}`,
        text: `这里是一条新的未关联业务样本 ${index}`,
        expectedCanonicals: [`不存在的标准词-${index}`],
        sourceType: 'manual',
        notes: `workbench validation ${index}`,
      }, 'unit_test');
    }

    const workbench = getConsoleWorkbench(db, config);
    assert.equal(workbench.summary.pendingReviewCount, baseline.summary.pendingReviewCount + 7);
    assert.equal(workbench.summary.attentionValidationCaseCount, baseline.summary.attentionValidationCaseCount + 7);
    assert.equal(workbench.reviews.items.length, 5);
    assert.equal(workbench.attentionValidationCases.items.length, 5);
    assert.ok(workbench.reviews.items.every((item) => item.href.startsWith('/console/dictionary/reviews/')));
    assert.ok(workbench.attentionValidationCases.items.every((item) => item.href.startsWith('/console/validation/cases/')));
    assert.ok(workbench.reviews.items.some((item) => item.title.includes('工作台待审核词条-')));
    assert.ok(workbench.attentionValidationCases.items.some((item) => item.title.startsWith('console-workbench-unmatched-')));
  } finally {
    db.close();
  }
});

test('console runtime rollout keeps attention nodes ordered without extra reshuffle', { timeout: 120000 }, () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const release = buildSnapshot.main('console rollout order build', config);
  const db = openDatabase(config);
  try {
    registerRuntimeNode(db, {
      nodeId: 'console-rollout-failed-node',
      nodeName: 'Console Rollout Failed Node',
      env: 'test',
      address: 'http://127.0.0.1:9931',
      currentVersion: 'v-old',
      runtimeVersion: '0.1.0',
      lastApplyStatus: 'failed',
    }, config);
    registerRuntimeNode(db, {
      nodeId: 'console-rollout-pending-node',
      nodeName: 'Console Rollout Pending Node',
      env: 'test',
      address: 'http://127.0.0.1:9932',
      currentVersion: 'v-old',
      runtimeVersion: '0.1.0',
      lastApplyStatus: 'success',
    }, config);
    registerRuntimeNode(db, {
      nodeId: 'console-rollout-offline-node',
      nodeName: 'Console Rollout Offline Node',
      env: 'test',
      address: 'http://127.0.0.1:9933',
      currentVersion: release.version,
      runtimeVersion: '0.1.0',
      lastApplyStatus: 'success',
    }, config);
    registerRuntimeNode(db, {
      nodeId: 'console-rollout-aligned-node',
      nodeName: 'Console Rollout Aligned Node',
      env: 'test',
      address: 'http://127.0.0.1:9934',
      currentVersion: release.version,
      runtimeVersion: '0.1.0',
      lastApplyStatus: 'success',
    }, config);

    setRuntimeDesiredRelease(db, { releaseId: release.releaseId }, config, 'unit_test');

    registerRuntimeNode(db, {
      nodeId: 'console-rollout-untouched-node',
      nodeName: 'Console Rollout Untouched Node',
      env: 'test',
      address: 'http://127.0.0.1:9935',
      currentVersion: '',
      runtimeVersion: '0.1.0',
      lastApplyStatus: '',
    }, config);

    db.prepare(`
      UPDATE runtime_nodes
      SET last_heartbeat_at = ?, updated_at = ?, last_apply_at = ?
      WHERE node_id = ?
    `).run('2000-01-01T00:00:00.000Z', '2026-04-03T08:00:00.000Z', '2026-04-03T08:00:00.000Z', 'console-rollout-offline-node');
    db.prepare(`
      UPDATE runtime_nodes
      SET updated_at = ?, last_apply_at = ?
      WHERE node_id = ?
    `).run('2026-04-03T10:00:00.000Z', '2026-04-03T10:00:00.000Z', 'console-rollout-failed-node');
    db.prepare(`
      UPDATE runtime_nodes
      SET updated_at = ?, last_apply_at = ?
      WHERE node_id = ?
    `).run('2026-04-03T09:00:00.000Z', '2026-04-03T09:00:00.000Z', 'console-rollout-pending-node');
    db.prepare(`
      UPDATE runtime_nodes
      SET updated_at = ?, last_apply_at = ?
      WHERE node_id = ?
    `).run('2026-04-03T07:00:00.000Z', '2026-04-03T07:00:00.000Z', 'console-rollout-aligned-node');
    db.prepare(`
      UPDATE runtime_nodes
      SET updated_at = ?
      WHERE node_id = ?
    `).run('2026-04-03T11:00:00.000Z', 'console-rollout-untouched-node');

    const rollout = getConsoleRuntimeRollout(db, config, { releaseId: release.releaseId });
    assert.deepEqual(
      rollout.items.slice(0, 5).map((item) => item.nodeId),
      [
        'console-rollout-untouched-node',
        'console-rollout-failed-node',
        'console-rollout-pending-node',
        'console-rollout-offline-node',
        'console-rollout-aligned-node',
      ],
    );
    assert.equal(rollout.items[0].targetsSelectedVersion, false);
    assert.equal(rollout.items[1].targetsSelectedVersion, true);
    assert.equal(rollout.items[3].status, 'offline');
    assert.equal(rollout.items[4].matchesTargetVersion, true);
  } finally {
    db.close();
  }
});

test('console term service supports sourceType riskLevel and sort filters', { timeout: 120000 }, () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '测试高风险词条甲',
      aliases: ['测试高风险别名甲'],
      priority: 95,
      riskLevel: 'high',
      sourceType: 'qa_feedback',
      pinyinRuntimeMode: 'candidate',
    }, 'unit_test');
    createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '测试高风险词条乙',
      aliases: ['测试高风险别名乙'],
      priority: 75,
      riskLevel: 'high',
      sourceType: 'qa_feedback',
      pinyinRuntimeMode: 'candidate',
    }, 'unit_test');

    const filtered = listConsoleTerms(db, {
      page: 1,
      pageSize: 10,
      sourceType: 'qa_feedback',
      riskLevel: 'high',
      sortBy: 'priority',
      sortDirection: 'desc',
    });

    assert.equal(filtered.total, 2);
    assert.equal(filtered.items[0].canonicalText, '测试高风险词条甲');
    assert.equal(filtered.items[1].canonicalText, '测试高风险词条乙');
    assert.ok(filtered.items.every((item) => item.sourceType === 'qa_feedback'));
    assert.ok(filtered.items.every((item) => item.riskLevel === 'high'));
  } finally {
    db.close();
  }
});

test('import job tables exist and empty list can be read on fresh db', { timeout: 120000 }, () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const jobs = listImportJobs(db, { limit: 10 });
    assert.deepEqual(jobs.items, []);
    assert.equal(jobs.total, 0);
  } finally {
    db.close();
  }
});
