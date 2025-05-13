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

// Importiamo il file system per salvare/caricare le impostazioni in modo persistente
import fs from 'fs';
import path from 'path';

// Percorso del file di configurazione
const CONFIG_FILE_PATH = path.join(process.cwd(), 'email_settings.json');

// Struttura predefinita delle impostazioni
const DEFAULT_SETTINGS = {
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

// Carica le impostazioni dal file o usa i valori predefiniti
function loadSettings() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      const settings = JSON.parse(data);
      console.log('Impostazioni email caricate dal file di configurazione');
      return settings;
    }
  } catch (error) {
    console.error('Errore nel caricamento delle impostazioni email:', error);
  }
  
  // Se il file non esiste o c'è un errore, usa i valori predefiniti
  console.log('Utilizzo delle impostazioni email predefinite');
  return DEFAULT_SETTINGS;
}

// Salva le impostazioni nel file
function saveSettings(settings: any) {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(settings, null, 2), 'utf8');
    console.log('Impostazioni email salvate nel file di configurazione');
    return true;
  } catch (error) {
    console.error('Errore nel salvataggio delle impostazioni email:', error);
    return false;
  }
}

// Carica le impostazioni all'avvio
let emailCalendarSettings = loadSettings();

// Ottieni le impostazioni email e calendario
router.get('/', (req, res) => {
  // Non inviare la password reale per default, ma inviare un flag che indica se è impostata
  const settingsToSend = {
    ...emailCalendarSettings,
    emailPassword: emailCalendarSettings.emailPassword ? '••••••••••' : '',
    hasPasswordSaved: !!emailCalendarSettings.emailPassword, // Indica se una password è stata salvata
  };
  
  res.json(settingsToSend);
});

// Endpoint per ottenere la password in chiaro (senza middleware per debug)
router.get('/show-password', (req, res) => {
  console.log("Richiesta password salvata ricevuta");
  if (!emailCalendarSettings.emailPassword) {
    console.log("Nessuna password salvata trovata");
    return res.status(404).json({
      success: false,
      error: 'Nessuna password salvata'
    });
  }
  
  console.log("Password trovata, invio risposta al client");
  // Stampa i dati che verranno inviati per debug
  const responseData = {
    success: true,
    emailPassword: emailCalendarSettings.emailPassword
  };
  console.log("Dati risposta:", JSON.stringify(responseData));
  res.json(responseData);
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
    if (emailPassword !== undefined) {
      emailCalendarSettings.emailPassword = emailPassword;
    }
    if (emailTemplate !== undefined) emailCalendarSettings.emailTemplate = emailTemplate;
    if (emailSubject !== undefined) emailCalendarSettings.emailSubject = emailSubject;
    if (calendarEnabled !== undefined) emailCalendarSettings.calendarEnabled = calendarEnabled;
    if (calendarId !== undefined) emailCalendarSettings.calendarId = calendarId;
    
    // Salva le impostazioni in modo persistente
    const saved = saveSettings(emailCalendarSettings);
    
    if (saved) {
      res.json({ success: true, message: 'Impostazioni aggiornate con successo' });
    } else {
      throw new Error('Errore nel salvataggio delle impostazioni');
    }
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
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
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