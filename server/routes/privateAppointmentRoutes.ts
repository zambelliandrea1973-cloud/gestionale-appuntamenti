import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { addDays, format, parseISO } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { db } from '../db';
import {
  PrivateError, privateUser, privateIdentities, getPrivateProfile, createPrivateAccess,
  hashPrivatePassword, verifyPrivatePassword, privateHash, type PrivateProfile,
} from '../services/privateAppointmentAccess';
import {
  startPrivateGoogleOAuth, privateGoogleClient, ownedPrivateCalendars,
  reservePrivateCalendar, syncPrivateGoogle, listPrivateGoogleEvents,
  privateTimezone, googleToPrivateEvent,
} from '../services/privateAppointmentGoogle';
import { getRedirectUri } from './googleAuthRoutes';
import { privateEventFields, privateEventInput, privateDate, expandPrivateEvent, privateGoogleBody, type PrivateEvent } from '../../shared/privateAppointments';
import { interpretPrivateAppointmentRequest } from '../ai-chat';
import { authorizeAppointmentAI } from '../services/aiTrialUsageService';
import { sendAITrialError } from './aiTrialRoutes';

const router = Router();
const base = '/api/private-appointments';
const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try { await fn(req, res); }
    catch (error: any) {
      if (sendAITrialError(error, res)) return;
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.issues[0]?.message || 'Dati non validi.' });
      if (error instanceof PrivateError) return res.status(error.status).json({ message: error.message, code: error.code });
      if (error?.code === '23505') return res.status(409).json({ message: 'Area personale già configurata. Usa la tua password.' });
      // Provider errors can contain private URLs/tokens. Do not log raw exceptions.
      res.status(503).json({ message: 'Operazione non disponibile. I dati locali già salvati sono conservati.' });
    }
  };
router.use(base, (req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  res.set('Vary', 'Cookie, X-Private-Access');
  try { privateUser(req); next(); }
  catch (error) { const e = error as PrivateError; res.status(e.status).json({ message: e.message }); }
});
const passwordLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 12,
  keyGenerator: req => String((req.user as any)?.id),
  message: { message: 'Troppi tentativi. Riprova tra 15 minuti.' },
});
const safeProfile = (p: PrivateProfile) => ({ id: p.id, name: p.name, identityId: p.identity_id });
const id = (value: unknown) => z.coerce.number().int().positive().parse(value);
const range = (req: Request) => {
  const start = privateDate.parse(req.query.start);
  const end = privateDate.parse(req.query.end);
  if (end < start || parseISO(end).getTime() - parseISO(start).getTime() > 366 * 86400000) {
    throw new PrivateError(400, 'Scegli un intervallo di massimo 366 giorni.');
  }
  return { start, end };
};
async function localRows(profileId: number) {
  return db.execute(sql`SELECT * FROM private_appointments WHERE profile_id=${profileId} AND deleted=false ORDER BY id`);
}
const localEvent = (row: any) => ({
  ...row.data, id: row.id, source: 'local', googleEventId: row.google_event_id, syncPending: row.sync_pending,
});
async function workConflicts(profile: PrivateProfile, event: PrivateEvent) {
  const works = await db.execute(sql`SELECT id,date,start_time,end_time FROM appointments
    WHERE user_id=${profile.user_id} AND date>=${event.startDate}
    AND COALESCE(status,'scheduled') NOT IN ('cancelled','canceled')
    AND COALESCE(imported_from_google,false)=false`);
  return works.filter((work: any) => expandPrivateEvent(event, work.date, work.date).some(occurrence => {
    const start = `${occurrence.startDate}T${occurrence.allDay ? '00:00:00' : occurrence.startTime + ':00'}`;
    const end = `${occurrence.endDate}T${occurrence.allDay ? '23:59:59' : occurrence.endTime + ':00'}`;
    return start < `${work.date}T${work.end_time}` && end > `${work.date}T${work.start_time}`;
  })).map((work: any) => ({ id: work.id, date: work.date, startTime: work.start_time, endTime: work.end_time }));
}
async function warnConflict(profile: PrivateProfile, event: PrivateEvent & { allowConflict?: boolean }, res: Response) {
  if (!event.allowConflict) {
    const conflicts = await workConflicts(profile, event);
    if (conflicts.length) {
      res.status(409).json({ code: 'WORK_CONFLICT', message: 'L’orario si sovrappone a un impegno di lavoro.', conflicts });
      return true;
    }
  }
  return false;
}
async function trySync(profile: PrivateProfile) {
  try { return await syncPrivateGoogle(profile); }
  catch { return { connected: !!profile.google_token, pending: true, message: 'Salvato nel gestionale. Copia Google in attesa: riprova la sincronizzazione privata.' }; }
}

