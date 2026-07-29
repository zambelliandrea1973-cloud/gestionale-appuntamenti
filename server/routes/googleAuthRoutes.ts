import { logger } from '../utils/logger';
import { Router } from 'express';
import { google } from 'googleapis';
import { isAuthenticated } from '../auth';
import { db } from '../db';
import { users, clients, googleAccounts, appointments, googleCalendarEvents } from '../../shared/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { storage } from '../storage';
import { EncryptionService } from '../services/encryption';
import { z } from 'zod';
import { generateClientCode } from '../utils/clientCodeGenerator';
import { syncBidirectional, extractGoogleEmail } from '../services/googleCalendarSync';

// Validation schema for contact import
const contactsImportSchema = z.object({
  resourceNames: z.array(z.string()).optional(),
  importAll: z.boolean().optional()
}).strict(); // .strict() rejects extra fields

const router = Router();

// Configure the OAuth client
// This URL MUST match exactly what is configured in the Google Cloud Console
// We use a FIXED URL that matches exactly what is in the Google Cloud Console

// IMPORTANT: This URL must match EXACTLY what is configured in the Google Cloud Console
// We use the actual application domain, based on REPL_SLUG and REPL_OWNER
// Old fixed redirect URI
//const redirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/google-auth/callback`;

// Add the ability to override redirectUri for local testing
// Enhanced check for the local development environment
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

// Base scopes for Calendar, Gmail and Contacts (main authorization)
// All 4 scopes must appear in the main OAuth consent screen for Google verification
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/contacts.readonly',
];

// Contacts scopes (also included in main SCOPES for Google verification compliance)
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
        // Decode the token
        const decryptedToken = EncryptionService.decrypt(user.googleAuthToken);
        const tokens = JSON.parse(decryptedToken);
        
        // Try to revoke the token on Google (optional, may fail)
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
    
    // Delete the token from the database and flag as user-initiated disconnect
    await db.update(users)
      .set({ 
        googleAuthToken: null,
        googleCalendarEnabled: false,
        googleCalendarId: null,
        googleCalendarDisabledByUser: true
      })
      .where(eq(users.id, userId));
    
    logger.debug(`✅ [REVOKE] Token deleted from database for user ${userId} (user-initiated)`);
    
    res.json({ success: true, message: 'Token revoked successfully' });
  } catch (error) {
    console.error('❌ [REVOKE] Error revoking token:', error);
    res.status(500).json({ success: false, error: 'Error revoking token' });
  }
});

