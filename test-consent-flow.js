/**
 * Script per testare il flusso completo del consenso
 * Testa la registrazione del consenso e l'aggiornamento automatico del badge
 */

import fs from 'fs';

// Leggi i cookie di autenticazione
const cookiesRaw = fs.readFileSync('staff_cookies.txt', 'utf8');
// Estrai solo la parte del cookie session-id
const cookiesContent = cookiesRaw.split('\n')
  .find(line => line.includes('session-id'))
  ?.replace(/^[^=]+=/, 'session-id=') || '';

async function testConsentFlow() {
  const baseUrl = 'https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev';
  const clientId = '1750153393298'; // Marco Berto
  
  console.log('🧪 TESTING: Flusso completo consenso per clientId:', clientId);
  
  // 1. Verifica stato iniziale cliente
  console.log('\n1️⃣ Verifica stato iniziale cliente...');
  const clientResponse = await fetch(`${baseUrl}/api/clients/${clientId}`, {
    headers: {
      'Cookie': cookiesContent.trim(),
      'Content-Type': 'application/json'
    }
  });
  
  const clientData = await clientResponse.json();
  console.log('📋 Cliente attuale hasConsent:', clientData.hasConsent);
  
  // 2. Verifica consensi esistenti
  console.log('\n2️⃣ Verifica consensi esistenti...');
  const consentsResponse = await fetch(`${baseUrl}/api/consents/client`, {
    headers: {
      'Cookie': cookiesContent.trim(),
      'Content-Type': 'application/json'
    }
  });
  
  const consentsData = await consentsResponse.json();
  const existingConsent = consentsData.find(c => c.clientId === parseInt(clientId));
  console.log('📝 Consenso esistente:', existingConsent ? 'SÌ' : 'NO');
  
  if (existingConsent) {
    console.log('⚠️ Consenso già registrato, salto la registrazione');
  } else {
    // 3. Registra nuovo consenso
    console.log('\n3️⃣ Registrazione nuovo consenso...');
    const consentData = {
      clientId: clientId,
      consentText: "Test consenso GDPR automatico per Marco Berto",
      consentAccepted: true,
      consentType: "digital_acceptance",
      fullName: "Marco Berto"
    };
    
    const createResponse = await fetch(`${baseUrl}/api/consents`, {
      method: 'POST',
      headers: {
        'Cookie': cookiesContent.trim(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(consentData)
    });
    
    if (createResponse.ok) {
      const newConsent = await createResponse.json();
      console.log('✅ Consenso creato con ID:', newConsent.id);
    } else {
      const error = await createResponse.text();
      console.log('❌ Errore nella creazione consenso:', error);
      return;
    }
  }
  
  // 4. Attendi un momento per permettere l'aggiornamento
  console.log('\n4️⃣ Attesa aggiornamento automatico...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 5. Verifica stato finale cliente
  console.log('\n5️⃣ Verifica stato finale cliente...');
  const finalClientResponse = await fetch(`${baseUrl}/api/clients/${clientId}`, {
    headers: {
      'Cookie': cookiesContent.trim(),
      'Content-Type': 'application/json'
    }
  });
  
  const finalClientData = await finalClientResponse.json();
  console.log('📋 Cliente finale hasConsent:', finalClientData.hasConsent);
  
  // 6. Verifica lista clienti
  console.log('\n6️⃣ Verifica lista clienti...');
  const clientsResponse = await fetch(`${baseUrl}/api/clients`, {
    headers: {
      'Cookie': cookiesContent.trim(),
      'Content-Type': 'application/json'
    }
  });
  
  const clientsData = await clientsResponse.json();
  const marcoInList = clientsData.find(c => c.id.toString() === clientId);
  console.log('📋 Marco nella lista hasConsent:', marcoInList?.hasConsent);
  
  // Risultato finale
  console.log('\n🎯 RISULTATO FINALE:');
  console.log('- Cliente individuale hasConsent:', finalClientData.hasConsent);
  console.log('- Cliente in lista hasConsent:', marcoInList?.hasConsent);
  console.log('- Aggiornamento automatico:', (finalClientData.hasConsent && marcoInList?.hasConsent) ? '✅ FUNZIONA' : '❌ NON FUNZIONA');
}

// Esegui il test
testConsentFlow().catch(console.error);