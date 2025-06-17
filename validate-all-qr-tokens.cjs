/**
 * Script per validare tutti i token QR con la nuova logica gerarchica
 * e identificare eventuali problemi di compatibilità
 */

const fs = require('fs');
const crypto = require('crypto');

function loadStorageData() {
  return JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
}

function generateTokenForClient(ownerId, clientId, clientCode) {
  const tokenData = `${clientCode}_SECURE_${ownerId}`;
  const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  return `${clientCode}_${stableHash}`;
}

function validateToken(token, expectedClientId) {
  // Estrae codice cliente e hash dal token
  const lastUnderscoreIndex = token.lastIndexOf('_');
  if (lastUnderscoreIndex === -1) return { valid: false, reason: "Formato token non valido" };
  
  const clientCode = token.substring(0, lastUnderscoreIndex);
  const providedHash = token.substring(lastUnderscoreIndex + 1);
  
  // Verifica formato gerarchico (pattern aggiornato)
  if (!clientCode.match(/^PROF_\d{3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/)) {
    return { valid: false, reason: "Codice cliente non valido" };
  }
  
  // Estrae owner ID dal codice cliente
  const ownerMatch = clientCode.match(/^PROF_(\d{3})_/);
  if (!ownerMatch) return { valid: false, reason: "Impossibile identificare proprietario" };
  
  const ownerId = parseInt(ownerMatch[1], 10);
  
  // Verifica hash del token
  const tokenData = `${clientCode}_SECURE_${ownerId}`;
  const expectedHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  
  if (providedHash !== expectedHash) {
    return { valid: false, reason: "Token non autorizzato" };
  }
  
  return { valid: true, ownerId, clientCode };
}

function validateAllTokens() {
  console.log('🔍 VALIDAZIONE COMPLETA TOKEN QR CON NUOVA LOGICA');
  console.log('');
  
  const storageData = loadStorageData();
  let totalTokens = 0;
  let validTokens = 0;
  let invalidTokens = 0;
  
  const results = [];
  
  // Raggruppa per utente
  const userGroups = {};
  storageData.clients.forEach(([id, client]) => {
    const ownerId = client.ownerId;
    if (!userGroups[ownerId]) userGroups[ownerId] = [];
    userGroups[ownerId].push([id, client]);
  });
  
  console.log('📊 RISULTATI VALIDAZIONE PER UTENTE:');
  console.log('');
  
  Object.keys(userGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(ownerId => {
    const clients = userGroups[ownerId];
    console.log(`👤 Utente ${ownerId} (${clients.length} clienti):`);
    
    let userValidTokens = 0;
    let userInvalidTokens = 0;
    
    clients.forEach(([clientId, client]) => {
      if (!client.uniqueCode) {
        console.log(`  ❌ ${client.firstName} ${client.lastName} - NESSUN CODICE`);
        invalidTokens++;
        userInvalidTokens++;
        totalTokens++;
        return;
      }
      
      // Genera token per questo cliente
      const token = generateTokenForClient(client.ownerId, clientId, client.uniqueCode);
      
      // Valida il token generato
      const validation = validateToken(token, clientId);
      
      totalTokens++;
      
      if (validation.valid) {
        console.log(`  ✅ ${client.firstName} ${client.lastName} - TOKEN VALIDO`);
        validTokens++;
        userValidTokens++;
      } else {
        console.log(`  ❌ ${client.firstName} ${client.lastName} - ${validation.reason}`);
        invalidTokens++;
        userInvalidTokens++;
        
        results.push({
          clientId,
          client: `${client.firstName} ${client.lastName}`,
          ownerId: client.ownerId,
          uniqueCode: client.uniqueCode,
          error: validation.reason
        });
      }
    });
    
    console.log(`     Validi: ${userValidTokens}, Invalidi: ${userInvalidTokens}`);
    console.log('');
  });
  
  console.log('📈 RIEPILOGO FINALE:');
  console.log(`  Token totali testati: ${totalTokens}`);
  console.log(`  Token validi: ${validTokens}`);
  console.log(`  Token invalidi: ${invalidTokens}`);
  console.log(`  Percentuale successo: ${Math.round((validTokens/totalTokens)*100)}%`);
  
  if (invalidTokens > 0) {
    console.log('');
    console.log('⚠️ PROBLEMI RILEVATI:');
    results.forEach(problem => {
      console.log(`  - ${problem.client} (ID: ${problem.clientId}) - ${problem.error}`);
    });
  } else {
    console.log('');
    console.log('✅ TUTTI I TOKEN QR SONO COMPATIBILI CON LA NUOVA LOGICA!');
  }
  
  return { totalTokens, validTokens, invalidTokens, results };
}

validateAllTokens();