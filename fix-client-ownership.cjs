/**
 * Script per correggere l'ownership dei clienti
 */

const { Pool } = require('pg');

async function fixClientOwnership() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  console.log('🔄 Correzione ownership clienti...');
  
  try {
    // Prima verifica la situazione attuale
    const result = await pool.query(`
      SELECT c.id, c.first_name, c.last_name, c.owner_id, u.username as owner_username
      FROM clients c
      LEFT JOIN users u ON c.owner_id = u.id
      ORDER BY c.id
    `);
    
    console.log('📊 Situazione attuale ownership:');
    result.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.first_name} ${row.last_name} -> Owner: ${row.owner_id} (${row.owner_username || 'NULL'})`);
    });
    
    // Conta clienti per owner
    const ownerCount = await pool.query(`
      SELECT owner_id, COUNT(*) as count
      FROM clients 
      WHERE owner_id IS NOT NULL
      GROUP BY owner_id
      ORDER BY owner_id
    `);
    
    console.log('\n📈 Clienti per owner:');
    ownerCount.rows.forEach(row => {
      console.log(`  Owner ${row.owner_id}: ${row.count} clienti`);
    });
    
    // Verifica quanti clienti senza owner
    const noOwner = await pool.query('SELECT COUNT(*) as count FROM clients WHERE owner_id IS NULL');
    console.log(`\n🔍 Clienti senza owner: ${noOwner.rows[0].count}`);
    
    // Per ora solo reportiamo, non modifichiamo
    console.log('\n✅ Analisi completata. Nessuna modifica effettuata.');
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await pool.end();
  }
}

fixClientOwnership();