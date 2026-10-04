import { sql } from 'drizzle-orm';
import { db } from '../db';
import { privateGoogleBody } from '../../shared/privateAppointments';
import type { PersonalAppointmentInput } from '../../shared/personalAppointments';
import { privateHash, type PrivateProfile } from './privateAppointmentAccess';
import { privateGoogleClient, privateTimezone, ownedPrivateCalendars } from './privateAppointmentGoogle';

export function personalGoogleBody(event: PersonalAppointmentInput, zone: string) {
  return { ...privateGoogleBody({
    title: event.title, startDate: event.date, endDate: event.date,
    startTime: event.startTime.slice(0, 5), endTime: event.endTime.slice(0, 5),
    allDay: false, location: event.location, description: event.notes,
    recurrence: 'none', reminderMinutes: null,
  }, zone), visibility: 'private', transparency: 'opaque' };
}
export const personalGoogleEventId = (userId: number, profileId: number, id: number) =>
  `personal${privateHash(`${userId}:${profileId}:${id}`).slice(0, 48)}`;
export const googleStatus = (error: any) => Number(error?.code || error?.response?.status || 0);

/** Only the studio owner may inherit the existing main Google connection,
 * after private unlock if the studio has collaborators.
 * Collaborators always authorize their own account. Archive contents are never read. */
