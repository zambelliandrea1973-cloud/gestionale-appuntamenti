/**
 * Script per debuggare il token QR di Silvia Busnari
 */

const fs = require('fs');
const crypto = require('crypto');

function loadStorageData() {
  return JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
}

function debugTokenGeneration() {
  console.log('🔍 DEBUG TOKEN QR SILVIA BUSNARI');
  
  const storageData = loadStorageData();
  const userId = 14; // Silvia Busnari
  
  // Trova un cliente di Silvia per testare
  const silviaClients = storageData.clients.filter(([id, client]) => client.ownerId === userId);
  
  console.log(`\n📊 Clienti di Silvia (ID ${userId}): ${silviaClients.length}`);
  
  if (silviaClients.length === 0) {
    console.log('❌ Nessun cliente trovato per Silvia');
    return;
  }
  
  const [clientId, client] = silviaClients[0];
  console.log(`\n🎯 Test con cliente: ${clientId} - ${client.firstName} ${client.lastName}`);
  console.log(`   uniqueCode: ${client.uniqueCode}`);
  console.log(`   ownerId: ${client.ownerId}`);
  
  // Simula generazione token come nel server
  const ownerUserId = client.ownerId || userId;
  const clientCode = client.uniqueCode;
  
  if (!clientCode) {
    console.log('❌ Cliente senza uniqueCode!');
    return;
  }
  
  console.log(`\n🔧 Generazione token:`);
  console.log(`   ownerUserId: ${ownerUserId}`);
  console.log(`   clientCode: ${clientCode}`);
  
  // Genera token come nel server
  const tokenData = `${clientCode}_SECURE_${ownerUserId}`;
  const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  const token = `${clientCode}_${stableHash}`;
  
  console.log(`   tokenData: ${tokenData}`);
  console.log(`   stableHash: ${stableHash}`);
  console.log(`   token finale: ${token}`);
  
  // Test validazione token come nel server
  console.log(`\n✅ Test validazione token:`);
  
  const lastUnderscoreIndex = token.lastIndexOf('_');
  const extractedClientCode = token.substring(0, lastUnderscoreIndex);
  const providedHash = token.substring(lastUnderscoreIndex + 1);
  
  console.log(`   extractedClientCode: ${extractedClientCode}`);
  console.log(`   providedHash: ${providedHash}`);
  
  // Verifica formato gerarchico (nuovo pattern)
  const formatOk = extractedClientCode.match(/^PROF_\d{3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/);
  console.log(`   formato gerarchico OK: ${!!formatOk}`);
  
  // Estrae owner ID
  const ownerMatch = extractedClientCode.match(/^PROF_(\d{3})_/);
  const extractedOwnerId = ownerMatch ? parseInt(ownerMatch[1], 10) : null;
  console.log(`   extractedOwnerId: ${extractedOwnerId}`);
  
  // Ricomputa hash per verifica
  const verifyTokenData = `${extractedClientCode}_SECURE_${extractedOwnerId}`;
  const expectedHash = crypto.createHash('md5').update(verifyTokenData).digest('hex').substring(0, 8);
  
  console.log(`   verifyTokenData: ${verifyTokenData}`);
  console.log(`   expectedHash: ${expectedHash}`);
  console.log(`   providedHash: ${providedHash}`);
  console.log(`   hash match: ${expectedHash === providedHash}`);
  
  // Trova cliente nel storage
  const allClients = storageData.clients || [];
  const clientData = allClients.find(([id]) => id.toString() === clientId.toString());
  
  console.log(`\n🔍 Verifica cliente nel storage:`);
  console.log(`   clientData trovato: ${!!clientData}`);
  
  if (clientData) {
    const [foundId, foundClient] = clientData;
    console.log(`   ID trovato: ${foundId}`);
    console.log(`   ownerId del cliente: ${foundClient.ownerId}`);
    console.log(`   uniqueCode del cliente: ${foundClient.uniqueCode}`);
    console.log(`   owner match: ${foundClient.ownerId === extractedOwnerId}`);
  }
}

debugTokenGeneration();