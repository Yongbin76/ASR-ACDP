const {
  joinPinyin,
  normalizePinyinArray,
} = require('./pinyin');
const {
  findTermByCategoryAndCanonical,
  findTermsByAliasText,
  findTermsByCanonicalText,
} = require('./platform-db');
const { usableBusinessProperty } = require('./business-properties');
const { usableSourceType } = require('./source-types');

const ALLOWED_RISK_LEVELS = new Set(['low', 'medium', 'high']);
const ALLOWED_REPLACE_MODES = new Set(['replace', 'candidate', 'block']);
const ALLOWED_PINYIN_RUNTIME_MODES = new Set(['off', 'candidate', 'replace']);
const BLOCKED_DICTIONARY_PHRASES = new Set([
  '办理材料',
  '申请材料',
  '材料清单',
  '办理流程',
  '申请流程',
  '办理指南',
  '办事指南',
  '办理条件',
  '受理条件',
  '申请条件',
  '申请对象',
  '办理地点',
  '联系电话',
  '咨询电话',
  '办公时间',
  '常见问题',
  '注意事项',
  '附件下载',
]);
const BLOCKED_METADATA_MARKERS = ['备注', '说明', '注：', '注:', '序号', '编号', '地址信息'];
const ROAD_SUFFIXES = ['大道', '公路', '支路', '支弄', '胡同', '大街', '中路', '东路', '西路', '南路', '北路', '路', '街', '巷', '弄', '道', '里'];
const GOVERNMENT_STRONG_SUFFIXES = ['检察院', '服务中心', '派出所', '委员会', '总队', '大队', '法院', '政府', '党委', '人大', '政协', '中心', '委', '局', '厅', '办'];
const GOVERNMENT_WEAK_TOKENS = ['发展改革', '发展和改革', '市场监管', '政务服务', '城管执法', '行政审批', '司法行政'];
const ROAD_CATEGORY_CODES = new Set(['poi_road', 'ROAD_INFO']);
const GOVERNMENT_CATEGORY_CODES = new Set(['gov_term', 'GOV_INFO']);
const ADDRESS_LIKE_MARKERS = ['号', '室', '楼', '层', '单元', '栋', '幢'];
const SENTENCE_PUNCTUATION_PATTERN = /[，。！？；：]/u;
const URL_OR_EMAIL_PATTERN = /https?:\/\/|www\.|@/iu;
const PHONE_PATTERN = /(?:\+?86[-\s]?)?(?:1\d{10}|0\d{2,3}[-\s]?\d{7,8})/u;
const NOISE_PATTERN = /[_=]{2,}|[#＊*]{2,}|(?:\d+\s*\/\s*\d+)|(?:第\s*\d+\s*页)/u;
const CHINESE_ENUM_PATTERN = /^[一二三四五六七八九十]+[、.．]/u;
const PINYIN_TOKEN_PATTERN = /^[a-z]+(?:\s+[a-z]+)*$/;

function uniqueStrings(items = []) {
  return Array.from(new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean)));
}

function normalizeAliases(value) {
  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }
  return uniqueStrings(String(value || '').split('|'));
}

function normalizePinyinReadings(value) {
  if (Array.isArray(value)) {
    return uniqueStrings(value.map((item) => joinPinyin(item)));
  }
  return uniqueStrings(String(value || '').split('|').map((item) => joinPinyin(item)));
}

