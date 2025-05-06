import { Router } from 'express';
import { google } from 'googleapis';
import { isAuthenticated } from '../auth';

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
// AGGIORNATO: Ora usiamo il dominio .replit.app anziché .repl.co
const redirectUri = `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`;

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

// Esportiamo authInfo per permettere ad altre parti dell'app di accedervi
export let authInfo: {
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
    
    // Approccio completamente nuovo per generare l'URL manualmente
    // Questo evita qualsiasi aggiunta automatica di parametri come flowName
    
    console.log("Generazione URL di autorizzazione manuale...");
    
    // Costruisci manualmente l'URL di autenticazione di base
    const clientId = encodeURIComponent(process.env.GOOGLE_CLIENT_ID as string);
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    const encodedScopes = encodeURIComponent(SCOPES.join(' '));
    
    // Parametri obbligatori nell'ordine corretto per evitare problemi di firma
    const params = [
      `client_id=${clientId}`,
      `redirect_uri=${encodedRedirectUri}`,
      `response_type=code`,
      `scope=${encodedScopes}`,
      `access_type=offline`,
      `prompt=consent`
    ];
    
    // Generiamo l'URL senza usare la libreria per evitare parametri extra
    const manualAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.join('&')}`;
    
    console.log("Auth URL generato manualmente:", manualAuthUrl);
    
    // Confrontiamo con l'URL generato dalla libreria a scopo di debug
    const libraryAuthUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      response_type: 'code',
      scope: SCOPES,
      prompt: 'consent',
      redirect_uri: redirectUri,
      include_granted_scopes: true
    });
    
    console.log("Confronto URL libreria:", libraryAuthUrl);
    
    // Restituisci l'URL generato manualmente per evitare parametri aggiuntivi
    res.json({ 
      success: true, 
      authUrl: manualAuthUrl,
      debug: {
        manualAuthUrl,
        libraryAuthUrl,
        redirectUri,
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

// Callback che riceve il codice di autorizzazione
router.get('/callback', async (req, res) => {
  console.log("Callback ricevuto con parametri:", req.query);
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Codice di autorizzazione mancante');
  }
  
  try {
    console.log("Scambio del codice di autorizzazione:", code);
    
    // Non modifichiamo più dinamicamente l'URL di reindirizzamento
    // Utilizziamo sempre l'URL fisso configurato nella console Google Cloud
    console.log("Callback - Utilizzo URI di reindirizzamento fisso:", redirectUri);
    
    // Usa l'URI di reindirizzamento fisso per lo scambio del token
    // Per evitare problemi di mismatch, usiamo esattamente lo stesso client OAuth
    // importante: riutilizziamo l'oggetto oauth2Client esistente per mantenere la coerenza
    
    // Scambia il codice con i token
    const { tokens } = await oauth2Client.getToken(code as string);
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

export default router;