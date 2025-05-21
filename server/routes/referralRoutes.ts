/**
 * Routes per la gestione del sistema di referral
 */
import express from 'express';
import { ensureAuthenticated, isAdmin, isStaff } from '../middleware/authMiddleware';
import * as referralService from '../services/referralService';
import { format, subMonths } from 'date-fns';

const router = express.Router();

/**
 * Genera un codice di referral per l'utente corrente
 * POST /api/referral/generate-code
 */
router.post('/generate-code', ensureAuthenticated, isStaff, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }
    
    const userId = req.user.id;
    const code = await referralService.generateReferralCode(userId);
    
    return res.status(200).json({
      success: true,
      code
    });
  } catch (error) {
    console.error('Errore nella generazione del codice referral:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nella generazione del codice referral'
    });
  }
});

/**
 * Ottiene le statistiche sui referral dell'utente corrente
 * GET /api/referral/stats
 */
router.get('/stats', ensureAuthenticated, isStaff, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Ottieni le commissioni attive
    const commissions = await referralService.getActiveCommissions(userId);
    
    // Calcola le statistiche
    const currentPeriod = format(new Date(), 'yyyy-MM');
    const lastPeriod = format(subMonths(new Date(), 1), 'yyyy-MM');
    
    const currentAmount = await referralService.calculateCommissionsForPeriod(userId, currentPeriod);
    const lastAmount = await referralService.calculateCommissionsForPeriod(userId, lastPeriod);
    
    // Ottieni le informazioni sul conto bancario
    const bankAccount = await referralService.getBankAccount(userId);
    
    return res.status(200).json({
      success: true,
      stats: {
        totalActiveCommissions: commissions.length,
        currentMonthAmount: currentAmount,
        lastMonthAmount: lastAmount,
        hasBankAccount: !!bankAccount,
      },
      commissions,
      bankAccount
    });
  } catch (error) {
    console.error('Errore nel recupero delle statistiche sui referral:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle statistiche sui referral'
    });
  }
});

/**
 * Salva il conto bancario dell'utente
 * POST /api/referral/bank-account
 */
router.post('/bank-account', ensureAuthenticated, isStaff, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bankName, accountHolder, iban, swift, isDefault = true } = req.body;
    
    // Validazione dei campi
    if (!bankName || !accountHolder || !iban) {
      return res.status(400).json({
        success: false,
        message: 'Dati mancanti. Banca, intestatario e IBAN sono obbligatori.'
      });
    }
    
    // Salva il conto bancario
    const account = await referralService.saveBankAccount(userId, {
      bankName,
      accountHolder,
      iban,
      swift,
      isDefault
    });
    
    if (!account) {
      return res.status(500).json({
        success: false,
        message: 'Errore nel salvataggio del conto bancario'
      });
    }
    
    return res.status(200).json({
      success: true,
      account
    });
  } catch (error) {
    console.error('Errore nel salvataggio del conto bancario:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nel salvataggio del conto bancario'
    });
  }
});

/**
 * Registra un nuovo referral
 * POST /api/referral/register
 * Richiede il codice di referral e l'ID del nuovo utente
 * Utilizzata internamente dal processo di registrazione
 */
router.post('/register', async (req, res) => {
  try {
    const { referralCode, userId } = req.body;
    
    if (!referralCode || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Codice referral e ID utente sono obbligatori'
      });
    }
    
    const result = await referralService.registerReferral(referralCode, userId);
    
    return res.status(200).json({
      success: result,
      message: result 
        ? 'Referral registrato con successo' 
        : 'Impossibile registrare il referral. Codice non valido o già utilizzato.'
    });
  } catch (error) {
    console.error('Errore nella registrazione del referral:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nella registrazione del referral'
    });
  }
});

// Rotte amministrative (solo per admin)

/**
 * Ottiene tutti i pagamenti di referral in sospeso
 * GET /api/referral/admin/pending-payments
 */
router.get('/admin/pending-payments', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    // Ottieni i pagamenti in sospeso dal database
    const pendingPayments = await referralService.getPendingPayments();
    
    return res.status(200).json({
      success: true,
      payments: pendingPayments
    });
  } catch (error) {
    console.error('Errore nel recupero dei pagamenti in sospeso:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei pagamenti in sospeso'
    });
  }
});

/**
 * Genera pagamenti per tutti gli utenti per il periodo corrente
 * POST /api/referral/admin/generate-payments
 */
router.post('/admin/generate-payments', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    const period = req.body.period || format(new Date(), 'yyyy-MM');
    const result = await referralService.generatePaymentsForAllUsers(period);
    
    return res.status(200).json({
      success: true,
      message: `Generati ${result.count} pagamenti per il periodo ${period}`,
      payments: result.payments
    });
  } catch (error) {
    console.error('Errore nella generazione dei pagamenti:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nella generazione dei pagamenti'
    });
  }
});

/**
 * Aggiorna lo stato di un pagamento
 * PUT /api/referral/admin/payment/:id
 */
router.put('/admin/payment/:id', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const { status, processingNote } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Lo stato del pagamento è obbligatorio'
      });
    }
    
    const payment = await referralService.updatePaymentStatus(paymentId, status, processingNote);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pagamento non trovato'
      });
    }
    
    return res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del pagamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del pagamento'
    });
  }
});

export default router;