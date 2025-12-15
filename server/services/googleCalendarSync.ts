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
 * @param userId - ID dell'utente
 * @param timeZone - Fuso orario dell'utente (es. 'Europe/Rome', 'Australia/Sydney')
 */
export async function importGoogleCalendarEvents(userId: number, timeZone: string = 'Europe/Rome'): Promise<{ imported: number; conflicts: SyncConflict[]; errors: string[] }> {
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
    
    // Range temporale: 30 giorni nel passato + 365 giorni nel futuro
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAhead = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    console.log(`📅 [IMPORT] Range temporale: ${thirtyDaysAgo.toISOString().split('T')[0]} - ${oneYearAhead.toISOString().split('T')[0]}`);
    
    // PAGINAZIONE: Raccogli TUTTI gli eventi iterando su nextPageToken con protezione MAX_PAGES
    const MAX_PAGES = 100; // Protezione contro loop infiniti
    let allEvents: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined = undefined;
    let prevPageToken: string | undefined = undefined;
    let pageCount = 0;
    
    do {
      const eventsResponse = await calendar.events.list({
        calendarId,
        timeMin: thirtyDaysAgo.toISOString(),
        timeMax: oneYearAhead.toISOString(),
        maxResults: 250, // Google consiglia 250 per pagina
        singleEvents: true,
        orderBy: 'startTime',
        showDeleted: true, // Includi eventi cancellati per sincronizzare eliminazioni
        pageToken: pageToken
      });
      
      if (eventsResponse.data.items) {
        allEvents = [...allEvents, ...eventsResponse.data.items];
      }
      
      prevPageToken = pageToken;
      pageToken = eventsResponse.data.nextPageToken || undefined;
      pageCount++;
      
      console.log(`📄 [IMPORT] Pagina ${pageCount}: ${eventsResponse.data.items?.length || 0} eventi (totale: ${allEvents.length})`);
      
      // Protezione contro loop infiniti: token ripetuto
      if (pageToken && pageToken === prevPageToken) {
        console.warn('⚠️ [IMPORT] Token ripetuto rilevato, interruzione paginazione');
        break;
      }
      
      // Protezione MAX_PAGES contro loop infiniti
      if (pageCount >= MAX_PAGES) {
        console.warn(`⚠️ [IMPORT] Raggiunto limite MAX_PAGES (${MAX_PAGES}), interruzione paginazione con ${allEvents.length} eventi`);
        break;
      }
      
    } while (pageToken); // Continua finché ci sono pagine

    if (allEvents.length === 0) {
      console.log('📭 Nessun evento da importare da Google Calendar');
      return result;
    }

    console.log(`📊 [IMPORT] Trovati ${allEvents.length} eventi totali da Google Calendar (${pageCount} pagine)`);

    // Processa ogni evento Google
    for (const googleEvent of allEvents) {
      // Log OGNI evento per debug
      console.log(`🔎 [IMPORT] Evento: "${googleEvent.summary || 'senza titolo'}" - start: ${JSON.stringify(googleEvent.start)}`);
      
      if (!googleEvent.id) {
        console.log(`⚠️ [IMPORT] Evento saltato: nessun ID`);
        continue;
      }
      
      // GESTIONE EVENTI CANCELLATI: Se l'evento è stato cancellato su Google, elimina l'appuntamento locale
      if (googleEvent.status === 'cancelled') {
        console.log(`🗑️ [IMPORT] Evento ${googleEvent.id} cancellato su Google - verifico se eliminare appuntamento locale...`);
        
        try {
          // Cerca nella tabella tracking
          const trackedEvent = await db.select()
            .from(googleCalendarEvents)
            .where(eq(googleCalendarEvents.googleEventId, googleEvent.id))
            .limit(1);
          
          if (trackedEvent.length > 0) {
            const appointmentId = trackedEvent[0].appointmentId;
            
            // Elimina prima il tracking
            await db.delete(googleCalendarEvents)
              .where(eq(googleCalendarEvents.googleEventId, googleEvent.id));
            
            // Elimina l'appuntamento
            await db.delete(appointments)
              .where(eq(appointments.id, appointmentId));
            
            console.log(`✅ [IMPORT] Appuntamento ${appointmentId} eliminato (evento cancellato su Google)`);
            result.imported++; // Conta come azione eseguita
          } else {
            // Cerca anche direttamente nella tabella appointments
            const directAppointment = await db.select()
              .from(appointments)
              .where(eq(appointments.googleEventId, googleEvent.id))
              .limit(1);
            
            if (directAppointment.length > 0) {
              await db.delete(appointments)
                .where(eq(appointments.id, directAppointment[0].id));
              
              console.log(`✅ [IMPORT] Appuntamento ${directAppointment[0].id} eliminato (evento cancellato su Google)`);
              result.imported++;
            } else {
              console.log(`ℹ️ [IMPORT] Evento cancellato ${googleEvent.id} non ha appuntamento collegato - skip`);
            }
          }
        } catch (deleteError) {
          console.error(`❌ [IMPORT] Errore eliminazione appuntamento per evento ${googleEvent.id}:`, deleteError);
          result.errors.push(`Errore eliminazione evento cancellato ${googleEvent.id}: ${String(deleteError)}`);
        }
        
        continue; // Passa al prossimo evento
      }
      
      if (!googleEvent.start?.dateTime) {
        console.log(`⚠️ [IMPORT] Evento "${googleEvent.summary}" saltato: è un evento all-day (senza orario specifico)`);
        continue;
      }
      
      try {
        // Controlla se questo evento è già collegato a un appuntamento (tabella tracking)
        const existing = await db.select()
          .from(googleCalendarEvents)
          .where(eq(googleCalendarEvents.googleEventId, googleEvent.id));
        
        if (existing.length > 0) {
          // Evento già tracciato - AGGIORNA l'appuntamento con i dati da Google
          console.log(`🔄 Evento ${googleEvent.id} già tracciato - verifico aggiornamenti da Google...`);
          
          // Recupera l'appuntamento collegato
          const linkedAppointment = await db.select()
            .from(appointments)
            .where(eq(appointments.id, existing[0].appointmentId))
            .limit(1);
          
          if (linkedAppointment.length > 0) {
            // Converti orari Google nel fuso orario utente
            const googleStartDateTime = googleEvent.start.dateTime;
            const googleEndDateTime = googleEvent.end?.dateTime || googleStartDateTime;
            
            const startDateObj = new Date(googleStartDateTime);
            const endDateObj = new Date(googleEndDateTime);
            
            const userFormatter = new Intl.DateTimeFormat('sv-SE', { 
              timeZone,
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              hour12: false
            });
            
            const startParts = userFormatter.format(startDateObj).split(' ');
            const endParts = userFormatter.format(endDateObj).split(' ');
            
            const newDate = startParts[0];
            const newStartTime = startParts[1].substring(0, 5);
            const newEndTime = endParts[1].substring(0, 5);
            
            // Controlla se ci sono modifiche di data/ora (NON toccare le note per preservare dati locali)
            const currentAppt = linkedAppointment[0];
            const hasTimeChanges = currentAppt.date !== newDate || 
                                   currentAppt.startTime !== newStartTime || 
                                   currentAppt.endTime !== newEndTime;
            
            if (hasTimeChanges) {
              console.log(`📝 Verifica aggiornamento appuntamento ${currentAppt.id} da Google: ${currentAppt.date} ${currentAppt.startTime} -> ${newDate} ${newStartTime}`);
              
              // CONTROLLO CONFLITTI: verifica che il nuovo slot non sia già occupato
              const conflictCheck = await db.select()
                .from(appointments)
                .where(and(
                  eq(appointments.userId, userId),
                  eq(appointments.date, newDate),
                  eq(appointments.startTime, newStartTime),
                  // Escludi l'appuntamento corrente dal controllo
                  // (potrebbe essere solo un aggiornamento minore)
                ));
              
              const hasConflict = conflictCheck.some(a => a.id !== currentAppt.id);
              
              if (hasConflict) {
                console.log(`⚠️ Conflitto rilevato! Slot ${newDate} ${newStartTime} già occupato. Aggiornamento annullato.`);
                result.errors.push(`Conflitto orario per evento ${googleEvent.id}: slot ${newDate} ${newStartTime} già occupato`);
                
                // PERSISTI stato conflitto nel database per visibilità UI
                await db.update(googleCalendarEvents)
                  .set({ 
                    syncStatus: 'conflict',
                    updatedAt: new Date()
                  })
                  .where(eq(googleCalendarEvents.id, existing[0].id));
              } else {
                // Aggiorna solo data/ora, PRESERVA le note esistenti
                await db.update(appointments)
                  .set({
                    date: newDate,
                    startTime: newStartTime,
                    endTime: newEndTime
                    // NON aggiornare notes per preservare dati inseriti dallo staff
                  })
                  .where(eq(appointments.id, currentAppt.id));
                
                // Aggiorna anche il tracking
                await db.update(googleCalendarEvents)
                  .set({ lastSyncAt: new Date(), updatedAt: new Date() })
                  .where(eq(googleCalendarEvents.id, existing[0].id));
                
                result.imported++; // Conta come "aggiornato"
                console.log(`✅ Appuntamento ${currentAppt.id} aggiornato da Google (data/ora)`);
              }
            } else {
              console.log(`✓ Appuntamento ${currentAppt.id} già sincronizzato, nessuna modifica`);
            }
          }
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
        // (indipendentemente da importedFromGoogle - evita duplicati anche per appuntamenti esportati)
        const googleStartDateTime = googleEvent.start.dateTime;
        const googleEndDateTime = googleEvent.end?.dateTime || googleStartDateTime;
        
        // CONVERSIONE FUSO ORARIO: Converti datetime Google in ora locale italiana
        const startDateObj = new Date(googleStartDateTime);
        const endDateObj = new Date(googleEndDateTime);
        
        // Formatta nel fuso orario dell'utente
        const userFormatter = new Intl.DateTimeFormat('sv-SE', { 
          timeZone,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false
        });
        
        const startParts = userFormatter.format(startDateObj).split(' ');
        const endParts = userFormatter.format(endDateObj).split(' ');
        
        const eventDate = startParts[0]; // "2025-12-14"
        const eventStartTime = startParts[1].substring(0, 5); // "09:00"
        const eventEndTime = endParts[1].substring(0, 5); // "10:00"
        
        console.log(`🕐 [TZ DEBUG] Google datetime: ${googleStartDateTime} -> Italy: ${eventDate} ${eventStartTime}`);
        
        const duplicateCheck = await db.select()
          .from(appointments)
          .where(and(
            eq(appointments.userId, userId),
            eq(appointments.date, eventDate),
            eq(appointments.startTime, eventStartTime)
          ));
        
        if (duplicateCheck.length > 0) {
          console.log(`✓ Evento ${googleEvent.id} saltato - appuntamento già presente per ${eventDate} ${eventStartTime}`);
          continue;
        }
        
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
          notes: `📅 ${eventTitle}${googleEvent.description ? '\n' + googleEvent.description : ''}`,
          importedFromGoogle: true,
          googleEventId: googleEvent.id
        };
        
        const newAppointment = await db.insert(appointments).values(newAppointmentData).returning();

        // Registra il collegamento (usa upsert per evitare duplicati)
        if (newAppointment.length > 0) {
          await db.insert(googleCalendarEvents).values({
            appointmentId: newAppointment[0].id,
            googleEventId: googleEvent.id,
            syncStatus: 'synced',
            calendarId,
            lastSyncAt: new Date()
          }).onConflictDoUpdate({
            target: googleCalendarEvents.appointmentId,
            set: {
              googleEventId: googleEvent.id,
              syncStatus: 'synced',
              lastSyncAt: new Date(),
              updatedAt: new Date()
            }
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
 * @param userId - ID dell'utente
 * @param timeZone - Fuso orario dell'utente (es. 'Europe/Rome', 'Australia/Sydney')
 */
export async function syncBidirectional(userId: number, timeZone: string = 'Europe/Rome'): Promise<{ success: boolean; message: string; details: any }> {
  const details = {
    exported: 0,
    imported: 0,
    errors: [] as string[]
  };

  try {
    console.log(`🔄 Sincronizzazione bidirezionale per utente ${userId} con timeZone: ${timeZone}`);
    
    // 1. IMPORTA eventi da Google Calendar
    console.log(`📥 [SYNC] Step 1: Importazione eventi da Google Calendar...`);
    try {
      const importResult = await importGoogleCalendarEvents(userId, timeZone);
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
        
        // CONTROLLO DUPLICATI: verifica se l'appuntamento è già stato esportato
        const existingExport = await db.select()
          .from(googleCalendarEvents)
          .where(eq(googleCalendarEvents.appointmentId, appointment.id))
          .limit(1);
        
        if (existingExport.length > 0) {
          console.log(`⏭️ [SYNC] Appuntamento ${appointment.id} già esportato (evento: ${existingExport[0].googleEventId}), skip`);
          // Assicurati che il flag synced sia impostato
          await db.update(appointments).set({ synced: true }).where(eq(appointments.id, appointment.id));
          continue;
        }
        
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
        
        // Crea l'evento - CONVERSIONE A UTC per Google Calendar
        // Gestisci sia formato HH:MM che HH:MM:SS
        const startTime = appointment.startTime.length === 5 ? `${appointment.startTime}:00` : appointment.startTime;
        const endTime = appointment.endTime.length === 5 ? `${appointment.endTime}:00` : appointment.endTime;
        
        // IMPORTANTE: Convertire da ora locale a UTC prima di inviare a Google Calendar
        // Il database memorizza "09:00" come ora locale (Italy)
        // Google Calendar API richiede UTC, quindi calcoliamo l'offset usando Intl
        
        // Funzione helper per calcolare l'offset di un timezone
        function getTimezoneOffset(date: Date, tz: string): number {
          const formatter = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: tz
          });
          
          const parts = formatter.formatToParts(date);
          const partsMap = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
          
          const localDate = new Date(
            parseInt(partsMap.year),
            parseInt(partsMap.month) - 1,
            parseInt(partsMap.day),
            parseInt(partsMap.hour),
            parseInt(partsMap.minute),
            parseInt(partsMap.second)
          );
          
          return (localDate.getTime() - date.getTime()) / (1000 * 60); // Offset in minuti
        }
        
        // Creare date locali (il browser le interpreta come UTC, ma noi le vediamo come locali)
        const refDate = new Date(`${appointment.date}T12:00:00`); // Una data di riferimento
        const offsetMinutes = getTimezoneOffset(refDate, timeZone);
        
        const localStartDateTime = new Date(`${appointment.date}T${startTime}`);
        const localEndDateTime = new Date(`${appointment.date}T${endTime}`);
        
        // Convertire a UTC sottraendo l'offset
        const utcStartDateTime = new Date(localStartDateTime.getTime() - offsetMinutes * 60 * 1000);
        const utcEndDateTime = new Date(localEndDateTime.getTime() - offsetMinutes * 60 * 1000);
        
        const startDateTimeStr = utcStartDateTime.toISOString(); // "2025-12-14T08:00:00.000Z"
        const endDateTimeStr = utcEndDateTime.toISOString();   // "2025-12-14T09:00:00.000Z"
        
        console.log(`📅 [SYNC] Esportazione evento: ${appointment.date}T${startTime} (${timeZone}, offset: ${offsetMinutes}min) -> UTC: ${startDateTimeStr}`);
        
        const summary = service 
          ? `${client.firstName} ${client.lastName} - ${service.name}`
          : `Appuntamento con ${client.firstName} ${client.lastName}`;
        
        const description = appointment.notes 
          ? `Note: ${appointment.notes}\nCliente: ${client.firstName} ${client.lastName}\nTelefono: ${client.phone || 'Non disponibile'}\nEmail: ${client.email || 'Non disponibile'}`
          : `Cliente: ${client.firstName} ${client.lastName}\nTelefono: ${client.phone || 'Non disponibile'}\nEmail: ${client.email || 'Non disponibile'}`;
        
        // Usa il calendarId dell'utente, fallback a 'primary' se non configurato
        const targetCalendarId = user[0].googleCalendarId || 'primary';
        
        const response = await calendar.events.insert({
          calendarId: targetCalendarId,
          requestBody: {
            summary,
            description,
            start: { dateTime: startDateTimeStr },
            end: { dateTime: endDateTimeStr },
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
        console.log(`✅ [SYNC] Evento creato in Google Calendar (${targetCalendarId}): ${response.data.htmlLink}`);
        
        if (googleEventId) {
          // Registra il collegamento (usa upsert per evitare duplicati)
          await db.insert(googleCalendarEvents).values({
            appointmentId: appointment.id,
            googleEventId,
            syncStatus: 'synced',
            calendarId: targetCalendarId,
            lastSyncAt: new Date()
          }).onConflictDoUpdate({
            target: googleCalendarEvents.appointmentId,
            set: {
              googleEventId,
              syncStatus: 'synced',
              lastSyncAt: new Date(),
              updatedAt: new Date()
            }
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

    // 3. AGGIORNA eventi Google con modifiche da Replit
    console.log(`🔄 [SYNC] Step 3: Aggiornamento eventi Google con modifiche Replit...`);
    let updated = 0;
    try {
      // Ottieni tutti gli appuntamenti sincronizzati (includi calendarId per usare il calendario corretto)
      const syncedAppointments = await db.select({
        appointmentId: googleCalendarEvents.appointmentId,
        googleEventId: googleCalendarEvents.googleEventId,
        lastSyncAt: googleCalendarEvents.lastSyncAt,
        calendarId: googleCalendarEvents.calendarId
      })
      .from(googleCalendarEvents)
      .innerJoin(appointments, eq(appointments.id, googleCalendarEvents.appointmentId))
      .where(eq(appointments.userId, userId));
      
      // Per ogni appuntamento sincronizzato, aggiorna Google se necessario
      for (const syncedAppt of syncedAppointments) {
        try {
          const appointment = await db.select()
            .from(appointments)
            .where(eq(appointments.id, syncedAppt.appointmentId))
            .limit(1);
          
          if (!appointment.length) continue;
          const appt = appointment[0];
          
          // Ottieni client e service
          const clientData = await db.select().from(clients).where(eq(clients.id, appt.clientId)).limit(1);
          const serviceData = appt.serviceId 
            ? await db.select().from(services).where(eq(services.id, appt.serviceId)).limit(1)
            : [];
          
          if (!clientData.length) continue;
          const client = clientData[0];
          const service = serviceData.length ? serviceData[0] : null;
          
          // Prepara dati per Google
          const startTime = appt.startTime.length === 5 ? `${appt.startTime}:00` : appt.startTime;
          const endTime = appt.endTime.length === 5 ? `${appt.endTime}:00` : appt.endTime;
          
          function getTimezoneOffset(date: Date, tz: string): number {
            const formatter = new Intl.DateTimeFormat('en-US', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              hour12: false, timeZone: tz
            });
            const parts = formatter.formatToParts(date);
            const partsMap = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
            const localDate = new Date(
              parseInt(partsMap.year), parseInt(partsMap.month) - 1, parseInt(partsMap.day),
              parseInt(partsMap.hour), parseInt(partsMap.minute), parseInt(partsMap.second)
            );
            return (localDate.getTime() - date.getTime()) / (1000 * 60);
          }
          
          const refDate = new Date(`${appt.date}T12:00:00`);
          const offsetMinutes = getTimezoneOffset(refDate, timeZone);
          
          const localStartDateTime = new Date(`${appt.date}T${startTime}`);
          const localEndDateTime = new Date(`${appt.date}T${endTime}`);
          const utcStartDateTime = new Date(localStartDateTime.getTime() - offsetMinutes * 60 * 1000);
          const utcEndDateTime = new Date(localEndDateTime.getTime() - offsetMinutes * 60 * 1000);
          
          const startDateTimeStr = utcStartDateTime.toISOString();
          const endDateTimeStr = utcEndDateTime.toISOString();
          
          const summary = service 
            ? `${client.firstName} ${client.lastName} - ${service.name}`
            : `Appuntamento con ${client.firstName} ${client.lastName}`;
          
          const description = appt.notes 
            ? `Note: ${appt.notes}\nCliente: ${client.firstName} ${client.lastName}\nTelefono: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`
            : `Cliente: ${client.firstName} ${client.lastName}\nTelefono: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`;
          
          // Aggiorna evento su Google
          const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
          if (!user.length || !user[0].googleAuthToken) continue;
          
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
          
          // Usa il calendarId salvato nel tracking, fallback a 'primary' se non presente
          const targetCalendarId = syncedAppt.calendarId || 'primary';
          
          await calendar.events.update({
            calendarId: targetCalendarId,
            eventId: syncedAppt.googleEventId,
            requestBody: {
              summary,
              description,
              start: { dateTime: startDateTimeStr, timeZone: 'UTC' },
              end: { dateTime: endDateTimeStr, timeZone: 'UTC' },
            }
          });
          
          // Aggiorna timestamp sync
          await db.update(googleCalendarEvents)
            .set({ lastSyncAt: new Date(), updatedAt: new Date() })
            .where(eq(googleCalendarEvents.appointmentId, syncedAppt.appointmentId));
          
          updated++;
        } catch (updateError) {
          console.log(`⚠️ [SYNC] Errore aggiornamento evento ${syncedAppt.googleEventId}: ${String(updateError)}`);
        }
      }
      console.log(`🔄 [SYNC] Aggiornati ${updated} eventi su Google`);
    } catch (step3Error) {
      console.error(`❌ [SYNC] Errore Step 3:`, step3Error);
    }

    // 4. RILEVA eventi eliminati su Google e rimuovi appuntamenti orfani su Replit
    console.log(`🗑️ [SYNC] Step 4: Rilevamento eventi eliminati su Google...`);
    let deleted = 0;
    try {
      const deleteResult = await syncDeletedEvents(userId);
      deleted = deleteResult.deleted;
      if (deleteResult.errors.length > 0) {
        details.errors.push(...deleteResult.errors);
      }
      console.log(`🗑️ [SYNC] Eliminati ${deleted} appuntamenti orfani (evento Google rimosso)`);
    } catch (deleteError) {
      console.error(`❌ [SYNC] Errore rilevamento eliminazioni:`, deleteError);
      details.errors.push(`Errore rilevamento eliminazioni: ${String(deleteError)}`);
    }

    // 5. Aggiorna timestamp sync
    console.log(`📝 [SYNC] Step 5: Aggiornamento timestamp...`);
    await db.update(users).set({ lastGoogleSyncAt: new Date() }).where(eq(users.id, userId));

    const message = `Sincronizzazione completata: ${details.imported || 0} eventi importati, ${details.exported} appuntamenti esportati, ${deleted} eliminati`;
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
 * OTTIMIZZATO: Una sola chiamata API invece di N chiamate
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
    
    // Ottieni tutti gli appuntamenti sincronizzati con Google per questo utente (con JOIN)
    const syncedAppointments = await db.select({
      mappingId: googleCalendarEvents.id,
      appointmentId: googleCalendarEvents.appointmentId,
      googleEventId: googleCalendarEvents.googleEventId,
    })
    .from(googleCalendarEvents)
    .innerJoin(appointments, eq(appointments.id, googleCalendarEvents.appointmentId))
    .where(eq(appointments.userId, userId));
    
    if (syncedAppointments.length === 0) {
      return result;
    }
    
    // OTTIMIZZAZIONE: Una sola chiamata API per ottenere TUTTI gli eventi da Google
    // Invece di fare N chiamate (una per ogni appuntamento), facciamo UNA chiamata
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const oneYearAhead = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    let allGoogleEventIds = new Set<string>();
    let pageToken: string | undefined;
    let deletePageCount = 0;
    const MAX_DELETE_PAGES = 100; // Protezione contro loop infiniti
    
    console.log(`🔍 [SYNC DELETE] Utente ${userId}: Inizio scansione eventi Google su calendar: ${calendarId}`);
    console.log(`🔍 [SYNC DELETE] Range temporale: ${oneYearAgo.toISOString()} - ${oneYearAhead.toISOString()}`);
    console.log(`🔍 [SYNC DELETE] Appuntamenti sincronizzati da verificare: ${syncedAppointments.length}`);
    
    // DEBUG: Log tutti gli appuntamenti sincronizzati con i loro ID
    for (const sa of syncedAppointments) {
      console.log(`🔍 [SYNC DELETE] Tracciato: appt=${sa.appointmentId}, googleId=${sa.googleEventId}`);
    }
    
    // Pagina attraverso tutti gli eventi Google con protezione MAX_PAGES
    do {
      const eventsResponse = await calendar.events.list({
        calendarId,
        timeMin: oneYearAgo.toISOString(),
        timeMax: oneYearAhead.toISOString(),
        maxResults: 250, // CORRETTO: max 250 per Google Calendar API
        singleEvents: true,
        showDeleted: false,
        pageToken
      });
      
      if (eventsResponse.data.items) {
        console.log(`📄 [SYNC DELETE] Pagina ${deletePageCount + 1}: ${eventsResponse.data.items.length} eventi trovati`);
        for (const event of eventsResponse.data.items) {
          // DEBUG: Log eventi con ID lungo (formato base32hex come gli eventi creati dal gestionale)
          if (event.id && event.id.length > 50) {
            console.log(`🔍 [SYNC DELETE] Evento lungo trovato: id=${event.id.substring(0,20)}..., status=${event.status}, summary=${event.summary?.substring(0,30) || 'NO SUMMARY'}`);
          }
          // FIX: Ignora eventi cancellati - hanno status='cancelled' anche con showDeleted:false
          if (event.id && event.status !== 'cancelled') {
            allGoogleEventIds.add(event.id);
          } else if (event.id && event.status === 'cancelled') {
            console.log(`🗑️ [SYNC DELETE] Evento ${event.id} ha status='cancelled', sarà eliminato`);
          }
        }
      }
      pageToken = eventsResponse.data.nextPageToken || undefined;
      deletePageCount++;
      
      // Protezione MAX_PAGES contro loop infiniti
      if (deletePageCount >= MAX_DELETE_PAGES) {
        console.warn(`⚠️ [SYNC DELETE] Raggiunto limite MAX_DELETE_PAGES (${MAX_DELETE_PAGES}), interruzione paginazione`);
        break;
      }
    } while (pageToken);
    
    console.log(`🔍 [SYNC DELETE] Utente ${userId}: ${syncedAppointments.length} appuntamenti sincronizzati, ${allGoogleEventIds.size} eventi su Google (${deletePageCount} pagine)`);
    
    // DEBUG: Log i primi eventi per verificare formato ID
    const eventIdSample = Array.from(allGoogleEventIds).slice(0, 5);
    console.log(`🔍 [SYNC DELETE] Esempio ID eventi Google: ${JSON.stringify(eventIdSample)}`);
    
    // DEBUG: Log gli appuntamenti sincronizzati per confronto
    const syncedSample = syncedAppointments.slice(0, 5).map(s => s.googleEventId);
    console.log(`🔍 [SYNC DELETE] Esempio ID appuntamenti tracciati: ${JSON.stringify(syncedSample)}`);
    
    // Trova appuntamenti il cui evento Google non esiste più
    for (const synced of syncedAppointments) {
      if (!allGoogleEventIds.has(synced.googleEventId)) {
        console.log(`🗑️ [SYNC DELETE] Evento ${synced.googleEventId} non trovato su Google, rimuovo appuntamento ${synced.appointmentId}`);
        
        try {
          // Elimina l'appuntamento dal gestionale
          await db.delete(appointments).where(eq(appointments.id, synced.appointmentId));
          
          // Elimina il record di sincronizzazione
          await db.delete(googleCalendarEvents).where(eq(googleCalendarEvents.id, synced.mappingId));
          
          result.deleted++;
          console.log(`✅ [SYNC DELETE] Appuntamento ${synced.appointmentId} eliminato (evento Google rimosso)`);
        } catch (deleteError) {
          result.errors.push(`Errore eliminazione appuntamento ${synced.appointmentId}: ${String(deleteError)}`);
        }
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
