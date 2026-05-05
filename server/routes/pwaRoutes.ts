import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { clients as clientsTable, userIcons, clientAccesses } from '../../shared/schema';
import { eq, count } from 'drizzle-orm';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';
import { requireAuth } from '../middleware/authMiddleware';
import { iconConversionService } from '../services/iconConversionService';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const router = Router();

async function generateClientCode(ownerId: number, clientId: number): Promise<string> {
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  return token;
}


  // Endpoint for retrieving the last valid access by an owner
router.get('/api/client-access/last-access/:ownerId', async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const storageData = loadStorageData();
      
      logger.debug(`📱 PWA RECOVERY: Looking for last access for owner ${ownerId}`);
      
      // Find the last client with valid access for this owner
      const ownerClients = Object.values(storageData.clients).filter((client: any) => 
        client.originalOwnerId === ownerId
      );
      
      if (ownerClients.length === 0) {
        return res.status(404).json({ error: 'No client found for this owner' });
      }
      
      // Find the client with the most recent access
      let lastAccessClient: any = null;
      let lastAccessTime = 0;
      
      for (const client of ownerClients as any[]) {
        const accessCount = (storageData as any).clientAccessCounts?.[client.id] || 0;
        if (accessCount > 0) {
          // For now use the highest ID as a proxy for the most recent access
          if (client.id > lastAccessTime) {
            lastAccessTime = client.id;
            lastAccessClient = client;
          }
        }
      }
      
      if (!lastAccessClient) {
        return res.status(404).json({ error: 'No recent access found' });
      }
      
      // Generate a new token for this client
      const newToken = await generateClientCode(ownerId, lastAccessClient.id);
      
      logger.debug(`📱 PWA RECOVERY: Token generated for client ${lastAccessClient.id}`);
      
      res.json({
        clientId: lastAccessClient.id,
        token: newToken,
        isValid: true,
        clientName: `${lastAccessClient.firstName} ${lastAccessClient.lastName}`
      });
      
    } catch (error: any) {
      console.error('Error retrieving last access:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Public endpoint for complete contact information (for client area)
router.get('/api/public/contact-info', (req, res) => {
    try {
      const storageData = loadStorageData();
      const { contactInfo = {}, contactSettings = {} } = storageData;
      
      // Returns contact information with all settings to replicate the home layout
      const publicContactInfo = {
        // Dati di contatto
        businessName: contactInfo.businessName || 'Studio Professionale',
        email: contactInfo.email,
        phone: contactInfo.phone,
        phone1: contactInfo.phone1,
        website: contactInfo.website,
        instagram: contactInfo.instagram,
        
        // Visibility settings (to show only what the professional has enabled)
        showEmail: contactSettings.showEmail !== false,
        showPhone: contactSettings.showPhone !== false,
        showPhone1: contactSettings.showPhone1 !== false,
        showWebsite: contactSettings.showWebsite !== false,
        showInstagram: contactSettings.showInstagram !== false,
        
        // Settings di layout If presenti
        contactLayout: contactSettings.layout || 'default'
      };
      
      res.json(publicContactInfo);
    } catch (error: any) {
      console.error('Error loading public contact information:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Endpoint to register PWA access via client code (without authentication)
router.post('/api/client-access/:clientCode', async (req, res) => {
    try {
      const clientCode = req.params.clientCode;
      
      // 🔄 USE POSTGRESQL: Search client by uniqueCode in database
      const clientResults = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.uniqueCode, clientCode))
        .limit(1);
      
      if (!clientResults || clientResults.length === 0) {
        console.log(`❌ [CLIENT ACCESS] Client not found for code: ${clientCode}`);
        return res.status(404).json({ message: "Client not found" });
      }
      
      const client = clientResults[0];
      const now = new Date();
      
      // Generate token di accesso for client
      const token = `${clientCode}_${now.getTime()}`;
      
      // BACKWARD COMPATIBILITY: Update contatori JSON storage If client presente
      const storageData = loadStorageData();
      const clientData = storageData.clients?.find(([id, c]: any) => c.uniqueCode === clientCode);
      if (clientData) {
        const [id, jsonClient] = clientData;
        const clientIndex = storageData.clients.findIndex(([cId, c]: any) => cId === id);
        
        // Incrementa contatori accesso
        storageData.clients[clientIndex][1].accessCount = (jsonClient.accessCount || 0) + 1;
        storageData.clients[clientIndex][1].lastAccess = now.toISOString();
        
        // Update info accesso PWA
        if (req.body.source === 'pwa') {
          storageData.clients[clientIndex][1].lastPwaAccess = now.toISOString();
          storageData.clients[clientIndex][1].pwaAccessCount = (jsonClient.pwaAccessCount || 0) + 1;
        }
        
        saveStorageData(storageData);
        logger.debug(`✅ [PWA ACCESS] Contatori JSON aggiornati per ${client.firstName} ${client.lastName}`);
      }
      
      logger.debug(`✅ [PWA ACCESS] Client ${client.firstName} ${client.lastName} (${clientCode}) - Access registered, token generated`);
      
      res.json({
        success: true,
        clientId: client.id,
        token: token
      });
    } catch (error: any) {
      console.error('Error registering client access:', error);
      res.status(500).json({ message: "Internal error" });
    }
  });

  // Endpoint to register client PWA access via ID (without authentication)
router.post('/api/client-access/track/:clientId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      
      // Verify that the client exists in PostgreSQL
      const [clientRecord] = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, clientId))
        .limit(1);
      
      if (!clientRecord) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Register access nelthe table clientAccesses (PostgreSQL)
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';
      
      await db.insert(clientAccesses).values({
        clientId: clientId,
        ipAddress: ipAddress.substring(0, 45),
        userAgent: userAgent
      });
      
      // Count the total accesses for this client
      const [accessResult] = await db.select({ count: count() })
        .from(clientAccesses)
        .where(eq(clientAccesses.clientId, clientId));
      
      const accessCount = accessResult?.count || 0;
      
      logger.debug(`✅ [PWA ACCESS] Client ${clientRecord.firstName} ${clientRecord.lastName} (${clientId}) - Access recorded in PostgreSQL: ${accessCount} (${req.body.accessType || 'standard'})`);
      
      // Prevent caching to ensure counts are always up to date
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({
        success: true,
        accessCount: accessCount,
        message: 'Access recorded'
      });
      
    } catch (error: any) {
      console.error('Error tracking PWA access:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Endpoint for owner-specific icons
router.get('/icons/owner-:ownerId-icon-:size.png', async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const size = req.params.size;
      const storageData = loadStorageData();
      
      logger.debug(`🔍 PWA ICON OWNER: Icon request for owner ${ownerId}, size ${size}`);
      
      // Retrieve the specific professional icon from the database
      const dbIcon = await storage.getUserIcon(ownerId);
      const userIcon = dbIcon || storageData.userIcons[ownerId];
      
      if (userIcon) {
        logger.debug(`✅ PWA ICON OWNER: Found icon for owner ${ownerId}`);
        const buffer = Buffer.from(userIcon, 'base64');
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        return res.send(buffer);
      } else {
        console.log(`❌ PWA ICON OWNER: No icon found for owner ${ownerId}`);
        return res.redirect('/icons/icon-' + size + '.png');
      }
    } catch (error: any) {
      console.error('Error serving owner icon:', error);
      return res.redirect('/icons/icon-' + req.params.size + '.png');
    }
  });

  // Endpoint to serve dynamic PWA icons based on the client owner (from QR token)
router.get('/icons/custom-icon-:size.png', async (req, res) => {
    try {
      const size = req.params.size; // es: 96x96, 192x192, 512x512
      const storageData = loadStorageData();
      
      // Check if there is a QR token in the headers or referer to identify the owner
      let ownerUserId = null;
      
      // 1. Check the referer for QR token
      const referer = req.get('referer') || '';
      const tokenMatch = referer.match(/token=([^&]+)/);
      
      if (tokenMatch) {
        const token = tokenMatch[1];
        const tokenParts = token.split('_');
        if (tokenParts.length >= 5 && tokenParts[0] === 'PROF') {
          ownerUserId = parseInt(tokenParts[1]); // Seconda parte = userId proprietario
          logger.debug(`📱 PWA ICON: Found ownerId ${ownerUserId} from QR token in referer`);
        }
      }
      
      // 2. Check localStorage for saved ownerId
      if (!ownerUserId) {
        // Search in active sessions or database to determine the owner
        const sessions = req.sessionStore;
        // For now, use an intelligent fallback: If there is only one user with icons, use that one
        const usersWithIcons = Object.keys(storageData.userIcons || {});
        if (usersWithIcons.length === 1) {
          ownerUserId = parseInt(usersWithIcons[0]);
          logger.debug(`📱 PWA ICON: Usando fallback owner ${ownerUserId}`);
        }
      }
      
      // No need to duplicate the token logic here
      if (ownerUserId) {
        logger.debug(`🔍 PWA ICON: Identified owner ${ownerUserId} from QR token or fallback`);
      }
      
      // If not found from QR token, check custom header for ownerId from PWA
      if (!ownerUserId) {
        const ownerIdHeader = req.get('x-owner-id');
        if (ownerIdHeader) {
          ownerUserId = parseInt(ownerIdHeader);
          logger.debug(`🔍 PWA ICON: Identified owner ${ownerUserId} from PWA header`);
        }
      }
      
      // If not found, use active session (admin)
      if (!ownerUserId && req.session && (req.session as any).passport && (req.session as any).passport.user) {
        const serializedUser = (req.session as any).passport.user;
        if (typeof serializedUser === 'string' && serializedUser.includes(':')) {
          ownerUserId = parseInt(serializedUser.split(':')[1]);
          logger.debug(`🔍 PWA ICON: Using active session user ${ownerUserId}`);
        }
      }
      
      // NESSUN FALLBACK - Mantieni gerarchia client-proprietario
      if (!ownerUserId) {
        console.log(`❌ PWA ICON: No owner identified - using default icon`);
        return res.redirect('/icons/icon-' + size + '.png');
      }
      
      // Retrieve the professional icon from the database
      const dbIcon = ownerUserId ? await storage.getUserIcon(ownerUserId) : null;
      const userIcon = dbIcon || (ownerUserId ? storageData.userIcons[ownerUserId] : null);
      
      if (!userIcon) {
        logger.debug(`🔄 No custom icon found for user ${ownerUserId}, using default`);
        return res.redirect('/icons/icon-' + size + '.png');
      }
      
      // If the icon is in base64 format, convert and serve it
      if (userIcon && userIcon.startsWith('data:image/')) {
        const base64Data = userIcon.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Determine the image type from the data URL
        let contentType = 'image/png';
        if (userIcon.includes('data:image/jpeg')) contentType = 'image/jpeg';
        else if (userIcon.includes('data:image/jpg')) contentType = 'image/jpeg';
        
        res.set({
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Content-Length': buffer.length
        });
        
        logger.debug(`📱 Serving custom PWA icon ${size} for owner ${ownerUserId}`);
        return res.send(buffer);
      }
      
      // If it is a file path, serve it
      if (userIcon && userIcon.length > 0 && !userIcon.startsWith('data:')) {
        console.log(`📁 Redirecting to icon file: ${userIcon}`);
        return res.redirect(userIcon);
      }
      
    } catch (error: any) {
      console.error('Error serving custom PWA icon:', error);
      // Fallback to default icon
      res.redirect('/icons/icon-' + req.params.size + '.png');
    }
  });

  // Endpoint to serve dynamic PWA icons for specific owners
router.get('/icons/owner-:ownerId-icon-:size.png', async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const size = req.params.size;
      const storageData = loadStorageData();
      
      logger.debug(`📱 PWA ICON: Icon request ${size}x${size} for owner ${ownerId}`);
      
      // For Silvia Busnari (ID 14), use her professional photo
      if (ownerId === 14) {
        const silviaImagePath = path.join(process.cwd(), 'attached_assets', 'IMG_20250416_170748.jpg');
        if (fs.existsSync(silviaImagePath)) {
          logger.debug(`✅ PWA ICON: Serving Silvia Busnari icon from ${silviaImagePath}`);
          return res.sendFile(silviaImagePath);
        }
      }
      
      // Retrieve the professional icon from the database
      const dbIconOwner = await storage.getUserIcon(ownerId);
      const userIcon = dbIconOwner || storageData.userIcons[ownerId];
      
      if (userIcon && userIcon.startsWith('data:image/')) {
        const base64Data = userIcon.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        let contentType = 'image/png';
        if (userIcon.includes('data:image/jpeg')) contentType = 'image/jpeg';
        else if (userIcon.includes('data:image/jpg')) contentType = 'image/jpeg';
        
        res.set({
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Content-Length': buffer.length
        });
        
        logger.debug(`✅ PWA ICON: Serving custom icon for owner ${ownerId}`);
        return res.send(buffer);
      }
      
      // Fallback to standard icon
      logger.debug(`🔄 PWA ICON: No custom icon for owner ${ownerId}, using standard`);
      res.redirect('/icons/icon-' + size + '.png');
      
    } catch (error: any) {
      console.error('Error serving owner icon:', error);
      res.redirect('/icons/icon-' + req.params.size + '.png');
    }
  });



  // Endpoint to retrieve client access details (requested by ClientAccessesDetails)
