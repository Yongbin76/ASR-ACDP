# ACDP Console 纯视觉维护执行方案

## 1. 定位

本文件不是新一轮 `/console` 改版方案，而是 `JOB-012` 下的纯视觉维护执行约束。

目标只有一个：

- 在不改结构、不扩功能、不重开主线的前提下，把当前 `/console` 的视觉基线从“偏试用页”收紧到“更稳的正式后台感”。

这里明确不是：

- 新设计系统
- Ant Design 仿制项目
- 信息架构重做
- 全站组件重写

## 2. 总边界

### 2.1 明确不动

- 不调整首页板块顺序
- 不增删页面模块
- 不合并或拆分卡片
- 不改变表单字段与按钮位置
- 不改变导航结构
- 不改变文案内容
- 不改变 dense-section 的折叠/滚动行为
- 不改变表格列结构、表格信息密度和业务状态语义
- 不为了视觉统一重新定义 `/console` 的页面节奏

### 2.2 允许调整

- 颜色 token
- 背景与边框颜色
- 圆角
- 阴影强度
- 控件视觉状态
- 小范围间距微调
- 现有字号体系中的最弱档位

## 3. 当前问题判断

基于当前 [app.css](/Codex/ACDP/console/client/app.css) 的真实样式基线，当前视觉问题主要是：

- 页面背景和侧栏偏浅蓝，试用页感偏重
- 品牌蓝用量过高，激活态和常态区分不够克制
- 卡片、按钮、导航项圆角偏大
- 阴影偏飘，不够平稳
- `label` 档位偏弱，浅背景上可读性不足

这些问题可以通过 token 与主框架样式收敛解决，不需要改结构。

## 4. 设计原则

### 4.1 方向

- 页面背景中性化
- 品牌蓝收敛，只用于主按钮、链接、激活态
- 容器平面化，减少渐变和发光感
- 文本层级保持稳定，不重新发明字号体系
- 控件标准化，但不追求“看起来像 Ant”

### 4.2 不追求

- 更强装饰
- 更多渐变
- 更大圆角
- 更重阴影
- 为了“企业后台感”而把现有界面全部换皮

## 5. 执行约束

### 5.1 第一轮只允许改这些

- `:root` 颜色 token 中性化
- `body` 背景去蓝色渐变
- `.sidebar` 去蓝色渐变
- `.card` / `.panel` / `.loading-card` / `.review-card` 边框、圆角、阴影收紧
- `.nav a` / `.sidebar-links a` 的圆角和激活态收紧
- `button` hover 去掉明显上浮
- `--font-size-label` 从 `12px` 提到 `13px`

### 5.2 第一轮明确不改

- `display / page-title / metric / section-title / card-title / body / meta / code` 这些字号层级
- 表格结构和 dense-section 结构
- badge 语义类名体系
- 页面布局断点
- 页面间视觉风格差异过大的局部特例

### 5.3 第二轮才允许考虑

- badge / status 标签视觉统一
- 表格表头底色、边框、hover 统一
- 输入框与次级按钮的细节状态统一

前提是第一轮上线后没有引入阅读性或交互回归。

## 6. 建议 Token

### 6.1 颜色

第一轮建议收敛到：

```css
:root {
  --bg-page: #f5f7fa;
  --bg-panel: #ffffff;
  --bg-soft: #fafbfd;
  --bg-muted: #f0f2f5;

  --brand-strong: #1677ff;
  --brand-main: #1677ff;
  --brand-soft: #d6e4ff;
  --brand-pale: #edf3ff;

  --text-strong: #1f2329;
  --text-main: #3d4757;
  --text-subtle: #6b7280;

  --border: #e5e7eb;
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
}
```

原则：

- 页面底色从浅蓝改为灰白
- 卡片保持纯白
- 品牌蓝固定到稳定值
- 文本颜色整体略加深
- 边框改为中性灰

### 6.2 字号

第一轮只建议改这一项：

```css
:root {
  --font-size-label: 13px;
}
```

其他层级保持当前已收口基线不动：

- display `30px`
- page title `28px`
- metric `32px`
- section title `20px`
- card title `18px`
- body `14px`
- meta `13px`
- code `12px`

原因：

