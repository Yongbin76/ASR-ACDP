const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');

/**
 * 功能：读取当前仓库中的文本文件。
 * 输入：文件绝对路径。
 * 输出：UTF-8 文本内容。
 */
function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * 功能：返回文本文件的第一行内容。
 * 输入：文件绝对路径。
 * 输出：去除换行后的首行文本。
 */
function firstLine(filePath) {
  return readText(filePath).split(/\r?\n/, 1)[0];
}

test('import template registry stays aligned with template/example assets and docs', () => {
  const config = createAppConfig();
  const importTemplateDir = path.join(config.projectRoot, 'prototype', 'config', 'import_templates');
  const templateIndex = JSON.parse(readText(path.join(importTemplateDir, 'index.json')));
  const templateDoc = readText(path.join(config.projectRoot, 'docs', '2026-04-17-v1.0正式文档工作区', '11-配置项与部署运行说明.md'));

  assert.ok(Array.isArray(templateIndex));
  assert.ok(templateIndex.length >= 6);

  for (const item of templateIndex) {
    const templatePath = path.join(importTemplateDir, item.templateFile);
    const examplePath = path.join(importTemplateDir, item.exampleFile);
    assert.ok(fs.existsSync(templatePath), `missing template asset for ${item.templateCode}`);
    assert.ok(fs.existsSync(examplePath), `missing example asset for ${item.templateCode}`);
    assert.ok(templateDoc.includes(item.templateCode), `template doc missing code ${item.templateCode}`);
    assert.ok(templateDoc.includes(item.templateFile), `template doc missing asset ${item.templateFile}`);
    assert.ok(templateDoc.includes(item.exampleFile), `template doc missing asset ${item.exampleFile}`);

    if (Array.isArray(item.fields) && item.fields.length > 0) {
      const expectedHeader = item.fields.map((field) => field.fieldName).join(',');
      assert.equal(firstLine(templatePath), expectedHeader, `template header mismatch for ${item.templateCode}`);
      assert.equal(firstLine(examplePath), expectedHeader, `example header mismatch for ${item.templateCode}`);
    }
  }
});

test('validation feed example payloads stay aligned with current docs', () => {
  const config = createAppConfig();
  const examplePath = path.join(config.projectRoot, 'prototype', 'config', 'validation_feed_examples.json');
  const validationExamples = JSON.parse(readText(examplePath));
  const capabilityDoc = readText(path.join(config.projectRoot, 'docs', '2026-04-17-v1.0正式文档工作区', '11-配置项与部署运行说明.md'));
  const prototypeReadme = readText(path.join(config.projectRoot, 'prototype', 'README.md'));

  const expectedShapes = [
    { sourceType: 'cg3', collectionKey: 'records' },
    { sourceType: 'qa_feedback', collectionKey: 'feedbacks' },
    { sourceType: 'online_feedback', collectionKey: 'events' },
  ];

  for (const item of expectedShapes) {
    assert.ok(validationExamples[item.sourceType], `missing validation feed example for ${item.sourceType}`);
    assert.ok(Array.isArray(validationExamples[item.sourceType][item.collectionKey]), `missing ${item.sourceType}.${item.collectionKey}[] example payload`);
    assert.ok(validationExamples[item.sourceType][item.collectionKey].length > 0, `empty ${item.sourceType}.${item.collectionKey}[] example payload`);
    assert.ok(capabilityDoc.includes(`${item.sourceType}.${item.collectionKey}[]`), `capability doc missing ${item.sourceType}.${item.collectionKey}[]`);
    assert.ok(prototypeReadme.includes(`${item.sourceType}.${item.collectionKey}[]`), `prototype README missing ${item.sourceType}.${item.collectionKey}[]`);
  }

  assert.ok(capabilityDoc.includes('prototype/config/validation_feed_examples.json'));
  assert.ok(prototypeReadme.includes('prototype/config/validation_feed_examples.json'));
});
