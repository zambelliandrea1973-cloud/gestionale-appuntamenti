/**
 * Rotte per le funzioni amministrative
 */
import { Router } from 'express';
import { isAdmin } from '../auth';
import { generateRestartToken, restartApplication } from '../services/restartService';

export const adminRouter = Router();

// Middleware di protezione per le rotte admin
adminRouter.use(isAdmin);

/**
 * Endpoint per ottenere un token di riavvio
 * Richiede autenticazione come admin
 */
adminRouter.get('/restart-token', (req, res) => {
  try {
    const token = generateRestartToken();
    res.json({ success: true, token });
  } catch (error) {
    console.error('Errore nella generazione del token di riavvio:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nella generazione del token di riavvio' 
    });
  }
});

/**
 * Endpoint per avviare il riavvio dell'applicazione
 * Richiede un token valido generato in precedenza
 */
adminRouter.post('/restart', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token di riavvio mancante' 
      });
    }
    
    const result = await restartApplication(token);
    
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Errore durante il riavvio dell\'applicazione:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno durante il riavvio dell\'applicazione' 
    });
  }
});