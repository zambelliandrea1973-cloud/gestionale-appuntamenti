import { Router, Request, Response } from 'express';
import { db } from '../db';
import { notificationSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * 📱 GET /api/notification-settings - Carica impostazioni di notifica
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Non autorizzato' });

    let settings = await db.query.notificationSettings.findFirst({
      where: eq(notificationSettings.userId, userId),
    });

    if (!settings) {
      settings = await db.insert(notificationSettings).values({
        userId,
        emailEnabled: false,
        notificationCenterEnabled: true,
        defaultReminderTime: 24,
      }).returning().then(r => r[0]);
    }

    console.log(`✅ [NOTIFICATION SETTINGS] Impostazioni caricate per utente ${userId}`);
    res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('❌ [NOTIFICATION SETTINGS] Errore caricamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 📱 POST /api/notification-settings - Salva impostazioni di notifica
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Non autorizzato' });

    const settingsData = { ...req.body, updatedAt: new Date() };
    const existing = await db.query.notificationSettings.findFirst({
      where: eq(notificationSettings.userId, userId),
    });

    if (existing) {
      await db.update(notificationSettings)
        .set(settingsData)
        .where(eq(notificationSettings.userId, userId));
    } else {
      await db.insert(notificationSettings)
        .values({ userId, ...settingsData });
    }

    console.log(`✅ [NOTIFICATION SETTINGS] Impostazioni salvate per utente ${userId}`);
    res.json({ success: true, data: settingsData, message: 'Impostazioni salvate con successo' });
  } catch (error: any) {
    console.error('❌ [NOTIFICATION SETTINGS] Errore salvataggio:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
