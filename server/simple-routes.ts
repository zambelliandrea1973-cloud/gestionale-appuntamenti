// @ts-nocheck
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import path from "path";
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeSchedulers } from "./services/schedulerService";
import { dataProtectionService } from "./services/dataProtectionService";
import { iconConversionService } from "./services/iconConversionService";
import { syncUserIconsFromJSON } from "./services/iconSyncService";
import { EncryptionService } from "./services/encryption";
import multer from 'multer';
import { checkTrialExpired } from "./middleware/trialBlockMiddleware";
import nodemailer from 'nodemailer';

// Import route modules for WhatsApp and notifications
import notificationRoutes from './routes/notificationRoutes';
import notificationSettingsRoutes from './routes/notificationSettingsRoutes';
import directPhoneRoutes from './routes/directPhoneRoutes';
import contactSettingsRoutes from './routes/contactSettingsRoutes';
import inventoryRoutes from './inventory-routes';
import adminLicenseRoutes from './routes/adminLicenseRoutes';
import referralRoutes from './routes/referralRoutes';
import paymentRoutes from './routes/paymentRoutes';
import paymentMethodRoutes from './routes/paymentMethodRoutes';
import setupBankingRoutes from './routes/bankingRoutes';
import promotionRoutes from './routes/promotionRoutes';
import manualRoutes from './routes/manualRoutes';
import emailBounceRoutes from './routes/emailBounceRoutes';
import googleCalendarApi from './routes/googleCalendarApi';
import googleAuthRoutes from './routes/googleAuthRoutes';
import pushNotificationRoutes from './routes/pushNotificationRoutes';
import collaboratorRoutes from './routes/collaboratorRoutes';
import treatmentRoomRoutes from './routes/treatmentRoomRoutes';
import clientNoteRoutes from './routes/clientNoteRoutes';
import subscriptionPlanRoutes from './routes/subscriptionPlanRoutes';
import serviceRoutes from './routes/serviceRoutes';
import consentRoutes from './routes/consentRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import clientRoutes from './routes/clientRoutes';
import settingsRoutes from './routes/settingsRoutes';
import staffCommissionRoutes from './routes/staffCommissionRoutes';
import passwordResetRoutes from './routes/passwordResetRoutes';
import adminClientRoutes from './routes/adminClientRoutes';
import clientAccessRoutes from './routes/clientAccessRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import clientAreaRoutes from './routes/clientAreaRoutes';
import emailConfigRoutes from './routes/emailConfigRoutes';
import pwaRoutes from './routes/pwaRoutes';
import campaignRoutes from './routes/campaignRoutes';
import fileRoutes from './routes/fileRoutes';
import { pushNotificationService } from './services/pushNotificationService';

// Import AI onboarding module
import { analyzeBusinessNeeds } from './onboarding-ai';
import { processChatMessage, generateMarketingCampaign } from './ai-chat';

// Import notification service for automatic appointment notifications
import { notificationService } from './services/notificationService';

// Import Google Calendar service for sync
import { addAppointmentToGoogleCalendar } from './services/googleCalendarService';
import { syncBidirectional } from './services/googleCalendarSync';
import { google } from 'googleapis';

// Import storage for new collaborators and rooms functionality
import { storage } from './storage';

// Import booking availability calculator
import { calculateAvailableSlots } from './services/bookingAvailability';

// Lock per prevenire race condition nel tracking accessi client
const clientAccessLocks = new Map<number, number>();
// Lock per prevenire duplicati nel tracking accessi utenti (30 minuti tra un accesso e l'altro)
const userAccessLocks = new Map<number, number>();

// Import centralizzato per JSON storage
import { loadStorageData, saveStorageData } from './utils/jsonStorage';

// Import currency helper
import { getCurrencyForUser, formatPriceWithCurrency } from './currencyHelper';

// Import client code generator for unified format
import { generateClientCode as generateNewClientCode } from './utils/clientCodeGenerator';

// Import invoice number generator with professional code prefix
import { generateInvoiceNumber as generateProfessionalInvoiceNumber } from './utils/invoiceNumberGenerator';

// Import script di migrazione codici clienti
import { migrateClientCodes } from './scripts/migrate-client-codes';

