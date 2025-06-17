/**
 * Test del QR corretto di Marco Berto per verificare il flusso completo
 */

const https = require('https');

function testCorrectMarcoQR() {
  console.log('🧪 TEST QR CORRETTO MARCO BERTO');
  console.log('===============================');
  
  // Token corretto di Marco Berto (ID: 1750153393298)
  const correctToken = 'PROF_014_D84F_CLIENT_1750153393298_7BCE_e8246d03';
  const correctClientId = '1750153393298';
  
  console.log('Token Marco Berto:', correctToken);
  console.log('Client ID:', correctClientId);
  console.log('');
  
  // Test 1: Endpoint /activate
  const activateUrl = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/activate?token=${correctToken}`;
  
  console.log('🔍 PASSO 1: Test /activate con token Marco Berto');
  
  const activateReq = https.request(activateUrl, { method: 'GET' }, (res) => {
    console.log('Status /activate:', res.statusCode);
    
    if (res.statusCode === 302) {
      const redirectUrl = res.headers.location;
      console.log('✅ Redirect corretto a:', redirectUrl);
      
      // Test 2: API verify-token
      console.log('\n🔍 PASSO 2: Test verify-token API');
      
      const verifyData = JSON.stringify({
        token: correctToken,
        clientId: parseInt(correctClientId, 10)
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
        console.log('Status verify-token:', verifyRes.statusCode);
        
        let verifyData = '';
        verifyRes.on('data', (chunk) => {
          verifyData += chunk;
        });
        
        verifyRes.on('end', () => {
          if (verifyRes.statusCode === 200) {
            const clientData = JSON.parse(verifyData);
            console.log('✅ Cliente identificato:', clientData.client.firstName, clientData.client.lastName);
            console.log('   ID cliente:', clientData.client.id);
            console.log('   Email:', clientData.client.email);
            console.log('   Proprietario:', clientData.client.ownerId);
            
            if (clientData.client.firstName === 'Marco' && clientData.client.lastName === 'Berto') {
              console.log('\n🎉 SUCCESSO! Il QR identifica correttamente Marco Berto');
              console.log('✅ Sistema funzionante - nessuna confusione con Trial Account');
            } else {
              console.log('\n❌ ERRORE: Cliente sbagliato identificato');
            }
          } else {
            console.log('❌ Errore verify-token:', verifyData);
          }
        });
      });
      
      verifyReq.on('error', (error) => {
        console.error('❌ Errore verify-token:', error.message);
      });
      
      verifyReq.write(verifyData);
      verifyReq.end();
      
    } else {
      console.log('❌ Errore activate - Status:', res.statusCode);
    }
  });
  
  activateReq.on('error', (error) => {
    console.error('❌ Errore activate:', error.message);
  });
  
  activateReq.end();
}

testCorrectMarcoQR();