import { Request, Response, NextFunction } from 'express';

/**
 * Middleware per verificare che l'utente sia un amministratore dei pagamenti
 * Un amministratore dei pagamenti può essere:
 * 1. Un utente con ruolo 'admin'
 * 2. Un utente con un token di amministrazione specifico per i pagamenti
 */
export function isPaymentAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // Estrai i token disponibili
    const bearerToken = req.headers.authorization?.split(' ')[1];
    const adminToken = req.headers['x-beta-admin-token'] || req.headers['x-auth-token'];
    
    // Log per debugging
    console.log('Headers ricevuti payment admin:', req.headers);
    console.log('Token di autenticazione ricevuti payment admin:', { adminToken, bearerToken });
    
    // Controllo 1: Verifica se l'utente è autenticato come admin
    if (req.isAuthenticated() && (req.user as any).role === 'admin') {
      console.log('Autenticazione payment admin riuscita come admin');
      return next();
    }
    
    // Controllo 2: Verifica se è stato fornito un token di autenticazione valido
    // Questo è un semplice controllo di esempio - in produzione, dovresti utilizzare
    // una soluzione più robusta come JWT
    if (adminToken === 'gironico' || bearerToken === 'gironico') {
      console.log('Autenticazione payment admin riuscita con token standard');
      return next();
    }
    
    // Se arriviamo qui, l'utente non è autorizzato
    console.log('Autenticazione payment admin fallita');
    return res.status(401).json({
      success: false,
      message: 'Non sei autorizzato ad accedere a questa risorsa'
    });
  } catch (error) {
    console.error('Errore durante la verifica dell\'autenticazione payment admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore durante la verifica dell\'autenticazione'
    });
  }
}