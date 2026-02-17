import { db } from '../db';
import { users, appointments, googleCalendarEvents, clients, services } from '../../shared/schema';
import { eq, and, gte, lt } from 'drizzle-orm';
import { storage } from '../storage';
import { calendar_v3, google } from 'googleapis';
import { addAppointmentToGoogleCalendar, updateAppointmentInGoogleCalendar, deleteAppointmentFromGoogleCalendar } from './googleCalendarService';

interface SyncConflict {
  appointmentId: number;
  googleEventId: string;
  appointmentUpdatedAt: Date;
  googleEventUpdatedAt: Date;
  resolution: 'keep_local' | 'keep_google' | 'pending';
}

/**
 * Importa gli eventi da Google Calendar e crea appuntamenti se non esistono
 */
export async function importGoogleCalendarEvents(userId: number): Promise<{ imported: number; conflicts: SyncConflict[]; errors: string[] }> {
  const result = { imported: 0, conflicts: [] as SyncConflict[], errors: [] as string[] };
  
  try {
    // Ottieni il token OAuth dell'utente
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user.length || !user[0].googleAuthToken || !user[0].googleCalendarEnabled) {
      result.errors.push('Google Calendar non è abilitato per questo utente');
      return result;
    }

    const googleAuthToken = user[0].googleAuthToken;
    const calendarId = user[0].googleCalendarId || 'primary';
    
    // TODO: Decrittare googleAuthToken (per ora assumiamo sia in plaintext)
    const tokens = JSON.parse(googleAuthToken);
    
    // Crea client Google Calendar
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.PRODUCTION_DOMAIN 
        ? `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`
        : `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`
    );
    oauth2Client.setCredentials(tokens);
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Scarica gli ultimi 7 giorni di eventi da Google
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const events = await calendar.events.list({
      calendarId,
      timeMin: sevenDaysAgo.toISOString(),
      maxResults: 100,
      orderBy: 'updated'
    });

    if (!events.data.items) {
      console.log('📭 Nessun evento da importare da Google Calendar');
      return result;
    }

    // Processa ogni evento Google
    for (const googleEvent of events.data.items) {
      if (!googleEvent.id || !googleEvent.start?.dateTime) continue;
      
      try {
        // Controlla se questo evento è già collegato a un appuntamento
        const existing = await db.select()
          .from(googleCalendarEvents)
          .where(eq(googleCalendarEvents.googleEventId, googleEvent.id));
        
        if (existing.length > 0) {
          // Evento già tracciato - potrebbe essere un conflitto
          console.log(`✓ Evento ${googleEvent.id} già sincronizzato`);
          continue;
        }

        // Estrai info dall'evento Google
        const startTime = new Date(googleEvent.start.dateTime);
        const endTime = new Date(googleEvent.end?.dateTime || startTime.getTime() + 30 * 60000);
        const eventDate = startTime.toISOString().split('T')[0];
        const eventStartTime = startTime.toTimeString().substring(0, 5);
        const eventEndTime = endTime.toTimeString().substring(0, 5);
        
        // Cerca cliente basato su email o nome nell'evento
        let clientId: number | null = null;
        if (googleEvent.attendees && googleEvent.attendees.length > 0) {
          const attendeeEmail = googleEvent.attendees[0].email;
          const foundClients = await db.select()
            .from(clients)
            .where(and(eq(clients.userId, userId), eq(clients.email, attendeeEmail)));
          
          if (foundClients.length > 0) {
            clientId = foundClients[0].id;
          }
        }

        if (!clientId) {
          console.log(`⚠️ Non trovato cliente per evento ${googleEvent.id}`);
          continue;
        }

        // Crea l'appuntamento
        const newAppointment = await db.insert(appointments).values({
          userId,
          clientId,
          date: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
          status: 'confirmed',
          notes: googleEvent.description || `Importato da Google Calendar: ${googleEvent.summary || ''}`,
          importedFromGoogle: true,
          googleEventId: googleEvent.id
        }).returning();

        // Registra il collegamento
        if (newAppointment.length > 0) {
          await db.insert(googleCalendarEvents).values({
            appointmentId: newAppointment[0].id,
            googleEventId: googleEvent.id,
            syncStatus: 'synced',
            calendarId,
            lastSyncAt: new Date()
          });
          
          result.imported++;
          console.log(`✅ Evento importato: ${googleEvent.summary} (${eventDate} ${eventStartTime})`);
        }
      } catch (error) {
        result.errors.push(`Errore importazione evento ${googleEvent.id}: ${String(error)}`);
      }
    }

    // Aggiorna lastGoogleSyncAt
    await db.update(users).set({ lastGoogleSyncAt: new Date() }).where(eq(users.id, userId));
    
    return result;
  } catch (error) {
    result.errors.push(`Errore generale importazione: ${String(error)}`);
    console.error('❌ Errore importazione Google Calendar:', error);
    return result;
  }
}

/**
 * Sincronizzazione bidirezionale: esporta nuovi appuntamenti e importa nuovi eventi Google
 */
export async function syncBidirectional(userId: number): Promise<{ success: boolean; message: string; details: any }> {
  const details = {
    exported: 0,
    imported: 0,
    errors: [] as string[]
  };

  try {
    console.log(`🔄 Sincronizzazione bidirezionale per utente ${userId}`);
    
    // 1. IMPORTA eventi da Google
    const importResult = await importGoogleCalendarEvents(userId);
    details.imported = importResult.imported;
    details.errors.push(...importResult.errors);
    console.log(`📥 Importati ${importResult.imported} eventi da Google Calendar`);

    // 2. ESPORTA appuntamenti nuovi verso Google
    const newAppointments = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.userId, userId),
        eq(appointments.synced, false) // Appuntamenti non ancora sincronizzati
      ));

    for (const appointment of newAppointments) {
      try {
        const googleEventId = await addAppointmentToGoogleCalendar(appointment.id);
        if (googleEventId) {
          // Registra il collegamento
          await db.insert(googleCalendarEvents).values({
            appointmentId: appointment.id,
            googleEventId,
            syncStatus: 'synced',
            lastSyncAt: new Date()
          });
          
          // Marca appuntamento come sincronizzato
          await db.update(appointments).set({ synced: true }).where(eq(appointments.id, appointment.id));
          
          details.exported++;
          console.log(`📤 Esportato appuntamento ${appointment.id} a Google Calendar`);
        }
      } catch (error) {
        details.errors.push(`Errore esportazione appuntamento ${appointment.id}: ${String(error)}`);
      }
    }

    // 3. Aggiorna timestamp sync
    await db.update(users).set({ lastGoogleSyncAt: new Date() }).where(eq(users.id, userId));

    const message = `Sincronizzazione completata: ${details.imported} eventi importati, ${details.exported} appuntamenti esportati`;
    console.log(`✅ ${message}`);
    
    return { success: true, message, details };
  } catch (error) {
    const message = `Errore sincronizzazione: ${String(error)}`;
    console.error(`❌ ${message}`);
    return { success: false, message, details };
  }
}

export const googleCalendarSync = {
  importGoogleCalendarEvents,
  syncBidirectional
};
