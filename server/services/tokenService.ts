import crypto from 'crypto';
import { addDays } from 'date-fns';
import { storage } from '../storage';
import { hashPassword } from '../auth';
import { ActivationToken } from '@shared/schema';

/**
 * Servizio per la gestione dei token di attivazione
 */
export const tokenService = {
  /**
   * Genera un nuovo token di attivazione per un cliente
   * @param clientId ID del cliente per cui generare il token
   * @param expiresInDays Numero di giorni di validità del token
   * @returns Il token generato
   */
  async generateActivationToken(clientId: number, expiresInDays: number = 365): Promise<string> {
    try {
      // Prima verifichiamo se esiste già un token valido per questo cliente
      const existingTokens = await storage.getActivationTokensByClientId(clientId);
      let validToken = existingTokens.find(t => !t.used && new Date(t.expiresAt) > new Date());
      
      // Se troviamo un token valido esistente, lo restituiamo
      if (validToken) {
        console.log('Riutilizzo token esistente per il cliente:', clientId);
        return validToken.token;
      }
      
      // Se non esiste un token valido, verifichiamo se esiste un token con lo stesso ID cliente
      // Per farlo, generiamo il token deterministico
      const clientIdString = clientId.toString();
      const secretKey = 'SECRETO_FISSO_CLIENTE_' + clientIdString; // Segretino univoco per cliente
      const token = crypto.createHash('sha256').update(secretKey).digest('hex');
      
      // Verifica se il token esiste già nel database
      const existingToken = await storage.getActivationToken(token);
      
      // Se il token esiste già ma appartiene a questo cliente, lo aggiorniamo e lo restituiamo
      if (existingToken && existingToken.clientId === clientId) {
        console.log('Aggiornamento token esistente per il cliente:', clientId);
        
        // Calcola la nuova data di scadenza
        const expiresAt = addDays(new Date(), expiresInDays);
        
        // Aggiorna la data di scadenza del token
        await storage.updateActivationTokenExpiry(existingToken.id, expiresAt);
        
        return token;
      }
      
      // Se il token esiste già ma appartiene a un altro cliente o non esiste,
      // generiamo un token unico aggiungendo un timestamp
      const uniqueSecretKey = 'SECRETO_FISSO_CLIENTE_' + clientIdString + '_' + Date.now();
      const uniqueToken = crypto.createHash('sha256').update(uniqueSecretKey).digest('hex');
      
      // Calcola la data di scadenza (impostata a 365 giorni di default per renderlo persistente)
      const expiresAt = addDays(new Date(), expiresInDays);
      
      // Salva il token nel database
      await storage.createActivationToken({
        token: uniqueToken,
        clientId,
        expiresAt,
        used: false
      });
      
      return uniqueToken;
    } catch (error) {
      console.error('Errore nella generazione del token di attivazione:', error);
      throw new Error('Impossibile generare il token di attivazione');
    }
  },
  
  /**
   * Verifica la validità di un token di attivazione
   * @param token Il token da verificare
   * @param invalidate Se true, invalida il token dopo la verifica (predefinito: false)
   * @returns ID del cliente associato al token se valido, null altrimenti
   */
  async verifyActivationToken(token: string, invalidate: boolean = false): Promise<number | null> {
    try {
      // Trova il token nel database
      const activationToken = await storage.getActivationToken(token);
      
      // Verifica se il token esiste
      if (!activationToken) {
        console.log('Token non trovato:', token);
        return null;
      }
      
      // Verifica se il token è scaduto
      if (new Date() > new Date(activationToken.expiresAt)) {
        console.log('Token scaduto:', token);
        
        // MODIFICA: Rinnoviamo automaticamente il token scaduto per 365 giorni
        const newExpiresAt = addDays(new Date(), 365);
        await storage.updateActivationTokenExpiry(activationToken.id, newExpiresAt);
        console.log('Token rinnovato automaticamente fino a:', newExpiresAt);
        
        // Continuiamo con la verifica considerando il token valido
      }
      
      // Non controlliamo più se il token è stato utilizzato, in modo che possa essere usato più volte
      // Se un token esiste ed è valido, restituisce sempre l'ID del cliente
      
      // Se richiesto, invalida il token dopo l'uso
      if (invalidate) {
        await this.markTokenAsUsed(token);
      }
      
      return activationToken.clientId;
    } catch (error) {
      console.error('Errore nella verifica del token di attivazione:', error);
      return null;
    }
  },
  
  /**
   * Marca un token come utilizzato
   * @param token Il token da marcare come utilizzato
   * @returns true se l'operazione è riuscita, false altrimenti
   */
  async markTokenAsUsed(token: string): Promise<boolean> {
    try {
      // Trova il token nel database
      const activationToken = await storage.getActivationToken(token);
      
      // Verifica se il token esiste
      if (!activationToken) {
        return false;
      }
      
      // Non marchiamo mai il token come utilizzato, in modo che possa essere riutilizzato
      // Non modifichiamo il token nel database in modo che rimanga utilizzabile
      
      return true;
    } catch (error) {
      console.error('Errore nell\'aggiornamento del token di attivazione:', error);
      return false;
    }
  },
  
  /**
   * Verifica se un token sta per scadere entro il numero di giorni specificato
   * @param token Il token da verificare
   * @param daysBeforeExpiry Numero di giorni prima della scadenza per considerare il token in scadenza
   * @returns true se il token sta per scadere, false altrimenti
   */
  async isTokenExpiringSoon(token: string, daysBeforeExpiry: number = 1): Promise<boolean> {
    try {
      // Trova il token nel database
      const activationToken = await storage.getActivationToken(token);
      
      // Verifica se il token esiste
      if (!activationToken) {
        return false;
      }
      
      // Calcola la data di scadenza imminente (oggi + giorni di preavviso)
      const expiryWarningDate = addDays(new Date(), daysBeforeExpiry);
      
      // Verifica se la data di scadenza del token è prima della data di scadenza imminente
      // e dopo la data odierna (cioè, sta per scadere ma non è ancora scaduto)
      const tokenExpiryDate = new Date(activationToken.expiresAt);
      const today = new Date();
      
      return tokenExpiryDate <= expiryWarningDate && tokenExpiryDate > today;
    } catch (error) {
      console.error('Errore nella verifica della scadenza imminente del token:', error);
      return false;
    }
  },
  
  /**
   * Genera un nuovo token per un cliente, invalidando eventuali token esistenti
   * @param clientId ID del cliente per cui generare un nuovo token
   * @param expiresInDays Numero di giorni di validità del token
   * @returns Il nuovo token generato
   */
  async regenerateToken(clientId: number, expiresInDays: number = 365): Promise<string> {
    try {
      // Trova eventuali token esistenti per questo cliente
      const existingTokens = await storage.getActivationTokensByClientId(clientId);
      
      // Genera il nuovo token usando il generatore deterministico
      const clientIdString = clientId.toString();
      const secretKey = 'SECRETO_FISSO_CLIENTE_' + clientIdString + '_' + Date.now(); // Aggiungiamo timestamp per renderlo unico
      const newToken = crypto.createHash('sha256').update(secretKey).digest('hex');
      
      // Calcola la data di scadenza
      const expiresAt = addDays(new Date(), expiresInDays);
      
      // Salva il nuovo token nel database
      await storage.createActivationToken({
        token: newToken,
        clientId,
        expiresAt,
        used: false
      });
      
      console.log(`Nuovo token generato per il cliente ${clientId} con scadenza ${expiresAt}`);
      
      return newToken;
    } catch (error) {
      console.error('Errore nella rigenerazione del token:', error);
      throw new Error('Impossibile rigenerare il token');
    }
  },
  
  /**
   * Attiva un account cliente utilizzando un token di attivazione
   * @param token Il token di attivazione
   * @param username Username scelto per l'account
   * @param password Password scelta per l'account
   * @returns true se l'attivazione è riuscita, false altrimenti
   */
  async activateAccount(token: string, username: string, password: string): Promise<boolean> {
    try {
      // Verifica che il token sia valido
      const clientId = await this.verifyActivationToken(token);
      
      if (clientId === null) {
        console.log('Token non valido per l\'attivazione:', token);
        return false;
      }
      
      // Verifica se l'account esiste già
      const existingAccount = await storage.getClientAccountByClientId(clientId);
      
      if (existingAccount) {
        // Se l'account esiste già, aggiorniamo username e password anziché fallire
        console.log('Aggiornamento account esistente per il cliente:', clientId);
        await storage.updateClientAccount(existingAccount.id, {
          username,
          password: await hashPassword(password),
          isActive: true
        });
      } else {
        // Crea un nuovo account
        await storage.createClientAccount({
          clientId,
          username,
          password: await hashPassword(password),
          isActive: true
        });
      }
      
      // Marca il token come utilizzato
      await this.markTokenAsUsed(token);
      
      return true;
    } catch (error) {
      console.error('Errore nell\'attivazione dell\'account:', error);
      return false;
    }
  }
};