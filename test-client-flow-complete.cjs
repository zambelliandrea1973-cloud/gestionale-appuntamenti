/**
 * Test completo del flusso cliente: QR → Auto-login → Area Cliente
 */

const https = require('https');

async function testClientFlow() {
  console.log('🧪 TEST FLUSSO COMPLETO CLIENTE');
  console.log('================================');
  
  const token = 'PROF_014_D84F_CLIENT_1750153393298_7BCE_e8246d03';
  const clientId = '1750153393298';
  
  // Passo 1: Simula scansione QR (endpoint /activate)
  console.log('\n🔍 PASSO 1: Scansione QR (/activate)');
  const activateUrl = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/activate?token=${token}`;
  
  const activateReq = https.request(activateUrl, { method: 'GET' }, (res) => {
    console.log('Status /activate:', res.statusCode);
    
    if (res.statusCode === 302) {
      const redirectUrl = res.headers.location;
      console.log('✅ Redirect a:', redirectUrl);
      
      // Passo 2: Simula accesso alla pagina auto-login
      console.log('\n🔍 PASSO 2: Accesso auto-login');
      const autoLoginReq = https.request(redirectUrl, { method: 'GET' }, (autoRes) => {
        console.log('Status /auto-login:', autoRes.statusCode);
        
        let autoLoginData = '';
        autoRes.on('data', (chunk) => {
          autoLoginData += chunk;
        });
        
        autoRes.on('end', () => {
          if (autoRes.statusCode === 200) {
            console.log('✅ Pagina auto-login caricata');
            
            // Passo 3: Test API verify-token (che dovrebbe essere chiamata da auto-login)
            console.log('\n🔍 PASSO 3: Verifica token cliente');
            const verifyData = JSON.stringify({
              token: token,
              clientId: parseInt(clientId, 10)
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
              
              let verifyResData = '';
              verifyRes.on('data', (chunk) => {
                verifyResData += chunk;
              });
              
              verifyRes.on('end', () => {
                if (verifyRes.statusCode === 200) {
                  const clientData = JSON.parse(verifyResData);
                  console.log('✅ Token verificato - Cliente:', clientData.client.firstName, clientData.client.lastName);
                  
                  // Passo 4: Test accesso diretto area cliente
                  console.log('\n🔍 PASSO 4: Accesso area cliente');
                  const clientAreaUrl = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/client-area?token=${token}&clientId=${clientId}`;
                  
                  const clientAreaReq = https.request(clientAreaUrl, { method: 'GET' }, (clientRes) => {
                    console.log('Status /client-area:', clientRes.statusCode);
                    
                    if (clientRes.statusCode === 200) {
                      console.log('✅ Area cliente accessibile');
                      
                      console.log('\n🎉 FLUSSO COMPLETO TESTATO CON SUCCESSO!');
                      console.log('✅ QR → Activate (302)');
                      console.log('✅ Auto-login → Pagina caricata (200)');
                      console.log('✅ Token → Verificato (200)');
                      console.log('✅ Area Cliente → Accessibile (200)');
                      console.log('\n📱 Il cliente finale (paziente) può ora accedere alla sua area dedicata!');
                      
                    } else {
                      console.log('❌ Errore area cliente - Status:', clientRes.statusCode);
                    }
                  });
                  
                  clientAreaReq.on('error', (error) => {
                    console.error('❌ Errore area cliente:', error.message);
                  });
                  
                  clientAreaReq.end();
                  
                } else {
                  console.log('❌ Errore verify-token:', verifyResData);
                }
              });
            });
            
            verifyReq.on('error', (error) => {
              console.error('❌ Errore verify-token:', error.message);
            });
            
            verifyReq.write(verifyData);
            verifyReq.end();
            
          } else {
            console.log('❌ Errore auto-login - Status:', autoRes.statusCode);
          }
        });
      });
      
      autoLoginReq.on('error', (error) => {
        console.error('❌ Errore auto-login:', error.message);
      });
      
      autoLoginReq.end();
      
    } else {
      console.log('❌ Errore activate - Status:', res.statusCode);
    }
  });
  
  activateReq.on('error', (error) => {
    console.error('❌ Errore activate:', error.message);
  });
  
  activateReq.end();
}

testClientFlow();