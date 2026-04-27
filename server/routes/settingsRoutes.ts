// @ts-nocheck
import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { users, licenses, userIcons, companyNameSettings, userSettings as userSettingsTable, userLogins, contactSettings as contactSettingsTable } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';
import { requireAuth } from '../middleware/authMiddleware';
import { invalidateIconCache } from '../icon-proxy';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userAccessLocks = new Map<number, number>();

let defaultIconBase64 = '';
try {
  const iconPath = path.join(__dirname, '../../public/fleur-de-vie.jpg');
  const iconBuffer = fs.readFileSync(iconPath);
  defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
} catch (error: any) {
  try {
    const iconPathAlt = path.join(__dirname, '../../public/images/Fleur de Vie multicolore.jpg');
    const iconBuffer = fs.readFileSync(iconPathAlt);
    defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
  } catch (error2) {
    defaultIconBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzQjgyRjYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAySDE0VjRIMTJWMlpNMTIgMThIMTRWMjBIMTJWMThaTTIwIDEwSDE4VjEySDIwVjEwWk02IDEwSDRWMTJINlYxMFpNMTggMTBWMTJIMTZWMTBIMThaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
  }
}

const router = Router();

router.get("/api/contact-info", requireAuth, async (req, res) => {
    const user = req.user!;

    try {
      // Sorgente primaria: userSettings (PostgreSQL)
      const settings = await storage.getUserSettings(user.id);

      // Fallback 1: tabella contact_settings (popolata da onboarding/profilo)
      let contactRow: any = undefined;
      try {
        const [row] = await db
          .select()
          .from(contactSettingsTable)
          .where(eq(contactSettingsTable.tenantId, user.id));
        contactRow = row;
      } catch {
        contactRow = undefined;
      }

      // Fallback 2: legacy key/value storage (app_settings)
      let legacy: any = undefined;
      try {
        legacy = await storage.getContactInfo(user.id);
      } catch {
        legacy = undefined;
      }

      const phoneValue = settings?.contactPhone || contactRow?.phone || legacy?.phone1 || '';
      const emailValue = settings?.contactEmail || contactRow?.email || legacy?.email || '';

      const userContactInfo = {
        email: emailValue,
        phone: phoneValue,
        phone1: phoneValue,
        phone2: settings?.contactPhone2 || legacy?.phone2 || '',
        website: settings?.website || legacy?.website || '',
        instagram: settings?.instagramHandle || legacy?.instagram || '',
        facebook: settings?.facebookPage || ''
      };

      res.json(userContactInfo);
    } catch (error: any) {
      console.error('Errore caricamento contact-info:', error);
      res.json({
        email: '',
        phone: '',
        phone1: '',
        phone2: '',
        website: '',
        instagram: '',
        facebook: ''
      });
    }
  });

  // Endpoint per caricare informazioni di contatto tramite ownerId (per clienti)
router.get("/api/contact-info/:ownerId", async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      console.log(`Caricamento informazioni di contatto per professionista ${ownerId} (richiesta client)`);

      if (!ownerId || isNaN(ownerId)) {
        return res.status(400).json({ error: "ID professionista non valido" });
      }

      const settings = await storage.getUserSettings(ownerId);

      let contactRow: any = undefined;
      try {
        const [row] = await db
          .select()
          .from(contactSettingsTable)
          .where(eq(contactSettingsTable.tenantId, ownerId));
        contactRow = row;
      } catch {
        contactRow = undefined;
      }

      let legacy: any = undefined;
      try {
        legacy = await storage.getContactInfo(ownerId);
      } catch {
        legacy = undefined;
      }

      const phoneValue = settings?.contactPhone || contactRow?.phone || legacy?.phone1 || '';
      const emailValue = settings?.contactEmail || contactRow?.email || legacy?.email || '';

      const contactInfo = {
        email: emailValue,
        phone: phoneValue,
        phone1: phoneValue,
        phone2: settings?.contactPhone2 || legacy?.phone2 || '',
        website: settings?.website || legacy?.website || '',
        instagram: settings?.instagramHandle || legacy?.instagram || '',
        facebook: settings?.facebookPage || ''
      };

      res.json(contactInfo);
    } catch (error: any) {
      console.error('Errore nel caricamento informazioni di contatto:', error);
      res.status(500).json({ error: 'Errore del server' });
    }
  });

  // API per recuperare informazioni di contatto di un professionista specifico (per PWA clienti)
