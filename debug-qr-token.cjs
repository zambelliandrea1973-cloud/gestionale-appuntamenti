/**
 * Script per testare il flusso QR di Marco e identificare dove si rompe
 */

const fs = require('fs');

function loadStorageData() {
  try {
    const data = fs.readFileSync('storage_data.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Errore caricamento dati:', error);
    return {};
  }
}

async function debugMarcoQR() {
  console.log('🔍 DEBUG QR TOKEN PER MARCO BERTO\n');
  
  const storageData = loadStorageData();
  const marcoId = 1750177330362;
  
  // Trova Marco nei dati
  const clientData = storageData.clients.find(([id]) => id === marcoId);
  
  if (!clientData) {
    console.log('❌ Marco non trovato nei dati');
    return;
  }
  
  const marco = clientData[1];
  console.log('📊 DATI MARCO:');
  console.log(`   ID: ${marco.id}`);
  console.log(`   Nome: ${marco.firstName} ${marco.lastName}`);
  console.log(`   Owner ID: ${marco.ownerId}`);
  console.log(`   Unique Code: ${marco.uniqueCode}`);
  console.log(`   Professionista Code: ${marco.professionistCode}`);
  
  // Simula la generazione del token come fa il server
  const crypto = require('crypto');
  const ownerUserId = marco.ownerId || 14;
  const clientCode = marco.uniqueCode;
  
  console.log('\n🔧 GENERAZIONE TOKEN:');
  console.log(`   Owner User ID: ${ownerUserId}`);
  console.log(`   Client Code: ${clientCode}`);
  
  if (!clientCode) {
    console.log('❌ Cliente senza codice gerarchico');
    return;
  }
  
  // Genera token come fa il server
  const tokenData = `${clientCode}_SECURE_${ownerUserId}`;
  const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  const token = `${clientCode}_${stableHash}`;
  
  console.log(`   Token Data: ${tokenData}`);
  console.log(`   Hash: ${stableHash}`);
  console.log(`   Token Finale: ${token}`);
  
  // Simula l'URL di attivazione
  const activationUrl = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/activate?token=${token}`;
  console.log(`   URL Attivazione: ${activationUrl}`);
  
  // Testa la validazione del token (come fa /activate)
  console.log('\n🧪 TEST VALIDAZIONE TOKEN:');
  
  const lastUnderscoreIndex = token.lastIndexOf('_');
  if (lastUnderscoreIndex === -1) {
    console.log('❌ Formato token non valido - nessun underscore finale');
    return;
  }
  
  const clientCodeFromToken = token.substring(0, lastUnderscoreIndex);
  const providedHash = token.substring(lastUnderscoreIndex + 1);
  
  console.log(`   Client Code estratto: ${clientCodeFromToken}`);
  console.log(`   Hash estratto: ${providedHash}`);
  
  // Verifica formato gerarchico
  const hierarchicalRegex = /^PROF_\d{3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/;
  const isValidFormat = hierarchicalRegex.test(clientCodeFromToken);
  console.log(`   Formato gerarchico valido: ${isValidFormat}`);
  
  if (!isValidFormat) {
    console.log('❌ Formato codice gerarchico non valido');
    return;
  }
  
  // Estrae owner ID dal codice
  const ownerMatch = clientCodeFromToken.match(/^PROF_(\d{3})_/);
  if (!ownerMatch) {
    console.log('❌ Impossibile estrarre owner ID dal codice');
    return;
  }
  
  const ownerIdFromToken = parseInt(ownerMatch[1], 10);
  console.log(`   Owner ID estratto: ${ownerIdFromToken}`);
  
  // Verifica hash
  const expectedTokenData = `${clientCodeFromToken}_SECURE_${ownerIdFromToken}`;
  const expectedHash = crypto.createHash('md5').update(expectedTokenData).digest('hex').substring(0, 8);
  
  console.log(`   Token Data atteso: ${expectedTokenData}`);
  console.log(`   Hash atteso: ${expectedHash}`);
  console.log(`   Hash match: ${providedHash === expectedHash}`);
  
  // Estrae client ID dal codice
  const clientMatch = clientCodeFromToken.match(/CLIENT_(\d+)_/);
  if (!clientMatch) {
    console.log('❌ Impossibile estrarre client ID dal codice');
    return;
  }
  
  const clientIdFromToken = parseInt(clientMatch[1], 10);
  console.log(`   Client ID estratto: ${clientIdFromToken}`);
  console.log(`   Client ID match: ${clientIdFromToken === marcoId}`);
  
  // Test finale
  console.log('\n✅ RISULTATO FINALE:');
  if (providedHash === expectedHash && clientIdFromToken === marcoId && ownerIdFromToken === marco.ownerId) {
    console.log('🎉 Token valido - QR code dovrebbe funzionare');
    
    // Simula URL auto-login finale
    const autoLoginUrl = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/auto-login?clientId=${clientIdFromToken}&token=${token}`;
    console.log(`🔄 URL Auto-Login: ${autoLoginUrl}`);
  } else {
    console.log('❌ Token non valido - problema nel flusso');
  }
}

// Esegui il debug
if (require.main === module) {
  debugMarcoQR();
}

module.exports = { debugMarcoQR };