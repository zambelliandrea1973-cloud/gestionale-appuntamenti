/**
 * Script per creare codici di assegnazione univoci per tutti gli account
 */

const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Genera un codice di assegnazione univoco
 * @param {string} username - Nome utente
 * @param {number} id - ID utente
 * @returns {string} Codice di assegnazione univoco
 */
function generateAssignmentCode(username, id) {
  // Prende le prime 3 lettere del username + ID + 2 caratteri random
  const userPart = username.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X');
  const idPart = id.toString().padStart(2, '0');
  const randomPart = crypto.randomBytes(1).toString('hex').toUpperCase();
  return `${userPart}${idPart}${randomPart}`;
}

async function createAssignmentCodes() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creazione codici di assegnazione per tutti gli account...');
    
    // Aggiungi il campo assignment_code alla tabella users se non esiste
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'assignment_code'
    `);
    
    if (checkResult.rows.length === 0) {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN assignment_code TEXT UNIQUE
      `);
      console.log('✅ Campo assignment_code aggiunto alla tabella users');
    }
    
    // Trova tutti gli utenti senza codice di assegnazione
    const result = await client.query(`
      SELECT id, username, email, type 
      FROM users 
      WHERE assignment_code IS NULL OR assignment_code = ''
    `);
    
    console.log(`📋 Trovati ${result.rows.length} account senza codice di assegnazione`);
    
    for (const user of result.rows) {
      let assignmentCode;
      let isUnique = false;
      let attempts = 0;
      
      // Genera codice unico (massimo 20 tentativi)
      while (!isUnique && attempts < 20) {
        assignmentCode = generateAssignmentCode(user.username, user.id);
        
        // Verifica unicità
        const checkResult = await client.query(
          'SELECT id FROM users WHERE assignment_code = $1',
          [assignmentCode]
        );
        
        if (checkResult.rows.length === 0) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (isUnique) {
        // Assegna il codice all'utente
        await client.query(
          'UPDATE users SET assignment_code = $1 WHERE id = $2',
          [assignmentCode, user.id]
        );
        
        console.log(`✅ ${user.type} ${user.username} (ID: ${user.id}) → Codice: ${assignmentCode}`);
      } else {
        console.log(`❌ Impossibile generare codice unico per ${user.username}`);
      }
    }
    
    console.log('🎉 Creazione codici completata!');
    
    // Mostra riepilogo
    const summaryResult = await client.query(`
      SELECT type, COUNT(*) as count
      FROM users 
      WHERE assignment_code IS NOT NULL AND assignment_code != ''
      GROUP BY type
    `);
    
    console.log('\n📊 RIEPILOGO CODICI CREATI:');
    for (const row of summaryResult.rows) {
      console.log(`${row.type}: ${row.count} codici`);
    }
    
  } catch (error) {
    console.error('❌ Errore durante la creazione:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Esegui lo script
createAssignmentCodes();