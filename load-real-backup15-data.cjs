#!/usr/bin/env node

/**
 * Caricamento dati reali dal backup15 nel sistema lineare semplificato
 * Sostituisce i clienti inventati con quelli autentici dal storage_data.json
 */

const fs = require('fs');

console.log('🔄 Caricamento dati reali dal backup15...');

try {
  // Leggi i dati reali dal storage_data.json
  const realData = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
  
  console.log(`📊 Trovati ${realData.clients.length} clienti reali nel backup`);
  
  // Estrai solo i clienti con dati autentici (non di test)
  const authenticClients = realData.clients
    .filter(([id, client]) => {
      // Filtra clienti di test e account temporanei
      const isTestClient = client.firstName?.toLowerCase().includes('test') ||
                          client.lastName?.toLowerCase().includes('test') ||
                          client.firstName?.toLowerCase().includes('trial') ||
                          client.firstName?.toLowerCase().includes('pro') ||
                          client.firstName?.toLowerCase().includes('business') ||
                          client.firstName?.toLowerCase().includes('cliente');
      return !isTestClient && client.firstName && client.lastName;
    })
    .slice(0, 15); // Prendi i primi 15 clienti autentici
  
  console.log(`✅ Selezionati ${authenticClients.length} clienti autentici`);
  
  // Genera il codice per il sistema lineare
  const clientsCode = authenticClients.map(([origId, client], index) => {
    const newId = index + 1;
    return `      { id: ${newId}, userId: 3, firstName: "${client.firstName}", lastName: "${client.lastName}", phone: "${client.phone || ''}", email: "${client.email || ''}", address: "${client.address || ''}", birthday: "${client.birthday || ''}", notes: "${client.notes || ''}", isFrequent: ${client.isFrequent || false}, medicalNotes: "", allergies: "${client.allergies || ''}", hasConsent: ${client.hasConsent || false}, createdAt: new Date("${client.createdAt || new Date().toISOString()}"), uniqueCode: "${client.firstName.charAt(0).toUpperCase()}${client.lastName.charAt(0).toUpperCase()}${String(newId).padStart(3, '0')}" }`;
  }).join(',\n');

  // Leggi il file storage.ts attuale
  let storageContent = fs.readFileSync('server/storage.ts', 'utf8');
  
  // Trova e sostituisci la sezione initRealClientsData
  const startMarker = '  // Dati reali dai backup esistenti - CLIENTI ADMIN (ID 3)';
  const endMarker = '    ];';
  
  const startIndex = storageContent.indexOf(startMarker);
  if (startIndex === -1) {
    console.log('❌ Sezione initRealClientsData non trovata');
    process.exit(1);
  }
  
  const methodStart = storageContent.indexOf('private initRealClientsData() {', startIndex);
  const arrayStart = storageContent.indexOf('const realClientsForAdmin = [', methodStart);
  const arrayEnd = storageContent.indexOf('];', arrayStart) + 2;
  
  if (methodStart === -1 || arrayStart === -1 || arrayEnd === -1) {
    console.log('❌ Struttura del metodo non trovata');
    process.exit(1);
  }
  
  // Costruisci la nuova sezione
  const newSection = `  // Dati reali dal backup15 - CLIENTI AUTENTICI
  private initRealClientsData() {
    const realClientsForAdmin = [
${clientsCode}
    ];`;
  
  // Sostituisci nel file
  const before = storageContent.substring(0, startIndex);
  const after = storageContent.substring(arrayEnd);
  const newContent = before + newSection + after;
  
  // Scrivi il file aggiornato
  fs.writeFileSync('server/storage.ts', newContent);
  
  console.log('✅ Dati reali caricati con successo!');
  console.log(`📋 Clienti autentici caricati:`);
  
  authenticClients.forEach(([origId, client], index) => {
    console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} - ${client.phone}`);
  });
  
  console.log('\n🚀 Sistema pronto con dati reali dal backup15!');
  
} catch (error) {
  console.error('❌ Errore durante il caricamento:', error.message);
  process.exit(1);
}