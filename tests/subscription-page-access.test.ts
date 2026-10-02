import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRedirectFreeStaff } from '../client/src/lib/subscriptionPageAccess';

const now = new Date('2026-10-02T12:00:00Z').getTime();
const user = { type: 'staff', role: 'staff', licenseInfo: { type: 'trial', isActive: true, expiresAt: '2026-10-11T12:00:00Z' } };
test('normal staff-classified trial accounts can reach subscription plans', () => {
  assert.equal(shouldRedirectFreeStaff(user, now), false);
  assert.equal(shouldRedirectFreeStaff({ ...user, licenseInfo: { ...user.licenseInfo, expiresAt: '2026-09-01' } }, now), false);
});
test('paying staff accounts can reach subscription upgrades', () => {
  for (const type of ['base', 'pro', 'business']) {
    assert.equal(shouldRedirectFreeStaff({ ...user, licenseInfo: { ...user.licenseInfo, type } }, now), false);
  }
});
test('active privileged staff licenses retain the existing redirect', () => {
  for (const type of ['staff_free', 'staff_free_10years', 'passepartout']) {
    assert.equal(shouldRedirectFreeStaff({ ...user, licenseInfo: { type, isActive: true, expiresAt: null } }, now), true);
  }
});
test('expired or revoked free privileges do not prevent subscription access', () => {
  assert.equal(shouldRedirectFreeStaff({ ...user, licenseInfo: { type: 'staff_free', isActive: true, expiresAt: '2025-01-01' } }, now), false);
  assert.equal(shouldRedirectFreeStaff({ ...user, licenseInfo: { type: 'staff_free', isActive: false, expiresAt: null } }, now), false);
});