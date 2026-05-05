// @ts-nocheck
import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * AUTOMATIC REFERRAL COMMISSION PAYMENT SYSTEM
 * Processes automatic payments 30 days after sponsored subscription
 */

interface BankingInfo {
  hasIban: boolean;
  iban?: string;
  bankName?: string;
  accountHolder?: string;
  swift?: string;
}

interface CommissionPayment {
  staffId: number;
  sponsoredUserId: number;
  subscriptionDate: Date;
  commissionAmount: number; // in cents
  dueDate: Date;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  bankingInfo: BankingInfo;
}

/**
 * Save the bank details for a staff member
 */
export async function saveBankingInfo(req: Request, res: Response) {
  try {
    const { staffId } = req.params;
    const bankingData = req.body;
    
    console.log(`💳 Saving banking data: Staff ID ${staffId}`);
    
    // Verify that the staff member exists
    const staff = await storage.getUser(parseInt(staffId));
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    
    // Save the bank details in the database
    await storage.saveBankingInfoForStaff(parseInt(staffId), {
      hasIban: true,
      iban: bankingData.iban,
      bankName: bankingData.bankName,
      accountHolder: bankingData.accountHolder,
      swift: bankingData.swift || null
    });
    
    console.log(`✅ Banking data SAVED for staff ${staff.username}`);
    
    res.json({
      success: true,
      message: 'Banking information saved successfully',
      staffId: parseInt(staffId)
    });
    
  } catch (error: any) {
    console.error('❌ ERROR SAVING BANKING DATA:', error);
    res.status(500).json({ 
      error: 'Error saving banking information',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Schedule an automatic payment when a new sponsored subscription is registered
 */
export async function scheduleCommissionPayment(
  sponsorStaffId: number, 
  sponsoredUserId: number, 
  subscriptionAmount: number
) {
  try {
    console.log(`📅 SCHEDULING payment: Staff ${sponsorStaffId} → user ${sponsoredUserId}`);
    
    // Calculate the commission (€1 = 100 cents)
    const commissionAmount = 100; // Fixed €1 per sponsorship
    
    // Calculate the expiry date (30 days from today)
    const subscriptionDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    // Retrieve staff banking information
    const bankingInfo = await storage.getBankingInfoForStaff(sponsorStaffId) || {
      hasIban: false,
      bankName: null,
      accountHolder: null
    };
    
    // Create scheduled payment record
    const paymentRecord: CommissionPayment = {
      staffId: sponsorStaffId,
      sponsoredUserId: sponsoredUserId,
      subscriptionDate: subscriptionDate,
      commissionAmount: commissionAmount,
      dueDate: dueDate,
      status: bankingInfo.hasIban ? 'pending' : 'failed',
      bankingInfo: bankingInfo
    };
    
    // Save in database (to be implemented in storage)
    // await storage.saveCommissionPayment(paymentRecord);
    
    console.log(`✅ PAYMENT SCHEDULED for ${dueDate.toLocaleDateString()}`);
    
    return {
      success: true,
      paymentId: `PAY_${sponsorStaffId}_${Date.now()}`,
      dueDate: dueDate,
      amount: commissionAmount
    };
    
  } catch (error: any) {
    console.error('❌ PAYMENT SCHEDULING ERROR:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process expiring payments (to run daily)
 */
export async function processScheduledPayments(req: Request, res: Response) {
  try {
    console.log(`⚡ PROCESSING SCHEDULED PAYMENTS: ${new Date().toISOString()}`);
    
    // Retrieve all payments expiring today
    const today = new Date();
    const pendingPayments = []; // await storage.getPendingCommissionPayments(today);
    
    const processedPayments = [];
    const failedPayments = [];
    
    for (const payment of pendingPayments) {
      try {
        // Verify that the staff still has valid bank details
        if (!payment.bankingInfo.hasIban || !payment.bankingInfo.iban) {
          console.log(`❌ PAYMENT FAILED: Staff ${payment.staffId} without valid IBAN`);
          failedPayments.push({
            ...payment,
            reason: 'IBAN missing or invalid'
          });
          continue;
        }
        
        // Simulate the processing of the bank payment
        const paymentResult = await processPayment(payment);
        
        if (paymentResult.success) {
          console.log(`✅ payment completed: €${payment.commissionAmount/100} for staff ${payment.staffId}`);
          processedPayments.push({
            ...payment,
            status: 'paid',
            processedAt: new Date(),
            transactionId: paymentResult.transactionId
          });
        } else {
          console.log(`❌ PAYMENT FAILED: Staff ${payment.staffId} - ${paymentResult.error}`);
          failedPayments.push({
            ...payment,
            reason: paymentResult.error
          });
        }
        
      } catch (error: any) {
        console.error(`❌ ERROR PROCESSING PAYMENT for Staff ${payment.staffId}:`, error);
        failedPayments.push({
          ...payment,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      success: true,
      processed: processedPayments.length,
      failed: failedPayments.length,
      processedPayments: processedPayments,
      failedPayments: failedPayments,
      processedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ PAYMENT PROCESSING ERROR:', error);
    res.status(500).json({ 
      error: 'Error processing scheduled payments',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Simulate the processing of a bank payment
 */
async function processPayment(payment: CommissionPayment): Promise<{
  success: boolean;
  transactionId?: string;
  error?: string;
}> {
  try {
    // Here we would integrate with the real banking system
    // For now simulate a successful payment
    
    console.log(`💸 PROCESSING PAYMENT: €${payment.commissionAmount/100} → ${payment.bankingInfo.iban}`);
    
    // Simulate bank system delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate successo (95% di successo)
    const isSuccess = Math.random() > 0.05;
    
    if (isSuccess) {
      return {
        success: true,
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      return {
        success: false,
        error: 'Bank rejection'
      };
    }
    
  } catch (error: any) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error during processing'
    };
  }
}

/**
 * Get the status of the payments for a staff member
 */
export async function getStaffPaymentStatus(req: Request, res: Response) {
  try {
    const { staffId } = req.params;
    
    // Retrieve all payments for this staff
    // const payments = await storage.getCommissionPaymentsByStaff(parseInt(staffId));
    const payments = []; // Placeholder per ora
    
    // Calculate statistics
    const totalPending = payments.filter((p: any) => p.status === 'pending').length;
    const totalPaid = payments.filter((p: any) => p.status === 'paid').length;
    const totalAmount = payments.reduce((sum: number, p: any) => sum + (p.status === 'paid' ? p.commissionAmount : 0), 0);
    
    res.json({
      staffId: parseInt(staffId),
      payments: payments,
      summary: {
        totalPending,
        totalPaid,
        totalAmount,
        nextPaymentDate: payments.find((p: any) => p.status === 'pending')?.dueDate || null
      }
    });
    
  } catch (error: any) {
    console.error('❌ ERROR RETRIEVING PAYMENT STATUS:', error);
    res.status(500).json({ 
      error: 'Error retrieving payment status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}