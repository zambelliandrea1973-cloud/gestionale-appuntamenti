#!/usr/bin/env node

// Test script per verificare il sistema di tracking accessi
import https from 'https';

const BASE_URL = 'https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'd6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testTracking() {
  console.log('🧪 Test sistema tracking accessi\n');

  // Test 1: Verifica conteggio attuale per cliente 1
  console.log('1. Verifica conteggio attuale cliente 1...');
  try {
    const countBefore = await makeRequest('GET', '/api/client-access/count/1');
    console.log(`   Status: ${countBefore.status}`);
    console.log(`   Count before: ${countBefore.data}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: Simula accesso cliente
  console.log('\n2. Simula accesso cliente 1...');
  try {
    const trackResult = await makeRequest('POST', '/api/client-access/track/1', {});
    console.log(`   Status: ${trackResult.status}`);
    console.log(`   Response: ${trackResult.data}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 3: Verifica conteggio dopo tracking
  console.log('\n3. Verifica conteggio dopo tracking...');
  try {
    const countAfter = await makeRequest('GET', '/api/client-access/count/1');
    console.log(`   Status: ${countAfter.status}`);
    console.log(`   Count after: ${countAfter.data}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n✅ Test completato');
}

testTracking().catch(console.error);