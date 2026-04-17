const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join('prototype', 'config', 'console_help.json');
const CONSOLE_HELP_CONFIG_PATH_ENV = 'ACDP_CONSOLE_HELP_CONFIG_PATH';

/**
 * 功能：解析帮助中心配置文件路径。
 * 输入：`appConfig` 应用配置对象。
 * 输出：帮助中心配置文件绝对路径。
 */
function resolveConsoleHelpConfigPath(appConfig) {
  return process.env[CONSOLE_HELP_CONFIG_PATH_ENV]
    || (appConfig && appConfig.consoleHelpConfigPath)
    || path.join((appConfig && appConfig.projectRoot) || process.cwd(), DEFAULT_CONFIG_PATH);
}

/**
 * 功能：读取帮助中心配置文件原始对象。
 * 输入：`appConfig` 应用配置对象。
 * 输出：帮助中心配置原始对象；文件不存在时返回空结构。
 */
function readConsoleHelpConfig(appConfig) {
  const filePath = resolveConsoleHelpConfigPath(appConfig);
  if (!fs.existsSync(filePath)) {
    return { items: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：把帮助文章配置项标准化为统一结构。
 * 输入：原始帮助文章配置项。
 * 输出：标准化后的帮助文章对象。
 */
function normalizeConsoleHelpArticle(item = {}) {
  return {
    slug: String(item.slug || '').trim(),
    title: String(item.title || '').trim(),
    summary: String(item.summary || '').trim(),
    updatedAt: String(item.updatedAt || '').trim(),
    kicker: String(item.kicker || '帮助说明').trim() || '帮助说明',
    sourceDocPath: String(item.sourceDocPath || '').trim(),
  };
}

/**
 * 功能：返回帮助文章对应的仓库文档相对路径。
 * 输入：帮助文章 slug 和应用配置对象。
 * 输出：仓库文档相对路径；不存在时返回空字符串。
 */
function consoleHelpSourceDocPath(slug = '', appConfig) {
  const normalizedSlug = String(slug || '').trim();
  const items = (readConsoleHelpConfig(appConfig).items || []).map((item) => normalizeConsoleHelpArticle(item));
  const matched = items.find((item) => item.slug === normalizedSlug);
  return matched ? matched.sourceDocPath : '';
}

/**
 * 功能：把帮助文章 slug 解析为仓库中的原始文档绝对路径。
 * 输入：项目根目录、帮助文章 slug 和应用配置对象。
 * 输出：原始文档绝对路径；不存在时返回空字符串。
 */
function resolveConsoleHelpSourceFile(projectRoot = '', slug = '', appConfig) {
  const sourceDocPath = consoleHelpSourceDocPath(slug, appConfig);
  if (!sourceDocPath || !projectRoot) {
    return '';
  }
  const resolvedFile = path.join(projectRoot, sourceDocPath);
  return resolvedFile.startsWith(projectRoot) ? resolvedFile : '';
}

/**
 * 功能：返回控制台帮助文章列表。
 * 输入：`appConfig` 应用配置对象。
 * 输出：帮助文章摘要数组。
 */
function listConsoleHelpArticles(appConfig) {
  return (readConsoleHelpConfig(appConfig).items || [])
    .map((item) => normalizeConsoleHelpArticle(item))
    .filter((item) => item.slug && item.title)
    .sort((left, right) => left.title.localeCompare(right.title, 'zh-CN'));
}

/**
 * 功能：按 slug 读取单篇帮助文章。
 * 输入：帮助文章 slug 和应用配置对象。
 * 输出：帮助文章对象；不存在时返回 `null`。
 */
function getConsoleHelpArticle(slug, appConfig) {
  const normalizedSlug = String(slug || '').trim();
  const article = listConsoleHelpArticles(appConfig).find((item) => item.slug === normalizedSlug);
  if (!article) {
    return null;
  }
  const projectRoot = (appConfig && appConfig.projectRoot) || process.cwd();
  const sourceFile = resolveConsoleHelpSourceFile(projectRoot, normalizedSlug, appConfig);
  const markdown = sourceFile && fs.existsSync(sourceFile)
    ? fs.readFileSync(sourceFile, 'utf8').replace(/^\uFEFF/, '')
    : '';
  return {
    ...article,
    markdown,
    sourceDocPath: article.sourceDocPath,
  };
}

module.exports = {
  resolveConsoleHelpConfigPath,
  consoleHelpSourceDocPath,
  listConsoleHelpArticles,
  getConsoleHelpArticle,
  resolveConsoleHelpSourceFile,
};
