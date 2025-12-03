/**
 * Script di migrazione automatica per uniformare i codici cliente
 * 
 * Trova tutti i clienti con vecchio formato lungo (uniqueCode) ma senza nuovo formato corto (newUniqueCode)
 * e genera automaticamente i nuovi codici mantenendo i vecchi QR funzionanti.
 * 
 * SICUREZZA:
 * - Lascia uniqueCode invariato → vecchi QR continuano a funzionare
 * - Genera solo newUniqueCode → uniforma la visualizzazione
 */

import { db } from '../db';
import { clients, users } from '../../shared/schema';
import { isNull, isNotNull, eq, and } from 'drizzle-orm';
import { generateClientCode } from '../utils/clientCodeGenerator';

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: Array<{
    id: number;
    name: string;
    ownerId: number;
    oldCode: string | null;
    newCode: string | null;
    status: 'migrated' | 'skipped' | 'error';
    reason?: string;
  }>;
}

async function migrateClientCodes(): Promise<MigrationStats> {
  console.log('🚀 [MIGRAZIONE] Inizio migrazione codici clienti...\n');
  
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    details: []
  };

  try {
    // Trova tutti i clienti che NON hanno newUniqueCode e hanno un ownerId valido
    const clientsToMigrate = await db.select({
      id: clients.id,
      firstName: clients.firstName,
      lastName: clients.lastName,
      uniqueCode: clients.uniqueCode,
      newUniqueCode: clients.newUniqueCode,
      ownerId: clients.ownerId
    })
    .from(clients)
    .where(
      and(
        isNull(clients.newUniqueCode),
        isNotNull(clients.ownerId)
      )
    );

    stats.total = clientsToMigrate.length;
    console.log(`📊 [MIGRAZIONE] Trovati ${stats.total} clienti da processare\n`);

    for (const client of clientsToMigrate) {
      const clientName = `${client.firstName} ${client.lastName}`;
      
      try {
        // Verifica se il cliente ha un owner valido
        if (!client.ownerId) {
          console.log(`⚠️  [SKIP] Cliente ${client.id} (${clientName}) - Nessun ownerId`);
          stats.skipped++;
          stats.details.push({
            id: client.id,
            name: clientName,
            ownerId: client.ownerId || 0,
            oldCode: client.uniqueCode,
            newCode: null,
            status: 'skipped',
            reason: 'Nessun ownerId'
          });
          continue;
        }

        // Verifica che il professionista abbia un assignmentCode
        const owner = await db.select({ assignmentCode: users.assignmentCode })
          .from(users)
          .where(eq(users.id, client.ownerId))
          .limit(1);

        if (!owner || owner.length === 0 || !owner[0].assignmentCode) {
          console.log(`⚠️  [SKIP] Cliente ${client.id} (${clientName}) - Professionista ${client.ownerId} senza assignmentCode`);
          stats.skipped++;
          stats.details.push({
            id: client.id,
            name: clientName,
            ownerId: client.ownerId,
            oldCode: client.uniqueCode,
            newCode: null,
            status: 'skipped',
            reason: 'Professionista senza assignmentCode'
          });
          continue;
        }

        // Genera nuovo codice corto
        const newCode = await generateClientCode(client.ownerId);
        
        // Aggiorna SOLO il newUniqueCode, lascia uniqueCode invariato
        await db.update(clients)
          .set({ newUniqueCode: newCode })
          .where(eq(clients.id, client.id));

        console.log(`✅ [MIGRATO] Cliente ${client.id} (${clientName})`);
        console.log(`   Vecchio: ${client.uniqueCode || 'N/A'} (QR ancora valido)`);
        console.log(`   Nuovo:   ${newCode}\n`);

        stats.migrated++;
        stats.details.push({
          id: client.id,
          name: clientName,
          ownerId: client.ownerId,
          oldCode: client.uniqueCode,
          newCode: newCode,
          status: 'migrated'
        });

      } catch (error: any) {
        console.error(`❌ [ERRORE] Cliente ${client.id} (${clientName}): ${error.message}\n`);
        stats.errors++;
        stats.details.push({
          id: client.id,
          name: clientName,
          ownerId: client.ownerId || 0,
          oldCode: client.uniqueCode,
          newCode: null,
          status: 'error',
          reason: error.message
        });
      }
    }

    // Stampa riepilogo
    console.log('\n' + '='.repeat(60));
    console.log('📈 [RIEPILOGO MIGRAZIONE]');
    console.log('='.repeat(60));
    console.log(`Totale clienti processati: ${stats.total}`);
    console.log(`✅ Migrati con successo:  ${stats.migrated}`);
    console.log(`⚠️  Saltati:              ${stats.skipped}`);
    console.log(`❌ Errori:                ${stats.errors}`);
    console.log('='.repeat(60) + '\n');

    if (stats.errors > 0) {
      console.log('⚠️  CLIENTI CON ERRORI:');
      stats.details
        .filter(d => d.status === 'error')
        .forEach(d => {
          console.log(`   - ID ${d.id} (${d.name}): ${d.reason}`);
        });
      console.log('');
    }

    if (stats.skipped > 0) {
      console.log('ℹ️  CLIENTI SALTATI:');
      stats.details
        .filter(d => d.status === 'skipped')
        .forEach(d => {
          console.log(`   - ID ${d.id} (${d.name}): ${d.reason}`);
        });
      console.log('');
    }

    return stats;

  } catch (error) {
    console.error('❌ [ERRORE FATALE] Migrazione fallita:', error);
    throw error;
  }
}

export { migrateClientCodes };
