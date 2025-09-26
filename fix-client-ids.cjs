const fs = require('fs');

// Leggi il file storage
const storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));

console.log('🔍 Iniziando normalizzazione ID clienti...');

// Trova e aggiorna Marco Berto (1750177330362 → 14003)
let marcoUpdated = false;
let brunaUpdated = false;

for (let i = 0; i < storageData.clients.length; i++) {
  const [currentId, client] = storageData.clients[i];
  
  // Marco Berto
  if (currentId === 1750177330362 && client.firstName === 'Marco' && client.lastName === 'Berto') {
    console.log(`🔄 AGGIORNANDO Marco Berto: ${currentId} → 14003`);
    
    // Aggiorna ID e uniqueCode
    client.id = 14003;
    client.uniqueCode = 'PROF_014_9C1F_CLIENT_14003_816C';
    
    // Aggiorna l'array entry
    storageData.clients[i] = [14003, client];
    marcoUpdated = true;
  }
  
  // Bruna Pizzolato  
  if (currentId === 1750163505034 && client.firstName === 'Bruna ' && client.lastName === 'Pizzolato') {
    console.log(`🔄 AGGIORNANDO Bruna Pizzolato: ${currentId} → 14004`);
    
    // Aggiorna ID e uniqueCode
    client.id = 14004;
    client.uniqueCode = 'PROF_014_9C1F_CLIENT_14004_340F';
    
    // Aggiorna l'array entry
    storageData.clients[i] = [14004, client];
    brunaUpdated = true;
  }
}

// Aggiorna anche gli appuntamenti che riferiscono a questi clienti
let appointmentsUpdated = 0;
if (storageData.appointments) {
  for (let appointment of storageData.appointments) {
    const [id, appointmentData] = appointment;
    
    if (appointmentData.clientId === 1750177330362) {
      appointmentData.clientId = 14003;
      appointmentsUpdated++;
      console.log(`📅 Aggiornato appuntamento ${id}: clientId → 14003`);
    }
    
    if (appointmentData.clientId === 1750163505034) {
      appointmentData.clientId = 14004;
      appointmentsUpdated++;
      console.log(`📅 Aggiornato appuntamento ${id}: clientId → 14004`);
    }
  }
}

// Salva il file aggiornato
fs.writeFileSync('storage_data.json', JSON.stringify(storageData, null, 2));

console.log(`✅ NORMALIZZAZIONE COMPLETATA!`);
console.log(`   - Marco Berto: ${marcoUpdated ? 'AGGIORNATO' : 'NON TROVATO'}`);
console.log(`   - Bruna Pizzolato: ${brunaUpdated ? 'AGGIORNATO' : 'NON TROVATO'}`);
console.log(`   - Appuntamenti aggiornati: ${appointmentsUpdated}`);

if (marcoUpdated && brunaUpdated) {
  console.log('🎯 TUTTI I CLIENTI HANNO NUMERAZIONE COERENTE: 14001, 14002, 14003, 14004');
} else {
  console.log('❌ Alcuni clienti non sono stati trovati/aggiornati');
}