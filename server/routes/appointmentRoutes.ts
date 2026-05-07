// @ts-nocheck
import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { appointments, services, clients, bookingRequests, staff, users, treatmentRooms, googleCalendarEvents, packagePurchases, packageRedemptions } from '../../shared/schema';
import { eq, and, desc, gte, lte, or, lt, gt, ne, sql } from 'drizzle-orm';
import { google } from 'googleapis';
import { EncryptionService } from '../services/encryption';
import { calculateAvailableSlots } from '../services/bookingAvailability';
import { pushNotificationService } from '../services/pushNotificationService';

const router = Router();

  // Simple linear system - Appointments (FULLY UNIFIED MOBILE/DESKTOP)
router.get("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    logger.debug(`📅 [/api/appointments] [${deviceType}] Request from user ID:${user.id}, type:${user.type}, email:${user.username}`);
    console.log(`📱 [/api/appointments] [${deviceType}] Mobile: ${isMobile}, UserAgent: ${userAgent.substring(0, 50)}...`);
    
    // FORCE ANTI-CACHE FOR MOBILE - aggressive headers for synchronization
    if (isMobile) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `mobile-${Date.now()}`,
        'Last-Modified': new Date().toUTCString()
      });
      logger.debug(`🔄 [${deviceType}] Anti-cache headers applied for mobile`);
    }
    
    try {
      // 🔄 USE POSTGRESQL: Load appointments from shared database
      const userAppointments = await storage.getAppointmentsForUser(user.id, user.type);
      
      logger.debug(`📅 [${deviceType}] Loaded ${userAppointments.length} appointments from PostgreSQL for user ${user.id}`);
      
      // Convert PostgreSQL format → JSON for frontend compatibility
      const formattedAppointments = userAppointments.map(apt => ({
        id: apt.id,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        clientId: apt.clientId,
        client: apt.client, // ✅ Full client object
        service: apt.service, // ✅ Full service object
        serviceId: apt.serviceId,
        userId: apt.userId,
        notes: apt.notes,
        reminderSent: apt.reminderSent,
        reminderConfirmed: apt.reminderConfirmed,
        staffId: apt.staffId,
        roomId: apt.roomId,
        staff: apt.staff, // ✅ NEW: Full staff object (optional)
        room: apt.room, // ✅ NEW: Full room object (optional)
        importedFromGoogle: apt.importedFromGoogle, // ✅ Flag for imported Google events
        googleEventTitle: apt.googleEventTitle // ✅ Original Google event title
      }));
      
      res.json(formattedAppointments);
    } catch (error) {
      console.error(`❌ [/api/appointments] Error loading from PostgreSQL:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

router.get("/api/appointments/date/:date", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const { date } = req.params;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    logger.debug(`📅 [/api/appointments/date] [${deviceType}] User ${user.id} looking for appointments on date ${date}`);
    
    try {
      // 🔄 USE POSTGRESQL: Load appointments by date from shared database
      const dayAppointments = await storage.getAppointmentsByDateForUser(date, user.id, user.type);
      
      logger.debug(`📅 [${deviceType}] Loaded ${dayAppointments.length} appointments from PostgreSQL for ${date}`);
      
      // Convert PostgreSQL format → JSON for frontend compatibility
      const formattedAppointments = dayAppointments.map(apt => ({
        id: apt.id,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        clientId: apt.clientId,
        client: apt.client, // ✅ Full client object
        service: apt.service, // ✅ Full service object
        serviceId: apt.serviceId,
        userId: apt.userId,
        notes: apt.notes,
        reminderSent: apt.reminderSent,
        reminderConfirmed: apt.reminderConfirmed,
        staffId: apt.staffId,
        roomId: apt.roomId,
        staff: apt.staff, // ✅ NEW: Full staff object (optional)
        room: apt.room, // ✅ NEW: Full room object (optional)
        importedFromGoogle: apt.importedFromGoogle, // ✅ Flag for imported Google events
        googleEventTitle: apt.googleEventTitle // ✅ Original Google event title
      }));
      
      res.json(formattedAppointments);
    } catch (error) {
      console.error(`❌ [/api/appointments/date] Error loading from PostgreSQL:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Endpoint for appointment range (required for reports) - USES POSTGRESQL
router.get("/api/appointments/range/:startDate/:endDate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const { startDate, endDate } = req.params;
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    logger.debug(`📊 [/api/appointments/range PG] [${deviceType}] User ${user.id} looking for appointments in range ${startDate}-${endDate}`);
    
    // Date format validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }
    
    try {
      // 🔄 USE POSTGRESQL: Load appointments from shared database
      const allAppointments = await storage.getAppointmentsByDateRange(startDate, endDate);
      
      // Filter by user (admin sees all, staff sees only their own)
      let userRangeAppointments;
      if (user.type === 'admin') {
        console.log(`👑 [${deviceType}] Admin - Full access to all appointments for report`);
        userRangeAppointments = allAppointments;
      } else {
        console.log(`👩‍⚕️ [${deviceType}] Staff - Filter for own appointments`);
        userRangeAppointments = allAppointments.filter(apt => apt.userId === user.id);
      }
      
      const beforeFilterCount = userRangeAppointments.length;
      userRangeAppointments = userRangeAppointments.filter(apt => {
        const importedValue = apt.importedFromGoogle as any;
        const isImported = importedValue === true || importedValue === 'true' || importedValue === 't';
        return !isImported;
      });
      logger.debug(`📊💻 [${deviceType}] appointments range ${startDate}-${endDate}: ${userRangeAppointments.length} from PostgreSQL (excluded ${beforeFilterCount - userRangeAppointments.length} imported from Google Calendar)`);
      
      const rangeAppointmentsWithDetails = userRangeAppointments.map(appointment => ({
        ...appointment, 
        client: appointment.client || { firstName: "Client", lastName: "Unknown", id: appointment.clientId },
        service: appointment.service || { name: "Unknown service", id: appointment.serviceId, color: "#666666", price: 0 }
      }));
      
      console.log(`💰 [${deviceType}] PostgreSQL report: calculated revenue for ${rangeAppointmentsWithDetails.length} appointments`);
      res.json(rangeAppointmentsWithDetails);
    } catch (error) {
      console.error(`❌ [/api/appointments/range PG] Error loading from PostgreSQL:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

router.post("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    
    logger.debug(`📅 [/api/appointments] POST - Creating appointment for user ${user.id}`);
    logger.debug(`📝 Data received:`, req.body);
    
    try {
      // 📅 CALCULATE reminder_time: 24 hours before the appointment
      let reminderTime = null;
      if (req.body.date && req.body.startTime) {
        const appointmentDateTime = new Date(`${req.body.date}T${req.body.startTime}`);
        reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
        logger.debug(`⏰ [REMINDER] Calculated reminder_time: ${reminderTime.toISOString()} (24h before ${appointmentDateTime.toISOString()})`);
      }
      
      const appointmentData = {
        userId: user.id,
        clientId: req.body.clientId,
        serviceId: req.body.serviceId,
        staffId: req.body.staffId || null,
        roomId: req.body.roomId || null,
        packagePurchaseId: req.body.packagePurchaseId || null,
        date: req.body.date,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        notes: req.body.notes || "",
        reminderType: req.body.reminderType || "whatsapp,email",
        reminderTime: reminderTime,
        reminderStatus: "pending",
        status: req.body.status || "scheduled"
      };
      
      const newAppointment = await db.transaction(async (tx) => {
        if (appointmentData.date && appointmentData.startTime && appointmentData.endTime) {
          const timeOverlap = [
            eq(appointments.userId, user.id),
            eq(appointments.date, appointmentData.date),
            ne(appointments.status, 'cancelled'),
            lt(appointments.startTime, appointmentData.endTime),
            gt(appointments.endTime, appointmentData.startTime)
          ];
          
          const resourceConditions = [];
          if (appointmentData.roomId) {
            resourceConditions.push(eq(appointments.roomId, appointmentData.roomId));
          }
          if (appointmentData.staffId) {
            resourceConditions.push(eq(appointments.staffId, appointmentData.staffId));
          }
          
          let conflictWhere;
          if (resourceConditions.length > 1) {
            conflictWhere = and(...timeOverlap, or(...resourceConditions));
          } else if (resourceConditions.length === 1) {
            conflictWhere = and(...timeOverlap, resourceConditions[0]);
          } else {
            conflictWhere = and(...timeOverlap);
          }
          
          const conflicts = await tx.select({ id: appointments.id })
            .from(appointments)
            .where(conflictWhere)
            .limit(1);
          
          if (conflicts.length > 0) {
            throw new Error('CONFLICT: An appointment already exists at this time for the same resource');
          }
        }
        
        const [created] = await tx.insert(appointments).values(appointmentData).returning();
        return created;
      });
      
      logger.debug(`✅ [PostgreSQL] Appointment ${newAppointment.id} created with staffId: ${newAppointment.staffId}, roomId: ${newAppointment.roomId}, packagePurchaseId: ${newAppointment.packagePurchaseId}, reminderTime: ${reminderTime?.toISOString() || 'null'}`);
      
      // 🔄 GOOGLE CALENDAR SYNC: Automatically export to Google if enabled
      try {
        const [googleUser] = await db.select().from(users).where(eq(users.id, user.id));
        if (googleUser && googleUser.googleCalendarEnabled && googleUser.googleAuthToken) {
          
          // Create the event directly in Google Calendar using the user's token
          const tokens = JSON.parse(EncryptionService.decryptToken(googleUser.googleAuthToken));
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.PRODUCTION_DOMAIN 
              ? `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`
              : `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`
          );
          oauth2Client.setCredentials(tokens);
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
          
          // Get client and service data
          const [clientData] = await db.select().from(clients).where(eq(clients.id, newAppointment.clientId));
          const serviceData = newAppointment.serviceId 
            ? await db.select().from(services).where(eq(services.id, newAppointment.serviceId)).then(r => r[0])
            : null;
          
          if (clientData) {
            // USE ISO format WITHOUT Z to respect Europe/Rome timezone
            // Handle both HH:MM and HH:MM:SS formats
            const startTime = newAppointment.startTime.length === 5 ? `${newAppointment.startTime}:00` : newAppointment.startTime;
            const endTime = newAppointment.endTime.length === 5 ? `${newAppointment.endTime}:00` : newAppointment.endTime;
            const startDateTimeStr = `${newAppointment.date}T${startTime}`;
            const endDateTimeStr = `${newAppointment.date}T${endTime}`;
            
            
            const summary = serviceData 
              ? `${clientData.firstName} ${clientData.lastName} - ${serviceData.name}`
              : `Appointment with ${clientData.firstName} ${clientData.lastName}`;
            
            const description = newAppointment.notes 
              ? `Note: ${newAppointment.notes}\nClient: ${clientData.firstName} ${clientData.lastName}\nPhone: ${clientData.phone || 'N/A'}\nEmail: ${clientData.email || 'N/A'}`
              : `Client: ${clientData.firstName} ${clientData.lastName}\nPhone: ${clientData.phone || 'N/A'}\nEmail: ${clientData.email || 'N/A'}`;
            
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
            
            // Save the google_event_id and mark as synchronized
            if (response.data.id) {
              await db.update(appointments)
                .set({ synced: true, googleEventId: response.data.id })
                .where(eq(appointments.id, newAppointment.id));
              
              // Save also in the mapping table for UPDATE/DELETE
              await db.insert(googleCalendarEvents).values({
                appointmentId: newAppointment.id,
                googleEventId: response.data.id,
                syncStatus: 'synced',
                lastSyncAt: new Date(),
                calendarId: 'primary'
              }).onConflictDoNothing();
              
            }
          }
        }
      } catch (syncError) {
        console.error(`⚠️ [GOOGLE SYNC] Error synchronizing Google for appointment ${newAppointment.id}:`, syncError);
        // Do not block appointment creation if synchronization fails
      }
      
      // 📦 PACKAGES: Automatically scale sessions if appointment uses a package
      if (req.body.packagePurchaseId) {
        try {
          const packagePurchaseId = req.body.packagePurchaseId;
          logger.debug(`📦 [PACKAGE] Appointment ${newAppointment.id} uses package ${packagePurchaseId}, starting session redemption...`);
          
          // Retrieve the purchased package
          const [packagePurchase] = await db.select().from(packagePurchases).where(eq(packagePurchases.id, packagePurchaseId));
          
          if (!packagePurchase) {
            console.error(`❌ [PACKAGE] Package ${packagePurchaseId} not found`);
          } else if (packagePurchase.sessionsRemaining <= 0) {
            console.error(`❌ [PACKAGE] Package ${packagePurchaseId} has no remaining sessions`);
          } else {
            // Decrement remaining sessions
            const newSessionsRemaining = packagePurchase.sessionsRemaining - 1;
            const newStatus = newSessionsRemaining === 0 ? 'completed' : packagePurchase.status;
            const completedAt = newSessionsRemaining === 0 ? new Date() : null;
            
            await db.update(packagePurchases)
              .set({ 
                sessionsRemaining: newSessionsRemaining,
                status: newStatus,
                completedAt: completedAt
              })
              .where(eq(packagePurchases.id, packagePurchaseId));
            
            // Create record di riscatto
            const redemptionData: Record<string, any> = {
              packagePurchaseId: packagePurchaseId,
              appointmentId: newAppointment.id,
              redeemedAt: new Date(),
              notes: `Appointment ${newAppointment.id} on ${req.body.date}`
            };
            await db.insert(packageRedemptions).values(redemptionData);
            
            logger.debug(`✅ [PACKAGE] Session redeemed! Package ${packagePurchaseId}: ${newSessionsRemaining}/${packagePurchase.sessionsTotal} remaining (status: ${newStatus})`);
          }
        } catch (packageError) {
          console.error(`❌ [PACKAGE] Error redeeming session:`, packageError);
          // Do not block appointment creation if redemption fails
        }
      }
      
      // 📧 EMAIL AUTOMATICHE GESTITE DA SCHEDULER
      // email notifications are automatically sent by the scheduler 24h in advance
      // WhatsApp notifications can be sent manually from the WhatsApp Center
      logger.debug(`📧 [NOTIFICATIONS] Appointment created - automatic email scheduled for ${reminderTime?.toISOString() || 'N/A'}`);
      
      res.status(201).json(newAppointment);
    } catch (error: any) {
      if (error?.message?.startsWith('CONFLICT:')) {
        console.warn(`⚠️ [/api/appointments] Time conflict: ${error.message}`);
        return res.status(409).json({ message: error.message.replace('CONFLICT: ', '') });
      }
      console.error(`❌ [/api/appointments] Error creating appointment:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

router.get("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const appointmentId = parseInt(req.params.id);
    
    console.log(`📖 [/api/appointments/:id] GET - Request for appointment ${appointmentId} from user ${user.id}`);
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }
    
    try {
      // 🔄 USE POSTGRESQL: Retrieve appointment from the shared database
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        console.log(`❌ [GET] Appointment ${appointmentId} not found`);
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      logger.debug(`✅ [PostgreSQL] appointment ${appointmentId} retrieved`);
      res.status(200).json(appointment);
    } catch (error) {
      console.error(`❌ [/api/appointments/:id] Error retrieving appointment:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

router.put("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const appointmentId = parseInt(req.params.id);
    
    logger.debug(`📝 [/api/appointments/:id] PUT - Updating appointment ${appointmentId} for user ${user.id}`);
    logger.debug(`📝 Data received:`, req.body);
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }
    
    try {
      // 🔄 USE POSTGRESQL: Update appointment in shared database
      const appointmentData = {
        clientId: req.body.clientId,
        serviceId: req.body.serviceId,
        staffId: req.body.staffId || null,
        roomId: req.body.roomId || null,
        date: req.body.date,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        notes: req.body.notes || "",
        reminderType: req.body.reminderType || "whatsapp,email",
        status: req.body.status || "scheduled"
      };
      
      const updatedAppointment = await storage.updateAppointment(appointmentId, appointmentData);
      
      if (!updatedAppointment) {
        console.log(`❌ [PUT] Appointment ${appointmentId} not found`);
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      logger.debug(`✅ [PostgreSQL] appointment ${appointmentId} updated with staffId: ${updatedAppointment.staffId}, roomId: ${updatedAppointment.roomId}`);
      
      // 🔄 GOOGLE CALENDAR SYNC: Update in Google Calendar if enabled
      // IMPORTANT: Do not update events IMPORTED from Google Calendar!
      // These events have an external origin and must not be modified by the scheduler
      if (updatedAppointment.importedFromGoogle) {
        console.log(`⏭️ [GOOGLE SYNC] Skipping update for appointment ${appointmentId} - imported from Google Calendar`);
      } else {
        try {
          const [googleUser] = await db.select().from(users).where(eq(users.id, user.id));
          if (googleUser && googleUser.googleCalendarEnabled && googleUser.googleAuthToken) {
            // Find the linked Google event
            const [eventMapping] = await db.select()
              .from(googleCalendarEvents)
              .where(eq(googleCalendarEvents.appointmentId, appointmentId))
              .limit(1);
            
            if (eventMapping) {
              
              const tokens = JSON.parse(EncryptionService.decryptToken(googleUser.googleAuthToken));
              const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.PRODUCTION_DOMAIN 
                  ? `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`
                  : `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`
              );
              oauth2Client.setCredentials(tokens);
              const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
              
              // Get client and service data
              const [clientData] = await db.select().from(clients).where(eq(clients.id, updatedAppointment.clientId));
              const serviceData = updatedAppointment.serviceId 
                ? await db.select().from(services).where(eq(services.id, updatedAppointment.serviceId)).then(r => r[0])
                : null;
              
              if (clientData) {
                const startDateTime = new Date(`${updatedAppointment.date}T${updatedAppointment.startTime}`);
                const endDateTime = new Date(`${updatedAppointment.date}T${updatedAppointment.endTime}`);
                
                const summary = serviceData 
                  ? `${clientData.firstName} ${clientData.lastName} - ${serviceData.name}`
                  : `Appointment with ${clientData.firstName} ${clientData.lastName}`;
                
                const description = updatedAppointment.notes 
                  ? `Note: ${updatedAppointment.notes}\nClient: ${clientData.firstName} ${clientData.lastName}`
                  : `Client: ${clientData.firstName} ${clientData.lastName}`;
                
                await calendar.events.update({
                  calendarId: googleUser.googleCalendarId || 'primary',
                  eventId: eventMapping.googleEventId,
                requestBody: {
                  summary,
                  description,
                  start: { dateTime: startDateTime.toISOString(), timeZone: 'Europe/Rome' },
                  end: { dateTime: endDateTime.toISOString(), timeZone: 'Europe/Rome' },
                },
              });
              
              // Update timestamp sync
              await db.update(googleCalendarEvents)
                .set({ lastSyncAt: new Date(), syncStatus: 'synced' })
                .where(eq(googleCalendarEvents.appointmentId, appointmentId));
              
            }
          }
        }
        } catch (syncError) {
          console.error(`⚠️ [GOOGLE SYNC] Error updating in Google (non-blocking):`, syncError);
        }
      }
      
      res.status(200).json(updatedAppointment);
    } catch (error) {
      console.error(`❌ [/api/appointments/:id] Error updating appointment:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

router.delete("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const appointmentId = parseInt(req.params.id);
    
    logger.debug(`🗑️ [DELETE] ===== START DELETE REQUEST =====`);
    logger.debug(`🗑️ [DELETE] Attempting to delete appointment ${appointmentId} from user ${user.id} (${user.type})`);
    
    if (isNaN(appointmentId)) {
      logger.debug(`🗑️ [DELETE] Invalid ID: ${req.params.id}`);
      return res.status(400).json({ message: "Invalid appointment ID" });
    }
    
    try {
      logger.debug(`🗑️ [DELETE] Step 1: Retrieving appointment ${appointmentId}...`);
      // First get the appointment for Google sync
      const existingAppointment = await storage.getAppointment(appointmentId);
      logger.debug(`🗑️ [DELETE] Step 2: appointment found: ${!!existingAppointment}, importedFromGoogle: ${existingAppointment?.importedFromGoogle}`);
      
      // 🔄 CHECK IF IT IS AN EVENT IMPORTED FROM GOOGLE (double check)
      logger.debug(`🗑️ [DELETE] Step 3: Checking google_calendar_events mapping...`);
      const [eventMapping] = await db.select()
        .from(googleCalendarEvents)
        .where(eq(googleCalendarEvents.appointmentId, appointmentId))
        .limit(1);
      logger.debug(`🗑️ [DELETE] Step 4: Mapping found: ${!!eventMapping}, syncDirection: ${eventMapping?.syncDirection}`);
      
      // Block deletion if: 
      // 1. The mapping exists with syncDirection='import', OR
      // 2. Appointment has importedFromGoogle=true (fallback if mapping is missing or wrong)
      const isGoogleImport = 
        (eventMapping && eventMapping.syncDirection === 'import') || 
        (existingAppointment && existingAppointment.importedFromGoogle === true);
      
      logger.debug(`🗑️ [DELETE] Step 5: isGoogleImport = ${isGoogleImport}`);
      
      if (isGoogleImport) {
        console.log(`🚫 [DELETE] ===== BLOCCO Deleting event GOOGLE =====`);
        console.log(`🚫 [DELETE] Motivo: syncDir=${eventMapping?.syncDirection}, importedFlag=${existingAppointment?.importedFromGoogle}`);
        return res.status(403).json({ 
          message: "This event was imported from Google Calendar and cannot be deleted from the app. To delete it, access Google Calendar directly.",
          isGoogleImport: true
        });
      }
      
      // 🔄 USE POSTGRESQL: Delete appointment from the shared database
      const deleted = await storage.deleteAppointment(appointmentId);
      
      if (!deleted) {
        console.log(`❌ [DELETE] Appointment ${appointmentId} not found`);
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      console.log(`✅ [DELETE] Appointment ${appointmentId} deleted from PostgreSQL for user ${user.id}`);
      
      // 🔄 GOOGLE CALENDAR SYNC: Delete from Google Calendar if enabled (only exported events)
      if (existingAppointment && eventMapping && eventMapping.syncDirection === 'export') {
        try {
          const [googleUser] = await db.select().from(users).where(eq(users.id, user.id));
          if (googleUser && googleUser.googleCalendarEnabled && googleUser.googleAuthToken) {
              
              const tokens = JSON.parse(EncryptionService.decryptToken(googleUser.googleAuthToken));
              const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.PRODUCTION_DOMAIN 
                  ? `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`
                  : `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`
              );
              oauth2Client.setCredentials(tokens);
              const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
              
              // Use the calendarId saved in the mapping
              const targetCalendarId = eventMapping.calendarId || googleUser.googleCalendarId || 'primary';
              
              await calendar.events.delete({
                calendarId: targetCalendarId,
                eventId: eventMapping.googleEventId,
              });
              
              logger.debug(`✅ [GOOGLE SYNC] Event ${eventMapping.googleEventId} deleted from Google Calendar`);
              
              // Remove the mapping
              await db.delete(googleCalendarEvents)
                .where(eq(googleCalendarEvents.appointmentId, appointmentId));
          }
        } catch (syncError) {
          console.error(`⚠️ [GOOGLE SYNC] Error deleting from Google (non-blocking):`, syncError);
        }
      }
      
      res.status(200).json({ message: "Appointment deleted successfully" });
    } catch (error) {
      console.error(`❌ [DELETE] Error deleting appointment:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== BOOKING REQUESTS API ====================
  // API for booking requests from clients

  // POST /api/booking-requests - Client creates booking request (auto-calculates slot)
router.post("/api/booking-requests", async (req, res) => {
    try {
      const { clientCode, serviceId, staffId, requestedDate, requestedTimeStart, requestedTimeEnd, clientNotes } = req.body;
      
      logger.debug(`📝 [BOOKING REQUEST] New booking request from client ${clientCode} ${staffId ? `with staff preference ${staffId}` : 'without staff preference'}`);
      
      // Find the client by unique code
      const client = await db.select().from(clients).where(eq(clients.uniqueCode, clientCode)).limit(1);
      if (!client || client.length === 0) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      const clientData = client[0];
      const userId = clientData.userId;
      
      // Find the service to get the duration
      const service = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
      if (!service || service.length === 0) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      const serviceDuration = service[0].duration; // minutes
      
      // Calculate available slots in requested time range
      // if the client has chosen a professional, verify only their availability
      const proposedSlots = await calculateAvailableSlots({
        userId,
        date: requestedDate,
        timeStart: requestedTimeStart,
        timeEnd: requestedTimeEnd,
        duration: serviceDuration,
        staffId: staffId || undefined // Pass professional preference if present
      });
      
      // Create the request with "slots_proposed" status
      const newRequest = await db.insert(bookingRequests).values({
        userId,
        clientId: clientData.id,
        serviceId,
        staffId: staffId || null,
        requestedDate,
        requestedTimeStart,
        requestedTimeEnd,
        proposedSlots,
        clientNotes,
        status: "slots_proposed",
        channel: "pwa",
        selectionExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 ore per scegliere
        statusUpdatedAt: new Date()
      }).returning();
      
      console.log(`✅ [BOOKING REQUEST] Booking request ${newRequest[0].id} created with ${proposedSlots.length} proposed slots`);
      res.status(201).json({ request: newRequest[0], proposedSlots });
    } catch (error) {
      console.error(`❌ [BOOKING REQUEST] Error creating booking request:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/booking-requests - Admin sees pending requests (multi-tenant)
router.get("/api/booking-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    
    try {
      const requestsWithClients = await db
        .select({
          ...bookingRequests as any,
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
        } as any)
        .from(bookingRequests)
        .innerJoin(clients, eq(bookingRequests.clientId, clients.id))
        .where(eq(bookingRequests.userId, user.id))
        .orderBy(desc(bookingRequests.createdAt));
      
      const formattedRequests = requestsWithClients.map(req => ({
        ...req,
        clientName: `Client #${req.clientId} ${req.clientFirstName} ${req.clientLastName}`,
        clientFirstName: undefined,
        clientLastName: undefined,
      }));
      
      res.status(200).json(formattedRequests);
    } catch (error) {
      console.error(`❌ [BOOKING REQUEST] Error retrieving requests:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /api/booking-requests/:id/select-slot - Client selects a proposed slot
router.put("/api/booking-requests/:id/select-slot", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { selectedSlotIndex, clientCode } = req.body;
      
      // Input validation
      if (typeof selectedSlotIndex !== 'number' || selectedSlotIndex < 0) {
        return res.status(400).json({ error: "Indice slot invalid" });
      }
      
      if (!clientCode) {
        return res.status(400).json({ error: "Client code missing" });
      }
      
      // Find the booking request
      const request = await db.select().from(bookingRequests).where(eq(bookingRequests.id, requestId)).limit(1);
      if (!request || request.length === 0) {
        return res.status(404).json({ error: "Booking request not found" });
      }
      
      const requestData = request[0];
      
      // SECURITY: Verify the client owns the booking request
      const client = await db.select().from(clients).where(eq(clients.id, requestData.clientId)).limit(1);
      if (!client || client.length === 0 || client[0].uniqueCode !== clientCode) {
        console.error(`❌ [SECURITY] Unauthorized access attempt to booking request ${requestId} from client ${clientCode}`);
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Verify status and expiry
      if (requestData.status !== "slots_proposed") {
        return res.status(400).json({ error: "Request is not in the correct state for slot selection" });
      }
      
      if (requestData.selectionExpiresAt && new Date() > requestData.selectionExpiresAt) {
        // Overdue, update status
        await db.update(bookingRequests)
          .set({ status: "cancelled", statusUpdatedAt: new Date() })
          .where(eq(bookingRequests.id, requestId));
        return res.status(400).json({ error: "Selection time expired" });
      }
      
      // Verify valid slot index
      if (!requestData.proposedSlots || selectedSlotIndex >= requestData.proposedSlots.length) {
        return res.status(400).json({ error: "Indice slot invalid" });
      }
      
      // Update booking request with selected slot
      const updated = await db.update(bookingRequests)
        .set({
          selectedSlot: requestData.proposedSlots[selectedSlotIndex],
          status: "client_selected",
          statusUpdatedAt: new Date()
        })
        .where(eq(bookingRequests.id, requestId))
        .returning();
      
      console.log(`✅ [BOOKING REQUEST] Client selected slot for booking request ${requestId}`);
      res.status(200).json(updated[0]);
    } catch (error) {
      console.error(`❌ [BOOKING REQUEST] Error selecting slot:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /api/booking-requests/:id/confirm - Admin confirms and creates appointment
router.put("/api/booking-requests/:id/confirm", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    
    try {
      const requestId = parseInt(req.params.id);
      const { staffId: manualStaffId, roomId: manualRoomId } = req.body; // Optional manual override
      
      // Find the booking request
      const request = await db.select().from(bookingRequests).where(eq(bookingRequests.id, requestId)).limit(1);
      if (!request || request.length === 0) {
        return res.status(404).json({ error: "Booking request not found" });
      }
      
      const requestData = request[0];
      
      // Verify permessi multi-tenant
      if (requestData.userId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Verify stato
      if (requestData.status !== "client_selected") {
        return res.status(400).json({ error: "Client must select a slot before confirming" });
      }
      
      if (!requestData.selectedSlot) {
        return res.status(400).json({ error: "No slot selected" });
      }
      
      // Determine final staffId (admin override > client preference > null)
      const finalStaffId = manualStaffId || requestData.staffId || null;
      
      // Re-verify slot availability before confirming (avoids race conditions)
      // IMPORTANT: use finalStaffId to validate also admin override
      const service = await db.select().from(services).where(eq(services.id, requestData.serviceId)).limit(1);
      if (!service || service.length === 0) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      const currentSlots = await calculateAvailableSlots({
        userId: requestData.userId,
        date: requestData.requestedDate,
        timeStart: requestData.selectedSlot.start,
        timeEnd: requestData.selectedSlot.end,
        duration: service[0].duration,
        staffId: finalStaffId || undefined // Validate availability of final professional
      });
      
      // Verify that the selected slot is still available
      const slotStillAvailable = currentSlots.some(
        slot => slot.start === requestData.selectedSlot?.start && slot.end === requestData.selectedSlot?.end
      );
      
      if (!slotStillAvailable) {
        console.error(`❌ [BOOKING REQUEST] Slot ${requestData.selectedSlot?.start}-${requestData.selectedSlot?.end} no longer available`);
        return res.status(409).json({ error: "The selected slot is no longer available. Please choose a different time." });
      }
      
      // ROOM ASSIGNMENT: automatic or with admin override validation
      
      // Load active rooms
      const activeRooms = await db.select()
        .from(treatmentRooms)
        .where(and(
          eq(treatmentRooms.userId, requestData.userId),
          eq(treatmentRooms.isActive, true)
        ))
        .orderBy(treatmentRooms.id); // Sort by ID for determinism
      
      let assignedRoomId: number | null = null;
      
      if (activeRooms.length > 0) {
        // Find appointments that overlap with the selected slot
        const overlappingAppointments = await db.select()
          .from(appointments)
          .where(and(
            eq(appointments.userId, requestData.userId),
            eq(appointments.date, requestData.requestedDate),
            or(
              // Appointment starts in this slot
              and(gte(appointments.startTime, requestData.selectedSlot.start), lt(appointments.startTime, requestData.selectedSlot.end)),
              // Appointment ends in this slot
              and(gt(appointments.endTime, requestData.selectedSlot.start), lte(appointments.endTime, requestData.selectedSlot.end)),
              // Appointment covers the entire slot
              and(lte(appointments.startTime, requestData.selectedSlot.start), gte(appointments.endTime, requestData.selectedSlot.end))
            )
          ));
        
        // Extract occupied roomIds
        const occupiedRoomIds = new Set(
          overlappingAppointments
            .map(apt => apt.roomId)
            .filter((id): id is number => id !== null && id !== undefined)
        );
        
        if (manualRoomId) {
          // ADMIN OVERRIDE VALIDATION: verify that the manual room is free
          if (occupiedRoomIds.has(manualRoomId)) {
            console.error(`❌ [BOOKING REQUEST] Room ${manualRoomId} already occupied in selected slot`);
            return res.status(409).json({ error: "The selected room is already occupied at this time. Choose another room or leave automatic assignment." });
          }
          
          // Verify that the room exists and is active
          const manualRoom = activeRooms.find(r => r.id === manualRoomId);
          if (!manualRoom) {
            return res.status(400).json({ error: "Selected room not found or not active" });
          }
          
          assignedRoomId = manualRoomId;
          console.log(`✅ [BOOKING REQUEST] Room ${manualRoom.name} (ID ${manualRoomId}) manually assigned by admin`);
        } else {
          // AUTOMATIC ASSIGNMENT: find first free room
          const freeRoom = activeRooms.find(room => !occupiedRoomIds.has(room.id));
          
          if (freeRoom) {
            assignedRoomId = freeRoom.id;
            console.log(`✅ [BOOKING REQUEST] Room ${freeRoom.name} (ID ${freeRoom.id}) automatically assigned`);
          } else {
            logger.debug(`⚠️ [BOOKING REQUEST] No free room found, appointment created without assigned room`);
          }
        }
      }
      
      // finalStaffId already calculated above (before re-verification)
      
      // Calculate endTime based on the actual service duration
      const startTimeParts = requestData.selectedSlot.start.split(':');
      const startDate = new Date();
      startDate.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0, 0);
      const endDate = new Date(startDate.getTime() + service[0].duration * 60000);
      const calculatedEndTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;
      
      // TRANSACTION: Create appointment and update booking request atomically
      const newAppointment = await db.insert(appointments).values({
        userId: requestData.userId,
        clientId: requestData.clientId,
        serviceId: requestData.serviceId,
        staffId: finalStaffId,
        roomId: assignedRoomId,
        date: requestData.requestedDate,
        startTime: requestData.selectedSlot.start,
        endTime: calculatedEndTime, // Use actual service duration
        notes: requestData.clientNotes || "",
        status: "scheduled",
        reminderType: "whatsapp,email"
      }).returning();
      
      // Mark booking request as confirmed
      await db.update(bookingRequests)
        .set({
          status: "admin_confirmed",
          appointmentId: newAppointment[0].id,
          statusUpdatedAt: new Date()
        })
        .where(eq(bookingRequests.id, requestId));
      
      console.log(`✅ [BOOKING REQUEST] Booking request ${requestId} confirmed, appointment ${newAppointment[0].id} created`);
      
      // 🔔 PUSH NOTIFICATION: Send notification to client
      try {
        const formattedDate = new Date(requestData.requestedDate).toLocaleDateString('it-IT', {
          weekday: 'long', day: 'numeric', month: 'long'
        });
        
        await pushNotificationService.sendAppointmentConfirmed(requestData.clientId, {
          serviceName: service[0].name,
          date: formattedDate,
          time: requestData.selectedSlot.start.substring(0, 5)
        });
        console.log(`🔔 [PUSH] Confirmation notification sent to client ${requestData.clientId}`);
      } catch (pushError) {
        console.error('⚠️ [PUSH] Error sending notification (non-blocking):', pushError);
      }
      
      res.status(200).json({ appointment: newAppointment[0], request: requestData });
    } catch (error) {
      console.error(`❌ [BOOKING REQUEST] Error confirming booking request:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /api/booking-requests/:id/reject - Admin rejects booking request
router.put("/api/booking-requests/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    
    try {
      const requestId = parseInt(req.params.id);
      const { adminNotes } = req.body;
      
      // Find the booking request
      const request = await db.select().from(bookingRequests).where(eq(bookingRequests.id, requestId)).limit(1);
      if (!request || request.length === 0) {
        return res.status(404).json({ error: "Booking request not found" });
      }
      
      const requestData = request[0];
      
      // Verify permessi multi-tenant
      if (requestData.userId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Update as rejected
      const updated = await db.update(bookingRequests)
        .set({
          status: "rejected",
          adminNotes: adminNotes || null,
          statusUpdatedAt: new Date()
        })
        .where(eq(bookingRequests.id, requestId))
        .returning();
      
      console.log(`❌ [BOOKING REQUEST] Booking request ${requestId} rejected by admin`);
      res.status(200).json(updated[0]);
    } catch (error) {
      console.error(`❌ [BOOKING REQUEST] Error rejecting booking request:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/client-services - Public: services available for PWA clients (via clientCode)
router.get("/api/client-services", async (req, res) => {
    try {
      const { clientCode } = req.query;
      
      if (!clientCode || typeof clientCode !== 'string') {
        return res.status(400).json({ error: "clientCode required" });
      }
      
      logger.debug(`🔍 [CLIENT SERVICES] Requesting services for clientCode: ${clientCode}`);
      
      // Find client by unique code
      const client = await db.select().from(clients).where(eq(clients.uniqueCode, clientCode)).limit(1);
      
      if (!client || client.length === 0) {
        console.log(`❌ [CLIENT SERVICES] Client not found for code: ${clientCode}`);
        return res.status(404).json({ error: "Client not found" });
      }
      
      const ownerId = client[0].userId;
      
      // Load the professional's services (owner)
      const services = await storage.getServicesForUser(ownerId);
      
      // Filter only services with active online booking and return essential fields
      const publicServices = services
        .filter(s => s.onlineBooking !== false)
        .map(s => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          color: s.color || "#3f51b5",
          price: s.price || 0
        }));
      
      console.log(`✅ [CLIENT SERVICES] Returned ${publicServices.length} services for ownerId: ${ownerId}`);
      
      // Cache headers (5 minutes)
      res.set({
        'Cache-Control': 'public, max-age=300',
        'Expires': new Date(Date.now() + 300000).toUTCString()
      });
      
      res.json(publicServices);
    } catch (error) {
      console.error(`❌ [CLIENT SERVICES] Error:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public endpoint to get list of active collaborators (for booking requests)
router.get("/api/client-staff", async (req, res) => {
    try {
      const { clientCode } = req.query;
      
      if (!clientCode || typeof clientCode !== 'string') {
        return res.status(400).json({ error: "clientCode required" });
      }
      
      console.log(`👥 [CLIENT STAFF] Requesting staff for clientCode: ${clientCode}`);
      
      // Find client by unique code
      const client = await db.select().from(clients).where(eq(clients.uniqueCode, clientCode)).limit(1);
      
      if (!client || client.length === 0) {
        console.log(`❌ [CLIENT STAFF] Client not found for code: ${clientCode}`);
        return res.status(404).json({ error: "Client not found" });
      }
      
      const ownerId = client[0].userId;
      
      // Load active collaborators of the professional (owner)
      const staffList = await db
        .select()
        .from(staff)
        .where(and(eq(staff.userId, ownerId), eq(staff.isActive, true)))
        .orderBy(staff.firstName, staff.lastName);
      
      // Ritorna only fields essenziali (id, firstName, lastName, specialization)
      const publicStaff = staffList.map(s => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        specialization: s.specialization || null
      }));
      
      console.log(`✅ [CLIENT STAFF] Returned ${publicStaff.length} active collaborators for ownerId: ${ownerId}`);
      
      // Cache headers (5 minutes)
      res.set({
        'Cache-Control': 'public, max-age=300',
        'Expires': new Date(Date.now() + 300000).toUTCString()
      });
      
      res.json(publicStaff);
    } catch (error) {
      console.error(`❌ [CLIENT STAFF] Error:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

export default router;
