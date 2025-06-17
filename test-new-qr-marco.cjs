/**
 * Script per testare il nuovo QR code diretto di Marco
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

async function testNewMarcoQR() {
  console.log('🔍 TEST NUOVO QR DIRETTO PER MARCO\n');
  
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
  
  // Simula la generazione del NUOVO QR DIRETTO come fa il server ora
  const crypto = require('crypto');
  const ownerUserId = marco.ownerId || 14;
  const clientCode = marco.uniqueCode;
  
  console.log('\n🔧 GENERAZIONE NUOVO QR DIRETTO:');
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
  
  // NUOVO URL DIRETTO - va direttamente alla client area
  const directUrl = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/client-area?token=${token}&clientId=${marcoId}&autoLogin=true`;
  console.log(`   🎯 NUOVO URL DIRETTO: ${directUrl}`);
  
  // Confronto con il vecchio URL
  const oldUrl = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/activate?token=${token}`;
  console.log(`   🔄 Vecchio URL (problematico): ${oldUrl}`);
  
  console.log('\n✅ DIFFERENZE:');
  console.log('   ❌ PRIMA: QR → /activate → /auto-login → client-area (3 passaggi)');
  console.log('   ✅ ORA: QR → /client-area (1 passaggio diretto)');
  console.log('   ✅ Parametri: token, clientId, autoLogin=true');
  
  console.log('\n🧪 VERIFICA LOGICA CLIENT-AREA:');
  console.log('   1. URLParams rileva token e clientId');
  console.log('   2. Salva in localStorage per PWA');
  console.log('   3. Chiama verifyQRToken() direttamente');
  console.log('   4. Se successo → mostra dati Marco');
  console.log('   5. Se fallimento → pagina errore');
  
  return directUrl;
}

// Esegui il test
if (require.main === module) {
  testNewMarcoQR();
}

module.exports = { testNewMarcoQR };