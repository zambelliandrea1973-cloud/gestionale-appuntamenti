import { logger } from '../utils/logger';
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

// Configure l'OAuth client
// This URL MUST match exactly what is configured in the Google Cloud Console
// We use a FIXED URL that matches exactly what is in the Google Cloud Console

// IMPORTANT: This URL must match EXACTLY what is configured in the Google Cloud Console
// We use the actual application domain, based on REPL_SLUG and REPL_OWNER
// Vecchio redirect URI fisso
//const redirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/google-auth/callback`;

// Add the ability to override redirectUri for local testing
// Controllo migliorato per l'ambiente di sviluppo locale
// Set the GOOGLE_LOCAL_DEVELOPMENT=true environment variable to enable the local environment
// The local environment can also be inferred from requests coming from localhost
const forceLocalDevelopment = process.env.GOOGLE_LOCAL_DEVELOPMENT === 'true';

// Set a production URL as default, this is the URL that must be configured in the Google Console
// IMPORTANT: ALWAYS use a STABLE domain registered in the Google Cloud Console
// Webview domains (.worf.replit.dev) are NOT registered and cause "invalid_client" error
function getRedirectUri(requestHost?: string): string {
  // PRIORITY 1: If we are on Sliplane (production domain)
  if (process.env.PRODUCTION_DOMAIN) {
    return `https://${process.env.PRODUCTION_DOMAIN}/api/google-auth/callback`;
  }
  
  // PRIORITY 2: If the request comes from the registered Replit public domain
  if (requestHost && requestHost.includes('wife-scheduler-zambelliandrea1.replit.app')) {
    return `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`;
  }
  
  // DEFAULT: Public Replit domain (registered in Google Cloud Console)
  // DO NOT use .worf.replit.dev because it is NOT registered and causes "invalid_client"
  return `https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback`;
}

// Default URI for the OAuth client (used at startup)
const redirectUri = getRedirectUri();

// Print additional debug information
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

// Base scopes for Calendar and Gmail (main authorization)
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
];

// Separate scope for Contacts (separate authorization, requires Google verification)
const CONTACTS_SCOPES = [
  'https://www.googleapis.com/auth/contacts.readonly',
];

// We export authInfo to allow other parts of the app to access it
export let authInfo: {
  authorized: boolean;
  tokens?: any;
} = {
  authorized: false,
};

// Endpoint to revoke/delete the existing token (needed for re-authentication with new scopes)
router.post('/revoke', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    logger.debug(`🔄 [REVOKE] Revoking Google token for user ${userId}`);
    
    // Retrieve the existing token
    const [user] = await db.select({ googleAuthToken: users.googleAuthToken })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (user?.googleAuthToken) {
      try {
        // Decodifica the token
        const decryptedToken = EncryptionService.decrypt(user.googleAuthToken);
        const tokens = JSON.parse(decryptedToken);
        
        // Prova a revocare the token su Google (opzionale, potrebbe fallire)
        if (tokens.access_token) {
          try {
            await fetch(`https://oauth2.googleapis.com/revoke`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `token=${tokens.access_token}`
            });
            logger.debug(`✅ [REVOKE] Token revoked on Google for user ${userId}`);
          } catch (revokeError) {
            logger.debug(`⚠️ [REVOKE] Unable to revoke on Google (normal if token expired):`, revokeError);
          }
        }
      } catch (decryptError) {
        logger.debug(`⚠️ [REVOKE] Token not decodable, proceeding with deletion`);
      }
    }
    
    // Delete the token from the database
    await db.update(users)
      .set({ 
        googleAuthToken: null,
        googleCalendarEnabled: false,
        googleCalendarId: null
      })
      .where(eq(users.id, userId));
    
    logger.debug(`✅ [REVOKE] Token deleted from database for user ${userId}`);
    
    res.json({ success: true, message: 'Token revoked successfully' });
  } catch (error) {
    console.error('❌ [REVOKE] Error revoking token:', error);
    res.status(500).json({ success: false, error: 'Error revoking token' });
  }
});

