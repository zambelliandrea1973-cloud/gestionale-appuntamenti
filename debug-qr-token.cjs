/**
 * Debug del token QR specifico di Marco Berto (ID 1750153393298)
 * Simula esattamente il processo di validazione del server
 */

const fs = require('fs');
const crypto = require('crypto');

function loadStorageData() {
  return JSON.parse(fs.readFileSync('storage_data.json', 'utf8'));
}

// Replica esatta della funzione di validazione del server
function validateQRToken(token) {
  console.log('🔍 VALIDAZIONE TOKEN SERVER:', token);
  
  const storageData = loadStorageData();
  
  if (!token) {
    return { valid: false, reason: "Token mancante" };
  }

  // Estrae codice cliente e hash dal token
  const lastUnderscoreIndex = token.lastIndexOf('_');
  if (lastUnderscoreIndex === -1) {
    return { valid: false, reason: "Formato token non valido" };
  }
  
  const clientCode = token.substring(0, lastUnderscoreIndex);
  const providedHash = token.substring(lastUnderscoreIndex + 1);
  
  console.log('  clientCode:', clientCode);
  console.log('  providedHash:', providedHash);
  
  // Verifica formato gerarchico
  const hierarchicalPattern = /^PROF_\d{3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/;
  if (!hierarchicalPattern.test(clientCode)) {
    return { valid: false, reason: "Codice cliente non in formato gerarchico" };
  }
  
  // Estrae owner ID dal codice cliente
  const ownerMatch = clientCode.match(/^PROF_(\d{3})_/);
  if (!ownerMatch) {
    return { valid: false, reason: "Impossibile identificare proprietario dal codice" };
  }
  
  const ownerId = parseInt(ownerMatch[1], 10);
  console.log('  ownerId estratto:', ownerId);
  
  // Verifica hash del token
  const tokenData = `${clientCode}_SECURE_${ownerId}`;
  const expectedHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  
  console.log('  tokenData per hash:', tokenData);
  console.log('  expectedHash:', expectedHash);
  console.log('  providedHash:', providedHash);
  
  if (providedHash !== expectedHash) {
    return { valid: false, reason: "Token non autorizzato" };
  }
  
  // Cerca il cliente nel storage
  let foundClient = null;
  for (const [clientId, client] of storageData.clients) {
    if (client.uniqueCode === clientCode && client.ownerId === ownerId) {
      foundClient = { id: clientId, ...client };
      break;
    }
  }
  
  if (!foundClient) {
    return { valid: false, reason: "Cliente non trovato" };
  }
  
  console.log('  Cliente trovato:', foundClient.firstName, foundClient.lastName);
  
  return { 
    valid: true, 
    client: foundClient,
    ownerId 
  };
}

function testMarcoToken() {
  console.log('🧪 TEST DEBUG TOKEN MARCO BERTO');
  console.log('');
  
  // Token generato dalla mia analisi precedente
  const token = 'PROF_014_D84F_CLIENT_1750153393298_7BCE_e8246d03';
  
  console.log('Token da testare:', token);
  console.log('');
  
  const result = validateQRToken(token);
  
  console.log('📊 RISULTATO VALIDAZIONE:');
  console.log('  Valid:', result.valid);
  if (result.valid) {
    console.log('  Cliente:', result.client.firstName, result.client.lastName);
    console.log('  Owner ID:', result.ownerId);
    console.log('  ✅ TOKEN VALIDO - Il problema deve essere altrove');
  } else {
    console.log('  Errore:', result.reason);
    console.log('  ❌ TOKEN INVALIDO - Ecco il problema');
  }
  
  // Verifica anche se il cliente è effettivamente nel database
  console.log('');
  console.log('🔍 VERIFICA PRESENZA CLIENTE NEL DATABASE:');
  const storageData = loadStorageData();
  
  const clientExists = storageData.clients.find(([id, client]) => 
    id === 1750153393298 && client.firstName === 'Marco' && client.lastName === 'Berto'
  );
  
  if (clientExists) {
    const [id, client] = clientExists;
    console.log('  ✅ Cliente trovato nel database');
    console.log('  ID:', id);
    console.log('  Nome:', client.firstName, client.lastName);
    console.log('  ownerId:', client.ownerId);
    console.log('  uniqueCode:', client.uniqueCode);
  } else {
    console.log('  ❌ Cliente NON trovato nel database');
  }
}

testMarcoToken();