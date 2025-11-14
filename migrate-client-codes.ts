import { db } from './server/db';
import { clients, users, codeMigrationCrosswalk } from './shared/schema';
import { eq, isNull, isNotNull, sql } from 'drizzle-orm';

async function migrateClientCodes() {
  console.log('🚀 Inizio migrazione codici clienti...\n');
  
  const allProfessionals = await db.select({
    id: users.id,
    username: users.username,
    assignmentCode: users.assignmentCode
  })
  .from(users)
  .where(isNotNull(users.assignmentCode));
  
  console.log(`📋 Trovati ${allProfessionals.length} professionisti con codice valido\n`);
  
  let totalMigrated = 0;
  let totalSkipped = 0;
  
  for (const professional of allProfessionals) {
    console.log(`\n👨‍⚕️ Professionista: ${professional.username} (${professional.assignmentCode})`);
    
    const professionalClients = await db.select()
      .from(clients)
      .where(eq(clients.ownerId, professional.id))
      .orderBy(clients.id);
    
    console.log(`   📊 Clienti da migrare: ${professionalClients.length}`);
    
    if (professionalClients.length === 0) {
      console.log(`   ⏭️  Nessun cliente, skip`);
      continue;
    }
    
    let sequence = 1;
    
    for (const client of professionalClients) {
      if (client.newUniqueCode) {
        console.log(`   ⚠️  Cliente ${client.id} già migrato: ${client.newUniqueCode}`);
        totalSkipped++;
        continue;
      }
      
      const paddedSequence = sequence.toString().padStart(3, '0');
      const newCode = `${professional.assignmentCode}-${paddedSequence}`;
      
      await db.update(clients)
        .set({ newUniqueCode: newCode })
        .where(eq(clients.id, client.id));
      
      if (client.uniqueCode) {
        await db.insert(codeMigrationCrosswalk)
          .values({
            ownerId: professional.id,
            clientId: client.id,
            oldUniqueCode: client.uniqueCode,
            newUniqueCode: newCode
          });
        
        console.log(`   ✅ ${client.uniqueCode} → ${newCode} (${client.firstName} ${client.lastName})`);
      } else {
        console.log(`   ✅ NULL → ${newCode} (${client.firstName} ${client.lastName})`);
      }
      
      totalMigrated++;
      sequence++;
    }
  }
  
  const professionalsWithoutCode = await db.select({
    id: users.id,
    username: users.username
  })
  .from(users)
  .where(isNull(users.assignmentCode));
  
  if (professionalsWithoutCode.length > 0) {
    console.log(`\n\n⚠️  PROFESSIONISTI SENZA CODICE (clienti NON migrati):`);
    for (const prof of professionalsWithoutCode) {
      const clientCount = await db.select({ count: sql<number>`count(*)` })
        .from(clients)
        .where(eq(clients.ownerId, prof.id));
      
      console.log(`   - ${prof.username} (id: ${prof.id}) → ${clientCount[0].count} clienti`);
      totalSkipped += Number(clientCount[0].count);
    }
  }
  
  console.log(`\n\n📊 RIEPILOGO MIGRAZIONE:`);
  console.log(`   ✅ Migrati: ${totalMigrated} clienti`);
  console.log(`   ⏭️  Skippati: ${totalSkipped} clienti`);
  console.log(`\n✅ Migrazione completata!`);
  
  const sampleCrosswalk = await db.select()
    .from(codeMigrationCrosswalk)
    .limit(5);
  
  console.log(`\n📋 Sample crosswalk (primi 5):`);
  for (const entry of sampleCrosswalk) {
    console.log(`   ${entry.oldUniqueCode} → ${entry.newUniqueCode}`);
  }
  
  process.exit(0);
}

migrateClientCodes().catch((error) => {
  console.error('❌ Errore durante migrazione:', error);
  process.exit(1);
});
