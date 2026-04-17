function channelRank(channel = '') {
  return channel === 'literal' ? 0 : 1;
}

function dedupeCandidateOptions(items = []) {
  const dedup = new Map();
  for (const item of items) {
    const text = String(item && item.text ? item.text : '').trim();
    if (!text) {
      continue;
    }
    const current = dedup.get(text);
    if (!current) {
      dedup.set(text, { ...item, text });
      continue;
    }
    if (Number(current.confidence || 0) < Number(item.confidence || 0)) {
      dedup.set(text, { ...item, text });
      continue;
    }
    if (Number(current.confidence || 0) === Number(item.confidence || 0) && channelRank(current.channel) > channelRank(item.channel)) {
      dedup.set(text, { ...item, text });
    }
  }
  return Array.from(dedup.values()).sort((left, right) => {
    if (Number(left.confidence || 0) !== Number(right.confidence || 0)) {
      return Number(right.confidence || 0) - Number(left.confidence || 0);
    }
    if (channelRank(left.channel) !== channelRank(right.channel)) {
      return channelRank(left.channel) - channelRank(right.channel);
    }
    return String(left.text || '').localeCompare(String(right.text || ''), 'zh-CN');
  });
}

function buildCandidateSlots(detail = {}, options = {}) {
  const evaluated = Array.isArray(detail.evaluated) ? detail.evaluated : [];
  const merged = Array.isArray(detail.merged) ? detail.merged : [];
  const maxAlternativesPerSlot = Math.max(1, Number(options.maxAlternativesPerSlot || 3));

  return merged.map((hit, index) => {
    const sameSpan = evaluated.filter((entry) => entry.action !== 'block' && entry.start === hit.start && entry.end === hit.end);
    const candidateOptions = dedupeCandidateOptions(sameSpan.map((entry) => ({
      text: entry.canonical,
      confidence: Number(entry.confidence || 0),
      channel: entry.channel,
      action: entry.action,
      termId: entry.termId,
    })));
    const selectedText = hit.action === 'replace' ? hit.canonical : hit.orig;
    const alternatives = candidateOptions
      .filter((entry) => entry.text !== selectedText)
      .slice(0, maxAlternativesPerSlot);
    return {
      slotId: `slot_${index + 1}`,
      start: hit.start,
      end: hit.end,
      origText: hit.orig,
      selectedText,
      selectedConfidence: hit.action === 'replace' ? Number(hit.confidence || 0) : 1,
      selectedChannel: hit.channel,
      selectedAction: hit.action,
      alternatives,
    };
  });
}

function renderTextFromSlots(rawText = '', slots = [], choices = new Map()) {
  if (!slots.length) {
    return String(rawText || '');
  }
  const ordered = [...slots].sort((left, right) => left.start - right.start);
  let cursor = 0;
  let output = '';
  for (const slot of ordered) {
    output += rawText.slice(cursor, slot.start);
    output += choices.get(slot.slotId) || slot.selectedText;
    cursor = slot.end + 1;
  }
  output += rawText.slice(cursor);
  return output;
}

function buildCorrectedTexts(detail = {}, options = {}) {
  const maxOutputs = Math.max(1, Number(options.maxOutputs || 4));
  const maxSlots = Math.max(1, Number(options.maxSlots || 5));
  const maxChangedSlots = Math.max(1, Number(options.maxChangedSlots || 2));
  const allSlots = buildCandidateSlots(detail, options);
  const slots = allSlots
    .filter((slot) => Array.isArray(slot.alternatives) && slot.alternatives.length > 0)
    .sort((left, right) => {
      const leftBest = Number(((left.alternatives || [])[0] || {}).confidence || 0);
      const rightBest = Number(((right.alternatives || [])[0] || {}).confidence || 0);
      if (leftBest !== rightBest) {
        return rightBest - leftBest;
      }
      return left.start - right.start;
    })
    .slice(0, maxSlots);
  const baseText = String(detail.correctedText != null ? detail.correctedText : renderTextFromSlots(String(detail.rawText || ''), allSlots));
  const seen = new Set([baseText]);
  const ranked = [];

  for (const slot of slots) {
    for (const alternative of slot.alternatives || []) {
      const choices = new Map([[slot.slotId, alternative.text]]);
      const text = renderTextFromSlots(String(detail.rawText || ''), allSlots, choices);
      if (!text || seen.has(text)) {
        continue;
      }
      seen.add(text);
      ranked.push({
        text,
        score: Number(alternative.confidence || 0),
      });
    }
  }

  if (maxChangedSlots >= 2) {
    for (let i = 0; i < slots.length; i += 1) {
      for (let j = i + 1; j < slots.length; j += 1) {
        for (const leftAlternative of slots[i].alternatives || []) {
          for (const rightAlternative of slots[j].alternatives || []) {
            const choices = new Map([
              [slots[i].slotId, leftAlternative.text],
              [slots[j].slotId, rightAlternative.text],
            ]);
            const text = renderTextFromSlots(String(detail.rawText || ''), allSlots, choices);
            if (!text || seen.has(text)) {
              continue;
            }
            seen.add(text);
            ranked.push({
              text,
              score: Number(leftAlternative.confidence || 0) + Number(rightAlternative.confidence || 0) - 0.05,
            });
          }
        }
      }
    }
  }

  ranked.sort((left, right) => {
    if (Number(left.score || 0) !== Number(right.score || 0)) {
      return Number(right.score || 0) - Number(left.score || 0);
    }
    return String(left.text || '').localeCompare(String(right.text || ''), 'zh-CN');
  });

  return [baseText]
    .concat(ranked.slice(0, Math.max(0, maxOutputs - 1)).map((entry) => entry.text))
    .filter(Boolean);
}

module.exports = {
  buildCandidateSlots,
  buildCorrectedTexts,
};
