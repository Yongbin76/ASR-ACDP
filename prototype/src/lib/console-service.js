const fs = require('fs');
const path = require('path');

const { buildReleaseValidationSummary, buildReleaseGateSummary, buildReleaseGateSummaryMap } = require('./release-gates');
const {
  countTerms,
  countAliasTermsByCategory,
  getDashboardSummary,
  listTerms,
  getTerm,
  getTermPinyinProfile,
  listReviewTasksPaged,
  getReviewTask,
  getLatestReviewTaskByTarget,
  listAuditLogs,
  listReleasesPaged,
  getRelease,
  listReleaseTerms,
  listReleaseTermsByReleaseIds,
  getReleaseApprovalPolicy,
  getCurrentPublishedRelease,
  getCurrentCanaryRelease,
  getActiveGrayPolicy,
  listValidationCasesPaged,
  countEnabledValidationCasesByCanonicalTexts,
  listRuntimeNodes,
  summarizeRuntimeNodesForTargetVersion,
  listRuntimeRolloutAttentionNodes,
  getRuntimeNode,
  getRuntimeControlState,
  getRuntimeControlViewForNode,
  getImportJob,
  listTermReviewTasksByImportJobIdPaged,
  summarizeTermReviewTasksByImportJobId,
  listImportJobs,
  summarizeImportJobs,
  listImportJobFiles,
  getImportJobResult,
  listImportJobRows,
  listRuntimeNodeRegistry,
  getRuntimeNodeRegistryItem,
  summarizeValidationCases,
  summarizeTerms,
  summarizeReviewTasks,
} = require('./platform-db');
const { getImportTemplate } = require('./import-templates');
const { listBusinessProperties, loadBusinessPropertyDefinitions } = require('./business-properties');
const { listSourceTypes, loadSourceTypeDefinitions } = require('./source-types');
const { loadGovernancePolicies } = require('./governance-policies');
const { evaluateTermAdmission, summarizeTermAdmission } = require('./term-admission');

/**
 * 功能：根据 ID 数组构造 SQL `IN` 占位符片段。
 * 输入：任意 ID 数组。
 * 输出：SQL 占位符字符串；空数组时返回空字符串。
 */
function sqlPlaceholders(items = []) {
  return items.map(() => '?').join(',');
}

/**
 * 功能：标准化字符串 ID 数组并去重。
 * 输入：任意 ID 数组。
 * 输出：去重后的非空字符串数组。
 */
function normalizeIds(items = []) {
  return Array.from(new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean)));
}

/**
 * 功能：判断字符串是否为可用的显示文本。
 * 输入：任意字符串值。
 * 输出：可显示时返回 `true`，否则返回 `false`。
 */
function hasDisplayText(value) {
  return Boolean(String(value || '').trim());
}

/**
 * 功能：判断字符串是否看起来像损坏后的占位文本。
 * 输入：任意字符串值。
 * 输出：仅包含问号或替代字符时返回 `true`。
 */
function looksBrokenText(value) {
  const text = String(value || '').trim();
  if (!text) {
    return false;
  }
  return /^[?？\uFFFD\s]+$/.test(text);
}

/**
 * 功能：安全解析 JSON 字符串并在失败时返回后备值。
 * 输入：原始 JSON 字符串与后备值。
 * 输出：解析后的对象；解析失败时返回后备值。
 */
function parseJsonOrFallback(value, fallback = null) {
  if (value == null || value === '') {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

/**
 * 功能：标准化字符串数组并去重。
 * 输入：任意字符串数组。
 * 输出：去重后的非空字符串数组。
 */
function normalizeStringList(items = []) {
  return Array.from(new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean)));
}

/**
 * 功能：把 review_tasks 行转换为控制台工作台需要的审核对象。
 * 输入：review_tasks 表行对象。
 * 输出：最小审核任务对象。
 */