// Start the authorization process
router.get('/start', (req, res) => {
  try {
    // Verify che l'user sia autenticato
    const userId = (req as any).session?.passport?.user;
    if (!userId) {
      console.error("ERROR: User not authenticated for Google OAuth");
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    console.log("Google OAuth start for user:", userId);
    
    // Get the request domain to support dev webviews
    const requestHost = req.get('host');
    const dynamicRedirectUri = getRedirectUri(requestHost);
    
    console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
    console.log("Request Host:", requestHost);
    console.log("Redirect URI dinamico:", dynamicRedirectUri);
    
    // Build manualmente l'URL di autenticazione
    const clientId = encodeURIComponent(process.env.GOOGLE_CLIENT_ID as string);
    const encodedRedirectUri = encodeURIComponent(dynamicRedirectUri);
    const encodedScopes = encodeURIComponent(SCOPES.join(' '));
    
    // State contains the userId AND the redirectUri for the callback
    const state = Buffer.from(JSON.stringify({ 
      userId, 
      redirectUri: dynamicRedirectUri 
    })).toString('base64');
    
    // Required parameters in the correct order
    const params = [
      `client_id=${clientId}`,
      `redirect_uri=${encodedRedirectUri}`,
      `response_type=code`,
      `scope=${encodedScopes}`,
      `access_type=offline`,
      `prompt=consent`,
      `state=${encodeURIComponent(state)}`
    ];
    
    // Generate the URL without using the library to avoid extra parameters
    const manualAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.join('&')}`;
    
    console.log("Auth URL generated:", manualAuthUrl);
    
    // Return the generated URL
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
    console.error('Error generating auth URL:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error generating authorization URL' 
    });
  }
});

// Global variable to save the last callback error (for debugging)
let lastCallbackError: { timestamp: string; error: any; stack?: string; query?: any } | null = null;

// Endpoint to view the last callback error (for debugging)
router.get('/last-error', (req, res) => {
  res.json({
    success: true,
    lastError: lastCallbackError,
    message: lastCallbackError ? 'Last callback error' : 'No errors recorded'
  });
});

// Callback that receives the authorization code
router.get('/callback', async (req, res) => {
  console.log("=== GOOGLE AUTH CALLBACK ===");
  console.log("Callback received with parameters:", req.query);
  console.log("Headers:", req.headers);
  console.log("Host:", req.get('host'));
  console.log("Origin:", req.get('origin'));
  console.log("Referer:", req.get('referer'));
  
  // Save i parametri per debug
  lastCallbackError = {
    timestamp: new Date().toISOString(),
    error: 'Callback ricevuto - in elaborazione',
    query: req.query
  };
  
  // Log of the error, If presente
  if (req.query.error) {
    console.error("GOOGLE AUTH ERROR:", {
      error: req.query.error,
      error_description: req.query.error_description,
      state: req.query.state
    });
    return res.status(400).send(`Authorization error: ${req.query.error}<br>Description: ${req.query.error_description || 'No description'}`);
  }
  
  const { code, state } = req.query;
  
  if (!code) {
    console.error("ERROR: Authorization code missing");
    return res.status(400).send('Authorization code missing');
  }
  
  // Retrieve userId and redirectUri from the state
  let userId: number | null = null;
  let stateRedirectUri: string = redirectUri; // Fallback al default
  
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      console.log("State data parsed:", stateData);
      
      // Retrieve the redirectUri from state (if present)
      if (stateData.redirectUri) {
        stateRedirectUri = stateData.redirectUri;
        console.log("Redirect URI retrieved from state:", stateRedirectUri);
      }
      
      // The userId can be a string like "admin:3" or a number
      const rawUserId = stateData.userId;
      if (typeof rawUserId === 'string' && rawUserId.includes(':')) {
        // Format "admin:3" or "customer:5" - extract the number after the colon
        const parts = rawUserId.split(':');
        userId = parseInt(parts[1], 10);
        console.log("UserId extracted from 'type:id' format:", userId);
      } else if (typeof rawUserId === 'number') {
        userId = rawUserId;
        console.log("UserId already numerico:", userId);
      } else {
        userId = parseInt(rawUserId, 10);
        console.log("UserId converted from string:", userId);
      }
    } catch (e) {
      console.error("Error parsing state:", e);
      lastCallbackError = {
        timestamp: new Date().toISOString(),
        error: 'Error parsing state: ' + String(e),
        query: req.query
      };
    }
  }
  
  if (!userId || isNaN(userId)) {
    console.error("ERROR: UserId not found or invalid in state");
    lastCallbackError = {
      timestamp: new Date().toISOString(),
      error: 'UserId not found o invalid',
      query: req.query
    };
    return res.status(400).send('Invalid session. Please try authorization again.');
  }
  
  try {
    console.log("Exchanging authorization code for user:", userId);
    console.log("Redirect URI for token exchange:", stateRedirectUri);
    
    // Create a new OAuth client with the correct redirect URI (the one used for the original request)
    const callbackOauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      stateRedirectUri
    );
    
    // Exchange the code for tokens using the correct redirect URI
    console.log("Attempting to exchange code for token...");
    const { tokens } = await callbackOauth2Client.getToken(code as string);
    console.log("Tokens obtained successfully for user:", userId);
    
    oauth2Client.setCredentials(tokens);
    
    // SAVE TOKENS IN THE USER DATABASE (encrypted)
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
      
      console.log("✅ Google token saved in database for user:", userId);
    } catch (dbError) {
      console.error("❌ Error saving token to database:", dbError);
      // Continue anyway to show the success page
    }
    
    // Also keep in memory for backwards compatibility
    authInfo = {
      authorized: true,
      tokens
    };
    
    // Close the popup window if it was opened as a popup
    res.send(`
      <html>
        <head>
          <title>Autorizzazione completata</title>
          <script>
            window.onload = function() {
              // Explicitly send a message to the opener to signal success
              if (window.opener) {
                // Tentativo 1: Send the message direttamente
                try {
                  window.opener.postMessage('google-auth-success', '*');
                  console.log('Message sent directly to opener');
                } catch (e) {
                  console.error('Error sending message directly:', e);
                }
                
                // Attempt 2: Use a timeout to ensure the event is sent
                setTimeout(function() {
                  try {
                    window.opener.postMessage('google-auth-success', '*');
                    console.log('Message sent to opener with timeout');
                  } catch (e) {
                    console.error('Error sending message with timeout:', e);
                  }
                }, 500);
              } else {
                // If there is an opener window, redirect to the settings page
                window.location.href = '/settings';
              }
              
              // Close the window after 2 seconds to give the message time to be processed
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
            <p>The Google account has been authorized successfully.</p>
            <p>Questa finestra si chiuderà automaticamente tra pochi secondi...</p>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Error exchanging authorization code:', error);
    
    // Save l'error per debug
    lastCallbackError = {
      timestamp: new Date().toISOString(),
      error: error?.message || String(error),
      stack: error?.stack,
      query: req.query
    };
    
    res.status(500).send(`
      <html>
        <head>
          <title>Authorization error</title>
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
            <h1>⚠️ Authorization error</h1>
            <p>An error occurred while authorizing the Google account.</p>
            <p>Please close this window and try again.</p>
          </div>
        </body>
      </html>
    `);
  }
});

// Check authorization status - READS FROM DATABASE for persistence
router.get('/status', async (req, res) => {
  console.log("🔐 [GOOGLE AUTH STATUS] Controlthe status autorizzazione...");
  
  // If the user is authenticated, check the token in the database
  if (req.isAuthenticated() && req.user) {
    const userId = (req.user as any).id;
    console.log("🔐 [GOOGLE AUTH STATUS] user authenticated ID:", userId);
    
    try {
      const [user] = await db.select({
        email: users.email,
        googleAuthToken: users.googleAuthToken,
        googleCalendarEnabled: users.googleCalendarEnabled,
        googleCalendarId: users.googleCalendarId
      }).from(users).where(eq(users.id, userId)).limit(1);
      
      if (user && user.googleAuthToken) {
        console.log("✅ [GOOGLE AUTH STATUS] token found in database for user", userId);
        
        // Also restore authInfo in memory for backwards compatibility
        const decryptedTokenStr = EncryptionService.decryptToken(user.googleAuthToken);
        const tokens = JSON.parse(decryptedTokenStr);
        authInfo = {
          authorized: true,
          tokens
        };
        
        // Reset the credentials on the OAuth client
        oauth2Client.setCredentials(tokens);
        
        // Extract email from JWT token (id_token contains the real email)
        let googleEmail: string | null = null;
        
        // First try to extract the email from the JWT token
        if (tokens.id_token) {
          try {
            const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
            googleEmail = payload.email;
            console.log("✅ [GOOGLE AUTH STATUS] Email extracted from token:", googleEmail);
          } catch (e) {
            console.log("⚠️ [GOOGLE AUTH STATUS] Unable to extract email from token");
          }
        }
        
        // Fallback: use googleCalendarId only if it is "primary"
        if (!googleEmail && user.googleCalendarId && user.googleCalendarId !== 'primary') {
          googleEmail = user.googleCalendarId;
        }
        
        // Ultimo fallback: email of the user
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
      console.log("⚠️ [GOOGLE AUTH STATUS] No token in database for user", userId);
    } catch (error) {
      console.error("❌ [GOOGLE AUTH STATUS] Error reading database:", error);
    }
  } else {
    console.log("⚠️ [GOOGLE AUTH STATUS] User not authenticated");
  }
  
  // If there is a token in the database for this user, they are NOT authorized
  // (the old fallback used a global variable that caused security bugs)
  console.log("🔐 [GOOGLE AUTH STATUS] No token found, user unauthorized");
  res.json({ 
    success: true, 
    authorized: false 
  });
});

// Endpoint for testing Google OAuth configuration
router.get('/test-configuration', (req, res) => {
  try {
    // Verify the presence of credentials
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({
        success: false,
        message: "Missing Google credentials"
      });
    }
    
    // Verify l'URL di callback
    console.log("Configuration test: callback URL configured:", redirectUri);
    
    // Generate an authorization URL for testing
    const testAuthUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      redirect_uri: redirectUri
    });
    
    console.log("Test configuration: authorization URL generated successfully");
    
    res.json({
      success: true,
      message: "Basic configuration correct",
      clientIdPresente: !!process.env.GOOGLE_CLIENT_ID,
      clientSecretPresente: !!process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: redirectUri,
      testAuthUrl: testAuthUrl,
      scopeValidi: SCOPES
    });
  } catch (error: any) {
    console.error("Error testing Google configuration:", error);
    res.status(500).json({
      success: false,
      message: `Configuration error: ${error?.message || 'Unknown error'}`,
      error: error
    });
  }
});

