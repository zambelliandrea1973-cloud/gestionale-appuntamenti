import { Router } from 'express';
import { google } from 'googleapis';
import { isAuthenticated } from '../auth';
import { db } from '../db';
import { users, clients } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';
import { EncryptionService } from '../services/encryption';
import { z } from 'zod';
import { generateClientCode } from '../utils/clientCodeGenerator';

// Schema di validazione per l'importazione contatti
const contactsImportSchema = z.object({
  resourceNames: z.array(z.string()).optional(),
  importAll: z.boolean().optional()
}).strict(); // .strict() rifiuta campi extra

const router = Router();

// Configura l'OAuth client
// L'URL qui DEVE corrispondere esattamente a quello configurato nella console Google Cloud
// Utilizziamo un URL FISSO che corrisponde esattamente a quello nella console Google Cloud

// IMPORTANTE: Questo URL deve corrispondere ESATTAMENTE a quello configurato in Google Cloud Console
// Utilizziamo il dominio effettivo dell'applicazione, basato su REPL_SLUG e REPL_OWNER
// Vecchio redirect URI fisso
//const redirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/google-auth/callback`;

// Aggiungiamo la possibilità di sovrascrivere il redirectUri per testing locale
// Controllo migliorato per l'ambiente di sviluppo locale
// Impostare la variabile d'ambiente GOOGLE_LOCAL_DEVELOPMENT=true per abilitare l'ambiente locale
// L'ambiente locale può anche essere dedotto dalle richieste provenienti da localhost
const forceLocalDevelopment = process.env.GOOGLE_LOCAL_DEVELOPMENT === 'true';

// Imposta un URL di produzione come predefinito, questo è l'URL che deve essere configurato nella console Google
// IMPORTANTE: Usare SEMPRE un dominio STABILE registrato nella Google Cloud Console
// I domini webview (.worf.replit.dev) NON sono registrati e causano errore "invalid_client"
function getRedirectUri(requestHost?: string): string {
  // PRIORITÀ 1: Se siamo su Sliplane (dominio di produzione)
  if (process.env.PRODUCTION_DOMAIN) {
    return `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`;
  }
  
  // PRIORITÀ 2: Se la richiesta viene dal dominio pubblico Replit registrato
  if (requestHost && requestHost.includes('wife-scheduler-zambelliandrea1.replit.app')) {
    return `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`;
  }
  
  // DEFAULT: Dominio Replit pubblico (registrato in Google Cloud Console)
  // NON usare .worf.replit.dev perché NON è registrato e causa "invalid_client"
  return `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`;
}

// URI di default per il client OAuth (usato all'avvio)
const redirectUri = getRedirectUri();

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

// Scopes base per Calendar e Gmail (autorizzazione principale)
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
];

// Scope separato per Contatti (autorizzazione separata, richiede verifica Google)
const CONTACTS_SCOPES = [
  'https://www.googleapis.com/auth/contacts.readonly',
];

// Esportiamo authInfo per permettere ad altre parti dell'app di accedervi
export let authInfo: {
  authorized: boolean;
  tokens?: any;
} = {
  authorized: false,
};

// Endpoint per revocare/cancellare il token esistente (necessario per riautenticazione con nuovi scope)
router.post('/revoke', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }
    
    console.log(`🔄 [REVOKE] Revoca token Google per utente ${userId}`);
    
    // Recupera il token esistente
    const [user] = await db.select({ googleAuthToken: users.googleAuthToken })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (user?.googleAuthToken) {
      try {
        // Decodifica il token
        const decryptedToken = EncryptionService.decrypt(user.googleAuthToken);
        const tokens = JSON.parse(decryptedToken);
        
        // Prova a revocare il token su Google (opzionale, potrebbe fallire)
        if (tokens.access_token) {
          try {
            await fetch(`https://oauth2.googleapis.com/revoke`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `token=${tokens.access_token}`
            });
            console.log(`✅ [REVOKE] Token revocato su Google per utente ${userId}`);
          } catch (revokeError) {
            console.log(`⚠️ [REVOKE] Impossibile revocare su Google (normale se token scaduto):`, revokeError);
          }
        }
      } catch (decryptError) {
        console.log(`⚠️ [REVOKE] Token non decodificabile, procedo con cancellazione`);
      }
    }
    
    // Cancella il token dal database
    await db.update(users)
      .set({ 
        googleAuthToken: null,
        googleCalendarEnabled: false,
        googleCalendarId: null
      })
      .where(eq(users.id, userId));
    
    console.log(`✅ [REVOKE] Token cancellato dal database per utente ${userId}`);
    
    res.json({ success: true, message: 'Token revocato con successo' });
  } catch (error) {
    console.error('❌ [REVOKE] Errore nella revoca del token:', error);
    res.status(500).json({ success: false, error: 'Errore nella revoca del token' });
  }
});

