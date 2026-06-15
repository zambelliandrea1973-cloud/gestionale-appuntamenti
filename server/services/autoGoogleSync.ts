import { logger } from '../utils/logger';
/**
 * AUTO GOOGLE CALENDAR SYNC
 * Helper for automatically synchronizing appointments with Google Calendar
 * Performs operations asynchronously to avoid blocking API responses
 */

import { db } from '../db';
import { users, googleCalendarEvents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';
import { EncryptionService } from './encryption';

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
    // Build event date/time - USE ISO format WITHOUT Z to respect the local timezone
    // Handle both HH:MM and HH:MM:SS formats
    const startTime = appointment.startTime.length === 5 ? `${appointment.startTime}:00` : appointment.startTime;
    const endTime = appointment.endTime.length === 5 ? `${appointment.endTime}:00` : appointment.endTime;
    const startDateTimeStr = `${appointment.date}T${startTime}`;
    const endDateTimeStr = `${appointment.date}T${endTime}`;
    
    console.log(`📅 [AUTO-SYNC] Creating event: ${startDateTimeStr} - ${endDateTimeStr} (Europe/Rome)`);

    const event = {
      summary: `Appointment #${appointment.id}`,
      description: appointment.notes || 'Appointment from the scheduler',
      start: {
        dateTime: startDateTimeStr,
        timeZone: 'Europe/Rome',
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone: 'Europe/Rome',
      },
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    if (response.data.id) {
      // Save the event mapping - use upsert to handle duplicates
      const existingMapping = await db.select()
        .from(googleCalendarEvents)
        .where(eq(googleCalendarEvents.appointmentId, appointment.id))
        .limit(1);
      
      if (existingMapping.length > 0) {
        // Update existing mapping
        await db.update(googleCalendarEvents)
          .set({ 
            googleEventId: response.data.id,
            syncStatus: 'synced',
            lastSyncAt: new Date(),
            syncError: null,
            calendarId
          })
          .where(eq(googleCalendarEvents.appointmentId, appointment.id));
      } else {
        // Create new mapping
        await db.insert(googleCalendarEvents).values({
          appointmentId: appointment.id,
          googleEventId: response.data.id,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
          calendarId
        });
      }
      
      logger.debug(`✅ [AUTO-SYNC] Event created in Google Calendar: ${response.data.id}`);
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

    // Update the existing event - USE ISO format WITHOUT Z to respect local timezone
    // Handle both HH:MM and HH:MM:SS formats
    const startTime = appointment.startTime.length === 5 ? `${appointment.startTime}:00` : appointment.startTime;
    const endTime = appointment.endTime.length === 5 ? `${appointment.endTime}:00` : appointment.endTime;
    const startDateTimeStr = `${appointment.date}T${startTime}`;
    const endDateTimeStr = `${appointment.date}T${endTime}`;
    
    console.log(`📅 [AUTO-SYNC] Updating event: ${startDateTimeStr} - ${endDateTimeStr} (Europe/Rome)`);

    const event = {
      summary: `Appointment #${appointment.id}`,
      description: appointment.notes || 'Appointment from the scheduler',
      start: {
        dateTime: startDateTimeStr,
        timeZone: 'Europe/Rome',
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone: 'Europe/Rome',
      },
    };

    await calendar.events.update({
      calendarId,
      eventId: existing.googleEventId,
      requestBody: event,
    });

    // Update timestamp sync
    await db.update(googleCalendarEvents)
      .set({ lastSyncAt: new Date(), syncStatus: 'synced' })
      .where(eq(googleCalendarEvents.appointmentId, appointment.id));

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