// Adding a debug endpoint to determine the exact path
router.get('/debug-url', (req, res) => {
  const host = req.get('host') || 'unknown';
  const protocol = req.protocol || 'https';
  const path = req.originalUrl || '/api/google-auth/debug-url';
  const fullUrl = `${protocol}://${host}${path}`;
  
  // Generate a test URL to verify the parameters
  const testAuthUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    response_type: 'code',
    scope: SCOPES,
    redirect_uri: redirectUri,
    include_granted_scopes: true
  });
  
  // Show the full URL, HTTP headers, and test authorization URL
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

// Added endpoint to display comparison of authorization URLs
router.get('/compare-auth-urls', (req, res) => {
  // Build manualmente l'URL di autenticazione di base
  const clientId = encodeURIComponent(process.env.GOOGLE_CLIENT_ID as string);
  const encodedRedirectUri = encodeURIComponent(redirectUri);
  const encodedScopes = encodeURIComponent(SCOPES.join(' '));
  
  // Generate the URL without using the library to avoid extra parameters
  const manualAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${encodedScopes}&access_type=offline&prompt=consent`;
  
  // Also generate the URL with the official library
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
        <title>Google Authorization URL Comparison</title>
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
          <h1>Google Authorization URL Comparison</h1>
          
          <div class="note">
            <p><strong>Nota:</strong> Questa pagina confronta due metodi per generare l'URL di autorizzazione Google OAuth. L'URL generato manualmente non contiene parametri aggiuntivi che possono causare problemi di mismatch.</p>
          </div>
          
          <h2>Manually generated URL (without extra parameters)</h2>
          <div class="url-box manual">${manualAuthUrl}</div>
          
          <h2>URL generated by the official library</h2>
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
          
          <h2>Authorization test</h2>
          <p>Select one of the methods to test the authorization:</p>
          
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

// Endpoint for resolving error 400 and Google Calendar configuration
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
            <strong>Problem:</strong> Unable to complete Google OAuth authentication due to error 
            <span class="code">redirect_uri_mismatch</span> con <span class="code">flowName=GeneralOAuthFlow</span>.
          </div>
          
          <div class="section">
            <h2>Spiegazione del problema</h2>
            <p>This error means that the callback URL the application is sending to Google does not match exactly what is configured in the Google Cloud Console. Even a small difference (like a trailing slash or different uppercase/lowercase) can cause this error.</p>
            
            <p>L'app sta utilizzando il seguente URL di callback:</p>
            <div class="highlight">${redirectUriProduction}</div>
            
            <p>This URL must match <strong>EXACTLY</strong> one of the authorized redirect URIs configured in the Google Cloud Console.</p>
          </div>
          
          <div class="section">
            <h2>Istruzioni per la correzione</h2>
            
            <div class="step">
              <h3>Accedi alla console Google Cloud</h3>
              <p>Vai a <a href="https://console.cloud.google.com/apis/credentials" target="_blank">https://console.cloud.google.com/apis/credentials</a> e accedi con l'account associato al progetto.</p>
            </div>
            
            <div class="step">
              <h3>Trova le credenziali OAuth corrette</h3>
              <p>In the "Credentials" section, find the OAuth 2.0 client ID you are using for this application.</p>
              <p>Il tuo ID client dovrebbe essere: <span class="code">${process.env.GOOGLE_CLIENT_ID}</span></p>
            </div>
            
            <div class="step">
              <h3>Verifica o aggiungi l'URI di reindirizzamento</h3>
              <p>Click the client ID to edit it. In the "Authorized redirect URIs" section, verify that exactly the following URL is present:</p>
              <div class="highlight">${redirectUriProduction}</div>
              
              <p>If it is not present or is different (even by a single character):</p>
              <ol>
                <li>Aggiungi esattamente questo URL come URI di reindirizzamento autorizzato</li>
                <li>Assicurati che non ci siano spazi o caratteri extra</li>
                <li>Fai clic su "Salva" in fondo alla pagina</li>
              </ol>
            </div>
            
            <div class="warning">
              <p><strong>Important:</strong> After updating the redirect URIs in the Google Cloud Console, you may need to wait up to 5-10 minutes for the changes to take effect. Google caches these configurations and they may not be immediately updated.</p>
            </div>
            
            <div class="step">
              <h3>Make a new attempt</h3>
              <p>After updating the configuration and waiting a few minutes, return to the settings page in the application and try connecting Google Calendar again.</p>
            </div>
          </div>
          
          <div class="section">
            <h2>Risoluzioni comuni per errori persistenti</h2>
            
            <div class="console-section">
              <h3>Se l'errore 400 persiste:</h3>
              <ul>
                <li>Verifica che stai utilizzando lo stesso account Google per accedere alla console e per autorizzare l'applicazione</li>
                <li>Try removing all existing redirect URIs and add only the correct one</li>
                <li>Make sure the required APIs (Google Calendar API, Gmail API) are enabled in the project</li>
                <li>Check that the client ID and client secret are correct in the application</li>
                <li>If testing locally, configure both the local URL and production URL in the Google Cloud Console</li>
              </ul>
            </div>
          </div>
          
          <div class="section">
            <h2>Verify current status</h2>
            <p>Google authorization status in the application:</p>
            <div id="auth-status">Verifica in corso...</div>
            <button class="button" onclick="checkAuthStatus()">Aggiorna stato</button>
            
            <div class="warning" style="margin-top: 20px;">
              <p><strong>Nota:</strong> If the site is publicly inaccessible (<span class="code">DNS_PROBE_FINISHED_NXDOMAIN</span>), the Google Calendar integration will only work when the app is publicly accessible again. This is because Google must be able to reach the callback URL to complete the authorization process.</p>
            </div>
          </div>
          
          <script>
            function checkAuthStatus() {
              fetch('/api/google-auth/status')
                .then(response => response.json())
                .then(data => {
                  const statusElement = document.getElementById('auth-status');
                  if (data.authorized) {
                    statusElement.innerHTML = '<div class="success"><strong>✅ Authorized</strong> - Google Calendar integration is active.</div>';
                  } else {
                    statusElement.innerHTML = '<div class="error"><strong>❌ Unauthorized</strong> - Google Calendar integration has not been configured.</div>';
                  }
                })
                .catch(error => {
                  console.error('Error checking status:', error);
                  document.getElementById('auth-status').innerHTML = 
                    '<div class="error"><strong>⚠️ Error</strong> - Unable to verify authorization status.</div>';
                });
            }
            
            // Check the status at startup
            checkAuthStatus();
          </script>
        </div>
      </body>
    </html>
  `);
});

