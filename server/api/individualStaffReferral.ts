import { Request, Response } from "express";
import { storage } from "../storage";

// Sistema referral autonomo per ogni singolo staff
// Ogni staff gestisce i propri referral indipendentemente
export async function getIndividualStaffReferral(req: Request, res: Response) {
  try {
    const staffUser = req.user!;
    console.log(`🎯 STAFF REFERRAL INDIVIDUALE: ${staffUser.email} (ID: ${staffUser.id})`);

    // Genera codice referral unico basato su dati staff
    const emailPrefix = staffUser.email.substring(0, 3).toUpperCase();
    const idSuffix = staffUser.id.toString().padStart(2, '0');
    const myReferralCode = `${emailPrefix}${idSuffix}`;

    // Ottieni commissioni reali dal database
    const commissionsData = await storage.getReferralCommissionsByReferrer(staffUser.id);
    console.log(`📊 COMMISSIONI TROVATE per ${staffUser.email}:`, commissionsData);

    // Calcola statistiche reali
    const activeCommissions = commissionsData.filter(c => c.status === 'active');
    const totalEarned = activeCommissions.reduce((sum, c) => sum + (c.monthlyAmount / 100), 0);

    // Ottieni dati dettagliati per ogni commissione
    const commissionsWithDetails = await Promise.all(
      activeCommissions.map(async (commission) => {
        const referredUser = await storage.getUser(commission.referredId);
        const subscription = await storage.getSubscription(commission.subscriptionId);
        const plan = subscription ? await storage.getSubscriptionPlan(subscription.planId) : null;
        
        return {
          id: commission.id,
          referredUserEmail: referredUser?.username || 'Utente sconosciuto',
          planName: plan?.name || 'Piano sconosciuto',
          monthlyAmount: commission.monthlyAmount / 100, // Converti in euro
          status: commission.status,
          startDate: commission.startDate
        };
      })
    );

    // Ottieni TUTTI gli utenti sponsorizzati (non solo quelli con commissioni attive)
    const allReferredUsers = await storage.getUsersByReferrer(staffUser.id);
    console.log(`👥 UTENTI SPONSORIZZATI TOTALI per ${staffUser.email}:`, allReferredUsers.length);

    // Per ogni utente sponsorizzato, verifica se ha un abbonamento attivo
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
        totalReferrals: allReferredUsers.length, // TUTTI gli utenti sponsorizzati
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
      referredUsers: referredUsersWithStatus, // TUTTI gli utenti sponsorizzati con stato
      referralGuide: {
        howItWorks: "Condividi il tuo codice con nuovi clienti durante la registrazione",
        commission: "25% del prezzo dell'abbonamento per ogni cliente referenziato",
        minimumPayout: 3,
        paymentMethod: "Bonifico bancario mensile"
      },
      recentActivity: commissionsWithDetails.map(c => ({
        type: 'new_referral',
        message: `Nuovo cliente: ${c.referredUserEmail} - ${c.planName}`,
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

    console.log(`✅ DATI REALI CARICATI per ${staffUser.email}: ${myReferralSystem.stats.totalReferrals} referral, €${totalEarned}/mese`);
    
    res.json(myReferralSystem);
  } catch (error) {
    console.error("❌ Errore nel sistema referral individuale:", error);
    res.status(500).json({ error: "Errore nel caricamento dati referral" });
  }
}

// Funzione per registrare un nuovo referral per questo staff
export async function registerMyReferral(req: Request, res: Response) {
  try {
    const staffUser = req.user!;
    const { newClientEmail, subscriptionType } = req.body;
    
    console.log(`📝 NUOVO REFERRAL per ${staffUser.email}: Cliente ${newClientEmail}`);
    
    // In futuro qui salveremo nella tabella referral specifica dello staff
    // Per ora confermiamo solo la registrazione
    
    res.json({
      success: true,
      message: "Referral registrato con successo",
      staffEmail: staffUser.email,
      clientEmail: newClientEmail,
      commissionAmount: "1€" // A partire dal 3° referral
    });
  } catch (error) {
    console.error("❌ Errore registrazione referral:", error);
    res.status(500).json({ error: "Errore nella registrazione referral" });
  }
}