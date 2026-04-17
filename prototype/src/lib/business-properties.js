const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join('prototype', 'config', 'business_properties.json');
const BUSINESS_PROPERTIES_CONFIG_PATH_ENV = 'ACDP_BUSINESS_PROPERTIES_CONFIG_PATH';

/**
 * 功能：解析业务属性配置文件路径。
 * 输入：`appConfig` 应用配置对象。
 * 输出：业务属性配置文件绝对路径。
 */
function resolveBusinessPropertiesConfigPath(appConfig) {
  return process.env[BUSINESS_PROPERTIES_CONFIG_PATH_ENV]
    || (appConfig && appConfig.businessPropertiesConfigPath)
    || path.join((appConfig && appConfig.projectRoot) || process.cwd(), DEFAULT_CONFIG_PATH);
}

/**
 * 功能：读取业务属性配置文件并解析为对象。
 * 输入：`appConfig` 应用配置对象。
 * 输出：原始配置对象；文件不存在时返回空配置。
 */
function readBusinessPropertiesConfig(appConfig) {
  const filePath = resolveBusinessPropertiesConfigPath(appConfig);
  if (!fs.existsSync(filePath)) {
    return { items: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：标准化单条业务属性配置。
 * 输入：原始业务属性配置项。
 * 输出：标准化后的业务属性对象；缺少 value 时返回 `null`。
 */
function normalizeBusinessProperty(item = {}) {
  const value = String(item.value || item.code || item.categoryCode || '').trim();
  if (!value) {
    return null;
  }
  return {
    code: value,
    value,
    label: String(item.label || item.name || value).trim() || value,
    description: String(item.description || '').trim(),
    enabled: item.enabled !== false,
    sortOrder: Number(item.sortOrder || item.sort || 0),
    legacyCategoryCode: String(item.legacyCategoryCode || value).trim() || value,
  };
}

/**
 * 功能：按排序和编码稳定整理业务属性数组。
 * 输入：业务属性数组。
 * 输出：稳定排序后的业务属性数组。
 */
function sortBusinessProperties(items = []) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.value.localeCompare(right.value, 'en');
  });
}

/**
 * 功能：读取并标准化全部业务属性定义。
 * 输入：`appConfig` 应用配置对象。
 * 输出：包含配置路径和全部业务属性的对象。
 */
function loadBusinessPropertyDefinitions(appConfig) {
  const raw = readBusinessPropertiesConfig(appConfig);
  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeBusinessProperty).filter(Boolean)
    : [];
  return {
    configPath: resolveBusinessPropertiesConfigPath(appConfig),
    items: sortBusinessProperties(items),
  };
}

/**
 * 功能：把全部业务属性定义写回配置文件。
 * 输入：`appConfig` 应用配置对象和业务属性定义对象。
 * 输出：写回后的标准化业务属性定义对象。
 */
function saveBusinessPropertyDefinitions(appConfig, definitions = {}) {
  const filePath = resolveBusinessPropertiesConfigPath(appConfig);
  const payload = {
    items: sortBusinessProperties(
      Array.isArray(definitions.items)
        ? definitions.items.map(normalizeBusinessProperty).filter(Boolean)
        : [],
    ),
  };
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return loadBusinessPropertyDefinitions(appConfig);
}

/**
 * 功能：列出已启用的业务属性配置，按排序和编码稳定输出。
 * 输入：`appConfig` 应用配置对象。
 * 输出：已启用的业务属性数组。
 */
function listBusinessProperties(appConfig) {
  return loadBusinessPropertyDefinitions(appConfig).items.filter((item) => item.enabled);
}

/**
 * 功能：按编码读取单条业务属性配置。
 * 输入：`appConfig` 应用配置对象、业务属性编码。
 * 输出：业务属性对象；不存在时返回 `null`。
 */
function getBusinessProperty(appConfig, value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }
  return loadBusinessPropertyDefinitions(appConfig).items.find((item) => item.value === normalized || item.legacyCategoryCode === normalized) || null;
}

/**
 * 功能：校验业务属性是否可被当前录入动作使用。
 * 输入：`appConfig`、业务属性编码和校验选项。
 * 输出：合法业务属性对象；不合法时返回 `null`。
 */
function usableBusinessProperty(appConfig, value, options = {}) {
  const normalized = String(value || '').trim();
  const currentValue = String(options.currentValue || '').trim();
  if (!normalized) {
    return null;
  }
  const item = getBusinessProperty(appConfig, normalized);
  if (!item) {
    return null;
  }
  if (normalized === currentValue || item.legacyCategoryCode === currentValue) {
    return item;
  }
  return item.enabled === true ? item : null;
}

/**
 * 功能：创建或更新单条业务属性配置。
 * 输入：`appConfig` 应用配置对象和业务属性 payload。
 * 输出：写回后的业务属性对象。
 */
function upsertBusinessProperty(appConfig, payload = {}) {
  const definitions = loadBusinessPropertyDefinitions(appConfig);
  const value = String(payload.value || '').trim();
  if (!value) {
    const error = new Error('business property value is required');
    error.statusCode = 400;
    error.code = 'business_property_value_required';
    throw error;
  }
  const nextItems = definitions.items.filter((item) => item.value !== value);
  nextItems.push({
    value,
    label: String(payload.label || value).trim() || value,
    description: String(payload.description || '').trim(),
    enabled: payload.enabled !== false,
    sortOrder: Number(payload.sortOrder || 0),
    legacyCategoryCode: String(payload.legacyCategoryCode || value).trim() || value,
  });
  const nextDefinitions = saveBusinessPropertyDefinitions(appConfig, { items: nextItems });
  return nextDefinitions.items.find((item) => item.value === value) || null;
}

/**
 * 功能：启用或停用单条业务属性配置。
 * 输入：`appConfig` 应用配置对象、业务属性编码和启用布尔值。
 * 输出：写回后的业务属性对象。
 */
function setBusinessPropertyEnabled(appConfig, value, enabled) {
  const definitions = loadBusinessPropertyDefinitions(appConfig);
  const normalized = String(value || '').trim();
  const current = definitions.items.find((item) => item.value === normalized);
  if (!current) {
    const error = new Error(`business property not found: ${value}`);
    error.statusCode = 404;
    error.code = 'business_property_not_found';
    throw error;
  }
  const nextDefinitions = saveBusinessPropertyDefinitions(appConfig, {
    items: definitions.items.map((item) => (item.value === normalized ? { ...item, enabled: enabled === true } : item)),
  });
  return nextDefinitions.items.find((item) => item.value === normalized) || null;
}

/**
 * 功能：删除单条业务属性配置。
 * 输入：`appConfig` 应用配置对象和业务属性编码。
 * 输出：被删除的业务属性对象。
 */
function deleteBusinessProperty(appConfig, value) {
  const definitions = loadBusinessPropertyDefinitions(appConfig);
  const normalized = String(value || '').trim();
  const current = definitions.items.find((item) => item.value === normalized);
  if (!current) {
    const error = new Error(`business property not found: ${value}`);
    error.statusCode = 404;
    error.code = 'business_property_not_found';
    throw error;
  }
  saveBusinessPropertyDefinitions(appConfig, {
    items: definitions.items.filter((item) => item.value !== normalized),
  });
  return current;
}

module.exports = {
  loadBusinessPropertyDefinitions,
  listBusinessProperties,
  getBusinessProperty,
  usableBusinessProperty,
  resolveBusinessPropertiesConfigPath,
  saveBusinessPropertyDefinitions,
  upsertBusinessProperty,
  setBusinessPropertyEnabled,
  deleteBusinessProperty,
};
