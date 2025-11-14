import { Request, Response, NextFunction } from 'express';

/**
 * Middleware per garantire l'isolamento completo dei tenant
 * Ogni utente vede solo i propri dati, tranne l'admin che gestisce tutto
 */

export interface TenantUser {
  id: number;
  type: 'admin' | 'customer' | 'staff' | 'client';
  username: string;
  email?: string;
}

/**
 * Middleware per verificare che l'utente acceda solo ai propri dati
 */
export function enforceDataIsolation(req: Request, res: Response, next: NextFunction) {
  const user = req.user as TenantUser;
  
  if (!user) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  // L'admin può accedere a tutto per gestire pagamenti e account
  if (user.type === 'admin') {
    console.log(`🔒 ADMIN ACCESS: ${user.username} (ID: ${user.id}) - accesso completo garantito`);
    next();
    return;
  }

  // Per tutti gli altri utenti, aggiungi automaticamente il filtro userId
  const originalPath = req.path;
  console.log(`🔒 TENANT ISOLATION: ${user.username} (ID: ${user.id}, type: ${user.type}) - accesso isolato a ${originalPath}`);
  
  // Aggiungi userId ai parametri per garantire isolamento
  req.tenantUserId = user.id;
  req.tenantUserType = user.type;
  
  next();
}

/**
 * Middleware specifico per le operazioni sui clienti
 * Solo admin può gestire tutti i clienti, gli altri vedono solo i propri
 */
export function enforceClientAccess(req: Request, res: Response, next: NextFunction) {
  const user = req.user as TenantUser;
  
  if (!user) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  // Solo admin e customer possono gestire clienti
  if (user.type !== 'admin' && user.type !== 'customer') {
    return res.status(403).json({ message: 'Accesso negato: solo admin e customer possono gestire clienti' });
  }

  next();
}

/**
 * Middleware specifico per le funzioni admin
 * Solo admin può gestire pagamenti, abbonamenti e referral
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as TenantUser;
  
  if (!user) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  if (user.type !== 'admin') {
    return res.status(403).json({ message: 'Accesso negato: funzione riservata agli amministratori' });
  }

  console.log(`🔐 ADMIN FUNCTION: ${user.username} (ID: ${user.id}) - accesso funzione amministrativa`);
  next();
}

// Estendi l'interfaccia Request per includere i dati del tenant
declare global {
  namespace Express {
    interface Request {
      tenantUserId?: number;
      tenantUserType?: string;
    }
  }
}