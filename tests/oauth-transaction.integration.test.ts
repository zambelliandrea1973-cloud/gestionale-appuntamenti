import test from 'node:test';
import assert from 'node:assert/strict';

let service: typeof import('../server/services/oauthTransactionService') | null = null;
let db: typeof import('../server/db').db | null = null;
let schema: typeof import('../shared/schema') | null = null;
let closeDatabase: (() => Promise<void>) | null = null;
let unavailableReason: string | null = null;

test.before(async () => {
  if (!process.env.DATABASE_URL) {
    unavailableReason = 'DATABASE_URL is not configured';
    return;
  }
  try {
    // Probe connectivity without mutating anything. The transaction table
    // must have been rolled out explicitly before this suite is run.
    const postgres = (await import('postgres')).default;
    const probe = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'prefer' });
    await probe`select 1`;
    await probe.end();
    service = await import('../server/services/oauthTransactionService');
    db = (await import('../server/db')).db;
    closeDatabase = (await import('../server/db')).closeDatabase;
    schema = await import('../shared/schema');
  } catch (error) {
    unavailableReason = `Postgres unavailable: ${error instanceof Error ? error.message : String(error)}`;
  }
});

test.after(async () => {
  await closeDatabase?.();
});

async function setup(t: test.TestContext) {
  if (unavailableReason) {
    t.skip(unavailableReason);
    return null;
  }
  assert.ok(service && db && schema);
  return { service, db, schema };
}

function input(ownerUserId = 2147483000) {
  return {
    ownerUserId,
    purpose: 'google-main' as const,
    accountMode: 'primary' as const,
    redirectUri: 'https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback',
    appOrigin: 'https://wife-scheduler-zambelliandrea1.replit.app',
    returnPath: '/google-calendar',
    metadata: { scopes: ['test'] },
    expiresInMs: 60_000,
  };
}

async function cleanup(context: Awaited<ReturnType<typeof setup>>, ids: number[]) {
  if (context) {
    await context.db!.delete(context.schema!.oauthTransactions)
      .where((await import('drizzle-orm')).inArray(context.schema!.oauthTransactions.id, ids));
  }
}

test('Postgres OAuth transaction create and lookup persist only a digest', async (t) => {
  const context = await setup(t);
  if (!context) return;
  const created = await context.service!.createOAuthTransaction(input());
  try {
    assert.match(created.state, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(created.transaction.stateHash.length, 64);
    assert.notEqual(created.transaction.stateHash, created.state);
    const found = await context.service!.findOAuthTransaction(created.state, 'google-main');
    assert.equal(found?.id, created.transaction.id);
    assert.equal(found?.appOrigin, input().appOrigin);
  } finally {
    await cleanup(context, [created.transaction.id]);
  }
});

test('Postgres atomic claim has exactly one winner under concurrency', async (t) => {
  const context = await setup(t);
  if (!context) return;
  const created = await context.service!.createOAuthTransaction(input());
  try {
    const results = await Promise.all([
      context.service!.claimOAuthTransaction(created.state, 'google-main'),
      context.service!.claimOAuthTransaction(created.state, 'google-main'),
    ]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal((await context.service!.findOAuthTransaction(created.state))?.status, 'processing');
  } finally {
    await cleanup(context, [created.transaction.id]);
  }
});

test('Postgres claim rejects expiry and wrong purpose without consuming state', async (t) => {
  const context = await setup(t);
  if (!context) return;
  const expired = await context.service!.createOAuthTransaction({ ...input(), expiresInMs: -1 });
  const wrongPurpose = await context.service!.createOAuthTransaction({
    ...input(),
    purpose: 'google-contacts',
  });
  try {
    assert.equal(await context.service!.claimOAuthTransaction(expired.state, 'google-main'), null);
    assert.equal(await context.service!.claimOAuthTransaction(wrongPurpose.state, 'google-main'), null);
    assert.equal((await context.service!.findOAuthTransaction(wrongPurpose.state))?.status, 'pending');
  } finally {
    await cleanup(context, [expired.transaction.id, wrongPurpose.transaction.id]);
  }
});

test('Postgres complete and fail transitions are one-time', async (t) => {
  const context = await setup(t);
  if (!context) return;
  const completed = await context.service!.createOAuthTransaction(input());
  const failed = await context.service!.createOAuthTransaction(input(2147482999));
  try {
    const claimedCompleted = await context.service!.claimOAuthTransaction(completed.state, 'google-main');
    const claimedFailed = await context.service!.claimOAuthTransaction(failed.state, 'google-main');
    assert.ok(claimedCompleted && claimedFailed);
    assert.equal((await context.service!.completeOAuthTransaction(claimedCompleted!.id))?.status, 'completed');
    assert.equal(await context.service!.completeOAuthTransaction(claimedCompleted!.id), null);
    assert.equal((await context.service!.failOAuthTransaction(claimedFailed!.id, 'test_failure'))?.status, 'failed');
    assert.equal(await context.service!.failOAuthTransaction(claimedFailed!.id, 'replay'), null);
  } finally {
    await cleanup(context, [completed.transaction.id, failed.transaction.id]);
  }
});