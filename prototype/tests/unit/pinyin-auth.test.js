const test = require('node:test');
const assert = require('node:assert/strict');

const {
  joinPinyin,
  buildPinyinProfile,
  buildPinyinCandidates,
} = require('../../src/lib/pinyin');
const {
  normalizeRole,
  permissionsForRole,
  hasPermission,
  buildAuthContext,
  pageFeaturesForPermissions,
} = require('../../src/lib/admin-auth');

test('buildPinyinProfile uses custom full pinyin and alternatives', () => {
  const profile = buildPinyinProfile('重庆', {
    customFullPinyinNoTone: 'chong qing',
    alternativeReadings: ['zhong qing'],
  });
  assert.equal(profile.fullPinyinNoTone, 'chong qing');
  assert.deepEqual(profile.alternativeReadings, ['zhong qing']);
});

test('buildPinyinCandidates returns polyphonic alternatives for 单于桥', () => {
  const candidates = buildPinyinCandidates('单于桥', { limit: 10 });
  const values = candidates.candidates.map((item) => joinPinyin(item.fullPinyinNoTone));
  assert.ok(values.includes('dan yu qiao'));
});

test('admin auth role model exposes expected permissions', () => {
  assert.equal(normalizeRole('DICT_EDITOR'), 'dict_editor');
  assert.ok(permissionsForRole('dict_publisher').includes('release.publish'));
  assert.ok(permissionsForRole('dict_operator').includes('runtime.node.control'));
  assert.equal(hasPermission('dict_viewer', 'release.publish'), false);
});

test('admin auth context exposes user-role-permission-page features', () => {
  const context = buildAuthContext({
    userId: 'reviewer_user',
    operator: 'reviewer_user',
    role: 'dict_reviewer',
  });
  assert.equal(context.userId, 'reviewer_user');
  assert.equal(context.role, 'dict_reviewer');
  assert.deepEqual(context.assignedRoles, ['dict_reviewer']);
  assert.ok(context.permissions.includes('review.decide'));
  assert.ok((context.pageFeatures || []).some((item) => item.featureKey === 'reviews.approve'));
  assert.ok((context.pageFeatures || []).some((item) => item.featureKey === 'reviews.reject'));
  assert.equal(Boolean((context.pageAccess || {})['/dictionary/reviews']), true);
});

test('admin auth page features include high-risk metadata for critical actions', () => {
  const features = pageFeaturesForPermissions(permissionsForRole('dict_admin'));
  const publish = features.find((item) => item.featureKey === 'releases.publish');
  const rollback = features.find((item) => item.featureKey === 'releases.rollback');
  const reviewApprove = features.find((item) => item.featureKey === 'reviews.approve');
  assert.equal(publish.riskLevel, 'high');
  assert.equal(publish.confirmRequired, true);
  assert.equal(rollback.riskLevel, 'high');
  assert.equal(reviewApprove.constraintCode, 'review_separation_required');
});