// Nuovo endpoint test locale per l'integrazione con Google Calendar
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
            <h2>1. Add this redirect URL to your Google Cloud Console</h2>
            <p>To perform local testing, add the following URL to your authorized redirect URIs in the <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console</a>:</p>
            <div class="highlight">${localRedirectUri}</div>
            <p>Note: You will also need to keep the production URL:</p>
            <div class="highlight">${productionRedirectUri}</div>
          </div>
          
          <div class="note">
            <p><strong>Important:</strong> After adding the redirect URL to the Google Cloud Console, you may need to wait a few minutes for the changes to become active.</p>
          </div>
          
          <div class="step">
            <h2>2. Testa l'integrazione locale</h2>
            <p>Once the redirect URL is added, you can test the integration by clicking the button below:</p>
            <button class="button" onclick="window.open('/api/google-auth/start')">Testa Autorizzazione Google</button>
          </div>
          
          <div class="step">
            <h2>3. Verify authorization status</h2>
            <p>Check the current authorization status:</p>
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
                  statusElement.innerHTML = '<span style="color: #f44336; font-weight: bold;">❌ Unauthorized</span>';
                }
              })
              .catch(error => {
                console.error('Error checking status:', error);
                document.getElementById('auth-status').innerHTML = 
                  '<span style="color: #f44336;">Error checking status</span>';
              });
          }
          
          // Check the status at startup
          checkAuthStatus();
          
          // Check periodicamente
          setInterval(checkAuthStatus, 5000);
        </script>
      </body>
    </html>
  `);
});

// Endpoint to directly verify the URL on the Google Cloud console
router.get('/verify-redirect', (req, res) => {
  // Generate a QR code pointing to the Google Cloud console
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
            <h2>1. Configured callback URL</h2>
            <p>The following callback URL must be configured in the Google Cloud Console:</p>
            <div class="highlight">${redirectUri}</div>
          </div>
          
          <div class="step">
            <h2>2. Verify in the Google Cloud Console</h2>
            <p>Apri la <a href="${consoleUrl}" target="_blank">console Google Cloud</a> e verifica che:</p>
            <ul>
              <li>L'ID client sia <code>${process.env.GOOGLE_CLIENT_ID}</code></li>
              <li>The following is present in "Authorized redirect URIs" exactly: <code>${redirectUri}</code></li>
            </ul>
          </div>
          
          <div class="note">
            <p><strong>Important note:</strong> If you have recently modified the redirect URIs in the Google Cloud Console, you may need to wait a few minutes (up to 5-10 minutes) for the changes to take effect.</p>
          </div>
          
          <div class="step">
            <h2>3. Errore 400 (redirect_uri_mismatch)</h2>
            <p>If you continue to receive this error:</p>
            <ul>
              <li>Assicurati che l'URI sia ESATTAMENTE uguale a quello mostrato sopra (anche un singolo carattere di differenza causerà l'errore)</li>
              <li>Verifica che non ci siano spazi o caratteri speciali nell'URI</li>
              <li>Prova a cancellare e aggiungere nuovamente l'URI di reindirizzamento nella console</li>
              <li>Assicurati di aver salvato le modifiche nella console Google Cloud</li>
            </ul>
          </div>
          
          <div class="step">
            <h2>4. Verifica diretta</h2>
            <p>To perform a direct OAuth authorization test, click the button below:</p>
            <button onclick="window.open('/api/google-auth/start')">Test Google authorization</button>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Configuration test
router.get('/test-configuration', async (req, res) => {
  try {
    // Verify the presence of the required secrets
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({
        success: false,
        error: 'Credenziali OAuth mancanti. Verifica GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nei segreti di Replit.'
      });
    }
    
    // Check if the callback URL is configured correctly
    console.log("Configuration test: callback URL configured:", redirectUri);
    
    // Attempt to generate an authorization URL (this will verify if credentials are correctly formatted)
    try {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });
      
      console.log("Test configuration: authorization URL generated successfully");
      
      // If we get here, the credentials are at least correctly formatted
      res.json({
        success: true,
        message: 'Basic configuration OK. To complete verification, try authorizing the app.',
        configStatus: {
          clientIdPresent: true,
          clientSecretPresent: true,
          redirectUriConfigured: true,
          authUrlGenerated: true,
          authorized: authInfo.authorized,
        }
      });
    } catch (error) {
      console.error("Error generating authorization URL:", error);
      return res.status(400).json({
        success: false,
        error: 'Error generating authorization URL. Credentials may be invalid.'
      });
    }
  } catch (error) {
    console.error("Error testing configuration:", error);
    res.status(500).json({
      success: false,
      error: 'Error during configuration test.'
    });
  }
});

// Revoke authorization
router.post('/revoke', isAuthenticated, async (req, res) => {
  if (!authInfo.authorized || !authInfo.tokens) {
    return res.json({ success: true, message: 'No active authorization' });
  }
  
  try {
    // Revoca i token
    await oauth2Client.revokeToken(authInfo.tokens.access_token);
    
    // Reset the authorization status
    authInfo = {
      authorized: false
    };
    
    res.json({ success: true, message: 'Authorization revoked successfully' });
  } catch (error) {
    console.error('Error revoking token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error revoking authorization' 
    });
  }
});

// ================ GOOGLE CONTACTS API ================

/**
 * Check if the user has authorized access to Google contacts
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
      message: hasContactsAuth ? 'Contatti Google autorizzati' : 'Autorizzazione contatti Google required'
    });
  } catch (error) {
    console.error('📇 [CONTACTS STATUS] Error:', error);
    res.status(500).json({ success: false, authorized: false });
  }
});

/**
 * Generate URL per autorizzare l'accesso ai contatti Google (separato da Calendar/Gmail)
 * GET /api/google-auth/contacts/authorize
 */
router.get('/contacts/authorize', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const contactsAuthUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: CONTACTS_SCOPES,
      state: `contacts_${userId}`,
      prompt: 'consent',
    });

    console.log(`📇 [CONTACTS AUTH] URL generated for user ${userId}`);
    res.json({ success: true, authUrl: contactsAuthUrl });
  } catch (error) {
    console.error('📇 [CONTACTS AUTH] Error generating URL:', error);
    res.status(500).json({ success: false, error: 'Error generating authorization URL' });
  }
});

/**
 * Callback for Google contacts authorization
 * GET /api/google-auth/contacts/callback
 */
router.get('/contacts/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state || !String(state).startsWith('contacts_')) {
      return res.status(400).send('Parametri mancanti o invalid');
    }

    const userId = parseInt(String(state).replace('contacts_', ''));
    if (!userId) {
      return res.status(400).send('Invalid user ID');
    }

    const callbackOauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${getRedirectUri().replace('/callback', '/contacts/callback')}`
    );

    const { tokens } = await callbackOauth2Client.getToken(code as string);
    
    // Save the contacts token separately
    const encryptedToken = EncryptionService.encrypt(JSON.stringify(tokens));
    await db.update(users)
      .set({ googleContactsToken: encryptedToken })
      .where(eq(users.id, userId));

    logger.debug(`✅ [CONTACTS AUTH] Contacts token saved for user ${userId}`);

    // Redirect to the clients page with success message
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
    console.error('📇 [CONTACTS CALLBACK] Error:', error);
    res.status(500).send('Error during Google contacts authorization');
  }
});

