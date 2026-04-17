const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAppConfig } = require('../../src/lib/config');
const prepareData = require('../../src/cli/prepare-data');
const bootstrapDb = require('../../src/cli/bootstrap-db');
const buildSnapshot = require('../../src/cli/build-snapshot');
const { createPrototypeApp } = require('../../src/server');

/**
 * 功能：为系统管理相关测试创建隔离配置。
 * 输入：工作区目录名。
 * 输出：带独立 workspace、权限配置和治理策略配置路径的测试配置对象。
 */
function createSystemTestConfig(workspaceName) {
  const baseConfig = createAppConfig();
  const workspaceDir = path.join(baseConfig.projectRoot, 'prototype', workspaceName);
  const catalogDir = path.join(workspaceDir, 'catalog');
  const releasesDir = path.join(workspaceDir, 'releases');
  const businessPropertiesConfigPath = path.join(workspaceDir, 'business_properties.json');
  const accessControlConfigPath = path.join(workspaceDir, 'access_control.json');
  const governancePoliciesConfigPath = path.join(workspaceDir, 'governance_policies.json');
  if (fs.existsSync(workspaceDir)) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
  fs.mkdirSync(catalogDir, { recursive: true });
  fs.mkdirSync(releasesDir, { recursive: true });
  fs.copyFileSync(baseConfig.businessPropertiesConfigPath, businessPropertiesConfigPath);
  fs.copyFileSync(baseConfig.accessControlConfigPath, accessControlConfigPath);
  fs.copyFileSync(baseConfig.governancePoliciesConfigPath, governancePoliciesConfigPath);
  return {
    ...baseConfig,
    businessPropertiesConfigPath,
    accessControlConfigPath,
    governancePoliciesConfigPath,
    resolvedPaths: {
      ...baseConfig.resolvedPaths,
      workspaceDir,
      catalogDir,
      releasesDir,
      latestReleaseDir: path.join(releasesDir, 'latest'),
      databaseFile: path.join(workspaceDir, 'platform.db'),
      seedCatalogFile: path.join(catalogDir, 'seed_terms.json'),
      validationFeedInboxDir: path.join(workspaceDir, 'validation_feeds', 'inbox'),
      validationFeedArchiveDir: path.join(workspaceDir, 'validation_feeds', 'archive'),
      validationFeedErrorDir: path.join(workspaceDir, 'validation_feeds', 'error'),
    },
  };
}

test('business property config supports create update enable disable and delete via console API', async () => {
  const config = createSystemTestConfig('workspace-unit-system-business-properties');
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('system business properties baseline build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8840,
    },
  });

  try {
    const initial = await app.inject({
      method: 'GET',
      url: '/api/console/system/business-properties',
      headers: consoleHeaders(),
    });
    assert.equal(initial.statusCode, 200);
    assert.ok(Array.isArray(initial.json.items));

    const created = await app.inject({
      method: 'POST',
      url: '/api/console/system/business-properties',
      headers: consoleHeaders(),
      body: {
        value: 'hospital_term',
        label: '医院机构',
        description: '适用于医院和医疗机构类词条。',
        legacyCategoryCode: 'hospital_term',
        sortOrder: 40,
        enabled: true,
      },
    });
    assert.equal(created.statusCode, 201);
    assert.equal(created.json.item.value, 'hospital_term');

    const updated = await app.inject({
      method: 'PUT',
      url: '/api/console/system/business-properties/hospital_term',
      headers: consoleHeaders(),
      body: {
        label: '医疗机构',
        description: '适用于医院、门诊和其他医疗机构类词条。',
        legacyCategoryCode: 'hospital_term',
        sortOrder: 45,
        enabled: true,
      },
    });
    assert.equal(updated.statusCode, 200);
    assert.equal(updated.json.item.label, '医疗机构');

    const publicList = await app.inject({
      method: 'GET',
      url: '/api/console/business-properties',
      headers: consoleHeaders(),
    });
    assert.equal(publicList.statusCode, 200);
    assert.ok(publicList.json.items.some((item) => item.value === 'hospital_term'));

    const disabled = await app.inject({
      method: 'POST',
      url: '/api/console/system/business-properties/hospital_term/disable',
      headers: consoleHeaders(),
      body: {},
    });
    assert.equal(disabled.statusCode, 200);
    assert.equal(disabled.json.item.enabled, false);

    const disabledPublicList = await app.inject({
      method: 'GET',
      url: '/api/console/business-properties',
      headers: consoleHeaders(),
    });
    assert.equal(disabledPublicList.statusCode, 200);
    assert.ok(!disabledPublicList.json.items.some((item) => item.value === 'hospital_term'));

    const enabled = await app.inject({
      method: 'POST',
      url: '/api/console/system/business-properties/hospital_term/enable',
      headers: consoleHeaders(),
      body: {},
    });
    assert.equal(enabled.statusCode, 200);
    assert.equal(enabled.json.item.enabled, true);

    const removed = await app.inject({
      method: 'POST',
      url: '/api/console/system/business-properties/hospital_term/delete',
      headers: consoleHeaders(),
      body: {},
    });
    assert.equal(removed.statusCode, 200);
    assert.equal(removed.json.item.value, 'hospital_term');

    const businessPropertiesFile = JSON.parse(fs.readFileSync(config.businessPropertiesConfigPath, 'utf8'));
    assert.ok(!businessPropertiesFile.items.some((item) => item.value === 'hospital_term'));
  } finally {
    await app.stop();
  }
});