// Import PostgreSQL database e Drizzle ORM
import { db } from './db';
import { appointments, services, clients, licenses, marketingMessages, marketingCampaigns, bookingRequests, staff, users, treatmentRooms, invoices, invoiceItems, userIcons, packageTemplates, packagePurchases, packageRedemptions, googleCalendarEvents, clientAccesses, consents as consentsTable, userSettings as userSettingsTable, userLogins, companyNameSettings } from '../shared/schema';
import { eq, and, asc, desc, gte, lte, or, lt, gt, not, like, innerJoin, sql, count } from 'drizzle-orm';

// TYPE INTERFACES - Define common data structures
interface Client {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  ownerId?: number;
}

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  color: string;
  ownerId?: number;
}

interface Invoice {
  invoiceNumber: string;
  ownerId: number;
  date: string;
  [key: string]: any;
}

// 📁 LE FUNZIONI STORAGE SONO ORA CENTRALIZZATE IN utils/jsonStorage.ts

// Middleware di autenticazione
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Non autenticato" });
  }
  next();
}

// Carico l'icona Fleur de Vie dal backup15 all'avvio del modulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let defaultIconBase64 = '';
try {
  const iconPath = path.join(__dirname, '../public/fleur-de-vie.jpg');
  const iconBuffer = fs.readFileSync(iconPath);
  defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
  console.log('✅ Icona Fleur de Vie caricata:', iconBuffer.length, 'bytes');
} catch (error) {
  console.log('⚠️ Icona Fleur de Vie non trovata nel percorso principale, provo percorso alternativo');
  try {
    const iconPathAlt = path.join(__dirname, '../public/images/Fleur de Vie multicolore.jpg');
    const iconBuffer = fs.readFileSync(iconPathAlt);
    defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
    console.log('✅ Icona Fleur de Vie caricata da percorso alternativo:', iconBuffer.length, 'bytes');
  } catch (error2) {
    console.log('⚠️ Icona Fleur de Vie non trovata, uso fallback');
    defaultIconBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzQjgyRjYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAySDE0VjRIMTJWMlpNMTIgMThIMTRWMjBIMTJWMThaTTIwIDEwSDE4VjEySDIwVjEwWk02IDEwSDRWMTJINlYxMFpNMTggMTBWMTJIMTZWMTBIMThaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
  }
}

