/**
 * Dynamic manifest.json for administration area
 * Serves the custom icon for the logged-in professional
 */
import { Request, Response } from 'express';

export async function serveAdminManifest(req: Request, res: Response) {
  try {
    console.log('🔍 ADMIN MANIFEST: Admin area manifest requested');
    console.log('🔍 ADMIN MANIFEST: Logged user:', req.user ? `ID ${(req.user as any).id}` : 'NONE');
    console.log('🔍 ADMIN MANIFEST: Query params:', req.query);
    
    // MULTI-LAYER STRATEGY to identify the user:
    // 1. Query param userId (HIGH priority - used during PWA installation without cookie)
    // 2. req.user session (fallback if there is an active session)
    // 3. Default (if none of the above)
    
    let userId: number | string = 'default';
    let userName = 'Gestionale Appuntamenti';
    
    // Priority 1: Query parameter userId
    if (req.query.userId) {
      userId = parseInt(req.query.userId as string);
      // Load username from database if needed (optional for now)
      userName = 'Professional';
      console.log(`📱 ADMIN MANIFEST: UserId from query param: ${userId}`);
    }
    // Priority 2: Active session
    else if (req.user) {
      userId = (req.user as any).id;
      userName = (req.user as any).businessName || (req.user as any).name || 'Professional';
      console.log(`📱 ADMIN MANIFEST: Generating manifest for ${userName} (ID: ${userId})`);
    } 
    // Priority 3: Default
    else {
      console.log(`📱 ADMIN MANIFEST: No userId, serving manifest with default icon`);
    }
    
    // Manifest version based on userId + timestamp for cache busting
    const manifestVersion = `${userId}-${Date.now()}`;
    
    // Build icon URLs with dynamic proxy
    const iconTimestamp = Date.now() + Math.random();
    const iconBaseUrl = `/pwa-icon`;
    const iconParams = `?owner=${userId}&v=${iconTimestamp}&admin=1`;
    
    // Dynamic ID only if logged in, otherwise generic
    const manifestId = req.user 
      ? `gestionale-appuntamenti-admin-${userId}`
      : `gestionale-appuntamenti-admin-generic`;
    
    const manifest = {
      "name": req.user 
        ? `${userName} - Professional Dashboard` 
        : "Gestionale Appuntamenti - Professional Dashboard",
      "short_name": "Gestionale",
      "description": `Complete dashboard for client, appointment, and medical service management${req.user ? ' - ' + userName : ''}`,
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#006400",
      "orientation": "any",
      "scope": "/",
      "id": manifestId,
      "lang": "it-IT",
      "dir": "ltr",
      "prefer_related_applications": false,
      "categories": ["business", "healthcare", "productivity"],
      "version": manifestVersion,
      "icons": [
        {
          "src": `${iconBaseUrl}/96x96${iconParams}`,
          "sizes": "96x96",
          "type": "image/png",
          "purpose": "any"
        },
        {
          "src": `${iconBaseUrl}/192x192${iconParams}`,
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "any maskable"
        },
        {
          "src": `${iconBaseUrl}/512x512${iconParams}`,
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "any maskable"
        }
      ],
      "shortcuts": [
        {
          "name": "Calendar",
          "url": "/calendario",
          "description": "View appointments in the calendar",
          "icons": [
            {
              "src": `${iconBaseUrl}/96x96${iconParams}`,
              "sizes": "96x96",
              "type": "image/png"
            }
          ]
        },
        {
          "name": "Clients",
          "url": "/clients",
          "description": "Manage your clients",
          "icons": [
            {
              "src": `${iconBaseUrl}/96x96${iconParams}`,
              "sizes": "96x96",
              "type": "image/png"
            }
          ]
        },
        {
          "name": "Notifications",
          "url": "/notifiche",
          "description": "View your notifications",
          "icons": [
            {
              "src": `${iconBaseUrl}/96x96${iconParams}`,
              "sizes": "96x96",
              "type": "image/png"
            }
          ]
        }
      ]
    };
    
    // Anti-cache headers to force update
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Manifest-User-Id': userId.toString(),
      'X-Manifest-Version': manifestVersion
    });
    
    console.log(`✅ ADMIN MANIFEST: Serving manifest for ${userName} (ID: ${userId})`);
    console.log(`📱 ADMIN MANIFEST ID: ${manifest.id}`);
    console.log(`📱 ADMIN MANIFEST ICONS: ${JSON.stringify(manifest.icons.map(i => i.src))}`);
    
    res.json(manifest);
    
  } catch (error) {
    console.error('❌ ADMIN MANIFEST: Error during generation:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Unable to generate PWA manifest' 
    });
  }
}
