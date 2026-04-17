const fs = require('node:fs');
const path = require('node:path');

const {
  DOC_38_PATH,
  NEXT_STEPS_PATH,
  REPO_ROOT,
  SESSION_HANDOFF_PATH,
  SOURCE_PATH,
} = require('../lib/project-docs');

/**
 * 功能：去除 Markdown 表格单元格外层反引号与多余空白。
 * 输入：原始单元格字符串。
 * 输出：清洗后的普通文本。
 */
function normalizeCell(value = '') {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * 功能：从 Markdown 文本中截取两个标题之间的区段。
 * 输入：完整文本、起始标记和结束标记。
 * 输出：区段文本；未命中时返回空字符串。
 */
function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start === -1) {
    return '';
  }
  const from = start + startMarker.length;
  const end = endMarker ? text.indexOf(endMarker, from) : -1;
  if (end === -1) {
    return text.slice(from);
  }
  return text.slice(from, end);
}

/**
 * 功能：把 Markdown 表格区块解析为二维数组。
 * 输入：表格所在区块文本。
 * 输出：表头行之后的数据行数组。
 */
function parseTableRows(sectionText) {
  const lines = sectionText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));
  return lines.slice(2).map((line) => line.split('|').slice(1, -1).map((cell) => normalizeCell(cell)));
}

/**
 * 功能：从 docs/38 解析 Job 总表。
 * 输入：docs/38 全文。
 * 输出：Job 摘要对象数组。
 */
function parseJobSummaryRows(docs38Text) {
  const summarySection = between(docs38Text, '## 3. Job 总表', '## 3.1 分组说明');
  return parseTableRows(summarySection).map((cells) => ({
    jobId: cells[0] || '',
    stageGroup: cells[1] || '',
    title: cells[2] || '',
    status: cells[3] || '',
    priority: cells[4] || '',
    owner: cells[5] || '',
    updatedAt: cells[6] || '',
    currentGoal: cells[7] || '',
    nextAction: cells[8] || '',
    externalDependencies: cells[9] || '',
    closable: cells[10] === '是',
    primaryRisk: cells[11] || '',
  }));
}

/**
 * 功能：从 docs/38 解析分组说明表。
 * 输入：docs/38 全文。
 * 输出：分组说明数组。
 */
function parseGroupDefinitions(docs38Text) {
  const groupSection = between(docs38Text, '## 3.1 分组说明', '## 4. Job 详情');
  return parseTableRows(groupSection).map((cells) => ({
    group: cells[0] || '',
    meaning: cells[1] || '',
  }));
}

/**
 * 功能：从 docs/38 解析 Job 详情区块。
 * 输入：docs/38 全文。
 * 输出：以 jobId 为键的详情对象映射。
 */
function parseJobDetails(docs38Text) {
  const detailsSection = between(docs38Text, '## 4. Job 详情', '## 5. 当前建议优先级');
  const matches = Array.from(detailsSection.matchAll(/^###\s+(.+)$/gm));
  const details = {};
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const heading = match[1].trim();
    const jobIdMatch = heading.match(/JOB-[0-9A-Z]+/);
    if (!jobIdMatch) {
      continue;
    }
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : detailsSection.length;
    details[jobIdMatch[0]] = {
      detailHeading: heading,
      detailMarkdown: detailsSection.slice(start, end).trim(),
    };
  }
  return details;
}

/**
 * 功能：从 docs/38 解析当前建议优先级列表。
 * 输入：docs/38 全文。
 * 输出：优先级建议数组。
 */
function parseSuggestedPriorities(docs38Text) {
  const section = between(docs38Text, '## 5. 当前建议优先级', '');
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+\./.test(line))
    .map((line) => line.replace(/^\d+\.\s*/, '').trim());
}

/**
 * 功能：把旧版手工维护文档归档到 legacy 目录，保留迁移前快照。
 * 输入：无。
 * 输出：legacy 路径对象。
 */
function archiveLegacyDocs() {
  const legacyDir = path.join(REPO_ROOT, 'project_management', 'legacy');
  fs.mkdirSync(legacyDir, { recursive: true });
  const stamp = '2026-04-04';
  const docs38ArchivePath = path.join(legacyDir, `docs38_legacy_${stamp}.md`);
  const sessionArchivePath = path.join(legacyDir, `SESSION_HANDOFF_legacy_${stamp}.md`);
  const nextArchivePath = path.join(legacyDir, `NEXT_STEPS_legacy_${stamp}.md`);
  fs.copyFileSync(DOC_38_PATH, docs38ArchivePath);
  fs.copyFileSync(SESSION_HANDOFF_PATH, sessionArchivePath);
  fs.copyFileSync(NEXT_STEPS_PATH, nextArchivePath);
  return {
    docs38ArchivePath: path.relative(REPO_ROOT, docs38ArchivePath),
    sessionArchivePath: path.relative(REPO_ROOT, sessionArchivePath),
    nextArchivePath: path.relative(REPO_ROOT, nextArchivePath),
  };
}

/**
 * 功能：构造新的单一真源对象并写入 JSON 文件。
 * 输入：无。
 * 输出：写入后的单一真源对象。
 */
