// @ts-nocheck
import { Router, Request, Response } from 'express';
import { companyNameService } from '../services/companyNameService';

const router = Router();

// Get the company name settings
router.get('/company-name-settings', (req: Request, res: Response) => {
  try {
    const settings = companyNameService.getSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('Error retrieving company name settings:', error);
    res.status(500).json({ message: 'Error retrieving company name settings' });
  }
});

// Update the company name settings
router.post('/company-name-settings', (req: Request, res: Response) => {
  try {
    const success = companyNameService.saveSettings(req.body);
    
    if (success) {
      res.json({ message: 'Settings saved successfully' });
    } else {
      res.status(500).json({ message: 'Error saving settings' });
    }
  } catch (error: any) {
    console.error('Error saving company name settings:', error);
    res.status(500).json({ message: 'Error saving company name settings' });
  }
});

export default router;