/**
 * Manifest statico per Google Play Store (TWA/PWABuilder)
 * This manifest is generic and does not change for different users
 */
import { Request, Response } from 'express';

export function servePlayStoreManifest(req: Request, res: Response) {
  console.log('📱 PLAY STORE MANIFEST: Request received from PWABuilder');
  
  const manifest = {
    "name": "Gestionale Appuntamenti",
    "short_name": "Client Area",
    "description": "Access your personal area. Book appointments, view documents, and stay in touch with your trusted professional.",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#006400",
    "orientation": "portrait",
    "categories": ["healthcare"],
    "lang": "it-IT",
    "dir": "ltr",
    "prefer_related_applications": false,
    "scope": "/",
    "id": "com.gestionale.appuntamenti",
    "icons": [
      {
        "src": "/icons/icon-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": "/icons/icon-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "maskable"
      },
      {
        "src": "/icons/icon-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": "/icons/icon-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "maskable"
      }
    ],
    "screenshots": [
      {
        "src": "/icons/icon-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "form_factor": "narrow",
        "label": "Client area dashboard"
      }
    ]
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 ora di cache
  res.json(manifest);
}