function composeWorkbenchReviewTask(row) {
  return {
    taskId: row.task_id,
    taskType: row.task_type,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by,
    comment: row.comment,
    targetSnapshot: parseJsonOrFallback(row.target_snapshot, null),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

/**
 * 功能：把 validation_cases 行转换为控制台工作台需要的样本对象。
 * 输入：validation_cases 表行对象。
 * 输出：最小验证样本对象。
 */
function composeWorkbenchValidationCase(row) {
  return {
    caseId: row.case_id,
    description: row.description,
    text: row.sample_text,
    expectedCanonicals: normalizeStringList(parseJsonOrFallback(row.expected_canonicals_json, [])),
    enabled: Boolean(row.enabled),
    sourceType: row.source_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const CONSOLE_DISPLAY_LABELS = {
  draft: '草稿',
  pending: '待审核',
  pending_review: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  disabled: '已停用',
  built: '已构建',
  canary: '灰度中',
  published: '已发布',
  proper_noun: '专有名词',
  gov_term: '政务词条',
  poi_road: '道路地点',
  COMM_WORDS: '常用词信息',
  SURNAME: '中文姓拆解',
  GOV_INFO: '政府部门信息',
  ROAD_INFO: '路名信息',
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  release_term_status_invalid: '词条状态不满足发布条件',
  pending_term_review: '存在待审核词条',
  pending_pinyin_candidate_review: '存在待审核拼音候选',
  release_not_found: '版本不存在',
  release_snapshot_missing: '版本快照缺失',
  release_snapshot_load_failed: '版本快照加载失败',
  release_validation_smoke_failed: '词条冒烟验证失败',
  release_validation_business_sample_failed: '业务样本验证失败',
  term_smoke: '词条冒烟验证',
  business_sample: '业务样本验证',
  expected_canonical_not_detected_in_business_sample: '业务样本未命中期望标准词',
  term_not_detected_in_smoke_simulation: '词条冒烟验证未命中目标词条',
  no_noncanonical_smoke_sample_available: '当前词条缺少可用的冒烟样本',
};

const RUNTIME_CONTROL_VERIFICATION_REPORT_CACHE = new Map();

/**
 * 功能：把控制台常见代码值转换为中文展示文案。
 * 输入：代码值。
 * 输出：中文展示文案；无映射时返回原值。
 */
function consoleDisplayLabel(value) {
  return CONSOLE_DISPLAY_LABELS[String(value || '').trim()] || String(value || '');
}

/**
 * 功能：把控制台常见代码值转换为适合工作台的短标题。
 * 输入：代码值和后备文案。
 * 输出：中文短标题；无映射时返回后备文案或原值。
 */
function consoleDisplayLabelOrFallback(value, fallback = '') {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return String(fallback || '');
  }
  return consoleDisplayLabel(normalized) || String(fallback || normalized);
}

/**
 * 功能：按词条汇总最新审核状态。
 * 输入：数据库连接，词条 ID 数组。
 * 输出：`termId -> summary` 的 Map。
 */
function latestTermReviewSummaryMap(db, termIds = []) {
  const map = new Map();
  if (!termIds.length) {
    return map;
  }
  const placeholders = sqlPlaceholders(termIds);
  const rows = db.prepare(`
    SELECT *
    FROM review_tasks
    WHERE target_type = 'term'
      AND target_id IN (${placeholders})
    ORDER BY target_id ASC, created_at DESC, task_id DESC
  `).all(...termIds);
  const grouped = new Map();
  for (const row of rows) {
    const targetId = row.target_id;
    const current = grouped.get(targetId) || {
      latestTaskId: null,
      latestStatus: 'not_submitted',
      latestSnapshotRevision: null,
      pendingCount: 0,
      approvedCount: 0,
      lastReviewedBy: null,
      lastReviewedAt: null,
      seen: false,
    };
    if (!current.seen) {
      const snapshot = parseJsonOrFallback(row.target_snapshot, null);
      current.latestTaskId = row.task_id;
      current.latestStatus = row.status;
      current.latestSnapshotRevision = snapshot && snapshot.revision != null ? Number(snapshot.revision) : null;
      current.lastReviewedBy = row.reviewed_by;
      current.lastReviewedAt = row.reviewed_at;
      current.seen = true;
    }
    if (row.status === 'pending') {
      current.pendingCount += 1;
    }
    if (row.status === 'approved') {
      current.approvedCount += 1;
    }
    grouped.set(targetId, current);
  }
  for (const termId of termIds) {
    const current = grouped.get(termId);
    map.set(termId, current ? {
      latestTaskId: current.latestTaskId,
      latestStatus: current.latestStatus,
      latestSnapshotRevision: current.latestSnapshotRevision,
      pendingCount: current.pendingCount,
      approvedCount: current.approvedCount,
      lastReviewedBy: current.lastReviewedBy,
      lastReviewedAt: current.lastReviewedAt,
    } : {
      latestTaskId: null,
      latestStatus: 'not_submitted',
      latestSnapshotRevision: null,
      pendingCount: 0,
      approvedCount: 0,
      lastReviewedBy: null,
      lastReviewedAt: null,
    });
  }
  return map;
}

/**
 * 功能：按词条统计发布包含状态。
 * 输入：数据库连接，词条 ID 数组。
 * 输出：`termId -> summary` 的 Map。
 */
function termReleaseSummaryMap(db, termIds = []) {
  const map = new Map();
  if (!termIds.length) {
    return map;
  }
  const stable = getCurrentPublishedRelease(db);
  const canary = getCurrentCanaryRelease(db);
  const placeholders = sqlPlaceholders(termIds);
  const rows = db.prepare(`
    SELECT
      rt.term_id,
      r.release_id,
      r.version,
      r.status,
      r.created_at
    FROM release_terms rt
    JOIN releases r ON r.release_id = rt.release_id
    WHERE rt.term_id IN (${placeholders})
    ORDER BY rt.term_id ASC, r.created_at DESC, r.release_id DESC
  `).all(...termIds);
  const grouped = new Map();
  for (const row of rows) {
    const current = grouped.get(row.term_id) || {
      includedReleaseCount: 0,
      latestReleaseId: null,
      latestReleaseVersion: null,
      currentStableIncluded: false,
      currentCanaryIncluded: false,
      seen: false,
    };
    if (!current.seen) {
      current.latestReleaseId = row.release_id;
      current.latestReleaseVersion = row.version;
      current.seen = true;
    }
    current.includedReleaseCount += 1;
    if (stable && stable.releaseId === row.release_id) {
      current.currentStableIncluded = true;
    }
    if (canary && canary.releaseId === row.release_id) {
      current.currentCanaryIncluded = true;
    }
    grouped.set(row.term_id, current);
  }
  for (const termId of termIds) {
    const current = grouped.get(termId);
    map.set(termId, current ? {
      includedReleaseCount: current.includedReleaseCount,
      latestReleaseId: current.latestReleaseId,
      latestReleaseVersion: current.latestReleaseVersion,
      currentStableIncluded: current.currentStableIncluded,
      currentCanaryIncluded: current.currentCanaryIncluded,
    } : {
      includedReleaseCount: 0,
      latestReleaseId: null,
      latestReleaseVersion: null,
      currentStableIncluded: false,
      currentCanaryIncluded: false,
    });
  }
  return map;
}

/**
 * 功能：按审核任务批量读取 term 目标的实时基础信息。
 * 输入：数据库连接、审核任务数组。
 * 输出：`termId -> live term summary` 的映射。
 */
function reviewTargetTermMap(db, items = []) {
  const termIds = normalizeIds((items || [])
    .filter((item) => item.targetType === 'term')
    .map((item) => item.targetId));
  const result = new Map();
  if (!termIds.length) {
    return result;
  }
  const placeholders = sqlPlaceholders(termIds);
  const rows = db.prepare(`
    SELECT term_id, canonical_text, category_code, status
    FROM terms
    WHERE term_id IN (${placeholders})
  `).all(...termIds);
  for (const row of rows) {
    result.set(String(row.term_id || '').trim(), {
      termId: row.term_id,
      canonicalText: row.canonical_text,
      categoryCode: row.category_code,
      status: row.status,
    });
  }
  return result;
}

/**
 * 功能：按审核任务批量读取 release 目标的实时基础信息。
 * 输入：数据库连接、审核任务数组。
 * 输出：`releaseId -> live release summary` 的映射。
 */
function reviewTargetReleaseMap(db, items = []) {
  const releaseIds = normalizeIds((items || [])
    .filter((item) => item.targetType === 'release')
    .map((item) => item.targetId));
  const result = new Map();
  if (!releaseIds.length) {
    return result;
  }
  const placeholders = sqlPlaceholders(releaseIds);
  const rows = db.prepare(`
    SELECT release_id, version, status
    FROM releases
    WHERE release_id IN (${placeholders})
  `).all(...releaseIds);
  for (const row of rows) {
    result.set(String(row.release_id || '').trim(), {
      releaseId: row.release_id,
      version: row.version,
      status: row.status,
    });
  }
  return result;
}

/**
 * 功能：按审核任务批量构造目标摘要。
 * 输入：数据库连接、审核任务数组。
 * 输出：`taskId -> target summary` 的映射。
 */
function buildReviewTargetSummaryMap(db, items = []) {
  const result = new Map();
  const normalizedItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!normalizedItems.length) {
    return result;
  }
  const liveTermMap = reviewTargetTermMap(db, normalizedItems);
  const liveReleaseMap = reviewTargetReleaseMap(db, normalizedItems);
  const releaseIds = normalizeIds(normalizedItems
    .filter((item) => item.targetType === 'release')
    .map((item) => item.targetId));
  const releaseTermsMap = releaseIds.length ? listReleaseTermsByReleaseIds(db, releaseIds) : new Map();
  const releaseApprovalMap = releaseIds.length
    ? releaseApprovalStateMap(db, releaseIds, { releaseTermsMap })
    : new Map();
  const currentPublishedRelease = getCurrentPublishedRelease(db);
  const currentCanaryRelease = getCurrentCanaryRelease(db);
  const activeGrayPolicy = getActiveGrayPolicy(db);

  for (const item of normalizedItems) {
    const snapshot = item.targetSnapshot || {};
    let summary;

    if (item.targetType === 'term') {
      const liveTerm = liveTermMap.get(String(item.targetId || '').trim()) || null;
      const canonicalText = hasDisplayText(snapshot.canonicalText) && !looksBrokenText(snapshot.canonicalText)
        ? snapshot.canonicalText
        : (liveTerm ? liveTerm.canonicalText : item.targetId);
      const categoryCode = snapshot.categoryCode || (liveTerm ? liveTerm.categoryCode : '');
      const status = snapshot.status || (liveTerm ? liveTerm.status : '');
      const replaceMode = snapshot.replaceMode || (liveTerm ? liveTerm.replaceMode : '');
      summary = {
        title: canonicalText,
        subtitle: categoryCode ? `词条 / ${consoleDisplayLabel(categoryCode)}` : '词条',
        detail: status ? `当前状态：${consoleDisplayLabel(status)}` : `目标 ID：${item.targetId}`,
        targetPath: liveTerm ? `/console/dictionary/terms/${encodeURIComponent(liveTerm.termId)}` : '',
        canonicalText,
        version: '',
        fullPinyinNoTone: '',
        replaceMode,
        workflow: {
          purpose: '确认当前词条内容是否可以进入后续版本构建输入。',
          approveNext: '通过后，词条将进入可参与下一次 build 的状态；下一步请进入版本发布构建新版本。',
          rejectNext: '驳回后，请返回词条修正内容，再重新提交审核。',
        },
      };
    } else if (item.targetType === 'release') {
      const liveRelease = liveReleaseMap.get(String(item.targetId || '').trim()) || null;
      const version = snapshot.version || (liveRelease ? liveRelease.version : item.targetId);
      const release = liveRelease || {
        releaseId: item.targetId,
        version,
        status: snapshot.status || '',
        summary: snapshot.summary || '',
      };
      const layers = buildConsoleReleaseStateLayers(db, release, {
        releaseTermsMap,
        approval: releaseApprovalMap.get(String(item.targetId || '').trim()) || null,
        currentPublishedRelease,
        currentCanaryRelease,
        activeGrayPolicy,
      });
      const releaseStateLabel = consoleDisplayLabelOrFallback((layers.releaseState || {}).status, '未标注');
      const approvalStateLabel = consoleDisplayLabelOrFallback((((layers || {}).approval) || {}).status, '未提交');
      const trafficTitle = (((layers || {}).traffic) || {}).title || '当前无灰度';
      summary = {
        title: version,
        subtitle: '版本发布审核',
        detail: `版本状态：${releaseStateLabel}；审批状态：${approvalStateLabel}；流量状态：${trafficTitle}`,
        targetPath: liveRelease ? `/console/releases/${encodeURIComponent(liveRelease.releaseId)}` : '',
        canonicalText: '',
        version,
        fullPinyinNoTone: '',
        releaseState: layers.releaseState,
        approval: layers.approval,
        traffic: layers.traffic,
        workflow: {
          purpose: '确认该版本是否具备进入灰度或正式发布的条件。',
          approveNext: '通过后，请回到版本发布决定是否继续灰度、正式发布或回滚。',
          rejectNext: '驳回后，请回到版本发布处理版本内容、门禁或验证问题。',
        },
      };
    } else if (item.targetType === 'pinyin_candidate') {
      const canonicalText = hasDisplayText(snapshot.canonicalText) && !looksBrokenText(snapshot.canonicalText)
        ? snapshot.canonicalText
        : snapshot.termId;
      const reading = snapshot.fullPinyinNoTone || item.targetId;
      summary = {
        title: reading,
        subtitle: canonicalText ? `拼音候选 / ${canonicalText}` : '拼音候选',
        detail: snapshot.sourceRuleLabel
          ? `生成来源：${snapshot.sourceRuleLabel}`
          : (snapshot.riskLevel ? `风险等级：${consoleDisplayLabel(snapshot.riskLevel)}` : `目标 ID：${item.targetId}`),
        targetPath: snapshot.termId ? `/console/dictionary/terms/${encodeURIComponent(snapshot.termId)}` : '',
        canonicalText,
        version: '',
        fullPinyinNoTone: reading,
        workflow: {
          purpose: '确认当前候选读音是否应该写入词条拼音画像。',
          approveNext: '通过后，候选读音会写回词条拼音画像；若要进入 runtime，下一步请重新构建版本。',
          rejectNext: '驳回后，请回词条详情继续治理拼音候选。',
        },
      };
    } else {
      summary = {
        title: item.targetId,
        subtitle: item.targetType || '未知目标',
        detail: item.taskType || '',
        targetPath: '',
        canonicalText: '',
        version: '',
        fullPinyinNoTone: '',
        replaceMode: '',
      };
    }

    result.set(String(item.taskId || '').trim(), summary);
  }
  return result;
}

/**
 * 功能：构造审核任务的目标摘要。
 * 输入：数据库连接、审核任务对象。
 * 输出：适合控制台显示的目标摘要对象。
 */
function buildReviewTargetSummary(db, item) {
  const taskId = String((item || {}).taskId || '').trim();
  return buildReviewTargetSummaryMap(db, [item]).get(taskId) || {
    title: item.targetId,
    subtitle: item.targetType || '未知目标',
    detail: item.taskType || '',
    targetPath: '',
    canonicalText: '',
    version: '',
    fullPinyinNoTone: '',
  };
}

/**
 * 功能：按词条统计验证样本关联情况。
 * 输入：数据库连接，词条数组。
 * 输出：`termId -> summary` 的 Map。
 */
function termValidationSummaryMap(db, terms = []) {
  const map = new Map();
  const canonicalTexts = (terms || []).map((term) => term.canonicalText);
  const relatedCountMap = countEnabledValidationCasesByCanonicalTexts(db, canonicalTexts);
  for (const term of terms) {
    map.set(term.termId, {
      relatedCaseCount: Number(relatedCountMap.get(String(term.canonicalText || '').trim()) || 0),
      failedCaseCount: 0,
      latestFailedCases: [],
    });
  }
  return map;
}

/**
 * 功能：构造控制台总览摘要。
 * 输入：数据库连接。
 * 输出：总览对象。
 */
function getConsoleOverview(db) {
  const dashboard = getDashboardSummary(db);
  const pendingReviewSummary = listReviewTasksPaged(db, { status: 'pending', page: 1, pageSize: 1 });
  const importJobs = listImportJobs(db, { limit: 10 });
  return {
    overview: {
      totalTerms: countTerms(db),
      totalAliases: (dashboard.dictionary.aliasByCategory || []).reduce((sum, item) => sum + Number(item.aliasCount || 0), 0),
      pendingReviewCount: Number(pendingReviewSummary.total || 0),
      currentStableRelease: getCurrentPublishedRelease(db),
      currentCanaryRelease: getCurrentCanaryRelease(db),
      recentImportJobCount: importJobs.total,
    },
    dictionary: dashboard.dictionary,
    runtime: dashboard.runtime,
    reviews: {
      pendingCount: Number(pendingReviewSummary.total || 0),
    },
  };
}

/**
 * 功能：把 ISO 时间按从新到旧排序。
 * 输入：两个带时间字段的对象。
 * 输出：适合 `Array.prototype.sort()` 使用的比较结果。
 */
function compareByUpdatedAtDesc(left = {}, right = {}) {
  return String(right.updatedAt || right.createdAt || '').localeCompare(String(left.updatedAt || left.createdAt || ''));
}

/**
 * 功能：把工作台事项统一收敛为可渲染条目。
 * 输入：标题、副标题、详情、状态和跳转路径等字段。
 * 输出：统一的工作台事项对象。
 */
function workbenchItem(input = {}) {
  return {
    title: input.title || '',
    subtitle: input.subtitle || '',
    detail: input.detail || '',
    status: input.status || '',
    href: input.href || '',
    updatedAt: input.updatedAt || input.createdAt || '',
  };
}

/**
 * 功能：根据工作台各分组生成首页优先处理摘要。
 * 输入：包含工作台各分组结果的对象。
 * 输出：最多三条优先处理摘要数组。
 */
function buildWorkbenchHighlights(workbench = {}) {
  const candidates = [
    {
      key: 'blocked_releases',
      count: Number(((workbench.blockedReleases || {}).count) || 0),
      title: '先处理版本校验阻断',
      description: '版本校验未通过时，后续灰度和正式发布都无法继续推进。',
      href: '/console/releases',
      status: 'blocked',
    },
    {
      key: 'pending_reviews',
      count: Number(((workbench.reviews || {}).count) || 0),
      title: '先清理待审核任务',
      description: '审核积压会直接阻塞词条和发布进入后续链路。',
      href: '/console/dictionary/reviews',
      status: 'pending',
    },
    {
      key: 'pending_imports',
      count: Number(((workbench.imports || {}).count) || 0),
      title: '先确认待导入批次',
      description: '导入批次未确认时，新增数据不会进入词条或样本闭环。',
      href: '/console/dictionary/import-jobs',
      status: 'warning',
    },
    {
      key: 'failed_runtime_applies',
      count: Number(((workbench.failedRuntimeApplies || {}).count) || 0),
      title: '先处理应用异常节点',
      description: '应用失败或回滚会阻断目标版本在节点侧收敛。',
      href: '/console/runtime-nodes',
      status: 'failed',
    },
    {
      key: 'offline_runtime_nodes',
      count: Number(((workbench.offlineRuntimeNodes || {}).count) || 0),
      title: '先确认离线节点',
      description: '离线节点会让当前版本收敛情况失真，需要优先确认。',
      href: '/console/runtime-nodes',
      status: 'warning',
    },
    {
      key: 'attention_validation_cases',
      count: Number(((workbench.attentionValidationCases || {}).count) || 0),
      title: '先处理待关注样本',
      description: '未关联样本会削弱主数据质量和后续版本校验结果的可信度。',
      href: '/console/validation/cases',
      status: 'warning',
    },
  ];
  return candidates.filter((item) => item.count > 0).slice(0, 3);
}

/**
 * 功能：判断工作台是否允许展示指定页面分组。
 * 输入：鉴权上下文与页面 key。
 * 输出：允许展示时返回 `true`，否则返回 `false`。
 */
function canAccessWorkbenchPage(auth = {}, pageKey = '') {
  if (!pageKey) {
    return true;
  }
  const pageAccess = (auth || {}).pageAccess || {};
  if (Object.keys(pageAccess).length === 0) {
    return true;
  }
  return Boolean(pageAccess[pageKey]);
}

/**
 * 功能：读取工作台待审核区块所需的轻量审核任务列表。
 * 输入：数据库连接。
 * 输出：包含总数与前 5 条待审核任务的对象。
 */
function listWorkbenchPendingReviews(db) {
  const rows = db.prepare(`
    SELECT *
    FROM review_tasks
    WHERE status = 'pending'
      AND target_type IN ('term', 'pinyin_candidate')
    ORDER BY created_at DESC, task_id DESC
    LIMIT 5
  `).all();
  const countRow = db.prepare(`
    SELECT COUNT(*) AS count
    FROM review_tasks
    WHERE status = 'pending'
      AND target_type IN ('term', 'pinyin_candidate')
  `).get();
  return {
    total: Number((countRow || {}).count || 0),
    items: rows.map((row) => composeWorkbenchReviewTask(row)),
  };
}

/**
 * 功能：收集工作台中的待处理审核事项。
 * 输入：数据库连接、鉴权上下文。
 * 输出：审核工作台分组对象。
 */
function buildWorkbenchReviewSection(db, auth = {}) {
  if (!canAccessWorkbenchPage(auth, '/reviews')) {
    return {
      count: 0,
      items: [],
    };
  }
  const result = listWorkbenchPendingReviews(db);
  const targetSummaryMap = buildReviewTargetSummaryMap(db, result.items || []);
  return {
    count: Number(result.total || 0),
    items: (result.items || []).map((item) => workbenchItem({
      title: (targetSummaryMap.get(String(item.taskId || '').trim()) || {}).title || item.taskId,
      subtitle: (targetSummaryMap.get(String(item.taskId || '').trim()) || {}).subtitle || consoleDisplayLabelOrFallback(item.taskType, '审核任务'),
      detail: `任务 ${item.taskId} / 提交人 ${item.submittedBy || '未记录'}`,
      status: item.status,
      href: `/console/dictionary/reviews/${encodeURIComponent(item.taskId)}`,
      updatedAt: item.createdAt,
    })),
  };
}

/**
 * 功能：按导入批次数组批量读取工作台所需的预览统计。
 * 输入：数据库连接和导入批次数组。
 * 输出：`jobId -> previewSummary` 的映射。
 */
function buildWorkbenchImportPreviewMap(db, jobs = []) {
  const result = new Map();
  const jobIds = normalizeIds((jobs || []).map((item) => item.jobId));
  if (!jobIds.length) {
    return result;
  }
  const placeholders = sqlPlaceholders(jobIds);
  const rows = db.prepare(`
    SELECT
      job_id,
      COUNT(*) AS total_rows,
      SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready_rows,
      SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) AS warning_rows,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_rows
    FROM import_job_rows
    WHERE job_id IN (${placeholders})
    GROUP BY job_id
  `).all(...jobIds);
  for (const row of rows) {
    result.set(String(row.job_id || '').trim(), {
      totalRows: Number(row.total_rows || 0),
      readyRows: Number(row.ready_rows || 0),
      warningRows: Number(row.warning_rows || 0),
      errorRows: Number(row.error_rows || 0),
    });
  }
  return result;
}

/**
 * 功能：收集工作台中的待确认导入批次事项。
 * 输入：数据库连接、鉴权上下文。
 * 输出：导入工作台分组对象。
 */
function buildWorkbenchImportSection(db, auth = {}) {
  if (!canAccessWorkbenchPage(auth, '/import')) {
    return {
      count: 0,
      items: [],
    };
  }
  const result = listImportJobs(db, {
    status: 'preview_ready',
    limit: 5,
    offset: 0,
  });
  const previewMap = buildWorkbenchImportPreviewMap(db, result.items || []);
  return {
    count: Number(result.total || 0),
    items: (result.items || []).map((item) => workbenchItem({
      title: item.jobId,
      subtitle: consoleDisplayLabelOrFallback(item.sourceType || item.jobType, '导入批次'),
      detail: `可导入 ${(previewMap.get(item.jobId) || {}).readyRows || 0} / 需确认 ${(previewMap.get(item.jobId) || {}).warningRows || 0} / 错误 ${(previewMap.get(item.jobId) || {}).errorRows || 0}`,
      status: item.status,
      href: `/console/dictionary/import-jobs/${encodeURIComponent(item.jobId)}`,
      updatedAt: item.finishedAt || item.confirmedAt || item.createdAt,
    })),
  };
}

/**
 * 功能：按 release 页面块批量构造工作台使用的轻量版本校验摘要。
 * 输入：数据库连接和当前页面的 release 数组。
 * 输出：`releaseId -> { blocked, blockerCount }` 的映射。
 */
function buildWorkbenchBlockedReleaseGateMap(db, releases = []) {
  const result = new Map();
  const normalizedReleases = Array.isArray(releases) ? releases.filter(Boolean) : [];
  const releaseIds = normalizeIds(normalizedReleases.map((item) => item.releaseId));
  if (!releaseIds.length) {
    return result;
  }
  const releaseTermsMap = listReleaseTermsByReleaseIds(db, releaseIds);
  const releaseMap = new Map(normalizedReleases
    .map((item) => [String(item.releaseId || '').trim(), item])
    .filter((entry) => entry[0]));
  const gateMap = buildReleaseGateSummaryMap(db, releaseIds, {
    releases: normalizedReleases,
    releaseTermsMap,
  });
  for (const releaseId of releaseIds) {
    const gate = gateMap.get(releaseId) || { blocked: false, blockerCount: 0 };
    result.set(releaseId, {
      blocked: gate.blocked === true,
      blockerCount: Number(gate.blockerCount || 0),
    });
  }
  return result;
}

/**
 * 功能：收集工作台中的发布门禁阻塞版本事项。
 * 输入：数据库连接、鉴权上下文。
 * 输出：阻塞发布工作台分组对象。
 */
function buildWorkbenchBlockedReleaseSection(db, auth = {}) {
  if (!canAccessWorkbenchPage(auth, '/releases')) {
    return {
      count: 0,
      items: [],
    };
  }
  const pageSize = 50;
  const items = [];
  let blockedCount = 0;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const result = listReleasesPaged(db, {
      limit: pageSize,
      offset,
    });
    const pageItems = result.items || [];
    total = Number(result.total || 0);
    if (!pageItems.length) {
      break;
    }
    const gateMap = buildWorkbenchBlockedReleaseGateMap(db, pageItems);
    for (const item of pageItems) {
      const gate = gateMap.get(item.releaseId) || { blocked: false, blockerCount: 0 };
      if (gate.blocked !== true) {
        continue;
      }
      blockedCount += 1;
      if (items.length < 5) {
        items.push(workbenchItem({
          title: item.version,
          subtitle: `阻塞项 ${Number(gate.blockerCount || 0)}`,
          detail: item.summary || '当前版本存在未解除的发布门禁阻塞项。',
          status: 'blocked',
          href: `/console/releases/${encodeURIComponent(item.releaseId)}`,
          updatedAt: item.createdAt,
        }));
      }
    }
    offset += pageItems.length;
  }
  return {
    count: blockedCount,
    items,
  };
}

/**
 * 功能：收集工作台中的离线节点事项。
 * 输入：数据库连接、应用配置、鉴权上下文。
 * 输出：离线节点工作台分组对象。
 */
function buildWorkbenchOfflineRuntimeSection(db, appConfig, auth = {}) {
  if (!canAccessWorkbenchPage(auth, '/runtime-nodes')) {
    return {
      count: 0,
      items: [],
    };
  }
  const result = listRuntimeNodes(db, {
    status: 'offline',
    limit: 5,
    offset: 0,
  }, appConfig);
  return {
    count: Number(result.total || 0),
    items: (result.items || []).map((item) => workbenchItem({
      title: item.nodeName || item.nodeId,
      subtitle: item.env || '未标注环境',
      detail: `最近心跳 ${item.lastHeartbeatAt || '未记录'} / 当前版本 ${item.currentVersion || '未安装'}`,
      status: item.status,
      href: `/console/runtime-nodes/${encodeURIComponent(item.nodeId)}`,
      updatedAt: item.updatedAt || item.lastHeartbeatAt,
    })),
  };
}

/**
 * 功能：收集工作台中的 apply 异常节点事项。
 * 输入：数据库连接、应用配置、鉴权上下文。
 * 输出：apply 异常工作台分组对象。
 */
function buildWorkbenchFailedApplySection(db, appConfig, auth = {}) {
  if (!canAccessWorkbenchPage(auth, '/runtime-nodes')) {
    return {
      count: 0,
      items: [],
    };
  }
  const failedItems = listRuntimeNodes(db, {
    lastApplyStatuses: ['failed', 'rolled_back'],
    orderBy: 'last_apply_at_desc',
    limit: 5,
    offset: 0,
  }, appConfig);
  const items = failedItems.items || [];
  return {
    count: Number(failedItems.total || 0),
    items: items.map((item) => workbenchItem({
      title: item.nodeName || item.nodeId,
      subtitle: `${item.currentVersion || '未安装'} -> ${item.desiredVersion || '未下发'}`,
      detail: summarizeRuntimeIssue(item).detail || `最近应用时间 ${item.lastApplyAt || '未记录'}`,
      status: summarizeRuntimeIssue(item).status,
      href: `/console/runtime-nodes/${encodeURIComponent(item.nodeId)}`,
      updatedAt: item.lastApplyAt || item.updatedAt,
    })),
  };
}

/**
 * 功能：读取工作台待关注样本区块所需的轻量样本列表。
 * 输入：数据库连接。
 * 输出：包含总数与前 5 条未关联样本的对象。
 */
function listWorkbenchAttentionValidationCases(db) {
  const where = `
    WHERE vc.enabled = 1
      AND NOT EXISTS (
        SELECT 1
        FROM json_each(vc.expected_canonicals_json) je
        JOIN terms t ON t.canonical_text = je.value
      )
  `;
  const rows = db.prepare(`
    SELECT vc.*
    FROM validation_cases vc
    ${where}
    ORDER BY vc.updated_at DESC, vc.case_id DESC
    LIMIT 5
  `).all();
  const countRow = db.prepare(`
    SELECT COUNT(*) AS count
    FROM validation_cases vc
    ${where}
  `).get();
  return {
    total: Number((countRow || {}).count || 0),
    items: rows.map((row) => composeWorkbenchValidationCase(row)),
  };
}

/**
 * 功能：收集工作台中的未关联验证样本事项。
 * 输入：数据库连接、鉴权上下文。
 * 输出：验证样本工作台分组对象。
 */
function buildWorkbenchValidationSection(db, auth = {}) {
  if (!canAccessWorkbenchPage(auth, '/validation-cases')) {
    return {
      count: 0,
      items: [],
    };
  }
  const result = listWorkbenchAttentionValidationCases(db);
  const items = result.items || [];
  return {
    count: Number(result.total || 0),
    items: items.map((item) => workbenchItem({
      title: item.caseId,
      subtitle: consoleDisplayLabelOrFallback(item.sourceType, '验证样本'),
      detail: item.description || `期望命中：${(item.expectedCanonicals || []).join(' / ') || '未填写'}`,
      status: 'warning',
      href: `/console/validation/cases/${encodeURIComponent(item.caseId)}`,
      updatedAt: item.updatedAt || item.createdAt,
    })),
  };
}

/**
 * 功能：构造控制台首页工作台聚合数据。
 * 输入：数据库连接、应用配置、鉴权上下文。
 * 输出：待办/异常驱动的工作台对象。
 */
function getConsoleWorkbench(db, appConfig, auth = {}) {
  const reviews = buildWorkbenchReviewSection(db, auth);
  const imports = buildWorkbenchImportSection(db, auth);
  const blockedReleases = buildWorkbenchBlockedReleaseSection(db, auth);
  const offlineRuntimeNodes = buildWorkbenchOfflineRuntimeSection(db, appConfig, auth);
  const failedRuntimeApplies = buildWorkbenchFailedApplySection(db, appConfig, auth);
  const attentionValidationCases = buildWorkbenchValidationSection(db, auth);
  const workbench = {
    reviews,
    imports,
    blockedReleases,
    offlineRuntimeNodes,
    failedRuntimeApplies,
    attentionValidationCases,
  };
  return {
    summary: {
      pendingReviewCount: reviews.count,
      pendingImportJobCount: imports.count,
      blockedReleaseCount: blockedReleases.count,
      offlineRuntimeNodeCount: offlineRuntimeNodes.count,
      failedRuntimeApplyCount: failedRuntimeApplies.count,
      attentionValidationCaseCount: attentionValidationCases.count,
    },
    highlights: buildWorkbenchHighlights(workbench),
    ...workbench,
  };
}

/**
 * 功能：汇总单个 runtime 节点的近 24 小时请求统计。
 * 输入：数据库连接和节点 ID 数组。
 * 输出：`nodeId -> requestSummary` 的映射。
 */
function runtimeNodeRequestSummaryMap(db, nodeIds = []) {
  const map = new Map();
  if (!nodeIds.length) {
    return map;
  }
  const placeholders = sqlPlaceholders(nodeIds);
  const rows = db.prepare(`
    SELECT
      node_id,
      COALESCE(SUM(request_count), 0) AS request_count_24h,
      COALESCE(SUM(hit_term_count), 0) AS hit_term_count_24h
    FROM runtime_node_hourly_stats
    WHERE node_id IN (${placeholders})
    GROUP BY node_id
  `).all(...nodeIds);
  for (const row of rows) {
    map.set(row.node_id, {
      requestCount24h: Number(row.request_count_24h || 0),
      hitTermCount24h: Number(row.hit_term_count_24h || 0),
    });
  }
  return map;
}

/**
 * 功能：汇总单个 runtime 节点的历史峰值并发统计。
 * 输入：数据库连接和节点 ID 数组。
 * 输出：`nodeId -> peakSummary` 的映射。
 */
function runtimeNodePeakMap(db, nodeIds = []) {
  const map = new Map();
  if (!nodeIds.length) {
    return map;
  }
  const placeholders = sqlPlaceholders(nodeIds);
  const rows = db.prepare(`
    SELECT *
    FROM runtime_node_peak_stats
    WHERE node_id IN (${placeholders})
  `).all(...nodeIds);
  for (const row of rows) {
    map.set(row.node_id, {
      peakConcurrency: Number(row.peak_concurrency || 0),
      peakAt: row.peak_at,
      updatedAt: row.updated_at,
    });
  }
  return map;
}

/**
 * 功能：把 runtime 节点最近错误统一归类为当前异常、历史异常或健康状态。
 * 输入：runtime 节点对象。
 * 输出：包含生命周期、标题、说明和恢复建议的异常摘要对象。
 */
function summarizeRuntimeIssue(item = {}) {
  const lastError = String(item.lastError || '').trim();
  if (!lastError) {
    return {
      lifecycle: 'none',
      status: 'healthy',
      title: '当前无异常',
      detail: '',
      recovery: '',
    };
  }

  let title = '运行异常';
  let detail = lastError;
  let recovery = '建议进入运行节点详情查看当前版本、目标版本和最近应用记录，再决定是否重新下发目标版本。';
  if (/artifact download failed:\s*404/i.test(lastError)) {
    title = '制品下载失败（404）';
    detail = '目标版本对应的制品对象不存在，或下载 URL 已失效。';
    recovery = '建议重新下发当前目标版本，并检查当前下发模式对应的 release 制品是否可被 runtime 正常访问。';
  } else if (/artifact download failed:\s*401|403/i.test(lastError)) {
    title = '制品下载鉴权失败';
    detail = '运行节点拉取制品时没有拿到有效的下载授权。';
    recovery = '建议检查当前下发模式的鉴权配置，例如 MinIO 预签名、admin_http_signed 签名 URL 或相关对象访问权限。';
  } else if (/runtime_control_empty/i.test(lastError)) {
    title = '控制面未下发目标版本';
    detail = '当前节点没有拿到目标版本或对应制品元数据。';
    recovery = '建议先在版本发布中把目标版本下发到运行节点。';
  }

  const lastApplyStatus = String(item.lastApplyStatus || '').trim();
  const status = String(item.status || '').trim();
  const desiredVersion = String(item.desiredVersion || '').trim();
  const currentVersion = String(item.currentVersion || '').trim();
  const aligned = Boolean(desiredVersion) && desiredVersion === currentVersion;
  const activeFailure = ['failed', 'rolled_back'].includes(lastApplyStatus);
  const pendingOffline = status === 'offline' && Boolean(desiredVersion) && currentVersion !== desiredVersion;
  const recovered = !activeFailure && (lastApplyStatus === 'success' || aligned);

  if (recovered) {
    return {
      lifecycle: 'recovered',
      status: 'recovered',
      title: `历史异常：${title}`,
      detail: `节点当前已恢复到正常状态，保留最近错误仅用于追溯。${detail}`,
      recovery: '如需继续观察，可等待下一次成功应用或新心跳覆盖该历史错误记录。',
    };
  }
  if (activeFailure || pendingOffline) {
    return {
      lifecycle: 'active',
      status: 'failed',
      title,
      detail,
      recovery,
    };
  }
  return {
    lifecycle: 'warning',
    status: 'warning',
    title,
    detail,
    recovery,
  };
}

/**
 * 功能：把 runtime 异常生命周期映射为统一排序权重。
 * 输入：runtime 异常摘要对象。
 * 输出：用于排序的数字权重，数值越小优先级越高。
 */
function runtimeIssueRank(issue = {}) {
  const lifecycle = String((issue || {}).lifecycle || '').trim();
  if (lifecycle === 'active') {
    return 0;
  }
  if (lifecycle === 'warning') {
    return 1;
  }
  if (lifecycle === 'recovered') {
    return 2;
  }
  return 3;
}

/**
 * 功能：汇总 runtime 节点列表中的异常生命周期分布。
 * 输入：包含 `issue` 字段的 runtime 节点数组。
 * 输出：异常分布摘要对象。
 */
function buildRuntimeIssueSummary(items = []) {
  const summary = {
    activeCount: 0,
    warningCount: 0,
    recoveredCount: 0,
    healthyCount: 0,
    notRegisteredCount: 0,
    disabledRegistryCount: 0,
    orphanRuntimeCount: 0,
  };
  for (const item of items || []) {
    if ((((item || {}).registry) || {}).enabled === false) {
      summary.disabledRegistryCount += 1;
    }
    if (String((item || {}).registrationStatus || '').trim() === 'not_registered') {
      summary.notRegisteredCount += 1;
      continue;
    }
    const lifecycle = String(((((item || {}).issues) || {}).current || ((item || {}).issue) || {}).lifecycle || '').trim();
    if (lifecycle === 'active') {
      summary.activeCount += 1;
      continue;
    }
    if (lifecycle === 'warning') {
      summary.warningCount += 1;
      continue;
    }
    if (lifecycle === 'recovered') {
      summary.recoveredCount += 1;
      continue;
    }
    summary.healthyCount += 1;
  }
  return summary;
}

/**
 * 功能：汇总运行节点列表页使用的卡片统计。
 * 输入：运行节点数组和未备案接入事件数量。
 * 输出：运行节点摘要对象。
 */
function buildRuntimeNodeListSummary(items = [], orphanRuntimeCount = 0) {
  const issueSummary = buildRuntimeIssueSummary(items);
  return {
    totalCount: Number((items || []).length || 0),
    disabledRegistryCount: Number(issueSummary.disabledRegistryCount || 0),
    notRegisteredCount: Number(issueSummary.notRegisteredCount || 0),
    onlineCount: (items || []).filter((item) => String((((item || {}).realtime) || {}).status || item.status || '').trim() === 'online').length,
    offlineCount: (items || []).filter((item) => String((((item || {}).realtime) || {}).status || item.status || '').trim() === 'offline').length,
    activeIssueCount: Number(issueSummary.activeCount || 0),
    orphanRuntimeCount: Number(orphanRuntimeCount || 0),
  };
}

/**
 * 功能：把备案节点与实时节点合并为运行治理域统一读模型。
 * 输入：备案节点、实时节点和当前控制状态。
 * 输出：运行治理节点对象。
 */
function buildRuntimeGovernanceNode(registryItem, liveItem, control = null) {
  const desiredVersion = String((liveItem && liveItem.desiredVersion) || (control && control.desiredVersion) || '').trim();
  const currentVersion = String((liveItem && liveItem.currentVersion) || '').trim();
  const issue = liveItem ? summarizeRuntimeIssue({ ...liveItem, desiredVersion }) : null;
  const currentIssue = issue && ['active', 'warning'].includes(String(issue.lifecycle || '').trim()) ? issue : null;
  const historyIssue = issue && String(issue.lifecycle || '').trim() === 'recovered' ? issue : null;
  let alignmentStatus = 'not_targeted';
  let alignmentLabel = '尚未下发';
  if (!liveItem) {
    alignmentStatus = 'not_registered';
    alignmentLabel = '未注册';
  } else if (desiredVersion && !currentVersion) {
    alignmentStatus = 'pending_install';
    alignmentLabel = '待安装';
  } else if (desiredVersion && currentVersion === desiredVersion) {
    alignmentStatus = 'aligned';
    alignmentLabel = '已对齐';
  } else if (desiredVersion) {
    alignmentStatus = 'pending';
    alignmentLabel = '待收敛';
  }
  return {
    nodeId: registryItem.nodeId,
    nodeName: registryItem.nodeName,
    env: registryItem.env,
    address: registryItem.address,
    registry: {
      enabled: registryItem.enabled,
      status: registryItem.enabled ? 'enabled' : 'disabled',
      label: registryItem.enabled ? '备案已启用' : '备案已禁用',
      updatedAt: registryItem.updatedAt,
      remarks: registryItem.remarks,
      secretFingerprint: registryItem.secretFingerprint,
    },
    registration: {
      status: liveItem ? 'registered' : 'not_registered',
      label: liveItem ? '已注册' : '未注册',
      detail: liveItem
        ? 'admin 已收到注册与心跳。'
        : (registryItem.enabled ? 'admin 尚未收到成功注册或心跳。' : '当前备案已禁用，因此不应继续注册。'),
      lastRegisterAt: liveItem ? liveItem.lastRegisterAt : null,
    },
    realtime: {
      status: liveItem ? liveItem.status : 'not_registered',
      statusReason: liveItem ? liveItem.statusReason : 'not_registered',
      runtimeVersion: liveItem ? liveItem.runtimeVersion : '',
      lastHeartbeatAt: liveItem ? liveItem.lastHeartbeatAt : null,
      heartbeatAgeSeconds: liveItem ? liveItem.heartbeatAgeSeconds : null,
      offlineThresholdSeconds: liveItem ? liveItem.offlineThresholdSeconds : 0,
    },
    target: {
      desiredVersion,
      currentVersion,
      alignmentStatus,
      alignmentLabel,
    },
    recentAction: {
      lastApplyStatus: liveItem ? liveItem.lastApplyStatus : '',
      lastApplyAt: liveItem ? liveItem.lastApplyAt : null,
    },
    issues: {
      current: currentIssue,
      history: historyIssue,
      lastError: liveItem ? String(liveItem.lastError || '').trim() : '',
    },
    requestSummary: {
      requestCount24h: 0,
      hitTermCount24h: 0,
    },
    peak: {
      peakConcurrency: 0,
      peakAt: null,
      updatedAt: null,
    },
    updatedAt: liveItem ? liveItem.updatedAt : registryItem.updatedAt,
    runtimeStatsCursor: liveItem ? liveItem.runtimeStatsCursor : '',
    isRegistryOnly: liveItem == null,

    // Legacy flattened fields retained during R1 收口，避免一次性打碎旧页面渲染。
    registrationStatus: liveItem ? 'registered' : 'not_registered',
    registrationLabel: liveItem ? '已注册' : '未注册',
    registryEnabled: registryItem.enabled,
    status: liveItem ? liveItem.status : 'not_registered',
    statusReason: liveItem ? liveItem.statusReason : 'not_registered',
    runtimeVersion: liveItem ? liveItem.runtimeVersion : '',
    currentVersion,
    desiredVersion,
    lastHeartbeatAt: liveItem ? liveItem.lastHeartbeatAt : null,
    heartbeatAgeSeconds: liveItem ? liveItem.heartbeatAgeSeconds : null,
    offlineThresholdSeconds: liveItem ? liveItem.offlineThresholdSeconds : 0,
    lastApplyAt: liveItem ? liveItem.lastApplyAt : null,
    lastApplyStatus: liveItem ? liveItem.lastApplyStatus : '',
    lastError: liveItem ? liveItem.lastError : '',
    issue: currentIssue || historyIssue || {
      lifecycle: 'none',
      status: 'healthy',
      title: '当前无异常',
      detail: '',
      recovery: '',
    },
  };
}

/**
 * 功能：把未备案但仍在上报的 runtime 节点转换为异常接入事件。
 * 输入：实时节点和当前控制状态。
 * 输出：未备案 runtime 事件对象。
 */
function buildOrphanRuntimeEvent(liveItem, control = null) {
  const desiredVersion = String((liveItem && liveItem.desiredVersion) || (control && control.desiredVersion) || '').trim();
  return {
    nodeId: liveItem.nodeId,
    nodeName: liveItem.nodeName,
    env: liveItem.env,
    address: liveItem.address,
    status: liveItem.status,
    currentVersion: liveItem.currentVersion,
    desiredVersion,
    lastHeartbeatAt: liveItem.lastHeartbeatAt,
    lastApplyStatus: liveItem.lastApplyStatus,
    issue: summarizeRuntimeIssue({ ...liveItem, desiredVersion }),
  };
}

/**
 * 功能：返回控制台 runtime 节点分页列表。
 * 输入：数据库连接、应用配置和过滤条件。
 * 输出：包含分页信息、节点摘要和异常摘要的分页结果对象。
 */
function listConsoleRuntimeNodes(db, appConfig, filters = {}) {
  const pageSize = Math.max(1, Math.min(100, Number(filters.pageSize || 20)));
  const page = Math.max(1, Number(filters.page || 1));
  const registry = listRuntimeNodeRegistry(db, {
    enabled: '',
    env: filters.env || '',
    limit: 1000,
    offset: 0,
  });
  const liveNodes = listRuntimeNodes(db, {
    status: '',
    env: filters.env || '',
    limit: 1000,
    offset: 0,
  }, appConfig);
  const control = getRuntimeControlState(db);
  const liveMap = new Map((liveNodes.items || []).map((item) => [item.nodeId, item]));
  const mergedItems = (registry.items || []).map((registryItem) => buildRuntimeGovernanceNode(
    registryItem,
    liveMap.get(registryItem.nodeId) || null,
    control,
  ));
  const orphanRuntimeEvents = (liveNodes.items || [])
    .filter((liveItem) => !getRuntimeNodeRegistryItem(db, liveItem.nodeId))
    .map((liveItem) => buildOrphanRuntimeEvent(liveItem, control))
    .sort((left, right) => String(right.lastHeartbeatAt || right.nodeId).localeCompare(String(left.lastHeartbeatAt || left.nodeId)));

  const filteredItems = mergedItems.filter((item) => {
    const statusFilter = String(filters.status || '').trim();
    if (statusFilter && String((item.realtime || {}).status || item.status || '').trim() !== statusFilter) {
      return false;
    }
    if (filters.env && String(item.env || '').trim() !== String(filters.env || '').trim()) {
      return false;
    }
    return true;
  });

  const nodeIds = filteredItems.filter((item) => !item.isRegistryOnly).map((item) => item.nodeId);
  const requestMap = runtimeNodeRequestSummaryMap(db, nodeIds);
  const peakMap = runtimeNodePeakMap(db, nodeIds);
  const normalizedItems = filteredItems.map((item) => ({
    ...item,
    requestSummary: requestMap.get(item.nodeId) || item.requestSummary,
    peak: peakMap.get(item.nodeId) || item.peak,
  })).sort((left, right) => {
    const registryRankLeft = left.registry && left.registry.enabled === false ? 1 : 0;
    const registryRankRight = right.registry && right.registry.enabled === false ? 1 : 0;
    if (registryRankLeft !== registryRankRight) {
      return registryRankLeft - registryRankRight;
    }
    const registrationRankLeft = left.registrationStatus === 'not_registered' ? 0 : 1;
    const registrationRankRight = right.registrationStatus === 'not_registered' ? 0 : 1;
    if (registrationRankLeft !== registrationRankRight) {
      return registrationRankLeft - registrationRankRight;
    }
    const rankDiff = runtimeIssueRank((left.issues || {}).current || left.issue) - runtimeIssueRank((right.issues || {}).current || right.issue);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return String(right.updatedAt || right.lastApplyAt || right.lastHeartbeatAt || '').localeCompare(
      String(left.updatedAt || left.lastApplyAt || left.lastHeartbeatAt || ''),
    );
  });
  const summary = buildRuntimeNodeListSummary(mergedItems, orphanRuntimeEvents.length);
  const filteredSummary = buildRuntimeNodeListSummary(normalizedItems, orphanRuntimeEvents.length);
  return {
    items: normalizedItems.slice((page - 1) * pageSize, page * pageSize),
    issueSummary: {
      ...buildRuntimeIssueSummary(normalizedItems),
      orphanRuntimeCount: orphanRuntimeEvents.length,
    },
    summary,
    filteredSummary,
    orphanRuntimeCount: orphanRuntimeEvents.length,
    orphanRuntimeEvents,
    page,
    pageSize,
    total: Number(normalizedItems.length || 0),
  };
}

/**
 * 功能：返回控制台 runtime 节点详情。
 * 输入：数据库连接、应用配置和节点 ID。
 * 输出：包含基础信息、异常摘要和统计数据的节点详情对象。
 */
function getConsoleRuntimeNodeDetail(db, appConfig, nodeId) {
  const liveItem = getRuntimeNode(db, nodeId, appConfig);
  const registryItem = getRuntimeNodeRegistryItem(db, nodeId);
  if (!registryItem) {
    return null;
  }
  const controlState = getRuntimeControlState(db);
  if (!liveItem && registryItem) {
    const merged = buildRuntimeGovernanceNode(registryItem, null, controlState);
    return {
      basic: {
        nodeId: merged.nodeId,
        nodeName: merged.nodeName,
        env: merged.env,
        address: merged.address,
        status: merged.realtime.status,
        statusReason: merged.realtime.statusReason,
        runtimeVersion: merged.realtime.runtimeVersion,
        currentVersion: merged.target.currentVersion,
        desiredVersion: merged.target.desiredVersion,
        lastHeartbeatAt: merged.realtime.lastHeartbeatAt,
        heartbeatAgeSeconds: merged.realtime.heartbeatAgeSeconds,
        offlineThresholdSeconds: merged.realtime.offlineThresholdSeconds,
        lastApplyAt: merged.recentAction.lastApplyAt,
        lastApplyStatus: merged.recentAction.lastApplyStatus,
        lastError: merged.issues.lastError,
        runtimeStatsCursor: merged.runtimeStatsCursor,
        updatedAt: merged.updatedAt,
      },
      registry: merged.registry,
      registration: merged.registration,
      realtime: merged.realtime,
      target: merged.target,
      recentAction: merged.recentAction,
      issues: merged.issues,
      issue: {
        lifecycle: 'warning',
        status: 'warning',
        title: '节点尚未注册',
        detail: '该节点已备案，但 admin 还没有收到成功的注册或心跳。',
        recovery: '请先核对节点启动命令中的 nodeId、nodeAddress、registrationSecret，以及当前 admin 是否启用了 runtime token。',
      },
      control: controlState,
      requestSummary: {
        requestCount24h: 0,
        hitTermCount24h: 0,
      },
      peak: {
        peakConcurrency: 0,
        peakAt: null,
        updatedAt: null,
      },
      hourly: [],
      topTerms: [],
      isRegistryOnly: true,
    };
  }
  const item = liveItem;
  const requestSummary = runtimeNodeRequestSummaryMap(db, [nodeId]).get(nodeId) || {
    requestCount24h: 0,
    hitTermCount24h: 0,
  };
  const peak = runtimeNodePeakMap(db, [nodeId]).get(nodeId) || {
    peakConcurrency: 0,
    peakAt: null,
    updatedAt: null,
  };
  const hourly = db.prepare(`
    SELECT *
    FROM runtime_node_hourly_stats
    WHERE node_id = ?
    ORDER BY hour_key DESC
    LIMIT 24
  `).all(nodeId).reverse().map((row) => ({
    hourKey: row.hour_key,
    requestCount: Number(row.request_count || 0),
    httpRequestCount: Number(row.http_request_count || 0),
    wsRequestCount: Number(row.ws_request_count || 0),
    hitTermCount: Number(row.hit_term_count || 0),
    updatedAt: row.updated_at,
  }));
  const topTerms = db.prepare(`
    SELECT canonical_text, SUM(hit_count) AS total_hit_count
    FROM runtime_node_hourly_terms
    WHERE node_id = ?
    GROUP BY canonical_text
    ORDER BY total_hit_count DESC, canonical_text ASC
    LIMIT 10
  `).all(nodeId).map((row) => ({
    canonicalText: row.canonical_text,
    hitCount: Number(row.total_hit_count || 0),
  }));
  let control = controlState;
  if (controlState) {
    try {
      const refreshedControlView = getRuntimeControlViewForNode(db, nodeId, appConfig);
      if (refreshedControlView) {
        control = {
          ...controlState,
          desiredVersion: refreshedControlView.desiredVersion,
          configVersion: refreshedControlView.configVersion,
          issuedAt: refreshedControlView.issuedAt,
          artifactMetadata: refreshedControlView.artifactMetadata || controlState.artifactMetadata,
        };
      }
    } catch {}
  }
  const merged = buildRuntimeGovernanceNode(registryItem, item, control);
  return {
    basic: {
      nodeId: merged.nodeId,
      nodeName: merged.nodeName,
      env: merged.env,
      address: merged.address,
      status: merged.realtime.status,
      statusReason: merged.realtime.statusReason,
      runtimeVersion: merged.realtime.runtimeVersion,
      currentVersion: merged.target.currentVersion,
      desiredVersion: merged.target.desiredVersion,
      lastHeartbeatAt: merged.realtime.lastHeartbeatAt,
      heartbeatAgeSeconds: merged.realtime.heartbeatAgeSeconds,
      offlineThresholdSeconds: merged.realtime.offlineThresholdSeconds,
      lastApplyAt: merged.recentAction.lastApplyAt,
      lastApplyStatus: merged.recentAction.lastApplyStatus,
      lastError: merged.issues.lastError,
      runtimeStatsCursor: merged.runtimeStatsCursor,
      updatedAt: merged.updatedAt,
    },
    registry: merged.registry,
    registration: merged.registration,
    realtime: merged.realtime,
    target: merged.target,
    recentAction: merged.recentAction,
    issues: merged.issues,
    issue: merged.issues.current || merged.issues.history || {
      lifecycle: 'none',
      status: 'healthy',
      title: '当前无异常',
      detail: '',
      recovery: '',
    },
    control: control ? {
      releaseId: control.releaseId,
      desiredVersion: control.desiredVersion,
      issuedAt: control.issuedAt,
      configVersion: control.configVersion,
      artifactMetadata: control.artifactMetadata,
    } : null,
    requestSummary,
    peak,
    hourly,
    topTerms,
    isRegistryOnly: false,
  };
}

/**
 * 功能：根据当前 release rollout 状态生成下一步引导摘要。
 * 输入：当前 control 状态、选中的 release 和 rollout 汇总。
 * 输出：包含状态、标题、说明和入口的引导对象。
 */
function buildRuntimeRolloutGuidance(control = null, selectedRelease = null, summary = {}) {
  const normalizedReleaseId = String((selectedRelease || {}).releaseId || '').trim();
  const currentControlReleaseId = String((control || {}).releaseId || '').trim();
  const totalNodes = Number((summary || {}).totalNodes || 0);
  const failedNodes = Number((summary || {}).failedNodes || 0);
  const pendingNodes = Number((summary || {}).pendingNodes || 0);
  const offlineNodes = Number((summary || {}).offlineNodes || 0);
  const untouchedNodes = Number((summary || {}).untouchedNodes || 0);
  const alignedNodes = Number((summary || {}).alignedNodes || 0);

  if (!totalNodes) {
    return {
      status: 'warning',
      title: '当前还没有运行节点',
      description: '没有可观察的节点收敛结果，建议先确认运行节点是否已注册并持续上报心跳。',
      href: '/console/runtime-nodes',
      actionLabel: '查看运行节点',
    };
  }
  if (!normalizedReleaseId || currentControlReleaseId !== normalizedReleaseId) {
    return {
      status: 'warning',
      title: '当前版本尚未下发',
      description: `当前仍有 ${untouchedNodes} 个节点没有把这个版本作为目标版本，建议先完成下发，再继续看节点收敛。`,
      href: normalizedReleaseId ? `/console/releases/${encodeURIComponent(normalizedReleaseId)}` : '/console/releases',
      actionLabel: normalizedReleaseId ? '返回当前版本详情' : '查看版本列表',
    };
  }
  if (failedNodes > 0) {
    return {
      status: 'blocked',
      title: '先处理应用失败节点',
      description: `当前有 ${failedNodes} 个节点应用失败或已回滚。请先处理这些节点，再判断本次下发是否已稳定收敛。`,
      href: '/console/runtime-nodes',
      actionLabel: '处理失败节点',
    };
  }
  if (pendingNodes > 0) {
    return {
      status: 'warning',
      title: '节点仍在继续收敛',
      description: `当前有 ${pendingNodes} 个节点还没有切到目标版本。建议继续观察最近应用结果和目标版本对齐情况。`,
      href: '/console/runtime-nodes',
      actionLabel: '查看收敛节点',
    };
  }
  if (offlineNodes > 0) {
    return {
      status: 'warning',
      title: '节点已对齐，但仍有离线节点',
      description: `当前已有 ${alignedNodes} 个节点对齐目标版本，但仍有 ${offlineNodes} 个节点离线，建议补看心跳与恢复情况。`,
      href: '/console/runtime-nodes',
      actionLabel: '查看离线节点',
    };
  }
  return {
    status: 'success',
    title: '当前版本已完成节点收敛',
    description: `当前 ${alignedNodes} 个节点都已对齐到目标版本，可以继续结合验证结果和运行证据做最终确认。`,
    href: '/console/runtime-nodes',
    actionLabel: '查看节点详情',
  };
}

/**
 * 功能：把 runtime 节点对象转换为 rollout 区块需要的最小展示项。
 * 输入：runtime node 对象、目标版本字符串和当前 control 状态。
 * 输出：带目标版本标记的 rollout 节点展示对象。
 */
function buildConsoleRuntimeRolloutItem(item = {}, targetVersion = '', control = null) {
  const normalizedTargetVersion = String(targetVersion || '').trim();
  return {
    nodeId: item.nodeId,
    nodeName: item.nodeName,
    env: item.env,
    status: item.status,
    currentVersion: item.currentVersion,
    desiredVersion: item.desiredVersion || (control ? control.desiredVersion : ''),
    lastApplyStatus: item.lastApplyStatus,
    lastApplyAt: item.lastApplyAt,
    lastError: item.lastError,
    updatedAt: item.updatedAt,
    matchesTargetVersion: normalizedTargetVersion ? String(item.currentVersion || '').trim() === normalizedTargetVersion : false,
    targetsSelectedVersion: normalizedTargetVersion ? String(item.desiredVersion || '').trim() === normalizedTargetVersion : false,
  };
}

/**
 * 功能：构造控制台侧的 runtime rollout 读视图。
 * 输入：数据库连接、应用配置和过滤参数。
 * 输出：包含当前 control 状态、目标 release 和节点收敛摘要的对象。
 */
function getConsoleRuntimeRollout(db, appConfig, filters = {}) {
  const releaseId = String(filters.releaseId || '').trim();
  const control = filters.control || getRuntimeControlState(db);
  const selectedRelease = filters.selectedRelease || (
    releaseId
      ? getRelease(db, releaseId)
      : (control && control.releaseId ? getRelease(db, control.releaseId) : null)
  );
  const targetVersion = selectedRelease
    ? selectedRelease.version
    : (control ? control.desiredVersion : '');
  const summary = summarizeRuntimeNodesForTargetVersion(db, targetVersion, appConfig);
  const rolloutItems = listRuntimeRolloutAttentionNodes(db, targetVersion, { limit: 10 }, appConfig)
    .map((item) => buildConsoleRuntimeRolloutItem(item, targetVersion, control));

  return {
    control: control ? {
      releaseId: control.releaseId,
      desiredVersion: control.desiredVersion,
      issuedAt: control.issuedAt,
      configVersion: control.configVersion,
      artifactMetadata: control.artifactMetadata,
    } : null,
    selectedRelease: selectedRelease ? {
      releaseId: selectedRelease.releaseId,
      version: selectedRelease.version,
      status: selectedRelease.status,
      summary: selectedRelease.summary,
      createdAt: selectedRelease.createdAt,
      publishedAt: selectedRelease.publishedAt,
    } : null,
    summary,
    guidance: buildRuntimeRolloutGuidance(control, selectedRelease, summary),
    items: rolloutItems,
  };
}

/**
 * 功能：安全读取 JSON 文件，读取失败时返回 `null`。
 * 输入：文件绝对路径。
 * 输出：解析后的 JSON 对象；失败时返回 `null`。
 */
function readJsonFileSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

/**
 * 功能：读取 runtime control 验证报告目录状态，用于列表缓存命中。
 * 输入：应用配置对象。
 * 输出：包含缓存键和报告摘要文件描述的对象。
 */
function runtimeControlVerificationReportState(appConfig = {}) {
  const hostVerificationDir = (((appConfig || {}).resolvedPaths || {}).hostVerificationDir) || '';
  if (!hostVerificationDir || !fs.existsSync(hostVerificationDir)) {
    return {
      cacheKey: `${hostVerificationDir}|missing`,
      descriptors: [],
    };
  }
  const descriptors = fs.readdirSync(hostVerificationDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('_runtime_control_verify_'))
    .map((entry) => {
      const reportDir = path.join(hostVerificationDir, entry.name);
      const summaryPath = path.join(reportDir, 'summary.json');
      if (!fs.existsSync(summaryPath)) {
        return null;
      }
      const stat = fs.statSync(summaryPath);
      return {
        reportId: entry.name,
        reportDir,
        summaryPath,
        cacheToken: `${entry.name}:${stat.size}:${Math.floor(stat.mtimeMs)}`,
      };
    })
    .filter(Boolean)
    .sort((left, right) => String(left.reportId || '').localeCompare(String(right.reportId || '')));
  return {
    cacheKey: `${hostVerificationDir}|${descriptors.map((item) => item.cacheToken).join('|')}`,
    descriptors,
  };
}

/**
 * 功能：写入 runtime control 验证报告列表缓存，并控制缓存规模。
 * 输入：缓存键和报告摘要数组。
 * 输出：当前报告摘要数组。
 */
function cacheRuntimeControlVerificationReports(cacheKey = '', items = []) {
  if (!cacheKey) {
    return items;
  }
  RUNTIME_CONTROL_VERIFICATION_REPORT_CACHE.set(cacheKey, items);
  if (RUNTIME_CONTROL_VERIFICATION_REPORT_CACHE.size > 20) {
    const oldestKey = RUNTIME_CONTROL_VERIFICATION_REPORT_CACHE.keys().next().value;
    if (oldestKey) {
      RUNTIME_CONTROL_VERIFICATION_REPORT_CACHE.delete(oldestKey);
    }
  }
  return items;
}

/**
 * 功能：收集本地 runtime control 验证报告。
 * 输入：应用配置对象。
 * 输出：验证报告摘要数组。
 */
function listRuntimeControlVerificationReports(appConfig = {}) {
  const { cacheKey, descriptors } = runtimeControlVerificationReportState(appConfig);
  if (!descriptors.length) {
    return [];
  }
  const cached = RUNTIME_CONTROL_VERIFICATION_REPORT_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }
  return cacheRuntimeControlVerificationReports(cacheKey, descriptors
    .map((descriptor) => {
      const summary = readJsonFileSafe(descriptor.summaryPath);
      if (!summary) {
        return null;
      }
      const release = summary.release || {};
      const nodeDetail = summary.nodeDetail || {};
      const basic = nodeDetail.basic || {};
      return {
        reportId: String(summary.reportId || descriptor.reportId || '').trim(),
        reportDir: descriptor.reportDir,
        reportFile: descriptor.summaryPath,
        mode: String(summary.mode || '').trim(),
        ok: summary.ok === true,
        blocked: summary.blocked === true,
        startedAt: summary.startedAt || '',
        endedAt: summary.endedAt || '',
        releaseId: String(release.releaseId || '').trim(),
        releaseVersion: String(release.version || '').trim(),
        nodeId: String(summary.nodeId || '').trim(),
        correctedText: String(((summary.correction || {}).correctedText) || '').trim(),
        nodeStatus: String(basic.status || '').trim(),
        currentVersion: String(basic.currentVersion || '').trim(),
        lastApplyStatus: String(basic.lastApplyStatus || '').trim(),
      };
    })
    .filter(Boolean)
    .sort((left, right) => String(right.startedAt || right.endedAt || '').localeCompare(String(left.startedAt || left.endedAt || ''))));
}

