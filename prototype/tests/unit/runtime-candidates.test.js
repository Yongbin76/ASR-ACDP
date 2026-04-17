const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCandidateSlots, buildCorrectedTexts } = require('../../src/lib/runtime-candidates');

test('runtime candidates returns only base text when no alternatives exist', () => {
  const detail = {
    rawText: '我想咨询工伤认定',
    correctedText: '我想咨询工伤认定',
    evaluated: [],
    merged: [],
  };
  assert.deepEqual(buildCorrectedTexts(detail), ['我想咨询工伤认定']);
});

test('runtime candidates builds candidate slots from merged hits and keeps base result first', () => {
  const detail = {
    rawText: '我想咨询旗顺路',
    correctedText: '我想咨询祁顺路',
    evaluated: [
      { start: 4, end: 6, orig: '旗顺路', canonical: '祁顺路', action: 'replace', confidence: 0.93, channel: 'pinyin_exact', termId: 't1' },
      { start: 4, end: 6, orig: '旗顺路', canonical: '岐顺路', action: 'candidate', confidence: 0.82, channel: 'pinyin_exact', termId: 't2' },
      { start: 4, end: 6, orig: '旗顺路', canonical: '齐顺路', action: 'candidate', confidence: 0.8, channel: 'literal', termId: 't3' },
    ],
    merged: [
      { start: 4, end: 6, orig: '旗顺路', canonical: '祁顺路', action: 'replace', confidence: 0.93, channel: 'pinyin_exact', termId: 't1' },
    ],
  };
  const slots = buildCandidateSlots(detail);
  assert.equal(slots.length, 1);
  assert.equal(slots[0].selectedText, '祁顺路');
  assert.deepEqual(slots[0].alternatives.map((entry) => entry.text), ['岐顺路', '齐顺路']);
  assert.deepEqual(buildCorrectedTexts(detail), ['我想咨询祁顺路', '我想咨询岐顺路', '我想咨询齐顺路']);
});

test('runtime candidates can combine two changed slots and dedupe outputs', () => {
  const detail = {
    rawText: '我想咨询旗顺路和市发改委',
    correctedText: '我想咨询祁顺路和市发改委',
    evaluated: [
      { start: 4, end: 6, orig: '旗顺路', canonical: '祁顺路', action: 'replace', confidence: 0.93, channel: 'pinyin_exact', termId: 't1' },
      { start: 4, end: 6, orig: '旗顺路', canonical: '岐顺路', action: 'candidate', confidence: 0.82, channel: 'pinyin_exact', termId: 't2' },
      { start: 8, end: 11, orig: '市发改委', canonical: '上海市发展和改革委员会', action: 'candidate', confidence: 0.79, channel: 'literal', termId: 't3' },
    ],
    merged: [
      { start: 4, end: 6, orig: '旗顺路', canonical: '祁顺路', action: 'replace', confidence: 0.93, channel: 'pinyin_exact', termId: 't1' },
      { start: 8, end: 11, orig: '市发改委', canonical: '上海市发展和改革委员会', action: 'candidate', confidence: 0.79, channel: 'literal', termId: 't3' },
    ],
  };
  const correctedTexts = buildCorrectedTexts(detail);
  assert.equal(correctedTexts[0], '我想咨询祁顺路和市发改委');
  assert.ok(correctedTexts.includes('我想咨询岐顺路和市发改委'));
  assert.ok(correctedTexts.includes('我想咨询祁顺路和上海市发展和改革委员会'));
  assert.ok(correctedTexts.includes('我想咨询岐顺路和上海市发展和改革委员会'));
});

test('runtime candidates ignore blocked hits and return original text first when no replace hit exists', () => {
  const detail = {
    rawText: '我想咨询市发改委',
    correctedText: '我想咨询市发改委',
    evaluated: [
      { start: 4, end: 7, orig: '市发改委', canonical: '上海市发展和改革委员会', action: 'candidate', confidence: 0.78, channel: 'literal', termId: 't1' },
      { start: 4, end: 7, orig: '市发改委', canonical: '市发展改革委', action: 'block', confidence: 0.9, channel: 'literal', termId: 't2' },
    ],
    merged: [
      { start: 4, end: 7, orig: '市发改委', canonical: '上海市发展和改革委员会', action: 'candidate', confidence: 0.78, channel: 'literal', termId: 't1' },
    ],
  };
  assert.deepEqual(buildCorrectedTexts(detail), ['我想咨询市发改委', '我想咨询上海市发展和改革委员会']);
});
