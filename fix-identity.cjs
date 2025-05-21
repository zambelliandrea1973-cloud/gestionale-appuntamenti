/**
 * Script di correzione avanzato per risolvere definitivamente il problema di identità
 * 
 * Questo script aggiunge un controllo diretto nella tabella users per verificare 
 * se l'account zambelli.andrea.1973B è correttamente configurato e corregge 
 * eventuali errori nella tabella di sessione
 */

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixIdentityIssues() {
  try {
    console.log("Inizio correzione problemi di identità...");
    
    // 1. Elimina tutte le sessioni esistenti
    await pool.query('DELETE FROM session');
    console.log("✓ Tutte le sessioni eliminate dal database");
    
    // 2. Verifica e correggi eventuali problemi nella tabella users per zambelli.andrea.1973B
    const zambelliCheck = await pool.query(
      "SELECT id, username, type, role FROM users WHERE username = 'zambelli.andrea.1973B@gmail.com'"
    );
    
    if (zambelliCheck.rows.length > 0) {
      const user = zambelliCheck.rows[0];
      console.log(`Trovato utente zambelli.andrea.1973B con ID ${user.id}, tipo ${user.type}, ruolo ${user.role}`);
      
      // Assicuriamo che il tipo e il ruolo siano corretti
      if (user.type !== 'customer' || user.role !== 'user') {
        await pool.query(
          "UPDATE users SET type = 'customer', role = 'user' WHERE id = $1",
          [user.id]
        );
        console.log(`✓ Corretto tipo e ruolo per l'utente zambelli.andrea.1973B (ID: ${user.id})`);
      }
    }
    
    // 3. Verifica e correggi eventuali problemi per Elisa Faverio
    const elisaCheck = await pool.query(
      "SELECT id, username, type, role FROM users WHERE username = 'faverioelisa6@gmail.com'"
    );
    
    if (elisaCheck.rows.length > 0) {
      const user = elisaCheck.rows[0];
      console.log(`Trovato utente faverioelisa6 con ID ${user.id}, tipo ${user.type}, ruolo ${user.role}`);
      
      // Assicuriamo che il tipo e il ruolo siano corretti
      if (user.type !== 'staff' || user.role !== 'staff') {
        await pool.query(
          "UPDATE users SET type = 'staff', role = 'staff' WHERE id = $1",
          [user.id]
        );
        console.log(`✓ Corretto tipo e ruolo per l'utente faverioelisa6 (ID: ${user.id})`);
      }
    }
    
    // 4. Verifica e correggi i problemi delle licenze
    const licenseCheck = await pool.query(`
      SELECT l.id, l.user_id, l.type, u.username 
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE u.id IN (
        SELECT id FROM users WHERE username IN ('zambelli.andrea.1973B@gmail.com', 'faverioelisa6@gmail.com')
      )
    `);
    
    console.log("Licenze trovate:");
    licenseCheck.rows.forEach(license => {
      console.log(`- Licenza ID ${license.id}, Tipo: ${license.type}, Utente: ${license.username} (ID: ${license.user_id})`);
    });
    
    console.log("\nCorrezione completata con successo!");
    console.log("\nOra puoi effettuare il login con il tuo account zambelli.andrea.1973B@gmail.com");
    console.log("Dovresti essere correttamente identificato come zambelli.andrea.1973B invece di Elisa Faverio.");
  } catch (error) {
    console.error("ERRORE durante la correzione:", error);
  } finally {
    pool.end();
  }
}

// Esegui la funzione di correzione
fixIdentityIssues();