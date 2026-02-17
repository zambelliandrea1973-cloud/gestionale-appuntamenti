#!/usr/bin/env tsx

/**
 * Script eseguibile per lanciare la migrazione dei codici clienti
 * 
 * Uso: npx tsx server/scripts/run-migration.ts
 */

import { migrateClientCodes } from './migrate-client-codes';

async function main() {
  try {
    console.log('\n🎯 Avvio migrazione codici clienti...\n');
    
    const stats = await migrateClientCodes();
    
    console.log('\n✅ Migrazione completata con successo!\n');
    console.log('Statistiche finali:', JSON.stringify(stats, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migrazione fallita:', error);
    process.exit(1);
  }
}

main();
