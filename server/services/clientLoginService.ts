/**
 * Client Login Service - Servizio avanzato per la gestione del login dei clienti
 * Supporta diverse modalità di accesso, inclusi direct-link e token-based authentication
 * Pensato per essere compatibile con PWA e mobile apps
 */
import { storage } from "../storage";
import { tokenService } from "./tokenService";
import { clientAccessService } from "./clientAccessService";
import { comparePasswords } from "../auth";

export const clientLoginService = {
  /**
   * Tenta l'autenticazione di un cliente tramite parametri di query (senza POST)
   * 
   * @param username Username del cliente
   * @param clientId ID del cliente
   * @param token Token di autenticazione
   * @param isPwa Flag che indica se la richiesta proviene da PWA installata
   * @returns L'utente autenticato o null se autenticazione fallita
   */
  async authenticateViaGet(username: string, clientId: string, token: string, isPwa: boolean): Promise<any> {
    try {
      // Valida i parametri minimi richiesti
      if (!username || !clientId || !token) {
        console.log(`Autenticazione GET fallita, parametri mancanti: ${JSON.stringify({ username, clientId, token })}`);
        return null;
      }
      
      // Converte clientId in numero
      const clientIdNum = parseInt(clientId, 10);
      if (isNaN(clientIdNum)) {
        console.log(`ID cliente non valido: ${clientId}`);
        return null;
      }
      
      // Recupera account cliente
      const account = await storage.getClientAccountByUsername(username);
      if (!account) {
        console.log(`Account non trovato per username: ${username}`);
        return null;
      }
      
      // Verifica che l'account appartenga al cliente specificato
      if (account.clientId !== clientIdNum) {
        console.log(`Mancata corrispondenza ID cliente: account=${account.clientId}, richiesto=${clientIdNum}`);
        return null;
      }
      
      // Verifica il token
      const validClientId = await tokenService.verifyActivationToken(token);
      if (validClientId === null || validClientId !== clientIdNum) {
        console.log(`Token non valido o non corrisponde a cliente: token=${validClientId}, richiesto=${clientIdNum}`);
        return null;
      }
      
      // Recupera i dati completi del cliente
      const client = await storage.getClient(clientIdNum);
      if (!client) {
        console.log(`Cliente non trovato con ID: ${clientIdNum}`);
        return null;
      }
      
      // Registra l'accesso
      await clientAccessService.logAccess(clientIdNum);
      
      // Crea l'oggetto utente
      const user = {
        id: account.id,
        username: account.username,
        type: "client",
        clientId: client.id,
        client,
        token // Includi il token per consentire accessi futuri
      };
      
      console.log(`Login via GET completato con successo per ${username} (${clientIdNum}), PWA: ${isPwa}`);
      
      return user;
    } catch (error) {
      console.error("Errore durante l'autenticazione via GET:", error);
      return null;
    }
  },

  /**
   * Verifica credenziali del cliente e restituisce i dati utente
   * 
   * @param username Username del cliente
   * @param password Password del cliente (opzionale se token presente)
   * @param token Token di autenticazione (opzionale se password presente)
   * @param clientId ID del cliente (opzionale)
   * @param bypassAuth Flag per consentire autenticazione semplificata per PWA
   */
  async verifyCredentials(
    username: string, 
    password: string | undefined,
    token: string | undefined, 
    clientId: number | undefined, 
    bypassAuth: boolean = false
  ): Promise<any> {
    try {
      if (!username) {
        console.log("Autenticazione fallita: username mancante");
        return null;
      }
      
      // Recupera account
      const account = await storage.getClientAccountByUsername(username);
      if (!account) {
        console.log(`Account non trovato per username: ${username}`);
        return null;
      }
      
      // Flag che indica se l'autenticazione token è valida
      let tokenValid = false;
      
      // Se è stato fornito un token, verifica validità
      if (token && clientId) {
        const validClientId = await tokenService.verifyActivationToken(token);
        tokenValid = validClientId !== null && validClientId === clientId && account.clientId === clientId;
        
        if (tokenValid) {
          console.log(`Token valido per cliente: ${clientId}`);
        } else {
          console.log(`Token non valido: validClientId=${validClientId}, richiesto=${clientId}, accountClientId=${account.clientId}`);
        }
      }
      
      // Verifica password se token non valido e bypassAuth non attivo
      let passwordValid = false;
      
      if (!tokenValid && !bypassAuth && password) {
        passwordValid = await comparePasswords(password, account.password);
        console.log(`Verifica password: ${passwordValid ? 'valida' : 'non valida'}`);
      }
      
      // Se nessun metodo di autenticazione è valido
      if (!tokenValid && !passwordValid && !(bypassAuth && token)) {
        console.log("Nessun metodo di autenticazione valido");
        return null;
      }
      
      // Recupera client
      const client = await storage.getClient(account.clientId);
      if (!client) {
        console.log(`Cliente non trovato per ID: ${account.clientId}`);
        return null;
      }
      
      // Registra l'accesso
      await clientAccessService.logAccess(client.id);
      
      // Genera nuovo token se necessario
      const newToken = tokenValid ? token : await tokenService.createActivationToken(client.id);
      
      // Crea l'oggetto utente
      const user = {
        id: account.id,
        username: account.username,
        type: "client",
        clientId: client.id,
        client,
        token: newToken
      };
      
      console.log(`Autenticazione completata per ${username} (${client.id})`);
      
      return user;
    } catch (error) {
      console.error("Errore durante la verifica delle credenziali:", error);
      return null;
    }
  }
};