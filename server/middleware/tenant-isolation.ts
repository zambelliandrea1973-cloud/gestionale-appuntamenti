import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure complete tenant isolation
 * Each user sees only their own data, except the admin who manages everything
 */

export interface TenantUser {
  id: number;
  type: 'admin' | 'customer' | 'staff' | 'client';
  username: string;
  email?: string;
}

/**
 * Middleware to verify that the user accesses only their own data
 */
export function enforceDataIsolation(req: Request, res: Response, next: NextFunction) {
  const user = req.user as TenantUser;
  
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Admin can access everything to manage payments and accounts
  if (user.type === 'admin') {
    console.log(`🔒 ADMIN ACCESS: ${user.username} (ID: ${user.id}) - full access granted`);
    next();
    return;
  }

  // For all other users, automatically add the userId filter
  const originalPath = req.path;
  console.log(`🔒 TENANT ISOLATION: ${user.username} (ID: ${user.id}, type: ${user.type}) - isolated access to ${originalPath}`);
  
  // Add userId to parameters to ensure isolation
  req.tenantUserId = user.id;
  req.tenantUserType = user.type;
  
  next();
}

/**
 * Middleware specific to client operations
 * Only admin can manage all clients, others see only their own
 */
export function enforceClientAccess(req: Request, res: Response, next: NextFunction) {
  const user = req.user as TenantUser;
  
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Only admin and customer can manage clients
  if (user.type !== 'admin' && user.type !== 'customer') {
    return res.status(403).json({ message: 'Access denied: only admin and customer can manage clients' });
  }

  next();
}

/**
 * Middleware specific to admin functions
 * Only admin can manage payments, subscriptions and referrals
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as TenantUser;
  
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (user.type !== 'admin') {
    return res.status(403).json({ message: 'Access denied: function reserved for administrators' });
  }

  console.log(`🔐 ADMIN FUNCTION: ${user.username} (ID: ${user.id}) - administrative function access`);
  next();
}

// Extend the Request interface to include tenant data
declare global {
  namespace Express {
    interface Request {
      tenantUserId?: number;
      tenantUserType?: string;
    }
  }
}