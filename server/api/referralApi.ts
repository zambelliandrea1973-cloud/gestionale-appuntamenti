import { Request, Response } from "express";
import { db } from "../db";
import { staffCommissions, licenses, users } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// Ottieni le statistiche referral per uno staff specifico
export async function getStaffReferralStats(req: Request, res: Response) {
  try {
    const staffId = parseInt(req.params.staffId);
    
    // Conta abbonamenti sponsorizzati
    const [sponsoredCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(licenses)
      .where(and(
        eq(licenses.sponsoredBy, staffId),
        eq(licenses.isActive, true)
      ));

    // Commissioni totali
    const [totalCommissions] = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(commission_amount), 0)`,
        paid: sql<number>`COALESCE(SUM(CASE WHEN is_paid THEN commission_amount ELSE 0 END), 0)`,
        pending: sql<number>`COALESCE(SUM(CASE WHEN NOT is_paid THEN commission_amount ELSE 0 END), 0)`
      })
      .from(staffCommissions)
      .where(eq(staffCommissions.staffId, staffId));

    // Lista commissioni recenti
    const recentCommissions = await db
      .select({
        id: staffCommissions.id,
        commissionAmount: staffCommissions.commissionAmount,
        isPaid: staffCommissions.isPaid,
        paidAt: staffCommissions.paidAt,
        createdAt: staffCommissions.createdAt,
        notes: staffCommissions.notes,
        licenseCode: licenses.code,
        licenseType: licenses.type,
        customerEmail: users.email
      })
      .from(staffCommissions)
      .innerJoin(licenses, eq(staffCommissions.licenseId, licenses.id))
      .innerJoin(users, eq(licenses.userId, users.id))
      .where(eq(staffCommissions.staffId, staffId))
      .orderBy(desc(staffCommissions.createdAt))
      .limit(10);

    // Ottieni i dati dell'utente e il suo codice referral
    const [userData] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        referralCode: users.referralCode
      })
      .from(users)
      .where(eq(users.id, staffId));

    res.json({
      userData: userData || {
        id: staffId,
        username: "Staff User",
        email: "",
        referralCode: `BUS${staffId}`
      },
      commissions: recentCommissions || [],
      stats: {
        totalActiveCommissions: sponsoredCount.count || 0,
        currentMonthAmount: totalCommissions.pending || 0,
        lastMonthAmount: totalCommissions.paid || 0,
        hasBankAccount: false
      },
      referralCode: userData?.referralCode || `BUS${staffId}`,
      sponsoredCount: sponsoredCount.count || 0,
      totalCommissions: totalCommissions.total || 0,
      paidCommissions: totalCommissions.paid || 0,
      pendingCommissions: totalCommissions.pending || 0,
      commissionRate: 100, // 1€ in centesimi
      minSponsorshipForCommission: 3 // Dal 3° abbonamento
    });

  } catch (error) {
    console.error("Errore nel recupero statistiche referral:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// Ottieni panoramica generale referral (solo admin)
export async function getReferralOverview(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Accesso negato" });
    }

    // Statistiche per ogni staff
    const staffStats = await db
      .select({
        staffId: users.id,
        staffName: users.username,
        staffEmail: users.email,
        sponsoredCount: sql<number>`COUNT(DISTINCT licenses.id)`,
        totalCommissions: sql<number>`COALESCE(SUM(staff_commissions.commission_amount), 0)`,
        paidCommissions: sql<number>`COALESCE(SUM(CASE WHEN staff_commissions.is_paid THEN staff_commissions.commission_amount ELSE 0 END), 0)`,
        pendingCommissions: sql<number>`COALESCE(SUM(CASE WHEN NOT staff_commissions.is_paid THEN staff_commissions.commission_amount ELSE 0 END), 0)`
      })
      .from(users)
      .leftJoin(licenses, eq(licenses.sponsoredBy, users.id))
      .leftJoin(staffCommissions, eq(staffCommissions.staffId, users.id))
      .where(and(
        eq(users.type, "staff"),
        eq(users.role, "staff")
      ))
      .groupBy(users.id, users.username, users.email)
      .orderBy(desc(sql`COUNT(DISTINCT licenses.id)`));

    // Totali generali
    const [totals] = await db
      .select({
        totalSponsored: sql<number>`COUNT(DISTINCT licenses.id)`,
        totalCommissions: sql<number>`COALESCE(SUM(staff_commissions.commission_amount), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN staff_commissions.is_paid THEN staff_commissions.commission_amount ELSE 0 END), 0)`,
        totalPending: sql<number>`COALESCE(SUM(CASE WHEN NOT staff_commissions.is_paid THEN staff_commissions.commission_amount ELSE 0 END), 0)`
      })
      .from(licenses)
      .leftJoin(staffCommissions, eq(staffCommissions.licenseId, licenses.id))
      .where(eq(licenses.isActive, true));

    res.json({
      staffStats,
      totals,
      commissionRate: 100, // 1€ in centesimi
      minSponsorshipForCommission: 3
    });

  } catch (error) {
    console.error("Errore nel recupero panoramica referral:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// Assegna sponsorizzazione a una licenza
export async function assignSponsorship(req: Request, res: Response) {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'staff')) {
      return res.status(403).json({ error: "Accesso negato" });
    }

    const { licenseId, staffId } = req.body;

    // Verifica che la licenza esista e non sia già sponsorizzata
    const [license] = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, licenseId));

    if (!license) {
      return res.status(404).json({ error: "Licenza non trovata" });
    }

    if (license.sponsoredBy) {
      return res.status(400).json({ error: "Licenza già sponsorizzata" });
    }

    // Aggiorna la licenza con lo sponsor
    await db
      .update(licenses)
      .set({ sponsoredBy: staffId })
      .where(eq(licenses.id, licenseId));

    // Conta quante licenze ha già sponsorizzato questo staff
    const [sponsoredCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(licenses)
      .where(and(
        eq(licenses.sponsoredBy, staffId),
        eq(licenses.isActive, true)
      ));

    // Se ha sponsorizzato 3 o più, crea commissione
    if (sponsoredCount.count >= 3) {
      await db.insert(staffCommissions).values({
        staffId,
        licenseId,
        commissionAmount: 100, // 1€ in centesimi
        isPaid: false,
        notes: `Commissione per sponsorizzazione #${sponsoredCount.count}`
      });
    }

    res.json({ 
      success: true, 
      message: sponsoredCount.count >= 3 
        ? "Sponsorizzazione assegnata e commissione creata" 
        : `Sponsorizzazione assegnata (${sponsoredCount.count}/3 per commissioni)`
    });

  } catch (error) {
    console.error("Errore nell'assegnazione sponsorizzazione:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
}

// Segna commissione come pagata (solo admin)
export async function markCommissionPaid(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Accesso negato" });
    }

    const commissionId = parseInt(req.params.commissionId);
    const { notes } = req.body;

    await db
      .update(staffCommissions)
      .set({ 
        isPaid: true, 
        paidAt: new Date(),
        notes: notes || undefined
      })
      .where(eq(staffCommissions.id, commissionId));

    res.json({ success: true, message: "Commissione segnata come pagata" });

  } catch (error) {
    console.error("Errore nel segnare commissione come pagata:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
}