export async function preparePersonalGoogle(profile: PrivateProfile, _multi: boolean): Promise<PrivateProfile> {
  if (profile.identity_id === 0 && !profile.google_token &&
      !profile.google_link_disabled && !profile.google_email) {
    const owner = await db.execute(sql`SELECT google_auth_token,google_calendar_email FROM users
      WHERE id=${profile.user_id} AND google_calendar_enabled=true AND google_needs_reauth=false`);
    if (owner[0]?.google_auth_token && owner[0]?.google_calendar_email) {
      // The existing credential is already encrypted. Never expose it to the client.
      const rows = await db.execute(sql`UPDATE private_appointment_profiles
        SET google_token=${owner[0].google_auth_token}, google_email=${owner[0].google_calendar_email}
        WHERE id=${profile.id} AND user_id=${profile.user_id} AND google_token IS NULL
        AND google_link_disabled=false AND google_email IS NULL RETURNING *`);
      if (rows.length) profile = rows[0] as unknown as PrivateProfile;
    }
  }
  if (!profile.google_token || profile.google_calendar_id) return profile;
  const calendar = await privateGoogleClient(profile);
  const zone = await privateTimezone(profile);
  // Serialize setup so two tabs cannot select two different destinations.
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(705194,${profile.id}::integer)`);
    const rows = await tx.execute(sql`SELECT * FROM private_appointment_profiles
      WHERE id=${profile.id} AND user_id=${profile.user_id} FOR UPDATE`);
    const current = rows[0] as unknown as PrivateProfile;
    if (!current?.google_token || current.google_calendar_id) return current;
    const created = await calendar.calendars.insert({
      requestBody: { summary: `Personale — ${profile.name}`, timeZone: zone },
    });
    if (!created.data.id) throw new Error('Personal calendar creation failed');
    await tx.execute(sql`INSERT INTO private_google_calendars(calendar_id,profile_id)
      VALUES (${created.data.id},${profile.id})`);
    await tx.execute(sql`UPDATE private_appointment_profiles SET google_calendar_id=${created.data.id}
      WHERE id=${profile.id} AND user_id=${profile.user_id}`);
    return { ...current, google_calendar_id: created.data.id };
  });
}

/** Queue inside the same transaction as local CRUD. Destination is retained on every update. */
export async function queuePersonalGoogle(tx: any, profile: PrivateProfile, id: number,
  data: PersonalAppointmentInput | null) {
  await tx.execute(sql`INSERT INTO personal_google_outbox(appointment_id,profile_id,event_data,deleted)
    VALUES (${id},${profile.id},${data ? JSON.stringify(data) : null}::jsonb,${data === null})
    ON CONFLICT (appointment_id) DO UPDATE SET event_data=EXCLUDED.event_data,
      deleted=EXCLUDED.deleted,sync_pending=true
    WHERE personal_google_outbox.profile_id=${profile.id}`);
}

export async function syncPersonalGoogle(profile: PrivateProfile, seedExisting = false) {
  if (seedExisting) {
    // Existing account-level Personal records belong to the owner, never to staff.
    await db.execute(sql`INSERT INTO personal_google_outbox(appointment_id,profile_id,event_data)
      SELECT p.id,${profile.id},jsonb_build_object('title',p.title,'date',p.date,
        'startTime',to_char(p.start_time,'HH24:MI'),'endTime',to_char(p.end_time,'HH24:MI'),
        'location',p.location,'notes',p.notes)
      FROM personal_appointments p WHERE p.user_id=${profile.user_id}
      AND (p.profile_id=${profile.id} OR (${profile.identity_id}=0 AND p.profile_id IS NULL))
      ON CONFLICT (appointment_id) DO NOTHING`);
  }
  const pending = await db.execute(sql`SELECT appointment_id FROM personal_google_outbox
    WHERE profile_id=${profile.id} AND sync_pending=true ORDER BY appointment_id`);
  if (!profile.google_token || !profile.google_calendar_id)
    return { connected: false, pending: pending.length };
  if (!pending.length) return { connected: true, pending: 0 };
  const calendar = await privateGoogleClient(profile);
  // A calendar may have been shared since it was selected. Never send fresh details to it.
  const available = await ownedPrivateCalendars(calendar);
  if (!available.some(c => c.id === profile.google_calendar_id)) {
    return { connected: true, pending: pending.length, message: 'Il calendario personale non è più privato. Ripristina la privacy su Google prima di sincronizzare.' };
  }
  const zone = await privateTimezone(profile);
  for (const candidate of pending as any[]) {
    // Persist destination BEFORE the remote write, including an unacknowledged success.
    await db.execute(sql`UPDATE personal_google_outbox SET google_calendar_id=${profile.google_calendar_id}
      WHERE appointment_id=${candidate.appointment_id} AND profile_id=${profile.id}
      AND google_calendar_id IS NULL`);
    await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(705193,${profile.id}::integer)`);
      const rows = await tx.execute(sql`SELECT * FROM personal_google_outbox
        WHERE appointment_id=${candidate.appointment_id} AND profile_id=${profile.id}
        AND sync_pending=true FOR UPDATE`);
      const row = rows[0] as any;
      if (!row) return;
      const calendarId = row.google_calendar_id;
      // Never redirect a bound pending write to a different calendar.
      if (calendarId !== profile.google_calendar_id) throw new Error('Personal calendar binding mismatch');
      const eventId = row.google_event_id || personalGoogleEventId(profile.user_id, profile.id, row.appointment_id);
      if (row.deleted) {
        try { await calendar.events.delete({ calendarId, eventId }); }
        catch (error) { if (![404, 410].includes(googleStatus(error))) throw error; }
        await tx.execute(sql`DELETE FROM personal_google_outbox
          WHERE appointment_id=${row.appointment_id} AND profile_id=${profile.id}`);
      } else {
        const body = personalGoogleBody(row.event_data, zone);
        if (row.google_event_id) {
          try { await calendar.events.update({ calendarId, eventId, requestBody: body }); }
          catch (error) {
            if (![404, 410].includes(googleStatus(error))) throw error;
            await calendar.events.insert({ calendarId, requestBody: { ...body, id: eventId } });
          }
        } else {
          try { await calendar.events.insert({ calendarId, requestBody: { ...body, id: eventId } }); }
          catch (error) {
            if (googleStatus(error) !== 409) throw error;
            await calendar.events.update({ calendarId, eventId, requestBody: body });
          }
        }
        await tx.execute(sql`UPDATE personal_google_outbox SET google_event_id=${eventId},sync_pending=false
          WHERE appointment_id=${row.appointment_id} AND profile_id=${profile.id}`);
      }
    });
  }
  return { connected: true, pending: 0 };
}
export async function tryPersonalGoogleSync(profile: PrivateProfile, seed = false) {
  try { return await syncPersonalGoogle(profile, seed); }
  catch {
    return { connected: !!profile.google_token, pending: true,
      message: 'Impegno conservato nel gestionale. Sincronizzazione Google in attesa: verrà riprovata.' };
  }
}
let syncTimer: ReturnType<typeof setInterval> | undefined;
export function startPersonalGoogleRetry() {
  if (syncTimer) return;
  let running = false;
  syncTimer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const profiles = await db.execute(sql`SELECT p.* FROM private_appointment_profiles p
        WHERE p.google_token IS NOT NULL AND p.google_calendar_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM personal_google_outbox o WHERE o.profile_id=p.id AND o.sync_pending=true)`);
      for (const profile of profiles) await tryPersonalGoogleSync(profile as unknown as PrivateProfile);
    } catch { /* No sensitive provider errors in logs. Retry next minute. */ }
    finally { running = false; }
  }, 60_000);
  syncTimer.unref();
}