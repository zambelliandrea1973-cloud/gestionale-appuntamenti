/**
 * Script di correzione avanzata per risolvere definitivamente tutti i problemi di identità
 * 
 * Questo script elimina tutte le sessioni e corregge l'associazione cliente-utente
 * per garantire che ogni account abbia la propria identità corretta
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

async function fixAllAccounts() {
  try {
    console.log("=== INIZIO RIPARAZIONE COMPLETA DEI PROBLEMI DI IDENTITÀ ===");
    
    // 1. Elimina tutte le sessioni attive
    await pool.query('TRUNCATE TABLE session');
    console.log("✓ Tabella sessioni svuotata");
    
    // 2. Password standard per tutti gli account
    const standardPassword = 'gironiCO73%';
    const hashedPassword = await hashPassword(standardPassword);
    
    // 3. Reimposta tutti i client_id per garantire relazioni corrette
    const accountsToFix = [
      { username: 'zambelli.andrea.1973@gmail.com', id: 3, client_id: null, type: 'admin', role: 'admin' },
      { username: 'zambelli.andrea.19732@gmail.com', id: 8, client_id: null, type: 'staff', role: 'staff' },
      { username: 'zambelli.andrea.1973A@gmail.com', id: 9, client_id: 26, type: 'customer', role: 'user' },
      { username: 'zambelli.andrea.1973B@gmail.com', id: 10, client_id: 26, type: 'customer', role: 'user' },
      { username: 'zambelli.andrea.1973C@gmail.com', id: 11, client_id: 26, type: 'customer', role: 'user' },
      { username: 'zambelli.andrea.1973D@gmail.com', id: 12, client_id: 26, type: 'customer', role: 'user' },
      { username: 'faverioelisa6@gmail.com', id: 16, client_id: null, type: 'staff', role: 'staff' },
    ];
    
    // 4. Aggiorna ogni account
    for (const account of accountsToFix) {
      await pool.query(`
        UPDATE users
        SET password = $1, type = $2, role = $3, client_id = $4
        WHERE id = $5
      `, [hashedPassword, account.type, account.role, account.client_id, account.id]);
      
      console.log(`✓ Account ${account.username} (ID: ${account.id}) aggiornato: ${account.type}/${account.role}`);
    }
    
    // 5. Verifica licenze di tutti gli account
    const licenseResult = await pool.query(`
      SELECT l.id, l.user_id, l.type, l.expires_at, u.username
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE u.id IN (3, 8, 9, 10, 11, 12, 16)
    `);
    
    console.log("\nLicenze verificate:");
    licenseResult.rows.forEach(license => {
      console.log(`- Licenza ID ${license.id}: ${license.username} (ID: ${license.user_id}) - Tipo: ${license.type}, Scade: ${license.expires_at}`);
    });
    
    // 6. Assicurati che le licenze siano corrette
    await pool.query(`
      UPDATE licenses SET type = 'business' WHERE user_id = 12 AND type != 'business'
    `);
    
    console.log("\n=== RIPARAZIONE COMPLETA! ===");
    console.log("Ora prova a fare login con:");
    console.log("- zambelli.andrea.1973D@gmail.com / gironiCO73% (Piano Business)");
    console.log("- zambelli.andrea.1973B@gmail.com / gironiCO73% (Piano Base)");
    console.log("- zambelli.andrea.1973@gmail.com / gironiCO73% (Admin)");
    
  } catch (error) {
    console.error("ERRORE durante la riparazione:", error);
  } finally {
    pool.end();
  }
}

// Esegui la riparazione
fixAllAccounts();