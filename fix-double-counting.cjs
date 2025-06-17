/**
 * Script per correggere il doppio conteggio degli accessi PWA
 * Dimezza tutti i conteggi esistenti
 */

const fs = require('fs');

function fixDoubleCountingIssue() {
  try {
    // Carica i dati di storage
    const storageData = JSON.parse(fs.readFileSync('./storage_data.json', 'utf8'));
    
    console.log('📊 Inizio correzione conteggi doppi...');
    
    let correctedCount = 0;
    
    // Dimezza tutti i conteggi degli accessi PWA
    if (storageData.clientAccesses) {
      Object.keys(storageData.clientAccesses).forEach(clientId => {
        const currentCount = storageData.clientAccesses[clientId];
        if (currentCount > 0) {
          const newCount = Math.floor(currentCount / 2);
          storageData.clientAccesses[clientId] = newCount;
          console.log(`Cliente ${clientId}: ${currentCount} → ${newCount} accessi`);
          correctedCount++;
        }
      });
    }
    
    // Backup dei dati originali
    const backupPath = `./storage_data_backup_${Date.now()}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(storageData, null, 2));
    console.log(`📋 Backup creato: ${backupPath}`);
    
    // Salva i dati corretti
    fs.writeFileSync('./storage_data.json', JSON.stringify(storageData, null, 2));
    
    console.log(`✅ Corretti ${correctedCount} conteggi di accesso`);
    console.log('💾 Conteggi dimezzati e salvati con successo');
    
  } catch (error) {
    console.error('❌ Errore durante la correzione:', error.message);
  }
}

fixDoubleCountingIssue();