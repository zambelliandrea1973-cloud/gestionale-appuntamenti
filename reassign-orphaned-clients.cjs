/**
 * Script per riassegnare i clienti orfani all'admin
 */

const { Pool } = require('pg');

async function reassignOrphanedClients() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  console.log('🔄 Riassegnazione clienti orfani...');
  
  try {
    // Admin è ID 3
    const adminId = 3;
    
    // Trova tutti i clienti con owner_id che non esistono più
    const orphanedClients = await pool.query(`
      SELECT c.id, c.first_name, c.last_name, c.owner_id
      FROM clients c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.owner_id IS NOT NULL AND u.id IS NULL
    `);
    
    console.log(`📊 Trovati ${orphanedClients.rows.length} clienti orfani:`);
    orphanedClients.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.first_name} ${row.last_name} (owner inesistente: ${row.owner_id})`);
    });
    
    if (orphanedClients.rows.length > 0) {
      // Riassegna tutti i clienti orfani all'admin
      const reassignResult = await pool.query(`
        UPDATE clients 
        SET owner_id = $1
        WHERE owner_id NOT IN (SELECT id FROM users)
      `, [adminId]);
      
      console.log(`✅ ${reassignResult.rowCount} clienti riassegnati all'admin (ID: ${adminId})`);
      
      // Verifica il risultato
      const verification = await pool.query(`
        SELECT owner_id, COUNT(*) as count
        FROM clients 
        GROUP BY owner_id
        ORDER BY owner_id
      `);
      
      console.log('\n📈 Nuova distribuzione clienti:');
      verification.rows.forEach(row => {
        console.log(`  Owner ${row.owner_id}: ${row.count} clienti`);
      });
    } else {
      console.log('✅ Nessun cliente orfano trovato');
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await pool.end();
  }
}

reassignOrphanedClients();