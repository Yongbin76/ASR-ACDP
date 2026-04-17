const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join('prototype', 'config', 'source_types.json');
const SOURCE_TYPES_CONFIG_PATH_ENV = 'ACDP_SOURCE_TYPES_CONFIG_PATH';
const ALLOWED_SCOPES = new Set(['dictionary', 'validation']);
const ALLOWED_ENTRY_MODES = new Set(['manual', 'import']);

/**
 * 功能：解析来源类型配置文件路径。
 * 输入：`appConfig` 应用配置对象。
 * 输出：来源类型配置文件绝对路径。
 */
function resolveSourceTypesConfigPath(appConfig) {
  return process.env[SOURCE_TYPES_CONFIG_PATH_ENV]
    || (appConfig && appConfig.sourceTypesConfigPath)
    || path.join((appConfig && appConfig.projectRoot) || process.cwd(), DEFAULT_CONFIG_PATH);
}

/**
 * 功能：读取来源类型配置文件并解析为对象。
 * 输入：`appConfig` 应用配置对象。
 * 输出：原始配置对象；文件不存在时返回空配置。
 */
function readSourceTypesConfig(appConfig) {
  const filePath = resolveSourceTypesConfigPath(appConfig);
  if (!fs.existsSync(filePath)) {
    return { items: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：把来源类型 scope 字段标准化为数组。
 * 输入：原始来源类型配置项。
 * 输出：合法 scope 数组。
 */
function normalizeScopes(item = {}) {
  const rawScopes = Array.isArray(item.scopes)
    ? item.scopes
    : String(item.scope || '').split(',');
  const scopes = Array.from(new Set(rawScopes
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter((entry) => ALLOWED_SCOPES.has(entry))));
  return scopes.length ? scopes : ['dictionary'];
}

/**
 * 功能：把来源类型允许录入模式字段标准化为数组。
 * 输入：原始来源类型配置项。
 * 输出：合法录入模式数组。
 */
function normalizeAllowedEntryModes(item = {}) {
  const rawModes = Array.isArray(item.allowedEntryModes)
    ? item.allowedEntryModes
    : String(item.allowedEntryModes || '').split(',');
  const modes = Array.from(new Set(rawModes
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter((entry) => ALLOWED_ENTRY_MODES.has(entry))));
  return modes.length ? modes : ['manual', 'import'];
}

/**
 * 功能：标准化单条来源类型配置。
 * 输入：原始来源类型配置项。
 * 输出：标准化后的来源类型对象；缺少 code 时返回 `null`。
 */
function normalizeSourceType(item = {}) {
  const code = String(item.code || item.value || item.sourceType || '').trim();
  if (!code) {
    return null;
  }
  const scopes = normalizeScopes(item);
  const allowedEntryModes = normalizeAllowedEntryModes(item);
  return {
    code,
    value: code,
    label: String(item.label || item.name || code).trim() || code,
    description: String(item.description || '').trim(),
    enabled: item.enabled !== false,
    sortOrder: Number(item.sortOrder || item.sort || 0),
    scope: scopes.length === 1 ? scopes[0] : scopes.join(','),
    scopes,
    allowedEntryModes,
  };
}

/**
 * 功能：按排序和编码稳定整理来源类型数组。
 * 输入：来源类型数组。
 * 输出：稳定排序后的来源类型数组。
 */
function sortSourceTypes(items = []) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.code.localeCompare(right.code, 'en');
  });
}

/**
 * 功能：读取并标准化全部来源类型定义。
 * 输入：`appConfig` 应用配置对象。
 * 输出：包含配置路径和全部来源类型的对象。
 */
function loadSourceTypeDefinitions(appConfig) {
  const raw = readSourceTypesConfig(appConfig);
  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeSourceType).filter(Boolean)
    : [];
  return {
    configPath: resolveSourceTypesConfigPath(appConfig),
    items: sortSourceTypes(items),
  };
}

/**
 * 功能：把全部来源类型定义写回配置文件。
 * 输入：`appConfig` 应用配置对象和来源类型定义对象。
 * 输出：写回后的标准化来源类型定义对象。
 */
function saveSourceTypeDefinitions(appConfig, definitions = {}) {
  const filePath = resolveSourceTypesConfigPath(appConfig);
  const payload = {
    items: sortSourceTypes(
      Array.isArray(definitions.items)
        ? definitions.items.map(normalizeSourceType).filter(Boolean)
        : [],
    ).map((item) => ({
      code: item.code,
      label: item.label,
      description: item.description,
      enabled: item.enabled,
      sortOrder: item.sortOrder,
      scopes: item.scopes,
      allowedEntryModes: item.allowedEntryModes,
    })),
  };
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return loadSourceTypeDefinitions(appConfig);
}

/**
 * 功能：列出来源类型配置，可按 scope、录入模式和启用状态过滤。
 * 输入：`appConfig` 应用配置对象与可选过滤条件。
 * 输出：来源类型数组。
 */
