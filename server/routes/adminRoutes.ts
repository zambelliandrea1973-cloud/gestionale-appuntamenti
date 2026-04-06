/**
 * Rotte per le funzioni amministrative
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
  
  return res.status(401).json({ success: false, message: 'Non autorizzato' });
}

/**
 * Endpoint per ottenere un token di riavvio
 * Richiede autenticazione come admin
 */
adminRouter.get('/restart-token', isAdmin, (req: Request, res: Response) => {
  try {
    const token = generateRestartToken();
    res.json({ success: true, token });
  } catch (error) {
    console.error('Errore nella generazione del token di riavvio:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nella generazione del token' 
    });
  }
});

/**
 * Endpoint per avviare il riavvio dell'applicazione
 * Richiede un token valido generato in precedenza
 */
adminRouter.post('/restart', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token mancante' 
      });
    }
    
    if (!isValidRestartToken(token)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token non valido o scaduto' 
      });
    }
    
    const result = await restartApplication(token);
    res.json(result);
  } catch (error) {
    console.error('Errore durante il riavvio:', error);
    res.status(500).json({ 
      success: false, 
      message: `Errore durante il riavvio: ${error}` 
    });
  }
});

/**
 * Endpoint pubblico per il riavvio d'emergenza
 * Può essere chiamato anche quando l'applicazione è quasi offline
 * Richiede una chiave di sicurezza fissa nel parametro "key"
 * 
 * Questo endpoint può essere chiamato con una chiave configurata via env var EMERGENCY_RESTART_KEY
 */
adminRouter.post('/emergency-restart', async (req: Request, res: Response) => {
  try {
    const { key } = req.query;
    const EMERGENCY_RESTART_KEY = process.env.EMERGENCY_RESTART_KEY;
    
    if (!EMERGENCY_RESTART_KEY || !key || key !== EMERGENCY_RESTART_KEY) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chiave di riavvio d\'emergenza non valida' 
      });
    }
    
    console.log('🚨 RIAVVIO DI EMERGENZA AVVIATO');
    
    // Genera un token temporaneo per il riavvio
    const token = generateRestartToken();
    
    const result = await restartApplication(token);
    res.json({
      ...result,
      mode: 'emergency'
    });
  } catch (error) {
    console.error('Errore durante il riavvio di emergenza:', error);
    res.status(500).json({ 
      success: false, 
      message: `Errore durante il riavvio di emergenza: ${error}` 
    });
  }
});