/**
 * Script per aggiungere originalOwnerId ai clienti esistenti e creare esempi
 */

const fs = require('fs');

function loadStorageData() {
  try {
    const data = fs.readFileSync('./storage_data.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Errore nel caricamento dei dati:', error);
    return { clients: [], users: [] };
  }
}

function saveStorageData(data) {
  try {
    const timestamp = Date.now();
    if (fs.existsSync('./storage_data.json')) {
      fs.copyFileSync('./storage_data.json', `./storage_data_backup_${timestamp}.json`);
    }
    
    fs.writeFileSync('./storage_data.json', JSON.stringify(data, null, 2));
    console.log(`💾 Dati salvati con backup ${timestamp}`);
  } catch (error) {
    console.error('Errore nel salvataggio:', error);
  }
}

async function addOriginalOwnerIdToClients() {
  console.log('🔧 Aggiunta campo originalOwnerId ai clienti...');
  
  const storage = loadStorageData();
  
  // Trova un ID cliente alto per i nuovi clienti
  let maxId = 0;
  storage.clients.forEach(([id, client]) => {
    if (parseInt(id) > maxId) {
      maxId = parseInt(id);
    }
  });
  
  // Aggiungi alcuni clienti di test con originalOwnerId
  const testClients = [
    [
      maxId + 1,
      {
        "firstName": "Mario",
        "lastName": "Rossi",
        "phone": "3331234567",
        "email": "mario.rossi@test.com",
        "address": "Via Roma 123",
        "birthday": "1980-05-15",
        "notes": "Cliente importato da staff",
        "isFrequent": false,
        "medicalNotes": "",
        "allergies": "",
        "hasConsent": true,
        "userId": 3,
        "ownerId": 3,
        "originalOwnerId": 1,  // Importato da utente 1 (staff)
        "uniqueCode": `IMPORT-${Date.now()}-1`,
        "id": maxId + 1,
        "createdAt": new Date().toISOString()
      }
    ],
    [
      maxId + 2,
      {
        "firstName": "Giulia",
        "lastName": "Verdi",
        "phone": "3337654321",
        "email": "giulia.verdi@test.com",
        "address": "Via Milano 45",
        "birthday": "1975-09-22",
        "notes": "Cliente importata da customer",
        "isFrequent": true,
        "medicalNotes": "Pressione alta",
        "allergies": "Penicillina",
        "hasConsent": true,
        "userId": 3,
        "ownerId": 3,
        "originalOwnerId": 2,  // Importata da utente 2 (customer)
        "uniqueCode": `IMPORT-${Date.now()}-2`,
        "id": maxId + 2,
        "createdAt": new Date().toISOString()
      }
    ],
    [
      maxId + 3,
      {
        "firstName": "Franco",
        "lastName": "Bianchi",
        "phone": "3339876543",
        "email": "franco.bianchi@test.com",
        "address": "Via Napoli 67",
        "birthday": "1990-12-03",
        "notes": "Cliente importato da basic",
        "isFrequent": false,
        "medicalNotes": "",
        "allergies": "Lattosio",
        "hasConsent": true,
        "userId": 3,
        "ownerId": 3,
        "originalOwnerId": 4,  // Importato da utente 4 (basic)
        "uniqueCode": `IMPORT-${Date.now()}-3`,
        "id": maxId + 3,
        "createdAt": new Date().toISOString()
      }
    ]
  ];
  
  // Aggiungi i clienti di test
  testClients.forEach(client => {
    storage.clients.push(client);
    console.log(`✅ Aggiunto ${client[1].firstName} ${client[1].lastName} (originalOwnerId: ${client[1].originalOwnerId})`);
  });
  
  // Salva i dati
  saveStorageData(storage);
  
  console.log(`\n🎯 CLIENTI CON ORIGINALOWNERID AGGIUNTI:`);
  console.log(`- Mario Rossi (originalOwnerId: 1 - dovrebbe essere ARANCIONE)`);
  console.log(`- Giulia Verdi (originalOwnerId: 2 - dovrebbe essere ARANCIONE)`);
  console.log(`- Franco Bianchi (originalOwnerId: 4 - dovrebbe essere ARANCIONE)`);
  console.log(`\n🔍 Ricarica la pagina Clienti per vedere la distinzione!`);
}

addOriginalOwnerIdToClients().catch(console.error);