const fs = require('fs');
const path = require('path');
const { AhoCorasick } = require('./ac');
const { normalizeText, mapSpan } = require('./normalizer');
const { toPinyinKey, isChineseLike } = require('./pinyin');

/**
 * 功能：读取并解析运行时快照 JSON。
 * 输入：`filePath` 快照文件路径。
 * 输出：解析后的快照对象。
 */
function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：判断上下文窗口是否命中任一上下文词。
 * 输入：`windowText` 窗口文本，`contexts` 上下文词数组。
 * 输出：布尔值。
 */
function contextMatched(windowText, contexts) {
  return (contexts || []).some((item) => item && windowText.includes(item));
}

/**
 * 功能：判断文本是否命中任一正则表达式。
 * 输入：`text` 原始文本，`expressions` 正则字符串数组。
 * 输出：布尔值。
 */
function regexMatched(text, expressions) {
  return (expressions || []).some((pattern) => {
    if (!pattern) {
      return false;
    }
    try {
      return new RegExp(pattern, 'u').test(text);
    } catch {
      return false;
    }
  });
}

/**
 * 功能：对单个字符做字符类型分类。
 * 输入：`ch` 单个字符。
 * 输出：字符类型字符串。
 */
function charClass(ch) {
  if (!ch) return 'edge';
  if (/\s/u.test(ch)) return 'space';
  if (/[\u3400-\u9fff]/u.test(ch)) return 'han';
  if (/[A-Za-z0-9]/u.test(ch)) return 'alnum';
  if (/[^\p{L}\p{N}]/u.test(ch)) return 'punct';
  return 'other';
}

/**
 * 功能：判断命中片段两侧是否满足字符类型边界。
 * 输入：`text` 原始文本，`start/end` 命中起止下标。
 * 输出：布尔值。
 */
function hasCharTypeBoundary(text, start, end) {
  const left = text[start - 1] || '';
  const right = text[end + 1] || '';
  const currentLeft = text[start] || '';
  const currentRight = text[end] || '';
  const leftClass = charClass(left);
  const rightClass = charClass(right);
  const currentLeftClass = charClass(currentLeft);
  const currentRightClass = charClass(currentRight);
  const leftOk = leftClass === 'edge' || leftClass === 'space' || leftClass === 'punct' || leftClass !== currentLeftClass;
  const rightOk = rightClass === 'edge' || rightClass === 'space' || rightClass === 'punct' || rightClass !== currentRightClass;
  return leftOk && rightOk;
}

function effectiveLiteralMode(termMeta = {}) {
  const replaceMode = String(termMeta.replaceMode || 'replace').trim() || 'replace';
  if (replaceMode === 'block') {
    return 'block';
  }
  if (replaceMode === 'candidate') {
    return 'candidate';
  }
  return 'replace';
}

function effectivePinyinMode(termMeta = {}) {
  const replaceMode = String(termMeta.replaceMode || 'replace').trim() || 'replace';
  const pinyinRuntimeMode = String(termMeta.pinyinRuntimeMode || 'candidate').trim() || 'candidate';
  if (replaceMode === 'block') {
    return 'off';
  }
  if (pinyinRuntimeMode === 'off') {
    return 'off';
  }
  if (replaceMode === 'candidate') {
    return 'candidate';
  }
  return pinyinRuntimeMode === 'replace' ? 'replace' : 'candidate';
}

function actionRank(action = '') {
  if (action === 'replace') return 0;
  if (action === 'candidate') return 1;
  if (action === 'block') return 2;
  return 3;
}

/**
 * 功能：原型运行时匹配引擎，负责字面召回、拼音召回、规则评估与文本修正。
 * 输入：构造时接收快照 bundle 和 snapshotPath；运行时通过 `match()` 接收文本。
 * 输出：运行时实例，以及 `match()` 的纠错结果对象。
 */
class PrototypeRuntime {
  constructor(bundle, snapshotPath) {
    this.bundle = bundle;
    this.snapshotPath = snapshotPath;
    this.literal = new AhoCorasick();
    for (const pattern of bundle.literalPatterns) {
      this.literal.add(pattern.pattern, pattern);
    }
    this.literal.build();
    this.pinyinExactIndex = new Map(bundle.pinyinExactIndex || []);
    this.termMetaMap = new Map((bundle.terms || []).map((term) => [term.termId, term]));
  }

