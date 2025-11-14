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
    // Assicurati che la directory icons esista
    if (!fs.existsSync(this.publicIconsPath)) {
      fs.mkdirSync(this.publicIconsPath, { recursive: true });
    }
  }

  /**
   * Converte un'immagine in icone PNG di diverse dimensioni per PWA
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
        
        // Converti e ridimensiona l'immagine usando Sharp
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

      console.log(`✅ Icone PWA generate con successo per ${baseName}`);
      return iconPaths;
    } catch (error) {
      console.error('❌ Errore durante la conversione delle icone:', error);
      throw new Error(`Errore durante la conversione delle icone: ${error.message}`);
    }
  }

  /**
   * Converte un file caricato dall'utente
   */
  async convertUploadedFile(filePath: string, baseName: string = 'custom-icon'): Promise<IconSizes> {
    try {
      const imageBuffer = fs.readFileSync(filePath);
      return await this.convertImageToIcons(imageBuffer, baseName);
    } catch (error) {
      console.error('❌ Errore durante la lettura del file:', error);
      throw new Error(`Errore durante la lettura del file: ${error.message}`);
    }
  }

  /**
   * Converte un'immagine da base64
   */
  async convertBase64Image(base64Data: string, baseName: string = 'custom-icon'): Promise<IconSizes> {
    try {
      // Rimuovi il prefisso data:image/...;base64, se presente
      const base64Clean = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Clean, 'base64');
      return await this.convertImageToIcons(imageBuffer, baseName);
    } catch (error) {
      console.error('❌ Errore durante la conversione da base64:', error);
      throw new Error(`Errore durante la conversione da base64: ${error.message}`);
    }
  }

  /**
   * Aggiorna il manifest.json con le nuove icone
   */
  async updateManifestIcons(iconPaths: IconSizes): Promise<void> {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    
    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      // Aggiorna le icone nel manifest
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

      // Aggiorna anche gli shortcuts se esistono
      if (manifest.shortcuts && manifest.shortcuts.length > 0) {
        manifest.shortcuts[0].icons = [
          {
            src: iconPaths['96x96'],
            sizes: '96x96',
            type: 'image/png'
          }
        ];
      }

      // Salva il manifest aggiornato
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('✅ Manifest.json aggiornato con le nuove icone');
    } catch (error) {
      console.error('❌ Errore durante l\'aggiornamento del manifest:', error);
      throw new Error(`Errore durante l'aggiornamento del manifest: ${error.message}`);
    }
  }

  /**
   * Aggiorna l'HTML con le nuove icone Apple Touch
   */
  async updateHTMLIcons(iconPaths: IconSizes): Promise<void> {
    const htmlPath = path.join(process.cwd(), 'client', 'index.html');
    
    try {
      let htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Sostituisci le icone Apple Touch con la nuova icona 192x192
      const appleIconRegex = /<link rel="apple-touch-icon"[^>]*href="[^"]*"[^>]*>/g;
      const newAppleIcon = `<link rel="apple-touch-icon" href="${iconPaths['192x192']}">`;
      
      htmlContent = htmlContent.replace(appleIconRegex, newAppleIcon);
      
      // Sostituisci anche le icone con dimensioni specifiche
      const appleSizeIconRegex = /<link rel="apple-touch-icon" sizes="[^"]*"[^>]*href="[^"]*"[^>]*>/g;
      htmlContent = htmlContent.replace(appleSizeIconRegex, (match) => {
        const sizeMatch = match.match(/sizes="([^"]*)"/);
        if (sizeMatch) {
          return match.replace(/href="[^"]*"/, `href="${iconPaths['192x192']}"`);
        }
        return match;
      });

      fs.writeFileSync(htmlPath, htmlContent);
      console.log('✅ HTML aggiornato con le nuove icone');
    } catch (error) {
      console.error('❌ Errore durante l\'aggiornamento dell\'HTML:', error);
      throw new Error(`Errore durante l'aggiornamento dell'HTML: ${error.message}`);
    }
  }

  /**
   * Processo completo: converte immagine e aggiorna tutti i file necessari
   */
  async processCustomIcon(imageData: string | Buffer, baseName: string = 'custom-icon'): Promise<IconSizes> {
    try {
      let iconPaths: IconSizes;

      if (typeof imageData === 'string') {
        // È una stringa base64
        iconPaths = await this.convertBase64Image(imageData, baseName);
      } else {
        // È un Buffer
        iconPaths = await this.convertImageToIcons(imageData, baseName);
      }

      // Aggiorna manifest e HTML
      await this.updateManifestIcons(iconPaths);
      await this.updateHTMLIcons(iconPaths);

      return iconPaths;
    } catch (error) {
      console.error('❌ Errore durante il processo completo delle icone:', error);
      throw error;
    }
  }

  /**
   * Ripristina le icone predefinite (Fleur de Vie)
   */
  async restoreDefaultIcons(): Promise<IconSizes> {
    const defaultImagePath = path.join(process.cwd(), 'public', 'fleur-de-vie.jpg');
    
    try {
      const imageBuffer = fs.readFileSync(defaultImagePath);
      return await this.processCustomIcon(imageBuffer, 'icon');
    } catch (error) {
      console.error('❌ Errore durante il ripristino delle icone predefinite:', error);
      throw new Error(`Errore durante il ripristino delle icone predefinite: ${error.message}`);
    }
  }
}

export const iconConversionService = new IconConversionService();