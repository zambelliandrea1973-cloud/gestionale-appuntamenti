// @ts-nocheck
/**
 * Routes for administrative functions
 */
import { Router, Request, Response } from 'express';
import { generateRestartToken, isValidRestartToken, restartApplication } from '../services/restartService';

export const adminRouter = Router();

const isProduction = process.env.NODE_ENV === 'production';
const DEV_ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD;

function isAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  const sessionAuth = req.session?.adminAuthenticated === true;
  if (sessionAuth) {
    return next();
  }
  
  if (!isProduction && DEV_ADMIN_PASSWORD) {
    const adminToken = req.headers['x-admin-token'];
    if (adminToken === DEV_ADMIN_PASSWORD) {
      return next();
    }
    if (req.method === 'POST' && req.body?.adminPassword === DEV_ADMIN_PASSWORD) {
      return next();
    }
  }
  
  return res.status(401).json({ success: false, message: 'Unauthorized' });
}

/**
 * Endpoint for getting a restart token
 * Requires admin authentication
 */
adminRouter.get('/restart-token', isAdmin, (req: Request, res: Response) => {
  try {
    const token = generateRestartToken();
    res.json({ success: true, token });
  } catch (error: any) {
    console.error('Error generating restart token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating token' 
    });
  }
});

/**
 * Endpoint to initiate application restart
 * Requires a valid previously generated token
 */
adminRouter.post('/restart', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token missing' 
      });
    }
    
    if (!isValidRestartToken(token)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    const result = await restartApplication(token);
    res.json(result);
  } catch (error: any) {
    console.error('Error during restart:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error during restart: ${error}` 
    });
  }
});

/**
 * Public endpoint for emergency restart
 * Can be called even when the application is nearly offline
 * Requires a fixed security key in the "key" parameter
 * 
 * This endpoint can be called with a key configured via env var EMERGENCY_RESTART_KEY
 */
adminRouter.post('/emergency-restart', async (req: Request, res: Response) => {
  try {
    const { key } = req.query;
    const EMERGENCY_RESTART_KEY = process.env.EMERGENCY_RESTART_KEY;
    
    if (!EMERGENCY_RESTART_KEY || !key || key !== EMERGENCY_RESTART_KEY) {
      return res.status(401).json({ 
        success: false, 
        message: 'Emergency restart key invalid' 
      });
    }
    
    console.log('🚨 EMERGENCY RESTART INITIATED');
    
    // Generate a temporary token for the restart
    const token = generateRestartToken();
    
    const result = await restartApplication(token);
    res.json({
      ...result,
      mode: 'emergency'
    });
  } catch (error: any) {
    console.error('Error during emergency restart:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error during emergency restart: ${error}` 
    });
  }
});