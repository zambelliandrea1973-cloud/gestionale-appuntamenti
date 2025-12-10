/**
 * AUTO GOOGLE CALENDAR SYNC
 * Helper per sincronizzare automaticamente gli appuntamenti con Google Calendar
 * Esegue le operazioni in modo asincrono per non bloccare le risposte API
 */

import { db } from '../db';
import { users, googleCalendarEvents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';

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
}

/**
 * Verifica se l'utente ha Google Calendar abilitato e restituisce il token
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

    const tokens = JSON.parse(user.googleAuthToken);
    return { 
      enabled: true, 
      tokens,
      calendarId: user.googleCalendarId || 'primary'
    };
  } catch (error) {
    console.error(`❌ [AUTO-SYNC] Errore lettura token utente ${userId}:`, error);
    return { enabled: false };
  }
}

/**
 * Crea un client Google Calendar autenticato
 */
function createCalendarClient(tokens: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.PRODUCTION_DOMAIN 
      ? `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`
      : `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`
  );
  oauth2Client.setCredentials(tokens);
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Sincronizza un appuntamento con Google Calendar
 * Eseguito in modo asincrono (fire and forget)
 */
export function triggerGoogleSync(action: SyncAction, appointment: AppointmentData): void {
  // Esegui in modo asincrono per non bloccare la risposta API
  setImmediate(async () => {
    try {
      console.log(`🔄 [AUTO-SYNC] ${action.toUpperCase()} appuntamento ${appointment.id} per utente ${appointment.userId}`);
      
      // Verifica se l'utente ha Google Calendar abilitato
      const { enabled, tokens, calendarId } = await getUserGoogleToken(appointment.userId);
      
      if (!enabled) {
        console.log(`⏭️ [AUTO-SYNC] Google Calendar non abilitato per utente ${appointment.userId}, skip`);
        return;
      }

      const calendar = createCalendarClient(tokens);

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
      // Log errore ma NON far fallire l'operazione principale
      console.error(`❌ [AUTO-SYNC] Errore ${action} appuntamento ${appointment.id}:`, error);
    }
  });
}

/**
 * Crea un evento in Google Calendar
 */
async function createGoogleEvent(calendar: any, calendarId: string, appointment: AppointmentData): Promise<void> {
  try {
    // Costruisci data/ora evento - USA formato ISO SENZA Z per rispettare il fuso orario locale
    // NON usare .toISOString() che converte in UTC e aggiunge Z
    const startDateTimeStr = `${appointment.date}T${appointment.startTime}:00`;
    const endDateTimeStr = `${appointment.date}T${appointment.endTime}:00`;

    const event = {
      summary: `Appuntamento #${appointment.id}`,
      description: appointment.notes || 'Appuntamento dal gestionale',
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
      // Salva il mapping evento - usa upsert per gestire duplicati
      const existingMapping = await db.select()
        .from(googleCalendarEvents)
        .where(eq(googleCalendarEvents.appointmentId, appointment.id))
        .limit(1);
      
      if (existingMapping.length > 0) {
        // Aggiorna mapping esistente
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
        // Crea nuovo mapping
        await db.insert(googleCalendarEvents).values({
          appointmentId: appointment.id,
          googleEventId: response.data.id,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
          calendarId
        });
      }
      
      console.log(`✅ [AUTO-SYNC] Evento creato in Google Calendar: ${response.data.id}`);
    }
  } catch (error) {
    console.error(`❌ [AUTO-SYNC] Errore creazione evento Google:`, error);
    throw error;
  }
}

/**
 * Aggiorna un evento in Google Calendar
 */
async function updateGoogleEvent(calendar: any, calendarId: string, appointment: AppointmentData): Promise<void> {
  try {
    // Cerca l'evento Google collegato
    const [existing] = await db.select()
      .from(googleCalendarEvents)
      .where(eq(googleCalendarEvents.appointmentId, appointment.id))
      .limit(1);

    if (!existing) {
      // Nessun evento esistente, creane uno nuovo
      console.log(`⚠️ [AUTO-SYNC] Nessun evento Google trovato per appuntamento ${appointment.id}, creo nuovo`);
      await createGoogleEvent(calendar, calendarId, appointment);
      return;
    }

    // Aggiorna l'evento esistente - USA formato ISO SENZA Z per rispettare il fuso orario locale
    const startDateTimeStr = `${appointment.date}T${appointment.startTime}:00`;
    const endDateTimeStr = `${appointment.date}T${appointment.endTime}:00`;

    const event = {
      summary: `Appuntamento #${appointment.id}`,
      description: appointment.notes || 'Appuntamento dal gestionale',
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

    // Aggiorna timestamp sync
    await db.update(googleCalendarEvents)
      .set({ lastSyncAt: new Date(), syncStatus: 'synced' })
      .where(eq(googleCalendarEvents.appointmentId, appointment.id));

    console.log(`✅ [AUTO-SYNC] Evento aggiornato in Google Calendar: ${existing.googleEventId}`);
  } catch (error) {
    console.error(`❌ [AUTO-SYNC] Errore aggiornamento evento Google:`, error);
    throw error;
  }
}

/**
 * Elimina un evento da Google Calendar
 */
async function deleteGoogleEvent(calendar: any, calendarId: string, appointment: AppointmentData): Promise<void> {
  try {
    // Cerca l'evento Google collegato
    const [existing] = await db.select()
      .from(googleCalendarEvents)
      .where(eq(googleCalendarEvents.appointmentId, appointment.id))
      .limit(1);

    if (!existing) {
      console.log(`⚠️ [AUTO-SYNC] Nessun evento Google da eliminare per appuntamento ${appointment.id}`);
      return;
    }

    await calendar.events.delete({
      calendarId,
      eventId: existing.googleEventId,
    });

    // Rimuovi il mapping
    await db.delete(googleCalendarEvents)
      .where(eq(googleCalendarEvents.appointmentId, appointment.id));

    console.log(`✅ [AUTO-SYNC] Evento eliminato da Google Calendar: ${existing.googleEventId}`);
  } catch (error) {
    console.error(`❌ [AUTO-SYNC] Errore eliminazione evento Google:`, error);
    throw error;
  }
}
