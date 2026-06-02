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
      logger.debug(`⚠️ Invalid icon for user ${userId}, uso fallback`);
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
    
    logger.debug(`✅ PWA icons updated for user ${userId} with company logo`);
    
  } catch (error: any) {
    console.error(`❌ Error updating PWA icons for user ${userId}:`, error);
  }
}

router.delete("/api/clients/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;
  const clientId = parseInt(req.params.id);
  
  logger.debug(`🗑️ [DELETE PG] Delete client request ID ${clientId} from user ${user.id} (${user.email})`);
  
  if (isNaN(clientId)) {
    return res.status(400).json({ message: "Invalid client ID" });
  }
  
  try {
    const client = await storage.getClient(clientId);
    
    if (!client) {
      console.log(`❌ [DELETE PG] Client with ID ${clientId} not found`);
      return res.status(404).json({ message: "Client not found" });
    }
    
    if (user.type !== 'admin' && client.ownerId !== user.id) {
      console.log(`❌ [DELETE PG] Access denied - user ${user.id} is not owner of client ${clientId} (owner: ${client.ownerId})`);
      return res.status(403).json({ message: "You are not authorized to delete this client" });
    }
    
    logger.debug(`🗑️ [DELETE PG] Deletion authorized - user ${user.id} is ${user.type === 'admin' ? 'admin' : 'owner'} of client ${clientId}`);
    
    const deleted = await storage.deleteClient(clientId);
    
    if (!deleted) {
      console.log(`❌ [DELETE PG] Error deleting client ${clientId}`);
      return res.status(500).json({ message: "Error during deletion" });
    }
    
    logger.debug(`✅ [DELETE PG] client ID ${clientId} "${client.firstName} ${client.lastName}" deleted from PostgreSQL`);
    
    res.status(200).json({ 
      message: "Client deleted successfully",
      deletedClient: {
        id: clientId,
        firstName: client.firstName,
        lastName: client.lastName
      }
    });
  } catch (error: any) {
    console.error(`❌ [DELETE PG] Error deleting client:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/clients/:id/activation-token", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;
  const clientId = parseInt(req.params.id);
  
  logger.debug(`🔍 [QR-INTERFACE] QR request for client ID: ${clientId} from user: ${user.id} (${user.email})`);
  
  if (isNaN(clientId)) {
    return res.status(400).json({ message: "Invalid client ID" });
  }
  
  const client = await storage.getClient(clientId);
  
  if (!client) {
    console.log(`❌ [QR-INTERFACE] client ${clientId} not found in system`);
    return res.status(404).json({ message: "Client not found in the system" });
  }
  
  logger.debug(`🔍 [QR-INTERFACE] Client found: ${client.firstName} ${client.lastName} (ID: ${clientId}, Owner: ${client.ownerId})`);
  
  if (user.type !== 'admin' && client.ownerId && client.ownerId !== user.id) {
    console.log(`❌ [QR-INTERFACE] Access denied - user ${user.id} unauthorized for client of owner ${client.ownerId}`);
    return res.status(403).json({ message: "Unauthorized to access this client" });
  }
  
  const ownerUserId = client.ownerId || user.id;
  
  let clientCode = client.uniqueCode;
  if (!clientCode || !clientCode.startsWith('PROF_') || !(await validateClientOwnership(clientCode, ownerUserId))) {
    logger.debug(`🔧 [AUTO-FIX] Generating hierarchical code for client ${clientId}, owner ${ownerUserId}`);
    clientCode = await generateClientCode(ownerUserId, clientId);
    
    const profCode = await getProfessionistCode(ownerUserId);
    await storage.updateClient(clientId, {
      uniqueCode: clientCode,
      professionistCode: profCode,
      ownerId: ownerUserId
    });
    logger.debug(`✅ [AUTO-FIX] Client ${clientId} updated with code: ${clientCode}`);
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
      console.error('Error importing QRCode:', importError);
      throw new Error('QR code library not available');
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
    logger.debug(`🔧 [QR-PWA-SYNC] Syncing PWA icons for client ${clientId} with owner ${ownerUserId} icon`);
    
    try {
      await updatePWAIconsFromCompanyLogo(ownerUserId, ownerIcon);
      logger.debug(`✅ [QR-PWA-SYNC] PWA icons synced successfully for owner ${ownerUserId}`);
    } catch (syncError) {
      console.error(`❌ [QR-PWA-SYNC] Error synchronizing PWA icons:`, syncError);
    }
    
    const responseData = {
      token,
      activationUrl,
      qrCode,
      clientName: `${client.firstName} ${client.lastName}`
    };
    
    logger.debug(`✅ [QR-INTERFACE] Response sent to frontend:`);
    console.log(`   - Client: ${responseData.clientName}`);
    console.log(`   - Token: ${responseData.token}`);
    console.log(`   - URL: ${responseData.activationUrl}`);
    
    res.json(responseData);
  } catch (error: any) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ message: "Error generating QR code" });
  }
});

router.post("/api/client-access/verify-token", async (req, res) => {
  const { token, clientId } = req.body;
  
  if (!token || !clientId) {
    return res.status(400).json({ message: "Token and clientId required" });
  }
  
  const crypto = await import('crypto');
  
  const lastUnderscoreIndex = token.lastIndexOf('_');
  if (lastUnderscoreIndex === -1) {
    return res.status(400).json({ message: "Invalid token format" });
  }
  
  const clientCode = token.substring(0, lastUnderscoreIndex);
  const providedHash = token.substring(lastUnderscoreIndex + 1);
  
  if (!clientCode.match(/^PROF_\d{2,3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/)) {
    const tokenParts = token.split('_');
    if (tokenParts.length === 3) {
      const [userId, tokenClientId, timestamp] = tokenParts;
      
      if (parseInt(tokenClientId, 10) !== parseInt(clientId, 10)) {
        return res.status(400).json({ message: "Token does not match the client" });
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
        return res.status(404).json({ message: "Client not found" });
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
    
    return res.status(400).json({ message: "Invalid client code" });
  }
  
  const ownerMatch = clientCode.match(/^PROF_(\d{2,3})_/);
  if (!ownerMatch) {
    return res.status(400).json({ message: "Unable to identify owner from code" });
  }
  
  const ownerId = parseInt(ownerMatch[1], 10);
  
  const tokenData = `${clientCode}_SECURE_${ownerId}`;
  const expectedHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
  
  if (providedHash !== expectedHash) {
    return res.status(401).json({ message: "Token unauthorized" });
  }
  
  const storageData = loadStorageData();
  const allClients = storageData.clients || [];
  
  const clientData = allClients.find(([id]) => id.toString() === clientId.toString());
  
  if (!clientData) {
    return res.status(404).json({ message: "Client not found in the system" });
  }
  
  const client = clientData[1];
  
  const clientOwnerId = client.ownerId;
  if (!clientOwnerId || clientOwnerId !== ownerId) {
    console.error(`🚨 SECURITY VIOLATION: Client ${clientId} belongs to ${clientOwnerId} but token for owner ${ownerId}`);
    return res.status(403).json({ message: "Token unauthorized for this client" });
  }
  
  if (client.uniqueCode && !(await validateClientOwnership(client.uniqueCode, ownerId))) {
    console.error(`🚨 SECURITY VIOLATION: Client code ${client.uniqueCode} invalid for owner ${ownerId}`);
    return res.status(403).json({ message: "Invalid client code for this owner" });
  }
  
  logger.debug(`✅ QR token verified successfully for client ${clientId} (${client.firstName} ${client.lastName}) of owner ${ownerId}`);
  
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
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;
  const clientIdParam = req.params.clientId;
  
  const client = await storage.getClient(parseInt(clientIdParam, 10));
  
  if (!client) {
    return res.status(404).json({ message: "Client not found in the system" });
  }
  
  if (user.type !== 'admin' && client.ownerId && client.ownerId !== user.id) {
    return res.status(403).json({ message: "Unauthorized to access this client" });
  }
  
  const accessCountResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clientAccesses)
    .where(eq(clientAccesses.clientId, parseInt(clientIdParam, 10)));
  
  const displayCount = accessCountResult[0]?.count || 0;
  
  console.log(`[DEBUG COUNT] Client ${clientIdParam} (${client.firstName} ${client.lastName}) - accesses: ${displayCount}`);
  
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  res.json({ count: displayCount });
});

router.get("/api/clients/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const { id } = req.params;
  const user = req.user;
  
  if (user.type !== 'admin' && user.type !== 'staff' && user.type !== 'customer') {
    return res.status(403).json({ message: "Access denied" });
  }

  const tenantId = user.ownerId ?? user.tenantId ?? user.id;

  const clientFound = await storage.getClient(parseInt(id, 10));

  if (!clientFound) {
    return res.status(404).json({ message: "Client not found" });
  }

  if (user.type !== 'admin') {
    if (clientFound.userId !== tenantId) {
      console.log(`🚫 [GET /api/clients/:id] User ${user.id} (tenant ${tenantId}) attempted access to client ${id} of tenant ${clientFound.userId}`);
      return res.status(403).json({ message: "Unauthorized to access this client" });
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
    vatNumber: clientFound.vatNumber || '',
    gender: clientFound.gender || null
  });
});

router.get("/api/appointments/client/:clientId", async (req, res) => {
  const { clientId } = req.params;
  const user = req.user as any;
  
  if (!clientId) {
    return res.status(400).json({ message: "ClientId required" });
  }
  
  try {
    const client = await storage.getClient(parseInt(clientId));
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    if (user && user.type !== 'admin' && client.ownerId !== user.id) {
      console.log(`🚫 [SECURITY] User ${user.id} attempted access to client ${clientId} owned by ${client.ownerId}`);
      return res.status(403).json({ message: "Access denied" });
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
    console.error(`❌ [/api/appointments/client] Error loading from PostgreSQL:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/activate", async (req, res) => {
  const { token } = req.query;
  
  if (!token || typeof token !== 'string') {
    return res.status(400).send(`
      <html>
        <head>
          <title>Activation Error</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #EF4444;">❌ Token Missing</h1>
          <p>Activation token not provided. Please scan the QR code again.</p>
        </body>
      </html>
    `);
  }
  
  logger.debug(`🔍 [ACTIVATE] Activation attempt with token: ${token}`);
  
  const crypto = await import('crypto');
  
  const lastUnderscoreIndex = token.lastIndexOf('_');
  if (lastUnderscoreIndex === -1) {
    console.log(`❌ [ACTIVATE] Token without hash: ${token}`);
    return res.status(400).send(`
      <html><head><title>Activation Error</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">❌ Invalid Token</h1>
        <p>Invalid token format. Please request a new QR code.</p>
      </body></html>
    `);
  }
  
  const clientCode = token.substring(0, lastUnderscoreIndex);
  const providedHash = token.substring(lastUnderscoreIndex + 1);
  
  logger.debug(`🔍 [ACTIVATE] Client code: ${clientCode}, Hash: ${providedHash}`);
  
  if (!clientCode.match(/^PROF_\d{2,3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/)) {
    console.log(`❌ [ACTIVATE] Non-hierarchical client code: ${clientCode}`);
    console.log(`❌ [ACTIVATE] Expected pattern: PROF_XX_XXXX_CLIENT_NNNNN_XXXX or PROF_XXX_XXXX_CLIENT_NNNNN_XXXX`);
    return res.status(400).send(`
      <html><head><title>Activation Error</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">❌ Invalid Token</h1>
        <p>Invalid token format. Please request a new QR code.</p>
      </body></html>
    `);
  }
  
  const ownerMatch = clientCode.match(/^PROF_(\d{2,3})_/);
  if (!ownerMatch) {
    console.log(`❌ [ACTIVATE] Unable to extract owner from: ${clientCode}`);
    return res.status(400).send(`
      <html><head><title>Activation Error</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">❌ Invalid Token</h1>
        <p>Unable to identify owner from code. Please request a new QR code.</p>
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
      <html><head><title>Unauthorized Token</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">🔒 Unauthorized Token</h1>
        <p>The token is not valid for this client. Please request a new QR code.</p>
      </body></html>
    `);
  }
  
  const clientMatch = clientCode.match(/CLIENT_(\d+)_/);
  if (!clientMatch) {
    console.log(`❌ [ACTIVATE] Unable to extract client ID from: ${clientCode}`);
    return res.status(400).send(`
      <html><head><title>Activation Error</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">❌ Invalid Token</h1>
        <p>Unable to identify client from code. Please request a new QR code.</p>
      </body></html>
    `);
  }
  
  const clientId = parseInt(clientMatch[1], 10);
  logger.debug(`🔍 [ACTIVATE] Client ID estratto: ${clientId}`);
  
  const storageData = loadStorageData();
  const clientsList = storageData.clients || [];
  const clientData = clientsList.find(([id]) => id === clientId);
  
  if (!clientData) {
    console.log(`❌ [ACTIVATE] Client ${clientId} not found in system`);
    return res.status(404).send(`
      <html><head><title>Client Not Found</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">👤 Client Not Found</h1>
        <p>The client does not exist in the system. Please verify the QR code.</p>
      </body></html>
    `);
  }
  
  const client = clientData[1];
  
  const clientOwnerId = client.ownerId;
  if (!clientOwnerId || clientOwnerId !== ownerId) {
    console.error(`🚨 [ACTIVATE] SECURITY VIOLATION: Client ${clientId} belongs to ${clientOwnerId} but token for owner ${ownerId}`);
    return res.status(403).send(`
      <html><head><title>Accesso Negato</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #EF4444;">🔒 Accesso Negato</h1>
        <p>You are not authorized to access this client. Contact your professional.</p>
      </body></html>
    `);
  }
  
  logger.debug(`✅ [ACTIVATE] Valid token for client ${clientId} (${client.firstName} ${client.lastName}) of owner ${ownerId}`);
  
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const clientAreaUrl = `${protocol}://${host}/client-area?token=${token}&clientId=${clientId}&autoLogin=true`;
  
  logger.debug(`🔄 [ACTIVATE] Direct redirect to client area: ${clientAreaUrl}`);
  
  res.redirect(clientAreaUrl);
});

router.get("/api/client-by-code/:clientCode", async (req, res) => {
  try {
    const { clientCode } = req.params;
    console.log('🏠 [CLIENT ACCESS PG] Direct access by code:', clientCode);
    
    const foundClients = await db
      .select()
      .from(clients)
      .where(eq(clients.uniqueCode, clientCode))
      .limit(1);
    
    if (!foundClients || foundClients.length === 0) {
      console.log('❌ [CLIENT ACCESS PG] Client not found for code:', clientCode);
      return res.status(404).json({ error: 'Unauthorized access' });
    }
    
    const foundClient = foundClients[0];
    console.log('🏠 [CLIENT ACCESS PG] Client authenticated:', foundClient.firstName, foundClient.lastName);
    
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
    console.error('❌ [CLIENT ACCESS PG] System error:', error);
    res.status(500).json({ error: 'System error' });
  }
});

router.get("/api/client-appointments/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const { ownerId } = req.query;
    
    console.log('📅 [CLIENT APPOINTMENTS PG] Loading for client:', clientId, 'Owner:', ownerId);
    
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
    
    console.log(`📅 [CLIENT APPOINTMENTS PG] Found ${clientAppointments.length} appointments for client ${clientId}`);
    res.json(clientAppointments);
    
  } catch (error: any) {
    console.error('❌ [CLIENT APPOINTMENTS PG] Error:', error);
    res.status(500).json({ error: 'System error' });
  }
});

export default router;
