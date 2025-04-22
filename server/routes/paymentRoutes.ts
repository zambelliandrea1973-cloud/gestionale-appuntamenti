import { Router } from 'express';
import { PaymentService } from '../services/paymentService';
import { WiseService } from '../services/wiseService';
import { isAdmin, isAuthenticated } from '../auth';

const router = Router();

/**
 * Endpoint per ottenere tutti i piani di abbonamento attivi
 * GET /api/payments/plans
 * Accesso: pubblico
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await PaymentService.getActivePlans();
    return res.json(plans);
  } catch (error) {
    console.error('Errore durante il recupero dei piani di abbonamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per creare un nuovo piano di abbonamento
 * POST /api/payments/plans
 * Accesso: admin
 */
router.post('/plans', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description, price, interval, features, clientLimit, sortOrder } = req.body;
    
    if (!name || !price || !interval) {
      return res.status(400).json({
        success: false,
        message: 'Nome, prezzo e intervallo sono obbligatori'
      });
    }
    
    const result = await PaymentService.createSubscriptionPlan({
      name,
      description,
      price: parseInt(price), // Converti in intero per sicurezza
      interval,
      features,
      clientLimit: clientLimit ? parseInt(clientLimit) : undefined,
      sortOrder: sortOrder ? parseInt(sortOrder) : undefined
    });
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Errore durante la creazione del piano di abbonamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per iniziare un abbonamento con PayPal
 * POST /api/payments/paypal/subscribe
 * Accesso: utente autenticato
 */
router.post('/paypal/subscribe', isAuthenticated, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user!.id;
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'ID del piano è obbligatorio'
      });
    }
    
    // Costruisci gli URL di ritorno
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const returnUrl = `${baseUrl}/payment/success`;
    const cancelUrl = `${baseUrl}/payment/cancel`;
    
    const result = await PaymentService.createPayPalSubscription(
      userId,
      parseInt(planId),
      returnUrl,
      cancelUrl
    );
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Errore durante la creazione dell\'abbonamento PayPal:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per finalizzare un abbonamento PayPal dopo l'approvazione dell'utente
 * POST /api/payments/paypal/capture
 * Accesso: utente autenticato
 */
router.post('/paypal/capture', isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user!.id;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'ID dell\'ordine è obbligatorio'
      });
    }
    
    const result = await PaymentService.finalizePayPalSubscription(orderId, userId);
    
    return res.json(result);
  } catch (error) {
    console.error('Errore durante la finalizzazione dell\'abbonamento PayPal:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per iniziare un abbonamento con Wise
 * POST /api/payments/wise/subscribe
 * Accesso: utente autenticato
 */
router.post('/wise/subscribe', isAuthenticated, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user!.id;
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'ID del piano è obbligatorio'
      });
    }
    
    // Ottieni prima informazioni sul piano
    const plan = await req.app.locals.storage.getSubscriptionPlan(parseInt(planId));
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Piano non trovato'
      });
    }
    
    // Ottieni la sottoscrizione (se esiste già)
    const subscription = await req.app.locals.storage.getSubscriptionByUserId(userId);
    if (!subscription) {
      // Crea una nuova sottoscrizione
      const currentDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.interval === 'month' ? 1 : 12));
      
      const subscriptionData = {
        userId,
        planId: parseInt(planId),
        status: 'pending',
        currentPeriodStart: currentDate,
        currentPeriodEnd: endDate,
        cancelAtPeriodEnd: false,
        paymentMethod: 'wise'
      };
      
      const newSubscription = await req.app.locals.storage.createSubscription(subscriptionData);
      
      // Crea il pagamento con Wise
      const result = await WiseService.createSubscriptionPayment(
        userId,
        newSubscription.id,
        plan.price
      );
      
      return res.json(result);
    } else {
      // Aggiorna la sottoscrizione esistente
      await req.app.locals.storage.updateSubscription(subscription.id, {
        planId: parseInt(planId),
        status: 'pending',
        paymentMethod: 'wise'
      });
      
      // Crea il pagamento con Wise
      const result = await WiseService.createSubscriptionPayment(
        userId,
        subscription.id,
        plan.price
      );
      
      return res.json(result);
    }
  } catch (error) {
    console.error('Errore durante la creazione dell\'abbonamento Wise:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per gestire le notifiche webhook da Wise
 * POST /api/payments/wise/webhook
 * Accesso: pubblico (ma verificato dal token)
 */
router.post('/wise/webhook', async (req, res) => {
  try {
    // Verifica della firma (in un ambiente di produzione)
    // ...
    
    const result = await WiseService.handleWebhookEvent(req.body);
    
    return res.json(result);
  } catch (error) {
    console.error('Errore durante la gestione del webhook Wise:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per ottenere informazioni sull'abbonamento dell'utente
 * GET /api/payments/subscription
 * Accesso: utente autenticato
 */
router.get('/subscription', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const subscription = await PaymentService.getUserSubscription(userId);
    
    if (!subscription) {
      return res.json({
        active: false,
        message: 'Nessun abbonamento attivo'
      });
    }
    
    return res.json({
      active: subscription.status === 'active',
      subscription
    });
  } catch (error) {
    console.error('Errore durante il recupero dell\'abbonamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per cancellare un abbonamento
 * POST /api/payments/subscription/cancel
 * Accesso: utente autenticato
 */
router.post('/subscription/cancel', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { immediate } = req.body;
    
    const result = await PaymentService.cancelSubscription(userId, immediate);
    
    return res.json(result);
  } catch (error) {
    console.error('Errore durante la cancellazione dell\'abbonamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per ottenere la cronologia delle transazioni dell'utente
 * GET /api/payments/transactions
 * Accesso: utente autenticato
 */
router.get('/transactions', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const transactions = await PaymentService.getUserTransactions(userId);
    
    return res.json(transactions);
  } catch (error) {
    console.error('Errore durante il recupero delle transazioni:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per ottenere tutti gli abbonamenti (admin)
 * GET /api/payments/admin/subscriptions
 * Accesso: admin
 */
router.get('/admin/subscriptions', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const subscriptions = await req.app.locals.storage.getActiveSubscriptions();
    return res.json(subscriptions);
  } catch (error) {
    console.error('Errore durante il recupero degli abbonamenti:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

export default router;