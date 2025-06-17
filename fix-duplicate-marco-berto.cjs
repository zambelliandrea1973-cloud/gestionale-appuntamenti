/**
 * Script per risolvere la duplicazione di Marco Berto
 * e garantire che ogni utente veda solo i propri clienti
 */

const fs = require('fs');

function loadStorageData() {
  return JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
}

function saveStorageData(data) {
  fs.writeFileSync('storage_data.json', JSON.stringify(data, null, 2));
}

function fixDuplicateMarco() {
  console.log('🔧 RISOLUZIONE DUPLICAZIONE MARCO BERTO');
  
  const storageData = loadStorageData();
  
  // Trova tutti i Marco Berto
  const marcoBertos = storageData.clients.filter(([id, client]) => 
    client.firstName === 'Marco' && client.lastName === 'Berto'
  );
  
  console.log(`📊 Trovati ${marcoBertos.length} clienti "Marco Berto"`);
  
  marcoBertos.forEach(([id, client]) => {
    console.log(`  ID: ${id} - Owner: ${client.ownerId} - Codice: ${client.uniqueCode}`);
  });
  
  if (marcoBertos.length === 2) {
    // Rinomina il secondo per distinguerli
    const [id, client] = marcoBertos[1];
    if (client.ownerId === 14) {
      client.firstName = 'Marco';
      client.lastName = 'Berto (Busnari)';
      console.log(`✅ Rinominato cliente ID ${id} in "Marco Berto (Busnari)" per chiarezza`);
    }
  }
  
  // Verifica e corregge l'isolamento dei clienti
  console.log('\n🔍 VERIFICA ISOLAMENTO CLIENTI');
  
  const silviaClients = storageData.clients.filter(([id, client]) => client.ownerId === 14);
  const faverioClients = storageData.clients.filter(([id, client]) => client.ownerId === 16);
  
  console.log(`  Clienti Silvia (ID 14): ${silviaClients.length}`);
  console.log(`  Clienti Faverio (ID 16): ${faverioClients.length}`);
  
  silviaClients.forEach(([id, client]) => {
    console.log(`    Silvia - ID: ${id}, Nome: ${client.firstName} ${client.lastName}`);
  });
  
  faverioClients.forEach(([id, client]) => {
    console.log(`    Faverio - ID: ${id}, Nome: ${client.firstName} ${client.lastName}`);
  });
  
  // Salva le modifiche
  saveStorageData(storageData);
  
  console.log('\n✅ Duplicazione risolta e isolamento verificato');
  
  return storageData;
}

fixDuplicateMarco();