// Inizia il processo di autorizzazione
router.get('/start', (req, res) => {
  try {
    // Verifica che l'utente sia autenticato
    const userId = (req as any).session?.passport?.user;
    if (!userId) {
      console.error("ERRORE: Utente non autenticato per Google OAuth");
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }
    
    console.log("Google OAuth start per utente:", userId);
    
    // Ottieni il dominio della richiesta per supportare webview di sviluppo
    const requestHost = req.get('host');
    const dynamicRedirectUri = getRedirectUri(requestHost);
    
    console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
    console.log("Request Host:", requestHost);
    console.log("Redirect URI dinamico:", dynamicRedirectUri);
    
    // Costruisci manualmente l'URL di autenticazione
    const clientId = encodeURIComponent(process.env.GOOGLE_CLIENT_ID as string);
    const encodedRedirectUri = encodeURIComponent(dynamicRedirectUri);
    const encodedScopes = encodeURIComponent(SCOPES.join(' '));
    
    // State contiene l'userId E il redirectUri per il callback
    const state = Buffer.from(JSON.stringify({ 
      userId, 
      redirectUri: dynamicRedirectUri 
    })).toString('base64');
    
    // Parametri obbligatori nell'ordine corretto
    const params = [
      `client_id=${clientId}`,
      `redirect_uri=${encodedRedirectUri}`,
      `response_type=code`,
      `scope=${encodedScopes}`,
      `access_type=offline`,
      `prompt=consent`,
      `state=${encodeURIComponent(state)}`
    ];
    
    // Generiamo l'URL senza usare la libreria per evitare parametri extra
    const manualAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.join('&')}`;
    
    console.log("Auth URL generato:", manualAuthUrl);
    
    // Restituisci l'URL generato
    res.json({ 
      success: true, 
      authUrl: manualAuthUrl,
      debug: {
        manualAuthUrl,
        redirectUri: dynamicRedirectUri,
        requestHost,
        scopes: SCOPES
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

// Variabile globale per salvare l'ultimo errore del callback (per debug)
let lastCallbackError: { timestamp: string; error: any; stack?: string; query?: any } | null = null;

// Endpoint per vedere l'ultimo errore del callback (per debug)
router.get('/last-error', (req, res) => {
  res.json({
    success: true,
    lastError: lastCallbackError,
    message: lastCallbackError ? 'Ultimo errore del callback' : 'Nessun errore registrato'
  });
});

// Callback che riceve il codice di autorizzazione
router.get('/callback', async (req, res) => {
  console.log("=== GOOGLE AUTH CALLBACK ===");
  console.log("Callback ricevuto con parametri:", req.query);
  console.log("Headers:", req.headers);
  console.log("Host:", req.get('host'));
  console.log("Origin:", req.get('origin'));
  console.log("Referer:", req.get('referer'));
  
  // Salva i parametri per debug
  lastCallbackError = {
    timestamp: new Date().toISOString(),
    error: 'Callback ricevuto - in elaborazione',
    query: req.query
  };
  
  // Log dell'errore, se presente
  if (req.query.error) {
    console.error("ERRORE AUTH GOOGLE:", {
      error: req.query.error,
      error_description: req.query.error_description,
      state: req.query.state
    });
    return res.status(400).send(`Errore di autorizzazione: ${req.query.error}<br>Descrizione: ${req.query.error_description || 'Nessuna descrizione'}`);
  }
  
  const { code, state } = req.query;
  
  if (!code) {
    console.error("ERRORE: Codice di autorizzazione mancante");
    return res.status(400).send('Codice di autorizzazione mancante');
  }
  
  // Recupera l'userId e redirectUri dallo state
  let userId: number | null = null;
  let stateRedirectUri: string = redirectUri; // Fallback al default
  
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      console.log("State data parsed:", stateData);
      
      // Recupera il redirectUri dallo state (se presente)
      if (stateData.redirectUri) {
        stateRedirectUri = stateData.redirectUri;
        console.log("Redirect URI recuperato dallo state:", stateRedirectUri);
      }
      
      // L'userId può essere una stringa come "admin:3" o un numero
      const rawUserId = stateData.userId;
      if (typeof rawUserId === 'string' && rawUserId.includes(':')) {
        // Formato "admin:3" o "customer:5" - estrai il numero dopo i due punti
        const parts = rawUserId.split(':');
        userId = parseInt(parts[1], 10);
        console.log("UserId estratto da formato 'tipo:id':", userId);
      } else if (typeof rawUserId === 'number') {
        userId = rawUserId;
        console.log("UserId già numerico:", userId);
      } else {
        userId = parseInt(rawUserId, 10);
        console.log("UserId convertito da stringa:", userId);
      }
    } catch (e) {
      console.error("Errore nel parsing dello state:", e);
      lastCallbackError = {
        timestamp: new Date().toISOString(),
        error: 'Errore nel parsing dello state: ' + String(e),
        query: req.query
      };
    }
  }
  
  if (!userId || isNaN(userId)) {
    console.error("ERRORE: UserId non trovato o non valido nello state");
    lastCallbackError = {
      timestamp: new Date().toISOString(),
      error: 'UserId non trovato o non valido',
      query: req.query
    };
    return res.status(400).send('Sessione non valida. Riprova l\'autorizzazione.');
  }
  
  try {
    console.log("Scambio del codice di autorizzazione per utente:", userId);
    console.log("Redirect URI per scambio token:", stateRedirectUri);
    
    // Crea un nuovo OAuth client con il redirect URI corretto (quello usato per la richiesta originale)
    const callbackOauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      stateRedirectUri
    );
    
    // Scambia il codice con i token usando il redirect URI corretto
    console.log("Attempting to exchange code for token...");
    const { tokens } = await callbackOauth2Client.getToken(code as string);
    console.log("Token ottenuti con successo per utente:", userId);
    
    oauth2Client.setCredentials(tokens);
    
    // SALVA I TOKEN NEL DATABASE DELL'UTENTE (crittografati)
    try {
      const tokenJson = JSON.stringify(tokens);
      const encryptedCalendarToken = EncryptionService.encrypt(tokenJson);
      await db.update(users)
        .set({
          googleAuthToken: encryptedCalendarToken,
          googleCalendarEnabled: true,
          googleCalendarId: 'primary',
          lastGoogleSyncAt: new Date()
        })
        .where(eq(users.id, userId));
      
      console.log("✅ Token Google salvato nel database per utente:", userId);
    } catch (dbError) {
      console.error("❌ Errore nel salvataggio del token nel database:", dbError);
      // Continua comunque per mostrare la pagina di successo
    }
    
    // Mantieni anche in memoria per retrocompatibilità
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
              // Invia esplicitamente un messaggio all'opener per segnalare il successo
              if (window.opener) {
                // Tentativo 1: Invia il messaggio direttamente
                try {
                  window.opener.postMessage('google-auth-success', '*');
                  console.log('Messaggio inviato direttamente a opener');
                } catch (e) {
                  console.error('Errore nell\'invio diretto del messaggio:', e);
                }
                
                // Tentativo 2: Utilizza un timeout per assicurarsi che l'evento venga inviato
                setTimeout(function() {
                  try {
                    window.opener.postMessage('google-auth-success', '*');
                    console.log('Messaggio inviato a opener con timeout');
                  } catch (e) {
                    console.error('Errore nell\'invio del messaggio con timeout:', e);
                  }
                }, 500);
              } else {
                // Se non c'è una finestra opener, reindirizza alla pagina delle impostazioni
                window.location.href = '/settings';
              }
              
              // Chiudi la finestra dopo 2 secondi per dare tempo al messaggio di essere processato
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
  } catch (error: any) {
    console.error('Errore nello scambio del codice di autorizzazione:', error);
    
    // Salva l'errore per debug
    lastCallbackError = {
      timestamp: new Date().toISOString(),
      error: error?.message || String(error),
      stack: error?.stack,
      query: req.query
    };
    
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

// Controlla lo stato dell'autorizzazione - LEGGE DAL DATABASE per persistenza
router.get('/status', async (req, res) => {
  console.log("🔐 [GOOGLE AUTH STATUS] Controllo stato autorizzazione...");
  
  // Se l'utente è autenticato, controlla il token nel database
  if (req.isAuthenticated() && req.user) {
    const userId = (req.user as any).id;
    console.log("🔐 [GOOGLE AUTH STATUS] Utente autenticato ID:", userId);
    
    try {
      const [user] = await db.select({
        email: users.email,
        googleAuthToken: users.googleAuthToken,
        googleCalendarEnabled: users.googleCalendarEnabled,
        googleCalendarId: users.googleCalendarId
      }).from(users).where(eq(users.id, userId)).limit(1);
      
      if (user && user.googleAuthToken) {
        console.log("✅ [GOOGLE AUTH STATUS] Token trovato nel database per utente", userId);
        
        // Ripristina anche authInfo in memoria per retrocompatibilità
        const decryptedTokenStr = EncryptionService.decryptToken(user.googleAuthToken);
        const tokens = JSON.parse(decryptedTokenStr);
        authInfo = {
          authorized: true,
          tokens
        };
        
        // Reimposta le credenziali sul client OAuth
        oauth2Client.setCredentials(tokens);
        
        // Estrai email dal token JWT (id_token contiene l'email reale)
        let googleEmail: string | null = null;
        
        // Prima prova a estrarre l'email dal token JWT
        if (tokens.id_token) {
          try {
            const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
            googleEmail = payload.email;
            console.log("✅ [GOOGLE AUTH STATUS] Email estratta dal token:", googleEmail);
          } catch (e) {
            console.log("⚠️ [GOOGLE AUTH STATUS] Impossibile estrarre email dal token");
          }
        }
        
        // Fallback: usa googleCalendarId solo se non è "primary"
        if (!googleEmail && user.googleCalendarId && user.googleCalendarId !== 'primary') {
          googleEmail = user.googleCalendarId;
        }
        
        // Ultimo fallback: email dell'utente
        if (!googleEmail) {
          googleEmail = user.email;
        }
        
        return res.json({ 
          success: true, 
          authorized: true,
          calendarEnabled: user.googleCalendarEnabled,
          email: googleEmail
        });
      }
      console.log("⚠️ [GOOGLE AUTH STATUS] Nessun token nel database per utente", userId);
    } catch (error) {
      console.error("❌ [GOOGLE AUTH STATUS] Errore lettura database:", error);
    }
  } else {
    console.log("⚠️ [GOOGLE AUTH STATUS] Utente non autenticato");
  }
  
  // Se non c'è token nel database per questo utente, NON è autorizzato
  // (il vecchio fallback usava una variabile globale che causava bug di sicurezza)
  console.log("🔐 [GOOGLE AUTH STATUS] Nessun token trovato, utente non autorizzato");
  res.json({ 
    success: true, 
    authorized: false 
  });
});

// Endpoint per testare la configurazione di Google OAuth
router.get('/test-configuration', (req, res) => {
  try {
    // Verifica la presenza delle credenziali
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({
        success: false,
        message: "Credenziali Google mancanti"
      });
    }
    
    // Verifica l'URL di callback
    console.log("Test configurazione: URL di callback configurato:", redirectUri);
    
    // Genera un URL di autorizzazione per test
    const testAuthUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      redirect_uri: redirectUri
    });
    
    console.log("Test configurazione: URL di autorizzazione generato con successo");
    
    res.json({
      success: true,
      message: "Configurazione di base corretta",
      clientIdPresente: !!process.env.GOOGLE_CLIENT_ID,
      clientSecretPresente: !!process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: redirectUri,
      testAuthUrl: testAuthUrl,
      scopeValidi: SCOPES
    });
  } catch (error: any) {
    console.error("Errore nel test di configurazione Google:", error);
    res.status(500).json({
      success: false,
      message: `Errore di configurazione: ${error?.message || 'Errore sconosciuto'}`,
      error: error
    });
  }
});

// Aggiungiamo un endpoint di debug per determinare il percorso esatto
router.get('/debug-url', (req, res) => {
  const host = req.get('host') || 'unknown';
  const protocol = req.protocol || 'https';
  const path = req.originalUrl || '/api/google-auth/debug-url';
  const fullUrl = `${protocol}://${host}${path}`;
  
  // Generiamo un URL di test per verificare i parametri
  const testAuthUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    response_type: 'code',
    scope: SCOPES,
    redirect_uri: redirectUri,
    include_granted_scopes: true
  });
  
  // Mostriamo l'URL completo, le intestazioni HTTP e l'URL di autorizzazione di test
  res.json({
    success: true,
    debug: {
      host,
      protocol,
      path,
      fullUrl,
      headers: req.headers,
      expectedCallback: redirectUri,
      testAuthUrl: testAuthUrl
    }
  });
});

