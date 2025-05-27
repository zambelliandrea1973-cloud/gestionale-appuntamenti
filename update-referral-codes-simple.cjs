/**
 * Script per aggiornare i codici referral con versioni più semplici e memorabili
 */

const { Pool } = require('pg');

// Configurazione database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Genera un codice referral semplice e memorabile
 * @param {string} username - Nome utente
 * @param {number} id - ID utente
 * @returns {string} Codice referral semplice
 */
function generateSimpleReferralCode(username, id) {
  // Prende le prime 3-4 lettere significative del nome + numero sequenziale semplice
  let namePart = '';
  
  if (username.includes('busnari')) {
    namePart = 'BUS';
  } else if (username.includes('faverio') || username.includes('elisa')) {
    namePart = 'ELI';
  } else if (username.includes('zambelli')) {
    namePart = 'ZAM';
  } else if (username.includes('1prof')) {
    namePart = 'PR1';
  } else if (username.includes('2prof')) {
    namePart = 'PR2';
  } else if (username.includes('3prof')) {
    namePart = 'PR3';
  } else {
    // Fallback: prime 3 lettere maiuscole
    namePart = username.substring(0, 3).toUpperCase();
  }
  
  // Numero semplice basato sull'ID
  const numberPart = (id % 100).toString().padStart(2, '0');
  
  return `${namePart}${numberPart}`;
}

async function updateReferralCodes() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Inizio aggiornamento codici referral semplici...');
    
    // Trova tutti gli staff con codici esistenti
    const result = await client.query(`
      SELECT id, username, email, type, referral_code 
      FROM users 
      WHERE type = 'staff' AND referral_code IS NOT NULL
    `);
    
    console.log(`📋 Trovati ${result.rows.length} account staff da aggiornare`);
    
    for (const user of result.rows) {
      let newCode;
      let isUnique = false;
      let attempts = 0;
      
      // Genera codice semplice e unico
      while (!isUnique && attempts < 10) {
        newCode = generateSimpleReferralCode(user.username, user.id + attempts);
        
        // Verifica unicità
        const checkResult = await client.query(
          'SELECT id FROM users WHERE referral_code = $1 AND id != $2',
          [newCode, user.id]
        );
        
        if (checkResult.rows.length === 0) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (isUnique) {
        // Aggiorna il codice
        await client.query(
          'UPDATE users SET referral_code = $1 WHERE id = $2',
          [newCode, user.id]
        );
        
        console.log(`✅ ${user.username} → ${user.referral_code} → ${newCode}`);
      } else {
        console.log(`❌ Impossibile generare codice semplice per ${user.username}`);
      }
    }
    
    // Mostra tutti i nuovi codici
    console.log('\n🎉 NUOVI CODICI REFERRAL SEMPLICI:');
    const updatedResult = await client.query(`
      SELECT username, email, referral_code 
      FROM users 
      WHERE type = 'staff' AND referral_code IS NOT NULL
      ORDER BY referral_code
    `);
    
    updatedResult.rows.forEach(user => {
      console.log(`📋 ${user.referral_code} → ${user.email}`);
    });
    
    console.log('\n✨ Aggiornamento completato!');
    
  } catch (error) {
    console.error('❌ Errore durante l\'aggiornamento:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Esegui lo script
updateReferralCodes();