/**
 * 功能：构造系统测试使用的控制台请求头。
 * 输入：可选扩展字段。
 * 输出：统一的请求头对象。
 */
function consoleHeaders(extra = {}) {
  return {
    'x-role': 'dict_admin',
    'x-operator': 'system_test_operator',
    'x-user-id': 'system_test_operator',
    ...extra,
  };
}

test('system management endpoints persist access-control and governance config', async () => {
  const config = createSystemTestConfig('workspace-unit-system-management-config');
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('system management baseline build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8841,
    },
  });

  try {
    const accessControl = await app.inject({
      method: 'GET',
      url: '/api/console/system/access-control',
      headers: consoleHeaders(),
    });
    assert.equal(accessControl.statusCode, 200);
    assert.ok(Array.isArray(accessControl.json.roles));
    assert.ok(Array.isArray(accessControl.json.users));

    const createdRole = await app.inject({
      method: 'POST',
      url: '/api/console/system/roles',
      headers: consoleHeaders(),
      body: {
        roleId: 'qa_auditor',
        displayName: 'QA 审计员',
        description: '用于验证系统管理页面的自定义角色。',
        permissions: ['dashboard.read', 'release.read'],
      },
    });
    assert.equal(createdRole.statusCode, 201);
    assert.equal(createdRole.json.item.roleId, 'qa_auditor');

    const createdUser = await app.inject({
      method: 'POST',
      url: '/api/console/system/users',
      headers: consoleHeaders(),
      body: {
        userId: 'qa_user',
        displayName: 'QA 用户',
        defaultRole: 'qa_auditor',
        assignedRoles: ['qa_auditor'],
      },
    });
    assert.equal(createdUser.statusCode, 201);
    assert.equal(createdUser.json.item.userId, 'qa_user');

    const updatedPolicies = await app.inject({
      method: 'PUT',
      url: '/api/console/system/governance-policies',
      headers: consoleHeaders(),
      body: {
        releasePolicies: {
          submitterReviewerSeparationRequired: false,
          distinctApprovalReviewersRequired: false,
          reviewerPublisherSeparationRequired: false,
          highRiskReleaseRequiresDualApproval: false,
          defaultRequiredApprovals: 1,
          highRiskReleaseRequiredApprovals: 1,
        },
      },
    });
    assert.equal(updatedPolicies.statusCode, 200);
    assert.equal(updatedPolicies.json.item.releasePolicies.reviewerPublisherSeparationRequired, false);

    const authMeta = await app.inject({
      method: 'GET',
      url: '/api/admin/me',
      headers: {
        'x-role': 'qa_auditor',
        'x-operator': 'qa_user',
        'x-user-id': 'qa_user',
      },
    });
    assert.equal(authMeta.statusCode, 200);
    assert.equal(authMeta.json.userId, 'qa_user');
    assert.equal(authMeta.json.role, 'qa_auditor');
    assert.ok((authMeta.json.roleDefinitions || []).some((item) => item.roleId === 'qa_auditor' && item.displayName === 'QA 审计员'));

    const accessControlFile = JSON.parse(fs.readFileSync(config.accessControlConfigPath, 'utf8'));
    const governanceFile = JSON.parse(fs.readFileSync(config.governancePoliciesConfigPath, 'utf8'));
    assert.ok(accessControlFile.roles.qa_auditor);
    assert.ok(accessControlFile.users.qa_user);
    assert.equal(governanceFile.releasePolicies.submitterReviewerSeparationRequired, false);
    assert.equal(governanceFile.releasePolicies.reviewerPublisherSeparationRequired, false);
  } finally {
    await app.stop();
  }
});

