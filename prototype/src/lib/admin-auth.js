const { loadAccessControlDefinitions } = require('./access-control');

const DEFAULT_ACCESS_CONTROL = loadAccessControlDefinitions();
const PERMISSIONS = [...DEFAULT_ACCESS_CONTROL.permissions];

/**
 * 功能：按调用上下文读取权限定义。
 * 输入：可选 `appConfig`。
 * 输出：标准化后的权限配置定义对象。
 */
function accessControlDefinitionsFor(appConfig) {
  return loadAccessControlDefinitions(appConfig);
}

/**
 * 功能：处理`pageFeature`相关逻辑。
 * 输入：`featureKey`（调用参数）、`pageKey`（页面键）、`pageTitle`（调用参数）、`path`（调用参数）、`label`（标签文本）、`permission`（调用参数）、`options`（扩展选项）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function pageFeature(featureKey, pageKey, pageTitle, path, label, permission, options = {}) {
  return {
    featureKey,
    pageKey,
    pageTitle,
    path,
    label,
    permission,
    riskLevel: options.riskLevel || 'low',
    constraintCode: options.constraintCode || '',
    confirmRequired: options.confirmRequired === true,
  };
}

const PAGE_FEATURE_MATRIX = [
  pageFeature('overview.view', '/', '工作台', '/console', '查看工作台', 'dashboard.read'),
  pageFeature('overview.runtimeDemo.view', '/', '工作台', '/console', '查看工作台纠错演示区', 'runtime.read'),
  pageFeature('overview.runtimeDemo.run', '/', '工作台', '/console', '执行工作台纠错演示', 'simulate.run'),
  pageFeature('overview.quick.termCreate', '/', '工作台', '/console', '工作台快捷创建词条', 'term.write'),
  pageFeature('overview.quick.import', '/', '工作台', '/console', '工作台快捷进入词典导入', 'term.read'),
  pageFeature('overview.quick.review', '/', '工作台', '/console', '工作台快捷进入词典审核', 'review.read'),
  pageFeature('system.view', '/system', '系统配置', '/console/system', '查看系统配置', 'dashboard.read'),
  pageFeature('runtime.view', '/runtime', '运行治理', '/console/runtime', '查看运行治理', 'dashboard.read'),
  pageFeature('terms.view', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '查看词典记录列表', 'term.read'),
  pageFeature('terms.create', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '创建词典记录', 'term.write'),
  pageFeature('terms.bulk.submitReview', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '批量提交词典审核', 'term.review.submit', { riskLevel: 'medium', confirmRequired: true }),
  pageFeature('terms.bulk.disable', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '批量停用词典记录', 'term.review.decide', { riskLevel: 'high', confirmRequired: true }),
  pageFeature('terms.export', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '导出词典记录列表', 'term.read'),
  pageFeature('terms.detail.view', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '查看词典记录详情', 'term.read'),
  pageFeature('terms.detail.editBasic', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '编辑词典记录基础信息', 'term.write'),
  pageFeature('terms.detail.editRules', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '编辑词典记录规则', 'term.write'),
  pageFeature('terms.detail.editPinyin', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '编辑词典记录拼音', 'pinyin.write'),
  pageFeature('terms.review.submit', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '提交词典审核', 'term.review.submit', { riskLevel: 'medium', confirmRequired: true }),
  pageFeature('terms.disable', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '停用词典记录', 'term.review.decide', { riskLevel: 'high', confirmRequired: true }),
  pageFeature('terms.pinyin.generate', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '生成拼音候选', 'pinyin.candidate.generate'),
  pageFeature('terms.pinyin.submit', '/dictionary/terms', '词典记录', '/console/dictionary/terms', '提交拼音候选审核', 'pinyin.candidate.submit', { riskLevel: 'medium', confirmRequired: true }),
  pageFeature('import.view', '/dictionary/import-jobs', '批量导入', '/console/dictionary/import-jobs', '查看词典导入批次', 'term.read'),
  pageFeature('import.write', '/dictionary/import-jobs', '批量导入', '/console/dictionary/import-jobs', '创建词典导入批次', 'term.write'),
  pageFeature('import.confirm', '/dictionary/import-jobs', '批量导入', '/console/dictionary/import-jobs', '确认词典导入批次', 'term.write', { riskLevel: 'high', confirmRequired: true }),
  pageFeature('import.cancel', '/dictionary/import-jobs', '批量导入', '/console/dictionary/import-jobs', '取消词典导入批次', 'term.write', { riskLevel: 'medium', confirmRequired: true }),
  pageFeature('businessProperties.view', '/dictionary/config', '基础配置', '/console/dictionary/config', '查看基础配置', 'term.read'),
  pageFeature('businessProperties.manage', '/dictionary/config', '基础配置', '/console/dictionary/config', '维护基础配置', 'system.governance.manage', { riskLevel: 'high' }),
  pageFeature('reviews.view', '/dictionary/reviews', '词典审核', '/console/dictionary/reviews', '查看词典审核任务', 'review.read'),
  pageFeature('reviews.bulk.approve', '/dictionary/reviews', '词典审核', '/console/dictionary/reviews', '批量审核通过', 'review.decide', { riskLevel: 'high', confirmRequired: true }),
  pageFeature('reviews.bulk.reject', '/dictionary/reviews', '词典审核', '/console/dictionary/reviews', '批量驳回任务', 'review.decide', { riskLevel: 'high', confirmRequired: true }),
  pageFeature('reviews.approve', '/dictionary/reviews', '词典审核', '/console/dictionary/reviews', '审核通过', 'review.decide', { riskLevel: 'high', constraintCode: 'review_separation_required', confirmRequired: true }),
  pageFeature('reviews.reject', '/dictionary/reviews', '词典审核', '/console/dictionary/reviews', '审核驳回', 'review.decide', { riskLevel: 'medium', confirmRequired: true }),
  pageFeature('releases.view', '/releases', '版本列表', '/console/releases', '查看版本列表', 'release.read'),
  pageFeature('releases.build', '/releases', '版本列表', '/console/releases', '构建版本', 'release.build', { riskLevel: 'medium' }),
  pageFeature('releases.submitReview', '/releases', '版本列表', '/console/releases', '提交发布审核', 'release.review.submit', { riskLevel: 'high', confirmRequired: true }),
  pageFeature('releases.rollout', '/releases', '版本列表', '/console/releases', '下发目标版本', 'release.publish', { riskLevel: 'high', confirmRequired: true }),
  pageFeature('releases.canary', '/releases', '版本列表', '/console/releases', '设为灰度版本', 'gray.write', { riskLevel: 'high', confirmRequired: true }),
  pageFeature('releases.publish', '/releases', '版本列表', '/console/releases', '正式发布', 'release.publish', { riskLevel: 'high', constraintCode: 'approved_release_required', confirmRequired: true }),
  pageFeature('releases.rollback', '/releases', '版本列表', '/console/releases', '回滚版本', 'release.rollback', { riskLevel: 'high', confirmRequired: true }),
  pageFeature('runtimeVerify.view', '/runtime-verify', '运行验证', '/console/runtime-verify', '查看运行验证', 'runtime.read'),
  pageFeature('runtimeVerify.correct', '/runtime-verify', '运行验证', '/console/runtime-verify', '执行正式纠错验证', 'runtime.correct'),
  pageFeature('runtimeVerify.correctCand', '/runtime-verify', '运行验证', '/console/runtime-verify', '执行候选纠错验证', 'runtime.correct'),
  pageFeature('runtimeNodeRegistry.view', '/runtime-node-registry', '节点备案', '/console/runtime-node-registry', '查看节点备案台账', 'runtime.node.registry.read'),
  pageFeature('runtimeNodeRegistry.manage', '/runtime-node-registry', '节点备案', '/console/runtime-node-registry', '维护节点备案台账', 'runtime.node.registry.manage', { riskLevel: 'high' }),
  pageFeature('runtimeNodes.view', '/runtime-nodes', '运行节点', '/console/runtime-nodes', '查看运行节点', 'runtime.node.read'),
  pageFeature('runtimeNodes.stats.view', '/runtime-nodes', '运行节点', '/console/runtime-nodes', '查看节点统计摘要', 'runtime.stats.read'),
  pageFeature('runtimeNodes.control', '/runtime-nodes', '运行节点', '/console/runtime-nodes', '执行节点控制动作', 'runtime.node.control', { riskLevel: 'high' }),
  pageFeature('users.view', '/users', '用户', '/console/users', '查看用户', 'system.user.read'),
  pageFeature('users.manage', '/users', '用户', '/console/users', '维护用户配置', 'system.user.manage', { riskLevel: 'high' }),
  pageFeature('roles.view', '/roles', '角色', '/console/roles', '查看角色', 'system.role.read'),
  pageFeature('roles.manage', '/roles', '角色', '/console/roles', '维护角色配置', 'system.role.manage', { riskLevel: 'high' }),
  pageFeature('permissions.view', '/permissions', '权限', '/console/permissions', '查看权限', 'system.permission.read'),
  pageFeature('governance.view', '/governance-policies', '治理策略', '/console/governance-policies', '查看治理策略', 'system.governance.read'),
  pageFeature('governance.manage', '/governance-policies', '治理策略', '/console/governance-policies', '维护治理策略', 'system.governance.manage', { riskLevel: 'high' }),
  pageFeature('validation.view', '/validation/cases', '验证样本', '/console/validation/cases', '查看验证样本', 'validation.read'),
  pageFeature('validation.write', '/validation/cases', '验证样本', '/console/validation/cases', '维护验证样本', 'validation.write'),
  pageFeature('validation.import', '/validation/cases', '验证样本', '/console/validation/cases', '导入验证样本', 'validation.write', { riskLevel: 'medium', confirmRequired: true }),
  pageFeature('validation.disable', '/validation/cases', '验证样本', '/console/validation/cases', '停用验证样本', 'validation.write', { riskLevel: 'medium', confirmRequired: true }),
  pageFeature('validation.bulk.disable', '/validation/cases', '验证样本', '/console/validation/cases', '批量停用验证样本', 'validation.write', { riskLevel: 'high', confirmRequired: true }),
  pageFeature('help.view', '/help', '帮助', '/console/help', '查看帮助', 'dashboard.read'),
];

/**
 * 功能：获取已知`roles`相关逻辑。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function knownRoles(appConfig) {
  return accessControlDefinitionsFor(appConfig).roles.map((item) => ({
    roleId: item.roleId,
    displayName: item.displayName,
    description: item.description,
    permissions: [...item.permissions],
  }));
}

/**
 * 功能：获取已知`users`相关逻辑。
 * 输入：无。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function knownUsers(appConfig) {
  return accessControlDefinitionsFor(appConfig).users.map((item) => ({
    userId: item.userId,
    displayName: item.displayName,
    defaultRole: item.defaultRole,
    assignedRoles: [...item.assignedRoles],
  }));
}

/**
 * 功能：规范化`role`相关逻辑。
 * 输入：`role`（角色标识）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function normalizeRole(role, appConfig) {
  const definitions = accessControlDefinitionsFor(appConfig);
  const value = String(role || 'dict_admin').trim().toLowerCase();
  if (!definitions.roleMap.has(value)) {
    const error = new Error(`unknown role: ${role}`);
    error.statusCode = 400;
    error.code = 'invalid_role';
    throw error;
  }
  return value;
}

/**
 * 功能：处理`permissionsForRole`相关逻辑。
 * 输入：`role`（角色标识）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function permissionsForRole(role, appConfig) {
  const definitions = accessControlDefinitionsFor(appConfig);
  const normalized = normalizeRole(role, appConfig);
  const roleEntry = definitions.roleMap.get(normalized) || { permissions: [] };
  const direct = Array.isArray(roleEntry.permissions) ? roleEntry.permissions : [];
  if (direct.includes('*')) {
    return [...definitions.permissions];
  }
  const baseViewer = definitions.roleMap.get('dict_viewer');
  const merged = new Set((baseViewer && baseViewer.permissions) || []);
  for (const permission of direct) {
    merged.add(permission);
  }
  return Array.from(merged);
}

/**
 * 功能：判断`permission`相关逻辑。
 * 输入：`role`（角色标识）、`permission`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function hasPermission(role, permission, appConfig) {
  if (!permission) {
    return true;
  }
  const normalized = normalizeRole(role, appConfig);
  if (normalized === 'dict_admin') {
    return true;
  }
  return permissionsForRole(normalized, appConfig).includes(permission);
}

/**
 * 功能：解析`user`相关逻辑。
 * 输入：`input`（输入数据）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function resolveUser(input = {}) {
  const definitions = accessControlDefinitionsFor(input.appConfig);
  const userId = String(input.userId || input.operator || 'prototype_user').trim() || 'prototype_user';
  const known = definitions.userMap.get(userId);
  if (known) {
    return {
      userId: known.userId,
      displayName: known.displayName,
      defaultRole: known.defaultRole,
      assignedRoles: [...known.assignedRoles],
    };
  }
  const requestedRole = input.role ? normalizeRole(input.role, input.appConfig) : 'dict_admin';
  return {
    userId,
    displayName: userId,
    defaultRole: requestedRole,
    assignedRoles: [requestedRole],
  };
}

/**
 * 功能：获取当前`role for user`相关逻辑。
 * 输入：`user`（调用参数）、`requestedRole`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function currentRoleForUser(user, requestedRole) {
  const normalizedRequested = requestedRole ? normalizeRole(requestedRole, user.appConfig) : normalizeRole(user.defaultRole || 'dict_admin', user.appConfig);
  if ((user.assignedRoles || []).includes(normalizedRequested)) {
    return normalizedRequested;
  }
  return normalizeRole(user.defaultRole || (user.assignedRoles || [])[0] || 'dict_admin', user.appConfig);
}

/**
 * 功能：处理`pageFeaturesForPermissions`相关逻辑。
 * 输入：`permissions`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function pageFeaturesForPermissions(permissions = []) {
  const permissionSet = new Set(permissions || []);
  return PAGE_FEATURE_MATRIX.filter((item) => permissionSet.has(item.permission)).map((item) => ({
    featureKey: item.featureKey,
    pageKey: item.pageKey,
    pageTitle: item.pageTitle,
    path: item.path,
    label: item.label,
    permission: item.permission,
    riskLevel: item.riskLevel,
    constraintCode: item.constraintCode,
    confirmRequired: item.confirmRequired,
  }));
}

/**
 * 功能：处理`pageAccessMap`相关逻辑。
 * 输入：`pageFeatures`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function pageAccessMap(pageFeatures = []) {
  const map = {};
  for (const feature of pageFeatures) {
    map[feature.pageKey] = true;
  }
  return map;
}

/**
 * 功能：构建`auth context`相关逻辑。
 * 输入：`input`（输入数据）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function buildAuthContext(input = {}) {
  const user = resolveUser(input);
  const role = currentRoleForUser({ ...user, appConfig: input.appConfig }, input.role);
  const permissions = permissionsForRole(role, input.appConfig);
  const pageFeatures = pageFeaturesForPermissions(permissions);
  const definitions = accessControlDefinitionsFor(input.appConfig);
  return {
    userId: user.userId,
    userDisplayName: user.displayName,
    operator: String(input.operator || user.userId).trim() || user.userId,
    role,
    assignedRoles: [...user.assignedRoles],
    permissions,
    pageFeatures,
    pageAccess: pageAccessMap(pageFeatures),
    roleDefinitions: definitions.roles.map((item) => ({
      roleId: item.roleId,
      displayName: item.displayName,
      description: item.description,
      permissions: [...item.permissions],
    })),
    permissionDefinitions: [...definitions.permissions],
    accessControlConfigPath: definitions.configPath,
  };
}

/**
 * 功能：校验并要求`permission`相关逻辑。
 * 输入：`context`（上下文对象）、`permission`（调用参数）。
 * 输出：当前处理结果；若仅执行过程性操作，则无显式返回值。
 */
function requirePermission(context, permission) {
  if (!permission || (Array.isArray(context.permissions) && context.permissions.includes(permission))) {
    return context;
  }
  const error = new Error(`permission denied: ${context.role} lacks ${permission}`);
  error.statusCode = 403;
  error.code = 'permission_denied';
  error.permission = permission;
  error.role = context.role;
  throw error;
}

module.exports = {
  PERMISSIONS,
  PAGE_FEATURE_MATRIX,
  knownRoles,
  knownUsers,
  normalizeRole,
  permissionsForRole,
  hasPermission,
  pageFeaturesForPermissions,
  buildAuthContext,
  requirePermission,
};