/**
 * Retrieve contacts from the user's Google address book
 * GET /api/google-auth/contacts
 */
router.get('/contacts', isAuthenticated, async (req, res) => {
  console.log('📇 [CONTACTS] GET /api/google-auth/contacts request');
  try {
    const userId = (req as any).user?.id;
    console.log('📇 [CONTACTS] userId:', userId);
    if (!userId) {
      console.log('📇 [CONTACTS] User not authenticated');
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    // Retrieve user tokens from the database - uses separate CONTACTS token
    const user = await storage.getUser(userId);
    if (!user?.googleContactsToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Google Contacts authorization not found. Click on "Authorize Google Contacts" to enable import.',
        needsContactsAuth: true
      });
    }

    // Decrypt the token if needed
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
        error: 'Token Google invalid. Riconnetti il tuo account.',
        needsReauth: true
      });
    }
    
    // Configure the OAuth client with the user's tokens
    const userOAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getRedirectUri()
    );
    userOAuth2Client.setCredentials(tokens);

    // Initialize People API
    const people = google.people({ version: 'v1', auth: userOAuth2Client });

    // Retrieve ALL contacts with pagination
    let allConnections: any[] = [];
    let nextPageToken: string | undefined = undefined;
    
    do {
      const response: any = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        personFields: 'names,emailAddresses,phoneNumbers,addresses',
        sortOrder: 'FIRST_NAME_ASCENDING',
        pageToken: nextPageToken
      });
      
      const connections = response.data.connections || [];
      allConnections = allConnections.concat(connections);
      nextPageToken = response.data.nextPageToken || undefined;
      
      console.log(`📇 [CONTACTS] Page loaded: ${connections.length} contacts (total so far: ${allConnections.length})`);
    } while (nextPageToken);

    const connections = allConnections;
    
    // Transform the data into a simpler format
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
    }).filter((c: any) => c.name || c.email || c.phone); // Filter empty contacts

    console.log(`📇 Retrieved ${contacts.length} Google contacts for user ${userId}`);

    res.json({ 
      success: true, 
      contacts,
      total: contacts.length
    });

  } catch (error: any) {
    console.error('📇 [CONTACTS] Error retrieving Google contacts:', error.message);
    console.error('📇 [CONTACTS] Error code:', error.code);
    console.error('📇 [CONTACTS] Full error:', JSON.stringify(error, null, 2));
    
    // if the token has expired or is invalid
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Google session expired. Please reconnect your account.',
        needsReauth: true
      });
    }
    
    // If the contacts scope is missing (catches various Google error formats)
    if (error.message?.includes('Request had insufficient authentication scopes') ||
        error.message?.includes('Insufficient Permission') ||
        error.code === 403) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions. Reconnect your Google account to enable contacts access.',
        needsReauth: true
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Error retrieving Google contacts' 
    });
  }
});

