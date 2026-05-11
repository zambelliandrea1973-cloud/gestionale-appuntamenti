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
      // Primary source: userSettings (PostgreSQL)
      const settings = await storage.getUserSettings(user.id);

      // Fallback 1: contact_settings table (populated by onboarding/profile)
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
      console.error('Error loading contact info:', error);
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

  // Endpoint to load contact information via ownerId (for clients)
router.get("/api/contact-info/:ownerId", async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      console.log(`Loading contact information for professional ${ownerId} (client request)`);

      if (!ownerId || isNaN(ownerId)) {
        return res.status(400).json({ error: "Invalid professional ID" });
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
      console.error('Error loading contact information:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // API to retrieve contact information for a specific professional (for PWA clients)
router.get('/api/owner-contact-info/:ownerId', async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (!ownerId) {
        return res.status(400).json({ error: 'Invalid owner ID' });
      }
      
      // 🔄 USES POSTGRESQL: Load from userSettings (primary source)
      const settings = await storage.getUserSettings(ownerId);

      // 🔄 FALLBACK 1: contact_settings table (populated in onboarding/profile)
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

      // 🔄 FALLBACK 2: legacy key/value storage for non-migrated historical data
      let legacy: any = undefined;
      try {
        legacy = await storage.getContactInfo(ownerId);
      } catch {
        legacy = undefined;
      }

      // 🔄 FALLBACK 3: username as last resort for businessName
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

      logger.debug(`🏥 [PWA CONTACTS] Contact information requested for professional ${ownerId}:`, contactInfo);
      res.json(contactInfo);
    } catch (error: any) {
      console.error('Error retrieving professional contact information:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST endpoint to save contact information
router.post("/api/contact-info", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const contactInfo = req.body;
      
      logger.debug(`📞 [CONTACT INFO] Saving contact info for user ${user.id}:`, contactInfo);
      
      // Basic validation of the data
      if (!contactInfo || typeof contactInfo !== 'object') {
        return res.status(400).json({ 
          error: 'Invalid contact data' 
        });
      }
      
      // 🔄 USE POSTGRESQL: Prepare data for userSettings
      const settingsUpdate: any = {};
      if (contactInfo.email !== undefined) settingsUpdate.contactEmail = contactInfo.email;
      if (contactInfo.phone !== undefined) settingsUpdate.contactPhone = contactInfo.phone;
      if (contactInfo.phone1 !== undefined) settingsUpdate.contactPhone = contactInfo.phone1; // phone1 → contactPhone
      if (contactInfo.phone2 !== undefined) settingsUpdate.contactPhone2 = contactInfo.phone2;
      if (contactInfo.website !== undefined) settingsUpdate.website = contactInfo.website;
      if (contactInfo.instagram !== undefined) settingsUpdate.instagramHandle = contactInfo.instagram;
      if (contactInfo.facebook !== undefined) settingsUpdate.facebookPage = contactInfo.facebook;
      
      // 🔄 USES POSTGRESQL: Update or create userSettings
      const updatedSettings = await storage.updateUserSettings(user.id, settingsUpdate);
      
      // Reconvert PostgreSQL → JSON format for frontend compatibility
      const responseContactInfo = {
        email: updatedSettings?.contactEmail || '',
        phone: updatedSettings?.contactPhone || '',
        phone1: updatedSettings?.contactPhone || '',
        phone2: updatedSettings?.contactPhone2 || '',
        website: updatedSettings?.website || '',
        instagram: updatedSettings?.instagramHandle || '',
        facebook: updatedSettings?.facebookPage || ''
      };
      
      logger.debug(`✅ [CONTACT INFO] Information saved in PostgreSQL for user ${user.id}`);
      
      res.json({ 
        success: true, 
        message: 'Contact information saved successfully',
        contactInfo: responseContactInfo
      });
      
    } catch (error: any) {
      console.error('❌ [CONTACT INFO ERROR]:', error);
      res.status(500).json({ 
        error: 'Error saving contact information' 
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
      console.error('Error loading working hours:', error);
      res.status(500).json({ error: 'Server error' });
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
        return res.status(400).json({ error: 'No valid data provided' });
      }

      await storage.updateUserSettings(user.id, settingsUpdate);
      res.json({ success: true, message: 'Working hours saved successfully' });
    } catch (error: any) {
      console.error('Error saving working hours:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

router.post("/api/hide-welcome-guide", requireAuth, async (req, res) => {
    try {
      const user = req.user! as any;
      const { hide } = req.body;
      await db.update(users).set({ hideWelcomeGuide: hide !== false }).where(eq(users.id, user.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating welcome guide:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Application info removed - uses the unified endpoint above

  // Tenant context
router.get("/api/tenant-context", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    res.json({
      userId: user.id,
      userType: user.type,
      tenantId: `tenant_${user.id}`
    });
  });

  // User with license - FULL MOBILE/DESKTOP SYNCHRONIZATION
router.get("/api/user-with-license", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    logger.debug(`🔐 [${deviceType}] /api/user-with-license for user ${user.id} (${user.username})`);
    
    // 📊 SESSION TRACKING: Register access every 30 minutes for staff/admin users
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
        logger.debug(`📊 [SESSION-TRACKING] Access registered for user ${user.id} (${user.username}) - pause >30min`);
      }
    } catch (trackErr) {
      console.error(`⚠️ [SESSION-TRACKING] Error (non-blocking):`, trackErr);
    }
    
    // Load complete data from storage for updated name/surname
    const storageData = loadStorageData();
    let firstName = user.firstName || null;
    let lastName = user.lastName || null;
    
    // For ALL users, load name/surname from company settings uniformly
    if (storageData.companyNameSettings?.[user.id]) {
      const settings = storageData.companyNameSettings[user.id];
      if (settings.name) {
        const nameParts = settings.name.split(' ');
        firstName = nameParts[0] || null;
        lastName = nameParts.slice(1).join(' ') || null;
      }
    }
    
    // Retrieve professional code NEW (assignment_code) and OLD (legacy) for staff and admin
    let assignmentCode = null;
    let legacyProfessionistCode = null;
    
    if (user.type === 'staff' || user.type === 'admin') {
      try {
        // PRIORITY: Read assignment_code from database (new format BUS1422)
        const dbUser = await req.app.locals.storage.getUser(user.id);
        if (dbUser && dbUser.assignmentCode) {
          assignmentCode = dbUser.assignmentCode;
          logger.debug(`🏷️ [${deviceType}] Assignment code for user ${user.id}: ${assignmentCode}`);
        }
        
        // FALLBACK: Generate/retrieve old format (PROF_014_9C1F) for backwards compatibility
        legacyProfessionistCode = await getProfessionistCode(user.id);
        logger.debug(`🏷️ [${deviceType}] Legacy code for user ${user.id}: ${legacyProfessionistCode}`);
      } catch (error: any) {
        console.error(`❌ [${deviceType}] Error generating professional code for user ${user.id}:`, error);
      }
    }
    
    // Read REAL license from database instead of hardcoding
    let licenseType = 'trial'; // Default
    let expiresAt = null;
    let daysLeft = null;

    // Demo account always gets full passepartout so all features are visible
    if (user.username === '__demo__') {
      licenseType = 'passepartout';
    } else if (user.type === 'admin') {
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
        console.error(`❌ Error reading license for user ${user.id}:`, error);
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
      isDemo: user.username === '__demo__',
      firstName: firstName,
      lastName: lastName,
      hideWelcomeGuide: hideWelcomeGuide,
      assignmentCode: assignmentCode,
      legacyProfessionistCode: legacyProfessionistCode,
      professionistCode: assignmentCode || legacyProfessionistCode,
      licenseType: licenseType,  // Field added for the badge
      licenseInfo: {
        type: licenseType,
        expiresAt: expiresAt,
        isActive: true,
        daysLeft: daysLeft,
        features: {
          maxClients: (user.type === 'admin' || user.username === '__demo__') ? 'unlimited' :
                     user.type === 'staff' ? 'unlimited' :
                     user.type === 'customer' ? 1000 : 50,
          maxAppointments: (user.type === 'admin' || user.username === '__demo__') ? 'unlimited' :
                          user.type === 'staff' ? 'unlimited' :
                          user.type === 'customer' ? 'unlimited' : 100,
          advancedReports: user.type !== 'basic',
          emailNotifications: true,
          mobileSync: true,
          customBranding: user.type === 'admin' || user.type === 'staff' || user.username === '__demo__',
          multiTenant: user.type === 'admin',
          staffReferrals: false
        }
      }
    };
    
    logger.debug(`📱💻 [${deviceType}] data user unificati:`, { 
      id: response.id, 
      username: response.username, 
      firstName: response.firstName, 
      lastName: response.lastName,
      licenseType: licenseType
    });
    
    res.json(response);
  });

  // Timezone
router.get("/api/timezone-settings", (req, res) => {
    // Dynamically calculate the offset for Europe/Rome
    const date = new Date();
    
    // Get the date formatted for Rome
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
    
    // Create a date as if it were UTC (but contains Rome values)
    const romaAsUTC = new Date(
      parseInt(partsMap.year),
      parseInt(partsMap.month) - 1,
      parseInt(partsMap.day),
      parseInt(partsMap.hour),
      parseInt(partsMap.minute),
      parseInt(partsMap.second)
    );
    
    // The difference between real UTC and the Rome-date-interpreted-as-UTC is the offset
    // offset = (romaAsUTC - date) / (60 * 60 * 1000) in ore
    const offsetMS = romaAsUTC.getTime() - date.getTime();
    const offsetHours = offsetMS / (1000 * 60 * 60);
    const offset = -Math.round(offsetHours); // Negative because the calculation is inverted
    
    res.json({ timezone: "Europe/Rome", offset, name: "Europe/Rome" });
  });

router.post("/api/timezone-settings", (req, res) => {
    res.json({ success: true, timezone: req.body.timezone, offset: req.body.offset });
  });

  // Licenses
router.get("/api/license/license-info", async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ hasLicense: false, type: "none" });
    
    const user = req.user as any;
    
    // Read REAL license from database instead of hardcoding
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
        console.error(`❌ Error reading license for user ${user.id}:`, error);
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

  // Endpoint for verifying PRO access - respects the plans logic:
  // - BASE: NO PRO access
  // - PRO/BUSINESS/TRIAL/PASSEPARTOUT: YES PRO access
  // - Admin/Staff: YES full access
router.get("/api/license/has-pro-access", async (req, res) => {
    // Detailed log for debug session on Sliplane
    console.log('🔐 [has-pro-access] ====== DEBUG SESSION ======');
    console.log('🔐 [has-pro-access] Session ID:', req.sessionID);
    console.log('🔐 [has-pro-access] isAuthenticated:', req.isAuthenticated());
    console.log('🔐 [has-pro-access] req.user:', req.user ? `User ID ${(req.user as any).id}, type: ${(req.user as any).type}` : 'undefined');
    console.log('🔐 [has-pro-access] Cookie header:', req.headers.cookie ? 'present' : 'missing');
    console.log('🔐 [has-pro-access] ============================');
    
    if (!req.isAuthenticated()) {
      console.log('🔐 [has-pro-access] user not authenticated - return false');
      return res.json(false);
    }
    const user = req.user as any;
    
    // Admin and staff always have PRO access
    if (user.type === 'admin' || user.type === 'staff') {
      logger.debug(`🔐 [has-pro-access] user ${user.id} (${user.type}) - admin/staff = true`);
      return res.json(true);
    }
    
    // For customer, check the license type
    if (user.type === 'customer' && user.id) {
      try {
        const userLicenses = await req.app.locals.storage.getLicensesByUserId(user.id);
        const activeLicense = userLicenses.find((lic: any) => lic.isActive);
        
        if (activeLicense) {
          // PRO, BUSINESS, PASSEPARTOUT, TRIAL have PRO access
          const proLicenseTypes = ['pro', 'business', 'passepartout', 'trial'];
          const hasAccess = proLicenseTypes.includes(activeLicense.type);
          logger.debug(`🔐 [has-pro-access] user ${user.id} license ${activeLicense.type} - hasAccess: ${hasAccess}`);
          return res.json(hasAccess);
        }
      } catch (error: any) {
        console.error(`❌ [has-pro-access] Error reading license for user ${user.id}:`, error);
      }
    }
    
    logger.debug(`🔐 [has-pro-access] user ${user.id} - no active PRO license = false`);
    res.json(false);
  });

  // Endpoint for verifying BUSINESS access - respects the plans logic:
  // - BASE/PRO: NO BUSINESS access
  // - BUSINESS/TRIAL/PASSEPARTOUT: YES BUSINESS access
  // - Admin/Staff: YES full access
router.get("/api/license/has-business-access", async (req, res) => {
    if (!req.isAuthenticated()) return res.json(false);
    const user = req.user as any;
    
    // Admin and staff always have BUSINESS access
    if (user.type === 'admin' || user.type === 'staff') {
      return res.json(true);
    }
    
    // For customer, check the license type
    if (user.type === 'customer' && user.id) {
      try {
        const userLicenses = await req.app.locals.storage.getLicensesByUserId(user.id);
        const activeLicense = userLicenses.find((lic: any) => lic.isActive);
        
        if (activeLicense) {
          // Only BUSINESS, PASSEPARTOUT, TRIAL have BUSINESS access
          const businessLicenseTypes = ['business', 'passepartout', 'trial'];
          const hasAccess = businessLicenseTypes.includes(activeLicense.type);
          return res.json(hasAccess);
        }
      } catch (error: any) {
        console.error(`❌ [has-business-access] Error reading license for user ${user.id}:`, error);
      }
    }
    
    res.json(false);
  });

router.get("/api/license/application-title", (req, res) => {
    res.json({ title: "Gestionale Appuntamenti" });
  });

  // 📁 Permanent per-user icon system with persistence (uses centralized utils)

  // Generate unique professional code (simplified)
  async function generateProfessionistCode(userId: number): Promise<string> {
    // Simple code without visible MD5 hash
    return `PROF_${userId.toString().padStart(3, '0')}`;
  }

  // Retrieve or generate the professional code
  async function getProfessionistCode(userId: number): Promise<string> {
    const storageData = loadStorageData();
    
    // Check if the user already has a professional code
    if (storageData.professionistCodes && storageData.professionistCodes[userId]) {
      return storageData.professionistCodes[userId];
    }
    
    // Generate new code and save it
    const newCode = await generateProfessionistCode(userId);
    
    if (!storageData.professionistCodes) {
      storageData.professionistCodes = {};
    }
    
    storageData.professionistCodes[userId] = newCode;
    saveStorageData(storageData);
    
    logger.debug(`✅ New professional code generated for user ${userId}: ${newCode}`);
    return newCode;
  }

  // Generate SIMPLIFIED client code - max 99999 clients per studio
  async function generateClientCode(ownerId: number, clientId: number): Promise<string> {
    const profCode = await getProfessionistCode(ownerId);
    // Simple code: PROF_003_C00001 (max 99999 clients)
    const clientNumber = clientId.toString().padStart(5, '0');
    return `${profCode}_C${clientNumber}`;
  }

  // Validate ownership through hierarchical code
  async function validateClientOwnership(clientCode: string, expectedOwnerId: number): Promise<boolean> {
    if (!clientCode || typeof clientCode !== 'string') return false;
    const profCode = await getProfessionistCode(expectedOwnerId);
    return clientCode.startsWith(profCode);
  }

  // Estrae owner ID da code client (supporta entrambi i formati)
  function extractOwnerFromClientCode(clientCode: string): number | null {
    // Supports new format: PROF_003_C00001 and old: PROF_003_0003_CLIENT_1_0001
    const match = clientCode.match(/^PROF_(\d{3})_/);
    return match ? parseInt(match[1], 10) : null;
  }

  function generateDefaultClientsForUser(userId, userEmail) {
    const baseId = userId * 1000; // Avoid ID conflicts using range per user
    const userPrefix = userEmail.split('@')[0].substring(0, 2).toUpperCase();
    
    return [
      {
        id: baseId + 1,
        firstName: "Client",
        lastName: "Trial",
        email: `client.trial.${userId}@example.com`,
        phone: "+39 123 456 7890",
        birthDate: "1990-01-15",
        fiscalCode: `CLNTTL90A15${userPrefix}1X`,
        uniqueCode: `CT${baseId + 1}`,
        ownerId: userId,
        createdAt: new Date().toISOString(),
        notes: "Automatically generated trial client"
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
        notes: "Test account auto-generated"
      }
    ];
  }
  
  function cleanOldBackups() {
    try {
      const files = fs.readdirSync('.');
      const backupFiles = files.filter(f => f.startsWith('storage_data_backup_'));
      
      if (backupFiles.length > 10) {
        // Keep only the last 10 backups
        const sortedBackups = backupFiles
          .map(f => ({ name: f, time: parseInt(f.split('_')[3].split('.')[0]) }))
          .sort((a, b) => b.time - a.time);
        
        const toDelete = sortedBackups.slice(10);
        toDelete.forEach(backup => {
          fs.unlinkSync(backup.name);
          logger.debug(`🗑️ Old backup removed: ${backup.name}`);
        });
      }
    } catch (error: any) {
      console.error('Error cleaning up backups:', error);
    }
  }

  const storageFile = 'storage_data.json';

  function saveStorageDataLocal(updatedData) {
    try {
      const currentData = fs.existsSync(storageFile) 
        ? JSON.parse(fs.readFileSync(storageFile, 'utf8'))
        : {};
      
      // Advanced data protection system
      dataProtectionService.createAutoBackup('before_critical_save');
      
      // Verify integrity before proceeding
      if (!dataProtectionService.verifyDataIntegrity()) {
        console.error('❌ Data integrity compromised, operation blocked');
        throw new Error('Corrupted data detected, save cancelled for safety');
      }
      
      // More specific merge to preserve appointment arrays
      const mergedData = {
        ...currentData,
        ...updatedData,
        appointments: updatedData.appointments || currentData.appointments || []
      };
      
      // Atomic save: first to a temporary file, then rename
      const tempFile = 'storage_data_temp.json';
      fs.writeFileSync(tempFile, JSON.stringify(mergedData, null, 2));
      fs.renameSync(tempFile, storageFile);
      
      logger.debug(`💾 Data saved persistently - ${mergedData.appointments?.length || 0} total appointments`);
      
      // Immediate save verification
      const verified = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
      if (verified.appointments?.length !== mergedData.appointments?.length) {
        console.error('⚠️ CRITICAL error: Save verification failed!');
        throw new Error('Save not verified');
      }
      logger.debug(`✅ Save verified correctly`);
      
    } catch (error: any) {
      console.error('❌ Critical error saving to storage:', error);
      throw error; // Re-throw to fail the operation
    }
  }
  
  // Integrity check at startup
  function verifyDataIntegrity() {
    try {
      const data = loadStorageData();
      const appointmentsCount = data.appointments?.length || 0;
      const clientsCount = data.clients?.length || 0;
      
      logger.debug(`🔍 Data integrity check on startup:`);
      console.log(`   📅 Appointments loaded: ${appointmentsCount}`);
      console.log(`   👥 Clients loaded: ${clientsCount}`);
      
      if (appointmentsCount > 0) {
        const recentAppointments = data.appointments.slice(0, 3);
        console.log(`   🔍 First 3 appointments:`, recentAppointments.map(item => {
          const apt = Array.isArray(item) ? item[1] : item;
          return { id: apt?.id, date: apt?.date, client: apt?.clientId };
        }));
      }
      
      logger.debug(`✅ Data integrity check completed`);
      return data;
    } catch (error: any) {
      console.error(`❌ DATA INTEGRITY ERROR:`, error);
      return { appointments: [], clients: [], userServices: {} };
    }
  }

  let storageData = verifyDataIntegrity();


  // Endpoint to always get the default icon (for preview)
router.get("/api/default-app-icon", (req, res) => {
    res.json({ 
      appName: "Gestionale Appuntamenti", 
      icon: defaultIconBase64,
      name: "Fleur de Vie multicolore"
    });
  });

  // Endpoint to get the app icon - PER-USER SEPARATION
router.get("/api/client-app-info", async (req, res) => {
    let targetUserId = null;
    
    // If authenticated, use the current user
    if (req.isAuthenticated()) {
      targetUserId = req.user.id;
    } else {
      // If not authenticated, check if there is an activation token to determine the tenant
      const { token, clientId } = req.query;
      
      if (token && typeof token === 'string') {
        const tokenParts = token.split('_');
        if (tokenParts.length === 3) {
          const [userId] = tokenParts;
          targetUserId = parseInt(userId);
        }
      } else if (clientId) {
        // Find the client owner from clientId
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
    logger.debug(`✅ [${deviceType}] PWA icons for user ${targetUserId}, icon length: ${userIcon?.length || 0}, custom: ${hasCustom}`);
    
    res.json({ 
      appName: "Gestionale Appuntamenti", 
      icon: userIcon,
      isCustomIcon: hasCustom
    });
  });

  // Endpoint to retrieve app icons via ownerId (for clients)
router.get("/api/client-app-info/:ownerId", async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      console.log(`Loading app icon for professional ${ownerId} (client request)`);
      
      if (!ownerId || isNaN(ownerId)) {
        return res.status(400).json({ error: "Invalid professional ID" });
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
        console.error('Error loading professional name:', e);
      }
      
      res.json({ 
        appName: "Gestionale Appuntamenti", 
        icon: userIcon,
        isCustomIcon: hasCustom,
        professionalName
      });
    } catch (error: any) {
      console.error('Error loading app icon:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Endpoint to upload a new icon - PER-USER SEPARATION
router.post("/api/upload-app-icon", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    try {
      const { iconData } = req.body;
      const userId = req.user.id;
      
      if (iconData !== undefined) {
        // 🚀 SLIPLANE SOLUTION: Save icon to PostgreSQL database (persists on Docker container)
        await storage.saveUserIcon(userId, iconData);
        logger.debug(`✅ Icon saved in PostgreSQL database for user ${userId} (${iconData.length} bytes)`);
        
        // Invalidate server-side icon cache so next request regenerates with Sharp
        invalidateIconCache(userId);
        
        // Backward compatibility: also save in JSON for legacy systems
        storageData.userIcons[userId] = iconData;
        saveStorageData(storageData);
      }
      
      res.json({ 
        success: true, 
        message: "Icon updated successfully", 
        appName: "Gestionale Appuntamenti", 
        icon: iconData 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Error loading icon" });
    }
  });

  // Endpoint to restore the default icon - PER-USER SEPARATION
router.post("/api/reset-app-icon", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const userId = req.user.id;
    
    // 🚀 SLIPLANE SOLUTION: Save default icon to PostgreSQL database
    await storage.saveUserIcon(userId, defaultIconBase64);
    logger.debug(`✅ Icon reset to Fleur de Vie in PostgreSQL database for user ${userId}`);
    
    // Invalidate server-side icon cache so next request regenerates with Sharp
    invalidateIconCache(userId);
    
    // Backward compatibility: also save in JSON
    storageData.userIcons[userId] = defaultIconBase64;
    saveStorageData(storageData);
    
    res.json({ 
      success: true, 
      message: "Icon restored to default", 
      appName: "Gestionale Appuntamenti", 
      icon: defaultIconBase64 
    });
  });

  // Function for updating PWA icons from the company logo
  async function updatePWAIconsFromCompanyLogo(userId, iconBase64) {
    try {
      if (!iconBase64 || !iconBase64.startsWith('data:image/')) {
        logger.debug(`⚠️ Invalid icon for user ${userId}, uso fallback`);
        iconBase64 = defaultIconBase64;
      }

      const sharp = await import('sharp').then(m => m.default);
      
      // Remove the date:image prefix
      const base64Data = iconBase64.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Generate the different sizes for PWA - both generic and user-specific
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
      
      logger.debug(`✅ PWA icons updated for user ${userId} with company logo`);
      
    } catch (error: any) {
      console.error(`❌ Error updating PWA icons for user ${userId}:`, error);
    }
  }

  // Endpoint to sync PWA icons with company logo
router.post("/api/sync-pwa-icons", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const userId = req.user.id;
    const dbIcon = await storage.getUserIcon(userId);
    const userIcon = dbIcon || storageData.userIcons[userId] || defaultIconBase64;
    
    updatePWAIconsFromCompanyLogo(userId, userIcon);
    
    res.json({ 
      success: true, 
      message: "PWA icons synchronized with company logo" 
    });
  });

  // Endpoint for getting company name settings - UNIFIED FOR ALL USERS
router.get("/api/company-name-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ businessName: "Gestionale Appuntamenti", showBusinessName: true });
    }

    const userId = req.user.id;
    const userType = req.user.type;
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
    
    console.log(`🏢 [/api/company-name-settings] [${deviceType}] GET for user ${userId} (${userType})`);
    
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
      logger.debug(`🔄 [${deviceType}] Anti-cache AGGRESSIVO Applied per settings business mobile`);
    }
    
    // 🔄 FIXED: Read from PostgreSQL instead of JSON
    const currentSettings = await storage.getUserSettings(userId);
    const companyNameSettings = (currentSettings?.preferences as any)?.companyName || {};
    
    // Default values if settings exist
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
    
    console.log(`🏢 [/api/company-name-settings] [${deviceType}] Settings for user ${userId} (${userType}):`, userSettings);
    res.json(userSettings);
  });

  // Endpoint to get the complete professional business data
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
    console.log(`🏢 [/api/company-business-data] GET for user ${userId}`);
    
    const currentStorageData = loadStorageData();
    if (!currentStorageData.userBusinessData) {
      currentStorageData.userBusinessData = {};
    }
    
    // Initialize empty data if it exists
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
    console.log(`🏢 [/api/company-business-data] data for user ${userId}:`, userBusinessData);
    res.json(userBusinessData);
  });

  // Endpoint to save the complete professional business data
router.post("/api/company-business-data", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { companyName, address, city, postalCode, vatNumber, fiscalCode, phone, email } = req.body;
      const userId = req.user.id;
      
      console.log(`🏢 [POST] Saving complete business data for user ${userId}:`, req.body);
      
      // 🔄 USE POSTGRESQL: Update userSettings with company data
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
      
      logger.debug(`✅ [POST] business data saved in PostgreSQL for user ${userId}`);
      res.json({ success: true, message: "Business data saved successfully" });
    } catch (error: any) {
      console.error('❌ Error saving company data:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint for saving company name settings - UNIFIED FOR ALL USERS
router.post("/api/company-name-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { businessName, showBusinessName, name, fontSize, fontFamily, fontStyle, color, enabled } = req.body;
      const userId = req.user.id;
      const userType = req.user.type;
      
      console.log(`🏢 [POST] Saving complete settings for user ${userId} (${userType}):`, req.body);
      
      // 🔄 USES POSTGRESQL: Load current settings
      const currentSettings = await storage.getUserSettings(userId);
      const currentPrefs = (currentSettings?.preferences as any) || {};
      
      // Prepare company name preferences
      const companyNameSettings = currentPrefs.companyName || {};
      if (businessName !== undefined) companyNameSettings.businessName = businessName;
      if (showBusinessName !== undefined) companyNameSettings.showBusinessName = showBusinessName;
      if (name !== undefined) companyNameSettings.name = name;
      if (fontSize !== undefined) companyNameSettings.fontSize = fontSize;
      if (fontFamily !== undefined) companyNameSettings.fontFamily = fontFamily;
      if (fontStyle !== undefined) companyNameSettings.fontStyle = fontStyle;
      if (color !== undefined) companyNameSettings.color = color;
      if (enabled !== undefined) companyNameSettings.enabled = enabled;
      
      // Update userSettings with updated preferences
      await storage.updateUserSettings(userId, {
        businessName: businessName,
        preferences: {
          ...currentPrefs,
          companyName: companyNameSettings
        }
      });
      
      logger.debug(`✅ [POST] Settings saved in PostgreSQL for user ${userId}`);
      
      res.json({ 
        success: true, 
        message: "Settings saved successfully", 
        ...companyNameSettings 
      });
    } catch (error: any) {
      console.error(`❌ [POST] Error saving settings for user ${req.user?.id}:`, error);
      res.status(500).json({ success: false, message: "Error during save" });
    }
  });

  // Endpoint to get currency settings
router.get("/api/currency-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ currency: "EUR", symbol: "€" });
    }

    const userId = req.user.id;
    
    logger.debug(`💰 [GET] Retrieving currency settings for user ${userId}`);
    
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
      console.error(`❌ [GET] Error retrieving currency settings for user ${userId}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint to save user language preference
router.post("/api/user/language", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { language } = req.body;
      const { normalizeLang } = await import('../utils/emailTranslations');
      const lang = normalizeLang(language);
      const currentSettings = await storage.getUserSettings(userId);
      const currentPrefs = (currentSettings?.preferences as any) || {};
      await storage.updateUserSettings(userId, {
        preferences: { ...currentPrefs, language: lang }
      });
      res.json({ success: true, language: lang });
    } catch (error: any) {
      console.error('❌ [POST] Error saving language preference:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Endpoint to save currency settings
router.post("/api/currency-settings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { currency, symbol } = req.body;
      const userId = req.user.id;
      
      logger.debug(`💰 [POST] Saving currency settings for user ${userId}:`, { currency, symbol });
      
      if (!currency || !symbol) {
        return res.status(400).json({ error: "currency e simbolo richiesti" });
      }
      
      const settings = await storage.saveCurrencySettings(userId, currency, symbol);
      
      logger.debug(`✅ [POST] Currency settings saved for user ${userId}`);
      
      res.json({ 
        success: true, 
        message: "Currency settings saved successfully",
        currency: settings.currency,
        symbol: settings.symbol
      });
    } catch (error: any) {
      console.error(`❌ [POST] Error saving currency settings for user ${req.user?.id}:`, error);
      res.status(500).json({ success: false, message: "Error during save" });
    }
  });

// Endpoint to update the professional identifier code (assignmentCode)
router.patch("/api/user/assignment-code", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = req.user as any;

  if (user.type !== 'staff' && user.type !== 'admin') {
    return res.status(403).json({ error: "Access permitted to staff and admin only" });
  }

  const { assignmentCode } = req.body;

  if (!assignmentCode) {
    return res.status(400).json({ error: "Codice identificativo required" });
  }

  if (!/^[a-zA-Z0-9]{4,10}$/.test(assignmentCode)) {
    return res.status(400).json({ error: "Code must contain only alphanumeric characters (4-10 characters)" });
  }

  const upperCode = assignmentCode.toUpperCase();

  try {
    const existing = await storage.getUserByAssignmentCode(upperCode);
    if (existing && existing.id !== user.id) {
      return res.status(409).json({ error: "Code already in use by another professional" });
    }

    const updated = await storage.updateUser(user.id, { assignmentCode: upperCode });
    if (!updated) {
      return res.status(500).json({ error: "Unable to update code" });
    }

    logger.debug(`✅ [PATCH /api/user/assignment-code] code updated for user ${user.id}: ${upperCode}`);
    res.json({ success: true, assignmentCode: upperCode });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: "Code already in use by another professional" });
    }
    console.error(`❌ [PATCH /api/user/assignment-code] Error:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
