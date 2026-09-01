import { logger } from '../utils/logger';
import { db } from '../db';
import { users, appointments, googleCalendarEvents, clients, services, googleCalendarSyncTokens, googleAccounts, staff } from '../../shared/schema';
import { eq, and, gte, lt, sql } from 'drizzle-orm';
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
    // Only auto-save on production — prevent Replit dev from overwriting the shared DB
    if (!process.env.PRODUCTION_DOMAIN) {
      logger.debug(`🔄 [OAUTH] Token refreshed for user ${userId} (auto-save skipped on dev)`);
      return;
    }
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

/**
 * OAuth client for a SECONDARY Google account. Refreshed tokens are saved back to the
 * google_accounts row (NOT to users.googleAuthToken), so the primary account's token is never corrupted.
 */
function createOAuth2ClientForGoogleAccount(googleAccountId: number, userId: number, tokens: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.PRODUCTION_DOMAIN
      ? `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`
      : `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`
  );
  oauth2Client.setCredentials(tokens);

  oauth2Client.on('tokens', async (newTokens) => {
    if (!process.env.PRODUCTION_DOMAIN) {
      logger.debug(`🔄 [OAUTH] Token refreshed for google_account ${googleAccountId} (auto-save skipped on dev)`);
      return;
    }
    try {
      const merged = { ...tokens, ...newTokens };
      const encrypted = EncryptionService.encrypt(JSON.stringify(merged));
      await db.update(googleAccounts).set({ authToken: encrypted }).where(and(eq(googleAccounts.id, googleAccountId), eq(googleAccounts.userId, userId)));
      logger.debug(`🔄 [OAUTH] Token refreshed and saved for google_account ${googleAccountId}`);
    } catch (err) {
      console.error(`❌ [OAUTH] Error saving refreshed token for google_account ${googleAccountId}:`, err);
    }
  });

  return oauth2Client;
}

/**
 * Extract the real Google email from an OAuth token bundle (id_token JWT payload).
 * Falls back to the provided fallback email when the id_token is missing/unparseable.
 */
export function extractGoogleEmail(tokens: any, fallback: string | null = null): string | null {
  if (tokens?.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
      if (payload?.email) return payload.email as string;
    } catch {
      // ignore — fall through to fallback
    }
  }
  return fallback;
}

const GOOGLE_REAUTH_MESSAGE = 'La connessione con Google Calendar è interrotta. Ricollega il tuo account per riprendere la sincronizzazione.';

function googleOAuthErrorText(error: unknown): string {
  if (typeof error === 'string') return error;

  const candidate = error as any;
  const parts = [
    candidate?.message,
    candidate?.error,
    candidate?.error_description,
    candidate?.response?.data?.error,
    candidate?.response?.data?.error_description,
    candidate?.response?.data?.message,
  ].filter(Boolean);

  try {
    parts.push(JSON.stringify(error));
  } catch {
    // Ignore objects that cannot be serialized.
  }

  return parts.join(' ');
}

/**
 * Returns true only for errors that mean the Google OAuth connection can no
 * longer be used. Transient network/API errors must not force a reconnect.
 */
function isGoogleOAuthConnectionError(error: unknown): boolean {
  const candidate = error as any;
  const status = Number(candidate?.code || candidate?.response?.status || 0);
  const text = googleOAuthErrorText(error).toLowerCase();

  if (status === 401) return true;

  return [
    'invalid_grant',
    'unauthorized_client',
    'invalid_client',
    'token has been expired',
    'token has been revoked',
    'invalid authentication credentials',
    'login required',
  ].some(marker => text.includes(marker));
}

/**
 * Mark Google Calendar as requiring a new OAuth authorization.
 * The encrypted token is preserved only to retain the connected email in the UI.
 */