test('release review and publish follow configurable governance policies', async () => {
  const config = createSystemTestConfig('workspace-unit-system-management-governance');
  const governanceConfig = {
    releasePolicies: {
      submitterReviewerSeparationRequired: false,
      distinctApprovalReviewersRequired: false,
      reviewerPublisherSeparationRequired: false,
      highRiskReleaseRequiresDualApproval: false,
      defaultRequiredApprovals: 1,
      highRiskReleaseRequiredApprovals: 1,
    },
  };
  fs.writeFileSync(config.governancePoliciesConfigPath, `${JSON.stringify(governanceConfig, null, 2)}\n`, 'utf8');
  prepareData.main(config);
  bootstrapDb.main(config);
  buildSnapshot.main('system governance baseline build', config);
  const app = createPrototypeApp({
    ...config,
    server: {
      ...config.server,
      host: '127.0.0.1',
      port: 8842,
    },
  });

  try {
    const createdTerm = await app.inject({
      method: 'POST',
      url: '/api/console/terms',
      headers: consoleHeaders(),
      body: {
        categoryCode: 'proper_noun',
        canonicalText: '高风险治理测试词',
        aliases: ['高风险治理别名'],
        priority: 95,
        riskLevel: 'high',
        replaceMode: 'replace',
        baseConfidence: 0.93,
        sourceType: 'manual',
        pinyinRuntimeMode: 'candidate',
      },
    });
    assert.equal(createdTerm.statusCode, 201);
    const termId = createdTerm.json.item.termId;

    const submitTermReview = await app.inject({
      method: 'POST',
      url: `/api/console/terms/${encodeURIComponent(termId)}/submit-review`,
      headers: consoleHeaders(),
      body: { comment: 'submit high risk term review' },
    });
    assert.equal(submitTermReview.statusCode, 200);
    const termReviewTaskId = submitTermReview.json.item.taskId;

    const approveTermReview = await app.inject({
      method: 'POST',
      url: `/api/console/reviews/${encodeURIComponent(termReviewTaskId)}/approve`,
      headers: consoleHeaders(),
      body: {},
    });
    assert.equal(approveTermReview.statusCode, 200);

    const builtRelease = await app.inject({
      method: 'POST',
      url: '/api/console/releases/build',
      headers: consoleHeaders(),
      body: {
        summary: 'governance publish flow',
      },
    });
    assert.equal(builtRelease.statusCode, 201);
    const releaseId = builtRelease.json.item.releaseId || builtRelease.json.item.release.releaseId;

    const releaseDetail = await app.inject({
      method: 'GET',
      url: `/api/console/releases/${encodeURIComponent(releaseId)}`,
      headers: consoleHeaders(),
    });
    assert.equal(releaseDetail.statusCode, 200);
    assert.equal(releaseDetail.json.item.approval.requiredApprovals, 1);

    const submitReleaseReview = await app.inject({
      method: 'POST',
      url: `/api/console/releases/${encodeURIComponent(releaseId)}/submit-review`,
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'publisher_same_person',
        'x-user-id': 'publisher_same_person',
      },
      body: { comment: 'submit release review' },
    });
    assert.equal(submitReleaseReview.statusCode, 201);
    const releaseTaskId = submitReleaseReview.json.item.taskId;

    const approveReleaseReview = await app.inject({
      method: 'POST',
      url: `/api/console/reviews/${encodeURIComponent(releaseTaskId)}/approve`,
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'publisher_same_person',
        'x-user-id': 'publisher_same_person',
      },
      body: {},
    });
    assert.equal(approveReleaseReview.statusCode, 200);

    const publishRelease = await app.inject({
      method: 'POST',
      url: `/api/console/releases/${encodeURIComponent(releaseId)}/publish`,
      headers: {
        'x-role': 'dict_admin',
        'x-operator': 'publisher_same_person',
        'x-user-id': 'publisher_same_person',
      },
      body: { mode: 'publish' },
    });
    assert.equal(publishRelease.statusCode, 200);
    assert.equal(publishRelease.json.item.release.status, 'published');
  } finally {
    await app.stop();
  }
});
