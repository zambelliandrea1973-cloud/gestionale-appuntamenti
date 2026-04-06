// @ts-nocheck
import { db } from './db';
import { appointments, services, clients, users } from '../shared/schema';
import { loadStorageData } from './utils/jsonStorage';
import { eq, and } from 'drizzle-orm';

/**
 * Fix per gli appuntamenti con serviceId troppo grande
 * Crea mapping serviceId JSON → serviceId PostgreSQL
 */

async function fixAppointmentsServiceId() {
  console.log('🔧 FIX APPOINTMENTS - Rimapping serviceId\n');
  
  const jsonData = loadStorageData();
  const jsonAppointments = jsonData.appointments || [];
  const jsonClients = jsonData.clients || [];
  const jsonUsers = jsonData.users || [];
  
  // Step 1: Crea mapping user JSON → PostgreSQL
  const userMapping = new Map<number, number>();
  for (const [jsonId, user] of jsonUsers) {
    const pgUser = await db.select().from(users).where(eq(users.username, user.username)).limit(1);
    if (pgUser.length > 0) {
      userMapping.set(Number(jsonId), pgUser[0].id);
    }
  }
  
  // Step 2: Crea mapping client JSON → PostgreSQL  
  const clientMapping = new Map<number, number>();
  for (const [jsonId, client] of jsonClients) {
    if (client.uniqueCode) {
      const pgClient = await db.select().from(clients).where(eq(clients.uniqueCode, client.uniqueCode)).limit(1);
      if (pgClient.length > 0) {
        clientMapping.set(Number(jsonId), pgClient[0].id);
      }
    }
  }
  
  // Step 3: Per ogni utente, crea mapping serviceId JSON → PostgreSQL
  const serviceMapping = new Map<string, number>(); // key = "userId-jsonServiceId"
  
  const userServices = jsonData.userServices || {};
  for (const [userJsonId, servicesList] of Object.entries(userServices)) {
    const pgUserId = userMapping.get(Number(userJsonId));
    if (!pgUserId) continue;
    
    // Ottieni servizi PostgreSQL per questo utente
    const pgServices = await db.select().from(services).where(eq(services.userId, pgUserId));
    
    for (const jsonService of servicesList as any[]) {
      // Trova servizio corrispondente in PostgreSQL (by name + userId)
      const pgService = pgServices.find(s => s.name === jsonService.name);
      
      if (pgService) {
        const key = `${pgUserId}-${jsonService.id}`;
        serviceMapping.set(key, pgService.id);
        console.log(`  📌 Mapping: JSON service ${jsonService.id} (${jsonService.name}) → PG ${pgService.id}`);
      }
    }
  }
  
  console.log(`\n📊 Mapping creato: ${serviceMapping.size} servizi mappati\n`);
  
  // Step 4: Migra appuntamenti con serviceId rimappato
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  console.log('📅 Migrazione appuntamenti con serviceId corretto...\n');
  
  for (const [jsonId, appointment] of jsonAppointments) {
    try {
      // Trova client PostgreSQL
      const pgClientId = clientMapping.get(appointment.clientId);
      if (!pgClientId) {
        skipped++;
        continue;
      }
      
      // Trova owner
      const clientData = jsonClients.find(([id]) => Number(id) === appointment.clientId)?.[1];
      if (!clientData) {
        skipped++;
        continue;
      }
      
      const pgUserId = userMapping.get(clientData.ownerId);
      if (!pgUserId) {
        skipped++;
        continue;
      }
      
      // 🔑 RIMAPPA serviceId
      const serviceKey = `${pgUserId}-${appointment.serviceId}`;
      const pgServiceId = serviceMapping.get(serviceKey);
      
      if (!pgServiceId) {
        console.log(`  ⚠️  Service ${appointment.serviceId} non trovato per user ${pgUserId}, skip`);
        skipped++;
        continue;
      }
      
      // Verifica duplicati
      const existing = await db.select().from(appointments)
        .where(and(
          eq(appointments.clientId, pgClientId),
          eq(appointments.date, appointment.date),
          eq(appointments.startTime, appointment.startTime)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      
      // Inserisci con serviceId rimappato
      await db.insert(appointments).values({
        userId: pgUserId,
        clientId: pgClientId,
        serviceId: pgServiceId, // ✅ ID PostgreSQL corretto
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
      
      migrated++;
      console.log(`  ✅ Appointment migrato: ${appointment.date} ${appointment.startTime} (service: ${pgServiceId})`);
      
    } catch (error: any) {
      console.error(`  ❌ Errore appointment ${jsonId}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 FIX COMPLETATO');
  console.log(`${'='.repeat(60)}`);
  console.log(`
✅ Migrati:  ${migrated}
⏭️  Skipped:  ${skipped}
❌ Errori:   ${errors}
`);
  
  // Verifica finale per Silvia
  const silviaUser = await db.select().from(users).where(eq(users.username, 'busnari.silvia@libero.it')).limit(1);
  if (silviaUser.length > 0) {
    const silviaAppts = await db.select().from(appointments).where(eq(appointments.userId, silviaUser[0].id));
    console.log(`📋 Silvia Busnari ha ora ${silviaAppts.length} appuntamenti in PostgreSQL\n`);
  }
}

// Esegui fix
fixAppointmentsServiceId()
  .then(() => {
    console.log('✨ Fix completato con successo');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Errore durante il fix:', error);
    process.exit(1);
  });
