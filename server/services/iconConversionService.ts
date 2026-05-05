// @ts-nocheck
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export interface IconSizes {
  '96x96': string;
  '192x192': string;
  '512x512': string;
}

export class IconConversionService {
  private iconSizes = [96, 192, 512];
  private publicIconsPath = path.join(process.cwd(), 'public', 'icons');

  constructor() {
    // Ensure the icons directory exists
    if (!fs.existsSync(this.publicIconsPath)) {
      fs.mkdirSync(this.publicIconsPath, { recursive: true });
    }
  }

  /**
   * Convert an image to PNG icons of various sizes for PWA
   */
  async convertImageToIcons(imageBuffer: Buffer, baseName: string = 'icon'): Promise<IconSizes> {
    const iconPaths: IconSizes = {
      '96x96': '',
      '192x192': '',
      '512x512': ''
    };

    try {
      for (const size of this.iconSizes) {
        const fileName = `${baseName}-${size}x${size}.png`;
        const filePath = path.join(this.publicIconsPath, fileName);
        
        // Convert and resize the image using Sharp
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

        iconPaths[`${size}x${size}` as keyof IconSizes] = `/icons/${fileName}`;
      }

      console.log(`✅ PWA icons generated successfully for ${baseName}`);
      return iconPaths;
    } catch (error: any) {
      console.error('❌ Error converting icons:', error);
      throw new Error(`Error converting icons: ${error.message}`);
    }
  }

  /**
   * Convert a file uploaded by the user
   */
  async convertUploadedFile(filePath: string, baseName: string = 'custom-icon'): Promise<IconSizes> {
    try {
      const imageBuffer = fs.readFileSync(filePath);
      return await this.convertImageToIcons(imageBuffer, baseName);
    } catch (error: any) {
      console.error('❌ Error reading file:', error);
      throw new Error(`Error reading file: ${error.message}`);
    }
  }

  /**
   * Convert an image from base64
   */
  async convertBase64Image(base64Data: string, baseName: string = 'custom-icon'): Promise<IconSizes> {
    try {
      // Remove the date:image/...;base64, prefix if present
      const base64Clean = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Clean, 'base64');
      return await this.convertImageToIcons(imageBuffer, baseName);
    } catch (error: any) {
      console.error('❌ Error converting from base64:', error);
      throw new Error(`Error converting from base64: ${error.message}`);
    }
  }

  /**
   * Update manifest.json with the new icons
   */
  async updateManifestIcons(iconPaths: IconSizes): Promise<void> {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    
    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      // Update the icons in the manifest
      manifest.icons = [
        {
          src: iconPaths['96x96'],
          sizes: '96x96',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: iconPaths['192x192'],
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: iconPaths['512x512'],
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ];

      // Update shortcuts as well if they exist
      if (manifest.shortcuts && manifest.shortcuts.length > 0) {
        manifest.shortcuts[0].icons = [
          {
            src: iconPaths['96x96'],
            sizes: '96x96',
            type: 'image/png'
          }
        ];
      }

      // Save the updated manifest
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('✅ Manifest.json updated with new icons');
    } catch (error: any) {
      console.error('❌ Error updating manifest:', error);
      throw new Error(`Error updating manifest: ${error.message}`);
    }
  }

  /**
   * Update the HTML with the new Apple Touch icons
   */
  async updateHTMLIcons(iconPaths: IconSizes): Promise<void> {
    const htmlPath = path.join(process.cwd(), 'client', 'index.html');
    
    try {
      let htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Replace Apple Touch icons with the new 192x192 icon
      const appleIconRegex = /<link rel="apple-touch-icon"[^>]*href="[^"]*"[^>]*>/g;
      const newAppleIcon = `<link rel="apple-touch-icon" href="${iconPaths['192x192']}">`;
      
      htmlContent = htmlContent.replace(appleIconRegex, newAppleIcon);
      
      // Also replace icons with specific dimensions
      const appleSizeIconRegex = /<link rel="apple-touch-icon" sizes="[^"]*"[^>]*href="[^"]*"[^>]*>/g;
      htmlContent = htmlContent.replace(appleSizeIconRegex, (match) => {
        const sizeMatch = match.match(/sizes="([^"]*)"/);
        if (sizeMatch) {
          return match.replace(/href="[^"]*"/, `href="${iconPaths['192x192']}"`);
        }
        return match;
      });

      fs.writeFileSync(htmlPath, htmlContent);
      console.log('✅ HTML updated with new icons');
    } catch (error: any) {
      console.error('❌ Error updating HTML:', error);
      throw new Error(`Error updating HTML: ${error.message}`);
    }
  }

  /**
   * Complete process: convert image and update all necessary files
   */
  async processCustomIcon(imageData: string | Buffer, baseName: string = 'custom-icon'): Promise<IconSizes> {
    try {
      let iconPaths: IconSizes;

      if (typeof imageData === 'string') {
        // It is a base64 string
        iconPaths = await this.convertBase64Image(imageData, baseName);
      } else {
        // It is a Buffer
        iconPaths = await this.convertImageToIcons(imageData, baseName);
      }

      // Update manifest e HTML
      await this.updateManifestIcons(iconPaths);
      await this.updateHTMLIcons(iconPaths);

      return iconPaths;
    } catch (error: any) {
      console.error('❌ Error during full icon processing:', error);
      throw error;
    }
  }

  /**
   * Restore the default icons (Fleur de Vie)
   */
  async restoreDefaultIcons(): Promise<IconSizes> {
    const defaultImagePath = path.join(process.cwd(), 'public', 'fleur-de-vie.jpg');
    
    try {
      const imageBuffer = fs.readFileSync(defaultImagePath);
      return await this.processCustomIcon(imageBuffer, 'icon');
    } catch (error: any) {
      console.error('❌ Error restoring default icons:', error);
      throw new Error(`Error restoring default icons: ${error.message}`);
    }
  }
}

export const iconConversionService = new IconConversionService();