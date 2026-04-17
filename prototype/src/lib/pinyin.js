const { pinyin, polyphonic } = require('pinyin-pro');

/**
 * 功能：把单个拼音 token 归一化为无声调小写形式。
 * 输入：`token`，单个拼音片段。
 * 输出：归一化后的拼音字符串。
 */
function normalizePinyinToken(token) {
  return String(token || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 功能：把拼音输入统一转成拼音数组。
 * 输入：`value`，可以是字符串、数组或空值。
 * 输出：归一化后的拼音数组。
 */
function normalizePinyinArray(value) {
  if (Array.isArray(value)) {
    return value.map(normalizePinyinToken).filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return normalizePinyinToken(value).split(' ').filter(Boolean);
}

/**
 * 功能：把拼音数组拼接成空格分隔字符串。
 * 输入：`tokens`，拼音数组或等价输入。
 * 输出：空格分隔的拼音字符串。
 */
function joinPinyin(tokens) {
  return normalizePinyinArray(tokens).join(' ');
}

/**
 * 功能：从拼音数组提取首字母串。
 * 输入：`tokens`，拼音数组或等价输入。
 * 输出：首字母拼接字符串。
 */
function initialsFromTokens(tokens) {
  return normalizePinyinArray(tokens).map((item) => item[0] || '').join('');
}

/**
 * 功能：把中文文本转换为拼音数组。
 * 输入：`text`，原始文本。
 * 输出：无声调拼音数组。
 */
function toPinyinArray(text) {
  if (!text) {
    return [];
  }
  return pinyin(text, { toneType: 'none', type: 'array', nonZh: 'consecutive' })
    .map((item) => normalizePinyinToken(item))
    .filter(Boolean);
}

/**
 * 功能：把文本转换为拼音键字符串。
 * 输入：`text`，原始文本。
 * 输出：空格分隔拼音字符串。
 */
function toPinyinKey(text) {
  return toPinyinArray(text).join(' ');
}

/**
 * 功能：把文本转换为首字母串。
 * 输入：`text`，原始文本。
 * 输出：首字母拼接字符串。
 */
function toInitials(text) {
  return toPinyinArray(text).map((item) => item[0] || '').join('');
}

/**
 * 功能：构建词条拼音画像。
 * 输入：`text` 原始文本，`overrides` 画像覆写配置。
 * 输出：包含全拼、首字母、音节和备用读音的画像对象。
 */
function buildPinyinProfile(text, overrides = {}) {
  const defaultTokens = toPinyinArray(text);
  const customTokens = normalizePinyinArray(overrides.customFullPinyinNoTone);
  const finalTokens = customTokens.length > 0 ? customTokens : defaultTokens;
  const alternativeReadings = Array.from(new Set((overrides.alternativeReadings || []).map((item) => joinPinyin(item)).filter(Boolean)));
  return {
    fullPinyinNoTone: joinPinyin(finalTokens),
    initials: initialsFromTokens(finalTokens),
    syllables: finalTokens,
    runtimeMode: String(overrides.runtimeMode || 'candidate'),
    polyphoneMode: String(overrides.polyphoneMode || 'default'),
    customFullPinyinNoTone: customTokens.length > 0 ? joinPinyin(customTokens) : '',
    alternativeReadings,
    notes: String(overrides.notes || ''),
  };
}

/**
 * 功能：分析文本中的多音字槽位及其备选读音。
 * 输入：`text`，原始中文文本。
 * 输出：多音槽位数组。
 */
function polyphonicSlots(text) {
  if (!text) {
    return [];
  }
  const chars = Array.from(text);
  const defaultTokens = toPinyinArray(text);
  const slots = polyphonic(text, { toneType: 'none', type: 'all', nonZh: 'consecutive' });
  return (slots || []).map((slot, index) => {
    const entries = Array.isArray(slot) ? slot : [slot];
    const options = Array.from(new Set(entries
      .map((item) => normalizePinyinToken(item && item.pinyin ? item.pinyin : item))
      .filter(Boolean)));
    const defaultPinyin = options.includes(defaultTokens[index]) ? defaultTokens[index] : (options[0] || defaultTokens[index] || '');
    return {
      index,
      char: entries[0] && entries[0].origin ? String(entries[0].origin) : String(chars[index] || ''),
      defaultPinyin,
      options,
      alternatives: options.filter((item) => item !== defaultPinyin),
    };
  });
}

/**
 * 功能：基于多音字槽位生成拼音候选组合。
 * 输入：`text` 原始文本，`options` 候选生成参数。
 * 输出：包含默认读音、多音槽位和候选列表的对象。
 */
function buildPinyinCandidates(text, options = {}) {
  const defaultTokens = toPinyinArray(text);
  const slots = polyphonicSlots(text).filter((item) => item.alternatives.length > 0);
  const limit = Math.max(1, Math.min(30, Number(options.limit || 12)));
  const candidates = [];
  const seen = new Set([joinPinyin(defaultTokens)]);

  /**
   * 功能：处理`pushCandidate`相关逻辑。
   * 输入：`tokens`（调用参数）、`changes`（调用参数）、`sourceRule`（调用参数）。
   * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
   */
  function pushCandidate(tokens, changes, sourceRule) {
    const normalizedTokens = normalizePinyinArray(tokens);
    const fullPinyinNoTone = joinPinyin(normalizedTokens);
    if (!fullPinyinNoTone || seen.has(fullPinyinNoTone)) {
      return;
    }
    seen.add(fullPinyinNoTone);
    candidates.push({
      fullPinyinNoTone,
      initials: initialsFromTokens(normalizedTokens),
      syllables: normalizedTokens,
      sourceRule,
      changes: changes.map((item) => ({ ...item })),
    });
  }

  for (const slot of slots) {
    for (const alternative of slot.alternatives) {
      const tokens = [...defaultTokens];
      tokens[slot.index] = alternative;
      pushCandidate(tokens, [{
        index: slot.index,
        char: slot.char,
        from: slot.defaultPinyin,
        to: alternative,
      }], 'polyphonic_single_char_swap');
      if (candidates.length >= limit) {
        return {
          defaultFullPinyinNoTone: joinPinyin(defaultTokens),
          defaultInitials: initialsFromTokens(defaultTokens),
          polyphonicSlots: slots,
          candidates,
        };
      }
    }
  }

  if (slots.length > 1 && candidates.length < limit) {
    for (let i = 0; i < slots.length; i += 1) {
      for (let j = i + 1; j < slots.length; j += 1) {
        for (const leftAlternative of slots[i].alternatives) {
          for (const rightAlternative of slots[j].alternatives) {
            const tokens = [...defaultTokens];
            tokens[slots[i].index] = leftAlternative;
            tokens[slots[j].index] = rightAlternative;
            pushCandidate(tokens, [{
              index: slots[i].index,
              char: slots[i].char,
              from: slots[i].defaultPinyin,
              to: leftAlternative,
            }, {
              index: slots[j].index,
              char: slots[j].char,
              from: slots[j].defaultPinyin,
              to: rightAlternative,
            }], 'polyphonic_multi_char_combo');
            if (candidates.length >= limit) {
              return {
                defaultFullPinyinNoTone: joinPinyin(defaultTokens),
                defaultInitials: initialsFromTokens(defaultTokens),
                polyphonicSlots: slots,
                candidates,
              };
            }
          }
        }
      }
    }
  }

  return {
    defaultFullPinyinNoTone: joinPinyin(defaultTokens),
    defaultInitials: initialsFromTokens(defaultTokens),
    polyphonicSlots: slots,
    candidates,
  };
}

/**
 * 功能：判断文本中是否包含中文字符。
 * 输入：`text`，原始文本。
 * 输出：布尔值。
 */
function isChineseLike(text) {
  return /[\u3400-\u9fff]/u.test(text || '');
}

module.exports = {
  normalizePinyinToken,
  normalizePinyinArray,
  joinPinyin,
  initialsFromTokens,
  toPinyinArray,
  toPinyinKey,
  toInitials,
  buildPinyinProfile,
  polyphonicSlots,
  buildPinyinCandidates,
  isChineseLike,
};
