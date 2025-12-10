import { Router } from 'express';
import { isAuthenticated } from '../auth';
import { syncBidirectional } from '../services/googleCalendarSync';
import { db } from '../db';
import { users, googleCalendarEvents } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// NOTA: L'endpoint POST /sync è stato spostato in simple-routes.ts
// per evitare conflitti di routing

/**
 * GET /api/google-calendar/status
 * Ottieni stato sincronizzazione
 */
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user.length) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Conta eventi sincronizzati
    const syncedEvents = await db.select().from(googleCalendarEvents);
    
    res.json({
      googleCalendarEnabled: user[0].googleCalendarEnabled,
      lastSyncAt: user[0].lastGoogleSyncAt,
      googleCalendarId: user[0].googleCalendarId || 'primary',
      totalSyncedEvents: syncedEvents.length
    });
  } catch (error) {
    console.error('Errore status Google Calendar:', error);
    res.status(500).json({ error: 'Errore lettura stato' });
  }
});

export default router;
