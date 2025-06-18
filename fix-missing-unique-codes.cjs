/**
 * Script per aggiungere i codici univoci mancanti ai clienti esistenti
 */
const fs = require('fs');

function loadStorageData() {
  try {
    const data = fs.readFileSync('storage_data.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Errore caricamento storage:', error);
    return { userData: {} };
  }
}

function saveStorageData(data) {
  try {
    fs.writeFileSync('storage_data.json', JSON.stringify(data, null, 2));
    console.log('✅ Storage salvato con successo');
    return true;
  } catch (error) {
    console.error('❌ Errore salvataggio storage:', error);
    return false;
  }
}

function generateClientUniqueCode(ownerId, clientId, professionistCode) {
  // Usa gli ultimi 4 caratteri dell'ID cliente come hash
  const clientHash = clientId.toString().slice(-4).padStart(4, '0').toUpperCase();
  return `${professionistCode}_CLIENT_${clientId}_${clientHash}`;
}

function main() {
  console.log('🔧 Aggiunta codici univoci mancanti ai clienti...');
  
  const storageData = loadStorageData();
  let updatedCount = 0;
  
  // Verifica che userData esista
  if (!storageData.userData) {
    console.log('❌ Nessun userData trovato nel storage');
    return;
  }
  
  // Processa ogni utente
  for (const [userId, user] of Object.entries(storageData.userData)) {
    if (!user.clients) continue;
    
    console.log(`\n👤 Processando utente ${userId} (${user.email})`);
    
    // Genera professionistCode se mancante
    if (!user.professionistCode) {
      const userHash = userId.toString().slice(-4).padStart(4, '0').toUpperCase();
      user.professionistCode = `PROF_${userId.toString().padStart(3, '0')}_${userHash}`;
      console.log(`  📝 Generato professionistCode: ${user.professionistCode}`);
    }
    
    // Processa clienti (array o oggetto)
    let clientsToProcess = Array.isArray(user.clients) ? user.clients : Object.values(user.clients);
    
    for (const client of clientsToProcess) {
      if (!client.uniqueCode) {
        // Genera uniqueCode mancante
        client.uniqueCode = generateClientUniqueCode(userId, client.id, user.professionistCode);
        client.professionistCode = user.professionistCode;
        
        console.log(`    ✅ Cliente ${client.firstName} ${client.lastName} (${client.id}): ${client.uniqueCode}`);
        updatedCount++;
      } else {
        console.log(`    ⏭️  Cliente ${client.firstName} ${client.lastName} ha già uniqueCode: ${client.uniqueCode}`);
      }
    }
  }
  
  console.log(`\n📊 Totale clienti aggiornati: ${updatedCount}`);
  
  if (updatedCount > 0) {
    if (saveStorageData(storageData)) {
      console.log('✅ Codici univoci aggiunti con successo!');
    } else {
      console.log('❌ Errore durante il salvataggio');
    }
  } else {
    console.log('ℹ️  Nessun aggiornamento necessario');
  }
}

main();