router.get('/api/owner-contact-info/:ownerId', async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (!ownerId) {
        return res.status(400).json({ error: 'ID proprietario non valido' });
      }
      
      // 🔄 USA POSTGRESQL: Carica da userSettings (sorgente primaria)
      const settings = await storage.getUserSettings(ownerId);

      // 🔄 FALLBACK 1: tabella contact_settings (popolata in onboarding/profilo)
      let contactRow: any = undefined;
      try {
        const [row] = await db
          .select()
          .from(contactSettingsTable)
          .where(eq(contactSettingsTable.tenantId, ownerId));
        contactRow = row;
      } catch (e) {
        contactRow = undefined;
      }

      // 🔄 FALLBACK 2: legacy key/value storage per dati storici non migrati
      let legacy: any = undefined;
      try {
        legacy = await storage.getContactInfo(ownerId);
      } catch {
        legacy = undefined;
      }

      // 🔄 FALLBACK 3: username come ultimo ripiego per businessName
      let userBusinessName = '';
      try {
        const [u] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, ownerId));
        userBusinessName = u?.username || '';
      } catch {
        userBusinessName = '';
      }

      const phoneValue = settings?.contactPhone || contactRow?.phone || legacy?.phone1 || '';
      const emailValue = settings?.contactEmail || contactRow?.email || legacy?.email || '';

      const contactInfo = {
        businessName:
          settings?.businessName ||
          contactRow?.businessName ||
          legacy?.businessName ||
          userBusinessName ||
          '',
        email: emailValue,
        phone: phoneValue,
        phone1: phoneValue,
        phone2: settings?.contactPhone2 || legacy?.phone2 || '',
        website: settings?.website || legacy?.website || '',
        instagram: settings?.instagramHandle || legacy?.instagram || '',
        facebook: settings?.facebookPage || ''
      };

      logger.debug(`🏥 [PWA CONTACTS] Informazioni di contatto richieste per professionista ${ownerId}:`, contactInfo);
      res.json(contactInfo);
    } catch (error: any) {
      console.error('Errore nel recupero informazioni contatto professionista:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Endpoint POST per salvare le informazioni di contatto
router.post("/api/contact-info", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const contactInfo = req.body;
      
      logger.debug(`📞 [CONTACT INFO] Salvataggio informazioni per utente ${user.id}:`, contactInfo);
      
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
      
      logger.debug(`✅ [CONTACT INFO] Informazioni salvate in PostgreSQL per utente ${user.id}`);
      
      res.json({ 
        success: true, 
        message: 'Informazioni di contatto salvate con successo',
        contactInfo: responseContactInfo
      });
      
    } catch (error: any) {
      console.error('❌ [ERRORE CONTACT INFO]:', error);
      res.status(500).json({ 
        error: 'Errore durante il salvataggio delle informazioni di contatto' 
      });
    }
  });

router.get("/api/working-hours", requireAuth, async (req, res) => {
    try {
      const user = req.user! as any;
      const settings = await storage.getUserSettings(user.id);
      res.json({
        workingHoursStart: settings?.workingHoursStart || "08:00",
        workingHoursEnd: settings?.workingHoursEnd || "22:00",
        workingDays: settings?.workingDays || ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        lunchBreakEnabled: settings?.lunchBreakEnabled || false,
        lunchBreakStart: settings?.lunchBreakStart || "13:00",
        lunchBreakEnd: settings?.lunchBreakEnd || "14:00",
        dailySchedule: (settings as any)?.dailySchedule || null,
        holidaysEnabled: (settings as any)?.holidaysEnabled || false,
        holidaysCountry: (settings as any)?.holidaysCountry || "IT",
      });
    } catch (error: any) {
      console.error('Errore caricamento orari di lavoro:', error);
      res.status(500).json({ error: 'Errore del server' });
    }
  });

