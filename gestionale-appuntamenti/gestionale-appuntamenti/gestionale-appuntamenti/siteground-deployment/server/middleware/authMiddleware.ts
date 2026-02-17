import { Request, Response, NextFunction } from 'express';

/**
 * Middleware per verificare che l'utente sia autenticato come amministratore o staff
 */
export function isAdminOrStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Non sei autenticato'
    });
  }

  const userType = (req.user as any).type;
  const userRole = (req.user as any).role;
  
  if (userType === 'admin' || userType === 'staff' || userRole === 'admin' || userRole === 'staff') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Non hai i permessi necessari per accedere a questa risorsa'
  });
}