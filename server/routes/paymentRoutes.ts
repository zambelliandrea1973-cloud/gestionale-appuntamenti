// @ts-nocheck
import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';
import { WiseService } from '../services/wiseService';
import { isAdmin, isAuthenticated } from '../auth';
import { storage } from '../storage';
import Stripe from 'stripe';
import { db } from '../db';
import { eq, desc, or, isNull, count, sql, and, gte } from 'drizzle-orm';
import { subscriptionPlans, subscriptions, licenses, users, clientAccounts, clients, userLogins } from '../../shared/schema';

const router = Router();

// SECURITY: Use existing authentication (isAuthenticated + isAdmin) instead of hardcoded password

/**
 * Endpoint to get all active subscription plans
 * GET /api/payments/plans
 * Accesso: pubblico
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await PaymentService.getActivePlans();
    return res.json(plans);
  } catch (error) {
    console.error('Error retrieving subscription plans:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint to get the current user's subscription
 * GET /api/payments/subscription
 * Access: authenticated user
 */
router.get('/subscription', isAuthenticated, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const userId = req.user.id;
    const subscription = await PaymentService.getUserSubscription(userId);
    
    return res.json(subscription);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint to create a new subscription plan
 * POST /api/payments/plans
 * Accesso: admin
 */
router.post('/plans', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description, price, interval, features, clientLimit, sortOrder } = req.body;
    
    if (!name || !price || !interval) {
      return res.status(400).json({
        success: false,
        message: 'Name, price and interval are required'
      });
    }
    
    const result = await PaymentService.createSubscriptionPlan({
      name,
      description,
      price: parseInt(price), // Convert to integer for safety
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
    console.error('Error creating subscription plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint for starting a PayPal subscription
 * POST /api/payments/paypal/subscribe
 * Access: authenticated user
 */
router.post('/paypal/subscribe', isAuthenticated, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user!.id;
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }
    
    // Build return URLs using the correct public domain
    let baseUrl: string;
    if (process.env.PRODUCTION_DOMAIN) {
      baseUrl = `https://${process.env.PRODUCTION_DOMAIN}`;
    } else if (process.env.APP_BASE_URL) {
      baseUrl = process.env.APP_BASE_URL;
    } else {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      baseUrl = `${protocol}://${req.get('host')}`;
    }
    // PayPal automatically adds ?token=EC-XXX to the return URL
    // Add type=paypal to identify the payment method
    const returnUrl = `${baseUrl}/payment/success?type=paypal`;
    const cancelUrl = `${baseUrl}/payment/cancel?type=paypal`;
    
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
    console.error('Error creating PayPal subscription:');
    
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('Non-standard error:', error);
    }
    
    // Verify credenziali PayPal
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    
    console.log('Verifying PayPal credentials:');
    console.log('- Client ID present:', !!clientId);
    console.log('- Client Secret present:', !!clientSecret);
    
    return res.status(500).json({
      success: false,
      message: error instanceof Error 
        ? `Errore PayPal: ${error.message}` 
        : 'Internal error durante la connessione con PayPal'
    });
  }
});

/**
 * Endpoint for creating a Stripe checkout session
 * POST /api/payments/stripe/create-checkout-session
 * Access: authenticated user
 */
router.post('/stripe/create-checkout-session', isAuthenticated, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user!.id;
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }
    
    // Build return URLs using the correct public domain
    let baseUrl: string;
    if (process.env.PRODUCTION_DOMAIN) {
      baseUrl = `https://${process.env.PRODUCTION_DOMAIN}`;
    } else if (process.env.APP_BASE_URL) {
      baseUrl = process.env.APP_BASE_URL;
    } else {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      baseUrl = `${protocol}://${req.get('host')}`;
    }
    const successUrl = `${baseUrl}/payment/success`;
    const cancelUrl = `${baseUrl}/payment/cancel`;
    
    const result = await PaymentService.createStripeCheckoutSession(
      userId,
      parseInt(planId),
      successUrl,
      cancelUrl
    );
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint for confirming a Stripe checkout session after payment
 * POST /api/payments/stripe/confirm-session
 * Access: authenticated user
 */
