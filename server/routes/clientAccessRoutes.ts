// @ts-nocheck
import { logger } from '../utils/logger';
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db';
import { storage } from '../storage';
import { clients, appointments, services, clientAccesses } from '../../shared/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let defaultIconBase64 = '';
try {
  const iconPath = path.join(__dirname, '../../public/fleur-de-vie.jpg');
  const iconBuffer = fs.readFileSync(iconPath);
  defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
} catch (error: any) {
  try {
    const iconPathAlt = path.join(__dirname, '../../public/images/Fleur de Vie multicolore.jpg');
    const iconBuffer = fs.readFileSync(iconPathAlt);
    defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
  } catch (error2) {
    defaultIconBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzQjgyRjYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAySDE0VjRIMTJWMlpNMTIgMThIMTRWMjBIMTJWMThaTTIwIDEwSDE4VjEySDIwVjEwWk02IDEwSDRWMTJINlYxMFpNMTggMTBWMTJIMTZWMTBIMThaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
  }
}

async function generateProfessionistCode(userId: number): Promise<string> {
  return `PROF_${userId.toString().padStart(3, '0')}`;
}

async function getProfessionistCode(userId: number): Promise<string> {
  const storageData = loadStorageData();
  if (storageData.professionistCodes && storageData.professionistCodes[userId]) {
    return storageData.professionistCodes[userId];
  }
  const newCode = await generateProfessionistCode(userId);
  if (!storageData.professionistCodes) {
    storageData.professionistCodes = {};
  }
  storageData.professionistCodes[userId] = newCode;
  saveStorageData(storageData);
  return newCode;
}

async function generateClientCode(ownerId: number, clientId: number): Promise<string> {
  const profCode = await getProfessionistCode(ownerId);
  const clientNumber = clientId.toString().padStart(5, '0');
  return `${profCode}_C${clientNumber}`;
}

async function validateClientOwnership(clientCode: string, expectedOwnerId: number): Promise<boolean> {
  if (!clientCode || typeof clientCode !== 'string') return false;
  const profCode = await getProfessionistCode(expectedOwnerId);
  return clientCode.startsWith(profCode);
}

