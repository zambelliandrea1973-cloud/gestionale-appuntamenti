/**
 * Script per sincronizzare tutti i 26 clienti con la stessa logica di archiviazione
 */

const { Pool } = require('pg');

async function syncAllClients() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  console.log('🔄 Inizio sincronizzazione di tutti i 26 clienti...');
  
  try {
    // Ottieni tutti i clienti
    const result = await pool.query('SELECT * FROM clients ORDER BY id');
    const clients = result.rows;
    
    console.log(`📊 Trovati ${clients.length} clienti nel database`);
    
    // Normalizza tutti i clienti per avere la stessa struttura
    for (const client of clients) {
      const updates = {};
      let needsUpdate = false;
      
      // Assicura che isFrequent sia definito
      if (client.isFrequent === null || client.isFrequent === undefined) {
        updates.isFrequent = false;
        needsUpdate = true;
      }
      
      // Assicura che hasConsent sia definito
      if (client.hasConsent === null || client.hasConsent === undefined) {
        updates.hasConsent = false;
        needsUpdate = true;
      }
      
      // Assicura che email sia una stringa vuota invece di null
      if (client.email === null || client.email === undefined) {
        updates.email = '';
        needsUpdate = true;
      }
      
      // Assicura che uniqueCode sia presente
      if (!client.uniqueCode) {
        const firstName = (client.firstName || 'CLI').substring(0,3).toUpperCase();
        const lastName = (client.lastName || 'ENT').substring(0,3).toUpperCase();
        const code = `${firstName}${lastName}${client.id.toString().padStart(4, '0')}`;
        updates.uniqueCode = code;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        const setClause = Object.keys(updates).map(key => `${key} = $${Object.keys(updates).indexOf(key) + 2}`).join(', ');
        const values = [client.id, ...Object.values(updates)];
        
        await pool.query(`UPDATE clients SET ${setClause} WHERE id = $1`, values);
        console.log(`✅ Aggiornato cliente ${client.firstName} ${client.lastName} (ID: ${client.id})`);
      } else {
        console.log(`✓ Cliente ${client.firstName} ${client.lastName} (ID: ${client.id}) già sincronizzato`);
      }
    }
    
    // Verifica finale
    const finalResult = await pool.query('SELECT id, firstName, lastName, uniqueCode, isFrequent, hasConsent FROM clients ORDER BY id');
    console.log('\n📋 Verifica finale - tutti i clienti:');
    finalResult.rows.forEach(client => {
      console.log(`  ${client.id}: ${client.firstName} ${client.lastName} (${client.uniqueCode}) - Frequent: ${client.isFrequent}, Consent: ${client.hasConsent}`);
    });
    
    console.log(`\n🎉 Sincronizzazione completata! Tutti i ${finalResult.rows.length} clienti sono ora uniformi.`);
    
  } catch (error) {
    console.error('❌ Errore durante la sincronizzazione:', error);
  } finally {
    await pool.end();
  }
}

syncAllClients();