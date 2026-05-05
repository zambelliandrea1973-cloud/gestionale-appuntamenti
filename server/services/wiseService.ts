// @ts-nocheck
import axios from 'axios';
import { storage } from '../storage';
import { InsertPaymentTransaction } from '../../shared/schema';

/**
 * Service for integration with Wise (formerly TransferWise)
 */
export class WiseService {
  private static BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://api.transferwise.com'
    : 'https://api.sandbox.transferwise.tech';
  
  private static API_KEY = process.env.WISE_API_KEY;
  
  private static PROFILE_ID = process.env.WISE_PROFILE_ID;
  
  /**
   * Check if the Wise configuration is complete
   */
  static isConfigured(): boolean {
    return !!(this.API_KEY && this.PROFILE_ID);
  }
  
  /**
   * Return the headers for API requests
   */
  private static getHeaders() {
    return {
      'Authorization': `Bearer ${this.API_KEY}`,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Create a quote for a transfer
   */
  static async createQuote(
    targetCurrency: string = 'EUR',
    sourceAmount: number,
    sourceCurrency: string = 'EUR',
    targetAmount?: number
  ) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Wise is not configured correctly. API_KEY or PROFILE_ID missing.');
      }
      
      const quoteData: any = {
        profile: this.PROFILE_ID,
        source: sourceCurrency,
        target: targetCurrency,
        rateType: 'FIXED',
        type: 'BALANCE_CONVERSION'
      };
      
      if (sourceAmount) {
        quoteData.sourceAmount = sourceAmount;
      } else if (targetAmount) {
        quoteData.targetAmount = targetAmount;
      } else {
        throw new Error('Either sourceAmount or targetAmount must be specified');
      }
      
      const response = await axios.post(
        `${this.BASE_URL}/v3/quotes`,
        quoteData,
        { headers: this.getHeaders() }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error creating Wise quote:', error);
      throw error;
    }
  }
  
  /**
   * Create a payment for a quote
   */
  static async createPayment(quoteId: string, reference: string) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Wise is not configured correctly. API_KEY or PROFILE_ID missing.');
      }
      
      const paymentData = {
        quoteUuid: quoteId,
        profile: this.PROFILE_ID,
        reference,
        transferPurpose: 'verification.transfers.purpose.pay.for.goods'
      };
      
      const response = await axios.post(
        `${this.BASE_URL}/v1/transfers`,
        paymentData,
        { headers: this.getHeaders() }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error creating Wise payment:', error);
      throw error;
    }
  }
  
  /**
   * Get the details of a payment
   */
  static async getPaymentDetails(transferId: string) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Wise is not configured correctly. API_KEY or PROFILE_ID missing.');
      }
      
      const response = await axios.get(
        `${this.BASE_URL}/v1/transfers/${transferId}`,
        { headers: this.getHeaders() }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error retrieving Wise payment details:', error);
      throw error;
    }
  }
  
  /**
   * Handle a webhook notification from Wise
   * @param webhookEvent The event received from the Wise webhook
   */
  static async handleWebhookEvent(webhookEvent: any) {
    try {
      // Verify the event type
      if (webhookEvent.event_type !== 'transfer-state-change') {
        console.log('Evento Wise ignorato:', webhookEvent.event_type);
        return { success: true, action: 'ignored' };
      }
      
      // Get the transfer ID and status
      const transferId = webhookEvent.data.resource.id;
      const transferStatus = webhookEvent.data.current_state;
      
      // Check if we have a transaction associated with this transferId
      const transactions = await storage.getPaymentTransactionsByWiseId(transferId);
      
      if (transactions.length === 0) {
        console.log('No transactions found for Wise transfer:', transferId);
        return { success: true, action: 'no_transaction_found' };
      }
      
      // Update the transaction status
      for (const transaction of transactions) {
        let newStatus = 'pending';
        
        switch (transferStatus) {
          case 'incoming_payment_waiting':
          case 'processing':
            newStatus = 'pending';
            break;
          case 'funds_converted':
          case 'outgoing_payment_sent':
          case 'completed':
            newStatus = 'completed';
            break;
          case 'cancelled':
          case 'failed':
            newStatus = 'failed';
            break;
          default:
            newStatus = 'pending';
        }
        
        // Update the transaction in the database
        await storage.updatePaymentTransaction(transaction.id, { status: newStatus });
        
        // if the transaction is associated with a subscription and the payment is completed
        if (transaction.subscriptionId && newStatus === 'completed') {
          // Update the subscription status
          const subscription = await storage.getSubscription(transaction.subscriptionId);
          if (subscription && subscription.status !== 'active') {
            await storage.updateSubscription(subscription.id, { status: 'active' });
          }
        }
      }
      
      return { success: true, action: 'updated' };
    } catch (error: any) {
      console.error('Error handling Wise webhook event:', error);
      return { success: false, error: 'Internal server error' };
    }
  }
  
  /**
   * Create a Wise subscription payment
   */
  static async createSubscriptionPayment(
    userId: number,
    subscriptionId: number,
    amount: number // in cents
    ) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Wise is not configured correctly. API_KEY or PROFILE_ID missing.');
      }
      
      // Convert the amount from cents to euros
      const amountInEuro = amount / 100;
      
      // Create a quote
      const quote = await this.createQuote('EUR', amountInEuro);
      
      // Create a payment
      const payment = await this.createPayment(
        quote.id,
        `Subscription #${subscriptionId}`
      );
      
      // Register the transaction
      const transactionData: InsertPaymentTransaction = {
        userId,
        subscriptionId,
        amount,
        currency: 'EUR',
        status: 'pending',
        paymentMethod: 'wise',
        transactionId: payment.id,
        description: `Payment for subscription #${subscriptionId} via Wise`
      };
      
      await storage.createPaymentTransaction(transactionData);
      
      return {
        success: true,
        paymentId: payment.id,
        paymentUrl: payment.redirectUrl
      };
    } catch (error: any) {
      console.error('Error creating Wise payment:', error);
      return {
        success: false,
        message: 'Error creating Wise payment'
      };
    }
  }
}