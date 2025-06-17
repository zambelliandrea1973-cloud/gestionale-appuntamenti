/**
 * Test completo del nuovo flusso QR diretto
 */

const https = require('https');
const fs = require('fs');

function makeRequest(method, path, data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'd6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: responseData,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testDirectQRFlow() {
  console.log('🧪 TEST FLUSSO QR DIRETTO COMPLETO\n');
  
  try {
    // 1. Carica cookies admin
    const cookies = fs.readFileSync('admin_cookies.txt', 'utf8').trim();
    console.log('✅ Cookies admin caricati');
    
    // 2. Richiedi QR code per Marco (dovrebbe essere diretto ora)
    console.log('\n🔍 1. Richiesta QR code per Marco...');
    const qrResponse = await makeRequest('GET', '/api/clients/1750177330362/activation-token', null, cookies);
    
    if (qrResponse.statusCode !== 200) {
      console.log(`❌ Errore QR: ${qrResponse.statusCode} - ${qrResponse.data}`);
      return;
    }
    
    const qrData = JSON.parse(qrResponse.data);
    console.log(`✅ QR code ricevuto`);
    console.log(`URL: ${qrData.url}`);
    
    // 3. Verifica che l'URL sia nel nuovo formato diretto
    if (qrData.url.includes('/client-area?token=') && qrData.url.includes('&clientId=1750177330362') && qrData.url.includes('&autoLogin=true')) {
      console.log('✅ URL nel formato diretto corretto!');
    } else {
      console.log('❌ URL ancora nel vecchio formato!');
      console.log(`Formato attuale: ${qrData.url}`);
      return;
    }
    
    // 4. Estrai token dall'URL
    const urlParams = new URLSearchParams(qrData.url.split('?')[1]);
    const token = urlParams.get('token');
    const clientId = urlParams.get('clientId');
    const autoLogin = urlParams.get('autoLogin');
    
    console.log(`\n🔍 2. Parametri estratti dall'URL:`);
    console.log(`   Token: ${token}`);
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Auto Login: ${autoLogin}`);
    
    // 5. Testa la validazione token API (simula quello che fa ClientArea)
    console.log(`\n🔍 3. Test validazione token...`);
    const tokenResponse = await makeRequest('POST', '/api/client-access/verify-token', {
      token: token,
      clientId: parseInt(clientId)
    });
    
    if (tokenResponse.statusCode === 200) {
      const tokenData = JSON.parse(tokenResponse.data);
      console.log('✅ Token validazione riuscita!');
      console.log(`   Cliente: ${tokenData.client.firstName} ${tokenData.client.lastName}`);
      console.log(`   ID: ${tokenData.client.id}`);
      console.log(`   Consenso: ${tokenData.client.hasConsent ? 'Presente' : 'Mancante'}`);
    } else {
      console.log(`❌ Token validazione fallita: ${tokenResponse.statusCode}`);
      console.log(`   Risposta: ${tokenResponse.data}`);
      return;
    }
    
    console.log('\n🎉 SUCCESSO: Nuovo flusso QR diretto funzionante!');
    console.log('\n📋 RIEPILOGO:');
    console.log('✅ QR code genera URL diretto (/client-area)');
    console.log('✅ Parametri token, clientId, autoLogin presenti');
    console.log('✅ Token validation API funzionante');
    console.log('✅ Dati cliente recuperati correttamente');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
  }
}

if (require.main === module) {
  testDirectQRFlow();
}

module.exports = { testDirectQRFlow };