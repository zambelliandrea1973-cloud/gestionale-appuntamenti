/**
 * Scanner per errori di accesso nel sistema
 * Analizza e risolve problemi di accesso ai clienti
 */

const fs = require('fs');
const path = require('path');

function loadStorageData() {
  try {
    const data = fs.readFileSync('storage_data.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Errore nel caricamento storage_data.json:', error.message);
    return { clients: [], users: [] };
  }
}

function saveStorageData(data) {
  try {
    fs.writeFileSync('storage_data.json', JSON.stringify(data, null, 2));
    console.log('✅ File storage_data.json salvato con successo');
  } catch (error) {
    console.error('❌ Errore nel salvataggio storage_data.json:', error.message);
  }
}

function scanAccessErrors() {
  console.log('🔍 SCANNER ERRORI DI ACCESSO');
  console.log('=' .repeat(50));
  
  const storageData = loadStorageData();
  const clients = storageData.clients || [];
  
  console.log(`📊 Totale clienti nel sistema: ${clients.length}`);
  
  // Analisi errori comuni
  const problemClients = [];
  const validClients = [];
  const duplicateIds = new Set();
  const invalidIds = [];
  
  // Mappa per tracciare ID duplicati
  const idMap = new Map();
  
  clients.forEach(([id, clientData], index) => {
    const clientId = id.toString();
    
    // Controlla ID duplicati
    if (idMap.has(clientId)) {
      duplicateIds.add(clientId);
      problemClients.push({
        index,
        id: clientId,
        name: `${clientData.firstName || 'N/A'} ${clientData.lastName || 'N/A'}`,
        problem: 'ID_DUPLICATO',
        data: clientData
      });
    } else {
      idMap.set(clientId, index);
    }
    
    // Controlla ID non validi o mancanti
    if (!id || id === null || id === undefined) {
      invalidIds.push(index);
      problemClients.push({
        index,
        id: 'NULL/UNDEFINED',
        name: `${clientData.firstName || 'N/A'} ${clientData.lastName || 'N/A'}`,
        problem: 'ID_NULLO',
        data: clientData
      });
    }
    
    // Controlla dati cliente mancanti
    if (!clientData || typeof clientData !== 'object') {
      problemClients.push({
        index,
        id: clientId,
        name: 'DATI_MANCANTI',
        problem: 'DATI_CORROTTI',
        data: clientData
      });
    } else {
      // Cliente valido
      validClients.push({
        index,
        id: clientId,
        name: `${clientData.firstName || 'N/A'} ${clientData.lastName || 'N/A'}`,
        accessCount: clientData.accessCount || 0,
        ownerId: clientData.ownerId || 'N/A'
      });
    }
  });
  
  console.log('\n📈 STATISTICHE ERRORI:');
  console.log(`✅ Clienti validi: ${validClients.length}`);
  console.log(`❌ Clienti con problemi: ${problemClients.length}`);
  console.log(`🔄 ID duplicati: ${duplicateIds.size}`);
  console.log(`🚫 ID non validi: ${invalidIds.length}`);
  
  if (problemClients.length > 0) {
    console.log('\n🚨 CLIENTI CON PROBLEMI:');
    problemClients.forEach((client, index) => {
      console.log(`${index + 1}. [${client.problem}] ID: ${client.id} - Nome: ${client.name}`);
    });
  }
  
  // Analizza i clienti che generano errori 404 dai log
  const error404Ids = [
    '1749667437317',
    '1749667437318', 
    '1749667437315',
    '1749667437316'
  ];
  
  console.log('\n🔍 ANALISI ERRORI 404 DAI LOG:');
  error404Ids.forEach(errorId => {
    const found = clients.find(([id, data]) => id.toString() === errorId);
    if (found) {
      console.log(`✅ ID ${errorId} trovato nel database: ${found[1].firstName} ${found[1].lastName}`);
    } else {
      console.log(`❌ ID ${errorId} NON TROVATO nel database`);
    }
  });
  
  return {
    validClients,
    problemClients,
    duplicateIds: Array.from(duplicateIds),
    invalidIds,
    error404Ids,
    totalClients: clients.length
  };
}

