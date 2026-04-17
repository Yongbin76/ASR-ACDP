const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const { openDatabase, createTerm } = require('../../src/lib/platform-db');
const { evaluateTermAdmission, summarizeTermAdmission } = require('../../src/lib/term-admission');

function createTestConfig() {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', 'workspace-unit-term-admission');
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

test('term admission applies single-character canonical exception rules and phrase blocking', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const blockedWithSingleAlias = evaluateTermAdmission(db, {
      categoryCode: 'proper_noun',
      canonicalText: '王',
      aliases: ['汪'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(blockedWithSingleAlias.level, 'blocked');
    assert.ok(blockedWithSingleAlias.issues.some((entry) => entry.code === 'single_character_blocked'));

    const blockedWithMixedAliases = evaluateTermAdmission(db, {
      categoryCode: 'proper_noun',
      canonicalText: '王',
      aliases: ['汪', '忘了'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(blockedWithMixedAliases.level, 'blocked');
    assert.ok(blockedWithMixedAliases.issues.some((entry) => entry.code === 'single_character_blocked'));

    const blockedWithoutAliases = evaluateTermAdmission(db, {
      categoryCode: 'proper_noun',
      canonicalText: '李',
      aliases: [],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(blockedWithoutAliases.level, 'blocked');
    assert.ok(blockedWithoutAliases.issues.some((entry) => entry.code === 'single_character_blocked'));

    const allowedSingleCanonical = evaluateTermAdmission(db, {
      categoryCode: 'proper_noun',
      canonicalText: '李',
      aliases: ['李某'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(allowedSingleCanonical.level, 'ready');

    const allowedCompoundCanonical = evaluateTermAdmission(db, {
      categoryCode: 'proper_noun',
      canonicalText: '欧阳',
      aliases: ['欧洋'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(allowedCompoundCanonical.level, 'ready');

    const phrase = evaluateTermAdmission(db, {
      categoryCode: 'gov_term',
      canonicalText: '办理材料',
      aliases: [],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(phrase.level, 'blocked');
    assert.ok(phrase.issues.some((entry) => entry.code === 'dictionary_phrase_blocked'));
  } finally {
    db.close();
  }
});

test('term admission blocks canonical hitting existing alias with trace', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    createTerm(db, {
      categoryCode: 'gov_term',
      canonicalText: '工伤认定',
      aliases: ['工商认定'],
      priority: 90,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.95,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
    }, 'unit');

    const result = evaluateTermAdmission(db, {
      categoryCode: 'gov_term',
      canonicalText: '工商认定',
      aliases: [],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    const summary = summarizeTermAdmission(result);
    assert.equal(summary.level, 'blocked');
    const conflict = summary.issues.find((entry) => entry.code === 'alias_conflict');
    assert.ok(conflict);
    assert.equal(conflict.trace.canonicalText, '工伤认定');
    assert.equal(conflict.trace.aliasText, '工商认定');
  } finally {
    db.close();
  }
});

test('term admission applies category shape and pinyin validation rules', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    const roadBlocked = evaluateTermAdmission(db, {
      categoryCode: 'poi_road',
      canonicalText: '上海市发展和改革委员会',
      aliases: [],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(roadBlocked.level, 'blocked');
    assert.ok(roadBlocked.issues.some((entry) => entry.code === 'poi_road_shape_blocked'));

    const govWarning = evaluateTermAdmission(db, {
      categoryCode: 'gov_term',
      canonicalText: '发展改革',
      aliases: [],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(govWarning.level, 'warning');
    assert.ok(govWarning.issues.some((entry) => entry.code === 'gov_term_shape_warning'));

    const pinyinBlocked = evaluateTermAdmission(db, {
      categoryCode: 'proper_noun',
      canonicalText: '工伤认定',
      aliases: [],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {
        customFullPinyinNoTone: 'gong1 shang',
        alternativeReadings: ['gong shang', 'gong shang'],
      },
    });
    assert.equal(pinyinBlocked.level, 'blocked');
    assert.ok(pinyinBlocked.issues.some((entry) => entry.code === 'invalid_custom_pinyin'));
    assert.ok(pinyinBlocked.issues.some((entry) => entry.code === 'duplicate_alternative_reading'));
  } finally {
    db.close();
  }
});
