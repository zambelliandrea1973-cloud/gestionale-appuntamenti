import crypto from 'crypto';

export type OAuthTransactionClaimState = {
  purpose: string;
  status: string;
  expiresAt: Date | string;
};

export function hashOAuthState(state: string): string {
  return crypto.createHash('sha256').update(state, 'utf8').digest('hex');
}

/** Pure predicate shared by tests and defensive callers. The database UPDATE
 * remains the authority for the actual atomic claim. */
export function isOAuthTransactionClaimable(
  transaction: OAuthTransactionClaimState,
  purpose: string,
  now = new Date(),
): boolean {
  return transaction.status === 'pending' &&
    transaction.purpose === purpose &&
    new Date(transaction.expiresAt).getTime() > now.getTime();
}