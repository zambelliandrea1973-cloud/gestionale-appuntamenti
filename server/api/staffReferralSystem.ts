import { Request, Response } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Sistema referral autonomo per staff
export async function getMyReferralData(req: Request, res: Response) {
  try {
    const staffId = req.user!.id;
    console.log(`🎯 STAFF REFERRAL AUTONOMO: ${req.user!.email} (ID: ${staffId})`);

    // Ottieni dati staff con codice referral
    const [staffData] = await db
      .select({
        id: users.id,
        email: users.email,
        referralCode: users.referralCode
      })
      .from(users)
      .where(eq(users.id, staffId))
      .limit(1);

    if (!staffData) {
      return res.status(404).json({ error: "Staff non trovato" });
    }

    // Genera codice referral se non esiste
    let referralCode = staffData.referralCode;
    if (!referralCode) {
      // Crea codice basato su email (primi 3 caratteri + ultime 2 cifre ID)
      const emailPrefix = staffData.email.substring(0, 3).toUpperCase();
      const idSuffix = staffId.toString().padStart(2, '0');
      referralCode = `${emailPrefix}${idSuffix}`;
      
      // Salva il nuovo codice
      await db
        .update(users)
        .set({ referralCode })
        .where(eq(users.id, staffId));
    }

    console.log(`✅ CODICE REFERRAL: ${referralCode}`);

    // Per ora creiamo dati di esempio per lo staff
    const myReferralData = {
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

    console.log(`📊 DATI STAFF PREPARATI per ${staffData.email}`);
    
    res.json(myReferralData);
  } catch (error) {
    console.error("❌ Errore nel sistema referral staff:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// Crea un nuovo referral quando qualcuno usa il codice dello staff
export async function createReferral(req: Request, res: Response) {
  try {
    const { referralCode, newUserId } = req.body;
    
    console.log(`🎯 CREAZIONE REFERRAL: Codice ${referralCode}, Nuovo utente ${newUserId}`);
    
    // Trova lo staff proprietario del codice
    const [staffOwner] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);

    if (!staffOwner) {
      return res.status(404).json({ error: "Codice referral non valido" });
    }

    console.log(`✅ REFERRAL REGISTRATO: Staff ${staffOwner.email} ha sponsorizzato utente ${newUserId}`);
    
    // Per ora restituiamo success - in futuro salveremo in una tabella dedicata
    res.json({ 
      success: true, 
      message: "Referral registrato con successo",
      staffOwner: staffOwner.email
    });
  } catch (error) {
    console.error("❌ Errore nella creazione referral:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// Invia i dati staff all'admin per la panoramica generale
export async function sendDataToAdmin(staffId: number) {
  try {
    console.log(`📤 INVIO DATI STAFF ${staffId} ALL'ADMIN`);
    
    // In futuro questo invierà i dati dell'account staff all'admin
    // Per ora è solo un placeholder
    
    return {
      success: true,
      message: "Dati inviati all'admin"
    };
  } catch (error) {
    console.error("❌ Errore nell'invio dati all'admin:", error);
    return { success: false, error: error };
  }
}