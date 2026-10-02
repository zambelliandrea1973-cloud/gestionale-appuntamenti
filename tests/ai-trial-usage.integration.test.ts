import assert from 'node:assert/strict';
import test from 'node:test';
import { sql } from 'drizzle-orm';
import { db, closeDatabase } from '../server/db';
import { aiTrialSchemaSql } from '../server/services/aiTrialMigration';
import {
  AITrialAccessError, authorizeAppointmentAI, beginAppointmentConversation, getAITrialUsage,
  reserveMarketingAI, type AITrialDatabase
} from '../server/services/aiTrialUsageService';

test('real PostgreSQL trial accounting, ownership, expiry and paid bypass using rollback-only TEMP fixtures', { timeout: 60000 }, async () => {
  const userId = 2000000000;
  const otherId = 1999999999;
  const rollback = new Error('ROLLBACK_ONLY_AI_TRIAL_FIXTURES');
  try {
    await assert.rejects(db.transaction(async tx => {
      // TEMP tables shadow public tables on this connection ONLY. Existing
      // account/license/counter data is never read or modified by these fixtures.
      await tx.execute(sql.raw(`
        CREATE TEMP TABLE users (id integer PRIMARY KEY);
        CREATE TEMP TABLE licenses (user_id integer, type text, is_active boolean, created_at timestamptz, activated_at timestamptz, expires_at timestamptz);
        INSERT INTO users VALUES (${userId}), (${otherId});
        INSERT INTO licenses VALUES (${userId}, 'trial', true, now(), now(), now() + interval '40 days'),
          (${otherId}, 'trial', true, now(), now(), now() + interval '40 days');
        ${aiTrialSchemaSql.replace(/CREATE TABLE IF NOT EXISTS/g, 'CREATE TEMP TABLE IF NOT EXISTS')}
      `));
      const database = tx as unknown as AITrialDatabase;
      const first = await beginAppointmentConversation(userId, undefined, database);
      assert.ok(first.conversationId);
      const reused = await beginAppointmentConversation(userId, first.conversationId, database);
      assert.equal(reused.conversationId, first.conversationId);
      assert.equal(reused.usage.appointments.used, 1);
      await assert.rejects(authorizeAppointmentAI(otherId, first.conversationId, 'interpretation', 0, database), AITrialAccessError);
      await assert.rejects(authorizeAppointmentAI(userId, null, 'speech', 20, database), AITrialAccessError);
      let last = first;
      for (let i = 1; i < 10; i++) last = await beginAppointmentConversation(userId, undefined, database);
      assert.equal(last.usage.appointments.used, 10);
      await assert.rejects(beginAppointmentConversation(userId, undefined, database), (error: any) => error.code === 'AI_TRIAL_LIMIT_REACHED');
      // The final allowed conversation is still usable, even with zero new starts left.
      await authorizeAppointmentAI(userId, last.conversationId, 'interpretation', 0, database);
      await authorizeAppointmentAI(userId, last.conversationId, 'speech', 200, database);
      for (let i = 0; i < 5; i++) await reserveMarketingAI(userId, database);
      await assert.rejects(reserveMarketingAI(userId, database), (error: any) => error.code === 'AI_TRIAL_LIMIT_REACHED');
      assert.equal((await getAITrialUsage(userId, database)).marketing.used, 5);
      await tx.execute(sql`UPDATE ai_trial_conversations SET interpretation_requests = 25, speech_characters = 12000 WHERE id = ${last.conversationId}::uuid`);
      await assert.rejects(authorizeAppointmentAI(userId, last.conversationId, 'interpretation', 0, database), AITrialAccessError);
      await assert.rejects(authorizeAppointmentAI(userId, last.conversationId, 'speech', 1, database), AITrialAccessError);
      await tx.execute(sql`UPDATE ai_trial_conversations SET expires_at = now() - interval '1 second' WHERE id = ${first.conversationId}::uuid`);
      await assert.rejects(authorizeAppointmentAI(userId, first.conversationId, 'interpretation', 0, database), AITrialAccessError);
      await tx.execute(sql`UPDATE licenses SET expires_at = now() - interval '1 second' WHERE user_id = ${userId}`);
      await assert.rejects(reserveMarketingAI(userId, database), (error: any) => error.code === 'AI_TRIAL_EXPIRED');
      await assert.rejects(authorizeAppointmentAI(userId, last.conversationId, 'speech', 10, database), (error: any) => error.code === 'AI_TRIAL_EXPIRED');
      await tx.execute(sql`UPDATE licenses SET type = 'pro', expires_at = now() + interval '1 year' WHERE user_id = ${userId}`);
      await reserveMarketingAI(userId, database);
      await authorizeAppointmentAI(userId, null, 'speech', 100, database);
      assert.equal((await getAITrialUsage(userId, database)).unlimited, true);
      assert.equal((await getAITrialUsage(userId, database)).marketing.used, 5);
      throw rollback;
    }), error => error === rollback);
  } finally {
    await closeDatabase();
  }
});