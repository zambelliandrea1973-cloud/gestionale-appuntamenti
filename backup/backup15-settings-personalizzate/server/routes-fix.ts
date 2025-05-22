// Aggiungi queste righe in cima al file routes.ts (nelle importazioni)
// import { companyNameService } from "./services/companyNameService";

// Aggiungi queste righe appena prima di "return httpServer;"
/*
  // API per gestire le impostazioni del nome aziendale
  app.get('/api/company-name-settings', (req: Request, res: Response) => {
    try {
      const settings = companyNameService.getSettings();
      res.json(settings);
    } catch (error) {
      console.error('Errore durante il recupero delle impostazioni del nome aziendale:', error);
      res.status(500).json({ message: 'Errore durante il recupero delle impostazioni del nome aziendale' });
    }
  });
  
  app.post('/api/company-name-settings', (req: Request, res: Response) => {
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
*/