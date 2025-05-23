/**
 * SCRIPT DI MIGRAZIONE COMPLETA
 * Importa tutti i dati dai database comuni a quelli separati per ogni account
 * POI elimina i database comuni per evitare bug di sistema
 */

const { Pool } = require('pg');

async function migrateSeparateDatabases() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 INIZIO MIGRAZIONE COMPLETA AI DATABASE SEPARATI');
    
    // 1. OTTIENI TUTTI GLI UTENTI ATTIVI
    const usersResult = await pool.query(`
      SELECT id, username, email, type FROM users 
      WHERE type IN ('admin', 'customer', 'staff')
      ORDER BY id
    `);
    
    console.log(`📊 Trovati ${usersResult.rows.length} utenti da migrare`);
    
    for (const user of usersResult.rows) {
      console.log(`\n👤 MIGRANDO UTENTE: ${user.username} (ID: ${user.id}, Tipo: ${user.type})`);
      
      await migrateUserData(pool, user);
    }
    
    console.log('\n✅ MIGRAZIONE COMPLETATA PER TUTTI GLI UTENTI');
    console.log('\n🗑️ PROSSIMO STEP: Eliminazione database comuni per evitare conflitti...');
    
    // ELIMINA I DATABASE COMUNI (SOLO QUELLI CHE DEVONO ESSERE SEPARATI)
    await cleanupCommonDatabases(pool);
    
    console.log('🎉 MIGRAZIONE COMPLETA TERMINATA CON SUCCESSO!');
    
  } catch (error) {
    console.error('❌ ERRORE DURANTE LA MIGRAZIONE:', error);
  } finally {
    await pool.end();
  }
}

async function migrateUserData(pool, user) {
  const userId = user.id;
  
  // MAPPA TUTTI I CAMPI CHE DEVONO ESSERE MIGRATI AI DATABASE SEPARATI
  const fieldsToMigrate = {
    // BRANDING
    'COD_001': 'business_name',      // Nome Aziendale
    'COD_005': 'primary_color',      // Colore Primario  
    'COD_006': 'secondary_color',    // Colore Secondario
    'COD_007': 'contact_email',      // Email Contatto
    'COD_008': 'contact_phone',      // Telefono
    'COD_009': 'contact_phone2',     // Telefono 2
    'COD_010': 'website',            // Sito Web
    'COD_011': 'address',            // Indirizzo
    'COD_019': 'work_start_time',    // Orario Inizio
    'COD_020': 'work_end_time',      // Orario Fine
    'COD_021': 'theme',              // Tema
    'COD_022': 'appointment_duration', // Durata Appuntamenti
    'COD_023': 'invoice_prefix',     // Prefisso Fatture
    'COD_024': 'vat_rate',           // Aliquota IVA
    'COD_025': 'currency',           // Valuta
  };
  
  // VALORI DI DEFAULT SICURI (se non esistono nei database comuni)
  const defaultValues = {
    'COD_001': user.username || 'La Mia Azienda',
    'COD_005': '#3f51b5',
    'COD_006': '#ffffff', 
    'COD_007': user.email || null,
    'COD_008': null,
    'COD_009': null,
    'COD_010': null,
    'COD_011': null,
    'COD_019': '09:00:00',
    'COD_020': '18:00:00',
    'COD_021': 'professional',
    'COD_022': '30',
    'COD_023': `INV-${userId}`,
    'COD_024': '22.00',
    'COD_025': 'EUR',
  };
  
  // MIGRA OGNI CAMPO
  for (const [fieldCode, dbColumn] of Object.entries(fieldsToMigrate)) {
    try {
      // CERCA SE ESISTE GIÀ NEL DATABASE SEPARATO
      const existingResult = await pool.query(`
        SELECT value FROM user_custom_data 
        WHERE user_id = $1 AND field_code = $2
      `, [userId, fieldCode]);
      
      if (existingResult.rows.length > 0) {
        console.log(`  ✅ ${fieldCode}: Già presente nel database separato`);
        continue;
      }
      
      // CERCA NEI DATABASE COMUNI (se esistono)
      let valueFromCommon = null;
      try {
        const commonResult = await pool.query(`
          SELECT ${dbColumn} FROM app_settings 
          WHERE user_id = $1 OR user_id IS NULL
          ORDER BY user_id DESC NULLS LAST
          LIMIT 1
        `, [userId]);
        
        if (commonResult.rows.length > 0) {
          valueFromCommon = commonResult.rows[0][dbColumn];
        }
      } catch (e) {
        // Tabella non esiste o colonna non esiste, usa valore di default
      }
      
      // USA VALORE TROVATO O DEFAULT
      const finalValue = valueFromCommon || defaultValues[fieldCode];
      
      // INSERISCI NEL DATABASE SEPARATO
      await pool.query(`
        INSERT INTO user_custom_data (user_id, field_code, value, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (user_id, field_code) 
        DO UPDATE SET value = $3, updated_at = NOW()
      `, [userId, fieldCode, finalValue]);
      
      console.log(`  ✅ ${fieldCode}: Migrato "${finalValue}"`);
      
    } catch (error) {
      console.error(`  ❌ ${fieldCode}: Errore migrazione -`, error.message);
    }
  }
}

async function cleanupCommonDatabases(pool) {
  console.log('\n🗑️ ELIMINAZIONE DATABASE COMUNI...');
  
  try {
    // ELIMINA COLONNE SPECIFICHE DALLA TABELLA app_settings CHE SONO ORA SEPARATE
    const columnsToRemove = [
      'business_name',
      'primary_color', 
      'secondary_color',
      'contact_email',
      'contact_phone',
      'contact_phone2',
      'website',
      'address',
      'work_start_time',
      'work_end_time',
      'theme',
      'appointment_duration',
      'invoice_prefix',
      'vat_rate',
      'currency'
    ];
    
    for (const column of columnsToRemove) {
      try {
        await pool.query(`ALTER TABLE app_settings DROP COLUMN IF EXISTS ${column}`);
        console.log(`  ✅ Rimossa colonna: ${column}`);
      } catch (e) {
        console.log(`  ⚠️ Colonna ${column} non esisteva`);
      }
    }
    
    console.log('✅ PULIZIA DATABASE COMUNI COMPLETATA');
    
  } catch (error) {
    console.error('❌ ERRORE PULIZIA DATABASE COMUNI:', error);
  }
}

// ESEGUI MIGRAZIONE
if (require.main === module) {
  migrateSeparateDatabases();
}

module.exports = { migrateSeparateDatabases };