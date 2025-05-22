/**
 * Middleware di autenticazione e autorizzazione
 */
import { Request, Response, NextFunction } from 'express';

// Middleware per verificare se l'utente è autenticato
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log(`🔐 MIDDLEWARE ensureAuthenticated chiamato per ${req.method} ${req.path}`);
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log(`✅ Utente autenticato nel middleware: ${req.user?.username} (ID: ${req.user?.id})`);
    return next();
  }
  
  console.log(`❌ Utente NON autenticato nel middleware`);
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

// Middleware per verificare se l'utente è admin o staff
export function isAdminOrStaff(req: Request, res: Response, next: NextFunction) {
  if (req.user && (req.user.type === 'admin' || req.user.type === 'staff')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Accesso negato. Richiesti privilegi di admin o staff.' });
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