- 这套层级已经在前面收口过
- 现在整体回调页面标题和指标数字，会把维护项扩大成全站视觉复验

### 6.3 圆角与阴影

建议第一轮统一到：

```css
:root {
  --radius-lg: 12px;
  --radius-md: 8px;
  --radius-sm: 6px;
  --shadow-soft: 0 1px 2px rgba(16, 24, 40, 0.05);
  --shadow-hover: 0 4px 12px rgba(16, 24, 40, 0.08);
}
```

映射：

- 大卡片 `12px`
- 输入框 / 按钮 / 导航项 `8px`
- 小标签 `6px` 或胶囊形
- 默认卡片只保留轻阴影
- 不再使用明显“漂浮感” hover

## 7. 第一轮落地建议

### 7.1 页面背景

```css
body {
  background: var(--bg-page);
  color: var(--text-main);
}
```

### 7.2 侧栏

```css
.sidebar {
  background: #ffffff;
  border-right: 1px solid var(--border);
  box-shadow: none;
}

.nav a {
  border-radius: 8px;
}

.nav a.active,
.nav a:hover {
  background: var(--brand-pale);
  color: var(--brand-strong);
  box-shadow: none;
}
```

### 7.3 顶栏

```css
.topbar {
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.9);
}
```

### 7.4 卡片

```css
.card,
.panel,
.loading-card,
.review-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
}
```

### 7.5 输入框与按钮

```css
.access-form input,
.access-form select,
.field input,
.field select,
.field textarea,
.field .file-input,
button {
  border-radius: 8px;
}

button:hover,
.button-link:hover {
  transform: none;
  box-shadow: none;
}
```

### 7.6 Label

```css
.field-label,
.access-form label span,
.trial-badge,
.eyebrow {
  font-size: 13px;
}
```

说明：

- `eyebrow` 如保留大写/字距，应只做弱化，不建议继续用过亮蓝色
- `trial-badge` 只做颜色与字号统一，不改语义和位置

## 8. 第二轮候选项

只有第一轮通过后，才考虑以下内容：

### 8.1 Badge / 状态视觉统一

- 统一成功 / 警告 / 危险态底色、边框、文字色
- 不修改现有状态语义映射

### 8.2 表格表头视觉统一

- `thead` 底色收敛到浅灰
- 边框改为中性灰
- 行 hover 改为极浅蓝灰

但不允许：

- 改表格列
- 改 dense-section 包裹结构
- 改滚动策略
- 改“大数据量默认折叠”规则

## 9. 最小可落地样式包

如果只做第一轮，最小集合就是：

```css
:root {
  --bg-page: #f5f7fa;
  --bg-panel: #ffffff;
  --bg-soft: #fafbfd;
  --bg-muted: #f0f2f5;
  --brand-strong: #1677ff;
  --brand-main: #1677ff;
  --brand-soft: #d6e4ff;
  --brand-pale: #edf3ff;
  --text-strong: #1f2329;
  --text-main: #3d4757;
  --text-subtle: #6b7280;
  --border: #e5e7eb;
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
  --font-size-label: 13px;
}

body {
  background: var(--bg-page);
}

.sidebar {
  background: #ffffff;
}

.nav a,
.sidebar-links a,
.access-form input,
.access-form select,
.access-form button,
.field input,
.field select,
.field textarea,
button {
  border-radius: 8px;
}

.card,
.panel,
.loading-card,
.review-card {
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
}

button:hover,
.button-link:hover {
  transform: none;
  box-shadow: none;
}
```

## 10. 推荐执行顺序

按这个顺序做，风险最小：

1. 先替换 token
2. 再统一侧栏、顶栏、卡片
3. 再统一输入框、按钮、label
4. 最后再决定是否进入 badge / table 的第二轮

## 11. 验收口径

本方案完成后，应满足：

- 页面不再出现明显蓝色渐变主背景
- 侧栏不再保留当前强蓝底观感
- 卡片、按钮、导航项圆角明显收紧
- hover 不再有“营销页式上浮”
- `label` 在浅背景上的可读性改善
- `/console` 结构、功能、dense-section 行为、表格结构完全不变

如果做完后需要重新解释页面结构、信息顺序或交互节奏，说明已经超出本方案边界，应停止并回退到 `JOB-012` 维护范围内。