  /**
   * 功能：从快照文件构建运行时实例。
   * 输入：`snapshotPath` 快照路径。
   * 输出：`PrototypeRuntime` 实例。
   */
  static fromSnapshot(snapshotPath) {
    const bundle = loadJson(snapshotPath);
    return new PrototypeRuntime(bundle, snapshotPath);
  }

  /**
   * 功能：返回当前快照版本信息。
   * 输入：无。
   * 输出：manifest 对象。
   */
  getCurrentVersion() {
    return this.bundle.manifest;
  }

  /**
   * 功能：从当前 snapshotPath 重新加载运行时。
   * 输入：无。
   * 输出：新的 `PrototypeRuntime` 实例。
   */
  reload() {
    return PrototypeRuntime.fromSnapshot(this.snapshotPath);
  }

  /**
   * 功能：对原始文本执行字面/拼音召回、规则评估和文本修正。
   * 输入：`rawText` 原始文本，`options` 运行时选项。
   * 输出：包含 `correctedText`、`matches`、`candidates`、`blocked` 的结果对象。
   */
  matchDetailed(rawText, options = {}) {
    const normalized = normalizeText(rawText);
    const literalHits = this.findLiteral(normalized);
    const pinyinHits = options.enablePinyinChannel === false
      ? []
      : this.findPinyin(normalized, literalHits, options);

    const evaluated = this.applyRules(rawText, literalHits.concat(pinyinHits));
    const blocked = evaluated.filter((item) => item.action === 'block');
    const merged = this.resolveMatches(evaluated.filter((item) => item.action !== 'block'));
    const replaceHits = merged.filter((item) => item.action === 'replace');
    const candidates = merged.filter((item) => item.action === 'candidate');
    const correctedText = this.applyCorrections(rawText, replaceHits);

    return {
      rawText,
      correctedText,
      dictVersion: this.bundle.manifest.version,
      normalizerVersion: this.bundle.manifest.normalizerVersion,
      literalHits,
      pinyinHits,
      evaluated,
      merged,
      matches: replaceHits,
      candidates,
      blocked,
    };
  }

  /**
   * 功能：对外暴露稳定的最小纠错结果，不返回候选构造所需的中间细节。
   * 输入：`rawText` 原始文本，`options` 运行时选项。
   * 输出：包含 `correctedText`、`matches`、`candidates`、`blocked` 的结果对象。
   */
  match(rawText, options = {}) {
    const detail = this.matchDetailed(rawText, options);
    return {
      rawText: detail.rawText,
      correctedText: detail.correctedText,
      dictVersion: detail.dictVersion,
      normalizerVersion: detail.normalizerVersion,
      matches: detail.matches,
      candidates: detail.candidates,
      blocked: detail.blocked,
    };
  }

  /**
   * 功能：在规范化文本上执行字面 AC 匹配。
   * 输入：`normalized` 规范化结果对象。
   * 输出：字面命中数组。
   */
  findLiteral(normalized) {
    return this.literal.findAll(normalized.normalizedText).map((hit) => {
      const span = mapSpan(normalized.offsetMap, hit.start, hit.end);
      const payload = hit.payload;
      return {
        start: span.start,
        end: span.end,
        length: span.end - span.start + 1,
        orig: normalized.rawText.slice(span.start, span.end + 1),
        canonical: payload.canonicalText,
        category: payload.categoryCode,
        channel: 'literal',
        confidence: payload.baseConfidence,
        action: effectiveLiteralMode(payload),
        termId: payload.termId,
        variantText: payload.pattern,
        reasons: ['literal_match'],
      };
    });
  }

