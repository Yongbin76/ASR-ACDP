const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { PrototypeRuntime, latestSnapshotPath } = require('../../src/lib/runtime');
const { buildSnapshot, writeSnapshot } = require('../../src/lib/snapshot-builder');
const { createAppConfig } = require('../../src/lib/config');
const { servicePaths, status } = require('../../src/cli/service-manager');

test('PrototypeRuntime corrects known literal aliases from snapshot', () => {
  const snapshot = buildSnapshot([{
    termId: 'term_1',
    categoryCode: 'poi_road',
    canonicalText: '祁顺路',
    aliases: ['旗顺路'],
    replaceMode: 'replace',
    baseConfidence: 0.95,
    pinyinRuntimeMode: 'candidate',
    rules: {},
  }]);
  const runtime = new PrototypeRuntime(snapshot, '/tmp/snapshot.json');
  const result = runtime.match('我想去旗顺路');
  assert.equal(result.correctedText, '我想去祁顺路');
  assert.equal(result.matches.length, 1);
});

test('PrototypeRuntime keeps candidate literal hits out of correctedText but exposes them as candidates', () => {
  const snapshot = buildSnapshot([{
    termId: 'term_candidate_1',
    categoryCode: 'poi_road',
    canonicalText: '祁候选顺路',
    aliases: ['旗候选顺路'],
    replaceMode: 'candidate',
    baseConfidence: 0.92,
    pinyinRuntimeMode: 'candidate',
    rules: {
      candidateOnly: true,
    },
    pinyinProfile: {
      fullPinyinNoTone: 'qihouxuanshunlu',
      initials: 'qhxsl',
      syllables: ['qi', 'hou', 'xuan', 'shun', 'lu'],
      runtimeMode: 'candidate',
      polyphoneMode: 'default',
      customFullPinyinNoTone: '',
      alternativeReadings: [],
      notes: '',
    },
  }]);
  const runtime = new PrototypeRuntime(snapshot, '/tmp/snapshot.json');
  const detail = runtime.matchDetailed('我想去旗候选顺路');
  assert.equal(detail.correctedText, '我想去旗候选顺路');
  assert.equal(detail.matches.length, 0);
  assert.equal(detail.candidates.length, 1);
  assert.equal(detail.candidates[0].canonical, '祁候选顺路');
});

test('PrototypeRuntime disables pinyin replacement when pinyinRuntimeMode is off', () => {
  const snapshot = buildSnapshot([{
    termId: 'term_candidate_2',
    categoryCode: 'poi_road',
    canonicalText: '祁静默顺路',
    aliases: [],
    replaceMode: 'replace',
    baseConfidence: 0.94,
    pinyinRuntimeMode: 'off',
    rules: {},
    pinyinProfile: {
      fullPinyinNoTone: 'qijingmoshunlu',
      initials: 'qjmsl',
      syllables: ['qi', 'jing', 'mo', 'shun', 'lu'],
      runtimeMode: 'off',
      polyphoneMode: 'default',
      customFullPinyinNoTone: '',
      alternativeReadings: [],
      notes: '',
    },
  }]);
  const runtime = new PrototypeRuntime(snapshot, '/tmp/snapshot.json');
  const detail = runtime.matchDetailed('我想找旗静默顺路');
  assert.equal(detail.correctedText, '我想找旗静默顺路');
  assert.equal(detail.candidates.length, 0);
});

test('PrototypeRuntime prefers replace over candidate on the same span', () => {
  const snapshot = buildSnapshot([
    {
      termId: 'term_replace',
      categoryCode: 'poi_road',
      canonicalText: '祁同位顺路',
      aliases: ['旗同位顺路'],
      replaceMode: 'replace',
      baseConfidence: 0.95,
      pinyinRuntimeMode: 'candidate',
      rules: {},
      pinyinProfile: {
        fullPinyinNoTone: 'qitongweishunlu',
        initials: 'qtwsl',
        syllables: ['qi', 'tong', 'wei', 'shun', 'lu'],
        runtimeMode: 'candidate',
        polyphoneMode: 'default',
        customFullPinyinNoTone: '',
        alternativeReadings: [],
        notes: '',
      },
    },
    {
      termId: 'term_candidate_overlap',
      categoryCode: 'poi_road',
      canonicalText: '岐同位顺路',
      aliases: ['旗同位顺路'],
      replaceMode: 'candidate',
      baseConfidence: 0.99,
      pinyinRuntimeMode: 'candidate',
      rules: {
        candidateOnly: true,
      },
      pinyinProfile: {
        fullPinyinNoTone: 'qitongweishunlu',
        initials: 'qtwsl',
        syllables: ['qi', 'tong', 'wei', 'shun', 'lu'],
        runtimeMode: 'candidate',
        polyphoneMode: 'default',
        customFullPinyinNoTone: '',
        alternativeReadings: [],
        notes: '',
      },
    },
  ]);
  const runtime = new PrototypeRuntime(snapshot, '/tmp/snapshot.json');
  const detail = runtime.matchDetailed('我想去旗同位顺路');
  assert.equal(detail.correctedText, '我想去祁同位顺路');
  assert.equal(detail.matches.length, 1);
  assert.equal(detail.matches[0].canonical, '祁同位顺路');
});

test('latestSnapshotPath resolves from config object', () => {
  const appConfig = createAppConfig();
  const expected = path.join(appConfig.resolvedPaths.latestReleaseDir, 'snapshot.json');
  assert.equal(latestSnapshotPath(appConfig), expected);
});

test('service manager status reports stopped when pid file is absent', () => {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', 'workspace-unit-service');
  const config = {
    ...baseConfig,
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
    },
  };
  if (fs.existsSync(workspaceDir)) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
  const paths = servicePaths(config);
  assert.equal(paths.pidFile.endsWith('prototype.pid'), true);
  const result = status(config);
  assert.equal(result.status, 'stopped');
  assert.equal(result.pid, null);
});

test('service manager builds separate runtime/admin service paths', () => {
  const baseConfig = createAppConfig();
  const runtimePaths = servicePaths(baseConfig, 'runtime');
  const adminPaths = servicePaths(baseConfig, 'admin');
  assert.equal(runtimePaths.pidFile.endsWith('runtime.pid'), true);
  assert.equal(adminPaths.pidFile.endsWith('admin.pid'), true);
  assert.equal(runtimePaths.serverEntry.endsWith(path.join('prototype', 'src', 'runtime-server.js')), true);
  assert.equal(adminPaths.serverEntry.endsWith(path.join('prototype', 'src', 'admin-server.js')), true);
});

test('writeSnapshot writes manifest and snapshot files', () => {
  const tempDir = path.join('/tmp', `acdp_snapshot_test_${Date.now()}`);
  const snapshot = buildSnapshot([{
    termId: 'term_2',
    categoryCode: 'proper_noun',
    canonicalText: '婚姻介绍所',
    aliases: ['婚姻检查所'],
    replaceMode: 'replace',
    baseConfidence: 0.93,
    pinyinRuntimeMode: 'candidate',
    rules: {},
  }]);
  const files = writeSnapshot(tempDir, snapshot);
  assert.equal(fs.existsSync(files.snapshotPath), true);
  assert.equal(fs.existsSync(files.manifestPath), true);
  fs.rmSync(tempDir, { recursive: true, force: true });
});