function listSourceTypes(appConfig, filters = {}) {
  const scope = String(filters.scope || '').trim().toLowerCase();
  const entryMode = String(filters.entryMode || '').trim().toLowerCase();
  const includeDisabled = filters.includeDisabled === true;
  return loadSourceTypeDefinitions(appConfig).items.filter((item) => {
    if (!includeDisabled && item.enabled !== true) {
      return false;
    }
    if (scope && !item.scopes.includes(scope)) {
      return false;
    }
    if (entryMode && !item.allowedEntryModes.includes(entryMode)) {
      return false;
    }
    return true;
  });
}

/**
 * 功能：按编码读取单条来源类型配置。
 * 输入：`appConfig` 应用配置对象、来源类型编码。
 * 输出：来源类型对象；不存在时返回 `null`。
 */
function getSourceType(appConfig, code) {
  const normalized = String(code || '').trim();
  if (!normalized) {
    return null;
  }
  return loadSourceTypeDefinitions(appConfig).items.find((item) => item.code === normalized) || null;
}

/**
 * 功能：校验来源类型是否可在指定域和录入模式下使用。
 * 输入：`appConfig`、来源类型编码和校验选项。
 * 输出：合法来源类型对象；不合法时返回 `null`。
 */
function usableSourceType(appConfig, code, options = {}) {
  const currentCode = String(options.currentCode || '').trim();
  const normalized = String(code || '').trim();
  const scope = String(options.scope || '').trim().toLowerCase();
  const entryMode = String(options.entryMode || '').trim().toLowerCase();
  const item = getSourceType(appConfig, normalized);
  if (!item) {
    return null;
  }
  if (normalized === currentCode) {
    return item;
  }
  if (item.enabled !== true) {
    return null;
  }
  if (scope && !item.scopes.includes(scope)) {
    return null;
  }
  if (entryMode && !item.allowedEntryModes.includes(entryMode)) {
    return null;
  }
  return item;
}

/**
 * 功能：创建或更新单条来源类型配置。
 * 输入：`appConfig` 应用配置对象和来源类型 payload。
 * 输出：写回后的来源类型对象。
 */
function upsertSourceType(appConfig, payload = {}) {
  const definitions = loadSourceTypeDefinitions(appConfig);
  const code = String(payload.code || payload.value || '').trim();
  if (!code) {
    const error = new Error('source type code is required');
    error.statusCode = 400;
    error.code = 'source_type_code_required';
    throw error;
  }
  const nextItems = definitions.items.filter((item) => item.code !== code);
  nextItems.push({
    code,
    label: String(payload.label || code).trim() || code,
    description: String(payload.description || '').trim(),
    enabled: payload.enabled !== false,
    sortOrder: Number(payload.sortOrder || 0),
    scope: payload.scope,
    scopes: normalizeScopes(payload),
    allowedEntryModes: normalizeAllowedEntryModes(payload),
  });
  const nextDefinitions = saveSourceTypeDefinitions(appConfig, { items: nextItems });
  return nextDefinitions.items.find((item) => item.code === code) || null;
}

/**
 * 功能：启用或停用单条来源类型配置。
 * 输入：`appConfig` 应用配置对象、来源类型编码和启用布尔值。
 * 输出：写回后的来源类型对象。
 */
function setSourceTypeEnabled(appConfig, code, enabled) {
  const definitions = loadSourceTypeDefinitions(appConfig);
  const normalized = String(code || '').trim();
  const current = definitions.items.find((item) => item.code === normalized);
  if (!current) {
    const error = new Error(`source type not found: ${code}`);
    error.statusCode = 404;
    error.code = 'source_type_not_found';
    throw error;
  }
  const nextDefinitions = saveSourceTypeDefinitions(appConfig, {
    items: definitions.items.map((item) => (item.code === normalized ? { ...item, enabled: enabled === true } : item)),
  });
  return nextDefinitions.items.find((item) => item.code === normalized) || null;
}

/**
 * 功能：删除单条来源类型配置。
 * 输入：`appConfig` 应用配置对象和来源类型编码。
 * 输出：被删除的来源类型对象。
 */
function deleteSourceType(appConfig, code) {
  const definitions = loadSourceTypeDefinitions(appConfig);
  const normalized = String(code || '').trim();
  const current = definitions.items.find((item) => item.code === normalized);
  if (!current) {
    const error = new Error(`source type not found: ${code}`);
    error.statusCode = 404;
    error.code = 'source_type_not_found';
    throw error;
  }
  saveSourceTypeDefinitions(appConfig, {
    items: definitions.items.filter((item) => item.code !== normalized),
  });
  return current;
}

module.exports = {
  loadSourceTypeDefinitions,
  listSourceTypes,
  getSourceType,
  usableSourceType,
  resolveSourceTypesConfigPath,
  saveSourceTypeDefinitions,
  upsertSourceType,
  setSourceTypeEnabled,
  deleteSourceType,
};
