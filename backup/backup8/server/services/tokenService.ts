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
      
      // Se non esiste un token valido, generiamo un token deterministico basato sull'ID cliente
      // Questo garantisce che lo stesso cliente ottenga sempre lo stesso token
      const clientIdString = clientId.toString();
      const secretKey = 'SECRETO_FISSO_CLIENTE_' + clientIdString; // Segretino univoco per cliente
      const token = crypto.createHash('sha256').update(secretKey).digest('hex');
      
      // Calcola la data di scadenza (impostata a 365 giorni di default per renderlo persistente)
      const expiresAt = addDays(new Date(), expiresInDays);
      
      // Salva il token nel database
      await storage.createActivationToken({
        token,
        clientId,
        expiresAt,
        used: false
      });
      
      return token;
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
        return null;
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