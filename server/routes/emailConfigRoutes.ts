import { logger } from '../utils/logger';
import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/authMiddleware';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

const router = Router();

  // API to manage email and calendar settings - USES ENCRYPTED SMTP FIELDS
router.get('/api/email-calendar-settings', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      logger.debug(`📧 [GET EMAIL SETTINGS] Request for user ${user.id}`);
      
      const defaultTemplate = `Dear {{nome}} {{cognome}},

This is a reminder for your {{servizio}} appointment scheduled for {{data}} at {{ora}}.

For any changes or cancellations, please contact us.

Best regards,
Professional Studio`;

      const settings = await storage.getUserSettings(user.id);
      
      const response = {
        emailEnabled: settings?.smtpEnabled || false,
        emailAddress: settings?.smtpEmail || '',
        emailPassword: settings?.smtpPasswordEncrypted ? '••••••••••' : '',
        emailTemplate: settings?.emailTemplate || defaultTemplate,
        emailSubject: settings?.emailSubject || "Appointment reminder for {{data}}",
        hasPasswordSaved: !!settings?.smtpPasswordEncrypted,
        smtpServer: settings?.smtpServer || 'smtp.gmail.com',
        smtpPort: settings?.smtpPort || 587,
        calendarEnabled: settings?.calendarIntegrationEnabled || false,
        calendarId: settings?.defaultCalendarId || '',
        googleAuthStatus: { authorized: false }
      };
      
      logger.debug(`✅ [EMAIL SETTINGS] Loaded for user ${user.id} - Email: ${response.emailAddress}`);
      res.json(response);
    } catch (error) {
      console.error('❌ [EMAIL SETTINGS ERROR]:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error loading email settings' 
      });
    }
  });

router.post('/api/email-calendar-settings', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { emailEnabled, emailAddress, emailPassword, emailTemplate, emailSubject, calendarEnabled, calendarId, smtpServer, smtpPort } = req.body;
      
      logger.debug(`📧 [POST EMAIL SETTINGS] Updating for user ${user.id}`, {
        emailEnabled,
        emailAddress,
        hasPassword: !!emailPassword,
        passwordMasked: emailPassword === '••••••••••'
      });
      
      const { encryptPassword } = await import('../utils/encryption');
      const { detectEmailProvider } = await import('../utils/emailProviderDetection');
      
      const updateData: any = {};
      
      if (emailEnabled !== undefined) updateData.smtpEnabled = emailEnabled;
      if (emailAddress !== undefined) updateData.smtpEmail = emailAddress;
      if (emailPassword !== undefined && emailPassword !== '••••••••••') {
        updateData.smtpPasswordEncrypted = encryptPassword(emailPassword);
        logger.debug(`🔐 [EMAIL SETTINGS] Password criptata con AES-256-GCM`);
      }
      if (emailTemplate !== undefined) updateData.emailTemplate = emailTemplate;
      if (emailSubject !== undefined) updateData.emailSubject = emailSubject;
      if (calendarEnabled !== undefined) updateData.calendarIntegrationEnabled = calendarEnabled;
      if (calendarId !== undefined) updateData.defaultCalendarId = calendarId;
      
      // 🚀 AUTO-DETECTION SMTP: If emailAddress fornito MA smtpServer/smtpPort NON forniti
      if (emailAddress && !smtpServer && !smtpPort) {
        const detected = detectEmailProvider(emailAddress);
        if (detected) {
          updateData.smtpServer = detected.smtp_server;
          updateData.smtpPort = detected.smtp_port;
          console.log(`✨ [AUTO-DETECTION] Provider rilevato: ${detected.providerName || detected.smtp_server} (${detected.smtp_server}:${detected.smtp_port})`);
          
          // If provider richiede App Password (Gmail, iCloud), logga avviso
          if (detected.requiresAppPassword) {
            logger.debug(`⚠️ [AUTO-DETECTION] ${detected.providerName} requires App Password - will be verified on test`);
          }
        } else {
          // Fallback generico: smtp.domain:587
          const domain = emailAddress.split('@')[1];
          updateData.smtpServer = `smtp.${domain}`;
          updateData.smtpPort = 587;
          logger.debug(`⚠️ [AUTO-DETECTION] Unknown provider, using generic fallback: smtp.${domain}:587`);
        }
      } else if (smtpServer !== undefined || smtpPort !== undefined) {
        // Manual configuration provided by user (override)
        if (smtpServer !== undefined) updateData.smtpServer = smtpServer;
        if (smtpPort !== undefined) updateData.smtpPort = smtpPort;
        logger.debug(`🔧 [MANUAL CONFIG] SMTP manually configured: ${smtpServer || 'default'}:${smtpPort || 'default'}`);
      }
      
      await storage.updateUserSettings(user.id, updateData);
      logger.debug(`✅ [EMAIL SETTINGS] Saved for user ${user.id} - Email: ${emailAddress || 'not modified'}`);
      
      res.json({
        success: true,
        message: 'Email settings updated successfully',
        autoDetected: emailAddress && !smtpServer && !smtpPort
      });
    } catch (error) {
      console.error('❌ [SAVE EMAIL SETTINGS ERROR]:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error saving settings email' 
      });
    }
  });

  // API to show email password in plain text (only for authenticated user)
