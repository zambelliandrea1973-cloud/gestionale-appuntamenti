/**
 * Script per correggere i conteggi degli accessi PWA dividendo per 4
 */

const fs = require('fs');
const path = require('path');

function fixAccessCounts() {
  try {
    // Carica i dati dal file storage
    const storageFile = path.join(__dirname, 'storage_data.json');
    const storageData = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
    
    console.log('🔧 Correzione conteggi accessi PWA iniziata...');
    
    let correctedCount = 0;
    
    // Correggi i conteggi negli array clients
    if (storageData.clients && Array.isArray(storageData.clients)) {
      storageData.clients.forEach(([id, client]) => {
        if (client.accessCount && client.accessCount > 0) {
          const originalCount = client.accessCount;
          const correctedAccessCount = Math.floor(originalCount / 4);
          
          client.accessCount = correctedAccessCount;
          correctedCount++;
          
          console.log(`📱 Cliente ${client.firstName} ${client.lastName} (${id}): ${originalCount} → ${correctedAccessCount}`);
        }
      });
    }
    
    // Salva i dati corretti
    fs.writeFileSync(storageFile, JSON.stringify(storageData, null, 2));
    
    console.log(`✅ Correzione completata! ${correctedCount} clienti aggiornati`);
    console.log('💾 File storage_data.json aggiornato');
    
  } catch (error) {
    console.error('❌ Errore durante la correzione:', error);
  }
}

// Esegui la correzione
fixAccessCounts();