async function markGoogleCalendarNeedsReauth(userId: number): Promise<void> {
  try {
    // Preserve the connected email before modifying the record
    const [userRecord] = await db.select({
      googleAuthToken: users.googleAuthToken,
      googleCalendarEmail: users.googleCalendarEmail,
    }).from(users).where(eq(users.id, userId)).limit(1);

    let emailToPreserve: string | null = (userRecord as any)?.googleCalendarEmail || null;
    if (!emailToPreserve && userRecord?.googleAuthToken) {
      try {
        const tokenStr = EncryptionService.decryptToken(userRecord.googleAuthToken);
        const tokens = JSON.parse(tokenStr);
        if (tokens.id_token) {
          const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
          emailToPreserve = payload.email || null;
        }
      } catch {}
    }

    await db.update(users)
      .set({
        googleCalendarEnabled: false,
        googleNeedsReauth: true,
        googleCalendarEmail: emailToPreserve,
        // googleAuthToken intentionally NOT cleared — keep it so UI can show email and re-auth can succeed
      } as any)
      .where(eq(users.id, userId));
    await db.delete(googleCalendarSyncTokens)
      .where(eq(googleCalendarSyncTokens.userId, userId));
    console.warn(`⚠️ [SYNC] Google Calendar marked needs_reauth for user ${userId} — email: ${emailToPreserve}. User must re-authorize from Settings → Google Calendar`);
  } catch (dbErr) {
    console.error(`❌ [SYNC] Error marking needs_reauth for user ${userId}:`, dbErr);
  }
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
export async function importGoogleCalendarEvents(userId: number, timeZone: string = 'Europe/Rome', forceFullSync: boolean = false, account?: { id: number; email: string }): Promise<{ imported: number; found: number; conflicts: SyncConflict[]; errors: string[] }> {
  const result = { imported: 0, found: 0, conflicts: [] as SyncConflict[], errors: [] as string[] };
  const isSecondary = !!account;
  
  try {
    // If forceFullSync, delete all syncTokens for this user so the next sync is a full fetch
    if (forceFullSync) {
      try {
        await db.delete(googleCalendarSyncTokens).where(eq(googleCalendarSyncTokens.userId, userId));
        console.log(`🔄 [IMPORT] forceFullSync=true: syncTokens cancellati per user ${userId} — verrà eseguito full sync`);
      } catch (err) {
        console.warn(`⚠️ [IMPORT] Errore cancellazione syncTokens:`, err);
      }
    }

    // Get the token OAuth of the user (primary) — still needed for organizer detection / fallback email
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user.length) {
      result.errors.push('User not found');
      return result;
    }

    // Resolve which OAuth token to use: primary (users.googleAuthToken) or secondary (google_accounts.authToken)
    let encryptedToken: string | null;
    if (isSecondary) {
      const [acc] = await db.select().from(googleAccounts).where(and(eq(googleAccounts.id, account!.id), eq(googleAccounts.userId, userId)));
      if (!acc || !acc.authToken || !acc.enabled) {
        result.errors.push(`Secondary Google account ${account!.email} not connected or disabled`);
        return result;
      }
      encryptedToken = acc.authToken;
    } else {
      if (!user[0].googleAuthToken || !user[0].googleCalendarEnabled) {
        result.errors.push('Google Calendar is not enabled for this user');
        return result;
      }
      encryptedToken = user[0].googleAuthToken;
    }
    
    // Decrypt token with explicit error for key mismatch diagnosis
    let tokens: any;
    try {
      const decryptedTokenStr = EncryptionService.decryptToken(encryptedToken!);
      tokens = JSON.parse(decryptedTokenStr);
      console.log(`🔓 [IMPORT] Token decrypted OK for ${isSecondary ? `google_account ${account!.id} (${account!.email})` : `user ${userId}`}`);
    } catch (decryptErr) {
      const msg = `Errore decriptazione token Google (chiave ENCRYPTION_KEY non corrisponde?) — riautorizzare Google Calendar da Impostazioni: ${String(decryptErr)}`;
      console.error(`❌ [IMPORT] ${msg}`);
      result.errors.push(msg);
      return result;
    }

    // Email tag for imported appointments (which Google account this came from)
    const sourceGoogleEmail = isSecondary
      ? account!.email
      : extractGoogleEmail(tokens, user[0].email || null);
    
    const oauth2Client = isSecondary
      ? createOAuth2ClientForGoogleAccount(account!.id, userId, tokens)
      : createOAuth2ClientWithAutoSave(userId, tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Time range: 30 days in the past + 365 days in the future
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAhead = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    console.log(`🔍 [IMPORT] User ${userId} | timeMin: ${thirtyDaysAgo.toISOString()} | timeMax: ${oneYearAhead.toISOString()}`);
    
    // Get ALL user calendars (primary + secondary)
    let calendarListResponse: any;
    try {
      calendarListResponse = await calendar.calendarList.list();
    } catch (calListErr: any) {
      const msg = `Errore lettura lista calendari Google: ${String(calListErr?.message || calListErr)}`;
      console.error(`❌ [IMPORT] ${msg}`);
      result.errors.push(msg);
      return result;
    }
    const allCalendars = calendarListResponse.data.items || [];
    
    // Importa SOLO dai calendari di PROPRIETÀ dell'utente (accessRole === 'owner').
    // Questo esclude calendari condivisi da altri utenti (accessRole 'reader'/'writer')
    // che appartengono ad altri account Google — evita cross-contaminazione tra account.
    // Calendari 'freeBusyReader' esclusi comunque (non espongono dettagli eventi).
    const accessibleCalendars = allCalendars.filter((cal: any) =>
      cal.id && cal.accessRole === 'owner'
    );

    console.log(`📅 [IMPORT] User ${userId}: ${allCalendars.length} calendari totali, ${accessibleCalendars.length} da sincronizzare (tutti tranne freeBusyReader)`);
    allCalendars.forEach((cal: any) => console.log(`   📆 "${cal.summary}" (${cal.id}) accessRole=${cal.accessRole}`));
    
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
          
          // Google does NOT return nextSyncToken when singleEvents=true.
          // Paginate through the calendar WITHOUT singleEvents to get the final
          // nextSyncToken (it only appears on the last page of results).
          // maxResults=2500 minimises API round-trips (≤1 call for most users).
          if (!newSyncToken) {
            try {
              let tokenPageToken: string | undefined = undefined;
              let finalSyncToken: string | undefined = undefined;
              do {
                const tokenResp = await calendar.events.list({
                  calendarId: cal.id,
                  maxResults: 2500,
                  showDeleted: true,
                  pageToken: tokenPageToken
                });
                finalSyncToken = tokenResp.data.nextSyncToken || finalSyncToken;
                tokenPageToken = tokenResp.data.nextPageToken || undefined;
              } while (tokenPageToken);
              newSyncToken = finalSyncToken;
              if (newSyncToken) {
                console.log(`   🔖 [IMPORT] syncToken salvato per "${cal.summary}"`);
              } else {
                console.warn(`   ⚠️ [IMPORT] Google non ha restituito nextSyncToken per "${cal.summary}"`);
              }
            } catch (tokenFetchErr) {
              console.warn(`⚠️ [IMPORT] Impossibile ottenere syncToken per "${cal.summary}":`, tokenFetchErr);
            }
          }
          
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
    
    // Log sync type and event count — always visible in production logs
    if (isIncrementalSync) {
      console.log(`⚡ [IMPORT] User ${userId}: sync incrementale — ${allEvents.length} modifiche da processare`);
    } else {
      console.log(`📋 [IMPORT] User ${userId}: full sync — ${allEvents.length} eventi trovati in totale`);
    }

    result.found = allEvents.length;

    if (allEvents.length === 0) {
      console.log(`📭 [IMPORT] User ${userId}: nessun evento trovato nei calendari (controllare accessRole e timeRange)`);
      return result;
    }

    console.log(`📋 [IMPORT] User ${userId}: inizio elaborazione ${allEvents.length} eventi`);

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
    // Map: "date|HH:MM" -> appointment[]  (normalizzato a 5 char per evitare mismatch HH:MM:SS vs HH:MM)
    const appointmentsByDateSlot = new Map<string, typeof allUserAppointments>();
    for (const appt of allUserAppointments) {
      const key = `${appt.date}|${(appt.startTime || '').substring(0, 5)}`;
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

      // Per tutti gli account (primario e secondari): salta gli eventi che noi stessi abbiamo inviato
      // dal gestionale — riconoscibili dalla firma invisibile extendedProperties.private.source=gestionale.
      // Questo impedisce che un appuntamento del gestionale diventi grigio per ri-importazione.
      if (googleEvent.extendedProperties?.private?.source === 'gestionale') {
        const eventInfoEarly = `"${googleEvent.summary || 'Senza titolo'}"`;
        const extPvtEarly = googleEvent.extendedProperties?.private as any;
        console.log(`⏭️ [IMPORT SKIP GES-EARLY] ${eventInfoEarly} — source=gestionale, apptId=${extPvtEarly?.appointmentId||'n/a'}, data=${googleEvent.start?.dateTime||googleEvent.start?.date||'?'}`);
        continue;
      }
      
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
      
      // All-day events: no dateTime but have a date → import with synthetic 00:00-01:00 time
      const isAllDay = !googleEvent.start?.dateTime && !!googleEvent.start?.date;
      if (!googleEvent.start?.dateTime && !googleEvent.start?.date) {
        console.log(`⏭️ [IMPORT SKIP] ${eventInfo} — evento senza data né ora, ignorato`);
        continue;
      }

      try {
        // O(1) lookup instead of DB query
        const existingTracking = trackingByGoogleId.get(googleEvent.id);
        
        if (existingTracking) {
          const linkedAppointment = appointmentsById.get(existingTracking.appointmentId);
          
          if (!linkedAppointment) {
            // Orphan tracking entry - delete it and re-import below
            console.log(`🔄 [IMPORT] ${eventInfo} — tracking orfano (appuntamento ID ${existingTracking.appointmentId} non trovato), lo cancello e re-importo`);
            await db.delete(googleCalendarEvents)
              .where(eq(googleCalendarEvents.id, existingTracking.id));
            trackingByGoogleId.delete(googleEvent.id);
            // Do NOT continue — fall through to re-import
          } else {
            if (isAllDay) {
              // All-day event already imported — no time to update, just mark synced
              console.log(`✅ [IMPORT OK] ${eventInfo} — evento tutto-il-giorno già in sync (${linkedAppointment.date}), nessuna modifica`);
              continue;
            }
            // Update if needed (timed events only)
            const googleStartDateTime = googleEvent.start.dateTime!;
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
                // Un conflitto di orario è informativo, non un errore critico: non va nel banner rosso
                result.conflicts.push({ type: 'time_conflict', googleEventId: googleEvent.id, date: newDate, time: newStartTime });
                console.log(`⚠️ [IMPORT CONFLICT] ${eventInfo} — conflitto slot ${newDate} ${newStartTime} (registrato come conflitto, non errore)`);
                await db.update(googleCalendarEvents)
                  .set({ syncStatus: 'conflict', updatedAt: new Date() })
                  .where(eq(googleCalendarEvents.id, existingTracking.id));
              } else {
                console.log(`📝 [IMPORT UPDATE] ${eventInfo} — orario aggiornato a ${newDate} ${newStartTime}`);
                await db.update(appointments)
                  .set({ date: newDate, startTime: newStartTime, endTime: newEndTime })
                  .where(eq(appointments.id, linkedAppointment.id));
                
                await db.update(googleCalendarEvents)
                  .set({ lastSyncAt: new Date(), updatedAt: new Date() })
                  .where(eq(googleCalendarEvents.id, existingTracking.id));
                
                result.updated++;
              }
            } else {
              console.log(`✅ [IMPORT OK] ${eventInfo} — già in sync (${linkedAppointment.date} ${linkedAppointment.startTime}), nessuna modifica`);
            }
            continue;
          }
        }
        
        // Check duplicato per googleEventId (O(1))
        if (appointmentsByGoogleId.has(googleEvent.id)) {
          const dup = appointmentsByGoogleId.get(googleEvent.id);
          console.log(`⏭️ [IMPORT SKIP] ${eventInfo} — googleEventId già presente nell'appuntamento ID ${dup?.id} (${dup?.date} ${dup?.startTime})`);
          continue;
        }

        // ── Gestionale-origin: salta/ripristina eventi esportati da noi ─────
        // Gli eventi esportati da questo gestionale portano:
        //   extendedProperties.private.source = 'gestionale'
        //   extendedProperties.private.appointmentId = '<id>'
        //   extendedProperties.private.svcId = '<serviceId>'
        //   extendedProperties.private.cliId = '<clientId>'
        // E/O una firma testuale '#gestionale {"id":X,"svcId":Y,"cliId":Z}' nella description.
        {
          const extPvt = (googleEvent as any).extendedProperties?.private;
          const isGestOrigin = extPvt?.source === 'gestionale';
          let gesSig: { id?: number; svcId?: number; cliId?: number } | null = null;
          const gesMatch = (googleEvent.description || '').match(/#gestionale (\{[^}]+\})/);
          if (gesMatch) { try { gesSig = JSON.parse(gesMatch[1]); } catch {} }

          if (isGestOrigin || gesSig) {
            const origApptId = isGestOrigin && extPvt?.appointmentId
              ? Number(extPvt.appointmentId)
              : (gesSig?.id ?? null);

            if (origApptId) {
              const [orig] = await db
                .select({ id: appointments.id, googleEventId: appointments.googleEventId })
                .from(appointments)
                .where(and(eq(appointments.id, origApptId), eq(appointments.userId, userId)))
                .limit(1);

              if (orig) {
                // Originale presente → collega googleEventId se mancante, poi salta
                if (!orig.googleEventId && googleEvent.id) {
                  await db.update(appointments)
                    .set({ googleEventId: googleEvent.id, synced: true })
                    .where(eq(appointments.id, origApptId));
                }
                console.log(`⏭️ [IMPORT SKIP GES] ${eventInfo} — evento gestionale (ID ${origApptId}) già presente, skip`);
                continue;
              }

              // Originale eliminato → ripristina come appuntamento nativo
              const restoreSvcId = gesSig?.svcId || (extPvt?.svcId ? Number(extPvt.svcId) : null);
              const restoreCliId = gesSig?.cliId || (extPvt?.cliId ? Number(extPvt.cliId) : null);
              console.log(`🔄 [IMPORT RESTORE GES] ${eventInfo} — originale ID ${origApptId} non trovato, ripristino come nativo (svcId=${restoreSvcId} cliId=${restoreCliId})`);
              (googleEvent as any).__gesRestore = { svcId: restoreSvcId, cliId: restoreCliId };
            } else {
              // Firma gestionale senza ID → salta (evento esportato prima del sistema firma)
              console.log(`⏭️ [IMPORT SKIP GES] ${eventInfo} — evento gestionale senza ID, skip`);
              continue;
            }
          }
        }

        // ── Extract date and time (timed events and all-day events) ──────────
        let eventDate: string;
        let eventStartTime: string;
        let eventEndTime: string;

        if (isAllDay) {
          // All-day event: use the date directly, synthetic 00:00-01:00 so it
          // appears at the top of the day and never conflicts with business-hour slots
          eventDate = googleEvent.start.date!;
          eventStartTime = '00:00';
          eventEndTime   = '01:00';
        } else {
          const googleStartDateTime = googleEvent.start.dateTime!;
          const googleEndDateTime   = googleEvent.end?.dateTime || googleStartDateTime;
          const startDateObj = new Date(googleStartDateTime);
          const endDateObj   = new Date(googleEndDateTime);
          const startParts   = userFormatter.format(startDateObj).split(' ');
          const endParts     = userFormatter.format(endDateObj).split(' ');
          eventDate          = startParts[0];
          eventStartTime     = startParts[1].substring(0, 5);
          eventEndTime       = endParts[1].substring(0, 5);
        }

        // slotKey defined here so it is in scope for the cache update after insert
        const slotKey = `${eventDate}|${eventStartTime}`;

        // Check duplicato per slot: se esiste già un appuntamento importato da Google
        // allo stesso slot ma senza googleEventId (import precedente fallito a metà),
        // aggiorna il googleEventId invece di creare un duplicato.
        const slotExisting = appointmentsByDateSlot.get(slotKey) || [];
        const orphanImport = slotExisting.find(
          (a) => (a.importedFromGoogle === true || (a.importedFromGoogle as any) === 'true') && !a.googleEventId
        );
        if (orphanImport) {
          await db.update(appointments)
            .set({ googleEventId: googleEvent.id })
            .where(eq(appointments.id, orphanImport.id));
          appointmentsByGoogleId.set(googleEvent.id, orphanImport);
          console.log(`🔗 [IMPORT MERGE] ${eventInfo} — googleEventId salvato su appuntamento orfano ID ${orphanImport.id}`);
          result.updated++;
          continue;
        }

        // ── Dedup per appuntamento nativo già sincronizzato ────────────────────
        // Se esiste un appuntamento NON importato (nativo) allo stesso slot con
        // synced=true o googleEventId impostato, è quasi certamente l'evento che
        // abbiamo esportato noi stessi → collegalo e salta l'import.
        {
          const syncedNative = slotExisting.find(a => !a.importedFromGoogle && (a.synced === true || !!a.googleEventId));
          if (syncedNative) {
            if (!syncedNative.googleEventId) {
              await db.update(appointments)
                .set({ googleEventId: googleEvent.id, synced: true })
                .where(eq(appointments.id, syncedNative.id));
              appointmentsByGoogleId.set(googleEvent.id, syncedNative);
            }
            console.log(`⏭️ [IMPORT SKIP SYNCED] ${eventInfo} — appuntamento nativo sincroni zzato (ID ${syncedNative.id}) già presente al slot ${slotKey}, skip re-import`);
            result.updated++;
            continue;
          }
        }

        // ── Dedup per orario+titolo: evita doppioni se esiste già un appuntamento
        // nativo (non importato da Google) allo stesso slot con lo stesso titolo/note.
        // Copre il caso in cui l'evento esportato non abbia i metadati gestionale.
        {
          const googleSummary = (googleEvent.summary || '').trim().toLowerCase();
          if (googleSummary && slotExisting.length > 0) {
            const titleDup = slotExisting.find(a => {
              if (a.importedFromGoogle) return false; // salta quelli già importati
              const aptNotes = (a.notes || '').trim().toLowerCase();
              // Match esatto o contenimento (es. "silvia massaggio" vs "silvia b. - massaggio")
              return aptNotes === googleSummary ||
                     aptNotes.includes(googleSummary) ||
                     googleSummary.includes(aptNotes.substring(0, Math.min(aptNotes.length, 20)));
            });
            if (titleDup) {
              // Collega il googleEventId all'appuntamento nativo e salta l'import
              if (!titleDup.googleEventId) {
                await db.update(appointments)
                  .set({ googleEventId: googleEvent.id, synced: true })
                  .where(eq(appointments.id, titleDup.id));
                appointmentsByGoogleId.set(googleEvent.id, titleDup);
              }
              console.log(`⏭️ [IMPORT SKIP TITLE] ${eventInfo} — doppione per orario+titolo, collegato ad appuntamento nativo ID ${titleDup.id}`);
              continue;
            }
          }
        }

        console.log(`➕ [IMPORT] Slot ${slotKey} — importo nuovo evento`);
        console.log(`➕ [IMPORT NEW] ${eventInfo}${isAllDay ? ' ☀️ (tutto il giorno)' : ''} — ${eventDate} ${eventStartTime}–${eventEndTime}`);
        
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
        let serviceId = reminderServiceId!;

        // ── Gestionale-restore: usa servizio/cliente originali ───────────────
        const gesRestore = (googleEvent as any).__gesRestore as { svcId: number | null; cliId: number | null } | undefined;
        let isRestoredNative = false;
        if (gesRestore) {
          if (gesRestore.cliId) {
            const [cliCheck] = await db
              .select({ id: clients.id })
              .from(clients)
              .where(and(eq(clients.id, gesRestore.cliId), eq(clients.userId, userId)))
              .limit(1);
            if (cliCheck) clientId = cliCheck.id;
          }
          if (gesRestore.svcId) {
            const [svcCheck] = await db
              .select({ id: services.id })
              .from(services)
              .where(and(eq(services.id, gesRestore.svcId), eq(services.userId, userId)))
              .limit(1);
            if (svcCheck) { serviceId = svcCheck.id; isRestoredNative = true; }
          }
        }

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
          notes: isRestoredNative
            ? `${eventTitle}`
            : `📅 ${eventTitle}${isAllDay ? ' ☀️' : ''}${googleEvent.description ? '\n' + googleEvent.description : ''}`,
          importedFromGoogle: !isRestoredNative,
          synced: isRestoredNative,
          googleEventId: googleEvent.id,
          googleOrganizerSelf: isOrganizerSelf,
          googleEventTitle: eventTitle,
          sourceGoogleEmail
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

    // Update lastSyncAt — on the right place (primary user vs secondary account)
    if (isSecondary) {
      await db.update(googleAccounts).set({ lastSyncAt: new Date() }).where(and(eq(googleAccounts.id, account!.id), eq(googleAccounts.userId, userId)));
    } else {
      await db.update(users).set({ lastGoogleSyncAt: new Date() }).where(eq(users.id, userId));
    }
    
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
/**
 * Export gestionale appointments assigned to a specific staff member to their
 * secondary Google Calendar account. Uses extendedProperties to track pushed events
 * and avoid re-import duplicates. Runs as part of the bidirectional sync (step 2b).
 */
async function syncSecondaryAccountExport(
  userId: number,
  acc: typeof googleAccounts.$inferSelect,
  timeZone: string
): Promise<{ exported: number; updated: number; deleted: number; errors: string[] }> {
  const result = { exported: 0, updated: 0, deleted: 0, errors: [] as string[] };

  // 1. Find matching staff member by email (case-insensitive)
  const matchingStaff = await db.select()
    .from(staff)
    .where(and(
      eq(staff.userId, userId),
      sql`LOWER(${staff.email}) = LOWER(${acc.email})`
    ))
    .limit(1);

  if (!matchingStaff.length) {
    console.log(`⏭️ [SEC EXPORT] Nessuno staff con email ${acc.email} nella pratica ${userId} — skip`);
    return result;
  }

  const staffMember = matchingStaff[0];
  console.log(`🔄 [SEC EXPORT] Inizio export per ${acc.email} (staff ID ${staffMember.id})`);

  // 2. Resolve OAuth token for this secondary account
  const [accRow] = await db.select()
    .from(googleAccounts)
    .where(and(eq(googleAccounts.id, acc.id), eq(googleAccounts.userId, userId)));

  if (!accRow?.authToken || !accRow?.enabled) {
    result.errors.push(`Account secondario ${acc.email} non connesso o disabilitato`);
    return result;
  }

  let tokens: any;
  try {
    tokens = JSON.parse(EncryptionService.decryptToken(accRow.authToken));
  } catch (err) {
    result.errors.push(`Errore decriptazione token ${acc.email}: ${String(err)}`);
    return result;
  }

  const oauth2Client = createOAuth2ClientForGoogleAccount(acc.id, userId, tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // 3. Get appointments assigned to this staff member (exclude events imported from Google)
  const allStaffAppts = await db.select()
    .from(appointments)
    .where(and(
      eq(appointments.userId, userId),
      eq(appointments.staffId, staffMember.id)
    ));

  const exportableAppts = allStaffAppts.filter(a => {
    const imp = (a as any).importedFromGoogle;
    return !(imp === true || String(imp) === 't' || String(imp) === 'true');
  });

  console.log(`📋 [SEC EXPORT] ${acc.email}: ${exportableAppts.length} appuntamenti da sincronizzare`);

  // 4. List existing gestionale events already pushed to their calendar
  const existingGestEventMap = new Map<string, string>(); // appointmentId → googleEventId
  try {
    const oneYearAhead = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    let pageToken: string | undefined;
    do {
      const listRes: any = await calendar.events.list({
        calendarId: 'primary',
        privateExtendedProperty: 'source=gestionale',
        timeMin: sixtyDaysAgo.toISOString(),
        timeMax: oneYearAhead.toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 2500,
        ...(pageToken ? { pageToken } : {})
      });
      for (const ev of (listRes.data.items || [])) {
        const apptId = ev.extendedProperties?.private?.appointmentId;
        if (apptId && ev.id) existingGestEventMap.set(apptId, ev.id);
      }
      pageToken = listRes.data.nextPageToken;
    } while (pageToken);
    console.log(`📋 [SEC EXPORT] ${acc.email}: ${existingGestEventMap.size} eventi gestionale già nel calendario`);
  } catch (listErr: any) {
    result.errors.push(`Errore lista eventi ${acc.email}: ${String(listErr?.message || listErr)}`);
    return result;
  }

  // 5. Timezone offset helper
  const getTimezoneOffset = (date: Date, tz: string): number => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: tz
    });
    const parts = formatter.formatToParts(date);
    const m = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    const local = new Date(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second);
    return (local.getTime() - date.getTime()) / (1000 * 60);
  };

  // 6. Insert or update each appointment in the secondary calendar
  const processedApptIds = new Set<string>();
  for (const appt of exportableAppts) {
    try {
      const apptIdStr = String(appt.id);
      processedApptIds.add(apptIdStr);

      const clientData = await db.select().from(clients).where(eq(clients.id, appt.clientId)).limit(1);
      if (!clientData.length) continue;
      const clientRec = clientData[0];
      const serviceData = appt.serviceId
        ? await db.select().from(services).where(eq(services.id, appt.serviceId)).limit(1)
        : [];
      const serviceRec = serviceData.length ? serviceData[0] : null;

      const startTime = appt.startTime.length === 5 ? `${appt.startTime}:00` : appt.startTime;
      const endTime = appt.endTime.length === 5 ? `${appt.endTime}:00` : appt.endTime;
      const refDate = new Date(`${appt.date}T12:00:00`);
      const offset = getTimezoneOffset(refDate, timeZone);
      const utcStart = new Date(new Date(`${appt.date}T${startTime}`).getTime() - offset * 60 * 1000);
      const utcEnd = new Date(new Date(`${appt.date}T${endTime}`).getTime() - offset * 60 * 1000);

      const summary = serviceRec
        ? `${clientRec.firstName} ${clientRec.lastName} - ${serviceRec.name}`
        : `Appuntamento con ${clientRec.firstName} ${clientRec.lastName}`;
      const _gesSig1 = `#gestionale ${JSON.stringify({ id: appt.id, svcId: appt.serviceId || 0, cliId: appt.clientId || 0 })}`;
      const description = (appt.notes
        ? `Note: ${appt.notes}\nCliente: ${clientRec.firstName} ${clientRec.lastName}\nTel: ${clientRec.phone || 'N/A'}`
        : `Cliente: ${clientRec.firstName} ${clientRec.lastName}\nTel: ${clientRec.phone || 'N/A'}`)
        + `\n\n${_gesSig1}`;

      const requestBody = {
        summary,
        description,
        start: { dateTime: utcStart.toISOString() },
        end: { dateTime: utcEnd.toISOString() },
        reminders: { useDefault: false, overrides: [{ method: 'popup' as const, minutes: 30 }] },
        extendedProperties: {
          private: {
            source: 'gestionale',
            appointmentId: apptIdStr,
            svcId: String(appt.serviceId || 0),
            cliId: String(appt.clientId || 0)
          }
        }
      };

      const existingEventId = existingGestEventMap.get(apptIdStr);
      if (existingEventId) {
        await calendar.events.update({ calendarId: 'primary', eventId: existingEventId, requestBody });
        result.updated++;
      } else {
        await calendar.events.insert({ calendarId: 'primary', requestBody });
        result.exported++;
      }
    } catch (apptErr: any) {
      const code = apptErr?.code || apptErr?.response?.status;
      if (code !== 404 && code !== 410) {
        result.errors.push(`[${acc.email}] appt ${appt.id}: ${String(apptErr?.message || apptErr)}`);
      }
    }
  }

  // 7. Delete from secondary calendar any events for appointments no longer assigned to this staff
  for (const [apptIdStr, eventId] of existingGestEventMap) {
    if (!processedApptIds.has(apptIdStr)) {
      try {
        await calendar.events.delete({ calendarId: 'primary', eventId });
        result.deleted++;
      } catch (delErr: any) {
        const code = delErr?.code || delErr?.response?.status;
        if (code !== 404 && code !== 410) {
          result.errors.push(`[${acc.email}] delete event ${eventId}: ${String(delErr?.message || delErr)}`);
        }
      }
    }
  }

  console.log(`✅ [SEC EXPORT] ${acc.email}: exported=${result.exported}, updated=${result.updated}, deleted=${result.deleted}, errors=${result.errors.length}`);
  return result;
}

export async function syncBidirectional(userId: number, timeZone: string = 'Europe/Rome', forceFullSync: boolean = false): Promise<{ success: boolean; message: string; details: any; needsReauth?: boolean }> {
  const details = {
    exported: 0,
    imported: 0,
    updated: 0,
    found: 0,
    errors: [] as string[]
  };

  try {

    // 0. AUTO-DEDUP — rimuove silenziosamente gli appuntamenti importati che
    //    sono duplicati di nativi già sincronizzati (criterio sicuro: synced=true).
    //    Gira prima dell'import per non creare nuovi duplicati durante questo ciclo.
    try {
      await cleanupDuplicateAppointments(userId);
    } catch (dedupErr) {
      // Non blocca il sync principale
      console.warn(`⚠️ [DEDUP] Errore auto-pulizia (non bloccante):`, dedupErr);
    }

    // 1. IMPORT events from Google Calendar
    try {
      const importResult = await importGoogleCalendarEvents(userId, timeZone, forceFullSync);
      details.imported = importResult.imported;
      details.updated = importResult.updated;
      details.found = importResult.found;
      if (importResult.errors.length > 0) {
        details.errors.push(...importResult.errors);
        // OAuth errors are returned inside the errors array, not always thrown.
        // so we must check here, not in the catch block below
        const hasOAuthError = importResult.errors.some(isGoogleOAuthConnectionError);
        if (hasOAuthError) {
          await markGoogleCalendarNeedsReauth(userId);
          details.errors.push(GOOGLE_REAUTH_MESSAGE);
          return { success: false, needsReauth: true, message: GOOGLE_REAUTH_MESSAGE, details };
        }
      }
    } catch (importError: any) {
      const errMsg = String(importError);
      console.error(`❌ [SYNC] Error importing:`, errMsg);
      details.errors.push(`Error importing: ${errMsg}`);
      
      if (isGoogleOAuthConnectionError(importError)) {
        await markGoogleCalendarNeedsReauth(userId);
        details.errors.push(GOOGLE_REAUTH_MESSAGE);
        return { success: false, needsReauth: true, message: GOOGLE_REAUTH_MESSAGE, details };
      }
    }

    // 1b. IMPORT events from each SECONDARY Google account (import-only; export stays on primary
    // to avoid duplicating gestionale appointments across multiple Google calendars)
    try {
      const secondaryAccounts = await db.select()
        .from(googleAccounts)
        .where(and(eq(googleAccounts.userId, userId), eq(googleAccounts.enabled, true)));

      for (const acc of secondaryAccounts) {
        try {
          const accResult = await importGoogleCalendarEvents(userId, timeZone, forceFullSync, { id: acc.id, email: acc.email });
          details.imported += accResult.imported;
          details.updated += accResult.updated;
          details.found += accResult.found;
          if (accResult.errors.length > 0) {
            details.errors.push(...accResult.errors.map(e => `[${acc.email}] ${e}`));
          }
        } catch (accErr) {
          console.error(`❌ [SYNC] Error importing secondary account ${acc.email}:`, accErr);
          details.errors.push(`[${acc.email}] ${String(accErr)}`);
        }
      }
    } catch (secErr) {
      console.error(`❌ [SYNC] Error loading secondary Google accounts:`, secErr);
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
        
        const _gesSig2 = `#gestionale ${JSON.stringify({ id: appointment.id, svcId: appointment.serviceId || 0, cliId: appointment.clientId || 0 })}`;
        const description = (appointment.notes 
          ? `Note: ${appointment.notes}\nClient: ${client.firstName} ${client.lastName}\nPhone: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`
          : `Client: ${client.firstName} ${client.lastName}\nPhone: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`)
          + `\n\n${_gesSig2}`;
        
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
            extendedProperties: {
              private: {
                source: 'gestionale',
                appointmentId: String(appointment.id),
                svcId: String(appointment.serviceId || 0),
                cliId: String(appointment.clientId || 0)
              }
            }
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
          
          // Mark appointment as synchronized AND save googleEventId so import won't re-create it
          await db.update(appointments).set({ synced: true, googleEventId }).where(eq(appointments.id, appointment.id));
          
          details.exported++;
        }
      } catch (error: any) {
        const errorMsg = String(error);
        console.error(`❌ [SYNC] Error exporting appointment ${appointment.id}:`, errorMsg);
        details.errors.push(`Error exporting appointment ${appointment.id}: ${errorMsg}`);
        
        if (isGoogleOAuthConnectionError(error)) {
          await markGoogleCalendarNeedsReauth(userId);
          details.errors.push(GOOGLE_REAUTH_MESSAGE);
          return { success: false, needsReauth: true, message: GOOGLE_REAUTH_MESSAGE, details };
        }
      }
    }

    // 2b. EXPORT to secondary accounts (bidirectional — ogni operatore vede i propri appuntamenti)
    try {
      const secondaryAccounts = await db.select()
        .from(googleAccounts)
        .where(and(eq(googleAccounts.userId, userId), eq(googleAccounts.enabled, true)));

      for (const acc of secondaryAccounts) {
        try {
          const secResult = await syncSecondaryAccountExport(userId, acc, timeZone);
          details.exported += secResult.exported;
          if (secResult.errors.length > 0) details.errors.push(...secResult.errors);
        } catch (secErr) {
          console.error(`❌ [SYNC] Errore export secondario per ${acc.email}:`, secErr);
        }
      }
    } catch (secExportErr) {
      console.error(`❌ [SYNC] Errore caricamento account secondari per export:`, secExportErr);
    }

    // 3. FIRST detect events deleted from Google (to avoid recreation loops)
    let deleted = 0;
    try {
      const deleteResult = await syncDeletedEvents(userId);
      deleted = deleteResult.deleted;
      if (deleteResult.errors.length > 0) {
        details.errors.push(...deleteResult.errors);
        if (deleteResult.errors.some(isGoogleOAuthConnectionError)) {
          await markGoogleCalendarNeedsReauth(userId);
          details.errors.push(GOOGLE_REAUTH_MESSAGE);
          return { success: false, needsReauth: true, message: GOOGLE_REAUTH_MESSAGE, details };
        }
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
          
          const _gesSig3 = `#gestionale ${JSON.stringify({ id: appt.id, svcId: appt.serviceId || 0, cliId: appt.clientId || 0 })}`;
          const description = (appt.notes 
            ? `Note: ${appt.notes}\nClient: ${client.firstName} ${client.lastName}\nPhone: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`
            : `Client: ${client.firstName} ${client.lastName}\nPhone: ${client.phone || 'N/A'}\nEmail: ${client.email || 'N/A'}`)
            + `\n\n${_gesSig3}`;
          
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
              extendedProperties: {
                private: {
                  source: 'gestionale',
                  appointmentId: String(appt.id),
                  svcId: String(appt.serviceId || 0),
                  cliId: String(appt.clientId || 0)
                }
              }
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
          } else if (isGoogleOAuthConnectionError(updateError)) {
            details.errors.push(`Error updating appointment ${syncedAppt.appointmentId}: ${googleOAuthErrorText(updateError)}`);
            await markGoogleCalendarNeedsReauth(userId);
            details.errors.push(GOOGLE_REAUTH_MESSAGE);
            return { success: false, needsReauth: true, message: GOOGLE_REAUTH_MESSAGE, details };
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
    if (isGoogleOAuthConnectionError(error)) {
      await markGoogleCalendarNeedsReauth(userId);
      details.errors.push(GOOGLE_REAUTH_MESSAGE);
      return { success: false, needsReauth: true, message: GOOGLE_REAUTH_MESSAGE, details };
    }
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
        } else if (isGoogleOAuthConnectionError(getError)) {
          result.errors.push(`Google OAuth connection error: ${googleOAuthErrorText(getError)}`);
          break;
        } else {
          // Other errors - detailed log for debugging
        }
      }
    }
    
    return result;
  } catch (error) {
    result.errors.push(`General sync delete error: ${googleOAuthErrorText(error) || String(error)}`);
    console.error('❌ [SYNC DELETE] Error:', error);
    return result;
  }
}