// Aggiunto endpoint per visualizzare il confronto degli URL di autorizzazione
router.get('/compare-auth-urls', (req, res) => {
  // Costruisci manualmente l'URL di autenticazione di base
  const clientId = encodeURIComponent(process.env.GOOGLE_CLIENT_ID as string);
  const encodedRedirectUri = encodeURIComponent(redirectUri);
  const encodedScopes = encodeURIComponent(SCOPES.join(' '));
  
  // Generiamo l'URL senza usare la libreria per evitare parametri extra
  const manualAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${encodedScopes}&access_type=offline&prompt=consent`;
  
  // Generiamo anche l'URL con la libreria ufficiale
  const libraryAuthUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    response_type: 'code',
    scope: SCOPES,
    prompt: 'consent',
    redirect_uri: redirectUri
  });
  
  res.send(`
    <html>
      <head>
        <title>Confronto URL di autorizzazione Google</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
            line-height: 1.6;
          }
          .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
            margin: 40px auto;
          }
          h1 {
            color: #1a73e8;
            margin-bottom: 20px;
          }
          h2 {
            color: #34a853;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          pre {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-all;
          }
          .url-box {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            overflow-x: auto;
            font-family: monospace;
            white-space: pre-wrap;
            word-break: break-all;
          }
          .manual {
            border-left: 4px solid #4285f4;
          }
          .library {
            border-left: 4px solid #34a853;
          }
          .different {
            border-left: 4px solid #fbbc04;
            background-color: #fff8e1;
          }
          .button {
            display: inline-block;
            background-color: #1a73e8;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: bold;
            cursor: pointer;
            border: none;
            margin-top: 10px;
          }
          .button:hover {
            background-color: #0d47a1;
          }
          .note {
            background-color: #e8f0fe;
            padding: 10px 15px;
            border-radius: 4px;
            margin: 15px 0;
            border-left: 4px solid #4285f4;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .success {
            background-color: #e6f4ea;
            color: #0d652d;
          }
          .warning {
            background-color: #fef7e0;
            color: #b06000;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Confronto URL di autorizzazione Google</h1>
          
          <div class="note">
            <p><strong>Nota:</strong> Questa pagina confronta due metodi per generare l'URL di autorizzazione Google OAuth. L'URL generato manualmente non contiene parametri aggiuntivi che possono causare problemi di mismatch.</p>
          </div>
          
          <h2>URL generato manualmente (senza parametri extra)</h2>
          <div class="url-box manual">${manualAuthUrl}</div>
          
          <h2>URL generato dalla libreria ufficiale</h2>
          <div class="url-box library">${libraryAuthUrl}</div>
          
          <h2>Differenze tra i due URL</h2>
          <table>
            <tr>
              <th>Parametro</th>
              <th>URL Manuale</th>
              <th>URL Libreria</th>
              <th>Stato</th>
            </tr>
            <tr>
              <td>client_id</td>
              <td>${process.env.GOOGLE_CLIENT_ID}</td>
              <td>${process.env.GOOGLE_CLIENT_ID}</td>
              <td class="success">Identico</td>
            </tr>
            <tr>
              <td>redirect_uri</td>
              <td>${redirectUri}</td>
              <td>${redirectUri}</td>
              <td class="success">Identico</td>
            </tr>
            <tr>
              <td>flowName</td>
              <td>Non presente</td>
              <td>${libraryAuthUrl.includes('flowName=') ? 'Presente' : 'Non presente'}</td>
              <td class="${libraryAuthUrl.includes('flowName=') ? 'warning' : 'success'}">
                ${libraryAuthUrl.includes('flowName=') ? 'Potenziale causa di errore' : 'OK'}
              </td>
            </tr>
          </table>
          
          <h2>Test di autorizzazione</h2>
          <p>Seleziona uno dei metodi per provare l'autorizzazione:</p>
          
          <a href="${manualAuthUrl}" class="button" target="_blank">Test con URL manuale</a>
          <a href="${libraryAuthUrl}" class="button" style="margin-left: 10px;" target="_blank">Test con URL libreria</a>
          
          <div class="note" style="margin-top: 30px;">
            <p><strong>Importante:</strong> Ricorda che la console Google Cloud deve avere configurato esattamente questo URI di reindirizzamento:</p>
            <pre>${redirectUri}</pre>
            <p>Assicurati anche che l'origine JavaScript sia configurata correttamente con lo schema https:</p>
            <pre>https://wife-scheduler-zambelliandrea1.replit.app</pre>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Endpoint per la risoluzione dell'errore 400 e della configurazione Google Calendar
router.get('/fix-error-400', (req, res) => {
  const redirectUriProduction = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/google-auth/callback`;
  
  res.send(`
    <html>
      <head>
        <title>Risolvere l'Errore 400 con Google Calendar</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
            color: #333;
          }
          .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
            margin: 40px auto;
          }
          h1 {
            color: #1a73e8;
            margin-bottom: 20px;
          }
          h2 {
            color: #34a853;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          .highlight {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            word-break: break-all;
            border-left: 4px solid #1a73e8;
            margin: 15px 0;
          }
          .error {
            background-color: #fce8e6;
            border-left: 4px solid #ea4335;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          .success {
            background-color: #e6f4ea;
            border-left: 4px solid #34a853;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          .warning {
            background-color: #fef7e0;
            border-left: 4px solid #fbbc04;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          .button {
            display: inline-block;
            background-color: #1a73e8;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: bold;
            cursor: pointer;
            border: none;
            margin-top: 10px;
          }
          .button:hover {
            background-color: #0d47a1;
          }
          .step {
            margin-bottom: 30px;
            counter-increment: step-counter;
            position: relative;
            padding-left: 40px;
          }
          .step::before {
            content: counter(step-counter);
            position: absolute;
            left: 0;
            top: 0;
            background-color: #1a73e8;
            color: white;
            font-weight: bold;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            text-align: center;
            line-height: 28px;
          }
          img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin: 15px 0;
          }
          ul, ol {
            padding-left: 20px;
          }
          li {
            margin-bottom: 10px;
          }
          .section {
            margin-bottom: 40px;
          }
          .console-section {
            border: 1px solid #ccc;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .code {
            font-family: monospace;
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Risolvere l'Errore 400 (redirect_uri_mismatch) di Google OAuth</h1>
          
          <div class="error">
            <strong>Problema:</strong> Impossibile completare l'autenticazione Google OAuth a causa dell'errore 
            <span class="code">redirect_uri_mismatch</span> con <span class="code">flowName=GeneralOAuthFlow</span>.
          </div>
          
          <div class="section">
            <h2>Spiegazione del problema</h2>
            <p>Questo errore significa che l'URL di callback che l'applicazione sta inviando a Google non corrisponde esattamente a quello configurato nella console Google Cloud. Anche una piccola differenza (come uno slash finale, un carattere maiuscolo o minuscolo diverso) può causare questo errore.</p>
            
            <p>L'app sta utilizzando il seguente URL di callback:</p>
            <div class="highlight">${redirectUriProduction}</div>
            
            <p>Questo URL deve corrispondere <strong>ESATTAMENTE</strong> a uno degli URI di reindirizzamento autorizzati configurati nella console Google Cloud.</p>
          </div>
          
          <div class="section">
            <h2>Istruzioni per la correzione</h2>
            
            <div class="step">
              <h3>Accedi alla console Google Cloud</h3>
              <p>Vai a <a href="https://console.cloud.google.com/apis/credentials" target="_blank">https://console.cloud.google.com/apis/credentials</a> e accedi con l'account associato al progetto.</p>
            </div>
            
            <div class="step">
              <h3>Trova le credenziali OAuth corrette</h3>
              <p>Nella sezione "Credenziali", trova l'ID client OAuth 2.0 che stai utilizzando per questa applicazione.</p>
              <p>Il tuo ID client dovrebbe essere: <span class="code">${process.env.GOOGLE_CLIENT_ID}</span></p>
            </div>
            
            <div class="step">
              <h3>Verifica o aggiungi l'URI di reindirizzamento</h3>
              <p>Fai clic sull'ID client per modificarlo. Nella sezione "URI di reindirizzamento autorizzati", verifica se è presente esattamente l'URL seguente:</p>
              <div class="highlight">${redirectUriProduction}</div>
              
              <p>Se non è presente o è diverso (anche per un singolo carattere):</p>
              <ol>
                <li>Aggiungi esattamente questo URL come URI di reindirizzamento autorizzato</li>
                <li>Assicurati che non ci siano spazi o caratteri extra</li>
                <li>Fai clic su "Salva" in fondo alla pagina</li>
              </ol>
            </div>
            
            <div class="warning">
              <p><strong>Importante:</strong> Dopo aver aggiornato gli URI di reindirizzamento nella console Google Cloud, potrebbe essere necessario attendere fino a 5-10 minuti prima che le modifiche diventino effettive. Google memorizza nella cache queste configurazioni e potrebbero non essere immediatamente aggiornate.</p>
            </div>
            
            <div class="step">
              <h3>Effettua un nuovo tentativo</h3>
              <p>Dopo aver aggiornato la configurazione e atteso qualche minuto, ritorna alla pagina delle impostazioni nell'applicazione e riprova a collegare Google Calendar.</p>
            </div>
          </div>
          
          <div class="section">
            <h2>Risoluzioni comuni per errori persistenti</h2>
            
            <div class="console-section">
              <h3>Se l'errore 400 persiste:</h3>
              <ul>
                <li>Verifica che stai utilizzando lo stesso account Google per accedere alla console e per autorizzare l'applicazione</li>
                <li>Prova a rimuovere tutti gli URI di reindirizzamento esistenti e aggiungi solo quello corretto</li>
                <li>Assicurati che le API necessarie (Google Calendar API, Gmail API) siano abilitate nel progetto</li>
                <li>Controlla che il client ID e client secret siano corretti nell'applicazione</li>
                <li>Se stai testando in locale, configura sia l'URL locale che quello di produzione nella console Google Cloud</li>
              </ul>
            </div>
          </div>
          
          <div class="section">
            <h2>Verifica dello stato attuale</h2>
            <p>Stato dell'autorizzazione Google nell'applicazione:</p>
            <div id="auth-status">Verifica in corso...</div>
            <button class="button" onclick="checkAuthStatus()">Aggiorna stato</button>
            
            <div class="warning" style="margin-top: 20px;">
              <p><strong>Nota:</strong> Se il sito è inaccessibile pubblicamente (<span class="code">DNS_PROBE_FINISHED_NXDOMAIN</span>), l'integrazione con Google Calendar funzionerà solo quando l'app sarà nuovamente accessibile pubblicamente. Questo perché Google deve poter raggiungere l'URL di callback per completare il processo di autorizzazione.</p>
            </div>
          </div>
          
          <script>
            function checkAuthStatus() {
              fetch('/api/google-auth/status')
                .then(response => response.json())
                .then(data => {
                  const statusElement = document.getElementById('auth-status');
                  if (data.authorized) {
                    statusElement.innerHTML = '<div class="success"><strong>✅ Autorizzato</strong> - L\'integrazione con Google Calendar è attiva.</div>';
                  } else {
                    statusElement.innerHTML = '<div class="error"><strong>❌ Non autorizzato</strong> - L\'integrazione con Google Calendar non è stata configurata.</div>';
                  }
                })
                .catch(error => {
                  console.error('Errore nel controllo dello stato:', error);
                  document.getElementById('auth-status').innerHTML = 
                    '<div class="error"><strong>⚠️ Errore</strong> - Impossibile verificare lo stato dell\'autorizzazione.</div>';
                });
            }
            
            // Controlla lo stato all'avvio
            checkAuthStatus();
          </script>
        </div>
      </body>
    </html>
  `);
});

// Nuovo endpoint di test locale per l'integrazione con Google Calendar
router.get('/local-test', (req, res) => {
  const localRedirectUri = 'http://localhost:5000/api/google-auth/callback';
  const productionRedirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/google-auth/callback`;
  
  res.send(`
    <html>
      <head>
        <title>Test Locale Integrazione Google Calendar</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
          }
          .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
            margin: 40px auto;
          }
          h1 {
            color: #1a73e8;
            margin-bottom: 20px;
          }
          .highlight {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            word-break: break-all;
          }
          .step {
            margin-bottom: 30px;
          }
          .note {
            background-color: #fef9e7;
            padding: 15px;
            border-left: 4px solid #f1c40f;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            background-color: #1a73e8;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: bold;
            cursor: pointer;
            border: none;
            margin-top: 10px;
          }
          .button:hover {
            background-color: #0d47a1;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Configurazione Locale per Google Calendar</h1>
          
          <div class="step">
            <h2>1. Aggiungi questo URL di reindirizzamento alla tua Console Google Cloud</h2>
            <p>Per effettuare il test locale, aggiungi il seguente URL ai tuoi URI di reindirizzamento autorizzati nella <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Console Google Cloud</a>:</p>
            <div class="highlight">${localRedirectUri}</div>
            <p>Nota: Dovrai mantenere anche l'URL di produzione:</p>
            <div class="highlight">${productionRedirectUri}</div>
          </div>
          
          <div class="note">
            <p><strong>Importante:</strong> Dopo aver aggiunto l'URL di reindirizzamento alla console Google Cloud, potrebbe essere necessario attendere alcuni minuti prima che le modifiche diventino attive.</p>
          </div>
          
          <div class="step">
            <h2>2. Testa l'integrazione locale</h2>
            <p>Una volta aggiunto l'URL di reindirizzamento, puoi testare l'integrazione facendo clic sul pulsante qui sotto:</p>
            <button class="button" onclick="window.open('/api/google-auth/start')">Testa Autorizzazione Google</button>
          </div>
          
          <div class="step">
            <h2>3. Verifica lo stato dell'autorizzazione</h2>
            <p>Controlla lo stato attuale dell'autorizzazione:</p>
            <div id="auth-status">Verifica in corso...</div>
            <button class="button" onclick="checkAuthStatus()">Aggiorna Stato</button>
          </div>
        </div>
        
        <script>
          function checkAuthStatus() {
            fetch('/api/google-auth/status')
              .then(response => response.json())
              .then(data => {
                const statusElement = document.getElementById('auth-status');
                if (data.authorized) {
                  statusElement.innerHTML = '<span style="color: #4CAF50; font-weight: bold;">✅ Autorizzato</span>';
                } else {
                  statusElement.innerHTML = '<span style="color: #f44336; font-weight: bold;">❌ Non autorizzato</span>';
                }
              })
              .catch(error => {
                console.error('Errore nel controllo dello stato:', error);
                document.getElementById('auth-status').innerHTML = 
                  '<span style="color: #f44336;">Errore nel controllo dello stato</span>';
              });
          }
          
          // Controlla lo stato all'avvio
          checkAuthStatus();
          
          // Controlla periodicamente
          setInterval(checkAuthStatus, 5000);
        </script>
      </body>
    </html>
  `);
});

