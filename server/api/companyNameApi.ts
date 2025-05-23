import { Router, Request, Response } from 'express';
import { UserDatabaseSystem, FIELD_CODES } from '../user-database-system';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// Ottieni le impostazioni del nome aziendale CON SISTEMA CODICI UNIVOCI
router.get('/company-settings-v2', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log(`🎯 *** GET /api/company-name-settings CHIAMATO ***`);
    const userId = req.user!.id;
    console.log(`🎯 GET company-name-settings per User ID: ${userId}`);
    
    const userDb = new UserDatabaseSystem(userId);
    const businessName = await userDb.getValue(FIELD_CODES.BUSINESS_NAME);
    
    const settings = {
      businessName: businessName || `Attività ${userId}`,
      userId: userId
    };
    
    console.log(`✅ SETTINGS CARICATI per User ID ${userId}: ${JSON.stringify(settings)}`);
    console.log(`🎯 *** RETURNING JSON: ${JSON.stringify(settings)} ***`);
    res.json(settings);
  } catch (error) {
    console.error('Errore durante il recupero delle impostazioni del nome aziendale:', error);
    res.status(500).json({ message: 'Errore durante il recupero delle impostazioni del nome aziendale' });
  }
});

// Aggiorna le impostazioni del nome aziendale CON SISTEMA CODICI UNIVOCI
router.post('/company-settings-v2', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { businessName } = req.body;
    
    console.log(`🎯 POST company-name-settings per User ID: ${userId}, Nome: "${businessName}"`);
    
    const userDb = new UserDatabaseSystem(userId);
    const success = await userDb.setValue(FIELD_CODES.BUSINESS_NAME, businessName);
    
    if (success) {
      console.log(`✅ NOME AZIENDALE SALVATO SEPARATAMENTE per User ID ${userId}: "${businessName}"`);
      res.json({ message: 'Impostazioni salvate con successo', userId, businessName });
    } else {
      res.status(500).json({ message: 'Errore durante il salvataggio delle impostazioni' });
    }
  } catch (error) {
    console.error('Errore durante il salvataggio delle impostazioni del nome aziendale:', error);
    res.status(500).json({ message: 'Errore durante il salvataggio delle impostazioni del nome aziendale' });
  }
});

export default router;