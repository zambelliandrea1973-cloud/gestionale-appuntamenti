/**
 * Script per testare il QR di Marco Berto con il nuovo endpoint /activate
 */

const https = require('https');

function testMarcoQR() {
  const token = 'PROF_014_D84F_CLIENT_1750153393298_7BCE_e8246d03';
  const url = `https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/activate?token=${token}`;
  
  console.log('🧪 TEST QR MARCO BERTO');
  console.log('URL:', url);
  console.log('Token:', token);
  console.log('');
  
  const options = {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; QR-Test/1.0)'
    }
  };
  
  const req = https.request(url, options, (res) => {
    console.log('📊 RISPOSTA SERVER:');
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('');
      console.log('📝 CONTENUTO RISPOSTA:');
      if (res.statusCode === 302) {
        console.log('✅ REDIRECT OK - Location:', res.headers.location);
      } else if (res.statusCode === 200) {
        console.log('✅ RISPOSTA OK');
        console.log(data.substring(0, 500));
      } else {
        console.log('❌ ERRORE - Status:', res.statusCode);
        console.log(data.substring(0, 500));
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ ERRORE RICHIESTA:', error.message);
  });
  
  req.end();
}

testMarcoQR();