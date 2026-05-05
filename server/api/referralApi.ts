// @ts-nocheck
import { Request, Response } from "express";
import { db } from "../db";
import { referralCommissions, licenses, users, staffCommissions } from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// Get the statistiche referral for a specific staff member
export async function getStaffReferralStats(req: Request, res: Response) {
  try {
    const staffId = parseInt(req.params.staffId);
    console.log(`🎯 REFERRAL STAFF: Statistics request for staff ID: ${staffId}`);
    
    // Count sponsored subscriptions
    const [sponsoredCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(licenses)
      .where(and(
        eq(licenses.sponsoredBy, staffId),
        eq(licenses.isActive, true)
      ));

    // Total commissions - Simplified query using referralCommissions
    const allCommissions = await db
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.referrerId, staffId));

    const totalCommissions = {
      total: allCommissions.reduce((sum, comm) => sum + (comm.monthlyAmount || 0), 0) / 100, // Convert from cents to euros
      paid: allCommissions.filter(comm => comm.status === 'active').reduce((sum, comm) => sum + (comm.monthlyAmount || 0), 0) / 100,
      pending: allCommissions.filter(comm => comm.status !== 'active').reduce((sum, comm) => sum + (comm.monthlyAmount || 0), 0) / 100
    };

    // Lista commissions recenti usando referralCommissions
    const recentCommissions = await db
      .select({
        id: referralCommissions.id,
        commissionAmount: referralCommissions.monthlyAmount,
        isPaid: referralCommissions.status,
        paidAt: referralCommissions.lastPaidPeriod,
        createdAt: referralCommissions.createdAt,
        customerEmail: users.email,
        status: referralCommissions.status
      })
      .from(referralCommissions)
      .innerJoin(users, eq(referralCommissions.referredId, users.id))
      .where(eq(referralCommissions.referrerId, staffId))
      .orderBy(desc(referralCommissions.createdAt))
      .limit(10);

    // Get the user data and their referral code
    const [userData] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        referralCode: users.referralCode
      })
      .from(users)
      .where(eq(users.id, staffId));

    const responseData = {
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
      commissionRate: 100, // 1€ in cents
      minSponsorshipForCommission: 3 // From the 3rd subscription
    };
    
    console.log(`🎯 REFERRAL STAFF: Data returned for staff ${staffId}:`, JSON.stringify(responseData, null, 2));
    res.json(responseData);

  } catch (error) {
    console.error("Error retrieving referral statistics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get panoramica generale referral (only admin)
export async function getReferralOverview(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    // Statistiche per each staff
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
      .leftJoin(referralCommissions, eq(referralCommissions.referrerId, users.id))
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
      commissionRate: 100, // 1€ in cents
      minSponsorshipForCommission: 3
    });

  } catch (error) {
    console.error("Error retrieving referral overview:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Assign sponsorship to a license
export async function assignSponsorship(req: Request, res: Response) {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'staff')) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { licenseId, staffId } = req.body;

    // Verify that the license exists and is not already sponsored
    const [license] = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, licenseId));

    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }

    if (license.sponsoredBy) {
      return res.status(400).json({ error: "License already sponsored" });
    }

    // Update the license with the sponsor
    await db
      .update(licenses)
      .set({ sponsoredBy: staffId })
      .where(eq(licenses.id, licenseId));

    // Count how many licenses this staff member has already sponsored
    const [sponsoredCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(licenses)
      .where(and(
        eq(licenses.sponsoredBy, staffId),
        eq(licenses.isActive, true)
      ));

    // If sponsored 3 or more, create commission
    if (sponsoredCount.count >= 3) {
      await db.insert(staffCommissions).values({
        staffId,
        licenseId,
        commissionAmount: 100, // 1€ in cents
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
    console.error("Error assigning sponsorship:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Segna commission come pagata (only admin)
export async function markCommissionPaid(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
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

    res.json({ success: true, message: "Commission marked as paid" });

  } catch (error) {
    console.error("Error marking commission as paid:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}