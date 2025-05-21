/**
 * Script per ripristinare ESATTAMENTE le password al backup14
 * 
 * Soluzione più veloce e diretta
 */

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function restoreBackup14Passwords() {
  try {
    console.log("=== RIPRISTINO PASSWORD DEL BACKUP14 ===");
    
    // 1. Elimina tutte le sessioni attive
    await pool.query('TRUNCATE TABLE session');
    console.log("✓ Tabella sessioni svuotata");
    
    // 2. Imposta password per admin
    await pool.query(`
      UPDATE users
      SET password = '04b065f1f410058d66f4a34d03ff3a8fa528a4024ecb7d60b111968d44d12ecb73414abb28a439ba9bc8b7b5d14b87534bf02e39db4b298aa1ef60e32fc669d9.b5b523721e413f709649ca32c38db89c'
      WHERE username = 'zambelli.andrea.1973@gmail.com'
    `);
    console.log("✓ Password admin: gironiCO73%");
    
    // 3. Imposta password per customer/business accounts
    await pool.query(`
      UPDATE users
      SET password = '35e803d1e8d765136b051ed26dbc477dc9734461a681d12af35fceedd4c61cebe22a1279e6f4ef394751be1ff38856cae8a004c6e8da5a1b49020cb4a13cffe7.58f3f77fe0ad6c6c6a3c37f3073bdf59'
      WHERE username IN ('zambelli.andrea.1973A@gmail.com', 'zambelli.andrea.1973B@gmail.com', 'zambelli.andrea.1973C@gmail.com', 'zambelli.andrea.1973D@gmail.com')
    `);
    console.log("✓ Password customer/business accounts: gironico");
    
    // 4. Imposta password per staff
    await pool.query(`
      UPDATE users
      SET password = '04b065f1f410058d66f4a34d03ff3a8fa528a4024ecb7d60b111968d44d12ecb73414abb28a439ba9bc8b7b5d14b87534bf02e39db4b298aa1ef60e32fc669d9.b5b523721e413f709649ca32c38db89c'
      WHERE username = 'zambelli.andrea.19732@gmail.com'
    `);
    console.log("✓ Password staff: gironiCO73%");
    
    // 5. Corretta la relazione client_id per gli account Zambelli
    await pool.query(`
      UPDATE users 
      SET client_id = 26
      WHERE username IN ('zambelli.andrea.1973A@gmail.com', 'zambelli.andrea.1973B@gmail.com', 'zambelli.andrea.1973C@gmail.com', 'zambelli.andrea.1973D@gmail.com')
    `);
    console.log("✓ Relazioni client_id corrette");
    
    console.log("\n=== RIPRISTINO COMPLETATO! ===");
    console.log("Account ripristinati con le password originali del backup14:");
    console.log("- Account Admin: zambelli.andrea.1973@gmail.com / gironiCO73%");
    console.log("- Account Staff: zambelli.andrea.19732@gmail.com / gironiCO73%");
    console.log("- Account Customer: zambelli.andrea.1973B@gmail.com / gironico");
    console.log("- Account Business: zambelli.andrea.1973D@gmail.com / gironico");
    
  } catch (error) {
    console.error("ERRORE durante il ripristino:", error);
  } finally {
    pool.end();
  }
}

// Esegui il ripristino
restoreBackup14Passwords();