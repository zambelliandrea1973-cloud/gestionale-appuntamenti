import { Router, Request, Response, NextFunction } from 'express';
import { BetaService } from '../services/betaService';
import { isAdmin, isAuthenticated } from '../auth';

const router = Router();

// Password amministrativa predefinita per l'accesso all'area beta
const DEFAULT_BETA_ADMIN_PASSWORD = 'gironico';

// Middleware per l'autenticazione personalizzata per l'area beta
const isBetaAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Controlla l'header X-Beta-Admin-Token
  const adminToken = req.headers['x-beta-admin-token'];
  
  if (!adminToken) {
    return res.status(401).json({ message: 'Accesso non autorizzato: token mancante' });
  }
  
  // Verifica se il token corrisponde alla password
  // Per semplicità accettiamo sia la password predefinita che quella originale precedente
  if (adminToken === DEFAULT_BETA_ADMIN_PASSWORD || adminToken === 'EF2025Admin') {
    return next();
  }
  
  // Se arriviamo qui, il token non è valido
  return res.status(401).json({ message: 'Accesso non autorizzato: token non valido' });
};

/**
 * Endpoint per la creazione di un nuovo invito beta
 * POST /api/beta/invitations
 * Accesso: beta admin (utilizza autenticazione con token)
 */
router.post('/invitations', isBetaAdmin, async (req, res) => {
  try {
    const { email, notes, maxUses = 1, expiryDays = 30 } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'L\'email è obbligatoria'
      });
    }
    
    const result = await BetaService.createInvitation(email, notes, maxUses, expiryDays);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Errore durante la creazione dell\'invito beta:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Endpoint per ottenere tutti gli inviti beta
 * GET /api/beta/invitations
 * Accesso: beta admin (utilizza autenticazione con token)
 */
router.get('/invitations', isBetaAdmin, async (req, res) => {
  try {
    const invitations = await req.app.locals.storage.getBetaInvitations();
    return res.json(invitations);
  } catch (error) {
    console.error('Errore durante il recupero degli inviti beta:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per verificare un codice di invito
 * GET /api/beta/verify/:code
 * Accesso: pubblico
 */
router.get('/verify/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await BetaService.verifyInvitationCode(code);
    
    return res.json(result);
  } catch (error) {
    console.error('Errore durante la verifica del codice di invito:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per l'invio di feedback da parte di un beta tester
 * POST /api/beta/feedback
 * Accesso: utente autenticato
 */
router.post('/feedback', isAuthenticated, async (req, res) => {
  try {
    const { feedbackType, content, rating, screenshot } = req.body;
    const userId = req.user!.id;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Il contenuto del feedback è obbligatorio'
      });
    }
    
    const result = await BetaService.submitFeedback(userId, {
      feedbackType: feedbackType || 'general',
      content,
      rating,
      screenshot
    });
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Errore durante l\'invio del feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per ottenere tutti i feedback
 * GET /api/beta/feedback
 * Accesso: beta admin (utilizza autenticazione con token)
 */
router.get('/feedback', isBetaAdmin, async (req, res) => {
  try {
    const feedback = await BetaService.getAllFeedbacks();
    return res.json(feedback);
  } catch (error) {
    console.error('Errore durante il recupero dei feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per aggiornare lo stato di un feedback
 * PUT /api/beta/feedback/:id
 * Accesso: beta admin (utilizza autenticazione con token)
 */
router.put('/feedback/:id', isBetaAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user!.id;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Lo stato è obbligatorio'
      });
    }
    
    // Verifica che lo stato sia valido
    const validStatuses = ['pending', 'reviewed', 'implemented', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Stato non valido. Gli stati validi sono: ' + validStatuses.join(', ')
      });
    }
    
    const result = await BetaService.updateFeedbackStatus(parseInt(id), status, adminId);
    
    return res.json({
      success: result
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento dello stato del feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per utilizzare un codice di invito durante la registrazione
 * POST /api/beta/use/:code
 * Accesso: utente autenticato
 */
router.post('/use/:code', isAuthenticated, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;
    
    // Verifica prima il codice
    const verifyResult = await BetaService.verifyInvitationCode(code);
    
    if (!verifyResult.valid) {
      return res.status(400).json(verifyResult);
    }
    
    // Marca il codice come utilizzato
    const success = await BetaService.markInvitationAsUsed(code, userId);
    
    return res.json({
      success,
      message: success ? 'Codice di invito utilizzato con successo' : 'Errore durante l\'utilizzo del codice di invito'
    });
  } catch (error) {
    console.error('Errore durante l\'utilizzo del codice di invito:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

/**
 * Endpoint per la dashboard dei beta tester
 * GET /api/beta/dashboard
 * Accesso: beta admin (utilizza autenticazione con token)
 */
router.get('/dashboard', isBetaAdmin, async (req, res) => {
  try {
    // Recupera statistiche per la dashboard
    const invitations = await req.app.locals.storage.getBetaInvitations();
    const feedback = await BetaService.getAllFeedbacks();
    
    // Calcola alcune statistiche
    const usedInvitations = invitations.filter(i => i.isUsed).length;
    const unusedInvitations = invitations.length - usedInvitations;
    
    const feedbackByStatus = {
      pending: feedback.filter(f => f.status === 'pending').length,
      reviewed: feedback.filter(f => f.status === 'reviewed').length,
      implemented: feedback.filter(f => f.status === 'implemented').length,
      rejected: feedback.filter(f => f.status === 'rejected').length
    };
    
    const feedbackByType = {
      general: feedback.filter(f => f.feedbackType === 'general').length,
      bug: feedback.filter(f => f.feedbackType === 'bug').length,
      feature: feedback.filter(f => f.feedbackType === 'feature').length,
      usability: feedback.filter(f => f.feedbackType === 'usability').length
    };
    
    return res.json({
      invitations: {
        total: invitations.length,
        used: usedInvitations,
        unused: unusedInvitations
      },
      feedback: {
        total: feedback.length,
        byStatus: feedbackByStatus,
        byType: feedbackByType,
        recent: feedback.slice(0, 5) // Ultimi 5 feedback
      }
    });
  } catch (error) {
    console.error('Errore durante il recupero della dashboard beta:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno del server'
    });
  }
});

export default router;