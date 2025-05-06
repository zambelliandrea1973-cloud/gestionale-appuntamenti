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
    
    // Qui normalmente invieresti un'email di test
    // Per questo esempio, simuliamo un invio avvenuto con successo
    console.log(`Invio email di test a ${email} usando le seguenti impostazioni:`, {
      mittente: emailCalendarSettings.emailAddress,
      oggetto: emailCalendarSettings.emailSubject,
      template: emailCalendarSettings.emailTemplate,
    });
    
    res.json({ 
      success: true, 
      message: 'Email di test inviata con successo' 
    });
  } catch (error) {
    console.error('Errore durante l\'invio dell\'email di test:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'invio dell\'email di test' 
    });
  }
});

export default router;