  /**
   * 功能：在规范化文本上执行拼音精确召回。
   * 输入：`normalized` 规范化结果，`literalHits` 字面命中数组，`options` 运行时选项。
   * 输出：拼音命中数组。
   */
  findPinyin(normalized, literalHits, options) {
    const text = normalized.normalizedText;
    const hits = [];
    const maxWindow = Number(options.maxPinyinWindow || 12);
    const minWindow = Number(options.minPinyinWindow || 2);
    const literalRanges = literalHits.map((item) => [item.start, item.end]);

    for (let start = 0; start < text.length; start += 1) {
      for (let len = minWindow; len <= maxWindow && start + len <= text.length; len += 1) {
        const window = text.slice(start, start + len);
        if (!isChineseLike(window) || /\s/.test(window)) {
          continue;
        }
        const exactKey = toPinyinKey(window);
        if (!exactKey) {
          continue;
        }
        const candidates = this.pinyinExactIndex.get(exactKey);
        if (!candidates || candidates.length === 0) {
          continue;
        }
        const mapped = mapSpan(normalized.offsetMap, start, start + len - 1);
        if (literalRanges.some(([left, right]) => !(mapped.end < left || mapped.start > right))) {
          continue;
        }
        for (const candidate of candidates) {
          const termMeta = this.termMetaMap.get(candidate.termId) || candidate;
          const pinyinMode = effectivePinyinMode(termMeta);
          if (pinyinMode === 'off') {
            continue;
          }
          if (candidate.sourceText === window) {
            continue;
          }
          const confidence = this.computePinyinConfidence(candidate, window, len, options);
          const allowReplace = Boolean(options.enablePinyinAutoReplace)
            && pinyinMode === 'replace'
            && len >= 3
            && confidence >= 0.88;
          hits.push({
            start: mapped.start,
            end: mapped.end,
            length: mapped.end - mapped.start + 1,
            orig: normalized.rawText.slice(mapped.start, mapped.end + 1),
            canonical: candidate.canonicalText,
            category: candidate.categoryCode,
            channel: 'pinyin_exact',
            confidence,
            action: allowReplace ? 'replace' : 'candidate',
            termId: candidate.termId,
            variantText: candidate.sourceText,
            reasons: ['pinyin_exact_match'],
          });
        }
      }
    }

    const dedup = new Map();
    for (const hit of hits) {
      const key = [hit.start, hit.end, hit.canonical, hit.channel].join('|');
      const previous = dedup.get(key);
      if (!previous || previous.confidence < hit.confidence) {
        dedup.set(key, hit);
      }
    }
    return Array.from(dedup.values());
  }

  /**
   * 功能：计算拼音召回命中的置信度。
   * 输入：`candidate` 候选对象，`window` 当前窗口文本，`len` 窗口长度。
   * 输出：0~1 之间的置信度数值。
   */
  computePinyinConfidence(candidate, window, len) {
    let confidence = len >= 4 ? 0.9 : 0.8;
    if (['gov_term', 'poi_road', 'GOV_INFO', 'ROAD_INFO'].includes(candidate.categoryCode)) {
      confidence += 0.03;
    }
    if (window.length <= 2) {
      confidence -= 0.12;
    }
    confidence += Math.min(0.05, Number(candidate.baseConfidence || 0.85) - 0.85);
    return Math.max(0.5, Math.min(0.98, Number(confidence.toFixed(2))));
  }