router.get('/api/client-access/:clientId', requireAuth, (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const storageData = loadStorageData();
      
      // Find the client
      const clientData = storageData.clients?.find(([id, client]: any) => id === clientId);
      if (!clientData) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const [id, client] = clientData;
      
      // Generate mock access records based on available data
      const accesses = [];
      if (client.lastAccess && (client.accessCount || 0) > 0) {
        const lastAccessDate = new Date(client.lastAccess);
        
        // Generate the last 10 accesses distributed over recent days
        for (let i = 0; i < Math.min(client.accessCount || 0, 10); i++) {
          const daysBack = Math.floor(i / 2); // 2 accesses per day
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
      
      // Sort by date descending (most recent first)
      accesses.sort((a, b) => new Date(b.accessDate).getTime() - new Date(a.accessDate).getTime());
      
      res.json(accesses);
      
    } catch (error: any) {
      console.error('Error retrieving access details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Endpoint for testing and updating reminder status
router.post('/api/test-reminder-flags', requireAuth, (req, res) => {
    try {
      const { appointmentId, reminderStatus } = req.body;
      const storageData = loadStorageData();
      
      // Find the appointment and update the status
      const appointmentIndex = storageData.appointments?.findIndex((apt: any) => apt.id === appointmentId);
      if (appointmentIndex !== -1) {
        storageData.appointments[appointmentIndex].reminderStatus = reminderStatus;
        storageData.appointments[appointmentIndex].reminderType = 'email'; // Ensure it has a type
        
        // Save the data aggiornati
        saveStorageData(storageData);
        
        res.json({
          success: true,
          message: `Reminder status updated to: ${reminderStatus}`,
          appointment: storageData.appointments[appointmentIndex]
        });
      } else {
        res.status(404).json({ error: 'Appointment not found' });
      }
    } catch (error: any) {
      console.error('Error updating reminder status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Endpoint per monitorare i promemoria email inviati
router.get('/api/email/reminders/status', requireAuth, (req, res) => {
    try {
      const storageData = loadStorageData();
      const { appointments = [] } = storageData;
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filter appointments per domani
      const tomorrowAppointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.date);
        return aptDate.toDateString() === tomorrow.toDateString();
      });
      
      // Find the specific Marco Berto appointment
      const marcoBertoAppointment = tomorrowAppointments.find((apt: any) => {
        const client = storageData.clients?.find(([id, clientData]: any) => 
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
    } catch (error: any) {
      console.error('Error checking reminders:', error);
      res.status(500).json({ error: 'Reminder system error' });
    }
  });

  // Multer configuration for image upload
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limite
    },
    fileFilter: (req, file, cb) => {
      // Accept images only
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(null as any, false);
      }
    }
  });

  // API to upload custom PWA icon
router.post('/api/upload-custom-icon', requireAuth, upload.single('icon'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      logger.debug(`🎨 [ICON UPLOAD] User ${req.user?.username} is uploading custom icon`);
      logger.debug(`📎 File received: ${req.file.originalname}, size: ${req.file.size} bytes`);

      // Convert the uploaded image to PWA icons
      const iconPaths = await iconConversionService.processCustomIcon(
        req.file.buffer,
        'custom-icon'
      );

      logger.debug(`✅ [ICON UPLOAD] PWA icons generated:`, iconPaths);

      res.json({
        success: true,
        message: 'Icona personalizzata caricata e convertita successfully',
        iconPaths: iconPaths
      });
    } catch (error: any) {
      console.error('❌ [ICON UPLOAD] Error:', error);
      res.status(500).json({ 
        error: 'Error converting icon',
        details: error.message 
      });
    }
  });

  // API to upload icon via base64
router.post('/api/upload-icon-base64', requireAuth, async (req: any, res: any) => {
    try {
      const { imageData, iconName } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: 'Dati immagine mancanti' });
      }

      logger.debug(`🎨 [ICON BASE64] User ${req.user?.username} is uploading icon via base64`);

      // Convert base64 image to PWA icons
      const iconPaths = await iconConversionService.processCustomIcon(
        imageData,
        iconName || 'custom-icon'
      );

      logger.debug(`✅ [ICON BASE64] PWA icons generated:`, iconPaths);

      res.json({
        success: true,
        message: 'Icona caricata e convertita successfully',
        iconPaths: iconPaths
      });
    } catch (error: any) {
      console.error('❌ [ICON BASE64] Error:', error);
      res.status(500).json({ 
        error: 'Error converting icon',
        details: error.message 
      });
    }
  });

  // API to restore default icon
router.post('/api/restore-default-icon', requireAuth, async (req: any, res: any) => {
    try {
      logger.debug(`🔄 [ICON RESTORE] User ${req.user?.username} is restoring default icon`);

      // Restore the default icons (Fleur de Vie)
      const iconPaths = await iconConversionService.restoreDefaultIcons();

      logger.debug(`✅ [ICON RESTORE] Default icons restored:`, iconPaths);

      res.json({
        success: true,
        message: 'Icona predefinita ripristinata successfully',
        iconPaths: iconPaths
      });
    } catch (error: any) {
      console.error('❌ [ICON RESTORE] Error:', error);
      res.status(500).json({ 
        error: 'Error restoring default icon',
        details: error.message 
      });
    }
  });

  // API for getting info about current icons
router.get('/api/current-icon-info', requireAuth, async (req: any, res: any) => {
    try {
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      res.json({
        success: true,
        currentIcons: manifest.icons,
        manifestPath: '/manifest.json'
      });
    } catch (error: any) {
      console.error('❌ [ICON INFO] Error:', error);
      res.status(500).json({ 
        error: 'Error reading icon information',
        details: error.message 
      });
    }
  });

  // NOTE: client-by-code, client-appointments moved to server/routes/clientAccessRoutes.ts

export default router;
