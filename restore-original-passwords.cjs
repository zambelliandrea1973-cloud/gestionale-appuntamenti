/**
 * Script per ripristinare le password originali e correggere la logica di autenticazione
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
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

// Password originali per ogni account
const originalPasswords = {
  // Account Zambelli
  'zambelli.andrea.1973@gmail.com': 'zambelliCO73%',
  'zambelli.andrea.19732@gmail.com': 'zambelliCO73%',
  'zambelli.andrea.1973A@gmail.com': 'zambelliCO73%',
  'zambelli.andrea.1973B@gmail.com': 'zambelliCO73%',
  'zambelli.andrea.1973C@gmail.com': 'zambelliCO73%',
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

async function restoreOriginalPasswords() {
  try {
    console.log("=== RIPRISTINO PASSWORD ORIGINALI ===");
    
    // 1. Elimina tutte le sessioni attive
    await pool.query('TRUNCATE TABLE session');
    console.log("✓ Tabella sessioni svuotata");
    
    // 2. Aggiorna ogni account con la sua password originale
    for (const [username, password] of Object.entries(originalPasswords)) {
      const hashedPassword = await hashPassword(password);
      
      await pool.query(`
        UPDATE users 
        SET password = $1
        WHERE username = $2
      `, [hashedPassword, username]);
      
      console.log(`✓ Password originale per ${username} ripristinata`);
    }
    
    // 3. Corretta la relazione client_id per gli account Zambelli
    await pool.query(`
      UPDATE users 
      SET client_id = 26
      WHERE username IN ('zambelli.andrea.1973A@gmail.com', 'zambelli.andrea.1973B@gmail.com', 'zambelli.andrea.1973C@gmail.com', 'zambelli.andrea.1973D@gmail.com')
    `);
    console.log("✓ Relazioni client_id corrette");
    
    // 4. Verifica le licenze
    const licenseResult = await pool.query(`
      SELECT l.id, l.user_id, l.type, l.expires_at, u.username
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE u.username LIKE 'zambelli%'
    `);
    
    console.log("\nVerifica licenze Zambelli:");
    licenseResult.rows.forEach(license => {
      console.log(`- Licenza ID ${license.id}: ${license.username} (ID: ${license.user_id}) - Tipo: ${license.type}, Scade: ${license.expires_at}`);
    });
    
    console.log("\n=== RIPRISTINO COMPLETATO! ===");
    console.log("Ora puoi accedere con le password originali:");
    console.log("- Account Business: zambelli.andrea.1973D@gmail.com / gironico");
    console.log("- Account Zambelli: zambelli.andrea.1973B@gmail.com / zambelliCO73%");
    console.log("- Account Admin: zambelli.andrea.1973@gmail.com / zambelliCO73%");
    
  } catch (error) {
    console.error("ERRORE durante il ripristino:", error);
  } finally {
    pool.end();
  }
}

// Esegui il ripristino
restoreOriginalPasswords();