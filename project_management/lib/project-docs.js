const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_PATH = path.join(REPO_ROOT, 'project_management', 'source_of_truth.json');
const DOC_38_PATH = path.join(REPO_ROOT, 'docs', '38-项目JobList与状态清单.md');
const SESSION_HANDOFF_PATH = path.join(REPO_ROOT, 'SESSION_HANDOFF.md');
const NEXT_STEPS_PATH = path.join(REPO_ROOT, 'NEXT_STEPS.md');

/**
 * 功能：读取单一真源 JSON 文件并解析为对象。
 * 输入：可选 source file 路径；未传时使用默认单一真源路径。
 * 输出：解析后的项目管理状态对象。
 */
function readSourceOfTruth(sourcePath = SOURCE_PATH) {
  return JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
}

/**
 * 功能：解析当前正式文档工作区绝对路径。
 * 输入：单一真源对象。
 * 输出：工作区绝对路径；未配置时返回空字符串。
 */
function resolveDocWorkspaceRoot(state) {
  const workspacePath = String((((state || {}).docWorkspace) || {}).workspacePath || '').trim();
  if (!workspacePath) {
    return '';
  }
  return path.join(REPO_ROOT, workspacePath);
}

/**
 * 功能：解析工作区内某个文档的绝对路径。
 * 输入：单一真源对象与工作区内相对片段。
 * 输出：绝对路径；工作区缺失时返回空字符串。
 */
function resolveWorkspaceDocPath(state, ...segments) {
  const root = resolveDocWorkspaceRoot(state);
  if (!root) {
    return '';
  }
  return path.join(root, ...segments);
}

/**
 * 功能：返回当前由 pm:sync 自动生成的工作区文档路径集合。
 * 输入：单一真源对象。
 * 输出：绝对路径数组。
 */
function listGeneratedWorkspaceDocPaths(state) {
  return [
    resolveWorkspaceDocPath(state, 'governance', '92-JOB与文档绑定矩阵.md'),
    resolveWorkspaceDocPath(state, 'governance', '94-文档变更记录.md'),
    resolveWorkspaceDocPath(state, 'governance', '96-真源文档注册表视图.md'),
    resolveWorkspaceDocPath(state, 'adr', '00-ADR索引.md'),
    resolveWorkspaceDocPath(state, 'jobs', '00-JOB索引.md'),
  ].filter(Boolean);
}

/**
 * 功能：判断某个绝对路径是否属于当前自动生成的工作区文档。
 * 输入：单一真源对象与绝对路径。
 * 输出：布尔值。
 */
function isGeneratedWorkspaceDocPath(state, absolutePath) {
  return listGeneratedWorkspaceDocPaths(state).includes(absolutePath);
}

/**
 * 功能：返回全部 pm:sync 管理的派生文档路径。
 * 输入：单一真源对象。
 * 输出：绝对路径数组。
 */
function listManagedDocumentPaths(state) {
  return [
    DOC_38_PATH,
    SESSION_HANDOFF_PATH,
    NEXT_STEPS_PATH,
    ...listGeneratedWorkspaceDocPaths(state),
  ];
}

/**
 * 功能：把绝对路径转换为仓库相对路径。
 * 输入：任意绝对路径。
 * 输出：仓库相对路径字符串。
 */
function toRepoRelative(filePath = '') {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
}

/**
 * 功能：从一个文档位置生成指向另一个文档的相对链接。
 * 输入：源文件绝对路径、目标文件绝对路径、标签。
 * 输出：Markdown 链接字符串。
 */
function renderRelativeLink(fromFilePath, targetFilePath, label) {
  const relative = path.relative(path.dirname(fromFilePath), targetFilePath).replace(/\\/g, '/');
  return `[${label}](${relative.startsWith('.') ? relative : `./${relative}`})`;
}

/**
 * 功能：按当前项目定义的优先级顺序比较两个优先级值。
 * 输入：单一真源对象、两个优先级字符串。
 * 输出：用于排序的数字；越小优先级越高。
 */
