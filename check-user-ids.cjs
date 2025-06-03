/**
 * Script per verificare gli ID utente corretti
 */

const { Pool } = require('pg');

async function checkUserIds() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  console.log('🔍 Verifica ID utenti...');
  
  try {
    const result = await pool.query(`
      SELECT id, username, email, type, role
      FROM users 
      ORDER BY id
    `);
    
    console.log('👥 Utenti nel sistema:');
    result.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.username} (${row.email}) - Tipo: ${row.type}, Ruolo: ${row.role}`);
    });
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await pool.end();
  }
}

checkUserIds();