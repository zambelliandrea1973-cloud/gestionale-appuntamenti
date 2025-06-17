/**
 * Script per identificare la confusione nei QR tokens
 */

const fs = require('fs');

function debugQRConfusion() {
  console.log('🔍 DEBUG CONFUSIONE QR TOKENS');
  console.log('=============================\n');
  
  // Carica i token rigenerati
  const tokensFile = fs.readFileSync('regenerated-qr-tokens.json', 'utf8');
  const tokensData = JSON.parse(tokensFile);
  
  // Trova tutti i clienti del proprietario 14 (Silvia Busnari)
  const owner14Clients = tokensData.tokens.filter(token => token.ownerId === 14);
  
  console.log(`📋 CLIENTI DEL PROPRIETARIO 14 (${owner14Clients.length} totali):`);
  console.log('================================================');
  
  owner14Clients.forEach((client, index) => {
    console.log(`${index + 1}. ${client.clientName}`);
    console.log(`   ID: ${client.clientId}`);
    console.log(`   Codice: ${client.uniqueCode}`);
    console.log(`   Token: ${client.newToken}`);
    console.log(`   URL: ${client.newUrl}`);
    console.log('');
  });
  
  // Analizza specificamente Marco Berto
  console.log('🔍 ANALISI MARCO BERTO:');
  console.log('=====================');
  
  const marcoBertoClients = tokensData.tokens.filter(token => 
    token.clientName.includes('Marco Berto')
  );
  
  marcoBertoClients.forEach((marco, index) => {
    console.log(`Marco Berto #${index + 1}:`);
    console.log(`   ID: ${marco.clientId}`);
    console.log(`   Proprietario: ${marco.ownerId}`);
    console.log(`   Codice: ${marco.uniqueCode}`);
    console.log(`   Token: ${marco.newToken}`);
    console.log('');
  });
  
  // Token specifico che dovrebbe essere di Marco Berto (owner 14)
  const marcoOwner14 = owner14Clients.find(client => 
    client.clientId === 1750153393298
  );
  
  if (marcoOwner14) {
    console.log('✅ MARCO BERTO CORRETTO (Owner 14):');
    console.log(`   Nome: ${marcoOwner14.clientName}`);
    console.log(`   ID: ${marcoOwner14.clientId}`);
    console.log(`   Token: ${marcoOwner14.newToken}`);
    console.log(`   URL corretta: ${marcoOwner14.newUrl}`);
  }
  
  // Token del Trial Account per confronto
  const trialAccount = owner14Clients.find(client => 
    client.clientName.includes('Trial')
  );
  
  if (trialAccount) {
    console.log('\n⚠️  TRIAL ACCOUNT (da non confondere):');
    console.log(`   Nome: ${trialAccount.clientName}`);
    console.log(`   ID: ${trialAccount.clientId}`);
    console.log(`   Token: ${trialAccount.newToken}`);
    console.log(`   URL: ${trialAccount.newUrl}`);
  }
  
  console.log('\n🔧 VERIFICA QUALE TOKEN STAI USANDO:');
  console.log('===================================');
  console.log('Se stai vedendo "Trial Account" significa che stai usando il QR sbagliato.');
  console.log('Usa il token di Marco Berto (ID: 1750153393298) non quello del Trial Account (ID: 14002)');
}

debugQRConfusion();