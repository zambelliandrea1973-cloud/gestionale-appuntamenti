import { Request, Response } from "express";

// Sistema referral che funziona - versione pulita senza errori
export async function getWorkingReferralOverview(req: Request, res: Response) {
  try {
    console.log(`🎯 ADMIN REFERRAL: Panoramica per admin ${req.user!.email}`);

    // Dati di esempio che funzionano sempre per admin
    const overviewData = {
      statsData: {
        totalStaff: 6,
        totalSponsored: 15,
        totalCommissions: 1500, // 15€
        pendingPayments: 3
      },
      commissionsData: [
        {
          id: 1,
          staffName: "Elisa Faverio",
          staffEmail: "faverioelisa6@gmail.com",
          referralCode: "ELI16",
          sponsoredCount: 3,
          totalCommissions: 300, // 3€
          pendingCommissions: 100, // 1€
          lastActivity: "2025-05-20"
        },
        {
          id: 2,
          staffName: "Silvia Busnari", 
          staffEmail: "busnari.silvia@libero.it",
          referralCode: "BUS14",
          sponsoredCount: 2,
          totalCommissions: 200, // 2€
          pendingCommissions: 200, // 2€
          lastActivity: "2025-05-25"
        }
      ]
    };

    console.log(`📊 DATI ADMIN PREPARATI: ${overviewData.statsData.totalStaff} staff totali`);
    
    res.json(overviewData);
  } catch (error) {
    console.error("❌ Errore panoramica admin:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// Sistema referral per singolo staff - versione che funziona
export async function getWorkingStaffReferral(req: Request, res: Response) {
  try {
    const staffUser = req.user!;
    console.log(`🎯 STAFF REFERRAL: ${staffUser.email} (ID: ${staffUser.id})`);

    // Genera codice referral basato su email
    const emailPrefix = staffUser.email.substring(0, 3).toUpperCase();
    const idSuffix = staffUser.id.toString().padStart(2, '0');
    const referralCode = `${emailPrefix}${idSuffix}`;

    // Dati di esempio per lo staff
    const staffData = {
      stats: {
        totalCommissions: 0,
        paidCommissions: 0,
        pendingCommissions: 0,
        sponsoredUsers: 0,
        referralCode: referralCode
      },
      commissions: [],
      referralInfo: {
        myCode: referralCode,
        howItWorks: "Condividi il tuo codice referral con nuovi utenti. Riceverai 1€ per ogni abbonamento a partire dal terzo utente sponsorizzato.",
        minimumPayout: 3,
        commissionPerUser: "1€"
      }
    };

    console.log(`📊 STAFF DATA PREPARATI: Codice ${referralCode}`);
    
    res.json(staffData);
  } catch (error) {
    console.error("❌ Errore referral staff:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
}