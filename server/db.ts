import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
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