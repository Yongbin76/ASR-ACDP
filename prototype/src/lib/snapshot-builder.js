const fs = require('fs');
const path = require('path');
const { buildPinyinProfile, joinPinyin, toInitials } = require('./pinyin');

/**
 * 功能：对数组去重并过滤空值。
 * 输入：`items` 任意数组。
 * 输出：去重后的数组。
 */
function unique(items) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

/**
 * 功能：为词条及其来源文本收集需要写入快照的拼音键。
 * 输入：`term` 词条对象，`sourceText` 来源文本。
 * 输出：拼音键字符串数组。
 */
function pinyinKeysForEntry(term, sourceText) {
  const keys = new Set();
  const sourceProfile = buildPinyinProfile(sourceText);
  if (sourceProfile.fullPinyinNoTone) {
    keys.add(sourceProfile.fullPinyinNoTone);
  }

  const profile = term.pinyinProfile || null;
  if (profile && sourceText === term.canonicalText) {
    if (profile.fullPinyinNoTone) {
      keys.add(joinPinyin(profile.fullPinyinNoTone));
    }
    for (const alt of profile.alternativeReadings || []) {
      const normalized = joinPinyin(alt);
      if (normalized) {
        keys.add(normalized);
      }
    }
  }

  return Array.from(keys);
}

/**
 * 功能：把可发布词条构造成运行时快照对象。
 * 输入：`terms` 可构建词条数组。
 * 输出：包含 manifest、literalPatterns、pinyinExactIndex 等字段的快照对象。
 */
function buildSnapshot(terms) {
  const literalPatterns = [];
  const pinyinExactIndex = new Map();

  for (const term of terms) {
    const aliases = unique(term.aliases || []);
    for (const alias of aliases) {
      literalPatterns.push({
        termId: term.termId,
        categoryCode: term.categoryCode,
        canonicalText: term.canonicalText,
        pattern: alias,
        baseConfidence: term.baseConfidence,
        replaceMode: term.replaceMode,
      });
    }

    // Manual pinyin governance takes priority for canonical text. When a term has
    // a custom profile or alternative readings, snapshot compilation must preserve them.
    const pinyinEntries = unique([term.canonicalText].concat(aliases));
    for (const sourceText of pinyinEntries) {
      for (const key of pinyinKeysForEntry(term, sourceText)) {
        if (!key) {
          continue;
        }
        if (!pinyinExactIndex.has(key)) {
          pinyinExactIndex.set(key, []);
        }
        pinyinExactIndex.get(key).push({
          termId: term.termId,
          categoryCode: term.categoryCode,
          canonicalText: term.canonicalText,
          sourceText,
          baseConfidence: term.baseConfidence,
          initials: sourceText === term.canonicalText && term.pinyinProfile && term.pinyinProfile.initials
            ? term.pinyinProfile.initials
            : toInitials(sourceText),
        });
      }
    }
  }

  return {
    manifest: {
      version: new Date().toISOString().replace(/[:]/g, '-'),
      builtAt: new Date().toISOString(),
      schemaVersion: 1,
      normalizerVersion: 'v1',
      termCount: terms.length,
      literalPatternCount: literalPatterns.length,
      pinyinKeyCount: pinyinExactIndex.size,
    },
    terms,
    literalPatterns,
    pinyinExactIndex: Array.from(pinyinExactIndex.entries()),
  };
}

/**
 * 功能：把快照和 manifest 写入指定 release 目录。
 * 输入：`releaseDir` 目录路径，`snapshot` 快照对象。
 * 输出：写出的 `snapshotPath` 和 `manifestPath`。
 */
function writeSnapshot(releaseDir, snapshot) {
  fs.mkdirSync(releaseDir, { recursive: true });
  const snapshotPath = path.join(releaseDir, 'snapshot.json');
  const manifestPath = path.join(releaseDir, 'manifest.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
  fs.writeFileSync(manifestPath, JSON.stringify(snapshot.manifest, null, 2), 'utf8');
  return { snapshotPath, manifestPath };
}

/**
 * 功能：把某个 release 的产物复制到 latest 目录。
 * 输入：配置对象或项目根目录，以及 `release` 版本对象。
 * 输出：latest 目录的绝对路径。
 */
function publishToLatest(appConfigOrProjectRoot, release) {
  const latestDir = appConfigOrProjectRoot && appConfigOrProjectRoot.resolvedPaths && appConfigOrProjectRoot.resolvedPaths.latestReleaseDir
    ? appConfigOrProjectRoot.resolvedPaths.latestReleaseDir
    : path.join(appConfigOrProjectRoot, 'prototype', 'workspace', 'releases', 'latest');
  fs.mkdirSync(latestDir, { recursive: true });
  fs.copyFileSync(release.snapshotPath, path.join(latestDir, 'snapshot.json'));
  fs.copyFileSync(release.manifestPath, path.join(latestDir, 'manifest.json'));
  return latestDir;
}

module.exports = {
  buildSnapshot,
  writeSnapshot,
  publishToLatest,
};
