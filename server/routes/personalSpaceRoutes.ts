import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import {
  PrivateError, privateUser, privateIdentities, getPrivateProfile, createPrivateAccess,
  hashPrivatePassword, verifyPrivatePassword, privateHash, type PrivateProfile,
} from '../services/privateAppointmentAccess';
import { getRedirectUri } from './googleAuthRoutes';
import { startPrivateGoogleOAuth, privateGoogleClient, ownedPrivateCalendars, reservePrivateCalendar } from '../services/privateAppointmentGoogle';
import { preparePersonalGoogle, tryPersonalGoogleSync } from '../services/personalAppointmentGoogle';

export const personalRoute = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try { await fn(req, res); }
    catch (error: any) {
      if (error instanceof PrivateError) return res.status(error.status).json({ message: error.message, code: error.code });
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.issues[0]?.message || 'Dati non validi.' });
      if (error?.code === '23505') return res.status(409).json({ message: 'Profilo personale già configurato. Usa la tua password.' });
      res.status(503).json({ message: 'Operazione non disponibile. Gli impegni già salvati sono conservati.' });
    }
  };
const router = Router();
const limited = rateLimit({ windowMs: 15 * 60_000, limit: 12, keyGenerator: req => String((req.user as any)?.id),
  message: { message: 'Troppi tentativi. Riprova tra 15 minuti.' } });
