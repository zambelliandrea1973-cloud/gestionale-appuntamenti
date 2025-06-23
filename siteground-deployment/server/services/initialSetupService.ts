import { storage } from "../storage";
import { hashPassword } from "../auth";
import { db } from "../db";
import { users } from "@shared/schema";
import { count, eq } from "drizzle-orm";
import { addDays } from "date-fns";

/**
 * Servizio per l'inizializzazione dell'applicazione
 * Si occupa di creare un account amministratore predefinito se non esiste già.
 */
export class InitialSetupService {
  /**
   * Verifica se esistono utenti nel sistema
   */
  async hasAnyUsers(): Promise<boolean> {
    const [result] = await db.select({ count: count() }).from(users);
    return result.count > 0;
  }

  /**
   * Verifica se esiste un amministratore predefinito
   */
  async hasDefaultAdmin(): Promise<boolean> {
    const user = await storage.getUserByUsername('admin@gestoreprofessionisti.it');
    return !!user;
  }

  /**
   * Crea l'account amministratore predefinito
   */
  async createDefaultAdmin(email: string, password: string): Promise<void> {
    console.log('Creazione account amministratore iniziale...');
    
    try {
      // Se l'account esiste già, non faccio nulla
      const existingUser = await storage.getUserByUsername(email);
      if (existingUser) {
        console.log(`L'account amministratore ${email} esiste già`);
        return;
      }
      
      // Creo l'account amministratore
      const hashedPassword = await hashPassword(password);
      
      // Data di scadenza prova gratuita (40 giorni)
      // Data di scadenza prova gratuita (40 giorni) - da implementare in licenseService
      
      const admin = await storage.createUser({
        username: email,
        email: email,
        password: hashedPassword,
        role: 'admin',
        type: 'staff'
      });
      
      console.log(`Account amministratore creato con successo: ${email}`);
    } catch (error) {
      console.error('Errore durante la creazione dell\'account amministratore:', error);
      throw error;
    }
  }

  /**
   * Esegue l'inizializzazione dell'applicazione
   */
  async initialize(): Promise<void> {
    try {
      // Verifico se ci sono utenti nel sistema
      const hasUsers = await this.hasAnyUsers();
      
      // Se non ci sono utenti, creo l'account amministratore predefinito
      if (!hasUsers) {
        console.log('Nessun utente trovato nel sistema. Creazione account amministratore predefinito...');
        await this.createDefaultAdmin('zambelli.andrea.1973@gmail.com', 'gironiCO73%');
      } else {
        console.log('Utenti già presenti nel sistema. Nessun account predefinito creato.');
      }
    } catch (error) {
      console.error('Errore durante l\'inizializzazione:', error);
    }
  }
}

// Esporto un'istanza del servizio
export default new InitialSetupService();