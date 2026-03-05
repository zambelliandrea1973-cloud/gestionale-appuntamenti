import { db } from '../db';
import { users, appointments, googleCalendarEvents, clients, services, googleCalendarSyncTokens } from '../../shared/schema';
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
    
    console.log(`📅 [IMPORT] Trovati ${allCalendars.length} calendari totali, ${accessibleCalendars.length} accessibili`);
    
    // ========== SINCRONIZZAZIONE INCREMENTALE CON SYNC TOKEN ==========
    // Carica i syncToken salvati per questo utente
    const savedSyncTokens = await db.select()
      .from(googleCalendarSyncTokens)
      .where(eq(googleCalendarSyncTokens.userId, userId));
    
    const syncTokenMap = new Map(savedSyncTokens.map(t => [t.calendarId, t]));
    
    interface EventWithCalendar extends calendar_v3.Schema$Event {
      _sourceCalendarId?: string;
      _sourceCalendarName?: string;
    }
    let allEvents: EventWithCalendar[] = [];
    let isIncrementalSync = false;
    
    // Itera su ogni calendario usando syncToken se disponibile
    for (const cal of accessibleCalendars) {
      if (!cal.id) continue;
      
      const savedToken = syncTokenMap.get(cal.id);
      let useSyncToken = savedToken?.syncToken || null;
      let calendarEventCount = 0;
      let pageToken: string | undefined = undefined;
      let newSyncToken: string | undefined = undefined;
      
      // Prova prima sync incrementale, poi fallback a full sync
      let needsFullSync = !useSyncToken;
      
      if (useSyncToken) {
        console.log(`⚡ [IMPORT] Sync incrementale per "${cal.summary}"`);
        isIncrementalSync = true;
        
        try {
          // Sync incrementale - recupera solo modifiche
          const eventsResponse = await calendar.events.list({
            calendarId: cal.id,
            syncToken: useSyncToken,
            maxResults: 250,
            showDeleted: true
          });
          
          if (eventsResponse.data.items) {
            calendarEventCount = eventsResponse.data.items.length;
            const eventsWithSource = eventsResponse.data.items.map((event: calendar_v3.Schema$Event) => ({
              ...event,
              _sourceCalendarId: cal.id,
              _sourceCalendarName: cal.summary || 'Senza nome'
            }));
            allEvents = [...allEvents, ...eventsWithSource];
          }
          
          newSyncToken = eventsResponse.data.nextSyncToken || undefined;
          
          // Gestisci paginazione se presente
          pageToken = eventsResponse.data.nextPageToken || undefined;
          while (pageToken) {
            const nextPage = await calendar.events.list({
              calendarId: cal.id,
              syncToken: useSyncToken,
              pageToken: pageToken,
              maxResults: 250,
              showDeleted: true
            });
            
            if (nextPage.data.items) {
              calendarEventCount += nextPage.data.items.length;
              const eventsWithSource = nextPage.data.items.map((event: calendar_v3.Schema$Event) => ({
                ...event,
                _sourceCalendarId: cal.id,
                _sourceCalendarName: cal.summary || 'Senza nome'
              }));
              allEvents = [...allEvents, ...eventsWithSource];
            }
            
            pageToken = nextPage.data.nextPageToken || undefined;
            newSyncToken = nextPage.data.nextSyncToken || newSyncToken;
          }
          
          console.log(`   ✓ ${calendarEventCount} modifiche trovate`);
          
        } catch (syncError: any) {
          // Token invalido (410) - necessario full sync
          if (syncError?.code === 410 || syncError?.response?.status === 410) {
            console.log(`🔄 [IMPORT] SyncToken invalido per "${cal.summary}", eseguo full sync...`);
            needsFullSync = true;
          } else {
            console.error(`❌ [IMPORT] Errore sync calendario ${cal.summary}:`, syncError);
            result.errors.push(`Errore sync calendario ${cal.summary}: ${String(syncError)}`);
            continue;
          }
        }
      }
      
      // Full sync se necessario (primo sync o token invalido)
      if (needsFullSync) {
        console.log(`📆 [IMPORT] Full sync per "${cal.summary}"`);
        calendarEventCount = 0;
        pageToken = undefined;
        
        try {
          do {
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
              const eventsWithSource = eventsResponse.data.items.map((event: calendar_v3.Schema$Event) => ({
                ...event,
                _sourceCalendarId: cal.id,
                _sourceCalendarName: cal.summary || 'Senza nome'
              }));
              allEvents = [...allEvents, ...eventsWithSource];
            }
            
            pageToken = eventsResponse.data.nextPageToken || undefined;
            newSyncToken = eventsResponse.data.nextSyncToken || newSyncToken;
            
          } while (pageToken);
          
          console.log(`   ✓ ${calendarEventCount} eventi caricati`);
          
        } catch (calError) {
          console.error(`❌ [IMPORT] Errore full sync ${cal.summary}:`, calError);
          result.errors.push(`Errore lettura calendario ${cal.summary}: ${String(calError)}`);
          continue;
        }
      }
      
      // Salva il nuovo syncToken per prossime sync incrementali
      if (newSyncToken && cal.id) {
        try {
          if (savedToken) {
            await db.update(googleCalendarSyncTokens)
              .set({
                syncToken: newSyncToken,
                calendarName: cal.summary || null,
                lastIncrementalSyncAt: new Date(),
                eventCount: calendarEventCount,
                updatedAt: new Date()
              })
              .where(eq(googleCalendarSyncTokens.id, savedToken.id));
          } else {
            await db.insert(googleCalendarSyncTokens).values({
              userId,
              calendarId: cal.id,
              calendarName: cal.summary || null,
              syncToken: newSyncToken,
              lastFullSyncAt: new Date(),
              eventCount: calendarEventCount
            });
          }
        } catch (tokenError) {
          console.error(`⚠️ [IMPORT] Errore salvataggio syncToken:`, tokenError);
        }
      }
    }
    
    // Log tipo di sync eseguita
    if (isIncrementalSync) {
      console.log(`⚡ [IMPORT] Sync incrementale completata: ${allEvents.length} modifiche da processare`);
    } else {
      console.log(`📋 [IMPORT] Full sync completata: ${allEvents.length} eventi da processare`);
    }

    if (allEvents.length === 0) {
      console.log(`📭 [IMPORT] Nessun evento trovato nei calendari`);
      return result;
    }

    console.log(`📋 [IMPORT] Trovati ${allEvents.length} eventi totali da processare`);

    // ========== OTTIMIZZAZIONE: PRECARICAMENTO DATI IN MEMORIA ==========
    const preloadStart = Date.now();
    
    // 1. Precarica TUTTI i tracking esistenti per questo utente (usando appointment_id per join)
    const allUserAppointmentIds = await db.select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.userId, userId));
    const appointmentIdSet = new Set(allUserAppointmentIds.map(a => a.id));
    
    const allTrackingRecords = await db.select()
      .from(googleCalendarEvents);
    
    // Filtra solo i tracking che appartengono a questo utente
    const userTrackingRecords = allTrackingRecords.filter(t => appointmentIdSet.has(t.appointmentId));
    
    // Mappa: googleEventId -> tracking record
    const trackingByGoogleId = new Map(userTrackingRecords.map(t => [t.googleEventId, t]));
    // Mappa: appointmentId -> tracking record
    const trackingByAppointmentId = new Map(userTrackingRecords.map(t => [t.appointmentId, t]));
    
    // 2. Precarica TUTTI gli appuntamenti dell'utente
    const allUserAppointments = await db.select()
      .from(appointments)
      .where(eq(appointments.userId, userId));
    
    // Mappa: googleEventId -> appointment
    const appointmentsByGoogleId = new Map(
      allUserAppointments.filter(a => a.googleEventId).map(a => [a.googleEventId!, a])
    );
    // Mappa: id -> appointment
    const appointmentsById = new Map(allUserAppointments.map(a => [a.id, a]));
    // Mappa: "date|startTime" -> appointment[]
    const appointmentsByDateSlot = new Map<string, typeof allUserAppointments>();
    for (const appt of allUserAppointments) {
      const key = `${appt.date}|${appt.startTime}`;
      if (!appointmentsByDateSlot.has(key)) {
        appointmentsByDateSlot.set(key, []);
      }
      appointmentsByDateSlot.get(key)!.push(appt);
    }
    
    // 3. Precarica TUTTI i clienti dell'utente
    const allUserClients = await db.select()
      .from(clients)
      .where(eq(clients.userId, userId));
    
    // Mappa: email -> client
    const clientsByEmail = new Map(
      allUserClients.filter(c => c.email).map(c => [c.email!, c])
    );
    // Mappa: "firstName|lastName" -> client
    const clientsByName = new Map(
      allUserClients.map(c => [`${c.firstName}|${c.lastName}`, c])
    );
    
    // 4. Precarica/Trova il servizio "Promemoria Google Calendar"
    let promemoriaServiceId: number | null = null;
    const promemoriaService = await db.select()
      .from(services)
      .where(and(
        eq(services.userId, userId),
        eq(services.name, 'Promemoria Google Calendar')
      ))
      .limit(1);
    
    if (promemoriaService.length > 0) {
      promemoriaServiceId = promemoriaService[0].id;
    } else {
      // Crea il servizio una sola volta
      const newService = await db.insert(services).values({
        userId,
        name: 'Promemoria Google Calendar',
        duration: 60,
        price: 0,
        color: '#6B7280'
      }).returning();
      if (newService.length > 0) {
        promemoriaServiceId = newService[0].id;
      }
    }
    
    // Fallback se creazione fallisce
    if (!promemoriaServiceId) {
      const defaultService = await db.select().from(services).where(eq(services.userId, userId)).limit(1);
      promemoriaServiceId = defaultService.length > 0 ? defaultService[0].id : 1;
    }
    
    // 5. Crea formatter una sola volta (invece di uno per evento)
    const userFormatter = new Intl.DateTimeFormat('sv-SE', { 
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    
    console.log(`⚡ [IMPORT] Precaricamento completato in ${Date.now() - preloadStart}ms`);
    console.log(`   - Tracking: ${trackingByGoogleId.size}, Appuntamenti: ${allUserAppointments.length}, Clienti: ${allUserClients.length}`);
    
    // ========== FINE PRECARICAMENTO ==========

    // Processa ogni evento Google (ora con lookup O(1) invece di query DB)
    for (const googleEvent of allEvents) {
      if (!googleEvent.id) continue;
      
      const eventInfo = `"${googleEvent.summary || 'Senza titolo'}"`;
      
      // GESTIONE EVENTI CANCELLATI
      if (googleEvent.status === 'cancelled') {
        try {
          const trackedEvent = trackingByGoogleId.get(googleEvent.id);
          
          if (trackedEvent) {
            const appointmentId = trackedEvent.appointmentId;
            
            await db.delete(googleCalendarEvents)
              .where(eq(googleCalendarEvents.googleEventId, googleEvent.id));
            
            await db.delete(appointments)
              .where(eq(appointments.id, appointmentId));
            
            // Aggiorna cache locale
            trackingByGoogleId.delete(googleEvent.id);
            appointmentsById.delete(appointmentId);
            
            result.imported++;
          } else {
            const directAppointment = appointmentsByGoogleId.get(googleEvent.id);
            
            if (directAppointment) {
              await db.delete(appointments)
                .where(eq(appointments.id, directAppointment.id));
              
              appointmentsByGoogleId.delete(googleEvent.id);
              appointmentsById.delete(directAppointment.id);
              
              result.imported++;
            }
          }
        } catch (deleteError) {
          result.errors.push(`Errore eliminazione evento ${googleEvent.id}: ${String(deleteError)}`);
        }
        continue;
      }
      
      if (!googleEvent.start?.dateTime) continue;
      
      try {
        // Lookup O(1) invece di query DB
        const existingTracking = trackingByGoogleId.get(googleEvent.id);
        
        if (existingTracking) {
          const linkedAppointment = appointmentsById.get(existingTracking.appointmentId);
          
          if (!linkedAppointment) {
            // Tracking orfano - elimina
            await db.delete(googleCalendarEvents)
              .where(eq(googleCalendarEvents.id, existingTracking.id));
            trackingByGoogleId.delete(googleEvent.id);
          } else {
            // Aggiorna se necessario
            const googleStartDateTime = googleEvent.start.dateTime;
            const googleEndDateTime = googleEvent.end?.dateTime || googleStartDateTime;
            
            const startDateObj = new Date(googleStartDateTime);
            const endDateObj = new Date(googleEndDateTime);
            
            const startParts = userFormatter.format(startDateObj).split(' ');
            const endParts = userFormatter.format(endDateObj).split(' ');
            
            const newDate = startParts[0];
            const newStartTime = startParts[1].substring(0, 5);
            const newEndTime = endParts[1].substring(0, 5);
            
            const hasTimeChanges = linkedAppointment.date !== newDate || 
                                   linkedAppointment.startTime !== newStartTime || 
                                   linkedAppointment.endTime !== newEndTime;
            
            if (hasTimeChanges) {
              // Controllo conflitti usando la mappa
              const slotKey = `${newDate}|${newStartTime}`;
              const existingAtSlot = appointmentsByDateSlot.get(slotKey) || [];
              const hasConflict = existingAtSlot.some(a => a.id !== linkedAppointment.id);
              
              if (hasConflict) {
                result.errors.push(`Conflitto orario: ${newDate} ${newStartTime}`);
                await db.update(googleCalendarEvents)
                  .set({ syncStatus: 'conflict', updatedAt: new Date() })
                  .where(eq(googleCalendarEvents.id, existingTracking.id));
              } else {
                await db.update(appointments)
                  .set({ date: newDate, startTime: newStartTime, endTime: newEndTime })
                  .where(eq(appointments.id, linkedAppointment.id));
                
                await db.update(googleCalendarEvents)
                  .set({ lastSyncAt: new Date(), updatedAt: new Date() })
                  .where(eq(googleCalendarEvents.id, existingTracking.id));
                
                result.imported++;
              }
            }
            continue;
          }
        }
        
        // Controlla duplicato per googleEventId (O(1))
        if (appointmentsByGoogleId.has(googleEvent.id)) continue;
        
        // Converti datetime
        const googleStartDateTime = googleEvent.start.dateTime;
        const googleEndDateTime = googleEvent.end?.dateTime || googleStartDateTime;
        
        const startDateObj = new Date(googleStartDateTime);
        const endDateObj = new Date(googleEndDateTime);
        
        const startParts = userFormatter.format(startDateObj).split(' ');
        const endParts = userFormatter.format(endDateObj).split(' ');
        
        const eventDate = startParts[0];
        const eventStartTime = startParts[1].substring(0, 5);
        const eventEndTime = endParts[1].substring(0, 5);
        
        // Controllo duplicato per slot (O(1))
        const slotKey = `${eventDate}|${eventStartTime}`;
        if (appointmentsByDateSlot.has(slotKey) && appointmentsByDateSlot.get(slotKey)!.length > 0) {
          continue;
        }
        
        // USA UN SINGOLO CLIENTE PLACEHOLDER PER TUTTI GLI EVENTI GOOGLE
        // Non creiamo clienti fittizi per ogni evento - usiamo un unico placeholder
        let clientId: number | null = null;
        const originalEventTitle = googleEvent.summary || 'Evento Google';
        
        // Prima cerca se esiste già un cliente con email dell'attendee
        if (googleEvent.attendees && googleEvent.attendees.length > 0) {
          const attendeeEmail = googleEvent.attendees[0].email;
          if (attendeeEmail) {
            const foundClient = clientsByEmail.get(attendeeEmail);
            if (foundClient) clientId = foundClient.id;
          }
        }
        
        // Se non trova un cliente reale, usa il placeholder "Google Calendar"
        if (!clientId) {
          const placeholderKey = `📅 Eventi Calendario|Google Calendar`;
          const existingPlaceholder = clientsByName.get(placeholderKey);
          if (existingPlaceholder) {
            clientId = existingPlaceholder.id;
          } else {
            // Cerca nel database se esiste già il placeholder
            const [dbPlaceholder] = await db.select().from(clients)
              .where(and(
                eq(clients.userId, userId),
                eq(clients.firstName, '📅 Eventi Calendario'),
                eq(clients.lastName, 'Google Calendar')
              ))
              .limit(1);
            
            if (dbPlaceholder) {
              clientId = dbPlaceholder.id;
              clientsByName.set(placeholderKey, dbPlaceholder);
            } else {
              // Crea UN SOLO placeholder per utente
              const newClient = await db.insert(clients).values({
                userId,
                firstName: '📅 Eventi Calendario',
                lastName: 'Google Calendar',
                email: `google-calendar-${userId}@imported.local`,
                phone: '',
                notes: 'Cliente sistema per eventi importati da Google Calendar. Non riceve notifiche.'
              }).returning();
              
              if (newClient.length > 0) {
                clientId = newClient[0].id;
                clientsByName.set(placeholderKey, newClient[0]);
              }
            }
          }
        }

        if (!clientId) continue;

        const eventTitle = googleEvent.summary || 'Evento Google';
        const serviceId = promemoriaServiceId!;
        

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
            syncDirection: 'import', // Evento importato da Google
            calendarId: sourceCalendarId,
            lastSyncAt: new Date()
          }).onConflictDoUpdate({
            target: googleCalendarEvents.appointmentId,
            set: {
              googleEventId: googleEvent.id,
              syncStatus: 'synced',
              syncDirection: 'import',
              lastSyncAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          // IMPORTANTE: Aggiorna le cache per evitare duplicati nel loop
          appointmentsByGoogleId.set(googleEvent.id, newAppointment[0]);
          appointmentsById.set(newAppointment[0].id, newAppointment[0]);
          if (!appointmentsByDateSlot.has(slotKey)) {
            appointmentsByDateSlot.set(slotKey, []);
          }
          appointmentsByDateSlot.get(slotKey)!.push(newAppointment[0]);
          
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
    } catch (importError: any) {
      const errMsg = String(importError);
      console.error(`❌ [SYNC] Errore importazione:`, errMsg);
      details.errors.push(`Errore importazione: ${errMsg}`);
      
      if (errMsg.includes('invalid_grant') || errMsg.includes('Token has been expired') || errMsg.includes('Token has been revoked')) {
        console.warn(`🛑 [SYNC] Token OAuth scaduto/revocato per utente ${userId} - interruzione sync`);
        try {
          await db.update(users).set({ 
            googleCalendarEnabled: false,
            googleAuthToken: null 
          }).where(eq(users.id, userId));
          console.log(`✅ [SYNC] Google Calendar disabilitato per utente ${userId}`);
        } catch (dbError) {
          console.error(`❌ [SYNC] Errore disabilitazione Google Calendar:`, dbError);
        }
        return { success: false, message: `Token OAuth scaduto per utente ${userId} - Google Calendar disabilitato`, details };
      }
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
            syncDirection: 'export', // Evento esportato dall'app
            calendarId: targetCalendarId,
            lastSyncAt: new Date()
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
          
          // Marca appuntamento come sincronizzato
          await db.update(appointments).set({ synced: true }).where(eq(appointments.id, appointment.id));
          
          details.exported++;
        }
      } catch (error: any) {
        const errorMsg = String(error);
        console.error(`❌ [SYNC] Errore esportazione appuntamento ${appointment.id}:`, errorMsg);
        details.errors.push(`Errore esportazione appuntamento ${appointment.id}: ${errorMsg}`);
        
        if (errorMsg.includes('invalid_grant') || errorMsg.includes('Token has been expired') || errorMsg.includes('Token has been revoked')) {
          console.warn(`🛑 [SYNC] Token OAuth scaduto/revocato per utente ${userId} - interruzione sync e disabilitazione Google Calendar`);
          try {
            await db.update(users).set({ 
              googleCalendarEnabled: false,
              googleAuthToken: null 
            }).where(eq(users.id, userId));
            console.log(`✅ [SYNC] Google Calendar disabilitato per utente ${userId} - dovrà ricollegare l'account`);
          } catch (dbError) {
            console.error(`❌ [SYNC] Errore disabilitazione Google Calendar:`, dbError);
          }
          details.errors.push(`Token OAuth scaduto - Google Calendar disabilitato per utente ${userId}`);
          break;
        }
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
