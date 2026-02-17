import { db } from '../db';
import { clients, activationTokens } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script per rigenerare tutti i QR code dei clienti con il nuovo URL di Sliplane
 * 
 * PREREQUISITI:
 * 1. Impostare BASE_URL su Sliplane: https://gestionale-appuntamenti.sliplane.app
 * 2. Fare il deploy su Sliplane
 * 3. Eseguire questo script
 * 
 * COME ESEGUIRE:
 * npm run regenerate-qr
 * 
 * oppure:
 * npx tsx server/scripts/regenerate-all-qr-codes.ts
 */

async function regenerateAllQRCodes() {
  console.log('🔄 Inizio rigenerazione QR codes...\n');
  
  // Verifica BASE_URL
  let baseUrl = process.env.BASE_URL;
  
  if (!baseUrl) {
    // Fallback per test su Replit
    const replitSlug = process.env.REPLIT_SLUG || process.env.REPL_SLUG;
    if (replitSlug) {
      baseUrl = `https://${replitSlug}.replit.app`;
      console.log(`⚠️  BASE_URL non impostato, uso Replit per test: ${baseUrl}`);
      console.log('   SU SLIPLANE: Imposta BASE_URL=https://gestionale-appuntamenti.sliplane.app\n');
    } else {
      console.error('❌ ERRORE: BASE_URL non impostato e non su Replit!');
      console.error('   Imposta BASE_URL=https://gestionale-appuntamenti.sliplane.app');
      process.exit(1);
    }
  } else {
    console.log(`✅ BASE_URL impostato: ${baseUrl}\n`);
  }
  
  try {
    // Leggi tutti i clienti dal database o JSON
    let allClients: any[] = [];
    
    try {
      // Prova prima con il database
      allClients = await db.select().from(clients);
      console.log(`📊 Trovati ${allClients.length} clienti nel database\n`);
    } catch (dbError) {
      // Fallback a JSON storage
      console.log('⚠️  Database non disponibile, uso JSON storage...');
      const { loadStorageData } = await import('../utils/jsonStorage.js');
      const storageData = loadStorageData();
      
      if (storageData.clients) {
        allClients = storageData.clients.map(([_, client]: [number, any]) => client);
        console.log(`📊 Trovati ${allClients.length} clienti nel JSON storage\n`);
      }
    }
    
    if (allClients.length === 0) {
      console.log('⚠️  Nessun cliente trovato');
      return;
    }
    
    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Rigenera QR per ogni cliente
    for (const client of allClients) {
      try {
        console.log(`🔄 Rigenerazione QR per: ${client.firstName} ${client.lastName} (ID: ${client.id})`);
        
        // Cerca token esistente
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
          console.log(`   ⚠️  Nessun token trovato, salto questo cliente`);
          errorCount++;
          continue;
        }
        
        // Genera nuovo URL con Sliplane
        const activationUrl = `${baseUrl}/activate?token=${token.token}`;
        
        // Genera nuovo QR code
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
        
        // Salva il nuovo QR (opzionale - potrebbe già essere salvato)
        console.log(`   ✅ QR rigenerato con successo`);
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
        console.error(`   ❌ Errore per cliente ${client.id}:`, error);
        errorCount++;
      }
    }
    
    // Salva il report
    const reportDir = path.join(process.cwd(), 'qr-regeneration-report');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportPath = path.join(reportDir, `qr-report-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
    
    // Crea un file HTML per stampare tutti i QR
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
      <div class="info">ID Cliente: ${r.clientId}</div>
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
    console.log(`✅ QR rigenerati con successo: ${successCount}`);
    console.log(`❌ Errori: ${errorCount}`);
    console.log(`📁 Report JSON salvato in: ${reportPath}`);
    console.log(`🖨️  File HTML per stampa: ${htmlPath}`);
    console.log('='.repeat(60));
    console.log('\n📋 PROSSIMI PASSI:');
    console.log('1. Apri il file HTML nel browser per stampare i QR');
    console.log('2. Distribuisci i nuovi QR ai clienti');
    console.log('3. I clienti scansionano e accedono a Sliplane (24/7!)');
    console.log('\n✅ Operazione completata!\n');
    
  } catch (error) {
    console.error('❌ Errore durante la rigenerazione:', error);
    process.exit(1);
  }
}

// Esegui lo script
regenerateAllQRCodes().catch(console.error);
