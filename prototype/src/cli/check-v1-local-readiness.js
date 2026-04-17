const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * 功能：执行命令并收集返回值。
 * 输入：命令与参数数组。
 * 输出：标准化后的执行结果。
 */
function runCommand(command, args = []) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    status: result.status == null ? 1 : result.status,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
  };
}

/**
 * 功能：检查文件是否存在。
 * 输入：相对仓库根目录的路径。
 * 输出：布尔值。
 */
function exists(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

/**
 * 功能：执行 v1.0 本地前置检查。
 * 输入：无。
 * 输出：检查结果对象。
 */
function main() {
  const checks = {
    projectManagement: {
      pmCheck: runCommand('npm', ['run', 'pm:check']).ok,
    },
    regression: {
      testUnit: runCommand('npm', ['run', 'test:unit']).ok,
      testConsole: runCommand('npm', ['run', 'test:console']).ok,
      smokeConsole: runCommand('npm', ['run', 'smoke:console']).ok,
    },
    testingEnhancements: {
      apiContracts: runCommand('npm', ['run', 'check:api-contracts']).ok,
      unitCoverage: runCommand('npm', ['run', 'test:unit:coverage']).ok,
      visualRegressionEntry: exists('prototype/src/cli/check-visual-regression.js'),
    },
    releasePackaging: {
      releaseBundleScript: exists('prototype/src/cli/prepare-release-bundle.js'),
      deploymentBundleTemplate: exists('release_bundle_templates/deployment_bundle/README.md'),
      releaseNotesBundleTemplate: exists('release_bundle_templates/release_notes_bundle/README.md'),
    },
    docs: {
      releaseManual: exists('docs/86-v1.0发布手册.md'),
      rollbackManual: exists('docs/87-v1.0回滚手册.md'),
      releaseNotesTemplate: exists('docs/88-v1.0发布说明模板.md'),
      goNoGoTemplate: exists('docs/89-v1.0-go-no-go清单模板.md'),
      helpDocsIndex: exists('docs/84-R5帮助文档清单与slug映射表.md'),
      localReadinessChecklist: exists('docs/128-v1.0发布前本地前置检查清单.md'),
    },
  };

  const ok = Object.values(checks).every((group) => Object.values(group).every(Boolean));
  const result = {
    ok,
    checks,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!ok) {
    process.exit(1);
  }
  return result;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

module.exports = {
  exists,
  main,
  runCommand,
};
