/**
 * Test specifico per il token di Marco Berto ID 1750153393298
 */

const fs = require('fs');
const crypto = require('crypto');

function loadStorageData() {
  return JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
}

function testMarcoToken() {
  console.log('🔍 TEST SPECIFICO TOKEN MARCO BERTO (ID 1750153393298)');
  console.log('');
  
  const storageData = loadStorageData();
  
  // Trova Marco Berto di Silvia
  const marcoBerto = storageData.clients.find(([id, client]) => 
    id === 1750153393298 && client.firstName === 'Marco' && client.lastName === 'Berto'
  );
  
  if (!marcoBerto) {
    console.log('❌ Marco Berto non trovato');
    return;
  }
  
  const [clientId, client] = marcoBerto;
  
  console.log('📊 DATI CLIENTE:');
  console.log('  ID:', clientId);
  console.log('  Nome:', client.firstName, client.lastName);
  console.log('  ownerId:', client.ownerId);
  console.log('  uniqueCode:', client.uniqueCode);
  
  if (!client.uniqueCode) {
    console.log('❌ Cliente senza uniqueCode');
    return;
  }
  
  // Genera token come fa il server
  console.log('');
  console.log('🔧 GENERAZIONE TOKEN:');
  const tokenData = `${client.uniqueCode}_SECURE_${client.ownerId}`;
  const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  const token = `${client.uniqueCode}_${stableHash}`;
  
  console.log('  tokenData:', tokenData);
  console.log('  stableHash:', stableHash);
  console.log('  token completo:', token);
  
  // Test validazione step by step
  console.log('');
  console.log('✅ TEST VALIDAZIONE STEP BY STEP:');
  
  // Step 1: Estrae codice cliente e hash
  const lastUnderscoreIndex = token.lastIndexOf('_');
  const clientCode = token.substring(0, lastUnderscoreIndex);
  const providedHash = token.substring(lastUnderscoreIndex + 1);
  
  console.log('  1. Estrazione parti:');
  console.log('     clientCode:', clientCode);
  console.log('     providedHash:', providedHash);
  
  // Step 2: Verifica formato gerarchico
  const formatPattern = /^PROF_\d{3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/;
  const formatOk = formatPattern.test(clientCode);
  console.log('  2. Verifica formato:', formatOk ? 'OK' : 'FAILED');
  
  if (!formatOk) {
    console.log('     Pattern richiesto: PROF_\\d{3}_[A-Z0-9]{4}_CLIENT_\\d+_[A-Z0-9]{4}');
    console.log('     Codice ricevuto:', clientCode);
    return;
  }
  
  // Step 3: Estrae owner ID
  const ownerMatch = clientCode.match(/^PROF_(\d{3})_/);
  const extractedOwnerId = ownerMatch ? parseInt(ownerMatch[1], 10) : null;
  console.log('  3. Owner ID estratto:', extractedOwnerId);
  console.log('     Match con ownerId cliente:', extractedOwnerId === client.ownerId);
  
  // Step 4: Ricomputa hash
  const verifyTokenData = `${clientCode}_SECURE_${extractedOwnerId}`;
  const expectedHash = crypto.createHash('md5').update(verifyTokenData).digest('hex').substring(0, 8);
  console.log('  4. Verifica hash:');
  console.log('     verifyTokenData:', verifyTokenData);
  console.log('     expectedHash:', expectedHash);
  console.log('     providedHash:', providedHash);
  console.log('     Hash match:', expectedHash === providedHash);
  
  // Step 5: Verifica nel storage
  const foundClient = storageData.clients.find(([id]) => id.toString() === clientId.toString());
  console.log('  5. Cliente trovato nel storage:', !!foundClient);
  
  if (foundClient) {
    const [foundId, foundClientData] = foundClient;
    console.log('     ID trovato:', foundId);
    console.log('     ownerId match:', foundClientData.ownerId === extractedOwnerId);
  }
  
  // Test URL finale
  console.log('');
  console.log('🌐 URL FINALE PER QR:');
  console.log(`https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/activate?token=${token}`);
}

testMarcoToken();