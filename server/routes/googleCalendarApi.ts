import { Router } from 'express';
import { isAuthenticated } from '../auth';
import { db } from '../db';
import { users, googleCalendarEvents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';
import { EncryptionService } from '../services/encryption';
import { previewLegacyDemoGoogleEvents } from '../services/legacyDemoGoogleCleanup';
import { syncBidirectional, cleanupDuplicateAppointments } from '../services/googleCalendarSync';

const router = Router();

/**
 * GET /api/google-calendar/legacy-demo-preview
 * Read-only scan of Google Calendar for legacy demo copies.
 */
router.get('/legacy-demo-preview', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const preview = await previewLegacyDemoGoogleEvents(userId);
    res.setHeader('Cache-Control', 'no-store');
    return res.json(preview);
  } catch (error) {
    console.error('Error previewing legacy demo Google events:', error);
    return res.status(500).json({ error: 'Unable to analyze Google Calendar events' });
  }
});

/**
 * GET /api/google-calendar/check-event/:eventId
 * Check if an event exists on Google Calendar
 */
router.get('/check-event/:eventId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;

    const result = await cleanupDuplicateAppointments(userId);
    const eventId = req.params.eventId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user.length || !user[0].googleAuthToken) {
      return res.json({ exists: false, error: 'Google token not available' });
    }
    
    const decryptedTokenStr = EncryptionService.decryptToken(user[0].googleAuthToken);
    const tokens = JSON.parse(decryptedTokenStr);
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(tokens);
    
    oauth2Client.on('tokens', async (newTokens) => {
      try {
        const merged = { ...tokens, ...newTokens };
        const encrypted = EncryptionService.encrypt(JSON.stringify(merged));
        await db.update(users).set({ googleAuthToken: encrypted }).where(eq(users.id, userId));
      } catch (err) {
        console.error(`❌ [CALENDAR-API] Error saving refreshed token:`, err);
      }
    });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = user[0].googleCalendarId || 'primary';
    
    try {
      const event = await calendar.events.get({ calendarId, eventId });
      res.json({ 
        exists: true, 
        status: event.data.status,
        summary: event.data.summary,
        start: event.data.start,
        eventId,
        calendarId
      });
    } catch (eventError: any) {
      if (eventError.code === 404) {
        res.json({ exists: false, reason: 'Event not found (404)', eventId, calendarId });
      } else if (eventError.code === 410) {
        res.json({ exists: false, reason: 'Event deleted (410 Gone)', eventId, calendarId });
      } else {
        res.json({ exists: false, error: String(eventError), eventId, calendarId });
      }
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/google-calendar/cleanup-duplicates
 * Finds and removes duplicate "importedFromGoogle" appointments that shadow
 * a native appointment at the same date+startTime slot.
 */
router.post('/cleanup-duplicates', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;

    const result = await cleanupDuplicateAppointments(userId);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count synced events
    const syncedEvents = await db.select().from(googleCalendarEvents);
    
    res.json({
      googleCalendarEnabled: user[0].googleCalendarEnabled,
      lastSyncAt: user[0].lastGoogleSyncAt,
      googleCalendarId: user[0].googleCalendarId || 'primary',
      totalSyncedEvents: syncedEvents.length
    });
  } catch (error) {
    console.error('Error getting Google Calendar status:', error);
    res.status(500).json({ error: 'Error reading status' });
  }
});

export default router;
