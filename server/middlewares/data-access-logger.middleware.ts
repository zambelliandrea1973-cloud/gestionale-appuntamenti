import { Request, Response, NextFunction } from 'express';
import { DataAccessLogger } from '../services/data-access-logger';

/**
 * Middleware for automatically logging personal data access
 * Can be applied to specific routes that handle sensitive data
 */
export function logDataAccess(resourceType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Identify the action based on the HTTP method
    let action: 'read' | 'create' | 'update' | 'delete';
    switch (req.method) {
      case 'GET':
        action = 'read';
        break;
      case 'POST':
        action = 'create';
        break;
      case 'PUT':
        action = 'update';
        break;
      case 'DELETE':
        action = 'delete';
        break;
      default:
        action = 'read';
    }

    // Get the resource ID, if available
    const resourceId = req.params.id || 'multiple';

    // Get the user ID from the session
    const userId = req.user?.id || 'anonymous';

    // Register access before proceeding
    DataAccessLogger.logAccess(
      userId,
      action,
      resourceType,
      resourceId,
      `Metodo: ${req.method}, Percorso: ${req.path}`
    );

    next();
  };
}