/**
 * 功能：按 reportId 读取单个 runtime control 验证报告详情。
 * 输入：应用配置对象、reportId。
 * 输出：验证报告对象；不存在时返回 `null`。
 */
function getRuntimeControlVerificationReport(appConfig = {}, reportId = '') {
  const normalizedReportId = String(reportId || '').trim();
  if (!normalizedReportId) {
    return null;
  }
  const hostVerificationDir = (((appConfig || {}).resolvedPaths || {}).hostVerificationDir) || '';
  if (!hostVerificationDir) {
    return null;
  }
  const summaryPath = path.join(hostVerificationDir, normalizedReportId, 'summary.json');
  if (!fs.existsSync(summaryPath)) {
    return null;
  }
  return readJsonFileSafe(summaryPath);
}

/**
 * 功能：按 release 过滤本地 runtime control 验证报告。
 * 输入：应用配置对象和 release 对象。
 * 输出：当前 release 对应的验证报告摘要数组。
 */
function listRuntimeControlEvidenceForRelease(appConfig = {}, release = null) {
  if (!release) {
    return [];
  }
  const releaseId = String(release.releaseId || '').trim();
  const releaseVersion = String(release.version || '').trim();
  return listRuntimeControlVerificationReports(appConfig).filter((item) => (
    (releaseId && item.releaseId === releaseId)
    || (releaseVersion && item.releaseVersion === releaseVersion)
  ));
}

