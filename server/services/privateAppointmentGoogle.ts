import { google, calendar_v3 } from 'googleapis';
import { sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { addDays, format, parseISO } from 'date-fns';
import { db } from '../db';
import { EncryptionService } from './encryption';
import { privateGoogleBody, type PrivateEvent } from '../../shared/privateAppointments';
import { PrivateError, privateHash, type PrivateProfile } from './privateAppointmentAccess';
import type { Request, Response } from 'express';

export function encryptPrivateToken(tokens: unknown): string {
  const encrypted = EncryptionService.encrypt(JSON.stringify(tokens));
  if (!EncryptionService.isEncrypted(encrypted)) throw new Error('Private token encryption failed');
  return encrypted;
}
function oauthClient(redirectUri?: string) {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
}
export async function privateGoogleClient(profile: PrivateProfile) {
  if (!profile.google_token) throw new PrivateError(409, 'Collega il tuo account Google personale.');
  const auth = oauthClient();
  auth.setCredentials(JSON.parse(EncryptionService.decryptToken(profile.google_token)));
  // Refreshes must never overwrite the studio account credentials.
  auth.on('tokens', tokens => {
    const merged = { ...auth.credentials, ...tokens };
    void db.execute(sql`UPDATE private_appointment_profiles SET google_token=${encryptPrivateToken(merged)}
      WHERE id=${profile.id} AND user_id=${profile.user_id} AND google_token=${profile.google_token}`).catch(() => {});
  });
  return google.calendar({ version: 'v3', auth });
}
export async function startPrivateGoogleOAuth(profile: PrivateProfile, redirectUri: string) {
  const state = `private-${randomBytes(32).toString('hex')}`;
  await db.execute(sql`DELETE FROM private_appointment_oauth WHERE expires_at < now()`);
  await db.execute(sql`INSERT INTO private_appointment_oauth(state_hash,profile_id,redirect_uri,expires_at)
    VALUES (${privateHash(state)},${profile.id},${redirectUri},now()+interval '10 minutes')`);
  return oauthClient(redirectUri).generateAuthUrl({
    access_type: 'offline', prompt: 'consent select_account',
    scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/userinfo.email'], state,
  });
}
/** Durable one-use callback: no assumption of a shared cookie between PWA and system browser. */
export async function completePrivateGoogleOAuth(req: Request, res: Response) {
  res.set('Cache-Control', 'no-store');
  const state = req.query.state;
  if (typeof state !== 'string' || !/^private-[a-f0-9]{64}$/.test(state)) return res.status(400).send('Autorizzazione non valida.');
  const claimed = await db.execute(sql`UPDATE private_appointment_oauth SET claimed=true
    WHERE state_hash=${privateHash(state)} AND claimed=false AND expires_at>now()
    RETURNING profile_id,redirect_uri`);
  const transaction = claimed[0] as any;
  if (!transaction) return res.status(400).send('Autorizzazione scaduta o già utilizzata.');
  const returnUrl = new URL('/calendar', transaction.redirect_uri);
  if (req.query.error || typeof req.query.code !== 'string') {
    returnUrl.searchParams.set('personalGoogle', 'cancelled');
    return res.redirect(returnUrl.href);
  }
  try {
    const auth = oauthClient(transaction.redirect_uri);
    const { tokens } = await auth.getToken(req.query.code);
    if (!tokens.refresh_token) throw new Error('Offline authorization missing');
    auth.setCredentials(tokens);
    const info = await google.oauth2({ version: 'v2', auth }).userinfo.get();
    // Relinking never sends copies belonging to the old account to the new one.
    await db.transaction(async tx => {
      const previous = await tx.execute(sql`SELECT google_email FROM private_appointment_profiles WHERE id=${transaction.profile_id} FOR UPDATE`);
      if (previous.length && previous[0].google_email && previous[0].google_email !== info.data.email) {
        throw new PrivateError(409, 'Continua con lo stesso account Google personale per non scollegare le copie già esistenti.');
      }
      if (!info.data.email) throw new Error('Missing Google identity');
      await tx.execute(sql`UPDATE private_appointment_profiles SET google_token=${encryptPrivateToken(tokens)},
        google_email=${info.data.email || null}, google_link_disabled=false WHERE id=${transaction.profile_id}`);
    });
    returnUrl.searchParams.set('personalGoogle', 'connected');
  } catch {
    returnUrl.searchParams.set('personalGoogle', 'error');
  }
  return res.redirect(returnUrl.href);
}
export async function ownedPrivateCalendars(calendar: calendar_v3.Calendar) {
  const items: calendar_v3.Schema$CalendarListEntry[] = [];
  let pageToken: string | undefined;
  do {
    const response = await calendar.calendarList.list({ pageToken });
    items.push(...(response.data.items || []));
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);
  const owned = items.filter(cal => cal.id && cal.accessRole === 'owner' && !cal.primary);
  const privateCalendars: { id: string; summary: string }[] = [];
  for (const cal of owned) {
    const acl = await calendar.acl.list({ calendarId: cal.id! });
    // A private calendar must not be shared with colleagues, domains or the public.
    if (!acl.data.nextPageToken && (acl.data.items || []).every(rule => rule.role === 'owner' || rule.role === 'none')) {
      privateCalendars.push({ id: cal.id!, summary: cal.summary || cal.id! });
    }
  }
  return privateCalendars;
}
export async function reservePrivateCalendar(profile: PrivateProfile, calendarId: string) {
  const calendar = await privateGoogleClient(profile);
  const available = await ownedPrivateCalendars(calendar);
  if (!available.some(c => c.id === calendarId)) throw new PrivateError(400, 'Scegli un calendario privato, separato e non condiviso.');
  await db.transaction(async tx => {
    // No work calendars may become private, nor may two people select one private calendar.
    const work = await tx.execute(sql`SELECT id FROM users WHERE google_calendar_id=${calendarId} LIMIT 1`);
    const previouslyImported = await tx.execute(sql`SELECT id FROM google_calendar_events WHERE calendar_id=${calendarId} LIMIT 1`);
    if (work.length || previouslyImported.length) throw new PrivateError(409, 'Questo calendario è già usato dal gestionale condiviso. Crea un calendario privato separato.');
    await tx.execute(sql`INSERT INTO private_google_calendars(calendar_id,profile_id) VALUES (${calendarId},${profile.id}) ON CONFLICT DO NOTHING`);
    const reservation = await tx.execute(sql`SELECT profile_id FROM private_google_calendars WHERE calendar_id=${calendarId}`);
    if (reservation[0]?.profile_id !== profile.id) throw new PrivateError(409, 'Calendario già assegnato a un’altra area personale.');
    const existing = await tx.execute(sql`SELECT google_calendar_id FROM private_appointment_profiles WHERE id=${profile.id} FOR UPDATE`);
    if (existing[0]?.google_calendar_id && existing[0].google_calendar_id !== calendarId) {
      const copies = await tx.execute(sql`SELECT id FROM private_appointments WHERE profile_id=${profile.id} AND (google_event_id IS NOT NULL OR sync_pending=true) LIMIT 1`);
      if (copies.length) throw new PrivateError(409, 'Ci sono copie nel calendario precedente. Mantieni quel calendario per evitare copie non aggiornate.');
      const personalCopies = await tx.execute(sql`SELECT appointment_id FROM personal_google_outbox WHERE profile_id=${profile.id} AND (google_event_id IS NOT NULL OR sync_pending=true) LIMIT 1`);
      if (personalCopies.length) throw new PrivateError(409, 'Mantieni il calendario personale precedente: ci sono copie da aggiornare.');
    }
    await tx.execute(sql`UPDATE private_appointment_profiles SET google_calendar_id=${calendarId} WHERE id=${profile.id} AND user_id=${profile.user_id}`);
  });
}
export async function privateTimezone(profile: PrivateProfile): Promise<string> {
  const rows = await db.execute(sql`SELECT timezone_settings FROM user_settings WHERE user_id=${profile.user_id} LIMIT 1`);
  const zone = String(rows[0]?.timezone_settings || 'Europe/Rome');
  try { new Intl.DateTimeFormat('it', { timeZone: zone }).format(); return zone; } catch { return 'Europe/Rome'; }
}
export function googleToPrivateEvent(event: calendar_v3.Schema$Event, zone: string) {
  const parts = (value: string) => {
    const date = new Date(value);
    const fields = new Intl.DateTimeFormat('sv-SE', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(date).split(' ');
    return { date: fields[0], time: fields[1] };
  };
  const allDay = !!event.start?.date;
  const start = allDay ? { date: event.start!.date!, time: '00:00' } : parts(event.start!.dateTime!);
  const end = allDay ? { date: format(addDays(parseISO(event.end?.date || start.date), -1), 'yyyy-MM-dd'), time: '00:00' } : parts(event.end!.dateTime!);
  return {
    id: event.id!, googleEventId: event.id!, title: event.summary || 'Impegno Google',
    startDate: start.date, endDate: end.date, startTime: start.time, endTime: end.time, allDay,
    description: event.description || '', location: event.location || '',
    recurrence: 'none', reminderMinutes: event.reminders?.overrides?.[0]?.minutes ?? null,
    source: 'google', recurrenceInstance: !!event.recurringEventId,
  };
}
export async function listPrivateGoogleEvents(profile: PrivateProfile, start: string, end: string) {
  if (!profile.google_token || !profile.google_calendar_id) return [];
  const calendar = await privateGoogleClient(profile);
  const timezone = await privateTimezone(profile);
  const ownCopies = await db.execute(sql`SELECT google_event_id FROM private_appointments WHERE profile_id=${profile.id} AND google_event_id IS NOT NULL`);
  const ids = new Set(ownCopies.map((r: any) => r.google_event_id));
  const events: any[] = [];
  let pageToken: string | undefined;
  do {
    const response = await calendar.events.list({
      calendarId: profile.google_calendar_id, singleEvents: true, maxResults: 2500,
      timeMin: `${start}T00:00:00+14:00`,
      timeMax: `${format(addDays(parseISO(end), 2), 'yyyy-MM-dd')}T00:00:00-14:00`,
      pageToken, timeZone: timezone,
    });
    for (const event of response.data.items || []) {
      if (event.status === 'cancelled' || !event.start || !event.end || ids.has(event.id!) || ids.has(event.recurringEventId!)) continue;
      const item = googleToPrivateEvent(event, timezone);
      if (item.startDate <= end && item.endDate >= start) events.push(item);
    }
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);
  return events;
}
/** Durable outbox, idempotent event IDs and per-profile lock prevent duplicate exports. */
export async function syncPrivateGoogle(profile: PrivateProfile) {
  if (!profile.google_token || !profile.google_calendar_id) return { connected: false, pending: 0 };
  const calendar = await privateGoogleClient(profile);
  const zone = await privateTimezone(profile);
  const pending = await db.execute(sql`SELECT id FROM private_appointments WHERE profile_id=${profile.id} AND sync_pending=true ORDER BY id`);
  for (const candidate of pending as any[]) {
    // Persist the destination before any remote write, including a lost ACK.
    await db.execute(sql`UPDATE private_appointments SET google_calendar_id=${profile.google_calendar_id}
      WHERE id=${candidate.id} AND profile_id=${profile.id} AND google_calendar_id IS NULL`);
    await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(705192, ${profile.id}::integer)`);
      const rows = await tx.execute(sql`SELECT * FROM private_appointments WHERE id=${candidate.id}
        AND profile_id=${profile.id} AND sync_pending=true FOR UPDATE`);
      if (!rows.length) return;
      const row = rows[0] as any;
      const calendarId = row.google_calendar_id || profile.google_calendar_id!;
      // Google supports a deterministic base32hex event id. Never insert twice after a crash.
      const eventId = row.google_event_id || `private${privateHash(`${profile.user_id}:${profile.id}:${row.id}`).slice(0, 48)}`;
      if (row.deleted) {
        try { await calendar.events.delete({ calendarId, eventId }); }
        catch (error: any) { if (![404, 410].includes(error.code || error.response?.status)) throw error; }
        await tx.execute(sql`DELETE FROM private_appointments WHERE id=${row.id} AND profile_id=${profile.id}`);
      } else {
        const body = privateGoogleBody(row.data as PrivateEvent, zone);
        if (row.google_event_id) {
          try { await calendar.events.update({ calendarId, eventId, requestBody: body }); }
          catch (error: any) {
            if (![404, 410].includes(error.code || error.response?.status)) throw error;
            await calendar.events.insert({ calendarId, requestBody: { ...body, id: eventId } });
          }
        } else {
          try { await calendar.events.insert({ calendarId, requestBody: { ...body, id: eventId } }); }
          catch (error: any) {
            if ((error.code || error.response?.status) !== 409) throw error;
            await calendar.events.update({ calendarId, eventId, requestBody: body });
          }
        }
        await tx.execute(sql`UPDATE private_appointments SET google_event_id=${eventId},google_calendar_id=${calendarId},
          sync_pending=false WHERE id=${row.id} AND profile_id=${profile.id}`);
      }
    });
  }
  return { connected: true, pending: 0 };
}