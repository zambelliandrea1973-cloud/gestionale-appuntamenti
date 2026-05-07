import { logger } from '../utils/logger';
import { db } from '../db';
import { users, appointments, googleCalendarEvents, clients, services, googleCalendarSyncTokens } from '../../shared/schema';
import { eq, and, gte, lt } from 'drizzle-orm';
import { storage } from '../storage';
import { calendar_v3, google } from 'googleapis';
import { addAppointmentToGoogleCalendar, updateAppointmentInGoogleCalendar, deleteAppointmentFromGoogleCalendar } from './googleCalendarService';
import { EncryptionService } from './encryption';

function createOAuth2ClientWithAutoSave(userId: number, tokens: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.PRODUCTION_DOMAIN 
      ? `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`
      : `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`
  );
  oauth2Client.setCredentials(tokens);
  
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      const merged = { ...tokens, ...newTokens };
      const encrypted = EncryptionService.encrypt(JSON.stringify(merged));
      await db.update(users).set({ googleAuthToken: encrypted }).where(eq(users.id, userId));
      logger.debug(`🔄 [OAUTH] Token refreshed and saved for user ${userId}`);
    } catch (err) {
      console.error(`❌ [OAUTH] Error saving refreshed token for user ${userId}:`, err);
    }
  });
  
  return oauth2Client;
}

interface SyncConflict {
  appointmentId: number;
  googleEventId: string;
  appointmentUpdatedAt: Date;
  googleEventUpdatedAt: Date;
  resolution: 'keep_local' | 'keep_google' | 'pending';
}

/**
 * Import events from Google Calendar and create appointments if they exist
 * @param userId - ID of the user
 * @param timeZone - User timezone (e.g. 'Europe/Rome', 'Australia/Sydney')
 */
