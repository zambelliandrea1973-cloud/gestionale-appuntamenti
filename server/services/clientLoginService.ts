/**
 * ClientLoginService - Servizio centralizzato per gestire l'autenticazione dei client
 * Fornisce funzionalità avanzate, supporto per autenticazione basata su token
 * e metodi alternativi per adattarsi a dispositivi mobili e PWA.
 */

import { storage } from "../storage";
import { comparePasswords, generateSaltedHash } from "../auth";
import { tokenService } from "./tokenService";

class ClientLoginService {
  /**
   * Verifica le credenziali del cliente tramite diversi metodi possibili
   */
  async verifyCredentials(
    username: string,
    password?: string,
    token?: string,
    clientId?: number,
    bypassAuth = false
  ) {
    try {
      // Log completo per tracciare i tentativi
      console.log("Verificando credenziali:", {
        username,
        hasPassword: !!password,
        hasToken: !!token,
        clientId,
        bypassAuth
      });
      
      // Cerca l'utente basandosi sullo username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.warn(`Utente non trovato: ${username}`);
        return null;
      }
      
      // Verifica che sia un utente di tipo client
      if (user.type !== "client") {
        console.warn(`Tipo utente non valido: ${user.type}`);
        return null;
      }
      
      // Ottieni il cliente associato all'utente
      const client = await storage.getClient(user.clientId);
      
      if (!client) {
        console.warn(`Cliente non trovato per l'utente: ${username}`);
        return null;
      }
      
      // Se bypassAuth è true e abbiamo un token valido, ignora la verifica della password
      if (bypassAuth && token) {
        // Verifica direttamente il token e il clientId
        const isValid = await this.verifyToken(token, user.clientId);
        
        if (isValid) {
          console.log(`Token verificato correttamente per: ${username}`);
          return { ...user, client };
        } else {
          console.warn(`Token non valido per: ${username}`);
          return null;
        }
      }
      
      // Se abbiamo una password, verifichiamola
      if (password) {
        const isPasswordValid = await comparePasswords(password, user.password);
        
        if (!isPasswordValid) {
          console.warn(`Password non valida per: ${username}`);
          return null;
        }
      }
      // Se non abbiamo né password né bypass con token, fallisci
      else if (!bypassAuth || !token) {
        console.warn("Nessun metodo di autenticazione fornito");
        return null;
      }
      
      console.log(`Autenticazione completata con successo per: ${username}`);
      return { ...user, client };
    } catch (error) {
      console.error("Errore durante la verifica delle credenziali:", error);
      return null;
    }
  }
  
  /**
   * Verifica un token per un cliente specifico
   */
  async verifyToken(token: string, clientId: number) {
    try {
      return await tokenService.verifyClientToken(token, clientId);
    } catch (error) {
      console.error(`Errore durante la verifica del token per clientId ${clientId}:`, error);
      return false;
    }
  }
  
  /**
   * Metodo speciale per autenticazione via GET (senza body JSON)
   * Utile per browser mobili con problemi nelle richieste POST
   */
  async authenticateViaGet(
    username: string, 
    clientIdStr: string, 
    token: string,
    isPwa: boolean
  ) {
    try {
      // Converti clientId in numero
      const clientId = parseInt(clientIdStr, 10);
      
      if (isNaN(clientId)) {
        console.warn("ClientId non valido:", clientIdStr);
        return null;
      }
      
      // Log dettagliato
      console.log("Autenticazione via GET:", {
        username,
        clientId,
        isPwa,
        tokenLength: token.length
      });
      
      // Cerca l'utente basandosi sullo username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.warn(`Utente non trovato via GET: ${username}`);
        return null;
      }
      
      // Verifica che sia un utente di tipo client
      if (user.type !== "client") {
        console.warn(`Tipo utente non valido via GET: ${user.type}`);
        return null;
      }
      
      // Verifica che l'ID del cliente corrisponda
      if (user.clientId !== clientId) {
        console.warn(`ClientId non corrispondente: atteso ${user.clientId}, ricevuto ${clientId}`);
        return null;
      }
      
      // Ottieni il cliente associato all'utente
      const client = await storage.getClient(user.clientId);
      
      if (!client) {
        console.warn(`Cliente non trovato per l'utente via GET: ${username}`);
        return null;
      }
      
      // Verifica il token
      const isValid = await this.verifyToken(token, clientId);
      
      if (isValid) {
        console.log(`Token verificato correttamente via GET per: ${username}`);
        
        // Registra l'accesso
        try {
          await storage.logClientAccess(clientId, 'Simple-Login', isPwa ? 'PWA' : 'Browser');
          console.log(`Accesso registrato per clientId: ${clientId}`);
        } catch (accessError) {
          console.error("Errore nel registrare l'accesso:", accessError);
          // Non blocchiamo l'autenticazione per errori di log
        }
        
        return { ...user, client };
      } else {
        console.warn(`Token non valido via GET per: ${username}`);
        return null;
      }
    } catch (error) {
      console.error("Errore durante l'autenticazione via GET:", error);
      return null;
    }
  }
}

export const clientLoginService = new ClientLoginService();