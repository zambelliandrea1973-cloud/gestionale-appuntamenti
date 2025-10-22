import { Request, Response, NextFunction } from 'express';
import { isSensitiveField } from '@shared/sensitive-fields';
import { GDPRCompliance } from '../services/gdpr-compliance';

/**
 * Middleware per criptare automaticamente i dati sensibili nelle richieste
 * Deve essere applicato alle rotte POST e PUT che gestiscono dati sensibili
 */
export function encryptSensitiveData(resourceType: string) {
  const gdprService = GDPRCompliance.getInstance();
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
      return next();
    }
    
    // Per ogni campo nel body, verifica se è sensibile e cripta se necessario
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string' && isSensitiveField(resourceType, key)) {
        req.body[key] = gdprService.encryptSensitiveData(req.body[key]);
      }
    });
    
    next();
  };
}

/**
 * Middleware per decriptare automaticamente i dati sensibili nelle risposte
 * Deve essere applicato a tutte le rotte GET che restituiscono dati sensibili
 */
export function decryptSensitiveData(resourceType: string) {
  const gdprService = GDPRCompliance.getInstance();
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Salva il metodo originale res.json
    const originalJson = res.json;
    
    // Sostituisci res.json con una versione personalizzata che decrittografa i dati sensibili
    res.json = function(body: any) {
      // Funzione ricorsiva per processare oggetti annidati
      function processObject(obj: any): any {
        if (!obj || typeof obj !== 'object') {
          return obj;
        }
        
        // Se è un array, processa ogni elemento
        if (Array.isArray(obj)) {
          return obj.map(item => processObject(item));
        }
        
        // Altrimenti è un oggetto, processa ogni proprietà
        const result: any = { ...obj };
        Object.keys(result).forEach(key => {
          if (typeof result[key] === 'string' && isSensitiveField(resourceType, key)) {
            result[key] = gdprService.decryptSensitiveData(result[key]);
          } else if (typeof result[key] === 'object') {
            result[key] = processObject(result[key]);
          }
        });
        
        return result;
      }
      
      // Processa l'intero body
      const processedBody = processObject(body);
      
      // Chiama il metodo json originale con i dati decriptati
      return originalJson.call(this, processedBody);
    };
    
    next();
  };
}