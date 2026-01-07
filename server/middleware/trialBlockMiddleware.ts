import { Request, Response, NextFunction } from 'express';
import { licenseService } from '../services/licenseService';

/**
 * Middleware che blocca l'accesso se la licenza trial è scaduta
 * 
 * LOGICA:
 * 1. Se l'utente NON è autenticato → Passa (non bloccare, gestito da altri middleware)
 * 2. Se l'utente è ADMIN/PASSEPARTOUT → Passa sempre (accesso illimitato)
 * 3. Se l'utente è STAFF con licenza 10 anni → Passa sempre
 * 4. Se l'utente è CUSTOMER:
 *    - Controlla se ha abbonamento attivo → Passa
 *    - Controlla se trial è scaduto → BLOCCA (eccetto /subscribe, /logout, /api/payments)
 * 
 * IMPORTANTE: Mantiene tutti i dati, blocca solo l'accesso alle pagine
 */
export async function checkTrialExpired(req: Request, res: Response, next: NextFunction) {
  try {
    // Se l'utente non è autenticato, lascia passare (altri middleware lo gestiranno)
    if (!req.isAuthenticated() || !req.user) {
      return next();
    }

    const user = req.user as any;
    const userId = user.id;
    const userType = user.type;
    const userRole = user.role;

    console.log(`🔒 [TRIAL CHECK] User ${userId} (${userType}/${userRole}) accessing ${req.path}`);

    // Admin e passepartout hanno sempre accesso
    if (userType === 'admin' || userRole === 'admin') {
      return next();
    }

    // Staff ha sempre accesso (hanno licenza 10 anni)
    if (userType === 'staff') {
      return next();
    }

    // Per utenti customer, controlliamo lo stato della licenza
    if (userType === 'customer') {
      // Ottieni info licenza dell'utente
      const licenseInfo = await licenseService.getCurrentLicenseInfo(userId);
      
      console.log(`🔒 [TRIAL CHECK] License info:`, {
        type: licenseInfo.type,
        expiresAt: licenseInfo.expiresAt,
        now: new Date().toISOString()
      });

      // Se la licenza non ha scadenza (passepartout), passa sempre
      if (!licenseInfo.expiresAt) {
        console.log(`🔒 [TRIAL CHECK] No expiry date, allowing access`);
        return next();
      }

      // Controlla se la licenza è scaduta
      const isExpired = new Date(licenseInfo.expiresAt) < new Date();
      
      console.log(`🔒 [TRIAL CHECK] Is expired?`, isExpired, `Type:`, licenseInfo.type);

      if (isExpired && licenseInfo.type === 'trial') {
        // TRIAL SCADUTO: blocca l'accesso eccetto alcune route
        
        // Route consentite anche con trial scaduto
        const allowedPaths = [
          '/subscribe',           // Pagina abbonamenti
          '/payment/success',     // Callback successo PayPal/Stripe
          '/payment/cancel',      // Callback annullamento PayPal/Stripe
          '/api/payments',        // API pagamenti (per sottoscrivere)
          '/api/logout',          // Logout
          '/api/user-with-license', // Info utente
          '/api/payments/plans',    // Lista piani
          '/api/payments/subscription', // Info abbonamento
          '/api/payments/stripe/create-checkout-session', // Stripe checkout
          '/api/payments/paypal/subscribe', // PayPal checkout
          '/api/timezone-settings',  // Fuso orario
          '/api/tenant-context',     // Contesto tenant
          '/api/client-app-info',    // Info app
          '/api/company-name-settings', // Impostazioni azienda
          '/api/contact-info',       // Info contatto
          '/manifest-admin.json',    // PWA manifest
          '/icon-proxy',             // Icone PWA
          '/pwa-icon',               // Icone PWA alternative
          '/api/license',            // API licenze (per mostrare info scadenza)
          // Risorse statiche necessarie per caricare /subscribe
          '/@vite',                  // Vite HMR
          '/src/',                   // File sorgente React
          '/assets/',                // Asset compilati
          '/forced-style.css',       // CSS forzato
          '/disable-vite-overlay.js', // Script Vite
          '/service-worker.js',      // Service Worker
          '/@react-refresh',         // React Fast Refresh
          '/node_modules',           // Moduli node (per dev)
          '/@fs',                    // File system virtuale Vite
        ];

        const isAllowed = allowedPaths.some(path => req.path.startsWith(path));

        if (!isAllowed) {
          console.log(`🔒 [TRIAL EXPIRED] BLOCKING access to ${req.path}`);
          // Se è una richiesta API, restituisci errore JSON
          if (req.path.startsWith('/api/')) {
            return res.status(403).json({
              success: false,
              error: 'trial_expired',
              message: 'Il periodo di prova di 40 giorni è terminato. Sottoscrivi un abbonamento per continuare.',
              redirectTo: '/subscribe'
            });
          }

          // Se è una pagina HTML, redirect a /subscribe
          return res.redirect('/subscribe?expired=true');
        } else {
          console.log(`✅ [TRIAL EXPIRED] ALLOWING access to ${req.path} (whitelisted)`);
        }
      }
    }

    // Se arriviamo qui, l'accesso è consentito
    next();
  } catch (error) {
    console.error('Errore nel middleware trial expired:', error);
    // In caso di errore, lascia passare per non bloccare l'app
    next();
  }
}
