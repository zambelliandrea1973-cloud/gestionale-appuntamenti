// Add these lines at the top of routes.ts (in imports)
// import { companyNameService } from "./services/companyNameService";

// Add these lines just before "return httpServer;"
/*
  // API for managing company name settings
  app.get('/api/company-name-settings', (req: Request, res: Response) => {
    try {
      const settings = companyNameService.getSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error retrieving company name settings:', error);
      res.status(500).json({ message: 'Error retrieving company name settings' });
    }
  });
  
  app.post('/api/company-name-settings', (req: Request, res: Response) => {
    try {
      const success = companyNameService.saveSettings(req.body);
      if (success) {
        res.json({ message: 'Settings saved successfully' });
      } else {
        res.status(500).json({ message: 'Error saving settings' });
      }
    } catch (error) {
      console.error('Error saving company name settings:', error);
      res.status(500).json({ message: 'Error saving company name settings' });
    }
  });
*/