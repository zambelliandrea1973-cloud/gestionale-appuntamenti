/**
 * Script per correggere il mapping dei campi del database
 * Converte da snake_case a camelCase per uniformare con il frontend
 */

const { Pool } = require('pg');

async function fixDatabaseColumnMapping() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  console.log('🔧 Correzione mapping colonne database...');
  
  try {
    // Prima verifica la struttura attuale
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Struttura attuale tabella clients:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Verifica se ci sono colonne in snake_case da convertire
    const snakeCaseColumns = tableInfo.rows.filter(row => 
      row.column_name.includes('_') && 
      !['created_at', 'owner_id', 'assignment_code', 'unique_code', 'medical_notes'].includes(row.column_name)
    );
    
    if (snakeCaseColumns.length > 0) {
      console.log('\n🔍 Colonne da convertire:');
      snakeCaseColumns.forEach(col => {
        const camelCase = col.column_name.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
        console.log(`  ${col.column_name} -> ${camelCase}`);
      });
      
      // Per ora solo log, senza modifiche
      console.log('\n⚠️ Conversione colonne richiede migrazione. Implementare con Drizzle.');
    } else {
      console.log('\n✅ Tutte le colonne sono già nel formato corretto');
    }
    
    // Test di una query per vedere i dati reali
    const sampleData = await pool.query('SELECT * FROM clients LIMIT 2');
    console.log('\n🔍 Esempio dati dal database:');
    sampleData.rows.forEach((row, index) => {
      console.log(`Cliente ${index + 1}:`, Object.keys(row));
    });
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await pool.end();
  }
}

fixDatabaseColumnMapping();