#!/usr/bin/env tsx

/**
 * Executable script to launch the client code migration
 * 
 * Uso: npx tsx server/scripts/run-migration.ts
 */

import { migrateClientCodes } from './migrate-client-codes';

async function main() {
  try {
    console.log('\n🎯 Starting client code migration...\n');
    
    const stats = await migrateClientCodes();
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log('Statistiche finali:', JSON.stringify(stats, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