router.post("/api/working-hours", requireAuth, async (req, res) => {
    try {
      const user = req.user! as any;
      const { workingHoursStart, workingHoursEnd, workingDays, lunchBreakEnabled, lunchBreakStart, lunchBreakEnd, holidaysEnabled, holidaysCountry, dailySchedule } = req.body;

      const timeRegex = /^\d{2}:\d{2}$/;
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const validCountries = ['IT', 'CH', 'US', 'DE', 'FR', 'ES', 'RU', 'NL', 'NO', 'RO'];

      const settingsUpdate: any = {};
      if (workingHoursStart !== undefined && timeRegex.test(workingHoursStart)) settingsUpdate.workingHoursStart = workingHoursStart;
      if (workingHoursEnd !== undefined && timeRegex.test(workingHoursEnd)) settingsUpdate.workingHoursEnd = workingHoursEnd;
      if (workingDays !== undefined && Array.isArray(workingDays) && workingDays.every((d: string) => validDays.includes(d))) settingsUpdate.workingDays = workingDays;
      if (lunchBreakEnabled !== undefined && typeof lunchBreakEnabled === 'boolean') settingsUpdate.lunchBreakEnabled = lunchBreakEnabled;
      if (lunchBreakStart !== undefined && timeRegex.test(lunchBreakStart)) settingsUpdate.lunchBreakStart = lunchBreakStart;
      if (lunchBreakEnd !== undefined && timeRegex.test(lunchBreakEnd)) settingsUpdate.lunchBreakEnd = lunchBreakEnd;
      if (holidaysEnabled !== undefined && typeof holidaysEnabled === 'boolean') settingsUpdate.holidaysEnabled = holidaysEnabled;
      if (holidaysCountry !== undefined && validCountries.includes(holidaysCountry)) settingsUpdate.holidaysCountry = holidaysCountry;
      if (dailySchedule !== undefined && typeof dailySchedule === 'object') settingsUpdate.dailySchedule = dailySchedule;

      if (Object.keys(settingsUpdate).length === 0) {
        return res.status(400).json({ error: 'Nessun dato valido fornito' });
      }

      await storage.updateUserSettings(user.id, settingsUpdate);
      res.json({ success: true, message: 'Orari di lavoro salvati con successo' });
    } catch (error: any) {
      console.error('Errore salvataggio orari di lavoro:', error);
      res.status(500).json({ error: 'Errore del server' });
    }
  });

router.post("/api/hide-welcome-guide", requireAuth, async (req, res) => {
    try {
      const user = req.user! as any;
      const { hide } = req.body;
      await db.update(users).set({ hideWelcomeGuide: hide !== false }).where(eq(users.id, user.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Errore aggiornamento welcome guide:', error);
      res.status(500).json({ error: 'Errore del server' });
    }
  });

  // Info applicazione rimossa - usa l'endpoint unificato sopra

  // Contesto tenant
router.get("/api/tenant-context", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    res.json({
      userId: user.id,
      userType: user.type,
      tenantId: `tenant_${user.id}`
    });
  });

  // Utente con licenza - SINCRONIZZAZIONE COMPLETA MOBILE/DESKTOP
router.get("/api/user-with-license", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    logger.debug(`🔐 [${deviceType}] /api/user-with-license per utente ${user.id} (${user.username})`);
    
    // 📊 TRACKING SESSIONE: Registra accesso ogni 30 minuti per utenti staff/admin
    try {
      const now = Date.now();
      const lastAccess = userAccessLocks.get(user.id) || 0;
      const thirtyMinutesInMs = 30 * 60 * 1000;
      
      if (now - lastAccess > thirtyMinutesInMs) {
        userAccessLocks.set(user.id, now);
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
        const ua = req.headers['user-agent'] || 'unknown';
        await db.insert(userLogins).values({
          userId: user.id,
          ipAddress: ip.substring(0, 45),
          userAgent: ua.substring(0, 500)
        });
        logger.debug(`📊 [SESSION-TRACKING] Accesso registrato per utente ${user.id} (${user.username}) - pausa >30min`);
      }
    } catch (trackErr) {
      console.error(`⚠️ [SESSION-TRACKING] Errore (non bloccante):`, trackErr);
    }
    
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
          logger.debug(`🏷️ [${deviceType}] Assignment code per utente ${user.id}: ${assignmentCode}`);
        }
        
        // FALLBACK: Genera/recupera vecchio formato (PROF_014_9C1F) per retrocompatibilità
        legacyProfessionistCode = await getProfessionistCode(user.id);
        logger.debug(`🏷️ [${deviceType}] Legacy code per utente ${user.id}: ${legacyProfessionistCode}`);
      } catch (error: any) {
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
      } catch (error: any) {
        console.error(`❌ Errore lettura licenza per utente ${user.id}:`, error);
      }
    }
    
    let hideWelcomeGuide = false;
    try {
      const dbUser = await db.select({ hideWelcomeGuide: users.hideWelcomeGuide }).from(users).where(eq(users.id, user.id));
      if (dbUser[0]) hideWelcomeGuide = dbUser[0].hideWelcomeGuide || false;
    } catch (e) {}

    const response = {
      id: user.id,
      username: user.username,
      email: user.email,
      type: user.type,
      firstName: firstName,
      lastName: lastName,
      hideWelcomeGuide: hideWelcomeGuide,
      assignmentCode: assignmentCode,
      legacyProfessionistCode: legacyProfessionistCode,
      professionistCode: assignmentCode || legacyProfessionistCode,
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
    
    logger.debug(`📱💻 [${deviceType}] Dati utente unificati:`, { 
      id: response.id, 
      username: response.username, 
      firstName: response.firstName, 
      lastName: response.lastName,
      licenseType: licenseType
    });
    
    res.json(response);
  });

  // Fuso orario