async function updatePWAIconsFromCompanyLogo(userId, iconBase64) {
  try {
    if (!iconBase64 || !iconBase64.startsWith('data:image/')) {
      logger.debug(`⚠️ Icona non valida per utente ${userId}, uso fallback`);
      iconBase64 = defaultIconBase64;
    }

    const sharp = await import('sharp').then(m => m.default);
    
    const base64Data = iconBase64.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const sizes = [
      { size: 96, name: 'icon-96x96.png' },
      { size: 192, name: 'icon-192x192.png' },
      { size: 512, name: 'icon-512x512.png' },
      { size: 96, name: `owner-${userId}-icon-96x96.png` },
      { size: 192, name: `owner-${userId}-icon-192x192.png` },
      { size: 512, name: `owner-${userId}-icon-512x512.png` }
    ];
    
    for (const { size, name } of sizes) {
      const resizedBuffer = await sharp(imageBuffer)
        .resize(size, size, { 
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();
      
      const iconPath = path.join(process.cwd(), 'public', 'icons', name);
      fs.writeFileSync(iconPath, resizedBuffer);
    }
    
    logger.debug(`✅ Icone PWA aggiornate per utente ${userId} con logo aziendale`);
    
  } catch (error: any) {
    console.error(`❌ Errore aggiornamento icone PWA per utente ${userId}:`, error);
  }
}

router.delete("/api/clients/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  const clientId = parseInt(req.params.id);
  
  logger.debug(`🗑️ [DELETE PG] Richiesta eliminazione cliente ID ${clientId} da utente ${user.id} (${user.email})`);
  
  if (isNaN(clientId)) {
    return res.status(400).json({ message: "ID cliente non valido" });
  }
  
  try {
    const client = await storage.getClient(clientId);
    
    if (!client) {
      console.log(`❌ [DELETE PG] Cliente con ID ${clientId} non trovato`);
      return res.status(404).json({ message: "Cliente non trovato" });
    }
    
    if (user.type !== 'admin' && client.ownerId !== user.id) {
      console.log(`❌ [DELETE PG] Accesso negato - utente ${user.id} non è proprietario del cliente ${clientId} (proprietario: ${client.ownerId})`);
      return res.status(403).json({ message: "Non sei autorizzato a eliminare questo cliente" });
    }
    
    logger.debug(`🗑️ [DELETE PG] Eliminazione autorizzata - utente ${user.id} è ${user.type === 'admin' ? 'admin' : 'proprietario'} del cliente ${clientId}`);
    
    const deleted = await storage.deleteClient(clientId);
    
    if (!deleted) {
      console.log(`❌ [DELETE PG] Errore eliminazione cliente ${clientId}`);
      return res.status(500).json({ message: "Errore durante l'eliminazione" });
    }
    
    logger.debug(`✅ [DELETE PG] Cliente ID ${clientId} "${client.firstName} ${client.lastName}" eliminato da PostgreSQL`);
    
    res.status(200).json({ 
      message: "Cliente eliminato con successo",
      deletedClient: {
        id: clientId,
        firstName: client.firstName,
        lastName: client.lastName
      }
    });
  } catch (error: any) {
    console.error(`❌ [DELETE PG] Errore eliminazione cliente:`, error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.get("/api/clients/:id/activation-token", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  const clientId = parseInt(req.params.id);
  
  logger.debug(`🔍 [QR-INTERFACE] Richiesta QR per cliente ID: ${clientId} da utente: ${user.id} (${user.email})`);
  
  if (isNaN(clientId)) {
    return res.status(400).json({ message: "ID cliente non valido" });
  }
  
  const client = await storage.getClient(clientId);
  
  if (!client) {
    console.log(`❌ [QR-INTERFACE] Cliente ${clientId} NON TROVATO nel sistema`);
    return res.status(404).json({ message: "Cliente non trovato nel sistema" });
  }
  
  logger.debug(`🔍 [QR-INTERFACE] Cliente trovato: ${client.firstName} ${client.lastName} (ID: ${clientId}, Owner: ${client.ownerId})`);
  
  if (user.type !== 'admin' && client.ownerId && client.ownerId !== user.id) {
    console.log(`❌ [QR-INTERFACE] Accesso negato - utente ${user.id} non autorizzato per cliente del proprietario ${client.ownerId}`);
    return res.status(403).json({ message: "Non autorizzato ad accedere a questo cliente" });
  }
  
  const ownerUserId = client.ownerId || user.id;
  
  let clientCode = client.uniqueCode;
  if (!clientCode || !clientCode.startsWith('PROF_') || !(await validateClientOwnership(clientCode, ownerUserId))) {
    logger.debug(`🔧 [AUTO-FIX] Generazione codice gerarchico per cliente ${clientId}, proprietario ${ownerUserId}`);
    clientCode = await generateClientCode(ownerUserId, clientId);
    
    const profCode = await getProfessionistCode(ownerUserId);
    await storage.updateClient(clientId, {
      uniqueCode: clientCode,
      professionistCode: profCode,
      ownerId: ownerUserId
    });
    logger.debug(`✅ [AUTO-FIX] Cliente ${clientId} aggiornato con codice: ${clientCode}`);
  }
  
  const crypto = await import('crypto');
  const tokenData = `${clientCode}_SECURE_${ownerUserId}`;
  const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  const token = `${clientCode}_${stableHash}`;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  
  const activationUrl = `${protocol}://${host}/client/${clientCode}?token=${token}&clientId=${clientId}&autoLogin=true`;
  
  try {
    let QRCode;
    try {
      const qrModule = await import('qrcode');
      QRCode = qrModule.default || qrModule;
    } catch (importError) {
      console.error('Errore import QRCode:', importError);
      throw new Error('Libreria QR code non disponibile');
    }
    
    const qrCode = await QRCode.toDataURL(activationUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    const storageData = loadStorageData();
    const dbOwnerIcon = await (req.app.locals as any).storage.getUserIcon(ownerUserId);
    const ownerIcon = dbOwnerIcon || storageData.userIcons[ownerUserId] || defaultIconBase64;
    logger.debug(`🔧 [QR-PWA-SYNC] Sincronizzazione icone PWA per cliente ${clientId} con icona del proprietario ${ownerUserId}`);
    
    try {
      await updatePWAIconsFromCompanyLogo(ownerUserId, ownerIcon);
      logger.debug(`✅ [QR-PWA-SYNC] Icone PWA sincronizzate con successo per proprietario ${ownerUserId}`);
    } catch (syncError) {
      console.error(`❌ [QR-PWA-SYNC] Errore sincronizzazione icone PWA:`, syncError);
    }
    
    const responseData = {
      token,
      activationUrl,
      qrCode,
      clientName: `${client.firstName} ${client.lastName}`
    };
    
    logger.debug(`✅ [QR-INTERFACE] Risposta inviata al frontend:`);
    console.log(`   - Cliente: ${responseData.clientName}`);
    console.log(`   - Token: ${responseData.token}`);
    console.log(`   - URL: ${responseData.activationUrl}`);
    
    res.json(responseData);
  } catch (error: any) {
    console.error('Errore generazione QR:', error);
    res.status(500).json({ message: "Errore nella generazione del QR code" });
  }
});

router.post("/api/client-access/verify-token", async (req, res) => {
  const { token, clientId } = req.body;
  
  if (!token || !clientId) {
    return res.status(400).json({ message: "Token e clientId richiesti" });
  }
  
  const crypto = await import('crypto');
  
  const lastUnderscoreIndex = token.lastIndexOf('_');
  if (lastUnderscoreIndex === -1) {
    return res.status(400).json({ message: "Formato token non valido" });
  }
  
  const clientCode = token.substring(0, lastUnderscoreIndex);
  const providedHash = token.substring(lastUnderscoreIndex + 1);
  
  if (!clientCode.match(/^PROF_\d{2,3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/)) {
    const tokenParts = token.split('_');
    if (tokenParts.length === 3) {
      const [userId, tokenClientId, timestamp] = tokenParts;
      
      if (parseInt(tokenClientId, 10) !== parseInt(clientId, 10)) {
        return res.status(400).json({ message: "Token non corrisponde al cliente" });
      }
      
      const storageData = loadStorageData();
      let clientFound = null;
      
      const clientsList = storageData.clients || [];
      for (const [id, clientData] of clientsList) {
        if (parseInt(id.toString(), 10) === parseInt(clientId, 10)) {
          clientFound = clientData;
          break;
        }
      }
      
      if (!clientFound) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      return res.json({
        valid: true,
        client: {
          id: parseInt(clientId, 10),
          firstName: clientFound.firstName || '',
          lastName: clientFound.lastName || '',
          phone: clientFound.phone || '',
          email: clientFound.email || '',
          address: clientFound.address || '',
          birthday: clientFound.birthday || '',
          hasConsent: clientFound.hasConsent || false
        }
      });
    }
    
    return res.status(400).json({ message: "Codice cliente non valido" });
  }
  
  const ownerMatch = clientCode.match(/^PROF_(\d{2,3})_/);
  if (!ownerMatch) {
    return res.status(400).json({ message: "Impossibile identificare proprietario dal codice" });
  }
  
  const ownerId = parseInt(ownerMatch[1], 10);
  
  const tokenData = `${clientCode}_SECURE_${ownerId}`;
  const expectedHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  
  if (providedHash !== expectedHash) {
    return res.status(401).json({ message: "Token non autorizzato" });
  }
  
  const storageData = loadStorageData();
  const allClients = storageData.clients || [];
  
  const clientData = allClients.find(([id]) => id.toString() === clientId.toString());
  
  if (!clientData) {
    return res.status(404).json({ message: "Cliente non trovato nel sistema" });
  }
  
  const client = clientData[1];
  
  const clientOwnerId = client.ownerId;
  if (!clientOwnerId || clientOwnerId !== ownerId) {
    console.error(`🚨 VIOLAZIONE SICUREZZA: Cliente ${clientId} appartiene a ${clientOwnerId} ma token per proprietario ${ownerId}`);
    return res.status(403).json({ message: "Token non autorizzato per questo cliente" });
  }
  
  if (client.uniqueCode && !(await validateClientOwnership(client.uniqueCode, ownerId))) {
    console.error(`🚨 VIOLAZIONE SICUREZZA: Codice cliente ${client.uniqueCode} non valido per proprietario ${ownerId}`);
    return res.status(403).json({ message: "Codice cliente non valido per questo proprietario" });
  }
  
  logger.debug(`✅ Token QR verificato con successo per cliente ${clientId} (${client.firstName} ${client.lastName}) del proprietario ${ownerId}`);
  
  res.json({
    client: {
      id: clientId,
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      email: client.email,
      ownerId: client.ownerId
    }
  });
});

router.get("/api/client-access/count/:clientId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  const clientIdParam = req.params.clientId;
  
  const client = await storage.getClient(parseInt(clientIdParam, 10));
  
  if (!client) {
    return res.status(404).json({ message: "Cliente non trovato nel sistema" });
  }
  
  if (user.type !== 'admin' && client.ownerId && client.ownerId !== user.id) {
    return res.status(403).json({ message: "Non autorizzato ad accedere a questo cliente" });
  }
  
  const accessCountResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clientAccesses)
    .where(eq(clientAccesses.clientId, parseInt(clientIdParam, 10)));
  
  const displayCount = accessCountResult[0]?.count || 0;
  
  console.log(`[DEBUG COUNT] Cliente ${clientIdParam} (${client.firstName} ${client.lastName}) - accessi: ${displayCount}`);
  
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  res.json({ count: displayCount });
});

router.get("/api/clients/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Non autenticato" });
  }

  const { id } = req.params;
  const user = req.user;
  
  if (user.type !== 'admin' && user.type !== 'staff' && user.type !== 'customer') {
    return res.status(403).json({ message: "Accesso negato" });
  }

  const tenantId = user.ownerId ?? user.tenantId ?? user.id;

  const clientFound = await storage.getClient(parseInt(id, 10));

  if (!clientFound) {
    return res.status(404).json({ message: "Cliente non trovato" });
  }

  if (user.type !== 'admin') {
    if (clientFound.userId !== tenantId) {
      console.log(`🚫 [GET /api/clients/:id] User ${user.id} (tenant ${tenantId}) tentato accesso a cliente ${id} di tenant ${clientFound.userId}`);
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo cliente" });
    }
  }

  res.json({
    id: clientFound.id,
    firstName: clientFound.firstName || '',
    lastName: clientFound.lastName || '',
    phone: clientFound.phone || '',
    email: clientFound.email || '',
    address: clientFound.address || '',
    birthday: clientFound.birthday || '',
    hasConsent: clientFound.hasConsent || false,
    isFrequent: clientFound.isFrequent || false,
    notes: clientFound.notes || '',
    medicalNotes: clientFound.medicalNotes || '',
    allergies: clientFound.allergies || '',
    taxCode: clientFound.taxCode || '',
    vatNumber: clientFound.vatNumber || ''
  });
});

