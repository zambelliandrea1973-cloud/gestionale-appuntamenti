// @ts-nocheck
import express from 'express';
import { storage } from '../storage';
import { isPaymentAdmin } from '../middleware/paymentAdminAuth';
import { isAdminOrStaff } from '../middleware/authMiddleware';
import Stripe from 'stripe';
import paypal from '@paypal/checkout-server-sdk';

// Create the Express router
const router = express.Router();

// Stripe client configuration (if credentials exist)
const setupStripeClient = (secretKey: string) => {
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
};

// PayPal client configuration (if credentials exist)
const setupPaypalClient = (clientId: string, clientSecret: string, mode: 'sandbox' | 'live') => {
  const environment = mode === 'live'
    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
    : new paypal.core.SandboxEnvironment(clientId, clientSecret);
  
  return new paypal.core.PayPalHttpClient(environment);
};

const getStripeConfigFromEnvironment = () => {
  const isProduction = process.env.PAYMENT_MODE === 'production';

  return {
    publicKey: isProduction
      ? (process.env.VITE_STRIPE_PUBLIC_KEY_LIVE || process.env.VITE_STRIPE_PUBLIC_KEY || '')
      : (process.env.VITE_STRIPE_PUBLIC_KEY || process.env.VITE_STRIPE_PUBLIC_KEY_LIVE || ''),
    secretKey: isProduction
      ? (process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY || '')
      : (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_LIVE || ''),
  };
};

/**
 * Get configured payment methods
 * GET /api/payments/payment-admin/payment-methods
 * Access: payment admin
 */
