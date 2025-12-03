import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * SISTEMA DI PAGAMENTO AUTOMATICO COMMISSIONI REFERRAL
 * Processa pagamenti automatici dopo 30 giorni dall'abbonamento sponsorizzato
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
  commissionAmount: number; // in centesimi
  dueDate: Date;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  bankingInfo: BankingInfo;
}

/**
 * Salva le informazioni bancarie per uno staff
 */
export async function saveBankingInfo(req: Request, res: Response) {
  try {
    const { staffId } = req.params;
    const bankingData = req.body;
    
    console.log(`💳 SALVATAGGIO DATI BANCARI: Staff ID ${staffId}`);
    
    // Verifica che lo staff esista
    const staff = await storage.getUser(parseInt(staffId));
    if (!staff) {
      return res.status(404).json({ error: 'Staff non trovato' });
    }
    
    // Salva le informazioni bancarie nel database
    await storage.saveBankingInfoForStaff(parseInt(staffId), {
      hasIban: true,
      iban: bankingData.iban,
      bankName: bankingData.bankName,
      accountHolder: bankingData.accountHolder,
      swift: bankingData.swift || null
    });
    
    console.log(`✅ DATI BANCARI SALVATI per staff ${staff.username}`);
    
    res.json({
      success: true,
      message: 'Informazioni bancarie salvate con successo',
      staffId: parseInt(staffId)
    });
    
  } catch (error) {
    console.error('❌ ERRORE SALVATAGGIO DATI BANCARI:', error);
    res.status(500).json({ 
      error: 'Errore nel salvataggio delle informazioni bancarie',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
}

/**
 * Programma un pagamento automatico quando viene registrato un nuovo abbonamento sponsorizzato
 */
export async function scheduleCommissionPayment(
  sponsorStaffId: number, 
  sponsoredUserId: number, 
  subscriptionAmount: number
) {
  try {
    console.log(`📅 PROGRAMMAZIONE PAGAMENTO: Staff ${sponsorStaffId} → Utente ${sponsoredUserId}`);
    
    // Calcola la commissione (€1 = 100 centesimi)
    const commissionAmount = 100; // €1 fisso per sponsorizzazione
    
    // Calcola la data di scadenza (30 giorni da oggi)
    const subscriptionDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    // Recupera informazioni bancarie dello staff
    const bankingInfo = await storage.getBankingInfoForStaff(sponsorStaffId) || {
      hasIban: false,
      bankName: null,
      accountHolder: null
    };
    
    // Crea record di pagamento programmato
    const paymentRecord: CommissionPayment = {
      staffId: sponsorStaffId,
      sponsoredUserId: sponsoredUserId,
      subscriptionDate: subscriptionDate,
      commissionAmount: commissionAmount,
      dueDate: dueDate,
      status: bankingInfo.hasIban ? 'pending' : 'failed',
      bankingInfo: bankingInfo
    };
    
    // Salva nel database (da implementare in storage)
    // await storage.saveCommissionPayment(paymentRecord);
    
    console.log(`✅ PAGAMENTO PROGRAMMATO per ${dueDate.toLocaleDateString()}`);
    
    return {
      success: true,
      paymentId: `PAY_${sponsorStaffId}_${Date.now()}`,
      dueDate: dueDate,
      amount: commissionAmount
    };
    
  } catch (error) {
    console.error('❌ ERRORE PROGRAMMAZIONE PAGAMENTO:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    };
  }
}

/**
 * Elabora i pagamenti in scadenza (da eseguire quotidianamente)
 */
export async function processScheduledPayments(req: Request, res: Response) {
  try {
    console.log(`⚡ ELABORAZIONE PAGAMENTI PROGRAMMATI: ${new Date().toISOString()}`);
    
    // Recupera tutti i pagamenti in scadenza oggi
    const today = new Date();
    const pendingPayments = []; // await storage.getPendingCommissionPayments(today);
    
    const processedPayments = [];
    const failedPayments = [];
    
    for (const payment of pendingPayments) {
      try {
        // Verifica che lo staff abbia ancora le informazioni bancarie valide
        if (!payment.bankingInfo.hasIban || !payment.bankingInfo.iban) {
          console.log(`❌ PAGAMENTO FALLITO: Staff ${payment.staffId} senza IBAN valido`);
          failedPayments.push({
            ...payment,
            reason: 'IBAN mancante o non valido'
          });
          continue;
        }
        
        // Simula l'elaborazione del pagamento bancario
        const paymentResult = await processPayment(payment);
        
        if (paymentResult.success) {
          console.log(`✅ PAGAMENTO COMPLETATO: €${payment.commissionAmount/100} allo staff ${payment.staffId}`);
          processedPayments.push({
            ...payment,
            status: 'paid',
            processedAt: new Date(),
            transactionId: paymentResult.transactionId
          });
        } else {
          console.log(`❌ PAGAMENTO FALLITO: Staff ${payment.staffId} - ${paymentResult.error}`);
          failedPayments.push({
            ...payment,
            reason: paymentResult.error
          });
        }
        
      } catch (error) {
        console.error(`❌ ERRORE ELABORAZIONE PAGAMENTO Staff ${payment.staffId}:`, error);
        failedPayments.push({
          ...payment,
          reason: error instanceof Error ? error.message : 'Errore sconosciuto'
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
    
  } catch (error) {
    console.error('❌ ERRORE ELABORAZIONE PAGAMENTI:', error);
    res.status(500).json({ 
      error: 'Errore nell\'elaborazione dei pagamenti programmati',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
}

/**
 * Simula l'elaborazione di un pagamento bancario
 */
async function processPayment(payment: CommissionPayment): Promise<{
  success: boolean;
  transactionId?: string;
  error?: string;
}> {
  try {
    // Qui si integrerebbe con il sistema bancario reale
    // Per ora simula un pagamento di successo
    
    console.log(`💸 ELABORAZIONE PAGAMENTO: €${payment.commissionAmount/100} → ${payment.bankingInfo.iban}`);
    
    // Simula delay del sistema bancario
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simula successo (95% di successo)
    const isSuccess = Math.random() > 0.05;
    
    if (isSuccess) {
      return {
        success: true,
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      return {
        success: false,
        error: 'Rifiuto da parte della banca'
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore durante l\'elaborazione'
    };
  }
}

/**
 * Ottieni lo stato dei pagamenti per uno staff
 */
export async function getStaffPaymentStatus(req: Request, res: Response) {
  try {
    const { staffId } = req.params;
    
    // Recupera tutti i pagamenti per questo staff
    // const payments = await storage.getCommissionPaymentsByStaff(parseInt(staffId));
    const payments = []; // Placeholder per ora
    
    // Calcola statistiche
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
    
  } catch (error) {
    console.error('❌ ERRORE RECUPERO STATO PAGAMENTI:', error);
    res.status(500).json({ 
      error: 'Errore nel recupero dello stato dei pagamenti',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
}