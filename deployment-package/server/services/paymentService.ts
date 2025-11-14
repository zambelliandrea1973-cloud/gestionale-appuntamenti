import { storage } from '../storage';
import { InsertSubscriptionPlan, InsertSubscription, InsertPaymentMethod, InsertPaymentTransaction } from '@shared/schema';
import paypal from '@paypal/checkout-server-sdk';
import Stripe from 'stripe';

// Configurazione dell'ambiente Stripe
const getStripeClient = () => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    throw new Error('Manca la chiave segreta di Stripe. Impostare STRIPE_SECRET_KEY nelle variabili d\'ambiente.');
  }
  
  return new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16'
  });
};

// Configurazione dell'ambiente PayPal (sandbox per test, live per produzione)
const getPayPalClient = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  console.log('PayPal Config:', {
    clientIdPresent: !!clientId,
    clientSecretPresent: !!clientSecret,
    environment: process.env.NODE_ENV || 'development'
  });
  
  if (!clientId || !clientSecret) {
    throw new Error('Mancano le credenziali PayPal. Impostare PAYPAL_CLIENT_ID e PAYPAL_CLIENT_SECRET nelle variabili d\'ambiente.');
  }
  
  try {
    // Utilizziamo direttamente l'ambiente di produzione (LiveEnvironment) indipendentemente da NODE_ENV
    const environment = new paypal.core.LiveEnvironment(clientId, clientSecret);
    console.log('PayPal: usando ambiente PRODUZIONE');
    
    return new paypal.core.PayPalHttpClient(environment);
  } catch (error) {
    console.error('Errore nella creazione del client PayPal:', error);
    throw error;
  }
};

/**
 * Servizio per la gestione dei pagamenti e abbonamenti
 */
export class PaymentService {
  /**
   * Crea un nuovo piano di abbonamento
   */
  static async createSubscriptionPlan(planData: {
    name: string;
    description?: string;
    price: number; // in cents
    interval: 'month' | 'year';
    features?: string[];
    clientLimit?: number;
    sortOrder?: number;
  }): Promise<{success: boolean, plan?: any, message?: string}> {
    try {
      const plan: InsertSubscriptionPlan = {
        name: planData.name,
        description: planData.description,
        price: planData.price,
        interval: planData.interval,
        features: planData.features ? JSON.stringify(planData.features) : null,
        clientLimit: planData.clientLimit,
        isActive: true,
        sortOrder: planData.sortOrder || 0
      };
      
      const createdPlan = await storage.createSubscriptionPlan(plan);
      
      return {
        success: true,
        plan: createdPlan
      };
    } catch (error) {
      console.error('Errore durante la creazione del piano di abbonamento:', error);
      return {
        success: false,
        message: 'Errore durante la creazione del piano di abbonamento'
      };
    }
  }

  /**
   * Ottiene tutti i piani di abbonamento attivi
   */
  static async getActivePlans() {
    try {
      return await storage.getActiveSubscriptionPlans();
    } catch (error) {
      console.error('Errore durante il recupero dei piani di abbonamento:', error);
      return [];
    }
  }

