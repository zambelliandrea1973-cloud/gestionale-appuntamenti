/**
 * Script per migrare i clienti condivisi (senza owner_id) 
 * in clienti privati per ogni account che li vede
 */

const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

// Configurazione database
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non trovato!');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: ws
});

async function migrateSharedClients() {
  try {
    console.log('🚀 Inizio migrazione clienti condivisi...');

    // STEP 1: Trova tutti i clienti condivisi (senza owner_id)
    const sharedClientsResult = await pool.query(`
      SELECT * FROM clients 
      WHERE owner_id IS NULL 
      ORDER BY id
    `);
    
    const sharedClients = sharedClientsResult.rows;
    console.log(`📋 Trovati ${sharedClients.length} clienti condivisi da migrare`);

    if (sharedClients.length === 0) {
      console.log('✅ Nessun cliente condiviso da migrare');
      return;
    }

    // STEP 2: Trova tutti gli utenti attivi
    const usersResult = await pool.query(`
      SELECT id, username, type FROM users 
      WHERE type IN ('admin', 'staff', 'customer')
      ORDER BY id
    `);
    
    const users = usersResult.rows;
    console.log(`👥 Trovati ${users.length} utenti attivi`);

    let totalCreated = 0;
    let originalClientsToDelete = [];

    // STEP 3: Per ogni utente, crea copie private dei clienti condivisi
    for (const user of users) {
      console.log(`\n👤 Migrazione per utente ${user.username} (ID: ${user.id}, tipo: ${user.type})`);
      
      for (const client of sharedClients) {
        try {
          // Crea una copia del cliente con owner_id = user.id
          const insertResult = await pool.query(`
            INSERT INTO clients (
              first_name, last_name, phone, email, address, 
              birthday, notes, is_frequent, owner_id, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
            ) RETURNING id
          `, [
            client.first_name,
            client.last_name, 
            client.phone,
            client.email,
            client.address,
            client.birthday,
            client.notes,
            client.is_frequent,
            user.id  // ASSEGNA L'OWNER_ID
          ]);

          const newClientId = insertResult.rows[0].id;

          // Crea record di visibilità per il nuovo cliente
          await pool.query(`
            INSERT INTO client_visibility (client_id, user_id)
            VALUES ($1, $2)
          `, [newClientId, user.id]);

          console.log(`  ✅ Creato cliente privato ${newClientId} per ${user.username} (copia di ${client.id})`);
          totalCreated++;

        } catch (error) {
          console.error(`  ❌ Errore creazione cliente per ${user.username}:`, error.message);
        }
      }
    }

    // STEP 4: Ora elimina i clienti originali condivisi
    console.log(`\n🗑️ Eliminazione ${sharedClients.length} clienti originali condivisi...`);
    
    for (const client of sharedClients) {
      try {
        // Elimina appuntamenti
        await pool.query('DELETE FROM appointments WHERE client_id = $1', [client.id]);
        
        // Elimina consensi
        await pool.query('DELETE FROM consents WHERE client_id = $1', [client.id]);
        
        // Elimina fatture e componenti
        await pool.query('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = $1)', [client.id]);
        await pool.query('DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = $1)', [client.id]);
        await pool.query('DELETE FROM invoices WHERE client_id = $1', [client.id]);
        
        // Elimina visibilità
        await pool.query('DELETE FROM client_visibility WHERE client_id = $1', [client.id]);
        
        // Elimina cliente
        await pool.query('DELETE FROM clients WHERE id = $1', [client.id]);
        
        console.log(`  🗑️ Eliminato cliente originale ${client.id}: ${client.first_name} ${client.last_name}`);
        
      } catch (error) {
        console.error(`  ❌ Errore eliminazione cliente ${client.id}:`, error.message);
      }
    }

    console.log(`\n🎉 MIGRAZIONE COMPLETATA!`);
    console.log(`📊 Statistiche:`);
    console.log(`   • ${sharedClients.length} clienti condivisi originali eliminati`);
    console.log(`   • ${totalCreated} nuovi clienti privati creati`);
    console.log(`   • ${users.length} utenti coinvolti nella migrazione`);
    console.log(`\n✅ Ora ogni utente ha i propri clienti privati con eliminazione indipendente!`);

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
  } finally {
    await pool.end();
  }
}

// Esegui migrazione
migrateSharedClients();