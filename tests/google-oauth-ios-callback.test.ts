import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createSignedOAuthState,
  parseSignedOAuthState,
  validateGoogleOAuthCallbackState
} from '../server/services/googleOAuthState';

const secret = 'test-session-secret-with-sufficient-entropy';
const now = new Date('2026-09-11T15:00:00.000Z').getTime();
const nonce = 'A'.repeat(43);
function validState(overrides: Record<string, unknown> = {}) {
  return {
    userId: 42,
    nonce,
    issuedAt: now - 60_000,
    redirectUri: 'https://example.com/api/google-auth/callback',
    ...overrides
  };
}

describe('Google OAuth callback state validation', () => {
  it('rejects a sessionless callback regardless of user agent', () => {
    const signed = createSignedOAuthState(validState(), secret);
    const parsed = parseSignedOAuthState(signed, secret);

    assert.throws(() => validateGoogleOAuthCallbackState({
      stateData: parsed,
      userId: 42,
      pendingOAuth: null,
      now
    }), /Expired, reused or session-mismatched OAuth state/);
  });

  it('rejects a callback whose signed payload was altered', () => {
    const signed = createSignedOAuthState(validState(), secret);
    const [payload, signature] = signed.split('.');
    const alteredPayload = Buffer.from(JSON.stringify(validState({ userId: 99 })))
      .toString('base64url');

    assert.throws(
      () => parseSignedOAuthState(`${alteredPayload}.${signature}`, secret),
      /Invalid OAuth state signature/
    );
    assert.notEqual(payload, alteredPayload);
  });

  it('rejects an expired signed state', () => {
    assert.throws(
      () => validateGoogleOAuthCallbackState({
        stateData: validState({ issuedAt: now - 10 * 60 * 1000 - 1 }),
        userId: 42,
        pendingOAuth: null,
        now
      }),
      /Expired, reused or session-mismatched OAuth state/
    );
  });

  it('rejects a malformed nonce', () => {
    assert.throws(
      () => validateGoogleOAuthCallbackState({
        stateData: validState({ nonce: 'too-short' }),
        userId: 42,
        pendingOAuth: null,
        now
      }),
      /Expired, reused or session-mismatched OAuth state/
    );
  });

  it('rejects a present but mismatched session', () => {
    assert.throws(
      () => validateGoogleOAuthCallbackState({
        stateData: validState(),
        userId: 42,
        pendingOAuth: { nonce: 'B'.repeat(43), userId: 42, ts: now - 60_000 },
        now
      }),
      /Expired, reused or session-mismatched OAuth state/
    );
  });

  it('rejects a sessionless callback without a transaction', () => {
    assert.throws(
      () => validateGoogleOAuthCallbackState({
        stateData: validState(),
        userId: 42,
        pendingOAuth: null,
        now
      }),
      /Expired, reused or session-mismatched OAuth state/
    );
  });

  it('keeps accepting an exactly matching normal browser session', () => {
    assert.equal(validateGoogleOAuthCallbackState({
      stateData: validState(),
      userId: 42,
      pendingOAuth: { nonce, userId: 42, ts: now - 60_000 },
      now
    }), 'matching-session');
  });
});