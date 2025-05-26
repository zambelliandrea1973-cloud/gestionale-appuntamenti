import { Router, Request, Response } from 'express';
import { createUnifiedUserDatabase, UNIFIED_FIELD_CODES } from '../user-database-unified';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// TEMA (COD_005) - ESATTO IDENTICO AL NOME AZIENDALE
router.post('/theme', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { theme } = req.body;
    
    console.log(`🎯 TEMA per User ID: ${userId}, Valore: "${theme}"`);
    
    const userDb = createUnifiedUserDatabase(userId);
    const success = await userDb.setField(UNIFIED_FIELD_CODES.THEME, theme);
    
    if (success) {
      console.log(`✅ TEMA SALVATO SEPARATAMENTE: "${theme}" per utente ${userId}`);
      res.json({ 
        success: true, 
        message: 'Tema salvato con successo', 
        userId, 
        theme 
      });
    } else {
      res.status(500).json({ success: false, message: 'Errore durante il salvataggio del tema' });
    }
  } catch (error) {
    console.error('Errore durante il salvataggio del tema:', error);
    res.status(500).json({ success: false, message: 'Errore durante il salvataggio del tema' });
  }
});

export default router;