/**
 * 功能：把单个 release gate 明细项转换为控制台友好的展示对象。
 * 输入：原始 blocker 明细对象和 blocker 编码。
 * 输出：包含标题、说明、跳转入口和技术详情的 blocker 明细对象。
 */
function buildConsoleReleaseGateBlockerItem(item = {}, blockerCode = '') {
  const normalizedBlockerCode = String(blockerCode || item.blockerCode || '').trim();
  const canonicalText = String(item.canonicalText || '').trim();
  const caseId = String(item.caseId || '').trim();
  const termId = String(item.termId || '').trim();
  const taskId = String(item.taskId || '').trim();
  const fullPinyinNoTone = String(item.fullPinyinNoTone || '').trim();
  const status = String(item.status || '').trim();
  const snapshotPath = String(item.snapshotPath || '').trim();
  const error = String(item.error || '').trim();
  let title = canonicalText || caseId || consoleDisplayLabelOrFallback(normalizedBlockerCode, '发布阻断项');
  let detail = '系统已记录该阻断项，建议进入相关页面继续处理。';
  let href = '';

  if (termId) {
    href = `/console/dictionary/terms/${encodeURIComponent(termId)}`;
  } else if (caseId) {
    href = `/console/validation/cases/${encodeURIComponent(caseId)}`;
  }

  if (normalizedBlockerCode === 'release_term_status_invalid') {
    title = canonicalText || '词条状态不满足发布条件';
    detail = status
      ? `当前词条状态为“${consoleDisplayLabelOrFallback(status, status)}”，还不能进入发布版本。`
      : '当前词条还没有进入可发布状态，需先处理词条状态。';
  } else if (normalizedBlockerCode === 'pending_term_review') {
    title = canonicalText || '存在待审核词条';
    detail = '该词条当前还有待审核任务，需先完成审核后再继续发布。';
  } else if (normalizedBlockerCode === 'pending_pinyin_candidate_review') {
    title = canonicalText || (fullPinyinNoTone || '存在待审核拼音候选');
    detail = fullPinyinNoTone
      ? `拼音候选“${fullPinyinNoTone}”仍待审核，需先完成审核后再继续发布。`
      : '当前还有待审核拼音候选，需先完成审核。';
  } else if (normalizedBlockerCode === 'release_snapshot_missing') {
    title = '版本快照缺失';
    detail = '当前版本缺少可读取的快照文件，无法继续完成发布验证。';
  } else if (normalizedBlockerCode === 'release_snapshot_load_failed') {
    title = '版本快照加载失败';
    detail = '当前版本快照无法正常加载，建议先检查快照文件是否完整可读。';
  } else if (normalizedBlockerCode === 'release_not_found') {
    title = '版本不存在';
    detail = '当前版本记录不存在或已失效，建议返回版本列表重新确认版本状态。';
  } else if (normalizedBlockerCode === 'release_validation_smoke_failed') {
    title = canonicalText || '词条冒烟验证失败';
    detail = '当前冒烟验证没有命中目标词条，建议检查 alias、规则和快照内容。';
  } else if (normalizedBlockerCode === 'release_validation_business_sample_failed') {
    title = caseId || '业务样本验证失败';
    detail = '当前业务样本没有命中期望标准词，建议先检查样本、词条和快照版本。';
  }

  const technicalDetails = {};
  if (taskId) {
    technicalDetails.taskId = taskId;
  }
  if (status) {
    technicalDetails.status = status;
  }
  if (fullPinyinNoTone) {
    technicalDetails.fullPinyinNoTone = fullPinyinNoTone;
  }
  if (snapshotPath) {
    technicalDetails.snapshotPath = snapshotPath;
  }
  if (error) {
    technicalDetails.error = error;
  }
  if (item.releaseId) {
    technicalDetails.releaseId = String(item.releaseId || '').trim();
  }
  if (Array.isArray(item.expectedCanonicals) && item.expectedCanonicals.length) {
    technicalDetails.expectedCanonicals = item.expectedCanonicals;
  }
  if (Array.isArray(item.missingCanonicals) && item.missingCanonicals.length) {
    technicalDetails.missingCanonicals = item.missingCanonicals;
  }
  if (Array.isArray(item.hitCanonicals) && item.hitCanonicals.length) {
    technicalDetails.hitCanonicals = item.hitCanonicals;
  }

  return {
    ...item,
    blockerCode: normalizedBlockerCode,
    title,
    detail,
    href,
    technicalDetails: Object.keys(technicalDetails).length ? technicalDetails : null,
  };
}

