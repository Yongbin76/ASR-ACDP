const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_ROOT = path.join(REPO_ROOT, 'release_bundle_templates');
const K8S_ROOT = path.join(REPO_ROOT, 'k8s');

/**
 * 功能：从命令行读取某个 flag 的值。
 * 输入：flag 名称与默认值。
 * 输出：解析到的参数值或默认值。
 */
function readArg(flag, fallback = '') {
  const args = process.argv.slice(2);
  const inline = args.find((item) => String(item).startsWith(`${flag}=`));
  if (inline) {
    return String(inline).slice(flag.length + 1);
  }
  const index = args.indexOf(flag);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
}

/**
 * 功能：确保目录存在。
 * 输入：目录绝对路径。
 * 输出：无显式返回；目录不存在时创建。
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 功能：递归复制目录。
 * 输入：源目录和目标目录。
 * 输出：无显式返回；把源目录完整复制到目标目录。
 */
function copyDir(sourceDir, targetDir) {
  ensureDir(targetDir);
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

/**
 * 功能：复制单个文件到目标目录。
 * 输入：源文件绝对路径和目标文件绝对路径。
 * 输出：无显式返回；源文件不存在时跳过。
 */
function copyFileIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return;
  }
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

/**
 * 功能：生成镜像 tag 清单对象。
 * 输入：版本、releaseId、镜像仓库前缀。
 * 输出：镜像 tag 清单对象。
 */
function buildImageTags(version, releaseId, imageRegistry) {
  const normalizedVersion = String(version || 'v1.0.0').trim() || 'v1.0.0';
  const normalizedReleaseId = String(releaseId || 'rel_xxx').trim() || 'rel_xxx';
  const prefix = String(imageRegistry || 'registry.example.com').trim().replace(/\/+$/, '');
  return {
    version: normalizedVersion,
    releaseId: normalizedReleaseId,
    adminImage: `${prefix}/acdp-admin:${normalizedVersion}`,
    runtimeImage: `${prefix}/acdp-runtime:${normalizedVersion}`,
    adminReleaseTag: `${prefix}/acdp-admin:release-${normalizedReleaseId}`,
    runtimeReleaseTag: `${prefix}/acdp-runtime:release-${normalizedReleaseId}`,
  };
}

/**
 * 功能：把对象写成格式化 JSON 文件。
 * 输入：文件路径和对象。
 * 输出：无显式返回。
 */
function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * 功能：准备 release bundle 目录。
 * 输入：版本号、releaseId、镜像仓库前缀和输出目录。
 * 输出：生成结果对象。
 */
function prepareReleaseBundle(options = {}) {
  const version = String(options.version || 'v1.0.0').trim() || 'v1.0.0';
  const releaseId = String(options.releaseId || 'rel_xxx').trim() || 'rel_xxx';
  const imageRegistry = String(options.imageRegistry || 'registry.example.com').trim() || 'registry.example.com';
  const outputRoot = path.resolve(String(options.outputDir || path.join(REPO_ROOT, 'prototype', 'workspace', 'release_bundle_preview')));

  const deploymentTemplateDir = path.join(TEMPLATE_ROOT, 'deployment_bundle');
  const releaseNotesTemplateDir = path.join(TEMPLATE_ROOT, 'release_notes_bundle');
  const deploymentOutputDir = path.join(outputRoot, 'deployment_bundle');
  const releaseNotesOutputDir = path.join(outputRoot, 'release_notes_bundle');

  if (fs.existsSync(outputRoot)) {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }

  copyDir(deploymentTemplateDir, deploymentOutputDir);
  copyDir(releaseNotesTemplateDir, releaseNotesOutputDir);

  const imageTags = buildImageTags(version, releaseId, imageRegistry);
  writeJson(path.join(deploymentOutputDir, 'images', 'image-tags.json'), imageTags);

  const k8sFiles = [
    'namespace.yaml',
    'admin-deployment.yaml',
    'admin-service.yaml',
    'runtime-deployment.yaml',
    'runtime-service.yaml',
    'artifact-store-secret.example.yaml',
  ];
  k8sFiles.forEach((fileName) => {
    copyFileIfExists(path.join(K8S_ROOT, fileName), path.join(deploymentOutputDir, 'k8s', fileName));
  });

  return {
    ok: true,
    version,
    releaseId,
    imageRegistry,
    outputRoot,
    deploymentOutputDir,
    releaseNotesOutputDir,
    imageTags,
    k8sFiles,
  };
}

/**
 * 功能：CLI 入口，准备 release bundle 预览目录。
 * 输入：命令行参数。
 * 输出：把结果 JSON 打印到 stdout。
 */
function main() {
  const result = prepareReleaseBundle({
    version: readArg('--version', 'v1.0.0'),
    releaseId: readArg('--release-id', 'rel_xxx'),
    imageRegistry: readArg('--image-registry', 'registry.example.com'),
    outputDir: readArg('--output-dir', path.join(REPO_ROOT, 'prototype', 'workspace', 'release_bundle_preview')),
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

module.exports = {
  buildImageTags,
  copyDir,
  copyFileIfExists,
  ensureDir,
  main,
  prepareReleaseBundle,
  readArg,
  writeJson,
};
