import { Router, Request, Response } from 'express';
import { createUnifiedUserDatabase, UNIFIED_FIELD_CODES } from '../user-database-unified';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// COLORE PRIMARIO (COD_002) - STESSO SISTEMA DEL NOME AZIENDALE
router.post('/primary-color', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { primaryColor } = req.body;
    
    console.log(`🎯 POST primary-color per User ID: ${userId}, Colore: "${primaryColor}"`);
    
    const userDb = createUnifiedUserDatabase(userId);
    const success = await userDb.setField(UNIFIED_FIELD_CODES.PRIMARY_COLOR, primaryColor);
    
    if (success) {
      console.log(`✅ COLORE PRIMARIO SALVATO SEPARATAMENTE per User ID ${userId}: "${primaryColor}"`);
      res.json({ message: 'Colore primario salvato con successo', userId, primaryColor });
    } else {
      res.status(500).json({ message: 'Errore durante il salvataggio del colore primario' });
    }
  } catch (error) {
    console.error('Errore durante il salvataggio del colore primario:', error);
    res.status(500).json({ message: 'Errore durante il salvataggio del colore primario' });
  }
});

// COLORE SECONDARIO (COD_003) - STESSO SISTEMA DEL NOME AZIENDALE
router.post('/secondary-color', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { secondaryColor } = req.body;
    
    console.log(`🎯 POST secondary-color per User ID: ${userId}, Colore: "${secondaryColor}"`);
    
    const userDb = createUnifiedUserDatabase(userId);
    const success = await userDb.setField(UNIFIED_FIELD_CODES.SECONDARY_COLOR, secondaryColor);
    
    if (success) {
      console.log(`✅ COLORE SECONDARIO SALVATO SEPARATAMENTE per User ID ${userId}: "${secondaryColor}"`);
      res.json({ message: 'Colore secondario salvato con successo', userId, secondaryColor });
    } else {
      res.status(500).json({ message: 'Errore durante il salvataggio del colore secondario' });
    }
  } catch (error) {
    console.error('Errore durante il salvataggio del colore secondario:', error);
    res.status(500).json({ message: 'Errore durante il salvataggio del colore secondario' });
  }
});

export default router;