#!/usr/bin/env tsx

/**
 * Test script to verify PWA invoice sending
 */

async function testInvoiceSend() {
  try {
    console.log('\n🧪 TEST Sending invoice PWA\n');
    
    const baseUrl = 'https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev';
    
    // First login to get the session cookie
    console.log('1️⃣ Logging in as busnari.silvia@libero.it...');
    
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
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    // Extract session cookie
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login OK, cookie received');
    
    // Time to send invoice 11 via PWA
    console.log('\n2️⃣ Sending invoice 11 via PWA...');
    
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
    console.log('📤 Send response:', result);
    
    if (result.success) {
      console.log('\n✅ TEST PASSED! Invoice sent successfully via PWA');
      console.log(`   Canali: ${JSON.stringify(result.results)}`);
    } else {
      console.log('\n❌ TEST FAILED:', result.message);
    }
    
  } catch (error) {
    console.error('\n❌ Error during test:', error);
    process.exit(1);
  }
}

testInvoiceSend();
