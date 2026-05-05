// @ts-nocheck
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { notificationSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * 📱 GET /api/notification-settings - Load notification settings
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    let settings = await db.query.notificationSettings.findFirst({
      where: eq((notificationSettings as any).userId, userId),
    });

    if (!settings) {
      settings = await db.insert(notificationSettings).values({
        userId,
        emailEnabled: false,
        notificationCenterEnabled: true,
        defaultReminderTime: 24,
      }).returning().then(r => r[0]);
    }

    console.log(`✅ [NOTIFICATION SETTINGS] Settings loaded for user ${userId}`);
    res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('❌ [NOTIFICATION SETTINGS] Error loading:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 📱 POST /api/notification-settings - Save notification settings
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const settingsData = { ...req.body, updatedAt: new Date() };
    const existing = await db.query.notificationSettings.findFirst({
      where: eq((notificationSettings as any).userId, userId),
    });

    if (existing) {
      await db.update(notificationSettings)
        .set(settingsData)
        .where(eq((notificationSettings as any).userId, userId));
    } else {
      await db.insert(notificationSettings)
        .values({ userId, ...settingsData });
    }

    console.log(`✅ [NOTIFICATION SETTINGS] Settings saved for user ${userId}`);
    res.json({ success: true, data: settingsData, message: 'Settings saved successfully' });
  } catch (error: any) {
    console.error('❌ [NOTIFICATION SETTINGS] Error saving:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
