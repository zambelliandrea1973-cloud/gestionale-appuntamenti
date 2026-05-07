import { db } from '../db';
import { users, licenses, staffCommissions, referralCommissions, subscriptions, referralPayments } from '../../shared/schema';
import { eq, and, isNull, count, sum, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';

/**
 * Service for managing the referral system (simplified version)
 */
export class SimplifiedReferralService {
  /**
   * Generate a unique referral code for a user
   * @param userId - ID of the user
   * @returns The new referral code
   */
  async generateReferralCode(userId: number): Promise<string> {
    // Generate a random 8-character code
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
    
    // Calculate the current month amount (simplified)
    const [currentMonthSum] = await db
      .select({ sum: sum(referralCommissions.monthlyAmount) })
      .from(referralCommissions)
      .where(
        and(
          eq(referralCommissions.referrerId, userId),
          eq(referralCommissions.status, 'active')
        )
      );
      
    const currentMonthAmount = currentMonthSum?.sum || 0;
    
    // Calculate the previous month amount (simplified, we use the same value)
    const lastMonthAmount = currentMonthAmount;
    
    // Check if the user has a bank account (check iban field in users table)
    const [user] = await db
      .select({ iban: users.iban })
      .from(users)
      .where(eq(users.id, userId));
      
    const hasBankAccount = !!(user?.iban);
    
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
    try {
      // Get the user with their referral code
      const [userData] = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          referralCode: users.referralCode,
          referredBy: users.referredBy,
          paypalEmail: users.paypalEmail,
          autoPayoutEnabled: users.autoPayoutEnabled
        })
        .from(users)
        .where(eq(users.id, userId));
        
      // Get the active commissions
      const commissionsData = await db
        .select()
        .from(referralCommissions)
        .where(eq(referralCommissions.referrerId, userId));
        
      // Get the bank account from the users table
      const [bankData] = await db
        .select({
          bankName: users.bankName,
          accountHolder: users.accountHolder,
          iban: users.iban,
          bic: users.bic
        })
        .from(users)
        .where(eq(users.id, userId));
        
      // Get the statistics
      const statsData = await this.getReferralStats(userId);
      
      return {
        userData: userData || { id: userId, username: '', email: '', referralCode: null, referredBy: null, paypalEmail: null, autoPayoutEnabled: false },
        commissionsData: commissionsData || [],
        bankData: bankData || null,
        statsData
      };
    } catch (error) {
      console.error('Error retrieving referral data:', error);
      
      // Return an empty but valid object to avoid errors
      return {
        userData: { id: userId, username: '', email: '', referralCode: null, referredBy: null, paypalEmail: null, autoPayoutEnabled: false },
        commissionsData: [],
        bankData: null,
        statsData: {
          totalActiveCommissions: 0,
          currentMonthAmount: 0,
          lastMonthAmount: 0,
          hasBankAccount: false
        }
      };
    }
  }

  /**
   * Save a bank account for a user
   * @param userId - ID of the user
   * @param bankData - Bank account data
   * @returns The updated bank account
   */
  async saveBankAccount(userId: number, bankData: any) {
    try {
      console.log(`💳 [REFERRAL] Saving bank data for user ${userId}:`, bankData);
      
      // Update bank data and PayPal directly in the users table
      const [updatedUser] = await db
        .update(users)
        .set({
          bankName: bankData.bankName || null,
          accountHolder: bankData.accountHolder || null,
          iban: bankData.iban || null,
          bic: bankData.swift || null, // swift is mapped to bic
          paypalEmail: bankData.paypalEmail || null,
          autoPayoutEnabled: bankData.autoPayoutEnabled || false,
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          bankName: users.bankName,
          accountHolder: users.accountHolder,
          iban: users.iban,
          bic: users.bic,
          paypalEmail: users.paypalEmail,
          autoPayoutEnabled: users.autoPayoutEnabled
        });
        
      console.log(`✅ [REFERRAL] Banking data updated for user ${userId}`);
      return updatedUser;
    } catch (error) {
      console.error('❌ [REFERRAL] Error saving bank account:', error);
      throw error;
    }
  }

  /**
   * Register a new referral when a user uses an invite code
   * @param referralCode - Code di referral
   * @param newUserId - ID of the new user
   * @returns true if the referral was registered successfully
   */
  async registerReferral(referralCode: string, newUserId: number) {
    try {
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
        // Count existing referrals
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
    } catch (error) {
      console.error('Error registering referral:', error);
      return false;
    }
  }

  /**
   * Get all pending payments (for administrators)
   * @returns List of pending payments
   */
  async getPendingPayments() {
    try {
      const payments = await db
        .select()
        .from(referralPayments)
        .where(eq(referralPayments.status, 'pending'));
        
      return payments;
    } catch (error) {
      console.error('Error retrieving pending payments:', error);
      return [];
    }
  }

  /**
   * Generate payments for all users for a specific period
   * @param period - Period in YYYY-MM format
   * @returns The newly generated payments
   */
  async generatePaymentsForAllUsers(period: string) {
    try {
      // Get all users with active commissions
      const usersWithCommissions = await db
        .select({
          userId: referralCommissions.referrerId,
          totalAmount: sql<number>`SUM(${referralCommissions.monthlyAmount})`
        })
        .from(referralCommissions)
        .where(eq(referralCommissions.status, 'active'))
        .groupBy(referralCommissions.referrerId);
        
      // Create payments per each user
      const payments = [];
      
      for (const user of usersWithCommissions) {
        // Create a new payment
        const [payment] = await db
          .insert(referralPayments)
          .values({
            userId: user.userId,
            period,
            amount: user.totalAmount || 0,
            status: 'pending'
          })
          .returning();
          
        payments.push(payment);
      }
      
      return payments;
    } catch (error) {
      console.error('Error generating payments:', error);
      return [];
    }
  }

  /**
   * Update the status of a payment
   * @param paymentId - Payment ID
   * @param status - New status
   * @param processingNote - Processing note
   * @returns The updated payment
   */
  async updatePaymentStatus(paymentId: number, status: string, processingNote?: string) {
    try {
      const [payment] = await db
        .update(referralPayments)
        .set({
          status,
          processingNote: processingNote || null,
          updatedAt: new Date()
        })
        .where(eq(referralPayments.id, paymentId))
        .returning();
        
      return payment;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }
}

// Export a singleton instance of the service
export const simplifiedReferralService = new SimplifiedReferralService();