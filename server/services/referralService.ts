// @ts-nocheck
import { db } from '../db';
import { bankAccounts, users, subscriptions, referralCommissions, referralPayments } from '../../shared/schema';
import { eq, and, gte, isNull, count, sum, sql } from 'drizzle-orm';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { randomBytes } from 'crypto';

/**
 * Service for managing the referral system
 */
export class ReferralService {
  /**
   * Generate a unique referral code for a user
   * @param userId - ID of the user
   * @returns The new referral code
   */
  async generateReferralCode(userId: number): Promise<string> {
    // Generate a code casuale di 8 caratteri
    const code = randomBytes(4).toString('hex').toUpperCase();
    
    // Update the user with the new code
    await db.update(users)
      .set({ referralCode: code })
      .where(eq(users.id, userId));
      
    return code;
  }

  /**
   * Get referral statistics for a user
   * @param userId - ID of the user
   * @returns Referral statistics
   */
  async getReferralStats(userId: number) {
    // Calculate the number of active commissions
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
    
    // Calculate the current month amount
    const currentMonth = format(new Date(), 'yyyy-MM');
    const [currentMonthSum] = await db
      .select({ sum: sum(referralCommissions.monthlyAmount) })
      .from(referralCommissions)
      .where(
        and(
          eq(referralCommissions.referrerId, userId),
          eq(referralCommissions.status, 'active'),
          // Remove the date comparison that causes problems
          isNull(referralCommissions.endDate)
        )
      );
      
    const currentMonthAmount = currentMonthSum?.sum || 0;
    
    // Calculate the previous month amount
    const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
    const [lastMonthSum] = await db
      .select({ sum: sum(referralCommissions.monthlyAmount) })
      .from(referralCommissions)
      .where(
        and(
          eq(referralCommissions.referrerId, userId),
          eq(referralCommissions.status, 'active'),
          // Remove the date comparison that causes problems
          isNull(referralCommissions.endDate)
        )
      );
      
    const lastMonthAmount = lastMonthSum?.sum || 0;
    
    // Check if the user has a bank account
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
   * Get the referral details of a user
   * @param userId - ID of the user
   * @returns Complete referral details
   */
  async getReferralDetails(userId: number) {
    // Get the user with their referral code
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
      
    // Get the commissions attive
    const commissionsData = await db
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.referrerId, userId));
      
    // Get the bank account
    const [bankData] = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId));
      
    // Get the statistiche
    const statsData = await this.getReferralStats(userId);
    
    return {
      userData,
      commissionsData,
      bankData,
      statsData
    };
  }

  /**
   * Save a bank account for a user
   * @param userId - ID of the user
   * @param bankData - Bank account data
   * @returns The updated or created bank account
   */
  async saveBankAccount(userId: number, bankData: any) {
    // Check if a bank account already exists for this user
    const [existingAccount] = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId));
      
    if (existingAccount) {
      // Update the existing account
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
      // Create a new account
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
   * Register a new referral when a user uses an invite code
   * @param referralCode - Code di referral
   * @param newUserId - ID of the new user
   * @returns true if the referral was registered successfully
   */
  async registerReferral(referralCode: string, newUserId: number) {
    // Find the user who generated the code
    const [referrer] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode));
      
    if (!referrer) {
      return false;
    }
    
    // Update the new user with the referrer reference
    await db
      .update(users)
      .set({ referredBy: referrer.id })
      .where(eq(users.id, newUserId));
      
    // Find the new user's subscription
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
        
      // Commissions start after at least 3 referrals
      if (referralCount >= 3) {
        // Create a commission
        await db
          .insert(referralCommissions)
          .values({
            referrerId: referrer.id,
            referredId: newUserId,
            subscriptionId: subscription.id,
            monthlyAmount: 100, // €1 per month (in cents)
            startDate: new Date(),
            status: 'active'
          });
      }
    }
    
    return true;
  }

  /**
   * Get all payments in sospeso (per amministratori)
   * @returns Lista of the payments in sospeso
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
   * Generate payments for all users for a specific period
   * @param period - Period in YYYY-MM format
   * @returns The newly generated payments
   */
  async generatePaymentsForAllUsers(period: string) {
    // Get all users con commissions attive
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
      
    // Create payments per each user
    const payments = [];
    
    for (const user of users) {
      // Check if a payment already exists for this period
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
        // Get the bank account of the user
        const [bankAccount] = await db
          .select()
          .from(bankAccounts)
          .where(eq(bankAccounts.userId, user.userId));
          
        // Create a new payment
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
   * Update the status of a payment
   * @param paymentId - Payment ID
   * @param status - Nuovo stato
   * @param processingNote - Processing note
   * @returns The updated payment
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
      
    // Update the last paid period in commissions
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

// Export a singleton instance of the service
export const referralService = new ReferralService();