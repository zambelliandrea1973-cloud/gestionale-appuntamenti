import { Router } from 'express';
import { google } from 'googleapis';
import { isAuthenticated } from '../auth';

const router = Router();

// Configura l'OAuth client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL || 'http://localhost:3000'}/api/google-auth/callback`
);

// Scopes necessari per Calendar e Gmail
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
];

let authInfo: {
  authorized: boolean;
  tokens?: any;
} = {
  authorized: false,
};

// Inizia il processo di autorizzazione
router.get('/start', isAuthenticated, (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Forza il prompt di consenso per ottenere sempre il refresh token
    });
    
    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Errore nella generazione URL di auth:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nella generazione dell\'URL di autorizzazione' 
    });
  }
});

// Callback che riceve il codice di autorizzazione
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Codice di autorizzazione mancante');
  }
  
  try {
    // Scambia il codice con i token
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    
    // Salva i token (in un'applicazione reale andrebbero salvati nel database)
    authInfo = {
      authorized: true,
      tokens
    };
    
    // Chiude la finestra popup se è stata aperta come popup
    res.send(`
      <html>
        <head>
          <title>Autorizzazione completata</title>
          <script>
            window.onload = function() {
              window.opener ? window.opener.postMessage('google-auth-success', '*') : window.location.href = '/settings';
              setTimeout(function() {
                window.close();
              }, 2000);
            }
          </script>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              text-align: center;
              background-color: #f8f9fa;
            }
            .card {
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              padding: 30px;
              max-width: 500px;
              margin: 40px auto;
            }
            h1 {
              color: #4CAF50;
              margin-bottom: 20px;
            }
            p {
              color: #666;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✅ Autorizzazione completata!</h1>
            <p>L'account Google è stato autorizzato con successo.</p>
            <p>Questa finestra si chiuderà automaticamente tra pochi secondi...</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Errore nello scambio del codice di autorizzazione:', error);
    res.status(500).send(`
      <html>
        <head>
          <title>Errore di autorizzazione</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              text-align: center;
              background-color: #f8f9fa;
            }
            .card {
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              padding: 30px;
              max-width: 500px;
              margin: 40px auto;
            }
            h1 {
              color: #f44336;
              margin-bottom: 20px;
            }
            p {
              color: #666;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⚠️ Errore di autorizzazione</h1>
            <p>Si è verificato un errore durante l'autorizzazione dell'account Google.</p>
            <p>Per favore chiudi questa finestra e riprova.</p>
          </div>
        </body>
      </html>
    `);
  }
});

// Controlla lo stato dell'autorizzazione
router.get('/status', isAuthenticated, (req, res) => {
  res.json({ 
    success: true, 
    authorized: authInfo.authorized 
  });
});

// Revoca l'autorizzazione
router.post('/revoke', isAuthenticated, async (req, res) => {
  if (!authInfo.authorized || !authInfo.tokens) {
    return res.json({ success: true, message: 'Nessuna autorizzazione attiva' });
  }
  
  try {
    // Revoca i token
    await oauth2Client.revokeToken(authInfo.tokens.access_token);
    
    // Resetta lo stato di autorizzazione
    authInfo = {
      authorized: false
    };
    
    res.json({ success: true, message: 'Autorizzazione revocata con successo' });
  } catch (error) {
    console.error('Errore nella revoca del token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nella revoca dell\'autorizzazione' 
    });
  }
});

export default router;