router.get("/api/timezone-settings", (req, res) => {
    // Calcola dinamicamente l'offset per Europe/Rome
    const date = new Date();
    
    // Ottieni la data formattata in Roma
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const partsMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    
    // Crea una data come se fosse UTC (ma contiene i valori di Roma)
    const romaAsUTC = new Date(
      parseInt(partsMap.year),
      parseInt(partsMap.month) - 1,
      parseInt(partsMap.day),
      parseInt(partsMap.hour),
      parseInt(partsMap.minute),
      parseInt(partsMap.second)
    );
    
    // La differenza tra il vero UTC e la data Roma-interpretata-come-UTC è l'offset
    // offset = (romaAsUTC - date) / (60 * 60 * 1000) in ore
    const offsetMS = romaAsUTC.getTime() - date.getTime();
    const offsetHours = offsetMS / (1000 * 60 * 60);
    const offset = -Math.round(offsetHours); // Negativo perché il calcolo è invertito
    
    res.json({ timezone: "Europe/Rome", offset, name: "Europe/Rome" });
  });

router.post("/api/timezone-settings", (req, res) => {
    res.json({ success: true, timezone: req.body.timezone, offset: req.body.offset });
  });

  // Licenze
router.get("/api/license/license-info", async (req, res) => {
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
      } catch (error: any) {
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

  // Endpoint per verificare accesso PRO - rispetta la logica dei piani:
  // - BASE: NO accesso PRO
  // - PRO/BUSINESS/TRIAL/PASSEPARTOUT: SI accesso PRO
  // - Admin/Staff: SI accesso completo
router.get("/api/license/has-pro-access", async (req, res) => {
    // Log dettagliato per debug sessione su Sliplane
    console.log('🔐 [has-pro-access] ====== DEBUG SESSION ======');
    console.log('🔐 [has-pro-access] Session ID:', req.sessionID);
    console.log('🔐 [has-pro-access] isAuthenticated:', req.isAuthenticated());
    console.log('🔐 [has-pro-access] req.user:', req.user ? `User ID ${(req.user as any).id}, type: ${(req.user as any).type}` : 'undefined');
    console.log('🔐 [has-pro-access] Cookie header:', req.headers.cookie ? 'present' : 'missing');
    console.log('🔐 [has-pro-access] ============================');
    
    if (!req.isAuthenticated()) {
      console.log('🔐 [has-pro-access] Utente NON autenticato - return false');
      return res.json(false);
    }
    const user = req.user as any;
    
    // Admin e staff hanno sempre accesso PRO
    if (user.type === 'admin' || user.type === 'staff') {
      logger.debug(`🔐 [has-pro-access] Utente ${user.id} (${user.type}) - admin/staff = true`);
      return res.json(true);
    }
    
    // Per customer, controlliamo il tipo di licenza
    if (user.type === 'customer' && user.id) {
      try {
        const userLicenses = await req.app.locals.storage.getLicensesByUserId(user.id);
        const activeLicense = userLicenses.find((lic: any) => lic.isActive);
        
        if (activeLicense) {
          // PRO, BUSINESS, PASSEPARTOUT, TRIAL hanno accesso PRO
          const proLicenseTypes = ['pro', 'business', 'passepartout', 'trial'];
          const hasAccess = proLicenseTypes.includes(activeLicense.type);
          logger.debug(`🔐 [has-pro-access] Utente ${user.id} licenza ${activeLicense.type} - hasAccess: ${hasAccess}`);
          return res.json(hasAccess);
        }
      } catch (error: any) {
        console.error(`❌ [has-pro-access] Errore lettura licenza per utente ${user.id}:`, error);
      }
    }
    
    logger.debug(`🔐 [has-pro-access] Utente ${user.id} - nessuna licenza PRO attiva = false`);
    res.json(false);
  });

  // Endpoint per verificare accesso BUSINESS - rispetta la logica dei piani:
  // - BASE/PRO: NO accesso BUSINESS
  // - BUSINESS/TRIAL/PASSEPARTOUT: SI accesso BUSINESS
  // - Admin/Staff: SI accesso completo
router.get("/api/license/has-business-access", async (req, res) => {
    if (!req.isAuthenticated()) return res.json(false);
    const user = req.user as any;
    
    // Admin e staff hanno sempre accesso BUSINESS
    if (user.type === 'admin' || user.type === 'staff') {
      return res.json(true);
    }
    
    // Per customer, controlliamo il tipo di licenza
    if (user.type === 'customer' && user.id) {
      try {
        const userLicenses = await req.app.locals.storage.getLicensesByUserId(user.id);
        const activeLicense = userLicenses.find((lic: any) => lic.isActive);
        
        if (activeLicense) {
          // Solo BUSINESS, PASSEPARTOUT, TRIAL hanno accesso BUSINESS
          const businessLicenseTypes = ['business', 'passepartout', 'trial'];
          const hasAccess = businessLicenseTypes.includes(activeLicense.type);
          return res.json(hasAccess);
        }
      } catch (error: any) {
        console.error(`❌ [has-business-access] Errore lettura licenza per utente ${user.id}:`, error);
      }
    }
    
    res.json(false);
  });

router.get("/api/license/application-title", (req, res) => {
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
    
    logger.debug(`✅ Nuovo codice professionista generato per utente ${userId}: ${newCode}`);
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
          logger.debug(`🗑️ Backup vecchio rimosso: ${backup.name}`);
        });
      }
    } catch (error: any) {
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
      
      logger.debug(`💾 Dati salvati persistentemente - ${mergedData.appointments?.length || 0} appuntamenti totali`);
      
      // Verifica immediata del salvataggio
      const verified = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
      if (verified.appointments?.length !== mergedData.appointments?.length) {
        console.error('⚠️ ERRORE CRITICO: Verifica salvataggio fallita!');
        throw new Error('Salvataggio non verificato');
      }
      logger.debug(`✅ Salvataggio verificato correttamente`);
      
    } catch (error: any) {
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
      
      logger.debug(`🔍 Controllo integrità all'avvio:`);
      console.log(`   📅 Appuntamenti caricati: ${appointmentsCount}`);
      console.log(`   👥 Clienti caricati: ${clientsCount}`);
      
      if (appointmentsCount > 0) {
        const recentAppointments = data.appointments.slice(0, 3);
        console.log(`   🔍 Primi 3 appuntamenti:`, recentAppointments.map(item => {
          const apt = Array.isArray(item) ? item[1] : item;
          return { id: apt?.id, date: apt?.date, client: apt?.clientId };
        }));
      }
      
      logger.debug(`✅ Controllo integrità completato`);
      return data;
    } catch (error: any) {
      console.error(`❌ ERRORE INTEGRITÀ DATI:`, error);
      return { appointments: [], clients: [], userServices: {} };
    }
  }

  let storageData = verifyDataIntegrity();


  // Endpoint per ottenere sempre l'icona predefinita (per anteprima)
