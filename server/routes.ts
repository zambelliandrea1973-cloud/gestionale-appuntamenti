import { registerSimpleRoutes } from "./simple-routes";
import type { Express } from "express";
import { createServer, type Server } from "http";
import path from 'path';

import { serveDynamicManifest } from './dynamic-manifest'
import { serveCustomIcon } from './icon-proxy'
import { serveAdminManifest } from './admin-manifest'
import { servePlayStoreManifest } from './manifest-playstore'

export function registerRoutes(app: Express): Server {

  app.get('/favicon.ico', async (req, res) => {
    res.set('Cache-Control', 'private, no-cache, must-revalidate');
    res.set('Vary', 'Cookie');
    try {
      let ownerId: number | null = null;
      if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        ownerId = req.user.id;
      }
      if (ownerId) {
        req.params = { size: '32x32' };
        (req.query as any).owner = ownerId.toString();
        return serveCustomIcon(req, res);
      }
    } catch (e) {}
    const iconPath = path.join(process.cwd(), 'public', 'icons', 'icon-96x96.png');
    res.sendFile(iconPath);
  });

  // Android App Links - Digital Asset Links per verifica dominio Google Play
  app.get('/.well-known/assetlinks.json', (req, res) => {
    const assetLinks = [
      {
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
          "namespace": "android_app",
          "package_name": "com.gestionale.appuntamenti",
          "sha256_cert_fingerprints": [
            "3D:08:5E:75:41:F2:81:E8:1A:05:24:77:3F:B7:16:C6:1B:A0:74:9E:F9:6C:5B:60:B5:30:3D:92:A7:5E:8B:5A"
          ]
        }
      },
      {
        "relation": [
          "delegate_permission/common.handle_all_urls",
          "delegate_permission/common.get_login_creds"
        ],
        "target": {
          "namespace": "android_app",
          "package_name": "app.sliplane.gestionale_appuntamenti.twa",
          "sha256_cert_fingerprints": [
            "3D:08:5E:75:41:F2:81:E8:1A:05:24:77:3F:B7:16:C6:1B:A0:74:9E:F9:6C:5B:60:B5:30:3D:92:A7:5E:8B:5A"
          ]
        }
      }
    ];
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json(assetLinks);
  });

  // Route proxy per icone PWA ottimizzate per Android
  app.get('/pwa-icon/:size', serveCustomIcon);
  
  // Route per manifest STATICO Google Play Store (per PWABuilder/TWA)
  app.get('/manifest-playstore.json', servePlayStoreManifest);
  
  // Route per il manifest ADMIN (gestionale professionista) - DINAMICO con autenticazione
  app.get('/manifest-admin.json', serveAdminManifest);
  
  // Route per il manifest dinamico PWA (clienti)
  app.get('/manifest.json', serveDynamicManifest);
  
  // LEGACY: Manifest handler inline (RIMOSSO - sostituito con dynamic-manifest.ts)
  app.get('/manifest-legacy.json', (req, res) => {
    console.log('🔍 ROUTES MANIFEST: Handler dinamico chiamato');
    console.log('🔍 ROUTES MANIFEST: URL:', req.url);
    console.log('🔍 ROUTES MANIFEST: Query:', req.query);
    
    // Determina start_url basato su token cliente
    let startUrl = "/client";
    const clientToken = req.query.clientToken;
    const referer = req.get('referer') || '';
    
    if (clientToken) {
      startUrl = `/client/${clientToken}`;
      console.log(`📱 MANIFEST: Start URL da query token: ${startUrl}`);
    } else if (referer.includes('/client/')) {
      const clientPathMatch = referer.match(/(\/client\/[^?#\s]+)/);
      if (clientPathMatch) {
        startUrl = clientPathMatch[1];
        console.log(`📱 MANIFEST: Start URL da referer: ${startUrl}`);
      }
    } else {
      // Default per Bruna (utente principale)
      startUrl = "/client/PROF_014_9C1F_CLIENT_1750163505034_340F";
      console.log(`📱 MANIFEST: Start URL default per Bruna: ${startUrl}`);
    }
    
    // Determina il proprietario dal percorso per icona dinamica
    let ownerUserId = 14; // Default Silvia
    if (startUrl.includes('CLIENT_')) {
      const ownerMatch = startUrl.match(/PROF_(\d+)_/);
      if (ownerMatch) {
        ownerUserId = parseInt(ownerMatch[1]);
      }
    }
    
    const manifest = {
      "name": "Silvia Busnari - Area Cliente",
      "short_name": "Area Cliente",
      "description": "Gestione consensi e servizi medici",
      "start_url": startUrl,
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#4f46e5",
      "orientation": "any",
      "scope": "/",
      "id": "gestione-appuntamenti-client-v4",
      "icons": [
        {
          "src": `/icons/owner-${ownerUserId}-icon-192x192.png`,
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "any maskable"
        },
        {
          "src": `/icons/owner-${ownerUserId}-icon-512x512.png`,
          "sizes": "512x512",
          "type": "image/png", 
          "purpose": "any maskable"
        }
      ]
    };
    
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    
    console.log(`📱 MANIFEST LEGACY: Servendo con start_url: ${startUrl}`);
    res.json(manifest);
  });

  return registerSimpleRoutes(app);
}