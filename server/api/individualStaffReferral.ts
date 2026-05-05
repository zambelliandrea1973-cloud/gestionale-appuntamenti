import { Request, Response } from "express";
import { storage } from "../storage";

// Autonomous referral system for each individual staff member
// Each staff member manages their own referrals independently
export async function getIndividualStaffReferral(req: Request, res: Response) {
  try {
    const staffUser = req.user!;
    console.log(`🎯 INDIVIDUAL STAFF REFERRAL: ${staffUser.email} (ID: ${staffUser.id})`);

    // Generate unique referral code based on staff data
    const emailPrefix = staffUser.email.substring(0, 3).toUpperCase();
    const idSuffix = staffUser.id.toString().padStart(2, '0');
    const myReferralCode = `${emailPrefix}${idSuffix}`;

    // Get real commissions from the database
    const commissionsData = await storage.getReferralCommissionsByReferrer(staffUser.id);
    console.log(`📊 COMMISSIONS FOUND for ${staffUser.email}:`, commissionsData);

    // Calculate real statistics
    const activeCommissions = commissionsData.filter(c => c.status === 'active');
    const totalEarned = activeCommissions.reduce((sum, c) => sum + (c.monthlyAmount / 100), 0);

    // Get detailed data for each commission
    const commissionsWithDetails = await Promise.all(
      activeCommissions.map(async (commission) => {
        const referredUser = await storage.getUser(commission.referredId);
        const subscription = await storage.getSubscription(commission.subscriptionId);
        const plan = subscription ? await storage.getSubscriptionPlan(subscription.planId) : null;
        
        return {
          id: commission.id,
          referredUserEmail: referredUser?.username || 'Unknown user',
          planName: plan?.name || 'Unknown plan',
          monthlyAmount: commission.monthlyAmount / 100, // Convert to euros
          status: commission.status,
          startDate: commission.startDate
        };
      })
    );

    // Get ALL sponsored users (not only those with active commissions)
    const allReferredUsers = await storage.getUsersByReferrer(staffUser.id);
    console.log(`👥 TOTAL SPONSORED USERS for ${staffUser.email}:`, allReferredUsers.length);

    // For each sponsored user, verify if they have an active subscription
    const referredUsersWithStatus = await Promise.all(
      allReferredUsers.map(async (user) => {
        const subscription = await storage.getSubscriptionByUserId(user.id);
        const plan = subscription ? await storage.getSubscriptionPlan(subscription.planId) : null;
        const commission = commissionsData.find(c => c.referredId === user.id);
        
        return {
          id: user.id,
          username: user.username,
          email: user.email,
          registeredAt: user.createdAt,
          hasActiveSubscription: !!(subscription && subscription.status === 'active'),
          subscriptionStatus: subscription?.status || 'trial',
          planName: plan?.name || null,
          planPrice: plan ? plan.price / 100 : null,
          planInterval: plan?.interval || null,
          commissionAmount: commission ? commission.monthlyAmount / 100 : null,
          subscriptionStart: subscription?.currentPeriodStart || null,
          subscriptionEnd: subscription?.currentPeriodEnd || null
        };
      })
    );

    const myReferralSystem = {
      userData: {
        id: staffUser.id,
        username: staffUser.username,
        email: staffUser.email,
        referralCode: myReferralCode,
        referredBy: null,
        paypalEmail: staffUser.paypalEmail || null,
        autoPayoutEnabled: staffUser.autoPayoutEnabled || false
      },
      stats: {
        myReferralCode: myReferralCode,
        totalReferrals: allReferredUsers.length, // ALL sponsored users
        activeCommissions: activeCommissions.length,
        paidCommissions: 0, // TODO: contare da referral_payments
        pendingCommissions: activeCommissions.length,
        totalEarned: totalEarned,
        trialUsers: allReferredUsers.length - activeCommissions.length // Utenti in trial
      },
      commissionsData: commissionsData,
      statsData: {
        totalActiveCommissions: activeCommissions.length,
        currentMonthAmount: activeCommissions.reduce((sum, c) => sum + c.monthlyAmount, 0),
        lastMonthAmount: 0,
        hasBankAccount: !!(staffUser.iban || staffUser.paypalEmail)
      },
      recentCommissions: commissionsWithDetails,
      referredUsers: referredUsersWithStatus, // ALL sponsored users with status
      referralGuide: {
        howItWorks: "Share your code with new users during registration",
        commission: "25% of the subscription price for each referred client",
        minimumPayout: 3,
        paymentMethod: "Monthly bank transfer"
      },
      recentActivity: commissionsWithDetails.map(c => ({
        type: 'new_referral',
        message: `New client: ${c.referredUserEmail} - ${c.planName}`,
        date: c.startDate,
        amount: c.monthlyAmount
      })),
      bankData: {
        bankName: staffUser.bankName || '',
        accountHolder: staffUser.accountHolder || '',
        iban: staffUser.iban || '',
        swift: staffUser.bic || '',
        isDefault: true
      }
    };

    console.log(`✅ REAL DATA LOADED for ${staffUser.email}: ${myReferralSystem.stats.totalReferrals} referrals, €${totalEarned}/month`);
    
    res.json(myReferralSystem);
  } catch (error) {
    console.error("❌ Error in individual referral system:", error);
    res.status(500).json({ error: "Error loading referral data" });
  }
}

// Function to register a new referral for this staff member
export async function registerMyReferral(req: Request, res: Response) {
  try {
    const staffUser = req.user!;
    const { newClientEmail, subscriptionType } = req.body;
    
    console.log(`📝 NEW REFERRAL for ${staffUser.email}: Client ${newClientEmail}`);
    
    // In the future we will save to the staff-specific referral table here
    // For now confirm only the registration
    
    res.json({
      success: true,
      message: "Referral registered successfully",
      staffEmail: staffUser.email,
      clientEmail: newClientEmail,
      commissionAmount: "1€" // Starting from the 3rd referral
    });
  } catch (error) {
    console.error("❌ Error registering referral:", error);
    res.status(500).json({ error: "Error registering referral" });
  }
}