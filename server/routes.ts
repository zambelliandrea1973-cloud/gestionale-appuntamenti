import { registerSimpleRoutes } from "./simple-routes";
import type { Express } from "express";
import { createServer, type Server } from "http";
import fs from 'fs';
import path from 'path';

// Caricamento dati storage per validazione QR code
function loadStorageData() {
  const storageFile = path.join(process.cwd(), 'storage_data.json');
  try {
    if (fs.existsSync(storageFile)) {
      const data = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Errore caricamento storage per QR:', error);
  }
  return { clients: [] };
}

export function registerRoutes(app: Express): Server {
  // Endpoint di validazione token QR code per attivazione app PWA cliente
  app.get("/activate", (req, res) => {
    const { token } = req.query;
    
    console.log(`🔐 [ACTIVATE] Richiesta validazione token: ${token}`);
    
    if (!token || typeof token !== 'string') {
      console.log(`❌ [ACTIVATE] Token mancante o non valido`);
      return res.status(400).send(`
        <html>
          <head>
            <title>Errore Attivazione</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">❌ Token Mancante</h1>
            <p>Token di attivazione non fornito. Scansiona nuovamente il QR code.</p>
          </body>
        </html>
      `);
    }
    
    // Verifica formato token: userId_clientId_timestamp
    const tokenParts = token.split('_');
    if (tokenParts.length !== 3) {
      console.log(`❌ [ACTIVATE] Formato token non valido: ${token}`);
      return res.status(400).send(`
        <html>
          <head>
            <title>Errore Attivazione</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">❌ Token Non Valido</h1>
            <p>Formato token non valido. Richiedi un nuovo QR code.</p>
          </body>
        </html>
      `);
    }
    
    const [userId, clientId, timestamp] = tokenParts;
    const tokenTime = parseInt(timestamp);
    const currentTime = Date.now();
    const tokenAge = currentTime - tokenTime;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 giorni in millisecondi
    
    console.log(`🔍 [ACTIVATE] Verifica token - userId: ${userId}, clientId: ${clientId}, età: ${Math.floor(tokenAge / 1000 / 60)} minuti`);
    
    // Verifica che il token non sia scaduto (7 giorni)
    if (tokenAge > maxAge) {
      console.log(`⏰ [ACTIVATE] Token scaduto - età: ${Math.floor(tokenAge / 1000 / 60 / 60)} ore`);
      return res.status(400).send(`
        <html>
          <head>
            <title>Token Scaduto</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">⏰ Token Scaduto</h1>
            <p>Il token di attivazione è scaduto. Richiedi un nuovo QR code.</p>
            <p><small>I token sono validi per 7 giorni dalla generazione.</small></p>
          </body>
        </html>
      `);
    }
    
    // Verifica che il cliente esista nel sistema storage reale
    const storageData = loadStorageData();
    let clientFound = null;
    
    // Cerca il cliente nei dati storage reali
    const clients = storageData.clients || [];
    console.log(`🔍 [ACTIVATE] Ricerca cliente ID ${clientId} tra ${clients.length} clienti`);
    
    for (const [id, clientData] of clients) {
      if (id.toString() === clientId) {
        clientFound = clientData;
        console.log(`✅ [ACTIVATE] Cliente trovato: ${clientData.firstName} ${clientData.lastName}`);
        break;
      }
    }
    
    if (!clientFound) {
      console.log(`❌ [ACTIVATE] Cliente ID ${clientId} non trovato nei dati storage`);
      return res.status(404).send(`
        <html>
          <head>
            <title>Cliente Non Trovato</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">👤 Cliente Non Trovato</h1>
            <p>Il cliente non esiste nel sistema. Verifica il QR code.</p>
          </body>
        </html>
      `);
    }
    
    // Reindirizza all'app PWA del cliente
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const clientAppUrl = `${protocol}://${host}/client-login?clientId=${clientId}`;
    
    console.log(`🔐 Token validato con successo per cliente ${clientFound.firstName} ${clientFound.lastName} (${clientId})`);
    console.log(`↗️ [ACTIVATE] Reindirizzamento a: ${clientAppUrl}`);
    
    // Reindirizza direttamente all'app cliente
    res.redirect(clientAppUrl);
  });

  return registerSimpleRoutes(app);
}