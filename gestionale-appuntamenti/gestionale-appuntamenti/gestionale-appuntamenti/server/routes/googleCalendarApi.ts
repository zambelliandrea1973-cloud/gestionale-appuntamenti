import { Router } from 'express';
import { isAuthenticated } from '../auth';
import { syncBidirectional } from '../services/googleCalendarSync';
import { db } from '../db';
import { users, googleCalendarEvents } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/google-calendar/sync
 * Sincronizza gli appuntamenti con Google Calendar
 */
router.post('/sync', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    console.log(`📱 Richiesta sincronizzazione per utente ${userId}`);
    
    // Verifica che Google Calendar sia abilitato
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user.length || !user[0].googleCalendarEnabled) {
      return res.status(400).json({ error: 'Google Calendar non è abilitato' });
    }

    // Esegui sincronizzazione bidirezionale
    const result = await syncBidirectional(userId);
    
    res.json(result);
  } catch (error) {
    console.error('Errore sync Google Calendar:', error);
    res.status(500).json({ error: 'Errore sincronizzazione', details: String(error) });
  }
});

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