  /**
   * Crea un nuovo abbonamento con PayPal
   */
  static async createPayPalSubscription(
    userId: number,
    planId: number,
    returnUrl: string,
    cancelUrl: string
  ): Promise<{success: boolean, url?: string, subscriptionId?: string, message?: string}> {
    try {
      console.log('createPayPalSubscription iniziato con:', { userId, planId, returnUrl, cancelUrl });
      
      // Ottieni le informazioni sul piano
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return {
          success: false,
          message: 'Piano di abbonamento non trovato'
        };
      }
      
      console.log('Piano trovato:', plan);
      
      // Calcola il prezzo in euro
      const priceInEuro = (plan.price / 100).toFixed(2);
      
      console.log('PayPal Config:', {
        clientIdPresent: !!process.env.PAYPAL_CLIENT_ID,
        clientSecretPresent: !!process.env.PAYPAL_CLIENT_SECRET,
        environment: process.env.NODE_ENV || 'development',
        price: priceInEuro,
        planName: plan.name
      });
      
      // Utilizza API di PayPal per un ordine singolo (più semplice per l'integrazione)
      // In un'implementazione completa dovremmo usare l'API Subscriptions di PayPal
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'EUR',
            value: priceInEuro
          },
          description: `Abbonamento: ${plan.name} (1 anno)`
        }],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: 'Gestione Appuntamenti',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING'
        }
      });
      
      console.log('Invio richiesta a PayPal...');
      
      // Invia la richiesta a PayPal
      const client = getPayPalClient();
      const response = await client.execute(request);
      
      console.log('Risposta PayPal:', {
        statusCode: response.statusCode,
        resultId: response.result.id,
        linksCount: response.result.links?.length || 0
      });
      
      if (response.statusCode !== 201) {
        return {
          success: false,
          message: 'Errore nella creazione dell\'ordine PayPal'
        };
      }
      
      // Trova l'URL di approvazione
      const approvalLink = response.result.links.find(link => link.rel === 'approve');
      if (!approvalLink) {
        console.error('Links disponibili:', response.result.links);
        return {
          success: false,
          message: 'URL di approvazione PayPal non trovato'
        };
      }
      
      console.log('URL approvazione trovato:', approvalLink.href);
      
      // Controlla se esiste già un abbonamento per questo utente
      const existingSubscription = await storage.getSubscriptionByUserId(userId);
      const currentDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // Sempre 1 anno per semplicità
      
      if (existingSubscription) {
        // Se esiste già un abbonamento, aggiornalo invece di crearne uno nuovo
        console.log(`Abbonamento esistente trovato (ID: ${existingSubscription.id}), lo aggiorno invece di crearne uno nuovo`);
        await storage.updateSubscription(existingSubscription.id, {
          planId,
          status: 'pending',
          currentPeriodStart: currentDate,
          currentPeriodEnd: endDate,
          cancelAtPeriodEnd: false,
          paypalSubscriptionId: response.result.id,
          paymentMethod: 'paypal'
        });
      } else {
        // Crea una nuova pre-sottoscrizione nel database
        const subscriptionData: InsertSubscription = {
          userId,
          planId,
          status: 'pending',
          currentPeriodStart: currentDate,
          currentPeriodEnd: endDate,
          cancelAtPeriodEnd: false,
          paypalSubscriptionId: response.result.id,
          paymentMethod: 'paypal'
        };
        
        await storage.createSubscription(subscriptionData);
      }
      
      return {
        success: true,
        url: approvalLink.href,
        subscriptionId: response.result.id
      };
    } catch (error) {
      // Log dettagliato dell'errore per il debug
      console.error('Errore durante la creazione dell\'abbonamento PayPal:');
      
      if (error instanceof Error) {
        console.error('Messaggio:', error.message);
        console.error('Stack:', error.stack);
      } else {
        console.error('Errore non standard:', error);
      }
      
      // Verifica il tipo di errore e fornisci un messaggio più specifico
      let errorMessage = 'Errore durante la creazione dell\'abbonamento PayPal';
      
      if (error instanceof Error) {
        errorMessage += ': ' + error.message;
      }
      
      // Verifica le credenziali PayPal
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        errorMessage = 'Credenziali PayPal mancanti o non valide';
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Finalizza un abbonamento PayPal dopo l'approvazione dell'utente
   */
  static async finalizePayPalSubscription(
    orderId: string,
    userId: number
  ): Promise<{success: boolean, message?: string}> {
    try {
      // Trova l'abbonamento nel database
      const subscription = await storage.getSubscriptionByUserId(userId);
      if (!subscription) {
        return {
          success: false,
          message: 'Abbonamento non trovato'
        };
      }
      
      // Effettua la cattura del pagamento PayPal
      const client = getPayPalClient();
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});
      
      const response = await client.execute(request);
      
      if (response.statusCode !== 201) {
        return {
          success: false,
          message: 'Errore nella finalizzazione del pagamento PayPal'
        };
      }
      
      // Aggiorna lo stato dell'abbonamento
      await storage.updateSubscription(subscription.id, {
        status: 'active'
      });
      
      // Registra la transazione
      const transactionData: InsertPaymentTransaction = {
        userId,
        subscriptionId: subscription.id,
        amount: subscription.plan.price,
        currency: 'EUR',
        status: 'completed',
        paymentMethod: 'paypal',
        transactionId: response.result.id,
        description: `Pagamento per abbonamento ${subscription.plan.name}`
      };
      
      await storage.createPaymentTransaction(transactionData);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Errore durante la finalizzazione dell\'abbonamento PayPal:', error);
      return {
        success: false,
        message: 'Errore durante la finalizzazione dell\'abbonamento PayPal'
      };
    }
  }

  /**
   * Cancella un abbonamento
   */
  static async cancelSubscription(
    userId: number,
    immediate: boolean = false
  ): Promise<{success: boolean, message?: string}> {
    try {
      // Trova l'abbonamento nel database
      const subscription = await storage.getSubscriptionByUserId(userId);
      if (!subscription) {
        return {
          success: false,
          message: 'Abbonamento non trovato'
        };
      }
      
      // Aggiorna l'abbonamento nel database
      if (immediate) {
        // Cancellazione immediata
        await storage.updateSubscription(subscription.id, {
          status: 'canceled'
        });
      } else {
        // Cancellazione alla fine del periodo corrente
        await storage.cancelSubscription(subscription.id, true);
      }
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Errore durante la cancellazione dell\'abbonamento:', error);
      return {
        success: false,
        message: 'Errore durante la cancellazione dell\'abbonamento'
      };
    }
  }

  /**
   * Ottiene lo stato dell'abbonamento di un utente
   */
  static async getUserSubscription(userId: number) {
    try {
      return await storage.getSubscriptionByUserId(userId);
    } catch (error) {
      console.error('Errore durante il recupero dell\'abbonamento dell\'utente:', error);
      return null;
    }
  }

  /**
   * Verifica se un utente ha un abbonamento attivo
   */
  static async hasActiveSubscription(userId: number): Promise<boolean> {
    try {
      const subscription = await storage.getSubscriptionByUserId(userId);
      return subscription?.status === 'active';
    } catch (error) {
      console.error('Errore durante la verifica dell\'abbonamento attivo:', error);
      return false;
    }
  }

  /**
   * Ottiene la cronologia delle transazioni di un utente
   */
  static async getUserTransactions(userId: number) {
    try {
      return await storage.getPaymentTransactionsByUser(userId);
    } catch (error) {
      console.error('Errore durante il recupero delle transazioni dell\'utente:', error);
      return [];
    }
  }

  /**
   * Crea una sessione di checkout di Stripe per un abbonamento
   */
  static async createStripeCheckoutSession(
    userId: number,
    planId: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<{success: boolean, url?: string, sessionId?: string, message?: string}> {
    try {
      // Ottieni le informazioni sul piano
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return {
          success: false,
          message: 'Piano di abbonamento non trovato'
        };
      }
      
      // Ottieni il cliente
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          message: 'Utente non trovato'
        };
      }

      // Crea una sessione di checkout
      const stripe = getStripeClient();
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Abbonamento ${plan.name}`,
                description: plan.description || undefined,
              },
              unit_amount: Math.round(plan.price * 100), // Converte in centesimi
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
          planType: plan.name
        },
        customer_email: user.email || undefined,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      
      // Controlla se esiste già un abbonamento per questo utente
      const existingSubscription = await storage.getSubscriptionByUserId(userId);
      const currentDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.interval === 'month' ? 1 : 12));
      
      if (existingSubscription) {
        // Se esiste già un abbonamento, aggiornalo invece di crearne uno nuovo
        console.log(`Abbonamento esistente trovato (ID: ${existingSubscription.id}), lo aggiorno invece di crearne uno nuovo`);
        await storage.updateSubscription(existingSubscription.id, {
          planId,
          status: 'pending',
          currentPeriodStart: currentDate,
          currentPeriodEnd: endDate,
          cancelAtPeriodEnd: false,
          stripeSessionId: session.id,
          paymentMethod: 'stripe'
        });
      } else {
        // Crea una nuova pre-sottoscrizione nel database
        const subscriptionData: InsertSubscription = {
          userId,
          planId,
          status: 'pending',
          currentPeriodStart: currentDate,
          currentPeriodEnd: endDate,
          cancelAtPeriodEnd: false,
          stripeSessionId: session.id,
          paymentMethod: 'stripe'
        };
        
        await storage.createSubscription(subscriptionData);
      }
      
      return {
        success: true,
        url: session.url || undefined,
        sessionId: session.id
      };
    } catch (error) {
      console.error('Errore durante la creazione della sessione di checkout Stripe:', error);
      return {
        success: false,
        message: 'Errore durante la creazione della sessione di checkout Stripe'
      };
    }
  }

  /**
   * Gestisce il webhook di Stripe per completare un pagamento
   */
  static async handleStripeWebhook(
    event: any
  ): Promise<{success: boolean, message?: string}> {
    try {
      const { type, data } = event;
      
      // Gestisci gli eventi di Stripe in base al tipo
      if (type === 'checkout.session.completed') {
        const session = data.object;
        
        // Ottieni i dati dai metadati
        const userId = parseInt(session.metadata.userId);
        const planId = parseInt(session.metadata.planId);
        
        // Trova l'abbonamento nel database
        const subscription = await storage.getSubscriptionByUserId(userId);
        if (!subscription) {
          return {
            success: false,
            message: 'Abbonamento non trovato'
          };
        }
        
        // Aggiorna lo stato dell'abbonamento
        await storage.updateSubscription(subscription.id, {
          status: 'active',
          stripeCustomerId: session.customer || null
        });
        
        // Registra la transazione
        const transactionData: InsertPaymentTransaction = {
          userId,
          subscriptionId: subscription.id,
          amount: session.amount_total / 100, // Converte da centesimi
          currency: session.currency.toUpperCase(),
          status: 'completed',
          paymentMethod: 'stripe',
          transactionId: session.payment_intent,
          description: `Pagamento per abbonamento ${session.metadata.planType}`
        };
        
        await storage.createPaymentTransaction(transactionData);
        
        return {
          success: true
        };
      }
      
      return {
        success: true,
        message: `Evento Stripe non gestito: ${type}`
      };
    } catch (error) {
      console.error('Errore durante la gestione del webhook di Stripe:', error);
      return {
        success: false,
        message: 'Errore durante la gestione del webhook di Stripe'
      };
    }
  }
}