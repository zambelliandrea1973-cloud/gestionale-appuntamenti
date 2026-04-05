import { logger } from '../utils/logger';
import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/authMiddleware';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

const router = Router();

  // API per gestire le impostazioni email e calendario - USA CAMPI SMTP CRIPTATI
router.get('/api/email-calendar-settings', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      logger.debug(`📧 [GET EMAIL SETTINGS] Richiesta per utente ${user.id}`);
      
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
      
      logger.debug(`✅ [EMAIL SETTINGS] Caricate per utente ${user.id} - Email: ${response.emailAddress}`);
      res.json(response);
    } catch (error) {
      console.error('❌ [ERRORE EMAIL SETTINGS]:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Errore durante il caricamento delle impostazioni email' 
      });
    }
  });

router.post('/api/email-calendar-settings', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { emailEnabled, emailAddress, emailPassword, emailTemplate, emailSubject, calendarEnabled, calendarId, smtpServer, smtpPort } = req.body;
      
      logger.debug(`📧 [POST EMAIL SETTINGS] Aggiornamento per utente ${user.id}`, {
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
      
      // 🚀 AUTO-DETECTION SMTP: Se emailAddress fornito MA smtpServer/smtpPort NON forniti
      if (emailAddress && !smtpServer && !smtpPort) {
        const detected = detectEmailProvider(emailAddress);
        if (detected) {
          updateData.smtpServer = detected.smtp_server;
          updateData.smtpPort = detected.smtp_port;
          console.log(`✨ [AUTO-DETECTION] Provider rilevato: ${detected.providerName || detected.smtp_server} (${detected.smtp_server}:${detected.smtp_port})`);
          
          // Se provider richiede App Password (Gmail, iCloud), logga avviso
          if (detected.requiresAppPassword) {
            logger.debug(`⚠️ [AUTO-DETECTION] ${detected.providerName} richiede App Password - sarà verificato al test`);
          }
        } else {
          // Fallback generico: smtp.domain:587
          const domain = emailAddress.split('@')[1];
          updateData.smtpServer = `smtp.${domain}`;
          updateData.smtpPort = 587;
          logger.debug(`⚠️ [AUTO-DETECTION] Provider sconosciuto, fallback generico: smtp.${domain}:587`);
        }
      } else if (smtpServer !== undefined || smtpPort !== undefined) {
        // Configurazione manuale fornita dall'utente (override)
        if (smtpServer !== undefined) updateData.smtpServer = smtpServer;
        if (smtpPort !== undefined) updateData.smtpPort = smtpPort;
        logger.debug(`🔧 [MANUAL CONFIG] SMTP configurato manualmente: ${smtpServer || 'default'}:${smtpPort || 'default'}`);
      }
      
      await storage.updateUserSettings(user.id, updateData);
      logger.debug(`✅ [EMAIL SETTINGS] Salvate per utente ${user.id} - Email: ${emailAddress || 'non modificata'}`);
      
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
router.get('/api/email-calendar-settings/show-password', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      logger.debug(`🔓 [SHOW PASSWORD] Richiesta per utente ${user.id}`);
      
      const { getEmailConfig } = await import('../utils/emailConfig');
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

router.post('/api/test-system-email', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.type !== 'admin') {
        return res.status(403).json({ success: false, error: 'Solo admin' });
      }
      
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Indirizzo email richiesto' });
      }
      
      const { sendSystemEmail } = await import('../services/systemEmailService');
      const result = await sendSystemEmail(
        email,
        'Test Email Sistema - Verifica Funzionamento',
        `<h2>Test Email di Sistema</h2>
         <p>Questa email conferma che il sistema di invio email funziona correttamente.</p>
         <p><strong>Server:</strong> ${process.env.PRODUCTION_DOMAIN || 'Replit development'}</p>
         <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>`
      );
      
      if (result.success) {
        logger.debug(`✅ [SYSTEM EMAIL TEST] Email inviata a ${email} da ${result.senderEmail}`);
        res.json({ success: true, senderEmail: result.senderEmail });
      } else {
        console.error(`❌ [SYSTEM EMAIL TEST] Errore: ${result.error}`);
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error(`❌ [SYSTEM EMAIL TEST] Errore:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API per inviare email di test - USA CREDENZIALI UTENTE
router.post('/api/email-calendar-settings/send-test-email', requireAuth, async (req, res) => {
    try {
      const { email } = req.body;
      const user = req.user!;
      
      logger.debug(`📧 [TEST EMAIL] Richiesta per utente ${user.id} → ${email}`);
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          error: 'Indirizzo email richiesto' 
        });
      }
      
      const { getEmailConfig } = await import('../utils/emailConfig');
      const emailConfig = await getEmailConfig(user.id);
      
      if (!emailConfig || !emailConfig.emailAddress || !emailConfig.emailPassword) {
        return res.status(400).json({
          success: false,
          error: 'Configurazione email non trovata. Configura prima le credenziali SMTP.'
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
          <p>Questa è un'email di test dal sistema di gestione appuntamenti.</p>
          <p><strong>Data invio:</strong> ${new Date().toLocaleString('it-IT')}</p>
          <p><strong>Da:</strong> ${emailConfig.emailAddress}</p>
          <p>Se ricevi questa email, la configurazione è corretta!</p>
        `
      });
      
      logger.debug(`✅ [TEST EMAIL] Inviata con successo a ${email}`);
      
      res.json({
        success: true,
        message: `Email di test inviata con successo a ${email}`
      });
      
    } catch (error: any) {
      console.error('❌ [ERRORE TEST EMAIL]:', error);
      
      const { detectEmailProvider } = await import('../utils/emailProviderDetection');
      const user = req.user!;
      const { getEmailConfig } = await import('../utils/emailConfig');
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

  // Servire file statici da attached_assets per icone
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
