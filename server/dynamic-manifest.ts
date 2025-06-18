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
    // Determina l'owner ID dal referer o dal token QR
    let ownerUserId = null;
    
    const referer = req.get('referer') || '';
    const tokenMatch = referer.match(/token=([^&]+)/);
    
    if (tokenMatch) {
      const token = tokenMatch[1];
      const tokenParts = token.split('_');
      if (tokenParts.length >= 5 && tokenParts[0] === 'PROF') {
        ownerUserId = parseInt(tokenParts[1]);
        console.log(`📱 MANIFEST: Trovato ownerId ${ownerUserId} da token QR`);
      }
    }
    
    // Se non trovato dal token, usa fallback
    if (!ownerUserId) {
      const storageData = loadStorageData();
      const usersWithIcons = Object.keys(storageData.userIcons || {});
      if (usersWithIcons.length === 1) {
        ownerUserId = parseInt(usersWithIcons[0]);
        console.log(`📱 MANIFEST: Usando fallback owner ${ownerUserId}`);
      }
    }
    
    // Crea manifest dinamico
    const baseManifest = {
      "name": "Gestione Appuntamenti v4",
      "short_name": "App Cliente", 
      "description": "Gestione consensi e servizi medici",
      "start_url": "/pwa",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#4f46e5",
      "orientation": "any",
      "categories": ["healthcare", "business"],
      "lang": "it-IT",
      "dir": "ltr",
      "prefer_related_applications": false,
      "scope": "/",
      "id": "gestione-appuntamenti-client-v4"
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