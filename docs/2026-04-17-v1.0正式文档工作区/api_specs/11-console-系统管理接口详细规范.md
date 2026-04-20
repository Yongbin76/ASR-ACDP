# console 系统管理接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`/api/console/system/*`

## 1. 覆盖范围

1. `GET /api/console/system/access-control`
2. `GET /api/console/system/governance-policies`
3. `PUT/POST /api/console/system/governance-policies`
4. `POST /api/console/system/users`
5. `PUT /api/console/system/users/{userId}`
6. `POST /api/console/system/roles`
7. `PUT /api/console/system/roles/{roleId}`
8. `GET/POST/PUT /api/console/system/business-properties*`
9. `GET/POST/PUT /api/console/dictionary-config/business-attributes*`
10. `GET/POST/PUT /api/console/dictionary-config/source-types*`

## 2. 权限

1. 用户查看：`system.user.read`
2. 用户维护：`system.user.manage`
3. 角色查看：`system.role.read`
4. 角色维护：`system.role.manage`
5. 权限查看：`system.permission.read`
6. 治理查看：`system.governance.read`
7. 治理维护：`system.governance.manage`

## 3. 主要接口说明

### 3.1 `GET /api/console/system/access-control`

作用：

1. 汇总返回用户、角色、权限定义。

### 3.2 `GET/POST/PUT /api/console/system/governance-policies`

作用：

1. 查看或保存治理策略。

### 3.3 用户与角色接口

1. 新增用户：`POST /api/console/system/users`
2. 更新用户：`PUT /api/console/system/users/{userId}`
3. 新增角色：`POST /api/console/system/roles`
4. 更新角色：`PUT /api/console/system/roles/{roleId}`

### 3.4 基础配置接口

1. 业务属性配置
2. 来源类型配置

这些接口虽然归在 `dictionary-config` 下，但治理权限上属于系统管理域。

## 4. 代码入口

1. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)
2. [`access-control.js`](/Codex/ACDP/prototype/src/lib/access-control.js)
3. [`governance-policies.js`](/Codex/ACDP/prototype/src/lib/governance-policies.js)
4. [`business-properties.js`](/Codex/ACDP/prototype/src/lib/business-properties.js)
5. [`source-types.js`](/Codex/ACDP/prototype/src/lib/source-types.js)

## 5. 相关测试

1. [`system-management.test.js`](/Codex/ACDP/prototype/tests/unit/system-management.test.js)
2. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
