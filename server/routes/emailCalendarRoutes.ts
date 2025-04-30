import { Router } from 'express';
import { isAuthenticated } from '../auth';

const router = Router();

// Variabile per memorizzare le impostazioni (in un'app reale andrebbero salvate nel database)
let emailCalendarSettings = {
  emailEnabled: false,
  emailAddress: '',
  emailPassword: '',
  calendarEnabled: false,
  calendarId: '',
  googleAuthStatus: {
    authorized: false,
  }
};

// Ottieni le impostazioni email e calendario
router.get('/', isAuthenticated, (req, res) => {
  // Non inviare la password reale
  const settingsToSend = {
    ...emailCalendarSettings,
    emailPassword: emailCalendarSettings.emailPassword ? '••••••••••' : '',
  };
  
  res.json(settingsToSend);
});

// Aggiorna le impostazioni email e calendario
router.post('/', isAuthenticated, (req, res) => {
  try {
    const {
      emailEnabled,
      emailAddress,
      emailPassword,
      calendarEnabled,
      calendarId,
    } = req.body;
    
    // Aggiorna solo i campi forniti
    if (emailEnabled !== undefined) emailCalendarSettings.emailEnabled = emailEnabled;
    if (emailAddress !== undefined) emailCalendarSettings.emailAddress = emailAddress;
    if (emailPassword !== undefined && emailPassword !== '••••••••••') {
      emailCalendarSettings.emailPassword = emailPassword;
    }
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
    
    // Qui normalmente invieresti un'email di test
    // Per questo esempio, simuliamo un invio avvenuto con successo
    
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