/**
 * Register Google Calendar push notification watches for all writable calendars of a user.
 * When an event changes in Google Calendar, Google calls POST /api/google-calendar/webhook
 * with the channelId → we run an incremental sync for that specific user only.
 * Only runs on production (requires a public HTTPS URL).
 */
export async function registerCalendarWatches(userId: number): Promise<void> {
  if (!process.env.PRODUCTION_DOMAIN) {
    logger.debug(`⏭️ [WATCH] Skipping watch registration on dev for user ${userId}`);
    return;
  }

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user?.googleAuthToken || !user.googleCalendarEnabled) return;

  let tokens: any;
  try {
    tokens = JSON.parse(EncryptionService.decryptToken(user.googleAuthToken));
  } catch {
    console.error(`❌ [WATCH] Cannot decrypt token for user ${userId}`);
    return;
  }

  const oauth2Client = createOAuth2ClientWithAutoSave(userId, tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  let calendarList: any[];
  try {
    const res = await calendar.calendarList.list();
    calendarList = (res.data.items || []).filter(
      (cal: any) => cal.id && ['owner', 'writer'].includes(cal.accessRole || '')
    );
  } catch (err) {
    console.error(`❌ [WATCH] Cannot list calendars for user ${userId}:`, err);
    return;
  }

  const webhookUrl = `https://${process.env.PRODUCTION_DOMAIN}/api/google-calendar/webhook`;
  // 6 days — Google max is 7, we leave 1 day margin for renewal
  const expirationMs = Date.now() + 6 * 24 * 60 * 60 * 1000;

  for (const cal of calendarList) {
    if (!cal.id) continue;
    try {
      // Stop existing watch first (ignore errors if already expired)
      const existingRows = await db.select()
        .from(googleCalendarSyncTokens)
        .where(and(
          eq(googleCalendarSyncTokens.userId, userId),
          eq(googleCalendarSyncTokens.calendarId, cal.id)
        ))
        .limit(1);
      const existing = existingRows[0];

      if (existing?.channelId && existing?.resourceId) {
        try {
          await calendar.channels.stop({
            requestBody: { id: existing.channelId, resourceId: existing.resourceId }
          });
        } catch { /* already expired or unknown — safe to ignore */ }
      }

      // channelId: max 64 chars, only alphanumeric + hyphen
      const safeCalId = cal.id.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 28);
      const channelId = `u${userId}-${safeCalId}-${Date.now()}`.substring(0, 64);

      const watchRes = await calendar.events.watch({
        calendarId: cal.id,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          expiration: expirationMs.toString(),
        },
      });

      // Save channelId + resourceId so the webhook handler can look up this user
      await db.update(googleCalendarSyncTokens)
        .set({
          channelId,
          resourceId: watchRes.data.resourceId || null,
          watchExpiresAt: new Date(expirationMs),
          updatedAt: new Date(),
        })
        .where(and(
          eq(googleCalendarSyncTokens.userId, userId),
          eq(googleCalendarSyncTokens.calendarId, cal.id)
        ));

      console.log(`✅ [WATCH] Registered for user ${userId}, calendar "${cal.summary}" — expires in 6 days`);
    } catch (err: any) {
      console.error(`❌ [WATCH] Failed for user ${userId}, calendar ${cal.id}:`, err?.message || err);
    }
  }
}

