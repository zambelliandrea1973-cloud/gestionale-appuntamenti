import { logger } from '../utils/logger';
/**
 * AUTO GOOGLE CALENDAR SYNC
 * Helper for automatically synchronizing appointments with Google Calendar
 * Performs operations asynchronously to avoid blocking API responses
 */

import { db } from '../db';
import { isDemoAppointment } from './demoAppointmentGuard';

type SyncAction = 'create' | 'update' | 'delete';

interface AppointmentData {
  id: number;
  userId: number;
  clientId?: number;
  serviceId?: number;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  status?: string;
  importedFromGoogle?: boolean;
}

/**
 * Check if the user has Google Calendar enabled and return the token
 */
async function getUserGoogleToken(userId: number): Promise<{ enabled: boolean; tokens?: any; calendarId?: string }> {
  try {
    const [user] = await db.select({
      googleAuthToken: users.googleAuthToken,
      googleCalendarEnabled: users.googleCalendarEnabled,
      googleCalendarId: users.googleCalendarId
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user || !user.googleCalendarEnabled || !user.googleAuthToken) {
      return { enabled: false };
    }

    const decryptedTokenStr = EncryptionService.decryptToken(user.googleAuthToken);
    const tokens = JSON.parse(decryptedTokenStr);
    return { 
      enabled: true, 
      tokens,
      calendarId: user.googleCalendarId || 'primary'
    };
  } catch (error) {
    console.error(`❌ [AUTO-SYNC] Error reading user token ${userId}:`, error);
    return { enabled: false };
  }
}

/**
 * Create an authenticated Google Calendar client with auto-save of refreshed tokens
 */
function createCalendarClient(tokens: any, userId?: number) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.PRODUCTION_DOMAIN 
      ? `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`
      : `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`
  );
  oauth2Client.setCredentials(tokens);
  
  if (userId) {
    oauth2Client.on('tokens', async (newTokens) => {
      // Only auto-save on production — prevent Replit dev from overwriting the shared DB
      if (!process.env.PRODUCTION_DOMAIN) {
        logger.debug(`🔄 [AUTO-SYNC] Token refreshed for user ${userId} (auto-save skipped on dev)`);
        return;
      }
      try {
        const merged = { ...tokens, ...newTokens };
        const encrypted = EncryptionService.encrypt(JSON.stringify(merged));
        await db.update(users).set({ googleAuthToken: encrypted }).where(eq(users.id, userId));
        logger.debug(`🔄 [AUTO-SYNC] Token refreshed and saved for user ${userId}`);
      } catch (err) {
        console.error(`❌ [AUTO-SYNC] Error saving refreshed token:`, err);
      }
    });
  }
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Synchronize an appointment with Google Calendar
 * Executed asynchronously (fire and forget)
 */
export function triggerGoogleSync(action: SyncAction, appointment: AppointmentData): void {
  // Execute asynchronously to not block the API response
  setImmediate(async () => {
    try {
      // IMPORTANT: Do not synchronize events IMPORTED from Google Calendar!
      // These events have an external origin and must not be modified by the scheduler
      const importedValue = appointment.importedFromGoogle as any;
      const isImported = importedValue === true || 
                        String(importedValue) === 't' || 
                        String(importedValue) === 'true' || 
                        String(importedValue) === '1' ||
                        Boolean(importedValue);
      
      if (isImported) {
        console.log(`⏭️ [AUTO-SYNC] Skip ${action} for appointment ${appointment.id} - imported from Google Calendar`);
        return;
      }

      if (action !== 'delete' && await isDemoAppointment(appointment.id, appointment.userId)) {
        console.log(`⏭️ [AUTO-SYNC] Skip ${action} for demo appointment ${appointment.id}`);
        return;
      }
      
      // ADDITIONAL PROTECTION: Do not delete events where we are not the organizer
      if (action === 'delete') {
        const apptData = appointment as any;
        if (apptData.googleOrganizerSelf === false) {
          console.log(`⏭️ [AUTO-SYNC] Skip delete for appointment ${appointment.id} - we are not the organizer`);
          return;
        }
      }
      
      logger.debug(`🔄 [AUTO-SYNC] ${action.toUpperCase()} appointment ${appointment.id} for user ${appointment.userId}`);
      
      // Check if the user has Google Calendar enabled
      const { enabled, tokens, calendarId } = await getUserGoogleToken(appointment.userId);
      
      if (!enabled) {
        console.log(`⏭️ [AUTO-SYNC] Google Calendar not enabled for user ${appointment.userId}, skip`);
        return;
      }

      const calendar = createCalendarClient(tokens, appointment.userId);

      switch (action) {
        case 'create':
          await createGoogleEvent(calendar, calendarId!, appointment);
          break;
        case 'update':
          await updateGoogleEvent(calendar, calendarId!, appointment);
          break;
        case 'delete':
          await deleteGoogleEvent(calendar, calendarId!, appointment);
          break;
      }
    } catch (error) {
      // Log error but do NOT fail the main operation
      console.error(`❌ [AUTO-SYNC] Error ${action} appointment ${appointment.id}:`, error);
    }
  });
}

