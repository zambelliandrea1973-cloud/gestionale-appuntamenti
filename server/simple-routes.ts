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
import posRoutes from './routes/posRoutes';
import setupBankingRoutes from './routes/bankingRoutes';
import setupStaffRoutes from './routes/staffRoutes';
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
import { syncBidirectional, handleWebhookIncrementalSync } from './services/googleCalendarSync';
import { google } from 'googleapis';

// Import storage for new collaborators and rooms functionality
import { storage } from './storage';

// Import booking availability calculator
import { calculateAvailableSlots } from './services/bookingAvailability';

// Lock to prevent race condition in client access tracking
const clientAccessLocks = new Map<number, number>();
// Lock to prevent duplicate user access tracking (30 minutes between each access)
const userAccessLocks = new Map<number, number>();

// Import centralizzato per JSON storage
import { loadStorageData, saveStorageData } from './utils/jsonStorage';

// Import currency helper
import { getCurrencyForUser, formatPriceWithCurrency } from './currencyHelper';

// Import client code generator for unified format
import { generateClientCode as generateNewClientCode } from './utils/clientCodeGenerator';

// Import invoice number generator with professional code prefix
import { generateInvoiceNumber as generateProfessionalInvoiceNumber } from './utils/invoiceNumberGenerator';

// Import client code migration script
import { migrateClientCodes } from './scripts/migrate-client-codes';

// Import PostgreSQL database e Drizzle ORM
import { db } from './db';
import { appointments, services, clients, licenses, marketingMessages, marketingCampaigns, bookingRequests, staff, users, treatmentRooms, invoices, invoiceItems, userIcons, packageTemplates, packagePurchases, packageRedemptions, googleCalendarEvents, clientAccesses, consents as consentsTable, userSettings as userSettingsTable, userLogins, companyNameSettings } from '../shared/schema';
import { eq, and, asc, desc, gte, lte, or, lt, gt, not, like, innerJoin, sql, count } from 'drizzle-orm';

// TYPE INTERFACES - Define common date structures
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

// 📁 STORAGE FUNCTIONS ARE NOW CENTRALIZED IN utils/jsonStorage.ts

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

// Load the Fleur de Vie icon from backup15 at module startup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let defaultIconBase64 = '';
try {
  const iconPath = path.join(__dirname, '../public/fleur-de-vie.jpg');
  const iconBuffer = fs.readFileSync(iconPath);
  defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
  console.log('✅ Fleur de Vie icon loaded:', iconBuffer.length, 'bytes');
} catch (error) {
  console.log('⚠️ Fleur de Vie icon not found at primary path, trying alternate path');
  try {
    const iconPathAlt = path.join(__dirname, '../public/images/Fleur de Vie multicolore.jpg');
    const iconBuffer = fs.readFileSync(iconPathAlt);
    defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
    console.log('✅ Fleur de Vie icon loaded from alternative path:', iconBuffer.length, 'bytes');
  } catch (error2) {
    console.log('⚠️ Fleur de Vie icon not found, using fallback');
    defaultIconBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzQjgyRjYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAySDE0VjRIMTJWMlpNMTIgMThIMTRWMjBIMTJWMThaTTIwIDEwSDE4VjEySDIwVjEwWk02IDEwSDRWMTJINlYxMFpNMTggMTBWMTJIMTZWMTBIMThaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
  }
}

