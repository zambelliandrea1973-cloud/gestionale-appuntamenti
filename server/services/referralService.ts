import { db } from '../db';
import { bankAccounts, users, subscriptions, referralCommissions, referralPayments } from '@shared/schema';
import { eq, and, gte, isNull, count, sum, sql } from 'drizzle-orm';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { randomBytes } from 'crypto';

/**
 * Servizio per la gestione del sistema di referral
 */
export class ReferralService {
  /**
   * Genera un codice di referral unico per un utente
   * @param userId - ID dell'utente
   * @returns Il nuovo codice di referral
   */
  async generateReferralCode(userId: number): Promise<string> {
    // Genera un codice casuale di 8 caratteri
    const code = randomBytes(4).toString('hex').toUpperCase();
    
    // Aggiorna l'utente con il nuovo codice
    await db.update(users)
      .set({ referralCode: code })
      .where(eq(users.id, userId));
      
    return code;
  }

  /**
   * Ottiene le statistiche sui referral di un utente
   * @param userId - ID dell'utente
   * @returns Statistiche sui referral
   */
  async getReferralStats(userId: number) {
    // Calcola il numero di commissioni attive
    const [commissionCountResult] = await db
      .select({ count: count() })
      .from(referralCommissions)
      .where(
        and(
          eq(referralCommissions.referrerId, userId),
          eq(referralCommissions.status, 'active')
        )
      );
      
    const totalActiveCommissions = commissionCountResult?.count || 0;
    
    // Calcola l'importo del mese corrente
    const currentMonth = format(new Date(), 'yyyy-MM');
    const [currentMonthSum] = await db
      .select({ sum: sum(referralCommissions.monthlyAmount) })
      .from(referralCommissions)
      .where(
        and(
          eq(referralCommissions.referrerId, userId),
          eq(referralCommissions.status, 'active'),
          gte(referralCommissions.startDate, startOfMonth(new Date()).toISOString()),
          isNull(referralCommissions.endDate)
        )
      );
      
    const currentMonthAmount = currentMonthSum?.sum || 0;
    
    // Calcola l'importo del mese precedente
    const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
    const [lastMonthSum] = await db
      .select({ sum: sum(referralCommissions.monthlyAmount) })
      .from(referralCommissions)
      .where(
        and(
          eq(referralCommissions.referrerId, userId),
          eq(referralCommissions.status, 'active'),
          gte(referralCommissions.startDate, startOfMonth(subMonths(new Date(), 1)).toISOString()),
          isNull(referralCommissions.endDate)
        )
      );
      
    const lastMonthAmount = lastMonthSum?.sum || 0;
    
    // Verifica se l'utente ha un conto bancario
    const [bankAccount] = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId));
      
    const hasBankAccount = !!bankAccount;
    
    return {
      totalActiveCommissions,
      currentMonthAmount,
      lastMonthAmount,
      hasBankAccount
    };
  }

  /**
   * Ottiene i dettagli del referral di un utente
   * @param userId - ID dell'utente
   * @returns Dettagli completi del referral
   */
  async getReferralDetails(userId: number) {
    // Ottieni l'utente con il suo codice di referral
    const [userData] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        referralCode: users.referralCode,
        referredBy: users.referredBy
      })
      .from(users)
      .where(eq(users.id, userId));
      
    // Ottieni le commissioni attive
    const commissionsData = await db
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.referrerId, userId));
      
    // Ottieni il conto bancario
    const [bankData] = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId));
      
    // Ottieni le statistiche
    const statsData = await this.getReferralStats(userId);
    
    return {
      userData,
      commissionsData,
      bankData,
      statsData
    };
  }

  /**
   * Salva un conto bancario per un utente
   * @param userId - ID dell'utente
   * @param bankData - Dati del conto bancario
   * @returns Il conto bancario aggiornato o creato
   */
  async saveBankAccount(userId: number, bankData: any) {
    // Verifica se esiste già un conto bancario per questo utente
    const [existingAccount] = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId));
      
    if (existingAccount) {
      // Aggiorna il conto esistente
      const [updatedAccount] = await db
        .update(bankAccounts)
        .set({
          bankName: bankData.bankName,
          accountHolder: bankData.accountHolder,
          iban: bankData.iban,
          swift: bankData.swift,
          updatedAt: new Date()
        })
        .where(eq(bankAccounts.id, existingAccount.id))
        .returning();
        
      return updatedAccount;
    } else {
      // Crea un nuovo conto
      const [newAccount] = await db
        .insert(bankAccounts)
        .values({
          userId,
          bankName: bankData.bankName,
          accountHolder: bankData.accountHolder,
          iban: bankData.iban,
          swift: bankData.swift,
          isDefault: true
        })
        .returning();
        
      return newAccount;
    }
  }

  /**
   * Registra un nuovo referral quando un utente usa un codice di invito
   * @param referralCode - Codice di referral
   * @param newUserId - ID del nuovo utente
   * @returns true se il referral è stato registrato con successo
   */
  async registerReferral(referralCode: string, newUserId: number) {
    // Trova l'utente che ha generato il codice
    const [referrer] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode));
      
    if (!referrer) {
      return false;
    }
    
    // Aggiorna il nuovo utente con il riferimento al referrer
    await db
      .update(users)
      .set({ referredBy: referrer.id })
      .where(eq(users.id, newUserId));
      
    // Trova l'abbonamento del nuovo utente
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, newUserId));
      
    if (subscription) {
      // Conta i referral esistenti
      const [{ count: referralCount }] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.referredBy, referrer.id));
        
      // Le commissioni iniziano dopo almeno 3 referral
      if (referralCount >= 3) {
        // Crea una commissione
        await db
          .insert(referralCommissions)
          .values({
            referrerId: referrer.id,
            referredId: newUserId,
            subscriptionId: subscription.id,
            monthlyAmount: 100, // €1 al mese (in centesimi)
            startDate: new Date(),
            status: 'active'
          });
      }
    }
    
    return true;
  }

  /**
   * Ottiene tutti i pagamenti in sospeso (per amministratori)
   * @returns Lista dei pagamenti in sospeso
   */
  async getPendingPayments() {
    return await db
      .select({
        payment: referralPayments,
        user: {
          id: users.id,
          username: users.username,
          email: users.email
        },
        bankAccount: {
          bankName: bankAccounts.bankName,
          accountHolder: bankAccounts.accountHolder,
          iban: bankAccounts.iban,
          swift: bankAccounts.swift
        }
      })
      .from(referralPayments)
      .leftJoin(users, eq(referralPayments.userId, users.id))
      .leftJoin(bankAccounts, eq(users.id, bankAccounts.userId))
      .where(eq(referralPayments.status, 'pending'));
  }

  /**
   * Genera i pagamenti per tutti gli utenti per un periodo specifico
   * @param period - Periodo nel formato YYYY-MM
   * @returns I nuovi pagamenti generati
   */
  async generatePaymentsForAllUsers(period: string) {
    // Ottieni tutti gli utenti con commissioni attive
    const users = await db
      .select({
        userId: referralCommissions.referrerId,
        totalAmount: sql<number>`SUM(${referralCommissions.monthlyAmount})`
      })
      .from(referralCommissions)
      .where(
        and(
          eq(referralCommissions.status, 'active'),
          isNull(referralCommissions.endDate)
        )
      )
      .groupBy(referralCommissions.referrerId);
      
    // Crea pagamenti per ogni utente
    const payments = [];
    
    for (const user of users) {
      // Verifica se esiste già un pagamento per questo periodo
      const [existingPayment] = await db
        .select()
        .from(referralPayments)
        .where(
          and(
            eq(referralPayments.userId, user.userId),
            eq(referralPayments.period, period)
          )
        );
        
      if (!existingPayment && user.totalAmount > 0) {
        // Ottieni il conto bancario dell'utente
        const [bankAccount] = await db
          .select()
          .from(bankAccounts)
          .where(eq(bankAccounts.userId, user.userId));
          
        // Crea un nuovo pagamento
        const [payment] = await db
          .insert(referralPayments)
          .values({
            userId: user.userId,
            period,
            amount: user.totalAmount,
            status: 'pending',
            bankAccountId: bankAccount?.id
          })
          .returning();
          
        payments.push(payment);
      }
    }
    
    return payments;
  }

  /**
   * Aggiorna lo stato di un pagamento
   * @param paymentId - ID del pagamento
   * @param status - Nuovo stato
   * @param processingNote - Note sul pagamento
   * @returns Il pagamento aggiornato
   */
  async updatePaymentStatus(paymentId: number, status: string, processingNote?: string) {
    const [payment] = await db
      .update(referralPayments)
      .set({
        status,
        processingNote,
        processingDate: status === 'processed' ? new Date() : undefined,
        updatedAt: new Date()
      })
      .where(eq(referralPayments.id, paymentId))
      .returning();
      
    // Aggiorna l'ultimo periodo pagato nelle commissioni
    if (status === 'processed') {
      const commissions = await db
        .select()
        .from(referralCommissions)
        .where(eq(referralCommissions.referrerId, payment.userId));
        
      for (const commission of commissions) {
        await db
          .update(referralCommissions)
          .set({ lastPaidPeriod: payment.period })
          .where(eq(referralCommissions.id, commission.id));
      }
    }
    
    return payment;
  }
}

// Esporta un'istanza del servizio
export const referralService = new ReferralService();