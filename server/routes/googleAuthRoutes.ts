import { Router } from 'express';
import { google } from 'googleapis';
import { isAuthenticated } from '../auth';

const router = Router();

// Configura l'OAuth client
// L'URL qui DEVE corrispondere esattamente a quello configurato nella console Google Cloud
// Utilizziamo un URL FISSO che corrisponde esattamente a quello nella console Google Cloud

// IMPORTANTE: Questo URL deve corrispondere ESATTAMENTE a quello configurato in Google Cloud Console
const redirectUri = 'https://workspace.replit.app/api/google-auth/callback';

// Stampa informazioni di debug aggiuntive
console.log('Debug OAuth URL:', {
  redirectUri
});

console.log("Google OAuth callback URL:", redirectUri);
console.log("Google Credentials:", {
  clientId: process.env.GOOGLE_CLIENT_ID ? "Present (first chars: " + process.env.GOOGLE_CLIENT_ID.substring(0, 5) + "...)" : "Missing",
  secretPresent: process.env.GOOGLE_CLIENT_SECRET ? "Present" : "Missing"
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
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
router.get('/start', (req, res) => {
  try {
    // Stampa il client ID per debug
    console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
    
    // Stampa l'URI esatto di reindirizzamento che stiamo usando
    console.log("Redirect URI esatto:", redirectUri);
    
    // Stampa tutte le variabili d'ambiente rilevanti per il debug
    console.log("Debug variabili ambiente:", {
      REPL_SLUG: process.env.REPL_SLUG || "non impostato",
      REPL_OWNER: process.env.REPL_OWNER || "non impostato",
      REPL_ID: process.env.REPL_ID || "non impostato", 
      CUSTOM_DOMAIN: process.env.CUSTOM_DOMAIN || "non impostato",
      HOST: req.get('host') || "non disponibile"
    });
    
    // Ottieni l'host della richiesta per utilizzare il dominio corretto
    const hostFromRequest = req.get('host');
    let actualRedirectUri = redirectUri;
    
    // Se l'host è diverso da quello che abbiamo calcolato, utilizza quello della richiesta
    if (hostFromRequest && !hostFromRequest.includes('localhost')) {
      const protocol = req.protocol || 'https';
      actualRedirectUri = `${protocol}://${hostFromRequest}/api/google-auth/callback`;
      console.log("Redirect URI aggiornato da header host:", actualRedirectUri);
    }
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      response_type: 'code',
      scope: SCOPES,
      prompt: 'consent', // Forza il prompt di consenso per ottenere sempre il refresh token
      redirect_uri: actualRedirectUri, // Usa l'URI corretto basato sull'host
    });
    
    console.log("Auth URL generato:", authUrl);
    
    res.json({ 
      success: true, 
      authUrl,
      debug: {
        calculatedRedirectUri: redirectUri,
        actualRedirectUri,
        host: req.get('host'),
        protocol: req.protocol
      }
    });
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
  console.log("Callback ricevuto con parametri:", req.query);
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Codice di autorizzazione mancante');
  }
  
  try {
    console.log("Scambio del codice di autorizzazione:", code);
    
    // Ottieni l'host della richiesta per utilizzare il dominio corretto
    const hostFromRequest = req.get('host');
    let actualRedirectUri = redirectUri;
    
    // Se l'host è diverso da quello che abbiamo calcolato, utilizza quello della richiesta
    if (hostFromRequest && !hostFromRequest.includes('localhost')) {
      const protocol = req.protocol || 'https';
      actualRedirectUri = `${protocol}://${hostFromRequest}/api/google-auth/callback`;
      console.log("Callback - Redirect URI aggiornato da header host:", actualRedirectUri);
    }
    
    // Usa l'URI di reindirizzamento corretto per lo scambio del token
    const oauth2ClientForCallback = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      actualRedirectUri
    );
    
    // Scambia il codice con i token
    const { tokens } = await oauth2ClientForCallback.getToken(code as string);
    console.log("Token ottenuti con successo:", tokens);
    
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
router.get('/status', (req, res) => {
  // Aggiungi info di debug
  console.log("Auth status check. Current state:", authInfo);
  
  res.json({ 
    success: true, 
    authorized: authInfo.authorized 
  });
});

// Aggiungiamo un endpoint di debug per determinare il percorso esatto
router.get('/debug-url', (req, res) => {
  const host = req.get('host') || 'unknown';
  const protocol = req.protocol || 'https';
  const path = req.originalUrl || '/api/google-auth/debug-url';
  const fullUrl = `${protocol}://${host}${path}`;
  
  // Mostriamo l'URL completo e tutte le intestazioni HTTP
  res.json({
    success: true,
    debug: {
      host,
      protocol,
      path,
      fullUrl,
      headers: req.headers,
      expectedCallback: redirectUri
    }
  });
});

// Test della configurazione
router.get('/test-configuration', async (req, res) => {
  try {
    // Verifica la presenza dei segreti necessari
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({
        success: false,
        error: 'Credenziali OAuth mancanti. Verifica GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nei segreti di Replit.'
      });
    }
    
    // Verifica se l'URL di callback è configurato correttamente
    console.log("Test configurazione: URL di callback configurato:", redirectUri);
    
    // Tenta di generare un URL di autorizzazione (questo verificherà se le credenziali sono formattate correttamente)
    try {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });
      
      console.log("Test configurazione: URL di autorizzazione generato con successo");
      
      // Se arriviamo qui, le credenziali sono almeno formattate correttamente
      res.json({
        success: true,
        message: 'Configurazione di base OK. Per completare la verifica, prova ad autorizzare l\'app.',
        configStatus: {
          clientIdPresent: true,
          clientSecretPresent: true,
          redirectUriConfigured: true,
          authUrlGenerated: true,
          authorized: authInfo.authorized,
        }
      });
    } catch (error) {
      console.error("Errore nella generazione dell'URL di autorizzazione:", error);
      return res.status(400).json({
        success: false,
        error: 'Errore nella generazione dell\'URL di autorizzazione. Le credenziali potrebbero essere invalide.'
      });
    }
  } catch (error) {
    console.error("Errore nel test della configurazione:", error);
    res.status(500).json({
      success: false,
      error: 'Errore durante il test della configurazione.'
    });
  }
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