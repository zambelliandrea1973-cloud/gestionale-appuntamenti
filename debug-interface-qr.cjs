/**
 * Script per testare l'endpoint QR che viene usato dall'interfaccia
 */

const https = require('https');

function testInterfaceQR() {
  console.log('🔍 TEST QR DALL\'INTERFACCIA UTENTE');
  console.log('=================================');
  
  // Test endpoint per Marco Berto ID: 1750153393298
  const marcoId = '1750153393298';
  const endpoint = `/api/clients/${marcoId}/activation-token`;
  
  console.log('Cliente ID:', marcoId);
  console.log('Endpoint:', endpoint);
  console.log('');
  
  const options = {
    hostname: 'd6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev',
    port: 443,
    path: endpoint,
    method: 'GET',
    headers: {
      'Cookie': 'connect.sid=s%3A-9vPJ8wKxJhVgWYNxwqHiaDVEYZvfpNe.QdMpQ%2BSQaFhgEhBCWGCJjUMKFMSTLwYrOQKB1GGnFR8', // Session di Silvia Busnari
      'User-Agent': 'Mozilla/5.0 (compatible; Interface-Test/1.0)'
    }
  };
  
  console.log('🔍 Richiesta QR per Marco Berto come utente Silvia Busnari');
  
  const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const qrData = JSON.parse(data);
          console.log('✅ QR generato con successo');
          console.log('Token generato:', qrData.token);
          console.log('URL attivazione:', qrData.activationUrl);
          console.log('Nome cliente dal QR:', qrData.clientName);
          
          // Verifica che il token corrisponda a Marco Berto
          if (qrData.clientName === 'Marco Berto') {
            console.log('✅ QR corretto per Marco Berto');
          } else {
            console.log('❌ QR SBAGLIATO - Expected: Marco Berto, Got:', qrData.clientName);
          }
          
          // Test del token generato
          console.log('\n🔍 Test del token generato dall\'interfaccia');
          testGeneratedToken(qrData.token);
          
        } catch (parseError) {
          console.log('❌ Errore parsing JSON:', parseError.message);
          console.log('Raw data:', data.substring(0, 500));
        }
      } else {
        console.log('❌ Errore - Status:', res.statusCode);
        console.log('Response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Errore richiesta:', error.message);
  });
  
  req.end();
}

function testGeneratedToken(token) {
  const verifyData = JSON.stringify({
    token: token,
    clientId: 1750153393298 // Marco Berto ID
  });
  
  const verifyOptions = {
    hostname: 'd6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev',
    port: 443,
    path: '/api/client-access/verify-token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(verifyData)
    }
  };
  
  const verifyReq = https.request(verifyOptions, (verifyRes) => {
    console.log('Status verify:', verifyRes.statusCode);
    
    let verifyData = '';
    verifyRes.on('data', (chunk) => {
      verifyData += chunk;
    });
    
    verifyRes.on('end', () => {
      if (verifyRes.statusCode === 200) {
        const clientData = JSON.parse(verifyData);
        console.log('✅ Token dell\'interfaccia verificato');
        console.log('Cliente identificato:', clientData.client.firstName, clientData.client.lastName);
        console.log('ID:', clientData.client.id);
        console.log('Owner:', clientData.client.ownerId);
      } else {
        console.log('❌ Errore verify token:', verifyData);
      }
    });
  });
  
  verifyReq.on('error', (error) => {
    console.error('❌ Errore verify token:', error.message);
  });
  
  verifyReq.write(verifyData);
  verifyReq.end();
}

testInterfaceQR();