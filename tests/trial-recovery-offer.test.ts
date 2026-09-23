import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  discountedAnnualPrice,
  hashRecoveryOfferToken,
  recoveryEmailHtml,
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

test('recovery email addresses users without an active subscription', () => {
  const html = recoveryEmailHtml('Mario', 'x'.repeat(43), new Date('2026-10-01T12:00:00Z'));
  assert.match(html, /Ciao <strong>Mario<\/strong>/);
  assert.match(html, /non hai ancora un abbonamento attivo/);
  assert.match(html, /50% per il primo anno/);
});