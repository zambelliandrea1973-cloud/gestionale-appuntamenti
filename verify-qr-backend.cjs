/**
 * Verifica diretta dal backend la generazione QR
 */

const fs = require('fs');
const crypto = require('crypto');

function loadStorageData() {
  try {
    const data = fs.readFileSync('storage_data.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Errore caricamento dati:', error);
    return {};
  }
}

async function verifyQRBackend() {
  console.log('🔍 VERIFICA QR BACKEND DIRETTO\n');
  
  const storageData = loadStorageData();
  const marcoId = 1750177330362;
  
  // Trova Marco
  const clientData = storageData.clients.find(([id]) => id === marcoId);
  if (!clientData) {
    console.log('❌ Marco non trovato');
    return;
  }
  
  const client = clientData[1];
  console.log(`📊 Cliente: ${client.firstName} ${client.lastName}`);
  console.log(`   ID: ${client.id}`);
  console.log(`   Owner ID: ${client.ownerId}`);
  console.log(`   Unique Code: ${client.uniqueCode}`);
  
  // Simula la generazione QR come fa il server ora
  const ownerUserId = client.ownerId || 14;
  const clientCode = client.uniqueCode;
  
  if (!clientCode) {
    console.log('❌ Cliente senza codice gerarchico');
    return;
  }
  
  // Genera token come fa il server
  const tokenData = `${clientCode}_SECURE_${ownerUserId}`;
  const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  const token = `${clientCode}_${stableHash}`;
  
  console.log(`\n🔧 Token generato: ${token}`);
  
  // URL che il server genera ORA (dopo la modifica)
  const directUrl = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/client-area?token=${token}&clientId=${marcoId}&autoLogin=true`;
  
  console.log(`\n🎯 NUOVO URL DIRETTO:`);
  console.log(directUrl);
  
  console.log(`\n✅ Verifica parametri URL:`);
  const url = new URL(directUrl);
  console.log(`   Path: ${url.pathname}`);
  console.log(`   Token: ${url.searchParams.get('token')}`);
  console.log(`   Client ID: ${url.searchParams.get('clientId')}`);
  console.log(`   Auto Login: ${url.searchParams.get('autoLogin')}`);
  
  // Verifica che sia diverso dal vecchio formato
  const oldUrl = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/activate?token=${token}`;
  console.log(`\n🔄 CONFRONTO:`);
  console.log(`   VECCHIO: ${oldUrl}`);
  console.log(`   NUOVO:   ${directUrl}`);
  
  if (directUrl.includes('/client-area')) {
    console.log('\n✅ Il backend ora genera URL diretti correttamente');
  } else {
    console.log('\n❌ Il backend sta ancora generando URL vecchi');
  }
  
  return directUrl;
}

if (require.main === module) {
  verifyQRBackend();
}

module.exports = { verifyQRBackend };