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
const iphoneUserAgent =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

function validState(overrides: Record<string, unknown> = {}) {
  return {
    userId: 42,
    nonce,
    issuedAt: now - 60_000,
    redirectUri: 'https://example.com/api/google-auth/callback',
    ...overrides
  };
}

describe('Google OAuth callback recovery on iOS', () => {
  it('accepts a signed recent iPhone callback without the initiating cookie', () => {
    const signed = createSignedOAuthState(validState(), secret);
    const parsed = parseSignedOAuthState(signed, secret);

    assert.equal(validateGoogleOAuthCallbackState({
      stateData: parsed,
      userId: 42,
      pendingOAuth: null,
      userAgent: iphoneUserAgent,
      now
    }), 'apple-session-recovery');
  });

  it('also recognizes iPadOS desktop-style user agents', () => {
    const stateData = validState();
    const ipadUserAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

    assert.equal(validateGoogleOAuthCallbackState({
      stateData,
      userId: 42,
      pendingOAuth: null,
      userAgent: ipadUserAgent,
      now
    }), 'apple-session-recovery');
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
        userAgent: iphoneUserAgent,
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
        userAgent: iphoneUserAgent,
        now
      }),
      /Expired, reused or session-mismatched OAuth state/
    );
  });

  it('rejects a present but mismatched session even on iPhone', () => {
    assert.throws(
      () => validateGoogleOAuthCallbackState({
        stateData: validState(),
        userId: 42,
        pendingOAuth: { nonce: 'B'.repeat(43), userId: 42, ts: now - 60_000 },
        userAgent: iphoneUserAgent,
        now
      }),
      /Expired, reused or session-mismatched OAuth state/
    );
  });

  it('rejects a sessionless callback from a non-Apple browser', () => {
    assert.throws(
      () => validateGoogleOAuthCallbackState({
        stateData: validState(),
        userId: 42,
        pendingOAuth: null,
        userAgent: 'Mozilla/5.0 (Linux; Android 15) Chrome/140.0 Mobile Safari/537.36',
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
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0',
      now
    }), 'matching-session');
  });
});