import axios from 'axios';
import { storage } from '../storage';
import { InsertPaymentTransaction } from '@shared/schema';

/**
 * Servizio per l'integrazione con Wise (precedentemente TransferWise)
 */
export class WiseService {
  private static BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://api.transferwise.com'
    : 'https://api.sandbox.transferwise.tech';
  
  private static API_KEY = process.env.WISE_API_KEY;
  
  private static PROFILE_ID = process.env.WISE_PROFILE_ID;
  
  /**
   * Verifica se la configurazione di Wise è completa
   */
  static isConfigured(): boolean {
    return !!(this.API_KEY && this.PROFILE_ID);
  }
  
  /**
   * Ritorna gli headers per le richieste API
   */
  private static getHeaders() {
    return {
      'Authorization': `Bearer ${this.API_KEY}`,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Crea un quote per un bonifico
   */
  static async createQuote(
    targetCurrency: string = 'EUR',
    sourceAmount: number,
    sourceCurrency: string = 'EUR',
    targetAmount?: number
  ) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Wise non è configurato correttamente. Mancano API_KEY o PROFILE_ID.');
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
        throw new Error('È necessario specificare sourceAmount o targetAmount');
      }
      
      const response = await axios.post(
        `${this.BASE_URL}/v3/quotes`,
        quoteData,
        { headers: this.getHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Errore durante la creazione di un quote Wise:', error);
      throw error;
    }
  }
  
  /**
   * Crea un payment per un quote
   */
  static async createPayment(quoteId: string, reference: string) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Wise non è configurato correttamente. Mancano API_KEY o PROFILE_ID.');
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
    } catch (error) {
      console.error('Errore durante la creazione di un payment Wise:', error);
      throw error;
    }
  }
  
  /**
   * Ottiene i dettagli di un pagamento
   */
  static async getPaymentDetails(transferId: string) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Wise non è configurato correttamente. Mancano API_KEY o PROFILE_ID.');
      }
      
      const response = await axios.get(
        `${this.BASE_URL}/v1/transfers/${transferId}`,
        { headers: this.getHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Errore durante il recupero dei dettagli di un pagamento Wise:', error);
      throw error;
    }
  }
  
  /**
   * Gestisce una notifica webhook da Wise
   * @param webhookEvent L'evento ricevuto dal webhook di Wise
   */
  static async handleWebhookEvent(webhookEvent: any) {
    try {
      // Verifica il tipo di evento
      if (webhookEvent.event_type !== 'transfer-state-change') {
        console.log('Evento Wise ignorato:', webhookEvent.event_type);
        return { success: true, action: 'ignored' };
      }
      
      // Ottieni l'ID del trasferimento e lo stato
      const transferId = webhookEvent.data.resource.id;
      const transferStatus = webhookEvent.data.current_state;
      
      // Verifica se abbiamo una transazione associata a questo transferId
      const transactions = await storage.getPaymentTransactionsByWiseId(transferId);
      
      if (transactions.length === 0) {
        console.log('Nessuna transazione trovata per il trasferimento Wise:', transferId);
        return { success: true, action: 'no_transaction_found' };
      }
      
      // Aggiorna lo stato della transazione
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
        
        // Aggiorna la transazione nel database
        await storage.updatePaymentTransaction(transaction.id, { status: newStatus });
        
        // Se la transazione è associata a un abbonamento e il pagamento è completato
        if (transaction.subscriptionId && newStatus === 'completed') {
          // Aggiorna lo stato dell'abbonamento
          const subscription = await storage.getSubscription(transaction.subscriptionId);
          if (subscription && subscription.status !== 'active') {
            await storage.updateSubscription(subscription.id, { status: 'active' });
          }
        }
      }
      
      return { success: true, action: 'updated' };
    } catch (error) {
      console.error('Errore durante la gestione dell\'evento webhook Wise:', error);
      return { success: false, error: 'Errore interno del server' };
    }
  }
  
  /**
   * Crea un pagamento di abbonamento con Wise
   */
  static async createSubscriptionPayment(
    userId: number,
    subscriptionId: number,
    amount: number // in cents
    ) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Wise non è configurato correttamente. Mancano API_KEY o PROFILE_ID.');
      }
      
      // Converti l'importo da centesimi a euro
      const amountInEuro = amount / 100;
      
      // Crea un quote
      const quote = await this.createQuote('EUR', amountInEuro);
      
      // Crea un payment
      const payment = await this.createPayment(
        quote.id,
        `Abbonamento #${subscriptionId}`
      );
      
      // Registra la transazione
      const transactionData: InsertPaymentTransaction = {
        userId,
        subscriptionId,
        amount,
        currency: 'EUR',
        status: 'pending',
        paymentMethod: 'wise',
        transactionId: payment.id,
        description: `Pagamento per abbonamento #${subscriptionId} via Wise`
      };
      
      await storage.createPaymentTransaction(transactionData);
      
      return {
        success: true,
        paymentId: payment.id,
        paymentUrl: payment.redirectUrl
      };
    } catch (error) {
      console.error('Errore durante la creazione del pagamento Wise:', error);
      return {
        success: false,
        message: 'Errore durante la creazione del pagamento Wise'
      };
    }
  }
}