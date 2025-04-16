import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '@shared/schema';

// Controlla che DATABASE_URL sia definito
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

// Crea il client postgres con configurazione sicura
const client = postgres(process.env.DATABASE_URL, {
  max: 10, // massimo numero di connessioni
  ssl: 'prefer', // abilitare SSL per la sicurezza
  prepare: false, // disabilitare la preparazione automatica delle dichiarazioni
  onnotice: () => {}, // gestione degli avvisi
  debug: process.env.NODE_ENV === 'development', // debug solo in sviluppo
});

export const db = drizzle(client, { schema });

// Implementazioni addizionali per il sistema di notifiche
export const notificationSettingsRepository = {
  async get() {
    try {
      const settings = await db.select().from(schema.notificationSettings).limit(1);
      return settings.length > 0 ? settings[0] : null;
    } catch (error) {
      console.error('Errore durante il recupero delle impostazioni di notifica:', error);
      return null;
    }
  },

  async save(data: schema.InsertNotificationSettings) {
    try {
      // Prima verifichiamo se esiste già una configurazione
      const existing = await this.get();
      
      if (existing) {
        // Se esiste, aggiorniamo
        return await this.update(existing.id, data);
      } else {
        // Altrimenti creiamo una nuova configurazione
        const [result] = await db.insert(schema.notificationSettings).values(data).returning();
        return result;
      }
    } catch (error) {
      console.error('Errore durante il salvataggio delle impostazioni di notifica:', error);
      throw error;
    }
  },

  async update(id: number, data: Partial<schema.InsertNotificationSettings>) {
    try {
      const [result] = await db
        .update(schema.notificationSettings)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(schema.notificationSettings.id, id))
        .returning();
      
      return result;
    } catch (error) {
      console.error(`Errore durante l'aggiornamento delle impostazioni di notifica ${id}:`, error);
      throw error;
    }
  }
};