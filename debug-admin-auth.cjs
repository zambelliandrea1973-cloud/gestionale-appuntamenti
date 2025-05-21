/**
 * Script di debug avanzato per l'autenticazione amministratore
 * 
 * Questo script verifica tutti i passaggi del processo di autenticazione
 * e identifica esattamente dove si verifica il problema
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function comparePasswords(supplied, stored) {
  try {
    console.log("Confronto password:");
    console.log("- Password fornita:", supplied);
    console.log("- Password memorizzata:", stored.substring(0, 20) + "...");
    
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error("ERRORE: Formato password memorizzata non valido");
      return false;
    }
    
    console.log("- Hash estratto:", hashed.substring(0, 20) + "...");
    console.log("- Salt estratto:", salt);
    
    const hashedBuf = Buffer.from(hashed, "hex");
    
    // Calcola l'hash della password fornita con lo stesso salt
    return new Promise((resolve, reject) => {
      crypto.scrypt(supplied, salt, 64, (err, derivedKey) => {
        if (err) {
          console.error("ERRORE durante hashing:", err);
          return reject(err);
        }
        
        const suppliedHashed = derivedKey.toString("hex");
        console.log("- Hash calcolato:", suppliedHashed.substring(0, 20) + "...");
        
        const isEqual = hashedBuf.length === derivedKey.length && 
                       crypto.timingSafeEqual(hashedBuf, derivedKey);
        
        console.log("- Password corretta:", isEqual ? "SÌ" : "NO");
        resolve(isEqual);
      });
    });
  } catch (error) {
    console.error("ERRORE durante confronto password:", error);
    return false;
  }
}

async function createNewPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const hashed = derivedKey.toString('hex');
      resolve(`${hashed}.${salt}`);
    });
  });
}

async function debugAdminLogin() {
  try {
    console.log("=== DEBUG AUTENTICAZIONE AMMINISTRATORE ===");
    
    // 1. Verifica i dati dell'utente
    const userResult = await pool.query(`
      SELECT id, username, email, password, role, type 
      FROM users 
      WHERE username = 'zambelli.andrea.1973@gmail.com'
    `);
    
    if (userResult.rows.length === 0) {
      console.error("ERRORE: Utente admin non trovato nel database");
      return;
    }
    
    const admin = userResult.rows[0];
    console.log("Dati utente admin trovati:");
    console.log("- ID:", admin.id);
    console.log("- Username:", admin.username);
    console.log("- Email:", admin.email);
    console.log("- Ruolo:", admin.role);
    console.log("- Tipo:", admin.type);
    console.log("- Password (hash):", admin.password.substring(0, 20) + "...");
    
    // 2. Verifica la password attuale
    console.log("\nTest autenticazione con password 'zambelliCO73%':");
    const isCorrect1 = await comparePasswords("zambelliCO73%", admin.password);
    
    console.log("\nTest autenticazione con password 'gironiCO73%':");
    const isCorrect2 = await comparePasswords("gironiCO73%", admin.password);
    
    // 3. Verifica con altri possibili formati di password
    console.log("\nProva con varianti comuni di password:");
    
    const possiblePasswords = [
      "zambelli", "zambelliCO", "Zambelli", "ZambelliCO73%",
      "gironico", "Gironico", "GironicoCO73%"
    ];
    
    for (const pwd of possiblePasswords) {
      console.log(`\nTest con '${pwd}':`);
      await comparePasswords(pwd, admin.password);
    }
    
    // 4. Reimpostazione completa della password
    console.log("\n=== REIMPOSTAZIONE PASSWORD AMMINISTRATORE ===");
    
    // Genera un nuovo hash per la password zambelliCO73%
    const newPassword = "zambelliCO73%";
    const hashedPassword = await createNewPassword(newPassword);
    
    console.log("Nuova password generata per admin:");
    console.log("- Password in chiaro:", newPassword);
    console.log("- Hash generato:", hashedPassword.substring(0, 20) + "...");
    
    // Aggiorna la password nel database
    await pool.query(`
      UPDATE users 
      SET password = $1
      WHERE username = 'zambelli.andrea.1973@gmail.com'
    `, [hashedPassword]);
    
    console.log("✓ Password admin aggiornata con successo");
    
    // Elimina le sessioni
    await pool.query('TRUNCATE TABLE session');
    console.log("✓ Sessioni eliminate");
    
    // Verifica che la password funzioni
    const updatedUserResult = await pool.query(`
      SELECT password FROM users WHERE username = 'zambelli.andrea.1973@gmail.com'
    `);
    
    const updatedPassword = updatedUserResult.rows[0].password;
    console.log("\nVerifica finale password:");
    await comparePasswords(newPassword, updatedPassword);
    
    console.log("\n=== RIPARAZIONE COMPLETATA ===");
    console.log("Ora dovresti poter accedere con:");
    console.log("- Admin: zambelli.andrea.1973@gmail.com / zambelliCO73%");
    
  } catch (error) {
    console.error("ERRORE durante debug:", error);
  } finally {
    pool.end();
  }
}

// Esegui il debug
debugAdminLogin();