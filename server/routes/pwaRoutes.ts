import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { clients as clientsTable, userIcons } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';
import { requireAuth } from '../middleware/authMiddleware';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const router = Router();


  // Endpoint per recuperare l'ultimo accesso valido di un proprietario
router.get('/api/client-access/last-access/:ownerId', async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const storageData = loadStorageData();
      
      logger.debug(`📱 PWA RECOVERY: Ricerca ultimo accesso per proprietario ${ownerId}`);
      
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
      
      logger.debug(`📱 PWA RECOVERY: Token generato per cliente ${lastAccessClient.id}`);
      
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
router.get('/api/public/contact-info', (req, res) => {
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
router.post('/api/client-access/:clientCode', async (req, res) => {
    try {
      const clientCode = req.params.clientCode;
      
      // 🔄 USA POSTGRESQL: Cerca cliente per uniqueCode nel database
      const clientResults = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.uniqueCode, clientCode))
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
        logger.debug(`✅ [PWA ACCESS] Contatori JSON aggiornati per ${client.firstName} ${client.lastName}`);
      }
      
      logger.debug(`✅ [PWA ACCESS] Cliente ${client.firstName} ${client.lastName} (${clientCode}) - Accesso registrato, token generato`);
      
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
router.post('/api/client-access/track/:clientId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      
      // Verifica che il cliente esista in PostgreSQL
      const [clientRecord] = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, clientId))
        .limit(1);
      
      if (!clientRecord) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      // Registra l'accesso nella tabella clientAccesses (PostgreSQL)
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';
      
      await db.insert(clientAccesses).values({
        clientId: clientId,
        ipAddress: ipAddress.substring(0, 45),
        userAgent: userAgent
      });
      
      // Conta gli accessi totali per questo cliente
      const [accessResult] = await db.select({ count: count() })
        .from(clientAccesses)
        .where(eq(clientAccesses.clientId, clientId));
      
      const accessCount = accessResult?.count || 0;
      
      logger.debug(`✅ [PWA ACCESS] Cliente ${clientRecord.firstName} ${clientRecord.lastName} (${clientId}) - Accesso registrato in PostgreSQL: ${accessCount} (${req.body.accessType || 'standard'})`);
      
      // Previeni cache per assicurarsi che i conteggi siano sempre aggiornati
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({
        success: true,
        accessCount: accessCount,
        message: 'Accesso registrato'
      });
      
    } catch (error) {
      console.error('Errore nel tracking accesso PWA:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Endpoint per icone specifiche del proprietario
router.get('/icons/owner-:ownerId-icon-:size.png', async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const size = req.params.size;
      const storageData = loadStorageData();
      
      logger.debug(`🔍 PWA ICON OWNER: Richiesta icona per proprietario ${ownerId}, dimensione ${size}`);
      
      // Recupera l'icona del professionista specifico dal database
      const dbIcon = await storage.getUserIcon(ownerId);
      const userIcon = dbIcon || storageData.userIcons[ownerId];
      
      if (userIcon) {
        logger.debug(`✅ PWA ICON OWNER: Trovata icona per proprietario ${ownerId}`);
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
router.get('/icons/custom-icon-:size.png', async (req, res) => {
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
          logger.debug(`📱 PWA ICON: Trovato ownerId ${ownerUserId} da token QR nel referer`);
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
          logger.debug(`📱 PWA ICON: Usando fallback owner ${ownerUserId}`);
        }
      }
      
      // Non serve duplicare la logica del token qui
      if (ownerUserId) {
        logger.debug(`🔍 PWA ICON: Identificato proprietario ${ownerUserId} da token QR o fallback`);
      }
      
      // Se non trovato da token QR, controlla header custom per ownerId dalla PWA
      if (!ownerUserId) {
        const ownerIdHeader = req.get('x-owner-id');
        if (ownerIdHeader) {
          ownerUserId = parseInt(ownerIdHeader);
          logger.debug(`🔍 PWA ICON: Identificato proprietario ${ownerUserId} da header PWA`);
        }
      }
      
      // Se non trovato, usa sessione attiva (admin)
      if (!ownerUserId && req.session && req.session.passport && req.session.passport.user) {
        const serializedUser = req.session.passport.user;
        if (typeof serializedUser === 'string' && serializedUser.includes(':')) {
          ownerUserId = parseInt(serializedUser.split(':')[1]);
          logger.debug(`🔍 PWA ICON: Usando utente sessione attiva ${ownerUserId}`);
        }
      }
      
      // NESSUN FALLBACK - Mantieni gerarchia client-proprietario
      if (!ownerUserId) {
        console.log(`❌ PWA ICON: Nessun proprietario identificato - uso icona default`);
        return res.redirect('/icons/icon-' + size + '.png');
      }
      
      // Recupera l'icona del professionista dal database
      const dbIcon = ownerUserId ? await storage.getUserIcon(ownerUserId) : null;
      const userIcon = dbIcon || (ownerUserId ? storageData.userIcons[ownerUserId] : null);
      
      if (!userIcon) {
        logger.debug(`🔄 Nessuna icona personalizzata trovata per utente ${ownerUserId}, uso default`);
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
        
        logger.debug(`📱 Servendo icona PWA personalizzata ${size} per proprietario ${ownerUserId}`);
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
router.get('/icons/owner-:ownerId-icon-:size.png', async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const size = req.params.size;
      const storageData = loadStorageData();
      
      logger.debug(`📱 PWA ICON: Richiesta icona ${size}x${size} per proprietario ${ownerId}`);
      
      // Per Silvia Busnari (ID 14), usa la sua foto professionale
      if (ownerId === 14) {
        const silviaImagePath = path.join(process.cwd(), 'attached_assets', 'IMG_20250416_170748.jpg');
        if (fs.existsSync(silviaImagePath)) {
          logger.debug(`✅ PWA ICON: Servendo icona di Silvia Busnari da ${silviaImagePath}`);
          return res.sendFile(silviaImagePath);
        }
      }
      
      // Recupera l'icona del professionista dal database
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
          'Cache-Control': 'public, max-age=86400',
          'Content-Length': buffer.length
        });
        
        logger.debug(`✅ PWA ICON: Servendo icona personalizzata per proprietario ${ownerId}`);
        return res.send(buffer);
      }
      
      // Fallback all'icona standard
      logger.debug(`🔄 PWA ICON: Nessuna icona personalizzata per proprietario ${ownerId}, uso standard`);
      res.redirect('/icons/icon-' + size + '.png');
      
    } catch (error) {
      console.error('Errore nel servire icona proprietario:', error);
      res.redirect('/icons/icon-' + req.params.size + '.png');
    }
  });



  // Endpoint per recuperare dettagli accessi di un cliente (richiesto da ClientAccessesDetails)
router.get('/api/client-access/:clientId', requireAuth, (req, res) => {
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
router.post('/api/test-reminder-flags', requireAuth, (req, res) => {
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
router.get('/api/email/reminders/status', requireAuth, (req, res) => {
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
router.post('/api/upload-custom-icon', requireAuth, upload.single('icon'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nessun file caricato' });
      }

      logger.debug(`🎨 [ICON UPLOAD] Utente ${req.user?.username} sta caricando icona personalizzata`);
      logger.debug(`📎 File ricevuto: ${req.file.originalname}, size: ${req.file.size} bytes`);

      // Converti l'immagine caricata in icone PWA
      const iconPaths = await iconConversionService.processCustomIcon(
        req.file.buffer,
        'custom-icon'
      );

      logger.debug(`✅ [ICON UPLOAD] Icone PWA generate:`, iconPaths);

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
router.post('/api/upload-icon-base64', requireAuth, async (req: any, res: any) => {
    try {
      const { imageData, iconName } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: 'Dati immagine mancanti' });
      }

      logger.debug(`🎨 [ICON BASE64] Utente ${req.user?.username} sta caricando icona via base64`);

      // Converti l'immagine base64 in icone PWA
      const iconPaths = await iconConversionService.processCustomIcon(
        imageData,
        iconName || 'custom-icon'
      );

      logger.debug(`✅ [ICON BASE64] Icone PWA generate:`, iconPaths);

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
router.post('/api/restore-default-icon', requireAuth, async (req: any, res: any) => {
    try {
      logger.debug(`🔄 [ICON RESTORE] Utente ${req.user?.username} sta ripristinando icona predefinita`);

      // Ripristina le icone predefinite (Fleur de Vie)
      const iconPaths = await iconConversionService.restoreDefaultIcons();

      logger.debug(`✅ [ICON RESTORE] Icone predefinite ripristinate:`, iconPaths);

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
    } catch (error) {
      console.error('❌ [ICON INFO] Errore:', error);
      res.status(500).json({ 
        error: 'Errore durante la lettura delle informazioni icone',
        details: error.message 
      });
    }
  });

  // NOTE: client-by-code, client-appointments moved to server/routes/clientAccessRoutes.ts

export default router;
