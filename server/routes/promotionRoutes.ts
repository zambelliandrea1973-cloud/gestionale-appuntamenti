// @ts-nocheck
import { Router } from 'express';
import { db } from '../db';
import { marketingCampaigns } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configurazione upload file
const uploadDir = path.join(process.cwd(), 'uploads', 'promotions');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Genera codice univoco
function generateUniqueCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST: Crea nuova promozione con file multipli
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

    // Validazione mime-type per tutti i file (sicurezza)
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];

    if (files && files.length > 0) {
      for (const file of files) {
        if (!validTypes.includes(file.mimetype)) {
          // Elimina tutti i file caricati se uno è invalido
          files.forEach(f => fs.unlinkSync(f.path));
          return res.status(400).json({ 
            error: 'Tipo file non supportato. Usa immagini (JPG, PNG, GIF, WEBP) o video (MP4, WEBM)' 
          });
        }
      }
    }

    // Genera codice univoco
    const code = generateUniqueCode();

    // Crea array di paths e types
    const attachmentPaths: string[] = [];
    const attachmentTypes: string[] = [];

    if (files && files.length > 0) {
      files.forEach(file => {
        attachmentPaths.push(`/uploads/promotions/${file.filename}`);
        attachmentTypes.push(file.mimetype.startsWith('image/') ? 'image' : 'video');
      });
    }

    // Salva nel database
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
