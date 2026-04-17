const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildConcurrencySummary,
  normalizeBaseUrl,
  readArg,
  runtimeRequestHeaders,
} = require('../../src/cli/concurrency-test');

test('concurrency CLI helpers parse inline base-url and inject runtime bearer token', () => {
  assert.equal(
    readArg('--base-url', '', ['--base-url=http://127.0.0.1:9000///']),
    'http://127.0.0.1:9000///',
  );
  assert.equal(normalizeBaseUrl('http://127.0.0.1:9000///'), 'http://127.0.0.1:9000');

  const headers = runtimeRequestHeaders({
    auth: {
      runtimeBearerToken: 'runtime-loadtest-token',
    },
  });
  assert.equal(headers.authorization, 'Bearer runtime-loadtest-token');
  assert.equal(headers['content-type'], 'application/json; charset=utf-8');
});

test('buildConcurrencySummary merges runtime peak and latency metrics into final report', () => {
  const summary = buildConcurrencySummary([{
    workerId: 1,
    durations: [12.4, 18.2],
    correctedText: '我想咨询祁顺路。',
  }, {
    workerId: 2,
    durations: [20.1, 30.6],
    correctedText: '我想咨询工伤认定。',
  }], {
    peak: {
      peakConcurrency: 4,
    },
    totalCorrections: 4,
    totalErrors: 1,
    inFlight: 0,
  }, {
    endpoint: '/api/runtime/correct',
    users: 2,
    iterations: 2,
    totalRequests: 4,
    totalDurationMs: 200,
    targetRps: 10,
  });

  assert.equal(summary.endpoint, '/api/runtime/correct');
  assert.equal(summary.totalRequests, 4);
  assert.equal(summary.throughputRps, 20);
  assert.equal(summary.meetsTarget, true);
  assert.equal(summary.avgLatencyMs, 20.33);
  assert.equal(summary.p50LatencyMs, 18.2);
  assert.equal(summary.p95LatencyMs, 30.6);
  assert.equal(summary.maxLatencyMs, 30.6);
  assert.equal(summary.peakConcurrency, 4);
  assert.equal(summary.runtimeTotalCorrections, 4);
  assert.equal(summary.runtimeTotalErrors, 1);
  assert.equal(summary.sampleCorrectedText, '我想咨询祁顺路。');
});

test('buildConcurrencySummary keeps target evaluation empty when no target-rps is requested', () => {
  const summary = buildConcurrencySummary([{
    workerId: 1,
    durations: [9.2, 10.8],
    correctedText: '我想咨询祁顺路。',
  }], {
    peak: {
      peakConcurrency: 1,
    },
    totalCorrections: 2,
    totalErrors: 0,
    inFlight: 0,
  }, {
    endpoint: '/api/runtime/correct',
    users: 1,
    iterations: 2,
    totalRequests: 2,
    totalDurationMs: 50,
    targetRps: null,
  });

  assert.equal(summary.targetRps, null);
  assert.equal(summary.meetsTarget, null);
  assert.equal(summary.throughputRps, 40);
});
