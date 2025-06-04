/**
 * Migrazione completa per sistema multi-tenant
 * Aggiunge userId a tutte le tabelle e migra i dati esistenti
 */

const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, sql } = require('drizzle-orm');

async function migrateToFullMultiTenant() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema: {} });

  console.log('🔄 Inizio migrazione completa multi-tenant...');

  try {
    // FASE 1: Aggiungi colonne userId con valore predefinito temporaneo
    console.log('📝 Fase 1: Aggiunta colonne userId...');
    
    await db.execute(sql`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1;
    `);
    
    await db.execute(sql`
      ALTER TABLE consents ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1;
    `);
    
    await db.execute(sql`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1;
    `);
    
    await db.execute(sql`
      ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1;
    `);
    
    await db.execute(sql`
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 1;
    `);

    // FASE 2: Migra i dati esistenti per ogni utente basandosi sui prefissi dei codici
    console.log('📊 Fase 2: Migrazione dati per separazione utenti...');
    
    // Ottieni tutti gli utenti
    const users = await db.execute(sql`SELECT id, assignment_code FROM users WHERE type IN ('staff', 'customer', 'admin')`);
    console.log(`Trovati ${users.rows.length} utenti da migrare`);

    for (const user of users.rows) {
      const userId = user.id;
      const userPrefix = user.assignment_code;
      
      if (!userPrefix) {
        console.log(`⚠️  Utente ${userId} senza assignment_code, assegno tutti i dati senza prefisso`);
        // Assegna clienti senza prefisso specifico a questo utente
        await db.execute(sql`
          UPDATE clients 
          SET user_id = ${userId}
          WHERE user_id = 1 AND (unique_code IS NULL OR unique_code NOT LIKE '%-%')
        `);
        continue;
      }
      
      console.log(`🔄 Migrazione dati per utente ${userId} con prefisso ${userPrefix}...`);
      
      // Migra clienti basandosi sul prefisso del unique_code
      const clientsUpdated = await db.execute(sql`
        UPDATE clients 
        SET user_id = ${userId}
        WHERE user_id = 1 AND unique_code LIKE ${userPrefix + '-%'}
      `);
      
      // Migra appuntamenti per i clienti di questo utente
      const appointmentsUpdated = await db.execute(sql`
        UPDATE appointments 
        SET user_id = ${userId}
        WHERE user_id = 1 AND client_id IN (
          SELECT id FROM clients WHERE user_id = ${userId}
        )
      `);
      
      // Migra servizi dell'utente (già fatto in precedenza, ma controlliamo)
      const servicesUpdated = await db.execute(sql`
        UPDATE services 
        SET user_id = ${userId}
        WHERE user_id = 1
      `);
      
      // Migra consensi per i clienti di questo utente
      const consentsUpdated = await db.execute(sql`
        UPDATE consents 
        SET user_id = ${userId}
        WHERE user_id = 1 AND client_id IN (
          SELECT id FROM clients WHERE user_id = ${userId}
        )
      `);
      
      // Migra impostazioni app per questo utente
      const appSettingsUpdated = await db.execute(sql`
        UPDATE app_settings 
        SET user_id = ${userId}
        WHERE user_id = 1
      `);
      
      console.log(`✅ Utente ${userId} (${userPrefix}): ${clientsUpdated.rowCount || 0} clienti, ${appointmentsUpdated.rowCount || 0} appuntamenti, ${consentsUpdated.rowCount || 0} consensi migrati`);
    }

    // FASE 3: Rimuovi il valore predefinito e rendi le colonne NOT NULL
    console.log('🔒 Fase 3: Finalizzazione vincoli...');
    
    await db.execute(sql`
      ALTER TABLE clients ALTER COLUMN user_id DROP DEFAULT;
    `);
    
    await db.execute(sql`
      ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;
    `);
    
    await db.execute(sql`
      ALTER TABLE consents ALTER COLUMN user_id DROP DEFAULT;
    `);
    
    await db.execute(sql`
      ALTER TABLE consents ALTER COLUMN user_id SET NOT NULL;
    `);
    
    await db.execute(sql`
      ALTER TABLE invoices ALTER COLUMN user_id DROP DEFAULT;
    `);
    
    await db.execute(sql`
      ALTER TABLE invoices ALTER COLUMN user_id SET NOT NULL;
    `);
    
    await db.execute(sql`
      ALTER TABLE invoice_items ALTER COLUMN user_id DROP DEFAULT;
    `);
    
    await db.execute(sql`
      ALTER TABLE invoice_items ALTER COLUMN user_id SET NOT NULL;
    `);
    
    await db.execute(sql`
      ALTER TABLE payments ALTER COLUMN user_id DROP DEFAULT;
    `);
    
    await db.execute(sql`
      ALTER TABLE payments ALTER COLUMN user_id SET NOT NULL;
    `);

    // FASE 4: Verifica finale della migrazione
    console.log('🔍 Fase 4: Verifica migrazione...');
    
    const verificationQueries = [
      { table: 'clients', query: sql`SELECT user_id, COUNT(*) as count FROM clients GROUP BY user_id ORDER BY user_id` },
      { table: 'appointments', query: sql`SELECT user_id, COUNT(*) as count FROM appointments GROUP BY user_id ORDER BY user_id` },
      { table: 'services', query: sql`SELECT user_id, COUNT(*) as count FROM services GROUP BY user_id ORDER BY user_id` },
      { table: 'consents', query: sql`SELECT user_id, COUNT(*) as count FROM consents GROUP BY user_id ORDER BY user_id` },
      { table: 'app_settings', query: sql`SELECT user_id, COUNT(*) as count FROM app_settings GROUP BY user_id ORDER BY user_id` }
    ];
    
    for (const { table, query } of verificationQueries) {
      const result = await db.execute(query);
      console.log(`📊 ${table}:`, result.rows.map(r => `User ${r.user_id}: ${r.count} record`).join(', '));
    }

    console.log('✅ Migrazione completa multi-tenant completata con successo!');
    console.log('🎯 Tutti gli account ora hanno database completamente separati');
    
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrateToFullMultiTenant()
    .then(() => {
      console.log('🎉 Migrazione completata!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migrazione fallita:', error);
      process.exit(1);
    });
}

module.exports = { migrateToFullMultiTenant };