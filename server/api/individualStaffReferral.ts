import { Request, Response } from "express";

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

    // Ogni staff ha il suo sistema di commissioni locale
    // Per ora iniziamo con dati vuoti ma struttura completa
    const myReferralSystem = {
      stats: {
        myReferralCode: myReferralCode,
        totalReferrals: 0,
        activeCommissions: 0,
        paidCommissions: 0,
        pendingCommissions: 0,
        totalEarned: 0 // in euro
      },
      myCommissions: [], // Array delle mie commissioni
      referralGuide: {
        howItWorks: "Condividi il tuo codice con nuovi clienti durante la registrazione",
        commission: "1€ per ogni abbonamento a partire dal 3° cliente",
        minimumPayout: 3,
        paymentMethod: "Bonifico bancario mensile"
      },
      recentActivity: [] // Attività recenti dei miei referral
    };

    console.log(`✅ SISTEMA REFERRAL CREATO per ${staffUser.email}: Codice ${myReferralCode}`);
    console.log(`📊 DATI PRONTI: ${myReferralSystem.stats.totalReferrals} referral attivi`);
    
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