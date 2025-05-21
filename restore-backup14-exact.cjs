/**
 * Script per ripristinare ESATTAMENTE le password al backup14
 * 
 * Questo script reimposta tutte le password come erano nel backup14
 * seguendo le indicazioni precise dell'utente
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

// Password ESATTAMENTE come nel backup14 - IMPORTANTE!
const backup14Passwords = {
  // Account Zambelli
  'zambelli.andrea.1973@gmail.com': 'gironiCO73%',
  'zambelli.andrea.19732@gmail.com': 'gironiCO73%',
  'zambelli.andrea.1973A@gmail.com': 'gironico',
  'zambelli.andrea.1973B@gmail.com': 'gironico',
  'zambelli.andrea.1973C@gmail.com': 'gironico',
  'zambelli.andrea.1973D@gmail.com': 'gironico',
  
  // Account Staff
  'teststaff@example.com': 'password123',
  'faverioelisa6@gmail.com': 'elisaF2025!',
  'busnari.silvia@libero.it': 'busnarimilano',
  
  // Account Customers
  'testpayment@example.com': 'password123',
  'customer1@example.com': 'password123',
  'customer2@example.com': 'password123'
};

async function restoreBackup14Exact() {
  try {
    console.log("=== RIPRISTINO ESATTO BACKUP14 ===");
    
    // 1. Elimina tutte le sessioni attive
    await pool.query('TRUNCATE TABLE session');
    console.log("✓ Tabella sessioni svuotata");
    
    // 2. Aggiorna ogni account con la password ESATTA del backup14
    for (const [username, password] of Object.entries(backup14Passwords)) {
      const hashedPassword = await hashPassword(password);
      
      await pool.query(`
        UPDATE users 
        SET password = $1
        WHERE username = $2
      `, [hashedPassword, username]);
      
      console.log(`✓ Password ripristinata per ${username}: ${password}`);
    }
    
    // 3. Corretta la relazione client_id per gli account Zambelli
    await pool.query(`
      UPDATE users 
      SET client_id = 26
      WHERE username IN ('zambelli.andrea.1973A@gmail.com', 'zambelli.andrea.1973B@gmail.com', 'zambelli.andrea.1973C@gmail.com', 'zambelli.andrea.1973D@gmail.com')
    `);
    console.log("✓ Relazioni client_id corrette");
    
    console.log("\n=== RIPRISTINO BACKUP14 COMPLETATO! ===");
    console.log("Ora puoi accedere con le password ESATTE del backup14:");
    console.log("- Account Admin: zambelli.andrea.1973@gmail.com / gironiCO73%");
    console.log("- Account Business: zambelli.andrea.1973D@gmail.com / gironico");
    console.log("- Account Base: zambelli.andrea.1973B@gmail.com / gironico");
    
  } catch (error) {
    console.error("ERRORE durante il ripristino:", error);
  } finally {
    pool.end();
  }
}

// Esegui il ripristino esatto
restoreBackup14Exact();