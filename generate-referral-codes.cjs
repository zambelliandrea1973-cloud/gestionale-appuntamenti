/**
 * Script per generare codici referral automatici per tutti gli account staff
 */

const { Pool } = require('pg');
const crypto = require('crypto');

// Configurazione database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Genera un codice referral univoco
 * @param {string} username - Nome utente
 * @param {number} id - ID utente
 * @returns {string} Codice referral univoco
 */
function generateReferralCode(username, id) {
  // Prende le prime 4 lettere del username (maiuscole) + ID + random
  const userPart = username.toUpperCase().slice(0, 4).padEnd(4, 'X');
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${userPart}${id}${randomPart}`;
}

async function generateCodesForStaff() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Inizio generazione codici referral per staff...');
    
    // Trova tutti gli staff senza codice referral
    const result = await client.query(`
      SELECT id, username, email, type 
      FROM users 
      WHERE type = 'staff' AND (referral_code IS NULL OR referral_code = '')
    `);
    
    console.log(`📋 Trovati ${result.rows.length} account staff senza codice referral`);
    
    for (const user of result.rows) {
      let referralCode;
      let isUnique = false;
      let attempts = 0;
      
      // Genera codice unico (massimo 10 tentativi)
      while (!isUnique && attempts < 10) {
        referralCode = generateReferralCode(user.username, user.id);
        
        // Verifica unicità
        const checkResult = await client.query(
          'SELECT id FROM users WHERE referral_code = $1',
          [referralCode]
        );
        
        if (checkResult.rows.length === 0) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (isUnique) {
        // Assegna il codice all'utente
        await client.query(
          'UPDATE users SET referral_code = $1 WHERE id = $2',
          [referralCode, user.id]
        );
        
        console.log(`✅ Staff ${user.username} (ID: ${user.id}) → Codice: ${referralCode}`);
      } else {
        console.log(`❌ Impossibile generare codice unico per ${user.username}`);
      }
    }
    
    console.log('🎉 Generazione codici completata!');
    
  } catch (error) {
    console.error('❌ Errore durante la generazione:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Esegui lo script
generateCodesForStaff();