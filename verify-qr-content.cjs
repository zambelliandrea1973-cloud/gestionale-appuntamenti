/**
 * Script per verificare il contenuto dei QR codes esistenti
 * Decodifica l'immagine QR e mostra il token contenuto
 */

const fs = require('fs');
const path = require('path');

// Simula la decodifica di un QR code (normalmente useresti una libreria come qrcode-reader)
function decodeQRFromDataURL(dataURL) {
  try {
    // Il QR contiene un URL di attivazione
    // Per ora estraiamo solo il pattern del token dall'URL base64
    if (dataURL.includes('activate?token=')) {
      const match = dataURL.match(/activate\?token=([A-Z0-9_]+)/);
      return match ? match[1] : null;
    }
    
    // Se il QR contiene direttamente il token, lo estraiamo
    const tokenMatch = dataURL.match(/PROF_[A-Z0-9_]+/);
    return tokenMatch ? tokenMatch[0] : null;
  } catch (error) {
    console.error('Errore nella decodifica QR:', error);
    return null;
  }
}

function loadStorageData() {
  try {
    const data = fs.readFileSync('storage_data.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Errore nel caricamento dati:', error);
    return null;
  }
}

function verifyQRContent() {
  console.log('🔍 VERIFICA CONTENUTO QR CODES\n');
  
  const storage = loadStorageData();
  if (!storage || !storage.clients) {
    console.error('❌ Impossibile caricare i dati del storage');
    return;
  }
  
  // Trova Marco Berto (cerca anche per ID e nome parziale)
  console.log(`📋 Totale clienti nel database: ${storage.clients.length}`);
  
  // Mostra tutti i clienti per debug
  storage.clients.forEach(c => {
    console.log(`   - ${c.firstName} ${c.lastName} (ID: ${c.id})`);
  });
  
  const marcoBerto = storage.clients.find(c => 
    c.id === '1750153393298' || 
    c.id === 1750153393298 ||
    (c.firstName && c.firstName.toLowerCase().includes('marco')) ||
    (c.lastName && c.lastName.toLowerCase().includes('berto'))
  );
  
  if (!marcoBerto) {
    console.error('❌ Marco Berto non trovato');
    return;
  }
  
  console.log(`📋 Cliente trovato: ${marcoBerto.firstName} ${marcoBerto.lastName}`);
  console.log(`🆔 ID Cliente: ${marcoBerto.id}`);
  
  // Trova il token associato
  const tokenEntry = storage.activationTokens?.find(t => t.clientId === marcoBerto.id);
  
  if (!tokenEntry) {
    console.error('❌ Token di attivazione non trovato per Marco Berto');
    return;
  }
  
  console.log(`🔑 Token corretto: ${tokenEntry.token}`);
  console.log(`📅 Creato: ${new Date(tokenEntry.createdAt).toLocaleString()}`);
  
  if (tokenEntry.qrCode) {
    console.log(`\n🔍 Analisi QR Code esistente:`);
    
    // Simula la decodifica del QR
    const decodedToken = decodeQRFromDataURL(tokenEntry.qrCode);
    
    if (decodedToken) {
      console.log(`📱 Token nel QR: ${decodedToken}`);
      
      if (decodedToken === tokenEntry.token) {
        console.log(`✅ CORRISPONDENZA PERFETTA - Il QR contiene il token corretto!`);
      } else {
        console.log(`❌ ERRORE - Il QR contiene un token diverso!`);
        console.log(`   Atteso: ${tokenEntry.token}`);
        console.log(`   Trovato: ${decodedToken}`);
      }
    } else {
      console.log(`❓ Impossibile decodificare il contenuto del QR`);
      console.log(`📏 Lunghezza QR data: ${tokenEntry.qrCode.length} caratteri`);
      console.log(`🔤 Inizio QR: ${tokenEntry.qrCode.substring(0, 100)}...`);
    }
  } else {
    console.log(`❌ Nessun QR Code trovato per questo token`);
  }
  
  console.log(`\n📊 RIEPILOGO:`);
  console.log(`- Cliente: Marco Berto (ID: ${marcoBerto.id})`);
  console.log(`- Token atteso: ${tokenEntry.token}`);
  console.log(`- QR esistente: ${tokenEntry.qrCode ? 'SÌ' : 'NO'}`);
  
  return {
    clientId: marcoBerto.id,
    expectedToken: tokenEntry.token,
    hasQR: !!tokenEntry.qrCode,
    qrContent: tokenEntry.qrCode
  };
}

// Esegui la verifica
const result = verifyQRContent();

if (result && result.hasQR) {
  console.log(`\n🎯 ISTRUZIONI PER IL TEST:`);
  console.log(`1. Nell'interfaccia, trova la card "Marco Berto"`);
  console.log(`2. Clicca sul pulsante QR`);
  console.log(`3. Fai una foto del QR mostrato`);
  console.log(`4. Il QR DEVE contenere il token: ${result.expectedToken}`);
  console.log(`5. Se il token è diverso, stiamo guardando il QR sbagliato`);
}