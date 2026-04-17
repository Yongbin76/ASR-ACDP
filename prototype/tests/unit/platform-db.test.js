const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const {
  openDatabase,
  createTerm,
  updateTerm,
  updateTermStatus,
  submitTermReview,
  submitPinyinCandidateReview,
  batchApproveReviewTasks,
  batchRejectReviewTasks,
  approveReviewTask,
  recordRuntimeCorrection,
  recordRuntimePeak,
  getDashboardSummary,
  listAuditLogs,
} = require('../../src/lib/platform-db');

/**
 * 功能：创建当前测试场景使用的配置对象。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createTestConfig() {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', 'workspace-unit-platform-db');
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

test('platform-db term CRUD and review workflow works end to end', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const created = createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '平台数据库单测词',
      aliases: ['平台单测别名'],
      priority: 88,
      baseConfidence: 0.9,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      rules: {
        candidateOnly: true,
      },
    }, 'unit');
    assert.equal(created.canonicalText, '平台数据库单测词');
    assert.deepEqual(created.aliases, ['平台单测别名']);

    const updated = updateTerm(db, created.termId, {
      canonicalText: '平台数据库单测词更新',
      aliases: ['平台单测别名2'],
      rules: {
        candidateOnly: false,
        minTextLen: 2,
      },
    }, 'unit');
    assert.equal(updated.canonicalText, '平台数据库单测词更新');
    assert.deepEqual(updated.aliases, ['平台单测别名2']);
    assert.equal(updated.rules.minTextLen, 2);

    const pending = updateTermStatus(db, updated.termId, 'pending_review', 'unit', 'manual status');
    assert.equal(pending.status, 'pending_review');

    const task = submitTermReview(db, updated.termId, 'unit', 'submit');
    assert.equal(task.status, 'pending');
    const approved = approveReviewTask(db, task.taskId, 'reviewer_unit');
    assert.equal(approved.status, 'approved');

    let resubmitWithoutChangesError = null;
    try {
      submitTermReview(db, updated.termId, 'unit', 'submit again');
    } catch (error) {
      resubmitWithoutChangesError = error;
    }
    assert.ok(resubmitWithoutChangesError);
    assert.equal(resubmitWithoutChangesError.code, 'term_review_already_satisfied');

    const revised = updateTerm(db, updated.termId, {
      aliases: ['平台单测别名3'],
    }, 'unit');
    const resubmitted = submitTermReview(db, revised.termId, 'unit', 'submit after revision');
    assert.equal(resubmitted.status, 'pending');

    const audits = listAuditLogs(db, { targetType: 'term', targetId: updated.termId, limit: 20 });
    assert.ok(audits.length >= 3);
  } finally {
    db.close();
  }
});

test('platform-db dashboard summary aggregates runtime stats', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    recordRuntimeCorrection(db, {
      channel: 'http',
      result: {
        matches: [{ canonical: '祁顺路' }],
        candidates: [],
        blocked: [],
      },
    });
    recordRuntimeCorrection(db, {
      channel: 'ws',
      result: {
        matches: [{ canonical: '工伤认定' }],
        candidates: [{ canonical: '上海市发展和改革委员会' }],
        blocked: [],
      },
    });
    recordRuntimePeak(db, 12);

    const summary = getDashboardSummary(db);
    assert.ok(summary.dictionary.totalSeedTerms > 0);
    assert.ok(Array.isArray(summary.dictionary.byCategory));
    assert.ok(Array.isArray(summary.runtime.hourly));
    assert.ok(summary.runtime.hourly[summary.runtime.hourly.length - 1].requestCount >= 2);
    assert.ok(summary.runtime.topHitTerms.length >= 1);
    assert.equal(summary.runtime.peak.peakConcurrency, 12);
  } finally {
    db.close();
  }
});

test('platform-db batch review approval and rejection support selected tasks and import jobs', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO import_jobs(
        job_id, job_type, source_type, template_code, template_version, status,
        summary, submitted_by, confirmed_by, created_at, confirmed_at, finished_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'platform_db_batch_job_001',
      'structured_terms',
      'manual',
      'structured_terms_csv_v2',
      'v2',
      'imported',
      'platform db batch review',
      'unit_test',
      'unit_test',
      now,
      now,
      now,
    );

    const termA = createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '平台批量审核词A',
      aliases: ['平台批量审核别名A'],
      priority: 70,
      baseConfidence: 0.9,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      sourceType: 'manual',
    }, 'unit');
    const termB = createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '平台批量审核词B',
      aliases: ['平台批量审核别名B'],
      priority: 71,
      baseConfidence: 0.9,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      sourceType: 'manual',
    }, 'unit');
    const termC = createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '平台批量审核词C',
      aliases: ['平台批量审核别名C'],
      priority: 72,
      baseConfidence: 0.9,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      sourceType: 'manual',
    }, 'unit');

    for (const [termId, rowNo] of [[termA.termId, 1], [termB.termId, 2], [termC.termId, 3]]) {
      db.prepare(`
        INSERT INTO term_sources(
          term_id, source_type, import_job_id, source_file_name, source_row_no, source_ref, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(termId, 'manual', 'platform_db_batch_job_001', 'batch.csv', rowNo, `structured_terms_csv_v2:${rowNo}`, now, now);
    }

    const taskA = submitTermReview(db, termA.termId, 'unit', 'batch selected approve');
    const taskB = submitTermReview(db, termB.termId, 'unit', 'batch import reject');
    const taskC = submitTermReview(db, termC.termId, 'unit', 'batch import reject');
    approveReviewTask(db, taskC.taskId, 'reviewer_existing');

    const approveResult = batchApproveReviewTasks(db, {
      scope: 'selected_tasks',
      taskIds: [taskA.taskId, 'missing_task_id'],
    }, 'reviewer_batch');
    assert.equal(approveResult.totalRequested, 2);
    assert.equal(approveResult.approvedCount, 1);
    assert.equal(approveResult.skippedNotFoundCount, 1);
    assert.ok(approveResult.items.some((item) => item.taskId === taskA.taskId && item.status === 'approved'));

    const rejectResult = batchRejectReviewTasks(db, {
      scope: 'import_job',
      importJobId: 'platform_db_batch_job_001',
      comment: '批量驳回说明',
    }, 'reviewer_batch_reject');
    assert.equal(rejectResult.totalRequested, 1);
    assert.equal(rejectResult.rejectedCount, 1);
    assert.equal(rejectResult.skippedNonPendingCount, 0);
    assert.ok(rejectResult.items.some((item) => item.taskId === taskB.taskId && item.status === 'rejected'));

    const termAAfter = db.prepare('SELECT status FROM terms WHERE term_id = ?').get(termA.termId);
    const termBAfter = db.prepare('SELECT status FROM terms WHERE term_id = ?').get(termB.termId);
    assert.equal(termAAfter.status, 'approved');
    assert.equal(termBAfter.status, 'draft');
  } finally {
    db.close();
  }
});

test('platform-db import-job batch approve processes all pending review tasks beyond 500 limit', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO import_jobs(
        job_id, job_type, source_type, template_code, template_version, status,
        summary, submitted_by, confirmed_by, created_at, confirmed_at, finished_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'platform_db_batch_job_500_plus',
      'term_import',
      'manual',
      'structured_terms_csv_v2',
      'v2',
      'imported',
      'batch approve 500+',
      'unit',
      'unit',
      now,
      now,
      now,
    );

    for (let index = 0; index < 520; index += 1) {
      const term = createTerm(db, {
        categoryCode: 'proper_noun',
        canonicalText: `平台批量审核500词_${index}`,
        aliases: [`平台批量审核500别名_${index}`],
        priority: 70,
        baseConfidence: 0.9,
        replaceMode: 'replace',
        pinyinRuntimeMode: 'candidate',
        sourceType: 'manual',
      }, 'unit');
      db.prepare(`
        INSERT INTO term_sources(
          term_id, source_type, import_job_id, source_file_name, source_row_no, source_ref, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(term.termId, 'manual', 'platform_db_batch_job_500_plus', 'batch_500.csv', index + 1, `structured_terms_csv_v2:${index + 1}`, now, now);
      submitTermReview(db, term.termId, 'unit', 'batch approve 500+');
    }

    const approveResult = batchApproveReviewTasks(db, {
      scope: 'import_job',
      importJobId: 'platform_db_batch_job_500_plus',
    }, 'reviewer_batch_500');

    assert.equal(approveResult.totalRequested, 520);
    assert.equal(approveResult.approvedCount, 520);
    assert.equal(approveResult.skippedNonPendingCount, 0);
    assert.equal(approveResult.skippedNotFoundCount, 0);
  } finally {
    db.close();
  }
});

test('platform-db batch approve supports current_filter scope for term reviews', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const termA = createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '平台筛选审核词A',
      aliases: ['平台筛选审核别名A'],
      priority: 70,
      baseConfidence: 0.9,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      sourceType: 'manual',
    }, 'unit');
    const termB = createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '平台筛选审核词B',
      aliases: ['平台筛选审核别名B'],
      priority: 71,
      baseConfidence: 0.9,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      sourceType: 'manual',
    }, 'unit');
    const taskA = submitTermReview(db, termA.termId, 'unit', 'filter approve A');
    const taskB = submitTermReview(db, termB.termId, 'unit', 'filter approve B');

    const approveResult = batchApproveReviewTasks(db, {
      scope: 'current_filter',
      filters: {
        status: 'pending',
        taskType: 'term_review',
        targetType: 'term',
      },
    }, 'reviewer_filter');

    assert.equal(approveResult.scope, 'current_filter');
    assert.equal(approveResult.totalRequested, 2);
    assert.equal(approveResult.approvedCount, 2);
    assert.ok(approveResult.items.some((item) => item.taskId === taskA.taskId && item.status === 'approved'));
    assert.ok(approveResult.items.some((item) => item.taskId === taskB.taskId && item.status === 'approved'));
  } finally {
    db.close();
  }
});

test('platform-db blocks resubmitting approved pinyin candidate review', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const term = createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '单于',
      aliases: ['单于别名'],
      priority: 80,
      baseConfidence: 0.9,
      replaceMode: 'replace',
      pinyinRuntimeMode: 'candidate',
      sourceType: 'manual',
    }, 'unit');
    const first = submitPinyinCandidateReview(db, term.termId, {
      fullPinyinNoTone: 'dan yu',
    }, 'unit');
    assert.equal(first.status, 'pending');
    approveReviewTask(db, first.taskId, 'reviewer_unit');

    let repeatedError = null;
    try {
      submitPinyinCandidateReview(db, term.termId, {
        fullPinyinNoTone: 'dan yu',
      }, 'unit');
    } catch (error) {
      repeatedError = error;
    }
    assert.ok(repeatedError);
    assert.equal(repeatedError.code, 'pinyin_candidate_review_already_satisfied');
  } finally {
    db.close();
  }
});
