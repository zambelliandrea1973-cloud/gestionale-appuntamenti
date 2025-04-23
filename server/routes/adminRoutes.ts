/**
 * Rotte per le funzioni amministrative
 */
import { Router, Request, Response } from 'express';
import { generateRestartToken, isValidRestartToken, restartApplication } from '../services/restartService';

export const adminRouter = Router();

// Middleware per verificare se l'utente è autenticato come admin
function isAdmin(req: Request, res: Response, next: Function) {
  // Verifica se l'utente è autenticato e ha ruolo admin
  // Questa è una versione semplificata, dovresti adattarla al tuo sistema di autenticazione
  if (req.isAuthenticated && req.isAuthenticated()) {
    // Assumiamo che l'utente autenticato sia admin
    return next();
  }
  
  // Alternative per ambienti di test o sviluppo
  // Verifica l'header di autenticazione personalizzato
  const adminToken = req.headers['x-admin-token'];
  
  if (adminToken === 'gironico') {
    return next();
  }
  
  // Controlla se c'è un token in sessione o cookie
  const sessionAuth = req.session?.adminAuthenticated === true;
  if (sessionAuth) {
    return next();
  }
  
  // Controlla il body per le richieste POST
  if (req.method === 'POST' && req.body?.adminPassword === 'gironico') {
    return next();
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
 * Questo endpoint può essere chiamato con:
 * curl -X POST http://localhost:5000/api/admin/emergency-restart?key=gironico-restart-2025
 */
adminRouter.post('/emergency-restart', async (req: Request, res: Response) => {
  try {
    const { key } = req.query;
    const EMERGENCY_RESTART_KEY = 'gironico-restart-2025';
    
    if (!key || key !== EMERGENCY_RESTART_KEY) {
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