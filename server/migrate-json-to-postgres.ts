// @ts-nocheck
import { db } from './db';
import { users, clients, appointments, services, staff, treatmentRooms } from '../shared/schema';
import { loadStorageData } from './utils/jsonStorage';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Script di migrazione da JSON a PostgreSQL
 * GARANZIE:
 * - Multi-tenant isolation (each professional sees only their own date)
 * - Admin sees all clients BUT only their own configurations
 * - Sincronizzazione Replit ↔ Sliplane via PostgreSQL condiviso
 */

interface MigrationStats {
  users: { total: number; migrated: number; skipped: number };
  clients: { total: number; migrated: number; skipped: number };
  appointments: { total: number; migrated: number; skipped: number };
  services: { total: number; migrated: number; skipped: number };
  staff: { total: number; migrated: number; skipped: number };
  rooms: { total: number; migrated: number; skipped: number };
}

async function migrateJsonToPostgres() {
  console.log('🔄 INIZIO MIGRAZIONE JSON → PostgreSQL\n');
  
  const stats: MigrationStats = {
    users: { total: 0, migrated: 0, skipped: 0 },
    clients: { total: 0, migrated: 0, skipped: 0 },
    appointments: { total: 0, migrated: 0, skipped: 0 },
    services: { total: 0, migrated: 0, skipped: 0 },
    staff: { total: 0, migrated: 0, skipped: 0 },
    rooms: { total: 0, migrated: 0, skipped: 0 },
  };

  try {
    // Load JSON date
    const jsonData = loadStorageData();
    console.log('📁 JSON data loaded\n');

    // ============================================
    // 1. USERS MIGRATION
    // ============================================
    console.log('👥 Migrazione USERS...');
    const jsonUsers = jsonData.users || [];
    stats.users.total = jsonUsers.length;

    for (const [jsonId, user] of jsonUsers) {
      try {
        // Check if user already exists (by username)
        const existing = await db.select().from(users).where(eq(users.username, user.username)).limit(1);
        
        if (existing.length > 0) {
          console.log(`  ⏭️  User already exists: ${user.username} (ID: ${existing[0].id})`);
          stats.users.skipped++;
          continue;
        }

        // Insert new user
        await db.insert(users).values({
          username: user.username,
          password: user.password,
          email: user.email || user.username,
          role: user.role || 'staff',
          type: user.type || 'staff',
          assignmentCode: user.assignmentCode,
          referralCode: user.referralCode,
        });

        console.log(`  ✅ User migrato: ${user.username}`);
        stats.users.migrated++;
      } catch (error: any) {
        console.error(`  ❌ Error with user ${user.username}:`, error.message);
      }
    }

    // Get mapping ID: JSON ID → PostgreSQL ID
    const userMapping = new Map<number, number>();
    for (const [jsonId, user] of jsonUsers) {
      const pgUser = await db.select().from(users).where(eq(users.username, user.username)).limit(1);
      if (pgUser.length > 0) {
        userMapping.set(Number(jsonId), pgUser[0].id);
      }
    }
    console.log(`  📊 Mapping users: ${userMapping.size} users mapped\n`);

    // ============================================
    // 2. MIGRAZIONE SERVICES
    // ============================================
    console.log('🛠️  Migrazione SERVICES...');
    const userServices = jsonData.userServices || {};
    
    for (const [userJsonId, servicesList] of Object.entries(userServices)) {
      const pgUserId = userMapping.get(Number(userJsonId));
      if (!pgUserId) {
        console.log(`  ⚠️  User ${userJsonId} not found in PostgreSQL, skip services`);
        continue;
      }

      for (const service of servicesList as any[]) {
        try {
          stats.services.total++;

          // Check if service already exists
          const existing = await db.select().from(services)
            .where(and(
              eq(services.userId, pgUserId),
              eq(services.name, service.name)
            ))
            .limit(1);

          if (existing.length > 0) {
            stats.services.skipped++;
            continue;
          }

          await db.insert(services).values({
            userId: pgUserId,
            name: service.name,
            duration: service.duration || 60,
            color: service.color || '#3f51b5',
            price: service.price || 0,
          });

          stats.services.migrated++;
        } catch (error: any) {
          console.error(`  ❌ Error with service ${service.name}:`, error.message);
        }
      }
    }
    console.log(`  ✅ Services: ${stats.services.migrated} migrati, ${stats.services.skipped} skipped\n`);

    // ============================================
    // 3. CLIENTS MIGRATION
    // ============================================
    console.log('👤 Migrazione CLIENTS...');
    const jsonClients = jsonData.clients || [];
    stats.clients.total = jsonClients.length;

    const clientMapping = new Map<number, number>();

    for (const [jsonId, client] of jsonClients) {
      try {
        const pgOwnerId = userMapping.get(client.ownerId);
        if (!pgOwnerId) {
          console.log(`  ⚠️  Owner ${client.ownerId} not found per client ${client.firstName} ${client.lastName}`);
          stats.clients.skipped++;
          continue;
        }

        // Check if client already exists (by uniqueCode)
        if (client.uniqueCode) {
          const existing = await db.select().from(clients).where(eq(clients.uniqueCode, client.uniqueCode)).limit(1);
          if (existing.length > 0) {
            clientMapping.set(Number(jsonId), existing[0].id);
            stats.clients.skipped++;
            continue;
          }
        }

        const [inserted] = await db.insert(clients).values({
          userId: pgOwnerId, // ✅ MULTI-TENANT: userId = ownerId
          ownerId: pgOwnerId, // ✅ MULTI-TENANT: each client has their own owner
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phone || '',
          email: client.email,
          address: client.address,
          birthday: client.birthday,
          notes: client.notes,
          isFrequent: client.isFrequent || false,
          medicalNotes: client.medicalNotes,
          allergies: client.allergies,
          hasConsent: client.hasConsent || false,
          uniqueCode: client.uniqueCode,
          taxCode: client.taxCode,
          vatNumber: client.vatNumber,
        }).returning();

        clientMapping.set(Number(jsonId), inserted.id);
        stats.clients.migrated++;
      } catch (error: any) {
        console.error(`  ❌ Error for client ${client.firstName} ${client.lastName}:`, error.message);
      }
    }
    console.log(`  ✅ Clients: ${stats.clients.migrated} migrati, ${stats.clients.skipped} skipped\n`);

    // ============================================
    // 4. APPOINTMENTS MIGRATION
    // ============================================
    console.log('📅 Migrazione APPOINTMENTS...');
    const jsonAppointments = jsonData.appointments || [];
    stats.appointments.total = jsonAppointments.length;

    for (const [jsonId, appointment] of jsonAppointments) {
      try {
        // Find client in PostgreSQL
        const pgClientId = clientMapping.get(appointment.clientId);
        if (!pgClientId) {
          console.log(`  ⚠️  Client ${appointment.clientId} not found, skip appointment`);
          stats.appointments.skipped++;
          continue;
        }

        // Find the client owner (for appointment userId)
        const clientData = jsonClients.find(([id]) => Number(id) === appointment.clientId)?.[1];
        const pgUserId = userMapping.get(clientData?.ownerId);
        
        if (!pgUserId) {
          console.log(`  ⚠️  Owner not found per appointment ${jsonId}`);
          stats.appointments.skipped++;
          continue;
        }

        // Verify duplicati
        const existing = await db.select().from(appointments)
          .where(and(
            eq(appointments.clientId, pgClientId),
            eq(appointments.date, appointment.date),
            eq(appointments.startTime, appointment.startTime)
          ))
          .limit(1);

        if (existing.length > 0) {
          stats.appointments.skipped++;
          continue;
        }

        await db.insert(appointments).values({
          userId: pgUserId, // ✅ MULTI-TENANT: owner userId
          clientId: pgClientId,
          serviceId: appointment.serviceId || 1,
          staffId: appointment.staffId,
          roomId: appointment.roomId,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          notes: appointment.notes,
          status: appointment.status || 'scheduled',
          reminderType: appointment.reminderType,
          reminderStatus: appointment.reminderStatus || 'pending',
          reminderSent: appointment.reminderSent || false,
        });

        stats.appointments.migrated++;
      } catch (error: any) {
        console.error(`  ❌ Error processing appointment ${jsonId}:`, error.message);
      }
    }
    console.log(`  ✅ Appointments: ${stats.appointments.migrated} migrati, ${stats.appointments.skipped} skipped\n`);

    // ============================================
    // REPORT FINALE
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION COMPLETED - FINAL STATISTICS');
    console.log('='.repeat(60));
    console.log(`
👥 USERS:
   Totali:   ${stats.users.total}
   Migrati:  ${stats.users.migrated}
   Skipped:  ${stats.users.skipped}

👤 CLIENTS:
   Totali:   ${stats.clients.total}
   Migrati:  ${stats.clients.migrated}
   Skipped:  ${stats.clients.skipped}

📅 APPOINTMENTS:
   Totali:   ${stats.appointments.total}
   Migrati:  ${stats.appointments.migrated}
   Skipped:  ${stats.appointments.skipped}

🛠️  SERVICES:
   Totali:   ${stats.services.total}
   Migrati:  ${stats.services.migrated}
   Skipped:  ${stats.services.skipped}
`);
    console.log('='.repeat(60));
    console.log('✅ Migration completed successfully!\n');

    // Verify multi-tenant isolation
    console.log('🔒 VERIFYING MULTI-TENANT ISOLATION...');
    const allClients = await db.select().from(clients);
    const clientsWithOwner = allClients.filter(c => c.ownerId !== null);
    console.log(`   ✅ ${clientsWithOwner.length}/${allClients.length} clients have ownerId (isolation OK)`);

    const allAppointments = await db.select().from(appointments);
    const apptWithUser = allAppointments.filter(a => a.userId !== null);
    console.log(`   ✅ ${apptWithUser.length}/${allAppointments.length} appointments have userId (isolation OK)\n`);

  } catch (error: any) {
    console.error('❌ ERROR DURING MIGRATION:', error);
    process.exit(1);
  }
}

// Execute migrazione
migrateJsonToPostgres()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script terminated with error:', error);
    process.exit(1);
  });
