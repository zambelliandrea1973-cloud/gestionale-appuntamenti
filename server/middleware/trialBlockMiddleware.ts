import { Request, Response, NextFunction } from 'express';
import { licenseService } from '../services/licenseService';

/**
 * Middleware that blocks access if the trial license has expired
 * 
 * LOGICA:
 * 1. If the user is NOT authenticated → Pass (do not block, handled by other middleware)
 * 2. If the user is ADMIN/PASSEPARTOUT → Always pass (unlimited access)
 * 3. If the user is STAFF with 10-year license → Always pass
 * 4. If the user is CUSTOMER:
 *    - Check if user has active subscription → Pass
 *    - Check if trial has expired → BLOCK (except /subscribe, /logout, /api/payments)
 * 
 * IMPORTANT: Keeps all data, only blocks access to pages
 */
export async function checkTrialExpired(req: Request, res: Response, next: NextFunction) {
  try {
    // If the user is not authenticated, let through (other middleware will handle it)
    if (!req.isAuthenticated() || !req.user) {
      return next();
    }

    const user = req.user as any;
    const userId = user.id;
    const userType = user.type;
    const userRole = user.role;


    // Admin and passepartout always have access
    if (userType === 'admin' || userRole === 'admin') {
      return next();
    }

    // Staff always have access (they have 10-year license)
    if (userType === 'staff') {
      return next();
    }

    // For customer users, check the license status
    if (userType === 'customer') {
      // Get info license of the user
      const licenseInfo = await licenseService.getCurrentLicenseInfo(userId);
      

      if (!licenseInfo.expiresAt) {
        return next();
      }

      const isExpired = new Date(licenseInfo.expiresAt) < new Date();

      if (isExpired && licenseInfo.type === 'trial') {
        // EXPIRED TRIAL: blocks access except for some routes
        
        // Routes allowed even with expired trial
        const allowedPaths = [
          '/subscribe',           // Subscriptions page
          '/payment/success',     // PayPal/Stripe success callback
          '/payment/cancel',      // PayPal/Stripe cancellation callback
          '/api/payments',        // Payments API (for subscribing)
          '/api/logout',          // Logout
          '/api/user-with-license', // User info
          '/api/payments/plans',    // Plans list
          '/api/payments/subscription', // Subscription info
          '/api/payments/stripe/create-checkout-session', // Stripe checkout
          '/api/payments/paypal/subscribe', // PayPal checkout
          '/api/payments/paypal/capture', // PayPal order capture
          '/api/payments/paypal/confirm-order', // PayPal order confirmation
          '/api/payments/paypal/finalize', // PayPal public finalization
          '/api/timezone-settings',  // Timezone settings
          '/api/tenant-context',     // Tenant context
          '/api/client-app-info',    // App info
          '/api/company-name-settings', // Company settings
          '/api/contact-info',       // Contact info
          '/api/forgot-password',    // Password recovery (available to all)
          '/api/reset-password',     // Reset password with token
          '/api/verify-reset-token', // Reset token verification
          '/api/register',           // New user registration
          '/manifest-admin.json',    // PWA manifest
          '/icon-proxy',             // PWA icons
          '/pwa-icon',               // Alternative PWA icons
          '/api/license',            // License API (to show expiry info)
          '/@vite',                  // Vite HMR
          '/src/',                   // React source files
          '/assets/',                // Compiled assets
          '/forced-style.css',       // Forced CSS
          '/disable-vite-overlay.js', // Vite script
          '/service-worker.js',      // Service Worker
          '/@react-refresh',         // React Fast Refresh
          '/node_modules',           // Node modules (for dev)
          '/@fs',                    // Vite virtual file system
        ];

        const isAllowed = allowedPaths.some(path => req.path.startsWith(path));

        if (!isAllowed) {
          // If it is a required API, return JSON error
          if (req.path.startsWith('/api/')) {
            return res.status(403).json({
              success: false,
              error: 'trial_expired',
              message: 'The 40-day trial period has ended. Please subscribe to continue.',
              redirectTo: '/subscribe'
            });
          }

          // If it is an HTML page, redirect to /subscribe
          return res.redirect('/subscribe?expired=true');
        }
      }
    }

    // If we get here, access is allowed
    next();
  } catch (error) {
    console.error('Error in trial expired middleware:', error);
    // In case of error, let it pass to not block the app
    next();
  }
}