// Dati semplici in memoria - recuperati dal backup15
const userData = {
  9: {
    id: 9,
    username: "zambelli.andrea.1973A@gmail.com",
    email: "zambelli.andrea.1973A@gmail.com",
    type: "customer",
    services: [
      { id: 1, name: "Visita Generale", duration: 30, price: 50, color: "#3B82F6" },
      { id: 2, name: "Controllo", duration: 15, price: 25, color: "#10B981" }
    ],
    clients: [
      { id: 1, firstName: "Mario", lastName: "Rossi", phone: "3331234567", email: "mario.rossi@email.com" },
      { id: 2, firstName: "Anna", lastName: "Verdi", phone: "3339876543", email: "anna.verdi@email.com" }
    ],
    appointments: [
      { id: 1, clientId: 1, serviceId: 1, date: "2025-01-15", startTime: "09:00", endTime: "09:30", status: "confermato" },
      { id: 2, clientId: 2, serviceId: 2, date: "2025-01-16", startTime: "14:00", endTime: "14:15", status: "confermato" }
    ],
    settings: {
      businessName: "Gestionale Appuntamenti",
      showBusinessName: true
    }
  },
  // Dati per utente admin (ID 3) - copia completa backup15
  3: {
    id: 3,
    username: "zambelli.andrea.1973@gmail.com",
    email: "zambelli.andrea.1973@gmail.com",
    type: "admin",
    services: [
      { id: 1, name: "Consulenza Generale", duration: 30, price: 50, color: "#3B82F6" },
      { id: 2, name: "Visita Specialistica", duration: 45, price: 80, color: "#10B981" },
      { id: 3, name: "Controllo Periodico", duration: 20, price: 35, color: "#F59E0B" },
      { id: 4, name: "Terapia Riabilitativa", duration: 60, price: 100, color: "#EF4444" },
      { id: 5, name: "Consulenza Nutrizionale", duration: 40, price: 60, color: "#8B5CF6" },
      { id: 6, name: "Fisioterapia", duration: 50, price: 75, color: "#06B6D4" }
    ],
    clients: [
      { id: 1, firstName: "Mario", lastName: "Rossi", phone: "3201234567", email: "mario.rossi@esempio.it" },
      { id: 2, firstName: "Zambelli", lastName: "Andrea", phone: "3472550110", email: "zambelli.andrea.1973@gmail.com" },
      { id: 3, firstName: "Bruna", lastName: "Pizzolato", phone: "+393401234567", email: "brunapizzolato77@gmail.com" },
      { id: 4, firstName: "Marco", lastName: "Berto", phone: "+393407654321", email: "marco_berto@msn.com" },
      { id: 5, firstName: "Valentina", lastName: "Cotrino", phone: "+393801808350", email: "" },
      { id: 6, firstName: "Cinzia", lastName: "Munaretto", phone: "+393333637578", email: "" },
      { id: 7, firstName: "Eleonora", lastName: "Tentori", phone: "+393420241919", email: "" },
      { id: 8, firstName: "Cristina", lastName: "Valetti", phone: "+393337124083", email: "" },
      { id: 9, firstName: "Matteo", lastName: "Somaschini", phone: "+393920820219", email: "" },
      { id: 10, firstName: "Leila", lastName: "Baldovin", phone: "+393312936414", email: "leila.baldovin22@gmail.com" },
      { id: 11, firstName: "Rosa", lastName: "Nappi", phone: "+393479687939", email: "" },
      { id: 12, firstName: "Giovanna", lastName: "Spano", phone: "+393666249288", email: "" },
      { id: 13, firstName: "Alan", lastName: "Marconi", phone: "+393337960111", email: "" },
      { id: 14, firstName: "Dino", lastName: "Nappi", phone: "+393385893919", email: "" },
      { id: 15, firstName: "Matteo", lastName: "Libera", phone: "+393494195547", email: "" },
      { id: 16, firstName: "giovanni", lastName: "rizzo", phone: "+392550110", email: "zambelli.andrea.1973@gmail.com" },
      { id: 17, firstName: "giovanni", lastName: "ribbio", phone: "+392550110", email: "zambelli.andrea.1973@gmail.com" },
      { id: 18, firstName: "Giulio", lastName: "Carimati", phone: "+393396253936", email: "" },
      { id: 19, firstName: "Daniela", lastName: "Biglione", phone: "+393392327893", email: "" },
      { id: 20, firstName: "Roberto", lastName: "Mascheroni", phone: "+393357004464", email: "" },
      { id: 21, firstName: "Valeria", lastName: "Benvenuto", phone: "+393348006444", email: "" }
    ],
    appointments: [
      { id: 1, clientId: 1, serviceId: 1, date: "2025-01-15", startTime: "09:00", endTime: "09:30", status: "confermato" },
      { id: 2, clientId: 2, serviceId: 2, date: "2025-01-15", startTime: "10:00", endTime: "10:45", status: "confermato" },
      { id: 3, clientId: 3, serviceId: 3, date: "2025-01-16", startTime: "14:00", endTime: "14:20", status: "in attesa" },
      { id: 4, clientId: 4, serviceId: 4, date: "2025-01-16", startTime: "16:00", endTime: "17:00", status: "confermato" },
      { id: 5, clientId: 5, serviceId: 5, date: "2025-01-17", startTime: "11:00", endTime: "11:40", status: "confermato" },
      { id: 6, clientId: 6, serviceId: 6, date: "2025-01-17", startTime: "15:30", endTime: "16:20", status: "in attesa" },
      { id: 7, clientId: 7, serviceId: 1, date: "2025-01-18", startTime: "08:30", endTime: "09:00", status: "confermato" },
      { id: 8, clientId: 8, serviceId: 2, date: "2025-01-18", startTime: "13:15", endTime: "14:00", status: "confermato" }
    ],
    settings: {
      businessName: "Gestionale Appuntamenti",
      showBusinessName: true
    }
  }
};

