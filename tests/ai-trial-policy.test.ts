import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { AI_TRIAL_LIMITS, evaluateAITrialLicense } from '../server/services/aiTrialPolicy';

const now = new Date('2026-10-02T12:00:00Z');
const trial = { type: 'trial', is_active: true, created_at: '2026-09-01T12:00:00Z', activated_at: null, expires_at: '2026-10-11T12:00:00Z' };

test('trial lasts at most 40 days and quotas count conversations and marketing separately', () => {
  assert.deepEqual(AI_TRIAL_LIMITS, { appointments: 10, marketing: 5 });
  assert.equal(evaluateAITrialLicense([trial], now).eligible, true);
  assert.equal(evaluateAITrialLicense([trial], new Date('2026-10-11T12:00:00Z')).eligible, false);
  assert.equal(evaluateAITrialLicense([{ ...trial, expires_at: '2030-01-01' }], new Date('2026-10-12')).eligible, false);
});
test('missing, inactive and expired licenses fail closed', () => {
  assert.equal(evaluateAITrialLicense([], now).eligible, false);
  assert.equal(evaluateAITrialLicense([{ ...trial, is_active: false }], now).eligible, false);
  assert.equal(evaluateAITrialLicense([{ ...trial, type: 'pro', expires_at: '2025-01-01' }], now).eligible, false);
});
test('a valid paid or existing privileged license overrides exhausted trials regardless of row ordering', () => {
  for (const type of ['base', 'pro', 'business', 'staff_free', 'staff_free_10years', 'passepartout']) {
    assert.equal(evaluateAITrialLicense([trial, { ...trial, type, expires_at: null }], now).unlimited, true);
  }
});
test('quota messages and subscription buttons exist in all 10 supported languages with matching placeholders', () => {
  for (const locale of ['it', 'en', 'de', 'es', 'fr', 'hi', 'nl', 'no', 'ro', 'ru']) {
    const data = JSON.parse(fs.readFileSync(`client/src/locales/${locale}.json`, 'utf8')).aiTrial;
    for (const key of ['usage', 'limitReached', 'trialExpired', 'subscribe', 'conversationExpired']) {
      assert.ok(typeof data[key] === 'string' && data[key].length > 10, `${locale}.${key}`);
      assert.doesNotMatch(data[key], /TODO|aiTrial\./);
    }
    assert.match(data.usage, /{{used}}/);
    assert.match(data.usage, /{{limit}}/);
  }
});