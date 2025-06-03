/**
 * Test diretto per verificare il comportamento dell'admin
 */

const { Pool } = require('pg');

async function testAdminClients() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  console.log('🧪 Test accesso admin ai clienti...');
  
  try {
    // Simula la query che fa l'admin (senza filtro ownerId)
    const allClients = await pool.query(`
      SELECT id, first_name, last_name, owner_id, unique_code
      FROM clients 
      ORDER BY last_name
    `);
    
    console.log(`📊 Query admin (senza filtro): ${allClients.rows.length} clienti totali`);
    
    // Simula la query che fa lo staff 16 (con filtro ownerId = 16)
    const staff16Clients = await pool.query(`
      SELECT id, first_name, last_name, owner_id, unique_code
      FROM clients 
      WHERE owner_id = $1
      ORDER BY last_name
    `, [16]);
    
    console.log(`📊 Query staff 16 (con filtro): ${staff16Clients.rows.length} clienti`);
    
    // Mostra alcuni esempi
    console.log('\n🔍 Primi 5 clienti dalla query admin:');
    allClients.rows.slice(0, 5).forEach(client => {
      console.log(`  ${client.id}: ${client.first_name} ${client.last_name} (Owner: ${client.owner_id})`);
    });
    
    console.log('\n🔍 Primi 5 clienti dalla query staff 16:');
    staff16Clients.rows.slice(0, 5).forEach(client => {
      console.log(`  ${client.id}: ${client.first_name} ${client.last_name} (Owner: ${client.owner_id})`);
    });
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await pool.end();
  }
}

testAdminClients();