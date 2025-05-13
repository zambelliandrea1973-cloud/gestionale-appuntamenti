import express from 'express';
import { storage } from '../storage';
import { isPaymentAdmin } from '../middleware/paymentAdminAuth';
import { isAdminOrStaff } from '../middleware/authMiddleware';
import Stripe from 'stripe';
import { Client } from '@paypal/paypal-server-sdk';

// Creazione del router Express
const router = express.Router();

// Configurazione del client Stripe (se le credenziali esistono)
const setupStripeClient = (secretKey: string) => {
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
};

// Configurazione del client PayPal (se le credenziali esistono)
const setupPaypalClient = (clientId: string, clientSecret: string, mode: 'sandbox' | 'live') => {
  const Environment = mode === 'sandbox' 
    ? require('@paypal/paypal-server-sdk').SandboxEnvironment 
    : require('@paypal/paypal-server-sdk').LiveEnvironment;
  return new Client({
    clientId: clientId,
    clientSecret: clientSecret,
    environment: new Environment(clientId, clientSecret)
  });
};

/**
 * Ottiene i metodi di pagamento configurati
 * GET /api/payments/payment-admin/payment-methods
 * Accesso: payment admin
 */
router.get('/payment-admin/payment-methods', isPaymentAdmin, async (req, res) => {
  try {
    const paymentMethods = await storage.getPaymentMethods();
    
    if (!paymentMethods || paymentMethods.length === 0) {
      // Se non ci sono metodi configurati, restituisci un array vuoto
      return res.json([]);
    }
    
    // Maschera le chiavi segrete prima di inviarle al client
    const sanitizedMethods = paymentMethods.map(method => {
      const sanitizedConfig = { ...method.config };
      
      // Maschera le credenziali sensibili
      if (method.id === 'stripe') {
        if (sanitizedConfig.secretKey) sanitizedConfig.secretKey = '••••••••';
        if (sanitizedConfig.webhookSecret) sanitizedConfig.webhookSecret = '••••••••';
      } else if (method.id === 'paypal') {
        if (sanitizedConfig.clientSecret) sanitizedConfig.clientSecret = '••••••••';
      } else if (method.id === 'wise') {
        if (sanitizedConfig.apiKey) sanitizedConfig.apiKey = '••••••••';
      }
      
      return {
        ...method,
        config: sanitizedConfig
      };
    });
    
    return res.json(sanitizedMethods);
  } catch (error) {
    console.error('Errore durante il recupero dei metodi di pagamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Salva configurazione dei metodi di pagamento
 * POST /api/payments/payment-admin/payment-methods
 * Accesso: payment admin
 */
router.post('/payment-admin/payment-methods', isPaymentAdmin, async (req, res) => {
  try {
    const { paymentMethods } = req.body;
    
    if (!paymentMethods || !Array.isArray(paymentMethods)) {
      return res.status(400).json({
        success: false,
        message: 'Dati dei metodi di pagamento non validi'
      });
    }
    
    // Per ogni metodo, verifica se esiste già e aggiorna le credenziali
    // solo se non sono state mascherate
    const existingMethods = await storage.getPaymentMethods();
    
    const methodsToSave = paymentMethods.map(method => {
      const existing = existingMethods.find(m => m.id === method.id);
      
      if (existing) {
        // Se esiste già un metodo con questo ID, verifica quali credenziali mantenere
        const updatedConfig = { ...method.config };
        
        // Riapplica credenziali esistenti per i valori mascherati
        if (method.id === 'stripe') {
          if (updatedConfig.secretKey === '••••••••' && existing.config.secretKey) {
            updatedConfig.secretKey = existing.config.secretKey;
          }
          if (updatedConfig.webhookSecret === '••••••••' && existing.config.webhookSecret) {
            updatedConfig.webhookSecret = existing.config.webhookSecret;
          }
        } else if (method.id === 'paypal') {
          if (updatedConfig.clientSecret === '••••••••' && existing.config.clientSecret) {
            updatedConfig.clientSecret = existing.config.clientSecret;
          }
        } else if (method.id === 'wise') {
          if (updatedConfig.apiKey === '••••••••' && existing.config.apiKey) {
            updatedConfig.apiKey = existing.config.apiKey;
          }
        }
        
        return {
          ...method,
          config: updatedConfig
        };
      }
      
      return method;
    });
    
    await storage.savePaymentMethods(methodsToSave);
    
    return res.json({
      success: true,
      message: 'Configurazione dei metodi di pagamento salvata con successo'
    });
  } catch (error) {
    console.error('Errore durante il salvataggio dei metodi di pagamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Testa la configurazione di un metodo di pagamento
 * POST /api/payments/payment-admin/test-payment-method/:id
 * Accesso: payment admin
 */
router.post('/payment-admin/test-payment-method/:id', isPaymentAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Configurazione metodo di pagamento mancante'
      });
    }
    
    // Testa la configurazione in base al tipo di metodo
    if (id === 'stripe') {
      if (!config.secretKey) {
        return res.status(400).json({
          success: false,
          message: 'Chiave segreta Stripe mancante'
        });
      }
      
      try {
        const stripe = setupStripeClient(config.secretKey);
        // Verifica la validità della chiave ottenendo il bilancio dell'account
        const balance = await stripe.balance.retrieve();
        
        return res.json({
          success: true,
          message: 'Configurazione Stripe valida'
        });
      } catch (stripeError: any) {
        return res.status(400).json({
          success: false,
          message: `Errore configurazione Stripe: ${stripeError.message}`
        });
      }
    } 
    else if (id === 'paypal') {
      if (!config.clientId || !config.clientSecret) {
        return res.status(400).json({
          success: false,
          message: 'Credenziali PayPal mancanti'
        });
      }
      
      try {
        const paypal = setupPaypalClient(config.clientId, config.clientSecret, config.mode || 'sandbox');
        // Verifica le credenziali provando ad accedere alle informazioni dell'account
        const response = await paypal.request.get(`/v1/identity/oauth2/userinfo?schema=paypalv1.1`);
        
        return res.json({
          success: true,
          message: 'Configurazione PayPal valida'
        });
      } catch (paypalError: any) {
        return res.status(400).json({
          success: false,
          message: `Errore configurazione PayPal: ${paypalError.message}`
        });
      }
    } 
    else if (id === 'wise') {
      if (!config.apiKey) {
        return res.status(400).json({
          success: false,
          message: 'API Key Wise mancante'
        });
      }
      
      try {
        // Per Wise, facciamo una semplice richiesta di prova all'API
        const response = await fetch('https://api.transferwise.com/v3/profiles', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Risposta API Wise non valida: ${response.status}`);
        }
        
        return res.json({
          success: true,
          message: 'Configurazione Wise valida'
        });
      } catch (wiseError: any) {
        return res.status(400).json({
          success: false,
          message: `Errore configurazione Wise: ${wiseError.message}`
        });
      }
    } 
    else if (id === 'bank') {
      // Per il bonifico bancario, verifichiamo che i dati essenziali siano presenti
      if (!config.iban || !config.accountName) {
        return res.status(400).json({
          success: false,
          message: 'Dati bancari incompleti (IBAN e intestatario obbligatori)'
        });
      }
      
      return res.json({
        success: true,
        message: 'Configurazione bonifico bancario valida'
      });
    } 
    else {
      return res.status(400).json({
        success: false,
        message: `Metodo di pagamento non supportato: ${id}`
      });
    }
  } catch (error) {
    console.error(`Errore durante il test del metodo di pagamento ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Ottiene i metodi di pagamento disponibili per l'utente
 * GET /api/payments/available-methods
 * Accesso: tutti (pubblico)
 */
router.get('/available-methods', async (req, res) => {
  try {
    const paymentMethods = await storage.getPaymentMethods();
    
    // Restituisce solo i metodi attivi con informazioni di base (senza credenziali)
    const availableMethods = paymentMethods
      .filter(method => method.enabled)
      .map(method => ({
        id: method.id,
        name: method.name,
        // Solo informazioni pubbliche specifiche per ogni metodo
        publicConfig: method.id === 'stripe' 
          ? { 
              publicKey: method.config.publicKey,
              statementDescriptor: method.config.statementDescriptor 
            }
          : method.id === 'paypal'
          ? { 
              mode: method.config.mode 
            }
          : method.id === 'bank'
          ? {
              accountName: method.config.accountName,
              bankName: method.config.bankName,
              iban: method.config.iban,
              swift: method.config.swift,
              instructions: method.config.instructions
            }
          : {}
      }));
    
    return res.json(availableMethods);
  } catch (error) {
    console.error('Errore durante il recupero dei metodi di pagamento disponibili:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Verifica quale metodo di pagamento utilizzare per un abbonamento
 * GET /api/payments/subscription/:id/payment-method
 * Accesso: admin, staff
 */
router.get('/subscription/:id/payment-method', isAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ottieni l'abbonamento
    const subscription = await storage.getSubscription(parseInt(id));
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Abbonamento non trovato'
      });
    }
    
    // Restituisci informazioni sul metodo di pagamento
    return res.json({
      subscriptionId: subscription.id,
      paymentMethod: subscription.paymentMethod,
      // Altre informazioni utili sul pagamento
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd
    });
  } catch (error) {
    console.error('Errore durante la verifica del metodo di pagamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

export default router;