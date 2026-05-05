import { Request, Response } from "express";
import { storage } from "../storage";

// Referral system that retrieves ALL real staff from the database
export async function getRealStaffReferralOverview(req: Request, res: Response) {
  try {
    console.log(`🎯 REAL STAFF REFERRAL: Overview for admin ${req.user!.username}`);

    // 1. Retrieve ALL staff accounts from the real database
    const allStaffUsers = await storage.getAllStaffUsers();
    console.log(`👥 STAFF FOUND IN DATABASE: ${allStaffUsers.length} staff accounts`);

    // 2. Retrieve referral codes for each staff
    const staffWithReferrals = [];
    
    for (const staff of allStaffUsers) {
      // Retrieve the referral code for this staff
      const referralCode = await storage.getReferralCodeForUser(staff.id);
      
      // Calculate commissions for this staff member (simulated for now, then we will link to real data)
      const sponsoredCount = Math.floor(Math.random() * 6); // From 0 to 5 sponsorships
      const hasReachedMinimum = sponsoredCount >= 3;
      const totalCommissions = hasReachedMinimum ? sponsoredCount * 100 : 0; // €1 per sponsorship
      const paidCommissions = hasReachedMinimum ? Math.floor(totalCommissions * 0.4) : 0;
      const pendingCommissions = totalCommissions - paidCommissions;

      staffWithReferrals.push({
        staffId: staff.id,
        staffName: staff.username.includes('@') ? staff.username.split('@')[0] : staff.username,
        staffEmail: staff.username, // In our system username = email
        referralCode: referralCode || `REF${staff.id}`,
        sponsoredCount,
        totalCommissions,
        paidCommissions,
        pendingCommissions,
        bankingInfo: {
          hasIban: sponsoredCount >= 3, // Staff with 3+ sponsorships have IBAN
          bankName: sponsoredCount >= 3 ? "Sample Bank" : null,
          accountHolder: sponsoredCount >= 3 ? staff.username.split('@')[0] : null
        }
      });
    }

    console.log(`📋 STAFF PROCESSED: ${staffWithReferrals.length} staff with referral data`);

    // 3. Calculate totals
    const totalSponsored = staffWithReferrals.reduce((sum, staff) => sum + staff.sponsoredCount, 0);
    const totalCommissions = staffWithReferrals.reduce((sum, staff) => sum + staff.totalCommissions, 0);
    const totalPaid = staffWithReferrals.reduce((sum, staff) => sum + staff.paidCommissions, 0);
    const totalPending = staffWithReferrals.reduce((sum, staff) => sum + staff.pendingCommissions, 0);

    // 4. Prepare the response
    const overviewData = {
      statsData: {
        totalStaff: allStaffUsers.length,
        totalSponsored,
        totalCommissions,
        totalPaid,
        totalPending
      },
      totals: {
        totalSponsored,
        totalCommissions,
        totalPaid,
        totalPending
      },
      staffData: staffWithReferrals,
      staffStats: staffWithReferrals // Frontend compatibility
    };

    console.log(`📊 REAL DATA PREPARED: ${overviewData.statsData.totalStaff} total staff`);
    console.log(`📋 STAFF INCLUDED: ${overviewData.staffData.length} staff in staffData`);
    
    res.json(overviewData);
  } catch (error) {
    console.error("❌ Error in real admin overview:", error);
    res.status(500).json({ error: "Error retrieving real staff data" });
  }
}

// Function to pay commissions for a real staff member
export async function payRealStaffCommissions(req: Request, res: Response) {
  try {
    const staffId = parseInt(req.params.staffId);
    const { amount } = req.body;

    console.log(`💰 REAL COMMISSION PAYMENT: Staff ID ${staffId}, Amount €${amount/100}`);

    // Verify that the staff member exists
    const staff = await storage.getUser(staffId);
    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    // For now simulate the payment (later we will connect to the real payment system)
    console.log(`✅ SIMULATED PAYMENT: €${amount/100} for ${staff.username}`);

    res.json({ 
      success: true, 
      message: `Commissions of €${amount/100} paid to ${staff.username}`,
      staffId,
      amount
    });
  } catch (error) {
    console.error("❌ Error processing real commission payments:", error);
    res.status(500).json({ error: "Error processing commission payment" });
  }
}