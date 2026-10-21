import { sql } from 'drizzle-orm';
import { db } from '../db';

/** Shared, durable 30-minute account activity window, including concurrent logins. */
export async function recordUserAccess(userId: number, ip = '', userAgent = '', database: any = db) {
  return database.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73119, ${userId}::integer)`);
    const recent = await tx.execute(sql`SELECT id FROM user_logins
      WHERE user_id=${userId} AND login_at > now() - interval '30 minutes' LIMIT 1`);
    if (recent.length) return false;
    await tx.execute(sql`INSERT INTO user_logins (user_id, ip_address, user_agent)
      VALUES (${userId}, ${ip.slice(0, 45)}, ${userAgent.slice(0, 500)})`);
    return true;
  });
}
