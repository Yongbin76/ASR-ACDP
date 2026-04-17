/**
 * 功能：规范化输入文本并构建原始下标映射。
 * 输入：`input`，任意原始文本。
 * 输出：包含原文本、规范化文本和 offsetMap 的对象。
 */
function normalizeText(input) {
  const source = typeof input === 'string' ? input : '';
  const chars = [];
  const offsetMap = [];
  for (let i = 0; i < source.length; i += 1) {
    let piece = source[i];
    if (/\s/.test(piece)) {
      piece = ' ';
    }
    const normalized = piece.normalize('NFKC');
    for (const ch of normalized) {
      chars.push(ch);
      offsetMap.push(i);
    }
  }
  return {
    rawText: source,
    normalizedText: chars.join(''),
    offsetMap,
  };
}

/**
 * 功能：把规范化文本命中区间映射回原始文本区间。
 * 输入：`offsetMap`、规范化起止下标 `start/end`。
 * 输出：原始文本中的 `{ start, end }` 区间。
 */
function mapSpan(offsetMap, start, end) {
  const safeStart = Math.max(0, start);
  const safeEnd = Math.max(safeStart, end);
  return {
    start: offsetMap[safeStart] ?? safeStart,
    end: offsetMap[safeEnd] ?? safeEnd,
  };
}

module.exports = {
  normalizeText,
  mapSpan,
};
