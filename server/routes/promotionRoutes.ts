// @ts-nocheck
import { Router } from 'express';
import { db } from '../db';
import { marketingCampaigns } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import { fileStorageService } from '../services/fileStorageService';

const router = Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Genera codice univoco
function generateUniqueCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

router.post('/api/promotions/create', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const { title, message } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!title || !message) {
      return res.status(400).json({ error: 'Titolo e messaggio obbligatori' });
    }

    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];

    if (files && files.length > 0) {
      for (const file of files) {
        if (!validTypes.includes(file.mimetype)) {
          return res.status(400).json({ 
            error: 'Tipo file non supportato. Usa immagini (JPG, PNG, GIF, WEBP) o video (MP4, WEBM)' 
          });
        }
      }
    }

    const code = generateUniqueCode();

    const attachmentPaths: string[] = [];
    const attachmentTypes: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const saved = await fileStorageService.saveFile(
          req.user.id,
          'promotions',
          { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size },
          { campaignCode: code }
        );
        attachmentPaths.push(saved.url);
        attachmentTypes.push(file.mimetype.startsWith('image/') ? 'image' : 'video');
      }
    }

    const [campaign] = await db.insert(marketingCampaigns).values({
      userId: req.user.id,
      title,
      message,
      uniqueCode: code,
      attachmentPaths: attachmentPaths.length > 0 ? attachmentPaths : null,
      attachmentTypes: attachmentTypes.length > 0 ? attachmentTypes : null,
      createdAt: new Date()
    }).returning();

    return res.json({
      success: true,
      code: campaign.uniqueCode,
      id: campaign.id,
      filesCount: attachmentPaths.length
    });
  } catch (error: any) {
    console.error('❌ Errore creazione promozione:', error);
    return res.status(500).json({ 
      error: 'Errore durante la creazione della promozione' 
    });
  }
});

router.get('/api/promotions/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({ error: 'Codice promozione mancante' });
    }
      const campaigns = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.uniqueCode, code))
        .limit(1);

      if (campaigns.length === 0) {
        return res.status(404).json({ error: 'Promozione non trovata' });
      }

      const campaign = campaigns[0];

      return res.json({
        success: true,
        campaign: {
          id: campaign.id,
          title: campaign.title,
          message: campaign.message,
          attachmentPaths: campaign.attachmentPaths,
          attachmentTypes: campaign.attachmentTypes,
          createdAt: campaign.createdAt
        }
      });
  } catch (error: any) {
    console.error('❌ Errore caricamento promozione:', error);
    return res.status(500).json({ 
      error: 'Errore durante il caricamento della promozione' 
    });
  }
});

export default router;
