import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { loadStorageData } from '../utils/jsonStorage';

/**
 * Sincronizza le icone utente dal JSON storage ai file PNG fisici
 * Eseguito all'avvio del server per garantire che le icone PWA siano sempre disponibili
 */
export async function syncUserIconsFromJSON() {
  try {
    const storageData = loadStorageData();
    const userIcons = storageData.userIcons || {};
    const publicIconsPath = path.join(process.cwd(), 'public', 'icons');
    
    if (!fs.existsSync(publicIconsPath)) {
      fs.mkdirSync(publicIconsPath, { recursive: true });
    }
    
    const iconSizes = [96, 192, 512];
    let convertedCount = 0;
    
    for (const [userId, iconBase64] of Object.entries(userIcons)) {
      if (!iconBase64) continue;
      
      try {
        // Verifica se le icone esistono già
        const iconExists = iconSizes.every(size => {
          const filePath = path.join(publicIconsPath, `owner-${userId}-icon-${size}x${size}.png`);
          return fs.existsSync(filePath);
        });
        
        if (iconExists) {
          console.log(`✅ [ICON SYNC] Icone per utente ${userId} già presenti`);
          continue;
        }
        
        // Converti icona base64 in PNG
        const base64Clean = iconBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Clean, 'base64');
        
        for (const size of iconSizes) {
          const fileName = `owner-${userId}-icon-${size}x${size}.png`;
          const filePath = path.join(publicIconsPath, fileName);
          
          await sharp(imageBuffer)
            .resize(size, size, {
              fit: 'cover',
              position: 'center'
            })
            .png({
              quality: 90,
              compressionLevel: 6
            })
            .toFile(filePath);
        }
        
        console.log(`✅ [ICON SYNC] Icone create per utente ${userId}`);
        convertedCount++;
      } catch (error) {
        console.error(`❌ [ICON SYNC] Errore conversione icona utente ${userId}:`, error);
      }
    }
    
    if (convertedCount > 0) {
      console.log(`✅ [ICON SYNC] Sincronizzate ${convertedCount} icone utente`);
    } else {
      console.log(`✅ [ICON SYNC] Tutte le icone già sincronizzate`);
    }
  } catch (error) {
    console.error('❌ [ICON SYNC] Errore durante la sincronizzazione icone:', error);
  }
}
