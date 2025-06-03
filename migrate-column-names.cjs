/**
 * Migrazione definitiva per uniformare i nomi delle colonne del database
 * Converte da snake_case a camelCase per eliminare la necessità di mapping
 */

const { Pool } = require('pg');

async function migrateColumnNames() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  console.log('🔄 Migrazione definitiva nomi colonne database...');
  
  try {
    // Inizia una transazione per sicurezza
    await pool.query('BEGIN');
    
    console.log('📝 Step 1: Rinomina colonne da snake_case a camelCase');
    
    // Rinomina le colonne problematiche
    const columnMappings = [
      { old: 'first_name', new: 'firstName' },
      { old: 'last_name', new: 'lastName' },
      { old: 'is_frequent', new: 'isFrequent' },
      { old: 'has_consent', new: 'hasConsent' },
      { old: 'medical_notes', new: 'medicalNotes' },
      { old: 'created_at', new: 'createdAt' },
      { old: 'owner_id', new: 'ownerId' },
      { old: 'assignment_code', new: 'assignmentCode' },
      { old: 'unique_code', new: 'uniqueCode' }
    ];
    
    for (const mapping of columnMappings) {
      try {
        console.log(`  Rinomina ${mapping.old} -> ${mapping.new}`);
        await pool.query(`
          ALTER TABLE clients 
          RENAME COLUMN "${mapping.old}" TO "${mapping.new}"
        `);
      } catch (error) {
        // Ignora errori se la colonna non esiste o è già rinominata
        if (error.code === '42703') {
          console.log(`    ⚠️ Colonna ${mapping.old} non trovata (già rinominata?)`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('📝 Step 2: Verifica struttura finale');
    const finalStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Struttura finale tabella clients:');
    finalStructure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Verifica che non ci siano più colonne snake_case
    const snakeCaseColumns = finalStructure.rows.filter(row => 
      row.column_name.includes('_') && !row.column_name.startsWith('pg_')
    );
    
    if (snakeCaseColumns.length === 0) {
      console.log('✅ Tutte le colonne sono ora in camelCase');
      await pool.query('COMMIT');
      console.log('✅ Migrazione completata con successo');
    } else {
      console.log('⚠️ Alcune colonne snake_case rimangono:', snakeCaseColumns.map(c => c.column_name));
      await pool.query('COMMIT');
    }
    
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    await pool.query('ROLLBACK');
    console.log('🔄 Rollback eseguito');
  } finally {
    await pool.end();
  }
}

migrateColumnNames();