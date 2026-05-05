// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { isSensitiveField } from '@shared/sensitive-fields';
import { GDPRCompliance } from '../services/gdpr-compliance';

/**
 * Middleware for automatically encrypting sensitive data in requests
 * Must be applied to POST and PUT routes that handle sensitive data
 */
export function encryptSensitiveData(resourceType: string) {
  const gdprService = GDPRCompliance.getInstance();
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
      return next();
    }
    
    // For each field in the body, check if it is sensitive and encrypt if needed
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string' && isSensitiveField(resourceType, key)) {
        req.body[key] = gdprService.encryptSensitiveData(req.body[key]);
      }
    });
    
    next();
  };
}

/**
 * Middleware for automatically decrypting sensitive data in responses
 * Must be applied to all GET routes that return sensitive data
 */
export function decryptSensitiveData(resourceType: string) {
  const gdprService = GDPRCompliance.getInstance();
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Save the metodo originale res.json
    const originalJson = res.json;
    
    // Replace res.json with a custom version that decrypts sensitive data
    res.json = function(body: any) {
      // Recursive function for processing nested objects
      function processObject(obj: any): any {
        if (!obj || typeof obj !== 'object') {
          return obj;
        }
        
        // If it is an array, process each element
        if (Array.isArray(obj)) {
          return obj.map(item => processObject(item));
        }
        
        // otherwise it is an object, process each property
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
      
      // Process l'intero body
      const processedBody = processObject(body);
      
      // Call the original json method with the decrypted data
      return originalJson.call(this, processedBody);
    };
    
    next();
  };
}