// Simple in-memory data - retrieved from backup15
const userData = {
  9: {
    id: 9,
    username: "zambelli.andrea.1973A@gmail.com",
    email: "zambelli.andrea.1973A@gmail.com",
    type: "customer",
    services: [
      { id: 1, name: "General Visit", duration: 30, price: 50, color: "#3B82F6" },
      { id: 2, name: "Check-up", duration: 15, price: 25, color: "#10B981" }
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
  // Data for admin user (ID 3) - complete backup15 copy
  3: {
    id: 3,
    username: "zambelli.andrea.1973@gmail.com",
    email: "zambelli.andrea.1973@gmail.com",
    type: "admin",
    services: [
      { id: 1, name: "General Consultation", duration: 30, price: 50, color: "#3B82F6" },
      { id: 2, name: "Specialist Visit", duration: 45, price: 80, color: "#10B981" },
      { id: 3, name: "Periodic Check-up", duration: 20, price: 35, color: "#F59E0B" },
      { id: 4, name: "Rehabilitation Therapy", duration: 60, price: 100, color: "#EF4444" },
      { id: 5, name: "Nutritional Consultation", duration: 40, price: 60, color: "#8B5CF6" },
      { id: 6, name: "Physiotherapy", duration: 50, price: 75, color: "#06B6D4" }
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
  
  // Router for manual management (photo/video upload, multilingual content)
  // IMPORTANT: Mounted after setupAuth to have access to req.user
  app.use(manualRoutes);
  
  // Global middleware to block access if the trial has expired
  // IMPORTANT: This middleware runs after authentication
  // and blocks access to features if the trial license has expired
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
  
  // New user registration routes
  app.post("/api/register", async (req, res) => {
    console.log('📝 [REGISTER] Registration request received:', req.body.email);
    try {
      let { name, email, username, password, referralCode } = req.body;
      
      // Minimum validation: only email and password are required
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Automatically generate username and name if provided (simplified UX)
      const emailPrefix = String(email).split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');
      if (!username || username.trim() === '') {
        // Unique username based on email prefix + timestamp if needed
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
      
      // Verify referral code if provided
      let referrerStaff = null;
      if (referralCode && referralCode.trim() !== '') {
        referrerStaff = await storage.getUserByReferralCode(referralCode.trim());
        if (!referrerStaff) {
          console.log(`⚠️ Codice referral invalid: ${referralCode}`);
        } else {
          console.log(`✅ Valid referral code! Sponsor: ${referrerStaff.username} (${referrerStaff.id})`);
        }
      }
      
      // Check if the username is already in use (safety check)
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already in use" });
      }
      
      // Check if the email is already in use
      const { users } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      const { hashPassword } = await import('./auth');
      const { addDays } = await import('date-fns');
      const { licenseService } = await import('./services/licenseService');
      
      const [existingUserByEmail] = await db.select()
                                             .from(users)
                                             .where(eq(users.email, email));
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Create the password hash
      const hashedPassword = await hashPassword(password);
      
      // Create the new user (with referral if present)
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: 'user',
        type: 'customer',
        referredBy: referrerStaff?.id || null
      });
      
      if (referrerStaff) {
        console.log(`🎉 REFERRAL TRACKED: ${newUser.username} sponsored by ${referrerStaff.username}`);
      }
      
      console.log(`✅ New user registered: ${username} (${email}) - Terms accepted: ${new Date().toISOString()}`);
      
      // Create a trial license for user
      try {
        const trialExpiresAt = addDays(new Date(), 40);
        await licenseService.createTrialLicense(newUser.id, trialExpiresAt);
        console.log(`Trial license created for user ${username} with expiry ${trialExpiresAt.toISOString()}`);
      } catch (licenseError) {
        console.error(`Error creating trial license for user ${username}:`, licenseError);
      }

      // Seed demo data (2 clients + 3 services marked isDemo) for the first experience
      try {
        const { seedDemoData } = await import('./services/onboardingDemoService');
        await seedDemoData(newUser.id);
      } catch (demoError) {
        console.error(`Error during demo seeding for user ${username}:`, demoError);
      }
      
      // Persist language preference to user settings before sending welcome email
      // so getUserLanguage() returns the correct value for all future emails
      const { parseLangFromHeader, getUserLanguage } = await import('./utils/userLanguage');
      const detectedLang = parseLangFromHeader(req.headers['accept-language']);
      try {
        const currentSettings = await storage.getUserSettings(newUser.id);
        const currentPrefs = (currentSettings?.preferences as any) || {};
        await storage.updateUserSettings(newUser.id, {
          preferences: { ...currentPrefs, language: detectedLang }
        });
      } catch (langErr) {
        console.error(`⚠️ [WELCOME] Could not persist language preference for user ${newUser.id}:`, langErr);
      }

      // Send welcome email with credentials (asynchronous, does not block the response)
      console.log(`📧 [WELCOME] Starting welcome email send to ${email}...`);
      const { welcomeEmailService } = await import('./services/welcomeEmailService');
      const welcomeLang = await getUserLanguage(newUser.id);
      welcomeEmailService.sendWelcomeEmail(email, username, password, name, welcomeLang)
        .then(sent => {
          if (sent) {
            console.log(`📧 [WELCOME] Welcome email SENT to ${email}`);
          } else {
            console.log(`📧 [WELCOME] Welcome email NOT sent to ${email} (configuration missing or disabled)`);
          }
        })
        .catch(err => {
          console.error(`📧 [WELCOME] ERROR sending welcome email to ${email}:`, err);
        });
      
      // Auto-login: the user is immediately in without having to do manual login
      const { password: _, ...userWithoutPassword } = newUser;
      req.login(newUser, (loginErr) => {
        if (loginErr) {
          console.error(`⚠️ [REGISTER] Auto-login failed for ${username}:`, loginErr);
          return res.status(201).json({
            ...userWithoutPassword,
            message: "Registration completed, please log in",
            autoLogin: false
          });
        }
        console.log(`✅ [REGISTER] Auto-login OK per ${username}`);
        res.status(201).json({
          ...userWithoutPassword,
          message: "Registration completed successfully",
          autoLogin: true
        });
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ message: "An error occurred during registration" });
    }
  });
  
  // Initialize schedulers for automatic reminders
  initializeSchedulers();
  
  // Synchronize user icons from JSON storage to physical PNG files (for PWA)
  // Executed in background without blocking server startup
  syncUserIconsFromJSON().catch(err => {
    console.error('❌ Error synchronizing icons:', err);
  });

  // Connect WhatsApp and notification routes
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/notification-settings', notificationSettingsRoutes);
  app.use('/api/direct-phone', directPhoneRoutes);
  app.use('/api', emailBounceRoutes); // Email bounce management (anti-spam)
  app.use('/api/contact-settings', contactSettingsRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/admin-license', adminLicenseRoutes);
  app.use('/api/referral', referralRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/payments', paymentMethodRoutes);
  app.use('/api/pos', posRoutes);
  setupBankingRoutes(app);
  setupStaffRoutes(app);
  app.use(promotionRoutes); // Public promotions (no prefix because already in /api)
  app.use(manualRoutes); // Manual management with media upload (already in /api)

  // FORCED MOBILE SYNC ENDPOINT - USES POSTGRESQL
  app.get("/api/mobile-sync", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    
    console.log(`📱 [MOBILE-SYNC PG] Forced sync for user ID:${user.id}, type:${user.type}`);
    
    try {
      // 🔄 USE POSTGRESQL: Load date from shared database
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
      
      // MAXIMUM ANTI-CACHE HEADERS
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
      
      console.log(`📱 [MOBILE-SYNC PG] PostgreSQL data synced for user ${user.id}: ${userClients.length} clients, ${userServices.length} services`);
      res.json(syncData);
    } catch (error) {
      console.error(`❌ [MOBILE-SYNC PG] Error synchronizing:`, error);
      res.status(500).json({ message: "Internal server error" });
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

  // TEST ENDPOINT - Does not require auth for debug
  app.get('/api/google-calendar/test-sync', (req, res) => {
    res.json({ success: true, message: 'Test endpoint works!' });
  });

  // DEBUG: Endpoint to test sync without authentication (DEV ONLY)
  app.get('/api/google-calendar/debug-sync/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    try {
      const result = await syncBidirectional(userId, 'Europe/Rome');
      res.json(result);
    } catch (error) {
      console.error(`🔧 [DEBUG-SYNC] Error:`, error);
      res.status(500).json({ error: String(error) });
    }
  });

  // DEBUG: Endpoint to diagnose calendar and find specific event
  app.get('/api/google-calendar/debug-calendars/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const eventIdToFind = req.query.eventId as string || '74q66c336hij4b9i6goj0b9kcgqj2bb16co3gb9kcdj30d9j65h3cp1o68';
    console.log(`🔧 [DEBUG-CALENDARS] Calendar analysis for user ${userId}, searching event: ${eventIdToFind}`);
    
    try {
      // Get token OAuth
      const userRows = await db.select().from(users).where(eq(users.id, userId));
      if (!userRows.length || !userRows[0].googleAuthToken) {
        return res.status(400).json({ error: 'User does not have a Google token' });
      }
      
      const tokenData = JSON.parse(EncryptionService.decryptToken(userRows[0].googleAuthToken));
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials(tokenData);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // 1. List all user calendars
      const calendarList = await calendar.calendarList.list();
      const calendars = calendarList.data.items || [];
      
      console.log(`📅 [DEBUG] Found ${calendars.length} calendars`);
      
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
        
        // Find the specific event in this calendar
        try {
          const eventResponse = await calendar.events.get({
            calendarId: cal.id!,
            eventId: eventIdToFind,
          });
          calInfo.eventFound = true;
          calInfo.eventStatus = eventResponse.data.status;
          calInfo.eventSummary = eventResponse.data.summary;
          calInfo.eventStart = eventResponse.data.start;
          console.log(`✅ [DEBUG] event found in calendar "${cal.summary}" with status=${eventResponse.data.status}`);
        } catch (e: any) {
          if (e.code === 404 || e.response?.status === 404) {
            calInfo.eventFound = false;
            calInfo.eventStatus = 'NOT_FOUND';
            console.log(`❌ [DEBUG] Event NOT found in calendar "${cal.summary}"`);
          } else {
            calInfo.eventFound = 'error';
            calInfo.eventStatus = `ERROR: ${e.message}`;
          }
        }
        
        results.push(calInfo);
      }
      
      // Info about the configured calendar
      const configuredCalendarId = userRows[0].googleCalendarId || 'primary';
      
      res.json({
        userId,
        configuredCalendarId,
        eventIdSearched: eventIdToFind,
        totalCalendars: calendars.length,
        calendars: results
      });
    } catch (error) {
      console.error(`🔧 [DEBUG-CALENDARS] Error:`, error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ── Google Calendar Push Notification webhook ─────────────────────────────
  // Google calls this endpoint (no session cookie) whenever a calendar event changes.
  // We respond 200 immediately, then run an incremental sync for that user in background.
  app.post('/api/google-calendar/webhook', async (req, res) => {
    const channelId = req.headers['x-goog-channel-id'] as string | undefined;
    const resourceState = req.headers['x-goog-resource-state'] as string | undefined;

    // Always ack immediately — Google requires a fast 200
    res.status(200).send('OK');

    // 'sync' is the initial handshake notification — no calendar data changed yet
    if (!channelId || resourceState === 'sync') return;

    // Run incremental sync for the specific user identified by channelId (background)
    handleWebhookIncrementalSync(channelId).catch(err =>
      console.error(`❌ [WEBHOOK] Unhandled error for channelId=${channelId}:`, err)
    );
  });

  // Endpoint for manual Google Calendar synchronization
  app.post('/api/google-calendar/sync-now', async (req, res) => {
    
    try {
      // Verify authentication
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      
      const userId = (req.user as any).id;
      const timeZone = req.body?.timeZone || 'Europe/Rome';
      const forceFullSync = req.body?.forceFullSync === true;
      
      // Timeout: if syncBidirectional hangs (Google API unresponsive), fail fast after 180s
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: Google Calendar API non risponde dopo 180 secondi')), 180_000)
      );
      
      const result = await Promise.race([syncBidirectional(userId, timeZone, forceFullSync), timeoutPromise]);
      
      res.json(result);
    } catch (error: any) {
      console.error('❌ [SYNC-NOW] Fatal error (uncaught outside syncBidirectional):', error?.message || error);
      console.error('❌ [SYNC-NOW] Stack:', error?.stack);
      const errMsg = error?.message || String(error);
      res.status(500).json({ 
        success: false, 
        message: 'Error during synchronization',
        details: { imported: 0, exported: 0, errors: [errMsg] }
      });
    }
  });

  // LEGACY: Endpoint /sync (without -now) to capture requests from old bundles
  app.post('/api/google-calendar/sync', async (req, res) => {
    
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      
      const userId = (req.user as any).id;
      const timeZone = req.body?.timeZone || 'Europe/Rome';
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: Google Calendar API non risponde dopo 180 secondi')), 180_000)
      );
      const result = await Promise.race([syncBidirectional(userId, timeZone), timeoutPromise]);
      res.json(result);
    } catch (error) {
      console.error('❌ [SYNC] Error:', error);
      res.status(500).json({ success: false, message: 'Error during synchronization', error: String(error) });
    }
  });

  // Register Google Calendar API routes
  app.use('/api/google-calendar', googleCalendarApi);
  
  // NOTE: Fallback removed - was intercepting valid endpoints
  
  // Register Google Auth routes
  app.use('/api/google-auth', googleAuthRoutes);
  app.use('/api/push', pushNotificationRoutes);
  app.use(fileRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
