import { storage } from "../storage";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Convertire scrypt a Promise
const scryptAsync = promisify(scrypt);

// Funzione per hash delle password
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Servizio per la gestione dei token di attivazione per gli account client
 */
export const tokenService = {
  /**
   * Genera un token univoco per l'attivazione dell'account
   * @returns Un token casuale di 32 caratteri
   */
  generateToken(): string {
    return randomBytes(16).toString('hex');
  },

  /**
   * Crea un token di attivazione per un client specifico
   * @param clientId L'ID del cliente
   * @returns Il token generato
   */
  async createActivationToken(clientId: number): Promise<string> {
    try {
      const token = this.generateToken();
      
      // Salva il token nel database con un TTL (Time To Live) di 7 giorni
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      await storage.createActivationToken({
        token,
        clientId, 
        expiresAt,
        used: false
      });
      
      return token;
    } catch (error) {
      console.error("Errore nella creazione del token di attivazione:", error);
      throw error;
    }
  },

  /**
   * Verifica la validità di un token di attivazione
   * @param token Il token da verificare
   * @returns L'ID del cliente associato al token o null se il token non è valido
   */
  async verifyActivationToken(token: string): Promise<number | null> {
    try {
      const tokenRecord = await storage.getActivationToken(token);
      
      if (!tokenRecord) {
        return null;
      }
      
      // Verifica che il token non sia scaduto
      const currentDate = new Date();
      if (tokenRecord.expiresAt < currentDate || tokenRecord.used) {
        return null;
      }
      
      return tokenRecord.clientId;
    } catch (error) {
      console.error("Errore nella verifica del token di attivazione:", error);
      return null;
    }
  },

  /**
   * Attiva un account cliente dopo la verifica del token
   * @param token Il token di attivazione
   * @param username Il nome utente scelto
   * @param password La password scelta
   * @returns true se l'attivazione è riuscita, false altrimenti
   */
  async activateAccount(token: string, username: string, password: string): Promise<boolean> {
    try {
      const clientId = await this.verifyActivationToken(token);
      
      if (clientId === null) {
        return false;
      }
      
      // Verifica che non esista già un utente con lo stesso username
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return false;
      }
      
      // Crea un nuovo utente collegato al cliente
      const hashedPassword = await hashPassword(password);
      await storage.createUser({
        username,
        password: hashedPassword,
        email: '',  // Aggiungiamo un'email vuota perché è un campo richiesto
        type: 'client',
        clientId
      });
      
      // Imposta il token come utilizzato
      await storage.updateActivationToken(token, { used: true });
      
      return true;
    } catch (error) {
      console.error("Errore nell'attivazione dell'account:", error);
      return false;
    }
  }
};