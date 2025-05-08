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
  
  if (!clientId || !clientSecret) {
    throw new Error('Mancano le credenziali PayPal. Impostare PAYPAL_CLIENT_ID e PAYPAL_CLIENT_SECRET nelle variabili d\'ambiente.');
  }
  
  const environment = process.env.NODE_ENV === 'production'
    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
    : new paypal.core.SandboxEnvironment(clientId, clientSecret);
  
  return new paypal.core.PayPalHttpClient(environment);
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
      // Ottieni le informazioni sul piano
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return {
          success: false,
          message: 'Piano di abbonamento non trovato'
        };
      }
      
      // Calcola il prezzo in euro
      const priceInEuro = (plan.price / 100).toFixed(2);
      
      // Crea l'abbonamento in PayPal
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'EUR',
            value: priceInEuro
          },
          description: `Abbonamento: ${plan.name}`
        }],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: 'HealthApp',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW'
        }
      });
      
      // Invia la richiesta a PayPal
      const client = getPayPalClient();
      const response = await client.execute(request);
      
      if (response.statusCode !== 201) {
        return {
          success: false,
          message: 'Errore nella creazione dell\'ordine PayPal'
        };
      }
      
      // Trova l'URL di approvazione
      const approvalLink = response.result.links.find(link => link.rel === 'approve');
      if (!approvalLink) {
        return {
          success: false,
          message: 'URL di approvazione PayPal non trovato'
        };
      }
      
      // Crea una pre-sottoscrizione nel database
      const currentDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.interval === 'month' ? 1 : 12));
      
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
      
      return {
        success: true,
        url: approvalLink.href,
        subscriptionId: response.result.id
      };
    } catch (error) {
      console.error('Errore durante la creazione dell\'abbonamento PayPal:', error);
      return {
        success: false,
        message: 'Errore durante la creazione dell\'abbonamento PayPal'
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
}