import test from 'node:test';
import assert from 'node:assert/strict';
import { hashOAuthState, isOAuthTransactionClaimable } from '../server/services/oauthTransactionState';
import { parseSerializedPassportId } from '../server/services/passportIdentity';

test('Passport preserves serialized staff IDs such as staff:123', () => {
  assert.deepEqual(parseSerializedPassportId('staff:123'), { type: 'staff', id: 123 });
  assert.deepEqual(parseSerializedPassportId('admin:7'), { type: 'admin', id: 7 });
  assert.equal(parseSerializedPassportId('staff:123abc'), null);
  assert.equal(parseSerializedPassportId('staff:0'), null);
});

test('OAuth state is opaque and only its fixed-length digest is persisted', () => {
  const state = Buffer.alloc(32, 7).toString('base64url');
  const digest = hashOAuthState(state);
  assert.match(state, /^[A-Za-z0-9_-]{43}$/);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.notEqual(digest, state);
});

test('OAuth claim rejects tampered, expired, wrong-purpose, and replayed transactions', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const valid = {
    purpose: 'google-main',
    status: 'pending',
    expiresAt: new Date(now.getTime() + 60_000),
  };
  assert.equal(isOAuthTransactionClaimable(valid, 'google-main', now), true);
  assert.equal(isOAuthTransactionClaimable({ ...valid, purpose: 'google-contacts' }, 'google-main', now), false);
  assert.equal(isOAuthTransactionClaimable({ ...valid, expiresAt: new Date(now.getTime() - 1) }, 'google-main', now), false);
  assert.equal(isOAuthTransactionClaimable({ ...valid, status: 'processing' }, 'google-main', now), false);
  assert.equal(isOAuthTransactionClaimable({ ...valid, status: 'completed' }, 'google-main', now), false);
});