import { Request, Response } from "express";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

// Simplified version that works for staff
export async function getStaffReferralStatsSimple(req: Request, res: Response) {
  try {
    const staffId = parseInt(req.params.staffId);
    console.log(`🎯 REFERRAL STAFF SIMPLE: Request for staff ID: ${staffId}`);

    // Get only the base staff data
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
      return res.status(404).json({ error: "Staff not found" });
    }

    const staff = staffUser[0];
    console.log(`✅ STAFF found: ${staff.email}, code: ${staff.referralCode}`);

    // For now return basic data - always works
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
        referralCode: staff.referralCode || `ELI${staffId}` // Fallback if there is no code
      }
    };

    console.log(`📊 DATI PREPARATI:`, responseData);
    
    res.json(responseData);
  } catch (error) {
    console.error("❌ Error in simplified referral API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}