function comparePriority(state, left, right) {
  const order = Array.isArray(state.priorityOrder) ? state.priorityOrder : ['P0', 'P1', 'P2', 'P3'];
  const leftIndex = order.indexOf(String(left || '').trim());
  const rightIndex = order.indexOf(String(right || '').trim());
  const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
  return normalizedLeft - normalizedRight;
}

/**
 * 功能：返回当前未关闭 job 列表，并按优先级和 Job ID 排序。
 * 输入：单一真源对象。
 * 输出：未关闭 job 数组。
 */
function listOpenJobs(state) {
  return (state.jobs || [])
    .filter((job) => String(job.status || '').trim() !== 'done')
    .sort((left, right) => {
      const priorityDelta = comparePriority(state, left.priority, right.priority);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      return String(left.jobId || '').localeCompare(String(right.jobId || ''));
    });
}

/**
 * 功能：返回当前已关闭且在 source 中标记为“近期批次”的 job 列表。
 * 输入：单一真源对象。
 * 输出：已关闭近期批次数组。
 */
function listRecentClosedJobs(state) {
  const preferredOrder = Array.isArray(state.workflow && state.workflow.recentClosedJobIds)
    ? state.workflow.recentClosedJobIds
    : [];
  return preferredOrder
    .map((jobId) => (state.jobs || []).find((job) => job.jobId === jobId))
    .filter(Boolean);
}

/**
 * 功能：把 Markdown 文本中的特殊字符转为可安全写入表格的文本。
 * 输入：任意字符串值。
 * 输出：适合 Markdown 表格使用的字符串。
 */
function escapeTableCell(value = '') {
  return String(value || '').replaceAll('|', '\\|');
}

/**
 * 功能：把布尔或中英文“是否可关闭”值规范为中文展示。
 * 输入：任意 closable 值。
 * 输出：`是` 或 `否`。
 */
function renderClosable(value) {
  if (value === true || String(value).trim() === '是' || String(value).trim() === 'true') {
    return '是';
  }
  return '否';
}

/**
 * 功能：渲染 docs/38 顶部的状态定义表格。
 * 输入：单一真源对象。
 * 输出：状态定义 Markdown 表格字符串。
 */
function renderStatusDefinitionTable(state) {
  const rows = (state.statusDefinitions || []).map((item) => `| \`${escapeTableCell(item.status)}\` | ${escapeTableCell(item.meaning)} |`);
  return [
    '| 状态 | 含义 |',
    '|---|---|',
    ...rows,
  ].join('\n');
}

/**
 * 功能：渲染 docs/38 中的 Job 总表。
 * 输入：单一真源对象。
 * 输出：Job 总表 Markdown 字符串。
 */
