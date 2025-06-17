/**
 * Script finale per completare la migrazione dei codici gerarchici
 * Gestisce i 2 clienti rimanenti senza owner ID
 */

const fs = require('fs');
const crypto = require('crypto');

function loadStorageData() {
  try {
    return JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
  } catch (error) {
    console.error('Errore caricamento storage:', error);
    return { clients: [], professionistCodes: {}, clientCodes: {} };
  }
}

function saveStorageData(data) {
  fs.writeFileSync('storage_data.json', JSON.stringify(data, null, 2));
}

function generateProfessionistCode(userId) {
  const timestamp = Date.now();
  const hash = crypto.createHash('md5').update(`PROF_${userId}_${timestamp}`).digest('hex').substring(0, 4).toUpperCase();
  return `PROF_${userId.toString().padStart(3, '0')}_${hash}`;
}

function getProfessionistCode(userId, storageData) {
  if (storageData.professionistCodes && storageData.professionistCodes[userId]) {
    return storageData.professionistCodes[userId];
  }
  
  const newCode = generateProfessionistCode(userId);
  
  if (!storageData.professionistCodes) {
    storageData.professionistCodes = {};
  }
  
  storageData.professionistCodes[userId] = newCode;
  console.log(`✅ Nuovo codice professionista generato per utente ${userId}: ${newCode}`);
  return newCode;
}

function generateClientCode(ownerId, clientId, storageData) {
  const profCode = getProfessionistCode(ownerId, storageData);
  const timestamp = Date.now();
  const hash = crypto.createHash('md5').update(`${profCode}_CLIENT_${clientId}_${timestamp}`).digest('hex').substring(0, 4).toUpperCase();
  return `${profCode}_CLIENT_${clientId.toString().padStart(3, '0')}_${hash}`;
}

async function completeFinalMigration() {
  console.log('🚀 AVVIO MIGRAZIONE FINALE CODICI GERARCHICI');
  
  const storageData = loadStorageData();
  
  // Trova clienti senza codici gerarchici
  const clientsWithoutCodes = storageData.clients.filter(([id, client]) => !client.uniqueCode);
  
  console.log(`📊 Clienti da migrare: ${clientsWithoutCodes.length}`);
  
  if (clientsWithoutCodes.length === 0) {
    console.log('✅ Tutti i clienti hanno già codici gerarchici!');
    return;
  }
  
  // Trova un utente admin o staff per assegnare i clienti orfani
  const users = storageData.users || [];
  const adminUser = users.find(([id, user]) => user.type === 'admin');
  const staffUser = users.find(([id, user]) => user.type === 'staff');
  
  const defaultOwnerId = adminUser ? adminUser[0] : (staffUser ? staffUser[0] : 1);
  
  console.log(`🔧 Assegnazione clienti orfani al proprietario predefinito: ${defaultOwnerId}`);
  
  let migratedCount = 0;
  
  for (const [clientId, client] of clientsWithoutCodes) {
    console.log(`\n🔄 Migrazione cliente ${clientId}: ${client.firstName} ${client.lastName}`);
    
    // Assegna owner ID se mancante
    if (!client.ownerId) {
      client.ownerId = defaultOwnerId;
      console.log(`  ✅ Owner ID assegnato: ${defaultOwnerId}`);
    }
    
    // Genera codice gerarchico
    const clientCode = generateClientCode(client.ownerId, clientId, storageData);
    client.uniqueCode = clientCode;
    client.professionistCode = getProfessionistCode(client.ownerId, storageData);
    
    console.log(`  ✅ Codice gerarchico generato: ${clientCode}`);
    migratedCount++;
  }
  
  // Salva i dati aggiornati
  saveStorageData(storageData);
  
  console.log(`\n🎉 MIGRAZIONE COMPLETATA!`);
  console.log(`📈 Clienti migrati: ${migratedCount}`);
  console.log(`✅ Tutti i clienti ora hanno codici gerarchici univoci e indissolubili`);
  
  // Verifica finale
  const finalCheck = loadStorageData();
  const totalClients = finalCheck.clients.length;
  const clientsWithCodes = finalCheck.clients.filter(([id, client]) => client.uniqueCode).length;
  
  console.log(`\n📊 VERIFICA FINALE:`);
  console.log(`   Clienti totali: ${totalClients}`);
  console.log(`   Clienti con codici: ${clientsWithCodes}`);
  console.log(`   Migrazione: ${clientsWithCodes === totalClients ? '✅ COMPLETA' : '⚠️ INCOMPLETA'}`);
}

// Esegui migrazione
completeFinalMigration().catch(console.error);