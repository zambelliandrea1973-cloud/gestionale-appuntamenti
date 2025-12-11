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
      singleEvents: true,
      orderBy: 'startTime'
    });

    if (!events.data.items) {
      console.log('📭 Nessun evento da importare da Google Calendar');
      return result;
    }

    // Processa ogni evento Google
    for (const googleEvent of events.data.items) {
      if (!googleEvent.id || !googleEvent.start?.dateTime) continue;
      
      try {
        // Controlla se questo evento è già collegato a un appuntamento (tabella tracking)
        const existing = await db.select()
          .from(googleCalendarEvents)
          .where(eq(googleCalendarEvents.googleEventId, googleEvent.id));
        
        if (existing.length > 0) {
          // Evento già tracciato - potrebbe essere un conflitto
          console.log(`✓ Evento ${googleEvent.id} già sincronizzato (tracking table)`);
          continue;
        }
        
        // IMPORTANTE: Controlla anche se esiste già un appuntamento con lo stesso google_event_id
        const existingAppointment = await db.select()
          .from(appointments)
          .where(and(
            eq(appointments.userId, userId),
            eq(appointments.googleEventId, googleEvent.id)
          ));
        
        if (existingAppointment.length > 0) {
          console.log(`✓ Evento ${googleEvent.id} già presente come appuntamento`);
          continue;
        }
        
        // DEDUPLICAZIONE AGGIUNTIVA: Controlla se esiste già un appuntamento alla stessa data/ora
        const googleStartDateTime = googleEvent.start.dateTime;
        const eventDate = googleStartDateTime.substring(0, 10);
        const eventStartTime = googleStartDateTime.substring(11, 16);
        
        const duplicateCheck = await db.select()
          .from(appointments)
          .where(and(
            eq(appointments.userId, userId),
            eq(appointments.date, eventDate),
            eq(appointments.startTime, eventStartTime),
            eq(appointments.importedFromGoogle, true)
          ));
        
        if (duplicateCheck.length > 0) {
          console.log(`✓ Evento ${googleEvent.id} saltato - appuntamento già presente per ${eventDate} ${eventStartTime}`);
          continue;
        }

        // Estrai info dall'evento Google - USA la stringa originale per evitare problemi timezone
        // googleEvent.start.dateTime ha formato: "2025-12-13T09:00:00+01:00"
        const googleEndDateTime = googleEvent.end?.dateTime || googleStartDateTime;
        
        // Estrai data e ora direttamente dalla stringa ISO (senza conversione UTC)
        // Formato: YYYY-MM-DDTHH:MM:SS+HH:MM
        // eventDate e eventStartTime sono già estratti sopra per la deduplicazione
        const eventEndTime = googleEndDateTime.substring(11, 16); // "10:00"
        
        console.log(`📅 [GOOGLE IMPORT] Evento: ${googleEvent.summary} - Data: ${eventDate}, Ora: ${eventStartTime}-${eventEndTime}`);
        
        // Cerca cliente basato su email o nome nell'evento
        let clientId: number | null = null;
        
        // 1. Prima prova con attendee email
        if (googleEvent.attendees && googleEvent.attendees.length > 0) {
          const attendeeEmail = googleEvent.attendees[0].email;
          if (attendeeEmail) {
            const foundClients = await db.select()
              .from(clients)
              .where(and(eq(clients.userId, userId), eq(clients.email, attendeeEmail)));
            
            if (foundClients.length > 0) {
              clientId = foundClients[0].id;
            }
          }
        }
        
        // 2. Se non trovato, cerca o crea cliente "Importato da Google"
        if (!clientId) {
          // Cerca cliente placeholder per eventi Google
          const placeholderClients = await db.select()
            .from(clients)
            .where(and(
              eq(clients.userId, userId), 
              eq(clients.firstName, 'Evento'),
              eq(clients.lastName, 'Google Calendar')
            ));
          
          if (placeholderClients.length > 0) {
            clientId = placeholderClients[0].id;
          } else {
            // Crea cliente placeholder
            const newClient = await db.insert(clients).values({
              userId,
              firstName: 'Evento',
              lastName: 'Google Calendar',
              email: 'google-calendar@imported.local',
              phone: '',
              notes: 'Cliente creato automaticamente per eventi importati da Google Calendar'
            }).returning();
            
            if (newClient.length > 0) {
              clientId = newClient[0].id;
              console.log(`📝 Creato cliente placeholder per eventi Google: ${clientId}`);
            }
          }
        }

        if (!clientId) {
          console.log(`⚠️ Impossibile creare cliente per evento ${googleEvent.id}`);
          continue;
        }

        // USA SEMPRE il servizio "Promemoria Google Calendar" per gli eventi importati
        const eventTitle = googleEvent.summary || 'Evento Google';
        let serviceId: number;
        
        // Cerca/crea il servizio "Promemoria Google Calendar" unico per l'utente
        const promemoriaService = await db.select()
          .from(services)
          .where(and(
            eq(services.userId, userId),
            eq(services.name, 'Promemoria Google Calendar')
          ))
          .limit(1);
        
        if (promemoriaService.length > 0) {
          serviceId = promemoriaService[0].id;
        } else {
          // Crea il servizio "Promemoria Google Calendar" se non esiste
          const newService = await db.insert(services).values({
            userId,
            name: 'Promemoria Google Calendar',
            duration: 60,
            price: 0,
            color: '#6B7280' // Colore grigio per promemoria
          }).returning();
          
          if (newService.length > 0) {
            serviceId = newService[0].id;
            console.log(`📝 Creato servizio "Promemoria Google Calendar" (ID: ${serviceId})`);
          } else {
            // Fallback a servizio default se creazione fallisce
            const defaultService = await db.select().from(services).where(eq(services.userId, userId)).limit(1);
            serviceId = defaultService.length > 0 ? defaultService[0].id : 1;
            console.log(`⚠️ Fallback a servizio default: ${serviceId}`);
          }
        }
        
        console.log(`📋 Evento "${eventTitle}" -> Servizio "Promemoria Google Calendar" (ID: ${serviceId})`)

        // Crea l'appuntamento usando storage per rispettare lo schema
        const newAppointmentData = {
          userId,
          clientId,
          serviceId,
          date: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
          status: 'confirmed',
          notes: `📅 Promemoria Google Calendar: ${eventTitle}${googleEvent.description ? '\n' + googleEvent.description : ''}`,
          importedFromGoogle: true,
          googleEventId: googleEvent.id
        };
        
        const newAppointment = await db.insert(appointments).values(newAppointmentData).returning();

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
    
    // 1. IMPORTA eventi da Google Calendar
    console.log(`📥 [SYNC] Step 1: Importazione eventi da Google Calendar...`);
    try {
      const importResult = await importGoogleCalendarEvents(userId);
      details.imported = importResult.imported;
      if (importResult.errors.length > 0) {
        details.errors.push(...importResult.errors);
      }
      console.log(`📥 [SYNC] Importati ${importResult.imported} eventi da Google`);
    } catch (importError) {
      console.error(`❌ [SYNC] Errore importazione:`, importError);
      details.errors.push(`Errore importazione: ${String(importError)}`);
    }

    // 2. ESPORTA appuntamenti nuovi verso Google
    console.log(`📤 [SYNC] Step 2: Query appuntamenti da esportare...`);
    let newAppointments: any[] = [];
    try {
      console.log(`📤 [SYNC] Eseguendo query per userId=${userId}...`);
      // Query SEMPLICE: seleziona solo appuntamenti dell'utente
      const allAppointments = await db.select()
        .from(appointments)
        .where(eq(appointments.userId, userId));
      
      console.log(`📤 [SYNC] Query completata, trovati ${allAppointments.length} appuntamenti totali`);
      
      // Filtra manualmente gli appuntamenti non sincronizzati
      // synced dovrebbe essere false o NULL per gli appuntamenti nuovi
      newAppointments = allAppointments.filter(a => !a.synced);
      console.log(`📤 [SYNC] ${newAppointments.length} da sincronizzare`);
    } catch (queryError) {
      console.error(`❌ [SYNC] Errore query appuntamenti:`, queryError);
      details.errors.push(`Errore query appuntamenti: ${String(queryError)}`);
      newAppointments = [];
    }

    for (const appointment of newAppointments) {
      try {
        console.log(`📤 [SYNC] Esportazione appuntamento ${appointment.id}...`);
        
        // Crea direttamente l'evento in Google Calendar usando il token dell'utente
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user.length || !user[0].googleAuthToken) {
          console.log(`❌ [SYNC] Token Google non trovato per utente ${userId}`);
          continue;
        }
        
        const tokens = JSON.parse(user[0].googleAuthToken);
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.PRODUCTION_DOMAIN 
            ? `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`
            : `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`
        );
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        // Ottieni dati appuntamento
        const clientData = await db.select().from(clients).where(eq(clients.id, appointment.clientId)).limit(1);
        const serviceData = appointment.serviceId 
          ? await db.select().from(services).where(eq(services.id, appointment.serviceId)).limit(1)
          : [];
        
        if (!clientData.length) {
          console.log(`❌ [SYNC] Cliente non trovato per appuntamento ${appointment.id}`);
          continue;
        }
        
        const client = clientData[0];
        const service = serviceData.length ? serviceData[0] : null;
        
        // Crea l'evento - USA formato ISO SENZA Z per rispettare il fuso orario locale
        // Gestisci sia formato HH:MM che HH:MM:SS
        const startTime = appointment.startTime.length === 5 ? `${appointment.startTime}:00` : appointment.startTime;
        const endTime = appointment.endTime.length === 5 ? `${appointment.endTime}:00` : appointment.endTime;
        const startDateTimeStr = `${appointment.date}T${startTime}`;
        const endDateTimeStr = `${appointment.date}T${endTime}`;
        
        console.log(`📅 [SYNC] Esportazione evento: ${startDateTimeStr} - ${endDateTimeStr} (Europe/Rome)`);
        
        const summary = service 
          ? `${client.firstName} ${client.lastName} - ${service.name}`
          : `Appuntamento con ${client.firstName} ${client.lastName}`;
        
        const description = appointment.notes 
          ? `Note: ${appointment.notes}\nCliente: ${client.firstName} ${client.lastName}\nTelefono: ${client.phone || 'Non disponibile'}\nEmail: ${client.email || 'Non disponibile'}`
          : `Cliente: ${client.firstName} ${client.lastName}\nTelefono: ${client.phone || 'Non disponibile'}\nEmail: ${client.email || 'Non disponibile'}`;
        
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary,
            description,
            start: { dateTime: startDateTimeStr, timeZone: 'Europe/Rome' },
            end: { dateTime: endDateTimeStr, timeZone: 'Europe/Rome' },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 30 },
              ],
            },
          }
        });
        
        const googleEventId = response.data.id;
        console.log(`✅ [SYNC] Evento creato in Google Calendar: ${response.data.htmlLink}`);
        
        if (googleEventId) {
          // Registra il collegamento
          await db.insert(googleCalendarEvents).values({
            appointmentId: appointment.id,
            googleEventId,
            syncStatus: 'synced',
            calendarId: 'primary',
            lastSyncAt: new Date()
          });
          
          // Marca appuntamento come sincronizzato
          await db.update(appointments).set({ synced: true }).where(eq(appointments.id, appointment.id));
          
          details.exported++;
          console.log(`📤 Esportato appuntamento ${appointment.id} a Google Calendar`);
        }
      } catch (error) {
        console.error(`❌ [SYNC] Errore esportazione appuntamento ${appointment.id}:`, error);
        details.errors.push(`Errore esportazione appuntamento ${appointment.id}: ${String(error)}`);
      }
    }

    // 3. Aggiorna timestamp sync
    console.log(`📝 [SYNC] Step 3: Aggiornamento timestamp...`);
    await db.update(users).set({ lastGoogleSyncAt: new Date() }).where(eq(users.id, userId));

    const message = `Sincronizzazione completata: ${details.imported || 0} eventi importati, ${details.exported} appuntamenti esportati`;
    console.log(`✅ ${message}`);
    
    return { success: true, message, details };
  } catch (error) {
    const message = `Errore sincronizzazione: ${String(error)}`;
    console.error(`❌ ${message}`, error);
    return { success: false, message, details };
  }
}

