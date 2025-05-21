/**
 * Script specifico per correggere l'accesso amministratore
 * 
 * Estrae una password funzionante dal backup14 e la imposta per l'account admin
 */

const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixAdminAccount() {
  try {
    console.log("=== CORREZIONE ACCOUNT AMMINISTRATORE ===");
    
    // Imposta una password specifica che sappiamo funziona con zambelliCO73%
    await pool.query(`
      UPDATE users
      SET password = '04b065f1f410058d66f4a34d03ff3a8fa528a4024ecb7d60b111968d44d12ecb73414abb28a439ba9bc8b7b5d14b87534bf02e39db4b298aa1ef60e32fc669d9.b5b523721e413f709649ca32c38db89c'
      WHERE username = 'zambelli.andrea.1973@gmail.com'
    `);
    
    // Elimina le sessioni precedenti
    await pool.query('TRUNCATE TABLE session');
    console.log("✓ Tabella sessioni svuotata");
    
    console.log("✓ Password admin corretta impostata");
    console.log("\nNow try logging in with:");
    console.log("- Admin: zambelli.andrea.1973@gmail.com / zambelliCO73%");
    
  } catch (error) {
    console.error("ERRORE durante la riparazione:", error);
  } finally {
    pool.end();
  }
}

// Esegui la riparazione
fixAdminAccount();