/**
 * 功能：把 release gate blocker 列表转换为控制台友好的展示对象。
 * 输入：原始 gate blocker 数组。
 * 输出：包含中文标题和已格式化明细项的 blocker 数组。
 */
function buildConsoleReleaseGateBlockers(blockers = []) {
  return (blockers || []).map((entry) => ({
    ...entry,
    title: consoleDisplayLabelOrFallback(entry.code, '发布阻断项'),
    items: (entry.items || []).map((item) => buildConsoleReleaseGateBlockerItem(item, entry.code)),
  }));
}

/**
 * 功能：把单个 release validation 结果转换为控制台友好的展示对象。
 * 输入：原始 validation 结果对象。
 * 输出：包含类型、原因、说明、跳转入口和技术详情的 validation 对象。
 */
function buildConsoleReleaseValidationCase(item = {}) {
  const caseType = String(item.caseType || '').trim();
  const caseId = String(item.caseId || '').trim();
  const canonicalText = String(item.canonicalText || '').trim();
  const termId = String(item.termId || '').trim();
  const reason = String(item.reason || '').trim();
  const sampleText = String(item.sampleText || '').trim();
  const description = String(item.description || '').trim();
  const validationMode = String(item.validationMode || '').trim();
  const channel = String(item.channel || '').trim();
  const action = String(item.action || '').trim();
  let resultDetail = '';

  if (caseType === 'term_smoke') {
    if (item.skipped) {
      resultDetail = '当前词条缺少可用的冒烟样本，本次按跳过处理。';
    } else if (item.passed) {
      resultDetail = '冒烟样本已命中当前词条，可继续结合业务样本确认。';
    } else {
      resultDetail = '冒烟样本未命中目标词条，建议检查 alias、规则和快照内容。';
    }
  } else if (caseType === 'business_sample') {
    if (item.passed) {
      resultDetail = '业务样本已命中期望标准词。';
    } else if (Array.isArray(item.missingCanonicals) && item.missingCanonicals.length) {
      resultDetail = `业务样本仍未命中：${item.missingCanonicals.join(' / ')}。`;
    } else {
      resultDetail = '业务样本未通过，建议检查样本文本与版本快照。';
    }
  } else if (reason) {
    resultDetail = consoleDisplayLabelOrFallback(reason, '验证未通过。');
  }

  const technicalDetails = {};
  if (sampleText) {
    technicalDetails.sampleText = sampleText;
  }
  if (description) {
    technicalDetails.description = description;
  }
  if (validationMode) {
    technicalDetails.validationMode = validationMode;
  }
  if (channel) {
    technicalDetails.channel = channel;
  }
  if (action) {
    technicalDetails.action = action;
  }
  if (Array.isArray(item.expectedCanonicals) && item.expectedCanonicals.length) {
    technicalDetails.expectedCanonicals = item.expectedCanonicals;
  }
  if (Array.isArray(item.missingCanonicals) && item.missingCanonicals.length) {
    technicalDetails.missingCanonicals = item.missingCanonicals;
  }
  if (Array.isArray(item.hitCanonicals) && item.hitCanonicals.length) {
    technicalDetails.hitCanonicals = item.hitCanonicals;
  }

  return {
    ...item,
    caseTypeLabel: consoleDisplayLabelOrFallback(caseType, '验证项'),
    targetLabel: canonicalText || caseId || '未标识验证项',
    targetHref: termId
      ? `/console/dictionary/terms/${encodeURIComponent(termId)}`
      : (caseId ? `/console/validation/cases/${encodeURIComponent(caseId)}` : ''),
    reasonLabel: reason
      ? consoleDisplayLabelOrFallback(reason, '验证未通过')
      : (item.skipped ? '已跳过' : (item.passed ? '验证通过' : '验证未通过')),
    resultDetail,
    technicalDetails: Object.keys(technicalDetails).length ? technicalDetails : null,
  };
}

/**
 * 功能：把 release gate 摘要转换为控制台使用的门禁区块对象。
 * 输入：原始 gate 摘要对象。
 * 输出：包含格式化 blocker 列表的门禁区块对象。
 */
function buildConsoleReleaseGateSection(gate = {}) {
  return {
    blocked: gate.blocked === true,
    blockerCount: Number(gate.blockerCount || 0),
    blockers: buildConsoleReleaseGateBlockers(gate.blockers),
  };
}

/**
 * 功能：把 release 快照校验结果收口为控制台“版本校验”区块。
 * 输入：release gate 摘要对象。
 * 输出：版本校验摘要对象。
 */
function buildConsoleReleaseCheck(gate = {}) {
  const validation = gate.validation || {};
  return {
    blocked: gate.blocked === true,
    blockerCount: Number(gate.blockerCount || 0),
    blockers: buildConsoleReleaseGateBlockers(gate.blockers),
    caseCount: Number(validation.caseCount || 0),
    failedCount: Number(validation.failedCount || 0),
  };
}

/**
 * 功能：把 release validation 摘要转换为控制台使用的验证区块对象。
 * 输入：原始 validation 摘要对象。
 * 输出：包含格式化 validation case 列表的验证区块对象。
 */
function buildConsoleReleaseValidationSection(validation = {}) {
  return {
    ...validation,
    cases: Array.isArray(validation.cases)
      ? validation.cases.map((entry) => buildConsoleReleaseValidationCase(entry))
      : [],
  };
}

/**
 * 功能：构造 release 详情页使用的发布确认摘要。
 * 输入：release 对象、gate 摘要和 rollout 摘要。
 * 输出：发布确认对象。
 */
function buildReleaseConfirmation(release = {}, releaseCheck = {}, rollout = {}) {
  const issues = [];
  const rolloutSummary = rollout.summary || {};
  const validation = releaseCheck.validation || {};
  const isCurrentDesiredRelease = String((((rollout || {}).control || {}).releaseId) || '') === String(release.releaseId || '');
  const isPublished = String(release.status || '').trim() === 'published';
  const checkTitlePrefix = isPublished ? '发布后风险' : '版本校验';

  if (!isCurrentDesiredRelease) {
    issues.push({
      code: 'not_issued',
      title: '尚未下发为目标版本',
      detail: '当前版本还没有被控制面设置为目标版本。',
      href: `/console/releases/${encodeURIComponent(release.releaseId || '')}`,
      severity: 'warning',
    });
  }
  if (releaseCheck.blocked) {
    issues.push({
      code: 'release_check_blocked',
      title: isPublished ? '存在发布后风险' : `${checkTitlePrefix}未通过`,
      detail: `当前存在 ${Number(releaseCheck.blockerCount || 0)} 个版本校验阻断项。`,
      href: `/console/releases/${encodeURIComponent(release.releaseId || '')}`,
      severity: 'blocked',
    });
  }
  if (Number(validation.failedCount || 0) > 0) {
    issues.push({
      code: 'validation_failed',
      title: '验证样本存在失败项',
      detail: `当前有 ${Number(validation.failedCount || 0)} 条验证未通过。`,
      href: `/console/releases/${encodeURIComponent(release.releaseId || '')}`,
      severity: 'blocked',
    });
  }
  if (Number(rolloutSummary.failedNodes || 0) > 0) {
    issues.push({
      code: 'rollout_failed',
      title: '存在应用失败节点',
      detail: `当前有 ${Number(rolloutSummary.failedNodes || 0)} 个节点应用失败或已回滚。`,
      href: '/console/runtime-nodes',
      severity: 'blocked',
    });
  }
  if (Number(rolloutSummary.pendingNodes || 0) > 0) {
    issues.push({
      code: 'rollout_pending',
      title: '节点仍在收敛中',
      detail: `当前有 ${Number(rolloutSummary.pendingNodes || 0)} 个节点尚未切到目标版本。`,
      href: '/console/runtime-nodes',
      severity: 'warning',
    });
  }
  if (Number(rolloutSummary.offlineNodes || 0) > 0) {
    issues.push({
      code: 'offline_nodes',
      title: '存在离线节点',
      detail: `当前有 ${Number(rolloutSummary.offlineNodes || 0)} 个节点离线。`,
      href: '/console/runtime-nodes',
      severity: 'warning',
    });
  }

  let status = 'success';
  if (!isCurrentDesiredRelease || Number(rolloutSummary.pendingNodes || 0) > 0 || Number(rolloutSummary.offlineNodes || 0) > 0) {
    status = 'warning';
  }
  if (releaseCheck.blocked || Number(validation.failedCount || 0) > 0 || Number(rolloutSummary.failedNodes || 0) > 0) {
    status = 'blocked';
  }

  return {
    status,
    isCurrentDesiredRelease,
    issueCount: issues.length,
    issues,
    summary: {
      checkBlocked: releaseCheck.blocked === true,
      checkBlockerCount: Number(releaseCheck.blockerCount || 0),
      validationCaseCount: Number(validation.caseCount || 0),
      validationSkippedCount: Number(validation.skippedSmokeCaseCount || 0),
      validationFailedCount: Number(validation.failedCount || 0),
      postPublishRiskCount: releaseCheck.blocked === true && isPublished ? Number(releaseCheck.blockerCount || 0) : 0,
      totalNodes: Number(rolloutSummary.totalNodes || 0),
      desiredNodes: Number(rolloutSummary.desiredNodes || 0),
      alignedNodes: Number(rolloutSummary.alignedNodes || 0),
      pendingNodes: Number(rolloutSummary.pendingNodes || 0),
      failedNodes: Number(rolloutSummary.failedNodes || 0),
      offlineNodes: Number(rolloutSummary.offlineNodes || 0),
      untouchedNodes: Number(rolloutSummary.untouchedNodes || 0),
      // Legacy aliases kept during R2 收口，避免旧页面和测试一次性断裂。
      gateBlocked: releaseCheck.blocked === true,
      gateBlockerCount: Number(releaseCheck.blockerCount || 0),
    },
  };
}