// Endpoint per verificare direttamente l'URL sulla console di Google Cloud
router.get('/verify-redirect', (req, res) => {
  // Genera un QR code che punta alla console di Google Cloud
  const consoleUrl = 'https://console.cloud.google.com/apis/credentials';
  
  res.send(`
    <html>
      <head>
        <title>Verifica configurazione Google Cloud</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
          }
          .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
            margin: 40px auto;
          }
          h1 {
            color: #1a73e8;
            margin-bottom: 20px;
          }
          .highlight {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            word-break: break-all;
          }
          .step {
            margin-bottom: 30px;
          }
          .note {
            background-color: #fef9e7;
            padding: 15px;
            border-left: 4px solid #f1c40f;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verifica configurazione OAuth di Google</h1>
          
          <div class="step">
            <h2>1. URL di callback configurato</h2>
            <p>Il seguente URL di callback deve essere configurato nella console di Google Cloud:</p>
            <div class="highlight">${redirectUri}</div>
          </div>
          
          <div class="step">
            <h2>2. Verifica nella console Google Cloud</h2>
            <p>Apri la <a href="${consoleUrl}" target="_blank">console Google Cloud</a> e verifica che:</p>
            <ul>
              <li>L'ID client sia <code>${process.env.GOOGLE_CLIENT_ID}</code></li>
              <li>Negli "URI di reindirizzamento autorizzati" sia presente esattamente: <code>${redirectUri}</code></li>
            </ul>
          </div>
          
          <div class="note">
            <p><strong>Nota importante:</strong> Se hai modificato recentemente gli URI di reindirizzamento nella console di Google Cloud, potrebbe essere necessario attendere alcuni minuti (fino a 5-10 minuti) prima che le modifiche diventino effettive.</p>
          </div>
          
          <div class="step">
            <h2>3. Errore 400 (redirect_uri_mismatch)</h2>
            <p>Se continui a ricevere questo errore:</p>
            <ul>
              <li>Assicurati che l'URI sia ESATTAMENTE uguale a quello mostrato sopra (anche un singolo carattere di differenza causerà l'errore)</li>
              <li>Verifica che non ci siano spazi o caratteri speciali nell'URI</li>
              <li>Prova a cancellare e aggiungere nuovamente l'URI di reindirizzamento nella console</li>
              <li>Assicurati di aver salvato le modifiche nella console Google Cloud</li>
            </ul>
          </div>
          
          <div class="step">
            <h2>4. Verifica diretta</h2>
            <p>Per effettuare un test diretto dell'autorizzazione OAuth, fai clic sul bottone seguente:</p>
            <button onclick="window.open('/api/google-auth/start')">Testa autorizzazione Google</button>
          </div>
        </div>
      </body>
    </html>
  `);
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

// ================ GOOGLE CONTACTS API ================

/**
 * Verifica se l'utente ha autorizzato l'accesso ai contatti Google
 * GET /api/google-auth/contacts/status
 */
router.get('/contacts/status', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, authorized: false });
    }

    const user = await storage.getUser(userId);
    const hasContactsAuth = !!user?.googleContactsToken;
    
    res.json({ 
      success: true, 
      authorized: hasContactsAuth,
      message: hasContactsAuth ? 'Contatti Google autorizzati' : 'Autorizzazione contatti Google richiesta'
    });
  } catch (error) {
    console.error('📇 [CONTACTS STATUS] Errore:', error);
    res.status(500).json({ success: false, authorized: false });
  }
});

