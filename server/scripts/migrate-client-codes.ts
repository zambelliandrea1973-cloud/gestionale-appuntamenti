/**
 * Automatic migration script to standardize client codes
 * 
 * Find all clients with old long format (uniqueCode) but without new short format (newUniqueCode)
 * and automatically generates new codes while keeping old QR codes working.
 * 
 * SECURITY:
 * - Leaves uniqueCode unchanged → old QR codes keep working
 * - Generate only newUniqueCode → standardizes the display
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
  console.log('🚀 [MIGRATION] Starting client code migration...\n');
  
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    details: []
  };

  try {
    // Find all clients that do NOT have newUniqueCode and have a valid ownerId
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
    console.log(`📊 [MIGRATION] Found ${stats.total} clients to process\n`);

    for (const client of clientsToMigrate) {
      const clientName = `${client.firstName} ${client.lastName}`;
      
      try {
        // Check if the client has a valid owner
        if (!client.ownerId) {
          console.log(`⚠️  [SKIP] Client ${client.id} (${clientName}) - No ownerId`);
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

        // Verify that the professional has an assignmentCode
        const owner = await db.select({ assignmentCode: users.assignmentCode })
          .from(users)
          .where(eq(users.id, client.ownerId))
          .limit(1);

        if (!owner || owner.length === 0 || !owner[0].assignmentCode) {
          console.log(`⚠️  [SKIP] Client ${client.id} (${clientName}) - Professional ${client.ownerId} without assignmentCode`);
          stats.skipped++;
          stats.details.push({
            id: client.id,
            name: clientName,
            ownerId: client.ownerId,
            oldCode: client.uniqueCode,
            newCode: null,
            status: 'skipped',
            reason: 'Professional without assignmentCode'
          });
          continue;
        }

        // Generate new short code
        const newCode = await generateClientCode(client.ownerId);
        
        // Update ONLY the newUniqueCode, leave uniqueCode unchanged
        await db.update(clients)
          .set({ newUniqueCode: newCode })
          .where(eq(clients.id, client.id));

        console.log(`✅ [MIGRATED] Client ${client.id} (${clientName})`);
        console.log(`   Old: ${client.uniqueCode || 'N/A'} (QR still valid)`);
        console.log(`   New:     ${newCode}\n`);

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
        console.error(`❌ [ERROR] Client ${client.id} (${clientName}): ${error.message}\n`);
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

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 [MIGRATION SUMMARY]');
    console.log('='.repeat(60));
    console.log(`Total clients processed: ${stats.total}`);
    console.log(`✅ Migrated successfully: ${stats.migrated}`);
    console.log(`⚠️  Skipped:              ${stats.skipped}`);
    console.log(`❌ Errors:                ${stats.errors}`);
    console.log('='.repeat(60) + '\n');

    if (stats.errors > 0) {
      console.log('⚠️  CLIENTS WITH ERRORS:');
      stats.details
        .filter(d => d.status === 'error')
        .forEach(d => {
          console.log(`   - ID ${d.id} (${d.name}): ${d.reason}`);
        });
      console.log('');
    }

    if (stats.skipped > 0) {
      console.log('ℹ️  SKIPPED CLIENTS:');
      stats.details
        .filter(d => d.status === 'skipped')
        .forEach(d => {
          console.log(`   - ID ${d.id} (${d.name}): ${d.reason}`);
        });
      console.log('');
    }

    return stats;

  } catch (error) {
    console.error('❌ [FATAL ERROR] Migration failed:', error);
    throw error;
  }
}

export { migrateClientCodes };