/**
 * Create an event in Google Calendar
 */
async function createGoogleEvent(calendar: any, calendarId: string, appointment: AppointmentData): Promise<void> {
  try {
    // Guard: if a tracking record already exists (e.g. from a previous auto-sync run),
    // do NOT create a second Google Calendar event — just ensure synced=true.
    const existingBefore = await db.select()
      .from(googleCalendarEvents)
      .where(eq(googleCalendarEvents.appointmentId, appointment.id))
      .limit(1);
    if (existingBefore.length > 0) {
      await db.update(appointments)
        .set({ synced: true, googleEventId: existingBefore[0].googleEventId })
        .where(eq(appointments.id, appointment.id));
      logger.debug(`⏭️ [AUTO-SYNC] Skip create — tracking record already exists for appointment ${appointment.id}`);
      return;
    }

    // Build RFC3339 datetime strings with Italy timezone offset embedded (e.g. "2026-06-30T15:00:00+02:00")
    // This is unambiguous for Google Calendar API — the offset is DST-aware.
    const startDateTimeStr = italyTimeToRfc3339(appointment.date, appointment.startTime);
    const endDateTimeStr   = italyTimeToRfc3339(appointment.date, appointment.endTime);
    
    console.log(`📅 [AUTO-SYNC] Creating event: ${startDateTimeStr} – ${endDateTimeStr}`);

    // CRITICAL: mark the event with source='gestionale' so the import loop
    // recognises it as an app-exported event and never re-imports it as a duplicate.
    const _gesSig = `#gestionale ${JSON.stringify({ id: appointment.id, svcId: appointment.serviceId || 0, cliId: appointment.clientId || 0 })}`;
    const description = (appointment.notes
      ? `${appointment.notes}\n\n${_gesSig}`
      : _gesSig);

    const event = {
      summary: `Appuntamento #${appointment.id}`,
      description,
      start: {
        dateTime: startDateTimeStr,
        timeZone: 'Europe/Rome',
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone: 'Europe/Rome',
      },
      extendedProperties: {
        private: {
          source: 'gestionale',
          appointmentId: String(appointment.id),
          svcId: String(appointment.serviceId || 0),
          cliId: String(appointment.clientId || 0),
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    if (response.data.id) {
      const googleEventId = response.data.id;

      // Upsert the tracking record
      await db.insert(googleCalendarEvents).values({
        appointmentId: appointment.id,
        googleEventId,
        syncStatus: 'synced',
        syncDirection: 'export',
        lastSyncAt: new Date(),
        calendarId
      }).onConflictDoUpdate({
        target: googleCalendarEvents.appointmentId,
        set: {
          googleEventId,
          syncStatus: 'synced',
          syncDirection: 'export',
          lastSyncAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Mark the appointment as synced and store the googleEventId so the import
      // loop can recognise it via appointmentsByGoogleId and never re-import it.
      await db.update(appointments)
        .set({ synced: true, googleEventId })
        .where(eq(appointments.id, appointment.id));
      
      logger.debug(`✅ [AUTO-SYNC] Event created in Google Calendar: ${googleEventId}`);
    }
  } catch (error) {
    console.error(`❌ [AUTO-SYNC] Error creating Google event:`, error);
    throw error;
  }
}

/**
 * Update an event in Google Calendar
 */
async function updateGoogleEvent(calendar: any, calendarId: string, appointment: AppointmentData): Promise<void> {
  try {
    // Find the linked Google event
    const [existing] = await db.select()
      .from(googleCalendarEvents)
      .where(eq(googleCalendarEvents.appointmentId, appointment.id))
      .limit(1);

    if (!existing) {
      // No existing event, create a new one
      console.log(`⚠️ [AUTO-SYNC] No Google event found for appointment ${appointment.id}, creating new`);
      await createGoogleEvent(calendar, calendarId, appointment);
      return;
    }

    // Build RFC3339 datetime strings with Italy timezone offset embedded (e.g. "2026-06-30T15:00:00+02:00")
    const startDateTimeStr = italyTimeToRfc3339(appointment.date, appointment.startTime);
    const endDateTimeStr   = italyTimeToRfc3339(appointment.date, appointment.endTime);

    console.log(`📅 [AUTO-SYNC] Updating event: ${startDateTimeStr} – ${endDateTimeStr}`);

    // CRITICAL: keep extendedProperties on update so the import loop never re-imports it
    const _gesSig = `#gestionale ${JSON.stringify({ id: appointment.id, svcId: appointment.serviceId || 0, cliId: appointment.clientId || 0 })}`;
    const description = (appointment.notes
      ? `${appointment.notes}\n\n${_gesSig}`
      : _gesSig);

    const event = {
      summary: `Appuntamento #${appointment.id}`,
      description,
      start: {
        dateTime: startDateTimeStr,
        timeZone: 'Europe/Rome',
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone: 'Europe/Rome',
      },
      extendedProperties: {
        private: {
          source: 'gestionale',
          appointmentId: String(appointment.id),
          svcId: String(appointment.serviceId || 0),
          cliId: String(appointment.clientId || 0),
        }
      }
    };

    await calendar.events.update({
      calendarId,
      eventId: existing.googleEventId,
      requestBody: event,
    });

    // Update timestamp sync and ensure appointment is marked synced
    await db.update(googleCalendarEvents)
      .set({ lastSyncAt: new Date(), syncStatus: 'synced', syncDirection: 'export' })
      .where(eq(googleCalendarEvents.appointmentId, appointment.id));

    await db.update(appointments)
      .set({ synced: true, googleEventId: existing.googleEventId })
      .where(eq(appointments.id, appointment.id));

    logger.debug(`✅ [AUTO-SYNC] Event updated in Google Calendar: ${existing.googleEventId}`);
  } catch (error) {
    console.error(`❌ [AUTO-SYNC] Error updating Google event:`, error);
    throw error;
  }
}

/**
 * Delete an event from Google Calendar
 */
async function deleteGoogleEvent(calendar: any, calendarId: string, appointment: AppointmentData): Promise<void> {
  try {
    // Find the linked Google event
    const [existing] = await db.select()
      .from(googleCalendarEvents)
      .where(eq(googleCalendarEvents.appointmentId, appointment.id))
      .limit(1);

    if (!existing) {
      console.log(`⚠️ [AUTO-SYNC] No Google event to delete for appointment ${appointment.id}`);
      return;
    }

    await calendar.events.delete({
      calendarId,
      eventId: existing.googleEventId,
    });

    // Remove the mapping
    await db.delete(googleCalendarEvents)
      .where(eq(googleCalendarEvents.appointmentId, appointment.id));

    logger.debug(`✅ [AUTO-SYNC] Event deleted from Google Calendar: ${existing.googleEventId}`);
  } catch (error) {
    console.error(`❌ [AUTO-SYNC] Error deleting Google event:`, error);
    throw error;
  }
}

/**
 * Convert a local Italy date+time to RFC3339 with the correct timezone offset embedded.
 * Example: ("2026-06-30", "15:00") → "2026-06-30T15:00:00+02:00"  (summer, CEST)
 *          ("2026-01-15", "15:00") → "2026-01-15T15:00:00+01:00"  (winter, CET)
 * This format is unambiguous for Google Calendar API — no need for a separate timeZone field.
 */
function italyTimeToRfc3339(date: string, time: string): string {
  const timePadded = time.length === 5 ? `${time}:00` : time;
  // Calculate Italy's UTC offset for this specific date (handles DST automatically)
  const refDate = new Date(`${date}T12:00:00Z`); // noon UTC on appointment date
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'Europe/Rome'
  });
  const parts = formatter.formatToParts(refDate);
  const m = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const localMs = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second);
  const offsetMinutes = (localMs - refDate.getTime()) / 60000; // e.g. 120 for UTC+2
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMinutes);
  const oh = String(Math.floor(absMin / 60)).padStart(2, '0');
  const om = String(absMin % 60).padStart(2, '0');
  return `${date}T${timePadded}${sign}${oh}:${om}`;
}