router.get("/api/default-app-icon", (req, res) => {
    res.json({ 
      appName: "Gestionale Appuntamenti", 
      icon: defaultIconBase64,
      name: "Fleur de Vie multicolore"
    });
  });

  // Endpoint per ottenere l'icona dell'app - SEPARAZIONE PER UTENTE
router.get("/api/client-app-info", async (req, res) => {
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

    if (!targetUserId) {
      return res.json({ 
        appName: "Gestionale Appuntamenti", 
        icon: defaultIconBase64,
        isCustomIcon: false
      });
    }

    const dbIcon = await storage.getUserIcon(targetUserId);
    const storageIcon = storageData.userIcons[targetUserId];
    const hasCustom = !!(dbIcon || storageIcon);
    const userIcon = dbIcon || storageIcon || defaultIconBase64;
    
    await updatePWAIconsFromCompanyLogo(targetUserId, userIcon);
    
    const deviceType = req.headers['x-device-type'] || 'unknown';
    logger.debug(`✅ [${deviceType}] Icone PWA per utente ${targetUserId}, icon length: ${userIcon?.length || 0}, custom: ${hasCustom}`);
    
    res.json({ 
      appName: "Gestionale Appuntamenti", 
      icon: userIcon,
      isCustomIcon: hasCustom
    });
  });

  // Endpoint per recuperare icona dell'app tramite ownerId (per clienti)
