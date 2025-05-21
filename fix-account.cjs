/**
 * Script di correzione per ripristinare l'identità corretta dell'utente
 * 
 * Questo script esegue operazioni direttamente nel database per correggere
 * problemi di identità errata quando un utente viene visualizzato come un altro.
 */

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateSession(userId) {
  try {
    // Elimina tutte le sessioni per l'utente con ID 16 (faverioelisa6@gmail.com)
    await pool.query('DELETE FROM session WHERE sess::text LIKE \'%\"16\"%\'');
    console.log('Sessioni per utente ID 16 eliminate con successo');
    
    // Elimina tutte le sessioni per zambelli.andrea.1973B per sicurezza
    await pool.query('DELETE FROM session WHERE sess::text LIKE \'%zambelli.andrea.1973B%\'');
    console.log('Sessioni per utente zambelli.andrea.1973B eliminate con successo');
    
    console.log('Correzione completata. Effettua il logout e riprova ad accedere con il tuo account.');
  } catch (error) {
    console.error('Errore durante la correzione:', error);
  } finally {
    pool.end();
  }
}

// Esegui la correzione per l'utente con problemi di identità
updateSession(16);