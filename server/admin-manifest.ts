/**
 * Manifest.json dinamico per area amministrazione
 * Serve l'icona personalizzata del professionista loggato
 */
import { Request, Response } from 'express';

export async function serveAdminManifest(req: Request, res: Response) {
  try {
    console.log('🔍 ADMIN MANIFEST: Richiesta manifest area professionale');
    console.log('🔍 ADMIN MANIFEST: User loggato:', req.user ? `ID ${(req.user as any).id}` : 'NESSUNO');
    
    // AUTENTICAZIONE OBBLIGATORIA
    if (!req.user) {
      console.log('❌ ADMIN MANIFEST: Utente non autenticato, rifiuto richiesta');
      return res.status(401).json({ 
        error: 'Autenticazione richiesta per accedere al manifest',
        message: 'Effettua il login per installare la PWA professionale' 
      });
    }
    
    const userId = (req.user as any).id;
    const userName = (req.user as any).businessName || (req.user as any).name || 'Professionista';
    
    console.log(`📱 ADMIN MANIFEST: Generando manifest per ${userName} (ID: ${userId})`);
    
    // Versione manifest basata su userId + timestamp per cache busting
    const manifestVersion = `${userId}-${Date.now()}`;
    
    // Costruisci URL icone con proxy dinamico
    const iconTimestamp = Date.now() + Math.random();
    const iconBaseUrl = `/pwa-icon`;
    const iconParams = `?owner=${userId}&v=${iconTimestamp}&admin=1`;
    
    const manifest = {
      "name": "Gestionale Appuntamenti - Dashboard Professionale",
      "short_name": "Gestionale",
      "description": `Dashboard completa per gestione clienti, appuntamenti e servizi medici - ${userName}`,
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#006400",
      "orientation": "any",
      "scope": "/",
      "id": `gestionale-appuntamenti-admin-v3-${userId}`,
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
          "name": "Calendario",
          "url": "/calendario",
          "description": "Visualizza appuntamenti nel calendario",
          "icons": [
            {
              "src": `${iconBaseUrl}/96x96${iconParams}`,
              "sizes": "96x96",
              "type": "image/png"
            }
          ]
        },
        {
          "name": "Clienti",
          "url": "/clienti",
          "description": "Gestisci i tuoi clienti",
          "icons": [
            {
              "src": `${iconBaseUrl}/96x96${iconParams}`,
              "sizes": "96x96",
              "type": "image/png"
            }
          ]
        },
        {
          "name": "Notifiche",
          "url": "/notifiche",
          "description": "Visualizza le notifiche",
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
    
    // Headers anti-cache per forzare aggiornamento
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Manifest-User-Id': userId.toString(),
      'X-Manifest-Version': manifestVersion
    });
    
    console.log(`✅ ADMIN MANIFEST: Servendo manifest per ${userName} (ID: ${userId})`);
    console.log(`📱 ADMIN MANIFEST ID: ${manifest.id}`);
    console.log(`📱 ADMIN MANIFEST ICONE: ${JSON.stringify(manifest.icons.map(i => i.src))}`);
    
    res.json(manifest);
    
  } catch (error) {
    console.error('❌ ADMIN MANIFEST: Errore durante generazione:', error);
    res.status(500).json({ 
      error: 'Errore interno server',
      message: 'Impossibile generare il manifest della PWA' 
    });
  }
}
