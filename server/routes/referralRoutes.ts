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
 * Ottiene statistiche e dettagli sui referral dell'utente corrente
 * GET /api/referral/stats
 */
router.get('/stats', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    const referralDetails = await simplifiedReferralService.getReferralDetails(req.user.id);
    
    res.json(referralDetails);
  } catch (error) {
    console.error('Errore nel recupero statistiche referral:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle statistiche di referral'
    });
  }
});

/**
 * Genera un nuovo codice referral per l'utente
 * POST /api/referral/generate-code
 */
router.post('/generate-code', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    const code = await simplifiedReferralService.generateReferralCode(req.user.id);
    
    res.json({
      success: true,
      code
    });
  } catch (error) {
    console.error('Errore nella generazione codice referral:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella generazione del codice referral'
    });
  }
});

/**
 * Salva il conto bancario dell'utente
 * POST /api/referral/bank-account
 */
router.post('/bank-account', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    const bankAccount = await simplifiedReferralService.saveBankAccount(req.user.id, req.body);
    
    res.json({
      success: true,
      bankAccount
    });
  } catch (error) {
    console.error('Errore nel salvataggio conto bancario:', error);
    res.status(500).json({
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
        ? 'Referral registrato con successo' 
        : 'Impossibile registrare il referral (codice non valido)'
    });
  } catch (error) {
    console.error('Errore nella registrazione referral:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella registrazione del referral'
    });
  }
});

/**
 * Ottiene statistiche referral per lo staff corrente
 * GET /api/referral/staff
 */
router.get('/staff', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    console.log(`🚀 ROUTER REFERRAL: Richiesta staff referral per utente ID: ${req.user.id}, email: ${req.user.email}`);
    
    // Chiama la funzione esistente passando l'ID dello staff come parametro
    req.params.staffId = req.user.id.toString();
    await getIndividualStaffReferral(req, res);
  } catch (error) {
    console.error('Errore nel recupero statistiche staff:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle statistiche staff'
    });
  }
});

// Rotte amministrative (solo per admin)

/**
 * Ottiene la panoramica referral per admin
 * GET /api/referral/overview
 */
router.get('/overview', isAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log(`🚀 ADMIN REFERRAL: Panoramica richiesta da ${req.user!.email}`);
    await getWorkingReferralOverview(req, res);
  } catch (error) {
    console.error('Errore nella panoramica admin:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel caricamento panoramica referral'
    });
  }
});

// Rotte amministrative (solo per admin)

/**
 * Paga le commissioni di uno staff specifico
 * POST /api/referral/staff/:staffId/pay-commissions
 */
router.post('/staff/:staffId/pay-commissions', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Verifica che sia un admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo gli admin possono pagare le commissioni'
      });
    }

    await payStaffCommissions(req, res);
  } catch (error) {
    console.error('Errore nel pagamento commissioni:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel pagamento delle commissioni'
    });
  }
});

/**
 * Ottiene tutti i pagamenti di referral in sospeso
 * GET /api/referral/admin/pending-payments
 */
router.get('/admin/pending-payments', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Ottieni i pagamenti in sospeso dal database
    const pendingPayments = await simplifiedReferralService.getPendingPayments();
    
    res.json({
      success: true,
      pendingPayments
    });
  } catch (error) {
    console.error('Errore nel recupero pagamenti in sospeso:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei pagamenti in sospeso'
    });
  }
});

/**
 * Genera pagamenti per tutti gli utenti per il periodo corrente
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
  } catch (error) {
    console.error('Errore nella generazione dei pagamenti:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella generazione dei pagamenti'
    });
  }
});

/**
 * Aggiorna lo stato di un pagamento
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
  } catch (error) {
    console.error('Errore nell\'aggiornamento del pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del pagamento'
    });
  }
});

/**
 * Ottiene panoramica aggregata per admin (NUOVO!)
 * GET /api/referral/overview
 */
router.get('/overview', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Accesso negato: solo admin' 
      });
    }
    
    console.log(`🎯 ROUTER OVERVIEW: Richiesta overview admin da: ${req.user.email}`);
    console.log('🔄 USANDO NUOVO AGGREGATORE che raccoglie dati da tutti i sistemi staff individuali');
    
    // Usa il nuovo aggregatore che mantiene la funzionalità individuale
    await getAdminReferralAggregation(req, res);
  } catch (error) {
    console.error('Errore nel recupero overview admin:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero della panoramica referral'
    });
  }
});

export default router;