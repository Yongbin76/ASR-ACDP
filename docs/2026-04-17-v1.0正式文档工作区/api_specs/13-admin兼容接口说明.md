# admin 兼容接口说明

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`/api/admin/*`

## 1. 定位

`/api/admin/*` 当前仍保留，但主要作为兼容层和原型接口存在。

当前正式后台主流程应优先走：

1. `/api/console/*`

## 2. 当前仍保留的主要接口

1. `/api/admin/me`
2. `/api/admin/dashboard`
3. `/api/admin/terms*`
4. `/api/admin/validation-cases*`
5. `/api/admin/pinyin-*`
6. `/api/admin/reviews*`
7. `/api/admin/releases*`
8. `/api/admin/gray-policies*`
9. `/api/admin/runtime-control*`
10. `/api/admin/audits`

## 3. 使用边界

1. 新增正式管理能力时，不应再优先扩 `admin` 路由。
2. 兼容接口改动时，要同时确认是否已存在等价 `/api/console/*`。

## 4. 代码入口

1. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)

## 5. 相关测试

1. [`admin-smoke.test.js`](/Codex/ACDP/prototype/tests/unit/admin-smoke.test.js)
2. [`api-contract-snapshots.test.js`](/Codex/ACDP/prototype/tests/unit/api-contract-snapshots.test.js)
