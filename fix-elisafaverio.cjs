/**
 * Script per correggere l'account di Elisa Faverio
 * Modifica l'email da "faverioelisa6@gamail.com" (con errore di battitura) a "faverioelisa6@gmail.com"
 */

const { Pool } = require('pg');

async function main() {
  try {
    // Connessione al database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    console.log('Connessione al database stabilita');
    
    // Verifica se l'utente con email errata esiste
    const checkResult = await pool.query('SELECT * FROM users WHERE username = $1', ['faverioelisa6@gamail.com']);
    
    if (checkResult.rows.length === 0) {
      console.log('Utente con email errata non trovato. Verifica se esiste con email corretta...');
      
      const correctCheckResult = await pool.query('SELECT * FROM users WHERE username = $1', ['faverioelisa6@gmail.com']);
      
      if (correctCheckResult.rows.length > 0) {
        console.log('Utente già corretto (faverioelisa6@gmail.com):', correctCheckResult.rows[0]);
        return;
      } else {
        console.log('Nessun utente trovato con email faverioelisa6@gamail.com o faverioelisa6@gmail.com');
        
        // Elenca tutti gli utenti per diagnostica
        const allUsers = await pool.query('SELECT id, username, email, role FROM users');
        console.log('Tutti gli utenti nel sistema:');
        allUsers.rows.forEach(user => {
          console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Ruolo: ${user.role}`);
        });
        return;
      }
    }
    
    // Ottieni i dettagli dell'utente con email errata
    const user = checkResult.rows[0];
    console.log('Trovato utente con email errata:', user);
    
    // Aggiorna l'username dell'utente
    const updateResult = await pool.query(
      'UPDATE users SET username = $1 WHERE id = $2 RETURNING *',
      ['faverioelisa6@gmail.com', user.id]
    );
    
    console.log('Utente aggiornato con successo:', updateResult.rows[0]);
    
    // Chiudi la connessione al database
    await pool.end();
    
    console.log('Operazione completata con successo!');
  } catch (error) {
    console.error('Errore durante l\'esecuzione dello script:', error);
    process.exit(1);
  }
}

main();