// Start the authorization process
router.get('/start', async (req, res) => {
  try {
    // Verify that the user is authenticated
    const userId = (req as any).session?.passport?.user;
    if (!userId) {
      console.error("ERROR: User not authenticated for Google OAuth");
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    // mode=addAccount → collega un account Google SECONDARIO (salvato in google_accounts)
    const isAddAccount = req.query.mode === 'addAccount';
    console.log("Google OAuth start for user:", userId, isAddAccount ? "(ADD SECONDARY ACCOUNT)" : "(primary)");

    // Salva il flag in sessione come BACKUP nel caso il `state` si corrompa nel round-trip OAuth
    if (isAddAccount) {
      (req as any).session.pendingAddGoogleAccount = { userId, ts: Date.now() };
      await new Promise<void>((resolve) => (req as any).session.save(() => resolve()));
      console.log(`🔒 [OAUTH] Session backup saved for addAccount (user ${userId})`);
    } else {
      // Pulizia preventiva: se c'era un vecchio backup pendente, rimuovilo
      delete (req as any).session.pendingAddGoogleAccount;
    }
    
    // Get the request domain to support dev webviews
    const requestHost = req.get('host');
    const dynamicRedirectUri = getRedirectUri(requestHost);
    
    console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
    console.log("Request Host:", requestHost);
    console.log("Dynamic redirect URI:", dynamicRedirectUri);
    
    // For secondary accounts we need the email scope (openid+email) to identify which account was connected
    const effectiveScopes = isAddAccount ? [...SCOPES, 'openid', 'email'] : SCOPES;
    
    // Build the authentication URL manually
    const clientId = encodeURIComponent(process.env.GOOGLE_CLIENT_ID as string);
    const encodedRedirectUri = encodeURIComponent(dynamicRedirectUri);
    const encodedScopes = encodeURIComponent(effectiveScopes.join(' '));
    
    // State contains the userId AND the redirectUri for the callback
    // returnTo: pagina a cui tornare dopo auth via redirect (non popup)
    const returnTo = (req.query.returnTo as string) || null;
    const state = Buffer.from(JSON.stringify({ 
      userId, 
      redirectUri: dynamicRedirectUri,
      addAccount: isAddAccount,
      ...(returnTo ? { returnTo } : {})
    })).toString('base64');
    
    // Required parameters in the correct order
    const params = [
      `client_id=${clientId}`,
      `redirect_uri=${encodedRedirectUri}`,
      `response_type=code`,
      `scope=${encodedScopes}`,
      `access_type=offline`,
      `prompt=${encodeURIComponent('select_account consent')}`,
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
  
  // Save parameters for debug
  lastCallbackError = {
    timestamp: new Date().toISOString(),
    error: 'Callback received - processing',
    query: req.query
  };
  
  // Log the error, if present
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
  let stateRedirectUri: string = redirectUri; // Fallback to default
  let isAddAccount = false; // true → collega un account Google secondario
  let callbackReturnTo = '/google-calendar'; // pagina a cui tornare dopo auth via redirect (non popup)
  
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      console.log("State data parsed:", stateData);
      
      // Retrieve the redirectUri from state (if present)
      if (stateData.redirectUri) {
        stateRedirectUri = stateData.redirectUri;
        console.log("Redirect URI retrieved from state:", stateRedirectUri);
      }
      
      // Detect secondary-account flow
      isAddAccount = stateData.addAccount === true;
      console.log(`🔍 [OAUTH CB] state.addAccount=${stateData.addAccount} → isAddAccount=${isAddAccount}`);
      
      // Pagina di ritorno per il flusso redirect (non popup)
      if (stateData.returnTo) callbackReturnTo = stateData.returnTo;
      
      // The userId can be a string like "admin:3" or a number
      const rawUserId = stateData.userId;
      if (typeof rawUserId === 'string' && rawUserId.includes(':')) {
        // Format "admin:3" or "customer:5" - extract the number after the colon
        const parts = rawUserId.split(':');
        userId = parseInt(parts[1], 10);
        console.log("UserId extracted from 'type:id' format:", userId);
      } else if (typeof rawUserId === 'number') {
        userId = rawUserId;
        console.log("UserId already numeric:", userId);
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
  
  // FALLBACK SESSIONE: se il state non ha addAccount=true ma c'è un flag di sessione valido
  // (es: state corrotto nel round-trip OAuth su alcuni proxy/iframe), recupera l'intento dalla sessione
  const sessionPending = (req as any).session?.pendingAddGoogleAccount;
  if (!isAddAccount && sessionPending && typeof sessionPending === 'object') {
    const pendingAge = Date.now() - (sessionPending.ts || 0);
    if (pendingAge < 10 * 60 * 1000) { // max 10 minuti
      isAddAccount = true;
      // Se userId non è stato estratto dallo state, usa quello della sessione
      if (!userId && sessionPending.userId) userId = Number(sessionPending.userId);
      console.log(`♻️ [OAUTH CB] addAccount recuperato da sessione (age: ${Math.round(pendingAge/1000)}s, userId: ${userId})`);
    }
  }
  // Pulisci sempre il flag di sessione dopo l'uso
  if (sessionPending) {
    delete (req as any).session.pendingAddGoogleAccount;
    (req as any).session.save(() => {});
  }

  if (!userId || isNaN(userId)) {
    console.error("ERROR: UserId not found or invalid in state");
    lastCallbackError = {
      timestamp: new Date().toISOString(),
      error: 'UserId not found or invalid',
      query: req.query
    };
    return res.status(400).send('Invalid session. Please try authorization again.');
  }
  
  try {
    let addAccountOutcome: 'added' | 'duplicate-primary' | 'reauth' | null = null;
    let addAccountEmail: string | null = null;
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
    
    // SAVE TOKENS IN THE DATABASE (encrypted) — primary user OR secondary google_account
    try {
      const tokenJson = JSON.stringify(tokens);
      const encryptedCalendarToken = EncryptionService.encrypt(tokenJson);

      if (isAddAccount) {
        // ===== SECONDARY ACCOUNT =====
        // Extract the connected account's email from the id_token JWT
        const { extractGoogleEmail } = await import('../services/googleCalendarSync');
        const secondaryEmail = extractGoogleEmail(tokens, null);

        if (!secondaryEmail) {
          console.error("❌ [OAUTH] Could not determine secondary account email from token");
          return res.status(400).send('Impossibile determinare l\'email dell\'account Google. Riprova autorizzando i permessi email.');
        }

        // Prevent linking the same email as the primary account
        const [primaryUser] = await db.select({ email: users.email, googleAuthToken: users.googleAuthToken })
          .from(users).where(eq(users.id, userId));
        const primaryGoogleEmail = primaryUser?.googleAuthToken
          ? extractGoogleEmail(JSON.parse(EncryptionService.decryptToken(primaryUser.googleAuthToken)), primaryUser.email || null)
          : primaryUser?.email || null;

        if (primaryGoogleEmail && secondaryEmail.toLowerCase() === primaryGoogleEmail.toLowerCase()) {
          console.warn(`⚠️ [OAUTH] Secondary email ${secondaryEmail} equals primary — skipping`);
          addAccountOutcome = 'duplicate-primary';
          addAccountEmail = secondaryEmail;
        } else {
          // Color palette for secondary accounts — pick the first unused color
          const PALETTE = ['#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308', '#ef4444'];
          const existing = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, userId));
          const usedColors = new Set(existing.map(a => a.color));
          const nextColor = PALETTE.find(c => !usedColors.has(c)) || PALETTE[existing.length % PALETTE.length];

          const alreadyLinked = existing.find(a => a.email.toLowerCase() === secondaryEmail.toLowerCase());
          if (alreadyLinked) {
            // Re-authorization of an existing secondary account → refresh its token + re-enable
            await db.update(googleAccounts)
              .set({ authToken: encryptedCalendarToken, enabled: true })
              .where(eq(googleAccounts.id, alreadyLinked.id));
            console.log(`✅ [OAUTH] Secondary Google account re-authorized: ${secondaryEmail}`);
            addAccountOutcome = 'reauth';
            addAccountEmail = secondaryEmail;
          } else {
            await db.insert(googleAccounts).values({
              userId,
              email: secondaryEmail,
              authToken: encryptedCalendarToken,
              color: nextColor,
              enabled: true
            });
            console.log(`✅ [OAUTH] Secondary Google account linked: ${secondaryEmail} (color ${nextColor})`);
            addAccountOutcome = 'added';
            addAccountEmail = secondaryEmail;
          }

          // Immediate import for this secondary account (fire-and-forget)
          const [acc] = await db.select().from(googleAccounts)
            .where(and(eq(googleAccounts.userId, userId), eq(googleAccounts.email, secondaryEmail)));
          if (acc) {
            import('../services/googleCalendarSync').then(({ importGoogleCalendarEvents }) => {
              importGoogleCalendarEvents(userId!, 'Europe/Rome', true, { id: acc.id, email: acc.email })
                .then(r => console.log(`✅ [OAUTH] Initial import for secondary ${acc.email}: ${r.imported} eventi`))
                .catch(e => console.error(`❌ [OAUTH] Initial import failed for secondary ${acc.email}:`, e));
            });
          }
        }
      } else {
        // ===== PRIMARY ACCOUNT =====
        // SAFEGUARD: se esiste già un account primario con email DIVERSA,
        // salva il nuovo come SECONDARIO invece di sovrascrivere il primario.
        // Questo previene la sostituzione accidentale dell'account principale.
        const { extractGoogleEmail } = await import('../services/googleCalendarSync');
        const newEmail = extractGoogleEmail(tokens, null);

        const [existingUser] = await db
          .select({ googleAuthToken: users.googleAuthToken, email: users.email })
          .from(users)
          .where(eq(users.id, userId!));

        const existingPrimaryEmail = existingUser?.googleAuthToken
          ? (() => {
              try {
                return extractGoogleEmail(
                  JSON.parse(EncryptionService.decryptToken(existingUser.googleAuthToken)),
                  existingUser.email || null
                );
              } catch { return null; }
            })()
          : null;

        const isDifferentEmail =
          existingPrimaryEmail &&
          newEmail &&
          existingPrimaryEmail.toLowerCase() !== newEmail.toLowerCase();

        if (isDifferentEmail) {
          // ── Salva come secondario (non sovrascrivere il primario) ────────
          console.warn(`🛡️ [OAUTH SAFEGUARD] Primario già impostato come ${existingPrimaryEmail} → salvo ${newEmail} come secondario`);
          const PALETTE = ['#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308', '#ef4444'];
          const existingSecondary = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, userId!));
          const usedColors = new Set(existingSecondary.map((a) => a.color));
          const nextColor = PALETTE.find((c) => !usedColors.has(c)) || PALETTE[existingSecondary.length % PALETTE.length];

          const alreadyLinked = existingSecondary.find(
            (a) => a.email.toLowerCase() === (newEmail ?? '').toLowerCase()
          );
          if (alreadyLinked) {
            await db
              .update(googleAccounts)
              .set({ authToken: encryptedCalendarToken, enabled: true })
              .where(eq(googleAccounts.id, alreadyLinked.id));
            addAccountOutcome = 'reauth';
          } else {
            await db.insert(googleAccounts).values({
              userId: userId!,
              email: newEmail!,
              authToken: encryptedCalendarToken,
              color: nextColor,
              enabled: true,
            });
            addAccountOutcome = 'added';
          }
          addAccountEmail = newEmail;
          isAddAccount = true; // usa il messaggio di successo secondario nella risposta HTML

          // Import immediato del secondario
          const [acc] = await db
            .select()
            .from(googleAccounts)
            .where(and(eq(googleAccounts.userId, userId!), eq(googleAccounts.email, newEmail!)));
          if (acc) {
            import('../services/googleCalendarSync').then(({ importGoogleCalendarEvents }) => {
              importGoogleCalendarEvents(userId!, 'Europe/Rome', true, { id: acc.id, email: acc.email })
                .then((r) => console.log(`✅ [SAFEGUARD] Import secondario ${acc.email}: ${r.imported} eventi`))
                .catch((e) => console.error(`❌ [SAFEGUARD] Import fallito per ${acc.email}:`, e));
            });
          }
        } else {
          // Nessun primario esistente (o stessa email → re-auth) → salva come primario
          await db.update(users)
            .set({
              googleAuthToken: encryptedCalendarToken,
              googleCalendarEnabled: true,
              googleCalendarId: 'primary',
              lastGoogleSyncAt: new Date(),
              googleCalendarDisabledByUser: false
            })
            .where(eq(users.id, userId));
          
          console.log("✅ Google token saved in database for user:", userId);

          // Sync bidirezionale immediata in background (fire-and-forget)
          syncBidirectional(userId, 'Europe/Rome')
          .then(r => console.log(`✅ [OAUTH] Initial bidirectional sync for user ${userId}: ${r.message}`))
          .catch(e => console.error(`❌ [OAUTH] Initial bidirectional sync failed for user ${userId}:`, e));

          // Register push notification watches so Google calls us when events change (production only)
          import('../services/googleCalendarSync').then(({ registerCalendarWatches }) => {
            registerCalendarWatches(userId!)
              .then(() => console.log(`✅ [OAUTH] Watch channels registered for user ${userId}`))
              .catch(e => console.error(`❌ [OAUTH] Watch registration failed for user ${userId}:`, e));
          });
        } // end isDifferentEmail else
      } // end PRIMARY ACCOUNT else

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
    let popupTitle = '✅ Autorizzazione completata!';
    let popupMsg = 'L\'account Google è stato autorizzato correttamente.';
    let popupColor = '#4CAF50';
    const closeDelayMs = isAddAccount ? 6000 : 2000;
    if (isAddAccount) {
      if (addAccountOutcome === 'duplicate-primary') {
        popupTitle = '⚠️ Account già collegato';
        popupMsg = `${addAccountEmail} è già il tuo account principale: non serve aggiungerlo. Per importare un secondo calendario scegli un account Google DIVERSO dalla finestra di Google.`;
        popupColor = '#f59e0b';
      } else if (addAccountOutcome === 'added') {
        popupTitle = '✅ Account aggiunto';
        popupMsg = `${addAccountEmail} è stato collegato come account secondario. I suoi appuntamenti verranno importati con il colore assegnato.`;
      } else if (addAccountOutcome === 'reauth') {
        popupTitle = '✅ Account riautorizzato';
        popupMsg = `${addAccountEmail} è stato riconnesso correttamente.`;
      }
    }
    res.send(`
      <html>
        <head>
          <title>Authorization complete</title>
          <script>
            window.onload = function() {
              // Explicitly send a message to the opener to signal success
              if (window.opener) {
                // Attempt 1: Send the message directly
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
                // Redirect main window: torna alla pagina di origine (returnTo dallo state)
                window.location.href = '${callbackReturnTo}';
              }
              
              // Close the window after 2 seconds to give the message time to be processed
              setTimeout(function() {
                window.close();
              }, ${closeDelayMs});
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
            <h1 style="color: ${popupColor}">${popupTitle}</h1>
            <p>${popupMsg}</p>
            <p>Questa finestra si chiuderà automaticamente tra qualche secondo...</p>
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
  console.log("🔐 [GOOGLE AUTH STATUS] Checking authorization status...");
  
  // If the user is authenticated, check the token in the database
  if (req.isAuthenticated() && req.user) {
    const userId = (req.user as any).id;
    console.log("🔐 [GOOGLE AUTH STATUS] user authenticated ID:", userId);
    
    try {
      const [user] = await db.select({
        email: users.email,
        googleAuthToken: users.googleAuthToken,
        googleCalendarEnabled: users.googleCalendarEnabled,
        googleCalendarId: users.googleCalendarId,
        googleCalendarDisabledByUser: users.googleCalendarDisabledByUser,
        googleNeedsReauth: users.googleNeedsReauth,
        googleCalendarEmail: users.googleCalendarEmail,
      }).from(users).where(eq(users.id, userId)).limit(1);
      
      if (user && user.googleAuthToken) {
        console.log("✅ [GOOGLE AUTH STATUS] token found in database for user", userId);
        
        // Estrai email senza rischiare eccezioni di decryption
        // (la decryption completa avviene solo quando serve davvero il token per le API)
        let googleEmail: string | null = (user as any).googleCalendarEmail || null;
        try {
          const decryptedTokenStr = EncryptionService.decryptToken(user.googleAuthToken);
          const tokens = JSON.parse(decryptedTokenStr);
          authInfo = { authorized: true, tokens };
          oauth2Client.setCredentials(tokens);
          if (tokens.id_token) {
            const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
            googleEmail = payload.email || googleEmail;
          }
        } catch (decryptErr) {
          console.warn("⚠️ [GOOGLE AUTH STATUS] Token decrypt failed (key mismatch?) — still marking authorized=true since token exists");
        }
        
        // Fallback email
        if (!googleEmail && user.googleCalendarId && user.googleCalendarId !== 'primary') {
          googleEmail = user.googleCalendarId;
        }
        if (!googleEmail) googleEmail = user.email;
        
        const needsReauth = (user as any).googleNeedsReauth ?? false;
        return res.json({ 
          success: true, 
          authorized: true,
          calendarEnabled: user.googleCalendarEnabled,
          disabledByUser: user.googleCalendarDisabledByUser ?? false,
          needsReauth,
          email: googleEmail
        });
      }
      console.log("⚠️ [GOOGLE AUTH STATUS] No token in database for user", userId);
      // Even without token, preserve email and needsReauth so the UI can show "reconnect" state
      const preservedEmail = (user as any)?.googleCalendarEmail || null;
      const needsReauth = (user as any)?.googleNeedsReauth ?? false;
      return res.json({
        success: true,
        authorized: false,
        disabledByUser: user?.googleCalendarDisabledByUser ?? false,
        needsReauth,
        email: preservedEmail,
      });
    } catch (error) {
      console.error("❌ [GOOGLE AUTH STATUS] Error reading database:", error);
    }
  } else {
    console.log("⚠️ [GOOGLE AUTH STATUS] User not authenticated");
  }
  
  console.log("🔐 [GOOGLE AUTH STATUS] No token found, user unauthorized");
  res.json({ 
    success: true, 
    authorized: false,
    disabledByUser: false
  });
});

// POST /api/google-auth/auto-restore
// Riabilita silenziosamente la sync se il token è ancora presente nel DB
// (disconnessione causata da bug/aggiornamento, non dall'utente)
router.post('/auto-restore', async (req, res) => {
  // Usa req.user (deserializzato da Passport) — più robusto di session?.passport?.user
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  const userId = (req.user as any).id;

  try {
    const [user] = await db.select({
      googleAuthToken: users.googleAuthToken,
      googleCalendarEnabled: users.googleCalendarEnabled,
      googleCalendarDisabledByUser: users.googleCalendarDisabledByUser,
      googleNeedsReauth: users.googleNeedsReauth,
      googleCalendarEmail: users.googleCalendarEmail,
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Se l'utente ha disattivato volontariamente, non ripristinare mai
    if (user.googleCalendarDisabledByUser) {
      return res.json({ success: false, reason: 'disabled_by_user' });
    }

    // Token presente → gestione in base a needsReauth
    if (user.googleAuthToken) {
      const needsReauth = (user as any).googleNeedsReauth ?? false;

      if (needsReauth) {
        // Token segnato come scaduto: testa se è ancora valido con una chiamata reale
        // (a volte invalid_grant è transitorio o il token è stato silenziosamente rinnovato)
        try {
          const tokenStr = EncryptionService.decryptToken(user.googleAuthToken);
          const tokens = JSON.parse(tokenStr);
          const testClient = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );
          testClient.setCredentials(tokens);
          const cal = google.calendar({ version: 'v3', auth: testClient });
          await cal.calendarList.list({ maxResults: 1 });
          // Token ancora valido → ripristino silenzioso
          await db.update(users)
            .set({ googleCalendarEnabled: true, googleNeedsReauth: false } as any)
            .where(eq(users.id, userId));
          logger.info(`✅ [AUTO-RESTORE] Token ancora valido per user ${userId} — sync ripristinata silenziosamente`);
          return res.json({ success: true, method: 'silent' });
        } catch (testErr: any) {
          const msg = String(testErr?.message || testErr);
          logger.warn(`⚠️ [AUTO-RESTORE] Token test fallito per user ${userId}: ${msg}`);
          // Token davvero invalido → serve re-autenticazione OAuth
          return res.json({ success: false, reason: 'needs_oauth' });
        }
      }

      // Token non marcato come scaduto → riabilita silenziosamente
      await db.update(users)
        .set({ googleCalendarEnabled: true })
        .where(eq(users.id, userId));
      logger.debug(`✅ [AUTO-RESTORE] Google Calendar silently re-enabled for user ${userId}`);
      return res.json({ success: true, method: 'silent' });
    }

    // Token sparito → serve nuovo OAuth
    return res.json({ success: false, reason: 'needs_oauth' });
  } catch (error) {
    console.error('❌ [AUTO-RESTORE] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
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
    
    // Verify the callback URL
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
      clientIdPresent: !!process.env.GOOGLE_CLIENT_ID,
      clientSecretPresent: !!process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: redirectUri,
      testAuthUrl: testAuthUrl,
      validScopes: SCOPES
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
  // Build the base authentication URL manually
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
            <p><strong>Note:</strong> This page compares two methods for generating the Google OAuth authorization URL. The manually generated URL does not contain extra parameters that can cause mismatch problems.</p>
          </div>
          
          <h2>Manually generated URL (without extra parameters)</h2>
          <div class="url-box manual">${manualAuthUrl}</div>
          
          <h2>URL generated by the official library</h2>
          <div class="url-box library">${libraryAuthUrl}</div>
          
          <h2>Differences between the two URLs</h2>
          <table>
            <tr>
              <th>Parameter</th>
              <th>Manual URL</th>
              <th>Library URL</th>
              <th>Status</th>
            </tr>
            <tr>
              <td>client_id</td>
              <td>${process.env.GOOGLE_CLIENT_ID}</td>
              <td>${process.env.GOOGLE_CLIENT_ID}</td>
              <td class="success">Identical</td>
            </tr>
            <tr>
              <td>redirect_uri</td>
              <td>${redirectUri}</td>
              <td>${redirectUri}</td>
              <td class="success">Identical</td>
            </tr>
            <tr>
              <td>flowName</td>
              <td>Not present</td>
              <td>${libraryAuthUrl.includes('flowName=') ? 'Present' : 'Not present'}</td>
              <td class="${libraryAuthUrl.includes('flowName=') ? 'warning' : 'success'}">
                ${libraryAuthUrl.includes('flowName=') ? 'Potential error cause' : 'OK'}
              </td>
            </tr>
          </table>
          
          <h2>Authorization test</h2>
          <p>Select one of the methods to test the authorization:</p>
          
          <a href="${manualAuthUrl}" class="button" target="_blank">Test with manual URL</a>
          <a href="${libraryAuthUrl}" class="button" style="margin-left: 10px;" target="_blank">Test with library URL</a>
          
          <div class="note" style="margin-top: 30px;">
            <p><strong>Important:</strong> Remember that the Google Cloud console must have exactly this redirect URI configured:</p>
            <pre>${redirectUri}</pre>
            <p>Also make sure the JavaScript origin is correctly configured with the https scheme:</p>
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
        <title>Fix Error 400 with Google Calendar</title>
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
          <h1>Fix Error 400 (redirect_uri_mismatch) with Google OAuth</h1>
          
          <div class="error">
            <strong>Problem:</strong> Unable to complete Google OAuth authentication due to error 
            <span class="code">redirect_uri_mismatch</span> with <span class="code">flowName=GeneralOAuthFlow</span>.
          </div>
          
          <div class="section">
            <h2>Explanation of the problem</h2>
            <p>This error means that the callback URL the application is sending to Google does not match exactly what is configured in the Google Cloud Console. Even a small difference (like a trailing slash or different uppercase/lowercase) can cause this error.</p>
            
            <p>The app is using the following callback URL:</p>
            <div class="highlight">${redirectUriProduction}</div>
            
            <p>This URL must match <strong>EXACTLY</strong> one of the authorized redirect URIs configured in the Google Cloud Console.</p>
          </div>
          
          <div class="section">
            <h2>Instructions for fixing</h2>
            
            <div class="step">
              <h3>Open the Google Cloud console</h3>
              <p>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank">https://console.cloud.google.com/apis/credentials</a> and sign in with the account associated with the project.</p>
            </div>
            
            <div class="step">
              <h3>Find the correct OAuth credentials</h3>
              <p>In the "Credentials" section, find the OAuth 2.0 client ID you are using for this application.</p>
              <p>Your client ID should be: <span class="code">${process.env.GOOGLE_CLIENT_ID}</span></p>
            </div>
            
            <div class="step">
              <h3>Verify or add the redirect URI</h3>
              <p>Click the client ID to edit it. In the "Authorized redirect URIs" section, verify that exactly the following URL is present:</p>
              <div class="highlight">${redirectUriProduction}</div>
              
              <p>If it is not present or is different (even by a single character):</p>
              <ol>
                <li>Add exactly this URL as an authorized redirect URI</li>
                <li>Make sure there are no spaces or extra characters</li>
                <li>Click "Save" at the bottom of the page</li>
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
            <h2>Common solutions for persistent errors</h2>
            
            <div class="console-section">
              <h3>If error 400 persists:</h3>
              <ul>
                <li>Make sure you are using the same Google account to access the console and to authorize the application</li>
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
            <div id="auth-status">Checking status...</div>
            <button class="button" onclick="checkAuthStatus()">Refresh status</button>
            
            <div class="warning" style="margin-top: 20px;">
              <p><strong>Note:</strong> If the site is publicly inaccessible (<span class="code">DNS_PROBE_FINISHED_NXDOMAIN</span>), the Google Calendar integration will only work when the app is publicly accessible again. This is because Google must be able to reach the callback URL to complete the authorization process.</p>
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

// New local test endpoint for Google Calendar integration
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
          <h1>Local Configuration for Google Calendar</h1>
          
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
            <h2>2. Test local integration</h2>
            <p>Once the redirect URL is added, you can test the integration by clicking the button below:</p>
            <button class="button" onclick="window.open('/api/google-auth/start')">Test Google Authorization</button>
          </div>
          
          <div class="step">
            <h2>3. Verify authorization status</h2>
            <p>Check the current authorization status:</p>
            <div id="auth-status">Checking...</div>
            <button class="button" onclick="checkAuthStatus()">Refresh Status</button>
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
        <title>Google Cloud Configuration Check</title>
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
          <h1>Google OAuth Configuration Check</h1>
          
          <div class="step">
            <h2>1. Configured callback URL</h2>
            <p>The following callback URL must be configured in the Google Cloud Console:</p>
            <div class="highlight">${redirectUri}</div>
          </div>
          
          <div class="step">
            <h2>2. Verify in the Google Cloud Console</h2>
            <p>Open the <a href="${consoleUrl}" target="_blank">Google Cloud console</a> and verify that:</p>
            <ul>
              <li>The client ID is <code>${process.env.GOOGLE_CLIENT_ID}</code></li>
              <li>The following is present in "Authorized redirect URIs" exactly: <code>${redirectUri}</code></li>
            </ul>
          </div>
          
          <div class="note">
            <p><strong>Important note:</strong> If you have recently modified the redirect URIs in the Google Cloud Console, you may need to wait a few minutes (up to 5-10 minutes) for the changes to take effect.</p>
          </div>
          
          <div class="step">
            <h2>3. Error 400 (redirect_uri_mismatch)</h2>
            <p>If you continue to receive this error:</p>
            <ul>
              <li>Make sure the URI is EXACTLY the same as shown above (even a single character difference will cause the error)</li>
              <li>Verify there are no spaces or special characters in the URI</li>
              <li>Try deleting and re-adding the redirect URI in the console</li>
              <li>Make sure you have saved the changes in the Google Cloud console</li>
            </ul>
          </div>
          
          <div class="step">
            <h2>4. Direct verification</h2>
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
        error: 'Missing OAuth credentials. Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Replit secrets.'
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
      message: hasContactsAuth ? 'Google Contacts authorized' : 'Google Contacts authorization required'
    });
  } catch (error) {
    console.error('📇 [CONTACTS STATUS] Error:', error);
    res.status(500).json({ success: false, authorized: false });
  }
});

/**
 * Generate URL to authorize access to Google Contacts (separate from Calendar/Gmail)
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
        <head><title>Google Contacts Authorization Complete</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>✅ Google Contacts Authorization Complete!</h2>
          <p>You can now import contacts from your Google address book.</p>
          <p>This window will close automatically...</p>
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
 * Import selected contacts as clients
 * POST /api/google-auth/contacts/import
 * 
 * SECURITY: Accepts only resourceNames (ID) and importAll flag
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

    // Retrieve the CONTACTS token of the user (separate from Calendar/Gmail)
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

    // Retrieve existing clients to avoid duplicates
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
        
        // Generate client codes (same logic as POST /api/clients)
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
      message: `Imported ${imported} contacts${skipped > 0 ? `, ${skipped} skipped (already existing)` : ''}`
    });

  } catch (error) {
    console.error('Error importing contacts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error importing contacts' 
    });
  }
});

// ============================================================
// GESTIONE ACCOUNT GOOGLE MULTIPLI (account primario + secondari)
// ============================================================

// GET /api/google-auth/accounts — elenco account collegati (primario + secondari)
router.get('/accounts', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;

    const [user] = await db.select({
      email: users.email,
      googleAuthToken: users.googleAuthToken,
      googleCalendarEnabled: users.googleCalendarEnabled,
      googleAccountColor: users.googleAccountColor,
      lastGoogleSyncAt: users.lastGoogleSyncAt,
    }).from(users).where(eq(users.id, userId));

    // Email reale dell'account Google primario (dal token), fallback all'email utente
    let primaryGoogleEmail: string | null = user?.email || null;
    if (user?.googleAuthToken) {
      try {
        const tokens = JSON.parse(EncryptionService.decryptToken(user.googleAuthToken));
        primaryGoogleEmail = extractGoogleEmail(tokens, user.email || null);
      } catch { /* keep fallback */ }
    }

    const secondary = await db.select({
      id: googleAccounts.id,
      email: googleAccounts.email,
      color: googleAccounts.color,
      enabled: googleAccounts.enabled,
      lastSyncAt: googleAccounts.lastSyncAt,
    }).from(googleAccounts).where(eq(googleAccounts.userId, userId));

    res.json({
      primary: {
        email: primaryGoogleEmail,
        color: user?.googleAccountColor || '#4a7c59',
        connected: !!user?.googleAuthToken && !!user?.googleCalendarEnabled,
        lastSyncAt: user?.lastGoogleSyncAt || null,
      },
      secondary,
    });
  } catch (error) {
    console.error('Error listing google accounts:', error);
    res.status(500).json({ error: 'Errore nel recupero degli account Google' });
  }
});

// PATCH /api/google-auth/accounts/primary — aggiorna il colore dell'account primario
router.patch('/accounts/primary', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const color = String(req.body?.color || '').trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      return res.status(400).json({ error: 'Colore non valido (formato #RRGGBB)' });
    }
    await db.update(users).set({ googleAccountColor: color }).where(eq(users.id, userId));
    res.json({ success: true, color });
  } catch (error) {
    console.error('Error updating primary color:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del colore' });
  }
});

// PATCH /api/google-auth/accounts/:id — aggiorna colore e/o stato di un account secondario
router.patch('/accounts/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accountId = parseInt(req.params.id, 10);
    if (Number.isNaN(accountId)) return res.status(400).json({ error: 'ID non valido' });

    // Verifica proprietà (multi-tenant)
    const [acc] = await db.select().from(googleAccounts)
      .where(and(eq(googleAccounts.id, accountId), eq(googleAccounts.userId, userId)));
    if (!acc) return res.status(404).json({ error: 'Account non trovato' });

    const updates: { color?: string; enabled?: boolean } = {};
    if (req.body?.color !== undefined) {
      const color = String(req.body.color).trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
        return res.status(400).json({ error: 'Colore non valido (formato #RRGGBB)' });
      }
      updates.color = color;
    }
    if (req.body?.enabled !== undefined) {
      updates.enabled = !!req.body.enabled;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }

    await db.update(googleAccounts).set(updates)
      .where(and(eq(googleAccounts.id, accountId), eq(googleAccounts.userId, userId)));
    res.json({ success: true, ...updates });
  } catch (error) {
    console.error('Error updating google account:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'account' });
  }
});

// DELETE /api/google-auth/primary — scollega l'account Google primario e rimuove i suoi eventi importati
router.delete('/primary', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;

    // Recupera email primario dal token per sapere quali eventi rimuovere
    const [userData] = await db
      .select({ googleAuthToken: users.googleAuthToken, email: users.email })
      .from(users)
      .where(eq(users.id, userId));

    let primaryEmail: string | null = null;
    if (userData?.googleAuthToken) {
      try {
        const { extractGoogleEmail } = await import('../services/googleCalendarSync');
        primaryEmail = extractGoogleEmail(
          JSON.parse(EncryptionService.decryptToken(userData.googleAuthToken)),
          userData.email || null
        );
      } catch {}
    }

    // Rimuove gli eventi importati da questo account primario
    let removedEvents = 0;
    if (primaryEmail) {
      // Prima elimina i mapping google_calendar_events degli appuntamenti da rimuovere
      const apptIds = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(and(
          eq(appointments.userId, userId),
          eq(appointments.importedFromGoogle, true),
          eq(appointments.sourceGoogleEmail, primaryEmail)
        ));
      if (apptIds.length > 0) {
        const ids = apptIds.map((a) => a.id);
        await db.delete(googleCalendarEvents).where(inArray(googleCalendarEvents.appointmentId, ids));
      }

      const deleted = await db.delete(appointments)
        .where(and(
          eq(appointments.userId, userId),
          eq(appointments.importedFromGoogle, true),
          eq(appointments.sourceGoogleEmail, primaryEmail)
        ))
        .returning({ id: appointments.id });
      removedEvents = deleted.length;
    }

    // Rimuove anche i mapping google_calendar_events rimasti (export records)
    const remainingApptIds = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.userId, userId));
    const remainingIds = new Set(remainingApptIds.map((a) => a.id));
    // Pulisce i mapping orfani (appointment eliminati)
    await db.delete(googleCalendarEvents).where(
      sql`appointment_id NOT IN (SELECT id FROM appointments WHERE user_id = ${userId})`
    );

    // Azzera il token primario e disabilita la sincronizzazione
    await db.update(users)
      .set({
        googleAuthToken: null,
        googleCalendarEnabled: false,
        googleCalendarId: null,
        lastGoogleSyncAt: null,
      })
      .where(eq(users.id, userId));

    console.log(`✅ Primary Google account unlinked for user ${userId} (${primaryEmail}, removed ${removedEvents} imported events)`);
    res.json({ success: true, removedEvents });
  } catch (error) {
    console.error('Error deleting primary google account:', error);
    res.status(500).json({ error: 'Errore nella rimozione dell\'account principale' });
  }
});

// DELETE /api/google-auth/accounts/:id — scollega un account secondario + rimuove i suoi eventi importati
router.delete('/accounts/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accountId = parseInt(req.params.id, 10);
    if (Number.isNaN(accountId)) return res.status(400).json({ error: 'ID non valido' });

    const [acc] = await db.select().from(googleAccounts)
      .where(and(eq(googleAccounts.id, accountId), eq(googleAccounts.userId, userId)));
    if (!acc) return res.status(404).json({ error: 'Account non trovato' });

    // Rimuove gli eventi importati da questo account (sono read-only, provenienti da Google)
    const deleted = await db.delete(appointments)
      .where(and(
        eq(appointments.userId, userId),
        eq(appointments.importedFromGoogle, true),
        eq(appointments.sourceGoogleEmail, acc.email)
      )).returning({ id: appointments.id });

    await db.delete(googleAccounts)
      .where(and(eq(googleAccounts.id, accountId), eq(googleAccounts.userId, userId)));

    console.log(`✅ Secondary Google account unlinked: ${acc.email} (removed ${deleted.length} imported events)`);
    res.json({ success: true, removedEvents: deleted.length });
  } catch (error) {
    console.error('Error deleting google account:', error);
    res.status(500).json({ error: 'Errore nella rimozione dell\'account' });
  }
});

export default router;