function migrateLegacyDocs() {
  const docs38Text = fs.readFileSync(DOC_38_PATH, 'utf8');
  const archives = archiveLegacyDocs();
  const detailMap = parseJobDetails(docs38Text);
  const jobs = parseJobSummaryRows(docs38Text).map((job) => ({
    ...job,
    detailHeading: (detailMap[job.jobId] || {}).detailHeading || `${job.jobId} ${job.title}`,
    detailMarkdown: (detailMap[job.jobId] || {}).detailMarkdown || '- 该 job 暂无迁移后的详情内容。',
  }));

  const source = {
    meta: {
      project: 'ACDP',
      sourceVersion: 1,
      migratedAt: '2026-04-04',
      generatedBy: 'project_management/scripts/migrate-legacy.js',
    },
    priorityOrder: ['P0', 'P1', 'P2', 'P3'],
    statusDefinitions: [
      { status: 'done', meaning: '已完成，当前无需继续推进' },
      { status: 'in_progress', meaning: '已启动，仍需继续推进' },
      { status: 'pending', meaning: '已识别，但尚未开始' },
      { status: 'blocked', meaning: '已确认需要做，但被外部条件阻塞' },
      { status: 'maintenance', meaning: '长期维护项，不是一次性关闭任务' },
    ],
    groupDefinitions: parseGroupDefinitions(docs38Text),
    docs38: {
      purposeLines: [
        '本文件用于从项目管理视角统一管理 ACDP 当前各项工作，避免后续开发、验证、部署和交接只依赖零散对话或临时待办。',
        '',
        '每个 job 都应明确：',
        '',
        '- 目标',
        '- 当前状态',
        '- 优先级',
        '- 当前负责人',
        '- 最近更新时间',
        '- 外部依赖',
        '- 是否可关闭',
        '- 后续动作',
        '- 风险',
        '- 完成标准',
      ],
    },
    jobs,
    suggestedPriorities: parseSuggestedPriorities(docs38Text),
    workflow: {
      recentClosedJobIds: ['JOB-013', 'JOB-014', 'JOB-015', 'JOB-016', 'JOB-017'],
      currentSnapshotLines: [
        '- 当前未关闭项全部集中在单一真源；派生文档只保留当前视图，不再手工维护 3 份状态。',
        '- 当前未关闭 job：`JOB-006`、`JOB-007`、`JOB-009`。',
        '- `/console` 批次 `JOB-013`~`JOB-017` 当前都已关闭，不应默认继续推进。',
        '- 旧版超长交接文档已归档到 `project_management/legacy/`，只在需要追旧上下文时再查阅。',
      ],
      externalPreconditions: [
        'JOB-006 需要真实 kubeconfig / registry / target-cluster access。',
        'JOB-007 需要真实 cg3 endpoint / auth / ack 条件。',
        'JOB-009 需要真实宿主机执行并发与吞吐验证。',
      ],
      firstActionCommands: [
        'cd /Codex/ACDP',
        'npm run pm:brief',
        'npm run pm:check',
      ],
      newSession: {
        steps: [
          '进入仓库后先执行 `cd /Codex/ACDP && npm run pm:brief`，不要先翻旧长文档。',
          '先阅读生成后的 `docs/38-项目JobList与状态清单.md`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md`，再决定是否需要查 `project_management/legacy/`。',
          '如果本轮要开新批次或切状态，先修改 `project_management/source_of_truth.json`，再执行 `npm run pm:sync`，然后再动代码。',
          '如果只是继续已有未关闭 job，先确认它在 `pm:brief` 输出里仍是 active/blocker 状态，再开始实现。',
        ],
      },
      newSessionPrompt: '继续 ACDP 工作。先运行 `cd /Codex/ACDP && npm run pm:brief`，再阅读自动生成的 `docs/38-项目JobList与状态清单.md`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md`。如需变更状态，先改 `project_management/source_of_truth.json` 并执行 `npm run pm:sync`，然后再开始代码或文档实现。',
      beforeExit: {
        steps: [
          '在退出当前 Codex session 前，先把本轮涉及的 job/batch 状态更新到 `project_management/source_of_truth.json`。',
          '执行 `cd /Codex/ACDP && npm run pm:sync`，确保 `docs/38`、`SESSION_HANDOFF.md`、`NEXT_STEPS.md` 与单一真源同步。',
          '如果本轮动了代码或正式改了文档，按项目约束补跑 `npm run smoke:console`、`npm run test:console`、`npm run test:unit`。',
          '在最终回传里明确说明：本轮状态变化、回归结果、以及是否还有未关闭 follow-up。',
        ],
      },
      inSessionSyncRules: [
        {
          when: '只做阅读/盘点/评估，不打算改状态',
          say: '本轮只做上下文读取，不变更项目状态，也不刷新派生文档。',
          then: '只读单一真源和生成文档，不修改 source_of_truth.json。',
        },
        {
          when: '准备启动新批次或把已有 job 从 pending 切到 in_progress',
          say: '先挂单或先切状态，再开工；我会先更新单一真源并执行 pm:sync，然后再改代码。',
          then: '先修改 source_of_truth.json，再运行 npm run pm:sync。',
        },
        {
          when: '本轮只是局部返工或 follow-up',
          say: '本轮只聚焦指定 task/job follow-up；我会只更新对应状态和 next action，不改无关批次。',
          then: '只改相关 job 的状态、nextAction、updatedAt，并执行 npm run pm:sync。',
        },
        {
          when: '准备关单或确认批次 accepted',
          say: '本轮将把 job 切到 done，并在回归通过后同步单一真源和派生文档。',
          then: '先改 source_of_truth.json，再运行 npm run pm:sync，然后补跑回归。',
        },
      ],
      legacyDocs38Path: archives.docs38ArchivePath,
      legacySessionHandoffPath: archives.sessionArchivePath,
      legacyNextStepsPath: archives.nextArchivePath,
    },
  };

  fs.writeFileSync(SOURCE_PATH, `${JSON.stringify(source, null, 2)}\n`);
  return source;
}

if (require.main === module) {
  const source = migrateLegacyDocs();
  process.stdout.write(`migrated jobs=${source.jobs.length} source=${SOURCE_PATH}\n`);
}

module.exports = {
  migrateLegacyDocs,
};
