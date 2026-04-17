const { listOpenJobs, listRecentClosedJobs, readSourceOfTruth } = require('../lib/project-docs');

/**
 * 功能：输出适合新 session 快速接入的项目管理摘要。
 * 输入：无。
 * 输出：打印当前活动 job、近期关闭批次、外部前提和推荐命令。
 */
function main() {
  const state = readSourceOfTruth();
  const openJobs = listOpenJobs(state);
  const recentClosed = listRecentClosedJobs(state);
  const externalPreconditions = ((state.workflow || {}).externalPreconditions) || [];
  const commands = ((state.workflow || {}).firstActionCommands) || [];
  process.stdout.write('ACDP Project Brief\n');
  process.stdout.write('==================\n');
  process.stdout.write('\nOpen Jobs\n');
  if (!openJobs.length) {
    process.stdout.write('- none\n');
  } else {
    for (const job of openJobs) {
      process.stdout.write(`- ${job.jobId} [${job.status}] ${job.title}\n`);
      process.stdout.write(`  next: ${job.nextAction}\n`);
    }
  }
  process.stdout.write('\nRecently Closed Console Batches\n');
  if (!recentClosed.length) {
    process.stdout.write('- none\n');
  } else {
    for (const job of recentClosed) {
      process.stdout.write(`- ${job.jobId} ${job.title}\n`);
    }
  }
  process.stdout.write('\nExternal Preconditions\n');
  if (!externalPreconditions.length) {
    process.stdout.write('- none\n');
  } else {
    for (const line of externalPreconditions) {
      process.stdout.write(`- ${line}\n`);
    }
  }
  process.stdout.write('\nFirst Commands\n');
  for (const line of commands) {
    process.stdout.write(`- ${line}\n`);
  }
}

if (require.main === module) {
  main();
}