function cleanupClientData() {
  console.log('\n🧹 PULIZIA DATI CLIENTI');
  console.log('=' .repeat(30));
  
  const storageData = loadStorageData();
  const originalClients = storageData.clients || [];
  const cleanedClients = [];
  
  console.log(`🔍 Processando ${originalClients.length} clienti...`);
  
  originalClients.forEach(([id, clientData], index) => {
    // Salta clienti con ID nulli o dati corrotti
    if (!id || !clientData || typeof clientData !== 'object') {
      console.log(`🗑️ Rimosso cliente ${index} con ID/dati non validi`);
      return;
    }
    
    // Assicura che tutti i campi essenziali esistano
    const cleanedClient = {
      ...clientData,
      id: parseInt(id) || id,
      firstName: clientData.firstName || '',
      lastName: clientData.lastName || '',
      accessCount: parseInt(clientData.accessCount) || 0,
      ownerId: parseInt(clientData.ownerId) || null
    };
    
    cleanedClients.push([id, cleanedClient]);
  });
  
  console.log(`✅ Clienti puliti: ${cleanedClients.length}`);
  console.log(`🗑️ Clienti rimossi: ${originalClients.length - cleanedClients.length}`);
  
  // Salva dati puliti
  storageData.clients = cleanedClients;
  saveStorageData(storageData);
  
  return cleanedClients;
}

function generateAccessReport() {
  console.log('\n📊 REPORT ACCESSI CLIENTI');
  console.log('=' .repeat(40));
  
  const storageData = loadStorageData();
  const clients = storageData.clients || [];
  
  const accessStats = {
    totalClients: clients.length,
    clientsWithAccess: 0,
    clientsWithoutAccess: 0,
    totalAccesses: 0,
    topClients: []
  };
  
  const clientAccessList = clients.map(([id, clientData]) => {
    const accessCount = parseInt(clientData.accessCount) || 0;
    
    if (accessCount > 0) {
      accessStats.clientsWithAccess++;
    } else {
      accessStats.clientsWithoutAccess++;
    }
    
    accessStats.totalAccesses += accessCount;
    
    return {
      id: id.toString(),
      name: `${clientData.firstName || 'N/A'} ${clientData.lastName || 'N/A'}`,
      accessCount,
      ownerId: clientData.ownerId || null
    };
  });
  
  // Ordina per numero di accessi (discendente)
  const sortedByAccess = clientAccessList
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 10);
  
  accessStats.topClients = sortedByAccess;
  
  console.log(`📊 Clienti totali: ${accessStats.totalClients}`);
  console.log(`✅ Clienti con accessi: ${accessStats.clientsWithAccess}`);
  console.log(`❌ Clienti senza accessi: ${accessStats.clientsWithoutAccess}`);
  console.log(`🔢 Accessi totali: ${accessStats.totalAccesses}`);
  
  console.log('\n🏆 TOP 10 CLIENTI PER ACCESSI:');
  sortedByAccess.forEach((client, index) => {
    console.log(`${index + 1}. ${client.name} (ID: ${client.id}) - ${client.accessCount} accessi`);
  });
  
  return accessStats;
}

async function main() {
  console.log('🚀 AVVIO SCANNER ERRORI DI ACCESSO');
  console.log('=' .repeat(60));
  
  try {
    // 1. Scansiona errori
    const scanResults = scanAccessErrors();
    
    // 2. Genera report accessi
    const accessReport = generateAccessReport();
    
    // 3. Pulizia dati se necessario
    if (scanResults.problemClients.length > 0) {
      console.log('\n❓ Vuoi pulire i dati corrotti? (Esegui con argomento --clean)');
      
      if (process.argv.includes('--clean')) {
        const cleanedClients = cleanupClientData();
        console.log(`✅ Pulizia completata: ${cleanedClients.length} clienti rimanenti`);
      }
    }
    
    console.log('\n✅ SCANNER COMPLETATO');
    console.log('=' .repeat(30));
    
    // Riepilogo finale
    console.log(`📊 Risultati: ${scanResults.validClients.length}/${scanResults.totalClients} clienti validi`);
    console.log(`🔢 Accessi totali registrati: ${accessReport.totalAccesses}`);
    
    if (scanResults.problemClients.length === 0) {
      console.log('🎉 Nessun errore rilevato nel sistema!');
    } else {
      console.log(`⚠️  ${scanResults.problemClients.length} problemi rilevati - usa --clean per risolverli`);
    }
    
  } catch (error) {
    console.error('❌ Errore durante la scansione:', error.message);
    process.exit(1);
  }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  scanAccessErrors,
  cleanupClientData,
  generateAccessReport
};