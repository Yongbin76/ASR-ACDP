const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join('prototype', 'config', 'governance_policies.json');
const GOVERNANCE_POLICIES_CONFIG_PATH_ENV = 'ACDP_GOVERNANCE_POLICIES_CONFIG_PATH';

const DEFAULT_POLICIES = {
  releasePolicies: {
    submitterReviewerSeparationRequired: true,
    distinctApprovalReviewersRequired: true,
    reviewerPublisherSeparationRequired: true,
    highRiskReleaseRequiresDualApproval: true,
    defaultRequiredApprovals: 1,
    highRiskReleaseRequiredApprovals: 2,
  },
};

/**
 * 功能：解析治理策略配置文件路径。
 * 输入：`appConfig` 应用配置对象。
 * 输出：治理策略配置文件绝对路径。
 */
function resolveGovernancePoliciesConfigPath(appConfig) {
  return process.env[GOVERNANCE_POLICIES_CONFIG_PATH_ENV]
    || (appConfig && appConfig.governancePoliciesConfigPath)
    || path.join((appConfig && appConfig.projectRoot) || process.cwd(), DEFAULT_CONFIG_PATH);
}

/**
 * 功能：读取治理策略配置文件原始对象。
 * 输入：`appConfig` 应用配置对象。
 * 输出：治理策略原始对象；文件不存在时返回默认策略。
 */
function readGovernancePoliciesConfig(appConfig) {
  const filePath = resolveGovernancePoliciesConfigPath(appConfig);
  if (!fs.existsSync(filePath)) {
    return DEFAULT_POLICIES;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

/**
 * 功能：标准化 release 治理策略。
 * 输入：原始 release 策略对象。
 * 输出：标准化后的 release 策略对象。
 */
function normalizeReleasePolicies(value = {}) {
  return {
    submitterReviewerSeparationRequired: value.submitterReviewerSeparationRequired !== false,
    distinctApprovalReviewersRequired: value.distinctApprovalReviewersRequired !== false,
    reviewerPublisherSeparationRequired: value.reviewerPublisherSeparationRequired !== false,
    highRiskReleaseRequiresDualApproval: value.highRiskReleaseRequiresDualApproval !== false,
    defaultRequiredApprovals: Math.max(1, Number(value.defaultRequiredApprovals || 1)),
    highRiskReleaseRequiredApprovals: Math.max(1, Number(value.highRiskReleaseRequiredApprovals || 2)),
  };
}

/**
 * 功能：读取并标准化治理策略。
 * 输入：`appConfig` 应用配置对象。
 * 输出：包含 release 策略和配置路径的标准化对象。
 */
function loadGovernancePolicies(appConfig) {
  const raw = readGovernancePoliciesConfig(appConfig);
  return {
    configPath: resolveGovernancePoliciesConfigPath(appConfig),
    releasePolicies: normalizeReleasePolicies(raw.releasePolicies || {}),
  };
}

/**
 * 功能：写回治理策略配置文件。
 * 输入：`appConfig` 应用配置对象和原始 payload。
 * 输出：写回后的标准化治理策略对象。
 */
function saveGovernancePolicies(appConfig, payload = {}) {
  const filePath = resolveGovernancePoliciesConfigPath(appConfig);
  const normalized = {
    releasePolicies: normalizeReleasePolicies((payload || {}).releasePolicies || {}),
  };
  fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return loadGovernancePolicies(appConfig);
}

module.exports = {
  loadGovernancePolicies,
  saveGovernancePolicies,
  normalizeReleasePolicies,
  resolveGovernancePoliciesConfigPath,
};
