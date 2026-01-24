import { Router, Request, Response } from 'express';
import { pushNotificationService } from '../services/pushNotificationService';
import { db } from '../db';
import { clients } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Salva subscription per push notifications
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { clientId, ownerId, subscription } = req.body;
    
    if (!clientId || !ownerId || !subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dati subscription mancanti' 
      });
    }
    
    // Verifica che il cliente esista
    const client = await db.select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    
    if (client.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cliente non trovato' 
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
      res.status(500).json({ success: false, error: 'Errore salvataggio subscription' });
    }
  } catch (error) {
    console.error('❌ [PUSH API] Errore subscribe:', error);
    res.status(500).json({ success: false, error: 'Errore interno' });
  }
});

// Rimuovi subscription
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ClientId mancante' 
      });
    }
    
    const removed = await pushNotificationService.removeSubscription(clientId);
    
    if (removed) {
      res.json({ success: true, message: 'Notifiche push disattivate' });
    } else {
      res.status(500).json({ success: false, error: 'Errore rimozione subscription' });
    }
  } catch (error) {
    console.error('❌ [PUSH API] Errore unsubscribe:', error);
    res.status(500).json({ success: false, error: 'Errore interno' });
  }
});

// Verifica stato subscription
router.get('/status/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ClientId non valido' 
      });
    }
    
    const hasSubscription = await pushNotificationService.hasActiveSubscription(clientId);
    
    res.json({ 
      success: true, 
      subscribed: hasSubscription 
    });
  } catch (error) {
    console.error('❌ [PUSH API] Errore status:', error);
    res.status(500).json({ success: false, error: 'Errore interno' });
  }
});

// Ottieni VAPID public key per il frontend
router.get('/vapid-public-key', (req: Request, res: Response) => {
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY || '';
  
  if (!publicKey) {
    return res.status(500).json({ 
      success: false, 
      error: 'VAPID key non configurata' 
    });
  }
  
  res.json({ 
    success: true, 
    publicKey 
  });
});

// Test notifica (solo per debug)
router.post('/test/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ClientId non valido' 
      });
    }
    
    const sent = await pushNotificationService.sendToClient(clientId, {
      title: 'Test Notifica',
      body: 'Questa è una notifica di test!',
      url: '/client'
    });
    
    res.json({ 
      success: sent, 
      message: sent ? 'Notifica inviata' : 'Nessuna subscription attiva'
    });
  } catch (error) {
    console.error('❌ [PUSH API] Errore test:', error);
    res.status(500).json({ success: false, error: 'Errore interno' });
  }
});

export default router;
