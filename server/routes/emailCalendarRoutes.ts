import { Router } from 'express';
import { isAuthenticated } from '../auth';

const router = Router();

// Template predefinito per l'email
const DEFAULT_EMAIL_TEMPLATE = `Gentile {{nome}} {{cognome}},

Questo è un promemoria per il Suo appuntamento di {{servizio}} previsto per il giorno {{data}} alle ore {{ora}}.

Per qualsiasi modifica o cancellazione, La preghiamo di contattarci.

Cordiali saluti,
Studio Professionale`;

// Oggetto predefinito per l'email
const DEFAULT_EMAIL_SUBJECT = "Promemoria appuntamento del {{data}}";

// Variabile per memorizzare le impostazioni (in un'app reale andrebbero salvate nel database)
let emailCalendarSettings = {
  emailEnabled: false,
  emailAddress: '',
  emailPassword: '',
  emailTemplate: DEFAULT_EMAIL_TEMPLATE,
  emailSubject: DEFAULT_EMAIL_SUBJECT,
  calendarEnabled: false,
  calendarId: '',
  googleAuthStatus: {
    authorized: false,
  }
};

// Ottieni le impostazioni email e calendario
router.get('/', (req, res) => {
  // Non inviare la password reale
  const settingsToSend = {
    ...emailCalendarSettings,
    emailPassword: emailCalendarSettings.emailPassword ? '••••••••••' : '',
  };
  
  res.json(settingsToSend);
});

// Aggiorna le impostazioni email e calendario
router.post('/', (req, res) => {
  try {
    const {
      emailEnabled,
      emailAddress,
      emailPassword,
      emailTemplate,
      emailSubject,
      calendarEnabled,
      calendarId,
    } = req.body;
    
    // Aggiorna solo i campi forniti
    if (emailEnabled !== undefined) emailCalendarSettings.emailEnabled = emailEnabled;
    if (emailAddress !== undefined) emailCalendarSettings.emailAddress = emailAddress;
    if (emailPassword !== undefined && emailPassword !== '••••••••••') {
      emailCalendarSettings.emailPassword = emailPassword;
    }
    if (emailTemplate !== undefined) emailCalendarSettings.emailTemplate = emailTemplate;
    if (emailSubject !== undefined) emailCalendarSettings.emailSubject = emailSubject;
    if (calendarEnabled !== undefined) emailCalendarSettings.calendarEnabled = calendarEnabled;
    if (calendarId !== undefined) emailCalendarSettings.calendarId = calendarId;
    
    res.json({ success: true, message: 'Impostazioni aggiornate con successo' });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento delle impostazioni:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'aggiornamento delle impostazioni' 
    });
  }
});

// Invia un'email di test
router.post('/send-test-email', isAuthenticated, async (req, res) => {
  try {
    if (!emailCalendarSettings.emailEnabled) {
      return res.status(400).json({ 
        success: false, 
        error: 'L\'invio di email non è abilitato nelle impostazioni' 
      });
    }
    
    if (!emailCalendarSettings.emailAddress || !emailCalendarSettings.emailPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Credenziali email mancanti nelle impostazioni' 
      });
    }
    
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Nessun indirizzo email fornito per il test'
      });
    }
    
    // Importiamo il servizio di notifica per inviare l'email
    const { directNotificationService } = await import('../services/directNotificationService');
    
    try {
      // Creiamo un testo di prova per l'email
      let testSubject = emailCalendarSettings.emailSubject;
      let testMessage = emailCalendarSettings.emailTemplate;
      
      // Sostituiamo le variabili con valori di esempio
      testSubject = testSubject.replace(/{{data}}/g, '15/05/2025');
      testMessage = testMessage
        .replace(/{{nome}}/g, 'Mario')
        .replace(/{{cognome}}/g, 'Rossi')
        .replace(/{{servizio}}/g, 'Consulenza')
        .replace(/{{data}}/g, '15/05/2025')
        .replace(/{{ora}}/g, '10:00');
      
      // Creiamo un trasportatore NodeMailer per questo test specifico
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', // Server SMTP di Gmail
        port: 587,
        secure: false, // true per porta 465, false per altre porte
        auth: {
          user: emailCalendarSettings.emailAddress,
          pass: emailCalendarSettings.emailPassword,
        },
        debug: true, // Attiva debug per vedere dettagli di connessione
      });
      
      // Verifichiamo la connessione prima di inviare
      await transporter.verify();
      console.log('Connessione SMTP verificata con successo');
      
      // Inviamo l'email di test
      const mailOptions = {
        from: emailCalendarSettings.emailAddress,
        to: email,
        subject: testSubject,
        text: testMessage,
        html: testMessage.replace(/\n/g, '<br>'),
      };
      
      console.log(`Tentativo di invio email di test a ${email}`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email di test inviata con successo: ${info.messageId}`);
      
      res.json({ 
        success: true, 
        message: 'Email di test inviata con successo' 
      });
    } catch (error) {
      console.error('Errore nell\'invio dell\'email di test:', error);
      
      // Fornisci un messaggio di errore più dettagliato
      let errorMessage = 'Errore durante l\'invio dell\'email di test';
      if (error instanceof Error) {
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Errore durante l\'invio dell\'email di test:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'invio dell\'email di test' 
    });
  }
});

export default router;