export function registerSimpleRoutes(app: Express): Server {
  setupAuth(app);
  
  // Router per gestione manuale (upload foto/video, contenuti multilingua)
  // IMPORTANTE: Montato dopo setupAuth per avere accesso a req.user
  app.use(manualRoutes);
  
  // Middleware globale per bloccare l'accesso se il trial è scaduto
  // IMPORTANTE: Questo middleware viene eseguito dopo l'autenticazione
  // e blocca l'accesso alle funzionalità se la licenza trial è scaduta
  app.use(checkTrialExpired);
  
  app.use(collaboratorRoutes);
  app.use(treatmentRoomRoutes);
  app.use(clientNoteRoutes);
  app.use(subscriptionPlanRoutes);
  app.use(serviceRoutes);
  app.use(consentRoutes);
  app.use(appointmentRoutes);
  app.use(clientRoutes);
  app.use(settingsRoutes);
  app.use(staffCommissionRoutes);
  app.use(passwordResetRoutes);
  app.use(adminClientRoutes);
  app.use(clientAccessRoutes);
  app.use(invoiceRoutes);
  app.use(clientAreaRoutes);
  app.use(emailConfigRoutes);
  app.use(pwaRoutes);
  app.use(campaignRoutes);
  
  // Route di registrazione nuovi utenti
  app.post("/api/register", async (req, res) => {
    console.log('📝 [REGISTER] Richiesta di registrazione ricevuta:', req.body.email);
    try {
      let { name, email, username, password, referralCode } = req.body;
      
      // Verifica minima: solo email e password sono richiesti
      if (!email || !password) {
        return res.status(400).json({ message: "Email e password sono obbligatori" });
      }
      
      // Genera automaticamente username e nome se non forniti (UX semplificata)
      const emailPrefix = String(email).split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');
      if (!username || username.trim() === '') {
        // Username unico basato sul prefisso email + timestamp se necessario
        let candidate = emailPrefix.toLowerCase();
        let suffix = 0;
        while (await storage.getUserByUsername(suffix === 0 ? candidate : `${candidate}${suffix}`)) {
          suffix = suffix === 0 ? Math.floor(Math.random() * 9000 + 1000) : suffix + 1;
        }
        username = suffix === 0 ? candidate : `${candidate}${suffix}`;
      }
      if (!name || name.trim() === '') {
        name = emailPrefix;
      }
      
      // Verifica codice referral se fornito
      let referrerStaff = null;
      if (referralCode && referralCode.trim() !== '') {
        referrerStaff = await storage.getUserByReferralCode(referralCode.trim());
        if (!referrerStaff) {
          console.log(`⚠️ Codice referral non valido: ${referralCode}`);
        } else {
          console.log(`✅ Codice referral valido! Sponsor: ${referrerStaff.username} (${referrerStaff.id})`);
        }
      }
      
      // Verifica se l'username è già in uso (safety check)
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username già in uso" });
      }
      
      // Verifica se l'email è già in uso
      const { users } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      const { hashPassword } = await import('./auth');
      const { addDays } = await import('date-fns');
      const { licenseService } = await import('./services/licenseService');
      
      const [existingUserByEmail] = await db.select()
                                             .from(users)
                                             .where(eq(users.email, email));
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email già in uso" });
      }
      
      // Crea l'hash della password
      const hashedPassword = await hashPassword(password);
      
      // Crea il nuovo utente (con referral se presente)
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: 'user',
        type: 'customer',
        referredBy: referrerStaff?.id || null
      });
      
      if (referrerStaff) {
        console.log(`🎉 REFERRAL TRACCIATO: ${newUser.username} sponsorizzato da ${referrerStaff.username}`);
      }
      
      console.log(`✅ Nuovo utente registrato: ${username} (${email}) - Termini accettati: ${new Date().toISOString()}`);
      
      // Crea una licenza di prova per l'utente
      try {
        const trialExpiresAt = addDays(new Date(), 40);
        await licenseService.createTrialLicense(newUser.id, trialExpiresAt);
        console.log(`Licenza di prova creata per l'utente ${username} con scadenza ${trialExpiresAt.toISOString()}`);
      } catch (licenseError) {
        console.error(`Errore durante la creazione della licenza di prova per l'utente ${username}:`, licenseError);
      }
      
      // Invia email di benvenuto con le credenziali (asincrono, non blocca la risposta)
      console.log(`📧 [WELCOME] Avvio invio email di benvenuto a ${email}...`);
      const { welcomeEmailService } = await import('./services/welcomeEmailService');
      welcomeEmailService.sendWelcomeEmail(email, username, password, name)
        .then(sent => {
          if (sent) {
            console.log(`📧 [WELCOME] Email di benvenuto INVIATA a ${email}`);
          } else {
            console.log(`📧 [WELCOME] Email di benvenuto NON inviata a ${email} (configurazione mancante o disabilitata)`);
          }
        })
        .catch(err => {
          console.error(`📧 [WELCOME] ERRORE invio email di benvenuto a ${email}:`, err);
        });
      
      // Auto-login: l'utente è subito dentro senza dover fare login manuale
      const { password: _, ...userWithoutPassword } = newUser;
      req.login(newUser, (loginErr) => {
        if (loginErr) {
          console.error(`⚠️ [REGISTER] Auto-login fallito per ${username}:`, loginErr);
          return res.status(201).json({
            ...userWithoutPassword,
            message: "Registrazione completata, effettua il login",
            autoLogin: false
          });
        }
        console.log(`✅ [REGISTER] Auto-login OK per ${username}`);
        res.status(201).json({
          ...userWithoutPassword,
          message: "Registrazione completata con successo",
          autoLogin: true
        });
      });
    } catch (error) {
      console.error("Errore durante la registrazione:", error);
      res.status(500).json({ message: "Si è verificato un errore durante la registrazione" });
    }
  });
  
  // Inizializza gli scheduler per i promemoria automatici
  initializeSchedulers();
  
  // Sincronizza icone utente dal JSON storage ai file PNG fisici (per PWA)
  // Eseguito in background senza bloccare l'avvio del server
  syncUserIconsFromJSON().catch(err => {
    console.error('❌ Errore sincronizzazione icone:', err);
  });

  // Connect WhatsApp and notification routes
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/notification-settings', notificationSettingsRoutes);
  app.use('/api/direct-phone', directPhoneRoutes);
  app.use('/api', emailBounceRoutes); // Gestione email bounce (anti-spam)
  app.use('/api/contact-settings', contactSettingsRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/admin-license', adminLicenseRoutes);
  app.use('/api/referral', referralRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/payments', paymentMethodRoutes);
  setupBankingRoutes(app);
  app.use(promotionRoutes); // Promozioni pubbliche (senza prefisso perché già in /api)
  app.use(manualRoutes); // Gestione manuale con upload media (già in /api)

  // ENDPOINT SINCRONIZZAZIONE MOBILE FORZATA - USA POSTGRESQL
  app.get("/api/mobile-sync", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    console.log(`📱 [MOBILE-SYNC PG] Sincronizzazione forzata per utente ID:${user.id}, tipo:${user.type}`);
    
    try {
      // 🔄 USA POSTGRESQL: Carica dati dal database condiviso
      const userClients = await storage.getVisibleClientsForUser(user.id, user.type);
      const userSettings = await storage.getUserSettings(user.id);
      const userServices = await storage.getServicesForUser(user.id);
      
      const syncData = {
        clients: userClients,
        clientsCount: userClients.length,
        companySettings: userSettings || { businessName: "Studio Professionale", showBusinessName: true },
        services: userServices,
        userType: user.type,
        timestamp: Date.now(),
        syncedAt: new Date().toISOString()
      };
      
      // INTESTAZIONI ANTI-CACHE MASSIME
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `mobile-sync-${Date.now()}-${Math.random()}`,
        'Last-Modified': new Date().toUTCString(),
        'Vary': 'User-Agent, x-device-type, x-sync-request',
        'X-Accel-Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Sync-Type': 'mobile-force'
      });
      
      console.log(`📱 [MOBILE-SYNC PG] Dati PostgreSQL sincronizzati per utente ${user.id}: ${userClients.length} clienti, ${userServices.length} servizi`);
      res.json(syncData);
    } catch (error) {
      console.error(`❌ [MOBILE-SYNC PG] Errore sincronizzazione:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // NOTE: admin clients-summary, clients-by-owner, notifications moved to server/routes/adminClientRoutes.ts
  // NOTE: DELETE /api/clients/:id, activation-token, client-access/*, GET /api/clients/:id, /activate moved to server/routes/clientAccessRoutes.ts

  // NOTE: staff/commissions routes moved to server/routes/staffCommissionRoutes.ts
  // NOTE: invoices, packages, PDF generation moved to server/routes/invoiceRoutes.ts
  // NOTE: client area QR routes moved to server/routes/clientAreaRoutes.ts
  // NOTE: email calendar settings moved to server/routes/emailConfigRoutes.ts
  // NOTE: PWA/icons/client-access routes moved to server/routes/pwaRoutes.ts
  // NOTE: campaigns/onboarding/AI/test routes moved to server/routes/campaignRoutes.ts

  // TEST ENDPOINT - Non richiede auth per debug
  app.get('/api/google-calendar/test-sync', (req, res) => {
    res.json({ success: true, message: 'Test endpoint funziona!' });
  });

  // DEBUG: Endpoint per testare sync senza autenticazione (SOLO DEV)
  app.get('/api/google-calendar/debug-sync/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    try {
      const result = await syncBidirectional(userId, 'Europe/Rome');
      res.json(result);
    } catch (error) {
      console.error(`🔧 [DEBUG-SYNC] Errore:`, error);
      res.status(500).json({ error: String(error) });
    }
  });

  // DEBUG: Endpoint per diagnosticare calendario e cercare evento specifico
  app.get('/api/google-calendar/debug-calendars/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const eventIdToFind = req.query.eventId as string || '74q66c336hij4b9i6goj0b9kcgqj2bb16co3gb9kcdj30d9j65h3cp1o68';
    console.log(`🔧 [DEBUG-CALENDARS] Analisi calendari per utente ${userId}, cercando evento: ${eventIdToFind}`);
    
    try {
      // Ottieni token OAuth
      const userRows = await db.select().from(users).where(eq(users.id, userId));
      if (!userRows.length || !userRows[0].googleAuthToken) {
        return res.status(400).json({ error: 'Utente non ha token Google' });
      }
      
      const tokenData = JSON.parse(EncryptionService.decryptToken(userRows[0].googleAuthToken));
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials(tokenData);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // 1. Lista tutti i calendari dell'utente
      const calendarList = await calendar.calendarList.list();
      const calendars = calendarList.data.items || [];
      
      console.log(`📅 [DEBUG] Trovati ${calendars.length} calendari`);
      
      const results: any[] = [];
      
      for (const cal of calendars) {
        const calInfo: any = {
          id: cal.id,
          summary: cal.summary,
          primary: cal.primary || false,
          accessRole: cal.accessRole,
          eventFound: null,
          eventStatus: null
        };
        
        // Cerca l'evento specifico in questo calendario
        try {
          const eventResponse = await calendar.events.get({
            calendarId: cal.id!,
            eventId: eventIdToFind,
          });
          calInfo.eventFound = true;
          calInfo.eventStatus = eventResponse.data.status;
          calInfo.eventSummary = eventResponse.data.summary;
          calInfo.eventStart = eventResponse.data.start;
          console.log(`✅ [DEBUG] Evento TROVATO in calendario "${cal.summary}" con status=${eventResponse.data.status}`);
        } catch (e: any) {
          if (e.code === 404 || e.response?.status === 404) {
            calInfo.eventFound = false;
            calInfo.eventStatus = 'NOT_FOUND';
            console.log(`❌ [DEBUG] Evento NON trovato in calendario "${cal.summary}"`);
          } else {
            calInfo.eventFound = 'error';
            calInfo.eventStatus = `ERROR: ${e.message}`;
          }
        }
        
        results.push(calInfo);
      }
      
      // Info sul calendario configurato
      const configuredCalendarId = userRows[0].googleCalendarId || 'primary';
      
      res.json({
        userId,
        configuredCalendarId,
        eventIdSearched: eventIdToFind,
        totalCalendars: calendars.length,
        calendars: results
      });
    } catch (error) {
      console.error(`🔧 [DEBUG-CALENDARS] Errore:`, error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint per sincronizzazione manuale Google Calendar
  app.post('/api/google-calendar/sync-now', async (req, res) => {
    
    try {
      // Verifica autenticazione
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ success: false, message: 'Non autenticato' });
      }
      
      const userId = (req.user as any).id;
      const timeZone = req.body?.timeZone || 'Europe/Rome'; // Rileva fuso orario dal client o usa default
      
      // Chiama la vera funzione di sincronizzazione bidirezionale
      const result = await syncBidirectional(userId, timeZone);
      
      res.json(result);
    } catch (error) {
      console.error('❌ [SYNC-NOW] Errore:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Errore durante la sincronizzazione',
        details: { imported: 0, exported: 0, errors: [String(error)] }
      });
    }
  });

  // LEGACY: Endpoint /sync (senza -now) per catturare richieste da bundle vecchi
  app.post('/api/google-calendar/sync', async (req, res) => {
    
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ success: false, message: 'Non autenticato' });
      }
      
      const userId = (req.user as any).id;
      const timeZone = req.body?.timeZone || 'Europe/Rome';
      
      const result = await syncBidirectional(userId, timeZone);
      res.json(result);
    } catch (error) {
      console.error('❌ [SYNC] Errore:', error);
      res.status(500).json({ success: false, message: 'Errore durante la sincronizzazione', error: String(error) });
    }
  });

  // Registra le route Google Calendar API
  app.use('/api/google-calendar', googleCalendarApi);
  
  // NOTA: Fallback rimosso - intercettava endpoint validi
  
  // Registra le route Google Auth
  app.use('/api/google-auth', googleAuthRoutes);
  app.use('/api/push', pushNotificationRoutes);
  app.use(fileRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
