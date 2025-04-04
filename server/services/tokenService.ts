import crypto from 'crypto';
import { addDays } from 'date-fns';
import { storage } from '../storage';
import { hashPassword } from '../auth';

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
  async generateActivationToken(clientId: number, expiresInDays: number = 7): Promise<string> {
    try {
      // Genera un token casuale
      const token = crypto.randomBytes(32).toString('hex');
      
      // Calcola la data di scadenza
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
   * @returns ID del cliente associato al token se valido, null altrimenti
   */
  async verifyActivationToken(token: string): Promise<number | null> {
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
      
      // Verifica se il token è già stato utilizzato
      if (activationToken.used) {
        console.log('Token già utilizzato:', token);
        return null;
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
      
      // Aggiorna il token
      await storage.updateActivationToken(token, { used: true });
      
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
      
      // Verifica che l'account non esista già
      const existingAccount = await storage.getClientAccountByClientId(clientId);
      if (existingAccount) {
        console.log('Account già esistente per il cliente:', clientId);
        return false;
      }
      
      // Utilizziamo la funzione di hash importata
      
      // Crea il nuovo account
      await storage.createClientAccount({
        clientId,
        username,
        password: await hashPassword(password),
        isActive: true
      });
      
      // Marca il token come utilizzato
      await this.markTokenAsUsed(token);
      
      return true;
    } catch (error) {
      console.error('Errore nell\'attivazione dell\'account:', error);
      return false;
    }
  }
};