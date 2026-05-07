// @ts-nocheck
/**
 * Dynamic proxy to serve PWA icons generated on-the-fly from database
 * SOLUTION for Sliplane: does not use file system, generates icons on the fly
 */
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';

export async function serveCustomIconDynamic(req: Request, res: Response) {
  try {
    const { size } = req.params;
    const ownerUserId = req.query.owner || req.query.bust;
    
    console.log(`🖼️ ICON DYNAMIC: Icon ${size} requested for owner ${ownerUserId}`);
    
    // Determine dimensione numerica
    const sizeNum = parseInt(size.replace(/[^0-9]/g, ''));
    if (!sizeNum || ![96, 192, 512].includes(sizeNum)) {
      return res.status(400).send('Invalid icon size');
    }
    
    // Load icon from database
    let iconBase64: string | null = null;
    
    if (ownerUserId && ownerUserId !== 'default') {
      try {
        const user = await storage.getUser(parseInt(ownerUserId as string));
        if (user) {
          // Search for custom icon in database
          const userIcons = await storage.getUserIcons?.() || {};
          iconBase64 = userIcons[user.id];
          console.log(`🖼️ ICON DYNAMIC: Icon found for user ${user.id}:`, iconBase64 ? 'YES' : 'NO');
        }
      } catch (error: any) {
        console.log(`⚠️ ICON DYNAMIC: Error loading user ${ownerUserId}:`, error);
      }
    }
    
    // Fallback to default icon
    if (!iconBase64) {
      console.log(`🖼️ ICON DYNAMIC: Using default icon for owner ${ownerUserId}`);
      
      // Try to load default icon from file
      const defaultIconPath = path.join(process.cwd(), 'public', 'icons', 'app_icon.jpg');
      if (fs.existsSync(defaultIconPath)) {
        const defaultBuffer = fs.readFileSync(defaultIconPath);
        iconBase64 = `data:image/jpeg;base64,${defaultBuffer.toString('base64')}`;
      } else {
        return res.status(404).send('Default icon not found');
      }
    }
    
    // Generate icon of the required size using Sharp
    try {
      const sharp = await import('sharp').then(m => m.default);
      
      // Extract buffer from base64 image
      const base64Data = iconBase64.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Resize on the fly
      const resizedBuffer = await sharp(imageBuffer)
        .resize(sizeNum, sizeNum, { 
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();
      
      // Serve icon with optimized headers
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': resizedBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache 24h (icons don't change often)
        'Last-Modified': new Date().toUTCString(),
        'ETag': `"${Date.now()}-${ownerUserId || 'default'}-${sizeNum}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-PWA-Icon': 'dynamic',
        'Access-Control-Allow-Origin': '*'
      });
      
      console.log(`✅ ICON DYNAMIC: Serving icon ${size} for owner ${ownerUserId}, size: ${resizedBuffer.length} bytes`);
      
      res.send(resizedBuffer);
      
    } catch (error: any) {
      console.error('❌ ICON DYNAMIC: Error generating icon:', error);
      
      // Fallback to static icon if generation fails
      const staticIconPath = path.join(process.cwd(), 'public', 'icons', `icon-${size}.png`);
      if (fs.existsSync(staticIconPath)) {
        console.log(`📁 ICON DYNAMIC: Falling back to static icon: ${staticIconPath}`);
        res.sendFile(staticIconPath);
      } else {
        res.status(500).send('Error generating icon');
      }
    }
    
  } catch (error: any) {
    console.error('❌ ICON DYNAMIC: General error:', error);
    res.status(500).send('Icon server error');
  }
}
