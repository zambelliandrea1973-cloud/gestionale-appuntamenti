import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../shared/schema';

/**
 * Script per eseguire il push dello schema al database
 * Questo è più semplice e diretto rispetto alle migrazioni
 */
async function pushSchema() {
  console.log('Inizio push dello schema al database...');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL non definito. Impossibile continuare.');
    process.exit(1);
  }

  try {
    // Per sicurezza, utilizza SSL
    const migrationClient = postgres(process.env.DATABASE_URL, { 
      max: 1,
      ssl: 'prefer',
    });

    const db = drizzle(migrationClient, { schema });

    // Push diretto dello schema
    console.log('Creazione/aggiornamento delle tabelle...');
    
    // Utilizziamo direttamente la funzione push di drizzle-kit
    console.log('Utilizzo della CLI drizzle-kit per eseguire il push...');
    
    // Eseguiamo push con execSync (comando aggiornato)
    const { execSync } = require('child_process');
    execSync('npx drizzle-kit push', { stdio: 'inherit' });
    
    console.log('Push dello schema completato con successo!');
    process.exit(0);
  } catch (error) {
    console.error('Errore durante il push dello schema:', error);
    process.exit(1);
  }
}

// Esegui il push dello schema
pushSchema();