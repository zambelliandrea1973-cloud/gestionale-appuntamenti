import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { clients as clientsTable, marketingCampaigns, marketingMessages, licenses } from '../../shared/schema';
import { eq, and, or, desc, asc } from 'drizzle-orm';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';
import { requireAuth } from '../middleware/authMiddleware';
import { analyzeBusinessNeeds } from '../onboarding-ai';
import { processChatMessage, generateMarketingCampaign } from '../ai-chat';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import nodemailer from 'nodemailer';

const router = Router();

  // Endpoint di test per forzare l'esecuzione del sistema di promemoria
router.post("/api/test-reminder-system", requireAuth, async (req, res) => {
    try {
      console.log('🔧 Test manuale del sistema di promemoria richiesto');
      
      // Importa e esegue il servizio di promemoria
      const { notificationService } = await import('../services/notificationService');
      
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
router.post("/api/test-email-direct", requireAuth, async (req, res) => {
    try {
      console.log('🔧 TEST DIRETTO EMAIL - Inizio debug');
      
      const { notificationService } = await import('../services/notificationService');
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

  // ========== ONBOARDING AI ENDPOINTS ==========

  // GET /api/onboarding/progress - Recupera il progresso dell'onboarding dell'utente
router.get('/api/onboarding/progress', requireAuth, (req, res) => {
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
router.post('/api/onboarding/update-step', requireAuth, (req, res) => {
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
router.post('/api/onboarding/analyze', requireAuth, async (req, res) => {
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
router.post('/api/onboarding/complete', requireAuth, (req, res) => {
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
router.post('/api/ai-chat', requireAuth, async (req, res) => {
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
router.post('/api/ai/generate-campaign', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Verifica che l'utente abbia una licenza Pro o superiore
      const userLicenses = await db.select().from(licenses).where(eq(licenses.userId, user.id));
      const activeLicense = userLicenses.find(l => l.isActive);
      const licenseType = activeLicense?.type || 'trial';
      
      const allowedTypes = ['trial', 'pro', 'business', 'staff_free', 'staff_free_10years', 'passepartout'];
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
      console.log('📧 [CAMPAIGN API] GEMINI_API_KEY presente:', !!process.env.GEMINI_API_KEY, '- Primi 10 char:', process.env.GEMINI_API_KEY?.substring(0, 10));
      
      let campaign;
      try {
        campaign = await generateMarketingCampaign(prompt);
      } catch (aiError: any) {
        console.error('❌ [CAMPAIGN API] Errore AI generazione:', aiError?.message || aiError);
        campaign = {
          title: 'Nuova Campagna Marketing',
          message: `Messaggio personalizzato: ${prompt.substring(0, 300)}`
        };
      }
      
      res.json({
        message: `✅ Ho creato la tua campagna: "${campaign.title}"!\n\nPuoi modificare il messaggio se vuoi, oppure clicca sui pulsanti qui sotto per inviarla ai tuoi clienti.`,
        campaign: {
          title: campaign.title,
          message: campaign.message
        }
      });
    } catch (error) {
      console.error('❌ [CAMPAIGN API] Errore generale:', error);
      res.status(500).json({ 
        message: 'Errore nella generazione della campagna',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET /api/campaigns - Recupera storico campagne dal database
router.get('/api/campaigns', requireAuth, async (req, res) => {
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
router.delete('/api/campaigns/:id', requireAuth, async (req, res) => {
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

router.post('/api/campaigns/send-batch', requireAuth, uploadCampaign.array('attachment', 10), async (req, res) => {
    const crypto = await import('crypto');
    let campaignId: number | null = null;
    
    try {
      const user = req.user as any;
      
      // Verifica licenza Pro o superiore
      const userLicenses = await db.select().from(licenses).where(eq(licenses.userId, user.id));
      const activeLicense = userLicenses.find(l => l.isActive);
      const licenseType = activeLicense?.type || 'trial';
      
      const allowedTypes = ['trial', 'pro', 'business', 'staff_free', 'staff_free_10years', 'passepartout'];
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
      
      // 🔒 STEP 2: BLOCCO - Verifica se la campagna è già stata inviata o è in corso
      const existingCampaign = await db
        .select()
        .from(marketingCampaigns)
        .where(and(
          eq(marketingCampaigns.idempotencyKey, idempotencyKey),
          or(
            eq(marketingCampaigns.status, 'sent'),
            eq(marketingCampaigns.status, 'locked')
          )
        ))
        .limit(1);
      
      if (existingCampaign.length > 0) {
        if (existingCampaign[0].status === 'locked') {
          console.log('🔒 [CAMPAIGN IN PROGRESS] Campagna già in fase di invio:', title);
          return res.status(400).json({ 
            success: false,
            alreadySent: true,
            message: `⚠️ Questa campagna è in fase di invio. Attendi il completamento.`
          });
        }
        const sentTime = new Date(existingCampaign[0].createdAt!).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
        console.log('🚫 [CAMPAIGN BLOCKED] Campagna già inviata oggi:', title);
        return res.status(400).json({ 
          success: false,
          alreadySent: true,
          message: `⚠️ Questa campagna è già stata inviata oggi alle ${sentTime}. Potrai inviarla di nuovo domani.`,
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
      
      res.json({ 
        success: true,
        campaignId: campaignId,
        total: userClients.length,
        message: `Invio in corso a ${userClients.length} clienti...`,
        campaignSaved: true
      });
      
      const bgCampaignId = campaignId;
      const bgChannel = channel;
      const bgTitle = title;
      const bgMessage = message;
      const bgUserClients = userClients;
      const bgUserId = user.id;
      const bgAttachments = attachments;
      
      setImmediate(async () => {
        try {
      
      let emailConfig: any = null;
      if (bgChannel === 'email' || bgChannel === 'both') {
        try {
          const { getEmailConfig } = await import('../utils/emailConfig');
          emailConfig = await getEmailConfig(bgUserId);
        } catch (error) {
          console.error('❌ Errore caricamento config email:', error);
        }
      }
      
      let sentCount = 0;
      
      if (bgChannel === 'whatsapp' || bgChannel === 'both') {
        let phoneDevice: any = null;
        let deviceConnected = false;
        
        try {
          const phoneDeviceModule = await import('../services/phoneDeviceService');
          phoneDevice = phoneDeviceModule.phoneDeviceService;
          deviceConnected = phoneDevice.getStatus().status === 'connected';
        } catch (error) {
          console.warn('⚠️ WhatsApp Web non disponibile');
        }
        
        for (const client of bgUserClients) {
          if (client.phone) {
            try {
              const whatsappLink = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(bgMessage)}`;
              
              await db.insert(marketingMessages).values({
                userId: bgUserId,
                clientId: client.id,
                campaignName: bgTitle,
                message: bgMessage,
                phone: client.phone,
                status: 'pending',
                whatsappLink: whatsappLink,
              });
              
              sentCount++;
              
              if (deviceConnected && phoneDevice) {
                const result = await phoneDevice.sendWhatsAppMessage(client.phone, bgMessage);
                if (result.success) {
                  await db.update(marketingMessages)
                    .set({ status: 'sent', sentAt: new Date() })
                    .where(eq(marketingMessages.clientId, client.id))
                    .where(eq(marketingMessages.campaignName, bgTitle));
                }
              }
            } catch (error) {
              console.error(`❌ WhatsApp error per ${client.firstName}:`, error);
            }
          }
        }
      }
      
      if (bgChannel === 'email' || bgChannel === 'both') {
        if (emailConfig?.emailEnabled && emailConfig?.emailAddress && emailConfig?.emailPassword) {
          const nodemailer = await import('nodemailer');
          const transporter = nodemailer.default.createTransport({
            service: 'gmail',
            auth: {
              user: emailConfig.emailAddress,
              pass: emailConfig.emailPassword,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          });
          
          const linkifyHtml = (text: string) => {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            return text.replace(/\n/g, '<br>').replace(urlRegex, '<a href="$1" style="color: #0066cc;">$1</a>');
          };
          
          for (const client of bgUserClients) {
            if (client.email) {
              try {
                const mailOptions: any = {
                  from: emailConfig.emailAddress,
                  to: client.email,
                  subject: bgTitle,
                  text: bgMessage,
                  html: linkifyHtml(bgMessage),
                };
                
                if (bgAttachments.length > 0) {
                  mailOptions.attachments = bgAttachments.map((file: any) => ({
                    filename: file.originalname,
                    content: file.buffer,
                    contentType: file.mimetype
                  }));
                }
                
                await transporter.sendMail(mailOptions);
                sentCount++;
              } catch (error) {
                console.error(`❌ Email error per ${client.email}:`, error);
              }
            }
          }
        }
      }
      
      await db.update(marketingCampaigns)
        .set({ 
          status: 'sent',
          sentTo: sentCount,
          sentAt: new Date()
        })
        .where(eq(marketingCampaigns.id, bgCampaignId));
      
      logger.debug(`✅ [CAMPAIGN SENT] Campagna ID=${bgCampaignId} completata: ${sentCount} messaggi inviati`);
      
        } catch (bgError) {
          console.error('❌ [CAMPAIGN BG ERROR]:', bgError);
          if (bgCampaignId) {
            try {
              await db.update(marketingCampaigns)
                .set({ status: 'failed' })
                .where(eq(marketingCampaigns.id, bgCampaignId));
            } catch (updateError) {
              console.error('❌ Errore aggiornamento status failed:', updateError);
            }
          }
        }
      });
      
    } catch (error) {
      console.error('❌ [CAMPAIGN ERROR]:', error);
      
      if (campaignId) {
        try {
          await db.update(marketingCampaigns)
            .set({ status: 'failed' })
            .where(eq(marketingCampaigns.id, campaignId));
        } catch (updateError) {
          console.error('❌ Errore aggiornamento status failed:', updateError);
        }
      }
      
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false,
          message: 'Errore nell\'invio della campagna',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // GET /api/campaigns/pending-messages - Carica messaggi marketing WhatsApp pendenti
router.get('/api/campaigns/pending-messages', requireAuth, async (req, res) => {
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
            id: clientsTable.id,
            firstName: clientsTable.firstName,
            lastName: clientsTable.lastName,
            phone: clientsTable.phone,
          }
        })
        .from(marketingMessages)
        .leftJoin(clients, eq(marketingMessages.clientId, clientsTable.id))
        .where(
          and(
            eq(marketingMessages.userId, user.id),
            eq(marketingMessages.status, 'pending')
          )
        )
        .orderBy(asc(marketingMessages.createdAt));
      
      logger.debug(`📱 [MARKETING MESSAGES] Caricati ${pendingMessages.length} messaggi pendenti per user ${user.id}`);
      
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

  // NOTE: client-notes routes moved to server/routes/clientNoteRoutes.ts
  // NOTE: subscription-plans routes moved to server/routes/subscriptionPlanRoutes.ts
  

  // NOTE: forgot-password, verify-reset-token, reset-password moved to server/routes/passwordResetRoutes.ts

  // TEST ENDPOINT - Non richiede auth per debug

export default router;
