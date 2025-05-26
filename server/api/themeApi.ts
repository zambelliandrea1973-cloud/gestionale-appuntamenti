import { Router, Request, Response } from 'express';
import { createUnifiedUserDatabase, UNIFIED_FIELD_CODES } from '../user-database-unified';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// TEMA (COD_005) - STESSO SISTEMA DEL NOME AZIENDALE
router.post('/theme', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { theme } = req.body;
    
    console.log(`🎯 POST theme per User ID: ${userId}, Tema: "${theme}"`);
    
    const userDb = createUnifiedUserDatabase(userId);
    const success = await userDb.setField(UNIFIED_FIELD_CODES.THEME, theme);
    
    if (success) {
      console.log(`✅ TEMA SALVATO SEPARATAMENTE per User ID ${userId}: "${theme}"`);
      res.json({ message: 'Tema salvato con successo', userId, theme });
    } else {
      res.status(500).json({ message: 'Errore durante il salvataggio del tema' });
    }
  } catch (error) {
    console.error('Errore durante il salvataggio del tema:', error);
    res.status(500).json({ message: 'Errore durante il salvataggio del tema' });
  }
});

// ASPETTO (COD_006) - STESSO SISTEMA DEL NOME AZIENDALE
router.post('/appearance', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { appearance } = req.body;
    
    console.log(`🎯 POST appearance per User ID: ${userId}, Aspetto: "${appearance}"`);
    
    const userDb = createUnifiedUserDatabase(userId);
    const success = await userDb.setField(UNIFIED_FIELD_CODES.APPEARANCE, appearance);
    
    if (success) {
      console.log(`✅ ASPETTO SALVATO SEPARATAMENTE per User ID ${userId}: "${appearance}"`);
      res.json({ message: 'Aspetto salvato con successo', userId, appearance });
    } else {
      res.status(500).json({ message: 'Errore durante il salvataggio dell\'aspetto' });
    }
  } catch (error) {
    console.error('Errore durante il salvataggio dell\'aspetto:', error);
    res.status(500).json({ message: 'Errore durante il salvataggio dell\'aspetto' });
  }
});

export default router;