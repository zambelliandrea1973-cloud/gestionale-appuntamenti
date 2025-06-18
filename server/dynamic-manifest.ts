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
    console.log('🔍 PWA MANIFEST: URL completo:', req.url);
    console.log('🔍 PWA MANIFEST: Query params:', req.query);
    console.log('🔍 PWA MANIFEST: Headers referer:', req.get('referer'));
    
    // FORZA DEBUG PER IDENTIFICARE IL PROBLEMA
    console.error('📱 DEBUG MANIFEST FORZATO: CHIAMATA RICEVUTA');
    
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
    
    // Crea manifest dinamico con start_url che preserva il contesto del cliente
    const storageData = loadStorageData();
    const ownerName = ownerUserId && storageData.userContactInfo?.[ownerUserId]?.businessName || 'Studio Medico';
    
    // Forza aggiornamento completo del manifest per Android PWA
    const manifestVersion = `${Date.now()}-${ownerUserId || 'default'}`;
    console.log(`🔄 MANIFEST: Versione aggiornata: ${manifestVersion}`);
    
    // Determina start_url in base al referer per preservare il contesto del cliente
    let startUrl = "/";
    const referer = req.get('referer') || '';
    
    console.log(`🔍 PWA MANIFEST: Analizzando referer: ${referer}`);
    console.log(`🔍 PWA MANIFEST: Query params:`, req.query);
    
    // Prima priorità: token client nei query params
    if (req.query.clientToken) {
      startUrl = `/client/${req.query.clientToken}`;
      console.log(`📱 PWA MANIFEST: Start URL costruito da query token: ${startUrl}`);
    }
    // Seconda priorità: estrai percorso /client/ dal referer
    else if (referer) {
      const clientPathMatch = referer.match(/(\/client\/[^?#\s]+)/);
      if (clientPathMatch) {
        startUrl = clientPathMatch[1];
        console.log(`📱 PWA MANIFEST: Start URL estratto da referer: ${startUrl}`);
      }
    }
    // Terza priorità: per utente 14, usa direttamente il codice di Bruna
    else if (ownerUserId === 14 && !startUrl.includes('/client/')) {
      // Usa direttamente il codice univoco di Bruna Pizzolato
      startUrl = `/client/PROF_014_9C1F_CLIENT_1750163505034_340F`;
      console.log(`📱 PWA MANIFEST: Start URL fissato per Bruna Pizzolato: ${startUrl}`);
    }
    // Fallback generico per altri utenti
    else if (ownerUserId && !startUrl.includes('/client/')) {
      const storageData = loadStorageData();
      const clients = storageData.clients || [];
      
      let targetClient = null;
      for (const [clientId, clientData] of clients) {
        if (clientData.ownerId === ownerUserId) {
          if (!targetClient || clientId > targetClient.id) {
            targetClient = { id: clientId, data: clientData };
          }
        }
      }
      
      if (targetClient && targetClient.data.uniqueCode) {
        startUrl = `/client/${targetClient.data.uniqueCode}`;
        console.log(`📱 PWA MANIFEST: Start URL costruito per cliente ${targetClient.data.firstName} ${targetClient.data.lastName}: ${startUrl}`);
      }
    }
    
    // Nome personalizzato per Silvia Busnari per distinguere l'app
    const professionalName = ownerUserId === 14 ? "Silvia Busnari" : ownerName;
    
    const baseManifest = {
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
      "scope": "/",
      "id": ownerUserId ? `silvia-busnari-cliente-${ownerUserId}` : `area-cliente-generic`,
      "version": manifestVersion
    };
    
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