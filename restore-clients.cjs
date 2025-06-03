const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function restoreAndAssignClients() {
  const client = await pool.connect();
  
  try {
    console.log('Ripristino clienti dal backup e assegnazione agli account...');
    
    // Account mappings
    const accountMappings = {
      9: 'zambelli.andrea.1973A@gmail.com (Trial)', // Account A
      10: 'zambelli.andrea.1973B@gmail.com (Basic)', // Account B  
      11: 'zambelli.andrea.1973C@gmail.com (Pro)',   // Account C
      12: 'zambelli.andrea.1973D@gmail.com (Business)', // Account D
      16: 'faverioelisa6@gmail.com (Staff)'  // Staff principale
    };
    
    // Ripristina i clienti con assegnazione corretta
    const assignmentRules = [
      // Account A (Trial) - clienti di test trial
      { names: ['Cliente Trial', 'Trial Account'], ownerId: 9 },
      
      // Account C (Pro) - clienti di test pro
      { names: ['Cliente Pro', 'Pro Account'], ownerId: 11 },
      
      // Account D (Business) - clienti di test business
      { names: ['Cliente Business', 'Business Account'], ownerId: 12 },
      
      // Staff principale (Elisa) - clienti reali
      { names: ['Silvia Busnari', 'Cristina Valetti', 'Zambelli Andrea', 'giovanni rizzo', 'Leila Baldovin', 'Marco Berto', 'Valentina Cotrino', 'Eleonora Tentori', 'Cinzia Munaretto', 'Giovanna Spano', 'Rosa Nappi', 'Dino Nappi', 'Alan Marconi', 'Matteo Somaschini', 'Matteo Libera', 'giovanni ribbio'], ownerId: 16 },
      
      // Account B - clienti rimanenti
      { names: ['*'], ownerId: 10 } // Catch-all per gli altri
    ];
    
    // Recupera clienti dal backup
    const backupClients = await client.query('SELECT * FROM clients_backup_original ORDER BY id');
    
    console.log(`Trovati ${backupClients.rows.length} clienti nel backup`);
    
    for (const backupClient of backupClients.rows) {
      let assignedOwnerId = 10; // Default a Account B
      
      // Trova l'owner corretto basandosi sulle regole
      for (const rule of assignmentRules) {
        if (rule.names.includes('*')) {
          assignedOwnerId = rule.ownerId; // Catch-all
          break;
        }
        
        const fullName = `${backupClient.first_name} ${backupClient.last_name}`;
        if (rule.names.some(name => fullName.includes(name) || backupClient.first_name.includes(name))) {
          assignedOwnerId = rule.ownerId;
          break;
        }
      }
      
      // Inserisci il cliente con l'owner corretto
      await client.query(`
        INSERT INTO clients (
          first_name, last_name, phone, email, address, birthday, notes,
          is_frequent, medical_notes, allergies, has_consent, owner_id, assignment_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        backupClient.first_name,
        backupClient.last_name, 
        backupClient.phone,
        backupClient.email,
        backupClient.address,
        backupClient.birthday,
        backupClient.notes,
        backupClient.is_frequent,
        backupClient.medical_notes,
        backupClient.allergies,
        backupClient.has_consent,
        assignedOwnerId,
        null // assignment_code vuoto per ora
      ]);
      
      console.log(`✅ ${backupClient.first_name} ${backupClient.last_name} → ${accountMappings[assignedOwnerId]}`);
    }
    
    // Verifica finale
    const summary = await client.query(`
      SELECT owner_id, COUNT(*) as count 
      FROM clients 
      GROUP BY owner_id 
      ORDER BY owner_id
    `);
    
    console.log('\n📊 Riepilogo assegnazioni:');
    for (const row of summary.rows) {
      console.log(`${accountMappings[row.owner_id]}: ${row.count} clienti`);
    }
    
    console.log('\n✅ Ripristino completato con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante il ripristino:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

restoreAndAssignClients();