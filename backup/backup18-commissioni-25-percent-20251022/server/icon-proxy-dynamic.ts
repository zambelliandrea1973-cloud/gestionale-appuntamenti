/**
 * Proxy dinamico per servire icone PWA generate on-the-fly dal database
 * SOLUZIONE per Sliplane: non usa file system, genera icone al volo
 */
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';

export async function serveCustomIconDynamic(req: Request, res: Response) {
  try {
    const { size } = req.params;
    const ownerUserId = req.query.owner || req.query.bust;
    
    console.log(`🖼️ ICON DYNAMIC: Richiesta icona ${size} per owner ${ownerUserId}`);
    
    // Determina dimensione numerica
    const sizeNum = parseInt(size.replace(/[^0-9]/g, ''));
    if (!sizeNum || ![96, 192, 512].includes(sizeNum)) {
      return res.status(400).send('Dimensione icona non valida');
    }
    
    // Carica icona dal database
    let iconBase64: string | null = null;
    
    if (ownerUserId && ownerUserId !== 'default') {
      try {
        const user = await storage.getUser(parseInt(ownerUserId as string));
        if (user) {
          // Cerca icona personalizzata nel database
          const userIcons = await storage.getUserIcons?.() || {};
          iconBase64 = userIcons[user.id];
          console.log(`🖼️ ICON DYNAMIC: Icona trovata per user ${user.id}:`, iconBase64 ? 'SÌ' : 'NO');
        }
      } catch (error) {
        console.log(`⚠️ ICON DYNAMIC: Errore caricamento user ${ownerUserId}:`, error);
      }
    }
    
    // Fallback a icona default
    if (!iconBase64) {
      console.log(`🖼️ ICON DYNAMIC: Usando icona default per owner ${ownerUserId}`);
      
      // Prova a caricare icona default da file
      const defaultIconPath = path.join(process.cwd(), 'public', 'icons', 'app_icon.jpg');
      if (fs.existsSync(defaultIconPath)) {
        const defaultBuffer = fs.readFileSync(defaultIconPath);
        iconBase64 = `data:image/jpeg;base64,${defaultBuffer.toString('base64')}`;
      } else {
        return res.status(404).send('Icona default non trovata');
      }
    }
    
    // Genera icona della dimensione richiesta usando Sharp
    try {
      const sharp = await import('sharp').then(m => m.default);
      
      // Estrai buffer dall'immagine base64
      const base64Data = iconBase64.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Ridimensiona al volo
      const resizedBuffer = await sharp(imageBuffer)
        .resize(sizeNum, sizeNum, { 
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();
      
      // Servi icona con headers ottimizzati
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': resizedBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache 24h (le icone non cambiano spesso)
        'Last-Modified': new Date().toUTCString(),
        'ETag': `"${Date.now()}-${ownerUserId || 'default'}-${sizeNum}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-PWA-Icon': 'dynamic',
        'Access-Control-Allow-Origin': '*'
      });
      
      console.log(`✅ ICON DYNAMIC: Servendo icona ${size} per owner ${ownerUserId}, dimensione: ${resizedBuffer.length} bytes`);
      
      res.send(resizedBuffer);
      
    } catch (error) {
      console.error('❌ ICON DYNAMIC: Errore generazione icona:', error);
      
      // Fallback a icona statica se generazione fallisce
      const staticIconPath = path.join(process.cwd(), 'public', 'icons', `icon-${size}.png`);
      if (fs.existsSync(staticIconPath)) {
        console.log(`📁 ICON DYNAMIC: Fallback a icona statica: ${staticIconPath}`);
        res.sendFile(staticIconPath);
      } else {
        res.status(500).send('Errore generazione icona');
      }
    }
    
  } catch (error) {
    console.error('❌ ICON DYNAMIC: Errore generale:', error);
    res.status(500).send('Errore server icona');
  }
}
