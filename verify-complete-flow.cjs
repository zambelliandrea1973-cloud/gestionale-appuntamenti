/**
 * Script per verificare il flusso completo QR → Auto-login → Area Cliente
 */

const https = require('https');

function testCompleteFlow() {
  console.log('🔄 TEST FLUSSO COMPLETO QR MARCO BERTO');
  console.log('===================================');
  
  // Passo 1: Test endpoint /activate
  console.log('\n📍 PASSO 1: Test endpoint /activate');
  const activateToken = 'PROF_014_D84F_CLIENT_1750153393298_7BCE_e8246d03';
  const activateUrl = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/activate?token=${activateToken}`;
  
  const activateReq = https.request(activateUrl, { method: 'GET' }, (res) => {
    console.log('Status /activate:', res.statusCode);
    
    if (res.statusCode === 302) {
      const location = res.headers.location;
      console.log('✅ Redirect OK a:', location);
      
      // Passo 2: Test API verify-token
      console.log('\n📍 PASSO 2: Test API verify-token');
      const verifyData = JSON.stringify({
        token: activateToken,
        clientId: '1750153393298'
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
        
        let data = '';
        verifyRes.on('data', (chunk) => {
          data += chunk;
        });
        
        verifyRes.on('end', () => {
          if (verifyRes.statusCode === 200) {
            const clientData = JSON.parse(data);
            console.log('✅ Token verificato - Cliente:', clientData.client.firstName, clientData.client.lastName);
            
            // Passo 3: Test dati cliente
            console.log('\n📍 PASSO 3: Test dati cliente');
            console.log('- ID:', clientData.client.id);
            console.log('- Nome:', clientData.client.firstName, clientData.client.lastName);
            console.log('- Email:', clientData.client.email);
            console.log('- Proprietario:', clientData.client.ownerId);
            
            console.log('\n🎉 FLUSSO COMPLETO FUNZIONANTE!');
            console.log('✅ QR → Activate → Verify → Dati Cliente: TUTTO OK');
            
          } else {
            console.log('❌ Errore verify-token:', data);
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

testCompleteFlow();