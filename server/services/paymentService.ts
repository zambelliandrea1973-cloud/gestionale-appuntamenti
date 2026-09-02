import { logger } from '../utils/logger';
import { storage } from '../storage';
import { InsertSubscriptionPlan, InsertSubscription, InsertPaymentMethod, InsertPaymentTransaction, PlanFeatureEntry } from '../../shared/schema';
// @ts-ignore - no type declarations available
import paypal from '@paypal/checkout-server-sdk';
import Stripe from 'stripe';
import { db } from '../db';
import { licenses, subscriptions } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import axios from 'axios';

// Type for licenses: 'base', 'pro', 'business', 'trial', 'passepartout'
type LicenseTypeValue = 'base' | 'pro' | 'business' | 'trial' | 'passepartout';

/**
 * Determine the license type based on the plan name
 * IMPORTANT: The order of checks is crucial!
 * - "base" must be checked BEFORE "pro" because "promo" contains "pro"
 * - We use word boundaries to avoid false positives
 */
function getLicenseTypeFromPlanName(planName: string): LicenseTypeValue {
  const lowerName = planName.toLowerCase();
  
  // Check "business" first (the most specific)
  if (lowerName.includes('business')) {
    return 'business';
  }
  
  // Check "base" BEFORE "pro" to avoid "promo" being interpreted as "pro"
  if (lowerName.includes('base')) {
    return 'base';
  }
  
  // Check "pro" only as a whole word (not "promo", "professionale", etc.)
  // Usa regex per word boundary
  const proRegex = /\bpro\b/i;
  if (proRegex.test(planName)) {
    return 'pro';
  }
  
  // Default: base
  return 'base';
}

/**
 * Create or update the user's license based on the subscription
 */
