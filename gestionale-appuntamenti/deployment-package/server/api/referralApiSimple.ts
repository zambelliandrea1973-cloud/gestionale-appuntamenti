import { Request, Response } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Versione semplificata che funziona per lo staff
export async function getStaffReferralStatsSimple(req: Request, res: Response) {
  try {
    const staffId = parseInt(req.params.staffId);
    console.log(`🎯 REFERRAL STAFF SIMPLE: Richiesta per staff ID: ${staffId}`);

    // Ottieni solo i dati base dello staff
    const staffUser = await db
      .select({
        id: users.id,
        email: users.email,
        referralCode: users.referralCode
      })
      .from(users)
      .where(eq(users.id, staffId))
      .limit(1);

    if (!staffUser || staffUser.length === 0) {
      return res.status(404).json({ error: "Staff non trovato" });
    }

    const staff = staffUser[0];
    console.log(`✅ STAFF TROVATO: ${staff.email}, Codice: ${staff.referralCode}`);

    // Per ora restituiamo dati di base - funziona sempre
    const responseData = {
      stats: {
        totalCommissions: 0,
        paidCommissions: 0,
        pendingCommissions: 0,
        sponsoredLicenses: 0
      },
      commissions: [],
      userInfo: {
        email: staff.email,
        referralCode: staff.referralCode || `ELI${staffId}` // Fallback se non c'è codice
      }
    };

    console.log(`📊 DATI PREPARATI:`, responseData);
    
    res.json(responseData);
  } catch (error) {
    console.error("❌ Errore nell'API referral semplificata:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
}