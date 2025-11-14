#!/usr/bin/env tsx

/**
 * Script di test per verificare l'invio fatture PWA
 */

async function testInvoiceSend() {
  try {
    console.log('\n🧪 TEST INVIO FATTURA PWA\n');
    
    const baseUrl = 'https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev';
    
    // Prima fai login per ottenere il cookie di sessione
    console.log('1️⃣ Login come busnari.silvia@libero.it...');
    
    const loginResponse = await fetch(`${baseUrl}/api/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'busnari.silvia@libero.it',
        password: 'Milanello2024!'
      }),
      credentials: 'include'
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login fallito: ${loginResponse.status}`);
    }
    
    // Estrai cookie di sessione
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login OK, cookie ricevuto');
    
    // Ora invia la fattura 11 via PWA
    console.log('\n2️⃣ Invio fattura 11 via PWA...');
    
    const sendResponse = await fetch(`${baseUrl}/api/invoices/11/send`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        channels: {
          pwa: true,
          email: false,
          whatsapp: false
        }
      }),
      credentials: 'include'
    });
    
    const result = await sendResponse.json();
    console.log('📤 Risposta invio:', result);
    
    if (result.success) {
      console.log('\n✅ TEST PASSATO! Fattura inviata con successo via PWA');
      console.log(`   Canali: ${JSON.stringify(result.results)}`);
    } else {
      console.log('\n❌ TEST FALLITO:', result.message);
    }
    
  } catch (error) {
    console.error('\n❌ Errore durante il test:', error);
    process.exit(1);
  }
}

testInvoiceSend();
