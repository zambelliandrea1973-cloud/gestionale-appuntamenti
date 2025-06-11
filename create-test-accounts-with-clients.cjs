/**
 * Script per creare account di test con clienti per dimostrare la separazione dati
 */

const fs = require('fs');
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

function generateUniqueCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function createTestAccountsWithClients() {
  try {
    // Carica i dati esistenti
    const storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
    
    console.log('📊 Dati attuali - Utenti:', Object.keys(storageData.users || {}).length);
    console.log('📊 Dati attuali - Clienti:', (storageData.clients || []).length);
    
    // Crea utenti di test
    const testUsers = [
      { id: 101, username: "staff.test@example.com", email: "staff.test@example.com", type: "staff" },
      { id: 102, username: "customer.test@example.com", email: "customer.test@example.com", type: "customer" },
      { id: 103, username: "basic.test@example.com", email: "basic.test@example.com", type: "basic" }
    ];
    
    // Assicurati che esistano le strutture
    if (!storageData.users) storageData.users = {};
    if (!storageData.clients) storageData.clients = [];
    
    // Password hash per tutti gli utenti di test
    const testPasswordHash = await hashPassword('test123');
    
    // Aggiungi utenti se non esistono già
    for (const user of testUsers) {
      if (!storageData.users[user.id]) {
        storageData.users[user.id] = {
          ...user,
          password: testPasswordHash,
          firstName: null,
          lastName: null
        };
        console.log(`✅ Creato utente ${user.type}: ${user.username} (ID: ${user.id})`);
      } else {
        console.log(`⏭️ Utente ${user.username} già esistente (ID: ${user.id})`);
      }
    }
    
    // Crea clienti per ogni utente di test
    let nextClientId = Math.max(...storageData.clients.map(([id]) => id), 1000) + 1;
    
    const clientsPerUser = {
      101: [ // Staff
        { firstName: "Marco", lastName: "Bianchi", phone: "3331111111", email: "marco.bianchi@staff.com" },
        { firstName: "Sara", lastName: "Neri", phone: "3332222222", email: "sara.neri@staff.com" }
      ],
      102: [ // Customer  
        { firstName: "Luigi", lastName: "Verdi", phone: "3333333333", email: "luigi.verdi@customer.com" },
        { firstName: "Anna", lastName: "Blu", phone: "3334444444", email: "anna.blu@customer.com" },
        { firstName: "Paolo", lastName: "Rosso", phone: "3335555555", email: "paolo.rosso@customer.com" }
      ],
      103: [ // Basic
        { firstName: "Elena", lastName: "Giallo", phone: "3336666666", email: "elena.giallo@basic.com" }
      ]
    };
    
    for (const [ownerId, clients] of Object.entries(clientsPerUser)) {
      for (const clientData of clients) {
        // Controlla se il cliente esiste già
        const existingClient = storageData.clients.find(([id, client]) => 
          client.email === clientData.email && client.ownerId === parseInt(ownerId)
        );
        
        if (!existingClient) {
          const newClient = {
            id: nextClientId++,
            ...clientData,
            ownerId: parseInt(ownerId),
            uniqueCode: generateUniqueCode(),
            address: "",
            notes: "",
            createdAt: new Date().toISOString()
          };
          
          storageData.clients.push([newClient.id, newClient]);
          console.log(`👤 Creato cliente ${newClient.firstName} ${newClient.lastName} per utente ${ownerId} (${storageData.users[ownerId].type})`);
        } else {
          console.log(`⏭️ Cliente ${clientData.firstName} ${clientData.lastName} già esistente per utente ${ownerId}`);
        }
      }
    }
    
    // Salva i dati aggiornati
    fs.writeFileSync('storage_data.json', JSON.stringify(storageData, null, 2));
    
    console.log('\n🎉 OPERAZIONE COMPLETATA');
    console.log('📊 Statistiche finali:');
    console.log(`- Utenti totali: ${Object.keys(storageData.users).length}`);
    console.log(`- Clienti totali: ${storageData.clients.length}`);
    
    // Mostra distribuzione clienti per owner
    const clientsByOwner = {};
    storageData.clients.forEach(([id, client]) => {
      const owner = client.ownerId || 'undefined';
      clientsByOwner[owner] = (clientsByOwner[owner] || 0) + 1;
    });
    
    console.log('\n📋 Distribuzione clienti per ownerId:');
    Object.entries(clientsByOwner).forEach(([ownerId, count]) => {
      const user = storageData.users[ownerId];
      const userType = user ? `(${user.type})` : '(unknown)';
      console.log(`  - ownerId ${ownerId} ${userType}: ${count} clienti`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante la creazione degli account di test:', error);
  }
}

createTestAccountsWithClients();