const safe = (p: PrivateProfile) => ({ id: p.id, name: p.name, identityId: p.identity_id });
router.get('/profiles', personalRoute(async (req, res) => {
  res.json(await privateIdentities(privateUser(req)));
}));
router.post('/profiles', limited, personalRoute(async (req, res) => {
  const userId = privateUser(req);
  const body = z.object({ identityId: z.number().int().nonnegative(), name: z.string().trim().min(1).max(100),
    password: z.string().min(10).max(128) }).strict().parse(req.body);
  const choices = await privateIdentities(userId);
  if (!choices.multi) throw new PrivateError(409, 'Usi il gestionale da solo: non è necessaria una password personale.');
  if (!choices.identities.some(p => p.identityId === body.identityId)) throw new PrivateError(404, 'Professionista non trovato.');
  const hash = await hashPrivatePassword(body.password);
  const rows = await db.execute(sql`INSERT INTO private_appointment_profiles(user_id,identity_id,name,password_hash)
    VALUES (${userId},${body.identityId},${body.name},${hash})
    ON CONFLICT (user_id,identity_id) DO UPDATE SET password_hash=EXCLUDED.password_hash
    WHERE private_appointment_profiles.password_hash IS NULL RETURNING *`);
  if (!rows.length) throw new PrivateError(409, 'Profilo già protetto: usa la password esistente.');
  const profile = rows[0] as unknown as PrivateProfile;
  res.status(201).json({ profile: safe(profile), token: await createPrivateAccess(req, profile) });
}));
router.post('/prepare-team', limited, personalRoute(async (req, res) => {
  const userId = privateUser(req);
  const choices = await privateIdentities(userId);
  if (choices.multi || !choices.singleProfileId) throw new PrivateError(409, 'Usa lo sblocco personale del tuo profilo.');
  const body = z.object({ password: z.string().min(10).max(128) }).strict().parse(req.body);
  const hash = await hashPrivatePassword(body.password);
  const rows = await db.execute(sql`UPDATE private_appointment_profiles SET password_hash=${hash}
    WHERE id=${choices.singleProfileId} AND user_id=${userId} AND password_hash IS NULL RETURNING *`);
  if (!rows.length) throw new PrivateError(409, 'Password personale già impostata.');
  const profile = rows[0] as unknown as PrivateProfile;
  res.json({ profile: safe(profile), token: await createPrivateAccess(req, profile) });
}));
router.post('/unlock', limited, personalRoute(async (req, res) => {
  const body = z.object({ profileId: z.number().int().positive(), password: z.string().max(128) }).strict().parse(req.body);
  const rows = await db.execute(sql`SELECT * FROM private_appointment_profiles
    WHERE id=${body.profileId} AND user_id=${privateUser(req)}`);
  const profile = rows[0] as unknown as PrivateProfile;
  if (!profile?.password_hash || !await verifyPrivatePassword(body.password, profile.password_hash))
    throw new PrivateError(403, 'Password personale non valida.');
  // A removed colleague cannot reopen their archived profile through a stale token.
  const choices = await privateIdentities(profile.user_id);
  if (!choices.identities.some(i => i.identityId === profile.identity_id)) throw new PrivateError(403, 'Professionista non più presente nello studio.');
  res.json({ profile: safe(profile), token: await createPrivateAccess(req, profile) });
}));
router.post('/lock', personalRoute(async (req, res) => {
  const userId = privateUser(req), token = req.get('X-Private-Access');
  if (token) await db.execute(sql`DELETE FROM private_appointment_access
    WHERE token_hash=${privateHash(token)} AND user_id=${userId} AND session_hash=${privateHash(req.sessionID)}`);
  res.json({ locked: true });
}));
router.get('/access', personalRoute(async (req, res) => {
  let profile = await getPrivateProfile(req);
  const choices = await privateIdentities(profile.user_id);
  let sync: any;
  try {
    profile = await preparePersonalGoogle(profile, choices.multi);
    sync = await tryPersonalGoogleSync(profile, true);
  } catch {
    sync = { connected: !!profile.google_token, pending: true, message: 'Collegamento Google da verificare. I dati personali restano salvati.' };
  }
  res.json({ profile: safe(profile), multi: choices.multi, google: {
    connected: !!profile.google_token, calendarId: profile.google_calendar_id, email: profile.google_email,
  }, sync });
}));
router.post('/google/connect', personalRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  res.json({ url: await startPrivateGoogleOAuth(profile, getRedirectUri()) });
}));
router.get('/google/calendars', personalRoute(async (req, res) => {
  res.json(await ownedPrivateCalendars(await privateGoogleClient(await getPrivateProfile(req))));
}));
router.post('/google/calendars', personalRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const { summary } = z.object({ summary: z.string().trim().min(1).max(100) }).strict().parse(req.body);
  if (profile.google_calendar_id) {
    const pending = await db.execute(sql`SELECT appointment_id FROM personal_google_outbox
      WHERE profile_id=${profile.id} AND (google_event_id IS NOT NULL OR sync_pending=true) LIMIT 1`);
    if (pending.length) throw new PrivateError(409, 'Mantieni il calendario personale già collegato.');
  }
  const calendar = await privateGoogleClient(profile);
  const created = await calendar.calendars.insert({ requestBody: { summary } });
  if (!created.data.id) throw new Error('Missing calendar');
  await reservePrivateCalendar(profile, created.data.id);
  res.status(201).json({ id: created.data.id, summary, sync: await tryPersonalGoogleSync({ ...profile, google_calendar_id: created.data.id }, true) });
}));
router.post('/google/calendar', personalRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const { calendarId } = z.object({ calendarId: z.string().min(1).max(500) }).strict().parse(req.body);
  await reservePrivateCalendar(profile, calendarId);
  res.json({ calendarId, sync: await tryPersonalGoogleSync({ ...profile, google_calendar_id: calendarId }, true) });
}));
router.post('/google/sync', personalRoute(async (req, res) => {
  let profile = await getPrivateProfile(req);
  profile = await preparePersonalGoogle(profile, (await privateIdentities(profile.user_id)).multi);
  res.json(await tryPersonalGoogleSync(profile, true));
}));
router.delete('/google', personalRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  await db.execute(sql`UPDATE private_appointment_profiles SET google_token=null,google_link_disabled=true
    WHERE id=${profile.id} AND user_id=${profile.user_id}`);
  res.json({ disconnected: true, message: 'Account scollegato. Le copie su Google non sono state eliminate.' });
}));
export default router;