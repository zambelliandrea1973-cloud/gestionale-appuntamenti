import { Router, Request, Response } from 'express';
import { companyNameService } from '../services/companyNameService';

const router = Router();

// Ottieni le impostazioni del nome aziendale
router.get('/company-name-settings', (req: Request, res: Response) => {
  try {
    const settings = companyNameService.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Errore durante il recupero delle impostazioni del nome aziendale:', error);
    res.status(500).json({ message: 'Errore durante il recupero delle impostazioni del nome aziendale' });
  }
});

// Aggiorna le impostazioni del nome aziendale
router.post('/company-name-settings', (req: Request, res: Response) => {
  try {
    const success = companyNameService.saveSettings(req.body);
    
    if (success) {
      res.json({ message: 'Impostazioni salvate con successo' });
    } else {
      res.status(500).json({ message: 'Errore durante il salvataggio delle impostazioni' });
    }
  } catch (error) {
    console.error('Errore durante il salvataggio delle impostazioni del nome aziendale:', error);
    res.status(500).json({ message: 'Errore durante il salvataggio delle impostazioni del nome aziendale' });
  }
});

export default router;