// @ts-nocheck
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

  // Test endpoint to force execution of the reminder system
router.post("/api/test-reminder-system", requireAuth, async (req, res) => {
    try {
      console.log('🔧 Manual test of reminder system requested');
      
      // Import and run the reminder service
      const { notificationService } = await import('../services/notificationService');
      
      console.log('📨 Starting reminder processor test...');
      const remindersSent = await notificationService.processReminders();
      
      res.json({
        success: true,
        message: `Test completed: ${remindersSent} reminders processed`,
        remindersSent,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ Error testing reminder system:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Direct test endpoint for email sending - DEBUG
router.post("/api/test-email-direct", requireAuth, async (req, res) => {
    try {
      console.log('🔧 TEST DIRETTO EMAIL - Inizio debug');
      
      const { notificationService } = await import('../services/notificationService');
      const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
      
      if (!fs.existsSync(emailConfigPath)) {
        throw new Error('File email_settings.json not found');
      }
      
      const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
      console.log('📧 Email configuration loaded:', {
        enabled: emailConfig.emailEnabled,
        address: emailConfig.emailAddress,
        hasPassword: !!emailConfig.emailPassword
      });
      
      if (!emailConfig.emailEnabled || !emailConfig.emailAddress || !emailConfig.emailPassword) {
        throw new Error('Email configuration incomplete');
      }
      
      // Simple test email
      const testEmail = req.body.testEmail || 'zambelli.andrea.1973@gmail.com';
      console.log(`🧪 Sending test email to: ${testEmail}`);
      
      const emailSent = await notificationService.sendEmailDirect(
        testEmail,
        'Email System Test',
        `Test email from the system.\n\nDate/Time: ${new Date().toLocaleString('en-GB')}\n\nIf you receive this email, the system is working correctly!`,
        emailConfig
      );
      
      res.json({
        success: emailSent,
        message: emailSent ? 'Test email sent successfully!' : 'Error sending email',
        testEmail,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ Error in direct email test:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ========== ONBOARDING AI ENDPOINTS ==========

  // GET /api/onboarding/progress - Retrieve the user's onboarding progress
router.get('/api/onboarding/progress', requireAuth, (req, res) => {
    try {
      const user = req.user as any;
      const storageData = loadStorageData();
      
      // Search for user onboarding progress
      const onboardingKey = `onboarding_${user.id}`;
      const progress = storageData[onboardingKey] || {
        userId: user.id,
        currentStep: 0,
        completedSteps: [],
        isCompleted: false
      };
      
      res.json(progress);
    } catch (error: any) {
      console.error('❌ Error loading onboarding progress:', error);
      res.status(500).json({ message: 'Error loading progress' });
    }
  });

  // POST /api/onboarding/update-step - Update the current onboarding step
router.post('/api/onboarding/update-step', requireAuth, (req, res) => {
    try {
      const user = req.user as any;
      const { currentStep, stepData, completedSteps } = req.body;
      
      const storageData = loadStorageData();
      const onboardingKey = `onboarding_${user.id}`;
      
      // Update or create the progress
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
    } catch (error: any) {
      console.error('❌ Error updating onboarding step:', error);
      res.status(500).json({ message: 'Error updating step' });
    }
  });

  // POST /api/onboarding/analyze - Analyze business data with AI in the user's language
router.post('/api/onboarding/analyze', requireAuth, async (req, res) => {
    try {
      const { businessName, businessType, description, language } = req.body;
      // Language from the body (client i18n) or from the Accept-Language header as fallback
      const lang = (language || (req.headers['accept-language'] || 'en').toString().split(',')[0] || 'en')
        .toLowerCase().split('-')[0];

      console.log('🤖 [AI ONBOARDING] Analysis request for:', businessName, '- language:', lang);

      // Call the AI service to analyze the business in the correct language
      const analysis = await analyzeBusinessNeeds({
        businessName,
        businessDescription: description,
        targetClients: businessType,
        language: lang,
      });

      console.log('✅ [AI ONBOARDING] Analysis completed');
      res.json(analysis);
    } catch (error: any) {
      console.error('❌ Error in AI analysis:', error);
      // The localized fallback is already handled inside analyzeBusinessNeeds, but in case of
      // error before the call, return the minimal English fallback
      res.json({
        suggestedBusinessType: 'consulting',
        recommendedServices: ['Consultation', 'Follow-up', 'Initial visit'],
        workingHoursRecommendation: 'Monday to Friday, 9:00 AM to 6:00 PM',
        clientManagementNeeds: ['appointment-scheduling', 'client-communication'],
        communicationPreferences: ['email', 'whatsapp'],
        integrationGoals: ['calendar-sync', 'automated-reminders'],
        personalizedTips: [
          'Start with basic appointment scheduling',
          'Set up automated reminders to reduce no-shows',
          'Create a simple client portal for easy booking',
        ],
      });
    }
  });

  // POST /api/onboarding/complete - Apply the data collected in the wizard to real entities
router.post('/api/onboarding/complete', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.id;
      const storageData = loadStorageData();
      const onboardingKey = `onboarding_${userId}`;

      // Retrieve the data collected during the wizard (from body or storage)
      const stored = storageData[onboardingKey] || {};
      const rawStepData = (req.body && req.body.stepData) || stored;

      // Whitelist of fields accepted by the wizard to avoid over-posting in JSON storage
      const ALLOWED_FIELDS = [
        'businessName', 'businessType', 'description',
        'primaryServices', 'appointmentDuration',
        'workingDays', 'workingHoursStart', 'workingHoursEnd', 'dailySchedule',
        'clientManagementNeeds', 'communicationPreferences', 'integrationGoals',
        'analysis',
      ];
      const stepData: any = {};
      for (const k of ALLOWED_FIELDS) {
        if (rawStepData[k] !== undefined) stepData[k] = rawStepData[k];
      }

      const created = {
        businessData: false,
        services: 0,
        workingHours: false,
        preferences: false,
      };

      // 1) Business data → userSettings
      if (stepData.businessName || stepData.businessType) {
        try {
          const currentSettings = await storage.getUserSettings(userId);
          const currentPrefs = (currentSettings?.preferences as any) || {};
          await storage.updateUserSettings(userId, {
            businessName: stepData.businessName || currentSettings?.businessName,
            preferences: {
              ...currentPrefs,
              businessData: {
                ...(currentPrefs.businessData || {}),
                companyName: stepData.businessName || currentPrefs?.businessData?.companyName || '',
                businessType: stepData.businessType || currentPrefs?.businessData?.businessType || '',
                description: stepData.description || currentPrefs?.businessData?.description || '',
                updatedAt: new Date().toISOString(),
              },
            },
          });
          // Also update the JSON storage used by GET /api/company-business-date
          if (!storageData.userBusinessData) storageData.userBusinessData = {};
          storageData.userBusinessData[userId] = {
            ...(storageData.userBusinessData[userId] || {}),
            companyName: stepData.businessName || storageData.userBusinessData[userId]?.companyName || '',
            businessType: stepData.businessType || storageData.userBusinessData[userId]?.businessType || '',
          };
          created.businessData = true;
        } catch (e) {
          console.error('⚠️ [ONBOARDING] Error saving company data:', e);
        }
      }

      // 2) Selected services → services table (only those not yet present)
      if (Array.isArray(stepData.primaryServices) && stepData.primaryServices.length > 0) {
        try {
          const existingServices = await storage.getServices(userId);
          const existingNames = new Set(
            existingServices
              .filter((s: any) => !s.isDemo)
              .map((s: any) => (s.name || '').trim().toLowerCase())
          );
          const palette = ['#3f51b5', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#f44336', '#795548'];
          let colorIdx = 0;
          for (const serviceName of stepData.primaryServices) {
            const trimmed = (serviceName || '').toString().trim();
            if (!trimmed) continue;
            if (existingNames.has(trimmed.toLowerCase())) continue;
            await storage.createService({
              userId,
              name: trimmed,
              duration: stepData.appointmentDuration || 30,
              color: palette[colorIdx % palette.length],
              price: 0,
              onlineBooking: true,
              isDemo: false,
            } as any);
            colorIdx++;
            created.services++;
          }
          // Clean up demo data if there are real services
          if (created.services > 0) {
            try {
              const { cleanupDemoDataIfNeeded } = await import('../services/onboardingDemoService');
              await cleanupDemoDataIfNeeded(userId, 'services');
            } catch (e) {
              console.error('⚠️ [ONBOARDING] Demo services cleanup failed:', e);
            }
          }
        } catch (e) {
          console.error('⚠️ [ONBOARDING] Error creating services:', e);
        }
      }

      // 3) Working hours → userSettings
      if (stepData.workingDays || stepData.workingHoursStart || stepData.workingHoursEnd || stepData.dailySchedule) {
        try {
          const settingsUpdate: any = {};
          // Stricter regex: HH:MM with HH 00-23 and MM 00-59
          const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
          const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          if (stepData.workingHoursStart && timeRegex.test(stepData.workingHoursStart)) {
            settingsUpdate.workingHoursStart = stepData.workingHoursStart;
          }
          if (stepData.workingHoursEnd && timeRegex.test(stepData.workingHoursEnd)) {
            settingsUpdate.workingHoursEnd = stepData.workingHoursEnd;
          }
          if (Array.isArray(stepData.workingDays)) {
            const filtered = stepData.workingDays.filter((d: string) => validDays.includes(d));
            if (filtered.length > 0) settingsUpdate.workingDays = filtered;
          }
          if (stepData.dailySchedule && typeof stepData.dailySchedule === 'object') {
            settingsUpdate.dailySchedule = stepData.dailySchedule;
          }
          if (Object.keys(settingsUpdate).length > 0) {
            await storage.updateUserSettings(userId, settingsUpdate);
            created.workingHours = true;
          }
        } catch (e) {
          console.error('⚠️ [ONBOARDING] Error saving working hours:', e);
        }
      }

      // 4) Communication preferences/integrations/clients → preferences.onboarding
      if (
        Array.isArray(stepData.communicationPreferences) ||
        Array.isArray(stepData.integrationGoals) ||
        Array.isArray(stepData.clientManagementNeeds)
      ) {
        try {
          const currentSettings = await storage.getUserSettings(userId);
          const currentPrefs = (currentSettings?.preferences as any) || {};
          await storage.updateUserSettings(userId, {
            preferences: {
              ...currentPrefs,
              onboarding: {
                ...(currentPrefs.onboarding || {}),
                communicationPreferences: stepData.communicationPreferences || currentPrefs?.onboarding?.communicationPreferences || [],
                integrationGoals: stepData.integrationGoals || currentPrefs?.onboarding?.integrationGoals || [],
                clientManagementNeeds: stepData.clientManagementNeeds || currentPrefs?.onboarding?.clientManagementNeeds || [],
              },
            },
          });
          created.preferences = true;
        } catch (e) {
          console.error('⚠️ [ONBOARDING] Error saving preferenze:', e);
        }
      }

      // Update JSON storage with all collected data + completion flag
      storageData[onboardingKey] = {
        ...stored,
        ...stepData,
        userId,
        isCompleted: true,
        completedAt: new Date().toISOString(),
      };
      saveStorageData(storageData);

      console.log('✅ [AI ONBOARDING] Onboarding applied for user', userId, '-', created);

      res.json({
        success: true,
        isCompleted: true,
        applied: created,
        welcomeMessage: 'Your configuration has been completed successfully! You are ready to start.',
      });
    } catch (error: any) {
      console.error('❌ Error completing onboarding:', error);
      res.status(500).json({ message: 'Error completing onboarding' });
    }
  });

  // POST /api/ai-chat - Chat conversazionale con AI
router.post('/api/ai-chat', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { messages, includeContext } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: 'Messaggi invalid' });
      }
      
      console.log('💬 [AI CHAT] New request from user', user.id);
      
      // Prepare the context if required
      let context: any = {};
      if (includeContext) {
        const storageData = loadStorageData();
        
        // Load client data for personalized suggestions
        const clients = storageData.clients || [];
        const userClients = clients.filter((c: any) => c.ownerId === user.id);
        
        // Load onboarding preferences
        const onboardingKey = `onboarding_${user.id}`;
        const onboardingData = storageData[onboardingKey];
        
        context = {
          clientCount: userClients.length,
          onboardingPreferences: onboardingData
        };
      }
      
      // Process the message with AI
      const response = await processChatMessage({
        messages,
        context
      });
      
      res.json(response);
    } catch (error: any) {
      console.error('❌ [AI CHAT] Error:', error);
      res.status(500).json({ 
        message: 'Error communicating with AI',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /api/ai/generate-campaign - Generate marketing campaign with AI (Only Pro+)
router.post('/api/ai/generate-campaign', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Verify that the user has a Pro or higher license
      const userLicenses = await db.select().from(licenses).where(eq(licenses.userId, user.id));
      const activeLicense = userLicenses.find(l => l.isActive);
      const licenseType = activeLicense?.type || 'trial';
      
      const allowedTypes = ['trial', 'pro', 'business', 'staff_free', 'staff_free_10years', 'passepartout'];
      if (!allowedTypes.includes(licenseType)) {
        return res.status(403).json({ 
          message: 'This feature is available only for Pro or higher users',
          requiredPlan: 'Pro'
        });
      }
      
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ message: 'Prompt invalid' });
      }
      
      console.log('📧 [CAMPAIGN API] Generating campaign for user', user.id, '- License:', licenseType);
      logger.debug('📧 [CAMPAIGN API] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
      
      let campaign;
      try {
        campaign = await generateMarketingCampaign(prompt);
      } catch (aiError: any) {
        console.error('❌ [CAMPAIGN API] Error generating AI content:', aiError?.message || aiError);
        campaign = {
          title: 'New Marketing Campaign',
          message: `Messaggio personalizzato: ${prompt.substring(0, 300)}`
        };
      }
      
      res.json({
        message: `✅ I created your campaign: "${campaign.title}"!\n\nYou can modify the message if you want, or click the buttons below to send it to your clients.`,
        campaign: {
          title: campaign.title,
          message: campaign.message
        }
      });
    } catch (error: any) {
      console.error('❌ [CAMPAIGN API] General error:', error);
      res.status(500).json({ 
        message: 'Error generating campaign',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET /api/campaigns - Retrieve campaign history from database
router.get('/api/campaigns', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Load user campaigns from the database
      const userCampaigns = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.userId, user.id))
        .orderBy(desc(marketingCampaigns.createdAt));
      
      res.json(userCampaigns);
    } catch (error: any) {
      console.error('❌ [CAMPAIGNS] Error loading campaigns:', error);
      res.status(500).json({ 
        message: 'Error loading campaigns',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // DELETE /api/campaigns/:id - Delete a campaign from the database
router.delete('/api/campaigns/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'Invalid campaign ID' });
      }
      
      // Verify that the campaign belongs to the user
      const campaign = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.id, campaignId))
        .limit(1);
      
      if (campaign.length === 0) {
        return res.status(404).json({ message: 'Campagna not found' });
      }
      
      if (campaign[0].userId !== user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      // Delete the campaign
      await db
        .delete(marketingCampaigns)
        .where(eq(marketingCampaigns.id, campaignId));
      
      res.json({ success: true, message: 'Campaign deleted successfully' });
    } catch (error: any) {
      console.error('❌ [CAMPAIGNS] Error deleting campaign:', error);
      res.status(500).json({ 
        message: 'Error deleting campaign',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /api/campaigns/send-batch - Send campaign to all clients
  const uploadCampaign = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      // Accept images and video only
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
      
      // Verify Pro or higher license
      const userLicenses = await db.select().from(licenses).where(eq(licenses.userId, user.id));
      const activeLicense = userLicenses.find(l => l.isActive);
      const licenseType = activeLicense?.type || 'trial';
      
      const allowedTypes = ['trial', 'pro', 'business', 'staff_free', 'staff_free_10years', 'passepartout'];
      if (!allowedTypes.includes(licenseType)) {
        return res.status(403).json({ 
          message: 'This feature is available only for Pro or higher users',
          requiredPlan: 'Pro'
        });
      }
      
      const { title, message, channel } = req.body;
      const attachments = (req.files as Express.Multer.File[]) || [];
      
      console.log('📤 [CAMPAIGN NEW] Campaign send request:', title, '- Channel:', channel);
      
      // 🔐 STEP 1: GENERATE IDEMPOTENCY KEY WITH DATE (userId + title + message + date)
      // Include the current date (YYYY-MM-DD) so the same campaign can be sent on different days
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const idempotencyData = `${user.id}-${title}-${message}-${currentDate}`;
      const idempotencyKey = crypto.createHash('sha256').update(idempotencyData).digest('hex');
      
      // 🔒 STEP 2: BLOCK - Check if the campaign has already been sent or is in progress
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
          console.log('🔒 [CAMPAIGN IN PROGRESS] Campaign already being sent:', title);
          return res.status(400).json({ 
            success: false,
            alreadySent: true,
            message: `⚠️ This campaign is being sent. Please wait for it to complete.`
          });
        }
        const sentTime = new Date(existingCampaign[0].createdAt!).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
        console.log('🚫 [CAMPAIGN BLOCKED] Campaign already sent today:', title);
        return res.status(400).json({ 
          success: false,
          alreadySent: true,
          message: `⚠️ This campaign was already sent today at ${sentTime}. You can send it again tomorrow.`,
          sentDate: existingCampaign[0].createdAt,
          sentTo: existingCampaign[0].sentTo
        });
      }
      
      // Load clients
      const userClients = await storage.getVisibleClientsForUser(user.id, user.type, user.assignmentCode);
      
      if (userClients.length === 0) {
        return res.json({ sent: 0, message: 'No clients found' });
      }
      
      // 💾 STEP 3: CREATE CAMPAIGN RECORD WITH STATUS='LOCKED' (BEFORE SENDING!)
      const uniqueCode = crypto.randomBytes(8).toString('hex');
      const [newCampaign] = await db.insert(marketingCampaigns).values({
        userId: user.id,
        title: title,
        message: message,
        uniqueCode: uniqueCode,
        sentTo: 0,
        status: 'locked', // BLOCKED during send
        idempotencyKey: idempotencyKey,
        attachmentPaths: [],
        attachmentTypes: [],
      }).returning();
      
      campaignId = newCampaign.id;
      
      res.json({ 
        success: true,
        campaignId: campaignId,
        total: userClients.length,
        message: `Sending in progress to ${userClients.length} clients...`,
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
        } catch (error: any) {
          console.error('❌ Error loading email configuration:', error);
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
        } catch (error: any) {
          console.warn('⚠️ WhatsApp Web not available');
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
            } catch (error: any) {
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
              } catch (error: any) {
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
      
      logger.debug(`✅ [CAMPAIGN SENT] Campaign ID=${bgCampaignId} completed: ${sentCount} messages sent`);
      
        } catch (bgError) {
          console.error('❌ [CAMPAIGN BG ERROR]:', bgError);
          if (bgCampaignId) {
            try {
              await db.update(marketingCampaigns)
                .set({ status: 'failed' })
                .where(eq(marketingCampaigns.id, bgCampaignId));
            } catch (updateError) {
              console.error('❌ Error updating status to failed:', updateError);
            }
          }
        }
      });
      
    } catch (error: any) {
      console.error('❌ [CAMPAIGN ERROR]:', error);
      
      if (campaignId) {
        try {
          await db.update(marketingCampaigns)
            .set({ status: 'failed' })
            .where(eq(marketingCampaigns.id, campaignId));
        } catch (updateError) {
          console.error('❌ Error updating status to failed:', updateError);
        }
      }
      
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false,
          message: 'Error sending campaign',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // GET /api/campaigns/pending-messages - Load pending WhatsApp marketing messages
router.get('/api/campaigns/pending-messages', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!user || !user.id) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      
      // Load pending marketing messages with client information (JOIN)
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
        .leftJoin(clientsTable, eq(marketingMessages.clientId, clientsTable.id))
        .where(
          and(
            eq(marketingMessages.userId, user.id),
            eq(marketingMessages.status, 'pending')
          )
        )
        .orderBy(asc(marketingMessages.createdAt));
      
      logger.debug(`📱 [MARKETING MESSAGES] Loaded ${pendingMessages.length} pending messages for user ${user.id}`);
      
      res.json({
        success: true,
        messages: pendingMessages
      });
      
    } catch (error: any) {
      console.error('❌ [MARKETING MESSAGES] Error loading:', error);
      res.status(500).json({
        success: false,
        error: 'Error loading marketing messages'
      });
    }
  });

  // NOTE: client-notes routes moved to server/routes/clientNoteRoutes.ts
  // NOTE: subscription-plans routes moved to server/routes/subscriptionPlanRoutes.ts
  

  // NOTE: forgot-password, verify-reset-token, reset-password moved to server/routes/passwordResetRoutes.ts

  // TEST ENDPOINT - Does not require auth for debug

export default router;
