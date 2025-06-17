/**
 * Script per verificare sincronizzazione QR interfaccia vs database
 */

const fs = require('fs');
const crypto = require('crypto');

function verifyQRSync() {
  console.log('🔍 VERIFICA SINCRONIZZAZIONE QR INTERFACCIA VS DATABASE');
  console.log('');

  // Carica dati dal database
  const data = JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
  
  // Carica token rigenerati
  const regeneratedData = JSON.parse(fs.readFileSync('regenerated-qr-tokens.json', 'utf8'));
  const regeneratedTokens = regeneratedData.tokens;

  // Trova Marco Berto di Silvia
  const marcoBerto = data.clients.find(([id, client]) => 
    id === 1750153393298 && client.ownerId === 14
  );

  if (!marcoBerto) {
    console.log('❌ Marco Berto di Silvia non trovato');
    return;
  }

  const [clientId, client] = marcoBerto;
  
  console.log('📊 DATI ATTUALI MARCO BERTO:');
  console.log('  ID:', clientId);
  console.log('  Nome:', client.firstName, client.lastName);
  console.log('  ownerId:', client.ownerId);
  console.log('  uniqueCode:', client.uniqueCode);
  console.log('  professionistCode:', client.professionistCode);
  
  // Simula esattamente la logica del server
  const ownerUserId = client.ownerId;
  const clientCode = client.uniqueCode;
  
  if (!clientCode) {
    console.log('❌ uniqueCode mancante per il cliente');
    return;
  }
  
  const tokenData = `${clientCode}_SECURE_${ownerUserId}`;
  const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  const token = `${clientCode}_${stableHash}`;
  
  console.log('');
  console.log('🔧 GENERAZIONE TOKEN INTERFACCIA (simulazione):');
  console.log('  clientCode:', clientCode);
  console.log('  tokenData:', tokenData);
  console.log('  stableHash:', stableHash);
  console.log('  token finale:', token);
  
  // Trova il token rigenerato corrispondente
  const regeneratedEntry = regeneratedTokens.find(entry => 
    entry.clientId === clientId && entry.ownerId === ownerUserId
  );
  
  console.log('');
  console.log('🔄 CONFRONTO CON TOKEN RIGENERATO:');
  if (regeneratedEntry) {
    console.log('  Token interfaccia:', token);
    console.log('  Token rigenerato: ', regeneratedEntry.newToken);
    console.log('  URL interfaccia: ', `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/activate?token=${token}`);
    console.log('  URL rigenerato:  ', regeneratedEntry.newUrl);
    console.log('  Identici:', token === regeneratedEntry.newToken ? '✅ SÌ' : '❌ NO');
    
    if (token !== regeneratedEntry.newToken) {
      console.log('');
      console.log('⚠️  PROBLEMA IDENTIFICATO:');
      console.log('     I token sono diversi, questo significa che i QR a video sono obsoleti');
      console.log('     L\'interfaccia usa il uniqueCode attuale del database,');
      console.log('     ma il token rigenerato usa le nuove regole gerarchiche');
    }
  } else {
    console.log('❌ Token rigenerato non trovato per questo cliente');
  }
  
  console.log('');
  console.log('📋 VERIFICA COMPLETA TUTTI I CLIENTI DI SILVIA BUSNARI (ID 14):');
  console.log('');
  
  const silviaClients = data.clients.filter(([id, client]) => client.ownerId === 14);
  let totalChecked = 0;
  let mismatches = 0;
  
  for (const [clientId, client] of silviaClients) {
    const clientCode = client.uniqueCode;
    if (!clientCode) continue;
    
    const ownerUserId = client.ownerId;
    const tokenData = `${clientCode}_SECURE_${ownerUserId}`;
    const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
    const interfaceToken = `${clientCode}_${stableHash}`;
    
    const regeneratedEntry = regeneratedTokens.find(entry => 
      entry.clientId === clientId && entry.ownerId === ownerUserId
    );
    
    totalChecked++;
    
    if (regeneratedEntry) {
      const match = interfaceToken === regeneratedEntry.newToken;
      if (!match) {
        mismatches++;
        console.log(`❌ ${client.firstName} ${client.lastName} (ID ${clientId})`);
        console.log(`   Interfaccia: ${interfaceToken}`);
        console.log(`   Rigenerato:  ${regeneratedEntry.newToken}`);
      } else {
        console.log(`✅ ${client.firstName} ${client.lastName} (ID ${clientId}) - OK`);
      }
    }
  }
  
  console.log('');
  console.log(`📊 RISULTATO FINALE: ${totalChecked - mismatches}/${totalChecked} clienti sincronizzati`);
  if (mismatches > 0) {
    console.log(`⚠️  ${mismatches} clienti hanno QR non aggiornati nell'interfaccia`);
  } else {
    console.log('✅ Tutti i QR sono sincronizzati');
  }
}

verifyQRSync();