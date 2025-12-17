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
    
    
    // NUOVO: Ottieni TUTTI i calendari dell'utente (primario + secondari)
    const calendarListResponse = await calendar.calendarList.list();
    const allCalendars = calendarListResponse.data.items || [];
    
    // Filtra solo calendari con accesso in lettura (owner, writer, reader)
    const accessibleCalendars = allCalendars.filter(cal => 
      cal.id && cal.accessRole && ['owner', 'writer', 'reader'].includes(cal.accessRole)
    );
    
    console.log(`📅 [IMPORT] Trovati ${allCalendars.length} calendari totali, ${accessibleCalendars.length} accessibili:`);
    accessibleCalendars.forEach(cal => {
      console.log(`   - "${cal.summary}" (${cal.id?.substring(0, 30)}...) - accesso: ${cal.accessRole}`);
    });
    
    // PAGINAZIONE: Raccogli TUTTI gli eventi DA TUTTI I CALENDARI
    const MAX_PAGES = 100; // Protezione contro loop infiniti per calendario
    interface EventWithCalendar extends calendar_v3.Schema$Event {
      _sourceCalendarId?: string;
      _sourceCalendarName?: string;
    }
    let allEvents: EventWithCalendar[] = [];
    
    // Itera su ogni calendario
    for (const cal of accessibleCalendars) {
      if (!cal.id) continue;
      
      let pageToken: string | undefined = undefined;
      let prevPageToken: string | undefined = undefined;
      let pageCount = 0;
      let calendarEventCount = 0;
      
      console.log(`📆 [IMPORT] Lettura calendario: "${cal.summary}" (${cal.id})`);
      
      do {
        try {
          const eventsResponse = await calendar.events.list({
            calendarId: cal.id,
            timeMin: thirtyDaysAgo.toISOString(),
            timeMax: oneYearAhead.toISOString(),
            maxResults: 250,
            singleEvents: true,
            orderBy: 'startTime',
            showDeleted: true,
            pageToken: pageToken
          });
          
          if (eventsResponse.data.items) {
            calendarEventCount += eventsResponse.data.items.length;
            // Aggiungi metadati sul calendario di origine
            const eventsWithSource = eventsResponse.data.items.map((event: calendar_v3.Schema$Event) => ({
              ...event,
              _sourceCalendarId: cal.id,
              _sourceCalendarName: cal.summary || 'Senza nome'
            }));
            allEvents = [...allEvents, ...eventsWithSource];
          }
          
          prevPageToken = pageToken;
          pageToken = eventsResponse.data.nextPageToken || undefined;
          pageCount++;
          
          // Protezione contro loop infiniti
          if (pageToken && pageToken === prevPageToken) break;
          if (pageCount >= MAX_PAGES) break;
          
        } catch (calError) {
          console.error(`❌ [IMPORT] Errore lettura calendario ${cal.summary}:`, calError);
          result.errors.push(`Errore lettura calendario ${cal.summary}: ${String(calError)}`);
          break;
        }
      } while (pageToken);
      
    }

    if (allEvents.length === 0) {
      console.log(`📭 [IMPORT] Nessun evento trovato nei calendari`);
      return result;
    }

    console.log(`📋 [IMPORT] Trovati ${allEvents.length} eventi totali da processare`);

    // Processa ogni evento Google
    for (const googleEvent of allEvents) {
      // Log OGNI evento per debug
      const eventInfo = `"${googleEvent.summary || 'Senza titolo'}" (${googleEvent.start?.dateTime || googleEvent.start?.date || 'N/A'})`;
      console.log(`🔍 [IMPORT] Processando evento: ${eventInfo} - ID: ${googleEvent.id?.substring(0, 20)}...`);
      
      if (!googleEvent.id) {
        console.log(`⏭️ [IMPORT] Skip: evento senza ID`);
        continue;
      }
      
      // GESTIONE EVENTI CANCELLATI: Se l'evento è stato cancellato su Google, elimina l'appuntamento locale
      if (googleEvent.status === 'cancelled') {
        
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
              
              result.imported++;
            } else {
            }
          }
        } catch (deleteError) {
          console.error(`❌ [IMPORT] Errore eliminazione appuntamento per evento ${googleEvent.id}:`, deleteError);
          result.errors.push(`Errore eliminazione evento cancellato ${googleEvent.id}: ${String(deleteError)}`);
        }
        
        continue; // Passa al prossimo evento
      }
      
      if (!googleEvent.start?.dateTime) {
        console.log(`⏭️ [IMPORT] Skip: evento senza dateTime (all-day event?) - ${eventInfo}`);
        continue;
      }
      
      try {
        // Controlla se questo evento è già collegato a un appuntamento (tabella tracking)
        const existing = await db.select()
          .from(googleCalendarEvents)
          .where(eq(googleCalendarEvents.googleEventId, googleEvent.id));
        
        if (existing.length > 0) {
          // Evento già tracciato - AGGIORNA l'appuntamento con i dati da Google
          
          // Recupera l'appuntamento collegato
          const linkedAppointment = await db.select()
            .from(appointments)
            .where(eq(appointments.id, existing[0].appointmentId))
            .limit(1);
          
          // GESTIONE TRACKING ORFANI: se l'appuntamento è stato eliminato ma il tracking esiste ancora
          if (linkedAppointment.length === 0) {
            console.log(`🧹 [IMPORT] Tracking orfano trovato, pulizia e reimportazione... - ${eventInfo}`);
            await db.delete(googleCalendarEvents)
              .where(eq(googleCalendarEvents.id, existing[0].id));
            // NON fare continue - lascia che l'evento venga reimportato normalmente
          } else {
            console.log(`🔄 [IMPORT] Evento già tracciato, aggiornamento... - ${eventInfo}`);
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
              }
            } else {
            }
            continue; // Evento tracciato e appuntamento esistente - passa al prossimo
          }
          // Se siamo qui, il tracking era orfano e lo abbiamo eliminato - continua con l'importazione normale
        }
        
        // IMPORTANTE: Controlla anche se esiste già un appuntamento con lo stesso google_event_id
        const existingAppointment = await db.select()
          .from(appointments)
          .where(and(
            eq(appointments.userId, userId),
            eq(appointments.googleEventId, googleEvent.id)
          ));
        
        if (existingAppointment.length > 0) {
          console.log(`⏭️ [IMPORT] Skip: appuntamento già esiste con stesso googleEventId - ${eventInfo}`);
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
        
        
        const duplicateCheck = await db.select()
          .from(appointments)
          .where(and(
            eq(appointments.userId, userId),
            eq(appointments.date, eventDate),
            eq(appointments.startTime, eventStartTime)
          ));
        
        if (duplicateCheck.length > 0) {
          console.log(`⏭️ [IMPORT] Skip: esiste già appuntamento a ${eventDate} ${eventStartTime} - ${eventInfo}`);
          continue;
        }
        
        console.log(`✅ [IMPORT] Creazione nuovo appuntamento: ${eventInfo}`)
        
        
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
        
        // 2. Se non trovato, cerca o crea cliente con titolo originale dell'evento
        // IMPORTANTE: Usa il titolo originale come firstName così se il guard fallisce,
        // il titolo su Google rimarrà simile all'originale
        const originalEventTitle = googleEvent.summary || 'Evento Google';
        
        if (!clientId) {
          // Cerca cliente con lo stesso titolo dell'evento
          const existingClients = await db.select()
            .from(clients)
            .where(and(
              eq(clients.userId, userId), 
              eq(clients.firstName, originalEventTitle),
              eq(clients.lastName, 'Google Calendar')
            ));
          
          if (existingClients.length > 0) {
            clientId = existingClients[0].id;
          } else {
            // Crea cliente con titolo originale
            const newClient = await db.insert(clients).values({
              userId,
              firstName: originalEventTitle,
              lastName: 'Google Calendar',
              email: `google-${Date.now()}@imported.local`,
              phone: '',
              notes: `Cliente creato automaticamente per evento Google Calendar: ${originalEventTitle}`
            }).returning();
            
            if (newClient.length > 0) {
              clientId = newClient[0].id;
            }
          }
        }

        if (!clientId) {
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
          } else {
            // Fallback a servizio default se creazione fallisce
            const defaultService = await db.select().from(services).where(eq(services.userId, userId)).limit(1);
            serviceId = defaultService.length > 0 ? defaultService[0].id : 1;
          }
        }
        

        // Determina se siamo l'organizzatore dell'evento
        // Se l'organizzatore è diverso dal nostro account, siamo invitati
        const isOrganizerSelf: boolean = !googleEvent.organizer?.email || 
          googleEvent.organizer?.self === true ||
          Boolean(user[0].email && googleEvent.organizer?.email === user[0].email);
        
        // Crea l'appuntamento usando storage per rispettare lo schema
        const newAppointmentData = {
          userId,
          clientId,
          serviceId,
          date: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
          status: 'confirmed' as const,
          notes: `📅 ${eventTitle}${googleEvent.description ? '\n' + googleEvent.description : ''}`,
          importedFromGoogle: true,
          googleEventId: googleEvent.id,
          googleOrganizerSelf: isOrganizerSelf,
          googleEventTitle: eventTitle // Salva il titolo originale per la visualizzazione
        };
        
        const newAppointment = await db.insert(appointments).values(newAppointmentData).returning();

        // Registra il collegamento (usa upsert per evitare duplicati)
        // Usa il calendarId sorgente dell'evento per poterlo aggiornare/eliminare correttamente
        const sourceCalendarId = (googleEvent as any)._sourceCalendarId || 'primary';
        const sourceCalendarName = (googleEvent as any)._sourceCalendarName || '';
        
        if (newAppointment.length > 0) {
          await db.insert(googleCalendarEvents).values({
            appointmentId: newAppointment[0].id,
            googleEventId: googleEvent.id,
            syncStatus: 'synced',
            calendarId: sourceCalendarId,
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
    
    // 1. IMPORTA eventi da Google Calendar
    try {
      const importResult = await importGoogleCalendarEvents(userId, timeZone);
      details.imported = importResult.imported;
      if (importResult.errors.length > 0) {
        details.errors.push(...importResult.errors);
      }
    } catch (importError) {
      console.error(`❌ [SYNC] Errore importazione:`, importError);
      details.errors.push(`Errore importazione: ${String(importError)}`);
    }

    // 2. ESPORTA appuntamenti nuovi verso Google
    let newAppointments: any[] = [];
    try {
      // Query SEMPLICE: seleziona solo appuntamenti dell'utente
      const allAppointments = await db.select()
        .from(appointments)
        .where(eq(appointments.userId, userId));
      
      
      // Filtra manualmente gli appuntamenti non sincronizzati
      // synced dovrebbe essere false o NULL per gli appuntamenti nuovi
      // IMPORTANTE: Escludi gli appuntamenti IMPORTATI da Google - non devono essere ri-esportati!
      newAppointments = allAppointments.filter(a => !a.synced && !a.importedFromGoogle);
    } catch (queryError) {
      console.error(`❌ [SYNC] Errore query appuntamenti:`, queryError);
      details.errors.push(`Errore query appuntamenti: ${String(queryError)}`);
      newAppointments = [];
    }

    for (const appointment of newAppointments) {
      try {
        
        // CONTROLLO DUPLICATI: verifica se l'appuntamento è già stato esportato
        const existingExport = await db.select()
          .from(googleCalendarEvents)
          .where(eq(googleCalendarEvents.appointmentId, appointment.id))
          .limit(1);
        
        if (existingExport.length > 0) {
          // Assicurati che il flag synced sia impostato
          await db.update(appointments).set({ synced: true }).where(eq(appointments.id, appointment.id));
          continue;
        }
        
        // Crea direttamente l'evento in Google Calendar usando il token dell'utente
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user.length || !user[0].googleAuthToken) {
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
        const getTimezoneOffset = (date: Date, tz: string): number => {
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
        };
        
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
        }
      } catch (error) {
        console.error(`❌ [SYNC] Errore esportazione appuntamento ${appointment.id}:`, error);
        details.errors.push(`Errore esportazione appuntamento ${appointment.id}: ${String(error)}`);
      }
    }

    // 3. PRIMA rileva eventi eliminati su Google (per evitare loop di ricreazione)
    let deleted = 0;
    try {
      const deleteResult = await syncDeletedEvents(userId);
      deleted = deleteResult.deleted;
      if (deleteResult.errors.length > 0) {
        details.errors.push(...deleteResult.errors);
      }
    } catch (deleteError) {
      console.error(`❌ [SYNC] Errore rilevamento eliminazioni:`, deleteError);
      details.errors.push(`Errore rilevamento eliminazioni: ${String(deleteError)}`);
    }

    // 4. AGGIORNA eventi Google con modifiche da Replit (DOPO aver gestito le eliminazioni)
    let updated = 0;
    try {
      // Ottieni tutti gli appuntamenti sincronizzati (includi calendarId per usare il calendario corretto)
      const syncedAppointments = await db.select({
        mappingId: googleCalendarEvents.id,
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
          
          // IMPORTANTE: NON aggiornare eventi IMPORTATI da Google Calendar
          // Questi eventi sono gestiti dall'utente direttamente su Google
          // Aggiornare li riscriverebbe con titoli errati ("Evento Google Calendar...")
          const importedValue = appt.importedFromGoogle as any;
          const isImported = importedValue === true || 
                            String(importedValue) === 't' || 
                            String(importedValue) === 'true' || 
                            String(importedValue) === '1' ||
                            Boolean(importedValue);
          
          console.log(`🔍 [SYNC DEBUG] Appuntamento ${appt.id}: importedFromGoogle = "${importedValue}" (type: ${typeof importedValue}) → isImported: ${isImported}`);
          
          if (isImported) {
            console.log(`⏭️ [SYNC] Skip update per appuntamento ${appt.id} - importato da Google Calendar`);
            continue;
          }
          
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
          
          const getTimezoneOffset = (date: Date, tz: string): number => {
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
          };
          
          const refDate = new Date(`${appt.date}T12:00:00`);
          const offsetMinutes = getTimezoneOffset(refDate, timeZone);
          
          const localStartDateTime = new Date(`${appt.date}T${startTime}`);
          const localEndDateTime = new Date(`${appt.date}T${endTime}`);
          const utcStartDateTime = new Date(localStartDateTime.getTime() - offsetMinutes * 60 * 1000);
          const utcEndDateTime = new Date(localEndDateTime.getTime() - offsetMinutes * 60 * 1000);
          
          const startDateTimeStr = utcStartDateTime.toISOString();
          const endDateTimeStr = utcEndDateTime.toISOString();
          
          // FALLBACK: Se il client è "Evento Google Calendar" (placeholder vecchio),
          // estrai il titolo originale dalle note (formato: 📅 TitoloOriginale)
          let summary: string;
          if (client.firstName === 'Evento' && client.lastName === 'Google Calendar') {
            // Estrai titolo dalle note
            const notesMatch = appt.notes?.match(/📅\s*([^\n]+)/);
            const originalTitle = notesMatch ? notesMatch[1].trim() : 'Evento Google';
            summary = originalTitle;
            console.log(`📌 [SYNC] Usando titolo originale dalle note: "${originalTitle}"`);
          } else {
            summary = service 
              ? `${client.firstName} ${client.lastName} - ${service.name}`
              : `Appuntamento con ${client.firstName} ${client.lastName}`;
          }
          
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
        } catch (updateError: any) {
          const errorCode = updateError?.code || updateError?.response?.status;
          
          // Se evento non esiste più su Google (404/410), elimina appuntamento locale
          if (errorCode === 404 || errorCode === 410) {
            try {
              await db.delete(appointments).where(eq(appointments.id, syncedAppt.appointmentId));
              await db.delete(googleCalendarEvents).where(eq(googleCalendarEvents.id, syncedAppt.mappingId));
              deleted++;
            } catch (delError) {
              console.error(`❌ [SYNC] Errore eliminazione appuntamento ${syncedAppt.appointmentId}:`, delError);
            }
          } else {
          }
        }
      }
    } catch (step4Error) {
      console.error(`❌ [SYNC] Errore Step 4:`, step4Error);
    }

    // 5. Aggiorna timestamp sync
    await db.update(users).set({ lastGoogleSyncAt: new Date() }).where(eq(users.id, userId));

    const message = `Sincronizzazione completata: ${details.imported || 0} eventi importati, ${details.exported} appuntamenti esportati, ${deleted} eliminati`;
    
    return { success: true, message, details };
  } catch (error) {
    const message = `Errore sincronizzazione: ${String(error)}`;
    console.error(`❌ ${message}`, error);
    return { success: false, message, details };
  }
}