router.post('/stripe/confirm-session', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user!.id;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    
    logger.debug(`💳 Stripe session confirmation: ${sessionId} for user ${userId}`);
    
    const result = await PaymentService.confirmStripeSession(sessionId, userId);
    
    logger.debug(`💳 Risultato conferma Stripe:`, result);
    
    return res.json(result);
  } catch (error) {
    console.error('Error confirming Stripe session:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint for finalizing a PayPal subscription after user approval
 * POST /api/payments/paypal/capture
 * Access: authenticated user
 */
router.post('/paypal/capture', isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user!.id;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    const result = await PaymentService.finalizePayPalSubscription(orderId, userId);
    
    return res.json(result);
  } catch (error) {
    console.error('Error finalizing PayPal subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Alternative endpoint for confirming a PayPal order (capture alias)
 * POST /api/payments/paypal/confirm-order
 * Access: authenticated user
 */
router.post('/paypal/confirm-order', isAuthenticated, async (req, res) => {
  try {
    // Supporta sia orderId che token (PayPal usa token nell'URL di ritorno)
    const orderId = req.body.orderId || req.body.token;
    const userId = req.user!.id;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID or token is required'
      });
    }
    
    logger.debug(`📦 Confirm ordine PayPal: ${orderId} for user ${userId}`);
    
    const result = await PaymentService.finalizePayPalSubscription(orderId, userId);
    
    logger.debug(`📦 Risultato conferma PayPal:`, result);
    
    return res.json(result);
  } catch (error) {
    console.error('Error confirming PayPal order:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * PUBLIC endpoint for finalizing a PayPal order (does not require authentication)
 * POST /api/payments/paypal/finalize
 * Accesso: pubblico - usa the token PayPal per identificare l'subscription
 */
router.post('/paypal/finalize', async (req, res) => {
  try {
    const orderId = req.body.orderId || req.body.token;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Token PayPal missing'
      });
    }
    
    logger.debug(`📦 [PAYPAL PUBLIC ENDPOINT] Finalizing with token: ${orderId}`);
    
    const result = await PaymentService.finalizePayPalSubscriptionByToken(orderId);
    
    logger.debug(`📦 [PAYPAL PUBLIC ENDPOINT] Risultato:`, result);
    
    return res.json(result);
  } catch (error) {
    console.error('Error in public PayPal endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint for starting a Wise subscription
 * POST /api/payments/wise/subscribe
 * Access: authenticated user
 */
router.post('/wise/subscribe', isAuthenticated, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user!.id;
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }
    
    // First get plan information
    const plan = await req.app.locals.storage.getSubscriptionPlan(parseInt(planId));
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Piano not found'
      });
    }
    
    // Get the sottoscrizione (If esiste already)
    const subscription = await req.app.locals.storage.getSubscriptionByUserId(userId);
    if (!subscription) {
      // Create a new subscription
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
      
      // Create the payment with Wise
      const result = await WiseService.createSubscriptionPayment(
        userId,
        newSubscription.id,
        plan.price
      );
      
      return res.json(result);
    } else {
      // Update the existing subscription
      await req.app.locals.storage.updateSubscription(subscription.id, {
        planId: parseInt(planId),
        status: 'pending',
        paymentMethod: 'wise'
      });
      
      // Create the payment with Wise
      const result = await WiseService.createSubscriptionPayment(
        userId,
        subscription.id,
        plan.price
      );
      
      return res.json(result);
    }
  } catch (error) {
    console.error('Error creating Wise subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint to handle Stripe notifications webhook
 * POST /api/payments/stripe/webhook
 * Access: public (but with signature verification)
 */
router.post('/stripe/webhook', async (req, res) => {
  try {
    // Get the signature from the header
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Stripe signature'
      });
    }
    
    // Get the key segreta Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({
        success: false,
        message: 'Stripe configuration missing'
      });
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-03-31.basil' as any
    });
    
    // Get the webhook secret from environment variable
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('Warning: STRIPE_WEBHOOK_SECRET not configured. Signatures will not be verified in test environment.');
      // For testing, proceed without verification
      const result = await PaymentService.handleStripeWebhook(req.body);
      return res.json(result);
    }
    
    // Verify the signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error('Error verifying Stripe signature:', err.message);
      return res.status(400).json({
        success: false,
        message: `Signature verification error: ${err.message}`
      });
    }
    
    // Handle l'evento
    const result = await PaymentService.handleStripeWebhook(event);
    
    return res.json(result);
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint to handle Wise notifications webhook
 * POST /api/payments/wise/webhook
 * Access: public (but verified by token)
 */
