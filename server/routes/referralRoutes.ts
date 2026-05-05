import express, { Request, Response } from 'express';
import { simplifiedReferralService } from '../services/simplifiedReferralService';
import { isAuthenticated } from '../auth';
import { getWorkingReferralOverview } from '../api/workingReferralSystem';
import { getIndividualStaffReferral } from '../api/individualStaffReferral';
import { getAdminReferralAggregation, payStaffCommissions } from '../api/adminReferralAggregator';
import { format } from 'date-fns';
import { storage } from '../storage';

const router = express.Router();

/**
 * Get statistics and details on the current user's referrals
 * GET /api/referral/stats
 */
router.get('/stats', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const referralDetails = await simplifiedReferralService.getReferralDetails(req.user.id);
    
    res.json(referralDetails);
  } catch (error: any) {
    console.error('Error retrieving referral statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving referral statistics'
    });
  }
});

/**
 * Generate a new referral code for user
 * POST /api/referral/generate-code
 */
router.post('/generate-code', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const code = await simplifiedReferralService.generateReferralCode(req.user.id);
    
    res.json({
      success: true,
      code
    });
  } catch (error: any) {
    console.error('Error generating referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating referral code'
    });
  }
});

/**
 * Save the user's bank account
 * POST /api/referral/bank-account
 */
router.post('/bank-account', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const bankAccount = await simplifiedReferralService.saveBankAccount(req.user.id, req.body);
    
    res.json({
      success: true,
      bankAccount
    });
  } catch (error: any) {
    console.error('Error saving bank account:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving bank account'
    });
  }
});

/**
 * Register a new referral
 * POST /api/referral/register
 * Requires the referral code and the ID of the new user
 * Used internally by the registration process
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { referralCode, userId } = req.body;
    
    if (!referralCode || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Parametri mancanti'
      });
    }

    const result = await simplifiedReferralService.registerReferral(referralCode, userId);
    
    res.json({
      success: result,
      message: result 
        ? 'Referral registered successfully' 
        : 'Impossibile registrare il referral (codice invalid)'
    });
  } catch (error: any) {
    console.error('Error registering referral:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering referral'
    });
  }
});

/**
 * Get referral statistics for the current staff
 * GET /api/referral/staff
 */
router.get('/staff', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log(`🚀 ROUTER REFERRAL: Staff referral request for user ID: ${req.user.id}, email: ${req.user.email}`);
    
    // Call the existing function passing the staff ID as a parameter
    req.params.staffId = req.user.id.toString();
    await getIndividualStaffReferral(req, res);
  } catch (error: any) {
    console.error('Error retrieving staff statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving staff statistics'
    });
  }
});

// Rotte amministrative (only per admin)

/**
 * Get the panoramica referral per admin
 * GET /api/referral/overview
 */
router.get('/overview', isAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log(`🚀 ADMIN REFERRAL: Overview request from ${req.user!.email}`);
    await getWorkingReferralOverview(req, res);
  } catch (error: any) {
    console.error('Error in admin overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading referral overview'
    });
  }
});

// Rotte amministrative (only per admin)

/**
 * Pay commissions for a specific staff member
 * POST /api/referral/staff/:staffId/pay-commissions
 */
router.post('/staff/:staffId/pay-commissions', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Verify that it is an admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can pay commissions'
      });
    }

    await payStaffCommissions(req, res);
  } catch (error: any) {
    console.error('Error processing commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing commission payment'
    });
  }
});

/**
 * Get all payments di referral in sospeso
 * GET /api/referral/admin/pending-payments
 */
router.get('/admin/pending-payments', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Get pending payments from the database
    const pendingPayments = await simplifiedReferralService.getPendingPayments();
    
    res.json({
      success: true,
      pendingPayments
    });
  } catch (error: any) {
    console.error('Error retrieving pending payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving pending payments'
    });
  }
});

/**
 * Generate payments for all users for the current period
 * POST /api/referral/admin/generate-payments
 */
router.post('/admin/generate-payments', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const period = req.body.period || format(new Date(), 'yyyy-MM');
    const result = await simplifiedReferralService.generatePaymentsForAllUsers(period);
    
    res.json({
      success: true,
      paymentsGenerated: result.length,
      payments: result
    });
  } catch (error: any) {
    console.error('Error generating payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating payments'
    });
  }
});

/**
 * Update the status of a payment
 * PUT /api/referral/admin/payment/:id
 */
router.put('/admin/payment/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const paymentId = parseInt(req.params.id);
    const { status, processingNote } = req.body;
    
    if (!status || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Parametri mancanti'
      });
    }

    const payment = await simplifiedReferralService.updatePaymentStatus(paymentId, status, processingNote);
    
    res.json({
      success: true,
      payment
    });
  } catch (error: any) {
    console.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment'
    });
  }
});

/**
 * Get aggregated overview for admin (NEW!)
 * GET /api/referral/overview
 */
router.get('/overview', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied: admin only' 
      });
    }
    
    // SISTEMA PULITO - collegamento diretto al database autentico
    const { getCleanReferralOverview } = await import("../api/cleanReferralSystem");
    return getCleanReferralOverview(req, res);
  } catch (error: any) {
    console.error('Error retrieving admin overview:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving referral overview'
    });
  }
});

export default router;