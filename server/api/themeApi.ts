// @ts-nocheck
import { Router, Request, Response } from 'express';
import { createUnifiedUserDatabase, UNIFIED_FIELD_CODES } from '../user-database-unified';
import { ensureAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// THEME (COD_005) - EXACTLY IDENTICAL TO THE BUSINESS NAME
router.post('/theme', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { theme } = req.body;
    
    console.log(`🎯 Theme for User ID: ${userId}, Value: "${theme}"`);
    
    const userDb = createUnifiedUserDatabase(userId);
    const success = await userDb.setField(UNIFIED_FIELD_CODES.THEME, theme);
    
    if (success) {
      console.log(`✅ Theme saved separately: "${theme}" for user ${userId}`);
      res.json({ 
        success: true, 
        message: 'Theme saved successfully', 
        userId, 
        theme 
      });
    } else {
      res.status(500).json({ success: false, message: 'Error saving theme' });
    }
  } catch (error: any) {
    console.error('Error saving theme:', error);
    res.status(500).json({ success: false, message: 'Error saving theme' });
  }
});

export default router;