  // Rules are evaluated after literal/pinyin recall and before overlap resolution,
  // so a rule can downgrade or block a hit before replacement is decided.
  /**
   * 功能：根据规则模型对命中结果进行降权或阻断。
   * 输入：`rawText` 原始文本，`matches` 命中数组。
   * 输出：规则评估后的命中数组。
   */
  applyRules(rawText, matches) {
    return matches.map((item) => {
      const termMeta = this.termMetaMap.get(item.termId) || {};
      const rules = termMeta.rules || {};
      const next = { ...item, reasons: [...item.reasons] };
      const leftWindow = rawText.slice(Math.max(0, next.start - 8), next.start);
      const rightWindow = rawText.slice(next.end + 1, Math.min(rawText.length, next.end + 1 + 8));

      if (rules.minTextLen && next.length < rules.minTextLen) {
        next.action = 'block';
        next.reasons.push('min_text_len_block');
        return next;
      }

      if (rules.maxTextLen && next.length > rules.maxTextLen) {
        next.action = 'block';
        next.reasons.push('max_text_len_block');
        return next;
      }

      if (rules.boundaryPolicy === 'char_type' && !hasCharTypeBoundary(rawText, next.start, next.end)) {
        next.action = 'candidate';
        next.confidence = Math.min(next.confidence, 0.76);
        next.reasons.push('boundary_policy_downgrade');
      }

      if (contextMatched(leftWindow, rules.leftContextBlock) || contextMatched(rightWindow, rules.rightContextBlock)) {
        next.action = 'block';
        next.reasons.push('blocked_by_context');
        return next;
      }

      if (regexMatched(rawText, rules.regexBlock)) {
        next.action = 'block';
        next.reasons.push('blocked_by_regex');
        return next;
      }

      const hasAllowRule = (rules.leftContextAllow || []).length > 0 || (rules.rightContextAllow || []).length > 0;
      const allowMatched = contextMatched(leftWindow, rules.leftContextAllow) || contextMatched(rightWindow, rules.rightContextAllow);
      if (hasAllowRule && !allowMatched) {
        next.action = 'candidate';
        next.confidence = Math.min(next.confidence, 0.79);
        next.reasons.push('allow_context_missing');
      }

      const hasAllowRegex = (rules.regexAllow || []).length > 0;
      if (hasAllowRegex && !regexMatched(rawText, rules.regexAllow)) {
        next.action = 'candidate';
        next.confidence = Math.min(next.confidence, 0.77);
        next.reasons.push('allow_regex_missing');
      }

      if (rules.candidateOnly) {
        next.action = 'candidate';
        next.confidence = Math.min(next.confidence, 0.78);
        next.reasons.push('candidate_only_rule');
      }

      return next;
    });
  }

  /**
   * 功能：按起止位置、长度、置信度和通道优先级解决重叠命中。
   * 输入：`matches` 命中数组。
   * 输出：筛选后的保留命中数组。
   */
  resolveMatches(matches) {
    const ordered = [...matches].sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.length !== b.length) return b.length - a.length;
      if (actionRank(a.action) !== actionRank(b.action)) return actionRank(a.action) - actionRank(b.action);
      if (a.confidence !== b.confidence) return b.confidence - a.confidence;
      if (a.channel !== b.channel) return a.channel === 'literal' ? -1 : 1;
      return a.canonical.localeCompare(b.canonical, 'zh-CN');
    });

    const kept = [];
    let cursor = -1;
    for (const item of ordered) {
      if (item.start < cursor) {
        continue;
      }
      kept.push(item);
      cursor = item.end + 1;
    }
    return kept;
  }

  /**
   * 功能：把 replace 命中应用到原始文本，生成纠正后的文本。
   * 输入：`rawText` 原始文本，`replaceHits` 替换命中数组。
   * 输出：修正后的文本字符串。
   */
  applyCorrections(rawText, replaceHits) {
    if (replaceHits.length === 0) {
      return rawText;
    }
    const ordered = [...replaceHits].sort((a, b) => a.start - b.start);
    let cursor = 0;
    let output = '';
    for (const hit of ordered) {
      output += rawText.slice(cursor, hit.start);
      output += hit.canonical;
      cursor = hit.end + 1;
    }
    output += rawText.slice(cursor);
    return output;
  }
}

/**
 * 功能：解析 latest snapshot 的文件路径。
 * 输入：配置对象或项目根目录。
 * 输出：latest snapshot.json 的绝对路径。
 */
function latestSnapshotPath(appConfigOrProjectRoot) {
  if (appConfigOrProjectRoot && appConfigOrProjectRoot.resolvedPaths && appConfigOrProjectRoot.resolvedPaths.latestReleaseDir) {
    return path.join(appConfigOrProjectRoot.resolvedPaths.latestReleaseDir, 'snapshot.json');
  }
  return path.join(appConfigOrProjectRoot, 'prototype', 'workspace', 'releases', 'latest', 'snapshot.json');
}

module.exports = {
  PrototypeRuntime,
  latestSnapshotPath,
};
