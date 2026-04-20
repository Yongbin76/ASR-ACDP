# `term_rules` 与 `pinyin_profiles` 表详细字典

- 文档状态：active
- 适用版本：v1.0
- 文档类型：data_dictionary
- 所属工作区：2026-04-17-v1.0正式文档工作区
- 最后更新时间：2026-04-18
- 责任对象：`term_rules`、`pinyin_profiles`

## 1. 表组作用

这两张表分别承接：

1. 词条级规则治理。
2. 词条级拼音画像治理。

它们都从属于 `terms.term_id`，不独立成为主对象。

## 2. `term_rules`

### 2.1 表作用

`term_rules` 用于把“词条命中后怎样处理”从硬编码逻辑中拆出来，按词条粒度配置。

### 2.2 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `term_id` | `TEXT` | 否 | 无 | `PRIMARY KEY` / `FOREIGN KEY -> terms(term_id)` | 词条 ID |
| `candidate_only` | `INTEGER` | 否 | `0` | - | 是否只做候选输出 |
| `min_text_len` | `INTEGER` | 是 | `NULL` | - | 最小文本长度限制 |
| `max_text_len` | `INTEGER` | 是 | `NULL` | - | 最大文本长度限制 |
| `boundary_policy` | `TEXT` | 否 | `none` | - | 边界策略 |
| `left_context_allow` | `TEXT` | 否 | `'[]'` | - | 左侧允许上下文 JSON |
| `right_context_allow` | `TEXT` | 否 | `'[]'` | - | 右侧允许上下文 JSON |
| `left_context_block` | `TEXT` | 否 | `'[]'` | - | 左侧阻断上下文 JSON |
| `right_context_block` | `TEXT` | 否 | `'[]'` | - | 右侧阻断上下文 JSON |
| `regex_allow` | `TEXT` | 否 | `'[]'` | - | 允许正则 JSON |
| `regex_block` | `TEXT` | 否 | `'[]'` | - | 阻断正则 JSON |
| `updated_at` | `TEXT` | 否 | 无 | - | 更新时间 |

### 2.3 业务口径

当前系统在业务对象层把这张表映射为：

1. `candidateOnly`
2. `minTextLen`
3. `maxTextLen`
4. `boundaryPolicy`
5. `leftContextAllow`
6. `rightContextAllow`
7. `leftContextBlock`
8. `rightContextBlock`
9. `regexAllow`
10. `regexBlock`

### 2.4 典型案例

```json
{
  "termId": "term_001",
  "candidateOnly": false,
  "minTextLen": 2,
  "maxTextLen": 20,
  "boundaryPolicy": "none",
  "leftContextAllow": [],
  "rightContextAllow": [],
  "leftContextBlock": [],
  "rightContextBlock": [],
  "regexAllow": [],
  "regexBlock": []
}
```

解释：

1. 当前没有特殊上下文门禁。
2. 该词条允许正常替换。

## 3. `pinyin_profiles`

### 3.1 表作用

`pinyin_profiles` 用于存储词条的主读音、备用读音以及 runtime 的拼音执行模式。

### 3.2 字段字典

| 字段 | SQLite 类型 | 可空 | 默认值 | 约束 | 含义 |
|---|---|---|---|---|---|
| `term_id` | `TEXT` | 否 | 无 | `PRIMARY KEY` / `FOREIGN KEY -> terms(term_id)` | 词条 ID |
| `full_pinyin_no_tone` | `TEXT` | 否 | 无 | - | 主拼音 |
| `initials` | `TEXT` | 否 | 无 | - | 首字母串 |
| `syllables_json` | `TEXT` | 否 | 无 | - | 音节数组 JSON |
| `runtime_mode` | `TEXT` | 否 | `candidate` | - | 拼音 runtime 模式 |
| `polyphone_mode` | `TEXT` | 否 | `default` | - | 多音字模式 |
| `custom_full_pinyin_no_tone` | `TEXT` | 否 | `''` | - | 自定义主读音 |
| `alternative_readings_json` | `TEXT` | 否 | `'[]'` | - | 备用读音 JSON |
| `notes` | `TEXT` | 否 | `''` | - | 备注 |
| `updated_at` | `TEXT` | 否 | 无 | - | 更新时间 |

### 3.3 当前业务对象映射

当前读取后映射为：

1. `fullPinyinNoTone`
2. `initials`
3. `syllables`
4. `runtimeMode`
5. `polyphoneMode`
6. `customFullPinyinNoTone`
7. `alternativeReadings`
8. `notes`

### 3.4 典型案例

```json
{
  "termId": "term_001",
  "fullPinyinNoTone": "gong shang ren ding",
  "initials": "gsrd",
  "syllables": ["gong", "shang", "ren", "ding"],
  "runtimeMode": "candidate",
  "polyphoneMode": "default",
  "customFullPinyinNoTone": "",
  "alternativeReadings": [],
  "notes": ""
}
```

### 3.5 审核副作用

当 `pinyin_candidate_review` 审核通过时：

1. 系统读取候选读音。
2. 若不等于当前主读音，且不在 `alternative_readings_json` 中，则追加到备用读音列表。

## 4. 写入路径

### 4.1 `term_rules`

主要写入函数：

1. `upsertTermRules()`
2. `createTerm()`
3. `updateTerm()`

### 4.2 `pinyin_profiles`

主要写入函数：

1. `upsertTermPinyinProfile()`
2. `createTerm()`
3. `updateTerm()`
4. `approveReviewTask()` 中的拼音候选审核通过分支

## 5. 读取路径

### 5.1 `term_rules`

主要读取函数：

1. `getTermRules()`
2. `ruleMapForTermIds()`
3. `getTerm()`
4. release build 相关路径

### 5.2 `pinyin_profiles`

主要读取函数：

1. `getTermPinyinProfile()`
2. `pinyinProfileMapForTermIds()`
3. `listPinyinProfiles()`
4. `generateTermPinyinCandidates()`
5. runtime snapshot build

## 6. 修改风险

1. 改 `candidate_only` 或上下文字段，会直接影响 runtime 匹配与替换结果。
2. 改 `runtime_mode` 或 `alternative_readings_json`，会直接影响拼音召回范围。
3. 改拼音画像结构时，必须同步：
   - runtime snapshot build
   - 拼音候选审核
   - console 拼音治理页面

## 7. 必须同步的代码与测试

代码：

1. [`platform-db.js`](/Codex/ACDP/prototype/src/lib/platform-db.js)
2. [`pinyin.js`](/Codex/ACDP/prototype/src/lib/pinyin.js)
3. [`runtime.js`](/Codex/ACDP/prototype/src/lib/runtime.js)
4. [`admin-surface.js`](/Codex/ACDP/prototype/src/http/admin-surface.js)

测试：

1. [`pinyin-auth.test.js`](/Codex/ACDP/prototype/tests/unit/pinyin-auth.test.js)
2. [`term-admission.test.js`](/Codex/ACDP/prototype/tests/unit/term-admission.test.js)
3. [`console-api.test.js`](/Codex/ACDP/prototype/tests/unit/console-api.test.js)
4. [`console-read.test.js`](/Codex/ACDP/prototype/tests/unit/console-read.test.js)
