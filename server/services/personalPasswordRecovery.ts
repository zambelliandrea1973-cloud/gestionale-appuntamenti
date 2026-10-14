import { randomBytes, randomInt } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { sendSystemEmail } from './systemEmailService';
import { hashPrivatePassword, verifyPrivatePassword, privateHash, PrivateError } from './privateAppointmentAccess';

const invalid = () => new PrivateError(400, 'Codice non valido, scaduto o già utilizzato. Richiedine uno nuovo.');
type Purpose = 'verify' | 'reset';

/** Dependency injection keeps security tests completely isolated from real mail and data. */
export function recoveryService(database: any = db, send = sendSystemEmail) {
  async function status(userId: number, profileId: number) {
    const rows = await database.execute(sql`SELECT r.verified_email FROM personal_password_recovery r
      JOIN private_appointment_profiles p ON p.id=r.profile_id
      WHERE p.user_id=${userId} AND p.id=${profileId}`);
    return { email: rows[0]?.verified_email || null };
  }
  async function issue(userId: number, profileId: number, session: string, purpose: Purpose, email: string) {
    const code = String(randomInt(0, 100_000_000)).padStart(8, '0');
    const challenge = randomBytes(24).toString('hex');
    const codeHash = await hashPrivatePassword(code);
    const prepared = await database.transaction(async (tx: any) => {
      const profiles = await tx.execute(sql`SELECT id,password_hash FROM private_appointment_profiles
        WHERE id=${profileId} AND user_id=${userId} FOR UPDATE`);
      if (!profiles.length || !profiles[0].password_hash) return false;
      await tx.execute(sql`INSERT INTO personal_password_recovery(profile_id) VALUES (${profileId}) ON CONFLICT DO NOTHING`);
      const rows = await tx.execute(sql`SELECT * FROM personal_password_recovery WHERE profile_id=${profileId} FOR UPDATE`);
      const current = rows[0];
      // Never let an unauthenticated request choose a new recovery destination.
      if (purpose === 'reset' && (!current.verified_email || current.verified_email !== email)) return false;
      if (current.next_send_at && new Date(current.next_send_at).getTime() > Date.now())
        throw new PrivateError(429, 'Attendi un minuto prima di richiedere un altro codice.');
      await tx.execute(sql`UPDATE personal_password_recovery SET
        pending_email=${email}, challenge_id=${challenge}, code_hash=${codeHash}, purpose=${purpose},
        session_hash=${privateHash(session)}, password_snapshot=${profiles[0].password_hash},
        attempts=0, expires_at=now()+interval '15 minutes', next_send_at=now()+interval '1 minute'
        WHERE profile_id=${profileId}`);
      return true;
    });
    if (!prepared) return;
    const action = purpose === 'verify' ? 'verificare la tua email personale' : 'reimpostare la password del tuo spazio personale';
    const text = `Il codice per ${action} è: ${code}\nScade tra 15 minuti ed è utilizzabile una sola volta, nel browser che lo ha richiesto. Non condividerlo. Se non hai richiesto questa operazione, ignora il messaggio.`;
    let delivered = false;
    try { delivered = (await send(email, 'Codice per lo spazio personale', `<p>Il codice per ${action} è:</p><p><strong>${code}</strong></p><p>Scade tra 15 minuti. Usalo nel browser che lo ha richiesto. Non condividerlo. Se non hai richiesto questa operazione, ignora il messaggio.</p>`, text)).success; }
    finally {
      if (!delivered) await database.execute(sql`UPDATE personal_password_recovery SET code_hash=NULL, challenge_id=NULL
        WHERE profile_id=${profileId} AND challenge_id=${challenge}`);
    }
    if (!delivered) throw new PrivateError(503, 'Invio email non riuscito. Riprova più tardi; la password non è stata modificata.');
  }
  async function confirm(userId: number, profileId: number, session: string, purpose: Purpose, code: string, password?: string) {
    const newHash = purpose === 'reset' && password ? await hashPrivatePassword(password) : null;
    const ok = await database.transaction(async (tx: any) => {
      // Same lock order as issue; consumption and password/session changes are atomic.
      const profiles = await tx.execute(sql`SELECT id,password_hash FROM private_appointment_profiles
        WHERE id=${profileId} AND user_id=${userId} FOR UPDATE`);
      if (!profiles.length) return false;
      const rows = await tx.execute(sql`SELECT * FROM personal_password_recovery WHERE profile_id=${profileId} FOR UPDATE`);
      const row = rows[0];
      if (!row?.code_hash || row.purpose !== purpose || row.session_hash !== privateHash(session) ||
          row.password_snapshot !== profiles[0].password_hash ||
          !row.expires_at || new Date(row.expires_at).getTime() <= Date.now() || row.attempts >= 5) return false;
      await tx.execute(sql`UPDATE personal_password_recovery SET attempts=attempts+1 WHERE profile_id=${profileId}`);
      if (!await verifyPrivatePassword(code, row.code_hash)) return false;
      if (purpose === 'verify') {
        await tx.execute(sql`UPDATE personal_password_recovery SET verified_email=pending_email WHERE profile_id=${profileId}`);
      } else {
        if (!newHash || row.pending_email !== row.verified_email) return false;
        await tx.execute(sql`UPDATE private_appointment_profiles SET password_hash=${newHash}
          WHERE id=${profileId} AND user_id=${userId}`);
        await tx.execute(sql`DELETE FROM private_appointment_access WHERE profile_id=${profileId} AND user_id=${userId}`);
      }
      await tx.execute(sql`UPDATE personal_password_recovery SET code_hash=NULL, challenge_id=NULL,
        pending_email=NULL, purpose=NULL, session_hash=NULL, password_snapshot=NULL, expires_at=NULL
        WHERE profile_id=${profileId}`);
      return true;
    });
    // Outside transaction: failed attempts must commit, not roll back.
    if (!ok) throw invalid();
    return { success: true };
  }
  return { status, issue, confirm };
}
