const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join('prototype', 'config', 'console_navigation.json');

/**
 * 功能：解析控制台导航配置文件路径。
 * 输入：应用配置对象。
 * 输出：导航配置文件绝对路径。
 */
function resolveConsoleNavigationConfigPath(appConfig = {}) {
  return (appConfig && appConfig.projectRoot)
    ? path.join(appConfig.projectRoot, DEFAULT_CONFIG_PATH)
    : path.join(process.cwd(), DEFAULT_CONFIG_PATH);
}

/**
 * 功能：读取控制台导航原始配置。
 * 输入：应用配置对象。
 * 输出：原始配置对象；文件不存在时返回空配置。
 */
function readConsoleNavigationConfig(appConfig = {}) {
  const filePath = resolveConsoleNavigationConfigPath(appConfig);
  if (!fs.existsSync(filePath)) {
    return { groups: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：规范化导航分组项。
 * 输入：单个二级导航对象。
 * 输出：标准化后的导航项；缺少 path 时返回 `null`。
 */
function normalizeConsoleNavigationItem(item = {}) {
  const pathValue = String(item.path || '').trim();
  if (!pathValue) {
    return null;
  }
  const navKey = String(item.navKey || '').trim() || pathValue.replace(/^\/console/, '') || '/';
  return {
    key: String(item.key || navKey).trim() || navKey,
    label: String(item.label || navKey).trim() || navKey,
    path: pathValue,
    navKey,
    helpSlug: String(item.helpSlug || '').trim(),
  };
}

/**
 * 功能：规范化导航分组。
 * 输入：单个一级导航对象。
 * 输出：标准化后的导航分组；缺少 items 时返回 `null`。
 */
function normalizeConsoleNavigationGroup(group = {}) {
  const items = Array.isArray(group.items)
    ? group.items.map(normalizeConsoleNavigationItem).filter(Boolean)
    : [];
  if (!items.length) {
    return null;
  }
  return {
    key: String(group.key || '').trim() || `group_${items[0].key}`,
    label: String(group.label || group.key || '').trim() || '未命名分组',
    shortLabel: String(group.shortLabel || group.label || group.key || '').trim().slice(0, 1) || '导',
    iconGlyph: String(group.iconGlyph || '').trim() || String(group.shortLabel || group.label || group.key || '').trim().slice(0, 1) || '导',
    order: Number(group.order || 0),
    items,
  };
}

/**
 * 功能：读取并标准化控制台导航配置。
 * 输入：应用配置对象。
 * 输出：包含配置路径和分组数组的对象。
 */
function loadConsoleNavigation(appConfig = {}) {
  const raw = readConsoleNavigationConfig(appConfig);
  const groups = Array.isArray(raw.groups)
    ? raw.groups.map(normalizeConsoleNavigationGroup).filter(Boolean).sort((left, right) => left.order - right.order)
    : [];
  return {
    configPath: resolveConsoleNavigationConfigPath(appConfig),
    groups,
  };
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 功能：把标准化导航配置渲染为控制台左侧目录树 HTML。
 * 输入：导航分组数组。
 * 输出：HTML 字符串。
 */
function renderConsoleNavigationHtml(groups = []) {
  return (groups || []).map((group) => `
    <details class="nav-group" data-nav-group="${escapeHtml(group.key)}" open>
      <summary
        class="nav-group-summary"
        data-short-label="${escapeHtml(group.shortLabel)}"
        data-label="${escapeHtml(group.label)}"
        title="${escapeHtml(group.label)}"
        aria-label="${escapeHtml(group.label)}"
      >
        <span class="nav-group-icon" aria-hidden="true">${escapeHtml(group.iconGlyph)}</span>
        <span class="nav-group-summary-text">${escapeHtml(group.label)}</span>
      </summary>
      <div class="nav-group-children">
        ${(group.items || []).map((item) => `
          <a data-link href="${escapeHtml(item.path)}" data-nav="${escapeHtml(item.navKey)}" data-help-slug="${escapeHtml(item.helpSlug)}">
            <span class="nav-item-label">${escapeHtml(item.label)}</span>
          </a>
        `).join('')}
      </div>
    </details>
  `).join('');
}

module.exports = {
  loadConsoleNavigation,
  normalizeConsoleNavigationGroup,
  normalizeConsoleNavigationItem,
  readConsoleNavigationConfig,
  renderConsoleNavigationHtml,
  resolveConsoleNavigationConfigPath,
};
