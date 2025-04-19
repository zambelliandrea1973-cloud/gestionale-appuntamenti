/**
 * ClientAccessService - Servizio per gestire e registrare gli accessi dei client
 * Fornisce funzionalità per registrare gli accessi e analizzare i pattern
 */

import { storage } from "../storage";

class ClientAccessService {
  /**
   * Registra un nuovo accesso per un cliente
   */
  async logAccess(
    clientId: number, 
    ipAddress: string, 
    userAgent: string, 
    method: string = 'standard'
  ): Promise<void> {
    try {
      // Rileva se l'accesso proviene da un'app PWA
      const isPWA = userAgent.includes('standalone') || 
                   userAgent.includes('fullscreen') || 
                   userAgent.toLowerCase().includes('android-app') ||
                   userAgent.toLowerCase().includes('mobile app');
      
      // Registra l'accesso nel database
      await storage.logClientAccess(
        clientId, 
        ipAddress, 
        userAgent.substring(0, 255), // Limita lunghezza
        isPWA,
        method
      );
      
      console.log(`Accesso client registrato - ID: ${clientId}, Metodo: ${method}, PWA: ${isPWA}`);
    } catch (error) {
      console.error("Errore durante la registrazione dell'accesso:", error);
    }
  }
  
  /**
   * Ottiene il conteggio degli accessi per un cliente specifico
   */
  async getAccessCount(clientId: number): Promise<number> {
    try {
      return await storage.getClientAccessCount(clientId);
    } catch (error) {
      console.error("Errore durante il recupero del conteggio accessi:", error);
      return 0;
    }
  }
  
  /**
   * Ottiene il conteggio degli accessi per tutti i clienti
   */
  async getAllClientAccessCounts(): Promise<{clientId: number, count: number}[]> {
    try {
      return await storage.getAllClientAccessCounts();
    } catch (error) {
      console.error("Errore durante il recupero dei conteggi accessi:", error);
      return [];
    }
  }
}

export const clientAccessService = new ClientAccessService();