/**
 * Called when Google sends a push notification to /api/google-calendar/webhook.
 * Finds the user from the channelId and runs an incremental sync for that user only.
 * Works independently of who is currently logged in.
 */
export async function handleWebhookIncrementalSync(channelId: string): Promise<void> {
  const rows = await db.select()
    .from(googleCalendarSyncTokens)
    .where(eq(googleCalendarSyncTokens.channelId, channelId))
    .limit(1);

  if (!rows.length) {
    console.warn(`⚠️ [WEBHOOK] Unknown channelId: ${channelId}`);
    return;
  }

  const { userId, calendarId } = rows[0];
  console.log(`📬 [WEBHOOK] Notification → user ${userId}, calendar ${calendarId} — running incremental sync`);

  try {
    const result = await importGoogleCalendarEvents(userId, 'Europe/Rome');
    console.log(`✅ [WEBHOOK] Sync user ${userId}: imported=${result.imported}, errors=${result.errors.length}`);
  } catch (err) {
    console.error(`❌ [WEBHOOK] Sync error for user ${userId}:`, err);
  }
}

/**
 * Normalizza il testo note per il confronto dedup:
 * - rimuove la firma #gestionale {...} che autoGoogleSync aggiunge in fondo
 * - collassa spazi/newline, lowercase
 * Usato per confrontare native.notes con imported.notes
 */
