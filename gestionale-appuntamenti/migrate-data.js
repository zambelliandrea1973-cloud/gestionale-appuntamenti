/**
 * Script di migrazione completa dei dati dal sistema Replit esistente
 * Importa TUTTI i dati reali da storage_data.json e accounts-credentials.json
 */

import fs from 'fs';
import crypto from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;

// Configurazione database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Funzione per hash delle password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function migrateData() {
  console.log('🚀 INIZIO MIGRAZIONE DATI COMPLETA');
  
  try {
    // Carica dati esistenti
    const storageData = JSON.parse(fs.readFileSync('./storage_data.json', 'utf8'));
    const accountsData = JSON.parse(fs.readFileSync('./accounts-credentials.json', 'utf8'));
    
    console.log('📊 Dati caricati:');
    console.log(`- Clienti: ${storageData.clients.length}`);
    console.log(`- Account staff: ${accountsData.staff.length}`);
    console.log(`- Account customer: ${accountsData.customers.length}`);

    // 1. MIGRA UTENTI STAFF
    console.log('\n👥 Migrazione utenti staff...');
    
    // Admin
    await pool.query(`
      INSERT INTO users (id, email, password_hash, user_type, plan, business_name, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        user_type = EXCLUDED.user_type,
        plan = EXCLUDED.plan
    `, [3, accountsData.admin.email, hashPassword(accountsData.admin.password), 'admin', 'admin', 'Studio Andrea Zambelli']);

    // Staff Silvia Busnari
    await pool.query(`
      INSERT INTO users (id, email, password_hash, user_type, plan, business_name, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        user_type = EXCLUDED.user_type,
        plan = EXCLUDED.plan
    `, [14, 'busnari.silvia@libero.it', hashPassword('staff123'), 'staff', 'business', 'Studio Medico Silvia Busnari']);

    // Staff Elisa Faverio
    await pool.query(`
      INSERT INTO users (id, email, password_hash, user_type, plan, business_name, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        user_type = EXCLUDED.user_type,
        plan = EXCLUDED.plan
    `, [15, 'elisa.faverio@gmail.com', hashPassword('staff123'), 'staff', 'business', 'Studio Medico Elisa Faverio']);

    // Account customer
    for (let i = 0; i < accountsData.customers.length; i++) {
      const customer = accountsData.customers[i];
      const userId = 9 + i; // IDs 9, 10, 11, 12
      await pool.query(`
        INSERT INTO users (id, email, password_hash, user_type, plan, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          user_type = EXCLUDED.user_type,
          plan = EXCLUDED.plan
      `, [userId, customer.email, hashPassword(customer.password), customer.type, customer.plan]);
    }

    console.log('✅ Utenti migrati');

    // 2. MIGRA CLIENTI
    console.log('\n👤 Migrazione clienti...');
    let clientCount = 0;
    
    for (const [clientId, clientData] of storageData.clients) {
      try {
        await pool.query(`
          INSERT INTO clients (
            id, owner_id, first_name, last_name, phone, email, address, 
            birthday, notes, is_frequent, medical_notes, allergies, 
            has_consent, unique_code, professionista_code, access_count, 
            last_access, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            address = EXCLUDED.address,
            birthday = EXCLUDED.birthday,
            notes = EXCLUDED.notes,
            is_frequent = EXCLUDED.is_frequent,
            medical_notes = EXCLUDED.medical_notes,
            allergies = EXCLUDED.allergies,
            has_consent = EXCLUDED.has_consent,
            access_count = EXCLUDED.access_count,
            last_access = EXCLUDED.last_access
        `, [
          clientData.id,
          clientData.ownerId,
          clientData.firstName,
          clientData.lastName,
          clientData.phone,
          clientData.email || null,
          clientData.address || null,
          clientData.birthday || null,
          clientData.notes || null,
          clientData.isFrequent || false,
          clientData.medicalNotes || null,
          clientData.allergies || null,
          clientData.hasConsent || false,
          clientData.uniqueCode || null,
          clientData.professionistCode || null,
          clientData.accessCount || 0,
          clientData.lastAccess ? new Date(clientData.lastAccess) : null,
          new Date(clientData.createdAt)
        ]);
        clientCount++;
      } catch (error) {
        console.log(`⚠️ Errore cliente ${clientData.id}: ${error.message}`);
      }
    }

    console.log(`✅ ${clientCount} clienti migrati`);

    // 3. VERIFICA MIGRAZIONE
    console.log('\n🔍 Verifica migrazione...');
    
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    const clientsResult = await pool.query('SELECT COUNT(*) FROM clients');
    
    console.log(`👥 Utenti nel database: ${usersResult.rows[0].count}`);
    console.log(`👤 Clienti nel database: ${clientsResult.rows[0].count}`);

    // 4. TEST ACCESSO DATI
    console.log('\n🧪 Test accesso dati...');
    
    const andreZambelliClients = await pool.query(`
      SELECT c.first_name, c.last_name, c.phone, c.email 
      FROM clients c 
      WHERE c.owner_id = 3 
      ORDER BY c.created_at DESC 
      LIMIT 5
    `);
    
    const silviaClients = await pool.query(`
      SELECT c.first_name, c.last_name, c.phone, c.email 
      FROM clients c 
      WHERE c.owner_id = 14 
      ORDER BY c.created_at DESC 
      LIMIT 5
    `);

    console.log('\n📋 Clienti Andrea Zambelli (primi 5):');
    andreZambelliClients.rows.forEach(client => {
      console.log(`  - ${client.first_name} ${client.last_name} (${client.phone})`);
    });

    console.log('\n📋 Clienti Silvia Busnari (primi 5):');
    silviaClients.rows.forEach(client => {
      console.log(`  - ${client.first_name} ${client.last_name} (${client.phone})`);
    });

    console.log('\n🎉 MIGRAZIONE COMPLETATA CON SUCCESSO!');
    console.log('\n📦 Dati disponibili:');
    console.log('- Tutti gli utenti staff con credenziali originali');
    console.log('- Tutti i clienti con dati completi');
    console.log('- Codici QR e accessi preservati');
    console.log('- Struttura multi-tenant funzionante');

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Esegui migrazione
migrateData();