router.get("/api/appointments/client/:clientId", async (req, res) => {
  const { clientId } = req.params;
  const user = req.user as any;
  
  if (!clientId) {
    return res.status(400).json({ message: "ClientId richiesto" });
  }
  
  try {
    const client = await storage.getClient(parseInt(clientId));
    
    if (!client) {
      return res.status(404).json({ message: "Cliente non trovato" });
    }
    
    if (user && user.type !== 'admin' && client.ownerId !== user.id) {
      console.log(`🚫 [SECURITY] User ${user.id} tentato accesso a cliente ${clientId} di proprietà di ${client.ownerId}`);
      return res.status(403).json({ message: "Accesso negato" });
    }
    
    const clientAppointments = await storage.getAppointmentsByClient(parseInt(clientId));
    
    const formattedAppointments = clientAppointments.map(apt => ({
      id: apt.id,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      notes: apt.notes || '',
      reminderSent: apt.reminderSent || false,
      reminderConfirmed: apt.reminderConfirmed || false,
      clientId: apt.clientId
    }));
    
    res.json(formattedAppointments);
  } catch (error: any) {
    console.error(`❌ [/api/appointments/client] Errore caricamento da PostgreSQL:`, error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.get("/activate", async (req, res) => {
  const { token } = req.query;
  
  if (!token || typeof token !== 'string') {
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
  
  logger.debug(`🔍 [ACTIVATE] Tentativo di attivazione con token: ${token}`);
  
  const crypto = await import('crypto');
  
  const lastUnderscoreIndex = token.lastIndexOf('_');
  if (lastUnderscoreIndex === -1) {
    console.log(`❌ [ACTIVATE] Token senza hash: ${token}`);
    return res.status(400).send(`
      <html><head><title>Errore Attivazione</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">❌ Token Non Valido</h1>
        <p>Formato token non valido. Richiedi un nuovo QR code.</p>
      </body></html>
    `);
  }
  
  const clientCode = token.substring(0, lastUnderscoreIndex);
  const providedHash = token.substring(lastUnderscoreIndex + 1);
  
  logger.debug(`🔍 [ACTIVATE] Codice cliente: ${clientCode}, Hash: ${providedHash}`);
  
  if (!clientCode.match(/^PROF_\d{2,3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/)) {
    console.log(`❌ [ACTIVATE] Codice cliente non gerarchico: ${clientCode}`);
    console.log(`❌ [ACTIVATE] Pattern atteso: PROF_XX_XXXX_CLIENT_NNNNN_XXXX o PROF_XXX_XXXX_CLIENT_NNNNN_XXXX`);
    return res.status(400).send(`
      <html><head><title>Errore Attivazione</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">❌ Token Non Valido</h1>
        <p>Formato token non valido. Richiedi un nuovo QR code.</p>
      </body></html>
    `);
  }
  
  const ownerMatch = clientCode.match(/^PROF_(\d{2,3})_/);
  if (!ownerMatch) {
    console.log(`❌ [ACTIVATE] Impossibile estrarre proprietario da: ${clientCode}`);
    return res.status(400).send(`
      <html><head><title>Errore Attivazione</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">❌ Token Non Valido</h1>
        <p>Impossibile identificare proprietario dal codice. Richiedi un nuovo QR code.</p>
      </body></html>
    `);
  }
  
  const ownerId = parseInt(ownerMatch[1], 10);
  
  const tokenData = `${clientCode}_SECURE_${ownerId}`;
  const expectedHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  
  logger.debug(`🔍 [ACTIVATE] Owner ID: ${ownerId}, Token data: ${tokenData}, Expected hash: ${expectedHash}`);
  
  if (providedHash !== expectedHash) {
    console.log(`❌ [ACTIVATE] Hash mismatch. Provided: ${providedHash}, Expected: ${expectedHash}`);
    return res.status(401).send(`
      <html><head><title>Token Non Autorizzato</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">🔒 Token Non Autorizzato</h1>
        <p>Il token non è valido per questo cliente. Richiedi un nuovo QR code.</p>
      </body></html>
    `);
  }
  
  const clientMatch = clientCode.match(/CLIENT_(\d+)_/);
  if (!clientMatch) {
    console.log(`❌ [ACTIVATE] Impossibile estrarre client ID da: ${clientCode}`);
    return res.status(400).send(`
      <html><head><title>Errore Attivazione</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">❌ Token Non Valido</h1>
        <p>Impossibile identificare cliente dal codice. Richiedi un nuovo QR code.</p>
      </body></html>
    `);
  }
  
  const clientId = parseInt(clientMatch[1], 10);
  logger.debug(`🔍 [ACTIVATE] Client ID estratto: ${clientId}`);
  
  const storageData = loadStorageData();
  const clientsList = storageData.clients || [];
  const clientData = clientsList.find(([id]) => id === clientId);
  
  if (!clientData) {
    console.log(`❌ [ACTIVATE] Cliente ${clientId} non trovato nel sistema`);
    return res.status(404).send(`
      <html><head><title>Cliente Non Trovato</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">👤 Cliente Non Trovato</h1>
        <p>Il cliente non esiste nel sistema. Verifica il QR code.</p>
      </body></html>
    `);
  }
  
  const client = clientData[1];
  
  const clientOwnerId = client.ownerId;
  if (!clientOwnerId || clientOwnerId !== ownerId) {
    console.error(`🚨 [ACTIVATE] VIOLAZIONE SICUREZZA: Cliente ${clientId} appartiene a ${clientOwnerId} ma token per proprietario ${ownerId}`);
    return res.status(403).send(`
      <html><head><title>Accesso Negato</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">🔒 Accesso Negato</h1>
        <p>Non sei autorizzato ad accedere a questo cliente. Contatta il tuo professionista.</p>
      </body></html>
    `);
  }
  
  logger.debug(`✅ [ACTIVATE] Token valido per cliente ${clientId} (${client.firstName} ${client.lastName}) del proprietario ${ownerId}`);
  
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const clientAreaUrl = `${protocol}://${host}/client-area?token=${token}&clientId=${clientId}&autoLogin=true`;
  
  logger.debug(`🔄 [ACTIVATE] Reindirizzamento diretto alla client area: ${clientAreaUrl}`);
  
  res.redirect(clientAreaUrl);
});

router.get("/api/client-by-code/:clientCode", async (req, res) => {
  try {
    const { clientCode } = req.params;
    console.log('🏠 [CLIENT ACCESS PG] Accesso diretto per codice:', clientCode);
    
    const foundClients = await db
      .select()
      .from(clients)
      .where(eq(clients.uniqueCode, clientCode))
      .limit(1);
    
    if (!foundClients || foundClients.length === 0) {
      console.log('❌ [CLIENT ACCESS PG] Cliente non trovato per codice:', clientCode);
      return res.status(404).json({ error: 'Accesso non autorizzato' });
    }
    
    const foundClient = foundClients[0];
    console.log('🏠 [CLIENT ACCESS PG] Cliente autenticato:', foundClient.firstName, foundClient.lastName);
    
    const pureClientData = {
      id: foundClient.id,
      firstName: foundClient.firstName,
      lastName: foundClient.lastName,
      phone: foundClient.phone,
      email: foundClient.email,
      uniqueCode: foundClient.uniqueCode,
      ownerId: foundClient.ownerId
    };
    
    res.json(pureClientData);
    
  } catch (error: any) {
    console.error('❌ [CLIENT ACCESS PG] Errore sistema:', error);
    res.status(500).json({ error: 'Errore del sistema' });
  }
});

router.get("/api/client-appointments/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const { ownerId } = req.query;
    
    console.log('📅 [CLIENT APPOINTMENTS PG] Caricamento per cliente:', clientId, 'Owner:', ownerId);
    
    const clientIdNum = parseInt(clientId, 10);
    const ownerIdNum = parseInt(ownerId as string, 10);
    
    const appointmentsWithServices = await db
      .select({
        id: appointments.id,
        date: appointments.date,
        startTime: appointments.startTime,
        serviceName: services.name,
        status: appointments.status,
        notes: appointments.notes
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.clientId, clientIdNum),
          eq(appointments.userId, ownerIdNum)
        )
      )
      .orderBy(asc(appointments.date), asc(appointments.startTime));
    
    const clientAppointments = appointmentsWithServices.map(apt => ({
      id: apt.id,
      date: apt.date,
      time: apt.startTime || '09:00',
      service: apt.serviceName || 'Servizio',
      status: apt.status || 'scheduled',
      notes: apt.notes || ''
    }));
    
    console.log(`📅 [CLIENT APPOINTMENTS PG] Trovati ${clientAppointments.length} appuntamenti per cliente ${clientId}`);
    res.json(clientAppointments);
    
  } catch (error: any) {
    console.error('❌ [CLIENT APPOINTMENTS PG] Errore:', error);
    res.status(500).json({ error: 'Errore del sistema' });
  }
});

export default router;
