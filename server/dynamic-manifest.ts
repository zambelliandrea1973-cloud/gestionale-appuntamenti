/**
 * Manifest.json dinamico che si adatta al proprietario del cliente
 */
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { loadStorageData } from './utils/jsonStorage';
import { servePlayStoreManifest } from './manifest-playstore';

// 📁 Usa funzione centralizzata da utils/jsonStorage.ts

export function serveDynamicManifest(req: Request, res: Response) {
  try {
    console.log('🔍 PWA MANIFEST: Richiesta manifest dinamico');
    console.log('🔍 PWA MANIFEST: URL completo:', req.url);
    console.log('🔍 PWA MANIFEST: Query params:', req.query);
    console.log('🔍 PWA MANIFEST: Headers referer:', req.get('referer'));
    
    // Rileva PWABuilder e altri tool di analisi PWA - servi manifest statico
    const userAgent = req.get('user-agent') || '';
    if (userAgent.toLowerCase().includes('pwabuilder') || 
        userAgent.toLowerCase().includes('lighthouse') ||
        req.query.playstore === '1') {
      console.log('📱 PWA MANIFEST: Rilevato tool PWA (PWABuilder/Lighthouse) - servendo manifest statico');
      return servePlayStoreManifest(req, res);
    }
    
    // FORZA DEBUG PER IDENTIFICARE IL PROBLEMA
    console.error('📱 DEBUG MANIFEST FORZATO: CHIAMATA RICEVUTA');
    
    let ownerUserId = null;
    
    // Metodo 1: Query parameter ownerId (priorità massima)
    const ownerIdQuery = req.query.ownerId;
    if (ownerIdQuery) {
      ownerUserId = parseInt(ownerIdQuery as string);
      console.log(`📱 PWA MANIFEST: Owner ID da query param: ${ownerUserId}`);
    }
    
    // Metodo 1b: Estrai ownerId dal clientToken nei query params (PROF_XXX_...)
    if (!ownerUserId && req.query.clientToken) {
      const clientToken = req.query.clientToken as string;
      const tokenMatch = clientToken.match(/^PROF_(\d{2,3})_/);
      if (tokenMatch) {
        ownerUserId = parseInt(tokenMatch[1]);
        console.log(`📱 PWA MANIFEST: Owner ID estratto da clientToken: ${ownerUserId}`);
      }
    }
    
    // Metodo 2: Analizza referer per token QR
    if (!ownerUserId) {
      const referer = req.get('referer') || '';
      console.log(`🔍 PWA MANIFEST: Referer: ${referer}`);
      
      // Cerca pattern /client/PROF_XXX_... nel referer (supporta TUTTI i formati)
      // Formato NUOVO: PROF_042_C00166
      // Formato VECCHIO: PROF_014_9C1F_CLIENT_1750163505034_340F
      const pathTokenMatch = referer.match(/\/client\/(PROF_\d{2,3}_[^/?#\s]+)/);
      if (pathTokenMatch) {
        const token = pathTokenMatch[1];
        // Estrai ownerId dal token (primi 2-3 digit dopo PROF_)
        const ownerIdMatch = token.match(/^PROF_(\d{2,3})_/);
        if (ownerIdMatch) {
          ownerUserId = parseInt(ownerIdMatch[1]);
          console.log(`📱 PWA MANIFEST: Trovato ownerId ${ownerUserId} da token nel path: ${token}`);
        }
      }
      
      // Fallback: cerca token nei query params del referer
      if (!ownerUserId) {
        const tokenMatch = referer.match(/token=([^&]+)/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          const ownerIdMatch = token.match(/^PROF_(\d{2,3})_/);
          if (ownerIdMatch) {
            ownerUserId = parseInt(ownerIdMatch[1]);
            console.log(`📱 PWA MANIFEST: Trovato ownerId ${ownerUserId} da token QR nei params`);
          }
        }
      }
    }
    
    // Metodo 3: Header personalizzato
    if (!ownerUserId) {
      const ownerIdHeader = req.get('x-owner-id');
      if (ownerIdHeader) {
        ownerUserId = parseInt(ownerIdHeader);
        console.log(`📱 PWA MANIFEST: Owner ID da header: ${ownerUserId}`);
      }
    }
    
    // Metodo 4: Sessione utente loggato (ADMIN che installa PWA)
    if (!ownerUserId && req.user) {
      ownerUserId = (req.user as any).id;
      console.log(`📱 PWA MANIFEST: Owner ID da sessione utente loggato: ${ownerUserId}`);
    }
    
    // Metodo 5: Query param userId (usato dal ManifestInjector)
    if (!ownerUserId && req.query.userId) {
      ownerUserId = parseInt(req.query.userId as string);
      console.log(`📱 PWA MANIFEST: Owner ID da query userId: ${ownerUserId}`);
    }
    
    // Crea manifest dinamico con start_url che preserva il contesto del cliente
    const storageData = loadStorageData();
    const ownerName = ownerUserId && storageData.userContactInfo?.[ownerUserId]?.businessName || 'Gestionale Appuntamenti';
    
    // Forza aggiornamento completo del manifest per Android PWA
    const manifestVersion = `${Date.now()}-${ownerUserId || 'default'}`;
    console.log(`🔄 MANIFEST: Versione aggiornata: ${manifestVersion}`);
    
    // Determina se siamo in area admin o area cliente
    const referer = req.get('referer') || '';
    const isClientArea = referer.includes('/client/') || !!req.query.clientToken;
    const isAdminArea = req.user && !isClientArea;
    
    console.log(`🔍 PWA MANIFEST: Referer: ${referer}, isClientArea: ${isClientArea}, isAdminArea: ${isAdminArea}`);
    
    // Determina start_url in base al contesto
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
      console.log(`📱 PWA MANIFEST: Start URL area cliente: ${startUrl}`);
    } else if (isAdminArea) {
      startUrl = "/";
      console.log(`📱 PWA MANIFEST: Start URL area admin: ${startUrl}`);
    }
    
    const professionalName = ownerName;
    
    let baseManifest;
    if (isAdminArea) {
      baseManifest = {
        "name": `${professionalName} - Dashboard Professionale`,
        "short_name": professionalName,
        "description": `Dashboard completa per gestione clienti, appuntamenti e servizi - ${professionalName}`,
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
        "name": `${professionalName} - Area Cliente`,
        "short_name": `${professionalName}`, 
        "description": `Accedi alla tua area personale - ${professionalName}`,
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
        "id": ownerUserId ? `area-cliente-${ownerUserId}` : `area-cliente-generic`,
        "version": manifestVersion
      };
    }
    
    // SOLUZIONE ANDROID: Usa proxy per icone con headers anti-cache
    const iconTimestamp = Date.now() + Math.random();
    const iconBaseUrl = `/pwa-icon`;
    const iconParams = `?owner=${ownerUserId || 'default'}&v=${iconTimestamp}&android=1`;
    
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
          "name": "Area Cliente",
          "url": "/client-area",
          "description": "Accedi alla tua area personale",
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
    
    console.log(`📱 MANIFEST DINAMICO: Servendo manifest per ${professionalName} (owner ${ownerUserId || 'default'})`);
    console.log(`📱 MANIFEST ICONE: ${JSON.stringify(manifest.icons.map(i => i.src))}`);
    console.log(`📱 MANIFEST ID: ${manifest.id}`);
    console.log(`📱 MANIFEST NAME: ${manifest.name}`);
    res.json(manifest);
    
  } catch (error) {
    console.error('Errore nel servire manifest dinamico:', error);
    // Fallback al manifest statico
    const staticManifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    if (fs.existsSync(staticManifestPath)) {
      res.sendFile(staticManifestPath);
    } else {
      res.status(500).json({ error: 'Manifest non disponibile' });
    }
  }
}