/**
 * Import i contatti selezionati come clients
 * POST /api/google-auth/contacts/import
 * 
 * SICUREZZA: Accetta only resourceNames (ID) e importAll flag
 * contact data is always retrieved server-side from Google
 */
router.post('/contacts/import', isAuthenticated, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    // Input validation with Zod - reject unexpected fields
    const validationResult = contactsImportSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid data format',
        details: validationResult.error.errors 
      });
    }

    const { resourceNames, importAll } = validationResult.data;

    if (!importAll && (!resourceNames || resourceNames.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        error: 'No contacts selected for import' 
      });
    }

    // Retrieve i token CONTATTI of the user (separato da Calendar/Gmail)
    const user = await storage.getUser(userId);
    if (!user?.googleContactsToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Google Contacts authorization not found. Click on "Authorize Google Contacts" to enable import.',
        needsContactsAuth: true
      });
    }

    // Decrypt the contact token if needed
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
        error: 'Token Google invalid',
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

    // Retrieve contacts from Google (always server-side for security)
    let contactsToImport: Array<{firstName: string, lastName: string, email: string, phone: string, address: string}> = [];

    if (importAll) {
      // Retrieve ALL contacts with pagination
      let allConnections: any[] = [];
      let nextPageToken: string | undefined = undefined;
      
      do {
        const response: any = await people.people.connections.list({
          resourceName: 'people/me',
          pageSize: 1000,
          personFields: 'names,emailAddresses,phoneNumbers,addresses',
          sortOrder: 'FIRST_NAME_ASCENDING',
          pageToken: nextPageToken
        });
        
        const connections = response.data.connections || [];
        allConnections = allConnections.concat(connections);
        nextPageToken = response.data.nextPageToken || undefined;
        
        console.log(`📇 [IMPORT] Page loaded: ${connections.length} contacts (total so far: ${allConnections.length})`);
      } while (nextPageToken);

      contactsToImport = allConnections.map((person: any) => ({
        firstName: person.names?.[0]?.givenName || person.names?.[0]?.displayName || '',
        lastName: person.names?.[0]?.familyName || '',
        email: person.emailAddresses?.[0]?.value || '',
        phone: person.phoneNumbers?.[0]?.value || '',
        address: person.addresses?.[0]?.formattedValue || ''
      })).filter((c: any) => (c.firstName || c.lastName) || c.email || c.phone);
      
      console.log(`📇 [IMPORT] Total contacts to import: ${contactsToImport.length}`);
    } else if (resourceNames && resourceNames.length > 0) {
      // Retrieve only the selected contacts via their resourceNames
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
          console.error('Error batch getting contacts:', batchError);
        }
      }
    }

    // Retrieve i clients esistenti per evitare duplicati
    const existingClients = await storage.getVisibleClientsForUser(userId, 'admin');
    
    // Create set for duplicate checking: priority to name+phone, then email
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
        // Normalize the contact data
        const nameNormalized = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase().trim();
        const phoneNormalized = contact.phone?.replace(/\s+/g, '') || '';
        const emailNormalized = contact.email?.toLowerCase() || '';
        const namePhoneKey = phoneNormalized ? `${nameNormalized}|${phoneNormalized}` : null;

        // Priority 1: Check for duplicates by name+phone (main criterion)
        if (namePhoneKey && existingNamePhone.has(namePhoneKey)) {
          skipped++;
          continue;
        }
        
        // Priority 2: Check for duplicates by phone only (if present)
        if (phoneNormalized && existingPhones.has(phoneNormalized)) {
          skipped++;
          continue;
        }
        
        // Priority 3: Check for duplicates by email (if present and not empty)
        if (emailNormalized && existingEmails.has(emailNormalized)) {
          skipped++;
          continue;
        }

        // Create the client with required fields firstName, lastName, phone
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
        
        // Generate codici client (stessa logica di POST /api/clients)
        let newUniqueCode = null;
        try {
          newUniqueCode = await generateClientCode(userId);
        } catch (error: any) {
          if (error.message && error.message.includes('Codice professionista not found')) {
            logger.debug(`⚠️ contact imported without newUniqueCode (professional without assignmentCode)`);
          } else {
            throw error;
          }
        }
        
        // Generate the legacy uniqueCode (format PROF_XXX_CXXXXX)
        const legacyUniqueCode = `PROF_${userId.toString().padStart(3, '0')}_C${newClient.id.toString().padStart(5, '0')}`;
        
        // Update the client with the generated codes
        const updateData: any = { uniqueCode: legacyUniqueCode };
        if (newUniqueCode) {
          updateData.newUniqueCode = newUniqueCode;
        }
        
        await storage.updateClient(newClient.id, updateData);
        
        logger.debug(`✅ contact imported: ${contact.firstName} ${contact.lastName} - code: ${newUniqueCode || legacyUniqueCode}`);
        imported++;

        // Add to lists to avoid duplicates in the current batch
        if (namePhoneKey) existingNamePhone.add(namePhoneKey);
        if (phoneNormalized) existingPhones.add(phoneNormalized);
        if (emailNormalized) existingEmails.add(emailNormalized);

      } catch (err: any) {
        const contactName = `${contact.firstName} ${contact.lastName}`.trim() || 'Contatto';
        console.error(`Error importing contact ${contactName}:`, err);
        errors.push(`${contactName}: ${err.message}`);
      }
    }

    console.log(`📇 Contacts import completed for user ${userId}: ${imported} imported, ${skipped} skipped (duplicates)`);

    res.json({ 
      success: true, 
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${imported} contatti${skipped > 0 ? `, ${skipped} saltati (already existing)` : ''}`
    });

  } catch (error) {
    console.error('Error importing contacts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error importing contacts' 
    });
  }
});

export default router;