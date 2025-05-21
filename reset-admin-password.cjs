/**
 * Script per reimpostare la password dell'account amministratore
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

async function resetAdminPassword() {
  try {
    console.log("=== INIZIO RESET PASSWORD AMMINISTRATORE ===");
    
    // La password per l'amministratore è 'gironiCO73%'
    const adminPassword = 'gironiCO73%';
    const hashedPassword = await hashPassword(adminPassword);
    
    // Aggiorna la password dell'amministratore
    await pool.query(`
      UPDATE users 
      SET password = $1
      WHERE username = 'zambelli.andrea.1973@gmail.com'
    `, [hashedPassword]);
    
    console.log("✓ Password admin reimpostata con successo");
    
    // Aggiorna anche la password dell'account staff zambelli.andrea.19732
    await pool.query(`
      UPDATE users 
      SET password = $1
      WHERE username = 'zambelli.andrea.19732@gmail.com'
    `, [hashedPassword]);
    
    console.log("✓ Password staff reimpostata con successo");
    
    // Elimina nuovamente tutte le sessioni
    await pool.query('TRUNCATE TABLE session');
    console.log("✓ Sessioni eliminate con successo");
    
    console.log("\nOperazioni completate!");
    console.log("Ora puoi accedere con:");
    console.log("- Account admin: zambelli.andrea.1973@gmail.com / gironiCO73%");
    console.log("- Account staff: zambelli.andrea.19732@gmail.com / gironiCO73%");
    console.log("- Account customer: zambelli.andrea.1973B@gmail.com / gironiCO73%");

  } catch (error) {
    console.error("ERRORE durante il reset:", error);
  } finally {
    pool.end();
  }
}

// Esegui il reset
resetAdminPassword();