function normalizeNumber(value, fallback) {
  if (value == null || value === '') {
    return fallback;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function issue(level, code, field, message, options = {}) {
  return {
    level,
    code,
    field,
    message,
    evidence: options.evidence || null,
    trace: options.trace || null,
    suggestion: options.suggestion || '',
  };
}

function issueLevelRank(level = '') {
  if (level === 'blocked') return 2;
  if (level === 'warning') return 1;
  return 0;
}

function computeAdmissionLevel(issues = []) {
  if ((issues || []).some((entry) => entry && entry.level === 'blocked')) {
    return 'blocked';
  }
  if ((issues || []).some((entry) => entry && entry.level === 'warning')) {
    return 'warning';
  }
  return 'ready';
}

function normalizeInputPayload(payload = {}, options = {}) {
  const currentTerm = options.currentTerm || {};
  const pinyinProfile = payload.pinyinProfile || {};
  const rawCustomFullPinyinNoTone = String(
    pinyinProfile.customFullPinyinNoTone ?? (currentTerm.pinyinProfile || {}).customFullPinyinNoTone ?? '',
  ).trim();
  const rawAlternativeReadingsInput = pinyinProfile.alternativeReadings ?? (currentTerm.pinyinProfile || {}).alternativeReadings ?? [];
  const rawAlternativeReadings = Array.isArray(rawAlternativeReadingsInput)
    ? rawAlternativeReadingsInput.map((item) => String(item || '').trim())
    : String(rawAlternativeReadingsInput || '').split('|').map((item) => item.trim());
  return {
    termId: String(options.currentTermId || payload.termId || currentTerm.termId || '').trim(),
    categoryCode: String(payload.categoryCode ?? currentTerm.categoryCode ?? '').trim(),
    canonicalText: String(payload.canonicalText ?? currentTerm.canonicalText ?? '').trim(),
    aliases: normalizeAliases(payload.aliases ?? currentTerm.aliases ?? []),
    priority: normalizeNumber(payload.priority ?? currentTerm.priority, 80),
    riskLevel: String(payload.riskLevel ?? currentTerm.riskLevel ?? '').trim() || 'medium',
    replaceMode: String(payload.replaceMode ?? currentTerm.replaceMode ?? '').trim() || 'replace',
    baseConfidence: normalizeNumber(payload.baseConfidence ?? currentTerm.baseConfidence, 0.9),
    sourceType: String(payload.sourceType ?? currentTerm.sourceType ?? '').trim() || 'manual',
    pinyinRuntimeMode: String(payload.pinyinRuntimeMode ?? currentTerm.pinyinRuntimeMode ?? '').trim() || 'candidate',
    pinyinProfile: {
      runtimeMode: String(pinyinProfile.runtimeMode ?? (currentTerm.pinyinProfile || {}).runtimeMode ?? '').trim() || 'candidate',
      customFullPinyinNoTone: joinPinyin(rawCustomFullPinyinNoTone),
      rawCustomFullPinyinNoTone,
      alternativeReadings: normalizePinyinReadings(pinyinProfile.alternativeReadings ?? (currentTerm.pinyinProfile || {}).alternativeReadings ?? []),
      rawAlternativeReadings,
      polyphoneMode: String(pinyinProfile.polyphoneMode ?? (currentTerm.pinyinProfile || {}).polyphoneMode ?? '').trim() || 'default',
      notes: String(pinyinProfile.notes ?? (currentTerm.pinyinProfile || {}).notes ?? '').trim(),
    },
  };
}

function buildTraceFromTerm(term = {}, options = {}) {
  return {
    termId: term.termId || term.term_id || '',
    categoryCode: term.categoryCode || term.category_code || '',
    canonicalText: term.canonicalText || term.canonical_text || '',
    aliasText: options.aliasText || '',
    importJobId: options.importJobId || term.importJobId || term.import_job_id || null,
    sourceFileName: options.sourceFileName || term.sourceFileName || term.source_file_name || '',
    sourceRowNo: options.sourceRowNo ?? term.sourceRowNo ?? term.source_row_no ?? null,
    sourceType: options.sourceType || term.sourceType || term.source_type || '',
  };
}

function validateRequiredFields(normalizedInput, issues) {
  if (!normalizedInput.categoryCode) {
    issues.push(issue('blocked', 'category_required', 'categoryCode', '类别编码不能为空。', {
      suggestion: '请填写 categoryCode，或在导入批次里设置默认业务属性。',
    }));
  }
  if (!normalizedInput.canonicalText) {
    issues.push(issue('blocked', 'canonical_required', 'canonicalText', '标准词不能为空。', {
      suggestion: '请填写 canonicalText。',
    }));
  }
}

function validateEnumAndNumericFields(normalizedInput, issues) {
  if (normalizedInput.riskLevel && !ALLOWED_RISK_LEVELS.has(normalizedInput.riskLevel)) {
    issues.push(issue('blocked', 'invalid_risk_level', 'riskLevel', '风险等级不在允许值内。', {
      evidence: normalizedInput.riskLevel,
      suggestion: '请改成 low / medium / high。',
    }));
  }
  if (normalizedInput.replaceMode && !ALLOWED_REPLACE_MODES.has(normalizedInput.replaceMode)) {
    issues.push(issue('blocked', 'invalid_replace_mode', 'replaceMode', '替换模式不在允许值内。', {
      evidence: normalizedInput.replaceMode,
      suggestion: '请改成 replace / candidate / block。',
    }));
  }
  if (normalizedInput.pinyinRuntimeMode && !ALLOWED_PINYIN_RUNTIME_MODES.has(normalizedInput.pinyinRuntimeMode)) {
    issues.push(issue('blocked', 'invalid_pinyin_runtime_mode', 'pinyinRuntimeMode', '拼音运行模式不在允许值内。', {
      evidence: normalizedInput.pinyinRuntimeMode,
      suggestion: '请改成 off / candidate / replace。',
    }));
  }
  if (!Number.isFinite(normalizedInput.baseConfidence) || normalizedInput.baseConfidence < 0 || normalizedInput.baseConfidence > 1) {
    issues.push(issue('blocked', 'invalid_base_confidence', 'baseConfidence', '基础置信度必须是 0 到 1 之间的数字。', {
      evidence: normalizedInput.baseConfidence,
    }));
  }
  if (!Number.isInteger(normalizedInput.priority) || normalizedInput.priority < 1 || normalizedInput.priority > 1000) {
    issues.push(issue('blocked', 'invalid_priority', 'priority', '优先级必须是 1 到 1000 之间的整数。', {
      evidence: normalizedInput.priority,
    }));
  }
}

function validateConfiguredBusinessProperty(db, normalizedInput, issues, options = {}) {
  if (!normalizedInput.categoryCode) {
    return;
  }
  const currentTerm = options.currentTerm || {};
  const currentValue = currentTerm.categoryCode || '';
  if (!usableBusinessProperty(db.appConfig, normalizedInput.categoryCode, { currentValue })) {
    issues.push(issue('blocked', 'attribute_invalid', 'categoryCode', '当前业务属性未配置或已停用，不能继续录入。', {
      evidence: normalizedInput.categoryCode,
      suggestion: '请到“词典建设 -> 基础配置”维护业务属性，或改用已启用的业务属性。',
    }));
  }
}

function validateConfiguredSourceType(db, normalizedInput, issues, options = {}) {
  if (!normalizedInput.sourceType) {
    return;
  }
  const currentTerm = options.currentTerm || {};
  const currentCode = currentTerm.sourceType || '';
  const sourceMode = String(options.sourceMode || 'manual').trim().toLowerCase() || 'manual';
  if (!usableSourceType(db.appConfig, normalizedInput.sourceType, {
    currentCode,
    scope: 'dictionary',
    entryMode: sourceMode,
  })) {
    issues.push(issue('blocked', 'source_type_invalid', 'sourceType', '当前来源类型未配置、未启用，或不允许在当前录入方式下使用。', {
      evidence: normalizedInput.sourceType,
      suggestion: '请到“词典建设 -> 基础配置”维护来源类型，或改用当前录入方式允许的来源类型。',
    }));
  }
}

function validateDictionarySuitability(normalizedInput, issues) {
  const canonicalText = normalizedInput.canonicalText;
  if (!canonicalText) {
    return;
  }
  if (Array.from(canonicalText).length === 1) {
    const aliases = Array.isArray(normalizedInput.aliases) ? normalizedInput.aliases : [];
    const singleCharacterAliases = aliases.filter((aliasText) => Array.from(String(aliasText || '').trim()).length === 1);
    if (!aliases.length) {
      issues.push(issue('blocked', 'single_character_blocked', 'canonicalText', '单字标准词必须至少提供一个错误词或别名。', {
        evidence: canonicalText,
        suggestion: '请至少填写一个非单字错误词或别名；如果没有可用错误词，请不要直接录入单字标准词。',
      }));
    } else if (singleCharacterAliases.length) {
      issues.push(issue('blocked', 'single_character_blocked', 'aliases', '单字标准词的错误词或别名中不能包含单字。', {
        evidence: singleCharacterAliases,
        suggestion: '请移除单字错误词或别名，只保留非单字错误词后再提交。',
      }));
    }
  }
  if (BLOCKED_DICTIONARY_PHRASES.has(canonicalText)) {
    issues.push(issue('blocked', 'dictionary_phrase_blocked', 'canonicalText', '当前文本更像栏目词、说明词或流程词，不适合作为标准词录入。', {
      evidence: canonicalText,
      suggestion: '请确认是否应改为真正的标准词，或不要录入字典。',
    }));
  }
  if (SENTENCE_PUNCTUATION_PATTERN.test(canonicalText) || URL_OR_EMAIL_PATTERN.test(canonicalText) || PHONE_PATTERN.test(canonicalText)) {
    issues.push(issue('blocked', 'dictionary_sentence_blocked', 'canonicalText', '当前文本更像句子、说明语或联系方式，不适合作为标准词录入。', {
      evidence: canonicalText,
    }));
  }
  if (NOISE_PATTERN.test(canonicalText) || CHINESE_ENUM_PATTERN.test(canonicalText) || BLOCKED_METADATA_MARKERS.some((marker) => canonicalText.includes(marker))) {
    issues.push(issue('blocked', 'dictionary_noise_blocked', 'canonicalText', '当前文本疑似包含注释、编号、页码或脏数据，不适合作为标准词录入。', {
      evidence: canonicalText,
    }));
  }
}

function hasRoadShape(text = '') {
  return ROAD_SUFFIXES.some((suffix) => String(text || '').endsWith(suffix));
}

function hasGovernmentStrongShape(text = '') {
  return GOVERNMENT_STRONG_SUFFIXES.some((suffix) => String(text || '').endsWith(suffix));
}

function validateCategoryShape(normalizedInput, issues) {
  const canonicalText = normalizedInput.canonicalText;
  if (!canonicalText) {
    return;
  }
  if (ROAD_CATEGORY_CODES.has(normalizedInput.categoryCode) && !hasRoadShape(canonicalText)) {
    issues.push(issue('blocked', 'poi_road_shape_blocked', 'canonicalText', '当前文本不符合路名的基础形态要求。', {
      evidence: canonicalText,
      suggestion: '路名类标准词通常应以路/街/巷/弄/大道/公路等后缀结尾。',
    }));
  }
  if (GOVERNMENT_CATEGORY_CODES.has(normalizedInput.categoryCode)) {
    if (hasGovernmentStrongShape(canonicalText)) {
      return;
    }
    const looksBlocked = hasRoadShape(canonicalText)
      || ADDRESS_LIKE_MARKERS.some((marker) => canonicalText.includes(marker))
      || /\d/u.test(canonicalText)
      || SENTENCE_PUNCTUATION_PATTERN.test(canonicalText)
      || BLOCKED_DICTIONARY_PHRASES.has(canonicalText);
    if (looksBlocked) {
      issues.push(issue('blocked', 'gov_term_shape_blocked', 'canonicalText', '当前文本明显不像机构名，不允许按政府部门词条录入。', {
        evidence: canonicalText,
        suggestion: '请确认类别是否选错，或改为完整机构名称。',
      }));
      return;
    }
    if (GOVERNMENT_WEAK_TOKENS.some((token) => canonicalText.includes(token)) || Array.from(canonicalText).length <= 6) {
      issues.push(issue('warning', 'gov_term_shape_warning', 'canonicalText', '当前文本更像机构简称或片段，建议确认是否需要补全为正式机构名称。', {
        evidence: canonicalText,
      }));
    }
  }
}

function validatePinyinFields(normalizedInput, issues) {
  const profile = normalizedInput.pinyinProfile || {};
  if (profile.rawCustomFullPinyinNoTone && !PINYIN_TOKEN_PATTERN.test(String(profile.rawCustomFullPinyinNoTone || '').toLowerCase())) {
    issues.push(issue('blocked', 'invalid_custom_pinyin', 'customFullPinyinNoTone', '自定义标准读音必须是无声调拼音，且只允许字母和空格。', {
      evidence: profile.rawCustomFullPinyinNoTone,
    }));
  }
  const rawAlternativeReadings = Array.isArray(profile.rawAlternativeReadings) ? profile.rawAlternativeReadings : [];
  const normalizedRawReadings = rawAlternativeReadings.map((reading) => String(reading || '').trim().toLowerCase()).filter(Boolean);
  if (normalizedRawReadings.length !== new Set(normalizedRawReadings).size) {
    const firstDuplicate = normalizedRawReadings.find((reading, index) => normalizedRawReadings.indexOf(reading) !== index) || '';
    issues.push(issue('blocked', 'duplicate_alternative_reading', 'alternativeReadings', '备用读音中存在重复值。', {
      evidence: firstDuplicate,
    }));
  }
  const seen = new Set();
  for (const reading of profile.alternativeReadings || []) {
    if (!reading || !PINYIN_TOKEN_PATTERN.test(reading)) {
      issues.push(issue('blocked', 'invalid_alternative_reading', 'alternativeReadings', '备用读音必须是无声调拼音，且只允许字母和空格。', {
        evidence: reading,
      }));
      continue;
    }
    if (seen.has(reading)) {
      continue;
    }
    seen.add(reading);
  }
  if (profile.customFullPinyinNoTone && seen.has(profile.customFullPinyinNoTone)) {
    issues.push(issue('blocked', 'alternative_matches_primary', 'alternativeReadings', '备用读音不能和主读音完全相同。', {
      evidence: profile.customFullPinyinNoTone,
    }));
  }
}

function validateExistingCanonical(db, normalizedInput, issues, options = {}) {
  if (!normalizedInput.categoryCode || !normalizedInput.canonicalText) {
    return null;
  }
  const existing = findTermByCategoryAndCanonical(db, normalizedInput.categoryCode, normalizedInput.canonicalText, {
    excludeTermId: normalizedInput.termId || options.currentTermId || '',
  });
  if (existing) {
    issues.push(issue('warning', 'exact_match_existing', 'canonicalText', '同类同名标准词已存在，当前操作将转为补充或更新现有词条。', {
      trace: buildTraceFromTerm(existing),
      suggestion: '请确认这是对已有词条的补充，而不是重复新建。',
    }));
  }
  return existing;
}

function validateCanonicalAliasConflict(db, normalizedInput, issues, options = {}) {
  if (!normalizedInput.canonicalText) {
    return;
  }
  const conflicts = findTermsByAliasText(db, normalizedInput.canonicalText, {
    excludeTermId: normalizedInput.termId || options.currentTermId || '',
  });
  for (const conflict of conflicts) {
    issues.push(issue('blocked', 'alias_conflict', 'canonicalText', '当前标准词命中了其他词条的错误词或别名，不能直接作为新的标准词录入。', {
      trace: buildTraceFromTerm(conflict, { aliasText: normalizedInput.canonicalText }),
      suggestion: '请先确认是否应合并到现有词条，或改为错误词补录。',
    }));
  }
}

function validateAliasConflicts(db, normalizedInput, issues, options = {}) {
  const aliases = normalizedInput.aliases || [];
  const currentTermId = normalizedInput.termId || options.currentTermId || '';
  for (const aliasText of aliases) {
    const canonicalConflicts = findTermsByCanonicalText(db, aliasText, {
      excludeTermId: currentTermId,
    });
    for (const conflict of canonicalConflicts) {
      issues.push(issue('warning', 'alias_conflict', 'aliases', '当前错误词或别名与其他词条的标准词重名，建议确认是否会造成混淆。', {
        evidence: aliasText,
        trace: buildTraceFromTerm(conflict),
      }));
    }
    const aliasConflicts = findTermsByAliasText(db, aliasText, {
      excludeTermId: currentTermId,
    });
    for (const conflict of aliasConflicts) {
      issues.push(issue('warning', 'alias_conflict', 'aliases', '当前错误词或别名与其他词条的错误词重复，建议确认是否会造成歧义。', {
        evidence: aliasText,
        trace: buildTraceFromTerm(conflict, { aliasText }),
      }));
    }
  }
}

function evaluateTermAdmission(db, payload = {}, options = {}) {
  const normalizedInput = normalizeInputPayload(payload, options);
  const issues = [];
  validateRequiredFields(normalizedInput, issues);
  validateConfiguredBusinessProperty(db, normalizedInput, issues, options);
  validateConfiguredSourceType(db, normalizedInput, issues, options);
  validateEnumAndNumericFields(normalizedInput, issues);
  validateDictionarySuitability(normalizedInput, issues);
  validateCategoryShape(normalizedInput, issues);
  validatePinyinFields(normalizedInput, issues);
  validateExistingCanonical(db, normalizedInput, issues, options);
  validateCanonicalAliasConflict(db, normalizedInput, issues, options);
  validateAliasConflicts(db, normalizedInput, issues, options);

  issues.sort((left, right) => {
    const levelRank = issueLevelRank(right.level) - issueLevelRank(left.level);
    if (levelRank !== 0) {
      return levelRank;
    }
    return String(left.code || '').localeCompare(String(right.code || ''), 'en');
  });

  return {
    level: computeAdmissionLevel(issues),
    issues,
    normalizedInput,
  };
}

function summarizeTermAdmission(admissionOrIssues) {
  const issues = Array.isArray(admissionOrIssues)
    ? admissionOrIssues
    : (admissionOrIssues && Array.isArray(admissionOrIssues.issues) ? admissionOrIssues.issues : []);
  const blockedIssues = issues.filter((entry) => entry.level === 'blocked');
  const warningIssues = issues.filter((entry) => entry.level === 'warning');
  return {
    level: computeAdmissionLevel(issues),
    blockedCount: blockedIssues.length,
    warningCount: warningIssues.length,
    issueCount: issues.length,
    primaryIssue: blockedIssues[0] || warningIssues[0] || null,
    issues,
  };
}

function createBlockedAdmissionError(summary, options = {}) {
  const normalized = summarizeTermAdmission(summary);
  const error = new Error(options.message || (normalized.primaryIssue ? normalized.primaryIssue.message : 'term admission blocked'));
  error.statusCode = Number(options.statusCode || 409);
  error.code = String(options.code || 'term_admission_blocked');
  error.payload = {
    error: `${error.code}: ${error.message}`,
    admissionLevel: normalized.level,
    blockedCount: normalized.blockedCount,
    warningCount: normalized.warningCount,
    issues: normalized.issues,
  };
  return error;
}

module.exports = {
  ALLOWED_RISK_LEVELS,
  ALLOWED_REPLACE_MODES,
  ALLOWED_PINYIN_RUNTIME_MODES,
  BLOCKED_DICTIONARY_PHRASES,
  evaluateTermAdmission,
  summarizeTermAdmission,
  createBlockedAdmissionError,
};
