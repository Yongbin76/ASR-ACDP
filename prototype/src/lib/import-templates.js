const fs = require('fs');
const path = require('path');
const { listBusinessProperties } = require('./business-properties');

const INDEX_FILE = path.join('prototype', 'config', 'import_templates', 'index.json');

/**
 * 功能：读取导入模板索引文件。
 * 输入：`appConfig` 应用配置对象。
 * 输出：模板定义数组。
 */
function readTemplateIndex(appConfig) {
  const filePath = path.join(appConfig.projectRoot, INDEX_FILE);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：列出启用中的导入模板。
 * 输入：`appConfig` 应用配置对象。
 * 输出：模板数组。
 */
function listImportTemplates(appConfig) {
  const businessProperties = listBusinessProperties(appConfig);
  return readTemplateIndex(appConfig).map((item) => ({
    templateCode: item.templateCode,
    templateName: item.templateName,
    templateVersion: item.templateVersion,
    importType: item.importType,
    sourceType: item.sourceType,
    fileFormat: item.fileFormat,
    description: item.description || '',
    downloadable: Boolean(item.templateFile),
    templateRole: String(item.templateRole || '').trim(),
    primary: item.primary === true,
    legacy: item.legacy === true,
    consoleVisible: item.consoleVisible !== false,
    supersededBy: String(item.supersededBy || '').trim(),
    supportsDefaultCategoryCode: item.supportsDefaultCategoryCode === true,
    businessCategoryOptions: Array.isArray(item.businessCategoryOptions) && item.businessCategoryOptions.length
      ? item.businessCategoryOptions
      : businessProperties,
    enabled: true,
  }));
}

/**
 * 功能：读取单个导入模板详情。
 * 输入：`appConfig` 应用配置对象，`templateCode` 模板编码。
 * 输出：模板对象或 `null`。
 */
function getImportTemplate(appConfig, templateCode) {
  return readTemplateIndex(appConfig).find((item) => item.templateCode === templateCode) || null;
}

/**
 * 功能：解析模板或示例文件的绝对路径。
 * 输入：`appConfig`、`templateCode`、文件角色 `kind`。
 * 输出：绝对路径字符串；不存在时返回空字符串。
 */
function resolveImportTemplateAsset(appConfig, templateCode, kind = 'template') {
  const item = getImportTemplate(appConfig, templateCode);
  if (!item) {
    return '';
  }
  const fileName = kind === 'example' ? item.exampleFile : item.templateFile;
  if (!fileName) {
    return '';
  }
  return path.join(appConfig.projectRoot, 'prototype', 'config', 'import_templates', fileName);
}

module.exports = {
  listImportTemplates,
  getImportTemplate,
  resolveImportTemplateAsset,
};
