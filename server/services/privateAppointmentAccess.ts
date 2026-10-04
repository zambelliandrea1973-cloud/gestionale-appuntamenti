import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import type { Request } from 'express';

const scrypt = promisify(scryptCallback);
export const privateHash = (value: string) => createHash('sha256').update(value).digest('hex');
export class PrivateError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}
export async function hashPrivatePassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPrivatePassword(password: string, stored: string) {
  const [salt, value] = stored.split(':');
  if (!salt || !value || value.length !== 128) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(value, 'hex'));
}

/** Separate tables deliberately keep private details out of work APIs, exports, AI context and sync. */
export async function ensurePrivateAppointmentTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS private_appointment_profiles (
    id serial PRIMARY KEY, user_id integer NOT NULL, identity_id integer NOT NULL,
    name varchar(100) NOT NULL, password_hash text,
    google_token text, google_email text, google_calendar_id text,
    created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,identity_id)
  )`);
  await db.execute(sql`ALTER TABLE private_appointment_profiles ALTER COLUMN password_hash DROP NOT NULL`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS private_appointment_access (
    token_hash varchar(64) PRIMARY KEY, profile_id integer NOT NULL REFERENCES private_appointment_profiles(id) ON DELETE CASCADE,
    user_id integer NOT NULL, session_hash varchar(64) NOT NULL,
    expires_at timestamptz NOT NULL
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS private_appointments (
    id serial PRIMARY KEY, profile_id integer NOT NULL REFERENCES private_appointment_profiles(id) ON DELETE CASCADE,
    data jsonb NOT NULL, google_event_id text, google_calendar_id text,
    sync_pending boolean NOT NULL DEFAULT true, deleted boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS private_appointments_profile_idx ON private_appointments(profile_id)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS private_appointment_oauth (
    state_hash varchar(64) PRIMARY KEY, profile_id integer NOT NULL REFERENCES private_appointment_profiles(id) ON DELETE CASCADE,
    redirect_uri text NOT NULL, expires_at timestamptz NOT NULL,
    claimed boolean NOT NULL DEFAULT false
  )`);
  // Keep calendar reservations even after disconnect, so generic imports never expose old private copies.
  await db.execute(sql`CREATE TABLE IF NOT EXISTS private_google_calendars (
    calendar_id text PRIMARY KEY, profile_id integer NOT NULL REFERENCES private_appointment_profiles(id) ON DELETE CASCADE
  )`);
}
export type PrivateProfile = {
  id: number; user_id: number; identity_id: number; name: string; password_hash: string | null;
  google_token: string | null; google_email: string | null; google_calendar_id: string | null;
};
export function privateUser(req: Request) {
  if (!req.isAuthenticated?.()) throw new PrivateError(401, 'Accedi al gestionale.');
  const user = req.user as any;
  // Paid/trial studio owners registered through /api/register are role=user,
  // type=customer. They are business accounts, NOT client-area identities.
  const studioOwner = user.role === 'user' && user.type === 'customer';
  if (!studioOwner && !['admin', 'staff'].includes(user.type)) throw new PrivateError(403, 'Accesso non consentito.');
  return Number(user.id);
}
export async function privateIdentities(userId: number) {
  const people = await db.execute(sql`SELECT id, first_name, last_name FROM staff WHERE user_id=${userId} ORDER BY id`);
  // No enrollment or extra password while the studio has a sole operator.
  if (!people.length) {
    await db.execute(sql`INSERT INTO private_appointment_profiles(user_id,identity_id,name)
      SELECT ${userId},0,'Personale'
      WHERE NOT EXISTS (SELECT 1 FROM private_appointment_profiles WHERE user_id=${userId})
      ON CONFLICT (user_id,identity_id) DO NOTHING`);
  }
  const profiles = await db.execute(sql`SELECT id,name,identity_id AS "identityId" FROM private_appointment_profiles WHERE user_id=${userId} ORDER BY id`);
  const identities = [
    { identityId: 0, name: 'Titolare' },
    ...people.map((p: any) => ({ identityId: p.id, name: `${p.first_name || ''} ${p.last_name || ''}`.trim() })),
  ].map(identity => ({
    ...identity, configured: profiles.some((p: any) => p.identityId === identity.identityId),
    profileId: (profiles.find((p: any) => p.identityId === identity.identityId) as any)?.id,
  }));
  // A listed collaborator is additional to the studio owner. Never expose a solo
  // owner's existing private area just because only one colleague has been added.
  const multi = people.length > 0 || profiles.length > 1;
  return { multi, identities, profiles, singleProfileId: !multi && profiles.length === 1 ? (profiles[0] as any).id : undefined };
}
export async function privatePasswordRequiredBeforeTeam(userId: number) {
  await privateIdentities(userId);
  const unprotected = await db.execute(sql`SELECT id FROM private_appointment_profiles
    WHERE user_id=${userId} AND password_hash IS NULL LIMIT 1`);
  return unprotected.length > 0;
}
export async function createPrivateAccess(req: Request, profile: PrivateProfile) {
  const token = randomBytes(32).toString('hex');
  await db.execute(sql`DELETE FROM private_appointment_access WHERE expires_at < now()`);
  await db.execute(sql`INSERT INTO private_appointment_access(token_hash,profile_id,user_id,session_hash,expires_at)
    VALUES (${privateHash(token)},${profile.id},${profile.user_id},${privateHash(req.sessionID)},now()+interval '30 minutes')`);
  return token;
}
export async function getPrivateProfile(req: Request): Promise<PrivateProfile> {
  const userId = privateUser(req);
  const token = req.get('X-Private-Access');
  if (token) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new PrivateError(403, 'Area personale bloccata.');
    const rows = await db.execute(sql`SELECT p.* FROM private_appointment_profiles p
      JOIN private_appointment_access a ON a.profile_id=p.id
      WHERE p.user_id=${userId} AND a.user_id=${userId} AND a.token_hash=${privateHash(token)}
      AND a.session_hash=${privateHash(req.sessionID)} AND a.expires_at > now()`);
    if (rows.length) return rows[0] as unknown as PrivateProfile;
    throw new PrivateError(403, 'Sblocca nuovamente l’area personale.');
  }
  const { singleProfileId } = await privateIdentities(userId);
  if (!singleProfileId) throw new PrivateError(403, 'Sblocca l’area personale con la tua password.');
  const rows = await db.execute(sql`SELECT * FROM private_appointment_profiles WHERE id=${singleProfileId} AND user_id=${userId}`);
  return rows[0] as unknown as PrivateProfile;
}
export async function getPrivateCalendarIds(): Promise<Set<string>> {
  const rows = await db.execute(sql`SELECT calendar_id FROM private_google_calendars`);
  return new Set(rows.map((r: any) => r.calendar_id));
}