/**
 * Script per rigenerare tutti i token QR con le nuove regole gerarchiche
 * Questo garantisce che tutti i QR siano compatibili con il sistema aggiornato
 */

const fs = require('fs');
const crypto = require('crypto');

function loadStorageData() {
  return JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
}

function saveStorageData(data) {
  // Backup di sicurezza prima della modifica
  const backupName = `storage_data_backup_${Date.now()}.json`;
  fs.writeFileSync(backupName, JSON.stringify(data, null, 2));
  console.log(`📦 Backup creato: ${backupName}`);
  
  fs.writeFileSync('storage_data.json', JSON.stringify(data, null, 2));
}

function generateNewToken(ownerId, clientId, clientCode) {
  const tokenData = `${clientCode}_SECURE_${ownerId}`;
  const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  return `${clientCode}_${stableHash}`;
}

function regenerateAllTokens() {
  console.log('🔄 RIGENERAZIONE COMPLETA TOKEN QR CON REGOLE GERARCHICHE');
  console.log('');
  
  const storageData = loadStorageData();
  
  if (!storageData.clients || storageData.clients.length === 0) {
    console.log('❌ Nessun cliente trovato nel database');
    return;
  }
  
  console.log(`📊 Trovati ${storageData.clients.length} clienti da processare`);
  console.log('');
  
  // Raggruppa per utente per migliore organizzazione
  const userGroups = {};
  storageData.clients.forEach(([id, client]) => {
    const ownerId = client.ownerId;
    if (!userGroups[ownerId]) userGroups[ownerId] = [];
    userGroups[ownerId].push([id, client]);
  });
  
  let totalProcessed = 0;
  let totalErrors = 0;
  const regeneratedTokens = [];
  
  Object.keys(userGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(ownerId => {
    const clients = userGroups[ownerId];
    console.log(`👤 Utente ${ownerId} (${clients.length} clienti):`);
    
    clients.forEach(([clientId, client]) => {
      try {
        if (!client.uniqueCode) {
          console.log(`  ❌ ${client.firstName} ${client.lastName} - NESSUN CODICE UNIVOCO`);
          totalErrors++;
          return;
        }
        
        // Verifica che il codice sia in formato gerarchico
        if (!client.uniqueCode.match(/^PROF_\d{3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/)) {
          console.log(`  ❌ ${client.firstName} ${client.lastName} - CODICE NON GERARCHICO`);
          totalErrors++;
          return;
        }
        
        // Genera nuovo token con regole aggiornate
        const newToken = generateNewToken(client.ownerId, clientId, client.uniqueCode);
        const newUrl = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/activate?token=${newToken}`;
        
        regeneratedTokens.push({
          clientId,
          clientName: `${client.firstName} ${client.lastName}`,
          ownerId: client.ownerId,
          uniqueCode: client.uniqueCode,
          newToken,
          newUrl
        });
        
        console.log(`  ✅ ${client.firstName} ${client.lastName} - TOKEN RIGENERATO`);
        totalProcessed++;
        
      } catch (error) {
        console.log(`  ❌ ${client.firstName} ${client.lastName} - ERRORE: ${error.message}`);
        totalErrors++;
      }
    });
    
    console.log('');
  });
  
  console.log('📈 RIEPILOGO RIGENERAZIONE:');
  console.log(`  Token rigenerati: ${totalProcessed}`);
  console.log(`  Errori riscontrati: ${totalErrors}`);
  console.log(`  Percentuale successo: ${Math.round((totalProcessed/(totalProcessed + totalErrors))*100)}%`);
  
  if (regeneratedTokens.length > 0) {
    console.log('');
    console.log('📝 SALVATAGGIO NUOVI TOKEN:');
    
    // Salva il file con i nuovi token per distribuzione
    const tokenFile = {
      generatedAt: new Date().toISOString(),
      totalTokens: regeneratedTokens.length,
      tokens: regeneratedTokens
    };
    
    fs.writeFileSync('regenerated-qr-tokens.json', JSON.stringify(tokenFile, null, 2));
    console.log('  📄 File salvato: regenerated-qr-tokens.json');
    
    // Salva anche un file di testo per distribuzione facile
    let textOutput = '🔄 NUOVI TOKEN QR RIGENERATI\n';
    textOutput += `Generati il: ${new Date().toLocaleString()}\n\n`;
    
    const userTokens = {};
    regeneratedTokens.forEach(item => {
      if (!userTokens[item.ownerId]) userTokens[item.ownerId] = [];
      userTokens[item.ownerId].push(item);
    });
    
    Object.keys(userTokens).sort((a, b) => parseInt(a) - parseInt(b)).forEach(ownerId => {
      textOutput += `👤 UTENTE ${ownerId}:\n`;
      userTokens[ownerId].forEach(item => {
        textOutput += `\n  Cliente: ${item.clientName}\n`;
        textOutput += `  URL: ${item.newUrl}\n`;
        textOutput += `  Token: ${item.newToken}\n`;
      });
      textOutput += '\n' + '='.repeat(80) + '\n\n';
    });
    
    fs.writeFileSync('regenerated-qr-tokens.txt', textOutput);
    console.log('  📄 File di testo salvato: regenerated-qr-tokens.txt');
    
    console.log('');
    console.log('✅ RIGENERAZIONE COMPLETATA CON SUCCESSO!');
    console.log('');
    console.log('📋 PROSSIMI PASSI:');
    console.log('1. Distribuire i nuovi QR a tutti i professionisti');
    console.log('2. Sostituire tutti i QR esistenti con quelli rigenerati');
    console.log('3. Verificare che tutti i QR funzionino correttamente');
    console.log('4. Eliminare i vecchi QR per evitare confusione');
    
  } else {
    console.log('');
    console.log('❌ NESSUN TOKEN RIGENERATO - VERIFICARE ERRORI');
  }
  
  return regeneratedTokens;
}

regenerateAllTokens();