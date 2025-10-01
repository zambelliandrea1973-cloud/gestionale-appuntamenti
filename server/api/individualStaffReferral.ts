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
    const commissionsData = await storage.getReferralCommissions(staffUser.id);
    console.log(`📊 COMMISSIONI TROVATE per ${staffUser.email}:`, commissionsData);

    // Calcola statistiche reali
    const activeCommissions = commissionsData.filter(c => c.status === 'active');
    const totalEarned = activeCommissions.reduce((sum, c) => sum + (c.monthlyAmount / 100), 0);

    // Ottieni dati dettagliati per ogni commissione
    const commissionsWithDetails = await Promise.all(
      activeCommissions.map(async (commission) => {
        const referredUser = await storage.getUserById(commission.referredId);
        const subscription = await storage.getSubscriptionById(commission.subscriptionId);
        const plan = subscription ? await storage.getSubscriptionPlanById(subscription.planId) : null;
        
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

    const myReferralSystem = {
      stats: {
        myReferralCode: myReferralCode,
        totalReferrals: commissionsData.length,
        activeCommissions: activeCommissions.length,
        paidCommissions: 0, // TODO: contare da referral_payments
        pendingCommissions: activeCommissions.length,
        totalEarned: totalEarned
      },
      recentCommissions: commissionsWithDetails,
      referralGuide: {
        howItWorks: "Condividi il tuo codice con nuovi clienti durante la registrazione",
        commission: "1€ per ogni abbonamento a partire dal 3° cliente",
        minimumPayout: 3,
        paymentMethod: "Bonifico bancario mensile"
      },
      recentActivity: commissionsWithDetails.map(c => ({
        type: 'new_referral',
        message: `Nuovo cliente: ${c.referredUserEmail} - ${c.planName}`,
        date: c.startDate,
        amount: c.monthlyAmount
      }))
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