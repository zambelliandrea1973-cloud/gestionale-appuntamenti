import { Router, Request, Response } from 'express';
import { pushNotificationService } from '../services/pushNotificationService';
import { db } from '../db';
import { clients } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Save subscription per push notifications
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { clientId, ownerId, subscription } = req.body;
    
    if (!clientId || !ownerId || !subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dati subscription mancanti' 
      });
    }
    
    // Verify that the client exists
    const client = await db.select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    
    if (client.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }
    
    const saved = await pushNotificationService.saveSubscription(
      clientId, 
      ownerId, 
      subscription
    );
    
    if (saved) {
      res.json({ success: true, message: 'Notifiche push attivate' });
    } else {
      res.status(500).json({ success: false, error: 'Error saving subscription' });
    }
  } catch (error) {
    console.error('❌ [PUSH API] Error in subscribe:', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// Rimuovi subscription
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ClientId missing' 
      });
    }
    
    const removed = await pushNotificationService.removeSubscription(clientId);
    
    if (removed) {
      res.json({ success: true, message: 'Notifiche push disattivate' });
    } else {
      res.status(500).json({ success: false, error: 'Error removing subscription' });
    }
  } catch (error) {
    console.error('❌ [PUSH API] Error in unsubscribe:', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// Verify stato subscription
router.get('/status/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ClientId invalid' 
      });
    }
    
    const hasSubscription = await pushNotificationService.hasActiveSubscription(clientId);
    
    res.json({ 
      success: true, 
      subscribed: hasSubscription 
    });
  } catch (error) {
    console.error('❌ [PUSH API] Error status:', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// Get VAPID public key for the frontend
router.get('/vapid-public-key', (req: Request, res: Response) => {
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY || '';
  
  if (!publicKey) {
    return res.status(500).json({ 
      success: false, 
      error: 'VAPID key not configured' 
    });
  }
  
  res.json({ 
    success: true, 
    publicKey 
  });
});

// Test notifica (only per debug)
router.post('/test/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ClientId invalid' 
      });
    }
    
    const sent = await pushNotificationService.sendToClient(clientId, {
      title: 'Test Notifica',
      body: 'This is a test notification!',
      url: '/client'
    });
    
    res.json({ 
      success: sent, 
      message: sent ? 'Notification sent' : 'No active subscription'
    });
  } catch (error) {
    console.error('❌ [PUSH API] Error in test:', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

export default router;
