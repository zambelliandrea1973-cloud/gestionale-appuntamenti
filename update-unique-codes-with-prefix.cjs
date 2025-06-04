/**
 * Script per aggiornare i codici univoci esistenti con il nuovo sistema basato su prefisso account
 * Converte da formato BRUPIZ0002 a ZAM-BRUPIZ0002 basato sull'assignmentCode del proprietario
 */

const { Pool } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non configurato');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateUniqueCodesWithPrefix() {
  try {
    console.log('🔧 Inizio aggiornamento codici univoci con prefisso account...');

    // Recupera tutti i clienti con i relativi proprietari
    const clientsQuery = `
      SELECT 
        c.id,
        c."firstName",
        c."lastName", 
        c."uniqueCode",
        c."ownerId",
        u.assignment_code,
        u.username
      FROM clients c
      LEFT JOIN users u ON c."ownerId" = u.id
      WHERE c."uniqueCode" IS NOT NULL 
        AND c."uniqueCode" != ''
        AND c."uniqueCode" NOT LIKE '%-%'
      ORDER BY c."ownerId", c.id
    `;

    const result = await pool.query(clientsQuery);
    const clients = result.rows;

    console.log(`📋 Trovati ${clients.length} clienti da aggiornare`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const client of clients) {
      try {
        let userPrefix = 'DEF'; // Default per clienti senza owner

        if (client.assignment_code) {
          userPrefix = client.assignment_code.substring(0, 3);
        }

        const newUniqueCode = `${userPrefix}-${client.uniqueCode}`;

        // Aggiorna il codice univoco
        const updateQuery = `
          UPDATE clients 
          SET "uniqueCode" = $1 
          WHERE id = $2
        `;

        await pool.query(updateQuery, [newUniqueCode, client.id]);

        console.log(`✅ Cliente ${client.id} (${client.firstName} ${client.lastName}): ${client.uniqueCode} → ${newUniqueCode}`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Errore aggiornando cliente ${client.id}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n📊 Riepilogo aggiornamento:`);
    console.log(`   ✅ Aggiornati: ${updatedCount}`);
    console.log(`   ⚠️  Saltati: ${skippedCount}`);
    console.log(`   📋 Totali: ${clients.length}`);

    // Verifica il risultato
    const verifyQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "uniqueCode" LIKE '%-%' THEN 1 END) as with_prefix,
        COUNT(CASE WHEN "uniqueCode" NOT LIKE '%-%' AND "uniqueCode" IS NOT NULL AND "uniqueCode" != '' THEN 1 END) as without_prefix
      FROM clients 
      WHERE "uniqueCode" IS NOT NULL AND "uniqueCode" != ''
    `;

    const verifyResult = await pool.query(verifyQuery);
    const stats = verifyResult.rows[0];

    console.log(`\n🔍 Verifica finale:`);
    console.log(`   📋 Clienti totali con uniqueCode: ${stats.total}`);
    console.log(`   ✅ Con prefisso account: ${stats.with_prefix}`);
    console.log(`   ❌ Senza prefisso: ${stats.without_prefix}`);

    console.log('\n🎉 Aggiornamento completato!');

  } catch (error) {
    console.error('❌ Errore durante l\'aggiornamento:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

updateUniqueCodesWithPrefix().catch(console.error);