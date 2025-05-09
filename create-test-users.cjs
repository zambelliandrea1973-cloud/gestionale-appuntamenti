// Creiamo lo script in CommonJS per compatibilità
// @ts-check
const crypto = require('crypto');
const { Client } = require('pg');

// Funzione per generare hash delle password
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${hash}.${salt}`;
}

// Configurazione del client PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function createTestUsers() {
  try {
    // Connessione al database
    await client.connect();
    
    // Hash della password (uguale per tutti gli utenti)
    const passwordHash = await hashPassword('gironico');
    
    // 1. Account staff
    const staffResult = await client.query(
      `INSERT INTO users (username, password, email, role, type, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id`,
      ['zambelli.andrea.19732@gmail.com', passwordHash, 'zambelli.andrea.19732@gmail.com', 'staff', 'staff']
    );
    const staffId = staffResult.rows[0].id;
    
    // Licenza staff_free di 10 anni
    const staffExpiryDate = new Date();
    staffExpiryDate.setFullYear(staffExpiryDate.getFullYear() + 10);
    await client.query(
      `INSERT INTO licenses (code, type, is_active, created_at, activated_at, expires_at, user_id)
       VALUES ($1, $2, $3, NOW(), NOW(), $4, $5)`,
      [`STAFF-${crypto.randomBytes(8).toString('hex').toUpperCase()}`, 'staff_free', true, staffExpiryDate, staffId]
    );
    
    // 2. Account free (trial)
    const freeResult = await client.query(
      `INSERT INTO users (username, password, email, role, type, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id`,
      ['zambelli.andrea.1973A@gmail.com', passwordHash, 'zambelli.andrea.1973A@gmail.com', 'user', 'customer']
    );
    const freeId = freeResult.rows[0].id;
    
    // Licenza trial di 40 giorni
    const freeExpiryDate = new Date();
    freeExpiryDate.setDate(freeExpiryDate.getDate() + 40);
    await client.query(
      `INSERT INTO licenses (code, type, is_active, created_at, activated_at, expires_at, user_id)
       VALUES ($1, $2, $3, NOW(), NOW(), $4, $5)`,
      [`TRIAL-${crypto.randomBytes(8).toString('hex').toUpperCase()}`, 'trial', true, freeExpiryDate, freeId]
    );
    
    // 3. Account base
    const baseResult = await client.query(
      `INSERT INTO users (username, password, email, role, type, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id`,
      ['zambelli.andrea.1973B@gmail.com', passwordHash, 'zambelli.andrea.1973B@gmail.com', 'user', 'customer']
    );
    const baseId = baseResult.rows[0].id;
    
    // Licenza base di 1 anno
    const baseExpiryDate = new Date();
    baseExpiryDate.setFullYear(baseExpiryDate.getFullYear() + 1);
    await client.query(
      `INSERT INTO licenses (code, type, is_active, created_at, activated_at, expires_at, user_id)
       VALUES ($1, $2, $3, NOW(), NOW(), $4, $5)`,
      [`BASE-${crypto.randomBytes(8).toString('hex').toUpperCase()}`, 'base', true, baseExpiryDate, baseId]
    );
    
    // 4. Account pro
    const proResult = await client.query(
      `INSERT INTO users (username, password, email, role, type, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id`,
      ['zambelli.andrea.1973C@gmail.com', passwordHash, 'zambelli.andrea.1973C@gmail.com', 'user', 'customer']
    );
    const proId = proResult.rows[0].id;
    
    // Licenza pro di 1 anno
    const proExpiryDate = new Date();
    proExpiryDate.setFullYear(proExpiryDate.getFullYear() + 1);
    await client.query(
      `INSERT INTO licenses (code, type, is_active, created_at, activated_at, expires_at, user_id)
       VALUES ($1, $2, $3, NOW(), NOW(), $4, $5)`,
      [`PRO-${crypto.randomBytes(8).toString('hex').toUpperCase()}`, 'pro', true, proExpiryDate, proId]
    );
    
    // 5. Account business
    const businessResult = await client.query(
      `INSERT INTO users (username, password, email, role, type, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id`,
      ['zambelli.andrea.1973D@gmail.com', passwordHash, 'zambelli.andrea.1973D@gmail.com', 'user', 'customer']
    );
    const businessId = businessResult.rows[0].id;
    
    // Licenza business di 1 anno
    const businessExpiryDate = new Date();
    businessExpiryDate.setFullYear(businessExpiryDate.getFullYear() + 1);
    await client.query(
      `INSERT INTO licenses (code, type, is_active, created_at, activated_at, expires_at, user_id)
       VALUES ($1, $2, $3, NOW(), NOW(), $4, $5)`,
      [`BUSINESS-${crypto.randomBytes(8).toString('hex').toUpperCase()}`, 'business', true, businessExpiryDate, businessId]
    );
    
    console.log('Tutti gli account di test sono stati creati con successo.');
    
    // Verifica gli account creati
    const usersResult = await client.query('SELECT id, username, role, type FROM users WHERE id <> 3');
    console.log('Nuovi account creati:');
    console.table(usersResult.rows);
    
    // Verifica le licenze create
    const licensesResult = await client.query('SELECT id, type, user_id, expires_at FROM licenses WHERE user_id <> 3');
    console.log('Nuove licenze create:');
    console.table(licensesResult.rows);
    
  } catch (error) {
    console.error('Errore durante la creazione degli account:', error);
  } finally {
    // Chiudi la connessione
    await client.end();
  }
}

// Esegui la funzione
createTestUsers();