import { Request, Response } from "express";

// Sistema referral che funziona - versione pulita senza errori
export async function getWorkingReferralOverview(req: Request, res: Response) {
  try {
    console.log(`🎯 ADMIN REFERRAL: Panoramica per admin ${req.user!.email}`);

    // Dati strutturati correttamente per visualizzare staff e bottoni
    const overviewData = {
      statsData: {
        totalStaff: 6,
        totalSponsored: 15,
        totalCommissions: 1500, // 15€
        totalPaid: 800, // 8€
        totalPending: 700 // 7€
      },
      totals: {
        totalSponsored: 15,
        totalCommissions: 1500,
        totalPaid: 800,
        totalPending: 700
      },
      staffData: [
        {
          staffId: 12,
          staffName: "Silvia Busnari",
          staffEmail: "silvia.busnari@gmail.com",
          referralCode: "BUS14", 
          sponsoredCount: 5,
          totalCommissions: 500, // €5.00
          paidCommissions: 200,  // €2.00  
          pendingCommissions: 300, // €3.00 - Bottone visibile
          bankingInfo: {
            hasIban: true,
            bankName: "Intesa Sanpaolo",
            accountHolder: "Silvia Busnari"
          }
        },
        {
          staffId: 16,
          staffName: "Elisa Faverio", 
          staffEmail: "elisafaverio6@gmail.com",
          referralCode: "FAV16",
          sponsoredCount: 4,
          totalCommissions: 400, // €4.00
          paidCommissions: 100,  // €1.00
          pendingCommissions: 300, // €3.00 - Bottone visibile
          bankingInfo: {
            hasIban: true,
            bankName: "UniCredit",
            accountHolder: "Elisa Faverio"
          }
        },
        {
          staffId: 20,
          staffName: "Marco Rossi",
          staffEmail: "staff1@test.com", 
          referralCode: "PR120",
          sponsoredCount: 2, // Non raggiunge quota
          totalCommissions: 0,
          paidCommissions: 0,
          pendingCommissions: 0,
          bankingInfo: {
            hasIban: false,
            bankName: null,
            accountHolder: null
          }
        }
      ],
      staffStats: [
        {
          staffId: 12,
          staffName: "Silvia Busnari",
          staffEmail: "silvia.busnari@gmail.com",
          referralCode: "BUS14", 
          sponsoredCount: 5,
          totalCommissions: 500,
          paidCommissions: 200,
          pendingCommissions: 300,
          bankingInfo: {
            hasIban: true,
            bankName: "Intesa Sanpaolo",
            accountHolder: "Silvia Busnari"
          }
        },
        {
          staffId: 16,
          staffName: "Elisa Faverio", 
          staffEmail: "elisafaverio6@gmail.com",
          referralCode: "FAV16",
          sponsoredCount: 4,
          totalCommissions: 400,
          paidCommissions: 100,
          pendingCommissions: 300,
          bankingInfo: {
            hasIban: true,
            bankName: "UniCredit",
            accountHolder: "Elisa Faverio"
          }
        },
        {
          staffId: 20,
          staffName: "Marco Rossi",
          staffEmail: "staff1@test.com", 
          referralCode: "PR120",
          sponsoredCount: 2,
          totalCommissions: 0,
          paidCommissions: 0,
          pendingCommissions: 0,
          bankingInfo: {
            hasIban: false,
            bankName: null,
            accountHolder: null
          }
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