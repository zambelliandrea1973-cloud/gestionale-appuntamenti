import { db } from '../server/db';
import * as schema from '../shared/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Database sicuro con supporto per la migrazione
console.log('Inizio migrazione del database...');

try {
  // Prepara un client postgres separato per la migrazione (con SSL per sicurezza)
  const migrationClient = postgres(process.env.DATABASE_URL!, { 
    max: 1,
    ssl: 'prefer',
  });

  // Esegui la migrazione con drizzle-orm
  migrate(drizzle(migrationClient, { schema }), { migrationsFolder: './drizzle' })
    .then(() => {
      console.log('Migrazione completata con successo!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Errore durante la migrazione:', err);
      process.exit(1);
    });

} catch (err) {
  console.error('Errore durante la preparazione della migrazione:', err);
  process.exit(1);
}