function renderJobSummaryTable(state) {
  const rows = (state.jobs || []).map((job) => {
    return [
      '|',
      ` \`${escapeTableCell(job.jobId)}\` `,
      '|',
      ` \`${escapeTableCell(job.stageGroup)}\` `,
      '|',
      ` ${escapeTableCell(job.title)} `,
      '|',
      ` \`${escapeTableCell(job.status)}\` `,
      '|',
      ` \`${escapeTableCell(job.priority)}\` `,
      '|',
      ` ${escapeTableCell(job.owner)} `,
      '|',
      ` \`${escapeTableCell(job.updatedAt)}\` `,
      '|',
      ` ${escapeTableCell(job.currentGoal)} `,
      '|',
      ` ${escapeTableCell(job.nextAction)} `,
      '|',
      ` ${escapeTableCell(job.externalDependencies)} `,
      '|',
      ` ${renderClosable(job.closable)} `,
      '|',
      ` ${escapeTableCell(job.primaryRisk)} `,
      '|',
    ].join('');
  });
  return [
    '| Job ID | 阶段/分组 | 名称 | 状态 | 优先级 | 当前负责人 | 最近更新时间 | 当前目标 | 下一步动作 | 外部依赖 | 是否可关闭 | 主要阻塞/风险 |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

/**
 * 功能：渲染 docs/38 中的分组说明表格。
 * 输入：单一真源对象。
 * 输出：分组说明 Markdown 表格字符串。
 */
function renderGroupDefinitionTable(state) {
  const rows = (state.groupDefinitions || []).map((item) => `| \`${escapeTableCell(item.group)}\` | ${escapeTableCell(item.meaning)} |`);
  return [
    '| 分组 | 说明 |',
    '|---|---|',
    ...rows,
  ].join('\n');
}

/**
 * 功能：渲染 docs/38 中的 Job 详情区块。
 * 输入：单一真源对象。
 * 输出：Job 详情 Markdown 字符串。
 */
function renderJobDetails(state) {
  return (state.jobs || []).map((job) => {
    const heading = job.detailHeading || `${job.jobId} ${job.title}`;
    const body = String(job.detailMarkdown || '').trim();
    return `### ${heading}\n\n${body}`;
  }).join('\n\n');
}

/**
 * 功能：渲染 docs/38 中的当前建议优先级列表。
 * 输入：单一真源对象。
 * 输出：优先级 Markdown 列表字符串。
 */
function renderSuggestedPriorities(state) {
  const lines = Array.isArray(state.suggestedPriorities) ? state.suggestedPriorities : [];
  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
}

/**
 * 功能：基于单一真源生成 docs/38 的完整内容。
 * 输入：单一真源对象。
 * 输出：完整 Markdown 字符串。
 */
function renderDocs38(state) {
  return [
    '# 项目 JobList 与状态清单',
    '',
    '> 此文件由 `project_management/source_of_truth.json` 自动生成。',
    '> 请勿直接手改；如需更新状态，请修改单一真源后执行 `npm run pm:sync`。',
    '> 口径说明：本清单同时保留历史已关单 job 的原始命名与详情，因此正文中会出现旧目录、旧术语和旧路由；当前直接编码时，请优先以进行中 job、当前正式文档工作区与现行帮助文档为准。',
    '',
    '## 1. 文档目的',
    '',
    ...(state.docs38 && state.docs38.purposeLines ? state.docs38.purposeLines : []),
    '',
    '## 2. 状态定义',
    '',
    renderStatusDefinitionTable(state),
    '',
    '## 3. Job 总表',
    '',
    renderJobSummaryTable(state),
    '',
    '## 3.1 分组说明',
    '',
    renderGroupDefinitionTable(state),
    '',
    '## 4. Job 详情',
    '',
    renderJobDetails(state),
    '',
    '## 5. 当前建议优先级',
    '',
    renderSuggestedPriorities(state),
    '',
  ].join('\n');
}

/**
 * 功能：把打开中的 job 渲染为交接文档中的短清单。
 * 输入：单一真源对象。
 * 输出：Markdown 列表字符串。
 */
function renderOpenJobList(state) {
  const jobs = listOpenJobs(state);
  if (!jobs.length) {
    return '- 当前没有未关闭 job。';
  }
  return jobs.map((job) => {
    return `- \`${job.jobId}\` | \`${job.status}\` | ${job.title}\n  当前目标：${job.currentGoal}\n  下一步：${job.nextAction}`;
  }).join('\n');
}

/**
 * 功能：基于单一真源生成精简版 SESSION_HANDOFF 文档。
 * 输入：单一真源对象。
 * 输出：完整 Markdown 字符串。
 */
function renderSessionHandoff(state) {
  const workflow = state.workflow || {};
  const recentClosedJobs = listRecentClosedJobs(state);
  const recentClosedLines = recentClosedJobs.length
    ? recentClosedJobs.map((job) => `- \`${job.jobId}\` | ${job.title}`).join('\n')
    : '- 当前没有标记为近期关闭的批次。';
  const newSessionSteps = (workflow.newSession && workflow.newSession.steps) || [];
  const sessionExitSteps = (workflow.beforeExit && workflow.beforeExit.steps) || [];
  const syncRules = workflow.inSessionSyncRules || [];
  const syncRuleTable = [
    '| 场景 | Codex 需要说的话 | 然后做什么 |',
    '|---|---|---|',
    ...syncRules.map((rule) => `| ${escapeTableCell(rule.when)} | ${escapeTableCell(rule.say)} | ${escapeTableCell(rule.then)} |`),
  ].join('\n');
  return [
    '# ACDP Session Handoff',
    '',
    '> 此文件由 `project_management/source_of_truth.json` 自动生成。',
    '> 它只保留当前可执行交接信息；旧的大段历史已归档到 `project_management/legacy/`。',
    '',
    '## Current Snapshot',
    '',
    ...(workflow.currentSnapshotLines || []),
    '',
    '## Open Jobs',
    '',
    renderOpenJobList(state),
    '',
    '## Recently Closed Console Batches',
    '',
    recentClosedLines,
    '',
    '## New Session',
    '',
    ...newSessionSteps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '### Prompt Template',
    '',
    '```text',
    workflow.newSessionPrompt || '',
    '```',
    '',
    '## Before Exit',
    '',
    ...sessionExitSteps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## In-Session Sync Rules',
    '',
    syncRuleTable,
    '',
    '## Legacy Archives',
    '',
    `- ${workflow.legacySessionHandoffPath || ''}`,
    `- ${workflow.legacyNextStepsPath || ''}`,
    '',
  ].join('\n');
}

/**
 * 功能：把打开中的 job 渲染为 Next Steps 的优先级列表。
 * 输入：单一真源对象。
 * 输出：Markdown 编号列表字符串。
 */
function renderOpenJobPriorities(state) {
  const jobs = listOpenJobs(state);
  if (!jobs.length) {
    return '1. 当前没有未关闭 job。';
  }
  return jobs.map((job, index) => `${index + 1}. \`${job.jobId}\` ${job.title}\n   - 状态：\`${job.status}\`\n   - 下一步：${job.nextAction}`).join('\n');
}

/**
 * 功能：基于单一真源生成精简版 NEXT_STEPS 文档。
 * 输入：单一真源对象。
 * 输出：完整 Markdown 字符串。
 */
function renderNextSteps(state) {
  const workflow = state.workflow || {};
  const closedBatchLines = listRecentClosedJobs(state)
    .map((job) => `- \`${job.jobId}\` | ${job.title}`)
    .join('\n');
  return [
    '# ACDP Next Steps',
    '',
    '> 此文件由 `project_management/source_of_truth.json` 自动生成。',
    '> 它只保留当前未关闭工作、关闭批次边界和下一次启动动作。',
    '',
    '## Current Open Jobs',
    '',
    renderOpenJobPriorities(state),
    '',
    '## Closed Batches',
    '',
    closedBatchLines || '- 当前没有近期关闭批次。',
    '',
    '## External Preconditions',
    '',
    ...((workflow.externalPreconditions || []).map((line) => `- ${line}`)),
    '',
    '## First Action Next Time',
    '',
    '```bash',
    ...((workflow.firstActionCommands || [])),
    '```',
    '',
    '## Sync Commands',
    '',
    '```bash',
    'cd /Codex/ACDP',
    'npm run pm:brief',
    'npm run pm:sync',
    'npm run pm:check',
    '```',
    '',
  ].join('\n');
}

/**
 * 功能：按 docId 查找文档注册项。
 * 输入：单一真源对象与 docId。
 * 输出：文档注册项或 `null`。
 */
function findDocById(state, docId) {
  return (state.docRegistry || []).find((item) => String(item.docId || '').trim() === String(docId || '').trim()) || null;
}

/**
 * 功能：渲染工作区文档注册表视图。
 * 输入：单一真源对象。
 * 输出：Markdown 字符串。
 */
function renderDocRegistryView(state) {
  const outputPath = resolveWorkspaceDocPath(state, 'governance', '96-真源文档注册表视图.md');
  const workspace = state.docWorkspace || {};
  const docs = [...(state.docRegistry || [])].sort((left, right) => String(left.docId || '').localeCompare(String(right.docId || '')));
  const rows = docs.map((item) => {
    const targetPath = path.join(REPO_ROOT, String(item.path || '').trim());
    const titleLink = fs.existsSync(targetPath)
      ? renderRelativeLink(outputPath, targetPath, item.title || item.docId || '')
      : escapeTableCell(item.title || item.docId || '');
    return `| \`${escapeTableCell(item.docId)}\` | ${titleLink} | \`${escapeTableCell(item.docType)}\` | \`${escapeTableCell(item.status)}\` | \`${escapeTableCell(item.domain)}\` | \`${escapeTableCell((item.relatedJobs || []).join(', '))}\` | \`${escapeTableCell(String(item.path || ''))}\` |`;
  });
  return [
    '# 真源文档注册表视图',
    '',
    '- 文档状态：active',
    `- 适用版本：${workspace.versionScope || 'unknown'}`,
    '- 文档类型：generated_view',
    `- 所属工作区：${workspace.workspacePath || ''}`,
    `- 最后更新时间：${workspace.updatedAt || ''}`,
    '- 责任对象：当前正式文档工作区注册表',
    '',
    '> 此文件由 `project_management/source_of_truth.json` 自动生成。',
    '',
    '## 1. 工作区摘要',
    '',
    `- 工作区 ID：\`${workspace.workspaceId || ''}\``,
    `- 工作区路径：\`${workspace.workspacePath || ''}\``,
    `- 适用版本：\`${workspace.versionScope || ''}\``,
    `- 工作区状态：\`${workspace.status || ''}\``,
    '',
    '## 2. 文档注册表',
    '',
    '| 文档 ID | 标题 | 类型 | 状态 | 域 | 关联 Job | 路径 |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

/**
 * 功能：渲染工作区 JOB 与文档绑定矩阵。
 * 输入：单一真源对象。
 * 输出：Markdown 字符串。
 */
function renderJobDocBindingMatrix(state) {
  const bindings = state.jobDocBindings || [];
  const docRows = (state.docRegistry || [])
    .filter((item) => /^DOC-|^GOV-|^ADR-|^JOB-/.test(String(item.docId || '')))
    .sort((left, right) => String(left.docId || '').localeCompare(String(right.docId || '')))
    .map((item) => `| \`${escapeTableCell(item.docId)}\` | ${escapeTableCell(item.title)} | \`${escapeTableCell(item.docType)}\` | \`${escapeTableCell(item.domain)}\` |`);
  const bindingRows = bindings.map((binding) => {
    const job = (state.jobs || []).find((item) => item.jobId === binding.jobId) || {};
    return `| \`${escapeTableCell(binding.jobId)}\` | \`${escapeTableCell(job.status || '')}\` | \`${escapeTableCell((binding.docImpact || []).join(' '))}\` | \`${escapeTableCell((binding.docDeliverables || []).join(' '))}\` | ${escapeTableCell(binding.summary || '')} |`;
  });
  return [
    '# JOB 与文档绑定矩阵',
    '',
    '- 文档状态：active',
    `- 适用版本：${(((state || {}).docWorkspace) || {}).versionScope || 'unknown'}`,
    '- 文档类型：generated_view',
    `- 所属工作区：${(((state || {}).docWorkspace) || {}).workspacePath || ''}`,
    `- 最后更新时间：${(((state || {}).docWorkspace) || {}).updatedAt || ''}`,
    '- 责任对象：当前主要 job 与正式文档之间的绑定关系',
    '',
    '> 此文件由 `project_management/source_of_truth.json` 自动生成。',
    '',
    '## 1. 文档编号',
    '',
    '| 文档编号 | 文档 | 类型 | 域 |',
    '|---|---|---|---|',
    ...docRows,
    '',
    '## 2. 当前主要 job 绑定关系',
    '',
    '| Job | 当前状态 | 影响文档 | 交付文档 | 说明 |',
    '|---|---|---|---|---|',
    ...bindingRows,
    '',
  ].join('\n');
}

/**
 * 功能：渲染文档变更记录视图。
 * 输入：单一真源对象。
 * 输出：Markdown 字符串。
 */
function renderDocChangeLog(state) {
  const rows = (state.docChangeLog || []).map((entry) => {
    return `| ${escapeTableCell(entry.date)} | \`${escapeTableCell(entry.changeId)}\` | \`${escapeTableCell(entry.jobId)}\` | \`${escapeTableCell((entry.affectedDocs || []).join(' '))}\` | \`${escapeTableCell(entry.changeType)}\` | ${escapeTableCell(entry.summary)} |`;
  });
  return [
    '# 文档变更记录',
    '',
    '- 文档状态：active',
    `- 适用版本：${(((state || {}).docWorkspace) || {}).versionScope || 'unknown'}`,
    '- 文档类型：generated_view',
    `- 所属工作区：${(((state || {}).docWorkspace) || {}).workspacePath || ''}`,
    `- 最后更新时间：${(((state || {}).docWorkspace) || {}).updatedAt || ''}`,
    '- 责任对象：本工作区内正式文档的变更留痕',
    '',
    '> 此文件由 `project_management/source_of_truth.json` 自动生成。',
    '',
    '## 1. 变更记录',
    '',
    '| 日期 | 变更编号 | 关联 job | 影响文档 | 变更类型 | 摘要 |',
    '|---|---|---|---|---|---|',
    ...(rows.length ? rows : ['| - | - | - | - | - | 当前暂无变更记录。 |']),
    '',
  ].join('\n');
}

/**
 * 功能：渲染 ADR 索引。
 * 输入：单一真源对象。
 * 输出：Markdown 字符串。
 */
function renderAdrIndex(state) {
  const outputPath = resolveWorkspaceDocPath(state, 'adr', '00-ADR索引.md');
  const rows = (state.adrRegistry || []).map((item) => {
    const targetPath = path.join(REPO_ROOT, String(item.path || '').trim());
    const link = fs.existsSync(targetPath)
      ? renderRelativeLink(outputPath, targetPath, item.title || item.adrId || '')
      : escapeTableCell(item.title || item.adrId || '');
    return `| ${link} | \`${escapeTableCell(item.status)}\` | ${escapeTableCell(item.summary || '')} |`;
  });
  return [
    '# ADR 索引',
    '',
    '- 文档状态：active',
    `- 适用版本：${(((state || {}).docWorkspace) || {}).versionScope || 'unknown'}`,
    '- 文档类型：generated_view',
    `- 所属工作区：${(((state || {}).docWorkspace) || {}).workspacePath || ''}`,
    `- 最后更新时间：${(((state || {}).docWorkspace) || {}).updatedAt || ''}`,
    '- 责任对象：本工作区内架构决策记录',
    '',
    '> 此文件由 `project_management/source_of_truth.json` 自动生成。',
    '',
    '## 1. 当前 ADR 列表',
    '',
    '| ADR | 状态 | 主题 |',
    '|---|---|---|',
    ...(rows.length ? rows : ['| - | - | 当前暂无 ADR。 |']),
    '',
  ].join('\n');
}

/**
 * 功能：渲染工作区 JOB 索引。
 * 输入：单一真源对象。
 * 输出：Markdown 字符串。
 */
function renderWorkspaceJobIndex(state) {
  const jobIds = Array.from(new Set((state.jobDocBindings || []).map((item) => item.jobId).filter(Boolean)));
  const rows = jobIds.map((jobId) => {
    const job = (state.jobs || []).find((item) => item.jobId === jobId) || {};
    return `| \`${escapeTableCell(jobId)}\` | \`${escapeTableCell(job.status || '')}\` | ${escapeTableCell(job.currentGoal || job.title || '')} |`;
  });
  return [
    '# JOB 索引',
    '',
    '- 文档状态：active',
    `- 适用版本：${(((state || {}).docWorkspace) || {}).versionScope || 'unknown'}`,
    '- 文档类型：generated_view',
    `- 所属工作区：${(((state || {}).docWorkspace) || {}).workspacePath || ''}`,
    `- 最后更新时间：${(((state || {}).docWorkspace) || {}).updatedAt || ''}`,
    '- 责任对象：本工作区内 job 文档组织方式',
    '',
    '> 此文件由 `project_management/source_of_truth.json` 自动生成。',
    '',
    '## 1. 当前与本工作区直接相关的主要 job',
    '',
    '| Job | 状态 | 说明 |',
    '|---|---|---|',
    ...(rows.length ? rows : ['| - | - | 当前暂无关联 job。 |']),
    '',
  ].join('\n');
}

/**
 * 功能：渲染全部派生文档内容。
 * 输入：单一真源对象。
 * 输出：以绝对路径为键、文档内容为值的对象。
 */
function renderAllDocuments(state) {
  const rendered = {
    [DOC_38_PATH]: renderDocs38(state),
    [SESSION_HANDOFF_PATH]: renderSessionHandoff(state),
    [NEXT_STEPS_PATH]: renderNextSteps(state),
  };

  const bindingPath = resolveWorkspaceDocPath(state, 'governance', '92-JOB与文档绑定矩阵.md');
  const changeLogPath = resolveWorkspaceDocPath(state, 'governance', '94-文档变更记录.md');
  const registryPath = resolveWorkspaceDocPath(state, 'governance', '96-真源文档注册表视图.md');
  const adrIndexPath = resolveWorkspaceDocPath(state, 'adr', '00-ADR索引.md');
  const jobIndexPath = resolveWorkspaceDocPath(state, 'jobs', '00-JOB索引.md');

  if (bindingPath) {
    rendered[bindingPath] = renderJobDocBindingMatrix(state);
  }
  if (changeLogPath) {
    rendered[changeLogPath] = renderDocChangeLog(state);
  }
  if (registryPath) {
    rendered[registryPath] = renderDocRegistryView(state);
  }
  if (adrIndexPath) {
    rendered[adrIndexPath] = renderAdrIndex(state);
  }
  if (jobIndexPath) {
    rendered[jobIndexPath] = renderWorkspaceJobIndex(state);
  }
  return rendered;
}

/**
 * 功能：统一派生文档写入与校验时的内容规范。
 * 输入：原始 Markdown 字符串。
 * 输出：规范化后的 Markdown 字符串。
 */
function normalizeRenderedDocument(content = '') {
  return String(content).replace(/\n{3,}/g, '\n\n');
}

/**
 * 功能：校验单一真源和派生文档的基本一致性。
 * 输入：单一真源对象。
 * 输出：包含错误信息数组的校验结果对象。
 */
function validateState(state) {
  const errors = [];
  const seenJobIds = new Set();
  const seenStatuses = new Set();
  const seenDocIds = new Set();
  const seenDocPaths = new Set();
  const seenAdrIds = new Set();
  const workspaceRoot = resolveDocWorkspaceRoot(state);

  for (const item of (state.statusDefinitions || [])) {
    const status = String(item.status || '').trim();
    if (!status) {
      errors.push('存在空白状态定义。');
      continue;
    }
    if (seenStatuses.has(status)) {
      errors.push(`状态定义重复：${status}`);
    }
    seenStatuses.add(status);
  }

  for (const job of (state.jobs || [])) {
    if (!job.jobId) {
      errors.push('存在未设置 jobId 的 job。');
      continue;
    }
    if (seenJobIds.has(job.jobId)) {
      errors.push(`存在重复 jobId：${job.jobId}`);
    }
    seenJobIds.add(job.jobId);
    if (!job.detailMarkdown) {
      errors.push(`${job.jobId} 缺少 detailMarkdown。`);
    }
    if (!job.status) {
      errors.push(`${job.jobId} 缺少 status。`);
    }
    if (!job.title) {
      errors.push(`${job.jobId} 缺少 title。`);
    }
  }

  if (!workspaceRoot) {
    errors.push('缺少 docWorkspace.workspacePath。');
  } else if (!fs.existsSync(workspaceRoot)) {
    errors.push(`正式文档工作区不存在：${workspaceRoot}`);
  }

  for (const doc of (state.docRegistry || [])) {
    const docId = String(doc.docId || '').trim();
    const relativePath = String(doc.path || '').trim();
    if (!docId) {
      errors.push('文档注册表存在空白 docId。');
      continue;
    }
    if (seenDocIds.has(docId)) {
      errors.push(`存在重复 docId：${docId}`);
    }
    seenDocIds.add(docId);
    if (!relativePath) {
      errors.push(`${docId} 缺少 path。`);
      continue;
    }
    if (seenDocPaths.has(relativePath)) {
      errors.push(`存在重复文档 path：${relativePath}`);
    }
    seenDocPaths.add(relativePath);
    const absolutePath = path.join(REPO_ROOT, relativePath);
    if (!fs.existsSync(absolutePath) && !isGeneratedWorkspaceDocPath(state, absolutePath)) {
      errors.push(`${docId} 对应文档不存在：${relativePath}`);
    }
  }

  for (const binding of (state.jobDocBindings || [])) {
    const jobId = String(binding.jobId || '').trim();
    if (!jobId) {
      errors.push('jobDocBindings 存在空白 jobId。');
      continue;
    }
    if (!seenJobIds.has(jobId)) {
      errors.push(`jobDocBindings 引用了未知 job：${jobId}`);
    }
    for (const docId of (binding.docImpact || [])) {
      if (!seenDocIds.has(String(docId || '').trim())) {
        errors.push(`jobDocBindings ${jobId} 引用了未知文档：${docId}`);
      }
    }
    for (const docId of (binding.docDeliverables || [])) {
      if (!seenDocIds.has(String(docId || '').trim())) {
        errors.push(`jobDocBindings ${jobId} 引用了未知交付文档：${docId}`);
      }
    }
  }

  for (const adr of (state.adrRegistry || [])) {
    const adrId = String(adr.adrId || '').trim();
    if (!adrId) {
      errors.push('adrRegistry 存在空白 adrId。');
      continue;
    }
    if (seenAdrIds.has(adrId)) {
      errors.push(`存在重复 adrId：${adrId}`);
    }
    seenAdrIds.add(adrId);
    const relativePath = String(adr.path || '').trim();
    if (!relativePath) {
      errors.push(`${adrId} 缺少 path。`);
      continue;
    }
    const absolutePath = path.join(REPO_ROOT, relativePath);
    if (!fs.existsSync(absolutePath) && !isGeneratedWorkspaceDocPath(state, absolutePath)) {
      errors.push(`${adrId} 对应 ADR 文档不存在：${relativePath}`);
    }
  }

  for (const entry of (state.docChangeLog || [])) {
    const changeId = String(entry.changeId || '').trim();
    if (!changeId) {
      errors.push('docChangeLog 存在空白 changeId。');
      continue;
    }
    if (entry.jobId && !seenJobIds.has(String(entry.jobId || '').trim())) {
      errors.push(`docChangeLog ${changeId} 引用了未知 job：${entry.jobId}`);
    }
    for (const docId of (entry.affectedDocs || [])) {
      if (!seenDocIds.has(String(docId || '').trim())) {
        errors.push(`docChangeLog ${changeId} 引用了未知文档：${docId}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * 功能：把全部派生文档写回仓库。
 * 输入：单一真源对象。
 * 输出：无显式返回；直接写文件。
 */
function writeAllDocuments(state) {
  const rendered = renderAllDocuments(state);
  Object.entries(rendered).forEach(([filePath, content]) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, normalizeRenderedDocument(content));
  });
}

module.exports = {
  DOC_38_PATH,
  NEXT_STEPS_PATH,
  REPO_ROOT,
  SESSION_HANDOFF_PATH,
  SOURCE_PATH,
  isGeneratedWorkspaceDocPath,
  listManagedDocumentPaths,
  listOpenJobs,
  listRecentClosedJobs,
  readSourceOfTruth,
  renderAllDocuments,
  renderDocs38,
  renderNextSteps,
  renderSessionHandoff,
  resolveDocWorkspaceRoot,
  normalizeRenderedDocument,
  validateState,
  writeAllDocuments,
};