/**
 * Genera URL per autorizzare l'accesso ai contatti Google (separato da Calendar/Gmail)
 * GET /api/google-auth/contacts/authorize
 */
router.get('/contacts/authorize', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    const contactsAuthUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: CONTACTS_SCOPES,
      state: `contacts_${userId}`,
      prompt: 'consent',
    });

    console.log(`📇 [CONTACTS AUTH] URL generato per utente ${userId}`);
    res.json({ success: true, authUrl: contactsAuthUrl });
  } catch (error) {
    console.error('📇 [CONTACTS AUTH] Errore generazione URL:', error);
    res.status(500).json({ success: false, error: 'Errore nella generazione dell\'URL di autorizzazione' });
  }
});

/**
 * Callback per l'autorizzazione contatti Google
 * GET /api/google-auth/contacts/callback
 */
router.get('/contacts/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state || !String(state).startsWith('contacts_')) {
      return res.status(400).send('Parametri mancanti o non validi');
    }

    const userId = parseInt(String(state).replace('contacts_', ''));
    if (!userId) {
      return res.status(400).send('ID utente non valido');
    }

    const callbackOauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${getRedirectUri().replace('/callback', '/contacts/callback')}`
    );

    const { tokens } = await callbackOauth2Client.getToken(code as string);
    
    // Salva il token dei contatti separatamente
    const encryptedToken = EncryptionService.encrypt(JSON.stringify(tokens));
    await db.update(users)
      .set({ googleContactsToken: encryptedToken })
      .where(eq(users.id, userId));

    console.log(`✅ [CONTACTS AUTH] Token contatti salvato per utente ${userId}`);

    // Redirect alla pagina clienti con messaggio di successo
    res.send(`
      <html>
        <head><title>Autorizzazione Contatti Completata</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>✅ Autorizzazione Contatti Google Completata!</h2>
          <p>Ora puoi importare i contatti dalla tua rubrica Google.</p>
          <p>Questa finestra si chiuderà automaticamente...</p>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_CONTACTS_AUTHORIZED' }, '*');
                window.close();
              } else {
                window.location.href = '/clients';
              }
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('📇 [CONTACTS CALLBACK] Errore:', error);
    res.status(500).send('Errore durante l\'autorizzazione dei contatti Google');
  }
});

