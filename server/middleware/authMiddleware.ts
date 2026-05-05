import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function isAdminOrStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'You are not authenticated'
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