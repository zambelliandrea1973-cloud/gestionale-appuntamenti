import crypto from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../db';
import { oauthTransactions } from '../../shared/schema';
import { hashOAuthState } from './oauthTransactionState';

export { hashOAuthState } from './oauthTransactionState';

export type OAuthTransactionPurpose = 'google-main' | 'google-contacts';
export type OAuthAccountMode = 'primary' | 'addAccount';
export type OAuthTransactionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type CreateOAuthTransactionInput = {
  ownerUserId: number;
  purpose: OAuthTransactionPurpose;
  accountMode?: OAuthAccountMode;
  redirectUri: string;
  appOrigin: string;
  returnPath?: string | null;
  metadata?: Record<string, unknown>;
  expiresInMs?: number;
};

/**
 * Creates an opaque 256-bit handoff value.  Callers may send `state` to the
 * provider, but only `stateHash` is written to Postgres.
 */
export async function createOAuthTransaction(input: CreateOAuthTransactionInput) {
  const state = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (input.expiresInMs ?? 10 * 60 * 1000));
  const [transaction] = await db.insert(oauthTransactions).values({
    stateHash: hashOAuthState(state),
    ownerUserId: input.ownerUserId,
    purpose: input.purpose,
    accountMode: input.accountMode ?? 'primary',
    redirectUri: input.redirectUri,
    appOrigin: input.appOrigin,
    returnPath: input.returnPath ?? null,
    expiresAt,
    status: 'pending',
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  }).returning();

  return { state, transaction };
}

export async function findOAuthTransaction(state: string, purpose?: OAuthTransactionPurpose) {
  const [transaction] = await db.select().from(oauthTransactions)
    .where(and(
      eq(oauthTransactions.stateHash, hashOAuthState(state)),
      ...(purpose ? [eq(oauthTransactions.purpose, purpose)] : []),
    ))
    .limit(1);
  return transaction ?? null;
}

/**
 * Atomic compare-and-set claim.  A second callback, another app instance, or
 * a callback after expiry receives null and cannot exchange the code.
 */
export async function claimOAuthTransaction(state: string, purpose: OAuthTransactionPurpose) {
  const now = new Date();
  const [transaction] = await db.update(oauthTransactions).set({
    status: 'processing',
    claimedAt: now,
    updatedAt: now,
  }).where(and(
    eq(oauthTransactions.stateHash, hashOAuthState(state)),
    eq(oauthTransactions.purpose, purpose),
    eq(oauthTransactions.status, 'pending'),
    gt(oauthTransactions.expiresAt, now),
  )).returning();
  return transaction ?? null;
}

export async function completeOAuthTransaction(id: number) {
  const now = new Date();
  const [transaction] = await db.update(oauthTransactions).set({
    status: 'completed',
    completedAt: now,
    updatedAt: now,
  }).where(and(eq(oauthTransactions.id, id), eq(oauthTransactions.status, 'processing'))).returning();
  return transaction ?? null;
}

export async function failOAuthTransaction(id: number, failureCode = 'oauth_failed') {
  const now = new Date();
  const [transaction] = await db.update(oauthTransactions).set({
    status: 'failed',
    failedAt: now,
    failureCode: failureCode.slice(0, 64),
    updatedAt: now,
  }).where(and(
    eq(oauthTransactions.id, id),
    eq(oauthTransactions.status, 'processing'),
  )).returning();
  return transaction ?? null;
}