/**
 * Recupera i contatti dalla rubrica Google dell'utente
 * GET /api/google-auth/contacts
 */
router.get('/contacts', isAuthenticated, async (req, res) => {
  console.log('📇 [CONTACTS] Richiesta GET /api/google-auth/contacts');
  try {
    const userId = (req as any).user?.id;
    console.log('📇 [CONTACTS] userId:', userId);
    if (!userId) {
      console.log('📇 [CONTACTS] Utente non autenticato');
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Recupera i token dell'utente dal database - usa token CONTATTI separato
    const user = await storage.getUser(userId);
    if (!user?.googleContactsToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Autorizzazione contatti Google non presente. Clicca su "Autorizza Contatti Google" per abilitare l\'importazione.',
        needsContactsAuth: true
      });
    }

    // Decifra il token se necessario
    let tokenString = user.googleContactsToken;
    if (EncryptionService.isEncrypted(tokenString)) {
      tokenString = EncryptionService.decrypt(tokenString);
    }
    
    let tokens;
    try {
      tokens = JSON.parse(tokenString);
    } catch (parseError) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token Google non valido. Riconnetti il tuo account.',
        needsReauth: true
      });
    }
    
    // Configura il client OAuth con i token dell'utente
    const userOAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getRedirectUri()
    );
    userOAuth2Client.setCredentials(tokens);

    // Inizializza People API
    const people = google.people({ version: 'v1', auth: userOAuth2Client });

    // Recupera TUTTI i contatti con paginazione
    let allConnections: any[] = [];
    let nextPageToken: string | undefined = undefined;
    
    do {
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        personFields: 'names,emailAddresses,phoneNumbers,addresses',
        sortOrder: 'FIRST_NAME_ASCENDING',
        pageToken: nextPageToken
      });
      
      const connections = response.data.connections || [];
      allConnections = allConnections.concat(connections);
      nextPageToken = response.data.nextPageToken || undefined;
      
      console.log(`📇 [CONTACTS] Pagina caricata: ${connections.length} contatti (totale finora: ${allConnections.length})`);
    } while (nextPageToken);

    const connections = allConnections;
    
    // Trasforma i dati in un formato più semplice
    const contacts = connections.map((person: any) => {
      const name = person.names?.[0]?.displayName || '';
      const firstName = person.names?.[0]?.givenName || '';
      const lastName = person.names?.[0]?.familyName || '';
      const email = person.emailAddresses?.[0]?.value || '';
      const phone = person.phoneNumbers?.[0]?.value || '';
      const address = person.addresses?.[0]?.formattedValue || '';
      
      return {
        resourceName: person.resourceName,
        name: name || `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        email,
        phone,
        address
      };
    }).filter((c: any) => c.name || c.email || c.phone); // Filtra contatti vuoti

    console.log(`📇 Recuperati ${contacts.length} contatti Google per utente ${userId}`);

    res.json({ 
      success: true, 
      contacts,
      total: contacts.length
    });

  } catch (error: any) {
    console.error('📇 [CONTACTS] Errore nel recupero contatti Google:', error.message);
    console.error('📇 [CONTACTS] Error code:', error.code);
    console.error('📇 [CONTACTS] Full error:', JSON.stringify(error, null, 2));
    
    // Se il token è scaduto o non valido
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Sessione Google scaduta. Riconnetti il tuo account.',
        needsReauth: true
      });
    }
    
    // Se manca lo scope per i contatti (cattura vari formati di errore Google)
    if (error.message?.includes('Request had insufficient authentication scopes') ||
        error.message?.includes('Insufficient Permission') ||
        error.code === 403) {
      return res.status(403).json({ 
        success: false, 
        error: 'Permessi insufficienti. Riconnetti il tuo account Google per abilitare l\'accesso ai contatti.',
        needsReauth: true
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Errore nel recupero dei contatti Google' 
    });
  }
});

/**
 * Importa i contatti selezionati come clienti
 * POST /api/google-auth/contacts/import
 * 
 * SICUREZZA: Accetta solo resourceNames (ID) e importAll flag
 * I dati dei contatti vengono sempre recuperati lato server da Google
 */
router.post('/contacts/import', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utente non autenticato' });
    }

    // Validazione input con Zod - rifiuta campi non previsti
    const validationResult = contactsImportSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Formato dati non valido',
        details: validationResult.error.errors 
      });
    }

    const { resourceNames, importAll } = validationResult.data;

    if (!importAll && (!resourceNames || resourceNames.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nessun contatto selezionato per l\'importazione' 
      });
    }

    // Recupera i token CONTATTI dell'utente (separato da Calendar/Gmail)
    const user = await storage.getUser(userId);
    if (!user?.googleContactsToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Autorizzazione contatti Google non presente. Clicca su "Autorizza Contatti Google" per abilitare l\'importazione.',
        needsContactsAuth: true
      });
    }

    // Decifra il token contatti se necessario
    let tokenString = user.googleContactsToken;
    if (EncryptionService.isEncrypted(tokenString)) {
      tokenString = EncryptionService.decrypt(tokenString);
    }
    
    let tokens;
    try {
      tokens = JSON.parse(tokenString);
    } catch (parseError) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token Google non valido',
        needsReauth: true
      });
    }

    const userOAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getRedirectUri()
    );
    userOAuth2Client.setCredentials(tokens);

    const people = google.people({ version: 'v1', auth: userOAuth2Client });

    // Recupera i contatti da Google (sempre lato server per sicurezza)
    let contactsToImport: Array<{firstName: string, lastName: string, email: string, phone: string, address: string}> = [];

    if (importAll) {
      // Recupera TUTTI i contatti con paginazione
      let allConnections: any[] = [];
      let nextPageToken: string | undefined = undefined;
      
      do {
        const response = await people.people.connections.list({
          resourceName: 'people/me',
          pageSize: 1000,
          personFields: 'names,emailAddresses,phoneNumbers,addresses',
          sortOrder: 'FIRST_NAME_ASCENDING',
          pageToken: nextPageToken
        });
        
        const connections = response.data.connections || [];
        allConnections = allConnections.concat(connections);
        nextPageToken = response.data.nextPageToken || undefined;
        
        console.log(`📇 [IMPORT] Pagina caricata: ${connections.length} contatti (totale finora: ${allConnections.length})`);
      } while (nextPageToken);

      contactsToImport = allConnections.map((person: any) => ({
        firstName: person.names?.[0]?.givenName || person.names?.[0]?.displayName || '',
        lastName: person.names?.[0]?.familyName || '',
        email: person.emailAddresses?.[0]?.value || '',
        phone: person.phoneNumbers?.[0]?.value || '',
        address: person.addresses?.[0]?.formattedValue || ''
      })).filter((c: any) => (c.firstName || c.lastName) || c.email || c.phone);
      
      console.log(`📇 [IMPORT] Totale contatti da importare: ${contactsToImport.length}`);
    } else if (resourceNames && resourceNames.length > 0) {
      // Recupera solo i contatti selezionati tramite i loro resourceNames
      // Usa batchGet per efficienza
      const batchSize = 50;
      for (let i = 0; i < resourceNames.length; i += batchSize) {
        const batch = resourceNames.slice(i, i + batchSize);
        try {
          const response = await people.people.getBatchGet({
            resourceNames: batch,
            personFields: 'names,emailAddresses,phoneNumbers,addresses'
          });
          
          const responses = response.data.responses || [];
          for (const personResponse of responses) {
            const person = personResponse.person;
            if (person) {
              contactsToImport.push({
                firstName: person.names?.[0]?.givenName || person.names?.[0]?.displayName || '',
                lastName: person.names?.[0]?.familyName || '',
                email: person.emailAddresses?.[0]?.value || '',
                phone: person.phoneNumbers?.[0]?.value || '',
                address: person.addresses?.[0]?.formattedValue || ''
              });
            }
          }
        } catch (batchError) {
          console.error('Errore batch get contatti:', batchError);
        }
      }
    }

    // Recupera i clienti esistenti per evitare duplicati
    const existingClients = await storage.getVisibleClientsForUser(userId, 'admin');
    
    // Crea set per verifica duplicati: priorità a nome+telefono, poi email
    const existingNamePhone = new Set(existingClients.map((c: any) => {
      const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().trim();
      const phone = c.phone?.replace(/\s+/g, '') || '';
      return phone ? `${name}|${phone}` : null;
    }).filter(Boolean));
    
    const existingPhones = new Set(existingClients.map((c: any) => c.phone?.replace(/\s+/g, '')).filter(Boolean));
    const existingEmails = new Set(existingClients.map((c: any) => c.email?.toLowerCase()).filter(Boolean));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const contact of contactsToImport) {
      try {
        // Normalizza i dati del contatto
        const nameNormalized = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase().trim();
        const phoneNormalized = contact.phone?.replace(/\s+/g, '') || '';
        const emailNormalized = contact.email?.toLowerCase() || '';
        const namePhoneKey = phoneNormalized ? `${nameNormalized}|${phoneNormalized}` : null;

        // Priorità 1: Verifica duplicati per nome+telefono (criterio principale)
        if (namePhoneKey && existingNamePhone.has(namePhoneKey)) {
          skipped++;
          continue;
        }
        
        // Priorità 2: Verifica duplicati per solo telefono (se presente)
        if (phoneNormalized && existingPhones.has(phoneNormalized)) {
          skipped++;
          continue;
        }
        
        // Priorità 3: Verifica duplicati per email (se presente e non vuota)
        if (emailNormalized && existingEmails.has(emailNormalized)) {
          skipped++;
          continue;
        }

        // Crea il cliente con i campi obbligatori firstName, lastName, phone
        const clientData = {
          userId,
          firstName: contact.firstName || 'Senza',
          lastName: contact.lastName || 'Nome',
          phone: contact.phone || 'N/A',
          email: contact.email || null,
          address: contact.address || null,
          notes: 'Importato da Google Contacts',
          ownerId: userId
        };

        const newClient = await storage.createClient(clientData);
        
        // Genera i codici cliente (stessa logica di POST /api/clients)
        let newUniqueCode = null;
        try {
          newUniqueCode = await generateClientCode(userId);
        } catch (error: any) {
          if (error.message && error.message.includes('Codice professionista non trovato')) {
            console.log(`⚠️ Contatto importato senza newUniqueCode (professionista senza assignmentCode)`);
          } else {
            throw error;
          }
        }
        
        // Genera il legacy uniqueCode (formato PROF_XXX_CXXXXX)
        const legacyUniqueCode = `PROF_${userId.toString().padStart(3, '0')}_C${newClient.id.toString().padStart(5, '0')}`;
        
        // Aggiorna il cliente con i codici generati
        const updateData: any = { uniqueCode: legacyUniqueCode };
        if (newUniqueCode) {
          updateData.newUniqueCode = newUniqueCode;
        }
        
        await storage.updateClient(newClient.id, updateData);
        
        console.log(`✅ Contatto importato: ${contact.firstName} ${contact.lastName} - Codice: ${newUniqueCode || legacyUniqueCode}`);
        imported++;

        // Aggiungi alle liste per evitare duplicati nel batch corrente
        if (namePhoneKey) existingNamePhone.add(namePhoneKey);
        if (phoneNormalized) existingPhones.add(phoneNormalized);
        if (emailNormalized) existingEmails.add(emailNormalized);

      } catch (err: any) {
        const contactName = `${contact.firstName} ${contact.lastName}`.trim() || 'Contatto';
        console.error(`Errore importazione contatto ${contactName}:`, err);
        errors.push(`${contactName}: ${err.message}`);
      }
    }

    console.log(`📇 Importazione contatti completata per utente ${userId}: ${imported} importati, ${skipped} saltati (duplicati)`);

    res.json({ 
      success: true, 
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Importati ${imported} contatti${skipped > 0 ? `, ${skipped} saltati (già esistenti)` : ''}`
    });

  } catch (error) {
    console.error('Errore nell\'importazione contatti:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'importazione dei contatti' 
    });
  }
});

export default router;