async function createOrUpdateLicense(
  userId: number,
  licenseType: LicenseTypeValue,
  expiresAt: Date
): Promise<void> {
  try {
    // Find existing license for user
    const [existingLicense] = await db.select()
      .from(licenses)
      .where(eq(licenses.userId, userId))
      .limit(1);
    
    if (existingLicense) {
      // Update the existing license
      await db.update(licenses)
        .set({
          type: licenseType,
          expiresAt,
          isActive: true
        })
        .where(eq(licenses.id, existingLicense.id));
      
      console.log(`📜 License ${existingLicense.id} updated to ${licenseType} for user ${userId}`);
    } else {
      // Create new license
      const licenseCode = `PAY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      await db.insert(licenses).values({
        code: licenseCode,
        type: licenseType,
        isActive: true,
        createdAt: new Date(),
        expiresAt,
        activatedAt: new Date(),
        userId
      });
      
      console.log(`📜 new license ${licenseType} created for user ${userId}`);
    }
  } catch (error) {
    console.error('📜 Error creating/updating license:', error);
  }
}

// Stripe environment configuration
const getStripeClient = async () => {
  // Read credentials from the database
  const paymentMethods = await storage.getPaymentMethods();
  const stripeConfig = paymentMethods.find(m => m.id === 'stripe');
  
  if (!stripeConfig || !stripeConfig.config.secretKey) {
    // Fallback to Secrets if configured in the database
    // FORCE LIVE MODE for autonomous control
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key is missing. Configure it on the Payment Methods page.');
    }
    
    const isLive = stripeSecretKey.startsWith('sk_live_');
    logger.debug(`🔐 Stripe: using LIVE key from Secrets ${isLive ? '💰' : '(fallback TEST 🧪)'}`);
    return new Stripe(stripeSecretKey);
  }
  
  const stripeSecretKey = stripeConfig.config.secretKey;
  
  const isTestKey = stripeSecretKey.startsWith('sk_test_');
  const isLiveKey = stripeSecretKey.startsWith('sk_live_');

  if (!isTestKey && !isLiveKey) {
    throw new Error('Stripe secret key has an invalid format');
  }

  logger.debug(`🔐 Stripe: using key from DATABASE ${isTestKey ? 'TEST 🧪' : 'PRODUCTION (LIVE) 💰'}`);
  
  return new Stripe(stripeSecretKey);
};

// PayPal environment configuration (sandbox for testing, live for production)
const getPayPalClient = async () => {
  // Read credentials from the database
  const paymentMethods = await storage.getPaymentMethods();
  const paypalConfig = paymentMethods.find(m => m.id === 'paypal');
  
  let clientId: string | undefined;
  let clientSecret: string | undefined;
  let mode: 'sandbox' | 'live' = 'sandbox';
  
  if (paypalConfig && paypalConfig.config.clientId && paypalConfig.config.clientSecret) {
    // Use credentials from the database
    clientId = paypalConfig.config.clientId;
    clientSecret = paypalConfig.config.clientSecret;
    mode = paypalConfig.config.mode || 'sandbox';
    logger.debug(`🔐 PayPal: using credentials from DATABASE (${mode.toUpperCase()})`);
  } else {
    // Fallback to Secrets
    const isProduction = process.env.PAYMENT_MODE === 'production';
    clientId = isProduction 
      ? process.env.PAYPAL_CLIENT_ID_LIVE 
      : process.env.PAYPAL_CLIENT_ID;
    clientSecret = isProduction 
      ? process.env.PAYPAL_CLIENT_SECRET_LIVE 
      : process.env.PAYPAL_CLIENT_SECRET;
    mode = isProduction ? 'live' : 'sandbox';
    logger.debug(`🔐 PayPal: using credentials from Secrets (fallback) - ${mode.toUpperCase()}`);
  }
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are missing. Configure them on the Payment Methods page.');
  }
  
  try {
    const environment = mode === 'live'
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);
    
    console.log(`PayPal: ambiente ${mode === 'live' ? 'PRODUZIONE (LIVE) 💰' : 'SANDBOX (TEST) 🧪'}`);
    
    return new paypal.core.PayPalHttpClient(environment);
  } catch (error) {
    console.error('Error creating PayPal client:', error);
    throw error;
  }
};

/** Credentials for the REST subscriptions API.  Keep these server-side only. */
const getPayPalRestConfig = async () => {
  const methods = await storage.getPaymentMethods();
  const config = methods.find(m => m.id === 'paypal')?.config;
  const live = (config?.mode || (process.env.PAYMENT_MODE === 'production' ? 'live' : 'sandbox')) === 'live';
  const clientId = config?.clientId || (live ? process.env.PAYPAL_CLIENT_ID_LIVE : process.env.PAYPAL_CLIENT_ID);
  const clientSecret = config?.clientSecret || (live ? process.env.PAYPAL_CLIENT_SECRET_LIVE : process.env.PAYPAL_CLIENT_SECRET);
  if (!clientId || !clientSecret) throw new Error('PayPal credentials are missing. Configure them on the Payment Methods page.');
  const baseUrl = live ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const token = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return { baseUrl, headers: { Authorization: `Bearer ${token.data.access_token}`, 'Content-Type': 'application/json' } };
};

const paypalRequestId = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/**
 * Service for managing payments and subscriptions
 */
export class PaymentService {
  /**
   * Create a new subscription plan
   */
  static async createSubscriptionPlan(planData: {
    name: string;
    description?: string;
    price: number; // in cents
    interval: 'month' | 'year';
    features?: PlanFeatureEntry[];
    clientLimit?: number;
    sortOrder?: number;
  }): Promise<{success: boolean, plan?: any, message?: string}> {
    try {
      const plan: InsertSubscriptionPlan = {
        name: planData.name,
        description: planData.description,
        price: planData.price,
        interval: planData.interval,
        features: planData.features || null,
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
      console.error('Error creating subscription plan:', error);
      return {
        success: false,
        message: 'Error creating subscription plan'
      };
    }
  }

  /**
   * Get all active subscription plans
   */
  static async getActivePlans() {
    try {
      return await storage.getActiveSubscriptionPlans();
    } catch (error) {
      console.error('Error retrieving subscription plans:', error);
      return [];
    }
  }

  /**
   * Create a new subscription with PayPal
   */
  static async createPayPalSubscription(
    userId: number,
    planId: number,
    returnUrl: string,
    cancelUrl: string
  ): Promise<{success: boolean, url?: string, subscriptionId?: string, message?: string}> {
    try {
      console.log('createPayPalSubscription started with:', { userId, planId, returnUrl, cancelUrl });
      
      // Get plan information
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return {
          success: false,
          message: 'Subscription plan not found'
        };
      }
      
      console.log('Plan found:', plan);
      
      // Calculate the price in euros
      const priceInEuro = (plan.price / 100).toFixed(2);
      
      console.log('PayPal Config:', {
        clientIdPresent: !!process.env.PAYPAL_CLIENT_ID,
        clientSecretPresent: !!process.env.PAYPAL_CLIENT_SECRET,
        environment: process.env.NODE_ENV || 'development',
        price: priceInEuro,
        planName: plan.name
      });
      
      const { baseUrl, headers } = await getPayPalRestConfig();
      const productName = `gestione-appuntamenti-service`;
      const product = await axios.post(`${baseUrl}/v1/catalogs/products`, {
        name: productName, type: 'SERVICE', description: 'Gestione Appuntamenti subscriptions'
      }, { headers: { ...headers, 'PayPal-Request-Id': paypalRequestId(`product:${productName}`) } });
      // PayPal returns the same object for a replayed request id; deterministic IDs
      // make retries safe without trusting a browser supplied value.
      const productId = product.data.id;
      const planKey = `gestione-appuntamenti-plan-${plan.id}-${plan.price}-${plan.interval}`;
      const billingPlan = await axios.post(`${baseUrl}/v1/billing/plans`, {
        product_id: productId, name: planKey,
        billing_cycles: [{ tenure_type: 'REGULAR', sequence: 1, total_cycles: 0,
          frequency: { interval_unit: plan.interval === 'year' ? 'YEAR' : 'MONTH', interval_count: 1 },
          pricing_scheme: { fixed_price: { value: priceInEuro, currency_code: 'EUR' } } }],
        payment_preferences: { auto_bill_outstanding: true }
      }, { headers: { ...headers, 'PayPal-Request-Id': paypalRequestId(`plan:${planKey}`) } });
      const response = await axios.post(`${baseUrl}/v1/billing/subscriptions`, {
        plan_id: billingPlan.data.id, custom_id: String(userId),
        application_context: { return_url: returnUrl, cancel_url: cancelUrl, brand_name: 'Gestione Appuntamenti',
          user_action: 'SUBSCRIBE_NOW', shipping_preference: 'NO_SHIPPING' }
      }, { headers: { ...headers, 'PayPal-Request-Id': paypalRequestId(`subscription:${userId}:${plan.id}:${billingPlan.data.id}`) } });
      
      // Find the approval URL
      const approvalLink = response.data.links?.find((link: any) => link.rel === 'approve');
      if (!approvalLink) {
        console.error('Available links:', response.data.links);
        return {
          success: false,
          message: 'PayPal approval URL not found'
        };
      }
      
      console.log('URL approvazione found:', approvalLink.href);
      
      // Check if a subscription already exists for this user
      const existingSubscription = await storage.getSubscriptionByUserId(userId);
      const currentDate = new Date();
      const endDate = new Date();
      
      // Calculate the expiry date based on the plan interval
      if (plan.interval === 'month') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      
      if (existingSubscription) {
        // If a subscription already exists, update it instead of creating a new one
        console.log(`Existing subscription found (ID: ${existingSubscription.id}), updating instead of creating a new one`);
        await storage.updateSubscription(existingSubscription.id, {
          planId,
          status: 'pending',
          currentPeriodStart: currentDate,
          currentPeriodEnd: endDate,
          cancelAtPeriodEnd: false,
          paypalSubscriptionId: response.data.id,
          paymentMethod: 'paypal'
        });
      } else {
        // Create a new pre-subscription in the database
        const subscriptionData: InsertSubscription = {
          userId,
          planId,
          status: 'pending',
          currentPeriodStart: currentDate,
          currentPeriodEnd: endDate,
          cancelAtPeriodEnd: false,
          paypalSubscriptionId: response.data.id,
          paymentMethod: 'paypal'
        };
        
        await storage.createSubscription(subscriptionData);
      }
      
      return {
        success: true,
        url: approvalLink.href,
        subscriptionId: response.data.id
      };
    } catch (error) {
      // Detailed error log for debugging
      console.error('Error creating PayPal subscription:');
      
      if (error instanceof Error) {
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
      } else {
        console.error('Non-standard error:', error);
      }
      
      // Verify the error type and provide a more specific message
      let errorMessage = 'Error creating PayPal subscription';
      
      if (error instanceof Error) {
        errorMessage += ': ' + error.message;
      }
      
      // Verify the credentials PayPal
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
   * Finalize a PayPal subscription after user approval
   */
  static async finalizePayPalSubscription(
    orderId: string,
    userId: number
  ): Promise<{success: boolean, message?: string}> {
    try {
      // Find the subscription in the database
      const subscription = await storage.getSubscriptionByUserId(userId);
      if (!subscription) {
        return {
          success: false,
          message: 'Subscription not found'
        };
      }
      // New recurring checkouts return an I-* subscription id. Verify it from
      // PayPal instead of capturing an Order client-side.
      if (orderId.startsWith('I-')) {
        if (subscription.paypalSubscriptionId !== orderId) {
          return { success: false, message: 'Subscription does not belong to this checkout' };
        }
        const result = await this.syncPayPalSubscription(subscription);
        return result.status === 'active'
          ? { success: true }
          : { success: false, message: 'PayPal subscription is not active yet' };
      }
      
      // Capture the PayPal payment
      const client = await getPayPalClient();
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});
      
      const response = await client.execute(request);
      
      if (response.statusCode !== 201) {
        return {
          success: false,
          message: 'Error finalizing PayPal payment'
        };
      }
      
      // Update the subscription status
      await storage.updateSubscription(subscription.id, {
        status: 'active'
      });
      
      // AUTOMATIC REFERRAL SYSTEM: Create commission if the user was sponsored
      await this.handleReferralCommission(userId, subscription.id, subscription.plan.price);
      
      // Register the transaction
      const transactionData: InsertPaymentTransaction = {
        userId,
        subscriptionId: subscription.id,
        amount: subscription.plan.price,
        currency: 'EUR',
        status: 'completed',
        paymentMethod: 'paypal',
        transactionId: response.result.id,
        description: `Payment for subscription ${subscription.plan.name}`
      };
      
      await storage.createPaymentTransaction(transactionData);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error finalizing PayPal subscription:', error);
      return {
        success: false,
        message: 'Error finalizing PayPal subscription'
      };
    }
  }

  /**
   * Finalize a PayPal subscription using only the token (public endpoint)
   * Find the subscription via paypal_subscription_id in the database
   */
  static async finalizePayPalSubscriptionByToken(
    orderId: string
  ): Promise<{success: boolean, message?: string, userId?: number}> {
    try {
      logger.debug(`📦 [PAYPAL PUBLIC] Finalizing subscription with token: ${orderId}`);
      
      // Find the subscription in the database via PayPal Order ID
      const subscription = await storage.getSubscriptionByPayPalOrderId(orderId);
      if (!subscription) {
        logger.debug(`📦 [PAYPAL PUBLIC] Subscription not found for token: ${orderId}`);
        return {
          success: false,
          message: 'Subscription not found for this PayPal order'
        };
      }
      
      const userId = subscription.userId;
      logger.debug(`📦 [PAYPAL PUBLIC] subscription found: ID ${subscription.id}, User ${userId}, Status: ${subscription.status}`);
      
      // If already active, do nothing
      if (subscription.status === 'active') {
        logger.debug(`📦 [PAYPAL PUBLIC] subscription already active, returning success`);
        return {
          success: true,
          userId
        };
      }
      if (orderId.startsWith('I-')) {
        const synced = await this.syncPayPalSubscription(subscription);
        return synced.status === 'active'
          ? { success: true, userId }
          : { success: false, message: 'PayPal subscription is not active', userId };
      }
      
      // Capture the PayPal payment
      const client = await getPayPalClient();
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});
      
      logger.debug(`📦 [PAYPAL PUBLIC] Sending capture request to PayPal...`);
      const response = await client.execute(request);
      logger.debug(`📦 [PAYPAL PUBLIC] PayPal response: ${response.statusCode}`);
      
      if (response.statusCode !== 201) {
        return {
          success: false,
          message: 'Error finalizing PayPal payment'
        };
      }
      
      // Update the subscription status
      await storage.updateSubscription(subscription.id, {
        status: 'active'
      });
      
      logger.debug(`📦 [PAYPAL PUBLIC] subscription ${subscription.id} activated successfully`);
      
      // Create/update the user's license based on the paid plan
      const licenseType = getLicenseTypeFromPlanName(subscription.plan.name);
      const licenseExpiry = subscription.currentPeriodEnd || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await createOrUpdateLicense(userId, licenseType, licenseExpiry);
      
      // AUTOMATIC REFERRAL SYSTEM: Create commission if the user was sponsored
      await this.handleReferralCommission(userId, subscription.id, subscription.plan.price);
      
      // Register the transaction
      const transactionData: InsertPaymentTransaction = {
        userId,
        subscriptionId: subscription.id,
        amount: subscription.plan.price,
        currency: 'EUR',
        status: 'completed',
        paymentMethod: 'paypal',
        transactionId: response.result.id,
        description: `Payment for subscription ${subscription.plan.name}`
      };
      
      await storage.createPaymentTransaction(transactionData);
      
      logger.debug(`📦 [PAYPAL PUBLIC] transaction registered for user ${userId}`);
      
      return {
        success: true,
        userId
      };
    } catch (error) {
      console.error('📦 [PAYPAL PUBLIC] Error:', error);
      return {
        success: false,
        message: 'Error finalizing PayPal subscription'
      };
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(
    userId: number,
    immediate: boolean = false
  ): Promise<{success: boolean, message?: string}> {
    try {
      // Find the subscription in the database
      const subscription = await storage.getSubscriptionByUserId(userId);
      if (!subscription) {
        return {
          success: false,
          message: 'Subscription not found'
        };
      }
      
      if (immediate) return { success: false, message: 'Immediate cancellation is not supported' };
      if (subscription.stripeSubscriptionId) {
        const stripe = await getStripeClient();
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
      } else if (subscription.paypalSubscriptionId?.startsWith('I-')) {
        const { baseUrl, headers } = await getPayPalRestConfig();
        await axios.post(`${baseUrl}/v1/billing/subscriptions/${subscription.paypalSubscriptionId}/cancel`,
          { reason: 'Cancelled by customer at period end' }, { headers });
      }
      // Manual subscriptions have no remote cancellation operation, but retain
      // access until their already-paid period expires.
      await storage.cancelSubscription(subscription.id, true);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        message: 'Error cancelling subscription'
      };
    }
  }

  /** Reads provider state only: no transactions or referral commissions are created here. */
  private static async syncSubscription(subscription: any): Promise<any> {
    if (subscription.stripeSubscriptionId) {
      const stripe = await getStripeClient();
      const remote: any = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      const updated = await storage.updateSubscription(subscription.id, {
        status: this.normaliseProviderStatus(remote.status),
        currentPeriodStart: remote.current_period_start ? new Date(remote.current_period_start * 1000) : subscription.currentPeriodStart,
        currentPeriodEnd: remote.current_period_end ? new Date(remote.current_period_end * 1000) : subscription.currentPeriodEnd,
        cancelAtPeriodEnd: !!remote.cancel_at_period_end
      });
      if (updated?.status === 'active' && updated.currentPeriodEnd) {
        await createOrUpdateLicense(updated.userId, getLicenseTypeFromPlanName(subscription.plan.name), updated.currentPeriodEnd);
      }
      return updated ? { ...subscription, ...updated } : subscription;
    }
    if (subscription.paypalSubscriptionId?.startsWith('I-')) return this.syncPayPalSubscription(subscription);
    return subscription;
  }

  private static normaliseProviderStatus(status: string): 'active' | 'past_due' | 'canceled' | 'pending' {
    const value = status.toLowerCase();
    if (value === 'active' || value === 'trialing') return 'active';
    if (['past_due', 'unpaid', 'suspended'].includes(value)) return 'past_due';
    if (['canceled', 'cancelled', 'expired'].includes(value)) return 'canceled';
    return 'pending';
  }

  private static async syncPayPalSubscription(subscription: any): Promise<any> {
    const { baseUrl, headers } = await getPayPalRestConfig();
    const { data } = await axios.get(`${baseUrl}/v1/billing/subscriptions/${subscription.paypalSubscriptionId}`, { headers });
    if (String(data.custom_id) !== String(subscription.userId)) throw new Error('PayPal subscription ownership mismatch');
    const end = data.billing_info?.next_billing_time ? new Date(data.billing_info.next_billing_time) : subscription.currentPeriodEnd;
    // PayPal's cancel endpoint returns CANCELLED immediately, while our
    // entitlement remains valid through the paid local/provider period.
    const providerStatus = this.normaliseProviderStatus(data.status);
    const retainAccess = subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd) > new Date();
    const updated = await storage.updateSubscription(subscription.id, {
      status: retainAccess ? 'active' : providerStatus,
      currentPeriodStart: data.start_time ? new Date(data.start_time) : subscription.currentPeriodStart,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: data.status === 'CANCELLED'
    });
    if (updated?.status === 'active' && end) await createOrUpdateLicense(updated.userId, getLicenseTypeFromPlanName(subscription.plan.name), end);
    return updated ? { ...subscription, ...updated } : subscription;
  }

  /**
   * Get the subscription status for a user
   */
  static async getUserSubscription(userId: number) {
    try {
      const subscription = await storage.getSubscriptionByUserId(userId);
      return subscription ? await this.syncSubscription(subscription) : null;
    } catch (error) {
      console.error('Error retrieving user subscription:', error);
      return null;
    }
  }

  /**
   * Check if a user has an active subscription
   */
  static async hasActiveSubscription(userId: number): Promise<boolean> {
    try {
      const current = await storage.getSubscriptionByUserId(userId);
      const subscription = current ? await this.syncSubscription(current) : current;
      return subscription?.status === 'active';
    } catch (error) {
      console.error('Error verifying active subscription:', error);
      return false;
    }
  }

  /**
   * Get the transaction history of a user
   */
  static async getUserTransactions(userId: number) {
    try {
      return await storage.getPaymentTransactionsByUser(userId);
    } catch (error) {
      console.error('Error retrieving user transactions:', error);
      return [];
    }
  }

  /**
   * Create a Stripe checkout session for a subscription
   */
  static async createStripeCheckoutSession(
    userId: number,
    planId: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<{success: boolean, url?: string, sessionId?: string, message?: string}> {
    try {
      return await db.transaction(async (tx) => {
      // Serialize checkout creation per user across requests and app instances.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${userId})`);

      // Get plan information
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return {
          success: false,
          message: 'Subscription plan not found'
        };
      }
      
      // Get the client
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Create a checkout session
      const stripe = await getStripeClient();
      const existingSubscription = await storage.getSubscriptionByUserId(userId);

      if (
        existingSubscription?.status === 'pending' &&
        existingSubscription.stripeSessionId
      ) {
        try {
          const previousSession = await stripe.checkout.sessions.retrieve(
            existingSubscription.stripeSessionId
          );
          const previousPlanId = previousSession.metadata?.planId
            ? parseInt(previousSession.metadata.planId, 10)
            : null;

          if (previousSession.payment_status === 'paid') {
            const confirmation = await this.confirmStripeSession(previousSession.id, userId);
            if (!confirmation.success) {
              return confirmation;
            }
            return {
              success: true,
              url: successUrl,
              sessionId: previousSession.id,
              message: 'Previous payment confirmed'
            };
          }

          if (previousSession.status === 'open') {
            if (previousPlanId === planId && previousSession.url) {
              return {
                success: true,
                url: previousSession.url,
                sessionId: previousSession.id,
                message: 'Existing checkout session reused'
              };
            }

            // A user can have only one pending subscription row. Expire the
            // previous unpaid checkout before replacing its session reference.
            await stripe.checkout.sessions.expire(previousSession.id);
          }
        } catch (previousSessionError) {
          console.warn('Unable to reuse or expire previous Stripe checkout:', previousSessionError);
          try {
            const latestSession = await stripe.checkout.sessions.retrieve(
              existingSubscription.stripeSessionId
            );

            if (latestSession.payment_status === 'paid') {
              const confirmation = await this.confirmStripeSession(latestSession.id, userId);
              if (!confirmation.success) return confirmation;
              return {
                success: true,
                url: successUrl,
                sessionId: latestSession.id,
                message: 'Previous payment confirmed'
              };
            }

            if (latestSession.status === 'open') {
              return {
                success: false,
                message: 'A previous checkout is still open and could not be safely replaced'
              };
            }
          } catch (recheckError) {
            const stripeError = recheckError as { code?: string; statusCode?: number };
            const isMissingSession =
              stripeError.code === 'resource_missing' ||
              stripeError.statusCode === 404;

            if (!isMissingSession) {
              console.error('Unable to verify previous Stripe checkout safely:', recheckError);
              return {
                success: false,
                message: 'Stripe is temporarily unavailable. Please retry without starting a new payment.'
              };
            }

            console.warn('Previous Stripe checkout no longer exists; creating a replacement');
          }
        }
      }
      
      console.log('🔗 STRIPE URLs configurati:', {
        successUrl,
        cancelUrl,
        successProtocol: successUrl.startsWith('https') ? 'HTTPS ✅' : 'HTTP ❌',
        cancelProtocol: cancelUrl.startsWith('https') ? 'HTTPS ✅' : 'HTTP ❌'
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Abbonamento ${plan.name}`,
                description: plan.description || undefined,
              },
              unit_amount: plan.price, // Price already in cents from the database
               recurring: { interval: plan.interval as 'month' | 'year' },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
          planType: plan.name
        },
         subscription_data: { metadata: { userId: userId.toString(), planId: planId.toString(), planType: plan.name } },
        customer_email: user.email || undefined,
        success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}&type=stripe`,
        cancel_url: cancelUrl,
      });
      
      console.log('Stripe session created:', {
        id: session.id,
        url: session.url,
        hasUrl: !!session.url,
        mode: session.mode,
        status: session.status
      });
      
      const currentDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.interval === 'month' ? 1 : 12));
      
      if (existingSubscription) {
        // If a subscription already exists, update it instead of creating a new one
        console.log(`Existing subscription found (ID: ${existingSubscription.id}), updating instead of creating a new one`);
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
        // Create a new pre-subscription in the database
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
      });
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      return {
        success: false,
        message: 'Error creating Stripe checkout session'
      };
    }
  }

  /**
   * Confirm a Stripe checkout session after payment
   * Verify the session status and activate the license if payment is completed
   */
  static async confirmStripeSession(
    sessionId: string,
    userId: number
  ): Promise<{success: boolean, message?: string}> {
    try {
      const stripe = await getStripeClient();
      
      // Retrieve the session da Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      console.log('💳 Stripe session retrieved:', {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        userId: session.metadata?.userId
      });
      
      // Verify that the payment is completed
      if (session.payment_status !== 'paid') {
        return {
          success: false,
          message: 'Payment not yet completed'
        };
      }
      
      // Verify that the user matches
      const sessionUserId = session.metadata?.userId ? parseInt(session.metadata.userId) : null;
      if (!sessionUserId || sessionUserId !== userId) {
        console.warn(`⚠️ User mismatch: session ${sessionUserId}, request ${userId}`);
        return {
          success: false,
          message: 'Checkout session does not belong to this user'
        };
      }
      
      // Bind confirmation to the exact pending subscription created for this checkout.
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.stripeSessionId, sessionId)
        ))
        .limit(1);

      if (!subscription) {
        return {
          success: false,
          message: 'Subscription not found for this checkout session'
        };
      }

      const sessionPlanId = session.metadata?.planId ? parseInt(session.metadata.planId, 10) : null;
      if (!sessionPlanId || sessionPlanId !== subscription.planId) {
        console.warn(`⚠️ Plan mismatch: session ${sessionPlanId}, subscription ${subscription.planId}`);
        return {
          success: false,
          message: 'Checkout plan does not match the pending subscription'
        };
      }
      
      // If the subscription is already active, return success
      if (subscription.status === 'active') {
        return {
          success: true,
          message: 'Subscription already active'
        };
      }
      
      const stripeSubscriptionId = typeof session.subscription === 'string'
        ? session.subscription : session.subscription?.id;
      if (!stripeSubscriptionId) return { success: false, message: 'Stripe subscription is missing from checkout' };
      const providerSubscription: any = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const periodStart = new Date(providerSubscription.current_period_start * 1000);
      const periodEnd = new Date(providerSubscription.current_period_end * 1000);
      // Activate using Stripe's authoritative subscription period.
      await storage.updateSubscription(subscription.id, {
        status: 'active',
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
        stripeSubscriptionId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: providerSubscription.cancel_at_period_end
      });
      
      // Get the plan to determine the license type
      const plan = await storage.getSubscriptionPlan(sessionPlanId);
      if (plan) {
        const licenseType = getLicenseTypeFromPlanName(plan.name);
        const licenseExpiry = periodEnd;
        await createOrUpdateLicense(userId, licenseType, licenseExpiry);
        logger.debug(`✅ license ${licenseType} activated for user ${userId}`);
      }
      
      // AUTOMATIC REFERRAL SYSTEM: Create commission if the user was sponsored
      if (session.amount_total) {
        await this.handleReferralCommission(userId, subscription.id, session.amount_total / 100);
      }
      
      // Register the transaction if it already exists
      if (session.payment_intent) {
        const transactionData: InsertPaymentTransaction = {
          userId,
          subscriptionId: subscription.id,
          amount: (session.amount_total || 0) / 100,
          currency: (session.currency || 'EUR').toUpperCase(),
          status: 'completed',
          paymentMethod: 'stripe',
          transactionId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id,
          description: `Payment for subscription ${plan?.name || 'unknown'}`
        };
        
        await storage.createPaymentTransaction(transactionData);
      }
      
      return {
        success: true,
        message: 'Subscription activated successfully'
      };
    } catch (error) {
      console.error('Error confirming Stripe session:', error);
      return {
        success: false,
        message: 'Error confirming Stripe session'
      };
    }
  }

  /**
   * Handle the Stripe webhook to complete a payment
   */
  static async handleStripeWebhook(
    event: any
  ): Promise<{success: boolean, message?: string}> {
    try {
      const { type, data } = event;
      
      // Handle Stripe events based on type
      if (type === 'checkout.session.completed') {
        const session = data.object;
        
        // Get data from metadata
        const userId = parseInt(session.metadata.userId);
        const planId = parseInt(session.metadata.planId);
        
        // Find the subscription in the database
        const subscription = await storage.getSubscriptionByUserId(userId);
        if (!subscription) {
          return {
            success: false,
            message: 'Subscription not found'
          };
        }
        
        // Update the subscription status
        await storage.updateSubscription(subscription.id, {
          status: 'active',
          stripeCustomerId: session.customer || null
        });
        
        // Get the plan to determine the license type
        const plan = await storage.getSubscriptionPlan(planId);
        if (plan) {
          const licenseType = getLicenseTypeFromPlanName(plan.name);
          const licenseExpiry = subscription.currentPeriodEnd || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          await createOrUpdateLicense(userId, licenseType, licenseExpiry);
        }
        
        // AUTOMATIC REFERRAL SYSTEM: Create commission if the user was sponsored
        await this.handleReferralCommission(userId, subscription.id, session.amount_total / 100);
        
        // Register the transaction
        const transactionData: InsertPaymentTransaction = {
          userId,
          subscriptionId: subscription.id,
          amount: session.amount_total / 100, // Convert from cents
          currency: session.currency.toUpperCase(),
          status: 'completed',
          paymentMethod: 'stripe',
          transactionId: session.payment_intent,
          description: `Payment for subscription ${session.metadata.planType}`
        };
        
        await storage.createPaymentTransaction(transactionData);
        
        // Funnel milestone — subscription confirmed server-side via Stripe webhook
        try {
          const { recordMilestone } = await import('../utils/funnelMilestones');
          await recordMilestone(userId, 'subscription_purchased');
        } catch (_) {}
        
        return {
          success: true
        };
      }
      
      return {
        success: true,
        message: `Evento Stripe non gestito: ${type}`
      };
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      return {
        success: false,
        message: 'Error handling Stripe webhook'
      };
    }
  }

  /**
   * Automatic referral system: Create commission when a subscription becomes active
   * 
   * COMMISSION LOGIC (Option B - One-time vs Recurring):
   * - ANNUAL Plan: Commission 25% paid ONCE after 30 days
   * - MONTHLY plan: 25% commission paid EVERY MONTH (recurring)
   * 
   * The `monthlyAmount` field always contains 25% of the total price.
   * The payment type depends on the plan interval (year/month).
   * 
   * @param userId ID of the user who made the subscription
   * @param subscriptionId Subscription ID
   * @param planPrice Plan price in cents
   */
  private static async handleReferralCommission(
    userId: number,
    subscriptionId: number,
    planPrice: number
  ): Promise<void> {
    try {
      // Check if the user was sponsored by someone
      const user = await storage.getUser(userId);
      if (!user || !user.referredBy) {
        logger.debug(`ℹ️ user ${userId} has no sponsor - no commission to create`);
        return;
      }

      // Check if a commission already exists for this subscription
      const existingCommission = await storage.getReferralCommissionsByReferred(userId);
      if (existingCommission) {
        logger.debug(`⚠️ commission already exists for user ${userId} - skip`);
        return;
      }

      // Get plan info to determine if it is annual or monthly
      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        logger.debug(`⚠️ subscription ${subscriptionId} not found - commission not created`);
        return;
      }
      
      const plan = await storage.getSubscriptionPlan(subscription.planId);
      if (!plan) {
        logger.debug(`⚠️ plan ${subscription.planId} not found - commission not created`);
        return;
      }

      // Calculate commission at 25% of plan price
      const commissionAmount = Math.round(planPrice * 0.25);
      const isRecurring = plan.interval === 'month';
      
      // Get info sponsor
      const sponsor = await storage.getUser(user.referredBy);
      if (!sponsor) {
        logger.debug(`⚠️ Sponsor ID ${user.referredBy} not found - commission not created`);
        return;
      }

      // Calculate payout date (30 days after startDate)
      const payoutDate = new Date();
      payoutDate.setDate(payoutDate.getDate() + 30);
      
      // Create the commission automatically
      const commissionData = {
        referrerId: user.referredBy,
        referredId: userId,
        subscriptionId: subscriptionId,
        monthlyAmount: commissionAmount, // Contains 25% of the total price
        status: 'active',
        startDate: new Date(),
        endDate: null,
        payoutScheduledDate: payoutDate,
        payoutStatus: 'scheduled'
      };

      await storage.createReferralCommission(commissionData);
      
      const paymentType = isRecurring ? 'monthly recurring' : 'one-time';
      console.log(`🎉 AUTOMATIC commission created!`);
      console.log(`   Sponsor: ${sponsor.username} (ID: ${sponsor.id})`);
      console.log(`   Client: ${user.username} (ID: ${user.id})`);
      console.log(`   Plan: ${plan.name} (${plan.interval === 'year' ? 'Annual' : 'Monthly'})`);
      console.log(`   commission: €${(commissionAmount/100).toFixed(2)} ${paymentType} (25% of €${(planPrice/100).toFixed(2)})`);
      console.log(`   📅 Payout scheduled for: ${payoutDate.toLocaleDateString('en-US')} (30d)`);
    } catch (error) {
      console.error('Error creating referral commission:', error);
      // Don't block the payment if there is an error in the commission
    }
  }
}