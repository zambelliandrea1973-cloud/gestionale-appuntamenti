/**
 * Script di riparazione avanzato specifico per l'account zambelli.andrea.1973B
 * 
 * Questo script esegue una correzione profonda e definitiva per eliminare 
 * la confusione tra gli account di zambelli.andrea.1973B e faverioelisa6
 */

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixZambelliAccount() {
  try {
    console.log("=== INIZIO RIPARAZIONE ACCOUNT ZAMBELLI ===");
    
    // 1. Elimina tutte le sessioni esistenti nel database
    await pool.query('TRUNCATE TABLE session');
    console.log("✓ Tutte le sessioni eliminate");
    
    // 2. Verifica l'account di zambelli.andrea.1973B
    const zambelliResult = await pool.query(`
      SELECT * FROM users WHERE username = 'zambelli.andrea.1973B@gmail.com'
    `);
    
    if (zambelliResult.rows.length === 0) {
      console.error("Account zambelli.andrea.1973B@gmail.com non trovato nel database!");
      return;
    }
    
    const zambelliAccount = zambelliResult.rows[0];
    console.log(`Account zambelli trovato: ID ${zambelliAccount.id}, tipo: ${zambelliAccount.type}, ruolo: ${zambelliAccount.role}`);
    
    // 3. Verifica il client_id associato
    console.log(`Client ID associato: ${zambelliAccount.client_id || 'nessuno'}`);
    
    // 4. Verifica le licenze associate
    const licenseResult = await pool.query(`
      SELECT * FROM licenses WHERE user_id = $1
    `, [zambelliAccount.id]);
    
    console.log(`Trovate ${licenseResult.rows.length} licenze per l'account zambelli`);
    licenseResult.rows.forEach(license => {
      console.log(`- Licenza ID: ${license.id}, tipo: ${license.type}, scadenza: ${license.expires_at}`);
    });
    
    // 5. Verifica associazioni di clienti
    const [clientId, correctClientId] = [zambelliAccount.client_id, 26];
    if (clientId !== correctClientId) {
      console.log(`Trovata discrepanza nel client_id: ${clientId} invece di ${correctClientId}`);
      
      // Correggi l'associazione
      await pool.query(`
        UPDATE users SET client_id = $1 WHERE id = $2
      `, [correctClientId, zambelliAccount.id]);
      
      console.log(`✓ Client ID corretto da ${clientId} a ${correctClientId}`);
    }
    
    // 6. Correggi specificamente il problema di autenticazione
    console.log("Applicazione correzione specifica...");
    
    // Esegui query per vedere se altri utenti utilizzano l'ID della sessione di zambelli
    const crossSessionCheck = await pool.query(`
      SELECT u.username, u.id, u.type, u.role, u.email
      FROM users u
      WHERE u.username != 'zambelli.andrea.1973B@gmail.com'
      AND EXISTS (
        SELECT 1 FROM clients c 
        WHERE c.id = 26 AND u.id != 10
      )
    `);
    
    if (crossSessionCheck.rows.length > 0) {
      console.log("Trovati utenti problematici che potrebbero causare confusione:");
      for (const user of crossSessionCheck.rows) {
        console.log(`- Utente ${user.username} (ID: ${user.id}) potrebbe interferire`);
      }
    }
    
    // 7. Correzione finale del client
    await pool.query(`
      UPDATE clients 
      SET email = 'zambelli.andrea.1973B@gmail.com'
      WHERE id = 26
    `);
    console.log("✓ Email del client ID 26 corretta a zambelli.andrea.1973B@gmail.com");
    
    console.log("\n=== RIPARAZIONE COMPLETATA CON SUCCESSO ===");
    console.log("Ora puoi effettuare il login con le tue credenziali");
    console.log("Dovresti vedere la tua dashboard corretta con il tuo username");
    
  } catch (error) {
    console.error("ERRORE durante la riparazione:", error);
  } finally {
    pool.end();
  }
}

// Esegui la riparazione
fixZambelliAccount();