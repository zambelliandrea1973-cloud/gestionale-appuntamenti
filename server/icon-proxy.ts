/**
 * Proxy per servire icone PWA con headers ottimizzati per Android
 */
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { loadStorageData } from './utils/jsonStorage';

// 📁 Usa funzione centralizzata da utils/jsonStorage.ts

export function serveCustomIcon(req: Request, res: Response) {
  try {
    const { size } = req.params;
    const ownerUserId = req.query.owner || req.query.bust;
    
    console.log(`🖼️ ICON PROXY: Richiesta icona ${size} per owner ${ownerUserId}`);
    
    // Determina il percorso dell'icona
    let iconPath: string;
    
    if (ownerUserId && ownerUserId !== 'default') {
      // Icona personalizzata per l'owner
      iconPath = path.join(process.cwd(), 'public', 'icons', `owner-${ownerUserId}-icon-${size}.png`);
      
      // Verifica se l'icona personalizzata esiste
      if (!fs.existsSync(iconPath)) {
        console.log(`⚠️ ICON PROXY: Icona personalizzata non trovata, uso default`);
        iconPath = path.join(process.cwd(), 'public', 'icons', `icon-${size}.png`);
      }
    } else {
      // Icona default
      iconPath = path.join(process.cwd(), 'public', 'icons', `icon-${size}.png`);
    }
    
    // Verifica che il file esista
    if (!fs.existsSync(iconPath)) {
      console.error(`❌ ICON PROXY: File icona non trovato: ${iconPath}`);
      return res.status(404).send('Icona non trovata');
    }
    
    // Leggi e servi l'icona con headers ottimizzati per Android PWA
    const iconBuffer = fs.readFileSync(iconPath);
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': iconBuffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate', // Forza Android a non cachare
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(), // Sempre "fresh"
      'ETag': `"${Date.now()}-${ownerUserId || 'default'}"`, // ETag univoco
      'X-Content-Type-Options': 'nosniff',
      'X-PWA-Icon': 'true',
      'Access-Control-Allow-Origin': '*'
    });
    
    console.log(`✅ ICON PROXY: Servendo icona ${size} per owner ${ownerUserId}, dimensione: ${iconBuffer.length} bytes`);
    
    res.send(iconBuffer);
    
  } catch (error) {
    console.error('❌ ICON PROXY: Errore nel servire icona:', error);
    res.status(500).send('Errore server icona');
  }
}