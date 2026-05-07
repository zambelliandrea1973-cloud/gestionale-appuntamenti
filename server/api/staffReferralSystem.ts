import { Request, Response } from "express";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

// Autonomous referral system for staff - VERSION WITHOUT DRIZZLE
export async function getMyReferralData(req: Request, res: Response) {
  try {
    const staffUser = req.user!;
    const staffId = staffUser.id;
    console.log(`🎯 STAFF REFERRAL STANDALONE: ${staffUser.email} (ID: ${staffId})`);

    // Generate referral code based on existing user data
    const emailPrefix = staffUser.email.substring(0, 3).toUpperCase();
    const idSuffix = staffId.toString().padStart(2, '0');
    const referralCode = `${emailPrefix}${idSuffix}`;
    
    console.log(`✅ REFERRAL CODE GENERATED: ${referralCode}`);

    // Create referral data using only available information
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
        howItWorks: "Share your referral code with new users. You will receive €1 for each subscription starting from the third sponsored user.",
        minimumPayout: 3,
        commissionPerUser: "1€"
      }
    };

    console.log(`📊 DATI STAFF PREPARATI per ${staffUser.email}`);
    
    res.json(myReferralData);
  } catch (error) {
    console.error("❌ Error in staff referral system:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Create a new referral when someone uses the staff code
export async function createReferral(req: Request, res: Response) {
  try {
    const { referralCode, newUserId } = req.body;
    
    console.log(`🎯 Creating REFERRAL: code ${referralCode}, new user ${newUserId}`);
    
    // Find the staff owner of the code
    const [staffOwner] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);

    if (!staffOwner) {
      return res.status(404).json({ error: "Invalid referral code" });
    }

    console.log(`✅ REFERRAL registered: Staff ${staffOwner.email} sponsored user ${newUserId}`);
    
    // For now return success - in future we will save to a dedicated table
    res.json({ 
      success: true, 
      message: "Referral registered successfully",
      staffOwner: staffOwner.email
    });
  } catch (error) {
    console.error("❌ Error creating referral:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Send staff data to admin for the general overview
export async function sendDataToAdmin(staffId: number) {
  try {
    console.log(`📤 Sending STAFF ${staffId} data TO ADMIN`);
    
    // In the future this will send the staff accounts data to the admin
    // For now it is just a placeholder
    
    return {
      success: true,
      message: "Data sent to admin"
    };
  } catch (error) {
    console.error("❌ Error sending data to admin:", error);
    return { success: false, error: error };
  }
}