import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import {
  AI_TRIAL_LIMITS, AI_CONVERSATION_MINUTES, AI_CONVERSATION_MAX_INTERPRETATIONS,
  AI_CONVERSATION_MAX_SPEECH, AI_CONVERSATION_MAX_CHARACTERS,
  evaluateAITrialLicense, type AITrialLicense, type AITrialFeature
} from './aiTrialPolicy';

type Executor = Pick<typeof db, 'execute'>;
export type AITrialDatabase = Pick<typeof db, 'execute' | 'transaction'>;
type Access = ReturnType<typeof evaluateAITrialLicense>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AITrialAccessError extends Error {
  constructor(public readonly code: string, public readonly feature: AITrialFeature) {
    super('Per continuare a utilizzare il servizio AI provato, sottoscrivi un abbonamento.');
    this.name = 'AITrialAccessError';
  }
}

async function getAccess(executor: Executor, userId: number): Promise<Access> {
  const rows = await executor.execute(sql`
    SELECT type, is_active, created_at, activated_at, expires_at
    FROM licenses WHERE user_id = ${userId}
  `);
  return evaluateAITrialLicense(Array.from(rows) as unknown as AITrialLicense[]);
}

async function getCounts(executor: Executor, userId: number) {
  const rows = await executor.execute(sql`
    SELECT appointment_conversations, marketing_requests FROM ai_trial_usage WHERE user_id = ${userId}
  `);
  return {
    appointments: Number(rows[0]?.appointment_conversations || 0),
    marketing: Number(rows[0]?.marketing_requests || 0)
  };
}

function describe(access: Access, counts: { appointments: number; marketing: number }) {
  return {
    ...access,
    appointments: { used: counts.appointments, limit: AI_TRIAL_LIMITS.appointments, remaining: Math.max(0, AI_TRIAL_LIMITS.appointments - counts.appointments) },
    marketing: { used: counts.marketing, limit: AI_TRIAL_LIMITS.marketing, remaining: Math.max(0, AI_TRIAL_LIMITS.marketing - counts.marketing) }
  };
}

export async function getAITrialUsage(userId: number, database: AITrialDatabase = db) {
  const [access, counts] = await Promise.all([getAccess(database, userId), getCounts(database, userId)]);
  return describe(access, counts);
}

function requireEligible(access: Access, feature: AITrialFeature) {
  if (!access.eligible) throw new AITrialAccessError('AI_TRIAL_EXPIRED', feature);
}

async function lockAccount(executor: Executor, userId: number) {
  // Transaction-scoped, account-wide lock: parallel tabs and both AI features
  // cannot overspend a shared trial counter.
  await executor.execute(sql`SELECT pg_advisory_xact_lock(705031, ${userId}::integer)`);
}

export async function beginAppointmentConversation(userId: number, previousId?: unknown, database: AITrialDatabase = db) {
  return database.transaction(async tx => {
    await lockAccount(tx, userId);
    const access = await getAccess(tx, userId);
    requireEligible(access, 'appointments');
    if (access.unlimited) return { conversationId: null, usage: describe(access, await getCounts(tx, userId)) };
    if (typeof previousId === 'string' && UUID.test(previousId)) {
      const existing = await tx.execute(sql`
        SELECT id FROM ai_trial_conversations
        WHERE id = ${previousId}::uuid AND user_id = ${userId} AND expires_at > now()
      `);
      if (existing.length) return { conversationId: previousId, usage: describe(access, await getCounts(tx, userId)) };
    }
    await tx.execute(sql`INSERT INTO ai_trial_usage (user_id) VALUES (${userId}) ON CONFLICT (user_id) DO NOTHING`);
    const reserved = await tx.execute(sql`
      UPDATE ai_trial_usage SET appointment_conversations = appointment_conversations + 1
      WHERE user_id = ${userId} AND appointment_conversations < ${AI_TRIAL_LIMITS.appointments}
      RETURNING appointment_conversations
    `);
    if (!reserved.length) throw new AITrialAccessError('AI_TRIAL_LIMIT_REACHED', 'appointments');
    const id = randomUUID();
    await tx.execute(sql`
      INSERT INTO ai_trial_conversations (id, user_id, expires_at)
      VALUES (${id}::uuid, ${userId}, now() + ${AI_CONVERSATION_MINUTES} * interval '1 minute')
    `);
    return { conversationId: id, usage: describe(access, await getCounts(tx, userId)) };
  });
}

export async function authorizeAppointmentAI(
  userId: number, conversationId: unknown, kind: 'interpretation' | 'speech', characters = 0, database: AITrialDatabase = db
) {
  return database.transaction(async tx => {
    await lockAccount(tx, userId);
    const access = await getAccess(tx, userId);
    requireEligible(access, 'appointments');
    if (access.unlimited) return;
    if (typeof conversationId !== 'string' || !UUID.test(conversationId)) {
      throw new AITrialAccessError('AI_CONVERSATION_REQUIRED', 'appointments');
    }
    const rows = await tx.execute(sql`
      SELECT id, interpretation_requests, speech_requests, speech_characters FROM ai_trial_conversations
      WHERE id = ${conversationId}::uuid AND user_id = ${userId} AND expires_at > now()
    `);
    if (!rows.length) throw new AITrialAccessError('AI_CONVERSATION_EXPIRED', 'appointments');
    const row = rows[0];
    if ((kind === 'interpretation' && Number(row.interpretation_requests) >= AI_CONVERSATION_MAX_INTERPRETATIONS) ||
        (kind === 'speech' && (Number(row.speech_requests) >= AI_CONVERSATION_MAX_SPEECH ||
          Number(row.speech_characters) + characters > AI_CONVERSATION_MAX_CHARACTERS))) {
      throw new AITrialAccessError('AI_CONVERSATION_LIMIT_REACHED', 'appointments');
    }
    if (kind === 'interpretation') {
      await tx.execute(sql`UPDATE ai_trial_conversations SET interpretation_requests = interpretation_requests + 1 WHERE id = ${conversationId}::uuid`);
    } else {
      await tx.execute(sql`UPDATE ai_trial_conversations SET speech_requests = speech_requests + 1, speech_characters = speech_characters + ${characters} WHERE id = ${conversationId}::uuid`);
    }
  });
}

export async function reserveMarketingAI(userId: number, database: AITrialDatabase = db) {
  return database.transaction(async tx => {
    await lockAccount(tx, userId);
    const access = await getAccess(tx, userId);
    requireEligible(access, 'marketing');
    if (access.unlimited) return;
    await tx.execute(sql`INSERT INTO ai_trial_usage (user_id) VALUES (${userId}) ON CONFLICT (user_id) DO NOTHING`);
    const reserved = await tx.execute(sql`
      UPDATE ai_trial_usage SET marketing_requests = marketing_requests + 1
      WHERE user_id = ${userId} AND marketing_requests < ${AI_TRIAL_LIMITS.marketing}
      RETURNING marketing_requests
    `);
    if (!reserved.length) throw new AITrialAccessError('AI_TRIAL_LIMIT_REACHED', 'marketing');
  });
}