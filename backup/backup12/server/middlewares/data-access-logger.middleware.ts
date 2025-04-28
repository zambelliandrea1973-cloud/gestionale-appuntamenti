import { Request, Response, NextFunction } from 'express';
import { DataAccessLogger } from '../services/data-access-logger';

/**
 * Middleware per registrare automaticamente gli accessi ai dati personali
 * Può essere applicato a rotte specifiche che gestiscono dati sensibili
 */
export function logDataAccess(resourceType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Identifica l'azione in base al metodo HTTP
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

    // Ottieni l'ID della risorsa, se disponibile
    const resourceId = req.params.id || 'multiple';

    // Ottieni l'ID dell'utente dalla sessione
    const userId = req.user?.id || 'anonymous';

    // Registra l'accesso prima di procedere
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