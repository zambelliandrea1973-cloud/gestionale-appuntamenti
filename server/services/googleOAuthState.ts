import crypto from 'crypto';

export type PendingGoogleOAuth = {
  nonce: string;
  userId: string | number;
  ts: number;
};

export type GoogleOAuthStateData = Record<string, any> & {
  userId?: string | number;
  nonce?: string;
  issuedAt?: number;
};

function getStateSecret(secret?: string): string {
  const value = secret || process.env.SESSION_SECRET;
  if (!value) {
    throw new Error('SESSION_SECRET is required to secure Google OAuth state');
  }
  return value;
}

export function createSignedOAuthState(
  payload: Record<string, unknown>,
  secret?: string
): string {
  const stateSecret = getStateSecret(secret);
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', stateSecret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function parseSignedOAuthState(
  state: string,
  secret?: string
): GoogleOAuthStateData {
  const stateSecret = getStateSecret(secret);
  const [encodedPayload, signature, ...extra] = state.split('.');
  if (!encodedPayload || !signature || extra.length > 0) {
    throw new Error('Malformed OAuth state');
  }

  const expected = crypto
    .createHmac('sha256', stateSecret)
    .update(encodedPayload)
    .digest('base64url');
  const actualBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid OAuth state signature');
  }

  return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
}

export function isAppleMobileBrowser(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent));
}

export function validateGoogleOAuthCallbackState(options: {
  stateData: GoogleOAuthStateData;
  userId: number | null;
  pendingOAuth?: PendingGoogleOAuth | null;
  userAgent?: string;
  now?: number;
}): 'matching-session' | 'apple-session-recovery' {
  const {
    stateData,
    userId,
    pendingOAuth,
    userAgent,
    now = Date.now()
  } = options;
  const stateAge = now - Number(stateData.issuedAt || 0);
  const hasValidAge = stateAge >= 0 && stateAge <= 10 * 60 * 1000;
  const hasValidNonce = typeof stateData.nonce === 'string' &&
    /^[A-Za-z0-9_-]{43}$/.test(stateData.nonce);
  const hasMatchingSession = Boolean(
    pendingOAuth &&
    pendingOAuth.nonce === stateData.nonce &&
    Number(pendingOAuth.userId) === userId
  );
  const canRecoverAppleSession = !pendingOAuth &&
    isAppleMobileBrowser(userAgent) &&
    hasValidAge &&
    hasValidNonce;

  if ((!hasMatchingSession && !canRecoverAppleSession) || !hasValidAge || !hasValidNonce) {
    throw new Error('Expired, reused or session-mismatched OAuth state');
  }

  return hasMatchingSession ? 'matching-session' : 'apple-session-recovery';
}