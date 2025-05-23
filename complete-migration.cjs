/**
 * COMPLETAMENTO MIGRAZIONE RAPIDA
 * Migra solo gli account rimanenti senza duplicare quelli già completati
 */

const { Pool } = require('pg');

async function completeMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 COMPLETAMENTO MIGRAZIONE PER ACCOUNT RIMANENTI');
    
    // Ottieni solo gli utenti NON ancora migrati
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.type
      FROM users u 
      LEFT JOIN user_custom_data ucd ON u.id = ucd.user_id
      WHERE u.type IN ('admin', 'customer', 'staff')
      GROUP BY u.id, u.username, u.email, u.type
      HAVING COUNT(ucd.field_code) < 15
      ORDER BY u.id
    `);
    
    console.log(`📊 Account da completare: ${result.rows.length}`);
    
    const fieldsToMigrate = {
      'COD_001': 'business_name',
      'COD_005': 'primary_color',
      'COD_006': 'secondary_color',
      'COD_007': 'contact_email',
      'COD_008': 'contact_phone',
      'COD_009': 'contact_phone2',
      'COD_010': 'website',
      'COD_011': 'address',
      'COD_019': 'work_start_time',
      'COD_020': 'work_end_time',
      'COD_021': 'theme',
      'COD_022': 'appointment_duration',
      'COD_023': 'invoice_prefix',
      'COD_024': 'vat_rate',
      'COD_025': 'currency',
    };
    
    const defaultValues = {
      'COD_001': null, // Sarà username
      'COD_005': '#3f51b5',
      'COD_006': '#ffffff',
      'COD_007': null, // Sarà email
      'COD_008': null,
      'COD_009': null,
      'COD_010': null,
      'COD_011': null,
      'COD_019': '09:00:00',
      'COD_020': '18:00:00',
      'COD_021': 'professional',
      'COD_022': '30',
      'COD_023': null, // Sarà INV-{id}
      'COD_024': '22.00',
      'COD_025': 'EUR',
    };
    
    for (const user of result.rows) {
      console.log(`\n👤 COMPLETANDO: ${user.username} (ID: ${user.id})`);
      
      for (const [fieldCode, dbColumn] of Object.entries(fieldsToMigrate)) {
        try {
          // Controlla se già presente
          const existing = await pool.query(`
            SELECT id FROM user_custom_data 
            WHERE user_id = $1 AND field_code = $2
          `, [user.id, fieldCode]);
          
          if (existing.rows.length > 0) {
            console.log(`  ✅ ${fieldCode}: Già presente`);
            continue;
          }
          
          // Determina valore
          let value = defaultValues[fieldCode];
          if (fieldCode === 'COD_001') value = user.username || 'La Mia Azienda';
          if (fieldCode === 'COD_007') value = user.email;
          if (fieldCode === 'COD_023') value = `INV-${user.id}`;
          
          // Inserisci
          await pool.query(`
            INSERT INTO user_custom_data (user_id, field_code, value, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
          `, [user.id, fieldCode, value]);
          
          console.log(`  ✅ ${fieldCode}: Aggiunto "${value}"`);
          
        } catch (error) {
          console.error(`  ❌ ${fieldCode}: ${error.message}`);
        }
      }
    }
    
    console.log('\n🎉 MIGRAZIONE COMPLETA TERMINATA!');
    
    // Verifica finale
    const finalCheck = await pool.query(`
      SELECT 
        u.username,
        COUNT(ucd.field_code) as campi_migrati
      FROM users u 
      LEFT JOIN user_custom_data ucd ON u.id = ucd.user_id
      WHERE u.type IN ('admin', 'customer', 'staff')
      GROUP BY u.id, u.username
      ORDER BY u.id
    `);
    
    console.log('\n📊 VERIFICA FINALE:');
    finalCheck.rows.forEach(row => {
      const status = row.campi_migrati === 15 ? '✅' : '⚠️';
      console.log(`${status} ${row.username}: ${row.campi_migrati}/15 campi`);
    });
    
  } catch (error) {
    console.error('❌ ERRORE:', error);
  } finally {
    await pool.end();
  }
}

completeMigration();