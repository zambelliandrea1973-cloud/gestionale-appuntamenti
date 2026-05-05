import { db } from '../db';
import { clients, activationTokens } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script for regenerating all client QR codes with the new Sliplane URL
 * 
 * PREREQUISITI:
 * 1. Set BASE_URL on Sliplane: https://gestionale-appointments.sliplane.app
 * 2. Deploy on Sliplane
 * 3. Execute this script
 * 
 * HOW TO RUN:
 * npm run regenerate-qr
 * 
 * or:
 * npx tsx server/scripts/regenerate-all-qr-codes.ts
 */

async function regenerateAllQRCodes() {
  console.log('🔄 Inizio rigenerazione QR codes...\n');
  
  // Verify BASE_URL
  let baseUrl = process.env.BASE_URL;
  
  if (!baseUrl) {
    // Fallback per test su Replit
    const replitSlug = process.env.REPLIT_SLUG || process.env.REPL_SLUG;
    if (replitSlug) {
      baseUrl = `https://${replitSlug}.replit.app`;
      console.log(`⚠️  BASE_URL not set, using Replit for test: ${baseUrl}`);
      console.log('   ON SLIPLANE: Set BASE_URL=https://gestionale-appuntamenti.sliplane.app\n');
    } else {
      console.error('❌ ERROR: BASE_URL not set and not on Replit!');
      console.error('   Set BASE_URL=https://gestionale-appuntamenti.sliplane.app');
      process.exit(1);
    }
  } else {
    console.log(`✅ BASE_URL set: ${baseUrl}\n`);
  }
  
  try {
    // Read all clients from database or JSON
    let allClients: any[] = [];
    
    try {
      // First try with the database
      allClients = await db.select().from(clients);
      console.log(`📊 Found ${allClients.length} clients in database\n`);
    } catch (dbError) {
      // Fallback a JSON storage
      console.log('⚠️  Database not available, using JSON storage...');
      const { loadStorageData } = await import('../utils/jsonStorage.js');
      const storageData = loadStorageData();
      
      if (storageData.clients) {
        allClients = storageData.clients.map(([_, client]: [number, any]) => client);
        console.log(`📊 Found ${allClients.length} clients in JSON storage\n`);
      }
    }
    
    if (allClients.length === 0) {
      console.log('⚠️  No clients found');
      return;
    }
    
    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Rigenera QR per each client
    for (const client of allClients) {
      try {
        console.log(`🔄 Rigenerazione QR per: ${client.firstName} ${client.lastName} (ID: ${client.id})`);
        
        // Find existing token
        let token: any;
        
        try {
          const [existingToken] = await db
            .select()
            .from(activationTokens)
            .where(eq(activationTokens.clientId, client.id));
          
          token = existingToken;
        } catch (dbError) {
          // Fallback a JSON
          const { loadStorageData } = await import('../utils/jsonStorage.js');
          const storageData = loadStorageData();
          
          if (storageData.activation_tokens) {
            const tokenEntry = storageData.activation_tokens.find(
              ([_, t]: [number, any]) => t.clientId === client.id
            );
            token = tokenEntry?.[1];
          }
        }
        
        if (!token) {
          console.log(`   ⚠️  No token found, skipping this client`);
          errorCount++;
          continue;
        }
        
        // Generate new URL with Sliplane
        const activationUrl = `${baseUrl}/activate?token=${token.token}`;
        
        // Generate new QR code
        const qrOptions = {
          errorCorrectionLevel: 'M' as const,
          type: 'image/png' as const,
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        };
        
        const qrCodeData = await QRCode.toDataURL(activationUrl, qrOptions);
        
        // Save the new QR (optional - might already be saved)
        console.log(`   ✅ QR code regenerated successfully`);
        console.log(`   📱 Nuovo URL: ${activationUrl}\n`);
        
        results.push({
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          token: token.token,
          oldUrl: token.activationUrl || 'N/A',
          newUrl: activationUrl,
          qrCode: qrCodeData
        });
        
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Error for client ${client.id}:`, error);
        errorCount++;
      }
    }
    
    // Save the report
    const reportDir = path.join(process.cwd(), 'qr-regeneration-report');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportPath = path.join(reportDir, `qr-report-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
    
    // Create an HTML file for printing all QR codes
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>QR Codes Clienti - Sliplane</title>
  <style>
    @media print {
      .page-break { page-break-after: always; }
    }
    body { font-family: Arial, sans-serif; }
    .qr-container { 
      margin: 20px; 
      padding: 20px; 
      border: 2px solid #333; 
      display: inline-block;
      text-align: center;
      page-break-inside: avoid;
    }
    .qr-image { max-width: 300px; }
    h1 { text-align: center; }
    .info { margin: 10px 0; }
  </style>
</head>
<body>
  <h1>QR Codes Clienti - Sliplane Migration</h1>
  <p style="text-align: center;">Generati il: ${new Date().toLocaleString('it-IT')}</p>
  <p style="text-align: center;">Base URL: ${baseUrl}</p>
  <hr>
  ${results.map((r, index) => `
    <div class="qr-container ${index % 3 === 2 ? 'page-break' : ''}">
      <h3>${r.clientName}</h3>
      <div class="info">Client ID: ${r.clientId}</div>
      <img src="${r.qrCode}" alt="QR Code ${r.clientName}" class="qr-image">
      <div class="info" style="font-size: 10px; word-break: break-all; max-width: 300px;">
        Token: ${r.token.substring(0, 20)}...
      </div>
      <div class="info" style="font-size: 12px;">
        Scansiona per accedere alla tua area personale
      </div>
    </div>
  `).join('\n')}
</body>
</html>
`;
    
    const htmlPath = path.join(reportDir, `qr-print-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    
    // Riepilogo finale
    console.log('\n' + '='.repeat(60));
    console.log('📊 RIEPILOGO RIGENERAZIONE QR CODES');
    console.log('='.repeat(60));
    console.log(`✅ QR rigenerati successfully: ${successCount}`);
    console.log(`❌ Errori: ${errorCount}`);
    console.log(`📁 JSON report saved to: ${reportPath}`);
    console.log(`🖨️  File HTML per stampa: ${htmlPath}`);
    console.log('='.repeat(60));
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Open the HTML file in the browser to print the QR codes');
    console.log('2. Distribute new QR codes to clients');
    console.log('3. Clients scan and access Sliplane (24/7!)');
    console.log('\n✅ Operation completed!\n');
    
  } catch (error) {
    console.error('❌ Error during regeneration:', error);
    process.exit(1);
  }
}

// Execute the script
regenerateAllQRCodes().catch(console.error);
