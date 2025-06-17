/**
 * Script per resettare tutti i codici cliente e far rigenerare il sistema da capo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resetClientCodes() {
  console.log('🔧 Inizio reset codici cliente...');
  
  const storageFile = path.join(process.cwd(), 'storage_data.json');
  
  if (!fs.existsSync(storageFile)) {
    console.log('❌ File storage_data.json non trovato');
    return false;
  }
  
  try {
    // Carica i dati
    const data = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
    
    if (!data.clients || !Array.isArray(data.clients)) {
      console.log('❌ Struttura dati clienti non valida');
      return false;
    }
    
    let resetCount = 0;
    
    // Reset di tutti i codici cliente
    data.clients.forEach(([id, client]) => {
      if (client.uniqueCode || client.professionistCode) {
        console.log(`🔄 Reset codici per cliente ${id} (${client.firstName} ${client.lastName})`);
        delete client.uniqueCode;
        delete client.professionistCode;
        resetCount++;
      }
    });
    
    // Reset dei codici professionista
    if (data.professionistCodes) {
      console.log('🔄 Reset codici professionista...');
      delete data.professionistCodes;
    }
    
    // Salva le modifiche
    fs.writeFileSync(storageFile, JSON.stringify(data, null, 2));
    
    console.log(`✅ Reset completato:`);
    console.log(`   - ${resetCount} clienti resettati`);
    console.log(`   - Codici professionista eliminati`);
    console.log(`   - Il sistema rigenererà tutto da capo`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Errore durante il reset:', error);
    return false;
  }
}

// Esegui il reset
resetClientCodes();

export { resetClientCodes };