/**
 * 功能：为已发布 release 生成发布后风险摘要。
 * 输入：release 对象、版本校验结果和 rollout 汇总。
 * 输出：发布后风险摘要对象。
 */
function buildConsoleReleasePostPublishRisk(release = {}, releaseCheck = {}, rollout = {}) {
  if (String(release.status || '').trim() !== 'published') {
    return {
      active: false,
      blocked: false,
      issueCount: 0,
      blockedIssueCount: 0,
      issues: [],
      blockers: [],
    };
  }
  const rolloutSummary = rollout.summary || {};
  const issues = [];
  if (releaseCheck.blocked) {
    issues.push({
      code: 'release_check_failed',
      title: '版本校验未通过',
      detail: `当前仍有 ${Number(releaseCheck.blockerCount || 0)} 个版本校验阻断项。`,
      severity: 'blocked',
      href: `/console/releases/${encodeURIComponent(release.releaseId || '')}`,
    });
  }
  if (Number(rolloutSummary.failedNodes || 0) > 0) {
    issues.push({
      code: 'runtime_rollout_failed',
      title: '存在应用失败节点',
      detail: `当前有 ${Number(rolloutSummary.failedNodes || 0)} 个节点应用失败或已回滚。`,
      severity: 'blocked',
      href: '/console/runtime-nodes',
    });
  }
  if (Number(rolloutSummary.pendingNodes || 0) > 0) {
    issues.push({
      code: 'runtime_rollout_pending',
      title: '节点仍在继续收敛',
      detail: `当前有 ${Number(rolloutSummary.pendingNodes || 0)} 个节点还没有切到目标版本。`,
      severity: 'warning',
      href: '/console/runtime-nodes',
    });
  }
  if (Number(rolloutSummary.offlineNodes || 0) > 0) {
    issues.push({
      code: 'runtime_nodes_offline',
      title: '存在离线节点',
      detail: `当前有 ${Number(rolloutSummary.offlineNodes || 0)} 个节点离线。`,
      severity: 'warning',
      href: '/console/runtime-nodes',
    });
  }
  return {
    active: issues.length > 0,
    blocked: issues.some((entry) => entry.severity === 'blocked'),
    issueCount: issues.length,
    blockedIssueCount: issues.filter((entry) => entry.severity === 'blocked').length,
    issues,
    blockers: issues.map((entry) => ({
      code: entry.code,
      title: entry.title,
      count: 1,
      items: [{
        title: entry.title,
        detail: entry.detail,
        href: entry.href || '',
      }],
    })),
  };
}

/**
 * 功能：读取 release 发布与回滚历史。
 * 输入：数据库连接和 releaseId。
 * 输出：发布/回滚历史数组。
 */
function listConsoleReleaseHistory(db, releaseId) {
  return listAuditLogs(db, {
    targetType: 'release',
    targetId: releaseId,
    limit: 20,
  })
    .filter((item) => ['release.publish', 'release.rollback'].includes(String(item.operation || '').trim()))
    .map((item) => ({
      auditId: item.auditId,
      operation: item.operation,
      operationLabel: String(item.operation || '').trim() === 'release.rollback' ? '回滚' : '正式发布',
      operator: item.operator,
      createdAt: item.createdAt,
      beforeSnapshot: item.beforeSnapshot,
      afterSnapshot: item.afterSnapshot,
    }));
}

/**
 * 功能：读取并格式化控制台 release 门禁摘要。
 * 输入：数据库连接、releaseId，以及可选的预读取 release/releaseTerms 数据。
 * 输出：格式化后的 gate 与 validation 区块对象；找不到 release 时返回 `null`。
 */
function getConsoleReleaseGateDetail(db, releaseId, options = {}) {
  const release = options.release || getRelease(db, releaseId);
  if (!release) {
    return null;
  }
  const releaseTerms = Array.isArray(options.releaseTerms)
    ? options.releaseTerms
    : listReleaseTerms(db, releaseId);
  const releaseTermsMap = options.releaseTermsMap instanceof Map
    ? options.releaseTermsMap
    : new Map([[String(release.releaseId || '').trim(), releaseTerms]]);
  const gate = buildReleaseGateSummary(db, releaseId, {
    release,
    releaseTerms,
    releaseTermsMap,
  });
  const validation = buildConsoleReleaseValidationSection(gate.validation || {});
  return {
    rawGate: gate,
    gate: buildConsoleReleaseGateSection(gate),
    validation,
  };
}

/**
 * 功能：构造控制台词条列表。
 * 输入：数据库连接，过滤条件。
 * 输出：分页结果对象。
 */
function listConsoleTerms(db, filters = {}) {
  const pageSize = Math.max(1, Math.min(100, Number(filters.pageSize || 20)));
  const page = Math.max(1, Number(filters.page || 1));
  const offset = (page - 1) * pageSize;
  const filteredScopeFilters = {
    query: filters.query || '',
    categoryCode: filters.categoryCode || '',
    status: filters.status || '',
    sourceType: filters.sourceType || '',
    riskLevel: filters.riskLevel || '',
  };
  const base = listTerms(db, {
    ...filteredScopeFilters,
    sortBy: filters.sortBy || 'updated_at',
    sortDirection: filters.sortDirection || 'desc',
    limit: pageSize,
    offset,
  });
  const items = base.items || [];
  const termIds = items.map((item) => item.termId);
  const reviewMap = latestTermReviewSummaryMap(db, termIds);
  return {
    items: items.map((item) => ({
      termId: item.termId,
      categoryCode: item.categoryCode,
      businessAttributeCode: item.categoryCode,
      canonicalText: item.canonicalText,
      status: item.status,
      priority: item.priority,
      riskLevel: item.riskLevel,
      replaceMode: item.replaceMode,
      sourceType: item.sourceType,
      sourceTypeCode: item.sourceType,
      revision: item.revision,
      aliasCount: (item.aliases || []).length,
      latestReviewStatus: (reviewMap.get(item.termId) || {}).latestStatus || 'not_submitted',
      latestReviewSnapshotRevision: (reviewMap.get(item.termId) || {}).latestSnapshotRevision ?? null,
      updatedAt: item.updatedAt,
    })),
    page,
    pageSize,
    total: base.total,
    summary: summarizeTerms(db, {}),
    filteredSummary: summarizeTerms(db, filteredScopeFilters),
  };
}

/**
 * 功能：构造控制台词条详情。
 * 输入：数据库连接，termId。
 * 输出：聚合词条详情对象或 `null`。
 */
function getConsoleTermDetail(db, termId) {
  const term = getTerm(db, termId);
  if (!term) {
    return null;
  }
  const termSource = db.prepare('SELECT * FROM term_sources WHERE term_id = ?').get(termId) || null;
  const aliasSourceRows = db.prepare('SELECT * FROM alias_sources WHERE term_id = ? ORDER BY alias_text ASC').all(termId);
  const aliasSourceMap = new Map(aliasSourceRows.map((row) => [row.alias_text, row]));
  const pinyinProfile = getTermPinyinProfile(db, termId, term.canonicalText);
  const admissionSummary = summarizeTermAdmission(evaluateTermAdmission(db, {
    ...term,
    pinyinProfile,
  }, {
    currentTermId: term.termId,
    currentTerm: {
      ...term,
      pinyinProfile,
    },
  }));
  const reviewSummary = latestTermReviewSummaryMap(db, [termId]).get(termId);
  const validationSummary = termValidationSummaryMap(db, [term]).get(termId);
  return {
    basic: {
      termId: term.termId,
      categoryCode: term.categoryCode,
      businessAttributeCode: term.categoryCode,
      canonicalText: term.canonicalText,
      status: term.status,
      priority: term.priority,
      riskLevel: term.riskLevel,
      replaceMode: term.replaceMode,
      baseConfidence: term.baseConfidence,
      sourceType: term.sourceType,
      sourceTypeCode: term.sourceType,
      pinyinRuntimeMode: term.pinyinRuntimeMode,
      revision: term.revision,
      createdAt: term.createdAt,
      updatedAt: term.updatedAt,
    },
    aliases: (term.aliases || []).map((aliasText) => {
      const source = aliasSourceMap.get(aliasText) || null;
      return {
        aliasText,
        sourceType: source ? source.source_type : null,
        sourceRef: source ? source.source_ref : null,
        createdAt: source ? source.created_at : null,
        updatedAt: source ? source.updated_at : null,
      };
    }),
    rules: term.rules || {},
    pinyinProfile,
    admissionSummary,
    reviewSummary,
    validationSummary,
    sourceSummary: {
      sourceType: termSource ? termSource.source_type : term.sourceType,
      sourceTypeCode: termSource ? termSource.source_type : term.sourceType,
      sourceLabel: term.sourceType,
      importJobId: termSource ? (termSource.import_job_id || '') : '',
      sourceMode: termSource && termSource.import_job_id ? 'import' : 'manual',
      sourceFileName: termSource ? termSource.source_file_name : null,
      sourceRowNo: termSource ? termSource.source_row_no : null,
    },
  };
}

/**
 * 功能：返回控制台审核列表。
 * 输入：数据库连接，过滤条件。
 * 输出：分页结果对象。
 */
