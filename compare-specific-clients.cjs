/**
 * Confronta specificamente Bruna Pizzolato e Marco Berto per identificare differenze
 */

const { Pool } = require('pg');

async function compareSpecificClients() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  console.log('🔍 Confronto Bruna Pizzolato vs Marco Berto...');
  
  try {
    // Cerca Bruna Pizzolato
    const bruna = await pool.query(`
      SELECT * FROM clients 
      WHERE first_name ILIKE '%bruna%' AND last_name ILIKE '%pizzolato%'
    `);
    
    // Cerca Marco Berto
    const marco = await pool.query(`
      SELECT * FROM clients 
      WHERE first_name ILIKE '%marco%' AND last_name ILIKE '%berto%'
    `);
    
    if (bruna.rows.length === 0) {
      console.log('❌ Bruna Pizzolato non trovata');
    } else {
      console.log('📊 BRUNA PIZZOLATO:');
      const brunaData = bruna.rows[0];
      Object.keys(brunaData).forEach(key => {
        console.log(`  ${key}: ${brunaData[key]}`);
      });
    }
    
    if (marco.rows.length === 0) {
      console.log('❌ Marco Berto non trovato');
    } else {
      console.log('\n📊 MARCO BERTO:');
      const marcoData = marco.rows[0];
      Object.keys(marcoData).forEach(key => {
        console.log(`  ${key}: ${marcoData[key]}`);
      });
    }
    
    // Confronta i campi se entrambi esistono
    if (bruna.rows.length > 0 && marco.rows.length > 0) {
      console.log('\n🔍 DIFFERENZE:');
      const brunaData = bruna.rows[0];
      const marcoData = marco.rows[0];
      
      Object.keys(brunaData).forEach(key => {
        if (brunaData[key] !== marcoData[key]) {
          console.log(`  ${key}: Bruna="${brunaData[key]}" vs Marco="${marcoData[key]}"`);
        }
      });
      
      // Verifica campi critici per il rendering
      const criticalFields = ['first_name', 'last_name', 'is_frequent', 'has_consent', 'unique_code'];
      console.log('\n🎯 CAMPI CRITICI:');
      criticalFields.forEach(field => {
        const brunaValue = brunaData[field];
        const marcoValue = marcoData[field];
        const brunaOk = brunaValue !== null && brunaValue !== undefined && brunaValue !== '';
        const marcoOk = marcoValue !== null && marcoValue !== undefined && marcoValue !== '';
        
        console.log(`  ${field}: Bruna=${brunaValue} (OK:${brunaOk}) vs Marco=${marcoValue} (OK:${marcoOk})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await pool.end();
  }
}

compareSpecificClients();