router.get('/api/email-calendar-settings/show-password', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      logger.debug(`🔓 [SHOW PASSWORD] Request for user ${user.id}`);
      
      const { getEmailConfig } = await import('../utils/emailConfig');
      const emailConfig = await getEmailConfig(user.id);
      
      if (!emailConfig || !emailConfig.emailPassword) {
        return res.status(404).json({
          success: false,
          error: 'No password saved'
        });
      }
      
      // Restituisci the password decriptata
      res.json({
        success: true,
        emailPassword: emailConfig.emailPassword // getEmailConfig already decrypts automatically
      });
      
    } catch (error) {
      console.error('❌ [SHOW PASSWORD ERROR]:', error);
      res.status(500).json({
        success: false,
        error: 'Error retrieving password'
      });
    }
  });

router.post('/api/test-system-email', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.type !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access only' });
      }
      
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Indirizzo email required' });
      }
      
      const { sendSystemEmail } = await import('../services/systemEmailService');
      const result = await sendSystemEmail(
        email,
        'Test Email Sistema - Verifica Funzionamento',
        `<h2>Test Email di Sistema</h2>
         <p>This email confirms that the email sending system is working correctly.</p>
         <p><strong>Server:</strong> ${process.env.PRODUCTION_DOMAIN || 'Replit development'}</p>
         <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>`
      );
      
      if (result.success) {
        logger.debug(`✅ [SYSTEM EMAIL TEST] Email sent to ${email} from ${result.senderEmail}`);
        res.json({ success: true, senderEmail: result.senderEmail });
      } else {
        console.error(`❌ [SYSTEM EMAIL TEST] Error: ${result.error}`);
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error(`❌ [SYSTEM EMAIL TEST] Error:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API to send test email - USES USER CREDENTIALS
router.post('/api/email-calendar-settings/send-test-email', requireAuth, async (req, res) => {
    try {
      const { email } = req.body;
      const user = req.user!;
      
      logger.debug(`📧 [TEST EMAIL] Request for user ${user.id} → ${email}`);
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          error: 'Indirizzo email required' 
        });
      }
      
      const { getEmailConfig } = await import('../utils/emailConfig');
      const emailConfig = await getEmailConfig(user.id);
      
      if (!emailConfig || !emailConfig.emailAddress || !emailConfig.emailPassword) {
        return res.status(400).json({
          success: false,
          error: 'Email configuration not found. Please configure SMTP credentials first.'
        });
      }
      
      logger.debug(`📧 [TEST EMAIL] Usando: ${emailConfig.emailAddress}`);
      
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
          <p>This is a test email from the appointment management system.</p>
          <p><strong>Date sent:</strong> ${new Date().toLocaleString('en-US')}</p>
          <p><strong>Da:</strong> ${emailConfig.emailAddress}</p>
          <p>If you receive this email, the configuration is correct!</p>
        `
      });
      
      logger.debug(`✅ [TEST EMAIL] Sent successfully a ${email}`);
      
      res.json({
        success: true,
        message: `Test email sent successfully to ${email}`
      });
      
    } catch (error: any) {
      console.error('❌ [TEST EMAIL ERROR]:', error);
      
      const { detectEmailProvider } = await import('../utils/emailProviderDetection');
      const user = req.user!;
      const { getEmailConfig } = await import('../utils/emailConfig');
      const emailConfig = await getEmailConfig(user.id);
      
      // Detect provider for specific messages
      const detected = emailConfig?.emailAddress ? detectEmailProvider(emailConfig.emailAddress) : null;
      const domain = emailConfig?.emailAddress ? emailConfig.emailAddress.split('@')[1] : '';
      const providerName = detected?.providerName || domain || 'Provider email';
      
      // 🔍 MAPPA ERRORI SMTP A MESSAGGI USER-FRIENDLY
      let userMessage = 'Error sending test email';
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
                     `Server: ${emailConfig?.smtpServer || 'not configured'}\n` +
                     `Port: ${emailConfig?.smtpPort || 'not configured'}\n\n` +
                     `Possibili cause:\n` +
                     `• The SMTP server is incorrect\n` +
                     `• The port is blocked by the firewall`;
      }
      // ⏱️ CONNECTION TIMEOUT
      else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
        errorCode = 'TIMEOUT';
        userMessage = `⏱️ Timeout durante la connessione a ${providerName}.\n\n` +
                     `Il server SMTP non risponde. Verifica la tua connessione internet.`;
      }
      // 🔍 SERVER NON TROVATO
      else if (error.code === 'ENOTFOUND') {
        errorCode = 'NOT_FOUND';
        userMessage = `❌ Server SMTP not found: ${emailConfig?.smtpServer}\n\n` +
                     `Verifica che il server sia corretto per ${providerName}.`;
      }
      // 🚫 POLICY / SPAM (Libero, Virgilio, ISP italiani)
      else if ((error.responseCode === 550 || error.responseCode === 554) && 
               (error.message?.includes('policy') || error.message?.includes('spam'))) {
        errorCode = 'POLICY_REJECT';
        userMessage = `🚫 The provider ${providerName} has blocked sending.\n\n` +
                     `Possibili cause:\n` +
                     `• Limite di invii giornalieri raggiunto\n` +
                     `• Email classificata come spam\n` +
                     `• Connessione da IP unauthorized\n\n` +
                     `Contact ${providerName} support for more details.`;
      }
      // ⚠️ ERRORE GENERICO
      else {
        userMessage = `Error sending test email.\n\n` +
                     `Dettagli tecnici: ${error.message || 'Unknown error'}`;
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

  // Servire file statici da attached_assets per icons
  router.use('/attached_assets', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'attached_assets', req.path);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving static file:', err);
        res.status(404).send('File not found');
      }
    });
  });

export default router;
