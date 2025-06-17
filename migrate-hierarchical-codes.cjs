/**
 * Script di migrazione per implementare codici gerarchici a tutti i clienti esistenti
 */

const fs = require('fs');
const crypto = require('crypto');

// Funzioni di generazione codici (replicate dal server)
function generateProfessionistCode(userId) {
  const paddedId = userId.toString().padStart(3, '0');
  const hash = crypto.createHash('md5').update(`PROF_${userId}_${Date.now()}`).digest('hex').substring(0, 4).toUpperCase();
  return `PROF_${paddedId}_${hash}`;
}

function generateClientCode(ownerId, clientId, storageData) {
  const profCode = getProfessionistCode(ownerId, storageData);
  const paddedClientId = clientId.toString().padStart(3, '0');
  const clientHash = crypto.createHash('md5').update(`CLIENT_${ownerId}_${clientId}_${Date.now()}`).digest('hex').substring(0, 4).toUpperCase();
  return `${profCode}_CLIENT_${paddedClientId}_${clientHash}`;
}

function getProfessionistCode(userId, storageData) {
  if (!storageData.professionistCodes) {
    storageData.professionistCodes = {};
  }
  
  if (!storageData.professionistCodes[userId]) {
    storageData.professionistCodes[userId] = generateProfessionistCode(userId);
  }
  
  return storageData.professionistCodes[userId];
}

function loadStorageData() {
  try {
    return JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
  } catch (error) {
    console.error('Errore caricamento storage:', error);
    return { clients: [], users: {}, professionistCodes: {} };
  }
}

function saveStorageData(data) {
  fs.writeFileSync('storage_data.json', JSON.stringify(data, null, 2));
}

function migrateHierarchicalCodes() {
  console.log('🔄 Avvio migrazione codici gerarchici per tutti i clienti esistenti...');
  
  const storageData = loadStorageData();
  
  // Inizializza strutture se mancanti
  if (!storageData.professionistCodes) {
    storageData.professionistCodes = {};
  }
  
  let migratedClients = 0;
  let createdProfCodes = 0;
  let errors = 0;
  
  // Migra tutti i clienti
  storageData.clients.forEach(([clientId, client]) => {
    try {
      let needsUpdate = false;
      
      // Determina owner ID (fallback a admin se mancante)
      if (!client.ownerId) {
        // Cerca admin nel sistema
        const adminUser = Object.values(storageData.users || {}).find(user => user.type === 'admin');
        if (adminUser) {
          client.ownerId = adminUser.id;
          needsUpdate = true;
          console.log(`📌 Cliente ${clientId} (${client.firstName} ${client.lastName}) assegnato ad admin ${adminUser.id}`);
        } else {
          console.warn(`⚠️ Nessun admin trovato per cliente ${clientId}, salto migrazione`);
          errors++;
          return;
        }
      }
      
      // Genera codice professionista se mancante
      const profCode = getProfessionistCode(client.ownerId);
      if (!storageData.professionistCodes[client.ownerId]) {
        createdProfCodes++;
      }
      
      // Aggiorna codice cliente se mancante o obsoleto
      if (!client.uniqueCode || !client.uniqueCode.match(/^PROF_\d{3}_[A-Z0-9]{4}_CLIENT_\d{3}_[A-Z0-9]{4}$/)) {
        client.uniqueCode = generateClientCode(client.ownerId, clientId);
        client.professionistCode = profCode;
        needsUpdate = true;
        migratedClients++;
        console.log(`✅ Cliente ${clientId} (${client.firstName} ${client.lastName}) migrato: ${client.uniqueCode}`);
      } else {
        console.log(`📋 Cliente ${clientId} già ha codice gerarchico valido: ${client.uniqueCode}`);
      }
      
    } catch (error) {
      console.error(`❌ Errore migrazione cliente ${clientId}:`, error);
      errors++;
    }
  });
  
  // Salva modifiche
  saveStorageData(storageData);
  
  console.log('\n📊 RISULTATI MIGRAZIONE:');
  console.log(`✅ Clienti migrati: ${migratedClients}`);
  console.log(`🔑 Codici professionista creati: ${createdProfCodes}`);
  console.log(`❌ Errori: ${errors}`);
  console.log(`📈 Totale clienti: ${storageData.clients.length}`);
  
  // Mostra alcuni esempi
  console.log('\n🔍 ESEMPI CODICI GENERATI:');
  const sampleClients = storageData.clients.slice(0, 5);
  sampleClients.forEach(([id, client]) => {
    console.log(`Cliente ${id}: ${client.firstName} ${client.lastName} → ${client.uniqueCode || 'NESSUN CODICE'}`);
  });
  
  console.log('\n🏢 CODICI PROFESSIONISTA:');
  Object.entries(storageData.professionistCodes || {}).forEach(([userId, code]) => {
    console.log(`Professionista ${userId}: ${code}`);
  });
  
  console.log('\n✅ Migrazione completata! Tutti i clienti hanno ora codici gerarchici univoci.');
}

// Esegui migrazione
migrateHierarchicalCodes();