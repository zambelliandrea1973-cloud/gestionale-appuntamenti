import { Request, Response, NextFunction } from 'express';

const isProduction = process.env.NODE_ENV === 'production';
const DEV_ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD;

export function isPaymentAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.isAuthenticated() && (req.user as any).role === 'admin') {
      return next();
    }
    
    if (!isProduction && DEV_ADMIN_PASSWORD) {
      const bearerToken = req.headers.authorization?.split(' ')[1];
      const adminToken = req.headers['x-beta-admin-token'] || req.headers['x-auth-token'];
      if (adminToken === DEV_ADMIN_PASSWORD || bearerToken === DEV_ADMIN_PASSWORD) {
        return next();
      }
    }
    
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