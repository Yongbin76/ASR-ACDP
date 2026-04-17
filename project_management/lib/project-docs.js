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
    '> 口径说明：本清单同时保留历史已关单 job 的原始命名与详情，因此正文中会出现旧目录、旧术语和旧路由；当前直接编码时，请优先以进行中 job、`docs/131 ~ docs/135` 和现行帮助文档为准。',
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
  const syncRules = (workflow.inSessionSyncRules || []);
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
 * 功能：渲染全部派生文档内容。
 * 输入：单一真源对象。
 * 输出：以绝对路径为键、文档内容为值的对象。
 */
function renderAllDocuments(state) {
  return {
    [DOC_38_PATH]: renderDocs38(state),
    [SESSION_HANDOFF_PATH]: renderSessionHandoff(state),
    [NEXT_STEPS_PATH]: renderNextSteps(state),
  };
}

/**
 * 功能：校验单一真源和派生文档的基本一致性。
 * 输入：单一真源对象。
 * 输出：包含错误信息数组的校验结果对象。
 */
function validateState(state) {
  const errors = [];
  const seen = new Set();
  for (const job of (state.jobs || [])) {
    if (!job.jobId) {
      errors.push('存在未设置 jobId 的 job。');
      continue;
    }
    if (seen.has(job.jobId)) {
      errors.push(`存在重复 jobId：${job.jobId}`);
    }
    seen.add(job.jobId);
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
    fs.writeFileSync(filePath, `${content}`.replace(/\n{3,}/g, '\n\n'));
  });
}

module.exports = {
  DOC_38_PATH,
  NEXT_STEPS_PATH,
  REPO_ROOT,
  SESSION_HANDOFF_PATH,
  SOURCE_PATH,
  listOpenJobs,
  listRecentClosedJobs,
  readSourceOfTruth,
  renderAllDocuments,
  renderDocs38,
  renderNextSteps,
  renderSessionHandoff,
  validateState,
  writeAllDocuments,
};
