/**
 * Script per estrarre clienti unici dal backup15 senza duplicati
 * Analizza storage_data.json e trova clienti con nome/telefono/email identici
 */

const fs = require('fs');

function extractUniqueClients() {
  console.log('🔍 Caricamento storage_data.json...');
  
  const storageData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
  const clientsMap = new Map(storageData.clients);
  
  console.log(`📊 Totale clienti nel backup15: ${clientsMap.size}`);
  
  // Mappa per tracciare clienti unici basata su nome+telefono
  const uniqueClients = new Map();
  const duplicates = [];
  
  for (const [id, client] of clientsMap) {
    // Crea chiave unica basata su nome e telefono
    const key = `${client.firstName?.toLowerCase()}_${client.lastName?.toLowerCase()}_${client.phone}`;
    
    if (uniqueClients.has(key)) {
      // Cliente duplicato trovato
      const existing = uniqueClients.get(key);
      duplicates.push({
        key,
        existing: { id: existing.id, name: `${existing.firstName} ${existing.lastName}`, phone: existing.phone },
        duplicate: { id: client.id, name: `${client.firstName} ${client.lastName}`, phone: client.phone }
      });
    } else {
      // Primo cliente con questa combinazione
      uniqueClients.set(key, client);
    }
  }
  
  console.log(`✅ Clienti unici: ${uniqueClients.size}`);
  console.log(`🔄 Duplicati trovati: ${duplicates.length}`);
  
  // Mostra alcuni esempi di duplicati
  console.log('\n📋 Esempi di duplicati trovati:');
  duplicates.slice(0, 10).forEach(dup => {
    console.log(`- ${dup.existing.name} (ID: ${dup.existing.id}) = ${dup.duplicate.name} (ID: ${dup.duplicate.id})`);
  });
  
  // Crea lista clienti unici per il sistema lineare
  const uniqueClientsList = Array.from(uniqueClients.values())
    .filter(client => client.firstName && client.lastName && client.phone)
    .slice(0, 30) // Prendi primi 30 clienti unici
    .map((client, index) => ({
      id: index + 1,
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      email: client.email || ""
    }));
    
  console.log(`\n🎯 Clienti unici selezionati per il sistema: ${uniqueClientsList.length}`);
  
  // Salva la lista
  fs.writeFileSync('unique-clients.json', JSON.stringify(uniqueClientsList, null, 2));
  
  // Mostra lista completa
  console.log('\n📝 Lista clienti unici:');
  uniqueClientsList.forEach(client => {
    console.log(`${client.id}. ${client.firstName} ${client.lastName} - ${client.phone} - ${client.email}`);
  });
  
  return uniqueClientsList;
}

// Esegui estrazione
if (require.main === module) {
  extractUniqueClients();
}

module.exports = { extractUniqueClients };