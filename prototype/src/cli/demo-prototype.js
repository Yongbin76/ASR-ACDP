const { PrototypeRuntime } = require('../lib/runtime');
const { createAppConfig } = require('../lib/config');
const prepareData = require('./prepare-data');
const bootstrapDb = require('./bootstrap-db');
const buildSnapshot = require('./build-snapshot');
const {
  openDatabase,
  generateTermPinyinCandidates,
  listValidationCases,
} = require('../lib/platform-db');
const { buildReleaseGateSummary } = require('../lib/release-gates');
const { listValidationFeedSources } = require('../lib/validation-feed-importer');

const appConfig = createAppConfig();

const DEMO_TEXTS = [
  '我想咨询旗顺路和市发改委，还有工商认定。',
  '附近有婚姻检查所吗？',
];

/**
 * 功能：执行一轮本地原型演示并输出摘要。
 * 输入：`config` 应用配置对象。
 * 输出：包含准备结果、运行时演示、候选示例和门禁摘要的对象。
 */
function main(config = appConfig) {
  const prepared = prepareData.main(config);
  const bootstrapped = bootstrapDb.main(config);
  const release = buildSnapshot.main('demo prototype build', config);
  const runtime = PrototypeRuntime.fromSnapshot(release.snapshotPath);
  const db = openDatabase(config);

  try {
    const runtimeDemo = DEMO_TEXTS.map((text) => {
      const result = runtime.match(text, {
        enablePinyinChannel: true,
        enablePinyinAutoReplace: true,
      });
      return {
        text,
        correctedText: result.correctedText,
        matches: (result.matches || []).map((item) => ({
          canonical: item.canonical,
          orig: item.orig,
          channel: item.channel,
          action: item.action,
        })),
      };
    });

    const term = db.prepare("SELECT term_id FROM terms WHERE canonical_text = '单于桥' LIMIT 1").get();
    const candidateDemo = term ? generateTermPinyinCandidates(db, term.term_id, { limit: 5 }) : { items: [] };
    const gate = buildReleaseGateSummary(db, release.releaseId);

    return {
      prepared,
      bootstrapped,
      release: {
        releaseId: release.releaseId,
        version: release.version,
        termCount: release.termCount,
      },
      runtimeDemo,
      pinyinCandidateDemo: (candidateDemo.items || []).slice(0, 5).map((item) => ({
        fullPinyinNoTone: item.fullPinyinNoTone,
        riskLevel: item.riskLevel,
        riskScore: item.riskScore,
        reviewStatus: item.reviewStatus,
      })),
      releaseGate: {
        blocked: gate.blocked,
        blockerCount: gate.blockerCount,
        blockerCodes: (gate.blockers || []).map((item) => item.code),
        validationCaseCount: gate.validation.caseCount,
        businessCaseCount: gate.validation.businessCaseCount,
      },
      validationCases: listValidationCases(db, { enabled: true, limit: 10 }).map((item) => ({
        caseId: item.caseId,
        sourceType: item.sourceType,
        expectedCanonicals: item.expectedCanonicals,
      })),
      feedSources: listValidationFeedSources(config).map((item) => ({
        sourceType: item.sourceType,
        pendingFileCount: item.pendingFileCount,
        errorFileCount: item.errorFileCount,
      })),
    };
  } finally {
    if (typeof db.close === 'function') {
      db.close();
    }
  }
}

if (require.main === module) {
  console.log(JSON.stringify(main(), null, 2));
}

module.exports = {
  main,
};
