const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeText, mapSpan } = require('../../src/lib/normalizer');
const { parseCsv } = require('../../src/lib/csv');
const { AhoCorasick } = require('../../src/lib/ac');

test('normalizeText keeps offset mapping for normalized text', () => {
  const result = normalizeText('Ａ B');
  assert.equal(result.normalizedText, 'A B');
  assert.deepEqual(mapSpan(result.offsetMap, 0, 2), { start: 0, end: 2 });
});

test('parseCsv parses quoted cells and headers', () => {
  const rows = parseCsv('name,remark\nalice,"hello,world"\n');
  assert.deepEqual(rows, [{ name: 'alice', remark: 'hello,world' }]);
});

test('AhoCorasick finds all inserted patterns', () => {
  const ac = new AhoCorasick();
  ac.add('abc', { id: 1, pattern: 'abc' });
  ac.add('bc', { id: 2, pattern: 'bc' });
  ac.build();
  const hits = ac.findAll('zabc');
  assert.equal(hits.length, 2);
  assert.deepEqual(hits.map((item) => item.payload.id).sort(), [1, 2]);
});
