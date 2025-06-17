/**
 * Script per ripristinare la coerenza del sistema
 * Risolve i problemi di:
 * - Utenti duplicati
 * - Ruoli inconsistenti 
 * - Dati client disallineati
 * - Cache corrotta
 */

const fs = require('fs');
const path = require('path');

function loadStorageData() {
  try {
    const data = fs.readFileSync('storage_data.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Errore caricamento dati:', error);
    return {};
  }
}

function saveStorageData(data) {
  try {
    fs.writeFileSync('storage_data.json', JSON.stringify(data, null, 2));
    console.log('✅ Dati salvati correttamente');
  } catch (error) {
    console.error('❌ Errore salvataggio dati:', error);
  }
}

function createBackup() {
  const timestamp = Date.now();
  const backupPath = `storage_data_backup_${timestamp}.json`;
  try {
    fs.copyFileSync('storage_data.json', backupPath);
    console.log(`📦 Backup creato: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('❌ Errore creazione backup:', error);
    return null;
  }
}

function fixSystemConsistency() {
  console.log('🔧 INIZIO RIPARAZIONE SISTEMA');
  
  // Crea backup
  const backupPath = createBackup();
  if (!backupPath) {
    console.error('❌ Impossibile creare backup, operazione annullata');
    return false;
  }
  
  const storageData = loadStorageData();
  
  console.log('🔍 ANALISI DATI CORRENTI:');
  
  // 1. RIPARAZIONE UTENTI
  console.log('\n1. RIPARAZIONE UTENTI:');
  
  if (!storageData.users) storageData.users = [];
  
  // Trova tutti gli utenti busnari.silvia@libero.it
  const busnarUsers = storageData.users.filter(([id, user]) => 
    user.email === 'busnari.silvia@libero.it' || user.username === 'busnari.silvia@libero.it'
  );
  
  console.log(`📊 Trovati ${busnarUsers.length} utenti busnari:`, busnarUsers.map(([id, user]) => ({
    id, 
    email: user.email || user.username, 
    type: user.type
  })));
  
  // Mantieni solo l'utente ID 14 con tipo "staff"
  storageData.users = storageData.users.filter(([id, user]) => {
    if ((user.email === 'busnari.silvia@libero.it' || user.username === 'busnari.silvia@libero.it') && id !== 14) {
      console.log(`🗑️ Rimosso utente duplicato ID ${id}`);
      return false;
    }
    return true;
  });
  
  // Assicurati che l'utente ID 14 sia corretto
  const user14Index = storageData.users.findIndex(([id]) => id === 14);
  if (user14Index >= 0) {
    storageData.users[user14Index][1] = {
      id: 14,
      username: 'busnari.silvia@libero.it',
      email: 'busnari.silvia@libero.it',
      type: 'staff',
      createdAt: storageData.users[user14Index][1].createdAt || new Date().toISOString()
    };
    console.log('✅ Utente ID 14 normalizzato come staff');
  } else {
    // Crea l'utente se non esiste
    storageData.users.push([14, {
      id: 14,
      username: 'busnari.silvia@libero.it',
      email: 'busnari.silvia@libero.it',
      type: 'staff',
      createdAt: new Date().toISOString()
    }]);
    console.log('✅ Utente ID 14 creato come staff');
  }
  
  // 2. RIPARAZIONE CLIENTI
  console.log('\n2. RIPARAZIONE CLIENTI:');
  
  if (!storageData.clients) storageData.clients = [];
  
  console.log(`📊 Clienti totali nel sistema: ${storageData.clients.length}`);
  
  // Assicurati che tutti i clienti dell'utente 14 abbiano ownerId corretto
  let clientsFixed = 0;
  storageData.clients = storageData.clients.map(([id, client]) => {
    if (client.ownerId === 14 || 
        (client.ownerId === 11 && (client.email === 'busnari.silvia@libero.it' || !client.ownerId))) {
      client.ownerId = 14;
      clientsFixed++;
    }
    return [id, client];
  });
  
  console.log(`✅ ${clientsFixed} clienti assegnati correttamente all'utente 14`);
  
  // Rimuovi clienti orfani o inconsistenti
  const validUserIds = new Set(storageData.users.map(([id]) => id));
  const initialClientCount = storageData.clients.length;
  
  storageData.clients = storageData.clients.filter(([id, client]) => {
    if (!validUserIds.has(client.ownerId)) {
      console.log(`🗑️ Rimosso cliente orfano: ${client.firstName} ${client.lastName} (owner: ${client.ownerId})`);
      return false;
    }
    return true;
  });
  
  console.log(`📊 Clienti dopo pulizia: ${storageData.clients.length} (rimossi: ${initialClientCount - storageData.clients.length})`);
  
  // 3. PULIZIA SESSIONI E CACHE
  console.log('\n3. PULIZIA SESSIONI:');
  
  // Rimuovi dati di sessione inconsistenti
  if (storageData.sessions) {
    delete storageData.sessions;
    console.log('🗑️ Cache sessioni rimossa');
  }
  
  if (storageData.userAppointments) {
    // Mantieni solo appuntamenti per utenti validi
    Object.keys(storageData.userAppointments).forEach(userId => {
      if (!validUserIds.has(parseInt(userId))) {
        delete storageData.userAppointments[userId];
        console.log(`🗑️ Appuntamenti rimossi per utente inesistente: ${userId}`);
      }
    });
  }
  
  // 4. VERIFICA FINALE
  console.log('\n4. VERIFICA FINALE:');
  
  const user14Final = storageData.users.find(([id]) => id === 14);
  const user14Clients = storageData.clients.filter(([id, client]) => client.ownerId === 14);
  
  console.log('📊 STATO FINALE:');
  console.log(`👤 Utente ID 14: ${user14Final ? 'OK' : 'MANCANTE'}`);
  if (user14Final) {
    console.log(`   Email: ${user14Final[1].email}`);
    console.log(`   Tipo: ${user14Final[1].type}`);
  }
  console.log(`📋 Clienti utente 14: ${user14Clients.length}`);
  user14Clients.forEach(([id, client]) => {
    console.log(`   - ${client.firstName} ${client.lastName} (ID: ${id})`);
  });
  
  // Salva i dati riparati
  saveStorageData(storageData);
  
  console.log('\n✅ RIPARAZIONE COMPLETATA');
  console.log(`📦 Backup disponibile in: ${backupPath}`);
  
  return true;
}

// Esegui la riparazione
if (require.main === module) {
  console.log('🚀 Avvio riparazione sistema...\n');
  
  const success = fixSystemConsistency();
  
  if (success) {
    console.log('\n🎉 Sistema riparato con successo!');
    console.log('🔄 Riavvia l\'applicazione per applicare le modifiche');
  } else {
    console.log('\n❌ Riparazione fallita');
  }
}

module.exports = { fixSystemConsistency };