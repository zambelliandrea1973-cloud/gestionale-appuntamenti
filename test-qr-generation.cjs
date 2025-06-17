/**
 * Test QR code generation using admin session
 */

const fs = require('fs');

// Legge i cookies admin
const cookies = fs.readFileSync('admin_cookies.txt', 'utf8').trim();

// Test con fetch invece di https module
async function testQRGeneration() {
  console.log('🧪 TEST GENERAZIONE QR DIRETTO\n');
  
  const { default: fetch } = await import('node-fetch');
  
  try {
    const response = await fetch('https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/api/clients/1750177330362/activation-token', {
      method: 'GET',
      headers: {
        'Cookie': cookies.split('\n').join('; ')
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Errore: ${response.status} - ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log('✅ QR code generato con successo');
    console.log(`URL: ${data.url}`);
    
    // Verifica formato URL
    if (data.url.includes('/client-area?token=') && data.url.includes('&clientId=1750177330362') && data.url.includes('&autoLogin=true')) {
      console.log('✅ URL nel formato diretto corretto!');
      
      // Estrai parametri
      const urlObj = new URL(data.url);
      const token = urlObj.searchParams.get('token');
      const clientId = urlObj.searchParams.get('clientId');
      const autoLogin = urlObj.searchParams.get('autoLogin');
      
      console.log('\n📋 PARAMETRI QR:');
      console.log(`   Token: ${token}`);
      console.log(`   Client ID: ${clientId}`);
      console.log(`   Auto Login: ${autoLogin}`);
      
      console.log('\n🎯 NUOVO FLUSSO DIRETTO:');
      console.log('   1. Scansione QR → URL diretto /client-area');
      console.log('   2. ClientArea rileva parametri URL');
      console.log('   3. Autenticazione automatica');
      console.log('   4. PWA di Marco visualizzata');
      
    } else {
      console.log('❌ URL ancora nel vecchio formato');
      console.log(`Formato attuale: ${data.url}`);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

if (require.main === module) {
  testQRGeneration();
}

module.exports = { testQRGeneration };