function normalizeNotesForDedup(notes: string | null | undefined): string {
  return (notes || '')
    .replace(/#gestionale\s*\{[^}]*\}/gs, '') // strip firma JSON gestionale
    .replace(/Appuntamento\s*#\d+/gi, '')      // strip "Appuntamento #ID" (summary esportato)
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * cleanupDuplicateAppointments
 * ─────────────────────────────────────────────────────────────────────────────
 * Rimuove automaticamente gli appuntamenti "importedFromGoogle=true" che sono
 * duplicati certi di un appuntamento nativo ("importedFromGoogle=false").
 *
 * TUTTI E TRE i criteri devono corrispondere per eliminare:
 *   1. Stessa data
 *   2. Stessa ora di inizio (HH:MM)
 *   3. Stesso testo note/commento (dopo normalizzazione: strip firma #gestionale,
 *      collasso spazi, lowercase) — se il testo differisce l'appuntamento viene conservato
 *
 * CRITERIO DI SICUREZZA AGGIUNTIVO:
 *   4. Il nativo deve avere synced=true (significa che noi lo avevamo esportato su
 *      Google → l'importato è il riflesso del nostro export, non un evento esterno).
 *
 * Se uno qualsiasi dei criteri 1-4 non è soddisfatto → nessuna eliminazione.
 */
export async function cleanupDuplicateAppointments(
  userId: number
): Promise<{ removed: number; linked: number; errors: string[] }> {
  const result = { removed: 0, linked: 0, errors: [] as string[] };

  try {
    const allAppts = await db
      .select()
      .from(appointments)
      .where(eq(appointments.userId, userId));

    // Raggruppa per slot "data|HH:MM"
    const bySlot = new Map<string, typeof allAppts>();
    for (const a of allAppts) {
      const key = `${a.date}|${(a.startTime || '').substring(0, 5)}`;
      if (!bySlot.has(key)) bySlot.set(key, []);
      bySlot.get(key)!.push(a);
    }

    for (const [slot, group] of bySlot) {
      if (group.length < 2) continue;

      const natives  = group.filter(a => !a.importedFromGoogle);
      const imported = group.filter(a =>  a.importedFromGoogle);

      // ── CASO A: nativo + importato ────────────────────────────────────────────
      if (natives.length > 0 && imported.length > 0) {
        for (const dup of imported) {
          const dupNotes = normalizeNotesForDedup(dup.notes);

          const matchingNative = natives.find(n => {
            if (!n.synced) return false;
            return normalizeNotesForDedup(n.notes) === dupNotes;
          });

          if (!matchingNative) continue;

          try {
            await db.delete(googleCalendarEvents).where(eq(googleCalendarEvents.appointmentId, dup.id));
            await db.delete(appointments).where(and(eq(appointments.id, dup.id), eq(appointments.userId, userId)));
            console.log(`🗑️ [DEDUP-A] Rimosso importato ID ${dup.id} al slot ${slot} — duplicato del nativo ID ${matchingNative.id}`);
            result.removed++;

            if (!matchingNative.googleEventId && dup.googleEventId) {
              await db.update(appointments).set({ googleEventId: dup.googleEventId }).where(eq(appointments.id, matchingNative.id));
              console.log(`🔗 [DEDUP-A] Collegato googleEventId ${dup.googleEventId} al nativo ID ${matchingNative.id}`);
              result.linked++;
            }
          } catch (err) {
            result.errors.push(`Errore rimozione duplicato ${dup.id}: ${String(err)}`);
          }
        }
      }

      // ── CASO B: importato + importato (stesso googleEventId o stesso titolo/note) ─
      // Accade quando lo stesso evento Google viene importato due volte.
      // Teniamo quello col googleEventId impostato (o l'ID più basso), rimuoviamo il resto.
      if (natives.length === 0 && imported.length >= 2) {
        // Raggruppa per googleEventId (se uguale → stesso evento Google importato N volte)
        const byGoogleId = new Map<string, typeof imported>();
        const noGoogleId: typeof imported = [];

        for (const a of imported) {
          if (a.googleEventId) {
            if (!byGoogleId.has(a.googleEventId)) byGoogleId.set(a.googleEventId, []);
            byGoogleId.get(a.googleEventId)!.push(a);
          } else {
            noGoogleId.push(a);
          }
        }

        // Rimuovi i duplicati con stesso googleEventId (tieni il più vecchio = ID minore)
        for (const [gid, dupes] of byGoogleId) {
          if (dupes.length < 2) continue;
          const sorted = [...dupes].sort((a, b) => a.id - b.id);
          const keep = sorted[0];
          for (const dup of sorted.slice(1)) {
            try {
              await db.delete(googleCalendarEvents).where(eq(googleCalendarEvents.appointmentId, dup.id));
              await db.delete(appointments).where(and(eq(appointments.id, dup.id), eq(appointments.userId, userId)));
              console.log(`🗑️ [DEDUP-B] Rimosso importato ID ${dup.id} al slot ${slot} — stesso googleEventId ${gid} del ID ${keep.id}`);
              result.removed++;
            } catch (err) {
              result.errors.push(`Errore rimozione duplicato B ${dup.id}: ${String(err)}`);
            }
          }
        }

        // Rimuovi importati senza googleEventId con stesse note normalizzate
        // (stesso evento importato prima che il googleEventId venisse salvato)
        if (noGoogleId.length >= 2) {
          const grouped = new Map<string, typeof noGoogleId>();
          for (const a of noGoogleId) {
            const key = `${normalizeNotesForDedup(a.notes)}|${a.serviceType || ''}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(a);
          }
          for (const [, dupes] of grouped) {
            if (dupes.length < 2) continue;
            const keep = [...dupes].sort((a, b) => a.id - b.id)[0];
            for (const dup of dupes.filter(d => d.id !== keep.id)) {
              try {
                await db.delete(googleCalendarEvents).where(eq(googleCalendarEvents.appointmentId, dup.id));
                await db.delete(appointments).where(and(eq(appointments.id, dup.id), eq(appointments.userId, userId)));
                console.log(`🗑️ [DEDUP-B2] Rimosso importato senza gid ID ${dup.id} al slot ${slot} — note identiche a ID ${keep.id}`);
                result.removed++;
              } catch (err) {
                result.errors.push(`Errore rimozione duplicato B2 ${dup.id}: ${String(err)}`);
              }
            }
          }
        }
      }
    }

    if (result.removed > 0) {
      console.log(`✅ [DEDUP] Auto-pulizia completata: rimossi ${result.removed}, collegati ${result.linked}`);
    }
  } catch (err) {
    result.errors.push(`Errore generale cleanup: ${String(err)}`);
    console.error('❌ [DEDUP] Errore durante la pulizia automatica:', err);
  }

  return result;
}

export const googleCalendarSync = {
  importGoogleCalendarEvents,
  syncBidirectional,
  syncDeletedEvents,
  registerCalendarWatches,
  handleWebhookIncrementalSync,
  cleanupDuplicateAppointments,
};
