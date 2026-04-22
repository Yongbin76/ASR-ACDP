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
      canonicalText: '唯一工伤认定',
      aliases: ['唯一工商认定'],
      priority: 90,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.95,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
    }, 'unit');

    const result = evaluateTermAdmission(db, {
      categoryCode: 'gov_term',
      canonicalText: '唯一工商认定',
      aliases: ['唯一工商认丁'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    const summary = summarizeTermAdmission(result);
    assert.equal(summary.level, 'ready');
    assert.equal(summary.recommendedAction, 'append_alias_to_existing');
    assert.equal(summary.targetCanonicalText, '唯一工伤认定');
    const conflict = summary.issues.find((entry) => entry.code === 'alias_conflict');
    assert.ok(conflict);
    assert.equal(conflict.trace.canonicalText, '唯一工伤认定');
    assert.equal(conflict.trace.aliasText, '唯一工商认定');
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

    const roadBridgeAllowed = evaluateTermAdmission(db, {
      categoryCode: 'ROAD_INFO',
      canonicalText: '东海大桥',
      aliases: ['东海大桥'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(roadBridgeAllowed.level, 'ready');

    const roadHighwayAllowed = evaluateTermAdmission(db, {
      categoryCode: 'ROAD_INFO',
      canonicalText: '京沪高速',
      aliases: ['京沪搞速'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(roadHighwayAllowed.level, 'ready');

    const roadInterchangeAllowed = evaluateTermAdmission(db, {
      categoryCode: 'ROAD_INFO',
      canonicalText: '马陆立交',
      aliases: ['马路立交'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(roadInterchangeAllowed.level, 'ready');

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
    assert.equal(govWarning.level, 'ready');
    assert.ok(govWarning.issues.some((entry) => entry.code === 'gov_term_shape_warning'));

    const govOfficeAllowed = evaluateTermAdmission(db, {
      categoryCode: 'GOV_INFO',
      canonicalText: '人民政府外事办公室',
      aliases: ['外办'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(govOfficeAllowed.level, 'ready');

    const govResearchAllowed = evaluateTermAdmission(db, {
      categoryCode: 'GOV_INFO',
      canonicalText: '人民政府研究室',
      aliases: ['研究室'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(govResearchAllowed.level, 'ready');

    const govAdviserAllowed = evaluateTermAdmission(db, {
      categoryCode: 'GOV_INFO',
      canonicalText: '人民政府参事室',
      aliases: ['参事室'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(govAdviserAllowed.level, 'ready');

    const govRoomBlocked = evaluateTermAdmission(db, {
      categoryCode: 'GOV_INFO',
      canonicalText: '会议室',
      aliases: ['开会的屋子'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    assert.equal(govRoomBlocked.level, 'blocked');
    assert.ok(govRoomBlocked.issues.some((entry) => entry.code === 'gov_term_shape_blocked'));

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

test('term admission blocks alias hitting existing canonical and keeps candidate threshold bounded', () => {
  const config = createTestConfig();
  prepareData.main(config);
  bootstrapDb.main(config);
  const db = openDatabase(config);
  try {
    createTerm(db, {
      categoryCode: 'gov_term',
      canonicalText: '民政局',
      aliases: ['123'],
      priority: 90,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.95,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
    }, 'unit');

    const blocked = evaluateTermAdmission(db, {
      categoryCode: 'gov_term',
      canonicalText: '民政通',
      aliases: ['民政局'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
      pinyinProfile: {},
    });
    const blockedSummary = summarizeTermAdmission(blocked);
    assert.equal(blockedSummary.level, 'blocked');
    assert.equal(blockedSummary.recommendedAction, 'skip_blocked');
    assert.equal(blockedSummary.runtimeSuitability, 'blocked');
    assert.ok(blockedSummary.reasonCodes.includes('trigger_hits_existing_canonical'));

    createTerm(db, {
      categoryCode: 'poi_road',
      canonicalText: '岐示例顺路',
      aliases: ['旗示例顺路'],
      priority: 90,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.95,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
    }, 'unit');

    createTerm(db, {
      categoryCode: 'poi_road',
      canonicalText: '齐示例顺路',
      aliases: ['旗示例顺路'],
      priority: 90,
      riskLevel: 'medium',
      replaceMode: 'replace',
      baseConfidence: 0.95,
      sourceType: 'manual',
      pinyinRuntimeMode: 'candidate',
    }, 'unit');

    const candidate = evaluateTermAdmission(db, {
      categoryCode: 'poi_road',
      canonicalText: '祁示例顺路',
      aliases: ['旗示例顺路'],
      priority: 80,
      riskLevel: 'medium',
      replaceMode: 'candidate',
      baseConfidence: 0.9,
      sourceType: 'manual',
      pinyinRuntimeMode: 'replace',
      pinyinProfile: {},
    });
    const candidateSummary = summarizeTermAdmission(candidate);
    assert.equal(candidateSummary.level, 'ready');
    assert.equal(candidateSummary.recommendedAction, 'save_candidate');
    assert.equal(candidateSummary.runtimeSuitability, 'candidate');
    assert.equal(candidate.normalizedInput.pinyinRuntimeMode, 'candidate');
    assert.ok(candidateSummary.reasonCodes.includes('multi_canonical_ambiguous'));
    assert.ok(candidateSummary.issues.some((entry) => entry.code === 'runtime_mode_downgraded'));
  } finally {
    db.close();
  }
});