router.get('/payment-admin/payment-methods', isPaymentAdmin, async (req, res) => {
  try {
    let paymentMethods = await storage.getPaymentMethods();
    const isProduction = process.env.PAYMENT_MODE === 'production';
    const stripeEnvironmentConfig = getStripeConfigFromEnvironment();
    
    if (!paymentMethods || paymentMethods.length === 0) {
      // If payment methods are configured, create initial configuration with Stripe and PayPal
      const defaultMethods = [
        {
          id: 'stripe',
          name: 'Carta di Credito (Stripe)',
          enabled: true,
          config: {
            publicKey: stripeEnvironmentConfig.publicKey,
            secretKey: stripeEnvironmentConfig.secretKey,
            webhookSecret: '',
            statementDescriptor: 'Gestionale Appuntamenti'
          }
        },
        {
          id: 'paypal',
          name: 'PayPal',
          enabled: true,
          config: {
            clientId: isProduction 
              ? (process.env.PAYPAL_CLIENT_ID_LIVE || '') 
              : (process.env.PAYPAL_CLIENT_ID || ''),
            clientSecret: isProduction 
              ? (process.env.PAYPAL_CLIENT_SECRET_LIVE || '') 
              : (process.env.PAYPAL_CLIENT_SECRET || ''),
            mode: isProduction ? 'live' : 'sandbox'
          }
        },
        {
          id: 'wise',
          name: 'Wise (TransferWise)',
          enabled: false,
          config: {
            apiKey: '',
            profileId: '',
            accountId: '',
            recipientEmail: ''
          }
        },
        {
          id: 'bank',
          name: 'Bank Transfer',
          enabled: false,
          config: {
            accountName: '',
            iban: '',
            swift: '',
            bankName: '',
            instructions: ''
          }
        }
      ];
      
      // Save the initial configuration
      await storage.savePaymentMethods(defaultMethods);
      paymentMethods = defaultMethods;
      
      console.log('✅ Payment methods configuration initialized automatically');
    } else {
      // Automatically populate empty fields with values from environment secrets
      paymentMethods = paymentMethods.map(method => {
        if (method.id === 'stripe' && method.config) {
          // If Stripe fields are empty, use environment secrets
          if (!method.config.publicKey || !method.config.secretKey) {
            method.config.publicKey = stripeEnvironmentConfig.publicKey;
            method.config.secretKey = stripeEnvironmentConfig.secretKey;
            console.log('✅ Stripe keys populated from environment secrets');
          }
        }
        return method;
      });
    }
    
    // Return full credentials (user authenticated as payment admin)
    return res.json(paymentMethods);
  } catch (error: any) {
    console.error('Error retrieving payment methods:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Save payment method configuration
 * POST /api/payments/payment-admin/payment-methods
 * Access: payment admin
 */
router.post('/payment-admin/payment-methods', isPaymentAdmin, async (req, res) => {
  try {
    const { paymentMethods } = req.body;
    
    if (!paymentMethods || !Array.isArray(paymentMethods)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method data'
      });
    }
    
    // Save the payment methods as they arrive (complete credentials)
    await storage.savePaymentMethods(paymentMethods);
    
    return res.json({
      success: true,
      message: 'Payment method configuration saved successfully'
    });
  } catch (error: any) {
    console.error('Error saving payment methods:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Test the configuration of a payment method
 * POST /api/payments/payment-admin/test-payment-method/:id
 * Access: payment admin
 */
router.post('/payment-admin/test-payment-method/:id', isPaymentAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Payment method configuration missing'
      });
    }
    
    // Test the configuration based on the method type
    if (id === 'stripe') {
      if (!config.secretKey) {
        return res.status(400).json({
          success: false,
          message: 'Chiave segreta Stripe missing'
        });
      }
      
      try {
        const stripe = setupStripeClient(config.secretKey);
        // Verify key validity by getting the account balance
        const balance = await stripe.balance.retrieve();
        
        return res.json({
          success: true,
          message: 'Valid Stripe configuration'
        });
      } catch (stripeError: any) {
        return res.status(400).json({
          success: false,
          message: `Stripe configuration error: ${stripeError.message}`
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
        console.log('🔧 PayPal test - Setup client with mode:', config.mode || 'sandbox');
        const paypalClient = setupPaypalClient(config.clientId, config.clientSecret, config.mode || 'sandbox');
        
        // Verify credentials by creating a trial order with the old SDK
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: 'EUR',
              value: '1.00'
            }
          }]
        });
        
        const response = await paypalClient.execute(request);
        
        // If we get here, the credentials are valid
        console.log('✅ PayPal test OK - Order ID:', response.result.id);
        return res.json({
          success: true,
          message: 'Valid PayPal configuration',
          testOrderId: response.result.id
        });
      } catch (paypalError: any) {
        console.error('❌ PayPal test ERROR:', paypalError);
        console.error('❌ PayPal error stack:', paypalError.stack);
        console.error('❌ PayPal error message:', paypalError.message);
        return res.status(400).json({
          success: false,
          message: `PayPal configuration error: ${paypalError.message || 'Invalid credentials'}`
        });
      }
    } 
    else if (id === 'wise') {
      if (!config.apiKey) {
        return res.status(400).json({
          success: false,
          message: 'API Key Wise missing'
        });
      }
      
      try {
        // For Wise, make a simple trial request to the API
        const response = await fetch('https://api.transferwise.com/v3/profiles', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Risposta API Wise invalid: ${response.status}`);
        }
        
        return res.json({
          success: true,
          message: 'Valid Wise configuration'
        });
      } catch (wiseError: any) {
        return res.status(400).json({
          success: false,
          message: `Wise configuration error: ${wiseError.message}`
        });
      }
    } 
    else if (id === 'bank') {
      // For bank transfer, verify that the essential data is present
      if (!config.iban || !config.accountName) {
        return res.status(400).json({
          success: false,
          message: 'Incomplete banking data (IBAN and account holder are required)'
        });
      }
      
      return res.json({
        success: true,
        message: 'Valid bank transfer configuration'
      });
    } 
    else {
      return res.status(400).json({
        success: false,
        message: `Payment method not supported: ${id}`
      });
    }
  } catch (error: any) {
    console.error(`Error testing payment method ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Auto-configure Wise by retrieving Profile ID and Account ID from the API
 * POST /api/payments/payment-admin/wise/auto-configure
 * Access: payment admin
 */
router.post('/payment-admin/wise/auto-configure', isPaymentAdmin, async (req, res) => {
  try {
    console.log('🔍 Body received for auto-configure:', JSON.stringify(req.body));
    
    // Retrieve the current payment methods
    const paymentMethods = await storage.getPaymentMethods();
    const wiseMethod = paymentMethods.find(m => m.id === 'wise');
    
    // Get the API Key from the request body (frontend) or from the saved file
    const apiKey = req.body.apiKey || wiseMethod?.config.apiKey;
    
    console.log('🔑 API Key from body:', req.body.apiKey);
    console.log('🔑 API Key from file:', wiseMethod?.config.apiKey);
    console.log('🔑 Final API key chosen:', apiKey);
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Wise API Key not configured. Please enter the API Key first.'
      });
    }
    
    // If the API Key comes from the frontend, also update it in wiseMethod
    if (req.body.apiKey && wiseMethod) {
      wiseMethod.config.apiKey = req.body.apiKey;
    }
    
    const baseUrl = 'https://api.transferwise.com';
    
    try {
      // Step 1: Retrieve Profile ID using v2 endpoint (compatible with Personal account)
      console.log('🔍 Retrieving Profile ID from Wise (v2 endpoint for Personal account)...');
      const profilesResponse = await fetch(`${baseUrl}/v2/profiles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!profilesResponse.ok) {
        const errorText = await profilesResponse.text();
        throw new Error(`Wise API error (profiles): ${profilesResponse.status} ${profilesResponse.statusText} - ${errorText}`);
      }
      
      const profiles = await profilesResponse.json();
      
      if (!profiles || profiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No profile found for this API Key. Make sure two-factor authentication is enabled.'
        });
      }
      
      const profileId = profiles[0].id;
      const profileType = profiles[0].type || 'personal';
      console.log(`✅ Profile ID retrieved: ${profileId} (type: ${profileType})`);
      
      // Step 2: Retrieve Balance/Account ID usando v4 endpoint
      console.log('🔍 Retrieving Balance ID from Wise (v4 endpoint)...');
      const balancesResponse = await fetch(`${baseUrl}/v4/profiles/${profileId}/balances?types=STANDARD`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!balancesResponse.ok) {
        const errorText = await balancesResponse.text();
        throw new Error(`Wise API error (balances): ${balancesResponse.status} ${balancesResponse.statusText} - ${errorText}`);
      }
      
      const balances = await balancesResponse.json();
      
      if (!balances || balances.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No Wise balance found. Make sure you have at least one active currency in your account.'
        });
      }
      
      const accountId = balances[0].id;
      console.log(`✅ Balance ID retrieved: ${accountId}`);
      
      // Step 3: Update the Wise configuration in the database
      wiseMethod.config.profileId = profileId.toString();
      wiseMethod.config.accountId = accountId.toString();
      
      await storage.savePaymentMethods(paymentMethods);
      
      console.log('✅ Wise configuration updated automatically');
      
      return res.json({
        success: true,
        message: `Wise configuration completed automatically (account ${profileType})`,
        data: {
          profileId: profileId.toString(),
          accountId: accountId.toString(),
          profileType: profileType
        }
      });
      
    } catch (apiError: any) {
      console.error('❌ Error calling Wise API:', apiError);
      return res.status(400).json({
        success: false,
        message: `Wise API error: ${apiError.message}`
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error during Wise auto-configuration:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Get available payment methods for user
 * GET /api/payments/available-methods
 * Access: all (public)
 */
router.get('/available-methods', async (req, res) => {
  try {
    const paymentMethods = await storage.getPaymentMethods();
    
    // Returns only active methods with basic information (without credentials)
    const availableMethods = paymentMethods
      .filter(method => method.enabled)
      .map(method => ({
        id: method.id,
        name: method.name,
        // Only informazioni pubbliche specifiche per each metodo
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
              recipient: method.config.recipient || method.config.accountName,
              instructions: method.config.instructions
            }
          : {}
      }));
    
    return res.json(availableMethods);
  } catch (error: any) {
    console.error('Error retrieving available payment methods:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Verify which payment method to use for a subscription
 * GET /api/payments/subscription/:id/payment-method
 * Access: admin, staff
 */
router.get('/subscription/:id/payment-method', isAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the subscription
    const subscription = await storage.getSubscription(parseInt(id));
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Return payment method information
    return res.json({
      subscriptionId: subscription.id,
      paymentMethod: subscription.paymentMethod,
      // Other useful payment information
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd
    });
  } catch (error: any) {
    console.error('Error verifying payment method:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

export default router;