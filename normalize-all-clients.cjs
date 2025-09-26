const fs = require('fs');

// Leggi il file storage
const storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));

console.log('🌍 NORMALIZZAZIONE GLOBALE - Tutti i clienti di tutti i professionisti');

// Analizza tutti i professionisti e i loro clienti
const professionistStats = {};
const clientsToUpdate = [];
const appointmentsToUpdate = [];

// Raccolta dati per professionista
for (let i = 0; i < storageData.clients.length; i++) {
  const [currentId, client] = storageData.clients[i];
  const ownerId = client.ownerId;
  
  if (!professionistStats[ownerId]) {
    professionistStats[ownerId] = {
      clients: [],
      nextSequentialId: ownerId * 1000 + 1 // es: 3001, 9001, 14001, 16001
    };
  }
  
  professionistStats[ownerId].clients.push({
    arrayIndex: i,
    currentId,
    client,
    needsUpdate: String(currentId).length > 5 // timestamp-based IDs have 13 digits
  });
}

console.log('\n📊 STATISTICHE PROFESSIONISTI:');
for (const ownerId in professionistStats) {
  const stats = professionistStats[ownerId];
  const needsUpdateCount = stats.clients.filter(c => c.needsUpdate).length;
  console.log(`   👨‍⚕️ Professionista ${ownerId}: ${stats.clients.length} clienti, ${needsUpdateCount} da normalizzare`);
}

// Normalizzazione per ogni professionista
for (const ownerId in professionistStats) {
  const stats = professionistStats[ownerId];
  let currentSequentialId = stats.nextSequentialId;
  
  console.log(`\n🔄 NORMALIZZANDO Professionista ${ownerId}:`);
  
  for (const clientInfo of stats.clients) {
    if (clientInfo.needsUpdate) {
      const oldId = clientInfo.currentId;
      const newId = currentSequentialId++;
      const client = clientInfo.client;
      
      console.log(`   📝 ${client.firstName} ${client.lastName}: ${oldId} → ${newId}`);
      
      // Aggiorna client
      client.id = newId;
      client.uniqueCode = client.uniqueCode.replace(/_CLIENT_\d+_/, `_CLIENT_${newId}_`);
      
      // Aggiorna l'array entry
      storageData.clients[clientInfo.arrayIndex] = [newId, client];
      
      // Raccogli per aggiornamento appuntamenti
      clientsToUpdate.push({ oldId, newId });
    }
  }
}

// Aggiorna appuntamenti
console.log('\n📅 AGGIORNAMENTO APPUNTAMENTI:');
let appointmentUpdates = 0;

if (storageData.appointments) {
  for (const appointment of storageData.appointments) {
    const [id, appointmentData] = appointment;
    
    for (const update of clientsToUpdate) {
      if (appointmentData.clientId === update.oldId) {
        appointmentData.clientId = update.newId;
        appointmentUpdates++;
        console.log(`   📅 Appuntamento ${id}: clientId ${update.oldId} → ${update.newId}`);
      }
    }
  }
}

// Aggiorna consensi se esistono
console.log('\n📝 AGGIORNAMENTO CONSENSI:');
let consentUpdates = 0;

if (storageData.consents) {
  for (const consent of storageData.consents) {
    for (const update of clientsToUpdate) {
      if (consent.clientId === update.oldId) {
        consent.clientId = update.newId;
        consentUpdates++;
        console.log(`   📝 Consenso ${consent.id}: clientId ${update.oldId} → ${update.newId}`);
      }
    }
  }
}

// Salva il file aggiornato
fs.writeFileSync('storage_data.json', JSON.stringify(storageData, null, 2));

console.log('\n✅ NORMALIZZAZIONE GLOBALE COMPLETATA!');
console.log(`   📊 Clienti normalizzati: ${clientsToUpdate.length}`);
console.log(`   📅 Appuntamenti aggiornati: ${appointmentUpdates}`);
console.log(`   📝 Consensi aggiornati: ${consentUpdates}`);

console.log('\n🎯 PATTERN FINALI PER PROFESSIONISTA:');
for (const ownerId in professionistStats) {
  const stats = professionistStats[ownerId];
  const firstId = ownerId * 1000 + 1;
  const lastId = firstId + stats.clients.length - 1;
  console.log(`   👨‍⚕️ Professionista ${ownerId}: ${firstId} → ${lastId} (${stats.clients.length} clienti)`);
}