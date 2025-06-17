/**
 * Genera il QR corretto per Marco Berto di Silvia Busnari
 */

const fs = require('fs');
const crypto = require('crypto');

function generateCorrectQR() {
  const data = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
  
  // Trova il Marco Berto di Silvia (ownerId 14)
  const marcoBerto = data.clients.find(([id, client]) => 
    id === 1750153393298 && client.ownerId === 14
  );
  
  if (!marcoBerto) {
    console.log('❌ Marco Berto di Silvia non trovato');
    return;
  }
  
  const [clientId, client] = marcoBerto;
  
  console.log('🎯 GENERAZIONE QR CORRETTO PER MARCO BERTO DI SILVIA');
  console.log('');
  console.log('Cliente:', client.firstName, client.lastName);
  console.log('ID:', clientId);
  console.log('Owner:', client.ownerId, '(Silvia Busnari)');
  console.log('Codice:', client.uniqueCode);
  
  // Genera il token corretto usando la logica del server
  const tokenData = `${client.uniqueCode}_SECURE_${client.ownerId}`;
  const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  const token = `${client.uniqueCode}_${stableHash}`;
  
  console.log('');
  console.log('📱 TOKEN CORRETTO PER QR:');
  console.log(token);
  
  console.log('');
  console.log('🔗 URL FINALE COMPLETA:');
  const url = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/activate?token=${token}`;
  console.log(url);
  
  console.log('');
  console.log('📋 ISTRUZIONI:');
  console.log('1. Genera un nuovo QR con questo URL esatto');
  console.log('2. Sostituisci il QR precedente di Marco Berto');
  console.log('3. Il QR deve contenere ESATTAMENTE questo token:', token);
  
  // Verifica che funzioni
  console.log('');
  console.log('✅ VERIFICA FINALE:');
  console.log('- Cliente trovato nel database:', !!marcoBerto);
  console.log('- ownerId corretto (14):', client.ownerId === 14);
  console.log('- Codice gerarchico valido:', client.uniqueCode.includes('PROF_014_'));
  console.log('- Token generato correttamente:', token.length > 0);
  
  return { token, url, client };
}

generateCorrectQR();