function listConsoleReviews(db, filters = {}) {
  const pageSize = Math.max(1, Math.min(200, Number(filters.pageSize || 50)));
  const page = Math.max(1, Number(filters.page || 1));
  const offset = (page - 1) * pageSize;
  const importJobId = String(filters.importJobId || '').trim();
  const scopeSummaryFilters = {
    taskType: filters.taskType || '',
    targetType: filters.targetType || '',
    importJobId,
    submittedBy: filters.submittedBy || '',
    reviewedBy: filters.reviewedBy || '',
  };
  const filteredSummaryFilters = {
    ...scopeSummaryFilters,
    status: filters.status || '',
  };
  if (
    importJobId
    && (!filters.taskType || String(filters.taskType).trim() === 'term_review')
    && (!filters.targetType || String(filters.targetType).trim() === 'term')
  ) {
    const importJob = getImportJob(db, importJobId);
    const importJobContext = importJob
      ? (() => {
        const stats = db.prepare(`
          SELECT
            COUNT(DISTINCT ts.term_id) AS linked_term_count,
            COUNT(rt.task_id) AS total_review_count,
            SUM(CASE WHEN rt.status = 'pending' THEN 1 ELSE 0 END) AS pending_review_count
          FROM term_sources ts
          LEFT JOIN review_tasks rt
            ON rt.target_type = 'term'
           AND rt.task_type = 'term_review'
           AND rt.target_id = ts.term_id
          WHERE ts.import_job_id = ?
        `).get(importJobId);
        return {
          found: true,
          jobId: importJob.jobId,
          status: importJob.status,
          templateCode: importJob.templateCode,
          sourceType: importJob.sourceType,
          linkedTermCount: Number((stats || {}).linked_term_count || 0),
          totalReviewCount: Number((stats || {}).total_review_count || 0),
          pendingReviewCount: Number((stats || {}).pending_review_count || 0),
        };
      })()
      : {
        found: false,
        jobId: importJobId,
        status: '',
        templateCode: '',
        sourceType: '',
        linkedTermCount: 0,
        totalReviewCount: 0,
        pendingReviewCount: 0,
      };
    if (!importJob) {
      return {
        items: [],
        page,
        pageSize,
        total: 0,
        importJobContext,
        summary: summarizeTermReviewTasksByImportJobId(db, importJobId, scopeSummaryFilters),
        filteredSummary: summarizeTermReviewTasksByImportJobId(db, importJobId, filteredSummaryFilters),
      };
    }
    const result = listTermReviewTasksByImportJobIdPaged(db, importJobId, {
      status: filters.status || '',
      submittedBy: filters.submittedBy || '',
      reviewedBy: filters.reviewedBy || '',
      limit: pageSize,
      offset,
    });
    const targetSummaryMap = buildReviewTargetSummaryMap(db, result.items || []);
    return {
      items: (result.items || []).map((item) => ({
        ...item,
        targetSummary: targetSummaryMap.get(String(item.taskId || '').trim()) || buildReviewTargetSummary(db, item),
      })),
      page,
      pageSize,
      total: Number(result.total || 0),
      importJobContext,
      summary: summarizeTermReviewTasksByImportJobId(db, importJobId, scopeSummaryFilters),
      filteredSummary: summarizeTermReviewTasksByImportJobId(db, importJobId, filteredSummaryFilters),
    };
  }
  const useContentReviewOnly = !filters.taskType && !filters.targetType;
  if (useContentReviewOnly) {
    const conditions = ["target_type IN ('term', 'pinyin_candidate')"];
    const values = [];
    if (filters.status) {
      conditions.push('status = ?');
      values.push(String(filters.status || '').trim());
    }
    if (filters.submittedBy) {
      conditions.push('submitted_by = ?');
      values.push(String(filters.submittedBy || '').trim());
    }
    if (filters.reviewedBy) {
      conditions.push('reviewed_by = ?');
      values.push(String(filters.reviewedBy || '').trim());
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT *
      FROM review_tasks
      ${where}
      ORDER BY created_at DESC, task_id DESC
      LIMIT ? OFFSET ?
    `).all(...values, pageSize, offset);
    const countRow = db.prepare(`
      SELECT COUNT(*) AS count
      FROM review_tasks
      ${where}
    `).get(...values);
    const items = rows.map((row) => ({
      taskId: row.task_id,
      taskType: row.task_type,
      targetType: row.target_type,
      targetId: row.target_id,
      status: row.status,
      submittedBy: row.submitted_by,
      reviewedBy: row.reviewed_by,
      comment: row.comment,
      targetSnapshot: parseJsonOrFallback(row.target_snapshot, null),
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
    }));
    const targetSummaryMap = buildReviewTargetSummaryMap(db, items);
    return {
      items: items.map((item) => ({
        ...item,
        targetSummary: targetSummaryMap.get(String(item.taskId || '').trim()) || buildReviewTargetSummary(db, item),
      })),
      page,
      pageSize,
      total: Number((countRow || {}).count || 0),
      importJobContext: null,
      summary: summarizeReviewTasks(db, scopeSummaryFilters),
      filteredSummary: summarizeReviewTasks(db, filteredSummaryFilters),
    };
  }
  const effectiveTargetType = filters.taskType === 'release_publish_review'
    ? 'release'
    : (filters.targetType || '');
  const result = listReviewTasksPaged(db, {
    status: filters.status || '',
    targetType: effectiveTargetType,
    taskType: filters.taskType || '',
    submittedBy: filters.submittedBy || '',
    reviewedBy: filters.reviewedBy || '',
    limit: pageSize,
    offset,
  });
  const targetSummaryMap = buildReviewTargetSummaryMap(db, result.items || []);
  return {
    items: (result.items || []).map((item) => ({
      ...item,
      targetSummary: targetSummaryMap.get(String(item.taskId || '').trim()) || buildReviewTargetSummary(db, item),
    })),
    page,
    pageSize,
    total: Number(result.total || 0),
    importJobContext: null,
    summary: summarizeReviewTasks(db, {
      taskType: filters.taskType || '',
      targetType: effectiveTargetType,
      submittedBy: filters.submittedBy || '',
      reviewedBy: filters.reviewedBy || '',
    }),
    filteredSummary: summarizeReviewTasks(db, {
      taskType: filters.taskType || '',
      targetType: effectiveTargetType,
      status: filters.status || '',
      submittedBy: filters.submittedBy || '',
      reviewedBy: filters.reviewedBy || '',
    }),
  };
}

/**
 * 功能：返回控制台审核详情。
 * 输入：数据库连接，taskId。
 * 输出：审核对象或 `null`。
 */
function getConsoleReviewDetail(db, taskId) {
  const item = getReviewTask(db, taskId);
  if (!item) {
    return null;
  }
  const snapshot = item.targetSnapshot || {};
  let admissionSummary = null;
  let conflictSummary = snapshot.conflictSummary || null;
  if (item.targetType === 'term') {
    if (snapshot.admissionSummary) {
      admissionSummary = snapshot.admissionSummary;
    } else {
      const currentTerm = getTerm(db, item.targetId);
      const pinyinProfile = currentTerm
        ? getTermPinyinProfile(db, currentTerm.termId, currentTerm.canonicalText)
        : (snapshot.pinyinProfile || {});
      admissionSummary = summarizeTermAdmission(evaluateTermAdmission(db, {
        ...snapshot,
        ...(currentTerm || {}),
        pinyinProfile,
      }, {
        currentTermId: currentTerm ? currentTerm.termId : '',
        currentTerm: currentTerm ? {
          ...currentTerm,
          pinyinProfile,
        } : null,
      }));
    }
  }
  return {
    ...item,
    admissionSummary,
    conflictSummary,
    sourceContext: snapshot.sourceContext || {
      sourceType: snapshot.sourceType || snapshot.sourceTypeCode || '',
      sourceTypeCode: snapshot.sourceTypeCode || snapshot.sourceType || '',
      importJobId: snapshot.importJobId || '',
      sourceMode: snapshot.sourceMode || ((snapshot.importJobId || '') ? 'import' : 'manual'),
      sourceFileName: '',
      sourceRowNo: null,
      sourceRef: '',
    },
    targetSummary: buildReviewTargetSummary(db, item),
  };
}

/**
 * 功能：按 release 批量构造审批摘要。
 * 输入：数据库连接、releaseId 数组、可选预读取 release terms 映射。
 * 输出：`releaseId -> approval summary` 的映射。
 */
function releaseApprovalStateMap(db, releaseIds = [], options = {}) {
  const normalizedIds = normalizeIds(releaseIds);
  const releasePolicies = loadGovernancePolicies(db.appConfig).releasePolicies;
  const result = new Map();
  for (const releaseId of normalizedIds) {
    result.set(releaseId, {
      status: 'not_submitted',
      taskId: null,
      requiredApprovals: 1,
      approvedCount: 0,
      approvedReviewers: [],
    });
  }
  if (!normalizedIds.length) {
    return result;
  }

  const releaseTermsMap = options.releaseTermsMap instanceof Map
    ? options.releaseTermsMap
    : listReleaseTermsByReleaseIds(db, normalizedIds);
  for (const releaseId of normalizedIds) {
    const approvalPolicy = getReleaseApprovalPolicy(db, releaseId);
    result.set(releaseId, {
      status: 'not_submitted',
      taskId: null,
      requiredApprovals: Number(approvalPolicy.requiredApprovals || 1),
      approvedCount: 0,
      approvedReviewers: [],
    });
  }

  const placeholders = sqlPlaceholders(normalizedIds);
  const rows = db.prepare(`
    SELECT *
    FROM review_tasks
    WHERE target_type = 'release'
      AND task_type = 'release_publish_review'
      AND target_id IN (${placeholders})
    ORDER BY target_id ASC, created_at DESC, task_id DESC
  `).all(...normalizedIds);
  const grouped = new Map();
  for (const row of rows) {
    const targetId = String(row.target_id || '').trim();
    if (!targetId || !result.has(targetId)) {
      continue;
    }
    const current = grouped.get(targetId) || {
      latestTaskId: null,
      latestStatus: 'not_submitted',
      approvedReviewers: new Set(),
      approvedTaskCount: 0,
      seen: false,
    };
    if (!current.seen) {
      current.latestTaskId = row.task_id;
      current.latestStatus = row.status;
      current.seen = true;
    }
    if (row.status === 'approved' && row.reviewed_by) {
      current.approvedReviewers.add(row.reviewed_by);
    }
    if (row.status === 'approved') {
      current.approvedTaskCount += 1;
    }
    grouped.set(targetId, current);
  }

  for (const releaseId of normalizedIds) {
    const base = result.get(releaseId) || {
      status: 'not_submitted',
      taskId: null,
      requiredApprovals: 1,
      approvedCount: 0,
      approvedReviewers: [],
    };
    const groupedItem = grouped.get(releaseId);
    if (!groupedItem) {
      result.set(releaseId, base);
      continue;
    }
    const approvedCount = releasePolicies.distinctApprovalReviewersRequired === false
      ? groupedItem.approvedTaskCount
      : groupedItem.approvedReviewers.size;
    let status = groupedItem.latestStatus;
    if (approvedCount > 0 && approvedCount < base.requiredApprovals) {
      status = 'partially_approved';
    } else if (approvedCount >= base.requiredApprovals) {
      status = 'approved';
    }
    result.set(releaseId, {
      status,
      taskId: groupedItem.latestTaskId,
      requiredApprovals: base.requiredApprovals,
      approvedCount,
      approvedReviewers: Array.from(groupedItem.approvedReviewers),
    });
  }
  return result;
}

/**
 * 功能：构造 release 审批摘要。
 * 输入：数据库连接，releaseId。
 * 输出：审批摘要对象。
 */
function releaseApprovalState(db, releaseId, options = {}) {
  const normalizedReleaseId = String(releaseId || '').trim();
  if (!normalizedReleaseId) {
    return {
      status: 'not_submitted',
      taskId: null,
      requiredApprovals: 1,
      approvedCount: 0,
      approvedReviewers: [],
    };
  }
  return releaseApprovalStateMap(db, [normalizedReleaseId], options).get(normalizedReleaseId) || {
    status: 'not_submitted',
    taskId: null,
    requiredApprovals: 1,
    approvedCount: 0,
    approvedReviewers: [],
  };
}

/**
 * 功能：构造控制台 release 的流量状态摘要。
 * 输入：release 对象与当前正式版/灰度版/灰度策略上下文。
 * 输出：流量状态对象。
 */
function buildConsoleReleaseTraffic(release = {}, options = {}) {
  const releaseId = String(release.releaseId || '').trim();
  const currentPublishedRelease = options.currentPublishedRelease || null;
  const currentCanaryRelease = options.currentCanaryRelease || null;
  const activeGrayPolicy = options.activeGrayPolicy || null;
  const isCurrentPublished = Boolean(currentPublishedRelease && String(currentPublishedRelease.releaseId || '').trim() === releaseId);
  const isCurrentCanary = Boolean(currentCanaryRelease && String(currentCanaryRelease.releaseId || '').trim() === releaseId);
  const grayEnabled = Boolean(activeGrayPolicy && activeGrayPolicy.enabled);

  if (grayEnabled && isCurrentCanary) {
    return {
      status: 'gray_enabled',
      title: '灰度生效中',
      detail: `当前灰度指向本版本，灰度比例 ${Number(activeGrayPolicy.percentage || 0)}%。`,
      grayEnabled,
      isCurrentPublished,
      isCurrentCanary,
      scopeType: String(activeGrayPolicy.scopeType || '').trim(),
      percentage: Number(activeGrayPolicy.percentage || 0),
      releaseId: String(activeGrayPolicy.releaseId || '').trim(),
    };
  }
  if (grayEnabled) {
    return {
      status: 'gray_enabled_other',
      title: '灰度生效中',
      detail: `当前灰度指向其他版本，灰度比例 ${Number(activeGrayPolicy.percentage || 0)}%。`,
      grayEnabled,
      isCurrentPublished,
      isCurrentCanary,
      scopeType: String(activeGrayPolicy.scopeType || '').trim(),
      percentage: Number(activeGrayPolicy.percentage || 0),
      releaseId: String(activeGrayPolicy.releaseId || '').trim(),
    };
  }
  if (String(release.status || '').trim() === 'canary' || isCurrentCanary) {
    return {
      status: 'gray_closed',
      title: '灰度已关闭',
      detail: '当前没有启用中的灰度策略；该版本不再承接灰度流量。',
      grayEnabled: false,
      isCurrentPublished,
      isCurrentCanary,
      scopeType: '',
      percentage: 0,
      releaseId: '',
    };
  }
  return {
    status: 'no_gray',
    title: '当前无灰度',
    detail: '当前没有启用中的灰度策略。',
    grayEnabled: false,
    isCurrentPublished,
    isCurrentCanary,
    scopeType: '',
    percentage: 0,
    releaseId: '',
  };
}

/**
 * 功能：构造控制台 release 的三层状态聚合。
 * 输入：数据库连接、release 对象和可选上下文。
 * 输出：包含版本状态、审批状态和流量状态的对象。
 */
function buildConsoleReleaseStateLayers(db, release = {}, options = {}) {
  const releaseId = String(release.releaseId || '').trim();
  const releaseTermsMap = options.releaseTermsMap instanceof Map
    ? options.releaseTermsMap
    : new Map();
  const approval = options.approval || releaseApprovalState(db, releaseId, { releaseTermsMap });
  const currentPublishedRelease = options.currentPublishedRelease || getCurrentPublishedRelease(db);
  const currentCanaryRelease = options.currentCanaryRelease || getCurrentCanaryRelease(db);
  const activeGrayPolicy = options.activeGrayPolicy || getActiveGrayPolicy(db);
  const traffic = buildConsoleReleaseTraffic(release, {
    currentPublishedRelease,
    currentCanaryRelease,
    activeGrayPolicy,
  });
  return {
    releaseState: {
      status: String(release.status || '').trim(),
      isCurrentPublished: traffic.isCurrentPublished,
      isCurrentCanary: traffic.isCurrentCanary,
    },
    approval,
    traffic,
  };
}

/**
 * 功能：按过滤条件取回 release 列表的完整作用域项。
 * 输入：数据库连接和 release 过滤条件对象。
 * 输出：满足过滤条件的 release 数组。
 */
function listAllReleasesByFilters(db, filters = {}) {
  const pageSize = 200;
  const items = [];
  let offset = 0;
  let total = 0;
  do {
    const pageResult = listReleasesPaged(db, {
      status: filters.status || '',
      limit: pageSize,
      offset,
    });
    total = Number(pageResult.total || 0);
    items.push(...(pageResult.items || []));
    offset += pageSize;
  } while (offset < total);
  return items;
}

/**
 * 功能：把 release 数据转换为控制台列表所需的统一读模型。
 * 输入：数据库连接和 release 数组。
 * 输出：控制台 release 列表项数组。
 */
function buildConsoleReleaseListItems(db, releases = []) {
  const releaseIds = normalizeIds((releases || []).map((item) => item.releaseId));
  const releaseTermsMap = listReleaseTermsByReleaseIds(db, releaseIds);
  const approvalMap = releaseApprovalStateMap(db, releaseIds, { releaseTermsMap });
  const gateMap = buildReleaseGateSummaryMap(db, releaseIds, {
    releases: releases || [],
    releaseTermsMap,
  });
  const currentPublishedRelease = getCurrentPublishedRelease(db);
  const currentCanaryRelease = getCurrentCanaryRelease(db);
  const activeGrayPolicy = getActiveGrayPolicy(db);
  return (releases || []).map((item) => {
    const gate = gateMap.get(item.releaseId) || { blocked: false, blockerCount: 0 };
    const releaseCheck = buildConsoleReleaseCheck(gate);
    const approval = approvalMap.get(item.releaseId) || {
      status: 'not_submitted',
      taskId: null,
      requiredApprovals: 1,
      approvedCount: 0,
      approvedReviewers: [],
    };
    const layers = buildConsoleReleaseStateLayers(db, item, {
      releaseTermsMap,
      approval,
      currentPublishedRelease,
      currentCanaryRelease,
      activeGrayPolicy,
    });
    const rolloutSummary = String(item.status || '').trim() === 'published'
      ? summarizeRuntimeNodesForTargetVersion(db, item.version, db.appConfig || {})
      : null;
    const postPublishRisk = buildConsoleReleasePostPublishRisk(item, releaseCheck, {
      summary: rolloutSummary || {},
    });
    return {
      releaseId: item.releaseId,
      version: item.version,
      status: item.status,
      summary: item.summary,
      termCount: item.termCount,
      createdAt: item.createdAt,
      publishedAt: item.publishedAt,
      releaseState: layers.releaseState,
      approval: layers.approval,
      traffic: layers.traffic,
      releaseCheck,
      postPublishRisk,
      gate: releaseCheck,
    };
  });
}

/**
 * 功能：按发布工作视图过滤控制台 release 列表项。
 * 输入：控制台 release 列表项数组和视图编码。
 * 输出：当前视图对应的 release 数组。
 */
function filterConsoleReleaseItemsByView(items = [], view = 'list') {
  const normalizedView = ['review', 'canary', 'risk', 'rollback'].includes(String(view || '').trim()) ? String(view).trim() : 'list';
  if (normalizedView === 'review') {
    return (items || []).filter((item) => ['not_submitted', 'pending', 'partially_approved', 'approved'].includes(String(((item.approval || {}).status) || 'not_submitted')));
  }
  if (normalizedView === 'canary') {
    return (items || []).filter((item) => ['built', 'canary'].includes(String(((item.releaseState || {}).status) || item.status || '')));
  }
  if (normalizedView === 'risk') {
    return (items || []).filter((item) => String(((item.releaseState || {}).status) || item.status || '') === 'published');
  }
  if (normalizedView === 'rollback') {
    return (items || []).filter((item) => ['built', 'canary', 'published'].includes(String(((item.releaseState || {}).status) || item.status || '')));
  }
  return items || [];
}

/**
 * 功能：汇总控制台 release 列表项的状态分布。
 * 输入：控制台 release 列表项数组。
 * 输出：release 摘要对象。
 */
function summarizeConsoleReleaseItems(items = []) {
  return {
    totalCount: Number((items || []).length || 0),
    builtCount: (items || []).filter((item) => String(((item.releaseState || {}).status) || item.status || '') === 'built').length,
    canaryCount: (items || []).filter((item) => String(((item.releaseState || {}).status) || item.status || '') === 'canary').length,
    publishedCount: (items || []).filter((item) => String(((item.releaseState || {}).status) || item.status || '') === 'published').length,
  };
}

/**
 * 功能：返回控制台 release 列表。
 * 输入：数据库连接。
 * 输出：分页结果对象。
 */
function listConsoleReleases(db, filters = {}) {
  const pageSize = Math.max(1, Math.min(100, Number(filters.pageSize || 20)));
  const page = Math.max(1, Number(filters.page || 1));
  const offset = (page - 1) * pageSize;
  const currentView = ['review', 'canary', 'risk', 'rollback'].includes(String(filters.view || '').trim())
    ? String(filters.view).trim()
    : 'list';
  const scopeItems = buildConsoleReleaseListItems(db, listAllReleasesByFilters(db, {}));
  const filteredScopeItems = filters.status
    ? buildConsoleReleaseListItems(db, listAllReleasesByFilters(db, { status: filters.status || '' }))
    : scopeItems;
  const viewItems = filterConsoleReleaseItemsByView(filteredScopeItems, currentView);
  return {
    items: viewItems.slice(offset, offset + pageSize),
    page,
    pageSize,
    total: Number(viewItems.length || 0),
    summary: summarizeConsoleReleaseItems(scopeItems),
    filteredSummary: summarizeConsoleReleaseItems(viewItems),
  };
}

/**
 * 功能：返回控制台 release 详情。
 * 输入：数据库连接，releaseId。
 * 输出：release 详情或 `null`。
 */
function getConsoleReleaseDetail(db, appConfig, releaseId) {
  const release = getRelease(db, releaseId);
  if (!release) {
    return null;
  }
  const control = getRuntimeControlState(db);
  const releaseTerms = listReleaseTerms(db, releaseId);
  const releaseTermsMap = new Map([[releaseId, releaseTerms]]);
  const approval = releaseApprovalState(db, releaseId, { releaseTermsMap });
  const reviewTask = getLatestReviewTaskByTarget(db, 'release', releaseId, 'release_publish_review');
  const layers = buildConsoleReleaseStateLayers(db, release, { releaseTermsMap, approval });
  const gateDetail = getConsoleReleaseGateDetail(db, releaseId, {
    release,
    releaseTerms,
    releaseTermsMap,
  });
  const gate = (gateDetail || {}).rawGate || {
    blocked: false,
    blockerCount: 0,
    blockers: [],
    validation: {
      cases: [],
    },
  };
  const rollout = getConsoleRuntimeRollout(db, appConfig, {
    releaseId,
    control,
    selectedRelease: release,
  });
  const releaseCheck = buildConsoleReleaseCheck(gate);
  const confirmation = buildReleaseConfirmation(release, gate, rollout);
  const postPublishRisk = buildConsoleReleasePostPublishRisk(release, releaseCheck, rollout);
  const evidence = {
    runtimeControlReports: listRuntimeControlEvidenceForRelease(appConfig, release),
  };
  return {
    release,
    releaseState: layers.releaseState,
    approval: layers.approval,
    reviewTask,
    traffic: layers.traffic,
    rollout,
    releaseCheck,
    postPublishRisk,
    gate: (gateDetail || {}).gate || buildConsoleReleaseGateSection(gate),
    validation: (gateDetail || {}).validation || buildConsoleReleaseValidationSection(gate.validation || {}),
    confirmation,
    evidence,
    termChanges: releaseTerms,
    rollbackHistory: listConsoleReleaseHistory(db, releaseId),
  };
}

/**
 * 功能：返回控制台验证样本列表。
 * 输入：数据库连接，过滤条件。
 * 输出：分页结果对象。
 */
function listConsoleValidationCases(db, filters = {}) {
  const pageSize = Math.max(1, Math.min(200, Number(filters.pageSize || 50)));
  const page = Math.max(1, Number(filters.page || 1));
  const offset = (page - 1) * pageSize;
  const filteredScopeFilters = {
    enabled: filters.enabled,
    sourceType: filters.sourceType || '',
    query: filters.query || '',
  };
  const result = listValidationCasesPaged(db, {
    ...filteredScopeFilters,
    limit: pageSize,
    offset,
  });
  return {
    items: result.items || [],
    page,
    pageSize,
    total: Number(result.total || 0),
    summary: summarizeValidationCases(db, {}),
    filteredSummary: summarizeValidationCases(db, filteredScopeFilters),
  };
}

/**
 * 功能：读取单个验证样本详情。
 * 输入：数据库连接，caseId。
 * 输出：样本对象或 `null`。
 */
function getConsoleValidationCaseDetail(db, caseId) {
  const row = db.prepare('SELECT * FROM validation_cases WHERE case_id = ?').get(caseId);
  if (!row) {
    return null;
  }
  return {
    caseId: row.case_id,
    description: row.description || '',
    text: row.sample_text || '',
    expectedCanonicals: JSON.parse(row.expected_canonicals_json || '[]'),
    enabled: Boolean(row.enabled),
    sourceType: row.source_type || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 功能：读取验证样本关联词条。
 * 输入：数据库连接，caseId。
 * 输出：词条数组。
 */
function listRelatedTermsForValidationCase(db, caseId) {
  const item = getConsoleValidationCaseDetail(db, caseId);
  if (!item) {
    return [];
  }
  const expectedCanonicals = Array.from(new Set((item.expectedCanonicals || []).map((entry) => String(entry || '').trim()).filter(Boolean)));
  if (!expectedCanonicals.length) {
    return [];
  }
  const placeholders = sqlPlaceholders(expectedCanonicals);
  return db.prepare(`
    SELECT term_id, canonical_text, category_code, status
    FROM terms
    WHERE canonical_text IN (${placeholders})
    ORDER BY updated_at DESC, term_id DESC
  `).all(...expectedCanonicals).map((row) => ({
    termId: row.term_id,
    canonicalText: row.canonical_text,
    categoryCode: row.category_code,
    status: row.status,
  }));
}

/**
 * 功能：读取单个导入批次的预览统计摘要。
 * 输入：数据库连接、jobId。
 * 输出：预览统计对象。
 */
function importJobPreviewSummary(db, jobId) {
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total_rows,
      SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready_rows,
      SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) AS warning_rows,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_rows,
      SUM(CASE WHEN status IN ('ready', 'warning') THEN 1 ELSE 0 END) AS importable_rows,
      SUM(CASE WHEN json_extract(normalized_payload_json, '$.__systemRecommendation.recommendedAction') = 'save_replace' THEN 1 ELSE 0 END) AS save_replace_count,
      SUM(CASE WHEN json_extract(normalized_payload_json, '$.__systemRecommendation.recommendedAction') = 'save_candidate' THEN 1 ELSE 0 END) AS save_candidate_count,
      SUM(CASE WHEN json_extract(normalized_payload_json, '$.__systemRecommendation.recommendedAction') = 'merge_existing' THEN 1 ELSE 0 END) AS merge_existing_count,
      SUM(CASE WHEN json_extract(normalized_payload_json, '$.__systemRecommendation.recommendedAction') = 'append_alias_to_existing' THEN 1 ELSE 0 END) AS append_alias_count,
      SUM(CASE WHEN json_extract(normalized_payload_json, '$.__systemRecommendation.recommendedAction') = 'skip_blocked' THEN 1 ELSE 0 END) AS skip_blocked_count
    FROM import_job_rows
    WHERE job_id = ?
  `).get(jobId);
  return {
    totalRows: Number((row || {}).total_rows || 0),
    readyRows: Number((row || {}).ready_rows || 0),
    warningRows: Number((row || {}).warning_rows || 0),
    errorRows: Number((row || {}).error_rows || 0),
    importableRows: Number((row || {}).importable_rows || 0),
    recommendationSummary: {
      saveReplaceCount: Number((row || {}).save_replace_count || 0),
      saveCandidateCount: Number((row || {}).save_candidate_count || 0),
      mergeExistingCount: Number((row || {}).merge_existing_count || 0),
      appendAliasCount: Number((row || {}).append_alias_count || 0),
      skipBlockedCount: Number((row || {}).skip_blocked_count || 0),
    },
  };
}

/**
 * 功能：读取单个导入批次的错误预览列表。
 * 输入：数据库连接、jobId 和限制条数。
 * 输出：错误行数组。
 */
function listImportJobErrorPreview(db, jobId, limit = 50) {
  return db.prepare(`
    SELECT *
    FROM import_job_rows
    WHERE job_id = ?
      AND status = 'error'
    ORDER BY row_no ASC
    LIMIT ?
  `).all(jobId, Math.max(1, Number(limit || 50))).map((row) => ({
    rowId: row.row_id,
    jobId: row.job_id,
    rowNo: Number(row.row_no || 0),
    targetTermKey: row.target_term_key || '',
    status: row.status || '',
    admissionLevel: row.status === 'error' ? 'blocked' : (row.status === 'warning' ? 'warning' : 'ready'),
    decision: row.decision || '',
    errorCode: row.error_code || '',
    errorMessage: row.error_message || '',
    rawPayload: JSON.parse(row.raw_payload_json || '{}'),
    normalizedPayload: JSON.parse(row.normalized_payload_json || '{}'),
    issues: parseJsonOrFallback(row.issues_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 功能：按词条 ID 批量读取审核任务。
 * 输入：数据库连接、词条 ID 数组。
 * 输出：审核任务数组。
 */
function listReviewTasksByTargetIds(db, targetIds = []) {
  if (!targetIds.length) {
    return [];
  }
  const placeholders = sqlPlaceholders(targetIds);
  return db.prepare(`
    SELECT *
    FROM review_tasks
    WHERE target_type = 'term'
      AND target_id IN (${placeholders})
    ORDER BY created_at DESC, task_id DESC
  `).all(...targetIds).map((row) => ({
    taskId: row.task_id,
    taskType: row.task_type,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by,
    comment: row.comment,
    targetSnapshot: JSON.parse(row.target_snapshot || 'null'),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  }));
}

/**
 * 功能：汇总单个导入批次中出现过的类别编码。
 * 输入：数据库连接和导入批次 ID。
 * 输出：去重后的类别编码数组。
 */
function listImportJobCategoryCodes(db, jobId) {
  return normalizeStringList(db.prepare(`
    SELECT normalized_payload_json
    FROM import_job_rows
    WHERE job_id = ?
    ORDER BY row_no ASC, row_id ASC
  `).all(jobId).map((row) => {
    const payload = parseJsonOrFallback(row.normalized_payload_json, {});
    return payload && payload.categoryCode ? payload.categoryCode : '';
  }));
}

/**
 * 功能：返回控制台导入模板的批次列表。
 * 输入：数据库连接，过滤条件。
 * 输出：分页结果对象。
 */
function listConsoleImportJobs(db, filters = {}) {
  const pageSize = Math.max(1, Math.min(100, Number(filters.pageSize || 20)));
  const page = Math.max(1, Number(filters.page || 1));
  const offset = (page - 1) * pageSize;
  const filteredScopeFilters = {
    status: filters.status || '',
    jobType: filters.jobType || '',
    sourceType: filters.sourceType || '',
    submittedBy: filters.submittedBy || '',
  };
  const result = listImportJobs(db, {
    ...filteredScopeFilters,
    limit: pageSize,
    offset,
  });
  const jobIds = result.items.map((item) => item.jobId);
  const previewMap = new Map();
  const resultMap = new Map();

  if (jobIds.length) {
    const placeholders = sqlPlaceholders(jobIds);
    const previewRows = db.prepare(`
      SELECT
        job_id,
        COUNT(*) AS total_rows,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready_rows,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) AS warning_rows,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_rows
      FROM import_job_rows
      WHERE job_id IN (${placeholders})
      GROUP BY job_id
    `).all(...jobIds);
    for (const row of previewRows) {
      previewMap.set(row.job_id, {
        totalRows: Number(row.total_rows || 0),
        readyRows: Number(row.ready_rows || 0),
        warningRows: Number(row.warning_rows || 0),
        errorRows: Number(row.error_rows || 0),
      });
    }

    const resultRows = db.prepare(`
      SELECT *
      FROM import_job_results
      WHERE job_id IN (${placeholders})
    `).all(...jobIds);
    for (const row of resultRows) {
      resultMap.set(row.job_id, {
        resultId: row.result_id,
        jobId: row.job_id,
        newTermCount: row.new_term_count,
        replaceImportedCount: row.replace_imported_count || 0,
        candidateImportedCount: row.candidate_imported_count || 0,
        mergedExistingCount: row.merged_existing_count || 0,
        aliasAppendedCount: row.alias_appended_count || 0,
        updatedTermCount: row.updated_term_count,
        newAliasCount: row.new_alias_count,
        updatedAliasCount: row.updated_alias_count,
        importedReadyCount: row.imported_ready_count,
        importedWarningCount: row.imported_warning_count,
        skippedBlockedCount: row.skipped_blocked_count,
        skippedCount: row.skipped_count,
        errorCount: row.error_count,
        importedBy: row.imported_by,
        importedAt: row.imported_at,
      });
    }
  }

  return {
    items: result.items.map((item) => ({
      ...item,
      importJobId: item.jobId,
      sourceTypeCode: item.sourceType,
      previewSummary: previewMap.get(item.jobId) || {
        totalRows: 0,
        readyRows: 0,
        warningRows: 0,
        errorRows: 0,
      },
      resultSummary: resultMap.get(item.jobId) || getImportJobResult(db, item.jobId),
    })),
    page,
    pageSize,
    total: result.total,
    summary: summarizeImportJobs(db, {}),
    filteredSummary: summarizeImportJobs(db, filteredScopeFilters),
  };
}

/**
 * 功能：读取单个导入批次详情。
 * 输入：数据库连接，jobId。
 * 输出：批次详情或 `null`。
 */
function getConsoleImportJobDetail(db, appConfig, jobId) {
  const job = getImportJob(db, jobId);
  if (!job) {
    return null;
  }
  const file = listImportJobFiles(db, jobId)[0] || null;
  const template = getImportTemplate(appConfig, job.templateCode);
  const linkedTerms = db.prepare(`
    SELECT t.*
    FROM term_sources ts
    JOIN terms t ON t.term_id = ts.term_id
    WHERE ts.import_job_id = ?
    ORDER BY t.updated_at DESC, t.term_id DESC
  `).all(jobId).map((row) => ({
    termId: row.term_id,
    canonicalText: row.canonical_text,
    categoryCode: row.category_code,
    status: row.status,
  }));
  const reviewTasks = listReviewTasksByTargetIds(db, linkedTerms.map((term) => term.termId));
  const previewSummary = importJobPreviewSummary(db, jobId);
  return {
    job: {
      ...job,
      importJobId: job.jobId,
      sourceTypeCode: job.sourceType,
    },
    template: template ? {
      templateCode: template.templateCode,
      templateName: template.templateName,
      templateVersion: template.templateVersion,
      templateRole: template.templateRole || '',
      legacy: template.legacy === true,
      primary: template.primary === true,
      supersededBy: template.supersededBy || '',
      supportsDefaultCategoryCode: template.supportsDefaultCategoryCode === true,
      businessCategoryOptions: Array.isArray(template.businessCategoryOptions) ? template.businessCategoryOptions : [],
    } : null,
    categoryCodes: listImportJobCategoryCodes(db, jobId),
    file,
    previewSummary,
    blockedRowCount: Number(previewSummary.errorRows || 0),
    warningRowCount: Number(previewSummary.warningRows || 0),
    canConfirm: job.status === 'preview_ready' && Number(previewSummary.importableRows || 0) > 0,
    resultSummary: getImportJobResult(db, jobId),
    errors: listImportJobErrorPreview(db, jobId, 50),
    linkedTerms,
    createdReviewTasks: reviewTasks,
  };
}

function listConsoleRuntimeNodeRegistry(db, filters = {}, appConfig = {}) {
  const result = listRuntimeNodeRegistry(db, {
    enabled: filters.enabled || '',
    env: filters.env || '',
    limit: filters.pageSize || 50,
    offset: Math.max(0, (Math.max(1, Number(filters.page || 1)) - 1) * Math.max(1, Number(filters.pageSize || 50))),
  });
  const liveNodes = listRuntimeNodes(db, {
    status: '',
    env: filters.env || '',
    limit: 1000,
    offset: 0,
  }, appConfig);
  const liveMap = new Map((liveNodes.items || []).map((item) => [item.nodeId, item]));
  const orphanRuntimeEvents = (liveNodes.items || [])
    .filter((item) => !getRuntimeNodeRegistryItem(db, item.nodeId))
    .map((item) => buildOrphanRuntimeEvent(item))
    .sort((left, right) => String(right.lastHeartbeatAt || right.nodeId).localeCompare(String(left.lastHeartbeatAt || left.nodeId)));
  const items = (result.items || []).map((item) => {
    const live = liveMap.get(item.nodeId) || null;
    return {
      ...item,
      registryStatus: item.enabled ? 'enabled' : 'disabled',
      registryLabel: item.enabled ? '备案已启用' : '备案已禁用',
      registrationStatus: live ? 'registered' : 'not_registered',
      registrationLabel: live ? '已注册' : '未注册',
      liveStatus: live ? live.status : 'not_registered',
      liveAddress: live ? live.address : '',
      lastHeartbeatAt: live ? live.lastHeartbeatAt : null,
    };
  });
  return {
    items,
    orphanRuntimeEvents,
    orphanRuntimeCount: orphanRuntimeEvents.length,
    total: Number(result.total || 0),
    page: Math.max(1, Number(filters.page || 1)),
    pageSize: Math.max(1, Number(filters.pageSize || 50)),
  };
}

function getConsoleRuntimeNodeRegistryDetail(db, nodeId, appConfig = {}) {
  const item = getRuntimeNodeRegistryItem(db, nodeId);
  if (!item) {
    return null;
  }
  return {
    ...item,
    liveNode: getRuntimeNode(db, item.nodeId, appConfig),
  };
}

/**
 * 功能：返回控制台使用的业务属性配置列表。
 * 输入：应用配置对象。
 * 输出：包含业务属性数组的对象。
 */
function listConsoleBusinessProperties(appConfig = {}) {
  return {
    items: listBusinessProperties(appConfig).map((item) => ({
      code: item.code || item.value,
      value: item.value,
      label: item.label,
      description: item.description,
      enabled: item.enabled,
      sortOrder: item.sortOrder,
      legacyCategoryCode: item.legacyCategoryCode,
    })),
  };
}

/**
 * 功能：返回控制台使用的业务属性完整配置定义。
 * 输入：应用配置对象。
 * 输出：包含配置路径和业务属性定义的对象。
 */
function listConsoleBusinessAttributeDefinitions(appConfig = {}) {
  const definitions = loadBusinessPropertyDefinitions(appConfig);
  return {
    configPath: definitions.configPath,
    items: (definitions.items || []).map((item) => ({
      code: item.code || item.value,
      value: item.value,
      label: item.label,
      description: item.description,
      enabled: item.enabled,
      sortOrder: item.sortOrder,
      legacyCategoryCode: item.legacyCategoryCode,
    })),
  };
}

/**
 * 功能：返回控制台使用的来源类型配置定义。
 * 输入：应用配置对象和过滤条件。
 * 输出：包含配置路径和来源类型数组的对象。
 */
function listConsoleSourceTypes(appConfig = {}, filters = {}) {
  const includeDisabled = filters.includeDisabled === true;
  const items = includeDisabled
    ? (loadSourceTypeDefinitions(appConfig).items || [])
    : listSourceTypes(appConfig, filters);
  return {
    configPath: loadSourceTypeDefinitions(appConfig).configPath,
    items: items.map((item) => ({
      code: item.code,
      value: item.value,
      label: item.label,
      description: item.description,
      enabled: item.enabled,
      sortOrder: item.sortOrder,
      scope: item.scope,
      scopes: item.scopes,
      allowedEntryModes: item.allowedEntryModes,
    })),
  };
}

module.exports = {
  getConsoleOverview,
  getConsoleWorkbench,
  getConsoleRuntimeRollout,
  getRuntimeControlVerificationReport,
  listConsoleRuntimeNodes,
  getConsoleRuntimeNodeDetail,
  listConsoleTerms,
  getConsoleTermDetail,
  listConsoleReviews,
  getConsoleReviewDetail,
  listConsoleReleases,
  getConsoleReleaseGateDetail,
  getConsoleReleaseDetail,
  listConsoleValidationCases,
  getConsoleValidationCaseDetail,
  listRelatedTermsForValidationCase,
  listConsoleImportJobs,
  getConsoleImportJobDetail,
  listConsoleRuntimeNodeRegistry,
  getConsoleRuntimeNodeRegistryDetail,
  listConsoleBusinessProperties,
  listConsoleBusinessAttributeDefinitions,
  listConsoleSourceTypes,
};
