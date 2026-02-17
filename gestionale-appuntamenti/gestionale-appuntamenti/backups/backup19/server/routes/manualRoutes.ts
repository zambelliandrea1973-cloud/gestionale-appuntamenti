import { Router } from 'express';
import { db } from '../db';
import { manualContent } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configurazione upload file per il manuale
const uploadDir = path.join(process.cwd(), 'uploads', 'manual');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitized}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per video
  fileFilter: (_req, file, cb) => {
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
    ];
    
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo file non supportato. Usa immagini (JPG, PNG, GIF, WEBP) o video (MP4, WEBM, MOV, AVI)'));
    }
  }
});

// POST: Upload singolo file per step manuale
router.post('/api/manual/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
    const fileUrl = `/uploads/manual/${file.filename}`;

    console.log(`📤 File manuale caricato: ${file.filename}, tipo: ${fileType}, dimensione: ${file.size} bytes`);

    return res.json({
      success: true,
      file: {
        url: fileUrl,
        type: fileType,
        filename: file.filename,
        size: file.size
      }
    });
  } catch (error) {
    console.error('❌ Errore upload file manuale:', error);
    return res.status(500).json({ 
      error: 'Errore durante l\'upload del file' 
    });
  }
});

// GET: Ottieni contenuto manuale per sezione e locale
router.get('/api/manual/content/:section/:locale', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const { section, locale } = req.params;

    const content = await db
      .select()
      .from(manualContent)
      .where(
        and(
          eq(manualContent.userId, req.user.id),
          eq(manualContent.section, section),
          eq(manualContent.locale, locale)
        )
      )
      .limit(1);

    if (content.length === 0) {
      return res.status(404).json({ error: 'Contenuto non trovato' });
    }

    return res.json(content[0]);
  } catch (error) {
    console.error('❌ Errore recupero contenuto manuale:', error);
    return res.status(500).json({ 
      error: 'Errore durante il recupero del contenuto' 
    });
  }
});

// GET: Ottieni tutte le sezioni per un locale
router.get('/api/manual/sections/:locale', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const { locale } = req.params;

    const sections = await db
      .select()
      .from(manualContent)
      .where(
        and(
          eq(manualContent.userId, req.user.id),
          eq(manualContent.locale, locale)
        )
      )
      .orderBy(manualContent.section);

    return res.json(sections);
  } catch (error) {
    console.error('❌ Errore recupero sezioni manuale:', error);
    return res.status(500).json({ 
      error: 'Errore durante il recupero delle sezioni' 
    });
  }
});

// POST: Crea o aggiorna contenuto manuale (UPSERT)
router.post('/api/manual/content', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const { section, locale, title, steps } = req.body;

    if (!section || !locale || !title || !steps) {
      return res.status(400).json({ 
        error: 'Campi obbligatori: section, locale, title, steps' 
      });
    }

    // Verifica se esiste già
    const existing = await db
      .select()
      .from(manualContent)
      .where(
        and(
          eq(manualContent.userId, req.user.id),
          eq(manualContent.section, section),
          eq(manualContent.locale, locale)
        )
      )
      .limit(1);

    let result;

    if (existing.length > 0) {
      // UPDATE: contenuto esistente
      const [updated] = await db
        .update(manualContent)
        .set({
          title,
          steps: JSON.stringify(steps),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(manualContent.userId, req.user.id),
            eq(manualContent.section, section),
            eq(manualContent.locale, locale)
          )
        )
        .returning();

      result = updated;
      console.log(`✅ Contenuto manuale aggiornato: sezione ${section}, locale ${locale}`);
    } else {
      // INSERT: nuovo contenuto
      const [created] = await db.insert(manualContent).values({
        userId: req.user.id,
        section,
        locale,
        title,
        steps: JSON.stringify(steps),
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      result = created;
      console.log(`✅ Contenuto manuale creato: sezione ${section}, locale ${locale}`);
    }

    return res.json({
      success: true,
      content: result
    });
  } catch (error) {
    console.error('❌ Errore salvataggio contenuto manuale:', error);
    return res.status(500).json({ 
      error: 'Errore durante il salvataggio del contenuto' 
    });
  }
});

// PUT: Aggiorna contenuto manuale esistente
router.put('/api/manual/content/:id', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const { id } = req.params;
    const { title, steps } = req.body;

    if (!title && !steps) {
      return res.status(400).json({ 
        error: 'Fornire almeno un campo da aggiornare: title o steps' 
      });
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (title) updateData.title = title;
    if (steps) updateData.steps = JSON.stringify(steps);

    const [updated] = await db
      .update(manualContent)
      .set(updateData)
      .where(
        and(
          eq(manualContent.id, parseInt(id)),
          eq(manualContent.userId, req.user.id)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ 
        error: 'Contenuto non trovato o permessi insufficienti' 
      });
    }

    console.log(`✅ Contenuto manuale aggiornato: ID ${id}`);

    return res.json({
      success: true,
      content: updated
    });
  } catch (error) {
    console.error('❌ Errore aggiornamento contenuto manuale:', error);
    return res.status(500).json({ 
      error: 'Errore durante l\'aggiornamento del contenuto' 
    });
  }
});

// DELETE: Elimina contenuto manuale
router.delete('/api/manual/content/:id', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const { id } = req.params;

    // Recupera il contenuto per eliminare i file associati
    const [content] = await db
      .select()
      .from(manualContent)
      .where(
        and(
          eq(manualContent.id, parseInt(id)),
          eq(manualContent.userId, req.user.id)
        )
      )
      .limit(1);

    if (!content) {
      return res.status(404).json({ 
        error: 'Contenuto non trovato o permessi insufficienti' 
      });
    }

    // Elimina file associati agli step
    try {
      const steps = JSON.parse(content.steps as string);
      for (const step of steps) {
        if (step.mediaFiles && Array.isArray(step.mediaFiles)) {
          for (const media of step.mediaFiles) {
            if (media.url && media.url.startsWith('/uploads/manual/')) {
              const filePath = path.join(process.cwd(), media.url);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ File eliminato: ${media.url}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Errore eliminazione file associati:', err);
    }

    // Elimina il record dal database
    await db
      .delete(manualContent)
      .where(
        and(
          eq(manualContent.id, parseInt(id)),
          eq(manualContent.userId, req.user.id)
        )
      );

    console.log(`✅ Contenuto manuale eliminato: ID ${id}`);

    return res.json({
      success: true,
      message: 'Contenuto eliminato con successo'
    });
  } catch (error) {
    console.error('❌ Errore eliminazione contenuto manuale:', error);
    return res.status(500).json({ 
      error: 'Errore durante l\'eliminazione del contenuto' 
    });
  }
});

// DELETE: Elimina singolo file
router.delete('/api/manual/file', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const { fileUrl } = req.body;

    if (!fileUrl || !fileUrl.startsWith('/uploads/manual/')) {
      return res.status(400).json({ error: 'URL file non valido' });
    }

    const filePath = path.join(process.cwd(), fileUrl);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ File eliminato: ${fileUrl}`);
      return res.json({
        success: true,
        message: 'File eliminato con successo'
      });
    } else {
      return res.status(404).json({ error: 'File non trovato' });
    }
  } catch (error) {
    console.error('❌ Errore eliminazione file:', error);
    return res.status(500).json({ 
      error: 'Errore durante l\'eliminazione del file' 
    });
  }
});

export default router;
