/**
 * Script per aggiungere il campo assignment_code alla tabella clients
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addAssignmentCodeField() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Aggiunta campo assignment_code alla tabella clients...');
    
    // Verifica se il campo esiste già
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'assignment_code'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Il campo assignment_code esiste già nella tabella clients');
    } else {
      // Aggiungi il campo
      await client.query(`
        ALTER TABLE clients 
        ADD COLUMN assignment_code TEXT
      `);
      console.log('✅ Campo assignment_code aggiunto con successo alla tabella clients');
    }
    
  } catch (error) {
    console.error('❌ Errore durante l\'aggiunta del campo:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Esegui lo script
addAssignmentCodeField();