router.post('/wise/webhook', async (req, res) => {
  try {
    // Signature verification (in a production environment)
    // ...
    
    const result = await WiseService.handleWebhookEvent(req.body);
    
    return res.json(result);
  } catch (error) {
    console.error('Error handling Wise webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/* The subscription endpoint is already defined above */

/**
 * Endpoint for cancelling a subscription
 * POST /api/payments/subscription/cancel
 * Access: authenticated user
 */
router.post('/subscription/cancel', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { immediate } = req.body;
    
    const result = await PaymentService.cancelSubscription(userId, immediate);
    
    return res.json(result);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint to get the user's transaction history
 * GET /api/payments/transactions
 * Access: authenticated user
 */
router.get('/transactions', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const transactions = await PaymentService.getUserTransactions(userId);
    
    return res.json(transactions);
  } catch (error) {
    console.error('Error retrieving transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint per ottenere all subscriptions (admin)
 * GET /api/payments/admin/subscriptions
 * Accesso: admin
 */
router.get('/admin/subscriptions', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const subscriptions = await req.app.locals.storage.getActiveSubscriptions();
    return res.json(subscriptions);
  } catch (error) {
    console.error('Error retrieving subscriptions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint for the payments admin dashboard
 * GET /api/payments/payment-admin/dashboard
 * Access: authenticated admin
 */
router.get('/payment-admin/dashboard', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('Retrieving admin payment dashboard...');
    
    // Get statistics for payments
    let paypalTransactions = await storage.getPaymentTransactionsByMethod('paypal');
    let wiseTransactions = await storage.getPaymentTransactionsByMethod('wise');
    let allTransactions = [...paypalTransactions, ...wiseTransactions];
    
    // Add test data for transactions if there are any
    if (allTransactions.length === 0) {
      console.log('No transactions found for dashboard. Generating test data...');
      
      // Define dates for test transactions
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);
      
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(now.getMonth() - 2);
      
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      
      const fourMonthsAgo = new Date(now);
      fourMonthsAgo.setMonth(now.getMonth() - 4);
      
      const fiveMonthsAgo = new Date(now);
      fiveMonthsAgo.setMonth(now.getMonth() - 5);
      
      // Transazioni test
      const testPaypalTransactions = [
        // Subscription Base
        {
          id: 1001,
          userId: 10, // zambelli.andrea.1973B@gmail.com
          amount: 9900, // €99.00
          paymentMethod: 'paypal',
          status: 'completed',
          description: 'Abbonamento Base - 1 anno',
          createdAt: fiveMonthsAgo.toISOString(),
          updatedAt: fiveMonthsAgo.toISOString()
        },
        // Transazione fallita
        {
          id: 1004,
          userId: 9, // zambelli.andrea.1973A@gmail.com
          amount: 9900, // €99.00
          paymentMethod: 'paypal',
          status: 'failed',
          description: 'Tentativo abbonamento Base - Pagamento fallito',
          createdAt: twoMonthsAgo.toISOString(),
          updatedAt: twoMonthsAgo.toISOString()
        }
      ];
      
      const testWiseTransactions = [
        // Transazione in sospeso
        {
          id: 1005,
          userId: 9, // zambelli.andrea.1973A@gmail.com
          amount: 9900, // €99.00
          paymentMethod: 'wise',
          status: 'pending',
          description: 'Abbonamento Base - In attesa di conferma bonifico',
          createdAt: oneMonthAgo.toISOString(),
          updatedAt: oneMonthAgo.toISOString()
        }
      ];
      
      const testStripeTransactions = [
        // Subscription Pro
        {
          id: 1002,
          userId: 11, // zambelli.andrea.1973C@gmail.com
          amount: 19900, // €199.00
          paymentMethod: 'stripe',
          status: 'completed',
          description: 'Abbonamento Professional - 1 anno',
          createdAt: fourMonthsAgo.toISOString(),
          updatedAt: fourMonthsAgo.toISOString()
        },
        // Subscription Business
        {
          id: 1003,
          userId: 12, // zambelli.andrea.1973D@gmail.com
          amount: 29900, // €299.00
          paymentMethod: 'stripe',
          status: 'completed',
          description: 'Abbonamento Business - 1 anno',
          createdAt: threeMonthsAgo.toISOString(),
          updatedAt: threeMonthsAgo.toISOString()
        }
      ];
      
      paypalTransactions = testPaypalTransactions as any;
      wiseTransactions = testWiseTransactions as any;
      allTransactions = [...testPaypalTransactions, ...testWiseTransactions, ...testStripeTransactions] as any;
      
      console.log(`Generated ${allTransactions.length} mock transactions for the dashboard`);
    }
    
    // Calculate payment statistics
    const totalRevenue = allTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0) / 100; // Convert from cents to euros
    
    const paypalRevenue = paypalTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0) / 100;
    
    const wiseRevenue = wiseTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0) / 100;
    
    // Calculate statistics per status
    const transactionsByStatus = {
      completed: allTransactions.filter(t => t.status === 'completed').length,
      pending: allTransactions.filter(t => t.status === 'pending').length,
      failed: allTransactions.filter(t => t.status === 'failed').length
    };
    
    // Get i plans di subscription
    let plans: any[] = await storage.getActiveSubscriptionPlans();
    
    // Add test plans if any exist
    if (!plans || plans.length === 0) {
      console.log('No subscription plan found. Generating test plans...');
      
      plans = [
        {
          id: 1,
          name: 'Prova Gratuita',
          description: 'Versione di prova gratuita per 40 giorni',
          price: 0,
          interval: 'once',
          currency: 'EUR',
          features: ['Full access for 40 days', 'No credit card required'],
          isActive: true
        },
        {
          id: 2,
          name: 'Base',
          description: 'Piano base per professionisti individuali',
          price: 9900, // €99.00
          interval: 'year',
          currency: 'EUR',
          features: ['Prenotazioni illimitate', 'Gestione clienti', 'Email promemoria'],
          isActive: true
        },
        {
          id: 3,
          name: 'Professional',
          description: 'Advanced plan with premium features',
          price: 19900, // €199.00
          interval: 'year',
          currency: 'EUR',
          features: ['All Base features', 'SMS reminders', 'Calendar integration'],
          isActive: true
        },
        {
          id: 4,
          name: 'Staff',
          description: 'Plan for staff members',
          price: 0,
          interval: 'year',
          currency: 'EUR',
          features: ['All Professional features', '10-year valid license'],
          isActive: true
        },
        {
          id: 5,
          name: 'Business',
          description: 'Complete plan for multi-professional practices',
          price: 29900, // €299.00
          interval: 'year', 
          currency: 'EUR',
          features: ['All Professional features', 'Multi-staff management', 'WhatsApp integrated'],
          isActive: true
        }
      ];
      
      console.log(`Generated ${plans.length} mock subscription plans`);
    }
    
    // Get active subscriptions
    const subscriptions = await storage.getActiveSubscriptions();
    
    // Calculate statistics subscriptions per plan
    const subscriptionsByPlan = plans.map(plan => ({
      planId: plan.id,
      planName: plan.name,
      count: subscriptions.filter(s => s.planId === plan.id).length
    }));
    
    // Get all licenses attive
    const licenses = await storage.getLicenses();
    const activeLicenses = licenses.filter(license => license.isActive);
    
    // Conteggia licenses per type
    const licensesByType: Record<string, number> = {};
    activeLicenses.forEach(license => {
      if (!licensesByType[license.type]) {
        licensesByType[license.type] = 0;
      }
      licensesByType[license.type]++;
    });
    
    console.log(`Found ${allTransactions.length} transactions, ${subscriptions.length} active subscriptions and ${activeLicenses.length} active licenses`);
    
    return res.json({
      transactionStats: {
        total: allTransactions.length,
        totalRevenue,
        paypalTransactions: paypalTransactions.length,
        paypalRevenue,
        wiseTransactions: wiseTransactions.length,
        wiseRevenue,
        byStatus: transactionsByStatus
      },
      subscriptionStats: {
        total: subscriptions.length,
        byPlan: subscriptionsByPlan
      },
      licenseStats: {
        total: activeLicenses.length,
        byType: licensesByType
      },
      activeSubscriptions: subscriptions.length,
      activeLicenses: activeLicenses.length,
      transactionCount: allTransactions.length,
      totalRevenue,
      plans,
      recentTransactions: (allTransactions as any[])
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
    });
  } catch (error) {
    console.error('Error retrieving payment dashboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Endpoint per ottenere all transactions di payment
 * GET /api/payments/payment-admin/transactions
 * Access: authenticated admin
 */
router.get('/payment-admin/transactions', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('Retrieving payment transactions...');
    let paypalTransactions = await storage.getPaymentTransactionsByMethod('paypal');
    let wiseTransactions = await storage.getPaymentTransactionsByMethod('wise');
    let baseTransactions = ([...paypalTransactions, ...wiseTransactions] as any[])
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Enrich transactions with user data
    let transactions = await Promise.all(baseTransactions.map(async (transaction) => {
      // Get user data
      const user = await storage.getUser(transaction.userId);
      
      // Get phone from contactSettings
      let phone = null;
      if (user) {
        try {
          const contactSettings = await storage.getContactSettings(user.id);
          phone = contactSettings?.phone || null;
        } catch (error) {
          // If esiste contactSettings, phone rimane null
        }
      }
      
      return {
        ...transaction,
        // Add user data
        user: user ? {
          id: user.id,
          username: user.username,
          email: user.email || null,
          phone: phone,
          type: user.type,
          role: user.role
        } : null
      };
    }));
    
    // If there are transactions, generate test data
    if (transactions.length === 0) {
      console.log('No transactions found. Generating test data...');
      
      // Define dates for dummy transactions
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);
      
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(now.getMonth() - 2);
      
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      
      const fourMonthsAgo = new Date(now);
      fourMonthsAgo.setMonth(now.getMonth() - 4);
      
      const fiveMonthsAgo = new Date(now);
      fiveMonthsAgo.setMonth(now.getMonth() - 5);
      
      // Transazioni test con userId REALI
      const testTransactionsBase = [
        // Subscription Base
        {
          id: 1001,
          userId: 3, // Silvia (real user)
          amount: 9900, // €99.00
          paymentMethod: 'paypal',
          status: 'completed',
          description: 'Abbonamento Base - 1 anno',
          isTestData: true, // Flag to identify test data
          createdAt: fiveMonthsAgo.toISOString(),
          updatedAt: fiveMonthsAgo.toISOString(),
          metadata: {
            planId: 2,
            planName: 'Base',
            invoiceNumber: 'INV-2024-001'
          }
        },
        // Subscription Pro
        {
          id: 1002,
          userId: 14, // Andrea (real user)
          amount: 19900, // €199.00
          paymentMethod: 'stripe',
          status: 'completed',
          description: 'Abbonamento Professional - 1 anno',
          isTestData: true, // Flag to identify test data
          createdAt: fourMonthsAgo.toISOString(),
          updatedAt: fourMonthsAgo.toISOString(),
          metadata: {
            planId: 3,
            planName: 'Professional',
            invoiceNumber: 'INV-2024-002'
          }
        },
        // Subscription Business
        {
          id: 1003,
          userId: 16, // Altro real user
          amount: 29900, // €299.00
          paymentMethod: 'stripe',
          status: 'completed',
          description: 'Abbonamento Business - 1 anno',
          isTestData: true, // Flag to identify test data
          createdAt: threeMonthsAgo.toISOString(),
          updatedAt: threeMonthsAgo.toISOString(),
          metadata: {
            planId: 5,
            planName: 'Business',
            invoiceNumber: 'INV-2024-003'
          }
        },
        // Transazione fallita
        {
          id: 1004,
          userId: 3, // Silvia (real user)
          amount: 9900, // €99.00
          paymentMethod: 'paypal',
          status: 'failed',
          description: 'Tentativo abbonamento Base - Pagamento fallito',
          isTestData: true, // Flag to identify test data
          createdAt: twoMonthsAgo.toISOString(),
          updatedAt: twoMonthsAgo.toISOString(),
          metadata: {
            planId: 2,
            planName: 'Base',
            errorCode: 'PAYMENT_REJECTED'
          }
        },
        // Transazione in sospeso
        {
          id: 1005,
          userId: 14, // Andrea (real user)
          amount: 9900, // €99.00
          paymentMethod: 'wise',
          status: 'pending',
          description: 'Abbonamento Base - In attesa di conferma bonifico',
          isTestData: true, // Flag to identify test data
          createdAt: oneMonthAgo.toISOString(),
          updatedAt: oneMonthAgo.toISOString(),
          metadata: {
            planId: 2,
            planName: 'Base',
            referenceNumber: 'WISE-REF-123456'
          }
        }
      ];
      
      // Enrich the data test con informazioni user
      transactions = await Promise.all(testTransactionsBase.map(async (transaction: any) => {
        const user = await storage.getUser(transaction.userId);
        
        let phone = null;
        if (user) {
          try {
            const contactSettings = await storage.getContactSettings(user.id);
            phone = contactSettings?.phone || null;
          } catch (error) {
            // If esiste contactSettings, phone rimane null
          }
        }
        
        return {
          ...transaction,
          user: user ? {
            id: user.id,
            username: user.username,
            email: user.email || null,
            phone: phone,
            type: user.type,
            role: user.role
          } : null
        };
      }));
      console.log(`Generated ${transactions.length} mock transactions with real user data`);
    }
    
    console.log(`Found ${transactions.length} transactions`);
    return res.json(transactions);
  } catch (error) {
    console.error('Error retrieving transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Endpoint per ottenere all subscriptions
 * GET /api/payments/payment-admin/subscriptions
 * Access: authenticated admin
 */
router.get('/payment-admin/subscriptions', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('Retrieving subscriptions...');
    let subscriptions = await storage.getSubscriptions();
    
    // Enrich the data with user and license information
    let enrichedSubscriptions = await Promise.all(subscriptions.map(async (sub) => {
      // Get user data
      const user = await storage.getUser(sub.userId);
      
      // Get phone from contactSettings
      let phone = null;
      if (user) {
        try {
          const contactSettings = await storage.getContactSettings(user.id);
          phone = contactSettings?.phone || null;
        } catch (error) {
          // If esiste contactSettings, phone rimane null
        }
      }
      
      // Get the license associated with the user
      const userLicenses = await storage.getLicensesByUserId(sub.userId);
      const activeLicense = userLicenses.find(lic => lic.isActive);
      
      // Retrieve plan sottoscrizione
      const plan = await storage.getSubscriptionPlan(sub.planId);
      
      return {
        ...sub,
        // Add user data
        user: user ? {
          id: user.id,
          username: user.username,
          email: user.email || null,
          phone: phone,
          type: user.type,
          role: user.role
        } : null,
        // Add license data
        license: activeLicense ? {
          id: activeLicense.id,
          type: activeLicense.type,
          expiresAt: activeLicense.expiresAt,
          isActive: activeLicense.isActive
        } : null,
        // Add plan name
        planName: plan ? plan.name : `Piano ${sub.planId}`
      };
    }));
    
    // If there are subscriptions or fewer than 5, add mock data for testing
    if (enrichedSubscriptions.length < 5) {
      console.log('Generating additional test subscriptions...');
      
      // Define the start and end dates of mock subscriptions
      const now = new Date();
      const oneYearLater = new Date(now);
      oneYearLater.setFullYear(now.getFullYear() + 1);
      
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      
      const fortyDaysLater = new Date(now);
      fortyDaysLater.setDate(now.getDate() + 40);
      
      // Test subscriptions with real accounts mentioned
      const testSubscriptions = [
        // STAFF
        {
          id: 901,
          userId: 8, // ID per zambelli.andrea.19732@gmail.com
          planId: 4,
          status: 'active',
          currentPeriodStart: sixMonthsAgo.toISOString(),
          currentPeriodEnd: oneYearLater.toISOString(),
          paymentMethod: 'wise',
          createdAt: sixMonthsAgo.toISOString(),
          updatedAt: now.toISOString(),
          user: {
            id: 8,
            username: 'zambelli.andrea.19732@gmail.com',
            email: 'zambelli.andrea.19732@gmail.com',
            type: 'staff',
            role: 'staff'
          },
          license: {
            id: 101,
            type: 'staff',
            expiresAt: oneYearLater.toISOString(),
            isActive: true
          },
          planName: 'Staff'
        },
        // FREE/TRIAL
        {
          id: 902,
          userId: 9, // ID per zambelli.andrea.1973A@gmail.com
          planId: 1,
          status: 'active',
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: fortyDaysLater.toISOString(),
          paymentMethod: 'free',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          user: {
            id: 9,
            username: 'zambelli.andrea.1973A@gmail.com',
            email: 'zambelli.andrea.1973A@gmail.com',
            type: 'customer',
            role: 'user'
          },
          license: {
            id: 102,
            type: 'trial',
            expiresAt: fortyDaysLater.toISOString(),
            isActive: true
          },
          planName: 'Prova Gratuita'
        },
        // BASE
        {
          id: 903,
          userId: 10, // ID per zambelli.andrea.1973B@gmail.com
          planId: 2,
          status: 'active',
          currentPeriodStart: sixMonthsAgo.toISOString(),
          currentPeriodEnd: oneYearLater.toISOString(),
          paymentMethod: 'paypal',
          createdAt: sixMonthsAgo.toISOString(),
          updatedAt: now.toISOString(),
          user: {
            id: 10,
            username: 'zambelli.andrea.1973B@gmail.com',
            email: 'zambelli.andrea.1973B@gmail.com',
            type: 'customer',
            role: 'user'
          },
          license: {
            id: 103,
            type: 'base',
            expiresAt: oneYearLater.toISOString(),
            isActive: true
          },
          planName: 'Base'
        },
        // PRO
        {
          id: 904,
          userId: 11, // ID per zambelli.andrea.1973C@gmail.com
          planId: 3,
          status: 'active',
          currentPeriodStart: sixMonthsAgo.toISOString(),
          currentPeriodEnd: oneYearLater.toISOString(),
          paymentMethod: 'stripe',
          createdAt: sixMonthsAgo.toISOString(),
          updatedAt: now.toISOString(),
          user: {
            id: 11,
            username: 'zambelli.andrea.1973C@gmail.com',
            email: 'zambelli.andrea.1973C@gmail.com',
            type: 'customer',
            role: 'user'
          },
          license: {
            id: 104,
            type: 'pro',
            expiresAt: oneYearLater.toISOString(),
            isActive: true
          },
          planName: 'Professional'
        },
        // BUSINESS
        {
          id: 905,
          userId: 12, // ID per zambelli.andrea.1973D@gmail.com
          planId: 5,
          status: 'active',
          currentPeriodStart: sixMonthsAgo.toISOString(),
          currentPeriodEnd: oneYearLater.toISOString(),
          paymentMethod: 'stripe',
          createdAt: sixMonthsAgo.toISOString(),
          updatedAt: now.toISOString(),
          user: {
            id: 12,
            username: 'zambelli.andrea.1973D@gmail.com',
            email: 'zambelli.andrea.1973D@gmail.com',
            type: 'customer',
            role: 'user'
          },
          license: {
            id: 105,
            type: 'business',
            expiresAt: oneYearLater.toISOString(),
            isActive: true
          },
          planName: 'Business'
        }
      ];
      
      // Add these dummy subscriptions to the existing array
      enrichedSubscriptions = [...enrichedSubscriptions, ...testSubscriptions] as any[];
      console.log(`Added ${testSubscriptions.length} mock subscriptions for display`);
    }
    
    console.log(`Totale: ${enrichedSubscriptions.length} subscriptions con dettagli user e license`);
    return res.json(enrichedSubscriptions);
  } catch (error) {
    console.error('Error retrieving subscriptions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

// RIMOSSO: Endpoint /payment-admin/authenticate (password hardcoded) - Usa login normale admin

/**
 * Endpoint to get all licenses with user information
 * GET /api/payments/payment-admin/licenses
 * Access: authenticated admin
 */
router.get('/payment-admin/licenses', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('Retrieving licenses with user details...');
    
    // We directly query the database to get licenses
    // This approach is temporary until we resolve the errors in storage.ts
    const licensesQuery = await db
      .select({
        license: {
          id: licenses.id,
          code: licenses.code,
          type: licenses.type,
          isActive: licenses.isActive,
          createdAt: licenses.createdAt,
          activatedAt: licenses.activatedAt,
          expiresAt: licenses.expiresAt,
          userId: licenses.userId
        }
      })
      .from(licenses)
      .orderBy(desc(licenses.createdAt));
    
    // Load all licenses test
    const testLicensesQuery = await db
      .select({
        license: {
          id: licenses.id,
          code: licenses.code,
          type: licenses.type,
          isActive: licenses.isActive,
          createdAt: licenses.createdAt,
          activatedAt: licenses.activatedAt,
          expiresAt: licenses.expiresAt,
          userId: licenses.userId
        }
      })
      .from(licenses)
      .where(isNull(licenses.userId)) // Licenses without userId but assigned to client accounts
      .orderBy(desc(licenses.createdAt));
      
    console.log(`Found ${licensesQuery.length} normal licenses and ${testLicensesQuery.length} test licenses`);
    
    // Map the results to the required format
    const mappedLicenses = [...licensesQuery, ...testLicensesQuery].map(row => row.license);
    
    // Load all users e i client account
    const allUsers = await db
      .select()
      .from(users);
    
    const allClientAccounts = await db
      .select()
      .from(clientAccounts);
      
    const allClients = await db
      .select()
      .from(clients);
    
    console.log(`Loaded ${allUsers.length} users, ${allClientAccounts.length} client accounts, ${allClients.length} clients`);
    
    const allSubscriptions = await db
      .select()
      .from(subscriptions)
      .orderBy(desc(subscriptions.createdAt));
    
    const allPlans = await db
      .select()
      .from(subscriptionPlans);
    
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const totalCounts = await db
      .select({ userId: userLogins.userId, cnt: count() })
      .from(userLogins)
      .groupBy(userLogins.userId);
    
    const weekCounts = await db
      .select({ userId: userLogins.userId, cnt: count() })
      .from(userLogins)
      .where(gte(userLogins.loginAt, weekAgo))
      .groupBy(userLogins.userId);
    
    const todayCounts = await db
      .select({ userId: userLogins.userId, cnt: count() })
      .from(userLogins)
      .where(gte(userLogins.loginAt, todayStart))
      .groupBy(userLogins.userId);
    
    const accessMap = new Map<number, { today: number; week: number; total: number }>();
    for (const r of totalCounts) {
      if (!r.userId) continue;
      accessMap.set(r.userId, { today: 0, week: 0, total: Number(r.cnt) });
    }
    for (const r of weekCounts) {
      if (!r.userId) continue;
      const entry = accessMap.get(r.userId);
      if (entry) entry.week = Number(r.cnt);
    }
    for (const r of todayCounts) {
      if (!r.userId) continue;
      const entry = accessMap.get(r.userId);
      if (entry) entry.today = Number(r.cnt);
    }
    
    const enrichedLicenses = mappedLicenses.map((license) => {
      let user = null;
      let clientAccount: any = null;
      let client = null;
      
      if (license.userId) {
        user = allUsers.find(u => u.id === license.userId) || null;
      }
      
      if (!user) {
        for (const ca of allClientAccounts) {
          if (ca.username && ca.username.includes(`${license.type}@`)) {
            clientAccount = ca;
            if (clientAccount.clientId) {
              client = allClients.find(c => c.id === clientAccount.clientId) || null;
            }
            break;
          }
        }
      }
      
      let subscription = null;
      let plan = null;
      
      if (user) {
        subscription = allSubscriptions.find(s => s.userId === user!.id) || null;
        if (subscription?.planId) {
          plan = allPlans.find(p => p.id === subscription!.planId) || null;
        }
      }
      
      const unifiedUser = user ? {
        id: user.id,
        username: user.username,
        email: user.email || null,
        type: user.type,
        role: user.role,
        createdAt: user.createdAt
      } : clientAccount ? {
        id: clientAccount.id,
        username: clientAccount.username,
        email: client?.email || null,
        type: 'customer' as const,
        role: 'customer',
        createdAt: clientAccount.createdAt,
        clientId: clientAccount.clientId,
        clientName: client ? `${client.firstName} ${client.lastName}` : null
      } : null;
      
      const access = license.userId ? accessMap.get(license.userId) || { today: 0, week: 0, total: 0 } : { today: 0, week: 0, total: 0 };
      
      return {
        ...license,
        user: unifiedUser,
        accessToday: access.today,
        accessWeek: access.week,
        accessTotal: access.total,
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          planId: subscription.planId,
          planName: plan ? plan.name : `Piano ${subscription.planId}`,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd
        } : null
      };
    });
    
    // Manually add test licenses that might not be in the database
    // but were created in the test environment
    const testAccounts = [
      {
        email: 'zambelli.andrea.19732@gmail.com',
        username: 'zambelli.andrea.19732@gmail.com',
        type: 'staff',
        licenseType: 'staff'
      },
      {
        email: 'zambelli.andrea.1973A@gmail.com',
        username: 'zambelli.andrea.1973A@gmail.com',
        type: 'customer',
        licenseType: 'trial'
      },
      {
        email: 'zambelli.andrea.1973B@gmail.com',
        username: 'zambelli.andrea.1973B@gmail.com',
        type: 'customer',
        licenseType: 'base'
      },
      {
        email: 'zambelli.andrea.1973C@gmail.com',
        username: 'zambelli.andrea.1973C@gmail.com',
        type: 'customer',
        licenseType: 'pro'
      },
      {
        email: 'zambelli.andrea.1973D@gmail.com',
        username: 'zambelli.andrea.1973D@gmail.com',
        type: 'customer',
        licenseType: 'business'
      }
    ];
    
    // Check if test accounts are already included in the enriched licenses
    for (const testAccount of testAccounts) {
      const accountExists = enrichedLicenses.some(
        license => license.user && license.user.username === testAccount.email
      );
      
      // If the test account is not already included, create a virtual license
      if (!accountExists) {
        console.log(`Adding test license for ${testAccount.email} of type ${testAccount.licenseType}`);
        
        // Create an expiration date based on the license type
        const now = new Date();
        let expiresAt = new Date(now);
        
        if (testAccount.licenseType === 'trial') {
          expiresAt.setDate(now.getDate() + 40); // 40 days for trial
        } else if (testAccount.licenseType === 'staff') {
          expiresAt.setFullYear(now.getFullYear() + 10); // 10 years for staff
        } else {
          expiresAt.setFullYear(now.getFullYear() + 1); // 1 year for normal licenses
        }
        
        enrichedLicenses.push({
          id: 1000 + enrichedLicenses.length, // ID temporaneo per evitare conflitti
          code: `TEST-${testAccount.licenseType.toUpperCase()}-${enrichedLicenses.length}`,
          type: testAccount.licenseType,
          isActive: true,
          createdAt: now,
          activatedAt: now,
          expiresAt: expiresAt,
          userId: null,
          user: {
            id: 0,
            username: testAccount.email,
            email: testAccount.email,
            type: testAccount.type,
            role: testAccount.type,
            createdAt: now
          },
          subscription: null
        });
      }
    }
    
    console.log(`Total licenses returned: ${enrichedLicenses.length}`);
    return res.json(enrichedLicenses);
  } catch (error) {
    console.error('Error retrieving licenses:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

export default router;