/**
 * Rileva eventi eliminati da Google Calendar e rimuove gli appuntamenti corrispondenti
 */
export async function syncDeletedEvents(userId: number): Promise<{ deleted: number; errors: string[] }> {
  const result = { deleted: 0, errors: [] as string[] };
  
  try {
    // Ottieni il token OAuth dell'utente
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user.length || !user[0].googleAuthToken || !user[0].googleCalendarEnabled) {
      return result;
    }

    const googleAuthToken = user[0].googleAuthToken;
    const calendarId = user[0].googleCalendarId || 'primary';
    
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
    
    // Ottieni tutti gli appuntamenti sincronizzati con Google per questo utente
    const syncedMappings = await db.select()
      .from(googleCalendarEvents);
    
    // Filtra solo quelli che appartengono a questo utente
    const syncedAppointments: Array<{ mapping: typeof syncedMappings[0], appointment: any }> = [];
    for (const mapping of syncedMappings) {
      const [apt] = await db.select().from(appointments)
        .where(and(eq(appointments.id, mapping.appointmentId), eq(appointments.userId, userId)));
      if (apt) {
        syncedAppointments.push({ mapping, appointment: apt });
      }
    }
    
    if (syncedAppointments.length === 0) {
      return result;
    }
    
    console.log(`🔍 [SYNC DELETE] Controllo ${syncedAppointments.length} appuntamenti sincronizzati per utente ${userId}`);
    
    // Per ogni appuntamento sincronizzato, verifica se l'evento esiste ancora su Google
    for (const syncedAppt of syncedAppointments) {
      const googleEventId = syncedAppt.mapping.googleEventId;
      const appointmentId = syncedAppt.appointment.id;
      
      try {
        // Prova a recuperare l'evento da Google
        await calendar.events.get({
          calendarId,
          eventId: googleEventId,
        });
        // Se arriviamo qui, l'evento esiste ancora - nessuna azione
      } catch (error: any) {
        // Se l'errore è 404, l'evento è stato eliminato
        if (error.code === 404 || error.response?.status === 404) {
          console.log(`🗑️ [SYNC DELETE] Evento ${googleEventId} eliminato da Google, rimuovo appuntamento ${appointmentId}`);
          
          try {
            // Elimina l'appuntamento dal gestionale
            await db.delete(appointments).where(eq(appointments.id, appointmentId));
            
            // Elimina il record di sincronizzazione
            await db.delete(googleCalendarEvents).where(eq(googleCalendarEvents.googleEventId, googleEventId));
            
            result.deleted++;
            console.log(`✅ [SYNC DELETE] Appuntamento ${appointmentId} eliminato (evento Google rimosso)`);
          } catch (deleteError) {
            result.errors.push(`Errore eliminazione appuntamento ${appointmentId}: ${String(deleteError)}`);
          }
        }
        // Altri errori vengono ignorati (potrebbero essere problemi temporanei di rete)
      }
    }
    
    return result;
  } catch (error) {
    result.errors.push(`Errore generale sync delete: ${String(error)}`);
    console.error('❌ [SYNC DELETE] Errore:', error);
    return result;
  }
}

export const googleCalendarSync = {
  importGoogleCalendarEvents,
  syncBidirectional,
  syncDeletedEvents
};
