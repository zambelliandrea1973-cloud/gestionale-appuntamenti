/**
 * Manifest.json dinamico che si adatta al proprietario del cliente
 */
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

function loadStorageData() {
  const storageFile = path.join(process.cwd(), 'storage_data.json');
  if (fs.existsSync(storageFile)) {
    const data = fs.readFileSync(storageFile, 'utf8');
    return JSON.parse(data);
  }
  return {};
}

export function serveDynamicManifest(req: Request, res: Response) {
  try {
    console.log('🔍 PWA MANIFEST: Richiesta manifest dinamico');
    
    let ownerUserId = null;
    
    // Metodo 1: Query parameter ownerId (priorità massima)
    const ownerIdQuery = req.query.ownerId;
    if (ownerIdQuery) {
      ownerUserId = parseInt(ownerIdQuery as string);
      console.log(`📱 PWA MANIFEST: Owner ID da query param: ${ownerUserId}`);
    }
    
    // Metodo 2: Analizza referer per token QR
    if (!ownerUserId) {
      const referer = req.get('referer') || '';
      console.log(`🔍 PWA MANIFEST: Referer: ${referer}`);
      
      // Cerca pattern /client/PROF_XXX_ nel referer  
      const pathTokenMatch = referer.match(/\/client\/(PROF_\d+_[A-F0-9]+_CLIENT_\d+_[A-F0-9]+_[a-f0-9]+)/);
      if (pathTokenMatch) {
        const token = pathTokenMatch[1];
        const tokenParts = token.split('_');
        if (tokenParts.length >= 5 && tokenParts[0] === 'PROF') {
          ownerUserId = parseInt(tokenParts[1]);
          console.log(`📱 PWA MANIFEST: Trovato ownerId ${ownerUserId} da token nel path`);
        }
      }
      
      // Fallback: cerca token nei query params del referer
      if (!ownerUserId) {
        const tokenMatch = referer.match(/token=([^&]+)/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          const tokenParts = token.split('_');
          if (tokenParts.length >= 5 && tokenParts[0] === 'PROF') {
            ownerUserId = parseInt(tokenParts[1]);
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
    
    // Metodo 4: Fallback agli utenti esistenti
    if (!ownerUserId) {
      const storageData = loadStorageData();
      const usersWithIcons = Object.keys(storageData.userIcons || {});
      if (usersWithIcons.length === 1) {
        ownerUserId = parseInt(usersWithIcons[0]);
        console.log(`📱 PWA MANIFEST: Usando fallback owner ${ownerUserId}`);
      }
    }
    
    // Crea manifest dinamico con start_url che preserva il contesto
    const storageData = loadStorageData();
    const ownerName = ownerUserId && storageData.userContactInfo?.[ownerUserId]?.businessName || 'Studio Medico';
    
    const baseManifest = {
      "name": `${ownerName} - Area Cliente`,
      "short_name": "Area Cliente", 
      "description": "Accedi alla tua area personale",
      "start_url": ownerUserId ? `/client-area?ownerId=${ownerUserId}` : "/client-area",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#4f46e5",
      "orientation": "any",
      "categories": ["healthcare", "business"],
      "lang": "it-IT",
      "dir": "ltr",
      "prefer_related_applications": false,
      "scope": "/",
      "id": ownerUserId ? `area-cliente-${ownerUserId}` : "area-cliente-generic"
    };
    
    // Usa icone personalizzate se abbiamo un owner, altrimenti default
    const iconPrefix = ownerUserId ? `/icons/owner-${ownerUserId}-icon-` : '/icons/icon-';
    
    const manifest = {
      ...baseManifest,
      "icons": [
        {
          "src": `${iconPrefix}96x96.png`,
          "sizes": "96x96", 
          "type": "image/png",
          "purpose": "any"
        },
        {
          "src": `${iconPrefix}192x192.png`,
          "sizes": "192x192",
          "type": "image/png", 
          "purpose": "any maskable"
        },
        {
          "src": `${iconPrefix}512x512.png`,
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
              "src": `${iconPrefix}96x96.png`,
              "sizes": "96x96",
              "type": "image/png"
            }
          ]
        }
      ]
    };
    
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    console.log(`📱 MANIFEST DINAMICO: Servendo manifest per owner ${ownerUserId || 'default'}`);
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