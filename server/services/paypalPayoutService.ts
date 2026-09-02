// @ts-nocheck
import { logger } from '../utils/logger';
import { storage } from '../storage';
import axios from 'axios';

/**
 * Service to manage PayPal payouts for staff commissions
 */
export class PayPalPayoutService {
  private static async getApiBaseUrl(): Promise<string> {
    const paymentMethods = await storage.getPaymentMethods();
    const paypalConfig = paymentMethods.find(m => m.id === 'paypal');
    const mode = paypalConfig?.config?.mode || (process.env.PAYMENT_MODE === 'production' ? 'live' : 'sandbox');
    return mode === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
  }

  private static async getAccessToken(): Promise<string> {
    try {
      // Get PayPal credentials from database or env
      const paymentMethods = await storage.getPaymentMethods();
      const paypalConfig = paymentMethods.find(m => m.id === 'paypal');
      
      let clientId: string;
      let clientSecret: string;
      let baseUrl: string;
      
      if (paypalConfig && paypalConfig.config.clientId && paypalConfig.config.clientSecret) {
        clientId = paypalConfig.config.clientId;
        clientSecret = paypalConfig.config.clientSecret;
        const mode = paypalConfig.config.mode || 'sandbox';
        baseUrl = mode === 'live' 
          ? 'https://api.paypal.com' 
          : 'https://api.sandbox.paypal.com';
      } else {
        // Fallback to Secrets
        const isProduction = process.env.PAYMENT_MODE === 'production';
        clientId = isProduction 
          ? process.env.PAYPAL_CLIENT_ID_LIVE! 
          : process.env.PAYPAL_CLIENT_ID!;
        clientSecret = isProduction 
          ? process.env.PAYPAL_CLIENT_SECRET_LIVE! 
          : process.env.PAYPAL_CLIENT_SECRET!;
        baseUrl = isProduction 
          ? 'https://api.paypal.com' 
          : 'https://api.sandbox.paypal.com';
      }
      
      if (!clientId || !clientSecret) {
        throw new Error('Missing PayPal credentials');
      }
      
      // Get access token
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await axios.post(
        `${baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return response.data.access_token;
    } catch (error: any) {
      console.error('❌ Error obtaining PayPal access token:', error);
      throw error;
    }
  }
  
  /**
   * Validate a PayPal email address
   */
  static validatePayPalEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Send a PayPal payout to a single beneficiary
   * 
   * PayPal accepting a batch does not mean the payout has completed.
   * The caller stores accepted batches as processing until status verification.
   */
  static async sendPayout(
    recipientEmail: string,
    amount: number, // in cents
    commissionId: number,
    staffName: string
  ): Promise<{ success: boolean; transactionId?: string; status?: 'completed' | 'processing'; error?: string }> {
    try {
      // PayPal email validation
      if (!this.validatePayPalEmail(recipientEmail)) {
        console.error(`❌ Invalid PayPal email: ${recipientEmail}`);
        return {
          success: false,
          error: 'PayPal email invalid or missing'
        };
      }
      
      const accessToken = await this.getAccessToken();
      
      // Determine base URL (sandbox or live)
      const baseUrl = await this.getApiBaseUrl();
      
      const amountInEuro = (amount / 100).toFixed(2);
      
      const payoutRequest = {
        sender_batch_header: {
          sender_batch_id: `COMM_${commissionId}_${Date.now()}`,
          email_subject: 'You have received a referral commission!',
          email_message: `Congratulations! Your referral commission of €${amountInEuro} has been processed.`
        },
        items: [{
          recipient_type: 'EMAIL',
          amount: {
            value: amountInEuro,
            currency: 'EUR'
          },
          receiver: recipientEmail,
          note: `Referral commission - ${staffName}`,
          sender_item_id: `COMM_${commissionId}`
        }]
      };
      
      const response = await axios.post(
        `${baseUrl}/v1/payments/payouts`,
        payoutRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const batchId = response.data.batch_header.payout_batch_id;
      logger.debug(`✅ PayPal payout sent successfully!`);
      console.log(`   Email: ${recipientEmail}`);
      console.log(`   Amount: €${amountInEuro}`);
      console.log(`   Batch ID: ${batchId}`);
      
      return {
        success: true,
        transactionId: batchId,
        status: 'processing'
      };
    } catch (error: any) {
      console.error('❌ Error sending PayPal payout:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  private static async checkPayoutStatus(
    batchId: string
  ): Promise<'completed' | 'processing' | 'failed'> {
    const accessToken = await this.getAccessToken();
    const baseUrl = await this.getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/v1/payments/payouts/${encodeURIComponent(batchId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const batchStatus = response.data?.batch_header?.batch_status;
    const itemStatus = response.data?.items?.[0]?.transaction_status;

    if (itemStatus === 'SUCCESS') return 'completed';
    if (['FAILED', 'BLOCKED', 'RETURNED', 'REFUNDED', 'REVERSED'].includes(itemStatus)) {
      return 'failed';
    }
    if (!itemStatus && (batchStatus === 'DENIED' || batchStatus === 'CANCELED')) {
      return 'failed';
    }
    return 'processing';
  }
  
  /**
   * Process all commissions ready for payout
   */
  static async processScheduledPayouts(): Promise<{ processed: number; failed: number }> {
    try {
      console.log('🔍 Checking commissions ready for payout...');
      
      // Find all scheduled commissions with date <= today
      const today = new Date();
      const commissions = await storage.getReferralCommissions();
      
      const readyForPayout = commissions.filter(c =>
        (
          c.payoutStatus === 'scheduled' &&
          c.payoutScheduledDate &&
          new Date(c.payoutScheduledDate) <= today
        ) ||
        (
          c.payoutStatus === 'processing' &&
          !!c.payoutTransactionId
        )
      );
      
      if (readyForPayout.length === 0) {
        console.log('✅ No commissions ready for payout');
        return { processed: 0, failed: 0 };
      }
      
      logger.debug(`📋 Found ${readyForPayout.length} commissions to process`);
      
      let processed = 0;
      let failed = 0;
      
      for (const commission of readyForPayout) {
        try {
          if (commission.payoutStatus === 'processing' && commission.payoutTransactionId) {
            const finalStatus = await this.checkPayoutStatus(commission.payoutTransactionId);
            if (finalStatus === 'completed') {
              await storage.updateReferralCommission(commission.id, {
                payoutStatus: 'completed',
                payoutDate: new Date()
              });
              processed++;
            } else if (finalStatus === 'failed') {
              await storage.updateReferralCommission(commission.id, {
                payoutStatus: 'failed'
              });
              failed++;
            }
            continue;
          }

          // Get info staff sponsor
          const staff = await storage.getUser(commission.referrerId);
          if (!staff) {
            console.log(`⚠️ Staff ${commission.referrerId} not found - skip`);
            failed++;
            continue;
          }
          
          // Check if automatic payout is enabled and PayPal email
          if (!staff.autoPayoutEnabled) {
            logger.debug(`📝 Staff ${staff.username}: automatic payout disabled - marked as 'manual'`);
            await storage.updateReferralCommission(commission.id, {
              payoutStatus: 'manual',
              payoutMethod: 'bank_transfer'
            });
            processed++;
            continue;
          }
          
          if (!this.validatePayPalEmail(staff.paypalEmail)) {
            console.log(`⚠️ Staff ${staff.username}: PayPal email missing or invalid - marked as 'manual'`);
            await storage.updateReferralCommission(commission.id, {
              payoutStatus: 'manual',
              payoutMethod: 'bank_transfer'
            });
            processed++;
            continue;
          }
          
          // Send payout PayPal
          const result = await this.sendPayout(
            staff.paypalEmail,
            commission.monthlyAmount,
            commission.id,
            staff.username
          );
          
          if (result.success) {
            await storage.updateReferralCommission(commission.id, {
              payoutStatus: result.status || 'processing',
              payoutMethod: 'paypal',
              payoutDate: result.status === 'completed' ? new Date() : null,
              payoutTransactionId: result.transactionId
            });
            processed++;
          } else {
            console.error(`❌ Payout failed for commission ${commission.id}: ${result.error}`);
            await storage.updateReferralCommission(commission.id, {
              payoutStatus: 'failed',
              payoutMethod: 'paypal'
            });
            failed++;
          }
        } catch (error: any) {
          console.error(`❌ Error processing commission ${commission.id}:`, error);
          failed++;
        }
      }
      
      logger.debug(`✅ Payouts processed: ${processed} succeeded, ${failed} failed`);
      return { processed, failed };
    } catch (error: any) {
      console.error('❌ General error processing payouts:', error);
      return { processed: 0, failed: 0 };
    }
  }
}
