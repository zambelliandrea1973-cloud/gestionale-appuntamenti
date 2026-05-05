import { Router, Request, Response, NextFunction } from 'express';
import { BetaService } from '../services/betaService';
import { isAdmin, isAuthenticated } from '../auth';
import { storage } from '../storage';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';
const DEFAULT_BETA_ADMIN_PASSWORD = process.env.BETA_ADMIN_PASSWORD || (isProduction ? '' : '');

// Middleware per l'autenticazione personalizzata per l'area beta
const isBetaAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check all possible authentication headers
    const adminToken = req.headers['x-beta-admin-token'] as string | undefined;
    const authHeader = req.headers['authorization'] as string | undefined;
    // Estrae the token dall'header Authorization If presente
    let bearerToken: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.substring(7); // Remove "Bearer " from the beginning
    }
    
    
    // Check if any token is present
    if (!adminToken && !bearerToken) {
      console.log('Access denied: no authentication token provided');
      return res.status(401).json({ success: false, message: 'Unauthorized access: missing token' });
    }
    
    // Check if one of the tokens matches a valid password
    // Adds support for passwords stored in localStorage
    const secondaryPassword = process.env.BETA_ADMIN_PASSWORD_2 || (isProduction ? '' : '');
    const validToken = 
      (DEFAULT_BETA_ADMIN_PASSWORD && (adminToken === DEFAULT_BETA_ADMIN_PASSWORD || bearerToken === DEFAULT_BETA_ADMIN_PASSWORD)) ||
      (secondaryPassword && (adminToken === secondaryPassword || bearerToken === secondaryPassword));
    
    if (validToken) {
      console.log('Beta admin authentication successful with standard token');
      return next();
    }
    
    // If we get here, the token is not valid
    console.log('Beta admin authentication failed: invalid token', { adminToken, bearerToken });
    return res.status(401).json({ success: false, message: 'Unauthorized access: invalid token' });
  } catch (error) {
    console.error('Error during beta admin authentication:', error);
    return res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

/**
 * Endpoint for creating a new beta invitation
 * POST /api/beta/invitations
 * Access: beta admin (uses token authentication)
 */
router.post('/invitations', isBetaAdmin, async (req, res) => {
  try {
    const { email, notes, maxUses = 1, expiryDays = 30 } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const result = await BetaService.createInvitation(email, notes, maxUses, expiryDays);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating beta invitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Endpoint per ottenere all inviti beta
 * GET /api/beta/invitations
 * Access: beta admin (uses token authentication)
 */
router.get('/invitations', isBetaAdmin, async (req, res) => {
  try {
    console.log('Retrieving beta invitations...');
    const invitations = await storage.getBetaInvitations();
    console.log('Inviti beta found:', invitations.length);
    return res.json(invitations);
  } catch (error) {
    console.error('Error retrieving beta invitations:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * Endpoint for verifying an invitation code
 * GET /api/beta/verify/:code
 * Accesso: pubblico
 */
router.get('/verify/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await BetaService.verifyInvitationCode(code);
    
    return res.json(result);
  } catch (error) {
    console.error('Error verifying invitation code:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint for beta tester feedback submission
 * POST /api/beta/feedback
 * Access: authenticated user
 */
router.post('/feedback', isAuthenticated, async (req, res) => {
  try {
    const { feedbackType, content, rating, screenshot } = req.body;
    const userId = req.user!.id;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Feedback content is required'
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
    console.error('Error sending feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint per ottenere all feedback
 * GET /api/beta/feedback
 * Access: beta admin (uses token authentication)
 */
router.get('/feedback', isBetaAdmin, async (req, res) => {
  try {
    const feedback = await BetaService.getAllFeedbacks();
    return res.json(feedback);
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint for updating the status of a feedback
 * PUT /api/beta/feedback/:id
 * Access: beta admin (uses token authentication)
 */
router.put('/feedback/:id', isBetaAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user!.id;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    // Verify that the status is valid
    const validStatuses = ['pending', 'reviewed', 'implemented', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }
    
    const result = await BetaService.updateFeedbackStatus(parseInt(id), status, adminId);
    
    return res.json({
      success: result
    });
  } catch (error) {
    console.error('Error updating feedback status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint for using an invitation code during registration
 * POST /api/beta/use/:code
 * Access: authenticated user
 */
router.post('/use/:code', isAuthenticated, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;
    
    // Verify the code first
    const verifyResult = await BetaService.verifyInvitationCode(code);
    
    if (!verifyResult.valid) {
      return res.status(400).json(verifyResult);
    }
    
    // Mark the code as used
    const success = await BetaService.markInvitationAsUsed(code, userId);
    
    return res.json({
      success,
      message: success ? 'Invitation code used successfully' : 'Error using invitation code'
    });
  } catch (error) {
    console.error('Error using invitation code:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Endpoint for the beta testers dashboard
 * GET /api/beta/dashboard
 * Access: beta admin (uses token authentication)
 */
router.get('/dashboard', isBetaAdmin, async (req, res) => {
  try {
    // Retrieve statistics for the dashboard
    console.log('Retrieving beta dashboard...');
    const invitations = await storage.getBetaInvitations();
    const feedback = await BetaService.getAllFeedbacks();
    
    console.log(`Found ${invitations.length} inviti e ${feedback.length} feedback`);
    
    // Calculate alcune statistiche
    const usedInvitations = invitations.filter(invite => invite.isUsed).length;
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
    console.error('Error retrieving beta dashboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

export default router;