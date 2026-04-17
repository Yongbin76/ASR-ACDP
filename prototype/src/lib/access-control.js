const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join('prototype', 'config', 'access_control.json');
const ACCESS_CONTROL_CONFIG_PATH_ENV = 'ACDP_ACCESS_CONTROL_CONFIG_PATH';

/**
 * 功能：解析权限配置文件路径。
 * 输入：`appConfig` 应用配置对象。
 * 输出：权限配置文件绝对路径。
 */
function resolveAccessControlConfigPath(appConfig) {
  return process.env[ACCESS_CONTROL_CONFIG_PATH_ENV]
    || (appConfig && appConfig.accessControlConfigPath)
    || path.join((appConfig && appConfig.projectRoot) || process.cwd(), DEFAULT_CONFIG_PATH);
}

/**
 * 功能：读取权限配置文件原始对象。
 * 输入：`appConfig` 应用配置对象。
 * 输出：权限配置原始对象；文件不存在时返回空结构。
 */
function readAccessControlConfig(appConfig) {
  const filePath = resolveAccessControlConfigPath(appConfig);
  if (!fs.existsSync(filePath)) {
    return {
      permissions: [],
      roles: {},
      users: {},
    };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：标准化权限编码数组。
 * 输入：任意权限数组值。
 * 输出：去空、去重后的权限编码数组。
 */
function normalizePermissions(input = []) {
  const values = [];
  for (const item of Array.isArray(input) ? input : []) {
    const normalized = String(item || '').trim();
    if (!normalized || values.includes(normalized)) {
      continue;
    }
    values.push(normalized);
  }
  return values;
}

/**
 * 功能：标准化单个角色配置项。
 * 输入：角色编码、原始角色配置和权限全集。
 * 输出：标准化后的角色对象。
 */
function normalizeRoleDefinition(roleId, value = {}, permissionUniverse = []) {
  const normalizedRoleId = String(roleId || '').trim();
  const permissionSource = Array.isArray(value) ? value : value.permissions;
  return {
    roleId: normalizedRoleId,
    displayName: String((value && value.displayName) || normalizedRoleId).trim() || normalizedRoleId,
    description: String((value && value.description) || '').trim(),
    permissions: normalizePermissions(permissionSource).filter((permission) => permission === '*' || permissionUniverse.includes(permission)),
  };
}

/**
 * 功能：标准化单个用户配置项。
 * 输入：用户编码、原始用户配置和已知角色编码数组。
 * 输出：标准化后的用户对象。
 */
function normalizeUserDefinition(userId, value = {}, roleIds = []) {
  const normalizedUserId = String(userId || value.userId || '').trim();
  const assignedRoles = normalizePermissions(value.assignedRoles || []).filter((roleId) => roleIds.includes(roleId));
  const defaultRole = assignedRoles.includes(String(value.defaultRole || '').trim())
    ? String(value.defaultRole || '').trim()
    : (assignedRoles[0] || roleIds[0] || 'dict_admin');
  return {
    userId: normalizedUserId,
    displayName: String(value.displayName || normalizedUserId).trim() || normalizedUserId,
    defaultRole,
    assignedRoles,
  };
}

/**
 * 功能：读取并标准化权限配置。
 * 输入：`appConfig` 应用配置对象。
 * 输出：包含权限、角色、用户及索引映射的标准化配置对象。
 */
function loadAccessControlDefinitions(appConfig) {
  const raw = readAccessControlConfig(appConfig);
  const permissions = normalizePermissions(raw.permissions || []);
  const roleEntries = Object.entries(raw.roles || {})
    .map(([roleId, value]) => normalizeRoleDefinition(roleId, value, permissions))
    .filter((item) => item.roleId);
  const roleIds = roleEntries.map((item) => item.roleId);
  const roles = roleEntries.sort((left, right) => left.roleId.localeCompare(right.roleId, 'en'));
  const roleMap = new Map(roles.map((item) => [item.roleId, item]));
  const users = Object.entries(raw.users || {})
    .map(([userId, value]) => normalizeUserDefinition(userId, value, roleIds))
    .filter((item) => item.userId)
    .sort((left, right) => left.userId.localeCompare(right.userId, 'en'));
  const userMap = new Map(users.map((item) => [item.userId, item]));
  return {
    configPath: resolveAccessControlConfigPath(appConfig),
    permissions,
    roles,
    users,
    roleMap,
    userMap,
  };
}

/**
 * 功能：把标准化权限配置写回 JSON 文件。
 * 输入：`appConfig` 应用配置对象和标准化配置对象。
 * 输出：写回后的最新标准化配置对象。
 */
function saveAccessControlDefinitions(appConfig, definitions = {}) {
  const filePath = resolveAccessControlConfigPath(appConfig);
  const payload = {
    permissions: normalizePermissions(definitions.permissions || []),
    roles: {},
    users: {},
  };
  const roles = Array.isArray(definitions.roles) ? definitions.roles : [];
  roles.forEach((role) => {
    const roleId = String(role.roleId || '').trim();
    if (!roleId) {
      return;
    }
    payload.roles[roleId] = {
      displayName: String(role.displayName || roleId).trim() || roleId,
      description: String(role.description || '').trim(),
      permissions: normalizePermissions(role.permissions || []),
    };
  });
  const users = Array.isArray(definitions.users) ? definitions.users : [];
  users.forEach((user) => {
    const userId = String(user.userId || '').trim();
    if (!userId) {
      return;
    }
    payload.users[userId] = {
      userId,
      displayName: String(user.displayName || userId).trim() || userId,
      defaultRole: String(user.defaultRole || '').trim(),
      assignedRoles: normalizePermissions(user.assignedRoles || []),
    };
  });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return loadAccessControlDefinitions(appConfig);
}

/**
 * 功能：创建或更新单个角色配置。
 * 输入：`appConfig` 应用配置对象和角色 payload。
 * 输出：写回后的角色对象。
 */
function upsertAccessControlRole(appConfig, payload = {}) {
  const definitions = loadAccessControlDefinitions(appConfig);
  const roleId = String(payload.roleId || '').trim();
  if (!roleId) {
    const error = new Error('roleId is required');
    error.statusCode = 400;
    error.code = 'access_control_role_id_required';
    throw error;
  }
  const permissions = normalizePermissions(payload.permissions || []).filter((permission) => permission === '*' || definitions.permissions.includes(permission));
  const normalizedPermissions = permissions.includes('*') ? ['*'] : permissions;
  if (!normalizedPermissions.length) {
    const error = new Error('permissions is required');
    error.statusCode = 400;
    error.code = 'access_control_role_permissions_required';
    throw error;
  }
  const nextRoles = definitions.roles.filter((item) => item.roleId !== roleId);
  nextRoles.push({
    roleId,
    displayName: String(payload.displayName || roleId).trim() || roleId,
    description: String(payload.description || '').trim(),
    permissions: normalizedPermissions,
  });
  const nextDefinitions = saveAccessControlDefinitions(appConfig, {
    permissions: definitions.permissions,
    roles: nextRoles,
    users: definitions.users.map((user) => {
      if (!user.assignedRoles.includes(roleId)) {
        return user;
      }
      return {
        ...user,
        defaultRole: user.defaultRole || roleId,
      };
    }),
  });
  return nextDefinitions.roleMap.get(roleId) || null;
}

/**
 * 功能：创建或更新单个用户配置。
 * 输入：`appConfig` 应用配置对象和用户 payload。
 * 输出：写回后的用户对象。
 */
function upsertAccessControlUser(appConfig, payload = {}) {
  const definitions = loadAccessControlDefinitions(appConfig);
  const userId = String(payload.userId || '').trim();
  if (!userId) {
    const error = new Error('userId is required');
    error.statusCode = 400;
    error.code = 'access_control_user_id_required';
    throw error;
  }
  const assignedRoles = normalizePermissions(payload.assignedRoles || []).filter((roleId) => definitions.roleMap.has(roleId));
  if (!assignedRoles.length) {
    const error = new Error('assignedRoles is required');
    error.statusCode = 400;
    error.code = 'access_control_user_roles_required';
    throw error;
  }
  const defaultRole = assignedRoles.includes(String(payload.defaultRole || '').trim())
    ? String(payload.defaultRole || '').trim()
    : assignedRoles[0];
  const nextUsers = definitions.users.filter((item) => item.userId !== userId);
  nextUsers.push({
    userId,
    displayName: String(payload.displayName || userId).trim() || userId,
    defaultRole,
    assignedRoles,
  });
  const nextDefinitions = saveAccessControlDefinitions(appConfig, {
    permissions: definitions.permissions,
    roles: definitions.roles,
    users: nextUsers,
  });
  return nextDefinitions.userMap.get(userId) || null;
}

module.exports = {
  loadAccessControlDefinitions,
  resolveAccessControlConfigPath,
  upsertAccessControlRole,
  upsertAccessControlUser,
};
