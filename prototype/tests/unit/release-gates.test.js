const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const {
  openDatabase,
  listTerms,
  createRelease,
  createTerm,
  submitTermReview,
  approveReviewTask,
  createValidationCase,
} = require('../../src/lib/platform-db');
const { buildReleaseGateSummary, buildReleaseGateSummaryMap } = require('../../src/lib/release-gates');
const { buildSnapshot, writeSnapshot } = require('../../src/lib/snapshot-builder');

/**
 * 功能：创建当前测试场景使用的配置对象。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function createTestConfig() {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', 'workspace-unit-release-gates');
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

test('buildReleaseGateSummary reports missing snapshot blocker', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const term = listTerms(db, { limit: 1 }).items[0];
    const release = createRelease(db, {
      releaseId: 'rel_unit_gate_missing',
      version: 'v-unit',
      status: 'built',
      summary: 'unit gate',
      artifactDir: path.join(config.resolvedPaths.releasesDir, 'rel_unit_gate_missing'),
      snapshotPath: path.join(config.resolvedPaths.releasesDir, 'rel_unit_gate_missing', 'snapshot.json'),
      manifestPath: path.join(config.resolvedPaths.releasesDir, 'rel_unit_gate_missing', 'manifest.json'),
      termCount: 1,
      termIds: [term.termId],
    }, 'unit');
    const gate = buildReleaseGateSummary(db, release.releaseId);
    assert.equal(gate.blocked, true);
    assert.ok(gate.blockers.some((item) => item.code === 'release_snapshot_missing'));
  } finally {
    db.close();
  }
});

test('buildReleaseGateSummary does not block canonical-only terms without noncanonical smoke samples', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const term = listTerms(db, { limit: 1000 }).items.find((item) => (item.aliases || []).length === 0);
    assert.ok(term);
    const releaseDir = path.join(config.resolvedPaths.releasesDir, 'rel_unit_gate_canonical_only');
    const snapshot = buildSnapshot([term]);
    const artifact = writeSnapshot(releaseDir, snapshot);
    const release = createRelease(db, {
      releaseId: 'rel_unit_gate_canonical_only',
      version: 'v-unit-canonical-only',
      status: 'built',
      summary: 'unit gate canonical only',
      artifactDir: releaseDir,
      snapshotPath: artifact.snapshotPath,
      manifestPath: artifact.manifestPath,
      termCount: 1,
      termIds: [term.termId],
    }, 'unit');
    const gate = buildReleaseGateSummary(db, release.releaseId);
    assert.equal(gate.blocked, false);
    assert.equal(gate.validation.failedCount, 0);
    assert.equal(gate.validation.skippedSmokeCaseCount, 1);
    assert.equal(gate.validation.cases[0].validationMode, 'not_applicable');
    assert.equal(gate.validation.cases[0].reason, 'no_noncanonical_smoke_sample_available');
  } finally {
    db.close();
  }
});

test('buildReleaseGateSummaryMap only validates current release snapshot and ignores later master-data drift', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const stableTerm = listTerms(db, { limit: 1000 }).items.find((item) => (item.aliases || []).length === 0);
    assert.ok(stableTerm);
    const missingRelease = createRelease(db, {
      releaseId: 'rel_unit_gate_batch_missing',
      version: 'v-unit-batch-missing',
      status: 'built',
      summary: 'unit gate batch missing',
      artifactDir: path.join(config.resolvedPaths.releasesDir, 'rel_unit_gate_batch_missing'),
      snapshotPath: path.join(config.resolvedPaths.releasesDir, 'rel_unit_gate_batch_missing', 'snapshot.json'),
      manifestPath: path.join(config.resolvedPaths.releasesDir, 'rel_unit_gate_batch_missing', 'manifest.json'),
      termCount: 1,
      termIds: [stableTerm.termId],
    }, 'unit');

    const pendingTerm = createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '批量门禁待审词',
      aliases: ['批量门禁待审别名'],
      priority: 88,
      riskLevel: 'medium',
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
    }, 'unit_test');
    submitTermReview(db, pendingTerm.termId, 'unit_test', 'batch gate pending review');
    const pendingReleaseDir = path.join(config.resolvedPaths.releasesDir, 'rel_unit_gate_batch_pending');
    const pendingSnapshot = buildSnapshot([pendingTerm]);
    const pendingArtifact = writeSnapshot(pendingReleaseDir, pendingSnapshot);
    const pendingRelease = createRelease(db, {
      releaseId: 'rel_unit_gate_batch_pending',
      version: 'v-unit-batch-pending',
      status: 'built',
      summary: 'unit gate batch pending',
      artifactDir: pendingReleaseDir,
      snapshotPath: pendingArtifact.snapshotPath,
      manifestPath: pendingArtifact.manifestPath,
      termCount: 1,
      termIds: [pendingTerm.termId],
    }, 'unit');

    const summaryMap = buildReleaseGateSummaryMap(db, [
      missingRelease.releaseId,
      pendingRelease.releaseId,
    ], {
      releases: [missingRelease, pendingRelease],
    });

    const missingGate = summaryMap.get(missingRelease.releaseId);
    assert.equal(missingGate.blocked, true);
    assert.ok(missingGate.blockers.some((item) => item.code === 'release_snapshot_missing'));

    const pendingGate = summaryMap.get(pendingRelease.releaseId);
    assert.equal(pendingGate.blocked, false);
    assert.equal((pendingGate.blockers || []).length, 0);
  } finally {
    db.close();
  }
});

test('buildReleaseGateSummary reads all enabled validation cases beyond the old 500-row cap', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const term = createTerm(db, {
      categoryCode: 'proper_noun',
      canonicalText: '批量验证样本收口词',
      aliases: ['批量验证样本收口别名'],
      priority: 92,
      riskLevel: 'medium',
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
    }, 'unit_test');
    const reviewTask = submitTermReview(db, term.termId, 'unit_test', 'approve term for validation gate');
    approveReviewTask(db, reviewTask.taskId, 'reviewer_unit');
    const releaseDir = path.join(config.resolvedPaths.releasesDir, 'rel_unit_gate_many_cases');
    const snapshot = buildSnapshot([term]);
    const artifact = writeSnapshot(releaseDir, snapshot);
    const release = createRelease(db, {
      releaseId: 'rel_unit_gate_many_cases',
      version: 'v-unit-many-cases',
      status: 'built',
      summary: 'unit gate many validation cases',
      artifactDir: releaseDir,
      snapshotPath: artifact.snapshotPath,
      manifestPath: artifact.manifestPath,
      termCount: 1,
      termIds: [term.termId],
    }, 'unit_test');

    for (let index = 0; index < 510; index += 1) {
      createValidationCase(db, {
        caseId: `rel-unit-many-case-${String(index + 1).padStart(3, '0')}`,
        description: `many validation case ${index + 1}`,
        text: `批量验证样本收口别名 第 ${index + 1} 条`,
        expectedCanonicals: ['批量验证样本收口词'],
        sourceType: 'manual',
        notes: 'release gate many cases',
      }, 'unit_test');
    }

    const gate = buildReleaseGateSummary(db, release.releaseId, {
      disableCache: true,
    });
    assert.equal(gate.blocked, false);
    assert.equal(gate.validation.smokeCaseCount, 1);
    assert.equal(gate.validation.businessCaseCount, 510);
    assert.equal(gate.validation.caseCount, 511);
    assert.ok(gate.validation.cases.some((item) => item.caseId === 'rel-unit-many-case-510'));
  } finally {
    db.close();
  }
});
