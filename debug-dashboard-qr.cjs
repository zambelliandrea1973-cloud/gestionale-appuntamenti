/**
 * Debug per verificare che i QR dal dashboard usino il nuovo formato
 */

const fs = require('fs');

function loadAdminCookies() {
  try {
    return fs.readFileSync('admin_cookies.txt', 'utf8').trim();
  } catch (error) {
    console.error('Errore caricamento cookies:', error);
    return '';
  }
}

async function debugDashboardQR() {
  console.log('🔍 DEBUG QR GENERATI DAL DASHBOARD\n');
  
  try {
    const { default: fetch } = await import('node-fetch');
    const cookies = loadAdminCookies();
    
    if (!cookies) {
      console.log('❌ Cookies admin non trovati');
      return;
    }
    
    // Simula richiesta QR come fa il dashboard
    console.log('📡 Richiesta QR per Marco dal dashboard...');
    const response = await fetch('https://d6546abb-db52-44bc-b646-7127baec287e-00-yym34ng3ao7z.worf.replit.dev/api/clients/1750177330362/activation-token', {
      method: 'GET',
      headers: {
        'Cookie': cookies.replace(/\n/g, '; '),
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Errore HTTP: ${response.status}`);
      const text = await response.text();
      console.log(`Risposta: ${text.substring(0, 200)}`);
      return;
    }
    
    const qrData = await response.json();
    console.log('✅ QR ricevuto dal server');
    console.log(`URL: ${qrData.url}`);
    
    // Analizza URL
    const url = new URL(qrData.url);
    console.log(`\n🔍 ANALISI URL:`);
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Host: ${url.host}`);
    console.log(`   Path: ${url.pathname}`);
    console.log(`   Query: ${url.search}`);
    
    // Verifica formato
    if (url.pathname === '/client-area') {
      console.log('\n✅ FORMATO CORRETTO: URL punta a /client-area');
      
      const token = url.searchParams.get('token');
      const clientId = url.searchParams.get('clientId');
      const autoLogin = url.searchParams.get('autoLogin');
      
      console.log(`   Token: ${token ? 'Presente' : 'Mancante'}`);
      console.log(`   Client ID: ${clientId || 'Mancante'}`);
      console.log(`   Auto Login: ${autoLogin || 'Mancante'}`);
      
      if (token && clientId && autoLogin === 'true') {
        console.log('\n🎉 QR DASHBOARD PERFETTO - Formato diretto funzionante!');
        return true;
      } else {
        console.log('\n⚠️ QR dashboard incompleto - parametri mancanti');
      }
      
    } else if (url.pathname === '/activate') {
      console.log('\n❌ FORMATO VECCHIO: URL ancora punta a /activate');
      console.log('   Il server sta ancora generando URL vecchi');
      
    } else {
      console.log(`\n❓ FORMATO SCONOSCIUTO: ${url.pathname}`);
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Errore durante debug:', error.message);
    return false;
  }
}

if (require.main === module) {
  debugDashboardQR();
}

module.exports = { debugDashboardQR };