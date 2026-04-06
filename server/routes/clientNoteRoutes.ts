// @ts-nocheck
import { Router } from 'express';
import { storage } from '../storage';
import multer from 'multer';
import { fileStorageService } from '../services/fileStorageService';

const router = Router();

const uploadNoteImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo file non supportato. Usa immagini JPG, PNG, GIF o WEBP'));
    }
  }
});

router.get("/api/client-notes/:clientId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });

  try {
    const clientId = parseInt(req.params.clientId);
    const notes = await storage.getClientNotes(clientId);
    res.json(notes);
  } catch (error) {
    console.error('Errore nel caricamento note cliente:', error);
    res.status(500).json({ message: "Errore nel caricamento delle note" });
  }
});

router.post("/api/client-notes", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });

  try {
    const { clientId, title, content, category } = req.body;

    const note = await storage.createClientNote({
      clientId: parseInt(clientId),
      title,
      content,
      category
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Errore durante la creazione della nota del cliente:', error);
    res.status(500).json({ error: 'Errore durante la creazione della nota del cliente' });
  }
});

router.put("/api/client-notes/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });

  try {
    const { id } = req.params;
    const { title, content, category } = req.body;

    const note = await storage.updateClientNote(parseInt(id), {
      title,
      content,
      category
    });

    if (!note) {
      return res.status(404).json({ error: 'Nota non trovata' });
    }

    res.json(note);
  } catch (error) {
    console.error('Errore durante l\'aggiornamento della nota del cliente:', error);
    res.status(500).json({ error: 'Errore durante l\'aggiornamento della nota del cliente' });
  }
});

router.delete("/api/client-notes/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });

  try {
    const { id } = req.params;
    const success = await storage.deleteClientNote(parseInt(id));

    if (!success) {
      return res.status(404).json({ error: 'Nota non trovata' });
    }

    res.json({ success: true, message: 'Nota eliminata con successo' });
  } catch (error) {
    console.error('Errore durante l\'eliminazione della nota del cliente:', error);
    res.status(500).json({ error: 'Errore durante l\'eliminazione della nota del cliente' });
  }
});

router.post("/api/client-notes/:id/upload-image", uploadNoteImage.single('image'), async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });

  try {
    const user = req.user as any;
    const noteId = parseInt(req.params.id);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nessuna immagine fornita' });
    }

    const note = await storage.getClientNote(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Nota non trovata' });
    }

    if (user.type !== 'admin') {
      const client = await storage.getClient(note.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Cliente non trovato' });
      }

      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const clientOwnerId = client.ownerId ?? client.userId;

      if (!clientOwnerId || clientOwnerId !== tenantId) {
        return res.status(403).json({ error: 'Non autorizzato a modificare questa nota' });
      }
    }

    const saved = await fileStorageService.saveFile(
      user.id,
      'client-notes',
      { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size },
      { noteId, clientId: note.clientId }
    );

    const currentImages = note.imagePaths || [];
    const updatedImages = [...currentImages, saved.url];

    const updatedNote = await storage.updateClientNote(noteId, {
      imagePaths: updatedImages
    });

    res.json({
      success: true,
      imagePath: saved.url,
      note: updatedNote
    });
  } catch (error) {
    console.error('Errore upload immagine nota:', error);
    res.status(500).json({ error: 'Errore durante il caricamento dell\'immagine' });
  }
});

router.delete("/api/client-notes/:id/delete-image/:index", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });

  try {
    const user = req.user as any;
    const noteId = parseInt(req.params.id);
    const imageIndex = parseInt(req.params.index);

    const note = await storage.getClientNote(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Nota non trovata' });
    }

    if (user.type !== 'admin') {
      const client = await storage.getClient(note.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Cliente non trovato' });
      }

      const tenantId = user.ownerId ?? user.tenantId ?? user.id;
      const clientOwnerId = client.ownerId ?? client.userId;

      if (!clientOwnerId || clientOwnerId !== tenantId) {
        return res.status(403).json({ error: 'Non autorizzato a modificare questa nota' });
      }
    }

    const currentImages = note.imagePaths || [];
    if (imageIndex < 0 || imageIndex >= currentImages.length) {
      return res.status(400).json({ error: 'Indice immagine non valido' });
    }

    const imageToDelete = currentImages[imageIndex];
    const fileIdMatch = imageToDelete.match(/\/api\/files\/(\d+)\//);
    if (fileIdMatch) {
      await fileStorageService.deleteFile(parseInt(fileIdMatch[1]));
    }

    const updatedImages = currentImages.filter((_, idx) => idx !== imageIndex);

    const updatedNote = await storage.updateClientNote(noteId, {
      imagePaths: updatedImages.length > 0 ? updatedImages : null
    });

    res.json({
      success: true,
      note: updatedNote
    });
  } catch (error) {
    console.error('Errore eliminazione immagine nota:', error);
    res.status(500).json({ error: 'Errore durante l\'eliminazione dell\'immagine' });
  }
});

export default router;