/**
 * Rileva eventi eliminati da Google Calendar e rimuove gli appuntamenti corrispondenti
 * NUOVO APPROCCIO: Verifica diretta di ogni evento con chiamata GET
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
    // IMPORTANTE: include calendarId per verificare nel calendario corretto (primario o secondario)
    const syncedAppointments = await db.select({
      mappingId: googleCalendarEvents.id,
      appointmentId: googleCalendarEvents.appointmentId,
      googleEventId: googleCalendarEvents.googleEventId,
      calendarId: googleCalendarEvents.calendarId,
    })
    .from(googleCalendarEvents)
    .innerJoin(appointments, eq(appointments.id, googleCalendarEvents.appointmentId))
    .where(eq(appointments.userId, userId));
    
    if (syncedAppointments.length === 0) {
      return result;
    }
    
    
    // NUOVO APPROCCIO: Verifica OGNI evento direttamente con GET
    // Questo intercetta sia eventi cancellati che eventi non più esistenti
    for (const synced of syncedAppointments) {
      if (!synced.googleEventId) continue;
      
      try {
        // Prova a ottenere l'evento direttamente da Google
        // Usa il calendarId specifico salvato nel mapping (supporta calendari secondari)
        const eventCalendarId = synced.calendarId || calendarId;
        const eventResponse = await calendar.events.get({
          calendarId: eventCalendarId,
          eventId: synced.googleEventId,
        });
        
        // Log dettagliato per debug
        const eventStatus = eventResponse.data.status;
        const eventSummary = eventResponse.data.summary || 'no-summary';
        
        // Se l'evento esiste, controlla lo status
        if (eventResponse.data.status === 'cancelled') {
          
          await db.delete(appointments).where(eq(appointments.id, synced.appointmentId));
          await db.delete(googleCalendarEvents).where(eq(googleCalendarEvents.id, synced.mappingId));
          result.deleted++;
        }
        // Se status è 'confirmed' o altro, l'evento esiste ancora - non fare nulla
        
      } catch (getError: any) {
        const errorCode = getError?.code || getError?.response?.status;
        
        // Errore 404 = evento non esiste più su Google
        // Errore 410 = evento ricorrente cancellato (Gone)
        if (errorCode === 404 || errorCode === 410) {
          
          try {
            await db.delete(appointments).where(eq(appointments.id, synced.appointmentId));
            await db.delete(googleCalendarEvents).where(eq(googleCalendarEvents.id, synced.mappingId));
            result.deleted++;
          } catch (deleteError) {
            result.errors.push(`Errore eliminazione appuntamento ${synced.appointmentId}: ${String(deleteError)}`);
          }
        } else {
          // Altri errori - log dettagliato per debug
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
