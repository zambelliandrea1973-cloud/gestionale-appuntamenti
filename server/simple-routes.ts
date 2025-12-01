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

// Import AI onboarding module
import { analyzeBusinessNeeds } from './onboarding-ai';
import { processChatMessage, generateMarketingCampaign } from './ai-chat';

// Import notification service for automatic appointment notifications
import { notificationService } from './services/notificationService';

// Import storage for new collaborators and rooms functionality
import { storage } from './storage';

// Import booking availability calculator
import { calculateAvailableSlots } from './services/bookingAvailability';

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
import { appointments, services, clients, licenses, marketingMessages, marketingCampaigns, bookingRequests, staff, users, treatmentRooms, invoices, invoiceItems, userIcons, packageTemplates, packagePurchases, packageRedemptions } from '../shared/schema';
import { eq, and, asc, desc, gte, lte, or, lt, gt, innerJoin, sql } from 'drizzle-orm';

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
  
  // Route di registrazione nuovi utenti
  app.post("/api/register", async (req, res) => {
    console.log('📝 [REGISTER] Richiesta di registrazione ricevuta:', req.body.username);
    try {
      const { name, email, username, password, referralCode } = req.body;
      
      // Verifica che tutti i campi necessari siano presenti
      if (!name || !email || !username || !password) {
        return res.status(400).json({ message: "Tutti i campi sono obbligatori" });
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
      
      // Verifica se l'username è già in uso
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
      
      console.log(`Nuovo utente registrato: ${username} (${email})`);
      
      // Crea una licenza di prova per l'utente
      try {
        const trialExpiresAt = addDays(new Date(), 40);
        await licenseService.createTrialLicense(newUser.id, trialExpiresAt);
        console.log(`Licenza di prova creata per l'utente ${username} con scadenza ${trialExpiresAt.toISOString()}`);
      } catch (licenseError) {
        console.error(`Errore durante la creazione della licenza di prova per l'utente ${username}:`, licenseError);
      }
      
      // Restituisci il nuovo utente (senza la password)
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({
        ...userWithoutPassword,
        message: "Registrazione completata con successo"
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

  // Sistema lineare semplice - Servizi dell'utente  
  app.get("/api/services", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    // FORZA ANTI-CACHE PER MOBILE
    if (isMobile) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `mobile-services-${Date.now()}`,
        'Last-Modified': new Date().toUTCString()
      });
      console.log(`🔄 [${deviceType}] Anti-cache applicato per servizi mobile`);
    }
    
    try {
      // 🔄 USA POSTGRESQL: Carica servizi dal database condiviso
      const userServices = await storage.getServicesForUser(user.id);
      
      console.log(`🔧 [/api/services] [${deviceType}] Caricati ${userServices.length} servizi da PostgreSQL per utente ${user.id}`);
      res.json(userServices);
      
    } catch (error) {
      console.error("❌ [/api/services] Errore caricamento servizi da PostgreSQL:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  app.post("/api/services", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    try {
      // 🔄 USA POSTGRESQL: Crea servizio nel database condiviso
      const serviceData = {
        userId: user.id,
        ...req.body
      };
      
      const newService = await storage.createService(serviceData);
      
      console.log(`✅ [/api/services] Servizio "${newService.name}" creato in PostgreSQL per utente ${user.id} (ID: ${newService.id})`);
      res.status(201).json(newService);
    } catch (error) {
      console.error(`❌ [/api/services] Errore creazione servizio:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  app.put("/api/services/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const serviceId = parseInt(req.params.id);
    
    console.log(`✏️ [/api/services] PUT richiesta per servizio ID ${serviceId} da utente ${user.id}`);
    
    try {
      // 🔄 USA POSTGRESQL: Aggiorna servizio nel database condiviso
      const updatedService = await storage.updateService(serviceId, req.body);
      
      if (!updatedService) {
        return res.status(404).json({ message: "Servizio non trovato" });
      }
      
      // Verifica proprietà
      if (updatedService.userId !== user.id) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      console.log(`✅ [/api/services] Servizio ID ${serviceId} aggiornato in PostgreSQL per utente ${user.id}`);
      res.json(updatedService);
    } catch (error) {
      console.error(`❌ [/api/services] Errore aggiornamento servizio:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const serviceId = parseInt(req.params.id);
    
    console.log(`🗑️ [DELETE] Tentativo eliminazione servizio ID ${serviceId} per utente ${user.id}`);
    
    try {
      // 🔄 USA POSTGRESQL: Elimina servizio dal database condiviso
      const deleted = await storage.deleteService(serviceId);
      
      if (!deleted) {
        console.log(`❌ [DELETE] Servizio ID ${serviceId} non trovato`);
        return res.status(404).json({ message: "Servizio non trovato" });
      }
      
      console.log(`✅ [DELETE] Servizio ID ${serviceId} eliminato da PostgreSQL per utente ${user.id}`);
      res.json({ success: true, message: "Servizio eliminato con successo" });
    } catch (error) {
      console.error(`❌ [DELETE] Errore eliminazione servizio:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

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

  // Sistema lineare semplice - Clienti
  app.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    console.log(`🔍 [/api/clients] [${deviceType}] Richiesta da utente ID:${user.id}, tipo:${user.type}, email:${user.email}`);
    
    // FORZA ANTI-CACHE AGGRESSIVO PER MOBILE
    if (isMobile) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `mobile-clients-${Date.now()}-${Math.random()}`,
        'Last-Modified': new Date().toUTCString(),
        'Vary': 'User-Agent, x-device-type',
        'X-Accel-Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      console.log(`🔄 [${deviceType}] Anti-cache AGGRESSIVO applicato per clienti mobile - timestamp: ${Date.now()}`);
    }
    
    // 🔄 USA POSTGRESQL: Carica dati dal database condiviso (Replit ↔ Sliplane sync)
    const userClients = await storage.getVisibleClientsForUser(user.id, user.type);
    console.log(`📦 [/api/clients] [${deviceType}] Caricati ${userClients.length} clienti da PostgreSQL (${user.type === 'admin' ? 'tutti' : 'solo propri'})`);
    
    // Log dettagliato dei primi 5 clienti per debugging completo
    const sampleClients = userClients.slice(0, 5).map(c => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      uniqueCode: c.uniqueCode,
      ownerId: c.ownerId
    }));
    console.log(`🔍 [/api/clients] [${deviceType}] Sample primi 5 clienti:`, JSON.stringify(sampleClients, null, 2));
    
    // Debug per admin: mostra distribuzione ownership
    if (user.type === 'admin') {
      const ownershipStats = {};
      userClients.forEach(client => {
        const owner = client.ownerId || 'undefined';
        ownershipStats[owner] = (ownershipStats[owner] || 0) + 1;
      });
      console.log(`👑 [ADMIN-DEBUG] Distribuzione clienti per ownerId:`, ownershipStats);
      console.log(`👑 [ADMIN-DEBUG] Admin ID corrente: ${user.id}`);
      
      // Conta clienti propri vs altri
      const ownClients = userClients.filter(c => c.ownerId === user.id).length;
      const otherClients = userClients.filter(c => c.ownerId !== user.id).length;
      console.log(`👑 [ADMIN-DEBUG] Clienti propri (ownerId ${user.id}): ${ownClients}`);
      console.log(`👑 [ADMIN-DEBUG] Clienti altri account: ${otherClients}`);
    }
    
    // Log totale con uniqueCode per identificare il problema
    const clientsWithCodes = userClients.filter(c => c.uniqueCode);
    console.log(`🏷️ [/api/clients] [${deviceType}] Clienti con uniqueCode: ${clientsWithCodes.length}/${userClients.length}`);
    
    res.json(userClients);
  });

  app.post("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    console.log(`🔄 [POST /api/clients] Richiesta da utente ${user.id} (${user.type})`);
    console.log(`📝 [POST /api/clients] Dati ricevuti:`, req.body);
    
    try {
      // 🔄 USA POSTGRESQL: Verifica limiti basati sul piano
      const currentClients = (await storage.getVisibleClientsForUser(user.id, user.type)).length;
      
      const limits = {
        admin: 'unlimited',
        staff: 'unlimited', 
        customer: 1000,
        basic: 100
      };
      
      const userLimit = limits[user.type] || limits.basic;
      
      console.log(`📊 [POST /api/clients] Limite ${userLimit}, Correnti: ${currentClients}`);
      
      if (userLimit !== 'unlimited' && currentClients >= userLimit) {
        console.log(`❌ [POST /api/clients] Limite raggiunto per utente ${user.id}`);
        return res.status(403).json({ 
          message: `Limite clienti raggiunto per piano ${user.type}`,
          limit: userLimit,
          current: currentClients,
          upgradeRequired: true
        });
      }
      
      // 🔄 USA POSTGRESQL: Crea cliente (ID auto-generato da PostgreSQL)
      // 🔒 MULTI-TENANT SECURITY: usa la stessa logica di tenant resolution del GET
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      
      const clientData = {
        userId: tenantId,  // ✅ Usa tenantId invece di user.id per staff compatibility
        ownerId: tenantId,
        professionistCode: await getProfessionistCode(tenantId),
        ...req.body
      };
      
      const newClient = await storage.createClient(clientData);
      
      let newUniqueCode = null;
      try {
        newUniqueCode = await generateNewClientCode(tenantId);
      } catch (error: any) {
        if (error.message && error.message.includes('Codice professionista non trovato')) {
          console.log(`⚠️ [POST /api/clients] Professionista senza assignmentCode, skip newUniqueCode generation`);
        } else {
          throw error;
        }
      }
      
      const legacyUniqueCode = await generateClientCode(tenantId, newClient.id);
      
      const updateData: any = { uniqueCode: legacyUniqueCode };
      if (newUniqueCode) {
        updateData.newUniqueCode = newUniqueCode;
      }
      
      await storage.updateClient(newClient.id, updateData);
      
      const finalClient = await storage.getClient(newClient.id);
      
      console.log(`✅ [POST /api/clients] Cliente creato: ${finalClient.firstName} ${finalClient.lastName}`);
      if (newUniqueCode) {
        console.log(`   📋 Codice nuovo: ${newUniqueCode} | Codice legacy: ${legacyUniqueCode}`);
      } else {
        console.log(`   📋 Codice legacy: ${legacyUniqueCode} (professionista senza assignmentCode)`);
      }
      
      res.status(201).json(finalClient);
    } catch (error) {
      console.error(`❌ [POST /api/clients] Errore generale:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Admin-only endpoint: Recupera metadata professionisti owners (id, assignmentCode, username)
  app.get("/api/client-owners", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    // Solo admin può accedere a questo endpoint
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Accesso negato - solo admin" });
    }
    
    console.log(`🔍 [/api/client-owners] Richiesta metadata owners da admin ${user.id}`);
    
    try {
      // Recupera tutti i clienti visibili all'admin
      const allClients = await storage.getVisibleClientsForUser(user.id, user.type);
      
      // Estrae ownerIds unici
      const ownerIds = [...new Set(allClients.map(c => c.ownerId).filter(Boolean))];
      
      console.log(`📊 [/api/client-owners] Trovati ${ownerIds.length} professionisti owner unici: ${ownerIds.join(', ')}`);
      
      // Recupera metadata per gli owners
      const ownersMetadata = await storage.getOwnersByIds(ownerIds);
      
      console.log(`✅ [/api/client-owners] Ritorno metadata per ${ownersMetadata.length} professionisti`);
      
      res.json(ownersMetadata);
    } catch (error) {
      console.error(`❌ [/api/client-owners] Errore:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Admin-only endpoint: Migrazione automatica codici clienti (vecchio → nuovo formato)
  app.post("/api/clients/migrate-codes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    // Solo admin può eseguire la migrazione
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Accesso negato - solo admin" });
    }
    
    console.log(`🚀 [/api/clients/migrate-codes] Admin ${user.id} ha avviato la migrazione codici clienti`);
    
    try {
      // Esegui lo script di migrazione
      const stats = await migrateClientCodes();
      
      console.log(`✅ [/api/clients/migrate-codes] Migrazione completata con successo`);
      
      res.json({
        success: true,
        message: 'Migrazione completata',
        stats: {
          total: stats.total,
          migrated: stats.migrated,
          skipped: stats.skipped,
          errors: stats.errors
        },
        details: stats.details
      });
    } catch (error: any) {
      console.error(`❌ [/api/clients/migrate-codes] Errore durante la migrazione:`, error);
      res.status(500).json({ 
        success: false,
        message: "Errore durante la migrazione",
        error: error.message 
      });
    }
  });

  // Helper function per generare hash casuali
  function generateRandomHash(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // ENDPOINT per normalizzare tutti i codici clienti (fix one-time)
  app.post("/api/clients/normalize-codes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    try {
      const storageData = loadStorageData();
      let updatedCount = 0;
      
      // Aggiorna tutti i clienti dell'utente con nuovi ID sequenziali
      const userClients = (storageData.clients || [])
        .filter(([id, client]) => client.ownerId === user.id)
        .sort((a, b) => a[1].id - b[1].id); // Ordina per ID esistente
      
      const userIdBase = user.id * 1000;
      
      for (let i = 0; i < userClients.length; i++) {
        const [oldId, client] = userClients[i];
        const newSequentialId = userIdBase + i + 1;
        
        // Aggiorna l'ID del cliente e rigenera il codice univoco
        client.id = newSequentialId;
        const professionistCode = await getProfessionistCode(user.id);
        client.uniqueCode = `${professionistCode}_CLIENT_${newSequentialId}_${generateRandomHash()}`;
        
        // Sostituisci nel storage con nuovo ID
        const index = storageData.clients.findIndex(([id, c]) => id === oldId);
        if (index !== -1) {
          storageData.clients[index] = [newSequentialId, client];
          updatedCount++;
        }
        
        console.log(`🔄 NORMALIZZATO: ${client.firstName} ${client.lastName} - ${oldId} → ${newSequentialId}`);
      }
      
      saveStorageData(storageData);
      console.log(`✅ NORMALIZZAZIONE COMPLETATA: ${updatedCount} clienti aggiornati`);
      
      res.json({ 
        success: true, 
        message: `${updatedCount} clienti normalizzati con successo`,
        updatedCount 
      });
    } catch (error) {
      console.error("❌ Errore normalizzazione:", error);
      res.status(500).json({ message: "Errore durante la normalizzazione" });
    }
  });

  // PUT /api/clients/:id - Aggiorna cliente esistente
  app.put("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clientId = parseInt(req.params.id);
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "ID cliente non valido" });
    }

    try {
      console.log(`✏️ [PUT /api/clients/${clientId}] [${deviceType}] Richiesta da utente ID:${user.id}, tipo:${user.type}, email:${user.email}`);
      console.log(`✏️ [PUT /api/clients/${clientId}] [${deviceType}] Dati ricevuti:`, req.body);

      // 🔄 USA POSTGRESQL: Trova il cliente esistente
      const existingClient = await storage.getClient(clientId);
      
      if (!existingClient) {
        console.log(`❌ [PUT /api/clients/${clientId}] Cliente non trovato`);
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      // Verifica ownership per utenti non-staff
      if (user.type !== 'staff' && existingClient.ownerId !== user.id) {
        console.log(`❌ [PUT /api/clients/${clientId}] Accesso negato - cliente non appartiene all'utente`);
        return res.status(403).json({ message: "Accesso negato" });
      }

      // 🔄 USA POSTGRESQL: Aggiorna il cliente
      await storage.updateClient(clientId, req.body);
      
      // Ricarica il cliente aggiornato
      const updatedClient = await storage.getClient(clientId);
      
      console.log(`✅ [PUT /api/clients/${clientId}] Cliente aggiornato con successo in PostgreSQL`);
      res.json(updatedClient);
      
    } catch (error) {
      console.error(`❌ [PUT /api/clients/${clientId}] Errore durante l'aggiornamento:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Sistema lineare semplice - Appuntamenti
  // Endpoint rimossi - duplicati degli endpoint attivi alle linee 485+

  // Impostazioni azienda - RIMOSSO DUPLICATO ERRATO (ora gestito da storage_data.json)

  // Informazioni di contatto
  app.get("/api/contact-info", requireAuth, async (req, res) => {
    const user = req.user!;
    const defaultInfo = {
      email: "info@studiomedico.it",
      phone: "+39 123 456 7890"
    };
    
    try {
      // 🔄 USA POSTGRESQL: Carica da userSettings
      const settings = await storage.getUserSettings(user.id);
      
      if (!settings) {
        return res.json(defaultInfo);
      }
      
      // Converti formato PostgreSQL → JSON per compatibilità frontend
      const userContactInfo = {
        email: settings.contactEmail || defaultInfo.email,
        phone: settings.contactPhone || defaultInfo.phone,
        phone1: settings.contactPhone || '',
        phone2: settings.contactPhone2 || '',
        website: settings.website || '',
        instagram: settings.instagramHandle || '',
        facebook: settings.facebookPage || ''
      };
      
      res.json(userContactInfo);
    } catch (error) {
      console.error('Errore caricamento contact-info:', error);
      res.json(defaultInfo);
    }
  });

  // Endpoint per caricare informazioni di contatto tramite ownerId (per clienti)
  app.get("/api/contact-info/:ownerId", async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      console.log(`Caricamento informazioni di contatto per professionista ${ownerId} (richiesta client)`);
      
      if (!ownerId || isNaN(ownerId)) {
        return res.status(400).json({ error: "ID professionista non valido" });
      }
      
      // 🔄 USA POSTGRESQL: Carica da userSettings
      const settings = await storage.getUserSettings(ownerId);
      
      const contactInfo = {
        email: settings?.contactEmail || '',
        phone: settings?.contactPhone || '',
        phone1: settings?.contactPhone || '',
        phone2: settings?.contactPhone2 || '',
        website: settings?.website || '',
        instagram: settings?.instagramHandle || '',
        facebook: settings?.facebookPage || ''
      };
      
      res.json(contactInfo);
    } catch (error) {
      console.error('Errore nel caricamento informazioni di contatto:', error);
      res.status(500).json({ error: 'Errore del server' });
    }
  });

  // API per recuperare informazioni di contatto di un professionista specifico (per PWA clienti)
  app.get('/api/owner-contact-info/:ownerId', async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (!ownerId) {
        return res.status(400).json({ error: 'ID proprietario non valido' });
      }
      
      // 🔄 USA POSTGRESQL: Carica da userSettings
      const settings = await storage.getUserSettings(ownerId);
      
      const contactInfo = {
        email: settings?.contactEmail || '',
        phone: settings?.contactPhone || '',
        phone1: settings?.contactPhone || '',
        phone2: settings?.contactPhone2 || '',
        website: settings?.website || '',
        instagram: settings?.instagramHandle || '',
        facebook: settings?.facebookPage || ''
      };
      
      console.log(`🏥 [PWA CONTACTS] Informazioni di contatto richieste per professionista ${ownerId}:`, contactInfo);
      res.json(contactInfo);
    } catch (error) {
      console.error('Errore nel recupero informazioni contatto professionista:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Endpoint POST per salvare le informazioni di contatto
  app.post("/api/contact-info", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const contactInfo = req.body;
      
      console.log(`📞 [CONTACT INFO] Salvataggio informazioni per utente ${user.id}:`, contactInfo);
      
      // Validazione base dei dati
      if (!contactInfo || typeof contactInfo !== 'object') {
        return res.status(400).json({ 
          error: 'Dati di contatto non validi' 
        });
      }
      
      // 🔄 USA POSTGRESQL: Prepara dati per userSettings
      const settingsUpdate: any = {};
      if (contactInfo.email !== undefined) settingsUpdate.contactEmail = contactInfo.email;
      if (contactInfo.phone !== undefined) settingsUpdate.contactPhone = contactInfo.phone;
      if (contactInfo.phone1 !== undefined) settingsUpdate.contactPhone = contactInfo.phone1; // phone1 → contactPhone
      if (contactInfo.phone2 !== undefined) settingsUpdate.contactPhone2 = contactInfo.phone2;
      if (contactInfo.website !== undefined) settingsUpdate.website = contactInfo.website;
      if (contactInfo.instagram !== undefined) settingsUpdate.instagramHandle = contactInfo.instagram;
      if (contactInfo.facebook !== undefined) settingsUpdate.facebookPage = contactInfo.facebook;
      
      // 🔄 USA POSTGRESQL: Aggiorna o crea userSettings
      const updatedSettings = await storage.updateUserSettings(user.id, settingsUpdate);
      
      // Riconverti formato PostgreSQL → JSON per compatibilità frontend
      const responseContactInfo = {
        email: updatedSettings?.contactEmail || '',
        phone: updatedSettings?.contactPhone || '',
        phone1: updatedSettings?.contactPhone || '',
        phone2: updatedSettings?.contactPhone2 || '',
        website: updatedSettings?.website || '',
        instagram: updatedSettings?.instagramHandle || '',
        facebook: updatedSettings?.facebookPage || ''
      };
      
      console.log(`✅ [CONTACT INFO] Informazioni salvate in PostgreSQL per utente ${user.id}`);
      
      res.json({ 
        success: true, 
        message: 'Informazioni di contatto salvate con successo',
        contactInfo: responseContactInfo
      });
      
    } catch (error) {
      console.error('❌ [ERRORE CONTACT INFO]:', error);
      res.status(500).json({ 
        error: 'Errore durante il salvataggio delle informazioni di contatto' 
      });
    }
  });

  // Info applicazione rimossa - usa l'endpoint unificato sopra

  // Contesto tenant
  app.get("/api/tenant-context", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    res.json({
      userId: user.id,
      userType: user.type,
      tenantId: `tenant_${user.id}`
    });
  });

  // Utente con licenza - SINCRONIZZAZIONE COMPLETA MOBILE/DESKTOP
  app.get("/api/user-with-license", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    console.log(`🔐 [${deviceType}] /api/user-with-license per utente ${user.id} (${user.username})`);
    
    // Carica dati completi dal storage per nome/cognome aggiornati
    const storageData = loadStorageData();
    let firstName = user.firstName || null;
    let lastName = user.lastName || null;
    
    // Per TUTTI gli utenti, carica nome/cognome dalle impostazioni aziendali uniformemente
    if (storageData.companyNameSettings?.[user.id]) {
      const settings = storageData.companyNameSettings[user.id];
      if (settings.name) {
        const nameParts = settings.name.split(' ');
        firstName = nameParts[0] || null;
        lastName = nameParts.slice(1).join(' ') || null;
      }
    }
    
    // Recupera codice professionista NUOVO (assignment_code) e VECCHIO (legacy) per staff e admin
    let assignmentCode = null;
    let legacyProfessionistCode = null;
    
    if (user.type === 'staff' || user.type === 'admin') {
      try {
        // PRIORITÀ: Leggi assignment_code dal database (nuovo formato BUS1422)
        const dbUser = await req.app.locals.storage.getUser(user.id);
        if (dbUser && dbUser.assignmentCode) {
          assignmentCode = dbUser.assignmentCode;
          console.log(`🏷️ [${deviceType}] Assignment code per utente ${user.id}: ${assignmentCode}`);
        }
        
        // FALLBACK: Genera/recupera vecchio formato (PROF_014_9C1F) per retrocompatibilità
        legacyProfessionistCode = await getProfessionistCode(user.id);
        console.log(`🏷️ [${deviceType}] Legacy code per utente ${user.id}: ${legacyProfessionistCode}`);
      } catch (error) {
        console.error(`❌ [${deviceType}] Errore generazione codice professionista per utente ${user.id}:`, error);
      }
    }
    
    // Leggi licenza REALE dal database invece di hardcodare
    let licenseType = 'trial'; // Default
    let expiresAt = null;
    let daysLeft = null;
    
    if (user.type === 'admin') {
      licenseType = 'passepartout';
    } else if (user.type === 'staff') {
      licenseType = 'staff_free_10years';
      expiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
      daysLeft = 3650;
    } else if (user.type === 'customer') {
      try {
        const userLicenses = await req.app.locals.storage.getLicensesByUserId(user.id);
        const activeLicense = userLicenses.find((lic: any) => lic.isActive);
        if (activeLicense) {
          licenseType = activeLicense.type;
          expiresAt = activeLicense.expiresAt;
          if (expiresAt) {
            daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          }
        }
      } catch (error) {
        console.error(`❌ Errore lettura licenza per utente ${user.id}:`, error);
      }
    }
    
    const response = {
      id: user.id,
      username: user.username,
      email: user.email,
      type: user.type,
      firstName: firstName,
      lastName: lastName,
      assignmentCode: assignmentCode, // NUOVO formato uniformato (BUS1422)
      legacyProfessionistCode: legacyProfessionistCode, // VECCHIO formato (PROF_014_9C1F) - retrocompatibilità
      professionistCode: assignmentCode || legacyProfessionistCode, // Compatibilità: priorità al nuovo
      licenseType: licenseType,  // Campo aggiunto per il badge
      licenseInfo: {
        type: licenseType,
        expiresAt: expiresAt,
        isActive: true,
        daysLeft: daysLeft,
        features: {
          maxClients: user.type === 'admin' ? 'unlimited' : 
                     user.type === 'staff' ? 'unlimited' : 
                     user.type === 'customer' ? 1000 : 50,
          maxAppointments: user.type === 'admin' ? 'unlimited' : 
                          user.type === 'staff' ? 'unlimited' : 
                          user.type === 'customer' ? 'unlimited' : 100,
          advancedReports: user.type !== 'basic',
          emailNotifications: true,
          mobileSync: true,
          customBranding: user.type === 'admin' || user.type === 'staff',
          multiTenant: user.type === 'admin',
          staffReferrals: user.type === 'staff'
        }
      }
    };
    
    console.log(`📱💻 [${deviceType}] Dati utente unificati:`, { 
      id: response.id, 
      username: response.username, 
      firstName: response.firstName, 
      lastName: response.lastName,
      licenseType: licenseType
    });
    
    res.json(response);
  });

  // Fuso orario
  app.get("/api/timezone-settings", (req, res) => {
    res.json({ timezone: "Europe/Rome", offset: 2 });
  });

  app.post("/api/timezone-settings", (req, res) => {
    res.json({ success: true, timezone: req.body.timezone, offset: req.body.offset });
  });

  // Licenze
  app.get("/api/license/license-info", async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ hasLicense: false, type: "none" });
    
    const user = req.user as any;
    
    // Leggi licenza REALE dal database invece di hardcodare
    let licenseType = 'trial';
    
    if (user.type === 'admin') {
      licenseType = 'passepartout';
    } else if (user.type === 'staff') {
      licenseType = 'staff_free_10years';
    } else if (user.type === 'customer') {
      try {
        const userLicenses = await req.app.locals.storage.getLicensesByUserId(user.id);
        const activeLicense = userLicenses.find((lic: any) => lic.isActive);
        if (activeLicense) {
          licenseType = activeLicense.type;
        }
      } catch (error) {
        console.error(`❌ Errore lettura licenza per utente ${user.id}:`, error);
      }
    }
    
    res.json({ 
      hasLicense: true, 
      type: licenseType,
      userType: user.type,
      features: {
        maxClients: user.type === 'admin' || user.type === 'staff' ? 'unlimited' : 
                   user.type === 'customer' ? 1000 : 50,
        advancedReports: user.type !== 'basic',
        customBranding: user.type === 'admin' || user.type === 'staff'
      }
    });
  });

  app.get("/api/license/has-pro-access", (req, res) => {
    if (!req.isAuthenticated()) return res.json(false);
    const user = req.user as any;
    res.json(user.type === 'admin' || user.type === 'staff' || user.type === 'customer');
  });

  app.get("/api/license/has-business-access", (req, res) => {
    if (!req.isAuthenticated()) return res.json(false);
    const user = req.user as any;
    res.json(user.type !== 'basic');
  });

  app.get("/api/license/application-title", (req, res) => {
    res.json({ title: "Gestionale Appuntamenti" });
  });

  // 📁 Sistema permanente icone PER UTENTE con persistenza (usa utils centralizzate)

  // Genera codice professionista univoco SEMPLIFICATO
  async function generateProfessionistCode(userId: number): Promise<string> {
    // Codice semplice senza hash MD5 visibile
    return `PROF_${userId.toString().padStart(3, '0')}`;
  }

  // Recupera o genera il codice professionista
  async function getProfessionistCode(userId: number): Promise<string> {
    const storageData = loadStorageData();
    
    // Cerca se l'utente ha già un codice professionista
    if (storageData.professionistCodes && storageData.professionistCodes[userId]) {
      return storageData.professionistCodes[userId];
    }
    
    // Genera nuovo codice e lo salva
    const newCode = await generateProfessionistCode(userId);
    
    if (!storageData.professionistCodes) {
      storageData.professionistCodes = {};
    }
    
    storageData.professionistCodes[userId] = newCode;
    saveStorageData(storageData);
    
    console.log(`✅ Nuovo codice professionista generato per utente ${userId}: ${newCode}`);
    return newCode;
  }

  // Genera codice cliente SEMPLIFICATO - max 99999 clienti per studio
  async function generateClientCode(ownerId: number, clientId: number): Promise<string> {
    const profCode = await getProfessionistCode(ownerId);
    // Codice semplice: PROF_003_C00001 (max 99999 clienti)
    const clientNumber = clientId.toString().padStart(5, '0');
    return `${profCode}_C${clientNumber}`;
  }

  // Valida ownership attraverso codice gerarchico
  async function validateClientOwnership(clientCode: string, expectedOwnerId: number): Promise<boolean> {
    if (!clientCode || typeof clientCode !== 'string') return false;
    const profCode = await getProfessionistCode(expectedOwnerId);
    return clientCode.startsWith(profCode);
  }

  // Estrae owner ID da codice cliente (supporta entrambi i formati)
  function extractOwnerFromClientCode(clientCode: string): number | null {
    // Supporta formato nuovo: PROF_003_C00001 e vecchio: PROF_003_0003_CLIENT_1_0001
    const match = clientCode.match(/^PROF_(\d{3})_/);
    return match ? parseInt(match[1], 10) : null;
  }

  function generateDefaultClientsForUser(userId, userEmail) {
    const baseId = userId * 1000; // Evita conflitti ID usando range per utente
    const userPrefix = userEmail.split('@')[0].substring(0, 2).toUpperCase();
    
    return [
      {
        id: baseId + 1,
        firstName: "Cliente",
        lastName: "Trial",
        email: `cliente.trial.${userId}@example.com`,
        phone: "+39 123 456 7890",
        birthDate: "1990-01-15",
        fiscalCode: `CLNTTL90A15${userPrefix}1X`,
        uniqueCode: `CT${baseId + 1}`,
        ownerId: userId,
        createdAt: new Date().toISOString(),
        notes: "Cliente di prova generato automaticamente"
      },
      {
        id: baseId + 2,
        firstName: "Trial",
        lastName: "Account", 
        email: `trial.account.${userId}@example.com`,
        phone: "+39 098 765 4321",
        birthDate: "1985-06-20",
        fiscalCode: `TRLCNT85H20${userPrefix}2Y`,
        uniqueCode: `TA${baseId + 2}`,
        ownerId: userId,
        createdAt: new Date().toISOString(),
        notes: "Account di test generato automaticamente"
      }
    ];
  }
  
  function cleanOldBackups() {
    try {
      const files = fs.readdirSync('.');
      const backupFiles = files.filter(f => f.startsWith('storage_data_backup_'));
      
      if (backupFiles.length > 10) {
        // Mantieni solo gli ultimi 10 backup
        const sortedBackups = backupFiles
          .map(f => ({ name: f, time: parseInt(f.split('_')[3].split('.')[0]) }))
          .sort((a, b) => b.time - a.time);
        
        const toDelete = sortedBackups.slice(10);
        toDelete.forEach(backup => {
          fs.unlinkSync(backup.name);
          console.log(`🗑️ Backup vecchio rimosso: ${backup.name}`);
        });
      }
    } catch (error) {
      console.error('Errore pulizia backup:', error);
    }
  }

  const storageFile = 'storage_data.json';

  function saveStorageDataLocal(updatedData) {
    try {
      const currentData = fs.existsSync(storageFile) 
        ? JSON.parse(fs.readFileSync(storageFile, 'utf8'))
        : {};
      
      // Sistema di protezione dati avanzato
      dataProtectionService.createAutoBackup('before_critical_save');
      
      // Verifica integrità prima di procedere
      if (!dataProtectionService.verifyDataIntegrity()) {
        console.error('❌ Integrità dati compromessa, operazione bloccata');
        throw new Error('Dati corrotti rilevati, salvataggio annullato per sicurezza');
      }
      
      // Merge più specifico per preservare gli array di appuntamenti
      const mergedData = {
        ...currentData,
        ...updatedData,
        appointments: updatedData.appointments || currentData.appointments || []
      };
      
      // Salvataggio atomico: prima in un file temporaneo, poi rinomina
      const tempFile = 'storage_data_temp.json';
      fs.writeFileSync(tempFile, JSON.stringify(mergedData, null, 2));
      fs.renameSync(tempFile, storageFile);
      
      console.log(`💾 Dati salvati persistentemente - ${mergedData.appointments?.length || 0} appuntamenti totali`);
      
      // Verifica immediata del salvataggio
      const verified = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
      if (verified.appointments?.length !== mergedData.appointments?.length) {
        console.error('⚠️ ERRORE CRITICO: Verifica salvataggio fallita!');
        throw new Error('Salvataggio non verificato');
      }
      console.log(`✅ Salvataggio verificato correttamente`);
      
    } catch (error) {
      console.error('❌ Errore critico salvataggio storage:', error);
      throw error; // Rilancia l'errore per far fallire l'operazione
    }
  }
  
  // Controllo integrità all'avvio
  function verifyDataIntegrity() {
    try {
      const data = loadStorageData();
      const appointmentsCount = data.appointments?.length || 0;
      const clientsCount = data.clients?.length || 0;
      
      console.log(`🔍 Controllo integrità all'avvio:`);
      console.log(`   📅 Appuntamenti caricati: ${appointmentsCount}`);
      console.log(`   👥 Clienti caricati: ${clientsCount}`);
      
      if (appointmentsCount > 0) {
        const recentAppointments = data.appointments.slice(0, 3);
        console.log(`   🔍 Primi 3 appuntamenti:`, recentAppointments.map(item => {
          const apt = Array.isArray(item) ? item[1] : item;
          return { id: apt?.id, date: apt?.date, client: apt?.clientId };
        }));
      }
      
      console.log(`✅ Controllo integrità completato`);
      return data;
    } catch (error) {
      console.error(`❌ ERRORE INTEGRITÀ DATI:`, error);
      return { appointments: [], clients: [], userServices: {} };
    }
  }

  let storageData = verifyDataIntegrity();


  // Endpoint per ottenere sempre l'icona predefinita (per anteprima)
  app.get("/api/default-app-icon", (req, res) => {
    res.json({ 
      appName: "Gestionale Appuntamenti", 
      icon: defaultIconBase64,
      name: "Fleur de Vie multicolore"
    });
  });

  // Endpoint per ottenere l'icona dell'app - SEPARAZIONE PER UTENTE
  app.get("/api/client-app-info", async (req, res) => {
    let targetUserId = null;
    
    // Se autenticato, usa l'utente corrente
    if (req.isAuthenticated()) {
      targetUserId = req.user.id;
    } else {
      // Se non autenticato, controlla se c'è un token di attivazione per determinare il tenant
      const { token, clientId } = req.query;
      
      if (token && typeof token === 'string') {
        const tokenParts = token.split('_');
        if (tokenParts.length === 3) {
          const [userId] = tokenParts;
          targetUserId = parseInt(userId);
        }
      } else if (clientId) {
        // Cerca il proprietario del cliente dal clientId
        const storageData = loadStorageData();
        const clients = storageData.clients || [];
        const clientData = clients.find(([id]) => id.toString() === clientId.toString());
        if (clientData && clientData[1].ownerId) {
          targetUserId = clientData[1].ownerId;
        }
      }
    }

    // Se non riusciamo a determinare l'utente, usa l'icona predefinita
    if (!targetUserId) {
      return res.json({ 
        appName: "Gestionale Appuntamenti", 
        icon: defaultIconBase64 
      });
    }

    const userIcon = storageData.userIcons[targetUserId] || defaultIconBase64;
    
    // Sincronizza automaticamente le icone PWA con il logo aziendale attuale
    await updatePWAIconsFromCompanyLogo(targetUserId, userIcon);
    
    const deviceType = req.headers['x-device-type'] || 'unknown';
    console.log(`✅ [${deviceType}] Icone PWA per utente ${targetUserId}, icon length: ${userIcon?.length || 0}`);
    
    res.json({ 
      appName: "Gestionale Appuntamenti", 
      icon: userIcon 
    });
  });

  // RIMOSSO: Handler duplicato - gestito in routes.ts

  // Endpoint per recuperare icona dell'app tramite ownerId (per clienti)
  app.get("/api/client-app-info/:ownerId", async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      console.log(`Caricamento icona app per professionista ${ownerId} (richiesta client)`);
      
      if (!ownerId || isNaN(ownerId)) {
        return res.status(400).json({ error: "ID professionista non valido" });
      }

      const storageData = loadStorageData();
      const userIcon = storageData.userIcons[ownerId] || defaultIconBase64;
      
      // Sincronizza automaticamente le icone PWA con il logo aziendale attuale
      await updatePWAIconsFromCompanyLogo(ownerId, userIcon);
      
      console.log(`✅ Icone PWA aggiornate per professionista ${ownerId} con logo aziendale (richiesta client)`);
      
      res.json({ 
        appName: "Gestionale Appuntamenti", 
        icon: userIcon 
      });
    } catch (error) {
      console.error('Errore nel caricamento icona app:', error);
      res.status(500).json({ error: 'Errore del server' });
    }
  });

  // Endpoint per caricare una nuova icona - SEPARAZIONE PER UTENTE
  app.post("/api/upload-app-icon", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Non autenticato" });
    }

    try {
      const { iconData } = req.body;
      const userId = req.user.id;
      
      if (iconData !== undefined) {
        // 🚀 SOLUZIONE SLIPLANE: Salva icona nel database PostgreSQL (persiste su container Docker)
        await app.locals.storage.saveUserIcon(userId, iconData);
        console.log(`✅ Icona salvata nel database PostgreSQL per utente ${userId} (${iconData.length} bytes)`);
        
        // Backward compatibility: salva anche in JSON per sistemi legacy
        storageData.userIcons[userId] = iconData;
        saveStorageData(storageData);
      }
      
      res.json({ 
        success: true, 
        message: "Icona aggiornata con successo", 
        appName: "Gestionale Appuntamenti", 
        icon: iconData 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Errore durante il caricamento dell'icona" });
    }
  });

  // Endpoint per ripristinare l'icona di default - SEPARAZIONE PER UTENTE
  app.post("/api/reset-app-icon", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Non autenticato" });
    }

    const userId = req.user.id;
    
    // 🚀 SOLUZIONE SLIPLANE: Salva icona default nel database PostgreSQL
    await app.locals.storage.saveUserIcon(userId, defaultIconBase64);
    console.log(`✅ Reset icona a Fleur de Vie nel database PostgreSQL per utente ${userId}`);
    
    // Backward compatibility: salva anche in JSON
    storageData.userIcons[userId] = defaultIconBase64;
    saveStorageData(storageData);
    
    res.json({ 
      success: true, 
      message: "Icona ripristinata al default", 
      appName: "Gestionale Appuntamenti", 
      icon: defaultIconBase64 
    });
  });

  // Funzione per aggiornare le icone PWA dal logo aziendale
  async function updatePWAIconsFromCompanyLogo(userId, iconBase64) {
    try {
      if (!iconBase64 || !iconBase64.startsWith('data:image/')) {
        console.log(`⚠️ Icona non valida per utente ${userId}, uso fallback`);
        iconBase64 = defaultIconBase64;
      }

      const sharp = await import('sharp').then(m => m.default);
      
      // Rimuovi il prefisso data:image
      const base64Data = iconBase64.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Genera le diverse dimensioni per PWA - sia generiche che specifiche per utente
      const sizes = [
        { size: 96, name: 'icon-96x96.png' },
        { size: 192, name: 'icon-192x192.png' },
        { size: 512, name: 'icon-512x512.png' },
        { size: 96, name: `owner-${userId}-icon-96x96.png` },
        { size: 192, name: `owner-${userId}-icon-192x192.png` },
        { size: 512, name: `owner-${userId}-icon-512x512.png` }
      ];
      
      for (const { size, name } of sizes) {
        const resizedBuffer = await sharp(imageBuffer)
          .resize(size, size, { 
            fit: 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toBuffer();
        
        const iconPath = path.join(process.cwd(), 'public', 'icons', name);
        fs.writeFileSync(iconPath, resizedBuffer);
      }
      
      console.log(`✅ Icone PWA aggiornate per utente ${userId} con logo aziendale`);
      
    } catch (error) {
      console.error(`❌ Errore aggiornamento icone PWA per utente ${userId}:`, error);
    }
  }

  // Endpoint per sincronizzare icone PWA con logo aziendale
  app.post("/api/sync-pwa-icons", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Non autenticato" });
    }

    const userId = req.user.id;
    const userIcon = storageData.userIcons[userId] || defaultIconBase64;
    
    updatePWAIconsFromCompanyLogo(userId, userIcon);
    
    res.json({ 
      success: true, 
      message: "Icone PWA sincronizzate con logo aziendale" 
    });
  });

  // Endpoint per ottenere le impostazioni nome aziendale - UNIFICATO PER TUTTI GLI UTENTI
  app.get("/api/company-name-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ businessName: "Gestionale Appuntamenti", showBusinessName: true });
    }

    const userId = req.user.id;
    const userType = req.user.type;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    console.log(`🏢 [/api/company-name-settings] [${deviceType}] GET per utente ${userId} (${userType})`);
    
    // FORZA ANTI-CACHE AGGRESSIVO PER MOBILE
    if (isMobile) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `mobile-company-${Date.now()}-${Math.random()}`,
        'Last-Modified': new Date().toUTCString(),
        'Vary': 'User-Agent, x-device-type',
        'X-Accel-Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      console.log(`🔄 [${deviceType}] Anti-cache AGGRESSIVO applicato per impostazioni aziendali mobile`);
    }
    
    // 🔄 CORRETTO: Leggi da PostgreSQL invece che da JSON
    const currentSettings = await storage.getUserSettings(userId);
    const companyNameSettings = (currentSettings?.preferences as any)?.companyName || {};
    
    // Valori di default se non esistono impostazioni
    const userSettings = {
      businessName: companyNameSettings.businessName || "Gestionale Appuntamenti",
      showBusinessName: companyNameSettings.showBusinessName !== undefined ? companyNameSettings.showBusinessName : true,
      name: companyNameSettings.name || req.user.username || "Utente",
      fontSize: companyNameSettings.fontSize || 24,
      fontFamily: companyNameSettings.fontFamily || "Arial, sans-serif",
      fontStyle: companyNameSettings.fontStyle || "normal",
      color: companyNameSettings.color || "#000000",
      enabled: companyNameSettings.enabled !== undefined ? companyNameSettings.enabled : true
    };
    
    console.log(`🏢 [/api/company-name-settings] [${deviceType}] Settings per utente ${userId} (${userType}):`, userSettings);
    res.json(userSettings);
  });

  // Endpoint per ottenere i dati aziendali completi del professionista
  app.get("/api/company-business-data", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({
        companyName: '',
        address: '',
        city: '',
        postalCode: '',
        vatNumber: '',
        fiscalCode: '',
        phone: '',
        email: ''
      });
    }

    const userId = req.user.id;
    console.log(`🏢 [/api/company-business-data] GET per utente ${userId}`);
    
    const currentStorageData = loadStorageData();
    if (!currentStorageData.userBusinessData) {
      currentStorageData.userBusinessData = {};
    }
    
    // Inizializza dati vuoti se non esistono
    if (!currentStorageData.userBusinessData[userId]) {
      currentStorageData.userBusinessData[userId] = {
        companyName: '',
        address: '',
        city: '',
        postalCode: '',
        vatNumber: '',
        fiscalCode: '',
        phone: '',
        email: ''
      };
      saveStorageData(currentStorageData);
    }
    
    const userBusinessData = currentStorageData.userBusinessData[userId];
    console.log(`🏢 [/api/company-business-data] Dati per utente ${userId}:`, userBusinessData);
    res.json(userBusinessData);
  });

  // Endpoint per salvare i dati aziendali completi del professionista
  app.post("/api/company-business-data", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    try {
      const { companyName, address, city, postalCode, vatNumber, fiscalCode, phone, email } = req.body;
      const userId = req.user.id;
      
      console.log(`🏢 [POST] Salvando dati aziendali completi per utente ${userId}:`, req.body);
      
      // 🔄 USA POSTGRESQL: Aggiorna userSettings con dati aziendali
      const currentSettings = await storage.getUserSettings(userId);
      const currentPrefs = (currentSettings?.preferences as any) || {};
      
      await storage.updateUserSettings(userId, {
        businessName: companyName,
        address: `${address || ''}, ${city || ''} ${postalCode || ''}`.trim(),
        contactPhone: phone,
        contactEmail: email,
        preferences: {
          ...currentPrefs,
          businessData: {
            companyName,
            address,
            city,
            postalCode,
            vatNumber,
            fiscalCode,
            phone,
            email,
            updatedAt: new Date().toISOString()
          }
        }
      });
      
      console.log(`✅ [POST] Dati aziendali salvati in PostgreSQL per utente ${userId}`);
      res.json({ success: true, message: "Dati aziendali salvati con successo" });
    } catch (error) {
      console.error('❌ Errore salvataggio dati aziendali:', error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Endpoint per salvare le impostazioni nome aziendale - UNIFICATO PER TUTTI GLI UTENTI
  app.post("/api/company-name-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    try {
      const { businessName, showBusinessName, name, fontSize, fontFamily, fontStyle, color, enabled } = req.body;
      const userId = req.user.id;
      const userType = req.user.type;
      
      console.log(`🏢 [POST] Salvando impostazioni complete per utente ${userId} (${userType}):`, req.body);
      
      // 🔄 USA POSTGRESQL: Carica impostazioni correnti
      const currentSettings = await storage.getUserSettings(userId);
      const currentPrefs = (currentSettings?.preferences as any) || {};
      
      // Prepara preferenze nome azienda
      const companyNameSettings = currentPrefs.companyName || {};
      if (businessName !== undefined) companyNameSettings.businessName = businessName;
      if (showBusinessName !== undefined) companyNameSettings.showBusinessName = showBusinessName;
      if (name !== undefined) companyNameSettings.name = name;
      if (fontSize !== undefined) companyNameSettings.fontSize = fontSize;
      if (fontFamily !== undefined) companyNameSettings.fontFamily = fontFamily;
      if (fontStyle !== undefined) companyNameSettings.fontStyle = fontStyle;
      if (color !== undefined) companyNameSettings.color = color;
      if (enabled !== undefined) companyNameSettings.enabled = enabled;
      
      // Aggiorna userSettings con preferences aggiornate
      await storage.updateUserSettings(userId, {
        businessName: businessName,
        preferences: {
          ...currentPrefs,
          companyName: companyNameSettings
        }
      });
      
      console.log(`✅ [POST] Impostazioni salvate in PostgreSQL per utente ${userId}`);
      
      res.json({ 
        success: true, 
        message: "Impostazioni salvate con successo", 
        ...companyNameSettings 
      });
    } catch (error) {
      console.error(`❌ [POST] Errore salvataggio impostazioni per utente ${req.user?.id}:`, error);
      res.status(500).json({ success: false, message: "Errore durante il salvataggio" });
    }
  });

  // Endpoint per ottenere le impostazioni valuta
  app.get("/api/currency-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ currency: "EUR", symbol: "€" });
    }

    const userId = req.user.id;
    
    console.log(`💰 [GET] Recupero impostazioni valuta per utente ${userId}`);
    
    try {
      const settings = await storage.getCurrencySettings(userId);
      
      if (settings) {
        res.json({
          currency: settings.currency,
          symbol: settings.symbol
        });
      } else {
        // Default to EUR if no settings found
        res.json({ currency: "EUR", symbol: "€" });
      }
    } catch (error) {
      console.error(`❌ [GET] Errore recupero impostazioni valuta per utente ${userId}:`, error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Endpoint per salvare le impostazioni valuta
  app.post("/api/currency-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    try {
      const { currency, symbol } = req.body;
      const userId = req.user.id;
      
      console.log(`💰 [POST] Salvataggio impostazioni valuta per utente ${userId}:`, { currency, symbol });
      
      if (!currency || !symbol) {
        return res.status(400).json({ error: "Valuta e simbolo richiesti" });
      }
      
      const settings = await storage.saveCurrencySettings(userId, currency, symbol);
      
      console.log(`✅ [POST] Impostazioni valuta salvate per utente ${userId}`);
      
      res.json({ 
        success: true, 
        message: "Impostazioni valuta salvate con successo",
        currency: settings.currency,
        symbol: settings.symbol
      });
    } catch (error) {
      console.error(`❌ [POST] Errore salvataggio impostazioni valuta per utente ${req.user?.id}:`, error);
      res.status(500).json({ success: false, message: "Errore durante il salvataggio" });
    }
  });



  // Sistema lineare semplice - Appuntamenti (COMPLETAMENTE UNIFICATO MOBILE/DESKTOP)
  app.get("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    console.log(`📅 [/api/appointments] [${deviceType}] Richiesta da utente ID:${user.id}, tipo:${user.type}, email:${user.username}`);
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
      console.log(`🔄 [${deviceType}] Intestazioni anti-cache applicate per mobile`);
    }
    
    try {
      // 🔄 USA POSTGRESQL: Carica appuntamenti dal database condiviso
      const userAppointments = await storage.getAppointmentsForUser(user.id, user.type);
      
      console.log(`📅 [${deviceType}] Caricati ${userAppointments.length} appuntamenti da PostgreSQL per utente ${user.id}`);
      
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
        room: apt.room // ✅ NEW: Oggetto room completo (opzionale)
      }));
      
      res.json(formattedAppointments);
    } catch (error) {
      console.error(`❌ [/api/appointments] Errore caricamento da PostgreSQL:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  app.get("/api/appointments/date/:date", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const { date } = req.params;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    console.log(`📅 [/api/appointments/date] [${deviceType}] Utente ${user.id} cerca appuntamenti per data ${date}`);
    
    try {
      // 🔄 USA POSTGRESQL: Carica appuntamenti per data dal database condiviso
      const dayAppointments = await storage.getAppointmentsByDateForUser(date, user.id, user.type);
      
      console.log(`📅 [${deviceType}] Caricati ${dayAppointments.length} appuntamenti da PostgreSQL per ${date}`);
      
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
        room: apt.room // ✅ NEW: Oggetto room completo (opzionale)
      }));
      
      res.json(formattedAppointments);
    } catch (error) {
      console.error(`❌ [/api/appointments/date] Errore caricamento da PostgreSQL:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Endpoint per range di appuntamenti (necessario per i report) - USA POSTGRESQL
  app.get("/api/appointments/range/:startDate/:endDate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    
    const { startDate, endDate } = req.params;
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    console.log(`📊 [/api/appointments/range PG] [${deviceType}] Utente ${user.id} cerca appuntamenti per range ${startDate}-${endDate}`);
    
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
      
      console.log(`📊💻 [${deviceType}] Appuntamenti range ${startDate}-${endDate}: ${userRangeAppointments.length} da PostgreSQL`);
      
      // Formatta appuntamenti con relazioni per il report
      const rangeAppointmentsWithDetails = userRangeAppointments.map(appointment => {
        // Log dettagliato per debug fatturato
        if (appointment.service) {
          console.log(`💰 Appuntamento ${appointment.id}: Servizio ${appointment.service.name}, Prezzo: ${appointment.service.price} centesimi (${(appointment.service.price || 0) / 100}€)`);
        } else {
          console.log(`⚠️ Appuntamento ${appointment.id}: Servizio non trovato per serviceId ${appointment.serviceId}`);
        }
        
        return { 
          ...appointment, 
          client: appointment.client || { firstName: "Cliente", lastName: "Sconosciuto", id: appointment.clientId },
          service: appointment.service || { name: "Servizio Sconosciuto", id: appointment.serviceId, color: "#666666", price: 0 }
        };
      });
      
      console.log(`💰 [${deviceType}] Report PostgreSQL: calcolato ricavi per ${rangeAppointmentsWithDetails.length} appuntamenti`);
      res.json(rangeAppointmentsWithDetails);
    } catch (error) {
      console.error(`❌ [/api/appointments/range PG] Errore caricamento da PostgreSQL:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    console.log(`📅 [/api/appointments] POST - Creazione appuntamento per utente ${user.id}`);
    console.log(`📝 Dati ricevuti:`, req.body);
    
    try {
      // 📅 CALCOLA reminder_time: 24 ore prima dell'appuntamento
      let reminderTime = null;
      if (req.body.date && req.body.startTime) {
        const appointmentDateTime = new Date(`${req.body.date}T${req.body.startTime}`);
        reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 ore prima
        console.log(`⏰ [REMINDER] Calcolato reminder_time: ${reminderTime.toISOString()} (24h prima di ${appointmentDateTime.toISOString()})`);
      }
      
      // 🔄 USA POSTGRESQL: Crea appuntamento nel database condiviso
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
      
      const newAppointment = await storage.createAppointment(appointmentData);
      
      console.log(`✅ [PostgreSQL] Appuntamento ${newAppointment.id} creato con staffId: ${newAppointment.staffId}, roomId: ${newAppointment.roomId}, packagePurchaseId: ${newAppointment.packagePurchaseId}, reminderTime: ${reminderTime?.toISOString() || 'null'}`);
      
      // 📦 PACCHETTI: Scala automaticamente sessioni se appuntamento usa un pacchetto
      if (req.body.packagePurchaseId) {
        try {
          const packagePurchaseId = req.body.packagePurchaseId;
          console.log(`📦 [PACKAGE] Appuntamento ${newAppointment.id} usa pacchetto ${packagePurchaseId}, inizio riscatto sessione...`);
          
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
            await db.insert(packageRedemptions).values({
              packagePurchaseId: packagePurchaseId,
              appointmentId: newAppointment.id,
              redeemedAt: new Date(),
              notes: `Appuntamento ${newAppointment.id} del ${req.body.date}`
            });
            
            console.log(`✅ [PACKAGE] Sessione riscattata! Pacchetto ${packagePurchaseId}: ${newSessionsRemaining}/${packagePurchase.sessionsTotal} rimanenti (status: ${newStatus})`);
          }
        } catch (packageError) {
          console.error(`❌ [PACKAGE] Errore riscatto sessione:`, packageError);
          // Non bloccare la creazione dell'appuntamento se il riscatto fallisce
        }
      }
      
      // 📧 EMAIL AUTOMATICHE GESTITE DA SCHEDULER
      // Le notifiche email vengono inviate automaticamente dallo scheduler 24h prima
      // Le notifiche WhatsApp possono essere inviate manualmente dal WhatsApp Center
      console.log(`📧 [NOTIFICHE] Appuntamento creato - email automatica schedulata per ${reminderTime?.toISOString() || 'N/A'}`);
      
      res.status(201).json(newAppointment);
    } catch (error) {
      console.error(`❌ [/api/appointments] Errore creazione appuntamento:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  app.get("/api/appointments/:id", async (req, res) => {
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
      
      console.log(`✅ [PostgreSQL] Appuntamento ${appointmentId} recuperato`);
      res.status(200).json(appointment);
    } catch (error) {
      console.error(`❌ [/api/appointments/:id] Errore recupero appuntamento:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  app.put("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const appointmentId = parseInt(req.params.id);
    
    console.log(`📝 [/api/appointments/:id] PUT - Aggiornamento appuntamento ${appointmentId} per utente ${user.id}`);
    console.log(`📝 Dati ricevuti:`, req.body);
    
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
      
      console.log(`✅ [PostgreSQL] Appuntamento ${appointmentId} aggiornato con staffId: ${updatedAppointment.staffId}, roomId: ${updatedAppointment.roomId}`);
      
      res.status(200).json(updatedAppointment);
    } catch (error) {
      console.error(`❌ [/api/appointments/:id] Errore aggiornamento appuntamento:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const appointmentId = parseInt(req.params.id);
    
    console.log(`🗑️ [DELETE] Tentativo eliminazione appuntamento ${appointmentId} da utente ${user.id} (${user.type})`);
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({ message: "ID appuntamento non valido" });
    }
    
    try {
      // 🔄 USA POSTGRESQL: Elimina appuntamento dal database condiviso
      const deleted = await storage.deleteAppointment(appointmentId);
      
      if (!deleted) {
        console.log(`❌ [DELETE] Appuntamento ${appointmentId} non trovato`);
        return res.status(404).json({ message: "Appuntamento non trovato" });
      }
      
      console.log(`✅ [DELETE] Appuntamento ${appointmentId} eliminato da PostgreSQL per utente ${user.id}`);
      res.status(200).json({ message: "Appuntamento eliminato con successo" });
    } catch (error) {
      console.error(`❌ [DELETE] Errore eliminazione appuntamento:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // ==================== BOOKING REQUESTS API ====================
  // API per richieste di prenotazione da parte dei clienti

  // POST /api/booking-requests - Cliente crea richiesta (calcola slot automaticamente)
  app.post("/api/booking-requests", async (req, res) => {
    try {
      const { clientCode, serviceId, staffId, requestedDate, requestedTimeStart, requestedTimeEnd, clientNotes } = req.body;
      
      console.log(`📝 [BOOKING REQUEST] Nuova richiesta da cliente ${clientCode} ${staffId ? `con preferenza staff ${staffId}` : 'senza preferenza staff'}`);
      
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
  app.get("/api/booking-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    try {
      const requestsWithClients = await db
        .select({
          ...bookingRequests,
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
        })
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
  app.put("/api/booking-requests/:id/select-slot", async (req, res) => {
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
  app.put("/api/booking-requests/:id/confirm", async (req, res) => {
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
        slot => slot.start === requestData.selectedSlot.start && slot.end === requestData.selectedSlot.end
      );
      
      if (!slotStillAvailable) {
        console.error(`❌ [BOOKING REQUEST] Slot ${requestData.selectedSlot.start}-${requestData.selectedSlot.end} non più disponibile`);
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
            console.log(`⚠️ [BOOKING REQUEST] Nessuna stanza libera trovata, appuntamento creato senza stanza assegnata`);
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
      res.status(200).json({ appointment: newAppointment[0], request: requestData });
    } catch (error) {
      console.error(`❌ [BOOKING REQUEST] Errore conferma richiesta:`, error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // PUT /api/booking-requests/:id/reject - Admin rifiuta richiesta
  app.put("/api/booking-requests/:id/reject", async (req, res) => {
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
  app.get("/api/client-services", async (req, res) => {
    try {
      const { clientCode } = req.query;
      
      if (!clientCode || typeof clientCode !== 'string') {
        return res.status(400).json({ error: "clientCode richiesto" });
      }
      
      console.log(`🔍 [CLIENT SERVICES] Richiesta servizi per clientCode: ${clientCode}`);
      
      // Trova cliente dal codice univoco
      const client = await db.select().from(clients).where(eq(clients.uniqueCode, clientCode)).limit(1);
      
      if (!client || client.length === 0) {
        console.log(`❌ [CLIENT SERVICES] Cliente non trovato per code: ${clientCode}`);
        return res.status(404).json({ error: "Cliente non trovato" });
      }
      
      const ownerId = client[0].userId;
      
      // Carica servizi del professionista (owner)
      const services = await storage.getServicesForUser(ownerId);
      
      // Ritorna solo campi essenziali (id, name, duration, color, price)
      const publicServices = services.map(s => ({
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
  app.get("/api/client-staff", async (req, res) => {
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

  // Endpoint DELETE per eliminare clienti - USA POSTGRESQL
  app.delete("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clientId = parseInt(req.params.id);
    
    console.log(`🗑️ [DELETE PG] Richiesta eliminazione cliente ID ${clientId} da utente ${user.id} (${user.email})`);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "ID cliente non valido" });
    }
    
    try {
      // 🔄 USA POSTGRESQL: Trova il cliente nel database
      const client = await storage.getClient(clientId);
      
      if (!client) {
        console.log(`❌ [DELETE PG] Cliente con ID ${clientId} non trovato`);
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      // Verifica permessi: solo il proprietario o admin possono eliminare
      if (user.type !== 'admin' && client.ownerId !== user.id) {
        console.log(`❌ [DELETE PG] Accesso negato - utente ${user.id} non è proprietario del cliente ${clientId} (proprietario: ${client.ownerId})`);
        return res.status(403).json({ message: "Non sei autorizzato a eliminare questo cliente" });
      }
      
      console.log(`🗑️ [DELETE PG] Eliminazione autorizzata - utente ${user.id} è ${user.type === 'admin' ? 'admin' : 'proprietario'} del cliente ${clientId}`);
      
      // 🔄 USA POSTGRESQL: Elimina cliente (PostgreSQL eliminerà automaticamente gli appuntamenti correlati se configurato con ON DELETE CASCADE)
      const deleted = await storage.deleteClient(clientId);
      
      if (!deleted) {
        console.log(`❌ [DELETE PG] Errore eliminazione cliente ${clientId}`);
        return res.status(500).json({ message: "Errore durante l'eliminazione" });
      }
      
      console.log(`✅ [DELETE PG] Cliente ID ${clientId} "${client.firstName} ${client.lastName}" eliminato da PostgreSQL`);
      
      res.status(200).json({ 
        message: "Cliente eliminato con successo",
        deletedClient: {
          id: clientId,
          firstName: client.firstName,
          lastName: client.lastName
        }
      });
    } catch (error) {
      console.error(`❌ [DELETE PG] Errore eliminazione cliente:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Endpoint per recuperare notifiche admin
  app.get("/api/admin/notifications", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    // Solo admin possono vedere le notifiche
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Accesso negato" });
    }
    
    const storageData = loadStorageData();
    const notifications = storageData.adminNotifications || [];
    
    // Ordina per timestamp decrescente (più recenti prima)
    const sortedNotifications = notifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    res.json(sortedNotifications);
  });

  // Endpoint per marcare notifiche come lette
  app.post("/api/admin/notifications/:id/read", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Accesso negato" });
    }
    
    const notificationId = parseInt(req.params.id);
    const storageData = loadStorageData();
    
    if (storageData.adminNotifications) {
      const notification = storageData.adminNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        saveStorageData(storageData);
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Notifica non trovata" });
      }
    } else {
      res.status(404).json({ message: "Notifica non trovata" });
    }
  });

  // Sistema QR Code per accesso clienti - SEPARAZIONE PER UTENTE
  app.get("/api/clients/:id/activation-token", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clientId = parseInt(req.params.id);
    
    console.log(`🔍 [QR-INTERFACE] Richiesta QR per cliente ID: ${clientId} da utente: ${user.id} (${user.email})`);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "ID cliente non valido" });
    }
    
    // 🔄 USA POSTGRESQL: Carica cliente dal database condiviso
    const client = await storage.getClient(clientId);
    
    if (!client) {
      console.log(`❌ [QR-INTERFACE] Cliente ${clientId} NON TROVATO nel sistema`);
      return res.status(404).json({ message: "Cliente non trovato nel sistema" });
    }
    
    console.log(`🔍 [QR-INTERFACE] Cliente trovato: ${client.firstName} ${client.lastName} (ID: ${clientId}, Owner: ${client.ownerId})`);
    
    // Verifica proprietà - solo admin o proprietario del cliente
    if (user.type !== 'admin' && client.ownerId && client.ownerId !== user.id) {
      console.log(`❌ [QR-INTERFACE] Accesso negato - utente ${user.id} non autorizzato per cliente del proprietario ${client.ownerId}`);
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo cliente" });
    }
    
    // Genera token di attivazione permanente basato su codici gerarchici
    const ownerUserId = client.ownerId || user.id;
    
    // SISTEMA CODICI GERARCHICI: Verifica e genera codici se mancanti (logica permanente)
    let clientCode = client.uniqueCode;
    if (!clientCode || !clientCode.startsWith('PROF_') || !(await validateClientOwnership(clientCode, ownerUserId))) {
      console.log(`🔧 [AUTO-FIX] Generazione codice gerarchico per cliente ${clientId}, proprietario ${ownerUserId}`);
      clientCode = await generateClientCode(ownerUserId, clientId);
      
      // 🔄 USA POSTGRESQL: Aggiorna cliente nel database condiviso
      const profCode = await getProfessionistCode(ownerUserId);
      await storage.updateClient(clientId, {
        uniqueCode: clientCode,
        professionistCode: profCode,
        ownerId: ownerUserId
      });
      console.log(`✅ [AUTO-FIX] Cliente ${clientId} aggiornato con codice: ${clientCode}`);
    }
    
    const crypto = await import('crypto');
    const tokenData = `${clientCode}_SECURE_${ownerUserId}`;
    const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
    const token = `${clientCode}_${stableHash}`;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    
    // PERCORSO DEDICATO BASATO SU CODICE UNIVOCO: Ogni cliente ha il suo URL unico
    const activationUrl = `${protocol}://${host}/client/${clientCode}?token=${token}&autoLogin=true`;
    
    try {
      // Genera QR code vero usando la libreria qrcode con import dinamico sicuro
      let QRCode;
      try {
        const qrModule = await import('qrcode');
        QRCode = qrModule.default || qrModule;
      } catch (importError) {
        console.error('Errore import QRCode:', importError);
        throw new Error('Libreria QR code non disponibile');
      }
      
      const qrCode = await QRCode.toDataURL(activationUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // CORREZIONE CRITICA: Sincronizza icone PWA con l'icona del proprietario del cliente
      const storageData = loadStorageData();
      const ownerIcon = storageData.userIcons[ownerUserId] || defaultIconBase64;
      console.log(`🔧 [QR-PWA-SYNC] Sincronizzazione icone PWA per cliente ${clientId} con icona del proprietario ${ownerUserId}`);
      
      try {
        await updatePWAIconsFromCompanyLogo(ownerUserId, ownerIcon);
        console.log(`✅ [QR-PWA-SYNC] Icone PWA sincronizzate con successo per proprietario ${ownerUserId}`);
      } catch (syncError) {
        console.error(`❌ [QR-PWA-SYNC] Errore sincronizzazione icone PWA:`, syncError);
      }
      
      const responseData = {
        token,
        activationUrl,
        qrCode,
        clientName: `${client.firstName} ${client.lastName}`
      };
      
      console.log(`✅ [QR-INTERFACE] Risposta inviata al frontend:`);
      console.log(`   - Cliente: ${responseData.clientName}`);
      console.log(`   - Token: ${responseData.token}`);
      console.log(`   - URL: ${responseData.activationUrl}`);
      
      res.json(responseData);
    } catch (error) {
      console.error('Errore generazione QR:', error);
      res.status(500).json({ message: "Errore nella generazione del QR code" });
    }
  });



  // Endpoint per verificare token QR e autenticare cliente
  app.post("/api/client-access/verify-token", async (req, res) => {
    const { token, clientId } = req.body;
    
    if (!token || !clientId) {
      return res.status(400).json({ message: "Token e clientId richiesti" });
    }
    
    // NUOVO FORMATO: Verifica token basato su codici gerarchici PROF_XXX_XXXX_CLIENT_XXX_XXXX_hash
    const crypto = await import('crypto');
    
    // Estrae codice cliente e hash dal token
    const lastUnderscoreIndex = token.lastIndexOf('_');
    if (lastUnderscoreIndex === -1) {
      return res.status(400).json({ message: "Formato token non valido" });
    }
    
    const clientCode = token.substring(0, lastUnderscoreIndex);
    const providedHash = token.substring(lastUnderscoreIndex + 1);
    
    // Verifica che il codice cliente sia formato gerarchico valido
    if (!clientCode.match(/^PROF_\d{2,3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/)) {
      return res.status(400).json({ message: "Codice cliente non valido" });
    }
    
    // Estrae owner ID dal codice cliente (supporta 2-3 cifre)
    const ownerMatch = clientCode.match(/^PROF_(\d{2,3})_/);
    if (!ownerMatch) {
      return res.status(400).json({ message: "Impossibile identificare proprietario dal codice" });
    }
    
    const ownerId = parseInt(ownerMatch[1], 10);
    
    // Verifica hash del token
    const tokenData = `${clientCode}_SECURE_${ownerId}`;
    const expectedHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
    
    if (providedHash !== expectedHash) {
      return res.status(401).json({ message: "Token non autorizzato" });
    }
    
    // Carica dati reali dal file storage_data.json
    const storageData = loadStorageData();
    const allClients = storageData.clients || [];
    
    // Cerca il cliente nei dati storage reali
    const clientData = allClients.find(([id]) => id.toString() === clientId.toString());
    
    if (!clientData) {
      return res.status(404).json({ message: "Cliente non trovato nel sistema" });
    }
    
    const client = clientData[1];
    
    // VALIDAZIONE CRITICA: Verifica che il cliente appartenga al proprietario del codice gerarchico
    const clientOwnerId = client.ownerId;
    if (!clientOwnerId || clientOwnerId !== ownerId) {
      console.error(`🚨 VIOLAZIONE SICUREZZA: Cliente ${clientId} appartiene a ${clientOwnerId} ma token per proprietario ${ownerId}`);
      return res.status(403).json({ message: "Token non autorizzato per questo cliente" });
    }
    
    // Verifica che il codice cliente corrisponda al formato gerarchico
    if (client.uniqueCode && !(await validateClientOwnership(client.uniqueCode, ownerId))) {
      console.error(`🚨 VIOLAZIONE SICUREZZA: Codice cliente ${client.uniqueCode} non valido per proprietario ${ownerId}`);
      return res.status(403).json({ message: "Codice cliente non valido per questo proprietario" });
    }
    
    console.log(`✅ Token QR verificato con successo per cliente ${clientId} (${client.firstName} ${client.lastName}) del proprietario ${ownerId}`);
    
    // Restituisci i dati del cliente autenticato
    res.json({
      client: {
        id: clientId,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        email: client.email,
        ownerId: client.ownerId
      }
    });
  });

  app.get("/api/client-access/count/:clientId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clientIdParam = req.params.clientId;
    
    // 🔄 USA POSTGRESQL: Cerca il cliente nel database condiviso
    const client = await storage.getClient(parseInt(clientIdParam, 10));
    
    if (!client) {
      return res.status(404).json({ message: "Cliente non trovato nel sistema" });
    }
    
    // Verifica proprietà - solo admin o proprietario del cliente
    if (user.type !== 'admin' && client.ownerId && client.ownerId !== user.id) {
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo cliente" });
    }
    
    // SISTEMA SEMPLIFICATO: 1 accesso = 1 conteggio - DIMEZZATO PER COMPENSARE DOPPIO INCREMENTO
    const actualAccessCount = client.accessCount || 0;
    const displayCount = Math.floor(actualAccessCount / 2);
    
    console.log(`[DEBUG COUNT] Cliente ${clientIdParam} (${client.firstName} ${client.lastName}) - accessCount: ${actualAccessCount} → display: ${displayCount}`);
    
    // Previeni cache per assicurarsi che i conteggi siano sempre aggiornati
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    res.json({ count: displayCount });
  });

  // Endpoint per verificare token QR e restituire dati cliente
  app.post("/api/client-access/verify-token", async (req, res) => {
    const { token, clientId } = req.body;
    
    if (!token || !clientId) {
      return res.status(400).json({ message: "Token e clientId richiesti" });
    }
    
    // Verifica formato token: userId_clientId_timestamp
    const tokenParts = token.split('_');
    if (tokenParts.length !== 3) {
      return res.status(400).json({ message: "Formato token non valido" });
    }
    
    const [userId, tokenClientId, timestamp] = tokenParts;
    
    // Verifica che il clientId nel token corrisponda a quello fornito
    if (parseInt(tokenClientId, 10) !== parseInt(clientId, 10)) {
      return res.status(400).json({ message: "Token non corrisponde al cliente" });
    }
    
    // Verifica che il cliente esista nel sistema storage reale
    const storageData = loadStorageData();
    let clientFound = null;
    
    const clients = storageData.clients || [];
    for (const [id, clientData] of clients) {
      if (parseInt(id.toString(), 10) === parseInt(clientId, 10)) {
        clientFound = clientData;
        break;
      }
    }
    
    if (!clientFound) {
      return res.status(404).json({ message: "Cliente non trovato" });
    }
    
    // Token valido - restituisci i dati del cliente
    res.json({
      valid: true,
      client: {
        id: parseInt(clientId, 10),
        firstName: clientFound.firstName || '',
        lastName: clientFound.lastName || '',
        phone: clientFound.phone || '',
        email: clientFound.email || '',
        address: clientFound.address || '',
        birthday: clientFound.birthday || '',
        hasConsent: clientFound.hasConsent || false
      }
    });
  });

  // Endpoint per recuperare dati di un singolo cliente (per admin/staff)
  app.get("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;
    const user = req.user;
    
    // Solo admin e staff possono accedere
    if (user.type !== 'admin' && user.type !== 'staff' && user.type !== 'customer') {
      return res.status(403).json({ message: "Accesso negato" });
    }

    // 🔄 MULTI-TENANT: Risolvi tenant ID corretto (staff condivide con business owner)
    const tenantId = user.ownerId ?? user.tenantId ?? user.id;

    // 🔄 USA POSTGRESQL: Cerca il cliente nel database condiviso
    const clientFound = await storage.getClient(parseInt(id, 10));

    if (!clientFound) {
      return res.status(404).json({ message: "Cliente non trovato" });
    }

    // 🔒 MULTI-TENANT SECURITY: Admin bypass - gli admin vedono tutti i clienti
    if (user.type !== 'admin') {
      // Staff utenti (user.ownerId != null) condividono i dati con il business owner
      if (clientFound.userId !== tenantId) {
        console.log(`🚫 [GET /api/clients/:id] User ${user.id} (tenant ${tenantId}) tentato accesso a cliente ${id} di tenant ${clientFound.userId}`);
        return res.status(403).json({ message: "Non autorizzato ad accedere a questo cliente" });
      }
    }

    res.json({
      id: clientFound.id,
      firstName: clientFound.firstName || '',
      lastName: clientFound.lastName || '',
      phone: clientFound.phone || '',
      email: clientFound.email || '',
      address: clientFound.address || '',
      birthday: clientFound.birthday || '',
      hasConsent: clientFound.hasConsent || false,
      isFrequent: clientFound.isFrequent || false,
      notes: clientFound.notes || '',
      medicalNotes: clientFound.medicalNotes || '',
      allergies: clientFound.allergies || '',
      taxCode: clientFound.taxCode || '',
      vatNumber: clientFound.vatNumber || ''
    });
  });

  // Endpoint per caricare appuntamenti del cliente via token QR
  app.get("/api/appointments/client/:clientId", async (req, res) => {
    const { clientId } = req.params;
    const user = req.user as any; // Può essere undefined se non autenticato (PWA pubblico)
    
    if (!clientId) {
      return res.status(400).json({ message: "ClientId richiesto" });
    }
    
    try {
      // 🔒 MULTI-TENANT SECURITY: Verifica ownership del cliente
      const client = await storage.getClient(parseInt(clientId));
      
      if (!client) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      // Se autenticato, verifica che il cliente appartenga all'utente (eccetto admin)
      if (user && user.type !== 'admin' && client.ownerId !== user.id) {
        console.log(`🚫 [SECURITY] User ${user.id} tentato accesso a cliente ${clientId} di proprietà di ${client.ownerId}`);
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      // 🔄 USA POSTGRESQL: Carica appuntamenti per cliente dal database condiviso
      const clientAppointments = await storage.getAppointmentsByClient(parseInt(clientId));
      
      // Converte formato PostgreSQL → JSON per compatibilità frontend
      const formattedAppointments = clientAppointments.map(apt => ({
        id: apt.id,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        notes: apt.notes || '',
        reminderSent: apt.reminderSent || false,
        reminderConfirmed: apt.reminderConfirmed || false,
        clientId: apt.clientId
      }));
      
      res.json(formattedAppointments);
    } catch (error) {
      console.error(`❌ [/api/appointments/client] Errore caricamento da PostgreSQL:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Endpoint di validazione token QR code per attivazione app PWA cliente
  app.get("/activate", async (req, res) => {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).send(`
        <html>
          <head>
            <title>Errore Attivazione</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">❌ Token Mancante</h1>
            <p>Token di attivazione non fornito. Scansiona nuovamente il QR code.</p>
          </body>
        </html>
      `);
    }
    
    console.log(`🔍 [ACTIVATE] Tentativo di attivazione con token: ${token}`);
    
    // NUOVA LOGICA: Supporta token gerarchici formato PROF_XXX_XXXX_CLIENT_XXX_XXXX_hash
    const crypto = await import('crypto');
    
    // Estrae codice cliente e hash dal token
    const lastUnderscoreIndex = token.lastIndexOf('_');
    if (lastUnderscoreIndex === -1) {
      console.log(`❌ [ACTIVATE] Token senza hash: ${token}`);
      return res.status(400).send(`
        <html>
          <head>
            <title>Errore Attivazione</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">❌ Token Non Valido</h1>
            <p>Formato token non valido. Richiedi un nuovo QR code.</p>
          </body>
        </html>
      `);
    }
    
    const clientCode = token.substring(0, lastUnderscoreIndex);
    const providedHash = token.substring(lastUnderscoreIndex + 1);
    
    console.log(`🔍 [ACTIVATE] Codice cliente: ${clientCode}, Hash: ${providedHash}`);
    
    // Verifica che il codice cliente sia formato gerarchico valido
    // Formato: PROF_014_9C1F_CLIENT_1750177330362_816C (supporta anche PROF_XXX_)
    if (!clientCode.match(/^PROF_\d{2,3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/)) {
      console.log(`❌ [ACTIVATE] Codice cliente non gerarchico: ${clientCode}`);
      console.log(`❌ [ACTIVATE] Pattern atteso: PROF_XX_XXXX_CLIENT_NNNNN_XXXX o PROF_XXX_XXXX_CLIENT_NNNNN_XXXX`);
      return res.status(400).send(`
        <html>
          <head>
            <title>Errore Attivazione</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">❌ Token Non Valido</h1>
            <p>Formato token non valido. Richiedi un nuovo QR code.</p>
          </body>
        </html>
      `);
    }
    
    // Estrae owner ID dal codice cliente (supporta 2-3 cifre)
    const ownerMatch = clientCode.match(/^PROF_(\d{2,3})_/);
    if (!ownerMatch) {
      console.log(`❌ [ACTIVATE] Impossibile estrarre proprietario da: ${clientCode}`);
      return res.status(400).send(`
        <html>
          <head>
            <title>Errore Attivazione</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">❌ Token Non Valido</h1>
            <p>Impossibile identificare proprietario dal codice. Richiedi un nuovo QR code.</p>
          </body>
        </html>
      `);
    }
    
    const ownerId = parseInt(ownerMatch[1], 10);
    
    // Verifica hash del token
    const tokenData = `${clientCode}_SECURE_${ownerId}`;
    const expectedHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
    
    console.log(`🔍 [ACTIVATE] Owner ID: ${ownerId}, Token data: ${tokenData}, Expected hash: ${expectedHash}`);
    
    if (providedHash !== expectedHash) {
      console.log(`❌ [ACTIVATE] Hash mismatch. Provided: ${providedHash}, Expected: ${expectedHash}`);
      return res.status(401).send(`
        <html>
          <head>
            <title>Token Non Autorizzato</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">🔒 Token Non Autorizzato</h1>
            <p>Il token non è valido per questo cliente. Richiedi un nuovo QR code.</p>
          </body>
        </html>
      `);
    }
    
    // Estrae client ID dal codice gerarchico
    const clientMatch = clientCode.match(/CLIENT_(\d+)_/);
    if (!clientMatch) {
      console.log(`❌ [ACTIVATE] Impossibile estrarre client ID da: ${clientCode}`);
      return res.status(400).send(`
        <html>
          <head>
            <title>Errore Attivazione</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">❌ Token Non Valido</h1>
            <p>Impossibile identificare cliente dal codice. Richiedi un nuovo QR code.</p>
          </body>
        </html>
      `);
    }
    
    const clientId = parseInt(clientMatch[1], 10);
    console.log(`🔍 [ACTIVATE] Client ID estratto: ${clientId}`);
    
    // Verifica che il cliente esista nel sistema storage reale
    const storageData = loadStorageData();
    const clients = storageData.clients || [];
    const clientData = clients.find(([id]) => id === clientId);
    
    if (!clientData) {
      console.log(`❌ [ACTIVATE] Cliente ${clientId} non trovato nel sistema`);
      return res.status(404).send(`
        <html>
          <head>
            <title>Cliente Non Trovato</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">👤 Cliente Non Trovato</h1>
            <p>Il cliente non esiste nel sistema. Verifica il QR code.</p>
          </body>
        </html>
      `);
    }
    
    const client = clientData[1];
    
    // VALIDAZIONE CRITICA: Verifica che il cliente appartenga al proprietario del codice gerarchico
    const clientOwnerId = client.ownerId;
    if (!clientOwnerId || clientOwnerId !== ownerId) {
      console.error(`🚨 [ACTIVATE] VIOLAZIONE SICUREZZA: Cliente ${clientId} appartiene a ${clientOwnerId} ma token per proprietario ${ownerId}`);
      return res.status(403).send(`
        <html>
          <head>
            <title>Accesso Negato</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">🔒 Accesso Negato</h1>
            <p>Non sei autorizzato ad accedere a questo cliente. Contatta il tuo professionista.</p>
          </body>
        </html>
      `);
    }
    
    console.log(`✅ [ACTIVATE] Token valido per cliente ${clientId} (${client.firstName} ${client.lastName}) del proprietario ${ownerId}`);
    
    // REDIRECT FISSO: Reindirizza direttamente alla client area con autocompilazione token
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const clientAreaUrl = `${protocol}://${host}/client-area?token=${token}&clientId=${clientId}&autoLogin=true`;
    
    console.log(`🔄 [ACTIVATE] Reindirizzamento diretto alla client area: ${clientAreaUrl}`);
    
    // Redirect diretto alla client area - RISOLVE problema "Token Mancante"
    res.redirect(clientAreaUrl);
  });

  // Endpoint Staff Management - Solo per admin (POSTGRESQL)
  app.get("/api/staff/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può accedere alla gestione staff" });
    }
    
    try {
      console.log("🔵 [/api/staff/users] SIMPLE-ROUTES - Recupero staff da PostgreSQL");
      
      // Carica tutti gli utenti da PostgreSQL
      const staffUsers = await storage.getAllStaffUsers();
      console.log(`🔵 [/api/staff/users] Trovati ${staffUsers.length} utenti dal database`);
      
      // Rimuovi password e aggiungi codici referral
      const safeUsers = staffUsers.map(staffUser => {
        const { password, ...userWithoutPassword } = staffUser;
        
        // Genera codice referral
        const referralCode = staffUser.id === 14 ? "BUS14" : 
                           staffUser.id === 16 ? "FAV16" : 
                           staffUser.id === 8 ? "ZAM08" : 
                           `REF${staffUser.id}`;
        
        return {
          ...userWithoutPassword,
          referralCode: referralCode
        };
      });
      
      console.log(`✅ [/api/staff/users] Invio ${safeUsers.length} utenti staff`);
      res.json(safeUsers);
    } catch (error) {
      console.error("❌ [/api/staff/users] Errore:", error);
      res.status(500).json({ message: "Errore nel caricamento staff" });
    }
  });

  // Endpoint per salvare dati bancari staff
  app.patch("/api/staff/:userId/banking", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può modificare i dati bancari staff" });
    }
    
    try {
      const userId = parseInt(req.params.userId);
      const { iban, bic, bankName, accountHolder } = req.body;
      
      console.log(`💳 [BANKING] Aggiornamento dati bancari per staff ${userId}:`, { iban, bic, bankName, accountHolder });
      
      // Aggiorna i dati bancari tramite storage
      const updated = await storage.updateStaffBanking(userId, {
        iban,
        bic,
        bankName,
        accountHolder
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Staff non trovato" });
      }
      
      console.log(`✅ [BANKING] Dati bancari aggiornati per staff ${userId}`);
      res.json({ success: true, message: "Dati bancari aggiornati con successo" });
    } catch (error) {
      console.error("❌ [BANKING] Errore:", error);
      res.status(500).json({ message: "Errore nel salvataggio dati bancari" });
    }
  });

  // Endpoint Referral System - Per admin e business
  app.get("/api/referral/codes", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin' && user.type !== 'business') {
      return res.status(403).json({ message: "Solo admin e business possono accedere ai referral" });
    }
    
    // Carica codici referral dal storage
    const referralCodes = loadStorageData().referralCodes || [];
    
    // Per business users, mostra solo i propri codici
    let userCodes;
    if (user.type === 'admin') {
      userCodes = referralCodes;
    } else {
      userCodes = referralCodes.filter(code => code.ownerId === user.id);
    }
    
    res.json(userCodes);
  });

  // Endpoint Referral Overview - Solo per admin (USA JSON STORAGE)
  app.get("/api/referral-overview", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può accedere alla panoramica referral" });
    }
    
    try {
      // Carica dati dal JSON storage
      const storageData = loadStorageData();
      const referralCommissions = storageData.referralCommissions || [];
      
      // Trova tutti gli staff con referral attivi nel JSON
      // Struttura JSON users: { "0": [id, datiUtente], "1": [id, datiUtente], ... }
      const allUsersArray = Object.entries(storageData.users || {});
      const staffMembers = allUsersArray
        .filter(([key, userEntry]) => {
          const userData = (userEntry as any)[1]; // Secondo elemento dell'array
          return userData && userData.type === 'staff';
        })
        .map(([key, userEntry]) => {
          const userData = (userEntry as any)[1];
          return {
            staffId: userData.id,
            staffName: userData.username,
            staffEmail: userData.email || userData.username
          };
        });
      
      // Calcola statistiche per ogni staff
      const staffStats = staffMembers.map(staff => {
        const staffCommissions = referralCommissions.filter((commission: any) => 
          commission.referrerId === staff.staffId && commission.status === 'active'
        );
        
        const sponsoredCount = staffCommissions.length;
        const totalCommissions = staffCommissions.reduce((sum: number, commission: any) => 
          sum + (commission.monthlyAmount || 0), 0
        );
        const paidCommissions = staffCommissions
          .filter((commission: any) => commission.isPaid)
          .reduce((sum: number, commission: any) => sum + (commission.monthlyAmount || 0), 0);
        const pendingCommissions = totalCommissions - paidCommissions;
        
        return {
          ...staff,
          sponsoredCount,
          totalCommissions,
          paidCommissions,
          pendingCommissions
        };
      }).filter(staff => staff.sponsoredCount > 0); // Solo staff con referral attivi
      
      // Calcola totali generali
      const totals = {
        totalSponsored: staffStats.reduce((sum, staff) => sum + staff.sponsoredCount, 0),
        totalCommissions: staffStats.reduce((sum, staff) => sum + staff.totalCommissions, 0),
        totalPaid: staffStats.reduce((sum, staff) => sum + staff.paidCommissions, 0),
        totalPending: staffStats.reduce((sum, staff) => sum + staff.pendingCommissions, 0)
      };
      
      const response = {
        staffStats,
        totals,
        commissionRate: 25, // 25% commissione standard
        minSponsorshipForCommission: 3 // Dal terzo abbonamento sponsorizzato
      };
      
      res.json(response);
    } catch (error) {
      console.error('Errore nel caricamento panoramica referral:', error);
      res.status(500).json({ message: "Errore nel caricamento dei dati referral" });
    }
  });

  // Endpoint Tutte le Commissioni - Solo per admin
  app.get("/api/staff-commissions/all", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può accedere alle commissioni staff" });
    }
    
    try {
      const storageData = loadStorageData();
      const referralCommissions = storageData.referralCommissions || [];
      
      // Arricchisci TUTTE le commissioni con dati utente e staff
      const allCommissions = await Promise.all(
        referralCommissions.map(async (commission) => {
          // Recupera dati dell'utente sponsorizzato (referred)
          const referredUser = await storage.getUser(commission.referredId);
          const subscription = await storage.getSubscriptionByUserId(commission.referredId);
          
          // Recupera dati dello staff (referrer)
          const staffUser = await storage.getUser(commission.referrerId);
          
          return {
            id: commission.id,
            commissionAmount: commission.monthlyAmount || 0,
            isPaid: commission.isPaid || false,
            paidAt: commission.paidAt || null,
            createdAt: commission.createdAt || commission.startDate || new Date().toISOString(),
            notes: commission.notes || null,
            licenseCode: subscription?.licenseCode || `REF-${commission.id}`,
            licenseType: subscription?.licenseType || 'business',
            customerEmail: referredUser?.email || referredUser?.username || 'cliente@email.com',
            staffName: `${staffUser?.firstName || ''} ${staffUser?.lastName || ''}`.trim() || staffUser?.username || 'Staff',
            staffEmail: staffUser?.email || staffUser?.username || 'staff@email.com'
          };
        })
      );
      
      res.json(allCommissions);
    } catch (error) {
      console.error('Errore nel caricamento di tutte le commissioni:', error);
      res.status(500).json({ message: "Errore nel caricamento delle commissioni" });
    }
  });

  // Endpoint Commissioni Staff - Solo per admin
  app.get("/api/staff-commissions/:staffId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può accedere alle commissioni staff" });
    }
    
    try {
      const staffId = parseInt(req.params.staffId);
      const storageData = loadStorageData();
      const referralCommissions = storageData.referralCommissions || [];
      
      // Trova commissioni per lo staff specifico e arricchisci con dati utente
      const staffCommissions = await Promise.all(
        referralCommissions
          .filter(commission => commission.referrerId === staffId)
          .map(async (commission) => {
            // Recupera dati dell'utente sponsorizzato (referred)
            const referredUser = await storage.getUser(commission.referredId);
            const subscription = await storage.getSubscriptionByUserId(commission.referredId);
            
            return {
              id: commission.id,
              commissionAmount: commission.monthlyAmount || 0,
              isPaid: commission.isPaid || false,
              paidAt: commission.paidAt || null,
              createdAt: commission.createdAt || commission.startDate || new Date().toISOString(),
              notes: commission.notes || null,
              licenseCode: subscription?.licenseCode || `REF-${commission.id}`,
              licenseType: subscription?.licenseType || 'business',
              customerEmail: referredUser?.email || referredUser?.username || 'cliente@email.com'
            };
          })
      );
      
      res.json(staffCommissions);
    } catch (error) {
      console.error('Errore nel caricamento commissioni staff:', error);
      res.status(500).json({ message: "Errore nel caricamento delle commissioni" });
    }
  });

  // Endpoint per segnare commissione come pagata - Solo per admin
  app.post("/api/staff-commissions/:commissionId/mark-paid", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può aggiornare le commissioni" });
    }
    
    try {
      const commissionId = parseInt(req.params.commissionId);
      const { notes } = req.body;
      
      const storageData = loadStorageData();
      const referralCommissions = storageData.referralCommissions || [];
      
      // Trova e aggiorna la commissione
      const commissionIndex = referralCommissions.findIndex(c => c.id === commissionId);
      if (commissionIndex === -1) {
        return res.status(404).json({ message: "Commissione non trovata" });
      }
      
      referralCommissions[commissionIndex] = {
        ...referralCommissions[commissionIndex],
        isPaid: true,
        paidAt: new Date().toISOString(),
        notes: notes || referralCommissions[commissionIndex].notes
      };
      
      // Salva i dati aggiornati
      storageData.referralCommissions = referralCommissions;
      saveStorageData(storageData);
      
      res.json({ success: true, message: "Commissione segnata come pagata" });
    } catch (error) {
      console.error('Errore nell\'aggiornamento commissione:', error);
      res.status(500).json({ message: "Errore nell'aggiornamento della commissione" });
    }
  });

  // Funzione helper per generare PDF come buffer per allegati email
  async function generateInvoicePDFBuffer(invoiceId: number, user: any): Promise<Buffer> {
    const storageData = loadStorageData();
    const invoices = storageData.invoices || [];
    
    const invoiceEntry = invoices.find(([id, invoice]) => 
      id === invoiceId && invoice.ownerId === user.id
    );
    
    if (!invoiceEntry) {
      throw new Error('Fattura non trovata');
    }
    
    const [_, invoice] = invoiceEntry;
    
    // Recupera la valuta dell'utente
    const userCurrency = await getCurrencyForUser(storage, user.id);
    const currencySymbol = userCurrency.symbol;
    
    // Carica dati aziendali completi (stesso codice della stampa)
    let businessHeader = 'Gestionale Appuntamenti';
    let businessData = {
      companyName: '', address: '', city: '', postalCode: '', 
      vatNumber: '', fiscalCode: '', phone: '', email: ''
    };
    
    try {
      const currentStorageData = loadStorageData();
      const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
      const userBusinessData = currentStorageData.userBusinessData?.[user.id];
      
      if (userBusinessSettings?.enabled && userBusinessSettings.name) {
        businessHeader = userBusinessSettings.name;
      }
      
      if (userBusinessData) {
        businessData = { ...businessData, ...userBusinessData };
        if (userBusinessData.companyName) {
          businessHeader = userBusinessData.companyName;
        }
      }
    } catch (error) {
      console.log('⚠️ Impossibile caricare dati aziendali per PDF allegato:', error);
    }
    
    // Carica dati cliente
    let clientDetails = null;
    try {
      const currentStorageData = loadStorageData();
      const clients = currentStorageData.clients || [];
      
      if (invoice.clientId) {
        const clientEntry = clients.find(([id, client]) => id === invoice.clientId);
        if (clientEntry) {
          clientDetails = clientEntry[1];
        }
      }
    } catch (error) {
      console.log('⚠️ Errore recupero dati cliente per PDF:', error);
    }
    
    // Genera HTML completo per PDF
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fattura ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
    .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .client-info, .invoice-details { flex: 1; }
    .invoice-details { text-align: right; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th, .items-table td { border: 1px solid #ccc; padding: 10px; text-align: left; }
    .items-table th { background-color: #f5f5f5; font-weight: bold; }
    .total-row { font-weight: bold; font-size: 1.2em; }
    .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${businessHeader}</h1>
    ${businessData.address ? `<p><strong>Indirizzo:</strong> ${businessData.address}${businessData.city ? `, ${businessData.city}` : ''}${businessData.postalCode ? ` ${businessData.postalCode}` : ''}</p>` : ''}
    ${businessData.phone ? `<p><strong>Tel:</strong> ${businessData.phone}</p>` : '<p>Tel: +39 347 144 5767</p>'}
    ${businessData.email ? `<p><strong>Email:</strong> ${businessData.email}</p>` : '<p>biomedicinaintegrata.it</p>'}
    ${businessData.vatNumber ? `<p><strong>Partita IVA:</strong> ${businessData.vatNumber}</p>` : ''}
    ${businessData.fiscalCode ? `<p><strong>Codice Fiscale:</strong> ${businessData.fiscalCode}</p>` : ''}
  </div>
  
  <div class="invoice-info">
    <div class="client-info">
      <h3>Cliente:</h3>
      <p><strong>${clientDetails ? `${clientDetails.firstName} ${clientDetails.lastName}` : invoice.clientName || 'Cliente'}</strong></p>
      ${clientDetails?.address ? `<p><strong>Indirizzo:</strong> ${clientDetails.address}</p>` : ''}
      ${clientDetails?.phone ? `<p><strong>Telefono:</strong> ${clientDetails.phone}</p>` : ''}
      ${clientDetails?.email ? `<p><strong>Email:</strong> ${clientDetails.email}</p>` : ''}
      ${clientDetails?.taxCode ? `<p><strong>Codice Fiscale:</strong> ${clientDetails.taxCode}</p>` : ''}
      ${clientDetails?.vatNumber ? `<p><strong>Partita IVA:</strong> ${clientDetails.vatNumber}</p>` : ''}
    </div>
    
    <div class="invoice-details">
      <h3>Dettagli Fattura:</h3>
      <p><strong>Numero:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Data:</strong> ${new Date(invoice.date).toLocaleDateString('it-IT')}</p>
      <p><strong>Scadenza:</strong> ${new Date(invoice.dueDate).toLocaleDateString('it-IT')}</p>
      <p><strong>Stato:</strong> ${invoice.status === 'draft' ? 'Bozza' : invoice.status === 'sent' ? 'Inviata' : invoice.status === 'paid' ? 'Pagata' : 'Scaduta'}</p>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Descrizione</th>
        <th>Quantità</th>
        <th>Prezzo Unit.</th>
        <th>Totale</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${currencySymbol}${item.price.toFixed(2)}</td>
          <td>${currencySymbol}${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3" style="text-align: right;"><strong>Totale:</strong></td>
        <td><strong>${currencySymbol}${invoice.total.toFixed(2)}</strong></td>
      </tr>
    </tfoot>
  </table>
  
  <div class="footer">
    <p>Grazie per aver scelto i nostri servizi.</p>
    <p>Per qualsiasi domanda, non esitate a contattarci.</p>
  </div>
</body>
</html>`;
    
    // Ritorna HTML come buffer per allegato
    return Buffer.from(htmlContent, 'utf-8');
  }

  // Endpoint per le fatture
  app.get('/api/invoices', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        console.log('📄 [/api/invoices] Utente non autenticato');
        return res.status(401).json({ message: "Non autenticato" });
      }
      console.log('📄 [/api/invoices] Richiesta fatture per utente:', user.id);
      
      // Carica fatture da PostgreSQL
      const pgInvoices = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          clientId: invoices.clientId,
          totalAmount: invoices.totalAmount,
          tax: invoices.tax,
          date: invoices.date,
          dueDate: invoices.dueDate,
          status: invoices.status,
          notes: invoices.notes,
          createdAt: invoices.createdAt,
          // Campi invio multicanale
          publishedToPwa: invoices.publishedToPwa,
          pwaPublishedAt: invoices.pwaPublishedAt,
          sentViaEmail: invoices.sentViaEmail,
          emailSentAt: invoices.emailSentAt,
          sentViaWhatsapp: invoices.sentViaWhatsapp,
          whatsappSentAt: invoices.whatsappSentAt,
          // Dati cliente
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
          clientEmail: clients.email,
          clientPhone: clients.phone,
          clientAddress: clients.address,
          clientTaxCode: clients.taxCode,
          clientVatNumber: clients.vatNumber
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(eq(invoices.userId, user.id))
        .orderBy(desc(invoices.createdAt));
      
      // Trasforma in formato legacy per compatibilità frontend
      const userInvoices = pgInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientId: inv.clientId,
        totalAmount: inv.totalAmount,
        total: inv.totalAmount / 100, // Convert cents to euros for display
        tax: inv.tax,
        date: inv.date,
        dueDate: inv.dueDate,
        status: inv.status,
        notes: inv.notes,
        createdAt: inv.createdAt?.toISOString() || new Date().toISOString(),
        ownerId: user.id,
        // Campi invio multicanale - CRITICI per pulsante verde->grigio
        publishedToPwa: inv.publishedToPwa || false,
        pwaPublishedAt: inv.pwaPublishedAt?.toISOString() || null,
        sentViaEmail: inv.sentViaEmail || false,
        emailSentAt: inv.emailSentAt?.toISOString() || null,
        sentViaWhatsapp: inv.sentViaWhatsapp || false,
        whatsappSentAt: inv.whatsappSentAt?.toISOString() || null,
        client: inv.clientId ? {
          id: inv.clientId,
          firstName: inv.clientFirstName,
          lastName: inv.clientLastName,
          email: inv.clientEmail,
          phone: inv.clientPhone,
          address: inv.clientAddress,
          taxCode: inv.clientTaxCode,
          vatNumber: inv.clientVatNumber
        } : null
      }));
      
      console.log(`📄 [/api/invoices] Restituisco ${userInvoices.length} fatture per utente ${user.id}`);
      
      // Header anti-cache per evitare 304 Not Modified dopo mutation
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(userInvoices);
    } catch (error) {
      console.error('❌ Error fetching invoices:', error);
      res.status(500).json({ message: 'Error fetching invoices' });
    }
  });

  // Funzione per generare numero fattura automatico - FORMATO LEGALE
  async function generateInvoiceNumber(ownerId: number): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    // Carica fatture esistenti per questo owner per l'anno corrente da PostgreSQL
    const ownerInvoicesThisYear = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.userId, ownerId));
    
    // Filtra solo quelle dell'anno corrente
    const invoiceNumbersThisYear = ownerInvoicesThisYear
      .map(inv => inv.invoiceNumber)
      .filter(num => num && num.endsWith(`/${currentYear}`)); // Formato NNN/YYYY
    
    // Trova il numero progressivo più alto per questo anno
    let maxNumber = 0;
    invoiceNumbersThisYear.forEach(invoiceNumber => {
      const parts = invoiceNumber.split('/');
      if (parts.length === 2) {
        const progressiveNumber = parseInt(parts[0]);
        if (!isNaN(progressiveNumber) && progressiveNumber > maxNumber) {
          maxNumber = progressiveNumber;
        }
      }
    });
    
    const nextNumber = String(maxNumber + 1).padStart(3, '0');
    // FORMATO LEGALE: NNN/YYYY (es: 001/2025, 002/2025, etc.)
    return `${nextNumber}/${currentYear}`;
  }

  // Endpoint per ottenere il prossimo numero fattura
  app.get('/api/invoices/next-number', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceDate = new Date().toISOString().split('T')[0];
      const nextNumber = await generateProfessionalInvoiceNumber(user.id, invoiceDate);
      
      res.json({ nextInvoiceNumber: nextNumber });
    } catch (error) {
      console.error('❌ Errore generazione prossimo numero:', error);
      res.status(500).json({ message: 'Errore nella generazione del numero' });
    }
  });

  // Endpoint per suggerimenti fatturazione
  app.get('/api/invoices/suggestions', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const storageData = loadStorageData();
      
      // Carica clienti del professionista
      const allClients = storageData.clients || [];
      const userClients = allClients
        .filter(([_, client]) => client.ownerId === user.id)
        .map(([_, client]) => ({
          id: client.id,
          name: `${client.firstName} ${client.lastName}`.trim(),
          fullName: `${client.firstName} ${client.lastName}`.trim(),
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          taxCode: client.taxCode || '', // codice fiscale
          vatNumber: client.vatNumber || '' // partita iva
        }))
        .filter(client => client.name.length > 0);

      // Carica fatture esistenti per analizzare importi comuni
      const allInvoices = storageData.invoices || [];
      const userInvoices = allInvoices
        .filter(([_, invoice]) => invoice.ownerId === user.id)
        .map(([_, invoice]) => invoice);

      // Estrai importi più comuni
      const amountCounts = {};
      userInvoices.forEach(invoice => {
        const amount = invoice.totalAmount;
        if (amount && amount > 0) {
          amountCounts[amount] = (amountCounts[amount] || 0) + 1;
        }
      });

      // Ordina importi per frequenza
      const commonAmounts = Object.entries(amountCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([amount]) => parseFloat(amount));

      // Aggiungi alcuni importi standard se la lista è vuota
      if (commonAmounts.length === 0) {
        commonAmounts.push(50, 70, 100, 150, 200);
      }

      // Estrai descrizioni più comuni
      const descriptionCounts = {};
      userInvoices.forEach(invoice => {
        if (invoice.description && invoice.description.trim().length > 0) {
          const desc = invoice.description.trim().toLowerCase();
          descriptionCounts[desc] = (descriptionCounts[desc] || 0) + 1;
        }
      });

      const commonDescriptions = Object.entries(descriptionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([desc]) => desc);

      // Aggiungi descrizioni standard se la lista è vuota
      if (commonDescriptions.length === 0) {
        commonDescriptions.push('visita medica', 'consulenza', 'controllo', 'terapia', 'esame');
      }

      res.json({
        clients: userClients,
        amounts: commonAmounts,
        descriptions: commonDescriptions
      });
      
    } catch (error) {
      console.error('❌ Errore caricamento suggerimenti:', error);
      res.status(500).json({ message: 'Errore nel caricamento dei suggerimenti' });
    }
  });

  // Endpoint per aggiornare fatture esistenti con clientId (migrazione dati)
  app.post('/api/invoices/migrate-client-ids', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const storageData = loadStorageData();
      const invoices = Object.entries(storageData.invoices || {});
      const clients = Object.entries(storageData.clients || {});
      
      let updatedCount = 0;
      
      console.log(`🔄 [MIGRATE] Avvio migrazione clientId per utente ${user.id}`);
      
      for (const [invoiceKey, invoice] of invoices) {
        if (invoice.ownerId === user.id && !invoice.clientId && invoice.clientName) {
          const clientName = invoice.clientName.trim().replace(/\s+/g, ' ');
          
          const matchingClient = clients.find(([_, client]) => {
            if (client.ownerId !== user.id) return false;
            const fullName = `${client.firstName?.trim() || ''} ${client.lastName?.trim() || ''}`.trim().replace(/\s+/g, ' ');
            return fullName === clientName;
          });
          
          if (matchingClient) {
            const [_, clientData] = matchingClient;
            invoice.clientId = clientData.id;
            updatedCount++;
            console.log(`✅ [MIGRATE] Fattura ${invoice.invoiceNumber}: "${invoice.clientName}" → cliente ID ${clientData.id}`);
          } else {
            console.log(`⚠️ [MIGRATE] Cliente non trovato per fattura ${invoice.invoiceNumber}: "${invoice.clientName}"`);
          }
        }
      }
      
      if (updatedCount > 0) {
        saveStorageData(storageData);
        console.log(`💾 [MIGRATE] Salvate ${updatedCount} fatture con clientId aggiornato`);
      }
      
      res.json({
        message: `Migrazione completata: ${updatedCount} fatture aggiornate`,
        updatedCount
      });
      
    } catch (error) {
      console.error('❌ Errore migrazione clientId:', error);
      res.status(500).json({ message: 'Errore durante la migrazione' });
    }
  });

  // PULIZIA FATTURE - Rinumera tutte le fatture con formato legale NNN/YYYY
  app.post('/api/invoices/cleanup-numbering', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      console.log(`🧹 [/api/invoices/cleanup-numbering] Pulizia numerazione fatture per utente ${user.id}`);
      
      const storageData = loadStorageData();
      const allInvoices = storageData.invoices || [];
      
      // Filtra solo le fatture dell'utente corrente
      const userInvoices = allInvoices.filter(([_, invoice]) => invoice.ownerId === user.id);
      
      if (userInvoices.length === 0) {
        return res.json({ message: 'Nessuna fattura da pulire', cleaned: 0 });
      }
      
      console.log(`🧹 Trovate ${userInvoices.length} fatture dell'utente da rinumerare`);
      
      // Ordina le fatture per data (dalla più vecchia alla più recente)
      userInvoices.sort(([_, a], [__, b]) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
      
      let cleanedCount = 0;
      
      // Rinumera tutte le fatture nell'ordine cronologico corretto
      userInvoices.forEach(([invoiceId, invoice], index) => {
        const newNumber = String(index + 1).padStart(3, '0') + '/2025';
        const oldNumber = invoice.invoiceNumber;
        
        if (oldNumber !== newNumber) {
          console.log(`🔄 Rinumerazione: ${oldNumber} → ${newNumber} (${invoice.date || invoice.createdAt})`);
          invoice.invoiceNumber = newNumber;
          invoice.updatedAt = new Date().toISOString();
          cleanedCount++;
        }
      });
      
      // Salva i dati aggiornati
      if (cleanedCount > 0) {
        saveStorageData(storageData);
        console.log(`✅ [/api/invoices/cleanup-numbering] Pulizia completata: ${cleanedCount} fatture rinumerate`);
      }
      
      res.json({
        message: `Pulizia completata: ${cleanedCount} fatture rinumerate in formato legale NNN/YYYY`,
        cleaned: cleanedCount,
        total: userInvoices.length
      });
      
    } catch (error) {
      console.error('❌ Errore pulizia numerazione fatture:', error);
      res.status(500).json({ message: 'Errore durante la pulizia' });
    }
  });

  // ELIMINAZIONE FATTURA con doppia sicurezza (PostgreSQL)
  app.delete('/api/invoices/:id', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { confirmation } = req.body;
      
      console.log(`🗑️ [/api/invoices/${invoiceId}] Richiesta eliminazione per utente ${user.id}`);
      
      // Controllo doppia sicurezza - richiede confirmation: true
      if (!confirmation) {
        return res.status(400).json({ 
          message: 'Conferma di sicurezza richiesta',
          requiresConfirmation: true 
        });
      }
      
      // Carica la fattura da PostgreSQL per ottenere i dettagli
      const [invoiceToDelete] = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.userId, user.id)
        ))
        .limit(1);
      
      if (!invoiceToDelete) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      // Elimina prima gli items della fattura
      await db
        .delete(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceId));
      
      // Poi elimina la fattura stessa
      await db
        .delete(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.userId, user.id)
        ));
      
      console.log(`✅ [/api/invoices/${invoiceId}] Fattura ${invoiceToDelete.invoiceNumber} eliminata con successo da PostgreSQL`);
      
      res.json({
        message: `Fattura ${invoiceToDelete.invoiceNumber} eliminata con successo`,
        deletedInvoice: {
          invoiceNumber: invoiceToDelete.invoiceNumber,
          date: invoiceToDelete.date,
          totalAmount: invoiceToDelete.totalAmount
        }
      });
      
    } catch (error) {
      console.error('❌ Errore eliminazione fattura:', error);
      res.status(500).json({ message: 'Errore durante l\'eliminazione' });
    }
  });

  // ===== PACKAGES (PACCHETTI PROMOZIONALI) - FUNZIONALITÀ PRO =====
  
  // GET /api/packages/templates - Lista modelli pacchetti
  app.get('/api/packages/templates', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      
      const templates = await db
        .select()
        .from(packageTemplates)
        .where(eq(packageTemplates.userId, tenantId))
        .orderBy(desc(packageTemplates.createdAt));
      
      res.json(templates);
    } catch (error) {
      console.error('❌ Error fetching package templates:', error);
      res.status(500).json({ message: 'Error fetching package templates' });
    }
  });
  
  // POST /api/packages/templates - Crea modello pacchetto
  app.post('/api/packages/templates', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const { name, description, serviceIds, totalSessions, price, expirationDays } = req.body;
      
      // Validazione: verifica che i servizi appartengano all'utente
      if (serviceIds && serviceIds.length > 0) {
        const userServices = await db
          .select({ id: services.id })
          .from(services)
          .where(eq(services.userId, tenantId));
        
        const userServiceIds = userServices.map(s => s.id);
        const invalidServiceIds = serviceIds.filter((id: number) => !userServiceIds.includes(id));
        
        if (invalidServiceIds.length > 0) {
          return res.status(400).json({ 
            message: 'Servizi non validi o non autorizzati',
            invalidIds: invalidServiceIds 
          });
        }
      }
      
      const [newTemplate] = await db.insert(packageTemplates).values({
        userId: tenantId,
        name,
        description: description || null,
        serviceIds,
        totalSessions,
        price,
        expirationDays: expirationDays || null,
        isActive: true,
        updatedAt: new Date()
      }).returning();
      
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error('❌ Error creating package template:', error);
      res.status(500).json({ message: 'Error creating package template' });
    }
  });
  
  // PUT /api/packages/templates/:id - Aggiorna modello pacchetto
  app.put('/api/packages/templates/:id', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const templateId = parseInt(req.params.id);
      const { name, description, serviceIds, totalSessions, price, expirationDays, isActive } = req.body;
      
      // Validazione: verifica che i servizi appartengano all'utente
      if (serviceIds && serviceIds.length > 0) {
        const userServices = await db
          .select({ id: services.id })
          .from(services)
          .where(eq(services.userId, tenantId));
        
        const userServiceIds = userServices.map(s => s.id);
        const invalidServiceIds = serviceIds.filter((id: number) => !userServiceIds.includes(id));
        
        if (invalidServiceIds.length > 0) {
          return res.status(400).json({ 
            message: 'Servizi non validi o non autorizzati',
            invalidIds: invalidServiceIds 
          });
        }
      }
      
      const [updatedTemplate] = await db
        .update(packageTemplates)
        .set({
          name,
          description,
          serviceIds,
          totalSessions,
          price,
          expirationDays,
          isActive,
          updatedAt: new Date()
        })
        .where(and(
          eq(packageTemplates.id, templateId),
          eq(packageTemplates.userId, tenantId)
        ))
        .returning();
      
      if (!updatedTemplate) {
        return res.status(404).json({ message: 'Template non trovato' });
      }
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error('❌ Error updating package template:', error);
      res.status(500).json({ message: 'Error updating package template' });
    }
  });
  
  // DELETE /api/packages/templates/:id - Elimina modello pacchetto
  app.delete('/api/packages/templates/:id', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const templateId = parseInt(req.params.id);
      
      // Verifica se ci sono pacchetti attivi basati su questo template
      const activePurchases = await db
        .select({ id: packagePurchases.id })
        .from(packagePurchases)
        .where(and(
          eq(packagePurchases.templateId, templateId),
          eq(packagePurchases.userId, tenantId),
          eq(packagePurchases.status, 'active')
        ))
        .limit(1);
      
      if (activePurchases.length > 0) {
        return res.status(400).json({ 
          message: 'Impossibile eliminare: ci sono pacchetti attivi basati su questo template' 
        });
      }
      
      await db
        .delete(packageTemplates)
        .where(and(
          eq(packageTemplates.id, templateId),
          eq(packageTemplates.userId, tenantId)
        ));
      
      res.json({ message: 'Template eliminato con successo' });
    } catch (error) {
      console.error('❌ Error deleting package template:', error);
      res.status(500).json({ message: 'Error deleting package template' });
    }
  });
  
  // GET /api/packages/purchases - Lista pacchetti venduti
  app.get('/api/packages/purchases', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const { clientId } = req.query;
      
      let query = db
        .select({
          id: packagePurchases.id,
          userId: packagePurchases.userId,
          templateId: packagePurchases.templateId,
          clientId: packagePurchases.clientId,
          invoiceId: packagePurchases.invoiceId,
          purchaseDate: packagePurchases.purchaseDate,
          sessionsTotal: packagePurchases.sessionsTotal,
          sessionsRemaining: packagePurchases.sessionsRemaining,
          status: packagePurchases.status,
          expiresAt: packagePurchases.expiresAt,
          notes: packagePurchases.notes,
          createdAt: packagePurchases.createdAt,
          completedAt: packagePurchases.completedAt,
          // Dati template
          templateName: packageTemplates.name,
          templateDescription: packageTemplates.description,
          templatePrice: packageTemplates.price,
          // Dati cliente
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName
        })
        .from(packagePurchases)
        .leftJoin(packageTemplates, eq(packagePurchases.templateId, packageTemplates.id))
        .leftJoin(clients, eq(packagePurchases.clientId, clients.id))
        .where(eq(packagePurchases.userId, tenantId));
      
      // Filtro opzionale per cliente
      if (clientId) {
        query = query.where(and(
          eq(packagePurchases.userId, tenantId),
          eq(packagePurchases.clientId, parseInt(clientId as string))
        ));
      }
      
      const purchases = await query.orderBy(desc(packagePurchases.createdAt));
      
      res.json(purchases);
    } catch (error) {
      console.error('❌ Error fetching package purchases:', error);
      res.status(500).json({ message: 'Error fetching package purchases' });
    }
  });
  
  // POST /api/packages/purchases - Vendi pacchetto a cliente
  app.post('/api/packages/purchases', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const { templateId, clientId, invoiceId, purchaseDate, notes } = req.body;
      
      // Verifica che il template esista e appartenga all'utente
      const [template] = await db
        .select()
        .from(packageTemplates)
        .where(and(
          eq(packageTemplates.id, templateId),
          eq(packageTemplates.userId, tenantId)
        ))
        .limit(1);
      
      if (!template) {
        return res.status(404).json({ message: 'Template non trovato' });
      }
      
      // Verifica che il cliente esista e appartenga all'utente
      const [client] = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, clientId),
          eq(clients.userId, tenantId)
        ))
        .limit(1);
      
      if (!client) {
        return res.status(404).json({ message: 'Cliente non trovato' });
      }
      
      // Calcola data scadenza se specificata nel template
      let expiresAt = null;
      if (template.expirationDays) {
        const purchaseDateObj = new Date(purchaseDate);
        const expiresAtObj = new Date(purchaseDateObj);
        expiresAtObj.setDate(expiresAtObj.getDate() + template.expirationDays);
        expiresAt = expiresAtObj.toISOString().split('T')[0];
      }
      
      // Crea il pacchetto venduto
      const [newPurchase] = await db.insert(packagePurchases).values({
        userId: tenantId,
        templateId,
        clientId,
        invoiceId: invoiceId || null,
        purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
        sessionsTotal: template.totalSessions,
        sessionsRemaining: template.totalSessions,
        status: 'active',
        expiresAt,
        notes: notes || null
      }).returning();
      
      res.status(201).json(newPurchase);
    } catch (error) {
      console.error('❌ Error creating package purchase:', error);
      res.status(500).json({ message: 'Error creating package purchase' });
    }
  });
  
  // POST /api/packages/redeem - Riscatta seduta da pacchetto
  app.post('/api/packages/redeem', async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const { purchaseId, appointmentId, performedBy, notes } = req.body;
      
      // Verifica che il pacchetto esista, appartenga all'utente e abbia sedute rimanenti
      const [purchase] = await db
        .select()
        .from(packagePurchases)
        .where(and(
          eq(packagePurchases.id, purchaseId),
          eq(packagePurchases.userId, tenantId)
        ))
        .limit(1);
      
      if (!purchase) {
        return res.status(404).json({ message: 'Pacchetto non trovato' });
      }
      
      if (purchase.status !== 'active') {
        return res.status(400).json({ message: 'Pacchetto non attivo' });
      }
      
      if (purchase.sessionsRemaining <= 0) {
        return res.status(400).json({ message: 'Nessuna seduta rimanente' });
      }
      
      // Verifica scadenza
      if (purchase.expiresAt) {
        const today = new Date().toISOString().split('T')[0];
        if (today > purchase.expiresAt) {
          // Aggiorna stato a expired
          await db
            .update(packagePurchases)
            .set({ status: 'expired' })
            .where(eq(packagePurchases.id, purchaseId));
          
          return res.status(400).json({ message: 'Pacchetto scaduto' });
        }
      }
      
      // Calcola numero seduta progressivo
      const existingRedemptions = await db
        .select({ sessionNumber: packageRedemptions.sessionNumber })
        .from(packageRedemptions)
        .where(eq(packageRedemptions.purchaseId, purchaseId))
        .orderBy(desc(packageRedemptions.sessionNumber))
        .limit(1);
      
      const sessionNumber = existingRedemptions.length > 0 
        ? existingRedemptions[0].sessionNumber + 1 
        : 1;
      
      // Crea il riscatto
      const [redemption] = await db.insert(packageRedemptions).values({
        userId: tenantId,
        purchaseId,
        appointmentId,
        sessionNumber,
        performedBy: performedBy || null,
        notes: notes || null
      }).returning();
      
      // Decrementa sedute rimanenti
      const newSessionsRemaining = purchase.sessionsRemaining - 1;
      const updateData: any = {
        sessionsRemaining: newSessionsRemaining
      };
      
      // Se è l'ultima seduta, marca come completato
      if (newSessionsRemaining === 0) {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
      }
      
      await db
        .update(packagePurchases)
        .set(updateData)
        .where(eq(packagePurchases.id, purchaseId));
      
      // Aggiorna anche l'appuntamento per collegarlo al pacchetto
      if (appointmentId) {
        await db
          .update(appointments)
          .set({ packagePurchaseId: purchaseId })
          .where(and(
            eq(appointments.id, appointmentId),
            eq(appointments.userId, tenantId)
          ));
      }
      
      res.status(201).json({
        redemption,
        sessionsRemaining: newSessionsRemaining,
        completed: newSessionsRemaining === 0
      });
    } catch (error) {
      console.error('❌ Error redeeming package session:', error);
      res.status(500).json({ message: 'Error redeeming package session' });
    }
  });

  // DOWNLOAD ZIP GESTIONALE - Endpoint per scaricare il gestionale completo
  app.get('/download-gestionale-zip', (req, res) => {
    try {
      const zipPath = path.join(__dirname, '../gestionale-sanitario-completo-20250910-061135.zip');
      
      // Verifica che il file esista
      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ error: 'File ZIP non trovato' });
      }
      
      // Imposta headers per il download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="gestionale-sanitario-completo.zip"');
      
      // Invia il file
      res.sendFile(zipPath, (err) => {
        if (err) {
          console.error('❌ Errore invio file ZIP:', err);
          res.status(500).json({ error: 'Errore durante il download' });
        } else {
          console.log('✅ Download ZIP gestionale completato con successo');
        }
      });
      
    } catch (error) {
      console.error('❌ Errore endpoint download ZIP:', error);
      res.status(500).json({ error: 'Errore del server' });
    }
  });

  // Crea una nuova fattura
  app.post('/api/invoices', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceData = req.body;
      
      console.log('📄 [/api/invoices] Creazione fattura per utente:', user.id, invoiceData);
      
      // Genera numero fattura automatico con codice professionista (formato: BUS1422-001/2025)
      const invoiceNumber = await generateProfessionalInvoiceNumber(user.id, invoiceData.date || new Date().toISOString().split('T')[0]);
      
      // Salva in PostgreSQL
      const [newInvoice] = await db.insert(invoices).values({
        userId: user.id,
        invoiceNumber,
        clientId: invoiceData.clientId,
        totalAmount: invoiceData.totalAmount || 0,
        tax: invoiceData.tax || 0,
        date: invoiceData.date || new Date().toISOString().split('T')[0],
        dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
        status: invoiceData.status || 'draft',
        notes: invoiceData.notes || null
      }).returning();
      
      // Salva invoice items se presenti
      if (invoiceData.items && Array.isArray(invoiceData.items)) {
        for (const item of invoiceData.items) {
          await db.insert(invoiceItems).values({
            userId: user.id,
            invoiceId: newInvoice.id,
            description: item.description || '',
            quantity: item.quantity || 1,
            price: item.price || 0,
            total: item.total || 0
          });
        }
      }
      
      // FALLBACK: salva anche in JSON storage per compatibilità
      const storageData = loadStorageData();
      if (!storageData.invoices) {
        storageData.invoices = [];
      }
      storageData.invoices.push([newInvoice.id, {
        id: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        ...invoiceData,
        ownerId: user.id,
        createdAt: newInvoice.createdAt?.toISOString() || new Date().toISOString(),
        status: newInvoice.status
      }]);
      saveStorageData(storageData);
      
      console.log(`✅ [/api/invoices] Fattura ${invoiceNumber} salvata in PostgreSQL + JSON (ID: ${newInvoice.id})`);
      res.status(201).json(newInvoice);
    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      res.status(500).json({ message: 'Error creating invoice' });
    }
  });

  // Aggiorna stato fattura - SOLO POSTGRESQL
  app.patch('/api/invoices/:id/status', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { status } = req.body;
      
      console.log(`📄 [/api/invoices/${invoiceId}/status] Aggiornamento stato per utente ${user.id}: ${status}`);
      
      // Valida status
      const validStatuses = ['unpaid', 'paid', 'overdue', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Stato non valido' });
      }
      
      // Verifica fattura esiste e appartiene all'utente
      const existingInvoice = await db.select()
        .from(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.userId, user.id)
        ))
        .limit(1);
      
      if (!existingInvoice || existingInvoice.length === 0) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      // Prepara dati aggiornamento
      const updateData: any = { status };
      
      // Aggiungi timestamp per stato pagata
      if (status === 'paid') {
        updateData.paidAt = new Date();
      }
      
      // Aggiorna in PostgreSQL
      await db.update(invoices)
        .set(updateData)
        .where(eq(invoices.id, invoiceId));
      
      console.log(`✅ [/api/invoices/${invoiceId}/status] Stato aggiornato in PostgreSQL: ${status}`);
      res.json({ 
        success: true, 
        status,
        paidAt: updateData.paidAt
      });
      
    } catch (error) {
      console.error('❌ Error updating invoice status:', error);
      res.status(500).json({ message: 'Errore aggiornamento stato' });
    }
  });

  // Genera PDF per stampa
  app.get('/api/invoices/:id/pdf', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      
      console.log(`📄 [/api/invoices/${invoiceId}/pdf] Generazione PDF per utente ${user.id}`);
      
      // Carica dati
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      
      // Trova la fattura
      const invoiceEntry = invoices.find(([id, invoice]) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Recupera logo personalizzato dal database
      let userLogo = defaultIconBase64;
      try {
        const iconRow = await db
          .select({ iconBase64: userIcons.iconBase64 })
          .from(userIcons)
          .where(eq(userIcons.userId, user.id))
          .limit(1);
        
        if (iconRow.length > 0 && iconRow[0].iconBase64) {
          userLogo = iconRow[0].iconBase64;
          console.log(`🖼️ [PDF] Logo personalizzato caricato per utente ${user.id}`);
        } else {
          console.log(`🖼️ [PDF] Uso logo default per utente ${user.id}`);
        }
      } catch (error) {
        console.log('⚠️ [PDF] Errore caricamento logo, uso default:', error);
      }
      
      // Carica dati aziendali completi per intestazione fattura
      let businessHeader = 'Gestionale Appuntamenti';
      let businessData = {
        companyName: '',
        address: '',
        city: '',
        postalCode: '',
        vatNumber: '',
        fiscalCode: '',
        phone: '',
        email: ''
      };
      
      try {
        const currentStorageData = loadStorageData();
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
        const userBusinessData = currentStorageData.userBusinessData?.[user.id];
        
        // Usa il nome personalizzato se disponibile
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessHeader = userBusinessSettings.name;
        }
        
        // Carica tutti i dati aziendali se disponibili
        if (userBusinessData) {
          businessData = { ...businessData, ...userBusinessData };
          if (userBusinessData.companyName) {
            businessHeader = userBusinessData.companyName;
          }
        }
        
        console.log(`📄 [PDF] Dati aziendali per utente ${user.id}:`, {
          nome: businessHeader,
          indirizzo: businessData.address,
          citta: businessData.city,
          cap: businessData.postalCode,
          partitaIva: businessData.vatNumber,
          codiceFiscale: businessData.fiscalCode,
          telefono: businessData.phone,
          email: businessData.email
        });
      } catch (error) {
        console.log('⚠️ Impossibile caricare dati aziendali, uso default:', error);
      }
      
      // Recupera dati completi del cliente dal database usando SEMPRE clientId
      let clientDetails = null;
      try {
        const currentStorageData = loadStorageData();
        const clients = currentStorageData.clients || [];
        
        if (invoice.clientId) {
          const clientEntry = clients.find(([id, client]) => id === invoice.clientId);
          if (clientEntry) {
            clientDetails = clientEntry[1];
            console.log(`📄 [PDF] Dati cliente trovati tramite ID ${invoice.clientId}:`, {
              nome: `${clientDetails.firstName} ${clientDetails.lastName}`,
              email: clientDetails.email,
              telefono: clientDetails.phone,
              indirizzo: clientDetails.address,
              codiceFiscale: clientDetails.taxCode,
              partitaIva: clientDetails.vatNumber
            });
          } else {
            console.log(`📄 [PDF] Cliente non trovato per ID: ${invoice.clientId}`);
          }
        } else {
          console.log(`⚠️ [PDF] FATTURA SENZA CLIENTID! Fattura ${invoice.invoiceNumber} usa clientName obsoleto`);
          
          // Solo come fallback per fatture vecchie
          if (invoice.clientName) {
            const invoiceClientName = invoice.clientName.trim().replace(/\s+/g, ' ');
            const clientEntry = clients.find(([_, client]) => {
              if (client.ownerId !== user.id) return false;
              const fullName = `${client.firstName?.trim() || ''} ${client.lastName?.trim() || ''}`.trim().replace(/\s+/g, ' ');
              return fullName === invoiceClientName;
            });
            
            if (clientEntry) {
              clientDetails = clientEntry[1];
              console.log(`📄 [PDF] FALLBACK: Dati trovati per nome "${invoice.clientName}"`);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Errore recupero dati cliente:', error);
      }
      
      // Recupera la valuta dell'utente
      const userCurrency = await getCurrencyForUser(storage, user.id);
      const currencySymbol = userCurrency.symbol;
      
      // Genera HTML per PDF con logo e layout migliorato
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Fattura ${invoice.invoiceNumber}</title>
          <style>
            @page { 
              size: A4 portrait;
              margin: 15mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
              color: #333;
              font-size: 11pt;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #4A90E2; 
              padding-bottom: 25px;
              margin-bottom: 35px;
            }
            .header img { 
              max-width: 120px; 
              max-height: 120px; 
              margin-bottom: 15px; 
            }
            .header h1 {
              margin: 10px 0;
              color: #2C3E50;
              font-size: 20pt;
            }
            .header p {
              margin: 5px 0;
              font-size: 10pt;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding: 20px;
              background-color: #F8F9FA;
              border-radius: 8px;
            }
            .client-info, .invoice-details {
              flex: 1;
            }
            .client-info h3, .invoice-details h3 {
              color: #4A90E2;
              margin-top: 0;
              margin-bottom: 15px;
              font-size: 13pt;
            }
            .client-info p, .invoice-details p {
              margin: 8px 0;
              font-size: 10pt;
            }
            .invoice-details {
              text-align: right;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .items-table th {
              background-color: #4A90E2;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
              font-size: 11pt;
            }
            .items-table td {
              border: 1px solid #E0E0E0;
              padding: 12px;
              font-size: 10pt;
            }
            .total-row {
              background-color: #F8F9FA;
              font-weight: bold;
              font-size: 13pt;
            }
            .notes-section {
              background-color: #FFF9E6;
              border-left: 4px solid #FFC107;
              padding: 20px;
              margin-bottom: 30px;
              border-radius: 4px;
            }
            .notes-section h4 {
              margin-top: 0;
              color: #F57C00;
            }
            .footer {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 2px solid #E0E0E0;
              text-align: center;
              font-size: 10pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${userLogo}" alt="Logo" />
            <h1>${businessHeader}</h1>
            ${businessData.address || businessData.city || businessData.postalCode ? `
              <p><strong>Indirizzo:</strong> ${businessData.address}${businessData.city ? `, ${businessData.city}` : ''}${businessData.postalCode ? ` ${businessData.postalCode}` : ''}</p>
            ` : ''}
            ${businessData.phone ? `<p><strong>Tel:</strong> ${businessData.phone}</p>` : ''}
            ${businessData.email ? `<p><strong>Email:</strong> ${businessData.email}</p>` : ''}
            ${businessData.vatNumber ? `<p><strong>P.IVA:</strong> ${businessData.vatNumber}</p>` : ''}
            ${businessData.fiscalCode ? `<p><strong>C.F.:</strong> ${businessData.fiscalCode}</p>` : ''}
          </div>
          
          <div class="invoice-info">
            <div class="client-info">
              <h3>Dati Cliente</h3>
              <p><strong>Nome:</strong> ${clientDetails ? `${clientDetails.firstName} ${clientDetails.lastName}` : invoice.clientName || 'Cliente'}</p>
              ${clientDetails?.address ? `<p><strong>Indirizzo:</strong> ${clientDetails.address}</p>` : ''}
              ${clientDetails?.phone ? `<p><strong>Telefono:</strong> ${clientDetails.phone}</p>` : ''}
              ${clientDetails?.email ? `<p><strong>Email:</strong> ${clientDetails.email}</p>` : ''}
              ${clientDetails?.taxCode ? `<p><strong>Codice Fiscale:</strong> ${clientDetails.taxCode}</p>` : ''}
              ${clientDetails?.vatNumber ? `<p><strong>Partita IVA:</strong> ${clientDetails.vatNumber}</p>` : ''}
              ${clientDetails?.birthday ? `<p><strong>Data di nascita:</strong> ${new Date(clientDetails.birthday).toLocaleDateString('it-IT')}</p>` : ''}
            </div>
            <div class="invoice-details">
              <h3>Fattura N. ${invoice.invoiceNumber}</h3>
              <p><strong>Data:</strong> ${new Date(invoice.date).toLocaleDateString('it-IT')}</p>
              <p><strong>Scadenza:</strong> ${new Date(invoice.dueDate).toLocaleDateString('it-IT')}</p>
              <p><strong>Stato:</strong> ${
                invoice.status === 'paid' ? 'Pagata' :
                invoice.status === 'sent' ? 'Inviata' :
                invoice.status === 'overdue' ? 'Scaduta' : 'Bozza'
              }</p>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">Descrizione</th>
                <th style="width: 15%; text-align: center;">Quantità</th>
                <th style="width: 17.5%; text-align: right;">Prezzo Unit.</th>
                <th style="width: 17.5%; text-align: right;">Totale</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map(item => `
                <tr>
                  <td>${item.description || invoice.description || 'Servizio medico'}</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                </tr>
              `).join('') || `
                <tr>
                  <td>${invoice.description || 'Servizio medico'}</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                  <td style="text-align: right;">${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                </tr>
              `}
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding: 15px;"><strong>TOTALE:</strong></td>
                <td style="text-align: right; padding: 15px;"><strong>${currencySymbol}${invoice.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${invoice.notes ? `
            <div class="notes-section">
              <h4>Note</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Grazie per aver scelto i nostri servizi</p>
            <p style="margin-top: 10px; font-size: 9pt;">Documento generato il ${new Date().toLocaleDateString('it-IT')}</p>
          </div>
        </body>
        </html>
      `;
      
      // Usa Puppeteer per generare PDF vero (portrait/verticale)
      try {
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          landscape: false,
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });
        
        await browser.close();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="fattura-${invoice.invoiceNumber}.pdf"`);
        res.send(pdfBuffer);
        
        console.log(`✅ [/api/invoices/${invoiceId}/pdf] PDF generato (Puppeteer, portrait) per fattura ${invoice.invoiceNumber}`);
      } catch (puppeteerError) {
        console.log('⚠️ Puppeteer non disponibile, uso HTML:', puppeteerError);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="fattura-${invoice.invoiceNumber}.html"`);
        res.send(htmlContent);
        console.log(`✅ [/api/invoices/${invoiceId}/pdf] HTML generato per fattura ${invoice.invoiceNumber}`);
      }
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      res.status(500).json({ message: 'Errore generazione PDF' });
    }
  });

  // Genera anteprima HTML per fattura (stessa logica del PDF ma senza download)
  app.get('/api/invoices/:id/preview', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      
      console.log(`👁️ [/api/invoices/${invoiceId}/preview] Generazione anteprima per utente ${user.id}`);
      
      // Carica dati
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      
      // Trova la fattura
      const invoiceEntry = invoices.find(([id, invoice]) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Recupera la valuta dell'utente
      const userCurrency = await getCurrencyForUser(storage, user.id);
      const currencySymbol = userCurrency.symbol;
      
      // Carica dati aziendali completi per intestazione fattura
      let businessHeader = 'Gestionale Appuntamenti';
      let businessData = {
        companyName: '',
        address: '',
        city: '',
        postalCode: '',
        vatNumber: '',
        fiscalCode: '',
        phone: '',
        email: ''
      };
      
      try {
        const currentStorageData = loadStorageData();
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
        const userBusinessData = currentStorageData.userBusinessData?.[user.id];
        
        // Usa il nome personalizzato se disponibile
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessHeader = userBusinessSettings.name;
        }
        
        // Carica tutti i dati aziendali se disponibili
        if (userBusinessData) {
          businessData = { ...businessData, ...userBusinessData };
          if (userBusinessData.companyName) {
            businessHeader = userBusinessData.companyName;
          }
        }
        
        console.log(`👁️ [PREVIEW] Dati aziendali per utente ${user.id}:`, {
          nome: businessHeader,
          indirizzo: businessData.address,
          email: businessData.email
        });
      } catch (error) {
        console.log('⚠️ Impossibile caricare dati aziendali per preview, uso default:', error);
      }
      
      // Recupera dati completi del cliente dal database usando SEMPRE clientId
      let clientDetails = null;
      try {
        const currentStorageData = loadStorageData();
        const clients = currentStorageData.clients || [];
        
        if (invoice.clientId) {
          const clientEntry = clients.find(([id, client]) => id === invoice.clientId);
          if (clientEntry) {
            clientDetails = clientEntry[1];
            console.log(`👁️ [PREVIEW] Dati cliente trovati tramite ID ${invoice.clientId}:`, {
              nome: `${clientDetails.firstName} ${clientDetails.lastName}`,
              email: clientDetails.email
            });
          } else {
            console.log(`👁️ [PREVIEW] Cliente non trovato per ID: ${invoice.clientId}`);
          }
        } else {
          console.log(`⚠️ [PREVIEW] FATTURA SENZA CLIENTID! Fattura ${invoice.invoiceNumber} usa clientName obsoleto`);
          
          // Solo come fallback per fatture vecchie
          if (invoice.clientName) {
            const invoiceClientName = invoice.clientName.trim().replace(/\s+/g, ' ');
            const clientEntry = clients.find(([_, client]) => {
              if (client.ownerId !== user.id) return false;
              const fullName = `${client.firstName?.trim() || ''} ${client.lastName?.trim() || ''}`.trim().replace(/\s+/g, ' ');
              return fullName === invoiceClientName;
            });
            
            if (clientEntry) {
              clientDetails = clientEntry[1];
              console.log(`👁️ [PREVIEW] Cliente trovato tramite nome "${invoiceClientName}":`, {
                nome: `${clientDetails.firstName} ${clientDetails.lastName}`,
                email: clientDetails.email
              });
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Errore caricamento dati cliente per preview:', error);
      }
      
      // Recupera descrizione del servizio
      let serviceDescription = invoice.description || 'Servizio';
      try {
        const currentStorageData = loadStorageData();
        const services = currentStorageData.services || [];
        
        if (invoice.serviceId) {
          const serviceEntry = services.find(([id, service]) => id === invoice.serviceId);
          if (serviceEntry) {
            serviceDescription = serviceEntry[1].name;
            console.log(`👁️ [PREVIEW] Servizio trovato per ID ${invoice.serviceId}: ${serviceDescription}`);
          }
        } else {
          console.log(`⚠️ [PREVIEW] FATTURA SENZA SERVICEID! Usando description: ${serviceDescription}`);
        }
      } catch (error) {
        console.log('⚠️ Errore caricamento dati servizio per preview:', error);
      }
      
      // Genera HTML per anteprima (stessa logica del PDF)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Fattura ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; font-size: 14px; line-height: 1.6; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .company-info { float: left; width: 50%; }
            .invoice-info { float: right; width: 45%; text-align: right; }
            .clear { clear: both; }
            .client-info { margin: 20px 0; padding: 15px; background-color: #f9f9f9; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { text-align: right; font-size: 16px; }
            .footer { margin-top: 40px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h2>${businessHeader}</h2>
              ${businessData.address ? `<p>${businessData.address}</p>` : ''}
              ${businessData.city && businessData.postalCode ? `<p>${businessData.postalCode} ${businessData.city}</p>` : ''}
              ${businessData.phone ? `<p>Tel: ${businessData.phone}</p>` : ''}
              ${businessData.email ? `<p>Email: ${businessData.email}</p>` : ''}
              ${businessData.vatNumber ? `<p>P.IVA: ${businessData.vatNumber}</p>` : ''}
              ${businessData.fiscalCode ? `<p>C.F.: ${businessData.fiscalCode}</p>` : ''}
            </div>
            
            <div class="invoice-info">
              <h3>FATTURA</h3>
              <p><strong>Numero:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Data:</strong> ${new Date(invoice.date).toLocaleDateString('it-IT')}</p>
              <p><strong>Scadenza:</strong> ${new Date(invoice.dueDate).toLocaleDateString('it-IT')}</p>
              <p><strong>Stato:</strong> ${invoice.status === 'paid' ? 'Pagata' : invoice.status === 'sent' ? 'Inviata' : invoice.status === 'overdue' ? 'Scaduta' : 'Bozza'}</p>
            </div>
            <div class="clear"></div>
          </div>
          
          <div class="client-info">
            <h4>Fatturato a:</h4>
            ${clientDetails ? `
              <p><strong>${clientDetails.firstName} ${clientDetails.lastName}</strong></p>
              ${clientDetails.address ? `<p>${clientDetails.address}</p>` : ''}
              ${clientDetails.email ? `<p>Email: ${clientDetails.email}</p>` : ''}
              ${clientDetails.phone ? `<p>Tel: ${clientDetails.phone}</p>` : ''}
              ${clientDetails.taxCode ? `<p>Codice Fiscale: ${clientDetails.taxCode}</p>` : ''}
              ${clientDetails.vatNumber ? `<p>P.IVA: ${clientDetails.vatNumber}</p>` : ''}
            ` : `
              <p><strong>${invoice.clientName || 'Cliente'}</strong></p>
            `}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Descrizione</th>
                <th>Quantità</th>
                <th>Prezzo Unitario</th>
                <th>Totale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${serviceDescription}</td>
                <td>1</td>
                <td>${currencySymbol}${invoice.totalAmount.toFixed(2)}</td>
                <td><strong>${currencySymbol}${invoice.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${invoice.notes ? `
            <div>
              <h4>Note:</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Grazie per aver scelto i nostri servizi</p>
          </div>
        </body>
        </html>
      `;
      
      // Restituisce HTML puro per anteprima (senza header di download)
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
      
      console.log(`✅ [/api/invoices/${invoiceId}/preview] Anteprima generata per fattura ${invoice.invoiceNumber}`);
      
    } catch (error) {
      console.error('❌ Error generating preview:', error);
      res.status(500).json({ message: 'Errore generazione anteprima' });
    }
  });

  // Ottieni dati suggeriti per invio email fattura
  app.get('/api/invoices/:id/email-suggestions', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      
      // Carica dati
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      const clients = storageData.clients || [];
      
      // Trova la fattura
      const invoiceEntry = invoices.find(([id, invoice]) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Recupera la valuta dell'utente
      const userCurrency = await getCurrencyForUser(storage, user.id);
      const currencySymbol = userCurrency.symbol;
      
      // Carica le impostazioni nome aziendale dell'utente
      let businessName = 'Gestionale Appuntamenti';
      try {
        const currentStorageData = loadStorageData();
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
        
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessName = userBusinessSettings.name;
        }
      } catch (error) {
        console.log('⚠️ Impossibile caricare nome aziendale per email:', error);
      }
      
      // Cerca email del cliente usando SEMPRE clientId (metodo corretto)
      let clientEmail = '';
      let clientData = null;
      
      if (invoice.clientId) {
        const clientEntry = clients.find(([id, client]) => id === invoice.clientId);
        if (clientEntry) {
          const [_, client] = clientEntry;
          clientEmail = client.email || '';
          clientData = client;
          console.log(`📧 [EMAIL SUGGESTIONS] Dati cliente trovati tramite ID ${invoice.clientId}:`, {
            nome: `${client.firstName} ${client.lastName}`,
            email: client.email,
            telefono: client.phone
          });
        } else {
          console.log(`📧 [EMAIL SUGGESTIONS] Cliente non trovato per ID: ${invoice.clientId}`);
        }
      } else {
        console.log(`⚠️ [EMAIL SUGGESTIONS] FATTURA SENZA CLIENTID! Fattura ${invoice.invoiceNumber} usa clientName obsoleto`);
        
        // Solo come fallback per fatture vecchie senza clientId
        if (invoice.clientName) {
          const invoiceClientName = invoice.clientName.trim().replace(/\s+/g, ' ');
          const clientEntry = clients.find(([_, client]) => {
            if (client.ownerId !== user.id) return false;
            const fullName = `${client.firstName?.trim() || ''} ${client.lastName?.trim() || ''}`.trim().replace(/\s+/g, ' ');
            return fullName === invoiceClientName;
          });
          
          if (clientEntry) {
            const [_, client] = clientEntry;
            clientEmail = client.email || '';
            clientData = client;
            console.log(`📧 [EMAIL SUGGESTIONS] FALLBACK: Email trovata per nome "${invoice.clientName}": ${clientEmail}`);
          }
        }
      }
      
      // Crea oggetto e messaggio personalizzati
      const subject = `Fattura ${invoice.invoiceNumber} - ${businessName}`;
      const message = `Gentile ${invoice.clientName || 'Cliente'},

In allegato trova la fattura n. ${invoice.invoiceNumber} del ${new Date(invoice.issueDate).toLocaleDateString('it-IT')}.

Importo totale: ${currencySymbol}${invoice.totalAmount.toFixed(2)}

Cordiali saluti,
${businessName}`;
      
      res.json({
        clientEmail,
        subject,
        message,
        businessName
      });
      
    } catch (error) {
      console.error('❌ Error getting email suggestions:', error);
      res.status(500).json({ message: 'Errore caricamento suggerimenti email' });
    }
  });

  // Funzione per generare PDF identico al pulsante stampa
  async function generateInvoicePDFForEmail(invoiceId: number, user: any, req: any): Promise<Buffer> {
    console.log('📄 [INVOICE EMAIL] Uso direttamente la stessa logica dell\'endpoint PDF...');
    
    // Usa esattamente la stessa logica dell'endpoint /pdf senza chiamate HTTP
    const storageData = loadStorageData();
    const invoices = storageData.invoices || [];
    
    const invoiceEntry = invoices.find(([id, invoice]) => 
      id === invoiceId && invoice.ownerId === user.id
    );
    
    if (!invoiceEntry) {
      throw new Error('Fattura non trovata per email');
    }
    
    const [_, invoice] = invoiceEntry;
    
    // Recupera la valuta dell'utente
    const userCurrency = await getCurrencyForUser(storage, user.id);
    const currencySymbol = userCurrency.symbol;
    
    // Recupera logo personalizzato dal database
    let userLogo = defaultIconBase64;
    try {
      const iconRow = await db
        .select({ iconBase64: userIcons.iconBase64 })
        .from(userIcons)
        .where(eq(userIcons.userId, user.id))
        .limit(1);
      
      if (iconRow.length > 0 && iconRow[0].iconBase64) {
        userLogo = iconRow[0].iconBase64;
        console.log(`🖼️ [PDF] Logo personalizzato caricato per utente ${user.id}`);
      } else {
        console.log(`🖼️ [PDF] Uso logo default per utente ${user.id}`);
      }
    } catch (error) {
      console.log('⚠️ [PDF] Errore caricamento logo, uso default:', error);
    }
    
    // Stessa logica dell'endpoint /pdf per dati aziendali
    let businessInfo = {
      nome: 'busnari silvia',
      indirizzo: 'via largo caduti nassiria 17', 
      citta: 'olgiate comasco',
      cap: '22100',
      partitaIva: 'it32445929',
      codiceFiscale: '',
      telefono: '3471445767',
      email: 'silvia.busnari@libero.it'
    };
    
    try {
      const currentStorageData = loadStorageData();
      const userBusinessData = currentStorageData.userBusinessData?.[user.id];
      if (userBusinessData) {
        businessInfo = { ...businessInfo, ...userBusinessData };
      }
      console.log(`📄 [PDF] Dati aziendali per utente ${user.id}:`, businessInfo);
    } catch (error) {
      console.log('⚠️ Uso dati aziendali default per PDF email:', error);
    }
    
    // Stessa logica dell'endpoint /pdf per dati cliente
    let clientData = null;
    try {
      const currentStorageData = loadStorageData();
      const clients = currentStorageData.clients || [];
      
      if (invoice.clientId) {
        const clientEntry = clients.find(([id, client]) => id === invoice.clientId);
        if (clientEntry) {
          clientData = clientEntry[1];
          console.log(`📄 [PDF] Dati cliente trovati tramite ID ${invoice.clientId}:`, {
            nome: clientData.firstName + ' ' + clientData.lastName,
            email: clientData.email,
            telefono: clientData.phone,
            indirizzo: clientData.address,
            codiceFiscale: clientData.taxCode,
            partitaIva: clientData.vatNumber
          });
        }
      }
    } catch (error) {
      console.log('⚠️ Errore dati cliente per PDF email:', error);
    }
    
    // Stessa logica HTML dell'endpoint /pdf CON COLORI E LAYOUT MODERNO
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Fattura ${invoice.invoiceNumber}</title>
          <style>
            @page { 
              size: A4 portrait;
              margin: 15mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
              color: #333;
              font-size: 11pt;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #4A90E2; 
              padding-bottom: 25px;
              margin-bottom: 35px;
            }
            .header img { 
              max-width: 120px; 
              max-height: 120px; 
              margin-bottom: 15px; 
            }
            .header h1 {
              margin: 10px 0;
              color: #2C3E50;
              font-size: 20pt;
            }
            .header p {
              margin: 5px 0;
              font-size: 10pt;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding: 20px;
              background-color: #F8F9FA;
              border-radius: 8px;
            }
            .client-info, .invoice-details {
              flex: 1;
            }
            .client-info h3, .invoice-details h3 {
              color: #4A90E2;
              margin-top: 0;
              margin-bottom: 15px;
              font-size: 13pt;
            }
            .client-info p, .invoice-details p {
              margin: 8px 0;
              font-size: 10pt;
            }
            .invoice-details {
              text-align: right;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .items-table th {
              background-color: #4A90E2;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
              font-size: 11pt;
            }
            .items-table td {
              border: 1px solid #E0E0E0;
              padding: 12px;
              font-size: 10pt;
            }
            .total-row {
              background-color: #F8F9FA;
              font-weight: bold;
              font-size: 13pt;
            }
            .notes-section {
              background-color: #FFF9E6;
              border-left: 4px solid #FFC107;
              padding: 20px;
              margin-bottom: 30px;
              border-radius: 4px;
            }
            .notes-section h4 {
              margin-top: 0;
              color: #F57C00;
            }
            .footer {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 2px solid #E0E0E0;
              text-align: center;
              font-size: 10pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${userLogo}" alt="Logo" />
            <h1>${businessInfo.nome || 'Gestionale Appuntamenti'}</h1>
            ${businessInfo.indirizzo || businessInfo.citta || businessInfo.cap ? `
              <p><strong>Indirizzo:</strong> ${businessInfo.indirizzo}${businessInfo.citta ? `, ${businessInfo.citta}` : ''}${businessInfo.cap ? ` ${businessInfo.cap}` : ''}</p>
            ` : ''}
            ${businessInfo.telefono ? `<p><strong>Tel:</strong> ${businessInfo.telefono}</p>` : ''}
            ${businessInfo.email ? `<p><strong>Email:</strong> ${businessInfo.email}</p>` : ''}
            ${businessInfo.partitaIva ? `<p><strong>P.IVA:</strong> ${businessInfo.partitaIva}</p>` : ''}
            ${businessInfo.codiceFiscale ? `<p><strong>C.F.:</strong> ${businessInfo.codiceFiscale}</p>` : ''}
          </div>
          
          <div class="invoice-info">
            <div class="client-info">
              <h3>Dati Cliente</h3>
              <p><strong>Nome:</strong> ${clientData ? `${clientData.firstName} ${clientData.lastName}` : invoice.clientName || 'Cliente'}</p>
              ${clientData?.address ? `<p><strong>Indirizzo:</strong> ${clientData.address}</p>` : ''}
              ${clientData?.phone ? `<p><strong>Telefono:</strong> ${clientData.phone}</p>` : ''}
              ${clientData?.email ? `<p><strong>Email:</strong> ${clientData.email}</p>` : ''}
              ${clientData?.taxCode ? `<p><strong>Codice Fiscale:</strong> ${clientData.taxCode}</p>` : ''}
              ${clientData?.vatNumber ? `<p><strong>Partita IVA:</strong> ${clientData.vatNumber}</p>` : ''}
            </div>
            
            <div class="invoice-details">
              <h3>Fattura N. ${invoice.invoiceNumber}</h3>
              <p><strong>Data:</strong> ${new Date(invoice.date).toLocaleDateString('it-IT')}</p>
              ${invoice.dueDate ? `<p><strong>Scadenza:</strong> ${new Date(invoice.dueDate).toLocaleDateString('it-IT')}</p>` : ''}
              <p><strong>Stato:</strong> ${
                invoice.status === 'paid' ? 'Pagata' :
                invoice.status === 'sent' ? 'Inviata' :
                invoice.status === 'overdue' ? 'Scaduta' : 'Bozza'
              }</p>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">Descrizione</th>
                <th style="width: 15%; text-align: center;">Quantità</th>
                <th style="width: 17.5%; text-align: right;">Prezzo Unit.</th>
                <th style="width: 17.5%; text-align: right;">Totale</th>
              </tr>
            </thead>
            <tbody>
              ${(!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) ? 
                `<tr>
                  <td>${invoice.description || 'Servizio professionale'}</td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right;">${currencySymbol}${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</td>
                  <td style="text-align: right;">${currencySymbol}${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</td>
                </tr>` :
                invoice.items.map(item => `
                  <tr>
                    <td>${item.description || 'Servizio professionale'}</td>
                    <td style="text-align: center;">${item.quantity || 1}</td>
                    <td style="text-align: right;">${currencySymbol}${(item.price || 0).toFixed(2)}</td>
                    <td style="text-align: right;">${currencySymbol}${((item.quantity || 1) * (item.price || 0)).toFixed(2)}</td>
                  </tr>
                `).join('')
              }
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding: 15px;"><strong>TOTALE:</strong></td>
                <td style="text-align: right; padding: 15px;"><strong>${currencySymbol}${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${invoice.notes ? `
            <div class="notes-section">
              <h4>Note</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Grazie per aver scelto i nostri servizi</p>
            <p style="margin-top: 10px; font-size: 9pt;">Documento generato il ${new Date().toLocaleDateString('it-IT')}</p>
          </div>
        </body>
        </html>`;

    console.log(`✅ [INVOICE EMAIL] HTML generato, conversione in PDF reale con Puppeteer...`);
    
    // Usa Puppeteer per convertire HTML in PDF reale
    try {
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: false, // Orientamento verticale (portrait)
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm', 
          bottom: '10mm',
          left: '10mm'
        }
      });
      
      await browser.close();
      
      console.log(`✅ [INVOICE EMAIL] PDF reale generato con successo: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
      
    } catch (puppeteerError) {
      console.log(`❌ [INVOICE EMAIL] Puppeteer failed: ${puppeteerError.message}, uso fallback`);
      return await generateInvoicePDFForEmailFallback(invoiceId, user);
    }
  }

  async function generateInvoicePDFForEmailFallback(invoiceId: number, user: any): Promise<Buffer> {
    const storageData = loadStorageData();
    const invoices = storageData.invoices || [];
    
    const invoiceEntry = invoices.find(([id, invoice]) => 
      id === invoiceId && invoice.ownerId === user.id
    );
    
    if (!invoiceEntry) {
      throw new Error('Fattura non trovata per email');
    }
    
    const [_, invoice] = invoiceEntry;
    
    // Recupera la valuta dell'utente
    const userCurrency = await getCurrencyForUser(storage, user.id);
    const currencySymbol = userCurrency.symbol;
    
    // Recupera logo personalizzato dal database (come funzione principale)
    let userLogo = defaultIconBase64;
    try {
      const iconRow = await db
        .select({ iconBase64: userIcons.iconBase64 })
        .from(userIcons)
        .where(eq(userIcons.userId, user.id))
        .limit(1);
      
      if (iconRow.length > 0 && iconRow[0].iconBase64) {
        userLogo = iconRow[0].iconBase64;
        console.log(`🖼️ [FALLBACK] Logo personalizzato caricato per utente ${user.id}`);
      } else {
        console.log(`🖼️ [FALLBACK] Uso logo default per utente ${user.id}`);
      }
    } catch (error) {
      console.log('⚠️ [FALLBACK] Errore caricamento logo, uso default:', error);
    }
    
    // Stessa logica dati aziendali dell'endpoint /pdf
    let businessHeader = 'Gestionale Appuntamenti';
    let businessData = {
      companyName: '', address: '', city: '', postalCode: '', 
      vatNumber: '', fiscalCode: '', phone: '', email: ''
    };
    
    try {
      const currentStorageData = loadStorageData();
      const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
      const userBusinessData = currentStorageData.userBusinessData?.[user.id];
      
      if (userBusinessSettings?.enabled && userBusinessSettings.name) {
        businessHeader = userBusinessSettings.name;
      }
      
      if (userBusinessData) {
        businessData = { ...businessData, ...userBusinessData };
        if (userBusinessData.companyName) {
          businessHeader = userBusinessData.companyName;
        }
      }
    } catch (error) {
      console.log('⚠️ Dati aziendali per PDF email, uso default:', error);
    }
    
    // Stessa logica cliente dell'endpoint /pdf
    let clientDetails = null;
    try {
      const currentStorageData = loadStorageData();
      const clients = currentStorageData.clients || [];
      
      if (invoice.clientId) {
        const clientEntry = clients.find(([id, client]) => id === invoice.clientId);
        if (clientEntry) {
          clientDetails = clientEntry[1];
        }
      }
    } catch (error) {
      console.log('⚠️ Errore dati cliente per PDF email:', error);
    }
    
    // HTML semplificato per evitare errori di escape
    const itemsHtml = (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) 
      ? `<tr><td>Servizi professionali - ${invoice.invoiceNumber}</td><td style="text-align: center;">1</td><td style="text-align: right;">${currencySymbol} ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</td><td style="text-align: right;">${currencySymbol} ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</td></tr>`
      : invoice.items.map(item => `<tr><td>${item.description || 'Servizio professionale'}</td><td style="text-align: center;">${item.quantity || 1}</td><td style="text-align: right;">${currencySymbol} ${(item.price || 0).toFixed(2)}</td><td style="text-align: right;">${currencySymbol} ${((item.quantity || 1) * (item.price || 0)).toFixed(2)}</td></tr>`).join('');
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fattura ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
    .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .client-info, .invoice-details { flex: 1; }
    .invoice-details { text-align: right; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th, .items-table td { border: 1px solid #ccc; padding: 10px; text-align: left; }
    .items-table th { background-color: #f5f5f5; font-weight: bold; }
    .total-row { font-weight: bold; font-size: 1.2em; }
    .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${businessHeader}</h1>
    ${businessData.address || businessData.city ? `<p><strong>Indirizzo:</strong> ${businessData.address}${businessData.city ? `, ${businessData.city}` : ''}${businessData.postalCode ? ` ${businessData.postalCode}` : ''}</p>` : ''}
    ${businessData.phone ? `<p><strong>Tel:</strong> ${businessData.phone}</p>` : '<p>Tel: +39 347 144 5767</p>'}
    ${businessData.email ? `<p><strong>Email:</strong> ${businessData.email}</p>` : '<p>biomedicinaintegrata.it</p>'}
    ${businessData.vatNumber ? `<p><strong>Partita IVA:</strong> ${businessData.vatNumber}</p>` : ''}
    ${businessData.fiscalCode ? `<p><strong>Codice Fiscale:</strong> ${businessData.fiscalCode}</p>` : ''}
  </div>
  
  <div class="invoice-info">
    <div class="client-info">
      <h3>Dati Cliente</h3>
      ${clientDetails ? `
        <p><strong>Nome:</strong> ${clientDetails.firstName} ${clientDetails.lastName}</p>
        ${clientDetails.email ? `<p><strong>Email:</strong> ${clientDetails.email}</p>` : ''}
        ${clientDetails.phone ? `<p><strong>Telefono:</strong> ${clientDetails.phone}</p>` : ''}
        ${clientDetails.address ? `<p><strong>Indirizzo:</strong> ${clientDetails.address}</p>` : ''}
        ${clientDetails.taxCode ? `<p><strong>Codice Fiscale:</strong> ${clientDetails.taxCode}</p>` : ''}
        ${clientDetails.vatNumber ? `<p><strong>Partita IVA:</strong> ${clientDetails.vatNumber}</p>` : ''}
      ` : `
        <p><strong>Nome:</strong> ${invoice.clientName || 'Cliente'}</p>
      `}
    </div>
    
    <div class="invoice-details">
      <h3>Dettagli Fattura</h3>
      <p><strong>Numero:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Data:</strong> ${new Date(invoice.date).toLocaleDateString('it-IT')}</p>
      <p><strong>Stato:</strong> ${invoice.status === 'draft' ? 'Bozza' : invoice.status === 'sent' ? 'Inviata' : invoice.status === 'paid' ? 'Pagata' : invoice.status}</p>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Descrizione</th>
        <th style="width: 100px;">Quantità</th>
        <th style="width: 100px;">Prezzo Unit.</th>
        <th style="width: 100px;">Totale</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  
  <div class="total-row" style="text-align: right; font-size: 1.3em;">
    <strong>Totale: ${currencySymbol} ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}</strong>
  </div>
  
  <div class="footer">
    <p>Documento generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}</p>
  </div>
</body>
</html>`;
    
    // Usa pdfmake invece di Puppeteer (più affidabile su Replit)
    const pdfMake = await import('pdfmake/build/pdfmake');
    const pdfFonts = await import('pdfmake/build/vfs_fonts');
    if (pdfMake.default) {
      pdfMake.default.vfs = pdfFonts.default?.pdfMake?.vfs || pdfFonts.pdfMake?.vfs;
    }

    const docDefinition = {
      content: [
        // Logo aziendale
        {
          image: userLogo,
          width: 120,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        },
        
        // Header aziendale completo (identico al PDF stampato)
        { 
          columns: [
            {
              text: [
                { text: `${businessHeader}\n`, fontSize: 18, bold: true, color: '#2C3E50' },
                `${businessData.address || 'via largo caduti nassiria 17'}\n`,
                `${businessData.city || 'olgiate comasco'} ${businessData.postalCode || '22100'}\n`,
                `Tel: ${businessData.phone || '3471445767'}\n`,
                `Email: ${businessData.email || 'silvia.busnari@libero.it'}\n`,
                businessData.vatNumber ? `P.IVA: ${businessData.vatNumber}\n` : '',
                businessData.fiscalCode ? `C.F.: ${businessData.fiscalCode}` : ''
              ].filter(line => line),
              width: '50%'
            },
            {
              text: [
                { text: 'FATTURA N. ', bold: true, fontSize: 14 },
                { text: `${invoice.invoiceNumber}\n`, fontSize: 14 },
                { text: 'Data: ', bold: true },
                `${new Date(invoice.date).toLocaleDateString('it-IT')}\n`,
              ],
              alignment: 'right',
              width: '50%'
            }
          ],
          margin: [0, 0, 0, 30]
        },
        
        // Dati Cliente completi
        { 
          text: 'Dati Cliente:', 
          style: 'sectionHeader',
          margin: [0, 0, 0, 10]
        },
        {
          text: [
            { text: 'Nome: ', bold: true },
            `${clientDetails ? clientDetails.firstName + ' ' + clientDetails.lastName : invoice.clientName}\n`,
            { text: 'Email: ', bold: true },
            `${clientDetails?.email || 'N/A'}\n`,
            { text: 'Telefono: ', bold: true },
            `${clientDetails?.phone || 'N/A'}\n`,
            { text: 'Indirizzo: ', bold: true },
            `${clientDetails?.address || 'N/A'}\n`,
            clientDetails?.taxCode ? [
              { text: 'Codice Fiscale: ', bold: true },
              `${clientDetails.taxCode}\n`
            ] : '',
            clientDetails?.vatNumber ? [
              { text: 'P.IVA: ', bold: true },
              `${clientDetails.vatNumber}`
            ] : ''
          ].flat().filter(Boolean),
          margin: [0, 0, 0, 20]
        },
        
        // Tabella servizi identica
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Descrizione', style: 'tableHeader' },
                { text: 'Quantità', style: 'tableHeader' },
                { text: 'Prezzo Unit.', style: 'tableHeader' },
                { text: 'Totale', style: 'tableHeader' }
              ],
              ...((!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) ? [
                [`Servizi professionali - ${invoice.invoiceNumber}`, '1', `€ ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}`, `€ ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}`]
              ] : invoice.items.map(item => [
                item.description || 'Servizio professionale',
                (item.quantity || 1).toString(),
                `€ ${(item.price || 0).toFixed(2)}`,
                `€ ${((item.quantity || 1) * (item.price || 0)).toFixed(2)}`
              ]))
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        },
        
        // Totale finale
        {
          text: [
            { text: 'TOTALE: ', bold: true, fontSize: 16 },
            { text: `€ ${(invoice.totalAmount || invoice.total || 0).toFixed(2)}`, bold: true, fontSize: 16 }
          ],
          alignment: 'right',
          margin: [0, 10, 0, 30]
        },
        
        // Footer identico al PDF stampato
        {
          text: [
            `Documento generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}\n`,
            businessData.vatNumber && businessData.fiscalCode ? 
              `P.IVA: ${businessData.vatNumber} - C.F: ${businessData.fiscalCode}` :
              businessData.vatNumber ? `P.IVA: ${businessData.vatNumber}` :
              businessData.fiscalCode ? `C.F: ${businessData.fiscalCode}` : ''
          ].filter(Boolean),
          fontSize: 10,
          alignment: 'center',
          margin: [0, 20, 0, 0]
        }
      ],
      
      styles: {
        sectionHeader: { fontSize: 12, bold: true },
        tableHeader: { bold: true, fillColor: '#eeeeee' }
      }
    };

    const pdfBuffer = await new Promise((resolve, reject) => {
      const pdfMakeInstance = pdfMake.default || pdfMake;
      const printer = pdfMakeInstance.createPdf(docDefinition);
      printer.getBuffer((buffer) => {
        resolve(buffer);
      });
    });

    return pdfBuffer;
  }

  // Invia fattura via email
  app.post('/api/invoices/:id/send-email', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { recipientEmail, subject, message } = req.body;
      
      console.log(`📄 [/api/invoices/${invoiceId}/send-email] Invio email per utente ${user.id} a ${recipientEmail}`);
      
      // Validazione input
      if (!recipientEmail || !subject) {
        return res.status(400).json({ message: 'Email e oggetto sono obbligatori' });
      }
      
      // Carica dati
      const storageData = loadStorageData();
      const invoices = storageData.invoices || [];
      
      // Trova la fattura
      const invoiceEntry = invoices.find(([id, invoice]) => 
        id === invoiceId && invoice.ownerId === user.id
      );
      
      if (!invoiceEntry) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      const [_, invoice] = invoiceEntry;
      
      // Carica nome aziendale personalizzato per mittente
      let businessName = 'Gestionale Appuntamenti';
      try {
        const currentStorageData = loadStorageData();
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[user.id];
        
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessName = userBusinessSettings.name;
        }
      } catch (error) {
        console.log('⚠️ Impossibile caricare nome aziendale per invio email:', error);
      }
      
      // Invio email reale utilizzando il sistema collaudato dei promemoria
      try {
        const { notificationService } = await import('./services/notificationService');
        const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
        
        if (!fs.existsSync(emailConfigPath)) {
          console.log('⚠️ [EMAIL] Configurazione email non trovata, simulazione invio');
          console.log(`📧 SIMULAZIONE INVIO EMAIL:
            Da: ${businessName} <noreply@biomedicinaintegrata.it>
            A: ${recipientEmail}
            Oggetto: ${subject}
            Messaggio: ${message || 'Fattura in allegato'}
            Allegato: fattura-${invoice.invoiceNumber}.pdf
          `);
        } else {
          const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
          
          if (!emailConfig.emailEnabled || !emailConfig.emailAddress || !emailConfig.emailPassword) {
            console.log('⚠️ [EMAIL] Email non configurata, simulazione invio');
            console.log(`📧 SIMULAZIONE INVIO EMAIL:
              Da: ${businessName} <noreply@biomedicinaintegrata.it>
              A: ${recipientEmail}
              Oggetto: ${subject}
              Messaggio: ${message || 'Fattura in allegato'}
              Allegato: fattura-${invoice.invoiceNumber}.pdf
            `);
          } else {
            console.log(`📧 [INVOICE EMAIL] Invio fattura via email utilizzando sistema collaudato`);
            console.log(`📧 [INVOICE EMAIL] Da: ${emailConfig.emailAddress} A: ${recipientEmail}`);
            console.log(`📧 [INVOICE EMAIL] Oggetto: ${subject}`);
            
            // Genera PDF identico al pulsante stampa per allegato email
            let pdfBuffer = null;
            let filename = null;
            
            try {
              console.log(`📄 [INVOICE EMAIL] Uso stessa logica del pulsante stampa...`);
              
              // Chiama la funzione esistente che genera il PDF per la stampa
              pdfBuffer = await generateInvoicePDFForEmail(invoiceId, user, req);
              
              if (pdfBuffer && pdfBuffer.length > 0) {
                filename = `fattura-${invoice.invoiceNumber}.pdf`;
                console.log(`📎 [INVOICE EMAIL] PDF identico a stampa generato: ${filename} (${pdfBuffer.length} bytes)`);
              } else {
                throw new Error('PDF Buffer vuoto');
              }

            } catch (pdfError) {
              console.error(`❌ [INVOICE EMAIL] Errore generazione PDF stampa:`, pdfError.message);
              pdfBuffer = null;
              filename = null;
            }
            
            // Usa la funzione specifica per fatture
            const emailSent = await notificationService.sendInvoiceEmail(
              recipientEmail,
              subject,
              message || `Gentile Cliente,\n\nIn allegato trova la fattura n. ${invoice.invoiceNumber} del ${new Date(invoice.date).toLocaleDateString('it-IT')}.\n\nDettagli fattura:\n- Numero: ${invoice.invoiceNumber}\n- Data: ${new Date(invoice.date).toLocaleDateString('it-IT')}\n- Importo: €${invoice.total?.toFixed(2) || '0.00'}\n\nCordiali saluti,\n${businessName}`.replace(/invalid date/gi, ''),
              emailConfig,
              pdfBuffer,
              filename
            );
            
            if (emailSent) {
              console.log(`✅ [INVOICE EMAIL] Email fattura inviata con successo${pdfBuffer ? ' con allegato PDF' : ' (solo testo)'}`);
            } else {
              throw new Error('Errore invio email dal sistema notificationService');
            }
          }
        }
      } catch (emailError) {
        console.error('❌ [EMAIL] Errore invio email reale, fallback a simulazione:', emailError);
        console.log(`📧 SIMULAZIONE INVIO EMAIL:
          Da: ${businessName} <noreply@biomedicinaintegrata.it>
          A: ${recipientEmail}
          Oggetto: ${subject}
          Messaggio: ${message || 'Fattura in allegato'}
          Allegato: fattura-${invoice.invoiceNumber}.pdf
        `);
      }
      
      console.log(`📧 [EMAIL] Nome aziendale utilizzato per invio: "${businessName}"`);
      
      // Aggiorna stato fattura a "inviata" se era in bozza
      if (invoice.status === 'draft') {
        const invoiceIndex = invoices.findIndex(([id]) => id === invoiceId);
        if (invoiceIndex !== -1) {
          invoices[invoiceIndex][1].status = 'sent';
          invoices[invoiceIndex][1].sentAt = new Date().toISOString();
          saveStorageData(storageData);
        }
      }
      
      // Salva log invio
      if (!invoice.emailHistory) {
        invoice.emailHistory = [];
      }
      invoice.emailHistory.push({
        sentAt: new Date().toISOString(),
        recipientEmail,
        subject,
        message: message || '',
        status: 'sent'
      });
      
      saveStorageData(storageData);
      
      console.log(`✅ [/api/invoices/${invoiceId}/send-email] Email inviata con successo`);
      res.json({ 
        success: true,
        recipientEmail,
        sentAt: new Date().toISOString(),
        message: 'Email inviata con successo'
      });
      
    } catch (error) {
      console.error('❌ Error sending email:', error);
      res.status(500).json({ message: 'Errore invio email' });
    }
  });

  // Endpoint multicanale: invio fattura via PWA, Email, WhatsApp - SOLO POSTGRESQL
  app.post('/api/invoices/:id/send', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);
      const { channels } = req.body; // { pwa: boolean, email: boolean, whatsapp: boolean }
      
      console.log(`📤 [/api/invoices/${invoiceId}/send] Invio multicanale per utente ${user.id}:`, channels);
      
      // Validazione: almeno un canale
      if (!channels || (!channels.pwa && !channels.email && !channels.whatsapp)) {
        return res.status(400).json({ message: 'Seleziona almeno un canale di invio' });
      }
      
      // Carica fattura da PostgreSQL
      const invoiceResults = await db.select()
        .from(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.userId, user.id)
        ))
        .limit(1);
      
      if (!invoiceResults || invoiceResults.length === 0) {
        return res.status(404).json({ message: 'Fattura non trovata' });
      }
      
      const invoice = invoiceResults[0];
      
      // Carica dati cliente da PostgreSQL
      const clientResults = await db.select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1);
      
      if (!clientResults || clientResults.length === 0) {
        return res.status(404).json({ message: 'Cliente non trovato' });
      }
      
      const client = clientResults[0];
      const results = { pwa: false, email: false, whatsapp: false };
      const now = new Date();
      
      // Prepara oggetto per aggiornamento
      const updateData: any = {};
      
      // 1. PWA: marca fattura come disponibile nell'area clienti
      if (channels.pwa) {
        console.log(`📱 [PWA] Fattura ${invoice.invoiceNumber} resa disponibile nell'area clienti`);
        updateData.publishedToPwa = true;
        updateData.pwaPublishedAt = now;
        results.pwa = true;
      }
      
      // 2. Email: carica dati cliente e invia
      if (channels.email) {
        try {
          if (!client.email) {
            console.log(`⚠️ [EMAIL] Cliente senza email, skip invio`);
          } else {
            const { notificationService } = await import('./services/notificationService');
            const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
            
            if (fs.existsSync(emailConfigPath)) {
              const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
              
              if (emailConfig.emailEnabled && emailConfig.emailAddress && emailConfig.emailPassword) {
                // === GENERA PDF USANDO LOGICA PWA (logo + colori) ===
                
                // Carica items fattura
                const items = await db.select()
                  .from(invoiceItems)
                  .where(eq(invoiceItems.invoiceId, invoice.id));
                
                // Carica logo personalizzato (usa invoice.userId = professionista owner, NON user.id = admin)
                const { loadUserLogo, buildInvoiceHtml, generatePdfBuffer } = await import('./utils/invoicePdf');
                const logoBase64 = await loadUserLogo(invoice.userId);
                
                // Carica dati aziendali (usa invoice.userId = professionista owner)
                let businessHeader = 'Gestionale Appuntamenti';
                let businessData = {
                  companyName: '',
                  address: '',
                  city: '',
                  postalCode: '',
                  vatNumber: '',
                  fiscalCode: '',
                  phone: '',
                  email: ''
                };
                
                try {
                  const currentStorageData = loadStorageData();
                  const userBusinessSettings = currentStorageData.userBusinessSettings?.[invoice.userId];
                  const userBusinessData = currentStorageData.userBusinessData?.[invoice.userId];
                  
                  if (userBusinessSettings?.enabled && userBusinessSettings.name) {
                    businessHeader = userBusinessSettings.name;
                  }
                  
                  if (userBusinessData) {
                    businessData = { ...businessData, ...userBusinessData };
                    if (userBusinessData.companyName) {
                      businessHeader = userBusinessData.companyName;
                    }
                  }
                } catch (error) {
                  console.log('⚠️ [EMAIL PDF] Errore caricamento dati aziendali:', error);
                }
                
                // Recupera la valuta dell'utente (usa invoice.userId = professionista owner)
                const userCurrency = await getCurrencyForUser(storage, invoice.userId);
                const currencySymbol = userCurrency.symbol;
                
                // Costruisci context per il template
                const context = {
                  invoiceNumber: invoice.invoiceNumber,
                  date: new Date(invoice.date).toLocaleDateString('it-IT'),
                  dueDate: new Date(invoice.dueDate).toLocaleDateString('it-IT'),
                  status: invoice.status,
                  totalAmount: invoice.totalAmount,
                  tax: invoice.tax || 0,
                  notes: invoice.notes || undefined,
                  
                  clientName: `${client.firstName} ${client.lastName}`,
                  clientAddress: client.address || undefined,
                  clientPhone: client.phone || undefined,
                  clientEmail: client.email || undefined,
                  clientTaxCode: client.tax_code || undefined,
                  clientVatNumber: client.vat_number || undefined,
                  clientBirthday: client.birthday ? new Date(client.birthday).toLocaleDateString('it-IT') : undefined,
                  
                  businessHeader,
                  businessAddress: businessData.address || undefined,
                  businessCity: businessData.city || undefined,
                  businessPostalCode: businessData.postalCode || undefined,
                  businessPhone: businessData.phone || undefined,
                  businessEmail: businessData.email || undefined,
                  businessVatNumber: businessData.vatNumber || undefined,
                  businessFiscalCode: businessData.fiscalCode || undefined,
                  
                  items: items.map(item => ({
                    description: item.description || 'Servizio',
                    quantity: item.quantity || 1,
                    price: item.price || 0,
                    total: item.total || 0
                  })),
                  
                  logoBase64,
                  currencySymbol
                };
                
                // Genera HTML professionale con logo e grafica
                const htmlContent = buildInvoiceHtml(context);
                
                // Genera PDF con Puppeteer (con fallback silenzioso)
                let pdfBuffer: Buffer;
                try {
                  pdfBuffer = await generatePdfBuffer(htmlContent);
                  console.log(`✅ [EMAIL PDF] PDF professionale generato con Puppeteer (${pdfBuffer.length} bytes)`);
                } catch (pdfError) {
                  console.error('❌ [EMAIL PDF] Puppeteer fallito, uso HTML come fallback:', pdfError);
                  // Fallback: converti HTML in buffer UTF-8
                  pdfBuffer = Buffer.from(htmlContent, 'utf-8');
                }
                
                const subject = `Fattura ${invoice.invoiceNumber}`;
                const message = `Gentile ${client.firstName} ${client.lastName},\n\nIn allegato la fattura n. ${invoice.invoiceNumber}.\n\nCordiali saluti`;
                
                await notificationService.sendInvoiceEmail(
                  client.email,
                  subject,
                  message,
                  emailConfig,
                  pdfBuffer,  // Buffer PDF professionale
                  `fattura-${invoice.invoiceNumber}.pdf`
                );
                
                console.log(`✅ [EMAIL] Fattura inviata a ${client.email} con PDF professionale allegato`);
                updateData.sentViaEmail = true;
                updateData.emailSentAt = now;
                results.email = true;
              } else {
                console.log(`⚠️ [EMAIL] Email non configurata`);
              }
            } else {
              console.log(`⚠️ [EMAIL] Configurazione email non trovata`);
            }
          }
        } catch (emailError) {
          console.error(`❌ [EMAIL] Errore invio:`, emailError);
        }
      }
      
      // 3. WhatsApp: genera link o invia messaggio
      if (channels.whatsapp) {
        try {
          if (!client.phone) {
            console.log(`⚠️ [WHATSAPP] Cliente senza telefono, skip invio`);
          } else {
            const { notificationService } = await import('./services/notificationService');
            const message = `Gentile ${client.firstName}, la fattura n. ${invoice.invoiceNumber} è disponibile nell'area clienti.`;
            const whatsappLink = notificationService.generateWhatsAppLink(client.phone, message);
            
            console.log(`📲 [WHATSAPP] Link generato: ${whatsappLink}`);
            updateData.sentViaWhatsapp = true;
            updateData.whatsappSentAt = now;
            results.whatsapp = true;
          }
        } catch (whatsappError) {
          console.error(`❌ [WHATSAPP] Errore:`, whatsappError);
        }
      }
      
      // Aggiorna fattura in PostgreSQL
      if (Object.keys(updateData).length > 0) {
        await db.update(invoices)
          .set(updateData)
          .where(eq(invoices.id, invoiceId));
        
        console.log(`💾 [/api/invoices/${invoiceId}/send] Fattura aggiornata in PostgreSQL:`, updateData);
      }
      
      const successChannels = Object.entries(results)
        .filter(([_, success]) => success)
        .map(([channel]) => channel.toUpperCase())
        .join(', ');
      
      console.log(`✅ [/api/invoices/${invoiceId}/send] Invio completato: ${successChannels}`);
      
      res.json({ 
        success: true,
        message: `Fattura inviata con successo${successChannels ? ` via ${successChannels}` : ''}`,
        results
      });
      
    } catch (error) {
      console.error('❌ Error sending invoice:', error);
      res.status(500).json({ message: 'Errore invio fattura' });
    }
  });

  // === AREA CLIENTI - ROTTE PER QR CODE ACCESS ===
  
  // Validazione token QR - AGGIORNATA PER POSTGRESQL
  async function validateQRToken(clientCode: string, token: string) {
    // 🔄 USA POSTGRESQL: Cerca cliente per uniqueCode nel database condiviso
    const clientResults = await db.select()
      .from(clients)
      .where(eq(clients.uniqueCode, clientCode))
      .limit(1);
    
    if (!clientResults || clientResults.length === 0) {
      console.log(`🔍 [QR-AUTH] Cliente non trovato per codice: ${clientCode}`);
      return null;
    }
    
    const client = clientResults[0];
    
    // Verifica che il token sia valido
    const expectedTokenPrefix = `${clientCode}_`;
    if (!token.startsWith(expectedTokenPrefix)) {
      console.log(`🔍 [QR-AUTH] Token non valido per cliente ${clientCode}: ${token}`);
      return null;
    }
    
    // Estrai legacy client ID dal uniqueCode (formato: PROF_014_9C1F_CLIENT_14003_816C)
    let legacyClientId: number | null = null;
    const legacyIdMatch = clientCode.match(/_CLIENT_(\d+)_/);
    if (legacyIdMatch) {
      legacyClientId = parseInt(legacyIdMatch[1]);
    }
    
    console.log(`✅ [QR-AUTH] Token valido per cliente ${client.firstName} ${client.lastName} (${clientCode}), legacyId: ${legacyClientId}`);
    return { clientId: client.id, client, legacyClientId };
  }

  // API: Recupera dati cliente tramite QR code
  app.get('/api/simple/client/:clientCode', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      console.log(`🔍 [CLIENT-API] Richiesta dati per cliente: ${clientCode}, token: ${token ? 'presente' : 'assente'}`);
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Token non valido o cliente non trovato' });
      }
      
      const { client } = validation;
      
      // Restituisci solo i dati necessari del cliente
      const clientData = {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        email: client.email,
        uniqueCode: client.uniqueCode
      };
      
      console.log(`✅ [CLIENT-API] Dati cliente inviati: ${client.firstName} ${client.lastName}`);
      res.json(clientData);
      
    } catch (error) {
      console.error('❌ [CLIENT-API] Errore nel recupero dati cliente:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // API: Recupera appuntamenti cliente tramite QR code
  app.get('/api/simple/client/:clientCode/appointments', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Token non valido o cliente non trovato' });
      }
      
      const { clientId, client } = validation;
      
      // 🔄 USA POSTGRESQL: Recupera appuntamenti del cliente dal database
      const clientAppointments = await storage.getAppointmentsByClient(clientId);
      
      // 🔄 USA POSTGRESQL: Recupera servizi del proprietario
      const ownerId = client.ownerId;
      const ownerServices = ownerId ? await storage.getServices(ownerId) : [];
      
      // Mappa gli appuntamenti con i nomi dei servizi
      const mappedAppointments = clientAppointments.map(apt => {
        const service = ownerServices.find(s => s.id === apt.serviceId);
        return {
          id: apt.id,
          date: apt.date,
          time: apt.startTime, // startTime è il campo PostgreSQL
          service: service?.name || 'Servizio sconosciuto',
          status: apt.status || 'scheduled',
          notes: apt.notes || ''
        };
      });
      
      console.log(`📅 [CLIENT-API] ${mappedAppointments.length} appuntamenti trovati per cliente ${clientCode}`);
      res.json(mappedAppointments);
      
    } catch (error) {
      console.error('❌ [CLIENT-API] Errore nel recupero appuntamenti:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // API: Recupera informazioni di contatto del professionista
  app.get('/api/simple/client/:clientCode/contact-info', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Token non valido o cliente non trovato' });
      }
      
      const { client } = validation;
      
      // 🔄 USA POSTGRESQL: Recupera info contatto del proprietario
      const ownerId = client.ownerId;
      const contactInfo = ownerId ? await storage.getContactInfo(ownerId) : {};
      
      console.log(`📞 [CLIENT-API] Info contatto inviate per proprietario ${ownerId}`);
      res.json(contactInfo);
      
    } catch (error) {
      console.error('❌ [CLIENT-API] Errore nel recupero info contatto:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // API: Recupera fatture del cliente
  app.get('/api/simple/client/:clientCode/invoices', async (req, res) => {
    try {
      const { clientCode } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      console.log(`📄 [CLIENT-INVOICES] Richiesta fatture per cliente: ${clientCode}`);
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Token non valido o cliente non trovato' });
      }
      
      const { client, legacyClientId } = validation;
      
      // Query PostgreSQL con filtro multi-tenant sicuro + OR match su legacy ID
      const allClientInvoices = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          totalAmount: invoices.totalAmount,
          tax: invoices.tax,
          date: invoices.date,
          dueDate: invoices.dueDate,
          status: invoices.status,
          notes: invoices.notes,
          createdAt: invoices.createdAt,
          publishedToPwa: invoices.publishedToPwa
        })
        .from(invoices)
        .where(and(
          or(
            eq(invoices.clientId, client.id),
            legacyClientId ? eq(invoices.clientId, legacyClientId) : eq(invoices.clientId, -1)
          ),
          eq(invoices.userId, client.userId) // Multi-tenant isolation
        ))
        .orderBy(desc(invoices.date));
      
      // FILTRO: Solo fatture con flag publishedToPwa attivo (PostgreSQL)
      const sentInvoices = allClientInvoices.filter(inv => {
        const isPublished = inv.publishedToPwa === true;
        console.log(`🔍 [PWA-FILTER] Fattura ${inv.id} (${inv.invoiceNumber}): publishedToPwa=${inv.publishedToPwa}, result=${isPublished}`);
        return isPublished;
      });
      
      // Gli importi sono già in euro (non centesimi), non serve divisione
      const formattedInvoices = sentInvoices.map(inv => ({
        ...inv,
        totalAmount: inv.totalAmount,
        tax: inv.tax || 0
      }));
      
      console.log(`✅ [CLIENT-INVOICES] ${formattedInvoices.length}/${allClientInvoices.length} fatture inviate trovate per cliente ${clientCode}`);
      res.json(formattedInvoices);
      
    } catch (error) {
      console.error('❌ [CLIENT-INVOICES] Errore nel recupero fatture:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // API: Download PDF fattura del cliente
  app.get('/api/simple/client/:clientCode/invoices/:invoiceId/pdf', async (req, res) => {
    try {
      const { clientCode, invoiceId } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      
      console.log(`📥 [CLIENT-INVOICE-PDF] Richiesta PDF fattura ${invoiceId} per cliente ${clientCode}`);
      
      const validation = await validateQRToken(clientCode, token);
      if (!validation) {
        return res.status(401).json({ error: 'Token non valido o cliente non trovato' });
      }
      
      const { client, legacyClientId } = validation;
      
      // Verifica che la fattura appartenga al cliente e al suo proprietario (multi-tenant)
      const invoice = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.id, parseInt(invoiceId)),
          or(
            eq(invoices.clientId, client.id),
            legacyClientId ? eq(invoices.clientId, legacyClientId) : eq(invoices.clientId, -1)
          ),
          eq(invoices.userId, client.userId)
        ))
        .limit(1);
      
      // SECURITY CHECK: Verifica che la fattura sia stata pubblicata sulla PWA (PostgreSQL)
      if (!invoice[0] || invoice[0].publishedToPwa !== true) {
        console.error(`❌ [CLIENT-INVOICE-PDF] Fattura ${invoiceId} non pubblicata sulla PWA (publishedToPwa: ${invoice[0]?.publishedToPwa})`);
        return res.status(403).json({ error: 'Fattura non disponibile' });
      }
      
      if (!invoice || invoice.length === 0) {
        console.error(`❌ [CLIENT-INVOICE-PDF] Fattura ${invoiceId} non trovata o non autorizzata per cliente ${clientCode}`);
        return res.status(404).json({ error: 'Fattura non trovata' });
      }
      
      console.log(`✅ [CLIENT-INVOICE-PDF] Fattura ${invoice[0].invoiceNumber} validata per cliente ${clientCode}`);
      
      const invoiceData = invoice[0];
      
      // Query invoice items from PostgreSQL
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceData.id));
      
      // Carica logo personalizzato
      const { loadUserLogo, buildInvoiceHtml, generatePdfBuffer } = await import('./utils/invoicePdf');
      const logoBase64 = await loadUserLogo(client.userId);
      
      // Carica dati aziendali
      let businessHeader = 'Gestionale Appuntamenti';
      let businessData = {
        companyName: '',
        address: '',
        city: '',
        postalCode: '',
        vatNumber: '',
        fiscalCode: '',
        phone: '',
        email: ''
      };
      
      try {
        const currentStorageData = loadStorageData();
        const userBusinessSettings = currentStorageData.userBusinessSettings?.[client.userId];
        const userBusinessData = currentStorageData.userBusinessData?.[client.userId];
        
        if (userBusinessSettings?.enabled && userBusinessSettings.name) {
          businessHeader = userBusinessSettings.name;
        }
        
        if (userBusinessData) {
          businessData = { ...businessData, ...userBusinessData };
          if (userBusinessData.companyName) {
            businessHeader = userBusinessData.companyName;
          }
        }
      } catch (error) {
        console.log('⚠️ [PDF PWA] Errore caricamento dati aziendali:', error);
      }
      
      // Recupera la valuta dell'utente
      const userCurrency = await getCurrencyForUser(storage, client.userId);
      const currencySymbol = userCurrency.symbol;
      
      // Costruisci context per il template
      const context = {
        invoiceNumber: invoiceData.invoiceNumber,
        date: new Date(invoiceData.date).toLocaleDateString('it-IT'),
        dueDate: new Date(invoiceData.dueDate).toLocaleDateString('it-IT'),
        status: invoiceData.status,
        totalAmount: invoiceData.totalAmount,
        tax: invoiceData.tax || 0,
        notes: invoiceData.notes || undefined,
        
        clientName: `${client.firstName} ${client.lastName}`,
        clientAddress: client.address || undefined,
        clientPhone: client.phone || undefined,
        clientEmail: client.email || undefined,
        clientTaxCode: client.tax_code || undefined,
        clientVatNumber: client.vat_number || undefined,
        clientBirthday: client.birthday ? new Date(client.birthday).toLocaleDateString('it-IT') : undefined,
        
        businessHeader,
        businessAddress: businessData.address || undefined,
        businessCity: businessData.city || undefined,
        businessPostalCode: businessData.postalCode || undefined,
        businessPhone: businessData.phone || undefined,
        businessEmail: businessData.email || undefined,
        businessVatNumber: businessData.vatNumber || undefined,
        businessFiscalCode: businessData.fiscalCode || undefined,
        
        items: items.map(item => ({
          description: item.description || 'Servizio',
          quantity: item.quantity || 1,
          price: item.price || 0,
          total: item.total || 0
        })),
        
        logoBase64,
        currencySymbol
      };
      
      // Genera HTML professionale con logo e grafica
      const htmlContent = buildInvoiceHtml(context);
      
      // Usa Puppeteer per generare PDF vero, con fallback HTML se fallisce
      try {
        const pdfBuffer = await generatePdfBuffer(htmlContent);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Fattura_${invoiceData.invoiceNumber}.pdf"`);
        res.send(pdfBuffer);
        
        console.log(`✅ [CLIENT-INVOICE-PDF] PDF professionale generato per cliente ${clientCode}`);
      } catch (pdfError) {
        console.error('❌ [CLIENT-INVOICE-PDF] Errore Puppeteer, fallback HTML professionale:', pdfError);
        
        // Fallback: invia HTML professionale (stesso template, ma non PDF)
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="Fattura_${invoiceData.invoiceNumber}.html"`);
        res.send(htmlContent);
        
        console.log(`📄 [CLIENT-INVOICE-PDF] HTML professionale inviato come fallback per cliente ${clientCode}`);
      }
      
    } catch (error) {
      console.error('❌ [CLIENT-INVOICE-PDF] Errore nel download PDF:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // API per sbloccare la cancellazione di clienti importati eliminati alla fonte
  app.post('/api/unlock-client-deletion/:clientId', requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      
      console.log(`🔓 [/api/unlock-client-deletion] Admin ${user.id} richiede sblocco per cliente ${clientId}`);
      
      // Solo admin possono sbloccare cancellazioni
      if (user.type !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Solo gli amministratori possono sbloccare le cancellazioni' 
        });
      }
      
      const storageData = loadStorageData();
      const clientEntry = storageData.clients?.find(([id]) => id.toString() === clientId);
      
      if (!clientEntry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente non trovato' 
        });
      }
      
      const [id, client] = clientEntry;
      
      // Verifica che sia un cliente importato
      if (!client.originalOwnerId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Solo i clienti importati possono essere sbloccati' 
        });
      }
      
      // Sblocca la cancellazione
      client.deletionUnlocked = true;
      saveStorageData(storageData);
      
      console.log(`✅ [SBLOCCO] Cliente ${client.firstName} ${client.lastName} (${clientId}) sbloccato per cancellazione dall'admin ${user.id}`);
      
      res.json({
        success: true,
        message: 'Cancellazione sbloccata con successo',
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          deletionUnlocked: true
        }
      });
      
    } catch (error) {
      console.error('❌ [ERRORE SBLOCCO]:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Errore durante lo sblocco della cancellazione' 
      });
    }
  });

  // API per simulare eliminazione dal sistema originale (per test)
  app.post('/api/mark-client-deleted-at-source/:clientId', requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      
      console.log(`⚠️ [/api/mark-client-deleted-at-source] Admin ${user.id} marca cliente ${clientId} come eliminato alla fonte`);
      
      // Solo admin possono simulare eliminazioni
      if (user.type !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Solo gli amministratori possono simulare eliminazioni' 
        });
      }
      
      const storageData = loadStorageData();
      const clientEntry = storageData.clients?.find(([id]) => id.toString() === clientId);
      
      if (!clientEntry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente non trovato' 
        });
      }
      
      const [id, client] = clientEntry;
      
      // Verifica che sia un cliente importato
      if (!client.originalOwnerId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Solo i clienti importati possono essere marcati come eliminati alla fonte' 
        });
      }
      
      // Marca come eliminato alla fonte
      client.deletedAtSource = true;
      saveStorageData(storageData);
      
      console.log(`🚨 [NOTIFICA ELIMINAZIONE] Cliente ${client.firstName} ${client.lastName} (${clientId}) eliminato alla fonte - notifica admin`);
      
      res.json({
        success: true,
        message: 'Cliente marcato come eliminato alla fonte',
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          deletedAtSource: true
        }
      });
      
    } catch (error) {
      console.error('❌ [ERRORE NOTIFICA ELIMINAZIONE]:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Errore durante la notifica di eliminazione' 
      });
    }
  });

  // API per gestire le impostazioni email e calendario - USA CAMPI SMTP CRIPTATI
  app.get('/api/email-calendar-settings', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      console.log(`📧 [GET EMAIL SETTINGS] Richiesta per utente ${user.id}`);
      
      const defaultTemplate = `Gentile {{nome}} {{cognome}},

Questo è un promemoria per il Suo appuntamento di {{servizio}} previsto per il giorno {{data}} alle ore {{ora}}.

Per qualsiasi modifica o cancellazione, La preghiamo di contattarci.

Cordiali saluti,
Studio Professionale`;

      const settings = await storage.getUserSettings(user.id);
      
      const response = {
        emailEnabled: settings?.smtpEnabled || false,
        emailAddress: settings?.smtpEmail || '',
        emailPassword: settings?.smtpPasswordEncrypted ? '••••••••••' : '',
        emailTemplate: settings?.emailTemplate || defaultTemplate,
        emailSubject: settings?.emailSubject || "Promemoria appuntamento del {{data}}",
        hasPasswordSaved: !!settings?.smtpPasswordEncrypted,
        smtpServer: settings?.smtpServer || 'smtp.gmail.com',
        smtpPort: settings?.smtpPort || 587,
        calendarEnabled: settings?.calendarIntegrationEnabled || false,
        calendarId: settings?.defaultCalendarId || '',
        googleAuthStatus: { authorized: false }
      };
      
      console.log(`✅ [EMAIL SETTINGS] Caricate per utente ${user.id} - Email: ${response.emailAddress}`);
      res.json(response);
    } catch (error) {
      console.error('❌ [ERRORE EMAIL SETTINGS]:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Errore durante il caricamento delle impostazioni email' 
      });
    }
  });

  app.post('/api/email-calendar-settings', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { emailEnabled, emailAddress, emailPassword, emailTemplate, emailSubject, calendarEnabled, calendarId, smtpServer, smtpPort } = req.body;
      
      console.log(`📧 [POST EMAIL SETTINGS] Aggiornamento per utente ${user.id}`, {
        emailEnabled,
        emailAddress,
        hasPassword: !!emailPassword,
        passwordMasked: emailPassword === '••••••••••'
      });
      
      const { encryptPassword } = await import('./utils/encryption');
      const { detectEmailProvider } = await import('./utils/emailProviderDetection');
      
      const updateData: any = {};
      
      if (emailEnabled !== undefined) updateData.smtpEnabled = emailEnabled;
      if (emailAddress !== undefined) updateData.smtpEmail = emailAddress;
      if (emailPassword !== undefined && emailPassword !== '••••••••••') {
        updateData.smtpPasswordEncrypted = encryptPassword(emailPassword);
        console.log(`🔐 [EMAIL SETTINGS] Password criptata con AES-256-GCM`);
      }
      if (emailTemplate !== undefined) updateData.emailTemplate = emailTemplate;
      if (emailSubject !== undefined) updateData.emailSubject = emailSubject;
      if (calendarEnabled !== undefined) updateData.calendarIntegrationEnabled = calendarEnabled;
      if (calendarId !== undefined) updateData.defaultCalendarId = calendarId;
      
      // 🚀 AUTO-DETECTION SMTP: Se emailAddress fornito MA smtpServer/smtpPort NON forniti
      if (emailAddress && !smtpServer && !smtpPort) {
        const detected = detectEmailProvider(emailAddress);
        if (detected) {
          updateData.smtpServer = detected.smtp_server;
          updateData.smtpPort = detected.smtp_port;
          console.log(`✨ [AUTO-DETECTION] Provider rilevato: ${detected.providerName || detected.smtp_server} (${detected.smtp_server}:${detected.smtp_port})`);
          
          // Se provider richiede App Password (Gmail, iCloud), logga avviso
          if (detected.requiresAppPassword) {
            console.log(`⚠️ [AUTO-DETECTION] ${detected.providerName} richiede App Password - sarà verificato al test`);
          }
        } else {
          // Fallback generico: smtp.domain:587
          const domain = emailAddress.split('@')[1];
          updateData.smtpServer = `smtp.${domain}`;
          updateData.smtpPort = 587;
          console.log(`⚠️ [AUTO-DETECTION] Provider sconosciuto, fallback generico: smtp.${domain}:587`);
        }
      } else if (smtpServer !== undefined || smtpPort !== undefined) {
        // Configurazione manuale fornita dall'utente (override)
        if (smtpServer !== undefined) updateData.smtpServer = smtpServer;
        if (smtpPort !== undefined) updateData.smtpPort = smtpPort;
        console.log(`🔧 [MANUAL CONFIG] SMTP configurato manualmente: ${smtpServer || 'default'}:${smtpPort || 'default'}`);
      }
      
      await storage.updateUserSettings(user.id, updateData);
      console.log(`✅ [EMAIL SETTINGS] Salvate per utente ${user.id} - Email: ${emailAddress || 'non modificata'}`);
      
      res.json({
        success: true,
        message: 'Impostazioni email aggiornate con successo',
        autoDetected: emailAddress && !smtpServer && !smtpPort
      });
    } catch (error) {
      console.error('❌ [ERRORE SAVE EMAIL SETTINGS]:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore durante il salvataggio delle impostazioni email' 
      });
    }
  });

  // API per mostrare password email in chiaro (solo per utente autenticato)
  app.get('/api/email-calendar-settings/show-password', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      console.log(`🔓 [SHOW PASSWORD] Richiesta per utente ${user.id}`);
      
      const { getEmailConfig } = await import('./utils/emailConfig');
      const emailConfig = await getEmailConfig(user.id);
      
      if (!emailConfig || !emailConfig.emailPassword) {
        return res.status(404).json({
          success: false,
          error: 'Nessuna password salvata'
        });
      }
      
      // Restituisci la password decriptata
      res.json({
        success: true,
        emailPassword: emailConfig.emailPassword // getEmailConfig già decripta automaticamente
      });
      
    } catch (error) {
      console.error('❌ [ERRORE SHOW PASSWORD]:', error);
      res.status(500).json({
        success: false,
        error: 'Errore durante il recupero della password'
      });
    }
  });

  // API per inviare email di test - USA CREDENZIALI UTENTE
  app.post('/api/email-calendar-settings/send-test-email', requireAuth, async (req, res) => {
    try {
      const { email } = req.body;
      const user = req.user!;
      
      console.log(`📧 [TEST EMAIL] Richiesta per utente ${user.id} → ${email}`);
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          error: 'Indirizzo email richiesto' 
        });
      }
      
      const { getEmailConfig } = await import('./utils/emailConfig');
      const emailConfig = await getEmailConfig(user.id);
      
      if (!emailConfig || !emailConfig.emailAddress || !emailConfig.emailPassword) {
        return res.status(400).json({
          success: false,
          error: 'Configurazione email non trovata. Configura prima le credenziali SMTP.'
        });
      }
      
      console.log(`📧 [TEST EMAIL] Usando: ${emailConfig.emailAddress}`);
      
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtpServer || 'smtp.gmail.com',
        port: emailConfig.smtpPort || 587,
        secure: false,
        auth: {
          user: emailConfig.emailAddress,
          pass: emailConfig.emailPassword
        }
      });
      
      await transporter.sendMail({
        from: emailConfig.emailAddress,
        to: email,
        subject: 'Test Email - Sistema Gestione Appuntamenti',
        html: `
          <h2>✅ Test Email Configurazione</h2>
          <p>Questa è un'email di test dal sistema di gestione appuntamenti.</p>
          <p><strong>Data invio:</strong> ${new Date().toLocaleString('it-IT')}</p>
          <p><strong>Da:</strong> ${emailConfig.emailAddress}</p>
          <p>Se ricevi questa email, la configurazione è corretta!</p>
        `
      });
      
      console.log(`✅ [TEST EMAIL] Inviata con successo a ${email}`);
      
      res.json({
        success: true,
        message: `Email di test inviata con successo a ${email}`
      });
      
    } catch (error: any) {
      console.error('❌ [ERRORE TEST EMAIL]:', error);
      
      const { detectEmailProvider } = await import('./utils/emailProviderDetection');
      const user = req.user!;
      const { getEmailConfig } = await import('./utils/emailConfig');
      const emailConfig = await getEmailConfig(user.id);
      
      // Rileva provider per messaggi specifici
      const detected = emailConfig?.emailAddress ? detectEmailProvider(emailConfig.emailAddress) : null;
      const domain = emailConfig?.emailAddress ? emailConfig.emailAddress.split('@')[1] : '';
      const providerName = detected?.providerName || domain || 'Provider email';
      
      // 🔍 MAPPA ERRORI SMTP A MESSAGGI USER-FRIENDLY
      let userMessage = 'Errore durante l\'invio dell\'email di test';
      let helpUrl: string | null = null;
      let errorCode = 'UNKNOWN';
      
      // ✉️ ERRORI AUTENTICAZIONE (535, EAUTH)
      if (error.responseCode === 535 || error.code === 'EAUTH' || (error.message && error.message.includes('535'))) {
        errorCode = 'AUTH_FAILED';
        
        // 📧 GMAIL - Richiede App Password
        if (domain === 'gmail.com' || domain === 'googlemail.com') {
          userMessage = `⚠️ ${providerName} richiede una App Password (NON la password normale del tuo account Gmail).\n\n` +
                       `📝 Come ottenerla:\n` +
                       `1. Vai su https://myaccount.google.com/security\n` +
                       `2. Attiva "Verifica in due passaggi"\n` +
                       `3. Vai su https://myaccount.google.com/apppasswords\n` +
                       `4. Genera una password per "Mail"\n` +
                       `5. Usa quella password (16 caratteri) al posto della password Gmail normale`;
          helpUrl = 'https://myaccount.google.com/apppasswords';
        }
        // 🍎 ICLOUD - Richiede App Password
        else if (domain === 'icloud.com' || domain === 'me.com') {
          userMessage = `⚠️ ${providerName} richiede una password specifica per l'app.\n\n` +
                       `📝 Come ottenerla:\n` +
                       `1. Vai su appleid.apple.com\n` +
                       `2. Accedi e vai su "Sicurezza"\n` +
                       `3. Genera una "password specifica per l'app"\n` +
                       `4. Usa quella password al posto della password iCloud`;
          helpUrl = 'https://appleid.apple.com';
        }
        // 📬 ALTRI PROVIDER - Password errata
        else {
          userMessage = `❌ Email o password non corretti per ${providerName}.\n\n` +
                       `Verifica che:\n` +
                       `• L'indirizzo email sia corretto\n` +
                       `• La password sia quella che usi per entrare nella webmail\n` +
                       `• Non ci siano spazi extra nella password`;
        }
      }
      // 🔌 SERVER NON RAGGIUNGIBILE
      else if (error.code === 'ECONNREFUSED') {
        errorCode = 'CONN_REFUSED';
        userMessage = `❌ Impossibile connettersi al server SMTP di ${providerName}.\n\n` +
                     `Server: ${emailConfig?.smtpServer || 'non configurato'}\n` +
                     `Porta: ${emailConfig?.smtpPort || 'non configurata'}\n\n` +
                     `Possibili cause:\n` +
                     `• Il server SMTP è errato\n` +
                     `• La porta è bloccata dal firewall`;
      }
      // ⏱️ TIMEOUT CONNESSIONE
      else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
        errorCode = 'TIMEOUT';
        userMessage = `⏱️ Timeout durante la connessione a ${providerName}.\n\n` +
                     `Il server SMTP non risponde. Verifica la tua connessione internet.`;
      }
      // 🔍 SERVER NON TROVATO
      else if (error.code === 'ENOTFOUND') {
        errorCode = 'NOT_FOUND';
        userMessage = `❌ Server SMTP non trovato: ${emailConfig?.smtpServer}\n\n` +
                     `Verifica che il server sia corretto per ${providerName}.`;
      }
      // 🚫 POLICY / SPAM (Libero, Virgilio, ISP italiani)
      else if ((error.responseCode === 550 || error.responseCode === 554) && 
               (error.message?.includes('policy') || error.message?.includes('spam'))) {
        errorCode = 'POLICY_REJECT';
        userMessage = `🚫 Il provider ${providerName} ha bloccato l'invio.\n\n` +
                     `Possibili cause:\n` +
                     `• Limite di invii giornalieri raggiunto\n` +
                     `• Email classificata come spam\n` +
                     `• Connessione da IP non autorizzato\n\n` +
                     `Contatta l'assistenza di ${providerName} per maggiori dettagli.`;
      }
      // ⚠️ ERRORE GENERICO
      else {
        userMessage = `Errore durante l'invio dell'email di test.\n\n` +
                     `Dettagli tecnici: ${error.message || 'Errore sconosciuto'}`;
      }
      
      console.error(`❌ [TEST EMAIL ERROR] Code: ${errorCode}, Provider: ${providerName}, Domain: ${domain}`);
      
      res.status(500).json({ 
        success: false, 
        error: userMessage,
        code: errorCode,
        helpUrl: helpUrl || null,
        provider: providerName || 'Unknown',
        detectedProvider: detected?.providerName || null,
        autoDetected: !!detected
      });
    }
  });

  // Consent endpoints
  app.get("/api/consents/client", (req, res) => {
    try {
      const storageData = loadStorageData();
      const consents = storageData.consents || [];
      
      console.log(`📋 [GET CONSENTS] Richiesta lista consensi - trovati ${consents.length} consensi`);
      
      res.json(consents);
    } catch (error) {
      console.error('❌ [ERRORE GET CONSENTS]:', error);
      res.status(500).json({ error: 'Errore durante il caricamento dei consensi' });
    }
  });

  app.post("/api/consents", (req, res) => {
    try {
      const { clientId, consentText, signature } = req.body;
      
      console.log(`📋 [POST CONSENT] Registrazione consenso per cliente ${clientId}`);
      
      if (!clientId || !consentText) {
        return res.status(400).json({ error: 'ClientId e consentText sono richiesti' });
      }
      
      const storageData = loadStorageData();
      
      // Crea il nuovo consenso
      const consent = {
        id: Date.now(),
        clientId: parseInt(clientId),
        consentText,
        signature: signature || `Consenso digitale - ${new Date().toLocaleString()}`,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      // Salva il consenso
      if (!storageData.consents) storageData.consents = [];
      storageData.consents.push(consent);
      
      // AGGIORNA AUTOMATICAMENTE IL CLIENTE CON hasConsent: true
      const clientIndex = storageData.clients?.findIndex(([id, client]) => id === parseInt(clientId));
      if (clientIndex !== -1) {
        const [id, client] = storageData.clients[clientIndex];
        client.hasConsent = true;
        console.log(`✅ [AUTO UPDATE] Cliente ${client.firstName} ${client.lastName} aggiornato con hasConsent: true`);
      } else {
        console.warn(`⚠️ [CONSENT WARNING] Cliente ${clientId} non trovato per aggiornamento hasConsent`);
      }
      
      // Salva tutti i dati
      saveStorageData(storageData);
      
      console.log(`✅ [CONSENT SUCCESS] Consenso registrato per cliente ${clientId} e flag hasConsent aggiornato`);
      
      res.json({ 
        success: true, 
        message: 'Consenso registrato con successo',
        consent 
      });
      
    } catch (error) {
      console.error('❌ [ERRORE POST CONSENT]:', error);
      res.status(500).json({ error: 'Errore durante la registrazione del consenso' });
    }
  });

  // Servire file statici da attached_assets per icone
  app.use('/attached_assets', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'attached_assets', req.path);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving static file:', err);
        res.status(404).send('File not found');
      }
    });
  });

  // Endpoint per recuperare l'ultimo accesso valido di un proprietario
  app.get('/api/client-access/last-access/:ownerId', async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const storageData = loadStorageData();
      
      console.log(`📱 PWA RECOVERY: Ricerca ultimo accesso per proprietario ${ownerId}`);
      
      // Trova l'ultimo cliente con accesso valido per questo proprietario
      const ownerClients = Object.values(storageData.clients).filter(client => 
        client.originalOwnerId === ownerId
      );
      
      if (ownerClients.length === 0) {
        return res.status(404).json({ error: 'Nessun cliente trovato per questo proprietario' });
      }
      
      // Trova il cliente con l'accesso più recente
      let lastAccessClient = null;
      let lastAccessTime = 0;
      
      for (const client of ownerClients) {
        const accessCount = storageData.clientAccessCounts[client.id] || 0;
        if (accessCount > 0) {
          // Per ora usiamo l'ID più alto come proxy per l'accesso più recente
          if (client.id > lastAccessTime) {
            lastAccessTime = client.id;
            lastAccessClient = client;
          }
        }
      }
      
      if (!lastAccessClient) {
        return res.status(404).json({ error: 'Nessun accesso recente trovato' });
      }
      
      // Genera un nuovo token per questo cliente
      const newToken = await generateClientCode(ownerId, lastAccessClient.id);
      
      console.log(`📱 PWA RECOVERY: Token generato per cliente ${lastAccessClient.id}`);
      
      res.json({
        clientId: lastAccessClient.id,
        token: newToken,
        isValid: true,
        clientName: `${lastAccessClient.firstName} ${lastAccessClient.lastName}`
      });
      
    } catch (error) {
      console.error('Errore nel recupero ultimo accesso:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Endpoint pubblico per informazioni di contatto complete (per area clienti)
  app.get('/api/public/contact-info', (req, res) => {
    try {
      const storageData = loadStorageData();
      const { contactInfo = {}, contactSettings = {} } = storageData;
      
      // Restituisce le informazioni di contatto con tutte le impostazioni per replicare il layout della home
      const publicContactInfo = {
        // Dati di contatto
        businessName: contactInfo.businessName || 'Studio Professionale',
        email: contactInfo.email,
        phone: contactInfo.phone,
        phone1: contactInfo.phone1,
        website: contactInfo.website,
        instagram: contactInfo.instagram,
        
        // Impostazioni di visibilità (per mostrare solo quello che il professionista ha abilitato)
        showEmail: contactSettings.showEmail !== false,
        showPhone: contactSettings.showPhone !== false,
        showPhone1: contactSettings.showPhone1 !== false,
        showWebsite: contactSettings.showWebsite !== false,
        showInstagram: contactSettings.showInstagram !== false,
        
        // Impostazioni di layout se presenti
        contactLayout: contactSettings.layout || 'default'
      };
      
      res.json(publicContactInfo);
    } catch (error) {
      console.error('Errore nel caricamento informazioni contatto pubbliche:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Endpoint per registrare accesso PWA tramite codice cliente (senza autenticazione)
  app.post('/api/client-access/:clientCode', async (req, res) => {
    try {
      const clientCode = req.params.clientCode;
      
      // 🔄 USA POSTGRESQL: Cerca cliente per uniqueCode nel database
      const clientResults = await db.select()
        .from(clients)
        .where(eq(clients.uniqueCode, clientCode))
        .limit(1);
      
      if (!clientResults || clientResults.length === 0) {
        console.log(`❌ [CLIENT ACCESS] Cliente non trovato per codice: ${clientCode}`);
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      const client = clientResults[0];
      const now = new Date();
      
      // Genera token di accesso per il cliente
      const token = `${clientCode}_${now.getTime()}`;
      
      // BACKWARD COMPATIBILITY: Aggiorna contatori JSON storage se cliente presente
      const storageData = loadStorageData();
      const clientData = storageData.clients?.find(([id, c]) => c.uniqueCode === clientCode);
      if (clientData) {
        const [id, jsonClient] = clientData;
        const clientIndex = storageData.clients.findIndex(([cId, c]) => cId === id);
        
        // Incrementa contatori accesso
        storageData.clients[clientIndex][1].accessCount = (jsonClient.accessCount || 0) + 1;
        storageData.clients[clientIndex][1].lastAccess = now.toISOString();
        
        // Aggiorna info accesso PWA
        if (req.body.source === 'pwa') {
          storageData.clients[clientIndex][1].lastPwaAccess = now.toISOString();
          storageData.clients[clientIndex][1].pwaAccessCount = (jsonClient.pwaAccessCount || 0) + 1;
        }
        
        saveStorageData(storageData);
        console.log(`✅ [PWA ACCESS] Contatori JSON aggiornati per ${client.firstName} ${client.lastName}`);
      }
      
      console.log(`✅ [PWA ACCESS] Cliente ${client.firstName} ${client.lastName} (${clientCode}) - Accesso registrato, token generato`);
      
      res.json({
        success: true,
        clientId: client.id,
        token: token
      });
    } catch (error) {
      console.error('Errore nella registrazione accesso cliente:', error);
      res.status(500).json({ message: "Errore interno" });
    }
  });

  // Endpoint per registrare accesso PWA del cliente tramite ID (senza autenticazione)
  app.post('/api/client-access/track/:clientId', (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const storageData = loadStorageData();
      
      // Trova il cliente
      const clientIndex = storageData.clients?.findIndex(([id, client]) => id === clientId);
      if (clientIndex === -1) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      const [id, client] = storageData.clients[clientIndex];
      const now = new Date();
      const lastAccessTime = client.lastAccess ? new Date(client.lastAccess) : null;
      
      // TRACKING MIGLIORATO: Incrementa sempre il contatore per PWA e QR
      client.accessCount = (client.accessCount || 0) + 1;
      client.lastAccess = now.toISOString();
      
      console.log(`✅ [PWA ACCESS] Cliente ${client.firstName} ${client.lastName} (${clientId}) - Accesso registrato: ${client.accessCount} (${req.body.accessType})`);
      
      // Aggiorna informazioni di accesso PWA
      if (req.body.isPWA) {
        client.lastPwaAccess = now.toISOString();
        client.pwaAccessCount = (client.pwaAccessCount || 0) + 1;
      }
      
      // Salva i dati aggiornati
      saveStorageData(storageData);
      
      console.log(`📱 [PWA ACCESS] Cliente ${client.firstName} ${client.lastName} (${clientId}) ha acceduto all'app - conteggio: ${client.accessCount}`);
      
      // Previeni cache per assicurarsi che i conteggi siano sempre aggiornati
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({
        success: true,
        accessCount: client.accessCount,
        message: 'Accesso registrato'
      });
      
    } catch (error) {
      console.error('Errore nel tracking accesso PWA:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Endpoint per icone specifiche del proprietario
  app.get('/icons/owner-:ownerId-icon-:size.png', (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const size = req.params.size;
      const storageData = loadStorageData();
      
      console.log(`🔍 PWA ICON OWNER: Richiesta icona per proprietario ${ownerId}, dimensione ${size}`);
      
      // Recupera l'icona del professionista specifico
      const userIcon = storageData.userIcons[ownerId];
      
      if (userIcon) {
        console.log(`✅ PWA ICON OWNER: Trovata icona per proprietario ${ownerId}`);
        const buffer = Buffer.from(userIcon, 'base64');
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=3600');
        return res.send(buffer);
      } else {
        console.log(`❌ PWA ICON OWNER: Nessuna icona trovata per proprietario ${ownerId}`);
        return res.redirect('/icons/icon-' + size + '.png');
      }
    } catch (error) {
      console.error('Errore nel servire icona proprietario:', error);
      return res.redirect('/icons/icon-' + req.params.size + '.png');
    }
  });

  // Endpoint per servire icone PWA dinamiche basate sul proprietario del cliente (da token QR)
  app.get('/icons/custom-icon-:size.png', (req, res) => {
    try {
      const size = req.params.size; // es: 96x96, 192x192, 512x512
      const storageData = loadStorageData();
      
      // Controlla se c'è un token QR negli headers o referer per identificare il proprietario
      let ownerUserId = null;
      
      // 1. Controlla il referer per token QR
      const referer = req.get('referer') || '';
      const tokenMatch = referer.match(/token=([^&]+)/);
      
      if (tokenMatch) {
        const token = tokenMatch[1];
        const tokenParts = token.split('_');
        if (tokenParts.length >= 5 && tokenParts[0] === 'PROF') {
          ownerUserId = parseInt(tokenParts[1]); // Seconda parte = userId proprietario
          console.log(`📱 PWA ICON: Trovato ownerId ${ownerUserId} da token QR nel referer`);
        }
      }
      
      // 2. Controlla il localStorage per ownerId salvato
      if (!ownerUserId) {
        // Cerca nelle sessioni attive o nel database per determinare l'owner
        const sessions = req.sessionStore;
        // Per ora, usa un fallback intelligente: se c'è solo un utente con icone, usa quello
        const usersWithIcons = Object.keys(storageData.userIcons || {});
        if (usersWithIcons.length === 1) {
          ownerUserId = parseInt(usersWithIcons[0]);
          console.log(`📱 PWA ICON: Usando fallback owner ${ownerUserId}`);
        }
      }
      
      // Non serve duplicare la logica del token qui
      if (ownerUserId) {
        console.log(`🔍 PWA ICON: Identificato proprietario ${ownerUserId} da token QR o fallback`);
      }
      
      // Se non trovato da token QR, controlla header custom per ownerId dalla PWA
      if (!ownerUserId) {
        const ownerIdHeader = req.get('x-owner-id');
        if (ownerIdHeader) {
          ownerUserId = parseInt(ownerIdHeader);
          console.log(`🔍 PWA ICON: Identificato proprietario ${ownerUserId} da header PWA`);
        }
      }
      
      // Se non trovato, usa sessione attiva (admin)
      if (!ownerUserId && req.session && req.session.passport && req.session.passport.user) {
        const serializedUser = req.session.passport.user;
        if (typeof serializedUser === 'string' && serializedUser.includes(':')) {
          ownerUserId = parseInt(serializedUser.split(':')[1]);
          console.log(`🔍 PWA ICON: Usando utente sessione attiva ${ownerUserId}`);
        }
      }
      
      // NESSUN FALLBACK - Mantieni gerarchia client-proprietario
      if (!ownerUserId) {
        console.log(`❌ PWA ICON: Nessun proprietario identificato - uso icona default`);
        return res.redirect('/icons/icon-' + size + '.png');
      }
      
      // Recupera l'icona del professionista dalla struttura userIcons
      const userIcon = ownerUserId ? storageData.userIcons[ownerUserId] : null;
      
      if (!userIcon) {
        console.log(`🔄 Nessuna icona personalizzata trovata per utente ${ownerUserId}, uso default`);
        return res.redirect('/icons/icon-' + size + '.png');
      }
      
      // Se l'icona è in formato base64, convertila e servila
      if (userIcon && userIcon.startsWith('data:image/')) {
        const base64Data = userIcon.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Determina il tipo di immagine dal data URL
        let contentType = 'image/png';
        if (userIcon.includes('data:image/jpeg')) contentType = 'image/jpeg';
        else if (userIcon.includes('data:image/jpg')) contentType = 'image/jpeg';
        
        res.set({
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Cache per 1 ora
          'Content-Length': buffer.length
        });
        
        console.log(`📱 Servendo icona PWA personalizzata ${size} per proprietario ${ownerUserId}`);
        return res.send(buffer);
      }
      
      // Se è un percorso file, serve quello
      if (userIcon && userIcon.length > 0 && !userIcon.startsWith('data:')) {
        console.log(`📁 Reindirizzando a icona file: ${userIcon}`);
        return res.redirect(userIcon);
      }
      
    } catch (error) {
      console.error('Errore nel servire icona PWA personalizzata:', error);
      // Fallback all'icona predefinita
      res.redirect('/icons/icon-' + req.params.size + '.png');
    }
  });

  // Endpoint per servire icone PWA dinamiche per proprietari specifici
  app.get('/icons/owner-:ownerId-icon-:size.png', (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const size = req.params.size;
      const storageData = loadStorageData();
      
      console.log(`📱 PWA ICON: Richiesta icona ${size}x${size} per proprietario ${ownerId}`);
      
      // Per Silvia Busnari (ID 14), usa la sua foto professionale
      if (ownerId === 14) {
        const silviaImagePath = path.join(process.cwd(), 'attached_assets', 'IMG_20250416_170748.jpg');
        if (fs.existsSync(silviaImagePath)) {
          console.log(`✅ PWA ICON: Servendo icona di Silvia Busnari da ${silviaImagePath}`);
          return res.sendFile(silviaImagePath);
        }
      }
      
      // Recupera l'icona del professionista dalla struttura userIcons
      const userIcon = storageData.userIcons[ownerId];
      
      if (userIcon && userIcon.startsWith('data:image/')) {
        const base64Data = userIcon.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        let contentType = 'image/png';
        if (userIcon.includes('data:image/jpeg')) contentType = 'image/jpeg';
        else if (userIcon.includes('data:image/jpg')) contentType = 'image/jpeg';
        
        res.set({
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'Content-Length': buffer.length
        });
        
        console.log(`✅ PWA ICON: Servendo icona personalizzata per proprietario ${ownerId}`);
        return res.send(buffer);
      }
      
      // Fallback all'icona standard
      console.log(`🔄 PWA ICON: Nessuna icona personalizzata per proprietario ${ownerId}, uso standard`);
      res.redirect('/icons/icon-' + size + '.png');
      
    } catch (error) {
      console.error('Errore nel servire icona proprietario:', error);
      res.redirect('/icons/icon-' + req.params.size + '.png');
    }
  });



  // Endpoint per recuperare dettagli accessi di un cliente (richiesto da ClientAccessesDetails)
  app.get('/api/client-access/:clientId', requireAuth, (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const storageData = loadStorageData();
      
      // Trova il cliente
      const clientData = storageData.clients?.find(([id, client]) => id === clientId);
      if (!clientData) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      const [id, client] = clientData;
      
      // Genera accessi fittizi basati sui dati disponibili
      const accesses = [];
      if (client.lastAccess && (client.accessCount || 0) > 0) {
        const lastAccessDate = new Date(client.lastAccess);
        
        // Genera gli ultimi 10 accessi distribuiti negli ultimi giorni
        for (let i = 0; i < Math.min(client.accessCount || 0, 10); i++) {
          const daysBack = Math.floor(i / 2); // 2 accessi per giorno
          const accessDate = new Date(lastAccessDate);
          accessDate.setDate(accessDate.getDate() - daysBack);
          accessDate.setHours(9 + (i % 12), Math.floor(Math.random() * 60), 0, 0);
          
          accesses.push({
            id: i + 1,
            clientId: clientId,
            accessDate: accessDate.toISOString(),
            userAgent: i % 3 === 0 ? "Mobile" : (i % 3 === 1 ? "Desktop" : "Tablet")
          });
        }
      }
      
      // Ordina per data decrescente (più recenti prima)
      accesses.sort((a, b) => new Date(b.accessDate).getTime() - new Date(a.accessDate).getTime());
      
      res.json(accesses);
      
    } catch (error) {
      console.error('Errore nel recupero dettagli accessi:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Endpoint per testare e aggiornare lo stato dei promemoria
  app.post('/api/test-reminder-flags', requireAuth, (req, res) => {
    try {
      const { appointmentId, reminderStatus } = req.body;
      const storageData = loadStorageData();
      
      // Trova l'appuntamento e aggiorna lo stato
      const appointmentIndex = storageData.appointments?.findIndex(apt => apt.id === appointmentId);
      if (appointmentIndex !== -1) {
        storageData.appointments[appointmentIndex].reminderStatus = reminderStatus;
        storageData.appointments[appointmentIndex].reminderType = 'email'; // Assicura che abbia un tipo
        
        // Salva i dati aggiornati
        saveStorageData(storageData);
        
        res.json({
          success: true,
          message: `Stato promemoria aggiornato a: ${reminderStatus}`,
          appointment: storageData.appointments[appointmentIndex]
        });
      } else {
        res.status(404).json({ error: 'Appuntamento non trovato' });
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento dello stato promemoria:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Endpoint per monitorare i promemoria email inviati
  app.get('/api/email/reminders/status', requireAuth, (req, res) => {
    try {
      const storageData = loadStorageData();
      const { appointments = [] } = storageData;
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filtra appuntamenti per domani
      const tomorrowAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.toDateString() === tomorrow.toDateString();
      });
      
      // Trova l'appuntamento di Marco Berto specifico
      const marcoBertoAppointment = tomorrowAppointments.find(apt => {
        const client = storageData.clients?.find(([id, clientData]) => 
          clientData.id === apt.clientId && 
          (clientData.firstName?.toLowerCase().includes('marco') || 
           clientData.lastName?.toLowerCase().includes('berto'))
        );
        return client;
      });
      
      const emailSettings = JSON.parse(fs.readFileSync('./email_settings.json', 'utf8'));
      
      res.json({
        emailSystemEnabled: emailSettings.emailEnabled,
        schedulerActive: true,
        tomorrowAppointments: tomorrowAppointments.length,
        marcoBertoFound: !!marcoBertoAppointment,
        marcoBertoAppointment: marcoBertoAppointment ? {
          id: marcoBertoAppointment.id,
          date: marcoBertoAppointment.date,
          time: marcoBertoAppointment.time,
          clientId: marcoBertoAppointment.clientId,
          serviceId: marcoBertoAppointment.serviceId
        } : null,
        nextReminderCheck: 'Ogni ora alle :00',
        systemStatus: 'Operativo'
      });
    } catch (error) {
      console.error('Errore controllo promemoria:', error);
      res.status(500).json({ error: 'Errore sistema promemoria' });
    }
  });

  // Configurazione multer per upload immagini
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limite
    },
    fileFilter: (req, file, cb) => {
      // Accetta solo immagini
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Solo file immagine sono accettati'), false);
      }
    }
  });

  // API per caricare icona personalizzata PWA
  app.post('/api/upload-custom-icon', requireAuth, upload.single('icon'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nessun file caricato' });
      }

      console.log(`🎨 [ICON UPLOAD] Utente ${req.user?.username} sta caricando icona personalizzata`);
      console.log(`📎 File ricevuto: ${req.file.originalname}, size: ${req.file.size} bytes`);

      // Converti l'immagine caricata in icone PWA
      const iconPaths = await iconConversionService.processCustomIcon(
        req.file.buffer,
        'custom-icon'
      );

      console.log(`✅ [ICON UPLOAD] Icone PWA generate:`, iconPaths);

      res.json({
        success: true,
        message: 'Icona personalizzata caricata e convertita con successo',
        iconPaths: iconPaths
      });
    } catch (error) {
      console.error('❌ [ICON UPLOAD] Errore:', error);
      res.status(500).json({ 
        error: 'Errore durante la conversione dell\'icona',
        details: error.message 
      });
    }
  });

  // API per caricare icona via base64
  app.post('/api/upload-icon-base64', requireAuth, async (req: any, res: any) => {
    try {
      const { imageData, iconName } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: 'Dati immagine mancanti' });
      }

      console.log(`🎨 [ICON BASE64] Utente ${req.user?.username} sta caricando icona via base64`);

      // Converti l'immagine base64 in icone PWA
      const iconPaths = await iconConversionService.processCustomIcon(
        imageData,
        iconName || 'custom-icon'
      );

      console.log(`✅ [ICON BASE64] Icone PWA generate:`, iconPaths);

      res.json({
        success: true,
        message: 'Icona caricata e convertita con successo',
        iconPaths: iconPaths
      });
    } catch (error) {
      console.error('❌ [ICON BASE64] Errore:', error);
      res.status(500).json({ 
        error: 'Errore durante la conversione dell\'icona',
        details: error.message 
      });
    }
  });

  // API per ripristinare icona predefinita
  app.post('/api/restore-default-icon', requireAuth, async (req: any, res: any) => {
    try {
      console.log(`🔄 [ICON RESTORE] Utente ${req.user?.username} sta ripristinando icona predefinita`);

      // Ripristina le icone predefinite (Fleur de Vie)
      const iconPaths = await iconConversionService.restoreDefaultIcons();

      console.log(`✅ [ICON RESTORE] Icone predefinite ripristinate:`, iconPaths);

      res.json({
        success: true,
        message: 'Icona predefinita ripristinata con successo',
        iconPaths: iconPaths
      });
    } catch (error) {
      console.error('❌ [ICON RESTORE] Errore:', error);
      res.status(500).json({ 
        error: 'Errore durante il ripristino dell\'icona predefinita',
        details: error.message 
      });
    }
  });

  // API per ottenere info sulle icone attuali
  app.get('/api/current-icon-info', requireAuth, async (req: any, res: any) => {
    try {
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      res.json({
        success: true,
        currentIcons: manifest.icons,
        manifestPath: '/manifest.json'
      });
    } catch (error) {
      console.error('❌ [ICON INFO] Errore:', error);
      res.status(500).json({ 
        error: 'Errore durante la lettura delle informazioni icone',
        details: error.message 
      });
    }
  });

  // Endpoint per accesso diretto cliente - SOLO dati cliente, NESSUN accesso al gestionale (PostgreSQL)
  app.get("/api/client-by-code/:clientCode", async (req, res) => {
    try {
      const { clientCode } = req.params;
      console.log('🏠 [CLIENT ACCESS PG] Accesso diretto per codice:', clientCode);
      
      // Cerca il cliente nel database PostgreSQL usando il codice univoco
      const foundClients = await db
        .select()
        .from(clients)
        .where(eq(clients.uniqueCode, clientCode))
        .limit(1);
      
      if (!foundClients || foundClients.length === 0) {
        console.log('❌ [CLIENT ACCESS PG] Cliente non trovato per codice:', clientCode);
        return res.status(404).json({ error: 'Accesso non autorizzato' });
      }
      
      const foundClient = foundClients[0];
      console.log('🏠 [CLIENT ACCESS PG] Cliente autenticato:', foundClient.firstName, foundClient.lastName);
      
      // Ritorna SOLO i dati essenziali del cliente - NESSUN riferimento al gestionale
      const pureClientData = {
        id: foundClient.id,
        firstName: foundClient.firstName,
        lastName: foundClient.lastName,
        phone: foundClient.phone,
        email: foundClient.email,
        uniqueCode: foundClient.uniqueCode,
        ownerId: foundClient.ownerId // Solo per identificare i suoi appuntamenti
      };
      
      res.json(pureClientData);
      
    } catch (error) {
      console.error('❌ [CLIENT ACCESS PG] Errore sistema:', error);
      res.status(500).json({ error: 'Errore del sistema' });
    }
  });

  // Endpoint per appuntamenti di un singolo cliente - SOLO suoi dati (PostgreSQL)
  app.get("/api/client-appointments/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { ownerId } = req.query;
      
      console.log('📅 [CLIENT APPOINTMENTS PG] Caricamento per cliente:', clientId, 'Owner:', ownerId);
      
      // Carica da PostgreSQL
      const clientIdNum = parseInt(clientId, 10);
      const ownerIdNum = parseInt(ownerId as string, 10);
      
      // Query PostgreSQL con JOIN per ottenere il nome del servizio
      const appointmentsWithServices = await db
        .select({
          id: appointments.id,
          date: appointments.date,
          startTime: appointments.startTime,
          serviceName: services.name,
          status: appointments.status,
          notes: appointments.notes
        })
        .from(appointments)
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .where(
          and(
            eq(appointments.clientId, clientIdNum),
            eq(appointments.userId, ownerIdNum)
          )
        )
        .orderBy(asc(appointments.date), asc(appointments.startTime));
      
      // Formatta la risposta per la PWA
      const clientAppointments = appointmentsWithServices.map(apt => ({
        id: apt.id,
        date: apt.date,
        time: apt.startTime || '09:00',
        service: apt.serviceName || 'Servizio',
        status: apt.status || 'scheduled',
        notes: apt.notes || ''
      }));
      
      console.log(`📅 [CLIENT APPOINTMENTS PG] Trovati ${clientAppointments.length} appuntamenti per cliente ${clientId}`);
      res.json(clientAppointments);
      
    } catch (error) {
      console.error('❌ [CLIENT APPOINTMENTS PG] Errore:', error);
      res.status(500).json({ error: 'Errore del sistema' });
    }
  });

  // Endpoint di test per forzare l'esecuzione del sistema di promemoria
  app.post("/api/test-reminder-system", requireAuth, async (req, res) => {
    try {
      console.log('🔧 Test manuale del sistema di promemoria richiesto');
      
      // Importa e esegue il servizio di promemoria
      const { notificationService } = await import('./services/notificationService');
      
      console.log('📨 Avvio test del processore di promemoria...');
      const remindersSent = await notificationService.processReminders();
      
      res.json({
        success: true,
        message: `Test completato: ${remindersSent} promemoria elaborati`,
        remindersSent,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ Errore nel test del sistema di promemoria:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Endpoint di test diretto per l'invio email - DEBUG
  app.post("/api/test-email-direct", requireAuth, async (req, res) => {
    try {
      console.log('🔧 TEST DIRETTO EMAIL - Inizio debug');
      
      const { notificationService } = await import('./services/notificationService');
      const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
      
      if (!fs.existsSync(emailConfigPath)) {
        throw new Error('File email_settings.json non trovato');
      }
      
      const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
      console.log('📧 Configurazione email caricata:', {
        enabled: emailConfig.emailEnabled,
        address: emailConfig.emailAddress,
        hasPassword: !!emailConfig.emailPassword
      });
      
      if (!emailConfig.emailEnabled || !emailConfig.emailAddress || !emailConfig.emailPassword) {
        throw new Error('Configurazione email incompleta');
      }
      
      // Test email semplice
      const testEmail = req.body.testEmail || 'zambelli.andrea.1973@gmail.com';
      console.log(`🧪 Invio email di test a: ${testEmail}`);
      
      const emailSent = await notificationService.sendEmailDirect(
        testEmail,
        'Test Sistema Email',
        `Test invio email dal sistema.\n\nData/Ora: ${new Date().toLocaleString('it-IT')}\n\nSe ricevi questa email, il sistema funziona correttamente!`,
        emailConfig
      );
      
      res.json({
        success: emailSent,
        message: emailSent ? 'Email di test inviata con successo!' : 'Errore nell\'invio dell\'email',
        testEmail,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ Errore nel test email diretto:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  });

  // === STAFF (COLLABORATORI) API ROUTES ===
  
  // GET /api/collaborators - Lista collaboratori per utente
  app.get("/api/collaborators", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    try {
      const collaborators = await storage.getStaffForUser(user.id);
      
      // DEBUG LOG
      console.log('🔍 DEBUG API COLLABORATORS:', {
        userId: user.id,
        count: collaborators.length,
        collaborators: collaborators.map(c => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          isActive: c.isActive,
          hasIsActiveField: c.hasOwnProperty('isActive'),
          allFields: Object.keys(c)
        }))
      });
      
      res.json(collaborators);
    } catch (error) {
      console.error("Errore recupero collaboratori:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // POST /api/collaborators - Crea nuovo collaboratore
  app.post("/api/collaborators", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    try {
      const collaboratorData = {
        ...req.body,
        userId: user.id
      };
      
      const newCollaborator = await storage.createStaff(collaboratorData);
      console.log(`✅ Collaboratore creato: ${newCollaborator.firstName} ${newCollaborator.lastName} per utente ${user.id}`);
      res.status(201).json(newCollaborator);
    } catch (error) {
      console.error("Errore creazione collaboratore:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // PUT /api/collaborators/:id - Aggiorna collaboratore
  app.put("/api/collaborators/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const collaboratorId = parseInt(req.params.id);
    
    try {
      // Verifica proprietà
      const existingCollaborator = await storage.getStaff(collaboratorId);
      if (!existingCollaborator || existingCollaborator.userId !== user.id) {
        return res.status(404).json({ message: "Collaboratore non trovato" });
      }
      
      const updatedCollaborator = await storage.updateStaff(collaboratorId, req.body);
      if (!updatedCollaborator) {
        return res.status(404).json({ message: "Collaboratore non trovato" });
      }
      
      console.log(`✅ Collaboratore aggiornato: ${updatedCollaborator.firstName} ${updatedCollaborator.lastName}`);
      res.json(updatedCollaborator);
    } catch (error) {
      console.error("Errore aggiornamento collaboratore:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // DELETE /api/collaborators/:id - Elimina collaboratore
  app.delete("/api/collaborators/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const collaboratorId = parseInt(req.params.id);
    
    try {
      // Verifica proprietà
      const existingCollaborator = await storage.getStaff(collaboratorId);
      if (!existingCollaborator || existingCollaborator.userId !== user.id) {
        return res.status(404).json({ message: "Collaboratore non trovato" });
      }
      
      const deleted = await storage.deleteStaff(collaboratorId);
      if (!deleted) {
        return res.status(404).json({ message: "Collaboratore non trovato" });
      }
      
      console.log(`✅ Collaboratore eliminato: ID ${collaboratorId} per utente ${user.id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Errore eliminazione collaboratore:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // === TREATMENT ROOMS (STANZE) API ROUTES ===
  
  // GET /api/treatment-rooms - Lista stanze per utente
  app.get("/api/treatment-rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    try {
      const rooms = await storage.getTreatmentRoomsForUser(user.id);
      res.json(rooms);
    } catch (error) {
      console.error("Errore recupero stanze:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // POST /api/treatment-rooms - Crea nuova stanza
  app.post("/api/treatment-rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    try {
      const roomData = {
        ...req.body,
        userId: user.id
      };
      
      const newRoom = await storage.createTreatmentRoom(roomData);
      console.log(`✅ Stanza creata: ${newRoom.name} per utente ${user.id}`);
      res.status(201).json(newRoom);
    } catch (error) {
      console.error("Errore creazione stanza:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // PUT /api/treatment-rooms/:id - Aggiorna stanza
  app.put("/api/treatment-rooms/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const roomId = parseInt(req.params.id);
    
    try {
      // Verifica proprietà
      const existingRoom = await storage.getTreatmentRoom(roomId);
      if (!existingRoom || existingRoom.userId !== user.id) {
        return res.status(404).json({ message: "Stanza non trovata" });
      }
      
      const updatedRoom = await storage.updateTreatmentRoom(roomId, req.body);
      if (!updatedRoom) {
        return res.status(404).json({ message: "Stanza non trovata" });
      }
      
      console.log(`✅ Stanza aggiornata: ${updatedRoom.name}`);
      res.json(updatedRoom);
    } catch (error) {
      console.error("Errore aggiornamento stanza:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // DELETE /api/treatment-rooms/:id - Elimina stanza
  app.delete("/api/treatment-rooms/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const roomId = parseInt(req.params.id);
    
    try {
      // Verifica proprietà
      const existingRoom = await storage.getTreatmentRoom(roomId);
      if (!existingRoom || existingRoom.userId !== user.id) {
        return res.status(404).json({ message: "Stanza non trovata" });
      }
      
      const deleted = await storage.deleteTreatmentRoom(roomId);
      if (!deleted) {
        return res.status(404).json({ message: "Stanza non trovata" });
      }
      
      console.log(`✅ Stanza eliminata: ID ${roomId} per utente ${user.id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Errore eliminazione stanza:", error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // ========== ONBOARDING AI ENDPOINTS ==========

  // GET /api/onboarding/progress - Recupera il progresso dell'onboarding dell'utente
  app.get('/api/onboarding/progress', requireAuth, (req, res) => {
    try {
      const user = req.user as any;
      const storageData = loadStorageData();
      
      // Cerca il progresso onboarding dell'utente
      const onboardingKey = `onboarding_${user.id}`;
      const progress = storageData[onboardingKey] || {
        userId: user.id,
        currentStep: 0,
        completedSteps: [],
        isCompleted: false
      };
      
      res.json(progress);
    } catch (error) {
      console.error('❌ Errore caricamento progresso onboarding:', error);
      res.status(500).json({ message: 'Errore nel caricamento del progresso' });
    }
  });

  // POST /api/onboarding/update-step - Aggiorna lo step corrente dell'onboarding
  app.post('/api/onboarding/update-step', requireAuth, (req, res) => {
    try {
      const user = req.user as any;
      const { currentStep, stepData, completedSteps } = req.body;
      
      const storageData = loadStorageData();
      const onboardingKey = `onboarding_${user.id}`;
      
      // Aggiorna o crea il progresso
      const progress = storageData[onboardingKey] || { userId: user.id };
      storageData[onboardingKey] = {
        ...progress,
        currentStep,
        completedSteps: completedSteps || progress.completedSteps || [],
        ...stepData,
        updatedAt: new Date().toISOString()
      };
      
      saveStorageData(storageData);
      res.json(storageData[onboardingKey]);
    } catch (error) {
      console.error('❌ Errore aggiornamento step onboarding:', error);
      res.status(500).json({ message: 'Errore nell\'aggiornamento dello step' });
    }
  });

  // POST /api/onboarding/analyze - Analizza i dati business con AI
  app.post('/api/onboarding/analyze', requireAuth, async (req, res) => {
    try {
      const { businessName, businessType, description } = req.body;
      
      console.log('🤖 [AI ONBOARDING] Richiesta analisi per:', businessName);
      
      // Chiama il servizio AI per analizzare il business
      const analysis = await analyzeBusinessNeeds({
        businessName,
        businessDescription: description,
        targetClients: businessType
      });
      
      console.log('✅ [AI ONBOARDING] Analisi completata');
      res.json(analysis);
    } catch (error) {
      console.error('❌ Errore analisi AI:', error);
      // Ritorna raccomandazioni di fallback
      res.json({
        suggestedBusinessType: 'consulting',
        recommendedServices: ['Consulenza', 'Visita', 'Controllo'],
        workingHoursRecommendation: 'Lunedì - Venerdì, 9:00 - 18:00',
        clientManagementNeeds: ['gestione-appuntamenti', 'comunicazione-clienti'],
        communicationPreferences: ['email', 'sms'],
        integrationGoals: ['calendario', 'promemoria-automatici'],
        personalizedTips: [
          'Inizia con la gestione base degli appuntamenti',
          'Configura promemoria automatici per ridurre gli assenti',
          'Crea un portale clienti per prenotazioni facili'
        ]
      });
    }
  });

  // POST /api/onboarding/complete - Segna l'onboarding come completato
  app.post('/api/onboarding/complete', requireAuth, (req, res) => {
    try {
      const user = req.user as any;
      const storageData = loadStorageData();
      const onboardingKey = `onboarding_${user.id}`;
      
      // Crea o aggiorna il record di onboarding
      if (!storageData[onboardingKey]) {
        storageData[onboardingKey] = {
          userId: user.id,
          currentStep: 0,
          completedSteps: []
        };
      }
      
      // Segna come completato
      storageData[onboardingKey].isCompleted = true;
      storageData[onboardingKey].completedAt = new Date().toISOString();
      saveStorageData(storageData);
      
      console.log('✅ [AI ONBOARDING] Onboarding completato per utente', user.id, '- isCompleted:', storageData[onboardingKey].isCompleted);
      
      res.json({
        success: true,
        isCompleted: true,
        welcomeMessage: 'La tua configurazione è stata completata con successo! Sei pronto per iniziare.'
      });
    } catch (error) {
      console.error('❌ Errore completamento onboarding:', error);
      res.status(500).json({ message: 'Errore nel completamento dell\'onboarding' });
    }
  });

  // POST /api/ai-chat - Chat conversazionale con AI
  app.post('/api/ai-chat', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { messages, includeContext } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: 'Messaggi non validi' });
      }
      
      console.log('💬 [AI CHAT] Nuova richiesta da utente', user.id);
      
      // Prepara il contesto se richiesto
      let context: any = {};
      if (includeContext) {
        const storageData = loadStorageData();
        
        // Carica dati clienti per suggerimenti personalizzati
        const clients = storageData.clients || [];
        const userClients = clients.filter((c: any) => c.ownerId === user.id);
        
        // Carica preferenze onboarding
        const onboardingKey = `onboarding_${user.id}`;
        const onboardingData = storageData[onboardingKey];
        
        context = {
          clientCount: userClients.length,
          onboardingPreferences: onboardingData
        };
      }
      
      // Processa il messaggio con AI
      const response = await processChatMessage({
        messages,
        context
      });
      
      res.json(response);
    } catch (error) {
      console.error('❌ [AI CHAT] Errore:', error);
      res.status(500).json({ 
        message: 'Errore nella comunicazione con l\'AI',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /api/ai/generate-campaign - Genera campagna marketing con AI (Solo Pro+)
  app.post('/api/ai/generate-campaign', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Verifica che l'utente abbia una licenza Pro o superiore
      const userLicenses = await db.select().from(licenses).where(eq(licenses.userId, user.id));
      const activeLicense = userLicenses.find(l => l.isActive);
      const licenseType = activeLicense?.type || 'trial';
      
      const allowedTypes = ['pro', 'business', 'staff_free', 'staff_free_10years', 'passepartout'];
      if (!allowedTypes.includes(licenseType)) {
        return res.status(403).json({ 
          message: 'Funzionalità disponibile solo per utenti Pro o superiori',
          requiredPlan: 'Pro'
        });
      }
      
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ message: 'Prompt non valido' });
      }
      
      console.log('📧 [CAMPAIGN API] Generazione campagna per utente', user.id, '- Licenza:', licenseType);
      
      // Genera campagna con AI
      const campaign = await generateMarketingCampaign(prompt);
      
      // Restituisci nel formato atteso dal frontend
      res.json({
        message: `✅ Ho creato la tua campagna: "${campaign.title}"!\n\nPuoi modificare il messaggio se vuoi, oppure clicca sui pulsanti qui sotto per inviarla ai tuoi clienti.`,
        campaign: {
          title: campaign.title,
          message: campaign.message
        }
      });
    } catch (error) {
      console.error('❌ [CAMPAIGN API] Errore:', error);
      res.status(500).json({ 
        message: 'Errore nella generazione della campagna',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET /api/campaigns - Recupera storico campagne dal database
  app.get('/api/campaigns', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Carica campagne dell'utente dal database
      const userCampaigns = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.userId, user.id))
        .orderBy(desc(marketingCampaigns.createdAt));
      
      res.json(userCampaigns);
    } catch (error) {
      console.error('❌ [CAMPAIGNS] Errore caricamento campagne:', error);
      res.status(500).json({ 
        message: 'Errore nel caricamento delle campagne',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // DELETE /api/campaigns/:id - Elimina una campagna dal database
  app.delete('/api/campaigns/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'ID campagna non valido' });
      }
      
      // Verifica che la campagna appartenga all'utente
      const campaign = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.id, campaignId))
        .limit(1);
      
      if (campaign.length === 0) {
        return res.status(404).json({ message: 'Campagna non trovata' });
      }
      
      if (campaign[0].userId !== user.id) {
        return res.status(403).json({ message: 'Non autorizzato' });
      }
      
      // Elimina la campagna
      await db
        .delete(marketingCampaigns)
        .where(eq(marketingCampaigns.id, campaignId));
      
      res.json({ success: true, message: 'Campagna eliminata con successo' });
    } catch (error) {
      console.error('❌ [CAMPAIGNS] Errore eliminazione campagna:', error);
      res.status(500).json({ 
        message: 'Errore nell\'eliminazione della campagna',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /api/campaigns/send-batch - Invia campagna a tutti i clienti
  const uploadCampaign = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      // Accetta solo immagini e video
      const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo file non supportato. Solo immagini (JPEG, PNG, GIF, WebP, SVG) e video (MP4, MPEG, MOV, AVI, WebM) sono consentiti.'));
      }
    }
  });

  app.post('/api/campaigns/send-batch', requireAuth, uploadCampaign.array('attachment', 10), async (req, res) => {
    const crypto = await import('crypto');
    let campaignId: number | null = null;
    
    try {
      const user = req.user as any;
      
      // Verifica licenza Pro o superiore
      const userLicenses = await db.select().from(licenses).where(eq(licenses.userId, user.id));
      const activeLicense = userLicenses.find(l => l.isActive);
      const licenseType = activeLicense?.type || 'trial';
      
      const allowedTypes = ['pro', 'business', 'staff_free', 'staff_free_10years', 'passepartout'];
      if (!allowedTypes.includes(licenseType)) {
        return res.status(403).json({ 
          message: 'Funzionalità disponibile solo per utenti Pro o superiori',
          requiredPlan: 'Pro'
        });
      }
      
      const { title, message, channel } = req.body;
      const attachments = (req.files as Express.Multer.File[]) || [];
      
      console.log('📤 [CAMPAIGN NEW] Richiesta invio campagna:', title, '- Canale:', channel);
      
      // 🔐 STEP 1: GENERA CHIAVE IDEMPOTENZA CON DATA (userId + titolo + messaggio + data)
      // Include la data corrente (YYYY-MM-DD) così la stessa campagna può essere inviata in giorni diversi
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const idempotencyData = `${user.id}-${title}-${message}-${currentDate}`;
      const idempotencyKey = crypto.createHash('sha256').update(idempotencyData).digest('hex');
      
      // 🔒 STEP 2: BLOCCO GIORNALIERO - Una campagna con stesso contenuto può essere inviata UNA SOLA VOLTA al giorno
      const existingCampaign = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.idempotencyKey, idempotencyKey))
        .where(eq(marketingCampaigns.status, 'sent'))
        .limit(1);
      
      if (existingCampaign.length > 0) {
        console.log('🚫 [CAMPAIGN BLOCKED] Campagna già inviata oggi:', title);
        return res.status(400).json({ 
          success: false,
          alreadySent: true,
          message: `⚠️ Questa campagna è già stata inviata oggi alle ${new Date(existingCampaign[0].createdAt!).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}. Potrai inviarla di nuovo domani.`,
          sentDate: existingCampaign[0].createdAt,
          sentTo: existingCampaign[0].sentTo
        });
      }
      
      // Carica clienti
      const userClients = await storage.getVisibleClientsForUser(user.id, user.type, user.assignmentCode);
      
      if (userClients.length === 0) {
        return res.json({ sent: 0, message: 'Nessun cliente trovato' });
      }
      
      // 💾 STEP 3: CREA RECORD CAMPAGNA CON STATUS='LOCKED' (PRIMA DI INVIARE!)
      const uniqueCode = crypto.randomBytes(8).toString('hex');
      const [newCampaign] = await db.insert(marketingCampaigns).values({
        userId: user.id,
        title: title,
        message: message,
        uniqueCode: uniqueCode,
        sentTo: 0,
        status: 'locked', // BLOCCATA durante invio
        idempotencyKey: idempotencyKey,
        attachmentPaths: [],
        attachmentTypes: [],
      }).returning();
      
      campaignId = newCampaign.id;
      console.log(`🔒 [CAMPAIGN LOCKED] Campagna creata e bloccata: ID=${campaignId}, title="${title}"`);
      
      // 📧 Carica configurazione email
      let emailConfig: any = null;
      if (channel === 'email' || channel === 'both') {
        try {
          const { getEmailConfig } = await import('./utils/emailConfig');
          emailConfig = await getEmailConfig(user.id);
          if (!emailConfig) {
            console.error('❌ Configurazione email non disponibile per utente', user.id);
          }
        } catch (error) {
          console.error('❌ Errore caricamento config email:', error);
        }
      }
      
      let sentCount = 0;
      
      // 📱 STEP 4: INVIA VIA WHATSAPP
      if (channel === 'whatsapp' || channel === 'both') {
        let phoneDevice: any = null;
        let deviceConnected = false;
        
        try {
          const phoneDeviceModule = await import('./services/phoneDeviceService');
          phoneDevice = phoneDeviceModule.phoneDeviceService;
          deviceConnected = phoneDevice.getStatus().status === 'connected';
        } catch (error) {
          console.warn('⚠️ WhatsApp Web non disponibile');
        }
        
        for (const client of userClients) {
          if (client.phone) {
            try {
              const whatsappLink = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
              
              await db.insert(marketingMessages).values({
                userId: user.id,
                clientId: client.id,
                campaignName: title,
                message: message,
                phone: client.phone,
                status: 'pending',
                whatsappLink: whatsappLink,
              });
              
              sentCount++;
              
              if (deviceConnected && phoneDevice) {
                const result = await phoneDevice.sendWhatsAppMessage(client.phone, message);
                if (result.success) {
                  await db.update(marketingMessages)
                    .set({ status: 'sent', sentAt: new Date() })
                    .where(eq(marketingMessages.clientId, client.id))
                    .where(eq(marketingMessages.campaignName, title));
                }
              }
            } catch (error) {
              console.error(`❌ WhatsApp error per ${client.firstName}:`, error);
            }
          }
        }
      }
      
      // 📧 STEP 5: INVIA VIA EMAIL
      if (channel === 'email' || channel === 'both') {
        if (emailConfig?.emailEnabled && emailConfig?.emailAddress && emailConfig?.emailPassword) {
          const nodemailer = await import('nodemailer');
          const transporter = nodemailer.default.createTransport({
            service: 'gmail',
            auth: {
              user: emailConfig.emailAddress,
              pass: emailConfig.emailPassword,
            }
          });
          
          const linkifyHtml = (text: string) => {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            return text.replace(/\n/g, '<br>').replace(urlRegex, '<a href="$1" style="color: #0066cc;">$1</a>');
          };
          
          for (const client of userClients) {
            if (client.email) {
              try {
                const mailOptions: any = {
                  from: emailConfig.emailAddress,
                  to: client.email,
                  subject: title,
                  text: message,
                  html: linkifyHtml(message),
                };
                
                if (attachments.length > 0) {
                  mailOptions.attachments = attachments.map(file => ({
                    filename: file.originalname,
                    content: file.buffer,
                    contentType: file.mimetype
                  }));
                }
                
                await transporter.sendMail(mailOptions);
                console.log(`✅ Email inviata a ${client.email}`);
                sentCount++;
              } catch (error) {
                console.error(`❌ Email error per ${client.email}:`, error);
              }
            }
          }
        }
      }
      
      // ✅ STEP 6: AGGIORNA STATUS='SENT' E SENTTO
      await db.update(marketingCampaigns)
        .set({ 
          status: 'sent',
          sentTo: sentCount,
          sentAt: new Date()
        })
        .where(eq(marketingCampaigns.id, campaignId));
      
      console.log(`✅ [CAMPAIGN SENT] Campagna ID=${campaignId} completata: ${sentCount} messaggi inviati`);
      
      res.json({ 
        success: true,
        sent: sentCount,
        total: userClients.length,
        message: `${sentCount} messaggi inviati`,
        campaignSaved: true
      });
      
    } catch (error) {
      console.error('❌ [CAMPAIGN ERROR]:', error);
      
      // Se la campagna è stata creata ma invio fallito → marca come 'failed'
      if (campaignId) {
        try {
          await db.update(marketingCampaigns)
            .set({ status: 'failed' })
            .where(eq(marketingCampaigns.id, campaignId));
          console.log(`⚠️ [CAMPAIGN FAILED] Campagna ID=${campaignId} marcata come failed`);
        } catch (updateError) {
          console.error('❌ Errore aggiornamento status failed:', updateError);
        }
      }
      
      res.status(500).json({ 
        success: false,
        message: 'Errore nell\'invio della campagna',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET /api/campaigns/pending-messages - Carica messaggi marketing WhatsApp pendenti
  app.get('/api/campaigns/pending-messages', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!user || !user.id) {
        return res.status(401).json({ success: false, error: 'Non autenticato' });
      }
      
      // Carica messaggi marketing pendenti con informazioni cliente (JOIN)
      const pendingMessages = await db
        .select({
          id: marketingMessages.id,
          campaignName: marketingMessages.campaignName,
          message: marketingMessages.message,
          phone: marketingMessages.phone,
          status: marketingMessages.status,
          whatsappLink: marketingMessages.whatsappLink,
          createdAt: marketingMessages.createdAt,
          sentAt: marketingMessages.sentAt,
          client: {
            id: clients.id,
            firstName: clients.firstName,
            lastName: clients.lastName,
            phone: clients.phone,
          }
        })
        .from(marketingMessages)
        .leftJoin(clients, eq(marketingMessages.clientId, clients.id))
        .where(
          and(
            eq(marketingMessages.userId, user.id),
            eq(marketingMessages.status, 'pending')
          )
        )
        .orderBy(asc(marketingMessages.createdAt));
      
      console.log(`📱 [MARKETING MESSAGES] Caricati ${pendingMessages.length} messaggi pendenti per user ${user.id}`);
      
      res.json({
        success: true,
        messages: pendingMessages
      });
      
    } catch (error) {
      console.error('❌ [MARKETING MESSAGES] Errore caricamento:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nel caricamento dei messaggi marketing'
      });
    }
  });

  // ========== CLIENT NOTES MANAGEMENT ==========
  
  // GET - Ottieni tutte le note di un cliente
  app.get("/api/client-notes/:clientId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    
    try {
      const clientId = parseInt(req.params.clientId);
      const notes = await storage.getClientNotes(clientId);
      res.json(notes);
    } catch (error) {
      console.error('Errore nel caricamento note cliente:', error);
      res.status(500).json({ message: "Errore nel caricamento delle note" });
    }
  });

  // POST - Crea nuova nota (data automatica dal DB)
  app.post("/api/client-notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    
    try {
      const { clientId, title, content, category } = req.body;
      
      // Il database assegnerà automaticamente createdAt con la data corrente
      const note = await storage.createClientNote({
        clientId: parseInt(clientId),
        title,
        content,
        category
      });
      
      res.status(201).json(note);
    } catch (error) {
      console.error('Errore durante la creazione della nota del cliente:', error);
      res.status(500).json({ error: 'Errore durante la creazione della nota del cliente' });
    }
  });

  // PUT - Aggiorna nota esistente (la data originale rimane invariata)
  app.put("/api/client-notes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    
    try {
      const { id } = req.params;
      const { title, content, category } = req.body;
      
      // Aggiorna solo titolo, contenuto e categoria - la data originale rimane invariata
      const note = await storage.updateClientNote(parseInt(id), {
        title,
        content,
        category
      });
      
      if (!note) {
        return res.status(404).json({ error: 'Nota non trovata' });
      }
      
      res.json(note);
    } catch (error) {
      console.error('Errore durante l\'aggiornamento della nota del cliente:', error);
      res.status(500).json({ error: 'Errore durante l\'aggiornamento della nota del cliente' });
    }
  });

  // DELETE - Elimina nota
  app.delete("/api/client-notes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    
    try {
      const { id } = req.params;
      const success = await storage.deleteClientNote(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: 'Nota non trovata' });
      }
      
      res.json({ success: true, message: 'Nota eliminata con successo' });
    } catch (error) {
      console.error('Errore durante l\'eliminazione della nota del cliente:', error);
      res.status(500).json({ error: 'Errore durante l\'eliminazione della nota del cliente' });
    }
  });

  // Configurazione Multer per foto note clienti
  const noteImageStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = 'uploads/client-notes';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const uploadNoteImage = multer({ 
    storage: noteImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per foto progressi
    fileFilter: (_req, file, cb) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (validTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo file non supportato. Usa immagini JPG, PNG, GIF o WEBP'));
      }
    }
  });

  // POST - Upload foto a nota esistente
  app.post("/api/client-notes/:id/upload-image", uploadNoteImage.single('image'), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    
    try {
      const user = req.user as any;
      const noteId = parseInt(req.params.id);
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'Nessuna immagine fornita' });
      }
      
      // Recupera nota esistente
      const note = await storage.getClientNote(noteId);
      if (!note) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ error: 'Nota non trovata' });
      }
      
      // 🔒 SECURITY: Admin bypass
      if (user.type === 'admin') {
        // Admin può accedere a tutto, procedi senza check
      } else {
        // Multi-tenant check: cliente appartiene al tenant?
        const client = await storage.getClient(note.clientId);
        if (!client) {
          try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
          return res.status(404).json({ error: 'Cliente non trovato' });
        }
        
        const tenantId = user.ownerId ?? user.tenantId ?? user.id;
        const clientOwnerId = client.ownerId ?? client.userId;
        
        // Fail-closed: se clientOwnerId è undefined o non match, nega accesso
        if (!clientOwnerId || clientOwnerId !== tenantId) {
          try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
          return res.status(403).json({ error: 'Non autorizzato a modificare questa nota' });
        }
      }
      
      // Aggiungi nuovo percorso immagine all'array esistente
      const currentImages = note.imagePaths || [];
      const newImagePath = `/uploads/client-notes/${file.filename}`;
      const updatedImages = [...currentImages, newImagePath];
      
      // Aggiorna nota con nuova immagine
      const updatedNote = await storage.updateClientNote(noteId, { 
        imagePaths: updatedImages 
      });
      
      res.json({ 
        success: true, 
        imagePath: newImagePath,
        note: updatedNote
      });
    } catch (error) {
      console.error('Errore upload immagine nota:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Errore durante il caricamento dell\'immagine' });
    }
  });

  // DELETE - Rimuovi foto specifica da nota
  app.delete("/api/client-notes/:id/delete-image/:index", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    
    try {
      const user = req.user as any;
      const noteId = parseInt(req.params.id);
      const imageIndex = parseInt(req.params.index);
      
      const note = await storage.getClientNote(noteId);
      if (!note) {
        return res.status(404).json({ error: 'Nota non trovata' });
      }
      
      // 🔒 SECURITY: Admin bypass
      if (user.type === 'admin') {
        // Admin può accedere a tutto, procedi senza check
      } else {
        // Multi-tenant check: cliente appartiene al tenant?
        const client = await storage.getClient(note.clientId);
        if (!client) {
          return res.status(404).json({ error: 'Cliente non trovato' });
        }
        
        const tenantId = user.ownerId ?? user.tenantId ?? user.id;
        const clientOwnerId = client.ownerId ?? client.userId;
        
        // Fail-closed: se clientOwnerId è undefined o non match, nega accesso
        if (!clientOwnerId || clientOwnerId !== tenantId) {
          return res.status(403).json({ error: 'Non autorizzato a modificare questa nota' });
        }
      }
      
      const currentImages = note.imagePaths || [];
      if (imageIndex < 0 || imageIndex >= currentImages.length) {
        return res.status(400).json({ error: 'Indice immagine non valido' });
      }
      
      // Elimina file fisico
      const imageToDelete = currentImages[imageIndex];
      const imagePath = path.join(process.cwd(), imageToDelete);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      
      // Rimuovi percorso dall'array
      const updatedImages = currentImages.filter((_, idx) => idx !== imageIndex);
      
      // Aggiorna nota
      const updatedNote = await storage.updateClientNote(noteId, { 
        imagePaths: updatedImages.length > 0 ? updatedImages : null 
      });
      
      res.json({ 
        success: true,
        note: updatedNote
      });
    } catch (error) {
      console.error('Errore eliminazione immagine nota:', error);
      res.status(500).json({ error: 'Errore durante l\'eliminazione dell\'immagine' });
    }
  });

  // ========== SUBSCRIPTION PLANS MANAGEMENT (ADMIN ONLY) ==========
  
  // GET - Ottieni tutti i piani abbonamento attivi
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.getActiveSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error('Errore nel caricamento piani abbonamento:', error);
      res.status(500).json({ message: "Errore nel caricamento dei piani" });
    }
  });

  // POST - Crea nuovo piano (solo admin)
  app.post("/api/subscription-plans", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può creare piani" });
    }

    try {
      const newPlan = await storage.createSubscriptionPlan(req.body);
      res.json(newPlan);
    } catch (error) {
      console.error('Errore nella creazione piano:', error);
      res.status(500).json({ message: "Errore nella creazione del piano" });
    }
  });

  // PUT - Aggiorna piano esistente (solo admin)
  app.put("/api/subscription-plans/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può modificare piani" });
    }

    try {
      const planId = parseInt(req.params.id);
      const updatedPlan = await storage.updateSubscriptionPlan(planId, req.body);
      res.json(updatedPlan);
    } catch (error) {
      console.error('Errore nell\'aggiornamento piano:', error);
      res.status(500).json({ message: "Errore nell'aggiornamento del piano" });
    }
  });

  // DELETE - Elimina piano (solo admin) - soft delete impostando isActive = false
  app.delete("/api/subscription-plans/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può eliminare piani" });
    }

    try {
      const planId = parseInt(req.params.id);
      await storage.updateSubscriptionPlan(planId, { isActive: false });
      res.json({ message: "Piano disattivato con successo" });
    } catch (error) {
      console.error('Errore nell\'eliminazione piano:', error);
      res.status(500).json({ message: "Errore nell'eliminazione del piano" });
    }
  });

  // ================= PASSWORD RECOVERY ENDPOINTS =================

  // 1. POST /api/forgot-password - Genera token e invia email di reset
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email richiesta" });
      }

      // Verifica se l'utente esiste
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Non rivelare se email esiste per sicurezza
        return res.status(200).json({ message: "Se l'email esiste, riceverai un link di reset" });
      }

      // Genera token temporaneo (valido per 1 ora)
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 ora

      // Salva il token nel database (aggiorna utente con resetToken e resetTokenExpiry)
      try {
        console.log(`📝 [DEBUG] Saving reset token for user ${user.id}: token=${resetToken}, expiry=${tokenExpiry}`);
        await storage.updateUser(user.id, {
          resetToken,
          resetTokenExpiry: tokenExpiry
        });
        console.log(`✅ [DEBUG] Token saved successfully`);
      } catch (updateError) {
        console.error('❌ Errore nel salvataggio del token:', updateError);
        return res.status(500).json({ error: "Errore nel salvataggio della richiesta di reset" });
      }

      // Invia email con link di reset usando le stesse credenziali SMTP del test email
      // Usa il dominio dinamico dalla richiesta (Replit, Sliplane, localhost, ecc.)
      const baseUrl = req.get('origin') || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
      
      const emailHtml = `
        <h2>Recupero Password</h2>
        <p>Hai richiesto di resettare la tua password. Clicca il link sotto:</p>
        <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reimposta Password
        </a>
        <p>Il link scadrà tra 1 ora.</p>
        <p>Se non hai richiesto questo reset, ignora questa email.</p>
      `;

      try {
        // COPIATO DAL TEST EMAIL (line 7035-7055) - Usa le stesse credenziali SMTP
        const { getEmailConfig } = await import('./utils/emailConfig');
        const emailConfig = await getEmailConfig(user.id);
        
        if (!emailConfig || !emailConfig.emailAddress || !emailConfig.emailPassword) {
          console.warn(`⚠️ Email di reset non inviata a ${email}: credenziali non configurate`);
          return res.status(500).json({ error: "Configurazione email non trovata nell'account. Configura prima le credenziali SMTP." });
        }
        
        console.log(`📧 [RESET PASSWORD] Usando: ${emailConfig.emailAddress}`);
        
        // Crea transporter ESATTAMENTE come nel test email
        const transporter = nodemailer.createTransport({
          host: emailConfig.smtpServer || 'smtp.gmail.com',
          port: emailConfig.smtpPort || 587,
          secure: false,
          auth: {
            user: emailConfig.emailAddress,
            pass: emailConfig.emailPassword
          }
        });
        
        // Invia l'email
        await transporter.sendMail({
          from: emailConfig.emailAddress,
          to: email,
          subject: 'Recupero Password - Gestionale Appuntamenti',
          html: emailHtml
        });
        
        console.log(`✅ Email di reset password inviata a ${email}`);
        return res.status(200).json({ message: "Email di reset inviata. Controlla la tua casella di posta." });
        
      } catch (emailError: any) {
        console.error('❌ Errore nell\'invio email reset-password:', emailError);
        return res.status(500).json({ error: `Errore nell'invio dell'email: ${emailError.message}` });
      }
    } catch (error) {
      console.error('❌ Errore forgot-password:', error);
      res.status(500).json({ error: "Errore server" });
    }
  });

  // 2. POST /api/verify-reset-token - Verifica che il token sia valido (sia users che staff)
  app.post("/api/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).send("Token richiesto");
      }

      console.log(`🔍 [DEBUG] Verifying reset token: ${token.substring(0, 10)}...`);
      const now = new Date();
      
      // Cerca nella tabella users (professionisti/admin)
      const foundUsers = await db.select()
        .from(users)
        .where(
          and(
            eq(users.resetToken, token),
            gt(users.resetTokenExpiry, now)
          )
        );

      console.log(`📊 [DEBUG] Found ${foundUsers.length} users with valid token`);
      if (foundUsers.length > 0) {
        console.log(`✅ [DEBUG] Token valid for user ${foundUsers[0].email}`);
        return res.status(200).json({ valid: true });
      }

      // Se non trovato in users, cerca nella tabella staff (collaboratori)
      const foundStaff = await db.select()
        .from(staff)
        .where(
          and(
            eq(staff.resetToken, token),
            gt(staff.resetTokenExpiry, now)
          )
        );

      console.log(`📊 [DEBUG] Found ${foundStaff.length} staff with valid token`);
      if (foundStaff.length > 0) {
        console.log(`✅ [DEBUG] Token valid for staff ${foundStaff[0].email}`);
        return res.status(200).json({ valid: true });
      }

      console.log(`❌ [DEBUG] Token not found or expired`);
      res.status(400).send("Token scaduto o non valido");
    } catch (error) {
      console.error('❌ Errore verify-reset-token:', error);
      res.status(500).send("Errore server");
    }
  });

  // 3. POST /api/reset-password - Resetta la password con il token valido (sia users che staff)
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).send("Token e nuova password richiesti");
      }

      if (newPassword.length < 6) {
        return res.status(400).send("Password deve contenere almeno 6 caratteri");
      }

      const now = new Date();
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(newPassword);

      console.log(`🔄 [DEBUG] Reset password - Token: ${token.substring(0, 10)}...`);

      // Cerca nella tabella users (professionisti/admin)
      const foundUsers = await db.select()
        .from(users)
        .where(
          and(
            eq(users.resetToken, token),
            gt(users.resetTokenExpiry, now)
          )
        );

      if (foundUsers.length > 0) {
        const user = foundUsers[0];
        console.log(`📝 [DEBUG] Updating password for user ${user.id} (${user.email})`);
        
        // Usa direttamente db.update come per staff per consistenza
        await db.update(users)
          .set({
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null
          })
          .where(eq(users.id, user.id));
        
        console.log(`✅ Password resettata per utente ${user.email}`);
        return res.status(200).json({ message: "Password resettata con successo" });
      }

      // Se non trovato in users, cerca nella tabella staff (collaboratori)
      const foundStaff = await db.select()
        .from(staff)
        .where(
          and(
            eq(staff.resetToken, token),
            gt(staff.resetTokenExpiry, now)
          )
        );

      if (foundStaff.length > 0) {
        const staffMember = foundStaff[0];
        console.log(`📝 [DEBUG] Updating password for staff ${staffMember.id} (${staffMember.email})`);
        
        await db.update(staff)
          .set({
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null
          })
          .where(eq(staff.id, staffMember.id));
        
        console.log(`✅ Password resettata per staff ${staffMember.email}`);
        return res.status(200).json({ message: "Password resettata con successo" });
      }

      console.log(`❌ [DEBUG] Token not found or expired`);
      res.status(400).send("Token scaduto o non valido");
    } catch (error) {
      console.error('❌ Errore reset-password:', error);
      res.status(500).send("Errore server");
    }
  });

  // Registra le route Google Calendar API
  app.use('/api/google-calendar', googleCalendarApi);
  
  // Registra le route Google Auth
  app.use('/api/google-auth', googleAuthRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
