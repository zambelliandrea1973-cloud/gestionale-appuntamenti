// @ts-nocheck
import { Router } from 'express';
import { fileStorageService } from '../services/fileStorageService';

const router = Router();

router.get('/api/files/:id/:filename', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const file = await fileStorageService.getFile(id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': file.data.length.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${file.filename}"`,
    });
    res.send(file.data);
  } catch (error: any) {
    console.error('[FILE] Error serving file:', error);
    res.status(500).json({ error: 'Error retrieving file' });
  }
});

export default router;