export async function importGoogleCalendarEvents(userId: number, timeZone: string = 'Europe/Rome'): Promise<{ imported: number; conflicts: SyncConflict[]; errors: string[] }> {
  const result = { imported: 0, conflicts: [] as SyncConflict[], errors: [] as string[] };
  
  try {
    // Get the token OAuth of the user
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user.length || !user[0].googleAuthToken || !user[0].googleCalendarEnabled) {
      result.errors.push('Google Calendar is not enabled for this user');
      return result;
    }

    const googleAuthToken = user[0].googleAuthToken;
    const decryptedTokenStr = EncryptionService.decryptToken(googleAuthToken);
    const tokens = JSON.parse(decryptedTokenStr);
    
    const oauth2Client = createOAuth2ClientWithAutoSave(userId, tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Time range: 30 days in the past + 365 days in the future
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAhead = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    
    // NEW: Get ALL user calendars (primary + secondary)
    const calendarListResponse = await calendar.calendarList.list();
    const allCalendars = calendarListResponse.data.items || [];
    
    // Filter only calendars with read access (owner, writer, reader)
    const accessibleCalendars = allCalendars.filter(cal => 
      cal.id && cal.accessRole && ['owner', 'writer', 'reader'].includes(cal.accessRole)
    );
    
    console.log(`📅 [IMPORT] Found ${allCalendars.length} total calendars, ${accessibleCalendars.length} accessible`);
    
    // ========== INCREMENTAL SYNCHRONIZATION WITH SYNC TOKEN ==========
    // Load saved syncToken for this user
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
    
    // Iterate over each calendar using syncToken if available
    for (const cal of accessibleCalendars) {
      if (!cal.id) continue;
      
      const savedToken = syncTokenMap.get(cal.id);
      let useSyncToken = savedToken?.syncToken || null;
      let calendarEventCount = 0;
      let pageToken: string | undefined = undefined;
      let newSyncToken: string | undefined = undefined;
      
      // First try incremental sync, then fallback to full sync
      let needsFullSync = !useSyncToken;
      
      if (useSyncToken) {
        logger.debug(`⚡ [IMPORT] Incremental sync for "${cal.summary}"`);
        isIncrementalSync = true;
        
        try {
          // Incremental sync - retrieve only changes
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
            } as EventWithCalendar));
            allEvents = [...allEvents, ...eventsWithSource];
          }
          
          newSyncToken = eventsResponse.data.nextSyncToken || undefined;
          
          // Handle pagination if present
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
              } as EventWithCalendar));
              allEvents = [...allEvents, ...eventsWithSource];
            }
            
            pageToken = nextPage.data.nextPageToken || undefined;
            newSyncToken = nextPage.data.nextSyncToken || newSyncToken;
          }
          
          console.log(`   ✓ ${calendarEventCount} changes found`);
          
        } catch (syncError: any) {
          // Invalid token (410) - full sync required
          if (syncError?.code === 410 || syncError?.response?.status === 410) {
            logger.debug(`🔄 [IMPORT] Invalid SyncToken for "${cal.summary}", performing full sync...`);
            needsFullSync = true;
          } else {
            console.error(`❌ [IMPORT] Error syncing calendar ${cal.summary}:`, syncError);
            result.errors.push(`Error syncing calendar ${cal.summary}: ${String(syncError)}`);
            continue;
          }
        }
      }
      
      // Full sync if needed (first sync or invalid token)
      if (needsFullSync) {
        console.log(`📆 [IMPORT] Full sync for "${cal.summary}"`);
        calendarEventCount = 0;
        pageToken = undefined;
        
        try {
          do {
            const eventsResponse: any = await calendar.events.list({
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
          
          console.log(`   ✓ ${calendarEventCount} events loaded`);
          
        } catch (calError) {
          console.error(`❌ [IMPORT] Error full sync ${cal.summary}:`, calError);
          result.errors.push(`Error reading calendar ${cal.summary}: ${String(calError)}`);
          continue;
        }
      }
      
      // Save the new syncToken for future incremental syncs
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
          console.error(`⚠️ [IMPORT] Error saving syncToken:`, tokenError);
        }
      }
    }
    
    // Log type di sync eseguita
    if (isIncrementalSync) {
      logger.debug(`⚡ [IMPORT] Incremental sync completed: ${allEvents.length} changes to process`);
    } else {
      logger.debug(`📋 [IMPORT] Full sync completed: ${allEvents.length} events to process`);
    }

    if (allEvents.length === 0) {
      console.log(`📭 [IMPORT] No events found in calendars`);
      return result;
    }

    logger.debug(`📋 [IMPORT] Found ${allEvents.length} total events to process`);

    // ========== OPTIMIZATION: IN-MEMORY DATA PRELOAD ==========
    const preloadStart = Date.now();
    
    // 1. Preload ALL existing tracking records for this user (using appointment_id for join)
    const allUserAppointmentIds = await db.select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.userId, userId));
    const appointmentIdSet = new Set(allUserAppointmentIds.map(a => a.id));
    
    const allTrackingRecords = await db.select()
      .from(googleCalendarEvents);
    
    // Filter only tracking entries belonging to this user
    const userTrackingRecords = allTrackingRecords.filter(t => appointmentIdSet.has(t.appointmentId));
    
    // Map: googleEventId -> tracking record
    const trackingByGoogleId = new Map(userTrackingRecords.map(t => [t.googleEventId, t]));
    // Map: appointmentId -> tracking record
    const trackingByAppointmentId = new Map(userTrackingRecords.map(t => [t.appointmentId, t]));
    
    // 2. Preload ALL appointments of the user
    const allUserAppointments = await db.select()
      .from(appointments)
      .where(eq(appointments.userId, userId));
    
    // Map: googleEventId -> appointment
    const appointmentsByGoogleId = new Map(
      allUserAppointments.filter(a => a.googleEventId).map(a => [a.googleEventId!, a])
    );
    // Map: id -> appointment
    const appointmentsById = new Map(allUserAppointments.map(a => [a.id, a]));
    // Map: "date|startTime" -> appointment[]
    const appointmentsByDateSlot = new Map<string, typeof allUserAppointments>();
    for (const appt of allUserAppointments) {
      const key = `${appt.date}|${appt.startTime}`;
      if (!appointmentsByDateSlot.has(key)) {
        appointmentsByDateSlot.set(key, []);
      }
      appointmentsByDateSlot.get(key)!.push(appt);
    }
    
    // 3. Preload ALL clients of the user
    const allUserClients = await db.select()
      .from(clients)
      .where(eq(clients.userId, userId));
    
    // Map: email -> client
    const clientsByEmail = new Map(
      allUserClients.filter(c => c.email).map(c => [c.email!, c])
    );
    // Map: "firstName|lastName" -> client
    const clientsByName = new Map(
      allUserClients.map(c => [`${c.firstName}|${c.lastName}`, c])
    );
    
    // 4. Preload/Find the "Google Calendar Reminder" service
    // Search by English name first, then legacy Italian name for backward compatibility
    let reminderServiceId: number | null = null;
    const reminderService = await db.select()
      .from(services)
      .where(and(
        eq(services.userId, userId),
        eq(services.name, 'Google Calendar Reminder')
      ))
      .limit(1);
    
    if (reminderService.length > 0) {
      reminderServiceId = reminderService[0].id;
    } else {
      // Check for legacy Italian name (backward compatibility for existing installations)
      const legacyService = await db.select()
        .from(services)
        .where(and(
          eq(services.userId, userId),
          eq(services.name, 'Promemoria Google Calendar')
        ))
        .limit(1);
      if (legacyService.length > 0) {
        reminderServiceId = legacyService[0].id;
      } else {
        // Create the service only once
        const newService = await db.insert(services).values({
          userId,
          name: 'Google Calendar Reminder',
          duration: 60,
          price: 0,
          color: '#6B7280'
        }).returning();
        if (newService.length > 0) {
          reminderServiceId = newService[0].id;
        }
      }
    }
    
    // Fallback if creation fails
    if (!reminderServiceId) {
      const defaultService = await db.select().from(services).where(eq(services.userId, userId)).limit(1);
      reminderServiceId = defaultService.length > 0 ? defaultService[0].id : 1;
    }
    
    // 5. Create formatter only once (instead of one per event)
    const userFormatter = new Intl.DateTimeFormat('sv-SE', { 
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    
    logger.debug(`⚡ [IMPORT] Preload completed in ${Date.now() - preloadStart}ms`);
    console.log(`   - Tracking: ${trackingByGoogleId.size}, Appointments: ${allUserAppointments.length}, Clients: ${allUserClients.length}`);
    
    // ========== END PRELOAD ==========

    // Process each Google event (now with O(1) lookup instead of DB query)
    for (const googleEvent of allEvents) {
      if (!googleEvent.id) continue;
      
      const eventInfo = `"${googleEvent.summary || 'Senza titolo'}"`;
      
      // HANDLING CANCELLED EVENTS
      if (googleEvent.status === 'cancelled') {
        try {
          const trackedEvent = trackingByGoogleId.get(googleEvent.id);
          
          if (trackedEvent) {
            const appointmentId = trackedEvent.appointmentId;
            
            await db.delete(googleCalendarEvents)
              .where(eq(googleCalendarEvents.googleEventId, googleEvent.id));
            
            await db.delete(appointments)
              .where(eq(appointments.id, appointmentId));
            
            // Update local cache
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
          result.errors.push(`Error deleting event ${googleEvent.id}: ${String(deleteError)}`);
        }
        continue;
      }
      
      if (!googleEvent.start?.dateTime) continue;
      
      try {
        // O(1) lookup instead of DB query
        const existingTracking = trackingByGoogleId.get(googleEvent.id);
        
        if (existingTracking) {
          const linkedAppointment = appointmentsById.get(existingTracking.appointmentId);
          
          if (!linkedAppointment) {
            // Orphan tracking entry - delete it
            await db.delete(googleCalendarEvents)
              .where(eq(googleCalendarEvents.id, existingTracking.id));
            trackingByGoogleId.delete(googleEvent.id);
          } else {
            // Update if needed
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
              // Check conflicts using the map
              const slotKey = `${newDate}|${newStartTime}`;
              const existingAtSlot = appointmentsByDateSlot.get(slotKey) || [];
              const hasConflict = existingAtSlot.some(a => a.id !== linkedAppointment.id);
              
              if (hasConflict) {
                result.errors.push(`Time conflict: ${newDate} ${newStartTime}`);
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
        
        // Check duplicato per googleEventId (O(1))
        if (appointmentsByGoogleId.has(googleEvent.id)) continue;
        
        // Convert datetime
        const googleStartDateTime = googleEvent.start.dateTime;
        const googleEndDateTime = googleEvent.end?.dateTime || googleStartDateTime;
        
        const startDateObj = new Date(googleStartDateTime);
        const endDateObj = new Date(googleEndDateTime);
        
        const startParts = userFormatter.format(startDateObj).split(' ');
        const endParts = userFormatter.format(endDateObj).split(' ');
        
        const eventDate = startParts[0];
        const eventStartTime = startParts[1].substring(0, 5);
        const eventEndTime = endParts[1].substring(0, 5);
        
        // Duplicate check per slot (O(1))
        const slotKey = `${eventDate}|${eventStartTime}`;
        if (appointmentsByDateSlot.has(slotKey) && appointmentsByDateSlot.get(slotKey)!.length > 0) {
          continue;
        }
        
        // USE A SINGLE CLIENT PLACEHOLDER FOR ALL GOOGLE EVENTS
        // We do not create fake clients for each event - we use a single placeholder
        let clientId: number | null = null;
        const originalEventTitle = googleEvent.summary || 'Google Event';
        
        // First check if a client with the attendee email already exists
        if (googleEvent.attendees && googleEvent.attendees.length > 0) {
          const attendeeEmail = googleEvent.attendees[0].email;
          if (attendeeEmail) {
            const foundClient = clientsByEmail.get(attendeeEmail);
            if (foundClient) clientId = foundClient.id;
          }
        }
        
        // If a real client is found, use the placeholder "Google Calendar"
        if (!clientId) {
          const placeholderKey = `📅 Eventi Calendario|Google Calendar`;
          const existingPlaceholder = clientsByName.get(placeholderKey);
          if (existingPlaceholder) {
            clientId = existingPlaceholder.id;
          } else {
            // Check in the database if the placeholder already exists
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
              // Create a single placeholder per user
              const newClient = await db.insert(clients).values({
                userId,
                firstName: '📅 Eventi Calendario',
                lastName: 'Google Calendar',
                email: `google-calendar-${userId}@imported.local`,
                phone: '',
                notes: 'System client for events imported from Google Calendar. Does not receive notifications.'
              }).returning();
              
              if (newClient.length > 0) {
                clientId = newClient[0].id;
                clientsByName.set(placeholderKey, newClient[0]);
              }
            }
          }
        }

        if (!clientId) continue;

        const eventTitle = googleEvent.summary || 'Google Event';
        const serviceId = reminderServiceId!;
        

        // Determine if we are the organizer of the event
        // If the organizer is different from our account, we are invited
        const isOrganizerSelf: boolean = !googleEvent.organizer?.email || 
          googleEvent.organizer?.self === true ||
          Boolean(user[0].email && googleEvent.organizer?.email === user[0].email);
        
        // Create the appointment using storage to respect the schema
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
          googleEventTitle: eventTitle // Save the original title for display
        };
        
        const newAppointment = await db.insert(appointments).values(newAppointmentData).returning();

        // Register the link (use upsert to avoid duplicates)
        // Use the source calendarId of the event to be able to update/delete it correctly
        const sourceCalendarId = (googleEvent as any)._sourceCalendarId || 'primary';
        const sourceCalendarName = (googleEvent as any)._sourceCalendarName || '';
        
        if (newAppointment.length > 0) {
          await db.insert(googleCalendarEvents).values({
            appointmentId: newAppointment[0].id,
            googleEventId: googleEvent.id,
            syncStatus: 'synced',
            syncDirection: 'import', // Event imported from Google
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
          
          // IMPORTANT: Update the cache to avoid duplicates in the loop
          appointmentsByGoogleId.set(googleEvent.id, newAppointment[0]);
          appointmentsById.set(newAppointment[0].id, newAppointment[0]);
          if (!appointmentsByDateSlot.has(slotKey)) {
            appointmentsByDateSlot.set(slotKey, []);
          }
          appointmentsByDateSlot.get(slotKey)!.push(newAppointment[0]);
          
          result.imported++;
        }
      } catch (error) {
        result.errors.push(`Error importing event ${googleEvent.id}: ${String(error)}`);
      }
    }

    // Update lastGoogleSyncAt
    await db.update(users).set({ lastGoogleSyncAt: new Date() }).where(eq(users.id, userId));
    
    return result;
  } catch (error) {
    result.errors.push(`General import error: ${String(error)}`);
    console.error('❌ Error importing Google Calendar:', error);
    return result;
  }
}

/**
 * Bidirectional sync: export new appointments and import new Google events
 * @param userId - ID of the user
 * @param timeZone - User timezone (e.g. 'Europe/Rome', 'Australia/Sydney')
 */
export async function syncBidirectional(userId: number, timeZone: string = 'Europe/Rome'): Promise<{ success: boolean; message: string; details: any }> {
  const details = {
    exported: 0,
    imported: 0,
    errors: [] as string[]
  };

  try {
    
    // 1. IMPORT events from Google Calendar
    try {
      const importResult = await importGoogleCalendarEvents(userId, timeZone);
      details.imported = importResult.imported;
      if (importResult.errors.length > 0) {
        details.errors.push(...importResult.errors);
      }
    } catch (importError: any) {
      const errMsg = String(importError);
      console.error(`❌ [SYNC] Error importing:`, errMsg);
      details.errors.push(`Error importing: ${errMsg}`);
      
      if (errMsg.includes('invalid_grant') || errMsg.includes('Token has been expired') || errMsg.includes('Token has been revoked')) {
        console.warn(`🛑 [SYNC] OAuth token expired/revoked for user ${userId} - disabling sync but KEEPING token for retry`);
        try {
          await db.update(users).set({ 
            googleCalendarEnabled: false
          }).where(eq(users.id, userId));
          console.log(`⚠️ [SYNC] Google Calendar disabled for user ${userId} - token kept for reconnection`);
        } catch (dbError) {
          console.error(`❌ [SYNC] Error disabling Google Calendar:`, dbError);
        }
        return { success: false, message: `OAuth token expired for user ${userId} - Google Calendar disabled (reconnect from settings)`, details };
      }
    }

    // 2. EXPORT new appointments to Google
    let newAppointments: any[] = [];
    try {
      // SIMPLE query: select only appointments of the user
      const allAppointments = await db.select()
        .from(appointments)
        .where(eq(appointments.userId, userId));
      
      
      // Filter manually the unsynchronized appointments
      // synced should be false or NULL for new appointments
      // IMPORTANT: Exclude appointments IMPORTED from Google - they must not be re-exported!
      newAppointments = allAppointments.filter(a => !a.synced && !a.importedFromGoogle);
    } catch (queryError) {
      console.error(`❌ [SYNC] Error querying appointments:`, queryError);
      details.errors.push(`Error querying appointments: ${String(queryError)}`);
      newAppointments = [];
    }

    for (const appointment of newAppointments) {
      try {
        
        // DUPLICATE CHECK: verify if the appointment has already been exported
        const existingExport = await db.select()
          .from(googleCalendarEvents)
          .where(eq(googleCalendarEvents.appointmentId, appointment.id))
          .limit(1);
        
        if (existingExport.length > 0) {
          // Ensure the synced flag is set
          await db.update(appointments).set({ synced: true }).where(eq(appointments.id, appointment.id));
          continue;
        }
        
        // Create the event directly in Google Calendar using the user's token
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user.length || !user[0].googleAuthToken) {
          continue;
        }
        
        const tokens = JSON.parse(EncryptionService.decryptToken(user[0].googleAuthToken));
        const oauth2Client = createOAuth2ClientWithAutoSave(userId, tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        // Get appointment data
        const clientData = await db.select().from(clients).where(eq(clients.id, appointment.clientId)).limit(1);
        const serviceData = appointment.serviceId 
          ? await db.select().from(services).where(eq(services.id, appointment.serviceId)).limit(1)
          : [];
        
        if (!clientData.length) {
          continue;
        }
        
        const client = clientData[0];
        const service = serviceData.length ? serviceData[0] : null;
        
        // Create the event - CONVERT TO UTC for Google Calendar
        // Handle both HH:MM and HH:MM:SS formats
        const startTime = appointment.startTime.length === 5 ? `${appointment.startTime}:00` : appointment.startTime;
        const endTime = appointment.endTime.length === 5 ? `${appointment.endTime}:00` : appointment.endTime;
        
        // IMPORTANT: Convert from local time to UTC before sending to Google Calendar
        // the database stores "09:00" as local time (Italy)
        // Google Calendar API requires UTC, so we calculate the offset using Intl
        
        // Helper function to calculate the offset of a timezone
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
          
          return (localDate.getTime() - date.getTime()) / (1000 * 60); // Offset in minutes
        };
        
        // Create local dates (the browser interprets them as UTC, but we see them as local)
        const refDate = new Date(`${appointment.date}T12:00:00`); // A reference date
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
          : `Appointment with ${client.firstName} ${client.lastName}`;
        
        const description = appointment.notes 
          ? `Note: ${appointment.notes}\nClient: ${client.firstName} ${client.lastName}\nPhone: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`
          : `Client: ${client.firstName} ${client.lastName}\nPhone: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`;
        
        // Use the user's calendarId, fallback to 'primary' if configured
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
          // Register the link (use upsert to avoid duplicates)
          await db.insert(googleCalendarEvents).values({
            appointmentId: appointment.id,
            googleEventId,
            syncStatus: 'synced',
            syncDirection: 'export', // Event exported from the app
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
          
          // Mark appointment as synchronized
          await db.update(appointments).set({ synced: true }).where(eq(appointments.id, appointment.id));
          
          details.exported++;
        }
      } catch (error: any) {
        const errorMsg = String(error);
        console.error(`❌ [SYNC] Error exporting appointment ${appointment.id}:`, errorMsg);
        details.errors.push(`Error exporting appointment ${appointment.id}: ${errorMsg}`);
        
        if (errorMsg.includes('invalid_grant') || errorMsg.includes('Token has been expired') || errorMsg.includes('Token has been revoked')) {
          console.warn(`🛑 [SYNC] OAuth token expired/revoked for user ${userId} - disabling sync but KEEPING token`);
          try {
            await db.update(users).set({ 
              googleCalendarEnabled: false
            }).where(eq(users.id, userId));
            console.log(`⚠️ [SYNC] Google Calendar disabled for user ${userId} - token kept`);
          } catch (dbError) {
            console.error(`❌ [SYNC] Error disabling Google Calendar:`, dbError);
          }
          details.errors.push(`Token OAuth scaduto - Google Calendar disabilitato per utente ${userId}`);
          break;
        }
      }
    }

    // 3. FIRST detect events deleted from Google (to avoid recreation loops)
    let deleted = 0;
    try {
      const deleteResult = await syncDeletedEvents(userId);
      deleted = deleteResult.deleted;
      if (deleteResult.errors.length > 0) {
        details.errors.push(...deleteResult.errors);
      }
    } catch (deleteError) {
      console.error(`❌ [SYNC] Error detecting deletions:`, deleteError);
      details.errors.push(`Error detecting deletions: ${String(deleteError)}`);
    }

    // 4. UPDATE Google events with changes from Replit (AFTER handling deletions)
    let updated = 0;
    try {
      // Get all synced appointments (include calendarId to use the correct calendar)
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
      
      // For each synchronized appointment, update Google if needed
      for (const syncedAppt of syncedAppointments) {
        try {
          const appointment = await db.select()
            .from(appointments)
            .where(eq(appointments.id, syncedAppt.appointmentId))
            .limit(1);
          
          if (!appointment.length) continue;
          const appt = appointment[0];
          
          // IMPORTANT: DO NOT update events IMPORTED from Google Calendar
          // These events are managed by the user directly on Google
          // Updating them would overwrite them with incorrect titles ("Google Calendar Event...")
          const importedValue = appt.importedFromGoogle as any;
          const isImported = importedValue === true || 
                            String(importedValue) === 't' || 
                            String(importedValue) === 'true' || 
                            String(importedValue) === '1' ||
                            Boolean(importedValue);
          
          console.log(`🔍 [SYNC DEBUG] appointment ${appt.id}: importedFromGoogle = "${importedValue}" (type: ${typeof importedValue}) → isImported: ${isImported}`);
          
          if (isImported) {
            console.log(`⏭️ [SYNC] Skip update for appointment ${appt.id} - imported from Google Calendar`);
            continue;
          }
          
          // Get client e service
          const clientData = await db.select().from(clients).where(eq(clients.id, appt.clientId)).limit(1);
          const serviceData = appt.serviceId 
            ? await db.select().from(services).where(eq(services.id, appt.serviceId)).limit(1)
            : [];
          
          if (!clientData.length) continue;
          const client = clientData[0];
          const service = serviceData.length ? serviceData[0] : null;
          
          // Prepare data for Google
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
          
          // FALLBACK: if the client is "Google Calendar Event" (old placeholder),
          // extract the original title from notes (format: 📅 OriginalTitle)
          let summary: string;
          if (client.firstName === 'Evento' && client.lastName === 'Google Calendar') {
            // Extract title from notes
            const notesMatch = appt.notes?.match(/📅\s*([^\n]+)/);
            const originalTitle = notesMatch ? notesMatch[1].trim() : 'Google Event';
            summary = originalTitle;
            console.log(`📌 [SYNC] Using original title from notes: "${originalTitle}"`);
          } else {
            summary = service 
              ? `${client.firstName} ${client.lastName} - ${service.name}`
              : `Appointment with ${client.firstName} ${client.lastName}`;
          }
          
          const description = appt.notes 
            ? `Note: ${appt.notes}\nClient: ${client.firstName} ${client.lastName}\nPhone: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`
            : `Client: ${client.firstName} ${client.lastName}\nPhone: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`;
          
          // Update event on Google
          const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
          if (!user.length || !user[0].googleAuthToken) continue;
          
          const tokens = JSON.parse(EncryptionService.decryptToken(user[0].googleAuthToken));
          const oauth2Client = createOAuth2ClientWithAutoSave(userId, tokens);
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
          
          // Use the calendarId saved in tracking, fallback to 'primary' if present
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
          
          // Update timestamp sync
          await db.update(googleCalendarEvents)
            .set({ lastSyncAt: new Date(), updatedAt: new Date() })
            .where(eq(googleCalendarEvents.appointmentId, syncedAppt.appointmentId));
          
          updated++;
        } catch (updateError: any) {
          const errorCode = updateError?.code || updateError?.response?.status;
          
          // If event no longer exists on Google (404/410), delete local appointment
          if (errorCode === 404 || errorCode === 410) {
            try {
              await db.delete(appointments).where(eq(appointments.id, syncedAppt.appointmentId));
              await db.delete(googleCalendarEvents).where(eq(googleCalendarEvents.id, syncedAppt.mappingId));
              deleted++;
            } catch (delError) {
              console.error(`❌ [SYNC] Error deleting appointment ${syncedAppt.appointmentId}:`, delError);
            }
          } else {
          }
        }
      }
    } catch (step4Error) {
      console.error(`❌ [SYNC] Error in Step 4:`, step4Error);
    }

    // 5. Update timestamp sync
    await db.update(users).set({ lastGoogleSyncAt: new Date() }).where(eq(users.id, userId));

    const message = `Sync completed: ${details.imported || 0} events imported, ${details.exported} appointments exported, ${deleted} deleted`;
    
    return { success: true, message, details };
  } catch (error) {
    const message = `Error synchronizing: ${String(error)}`;
    console.error(`❌ ${message}`, error);
    return { success: false, message, details };
  }
}

/**
 * Detect events deleted from Google Calendar and remove the corresponding appointments
 * NEW APPROACH: Direct verification of each event with a GET call
 */
export async function syncDeletedEvents(userId: number): Promise<{ deleted: number; errors: string[] }> {
  const result = { deleted: 0, errors: [] as string[] };
  
  try {
    // Get the token OAuth of the user
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user.length || !user[0].googleAuthToken || !user[0].googleCalendarEnabled) {
      return result;
    }

    const googleAuthToken = user[0].googleAuthToken;
    const calendarId = user[0].googleCalendarId || 'primary';
    
    const tokens = JSON.parse(EncryptionService.decryptToken(googleAuthToken));
    
    const oauth2Client = createOAuth2ClientWithAutoSave(userId, tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Get all appointments synced with Google for this user (with JOIN)
    // IMPORTANT: include calendarId to verify in the correct calendar (primary or secondary)
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
    
    
    // NEW APPROACH: Verify EACH event directly with GET
    // This intercepts both cancelled events and events that no longer exist
    for (const synced of syncedAppointments) {
      if (!synced.googleEventId) continue;
      
      try {
        // Try to get the event directly from Google
        // Use the specific calendarId saved in the mapping (supports secondary calendars)
        const eventCalendarId = synced.calendarId || calendarId;
        const eventResponse = await calendar.events.get({
          calendarId: eventCalendarId,
          eventId: synced.googleEventId,
        });
        
        // Detailed log for debugging
        const eventStatus = eventResponse.data.status;
        const eventSummary = eventResponse.data.summary || 'no-summary';
        
        // If the event exists, check the status
        if (eventResponse.data.status === 'cancelled') {
          
          await db.delete(appointments).where(eq(appointments.id, synced.appointmentId));
          await db.delete(googleCalendarEvents).where(eq(googleCalendarEvents.id, synced.mappingId));
          result.deleted++;
        }
        // If status is 'confirmed' or other, the event still exists - do nothing
        
      } catch (getError: any) {
        const errorCode = getError?.code || getError?.response?.status;
        
        // Error 404 = event no longer exists on Google
        // Error 410 = recurring event cancelled (Gone)
        if (errorCode === 404 || errorCode === 410) {
          
          try {
            await db.delete(appointments).where(eq(appointments.id, synced.appointmentId));
            await db.delete(googleCalendarEvents).where(eq(googleCalendarEvents.id, synced.mappingId));
            result.deleted++;
          } catch (deleteError) {
            result.errors.push(`Error deleting appointment ${synced.appointmentId}: ${String(deleteError)}`);
          }
        } else {
          // Other errors - detailed log for debugging
        }
      }
    }
    
    return result;
  } catch (error) {
    result.errors.push(`General sync delete error: ${String(error)}`);
    console.error('❌ [SYNC DELETE] Error:', error);
    return result;
  }
}

export const googleCalendarSync = {
  importGoogleCalendarEvents,
  syncBidirectional,
  syncDeletedEvents
};
