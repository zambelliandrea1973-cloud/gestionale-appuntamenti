import { sql } from 'drizzle-orm';
import { db } from '../db';

/** Called only when Passport establishes a login, never during session reads. */
export async function recordUserAccess(userId: number, ip = '', userAgent = '', database: any = db) {
    await database.execute(sql`INSERT INTO user_logins (user_id, ip_address, user_agent)
      VALUES (${userId}, ${ip.slice(0, 45)}, ${userAgent.slice(0, 500)})`);
    return true;
}
