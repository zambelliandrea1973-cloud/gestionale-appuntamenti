/**
 * Middleware di autenticazione e autorizzazione
 */
import { Request, Response, NextFunction } from 'express';

// Middleware per verificare se l'utente è autenticato
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Non autorizzato' });
}

// Middleware per verificare se l'utente è un amministratore
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.type === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Accesso negato. Richiesti privilegi di amministratore.' });
}

// Middleware per verificare se l'utente è staff
export function isStaff(req: Request, res: Response, next: NextFunction) {
  if (req.user && (req.user.type === 'staff' || req.user.type === 'admin')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Accesso negato. Richiesti privilegi di staff.' });
}

// Middleware per verificare se l'utente è un cliente
export function isCustomer(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.type === 'customer') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Accesso negato. Richiesti privilegi di cliente.' });
}

// Estendi l'oggetto Request di Express
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      type: string;
      role?: string; // Reso opzionale per evitare conflitti con altre definizioni
    }
  }
}