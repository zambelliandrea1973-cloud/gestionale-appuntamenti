/**
 * Script per creare clienti di test con originalOwnerId per testare 
 * l'identificazione visiva dei clienti importati da altri account
 */

const fs = require('fs');

function loadStorageData() {
  try {
    if (fs.existsSync('./storage_data.json')) {
      const data = fs.readFileSync('./storage_data.json', 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Errore nel caricamento dei dati:', error);
  }
  return { clients: new Map(), users: new Map() };
}

function saveStorageData(data) {
  try {
    // Backup dei dati attuali
    const timestamp = Date.now();
    if (fs.existsSync('./storage_data.json')) {
      fs.copyFileSync('./storage_data.json', `./storage_data_backup_${timestamp}.json`);
    }
    
    // Converti Map in array per la serializzazione
    const serializable = {
      clients: Array.from(data.clients.entries()),
      users: Array.from(data.users.entries())
    };
    
    fs.writeFileSync('./storage_data.json', JSON.stringify(serializable, null, 2));
    console.log(`💾 Dati salvati correttamente con backup ${timestamp}`);
  } catch (error) {
    console.error('Errore nel salvataggio:', error);
  }
}

async function createTestImportedClients() {
  console.log('📦 Creazione clienti di test per testare identificazione clienti importati...');
  
  const storage = loadStorageData();
  
  // Converti array in Map se necessario
  if (Array.isArray(storage.clients)) {
    storage.clients = new Map(storage.clients);
  }
  if (Array.isArray(storage.users)) {
    storage.users = new Map(storage.users);
  }
  
  // Trova l'ID admin (tipo admin)
  let adminId = null;
  for (const [id, user] of storage.users) {
    if (user.type === 'admin') {
      adminId = id;
      break;
    }
  }
  
  if (!adminId) {
    console.error('❌ Nessun utente admin trovato');
    return;
  }
  
  console.log(`👑 Admin trovato con ID: ${adminId}`);
  
  // Trova l'ID del prossimo cliente
  let nextClientId = 1;
  for (const [id] of storage.clients) {
    if (parseInt(id) >= nextClientId) {
      nextClientId = parseInt(id) + 1;
    }
  }
  
  // Crea clienti di test "importati" con originalOwnerId diversi
  const testImportedClients = [
    {
      id: nextClientId++,
      userId: adminId, // Appartengono all'admin nel database
      ownerId: adminId, // Appartengono all'admin
      originalOwnerId: 1, // Ma provengono da utente ID 1 (staff)
      firstName: "Mario",
      lastName: "Rossi",
      phone: "3331234567",
      email: "mario.rossi@email.com",
      address: "Via Roma 123",
      birthday: "1980-05-15",
      notes: "Cliente importato da account staff",
      isFrequent: false,
      medicalNotes: "",
      allergies: "",
      hasConsent: true,
      assignmentCode: null,
      uniqueCode: `IMPORT-${Date.now()}-1`,
      createdAt: new Date().toISOString()
    },
    {
      id: nextClientId++,
      userId: adminId,
      ownerId: adminId,
      originalOwnerId: 2, // Proviene da utente ID 2 (customer)
      firstName: "Giulia",
      lastName: "Verdi",
      phone: "3337654321",
      email: "giulia.verdi@email.com",
      address: "Via Milano 45",
      birthday: "1975-09-22",
      notes: "Cliente importato da account customer",
      isFrequent: true,
      medicalNotes: "Pressione alta",
      allergies: "Penicillina",
      hasConsent: true,
      assignmentCode: null,
      uniqueCode: `IMPORT-${Date.now()}-2`,
      createdAt: new Date().toISOString()
    },
    {
      id: nextClientId++,
      userId: adminId,
      ownerId: adminId,
      originalOwnerId: 4, // Proviene da utente ID 4 (basic)
      firstName: "Franco",
      lastName: "Bianchi",
      phone: "3339876543",
      email: "franco.bianchi@email.com",
      address: "Via Napoli 67",
      birthday: "1990-12-03",
      notes: "Cliente importato da account basic",
      isFrequent: false,
      medicalNotes: "",
      allergies: "Lattosio",
      hasConsent: true,
      assignmentCode: null,
      uniqueCode: `IMPORT-${Date.now()}-3`,
      createdAt: new Date().toISOString()
    },
    {
      id: nextClientId++,
      userId: adminId,
      ownerId: adminId,
      originalOwnerId: null, // Cliente proprio dell'admin (nessun import)
      firstName: "Anna",
      lastName: "Neri",
      phone: "3334567890",
      email: "anna.neri@email.com",
      address: "Via Torino 89",
      birthday: "1985-03-18",
      notes: "Cliente proprio dell'admin",
      isFrequent: true,
      medicalNotes: "Diabete tipo 2",
      allergies: "",
      hasConsent: true,
      assignmentCode: null,
      uniqueCode: `OWN-${Date.now()}-4`,
      createdAt: new Date().toISOString()
    }
  ];
  
  // Aggiungi i clienti al storage
  testImportedClients.forEach(client => {
    storage.clients.set(client.id.toString(), client);
    console.log(`✅ Creato cliente ${client.firstName} ${client.lastName} (originalOwnerId: ${client.originalOwnerId || 'null'})`);
  });
  
  // Salva i dati
  saveStorageData(storage);
  
  console.log(`\n🎯 CLIENTI DI TEST CREATI:`);
  console.log(`- Mario Rossi (ARANCIONE - importato da staff ID 1)`);
  console.log(`- Giulia Verdi (ARANCIONE - importata da customer ID 2)`);
  console.log(`- Franco Bianchi (ARANCIONE - importato da basic ID 4)`);
  console.log(`- Anna Neri (NORMALE - cliente proprio admin)`);
  console.log(`\n🔍 Ora naviga alla pagina Clienti per vedere la distinzione visiva!`);
}

// Esegui lo script
createTestImportedClients().catch(console.error);