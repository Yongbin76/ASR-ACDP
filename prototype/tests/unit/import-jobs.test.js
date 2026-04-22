const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const {
  openDatabase,
  getTerm,
  getImportJob,
  listImportJobRows,
  getImportJobResult,
} = require('../../src/lib/platform-db');
const { createImportJob, confirmImportJob, cancelImportJob } = require('../../src/lib/import-jobs');
const { getConsoleTermDetail } = require('../../src/lib/console-service');

/**
 * 功能：创建当前测试场景使用的配置对象。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createTestConfig() {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', 'workspace-unit-import-jobs');
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

test('createImportJob parses structured term CSV into preview rows and confirm imports terms', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const created = createImportJob(db, config, {
      templateCode: 'structured_terms_csv_v2',
      defaultCategoryCode: 'proper_noun',
      sourceType: 'import_csv',
      fileName: 'structured_terms_v2.csv',
      fileContent: [
        'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
        '控制台导入词,控制台别名A|控制台别名B,,85,medium,replace,0.91,replace,kong zhi tai dao ru ci,,import_csv,示例'
      ].join('\n'),
    }, 'unit');

    assert.equal(created.status, 'preview_ready');
    assert.ok(created.previewSummary.readyRows >= 1);
    assert.ok(created.previewSummary.recommendationSummary.saveReplaceCount >= 1);

    const job = getImportJob(db, created.jobId);
    assert.ok(job);
    const rows = listImportJobRows(db, created.jobId, { limit: 20 });
    assert.equal(rows.items.length, 1);
    assert.equal(rows.items[0].status, 'ready');
    assert.equal(rows.items[0].recommendedAction, 'save_replace');

    const confirmed = confirmImportJob(db, config, created.jobId, 'unit');
    assert.equal(confirmed.status, 'imported');
    assert.ok(confirmed.resultSummary.newTermCount >= 1);

    const term = db.prepare('SELECT term_id FROM terms WHERE category_code = ? AND canonical_text = ?').get('proper_noun', '控制台导入词');
    assert.ok(term);
    const detail = getConsoleTermDetail(db, term.term_id);
    assert.equal(detail.sourceSummary.importJobId, created.jobId);
    assert.ok(detail.aliases.some((item) => item.aliasText === '控制台别名A'));
    assert.equal(detail.basic.categoryCode, 'proper_noun');
    assert.equal(detail.pinyinProfile.runtimeMode, 'replace');
    assert.equal(detail.pinyinProfile.customFullPinyinNoTone, 'kong zhi tai dao ru ci');

    const result = getImportJobResult(db, created.jobId);
    assert.ok(result);
  } finally {
    db.close();
  }
});

test('createImportJob imports validation case rows into validation_cases on confirm', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const created = createImportJob(db, config, {
      templateCode: 'validation_cases_csv_v1',
      sourceType: 'validation_import',
      fileName: 'validation_cases.csv',
      fileContent: [
        'caseId,description,text,expectedCanonicals,sourceType,notes',
        'console-case-001,控制台样本,我想了解工商认定的办理材料。,工伤认定,qa_feedback,示例'
      ].join('\n'),
    }, 'unit');
    const confirmed = confirmImportJob(db, config, created.jobId, 'unit');
    assert.equal(confirmed.status, 'imported');
    const validationCase = db.prepare('SELECT case_id FROM validation_cases WHERE case_id = ?').get('console-case-001');
    assert.ok(validationCase);
  } finally {
    db.close();
  }
});

test('createImportJob marks existing structured terms as warning and validates extension', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const warningJob = createImportJob(db, config, {
      templateCode: 'structured_terms_csv_v1',
      sourceType: 'import_csv',
      fileName: 'existing_terms.csv',
      fileContent: [
        'categoryCode,canonicalText,aliases,priority,riskLevel,replaceMode,baseConfidence,sourceType,pinyinRuntimeMode,remark',
        'gov_term,工伤认定,工商认定,92,medium,replace,0.94,import_csv,candidate,示例'
      ].join('\n'),
    }, 'unit');
    assert.equal(warningJob.previewSummary.warningRows, 1);
    assert.equal(warningJob.previewSummary.recommendationSummary.mergeExistingCount, 1);

    assert.throws(() => createImportJob(db, config, {
      templateCode: 'structured_terms_csv_v1',
      sourceType: 'import_csv',
      fileName: 'invalid_terms.txt',
      fileContent: 'x',
    }, 'unit'), /invalid file extension/);
  } finally {
    db.close();
  }
});

test('createImportJob blocks confirm when preview has no importable rows', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const blockedJob = createImportJob(db, config, {
      templateCode: 'structured_terms_csv_v2',
      sourceType: 'import_csv',
      fileName: 'blocked_terms.csv',
      fileContent: [
        'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
        '办理材料,,gov_term,80,medium,replace,0.9,candidate,,,import_csv,blocked sample'
      ].join('\n'),
    }, 'unit');
    assert.equal(blockedJob.previewSummary.errorRows, 1);
    assert.equal(blockedJob.previewSummary.recommendationSummary.skipBlockedCount, 1);
    const rows = listImportJobRows(db, blockedJob.jobId, { limit: 20 });
    assert.equal(rows.items[0].status, 'error');
    assert.ok(Array.isArray(rows.items[0].issues));
    assert.ok(rows.items[0].issues.some((entry) => entry.code === 'dictionary_phrase_blocked'));
    assert.throws(() => confirmImportJob(db, config, blockedJob.jobId, 'unit'), /没有可导入记录/);
  } finally {
    db.close();
  }
});

test('confirmImportJob imports ready and warning rows while skipping blocked rows', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const mixedJob = createImportJob(db, config, {
      templateCode: 'structured_terms_csv_v2',
      sourceType: 'import_csv',
      fileName: 'mixed_terms.csv',
      fileContent: [
        'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
        '可导入词,可导入别名,proper_noun,80,medium,replace,0.9,candidate,,,import_csv,ready sample',
        '办理材料,,gov_term,80,medium,replace,0.9,candidate,,,import_csv,blocked sample'
      ].join('\n'),
    }, 'unit');

    assert.equal(mixedJob.previewSummary.totalRows, 2);
    assert.equal(mixedJob.previewSummary.readyRows, 1);
    assert.equal(mixedJob.previewSummary.errorRows, 1);

    const confirmed = confirmImportJob(db, config, mixedJob.jobId, 'unit');
    assert.equal(confirmed.status, 'imported');
    assert.equal(confirmed.resultSummary.importedReadyCount, 1);
    assert.equal(confirmed.resultSummary.importedWarningCount, 0);
    assert.equal(confirmed.resultSummary.skippedBlockedCount, 1);
    assert.equal(confirmed.resultSummary.errorCount, 0);

    const rows = listImportJobRows(db, mixedJob.jobId, { limit: 20 });
    assert.equal(rows.items[0].status, 'imported');
    assert.equal(rows.items[0].decision, 'accept');
    assert.equal(rows.items[1].status, 'error');
    assert.equal(rows.items[1].decision, 'skipped_blocked');

    const result = getImportJobResult(db, mixedJob.jobId);
    assert.equal(result.importedReadyCount, 1);
    assert.equal(result.importedWarningCount, 0);
    assert.equal(result.skippedBlockedCount, 1);
  } finally {
    db.close();
  }
});

test('confirmImportJob persists candidate imports and recommendation metadata', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const seedJob = createImportJob(db, config, {
      templateCode: 'structured_terms_csv_v2',
      sourceType: 'import_csv',
      fileName: 'candidate-seed.csv',
      fileContent: [
        'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
        '岐测试顺路,旗测试顺路,poi_road,80,medium,replace,0.9,candidate,,,import_csv,seed-a',
        '齐测试顺路,旗测试顺路,poi_road,80,medium,replace,0.9,candidate,,,import_csv,seed-b'
      ].join('\n'),
    }, 'unit');
    confirmImportJob(db, config, seedJob.jobId, 'unit');

    const candidateJob = createImportJob(db, config, {
      templateCode: 'structured_terms_csv_v2',
      sourceType: 'import_csv',
      fileName: 'candidate-job.csv',
      fileContent: [
        'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
        '祁测试顺路,旗测试顺路,poi_road,80,medium,candidate,0.9,replace,,,import_csv,candidate-row'
      ].join('\n'),
    }, 'unit');
    assert.equal(candidateJob.previewSummary.warningRows, 1);
    assert.equal(candidateJob.previewSummary.recommendationSummary.saveCandidateCount, 1);

    const previewRows = listImportJobRows(db, candidateJob.jobId, { recommendedAction: 'save_candidate', limit: 20 });
    assert.equal(previewRows.items.length, 1);
    assert.equal(previewRows.items[0].runtimeSuitability, 'candidate');

    const confirmed = confirmImportJob(db, config, candidateJob.jobId, 'unit');
    assert.equal(confirmed.resultSummary.candidateImportedCount, 1);

    const result = getImportJobResult(db, candidateJob.jobId);
    assert.equal(result.candidateImportedCount, 1);
    assert.equal(result.replaceImportedCount, 0);

    const term = db.prepare('SELECT term_id FROM terms WHERE category_code = ? AND canonical_text = ?').get('poi_road', '祁测试顺路');
    assert.ok(term);
    const detail = getConsoleTermDetail(db, term.term_id);
    assert.equal(detail.basic.replaceMode, 'candidate');
    assert.equal(detail.rules.candidateOnly, true);
  } finally {
    db.close();
  }
});

test('cancelImportJob only allows cancellable statuses', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const created = createImportJob(db, config, {
      templateCode: 'structured_terms_csv_v2',
      sourceType: 'import_csv',
      fileName: 'cancel_terms.csv',
      fileContent: [
        'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
        '取消测试词,取消测试别名,proper_noun,80,medium,replace,0.9,candidate,,,import_csv,示例'
      ].join('\n'),
    }, 'unit');

    const cancelled = cancelImportJob(db, created.jobId, 'unit', 'cancel preview');
    assert.equal(cancelled.status, 'cancelled');

    const importedJob = createImportJob(db, config, {
      templateCode: 'structured_terms_csv_v2',
      sourceType: 'import_csv',
      fileName: 'imported_terms.csv',
      fileContent: [
        'canonicalText,aliases,categoryCode,priority,riskLevel,replaceMode,baseConfidence,pinyinRuntimeMode,customFullPinyinNoTone,alternativeReadings,sourceType,remark',
        '不可取消测试词,不可取消测试别名,proper_noun,80,medium,replace,0.9,candidate,,,import_csv,示例'
      ].join('\n'),
    }, 'unit');
    confirmImportJob(db, config, importedJob.jobId, 'unit');

    let invalidCancelError = null;
    try {
      cancelImportJob(db, importedJob.jobId, 'unit', 'cancel imported');
    } catch (error) {
      invalidCancelError = error;
    }
    assert.ok(invalidCancelError);
    assert.equal(invalidCancelError.code, 'import_job_status_invalid');
  } finally {
    db.close();
  }
});

test('createImportJob keeps legacy road and government templates compatible', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const roadJob = createImportJob(db, config, {
      templateCode: 'raw_roads_text_v1',
      sourceType: 'raw_roads',
      fileName: 'roads.txt',
      fileContent: [
        '祁顺路',
        '人民大道',
      ].join('\n'),
    }, 'unit');
    assert.equal(roadJob.previewSummary.totalRows, 2);
    assert.equal(roadJob.previewSummary.readyRows + roadJob.previewSummary.warningRows, 2);

    const governmentJob = createImportJob(db, config, {
      templateCode: 'gov_departments_csv_v1',
      sourceType: 'raw_government',
      fileName: 'government.csv',
      fileContent: [
        'standardName,shortName,district,address,level,category,remark',
        '上海市发展和改革委员会,市发改委,上海市,人民大道200号,市级,政府部门,示例'
      ].join('\n'),
    }, 'unit');
    assert.equal(governmentJob.previewSummary.totalRows, 1);
    assert.equal(governmentJob.previewSummary.readyRows + governmentJob.previewSummary.warningRows, 1);
  } finally {
    db.close();
  }
});