router.get(`${base}/profiles`, asyncRoute(async (req, res) => {
  res.json(await privateIdentities(privateUser(req)));
}));
router.post(`${base}/profiles`, passwordLimit, asyncRoute(async (req, res) => {
  const userId = privateUser(req);
  const body = z.object({
    identityId: z.number().int().nonnegative(), name: z.string().trim().min(1).max(100),
    password: z.string().min(10).max(128),
  }).strict().parse(req.body);
  const choices = await privateIdentities(userId);
  if (!choices.identities.some(p => p.identityId === body.identityId)) throw new PrivateError(404, 'Professionista non trovato.');
  const hash = await hashPrivatePassword(body.password);
  const rows = await db.execute(sql`INSERT INTO private_appointment_profiles(user_id,identity_id,name,password_hash)
    VALUES (${userId},${body.identityId},${body.name},${hash}) RETURNING *`);
  const profile = rows[0] as unknown as PrivateProfile;
  res.status(201).json({ profile: safeProfile(profile), token: await createPrivateAccess(req, profile) });
}));
router.post(`${base}/prepare-team`, passwordLimit, asyncRoute(async (req, res) => {
  const userId = privateUser(req);
  const { singleProfileId, multi } = await privateIdentities(userId);
  if (multi || !singleProfileId) throw new PrivateError(409, 'Lo studio ha già più professionisti. Usa lo sblocco personale.');
  const { password } = z.object({ password: z.string().min(10).max(128) }).strict().parse(req.body);
  const hash = await hashPrivatePassword(password);
  const updated = await db.execute(sql`UPDATE private_appointment_profiles SET password_hash=${hash}
    WHERE id=${singleProfileId} AND user_id=${userId} AND password_hash IS NULL RETURNING *`);
  if (!updated.length) throw new PrivateError(409, 'Password personale già impostata. Non può essere sostituita senza verifica.');
  const profile = updated[0] as unknown as PrivateProfile;
  res.json({ profile: safeProfile(profile), token: await createPrivateAccess(req, profile) });
}));
router.post(`${base}/unlock`, passwordLimit, asyncRoute(async (req, res) => {
  const body = z.object({ profileId: z.number().int().positive(), password: z.string().max(128) }).strict().parse(req.body);
  const rows = await db.execute(sql`SELECT * FROM private_appointment_profiles WHERE id=${body.profileId} AND user_id=${privateUser(req)}`);
  const profile = rows[0] as unknown as PrivateProfile | undefined;
  if (!profile?.password_hash || !await verifyPrivatePassword(body.password, profile.password_hash)) {
    throw new PrivateError(403, 'Password personale non valida.');
  }
  res.json({ profile: safeProfile(profile), token: await createPrivateAccess(req, profile) });
}));
router.post(`${base}/lock`, asyncRoute(async (req, res) => {
  const token = req.get('X-Private-Access');
  if (token) await db.execute(sql`DELETE FROM private_appointment_access WHERE token_hash=${privateHash(token)} AND user_id=${privateUser(req)}`);
  res.json({ locked: true });
}));
router.get(`${base}/access`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const choices = await privateIdentities(profile.user_id);
  res.json({ profile: safeProfile(profile), multi: choices.multi, google: {
    connected: !!profile.google_token, calendarId: profile.google_calendar_id, email: profile.google_email,
  } });
}));
router.get(`${base}/events`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const { start, end } = range(req);
  const rows = await localRows(profile.id);
  const events = rows.flatMap((row: any) => expandPrivateEvent(row.data, start, end).map(occurrence => ({
    ...localEvent(row), ...occurrence, seriesStartDate: row.data.startDate, seriesEndDate: row.data.endDate,
  })));
  try { events.push(...await listPrivateGoogleEvents(profile, start, end)); }
  catch { res.set('X-Private-Google-Status', 'unavailable'); }
  res.json(events);
}));
router.get(`${base}/events/:id`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const rows = await db.execute(sql`SELECT * FROM private_appointments WHERE id=${id(req.params.id)} AND profile_id=${profile.id} AND deleted=false`);
  if (!rows.length) throw new PrivateError(404, 'Impegno non trovato.');
  res.json(localEvent(rows[0]));
}));
router.post(`${base}/events`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const body = privateEventInput.parse(req.body);
  if (await warnConflict(profile, body, res)) return;
  const { allowConflict: _, ...data } = body;
  const rows = await db.execute(sql`INSERT INTO private_appointments(profile_id,data) VALUES (${profile.id},${JSON.stringify(data)}::jsonb) RETURNING id`);
  const sync = await trySync(profile);
  const updated = await db.execute(sql`SELECT * FROM private_appointments WHERE id=${rows[0].id} AND profile_id=${profile.id}`);
  res.status(201).json({ ...localEvent(updated[0]), sync });
}));
router.put(`${base}/events/:id`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const eventId = id(req.params.id);
  const exists = await db.execute(sql`SELECT id FROM private_appointments WHERE id=${eventId} AND profile_id=${profile.id} AND deleted=false`);
  if (!exists.length) throw new PrivateError(404, 'Impegno non trovato.');
  const body = privateEventInput.parse(req.body);
  if (await warnConflict(profile, body, res)) return;
  const { allowConflict: _, ...data } = body;
  await db.execute(sql`UPDATE private_appointments SET data=${JSON.stringify(data)}::jsonb,sync_pending=true,updated_at=now()
    WHERE id=${eventId} AND profile_id=${profile.id} AND deleted=false`);
  const sync = await trySync(profile);
  const updated = await db.execute(sql`SELECT * FROM private_appointments WHERE id=${eventId} AND profile_id=${profile.id}`);
  res.json({ ...localEvent(updated[0]), sync });
}));
router.delete(`${base}/events/:id`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const eventId = id(req.params.id);
  const rows = await db.execute(sql`UPDATE private_appointments SET deleted=true,data='{}'::jsonb,sync_pending=true,updated_at=now()
    WHERE id=${eventId} AND profile_id=${profile.id} AND deleted=false RETURNING google_event_id`);
  if (!rows.length) throw new PrivateError(404, 'Impegno non trovato.');
  // Keep the tombstone even without an acknowledged provider ID: an insert
  // may have succeeded remotely before its acknowledgment/database commit.
  res.json({ deleted: true, sync: await trySync(profile) });
}));
router.get(`${base}/google/calendars`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const items = await ownedPrivateCalendars(await privateGoogleClient(profile));
  const reservations = await db.execute(sql`SELECT calendar_id,profile_id FROM private_google_calendars`);
  res.json(items.filter(item => !reservations.some((r: any) => r.calendar_id === item.id && r.profile_id !== profile.id)));
}));
router.post(`${base}/google/calendars`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const body = z.object({ summary: z.string().trim().min(1).max(150).optional() }).strict().parse(req.body);
  const calendar = await privateGoogleClient(profile);
  const created = await calendar.calendars.insert({ requestBody: {
    summary: body.summary || `Personale · ${profile.name}`, timeZone: await privateTimezone(profile),
  } });
  if (!created.data.id) throw new PrivateError(503, 'Calendario Google non creato.');
  await reservePrivateCalendar(profile, created.data.id);
  res.status(201).json({ id: created.data.id, summary: created.data.summary,
    sync: await trySync({ ...profile, google_calendar_id: created.data.id }) });
}));
router.post(`${base}/google/calendar`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const body = z.object({ calendarId: z.string().min(1).max(500) }).strict().parse(req.body);
  await reservePrivateCalendar(profile, body.calendarId);
  const fresh = { ...profile, google_calendar_id: body.calendarId };
  res.json({ calendarId: body.calendarId, sync: await trySync(fresh) });
}));
router.post(`${base}/google/connect`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  res.json({ url: await startPrivateGoogleOAuth(profile, getRedirectUri()) });
}));
router.delete(`${base}/google`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  // Retain the selected calendar and outbox references. Copies stay on Google;
  // reconnecting the same account continues updates without duplicates.
  await db.execute(sql`UPDATE private_appointment_profiles SET google_token=null WHERE id=${profile.id} AND user_id=${profile.user_id}`);
  res.json({ disconnected: true, message: 'Account scollegato. Nessun evento eliminato da Google.' });
}));
router.post(`${base}/google/sync`, asyncRoute(async (req, res) => {
  res.json(await trySync(await getPrivateProfile(req)));
}));
router.put(`${base}/google/events/:id`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  if (!profile.google_calendar_id) throw new PrivateError(409, 'Seleziona il calendario privato.');
  const eventId = z.string().min(1).max(1024).parse(req.params.id);
  const body = privateEventInput.parse(req.body);
  if (await warnConflict(profile, body, res)) return;
  const calendar = await privateGoogleClient(profile);
  // Endpoint can mutate only IDs found in the authenticated private calendar.
  const existing = await calendar.events.get({ calendarId: profile.google_calendar_id, eventId });
  if (existing.data.status === 'cancelled') throw new PrivateError(404, 'Impegno non trovato.');
  const zone = await privateTimezone(profile);
  const providerBody = privateGoogleBody(body, zone);
  // An imported recurring occurrence changes that occurrence only, not its series.
  const { recurrence: _, ...singleBody } = providerBody;
  const updated = await calendar.events.patch({ calendarId: profile.google_calendar_id, eventId,
    requestBody: existing.data.recurringEventId ? singleBody : providerBody });
  res.json(googleToPrivateEvent(updated.data, zone));
}));
router.delete(`${base}/google/events/:id`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  if (!profile.google_calendar_id) throw new PrivateError(409, 'Seleziona il calendario privato.');
  const eventId = z.string().min(1).max(1024).parse(req.params.id);
  await (await privateGoogleClient(profile)).events.delete({ calendarId: profile.google_calendar_id, eventId });
  res.json({ deleted: true });
}));
router.get(`${base}/reminders`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const zone = await privateTimezone(profile);
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: zone }).format(new Date());
  const yesterday = format(addDays(parseISO(today), -1), 'yyyy-MM-dd');
  const tomorrow = format(addDays(parseISO(today), 1), 'yyyy-MM-dd');
  const rows = await localRows(profile.id);
  const reminders = rows.flatMap((row: any) => expandPrivateEvent(row.data, yesterday, tomorrow).filter(event => {
    if (event.reminderMinutes === null) return false;
    const due = fromZonedTime(`${event.startDate}T${event.allDay ? '09:00' : event.startTime}:00`, zone).getTime()
      - event.reminderMinutes * 60000;
    return due <= Date.now() && due > Date.now() - 90000;
  }).map(event => ({ ...event, id: row.id })));
  res.json(reminders);
}));
router.post(`${base}/interpret`, asyncRoute(async (req, res) => {
  const profile = await getPrivateProfile(req);
  const body = z.object({
    message: z.string().trim().min(1).max(1500),
    draft: privateEventFields.partial().optional(),
    language: z.string().max(20).optional(),
    conversationId: z.string().nullable().optional(),
  }).strict().parse(req.body);
  await authorizeAppointmentAI(profile.user_id, body.conversationId, 'interpretation');
  res.json(await interpretPrivateAppointmentRequest(body.message, body.draft || {}, body.language || 'it'));
}));
export default router;