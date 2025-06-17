/**
 * Test diretto della validazione token per debug
 */

const https = require('https');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'd6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
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

async function testTokenValidation() {
  console.log('🧪 TEST VALIDAZIONE TOKEN MARCO\n');
  
  const token = 'PROF_014_9C1F_CLIENT_1750177330362_816C_5c1bfbc3';
  const clientId = 1750177330362;
  
  console.log(`Token: ${token}`);
  console.log(`Client ID: ${clientId}`);
  
  try {
    console.log('\n📡 Invio richiesta validazione token...');
    const response = await makeRequest('POST', '/api/client-access/verify-token', {
      token: token,
      clientId: clientId
    });
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      console.log('✅ Token validazione riuscita!');
      console.log(`Cliente: ${data.client.firstName} ${data.client.lastName}`);
      console.log(`ID: ${data.client.id}`);
      console.log(`Email: ${data.client.email || 'Non specificata'}`);
      console.log(`Consenso: ${data.client.hasConsent ? 'Presente' : 'Mancante'}`);
      return true;
    } else {
      console.log('❌ Token validazione fallita');
      console.log(`Errore: ${response.data}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Errore durante test:', error.message);
    return false;
  }
}

if (require.main === module) {
  testTokenValidation();
}

module.exports = { testTokenValidation };