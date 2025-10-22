import { storage } from '../storage';
import axios from 'axios';

/**
 * Servizio per gestire i payout PayPal alle commissioni staff
 */
export class PayPalPayoutService {
  private static async getAccessToken(): Promise<string> {
    try {
      // Ottieni credenziali PayPal dal database o env
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
        // Fallback ai Secrets
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
        throw new Error('Credenziali PayPal mancanti');
      }
      
      // Ottieni access token
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
    } catch (error) {
      console.error('❌ Errore ottenimento access token PayPal:', error);
      throw error;
    }
  }
  
  /**
   * Valida un indirizzo email PayPal
   */
  static validatePayPalEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Invia un payout PayPal a un singolo beneficiario
   * 
   * ⚠️ NOTA: Questo metodo restituisce success=true quando PayPal accetta il batch (201),
   * ma il payout potrebbe ancora fallire. Per un sistema robusto, implementare polling
   * di GET /payouts/{batch_id} per verificare lo stato finale.
   */
  static async sendPayout(
    recipientEmail: string,
    amount: number, // in cents
    commissionId: number,
    staffName: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Validazione email PayPal
      if (!this.validatePayPalEmail(recipientEmail)) {
        console.error(`❌ Email PayPal non valida: ${recipientEmail}`);
        return {
          success: false,
          error: 'Email PayPal non valida o mancante'
        };
      }
      
      const accessToken = await this.getAccessToken();
      
      // Determina base URL (sandbox o live)
      const paymentMethods = await storage.getPaymentMethods();
      const paypalConfig = paymentMethods.find(m => m.id === 'paypal');
      const mode = paypalConfig?.config?.mode || (process.env.PAYMENT_MODE === 'production' ? 'live' : 'sandbox');
      const baseUrl = mode === 'live' 
        ? 'https://api.paypal.com' 
        : 'https://api.sandbox.paypal.com';
      
      const amountInEuro = (amount / 100).toFixed(2);
      
      const payoutRequest = {
        sender_batch_header: {
          sender_batch_id: `COMM_${commissionId}_${Date.now()}`,
          email_subject: 'Hai ricevuto una commissione referral!',
          email_message: `Congratulazioni! La tua commissione referral di €${amountInEuro} è stata elaborata.`
        },
        items: [{
          recipient_type: 'EMAIL',
          amount: {
            value: amountInEuro,
            currency: 'EUR'
          },
          receiver: recipientEmail,
          note: `Commissione referral - ${staffName}`,
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
      
      console.log(`✅ Payout PayPal inviato con successo!`);
      console.log(`   Email: ${recipientEmail}`);
      console.log(`   Importo: €${amountInEuro}`);
      console.log(`   Batch ID: ${batchId}`);
      
      return {
        success: true,
        transactionId: batchId
      };
    } catch (error: any) {
      console.error('❌ Errore invio payout PayPal:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  /**
   * Processa tutte le commissioni pronte per il payout
   */
  static async processScheduledPayouts(): Promise<{ processed: number; failed: number }> {
    try {
      console.log('🔍 Controllo commissioni pronte per il payout...');
      
      // Trova tutte le commissioni scheduled con data <= oggi
      const today = new Date();
      const commissions = await storage.getReferralCommissions();
      
      const readyForPayout = commissions.filter(c => 
        c.payoutStatus === 'scheduled' && 
        c.payoutScheduledDate && 
        new Date(c.payoutScheduledDate) <= today
      );
      
      if (readyForPayout.length === 0) {
        console.log('✅ Nessuna commissione pronta per il payout');
        return { processed: 0, failed: 0 };
      }
      
      console.log(`📋 Trovate ${readyForPayout.length} commissioni da processare`);
      
      let processed = 0;
      let failed = 0;
      
      for (const commission of readyForPayout) {
        try {
          // Ottieni info staff sponsor
          const staff = await storage.getUser(commission.referrerId);
          if (!staff) {
            console.log(`⚠️ Staff ${commission.referrerId} non trovato - skip`);
            failed++;
            continue;
          }
          
          // Verifica se ha payout automatico abilitato e email PayPal
          if (!staff.autoPayoutEnabled) {
            console.log(`📝 Staff ${staff.username}: payout automatico disabilitato - segnato come 'manual'`);
            await storage.updateReferralCommission(commission.id, {
              payoutStatus: 'manual',
              payoutMethod: 'bank_transfer'
            });
            processed++;
            continue;
          }
          
          if (!this.validatePayPalEmail(staff.paypalEmail)) {
            console.log(`⚠️ Staff ${staff.username}: email PayPal mancante o non valida - segnato come 'manual'`);
            await storage.updateReferralCommission(commission.id, {
              payoutStatus: 'manual',
              payoutMethod: 'bank_transfer'
            });
            processed++;
            continue;
          }
          
          // Invia payout PayPal
          const result = await this.sendPayout(
            staff.paypalEmail,
            commission.monthlyAmount,
            commission.id,
            staff.username
          );
          
          if (result.success) {
            await storage.updateReferralCommission(commission.id, {
              payoutStatus: 'completed',
              payoutMethod: 'paypal',
              payoutDate: new Date(),
              payoutTransactionId: result.transactionId
            });
            processed++;
          } else {
            console.error(`❌ Payout fallito per commissione ${commission.id}: ${result.error}`);
            await storage.updateReferralCommission(commission.id, {
              payoutStatus: 'failed',
              payoutMethod: 'paypal'
            });
            failed++;
          }
        } catch (error) {
          console.error(`❌ Errore processing commissione ${commission.id}:`, error);
          failed++;
        }
      }
      
      console.log(`✅ Payout processati: ${processed} successo, ${failed} falliti`);
      return { processed, failed };
    } catch (error) {
      console.error('❌ Errore generale processing payouts:', error);
      return { processed: 0, failed: 0 };
    }
  }
}
