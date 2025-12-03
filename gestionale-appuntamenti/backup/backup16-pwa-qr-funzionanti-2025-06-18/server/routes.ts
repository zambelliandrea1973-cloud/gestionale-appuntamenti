import { registerSimpleRoutes } from "./simple-routes";
import type { Express } from "express";
import { createServer, type Server } from "http";
import fs from 'fs';
import path from 'path';

// Caricamento dati storage per validazione QR code
function loadStorageData() {
  const storageFile = path.join(process.cwd(), 'storage_data.json');
  try {
    if (fs.existsSync(storageFile)) {
      const data = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Errore caricamento storage per QR:', error);
  }
  return { clients: [] };
}

export function registerRoutes(app: Express): Server {
  // PRIORITA ASSOLUTA: Manifest dinamico per PWA con start_url client-specifico
  app.get('/manifest.json', (req, res) => {
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
    
    console.log(`📱 MANIFEST: Servendo con start_url: ${startUrl}`);
    res.json(manifest);
  });

  return registerSimpleRoutes(app);
}