/**
 * Manifest.json dinamico per area amministrazione
 * Serve l'icona personalizzata del professionista loggato
 */
import { Request, Response } from 'express';

export async function serveAdminManifest(req: Request, res: Response) {
  try {
    console.log('🔍 ADMIN MANIFEST: Richiesta manifest area professionale');
    console.log('🔍 ADMIN MANIFEST: User loggato:', req.user ? `ID ${(req.user as any).id}` : 'NESSUNO');
    console.log('🔍 ADMIN MANIFEST: Query params:', req.query);
    
    // STRATEGIA MULTI-LAYER per identificare l'utente:
    // 1. Query param userId (priorità ALTA - usato durante installazione PWA senza cookie)
    // 2. Sessione req.user (fallback se c'è sessione attiva)
    // 3. Default (se nessuno dei precedenti)
    
    let userId: number | string = 'default';
    let userName = 'Gestionale Appuntamenti';
    
    // Priorità 1: Query parameter userId
    if (req.query.userId) {
      userId = parseInt(req.query.userId as string);
      // Carica nome utente dal database se necessario (opzionale per ora)
      userName = 'Professionista';
      console.log(`📱 ADMIN MANIFEST: UserId da query param: ${userId}`);
    }
    // Priorità 2: Sessione attiva
    else if (req.user) {
      userId = (req.user as any).id;
      userName = (req.user as any).businessName || (req.user as any).name || 'Professionista';
      console.log(`📱 ADMIN MANIFEST: Generando manifest per ${userName} (ID: ${userId})`);
    } 
    // Priorità 3: Default
    else {
      console.log(`📱 ADMIN MANIFEST: Nessun userId, servendo manifest con icona default`);
    }
    
    // Versione manifest basata su userId + timestamp per cache busting
    const manifestVersion = `${userId}-${Date.now()}`;
    
    // Costruisci URL icone con proxy dinamico
    const iconTimestamp = Date.now() + Math.random();
    const iconBaseUrl = `/pwa-icon`;
    const iconParams = `?owner=${userId}&v=${iconTimestamp}&admin=1`;
    
    // ID dinamico solo se loggato, altrimenti generico
    const manifestId = req.user 
      ? `gestionale-appuntamenti-admin-${userId}`
      : `gestionale-appuntamenti-admin-generic`;
    
    const manifest = {
      "name": req.user 
        ? `${userName} - Dashboard Professionale` 
        : "Gestionale Appuntamenti - Dashboard Professionale",
      "short_name": "Gestionale",
      "description": `Dashboard completa per gestione clienti, appuntamenti e servizi medici${req.user ? ' - ' + userName : ''}`,
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
