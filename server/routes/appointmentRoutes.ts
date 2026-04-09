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

  // Sistema lineare semplice - Appuntamenti (COMPLETAMENTE UNIFICATO MOBILE/DESKTOP)
router.get("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    logger.debug(`📅 [/api/appointments] [${deviceType}] Richiesta da utente ID:${user.id}, tipo:${user.type}, email:${user.username}`);
    console.log(`📱 [/api/appointments] [${deviceType}] Mobile: ${isMobile}, UserAgent: ${userAgent.substring(0, 50)}...`);
    
    // FORZA ANTI-CACHE PER MOBILE - intestazioni aggressive per sincronizzazione
    if (isMobile) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `mobile-${Date.now()}`,
        'Last-Modified': new Date().toUTCString()
      });
      logger.debug(`🔄 [${deviceType}] Intestazioni anti-cache applicate per mobile`);
    }
    
    try {
      // 🔄 USA POSTGRESQL: Carica appuntamenti dal database condiviso
      const userAppointments = await storage.getAppointmentsForUser(user.id, user.type);
      
      logger.debug(`📅 [${deviceType}] Caricati ${userAppointments.length} appuntamenti da PostgreSQL per utente ${user.id}`);
      
      // Converte formato PostgreSQL → JSON per compatibilità frontend
      const formattedAppointments = userAppointments.map(apt => ({
        id: apt.id,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        clientId: apt.clientId,
        client: apt.client, // ✅ Oggetto client completo
        service: apt.service, // ✅ Oggetto service completo
        serviceId: apt.serviceId,
        userId: apt.userId,
        notes: apt.notes,
        reminderSent: apt.reminderSent,
        reminderConfirmed: apt.reminderConfirmed,
        staffId: apt.staffId,
        roomId: apt.roomId,
        staff: apt.staff, // ✅ NEW: Oggetto staff completo (opzionale)
        room: apt.room, // ✅ NEW: Oggetto room completo (opzionale)
        importedFromGoogle: apt.importedFromGoogle, // ✅ Flag per eventi Google importati
        googleEventTitle: apt.googleEventTitle // ✅ Titolo originale evento Google
      }));
      
      res.json(formattedAppointments);
    } catch (error) {
      console.error(`❌ [/api/appointments] Errore caricamento da PostgreSQL:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

router.get("/api/appointments/date/:date", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const { date } = req.params;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    logger.debug(`📅 [/api/appointments/date] [${deviceType}] Utente ${user.id} cerca appuntamenti per data ${date}`);
    
    try {
      // 🔄 USA POSTGRESQL: Carica appuntamenti per data dal database condiviso
      const dayAppointments = await storage.getAppointmentsByDateForUser(date, user.id, user.type);
      
      logger.debug(`📅 [${deviceType}] Caricati ${dayAppointments.length} appuntamenti da PostgreSQL per ${date}`);
      
      // Converte formato PostgreSQL → JSON per compatibilità frontend
      const formattedAppointments = dayAppointments.map(apt => ({
        id: apt.id,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        clientId: apt.clientId,
        client: apt.client, // ✅ Oggetto client completo
        service: apt.service, // ✅ Oggetto service completo
        serviceId: apt.serviceId,
        userId: apt.userId,
        notes: apt.notes,
        reminderSent: apt.reminderSent,
        reminderConfirmed: apt.reminderConfirmed,
        staffId: apt.staffId,
        roomId: apt.roomId,
        staff: apt.staff, // ✅ NEW: Oggetto staff completo (opzionale)
        room: apt.room, // ✅ NEW: Oggetto room completo (opzionale)
        importedFromGoogle: apt.importedFromGoogle, // ✅ Flag per eventi Google importati
        googleEventTitle: apt.googleEventTitle // ✅ Titolo originale evento Google
      }));
      
      res.json(formattedAppointments);
    } catch (error) {
      console.error(`❌ [/api/appointments/date] Errore caricamento da PostgreSQL:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Endpoint per range di appuntamenti (necessario per i report) - USA POSTGRESQL
router.get("/api/appointments/range/:startDate/:endDate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    
    const { startDate, endDate } = req.params;
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    logger.debug(`📊 [/api/appointments/range PG] [${deviceType}] Utente ${user.id} cerca appuntamenti per range ${startDate}-${endDate}`);
    
    // Validazione formato data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({ message: "Formato data non valido. Usa YYYY-MM-DD" });
    }
    
    try {
      // 🔄 USA POSTGRESQL: Carica appuntamenti dal database condiviso
      const allAppointments = await storage.getAppointmentsByDateRange(startDate, endDate);
      
      // Filtra per utente (admin vede tutti, staff solo i propri)
      let userRangeAppointments;
      if (user.type === 'admin') {
        console.log(`👑 [${deviceType}] Admin - Accesso completo a tutti gli appuntamenti per report`);
        userRangeAppointments = allAppointments;
      } else {
        console.log(`👩‍⚕️ [${deviceType}] Staff - Filtro per appuntamenti propri`);
        userRangeAppointments = allAppointments.filter(apt => apt.userId === user.id);
      }
      
      const beforeFilterCount = userRangeAppointments.length;
      userRangeAppointments = userRangeAppointments.filter(apt => {
        const importedValue = apt.importedFromGoogle as any;
        const isImported = importedValue === true || importedValue === 'true' || importedValue === 't';
        return !isImported;
      });
      logger.debug(`📊💻 [${deviceType}] Appuntamenti range ${startDate}-${endDate}: ${userRangeAppointments.length} da PostgreSQL (esclusi ${beforeFilterCount - userRangeAppointments.length} importati da Google Calendar)`);
      
      const rangeAppointmentsWithDetails = userRangeAppointments.map(appointment => ({
        ...appointment, 
        client: appointment.client || { firstName: "Cliente", lastName: "Sconosciuto", id: appointment.clientId },
        service: appointment.service || { name: "Servizio Sconosciuto", id: appointment.serviceId, color: "#666666", price: 0 }
      }));
      
      console.log(`💰 [${deviceType}] Report PostgreSQL: calcolato ricavi per ${rangeAppointmentsWithDetails.length} appuntamenti`);
      res.json(rangeAppointmentsWithDetails);
    } catch (error) {
      console.error(`❌ [/api/appointments/range PG] Errore caricamento da PostgreSQL:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

router.post("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    logger.debug(`📅 [/api/appointments] POST - Creazione appuntamento per utente ${user.id}`);
    logger.debug(`📝 Dati ricevuti:`, req.body);
    
    try {
      // 📅 CALCOLA reminder_time: 24 ore prima dell'appuntamento
      let reminderTime = null;
      if (req.body.date && req.body.startTime) {
        const appointmentDateTime = new Date(`${req.body.date}T${req.body.startTime}`);
        reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 ore prima
        logger.debug(`⏰ [REMINDER] Calcolato reminder_time: ${reminderTime.toISOString()} (24h prima di ${appointmentDateTime.toISOString()})`);
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
            throw new Error('CONFLICT: Esiste già un appuntamento in questo orario per la stessa risorsa');
          }
        }
        
        const [created] = await tx.insert(appointments).values(appointmentData).returning();
        return created;
      });
      
      logger.debug(`✅ [PostgreSQL] Appuntamento ${newAppointment.id} creato con staffId: ${newAppointment.staffId}, roomId: ${newAppointment.roomId}, packagePurchaseId: ${newAppointment.packagePurchaseId}, reminderTime: ${reminderTime?.toISOString() || 'null'}`);
      
      // 🔄 GOOGLE CALENDAR SYNC: Esporta automaticamente a Google se abilitato
      try {
        const [googleUser] = await db.select().from(users).where(eq(users.id, user.id));
        if (googleUser && googleUser.googleCalendarEnabled && googleUser.googleAuthToken) {
          
          // Crea direttamente l'evento in Google Calendar usando il token dell'utente
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
          
          // Ottieni dati cliente e servizio
          const [clientData] = await db.select().from(clients).where(eq(clients.id, newAppointment.clientId));
          const serviceData = newAppointment.serviceId 
            ? await db.select().from(services).where(eq(services.id, newAppointment.serviceId)).then(r => r[0])
            : null;
          
          if (clientData) {
            // USA formato ISO SENZA Z per rispettare il fuso orario Europe/Rome
            // Gestisci sia formato HH:MM che HH:MM:SS
            const startTime = newAppointment.startTime.length === 5 ? `${newAppointment.startTime}:00` : newAppointment.startTime;
            const endTime = newAppointment.endTime.length === 5 ? `${newAppointment.endTime}:00` : newAppointment.endTime;
            const startDateTimeStr = `${newAppointment.date}T${startTime}`;
            const endDateTimeStr = `${newAppointment.date}T${endTime}`;
            
            
            const summary = serviceData 
              ? `${clientData.firstName} ${clientData.lastName} - ${serviceData.name}`
              : `Appuntamento con ${clientData.firstName} ${clientData.lastName}`;
            
            const description = newAppointment.notes 
              ? `Note: ${newAppointment.notes}\nCliente: ${clientData.firstName} ${clientData.lastName}\nTelefono: ${clientData.phone || 'Non disponibile'}\nEmail: ${clientData.email || 'Non disponibile'}`
              : `Cliente: ${clientData.firstName} ${clientData.lastName}\nTelefono: ${clientData.phone || 'Non disponibile'}\nEmail: ${clientData.email || 'Non disponibile'}`;
            
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
            
            // Salva il google_event_id e marca come sincronizzato
            if (response.data.id) {
              await db.update(appointments)
                .set({ synced: true, googleEventId: response.data.id })
                .where(eq(appointments.id, newAppointment.id));
              
              // Salva anche nella tabella di mapping per UPDATE/DELETE
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
        console.error(`⚠️ [GOOGLE SYNC] Errore sincronizzazione Google per appuntamento ${newAppointment.id}:`, syncError);
        // Non bloccare la creazione dell'appuntamento se la sincronizzazione fallisce
      }
      
      // 📦 PACCHETTI: Scala automaticamente sessioni se appuntamento usa un pacchetto
      if (req.body.packagePurchaseId) {
        try {
          const packagePurchaseId = req.body.packagePurchaseId;
          logger.debug(`📦 [PACKAGE] Appuntamento ${newAppointment.id} usa pacchetto ${packagePurchaseId}, inizio riscatto sessione...`);
          
          // Recupera il pacchetto acquistato
          const [packagePurchase] = await db.select().from(packagePurchases).where(eq(packagePurchases.id, packagePurchaseId));
          
          if (!packagePurchase) {
            console.error(`❌ [PACKAGE] Pacchetto ${packagePurchaseId} non trovato`);
          } else if (packagePurchase.sessionsRemaining <= 0) {
            console.error(`❌ [PACKAGE] Pacchetto ${packagePurchaseId} non ha sessioni rimanenti`);
          } else {
            // Decrementa sessioni rimanenti
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
            
            // Crea record di riscatto
            const redemptionData: Record<string, any> = {
              packagePurchaseId: packagePurchaseId,
              appointmentId: newAppointment.id,
              redeemedAt: new Date(),
              notes: `Appuntamento ${newAppointment.id} del ${req.body.date}`
            };
            await db.insert(packageRedemptions).values(redemptionData);
            
            logger.debug(`✅ [PACKAGE] Sessione riscattata! Pacchetto ${packagePurchaseId}: ${newSessionsRemaining}/${packagePurchase.sessionsTotal} rimanenti (status: ${newStatus})`);
          }
        } catch (packageError) {
          console.error(`❌ [PACKAGE] Errore riscatto sessione:`, packageError);
          // Non bloccare la creazione dell'appuntamento se il riscatto fallisce
        }
      }
      
      // 📧 EMAIL AUTOMATICHE GESTITE DA SCHEDULER
      // Le notifiche email vengono inviate automaticamente dallo scheduler 24h prima
      // Le notifiche WhatsApp possono essere inviate manualmente dal WhatsApp Center
      logger.debug(`📧 [NOTIFICHE] Appuntamento creato - email automatica schedulata per ${reminderTime?.toISOString() || 'N/A'}`);
      
      res.status(201).json(newAppointment);
    } catch (error: any) {
      if (error?.message?.startsWith('CONFLICT:')) {
        console.warn(`⚠️ [/api/appointments] Conflitto orario: ${error.message}`);
        return res.status(409).json({ message: error.message.replace('CONFLICT: ', '') });
      }
      console.error(`❌ [/api/appointments] Errore creazione appuntamento:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

router.get("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const appointmentId = parseInt(req.params.id);
    
    console.log(`📖 [/api/appointments/:id] GET - Richiesta appuntamento ${appointmentId} da utente ${user.id}`);
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({ message: "ID appuntamento non valido" });
    }
    
    try {
      // 🔄 USA POSTGRESQL: Recupera appuntamento dal database condiviso
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        console.log(`❌ [GET] Appuntamento ${appointmentId} non trovato`);
        return res.status(404).json({ message: "Appuntamento non trovato" });
      }
      
      logger.debug(`✅ [PostgreSQL] Appuntamento ${appointmentId} recuperato`);
      res.status(200).json(appointment);
    } catch (error) {
      console.error(`❌ [/api/appointments/:id] Errore recupero appuntamento:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

router.put("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const appointmentId = parseInt(req.params.id);
    
    logger.debug(`📝 [/api/appointments/:id] PUT - Aggiornamento appuntamento ${appointmentId} per utente ${user.id}`);
    logger.debug(`📝 Dati ricevuti:`, req.body);
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({ message: "ID appuntamento non valido" });
    }
    
    try {
      // 🔄 USA POSTGRESQL: Aggiorna appuntamento nel database condiviso
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
        console.log(`❌ [PUT] Appuntamento ${appointmentId} non trovato`);
        return res.status(404).json({ message: "Appuntamento non trovato" });
      }
      
      logger.debug(`✅ [PostgreSQL] Appuntamento ${appointmentId} aggiornato con staffId: ${updatedAppointment.staffId}, roomId: ${updatedAppointment.roomId}`);
      
      // 🔄 GOOGLE CALENDAR SYNC: Aggiorna in Google Calendar se abilitato
      // IMPORTANTE: Non aggiornare eventi IMPORTATI da Google Calendar!
      // Questi eventi hanno origine esterna e non devono essere modificati dal gestionale
      if (updatedAppointment.importedFromGoogle) {
        console.log(`⏭️ [GOOGLE SYNC] Skip update per appuntamento ${appointmentId} - importato da Google Calendar`);
      } else {
        try {
          const [googleUser] = await db.select().from(users).where(eq(users.id, user.id));
          if (googleUser && googleUser.googleCalendarEnabled && googleUser.googleAuthToken) {
            // Cerca l'evento Google collegato
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
              
              // Ottieni dati cliente e servizio
              const [clientData] = await db.select().from(clients).where(eq(clients.id, updatedAppointment.clientId));
              const serviceData = updatedAppointment.serviceId 
                ? await db.select().from(services).where(eq(services.id, updatedAppointment.serviceId)).then(r => r[0])
                : null;
              
              if (clientData) {
                const startDateTime = new Date(`${updatedAppointment.date}T${updatedAppointment.startTime}`);
                const endDateTime = new Date(`${updatedAppointment.date}T${updatedAppointment.endTime}`);
                
                const summary = serviceData 
                  ? `${clientData.firstName} ${clientData.lastName} - ${serviceData.name}`
                  : `Appuntamento con ${clientData.firstName} ${clientData.lastName}`;
                
                const description = updatedAppointment.notes 
                  ? `Note: ${updatedAppointment.notes}\nCliente: ${clientData.firstName} ${clientData.lastName}`
                  : `Cliente: ${clientData.firstName} ${clientData.lastName}`;
                
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
              
              // Aggiorna timestamp sync
              await db.update(googleCalendarEvents)
                .set({ lastSyncAt: new Date(), syncStatus: 'synced' })
                .where(eq(googleCalendarEvents.appointmentId, appointmentId));
              
            }
          }
        }
        } catch (syncError) {
          console.error(`⚠️ [GOOGLE SYNC] Errore aggiornamento in Google (non bloccante):`, syncError);
        }
      }
      
      res.status(200).json(updatedAppointment);
    } catch (error) {
      console.error(`❌ [/api/appointments/:id] Errore aggiornamento appuntamento:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

router.delete("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const appointmentId = parseInt(req.params.id);
    
    logger.debug(`🗑️ [DELETE] ===== INIZIO RICHIESTA DELETE =====`);
    logger.debug(`🗑️ [DELETE] Tentativo eliminazione appuntamento ${appointmentId} da utente ${user.id} (${user.type})`);
    
    if (isNaN(appointmentId)) {
      logger.debug(`🗑️ [DELETE] ID non valido: ${req.params.id}`);
      return res.status(400).json({ message: "ID appuntamento non valido" });
    }
    
    try {
      logger.debug(`🗑️ [DELETE] Step 1: Recupero appuntamento ${appointmentId}...`);
      // Prima ottieni l'appuntamento per la sync Google
      const existingAppointment = await storage.getAppointment(appointmentId);
      logger.debug(`🗑️ [DELETE] Step 2: Appuntamento trovato: ${!!existingAppointment}, importedFromGoogle: ${existingAppointment?.importedFromGoogle}`);
      
      // 🔄 VERIFICA SE È UN EVENTO IMPORTATO DA GOOGLE (doppio controllo)
      logger.debug(`🗑️ [DELETE] Step 3: Verifica mapping google_calendar_events...`);
      const [eventMapping] = await db.select()
        .from(googleCalendarEvents)
        .where(eq(googleCalendarEvents.appointmentId, appointmentId))
        .limit(1);
      logger.debug(`🗑️ [DELETE] Step 4: Mapping trovato: ${!!eventMapping}, syncDirection: ${eventMapping?.syncDirection}`);
      
      // Blocca eliminazione se: 
      // 1. Il mapping esiste con syncDirection='import', OPPURE
      // 2. L'appuntamento ha importedFromGoogle=true (fallback se mapping manca o errato)
      const isGoogleImport = 
        (eventMapping && eventMapping.syncDirection === 'import') || 
        (existingAppointment && existingAppointment.importedFromGoogle === true);
      
      logger.debug(`🗑️ [DELETE] Step 5: isGoogleImport = ${isGoogleImport}`);
      
      if (isGoogleImport) {
        console.log(`🚫 [DELETE] ===== BLOCCO ELIMINAZIONE EVENTO GOOGLE =====`);
        console.log(`🚫 [DELETE] Motivo: syncDir=${eventMapping?.syncDirection}, importedFlag=${existingAppointment?.importedFromGoogle}`);
        return res.status(403).json({ 
          message: "Questo evento è stato importato da Google Calendar e non può essere eliminato dall'app. Per eliminarlo, accedi direttamente a Google Calendar.",
          isGoogleImport: true
        });
      }
      
      // 🔄 USA POSTGRESQL: Elimina appuntamento dal database condiviso
      const deleted = await storage.deleteAppointment(appointmentId);
      
      if (!deleted) {
        console.log(`❌ [DELETE] Appuntamento ${appointmentId} non trovato`);
        return res.status(404).json({ message: "Appuntamento non trovato" });
      }
      
      console.log(`✅ [DELETE] Appuntamento ${appointmentId} eliminato da PostgreSQL per utente ${user.id}`);
      
      // 🔄 GOOGLE CALENDAR SYNC: Elimina da Google Calendar se abilitato (solo eventi esportati)
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
              
              // Usa il calendarId salvato nel mapping
              const targetCalendarId = eventMapping.calendarId || googleUser.googleCalendarId || 'primary';
              
              await calendar.events.delete({
                calendarId: targetCalendarId,
                eventId: eventMapping.googleEventId,
              });
              
              logger.debug(`✅ [GOOGLE SYNC] Evento ${eventMapping.googleEventId} eliminato da Google Calendar`);
              
              // Rimuovi il mapping
              await db.delete(googleCalendarEvents)
                .where(eq(googleCalendarEvents.appointmentId, appointmentId));
          }
        } catch (syncError) {
          console.error(`⚠️ [GOOGLE SYNC] Errore eliminazione da Google (non bloccante):`, syncError);
        }
      }
      
      res.status(200).json({ message: "Appuntamento eliminato con successo" });
    } catch (error) {
      console.error(`❌ [DELETE] Errore eliminazione appuntamento:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // ==================== BOOKING REQUESTS API ====================
  // API per richieste di prenotazione da parte dei clienti

  // POST /api/booking-requests - Cliente crea richiesta (calcola slot automaticamente)
router.post("/api/booking-requests", async (req, res) => {
    try {
      const { clientCode, serviceId, staffId, requestedDate, requestedTimeStart, requestedTimeEnd, clientNotes } = req.body;
      
      logger.debug(`📝 [BOOKING REQUEST] Nuova richiesta da cliente ${clientCode} ${staffId ? `con preferenza staff ${staffId}` : 'senza preferenza staff'}`);
      
      // Trova il cliente dal codice univoco
      const client = await db.select().from(clients).where(eq(clients.uniqueCode, clientCode)).limit(1);
      if (!client || client.length === 0) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }
      
      const clientData = client[0];
      const userId = clientData.userId;
      
      // Trova il servizio per ottenere la durata
      const service = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
      if (!service || service.length === 0) {
        return res.status(404).json({ error: "Servizio non trovato" });
      }
      
      const serviceDuration = service[0].duration; // minuti
      
      // Calcola slot disponibili nella fascia oraria richiesta
      // Se il cliente ha scelto un professionista, verifica solo la sua disponibilità
      const proposedSlots = await calculateAvailableSlots({
        userId,
        date: requestedDate,
        timeStart: requestedTimeStart,
        timeEnd: requestedTimeEnd,
        duration: serviceDuration,
        staffId: staffId || undefined // Passa preferenza professionista se presente
      });
      
      // Crea la richiesta con stato "slots_proposed"
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
      
      console.log(`✅ [BOOKING REQUEST] Richiesta ${newRequest[0].id} creata con ${proposedSlots.length} slot proposti`);
      res.status(201).json({ request: newRequest[0], proposedSlots });
    } catch (error) {
      console.error(`❌ [BOOKING REQUEST] Errore creazione richiesta:`, error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // GET /api/booking-requests - Admin vede richieste pendenti (multi-tenant)
router.get("/api/booking-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
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
        clientName: `Cliente n°${req.clientId} ${req.clientFirstName} ${req.clientLastName}`,
        clientFirstName: undefined,
        clientLastName: undefined,
      }));
      
      res.status(200).json(formattedRequests);
    } catch (error) {
      console.error(`❌ [BOOKING REQUEST] Errore recupero richieste:`, error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // PUT /api/booking-requests/:id/select-slot - Cliente seleziona uno slot proposto
router.put("/api/booking-requests/:id/select-slot", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { selectedSlotIndex, clientCode } = req.body;
      
      // Validazione input
      if (typeof selectedSlotIndex !== 'number' || selectedSlotIndex < 0) {
        return res.status(400).json({ error: "Indice slot non valido" });
      }
      
      if (!clientCode) {
        return res.status(400).json({ error: "Codice cliente mancante" });
      }
      
      // Trova la richiesta
      const request = await db.select().from(bookingRequests).where(eq(bookingRequests.id, requestId)).limit(1);
      if (!request || request.length === 0) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }
      
      const requestData = request[0];
      
      // SECURITY: Verifica che il cliente sia il proprietario della richiesta
      const client = await db.select().from(clients).where(eq(clients.id, requestData.clientId)).limit(1);
      if (!client || client.length === 0 || client[0].uniqueCode !== clientCode) {
        console.error(`❌ [SECURITY] Tentativo accesso non autorizzato alla richiesta ${requestId} da cliente ${clientCode}`);
        return res.status(403).json({ error: "Non autorizzato" });
      }
      
      // Verifica stato e scadenza
      if (requestData.status !== "slots_proposed") {
        return res.status(400).json({ error: "Richiesta non in stato corretto per selezione slot" });
      }
      
      if (requestData.selectionExpiresAt && new Date() > requestData.selectionExpiresAt) {
        // Scaduta, aggiorna stato
        await db.update(bookingRequests)
          .set({ status: "cancelled", statusUpdatedAt: new Date() })
          .where(eq(bookingRequests.id, requestId));
        return res.status(400).json({ error: "Tempo di selezione scaduto" });
      }
      
      // Verifica indice slot valido
      if (!requestData.proposedSlots || selectedSlotIndex >= requestData.proposedSlots.length) {
        return res.status(400).json({ error: "Indice slot non valido" });
      }
      
      // Aggiorna richiesta con slot selezionato
      const updated = await db.update(bookingRequests)
        .set({
          selectedSlot: requestData.proposedSlots[selectedSlotIndex],
          status: "client_selected",
          statusUpdatedAt: new Date()
        })
        .where(eq(bookingRequests.id, requestId))
        .returning();
      
      console.log(`✅ [BOOKING REQUEST] Cliente ha selezionato slot per richiesta ${requestId}`);
      res.status(200).json(updated[0]);
    } catch (error) {
      console.error(`❌ [BOOKING REQUEST] Errore selezione slot:`, error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // PUT /api/booking-requests/:id/confirm - Admin conferma e crea appuntamento
router.put("/api/booking-requests/:id/confirm", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    try {
      const requestId = parseInt(req.params.id);
      const { staffId: manualStaffId, roomId: manualRoomId } = req.body; // Override manuale opzionale
      
      // Trova la richiesta
      const request = await db.select().from(bookingRequests).where(eq(bookingRequests.id, requestId)).limit(1);
      if (!request || request.length === 0) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }
      
      const requestData = request[0];
      
      // Verifica permessi multi-tenant
      if (requestData.userId !== user.id) {
        return res.status(403).json({ error: "Non autorizzato" });
      }
      
      // Verifica stato
      if (requestData.status !== "client_selected") {
        return res.status(400).json({ error: "Cliente deve selezionare uno slot prima della conferma" });
      }
      
      if (!requestData.selectedSlot) {
        return res.status(400).json({ error: "Nessuno slot selezionato" });
      }
      
      // Determina staffId finale (admin override > preferenza cliente > null)
      const finalStaffId = manualStaffId || requestData.staffId || null;
      
      // Re-verifica disponibilità slot prima di confermare (evita race conditions)
      // IMPORTANTE: usa finalStaffId per validare anche override admin
      const service = await db.select().from(services).where(eq(services.id, requestData.serviceId)).limit(1);
      if (!service || service.length === 0) {
        return res.status(404).json({ error: "Servizio non trovato" });
      }
      
      const currentSlots = await calculateAvailableSlots({
        userId: requestData.userId,
        date: requestData.requestedDate,
        timeStart: requestData.selectedSlot.start,
        timeEnd: requestData.selectedSlot.end,
        duration: service[0].duration,
        staffId: finalStaffId || undefined // Valida disponibilità professionista finale
      });
      
      // Verifica che lo slot selezionato sia ancora disponibile
      const slotStillAvailable = currentSlots.some(
        slot => slot.start === requestData.selectedSlot?.start && slot.end === requestData.selectedSlot?.end
      );
      
      if (!slotStillAvailable) {
        console.error(`❌ [BOOKING REQUEST] Slot ${requestData.selectedSlot?.start}-${requestData.selectedSlot?.end} non più disponibile`);
        return res.status(409).json({ error: "Lo slot selezionato non è più disponibile. Scegli un altro orario." });
      }
      
      // ASSEGNAZIONE STANZA: automatica o con validazione override admin
      
      // Carica stanze attive
      const activeRooms = await db.select()
        .from(treatmentRooms)
        .where(and(
          eq(treatmentRooms.userId, requestData.userId),
          eq(treatmentRooms.isActive, true)
        ))
        .orderBy(treatmentRooms.id); // Ordina per ID per determinismo
      
      let assignedRoomId: number | null = null;
      
      if (activeRooms.length > 0) {
        // Trova appuntamenti che si sovrappongono con lo slot selezionato
        const overlappingAppointments = await db.select()
          .from(appointments)
          .where(and(
            eq(appointments.userId, requestData.userId),
            eq(appointments.date, requestData.requestedDate),
            or(
              // Appuntamento inizia nello slot
              and(gte(appointments.startTime, requestData.selectedSlot.start), lt(appointments.startTime, requestData.selectedSlot.end)),
              // Appuntamento finisce nello slot
              and(gt(appointments.endTime, requestData.selectedSlot.start), lte(appointments.endTime, requestData.selectedSlot.end)),
              // Appuntamento copre lo slot intero
              and(lte(appointments.startTime, requestData.selectedSlot.start), gte(appointments.endTime, requestData.selectedSlot.end))
            )
          ));
        
        // Estrai roomId occupati
        const occupiedRoomIds = new Set(
          overlappingAppointments
            .map(apt => apt.roomId)
            .filter((id): id is number => id !== null && id !== undefined)
        );
        
        if (manualRoomId) {
          // VALIDAZIONE OVERRIDE ADMIN: verifica che stanza manuale sia libera
          if (occupiedRoomIds.has(manualRoomId)) {
            console.error(`❌ [BOOKING REQUEST] Stanza ${manualRoomId} già occupata nello slot selezionato`);
            return res.status(409).json({ error: "La stanza selezionata è già occupata in questo orario. Scegli un'altra stanza o lascia assegnazione automatica." });
          }
          
          // Verifica che la stanza esista e sia attiva
          const manualRoom = activeRooms.find(r => r.id === manualRoomId);
          if (!manualRoom) {
            return res.status(400).json({ error: "Stanza selezionata non trovata o non attiva" });
          }
          
          assignedRoomId = manualRoomId;
          console.log(`✅ [BOOKING REQUEST] Stanza ${manualRoom.name} (ID ${manualRoomId}) assegnata manualmente dall'admin`);
        } else {
          // ASSEGNAZIONE AUTOMATICA: trova prima stanza libera
          const freeRoom = activeRooms.find(room => !occupiedRoomIds.has(room.id));
          
          if (freeRoom) {
            assignedRoomId = freeRoom.id;
            console.log(`✅ [BOOKING REQUEST] Stanza ${freeRoom.name} (ID ${freeRoom.id}) assegnata automaticamente`);
          } else {
            logger.debug(`⚠️ [BOOKING REQUEST] Nessuna stanza libera trovata, appuntamento creato senza stanza assegnata`);
          }
        }
      }
      
      // finalStaffId già calcolato sopra (prima della re-verifica)
      
      // Calcola endTime in base alla durata effettiva del servizio
      const startTimeParts = requestData.selectedSlot.start.split(':');
      const startDate = new Date();
      startDate.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0, 0);
      const endDate = new Date(startDate.getTime() + service[0].duration * 60000);
      const calculatedEndTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;
      
      // TRANSACTION: Crea appuntamento e aggiorna richiesta atomicamente
      const newAppointment = await db.insert(appointments).values({
        userId: requestData.userId,
        clientId: requestData.clientId,
        serviceId: requestData.serviceId,
        staffId: finalStaffId,
        roomId: assignedRoomId,
        date: requestData.requestedDate,
        startTime: requestData.selectedSlot.start,
        endTime: calculatedEndTime, // Usa durata effettiva del servizio
        notes: requestData.clientNotes || "",
        status: "scheduled",
        reminderType: "whatsapp,email"
      }).returning();
      
      // Aggiorna richiesta come confermata
      await db.update(bookingRequests)
        .set({
          status: "admin_confirmed",
          appointmentId: newAppointment[0].id,
          statusUpdatedAt: new Date()
        })
        .where(eq(bookingRequests.id, requestId));
      
      console.log(`✅ [BOOKING REQUEST] Richiesta ${requestId} confermata, appuntamento ${newAppointment[0].id} creato`);
      
      // 🔔 PUSH NOTIFICATION: Invia notifica al cliente
      try {
        const formattedDate = new Date(requestData.requestedDate).toLocaleDateString('it-IT', {
          weekday: 'long', day: 'numeric', month: 'long'
        });
        
        await pushNotificationService.sendAppointmentConfirmed(requestData.clientId, {
          serviceName: service[0].name,
          date: formattedDate,
          time: requestData.selectedSlot.start.substring(0, 5)
        });
        console.log(`🔔 [PUSH] Notifica conferma inviata al cliente ${requestData.clientId}`);
      } catch (pushError) {
        console.error('⚠️ [PUSH] Errore invio notifica (non bloccante):', pushError);
      }
      
      res.status(200).json({ appointment: newAppointment[0], request: requestData });
    } catch (error) {
      console.error(`❌ [BOOKING REQUEST] Errore conferma richiesta:`, error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // PUT /api/booking-requests/:id/reject - Admin rifiuta richiesta
router.put("/api/booking-requests/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    try {
      const requestId = parseInt(req.params.id);
      const { adminNotes } = req.body;
      
      // Trova la richiesta
      const request = await db.select().from(bookingRequests).where(eq(bookingRequests.id, requestId)).limit(1);
      if (!request || request.length === 0) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }
      
      const requestData = request[0];
      
      // Verifica permessi multi-tenant
      if (requestData.userId !== user.id) {
        return res.status(403).json({ error: "Non autorizzato" });
      }
      
      // Aggiorna come rifiutata
      const updated = await db.update(bookingRequests)
        .set({
          status: "rejected",
          adminNotes: adminNotes || null,
          statusUpdatedAt: new Date()
        })
        .where(eq(bookingRequests.id, requestId))
        .returning();
      
      console.log(`❌ [BOOKING REQUEST] Richiesta ${requestId} rifiutata dall'admin`);
      res.status(200).json(updated[0]);
    } catch (error) {
      console.error(`❌ [BOOKING REQUEST] Errore rifiuto richiesta:`, error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // GET /api/client-services - Pubblico: servizi disponibili per cliente PWA (via clientCode)
router.get("/api/client-services", async (req, res) => {
    try {
      const { clientCode } = req.query;
      
      if (!clientCode || typeof clientCode !== 'string') {
        return res.status(400).json({ error: "clientCode richiesto" });
      }
      
      logger.debug(`🔍 [CLIENT SERVICES] Richiesta servizi per clientCode: ${clientCode}`);
      
      // Trova cliente dal codice univoco
      const client = await db.select().from(clients).where(eq(clients.uniqueCode, clientCode)).limit(1);
      
      if (!client || client.length === 0) {
        console.log(`❌ [CLIENT SERVICES] Cliente non trovato per code: ${clientCode}`);
        return res.status(404).json({ error: "Cliente non trovato" });
      }
      
      const ownerId = client[0].userId;
      
      // Carica servizi del professionista (owner)
      const services = await storage.getServicesForUser(ownerId);
      
      // Filtra solo servizi con prenotazione online attiva e ritorna campi essenziali
      const publicServices = services
        .filter(s => s.onlineBooking !== false)
        .map(s => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          color: s.color || "#3f51b5",
          price: s.price || 0
        }));
      
      console.log(`✅ [CLIENT SERVICES] Ritornati ${publicServices.length} servizi per ownerId: ${ownerId}`);
      
      // Cache headers (5 minuti)
      res.set({
        'Cache-Control': 'public, max-age=300',
        'Expires': new Date(Date.now() + 300000).toUTCString()
      });
      
      res.json(publicServices);
    } catch (error) {
      console.error(`❌ [CLIENT SERVICES] Errore:`, error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Endpoint pubblico per ottenere lista collaboratori attivi (per richieste prenotazione)
router.get("/api/client-staff", async (req, res) => {
    try {
      const { clientCode } = req.query;
      
      if (!clientCode || typeof clientCode !== 'string') {
        return res.status(400).json({ error: "clientCode richiesto" });
      }
      
      console.log(`👥 [CLIENT STAFF] Richiesta collaboratori per clientCode: ${clientCode}`);
      
      // Trova cliente dal codice univoco
      const client = await db.select().from(clients).where(eq(clients.uniqueCode, clientCode)).limit(1);
      
      if (!client || client.length === 0) {
        console.log(`❌ [CLIENT STAFF] Cliente non trovato per code: ${clientCode}`);
        return res.status(404).json({ error: "Cliente non trovato" });
      }
      
      const ownerId = client[0].userId;
      
      // Carica collaboratori attivi del professionista (owner)
      const staffList = await db
        .select()
        .from(staff)
        .where(and(eq(staff.userId, ownerId), eq(staff.isActive, true)))
        .orderBy(staff.firstName, staff.lastName);
      
      // Ritorna solo campi essenziali (id, firstName, lastName, specialization)
      const publicStaff = staffList.map(s => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        specialization: s.specialization || null
      }));
      
      console.log(`✅ [CLIENT STAFF] Ritornati ${publicStaff.length} collaboratori attivi per ownerId: ${ownerId}`);
      
      // Cache headers (5 minuti)
      res.set({
        'Cache-Control': 'public, max-age=300',
        'Expires': new Date(Date.now() + 300000).toUTCString()
      });
      
      res.json(publicStaff);
    } catch (error) {
      console.error(`❌ [CLIENT STAFF] Errore:`, error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

export default router;
