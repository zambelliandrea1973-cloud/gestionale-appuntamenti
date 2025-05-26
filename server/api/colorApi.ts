import { Router, Request, Response } from 'express';
import { createUnifiedUserDatabase, UNIFIED_FIELD_CODES } from '../user-database-unified';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// COLORE PRIMARIO (COD_002) - ESATTO IDENTICO AL NOME AZIENDALE
router.post('/primary-color', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { primaryColor } = req.body;
    
    console.log(`🎯 COLORE PRIMARIO per User ID: ${userId}, Valore: "${primaryColor}"`);
    
    const userDb = createUnifiedUserDatabase(userId);
    const success = await userDb.setField(UNIFIED_FIELD_CODES.PRIMARY_COLOR, primaryColor);
    
    if (success) {
      console.log(`✅ COLORE SALVATO SEPARATAMENTE: "${primaryColor}" per utente ${userId}`);
      res.json({ 
        success: true, 
        message: 'Colore primario salvato con successo', 
        userId, 
        primaryColor 
      });
    } else {
      res.status(500).json({ success: false, message: 'Errore durante il salvataggio del colore primario' });
    }
  } catch (error) {
    console.error('Errore durante il salvataggio del colore primario:', error);
    res.status(500).json({ success: false, message: 'Errore durante il salvataggio del colore primario' });
  }
});

export default router;