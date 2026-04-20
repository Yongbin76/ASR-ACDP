# console 帮助中心接口详细规范

- 文档状态：active
- 适用版本：v1.0
- 文档类型：api_spec
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`/api/console/help*`

## 1. 覆盖范围

1. `GET /api/console/help`
2. `GET /api/console/help/{slug}`
3. `GET /api/console/help/{slug}/source`

## 2. 权限

1. 当前统一按 `dashboard.read`

## 3. 接口说明

### 3.1 `GET /api/console/help`

作用：

1. 返回帮助目录。

输出来源：

1. [`console_help.json`](/Codex/ACDP/prototype/config/console_help.json)

### 3.2 `GET /api/console/help/{slug}`

作用：

1. 返回某篇帮助正文。

输出通常包含：

1. 标题
2. 分类
3. 摘要
4. 正文
5. `sourceDocPath`

### 3.3 `GET /api/console/help/{slug}/source`

作用：

1. 下载帮助原文 Markdown。

## 4. 代码入口

1. [`console-help.js`](/Codex/ACDP/prototype/src/lib/console-help.js)
2. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)

## 5. 相关测试

1. [`console-help-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-help-api.test.js)
