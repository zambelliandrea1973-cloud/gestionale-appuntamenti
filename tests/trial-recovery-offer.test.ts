import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  discountedAnnualPrice,
  hashRecoveryOfferToken,
  RECOVERY_DISCOUNT_PERCENT,
} from '../server/services/trialRecoveryOfferService';

test('trial recovery discount is exactly 50 percent in integer cents', () => {
  assert.equal(RECOVERY_DISCOUNT_PERCENT, 50);
  assert.equal(discountedAnnualPrice(5900), 2950);
  assert.equal(discountedAnnualPrice(9900), 4950);
  assert.equal(discountedAnnualPrice(19900), 9950);
  assert.equal(discountedAnnualPrice(999), 500);
});

test('trial recovery tokens are compared through deterministic SHA-256 hashes', () => {
  const token = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  const hash = hashRecoveryOfferToken(token);
  assert.equal(hash.length, 64);
  assert.equal(hash, hashRecoveryOfferToken(token));
  assert.notEqual(hash, hashRecoveryOfferToken(`${token}different`));
  assert.equal(hash.includes(token), false);
});