router.get("/api/client-app-info/:ownerId", async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      console.log(`Caricamento icona app per professionista ${ownerId} (richiesta client)`);
      
      if (!ownerId || isNaN(ownerId)) {
        return res.status(400).json({ error: "ID professionista non valido" });
      }

      const dbIcon = await storage.getUserIcon(ownerId);
      const storageIcon = storageData.userIcons[ownerId];
      const hasCustom = !!(dbIcon || storageIcon);
      const userIcon = dbIcon || storageIcon || defaultIconBase64;
      
      await updatePWAIconsFromCompanyLogo(ownerId, userIcon);
      
      let professionalName = "";
      try {
        const companySettings = await db.select().from(companyNameSettings).where(eq(companyNameSettings.userId, ownerId)).limit(1);
        if (companySettings.length > 0 && companySettings[0].name) {
          professionalName = companySettings[0].name;
        } else {
          const ownerUser = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
          if (ownerUser.length > 0) {
            professionalName = ownerUser[0].businessName || ownerUser[0].username || "";
          }
        }
      } catch (e) {
        console.error('Errore caricamento nome professionista:', e);
      }
      
      res.json({ 
        appName: "Gestionale Appuntamenti", 
        icon: userIcon,
        isCustomIcon: hasCustom,
        professionalName
      });
    } catch (error: any) {
      console.error('Errore nel caricamento icona app:', error);
      res.status(500).json({ error: 'Errore del server' });
    }
  });

  // Endpoint per caricare una nuova icona - SEPARAZIONE PER UTENTE
router.post("/api/upload-app-icon", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Non autenticato" });
    }

    try {
      const { iconData } = req.body;
      const userId = req.user.id;
      
      if (iconData !== undefined) {
        // 🚀 SOLUZIONE SLIPLANE: Salva icona nel database PostgreSQL (persiste su container Docker)
        await storage.saveUserIcon(userId, iconData);
        logger.debug(`✅ Icona salvata nel database PostgreSQL per utente ${userId} (${iconData.length} bytes)`);
        
        // Invalidate server-side icon cache so next request regenerates with Sharp
        invalidateIconCache(userId);
        
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
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Errore durante il caricamento dell'icona" });
    }
  });

  // Endpoint per ripristinare l'icona di default - SEPARAZIONE PER UTENTE
router.post("/api/reset-app-icon", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Non autenticato" });
    }

    const userId = req.user.id;
    
    // 🚀 SOLUZIONE SLIPLANE: Salva icona default nel database PostgreSQL
    await storage.saveUserIcon(userId, defaultIconBase64);
    logger.debug(`✅ Reset icona a Fleur de Vie nel database PostgreSQL per utente ${userId}`);
    
    // Invalidate server-side icon cache so next request regenerates with Sharp
    invalidateIconCache(userId);
    
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
        logger.debug(`⚠️ Icona non valida per utente ${userId}, uso fallback`);
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
      
      logger.debug(`✅ Icone PWA aggiornate per utente ${userId} con logo aziendale`);
      
    } catch (error: any) {
      console.error(`❌ Errore aggiornamento icone PWA per utente ${userId}:`, error);
    }
  }

  // Endpoint per sincronizzare icone PWA con logo aziendale
router.post("/api/sync-pwa-icons", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Non autenticato" });
    }

    const userId = req.user.id;
    const dbIcon = await storage.getUserIcon(userId);
    const userIcon = dbIcon || storageData.userIcons[userId] || defaultIconBase64;
    
    updatePWAIconsFromCompanyLogo(userId, userIcon);
    
    res.json({ 
      success: true, 
      message: "Icone PWA sincronizzate con logo aziendale" 
    });
  });

  // Endpoint per ottenere le impostazioni nome aziendale - UNIFICATO PER TUTTI GLI UTENTI
