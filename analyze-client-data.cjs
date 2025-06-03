/**
 * Analisi dei dati dei clienti per identificare problemi
 */

const { Pool } = require('pg');

async function analyzeClientData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  console.log('🔍 Analisi dei dati dei clienti...');
  
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        first_name, 
        last_name, 
        unique_code,
        owner_id,
        is_frequent,
        has_consent,
        email,
        phone
      FROM clients 
      ORDER BY id
    `);
    
    console.log(`📊 Analisi di ${result.rows.length} clienti:`);
    
    let problematicClients = [];
    
    result.rows.forEach(client => {
      let issues = [];
      
      if (!client.first_name || client.first_name.trim() === '') {
        issues.push('firstName mancante/vuoto');
      }
      
      if (!client.last_name || client.last_name.trim() === '') {
        issues.push('lastName mancante/vuoto');
      }
      
      if (!client.unique_code) {
        issues.push('uniqueCode mancante');
      }
      
      if (client.is_frequent === null || client.is_frequent === undefined) {
        issues.push('isFrequent null/undefined');
      }
      
      if (client.has_consent === null || client.has_consent === undefined) {
        issues.push('hasConsent null/undefined');
      }
      
      if (issues.length > 0) {
        problematicClients.push({
          id: client.id,
          name: `${client.first_name || 'NULL'} ${client.last_name || 'NULL'}`,
          owner: client.owner_id,
          issues: issues
        });
      }
    });
    
    if (problematicClients.length > 0) {
      console.log(`\n❌ Trovati ${problematicClients.length} clienti con problemi:`);
      problematicClients.forEach(client => {
        console.log(`  ${client.id}: ${client.name} (Owner: ${client.owner}) - Problemi: ${client.issues.join(', ')}`);
      });
    } else {
      console.log('\n✅ Tutti i clienti hanno dati corretti');
    }
    
    // Verifica distribuzione per owner
    const ownerStats = await pool.query(`
      SELECT owner_id, COUNT(*) as count
      FROM clients 
      GROUP BY owner_id
      ORDER BY owner_id
    `);
    
    console.log('\n📈 Distribuzione per owner:');
    ownerStats.rows.forEach(row => {
      console.log(`  Owner ${row.owner_id}: ${row.count} clienti`);
    });
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await pool.end();
  }
}

analyzeClientData();