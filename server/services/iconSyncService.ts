// @ts-nocheck
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { loadStorageData } from '../utils/jsonStorage';

/**
 * Synchronize user icons from JSON storage to physical PNG files
 * Executed at server startup to ensure PWA icons are always available
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
        // Check if the icons already exist
        const iconExists = iconSizes.every(size => {
          const filePath = path.join(publicIconsPath, `owner-${userId}-icon-${size}x${size}.png`);
          return fs.existsSync(filePath);
        });
        
        if (iconExists) {
          console.log(`✅ [ICON SYNC] Icons for user ${userId} already present`);
          continue;
        }
        
        // Convert base64 icon to PNG
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
        
        console.log(`✅ [ICON SYNC] Icons created for user ${userId}`);
        convertedCount++;
      } catch (error: any) {
        console.error(`❌ [ICON SYNC] Error converting icon for user ${userId}:`, error);
      }
    }
    
    if (convertedCount > 0) {
      console.log(`✅ [ICON SYNC] Synchronized ${convertedCount} user icons`);
    } else {
      console.log(`✅ [ICON SYNC] All icons already synchronized`);
    }
  } catch (error: any) {
    console.error('❌ [ICON SYNC] Error during icon synchronization:', error);
  }
}
