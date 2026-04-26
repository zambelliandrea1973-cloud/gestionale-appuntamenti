/**
 * Proxy per servire icone PWA generate on-the-fly dal database PostgreSQL
 * SOLUZIONE per Sliplane: non usa file system, genera icone al volo
 */
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';

/**
 * In-memory cache: key = `${ownerUserId}:${sizeNum}`, value = PNG buffer.
 * Capped at MAX_ICON_CACHE_SIZE entries; oldest entry is evicted when full.
 * Cleared per-owner when the user saves or resets their icon.
 */
const MAX_ICON_CACHE_SIZE = 500;
const iconCache = new Map<string, Buffer>();

function setCached(key: string, buffer: Buffer): void {
  if (iconCache.size >= MAX_ICON_CACHE_SIZE) {
    const oldest = iconCache.keys().next().value;
    if (oldest !== undefined) {
      iconCache.delete(oldest);
    }
  }
  iconCache.set(key, buffer);
}

/**
 * Invalidate all cached icons for a specific owner.
 * Call this whenever a user saves or resets their icon.
 */
export function invalidateIconCache(ownerUserId: number): void {
  const prefix = `${ownerUserId}:`;
  for (const key of iconCache.keys()) {
    if (key.startsWith(prefix)) {
      iconCache.delete(key);
    }
  }
  console.log(`🗑️ ICON CACHE: Invalidated entries for owner ${ownerUserId}`);
}

export async function serveCustomIcon(req: Request, res: Response) {
  try {
    const { size } = req.params;

    // Determina dimensione numerica (supporta sia "192" che "192x192")
    const sizeNum = parseInt(size.split('x')[0]);
    if (!sizeNum || ![16, 32, 48, 64, 96, 128, 144, 152, 192, 384, 512].includes(sizeNum)) {
      console.log(`❌ ICON PROXY DB: Dimensione non valida: ${size} → ${sizeNum}`);
      return res.status(400).send('Dimensione icona non valida');
    }

    // Derive owner identity strictly from `owner` param (never from `bust`,
    // which can be a timestamp and would pollute the cache with never-hit entries).
    const ownerParam = req.query.owner;
    const ownerId = ownerParam && ownerParam !== 'default'
      ? parseInt(ownerParam as string)
      : null;
    const cacheKey = ownerId && !isNaN(ownerId) ? `${ownerId}:${sizeNum}` : null;

    if (cacheKey && iconCache.has(cacheKey)) {
      const cached = iconCache.get(cacheKey)!;
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': cached.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-PWA-Icon': 'database-cached',
        'Access-Control-Allow-Origin': '*'
      });
      return res.send(cached);
    }
    
    console.log(`🖼️ ICON PROXY DB: Richiesta icona ${size} per owner ${ownerId ?? 'default'}`);

    // Carica icona dal database PostgreSQL
    let iconBase64: string | undefined;
    
    if (ownerId) {
      try {
        iconBase64 = await storage.getUserIcon(ownerId);
      } catch (error) {
        console.log(`⚠️ ICON PROXY DB: Errore caricamento user ${ownerId}:`, error);
      }
    }
    
    // Fallback a icona default da file
    if (!iconBase64) {
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
      
      // Ridimensiona al volo (NO FILE SYSTEM!)
      const resizedBuffer = await sharp(imageBuffer)
        .resize(sizeNum, sizeNum, { 
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();

      // Store in server-side cache (only for authenticated owners, not defaults)
      if (cacheKey) {
        setCached(cacheKey, resizedBuffer);
        console.log(`💾 ICON CACHE STORE: Icona ${size} per owner ${ownerId} salvata nel cache`);
      }
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': resizedBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-PWA-Icon': 'database-dynamic',
        'Access-Control-Allow-Origin': '*'
      });
      
      console.log(`✅ ICON PROXY DB: Servendo icona ${size} per owner ${ownerId ?? 'default'}, dimensione: ${resizedBuffer.length} bytes`);
      
      res.send(resizedBuffer);
      
    } catch (error) {
      console.error('❌ ICON PROXY DB: Errore generazione icona:', error);
      
      // Fallback a icona statica se generazione fallisce
      const staticIconPath = path.join(process.cwd(), 'public', 'icons', `icon-${size}.png`);
      if (fs.existsSync(staticIconPath)) {
        res.sendFile(staticIconPath);
      } else {
        res.status(500).send('Errore generazione icona');
      }
    }
    
  } catch (error) {
    console.error('❌ ICON PROXY DB: Errore generale:', error);
    res.status(500).send('Errore server icona');
  }
}
