// @ts-nocheck
import { Router, Request, Response } from 'express';
import { createUnifiedUserDatabase, UNIFIED_FIELD_CODES } from '../user-database-unified';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// COLORE PRIMARIO (COD_002) - ESATTO IDENTICO AL NOME AZIENDALE
router.post('/primary-color', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { primaryColor } = req.body;
    
    console.log(`🎯 PRIMARY COLOR for User ID: ${userId}, Value: "${primaryColor}"`);
    
    const userDb = createUnifiedUserDatabase(userId);
    const success = await userDb.setField(UNIFIED_FIELD_CODES.PRIMARY_COLOR, primaryColor);
    
    if (success) {
      console.log(`✅ COLOR SAVED: "${primaryColor}" for user ${userId}`);
      res.json({ 
        success: true, 
        message: 'Primary color saved successfully', 
        userId, 
        primaryColor 
      });
    } else {
      res.status(500).json({ success: false, message: 'Error saving primary color' });
    }
  } catch (error: any) {
    console.error('Error saving primary color:', error);
    res.status(500).json({ success: false, message: 'Error saving primary color' });
  }
});

export default router;