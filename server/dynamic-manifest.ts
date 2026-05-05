/**
 * Dynamic manifest.json that adapts to the client owner
 */
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { loadStorageData } from './utils/jsonStorage';
import { servePlayStoreManifest } from './manifest-playstore';

// 📁 Usa funzione centralizzata da utils/jsonStorage.ts

export function serveDynamicManifest(req: Request, res: Response) {
  try {
    console.log('🔍 PWA MANIFEST: Dynamic manifest requested');
    console.log('🔍 PWA MANIFEST: Full URL:', req.url);
    console.log('🔍 PWA MANIFEST: Query params:', req.query);
    console.log('🔍 PWA MANIFEST: Headers referer:', req.get('referer'));
    
    // Detect PWABuilder e altri tool di analisi PWA - servi manifest statico
    const userAgent = req.get('user-agent') || '';
    if (userAgent.toLowerCase().includes('pwabuilder') || 
        userAgent.toLowerCase().includes('lighthouse') ||
        req.query.playstore === '1') {
      console.log('📱 PWA MANIFEST: PWA tool detected (PWABuilder/Lighthouse) - serving static manifest');
      return servePlayStoreManifest(req, res);
    }
    
    // FORZA DEBUG PER IDENTIFICARE IL PROBLEMA
    console.error('📱 DEBUG MANIFEST FORCED: CALL RECEIVED');
    
    let ownerUserId = null;
    
    // Method 1: Query parameter ownerId (highest priority)
    const ownerIdQuery = req.query.ownerId;
    if (ownerIdQuery) {
      ownerUserId = parseInt(ownerIdQuery as string);
      console.log(`📱 PWA MANIFEST: Owner ID from query param: ${ownerUserId}`);
    }
    
    // Method 1b: Extract ownerId from clientToken in query params (PROF_XXX_...)
    if (!ownerUserId && req.query.clientToken) {
      const clientToken = req.query.clientToken as string;
      const tokenMatch = clientToken.match(/^PROF_(\d{2,3})_/);
      if (tokenMatch) {
        ownerUserId = parseInt(tokenMatch[1]);
        console.log(`📱 PWA MANIFEST: Owner ID extracted from clientToken: ${ownerUserId}`);
      }
    }
    
    // Method 2: Analyze referer for QR token
    if (!ownerUserId) {
      const referer = req.get('referer') || '';
      console.log(`🔍 PWA MANIFEST: Referer: ${referer}`);
      
      // Search for /client/PROF_XXX_... pattern in referer (supports ALL formats)
      // NEW format: PROF_042_C00166
      // Format VECCHIO: PROF_014_9C1F_CLIENT_1750163505034_340F
      const pathTokenMatch = referer.match(/\/client\/(PROF_\d{2,3}_[^/?#\s]+)/);
      if (pathTokenMatch) {
        const token = pathTokenMatch[1];
        // Extract ownerId from token (first 2-3 digits after PROF_)
        const ownerIdMatch = token.match(/^PROF_(\d{2,3})_/);
        if (ownerIdMatch) {
          ownerUserId = parseInt(ownerIdMatch[1]);
          console.log(`📱 PWA MANIFEST: Found ownerId ${ownerUserId} from token in path: ${token}`);
        }
      }
      
      // Fallback: search for token in referer query params
      if (!ownerUserId) {
        const tokenMatch = referer.match(/token=([^&]+)/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          const ownerIdMatch = token.match(/^PROF_(\d{2,3})_/);
          if (ownerIdMatch) {
            ownerUserId = parseInt(ownerIdMatch[1]);
            console.log(`📱 PWA MANIFEST: Found ownerId ${ownerUserId} from QR token in params`);
          }
        }
      }
    }
    
    // Metodo 3: Header personalizzato
    if (!ownerUserId) {
      const ownerIdHeader = req.get('x-owner-id');
      if (ownerIdHeader) {
        ownerUserId = parseInt(ownerIdHeader);
        console.log(`📱 PWA MANIFEST: Owner ID from header: ${ownerUserId}`);
      }
    }
    
    // Method 4: Logged-in user session (ADMIN installing PWA)
    if (!ownerUserId && req.user) {
      ownerUserId = (req.user as any).id;
      console.log(`📱 PWA MANIFEST: Owner ID from logged-in user session: ${ownerUserId}`);
    }
    
    // Method 5: Query param userId (used by ManifestInjector)
    if (!ownerUserId && req.query.userId) {
      ownerUserId = parseInt(req.query.userId as string);
      console.log(`📱 PWA MANIFEST: Owner ID from query userId: ${ownerUserId}`);
    }
    
    // Create dynamic manifest with start_url that preserves client context
    const storageData = loadStorageData();
    const ownerName = ownerUserId && storageData.userContactInfo?.[ownerUserId]?.businessName || 'Gestionale Appuntamenti';
    
    // Force complete manifest update for Android PWA
    const manifestVersion = `${Date.now()}-${ownerUserId || 'default'}`;
    console.log(`🔄 MANIFEST: Version updated: ${manifestVersion}`);
    
    // Determine if we are in admin area or client area
    const referer = req.get('referer') || '';
    const isClientArea = referer.includes('/client/') || !!req.query.clientToken;
    const isAdminArea = req.user && !isClientArea;
    
    console.log(`🔍 PWA MANIFEST: Referer: ${referer}, isClientArea: ${isClientArea}, isAdminArea: ${isAdminArea}`);
    
    // Determine start_url in base al contesto
    let startUrl = "/";
    
    if (isClientArea) {
      if (req.query.clientToken) {
        startUrl = `/client/${req.query.clientToken}`;
      } else {
        const clientPathMatch = referer.match(/(\/client\/[^?#\s]+)/);
        if (clientPathMatch) {
          startUrl = clientPathMatch[1];
        }
      }
      console.log(`📱 PWA MANIFEST: Start URL client area: ${startUrl}`);
    } else if (isAdminArea) {
      startUrl = "/";
      console.log(`📱 PWA MANIFEST: Start URL area admin: ${startUrl}`);
    }
    
    const professionalName = ownerName;
    
    let baseManifest;
    if (isAdminArea) {
      baseManifest = {
        "name": `${professionalName} - Professional Dashboard`,
        "short_name": professionalName,
        "description": `Complete dashboard for client, appointment, and service management - ${professionalName}`,
        "start_url": "/",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#006400",
        "orientation": "any",
        "categories": ["business", "healthcare", "productivity"],
        "lang": "it-IT",
        "dir": "ltr",
        "prefer_related_applications": false,
        "scope": "/",
        "id": ownerUserId ? `gestionale-appuntamenti-admin-${ownerUserId}` : `gestionale-appuntamenti-admin-generic`,
        "version": manifestVersion
      };
    } else {
      baseManifest = {
        "name": `${professionalName} - Client Area`,
        "short_name": `${professionalName}`, 
        "description": `Access your personal area - ${professionalName}`,
        "start_url": startUrl,
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#006400",
        "orientation": "any",
        "categories": ["healthcare", "business"],
        "lang": "it-IT",
        "dir": "ltr",
        "prefer_related_applications": false,
        "scope": "/client/",
        "id": ownerUserId ? `client-area-${ownerUserId}` : `client-area-generic`,
        "version": manifestVersion
      };
    }
    
    // SOLUTION: If we have a specific owner, do NOT include icons in the manifest
    // This prevents Chrome from storing default icons in the "Open in app" prompt
    // The ManifestInjector will add the correct manifest with custom icons
    if (!ownerUserId) {
      console.log('📱 DYNAMIC MANIFEST: No owner detected, serving manifest WITHOUT icons (ManifestInjector will handle)');
      const minimalManifest = {
        ...baseManifest,
        "icons": []
      };
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      return res.json(minimalManifest);
    }
    
    const iconTimestamp = Date.now() + Math.random();
    const iconBaseUrl = `/pwa-icon`;
    const iconParams = `?owner=${ownerUserId}&v=${iconTimestamp}&android=1`;
    
    const manifest = {
      ...baseManifest,
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
          "name": "Client Area",
          "url": "/client-area",
          "description": "Access your personal area",
          "icons": [
            {
              "src": `${iconBaseUrl}/96x96${iconParams}`,
              "sizes": "96x96",
              "type": "image/png"
            }
          ]
        }
      ],
      "screenshots": [
        {
          "src": `${iconBaseUrl}/512x512${iconParams}`,
          "sizes": "512x512",
          "type": "image/png",
          "form_factor": "wide"
        }
      ]
    };
    
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    console.log(`📱 DYNAMIC MANIFEST: Serving manifest for ${professionalName} (owner ${ownerUserId || 'default'})`);
    console.log(`📱 MANIFEST ICONS: ${JSON.stringify(manifest.icons.map(i => i.src))}`);
    console.log(`📱 MANIFEST ID: ${manifest.id}`);
    console.log(`📱 MANIFEST NAME: ${manifest.name}`);
    res.json(manifest);
    
  } catch (error) {
    console.error('Error serving dynamic manifest:', error);
    // Fallback al manifest statico
    const staticManifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    if (fs.existsSync(staticManifestPath)) {
      res.sendFile(staticManifestPath);
    } else {
      res.status(500).json({ error: 'Manifest not available' });
    }
  }
}