router.get("/api/company-name-settings", async (req, res) => {
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
      logger.debug(`🔄 [${deviceType}] Anti-cache AGGRESSIVO applicato per impostazioni aziendali mobile`);
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
router.get("/api/company-business-data", (req, res) => {
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
router.post("/api/company-business-data", async (req, res) => {
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
      
      logger.debug(`✅ [POST] Dati aziendali salvati in PostgreSQL per utente ${userId}`);
      res.json({ success: true, message: "Dati aziendali salvati con successo" });
    } catch (error: any) {
      console.error('❌ Errore salvataggio dati aziendali:', error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Endpoint per salvare le impostazioni nome aziendale - UNIFICATO PER TUTTI GLI UTENTI
router.post("/api/company-name-settings", async (req, res) => {
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
      
      logger.debug(`✅ [POST] Impostazioni salvate in PostgreSQL per utente ${userId}`);
      
      res.json({ 
        success: true, 
        message: "Impostazioni salvate con successo", 
        ...companyNameSettings 
      });
    } catch (error: any) {
      console.error(`❌ [POST] Errore salvataggio impostazioni per utente ${req.user?.id}:`, error);
      res.status(500).json({ success: false, message: "Errore durante il salvataggio" });
    }
  });

  // Endpoint per ottenere le impostazioni valuta
router.get("/api/currency-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ currency: "EUR", symbol: "€" });
    }

    const userId = req.user.id;
    
    logger.debug(`💰 [GET] Recupero impostazioni valuta per utente ${userId}`);
    
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
    } catch (error: any) {
      console.error(`❌ [GET] Errore recupero impostazioni valuta per utente ${userId}:`, error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Endpoint per salvare le impostazioni valuta
router.post("/api/currency-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    try {
      const { currency, symbol } = req.body;
      const userId = req.user.id;
      
      logger.debug(`💰 [POST] Salvataggio impostazioni valuta per utente ${userId}:`, { currency, symbol });
      
      if (!currency || !symbol) {
        return res.status(400).json({ error: "Valuta e simbolo richiesti" });
      }
      
      const settings = await storage.saveCurrencySettings(userId, currency, symbol);
      
      logger.debug(`✅ [POST] Impostazioni valuta salvate per utente ${userId}`);
      
      res.json({ 
        success: true, 
        message: "Impostazioni valuta salvate con successo",
        currency: settings.currency,
        symbol: settings.symbol
      });
    } catch (error: any) {
      console.error(`❌ [POST] Errore salvataggio impostazioni valuta per utente ${req.user?.id}:`, error);
      res.status(500).json({ success: false, message: "Errore durante il salvataggio" });
    }
  });

// Endpoint per aggiornare il codice identificativo del professionista (assignmentCode)
router.patch("/api/user/assignment-code", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Non autenticato" });
  }

  const user = req.user as any;

  if (user.type !== 'staff' && user.type !== 'admin') {
    return res.status(403).json({ error: "Accesso consentito solo a staff e admin" });
  }

  const { assignmentCode } = req.body;

  if (!assignmentCode) {
    return res.status(400).json({ error: "Codice identificativo richiesto" });
  }

  if (!/^[a-zA-Z0-9]{4,10}$/.test(assignmentCode)) {
    return res.status(400).json({ error: "Il codice deve contenere solo caratteri alfanumerici (4-10 caratteri)" });
  }

  const upperCode = assignmentCode.toUpperCase();

  try {
    const existing = await storage.getUserByAssignmentCode(upperCode);
    if (existing && existing.id !== user.id) {
      return res.status(409).json({ error: "Codice già in uso da un altro professionista" });
    }

    const updated = await storage.updateUser(user.id, { assignmentCode: upperCode });
    if (!updated) {
      return res.status(500).json({ error: "Impossibile aggiornare il codice" });
    }

    logger.debug(`✅ [PATCH /api/user/assignment-code] Codice aggiornato per utente ${user.id}: ${upperCode}`);
    res.json({ success: true, assignmentCode: upperCode });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: "Codice già in uso da un altro professionista" });
    }
    console.error(`❌ [PATCH /api/user/assignment-code] Errore:`, error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
