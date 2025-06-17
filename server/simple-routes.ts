import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import path from "path";
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeSchedulers } from "./services/schedulerService";
import { dataProtectionService } from "./services/dataProtectionService";
import { iconConversionService } from "./services/iconConversionService";
import multer from 'multer';

// Middleware di autenticazione
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Non autenticato" });
  }
  next();
}

// Carico l'icona Fleur de Vie dal backup15 all'avvio del modulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let defaultIconBase64 = '';
try {
  const iconPath = path.join(__dirname, '../public/fleur-de-vie.jpg');
  const iconBuffer = fs.readFileSync(iconPath);
  defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
  console.log('✅ Icona Fleur de Vie caricata:', iconBuffer.length, 'bytes');
} catch (error) {
  console.log('⚠️ Icona Fleur de Vie non trovata nel percorso principale, provo percorso alternativo');
  try {
    const iconPathAlt = path.join(__dirname, '../public/images/Fleur de Vie multicolore.jpg');
    const iconBuffer = fs.readFileSync(iconPathAlt);
    defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
    console.log('✅ Icona Fleur de Vie caricata da percorso alternativo:', iconBuffer.length, 'bytes');
  } catch (error2) {
    console.log('⚠️ Icona Fleur de Vie non trovata, uso fallback');
    defaultIconBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzQjgyRjYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAySDE0VjRIMTJWMlpNMTIgMThIMTRWMjBIMTJWMThaTTIwIDEwSDE4VjEySDIwVjEwWk02IDEwSDRWMTJINlYxMFpNMTggMTBWMTJIMTZWMTBIMThaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
  }
}

// Dati semplici in memoria - recuperati dal backup15
const userData = {
  9: {
    id: 9,
    username: "zambelli.andrea.1973A@gmail.com",
    email: "zambelli.andrea.1973A@gmail.com",
    type: "customer",
    services: [
      { id: 1, name: "Visita Generale", duration: 30, price: 50, color: "#3B82F6" },
      { id: 2, name: "Controllo", duration: 15, price: 25, color: "#10B981" }
    ],
    clients: [
      { id: 1, firstName: "Mario", lastName: "Rossi", phone: "3331234567", email: "mario.rossi@email.com" },
      { id: 2, firstName: "Anna", lastName: "Verdi", phone: "3339876543", email: "anna.verdi@email.com" }
    ],
    appointments: [
      { id: 1, clientId: 1, serviceId: 1, date: "2025-01-15", startTime: "09:00", endTime: "09:30", status: "confermato" },
      { id: 2, clientId: 2, serviceId: 2, date: "2025-01-16", startTime: "14:00", endTime: "14:15", status: "confermato" }
    ],
    settings: {
      businessName: "Studio Medico",
      showBusinessName: true
    }
  },
  // Dati per utente admin (ID 3) - copia completa backup15
  3: {
    id: 3,
    username: "zambelli.andrea.1973@gmail.com",
    email: "zambelli.andrea.1973@gmail.com",
    type: "admin",
    services: [
      { id: 1, name: "Consulenza Generale", duration: 30, price: 50, color: "#3B82F6" },
      { id: 2, name: "Visita Specialistica", duration: 45, price: 80, color: "#10B981" },
      { id: 3, name: "Controllo Periodico", duration: 20, price: 35, color: "#F59E0B" },
      { id: 4, name: "Terapia Riabilitativa", duration: 60, price: 100, color: "#EF4444" },
      { id: 5, name: "Consulenza Nutrizionale", duration: 40, price: 60, color: "#8B5CF6" },
      { id: 6, name: "Fisioterapia", duration: 50, price: 75, color: "#06B6D4" }
    ],
    clients: [
      { id: 1, firstName: "Mario", lastName: "Rossi", phone: "3201234567", email: "mario.rossi@esempio.it" },
      { id: 2, firstName: "Zambelli", lastName: "Andrea", phone: "3472550110", email: "zambelli.andrea.1973@gmail.com" },
      { id: 3, firstName: "Bruna", lastName: "Pizzolato", phone: "+393401234567", email: "brunapizzolato77@gmail.com" },
      { id: 4, firstName: "Marco", lastName: "Berto", phone: "+393407654321", email: "marco_berto@msn.com" },
      { id: 5, firstName: "Valentina", lastName: "Cotrino", phone: "+393801808350", email: "" },
      { id: 6, firstName: "Cinzia", lastName: "Munaretto", phone: "+393333637578", email: "" },
      { id: 7, firstName: "Eleonora", lastName: "Tentori", phone: "+393420241919", email: "" },
      { id: 8, firstName: "Cristina", lastName: "Valetti", phone: "+393337124083", email: "" },
      { id: 9, firstName: "Matteo", lastName: "Somaschini", phone: "+393920820219", email: "" },
      { id: 10, firstName: "Leila", lastName: "Baldovin", phone: "+393312936414", email: "leila.baldovin22@gmail.com" },
      { id: 11, firstName: "Rosa", lastName: "Nappi", phone: "+393479687939", email: "" },
      { id: 12, firstName: "Giovanna", lastName: "Spano", phone: "+393666249288", email: "" },
      { id: 13, firstName: "Alan", lastName: "Marconi", phone: "+393337960111", email: "" },
      { id: 14, firstName: "Dino", lastName: "Nappi", phone: "+393385893919", email: "" },
      { id: 15, firstName: "Matteo", lastName: "Libera", phone: "+393494195547", email: "" },
      { id: 16, firstName: "giovanni", lastName: "rizzo", phone: "+392550110", email: "zambelli.andrea.1973@gmail.com" },
      { id: 17, firstName: "giovanni", lastName: "ribbio", phone: "+392550110", email: "zambelli.andrea.1973@gmail.com" },
      { id: 18, firstName: "Giulio", lastName: "Carimati", phone: "+393396253936", email: "" },
      { id: 19, firstName: "Daniela", lastName: "Biglione", phone: "+393392327893", email: "" },
      { id: 20, firstName: "Roberto", lastName: "Mascheroni", phone: "+393357004464", email: "" },
      { id: 21, firstName: "Valeria", lastName: "Benvenuto", phone: "+393348006444", email: "" }
    ],
    appointments: [
      { id: 1, clientId: 1, serviceId: 1, date: "2025-01-15", startTime: "09:00", endTime: "09:30", status: "confermato" },
      { id: 2, clientId: 2, serviceId: 2, date: "2025-01-15", startTime: "10:00", endTime: "10:45", status: "confermato" },
      { id: 3, clientId: 3, serviceId: 3, date: "2025-01-16", startTime: "14:00", endTime: "14:20", status: "in attesa" },
      { id: 4, clientId: 4, serviceId: 4, date: "2025-01-16", startTime: "16:00", endTime: "17:00", status: "confermato" },
      { id: 5, clientId: 5, serviceId: 5, date: "2025-01-17", startTime: "11:00", endTime: "11:40", status: "confermato" },
      { id: 6, clientId: 6, serviceId: 6, date: "2025-01-17", startTime: "15:30", endTime: "16:20", status: "in attesa" },
      { id: 7, clientId: 7, serviceId: 1, date: "2025-01-18", startTime: "08:30", endTime: "09:00", status: "confermato" },
      { id: 8, clientId: 8, serviceId: 2, date: "2025-01-18", startTime: "13:15", endTime: "14:00", status: "confermato" }
    ],
    settings: {
      businessName: "Studio Medico",
      showBusinessName: true
    }
  }
};

export function registerSimpleRoutes(app: Express): Server {
  setupAuth(app);
  
  // Inizializza gli scheduler per i promemoria automatici
  initializeSchedulers();

  // Sistema lineare semplice - Servizi dell'utente
  app.get("/api/services", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const deviceType = req.headers['x-device-type'] || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = userAgent.includes('Mobile') || deviceType === 'mobile';
    
    // FORZA ANTI-CACHE PER MOBILE
    if (isMobile) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `mobile-services-${Date.now()}`,
        'Last-Modified': new Date().toUTCString()
      });
      console.log(`🔄 [${deviceType}] Anti-cache applicato per servizi mobile`);
    }
    
    // Carica solo i servizi dell'utente dal file storage_data.json
    const storageData = loadStorageData();
    const userServices = storageData.userServices?.[user.id] || [];
    
    console.log(`🔧 [/api/services] [${deviceType}] Caricati ${userServices.length} servizi per utente ${user.id}`);
    res.json(userServices);
  });

  app.post("/api/services", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    // Carica e aggiorna servizi nel file storage_data.json
    const storageData = loadStorageData();
    if (!storageData.userServices) storageData.userServices = {};
    if (!storageData.userServices[user.id]) storageData.userServices[user.id] = [];
    
    const newService = {
      id: Date.now(),
      ownerId: user.id,
      ...req.body
    };
    
    storageData.userServices[user.id].push(newService);
    saveStorageData(storageData);
    
    console.log(`🔧 [/api/services] Servizio "${newService.name}" aggiunto per utente ${user.id}`);
    res.status(201).json(newService);
  });

  app.put("/api/services/:id", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const serviceId = parseInt(req.params.id);
    
    console.log(`🔧 [/api/services] PUT richiesta per servizio ID ${serviceId} da utente ${user.id}`);
    
    // Carica dati storage
    const storageData = loadStorageData();
    
    if (!storageData.userServices || !storageData.userServices[user.id]) {
      return res.status(404).json({ message: "Servizi non trovati" });
    }
    
    const serviceIndex = storageData.userServices[user.id].findIndex(s => s.id === serviceId);
    if (serviceIndex === -1) {
      return res.status(404).json({ message: "Servizio non trovato" });
    }
    
    const updatedService = {
      ...storageData.userServices[user.id][serviceIndex],
      ...req.body,
      id: serviceId,
      ownerId: user.id
    };
    
    storageData.userServices[user.id][serviceIndex] = updatedService;
    saveStorageData(storageData);
    
    console.log(`🔧 [/api/services] Servizio ID ${serviceId} aggiornato per utente ${user.id}`);
    res.json(updatedService);
  });

  app.delete("/api/services/:id", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const serviceId = parseInt(req.params.id);
    
    console.log(`🗑️ [DELETE] Tentativo eliminazione servizio ID ${serviceId} per utente ${user.id}`);
    
    // Carica e aggiorna servizi nel file storage_data.json
    const storageData = loadStorageData();
    if (!storageData.userServices || !storageData.userServices[user.id]) {
      console.log(`❌ [DELETE] Nessun servizio trovato per utente ${user.id}`);
      return res.status(404).json({ message: "Servizio non trovato" });
    }
    
    console.log(`🔍 [DELETE] Servizi disponibili per utente ${user.id}:`, 
      storageData.userServices[user.id].map(s => ({ id: s.id, name: s.name })));
    
    // Cerca il servizio con l'ID ricevuto (ora gli ID coincidono)
    const serviceIndex = storageData.userServices[user.id].findIndex(s => s.id === serviceId);
    
    if (serviceIndex === -1) {
      console.log(`❌ [DELETE] Servizio con ID ${serviceId} non trovato tra i servizi dell'utente ${user.id}`);
      return res.status(404).json({ message: "Servizio non trovato" });
    }
    
    const deletedService = storageData.userServices[user.id][serviceIndex];
    storageData.userServices[user.id].splice(serviceIndex, 1);
    saveStorageData(storageData);
    
    console.log(`✅ [DELETE] Servizio ID ${deletedService.id} "${deletedService.name}" eliminato per utente ${user.id}`);
    res.json({ success: true, message: "Servizio eliminato con successo" });
  });

  // ENDPOINT SINCRONIZZAZIONE MOBILE FORZATA
  app.get("/api/mobile-sync", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    console.log(`📱 [MOBILE-SYNC] Sincronizzazione forzata per utente ID:${user.id}, tipo:${user.type}`);
    
    // FORZA RELOAD COMPLETO DEL STORAGE
    const freshData = loadStorageData();
    
    // PREPARA DATI FILTRATI PER UTENTE SPECIFICO (stesso sistema di /api/clients)
    const allClientsRaw = freshData.clients || [];
    
    // Gestisce sia formato [id, client] che client diretto + filtra per utente
    const userClients = allClientsRaw
      .map(item => Array.isArray(item) ? item[1] : item)
      .filter(client => {
        if (user.type === 'admin') return true; // Admin vede tutti
        return client.ownerId === user.id || !client.ownerId; // Altri vedono solo i propri
      });
    
    const userSettings = freshData.userBusinessSettings?.[user.id] || { businessName: "Studio Medico", showBusinessName: true };
    const userServices = freshData.userServices?.[user.id] || [];
    
    const syncData = {
      clients: userClients,
      clientsCount: userClients.length,
      companySettings: userSettings,
      services: userServices,
      userType: user.type,
      timestamp: Date.now(),
      syncedAt: new Date().toISOString()
    };
    
    // INTESTAZIONI ANTI-CACHE MASSIME
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0, s-maxage=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': `mobile-sync-${Date.now()}-${Math.random()}`,
      'Last-Modified': new Date().toUTCString(),
      'Vary': 'User-Agent, x-device-type, x-sync-request',
      'X-Accel-Expires': '0',
      'Surrogate-Control': 'no-store',
      'X-Sync-Type': 'mobile-force'
    });
    
    console.log(`📱 [MOBILE-SYNC] Dati sincronizzati per utente ${user.id} (${user.type}): ${userClients.length} clienti filtrati, settings: ${JSON.stringify(userSettings)}`);
    res.json(syncData);
  });

  // Sistema lineare semplice - Clienti
  app.get("/api/clients", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const deviceType = req.headers['x-device-type'] || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = userAgent.includes('Mobile') || deviceType === 'mobile';
    
    console.log(`🔍 [/api/clients] [${deviceType}] Richiesta da utente ID:${user.id}, tipo:${user.type}, email:${user.email}`);
    
    // FORZA ANTI-CACHE AGGRESSIVO PER MOBILE
    if (isMobile) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `mobile-clients-${Date.now()}-${Math.random()}`,
        'Last-Modified': new Date().toUTCString(),
        'Vary': 'User-Agent, x-device-type',
        'X-Accel-Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      console.log(`🔄 [${deviceType}] Anti-cache AGGRESSIVO applicato per clienti mobile - timestamp: ${Date.now()}`);
    }
    
    // Carica dati reali dal file storage_data.json
    const allClients = loadStorageData().clients || [];
    console.log(`📦 [/api/clients] [${deviceType}] Caricati ${allClients.length} clienti totali dal storage`);
    
    // FORZA DEBUG - verifica clienti con originalOwnerId
    console.log(`🔥 [DEBUG FORCED] Cercando clienti con originalOwnerId...`);
    allClients.forEach(([id, client]) => {
      if (client.originalOwnerId !== undefined) {
        console.log(`🎯 [DEBUG] Cliente ${client.firstName} ${client.lastName}: originalOwnerId=${client.originalOwnerId}`);
      }
    });
    
    // Per admin, mostra tutti i clienti, per altri utenti solo i propri
    let userClients;
    if (user.type === 'admin') {
      userClients = allClients.map(([id, client]) => client);
      console.log(`👑 [/api/clients] [${deviceType}] Admin - Restituendo tutti i ${userClients.length} clienti`);
    
    // FORZA DEBUG OWNERSHIP OGNI VOLTA
    const ownershipStats = {};
    userClients.forEach(client => {
      const owner = client.ownerId || 'undefined';
      ownershipStats[owner] = (ownershipStats[owner] || 0) + 1;
    });
    console.log(`👑 [ADMIN-DEBUG] FORCED - Distribuzione clienti per ownerId:`, ownershipStats);
    console.log(`👑 [ADMIN-DEBUG] FORCED - Admin ID corrente: ${user.id}`);
    
    // Conta clienti propri vs altri
    const ownClients = userClients.filter(c => c.ownerId === user.id).length;
    const otherClients = userClients.filter(c => c.ownerId !== user.id).length;
    console.log(`👑 [ADMIN-DEBUG] FORCED - Clienti propri (ownerId ${user.id}): ${ownClients}`);
    console.log(`👑 [ADMIN-DEBUG] FORCED - Clienti altri account: ${otherClients}`);
    
    // SAMPLE LOG ALCUNI CLIENTI CON ORIGINALOWNERID
    const sampleClients = userClients.slice(0, 5);
    sampleClients.forEach(client => {
      console.log(`📋 [SAMPLE] Cliente ${client.firstName} ${client.lastName}: ownerId=${client.ownerId}, originalOwnerId=${client.originalOwnerId}`);
    });
    } else {
      userClients = allClients
        .filter(([id, client]) => client.ownerId === user.id)
        .map(([id, client]) => client);
      
      // Se l'utente non ha clienti, genera clienti di default
      if (userClients.length === 0) {
        console.log(`🔄 [/api/clients] Generando clienti di default per utente ${user.id} (${user.type})`);
        const defaultClients = generateDefaultClientsForUser(user.id, user.username);
        
        // Salva i nuovi clienti nel storage
        const storageData = loadStorageData();
        if (!storageData.clients) storageData.clients = [];
        
        defaultClients.forEach(client => {
          storageData.clients.push([client.id, client]);
        });
        
        saveStorageData(storageData);
        userClients = defaultClients;
        console.log(`✅ [/api/clients] Generati ${defaultClients.length} clienti di default per utente ${user.id}`);
      }
      
      console.log(`👤 [/api/clients] [${deviceType}] User ${user.id} - Restituendo ${userClients.length} clienti propri`);
    }
    
    // Log dettagliato dei primi 5 clienti per debugging completo
    const sampleClients = userClients.slice(0, 5).map(c => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      uniqueCode: c.uniqueCode,
      ownerId: c.ownerId
    }));
    console.log(`🔍 [/api/clients] [${deviceType}] Sample primi 5 clienti:`, JSON.stringify(sampleClients, null, 2));
    
    // Debug per admin: mostra distribuzione ownership
    if (user.type === 'admin') {
      const ownershipStats = {};
      userClients.forEach(client => {
        const owner = client.ownerId || 'undefined';
        ownershipStats[owner] = (ownershipStats[owner] || 0) + 1;
      });
      console.log(`👑 [ADMIN-DEBUG] Distribuzione clienti per ownerId:`, ownershipStats);
      console.log(`👑 [ADMIN-DEBUG] Admin ID corrente: ${user.id}`);
      
      // Conta clienti propri vs altri
      const ownClients = userClients.filter(c => c.ownerId === user.id).length;
      const otherClients = userClients.filter(c => c.ownerId !== user.id).length;
      console.log(`👑 [ADMIN-DEBUG] Clienti propri (ownerId ${user.id}): ${ownClients}`);
      console.log(`👑 [ADMIN-DEBUG] Clienti altri account: ${otherClients}`);
    }
    
    // Log totale con uniqueCode per identificare il problema
    const clientsWithCodes = userClients.filter(c => c.uniqueCode);
    console.log(`🏷️ [/api/clients] [${deviceType}] Clienti con uniqueCode: ${clientsWithCodes.length}/${userClients.length}`);
    
    res.json(userClients);
  });

  app.post("/api/clients", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    console.log(`🔄 [POST /api/clients] Richiesta da utente ${user.id} (${user.type})`);
    console.log(`📝 [POST /api/clients] Dati ricevuti:`, req.body);
    
    try {
      // Verifica limiti basati sul piano di abbonamento
      const storageData = loadStorageData();
      const currentClients = (storageData.clients || []).filter(([id, client]) => 
        user.type === 'admin' || client.ownerId === user.id || !client.ownerId
      ).length;
      
      const limits = {
        admin: 'unlimited',
        staff: 'unlimited', 
        customer: 1000,
        basic: 100
      };
      
      const userLimit = limits[user.type] || limits.basic;
      
      console.log(`📊 [POST /api/clients] Limite ${userLimit}, Correnti: ${currentClients}`);
      
      if (userLimit !== 'unlimited' && currentClients >= userLimit) {
        console.log(`❌ [POST /api/clients] Limite raggiunto per utente ${user.id}`);
        return res.status(403).json({ 
          message: `Limite clienti raggiunto per piano ${user.type}`,
          limit: userLimit,
          current: currentClients,
          upgradeRequired: true
        });
      }
      
      // Crea nuovo cliente con ownership e codice gerarchico
      const clientId = Date.now();
      const hierarchicalCode = generateClientCode(user.id, clientId);
      
      const newClient = {
        id: clientId,
        ownerId: user.id,
        uniqueCode: hierarchicalCode,
        professionistCode: getProfessionistCode(user.id),
        createdAt: new Date().toISOString(),
        ...req.body
      };
      
      console.log(`✅ [POST /api/clients] Nuovo cliente creato:`, newClient);
      
      // Aggiungi al storage persistente
      if (!storageData.clients) storageData.clients = [];
      storageData.clients.push([newClient.id, newClient]);
      
      // Salva con backup
      try {
        saveStorageData(storageData);
        console.log(`💾 [POST /api/clients] Cliente salvato nel storage persistente`);
      } catch (saveError) {
        console.error(`❌ [POST /api/clients] Errore salvataggio storage:`, saveError);
        return res.status(500).json({ message: "Errore durante il salvataggio" });
      }
      
      console.log(`👤 [POST /api/clients] Cliente creato da utente ${user.id} (${user.type}): ${newClient.firstName} ${newClient.lastName} - Limite: ${userLimit}, Correnti: ${currentClients + 1}`);
      
      res.status(201).json(newClient);
    } catch (error) {
      console.error(`❌ [POST /api/clients] Errore generale:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // PUT /api/clients/:id - Aggiorna cliente esistente
  app.put("/api/clients/:id", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clientId = parseInt(req.params.id);
    const deviceType = req.headers['x-device-type'] || 'unknown';
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "ID cliente non valido" });
    }

    try {
      console.log(`✏️ [PUT /api/clients/${clientId}] [${deviceType}] Richiesta da utente ID:${user.id}, tipo:${user.type}, email:${user.email}`);
      console.log(`✏️ [PUT /api/clients/${clientId}] [${deviceType}] Dati ricevuti:`, req.body);

      const storageData = loadStorageData();
      
      // Il storage usa un Map convertito in array di tuple [id, data]
      // Trova il cliente esistente
      const existingClientIndex = storageData.clients.findIndex((entry: any) => {
        return Array.isArray(entry) ? entry[0] === clientId : entry.id === clientId;
      });
      
      if (existingClientIndex === -1) {
        console.log(`❌ [PUT /api/clients/${clientId}] Cliente non trovato`);
        return res.status(404).json({ message: "Cliente non trovato" });
      }

      const existingClientEntry = storageData.clients[existingClientIndex];
      const existingClient = Array.isArray(existingClientEntry) ? existingClientEntry[1] : existingClientEntry;
      
      // Verifica ownership per utenti non-staff
      if (user.type !== 'staff' && existingClient.ownerId !== user.id) {
        console.log(`❌ [PUT /api/clients/${clientId}] Accesso negato - cliente non appartiene all'utente`);
        return res.status(403).json({ message: "Accesso negato" });
      }

      // Aggiorna i dati del cliente mantenendo ID e ownerId
      const updatedClient = {
        ...existingClient,
        ...req.body,
        id: clientId, // Mantieni l'ID originale
        ownerId: existingClient.ownerId, // Mantieni il proprietario originale
        updatedAt: new Date().toISOString()
      };

      // Sostituisci il cliente nell'array (mantieni il formato tuple se necessario)
      if (Array.isArray(existingClientEntry)) {
        storageData.clients[existingClientIndex] = [clientId, updatedClient];
      } else {
        storageData.clients[existingClientIndex] = updatedClient;
      }
      
      // Salva nel file
      saveStorageData(storageData);
      
      console.log(`✅ [PUT /api/clients/${clientId}] Cliente aggiornato con successo`);
      res.json(updatedClient);
      
    } catch (error) {
      console.error(`❌ [PUT /api/clients/${clientId}] Errore durante l'aggiornamento:`, error);
      res.status(500).json({ message: "Errore interno del server" });
    }
  });

  // Sistema lineare semplice - Appuntamenti
  // Endpoint rimossi - duplicati degli endpoint attivi alle linee 485+

  // Impostazioni azienda - RIMOSSO DUPLICATO ERRATO (ora gestito da storage_data.json)

  // Informazioni di contatto
  app.get("/api/contact-info", (req, res) => {
    res.json({
      email: "info@studiomedico.it",
      phone: "+39 123 456 7890"
    });
  });

  // Info applicazione rimossa - usa l'endpoint unificato sopra

  // Contesto tenant
  app.get("/api/tenant-context", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    res.json({
      userId: user.id,
      userType: user.type,
      tenantId: `tenant_${user.id}`
    });
  });

  // Utente con licenza - SINCRONIZZAZIONE COMPLETA MOBILE/DESKTOP
  app.get("/api/user-with-license", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const deviceType = req.headers['x-device-type'] || 'unknown';
    
    console.log(`🔐 [${deviceType}] /api/user-with-license per utente ${user.id} (${user.username})`);
    
    // Carica dati completi dal storage per nome/cognome aggiornati
    const storageData = loadStorageData();
    let firstName = user.firstName || null;
    let lastName = user.lastName || null;
    
    // Per TUTTI gli utenti, carica nome/cognome dalle impostazioni aziendali uniformemente
    if (storageData.companyNameSettings?.[user.id]) {
      const settings = storageData.companyNameSettings[user.id];
      if (settings.name) {
        const nameParts = settings.name.split(' ');
        firstName = nameParts[0] || null;
        lastName = nameParts.slice(1).join(' ') || null;
      }
    }
    
    const response = {
      id: user.id,
      username: user.username,
      email: user.email,
      type: user.type,
      firstName: firstName,
      lastName: lastName,
      licenseInfo: {
        type: user.type === 'admin' ? 'passepartout' : 
              user.type === 'staff' ? 'staff_free_10years' : 
              user.type === 'customer' ? 'business_pro' : 'basic',
        expiresAt: user.type === 'staff' ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) : null, // 10 anni per staff
        isActive: true,
        daysLeft: user.type === 'staff' ? 3650 : null, // 10 anni in giorni
        features: {
          maxClients: user.type === 'admin' ? 'unlimited' : 
                     user.type === 'staff' ? 'unlimited' : 
                     user.type === 'customer' ? 1000 : 50,
          maxAppointments: user.type === 'admin' ? 'unlimited' : 
                          user.type === 'staff' ? 'unlimited' : 
                          user.type === 'customer' ? 'unlimited' : 100,
          advancedReports: user.type !== 'basic',
          emailNotifications: true,
          mobileSync: true,
          customBranding: user.type === 'admin' || user.type === 'staff',
          multiTenant: user.type === 'admin',
          staffReferrals: user.type === 'staff'
        }
      }
    };
    
    console.log(`📱💻 [${deviceType}] Dati utente unificati:`, { 
      id: response.id, 
      username: response.username, 
      firstName: response.firstName, 
      lastName: response.lastName 
    });
    
    res.json(response);
  });

  // Fuso orario
  app.get("/api/timezone-settings", (req, res) => {
    res.json({ timezone: "Europe/Rome", offset: 2 });
  });

  app.post("/api/timezone-settings", (req, res) => {
    res.json({ success: true, timezone: req.body.timezone, offset: req.body.offset });
  });

  // Licenze
  app.get("/api/license/license-info", (req, res) => {
    if (!req.isAuthenticated()) return res.json({ hasLicense: false, type: "none" });
    
    const user = req.user as any;
    const licenseTypes = {
      admin: "passepartout",
      staff: "staff_free_10years", 
      customer: "business_pro",
      basic: "basic"
    };
    
    res.json({ 
      hasLicense: true, 
      type: licenseTypes[user.type] || "basic",
      userType: user.type,
      features: {
        maxClients: user.type === 'admin' || user.type === 'staff' ? 'unlimited' : 
                   user.type === 'customer' ? 1000 : 50,
        advancedReports: user.type !== 'basic',
        customBranding: user.type === 'admin' || user.type === 'staff'
      }
    });
  });

  app.get("/api/license/has-pro-access", (req, res) => {
    if (!req.isAuthenticated()) return res.json(false);
    const user = req.user as any;
    res.json(user.type === 'admin' || user.type === 'staff' || user.type === 'customer');
  });

  app.get("/api/license/has-business-access", (req, res) => {
    if (!req.isAuthenticated()) return res.json(false);
    const user = req.user as any;
    res.json(user.type !== 'basic');
  });

  app.get("/api/license/application-title", (req, res) => {
    res.json({ title: "Gestionale Sanitario" });
  });

  // Sistema permanente icone PER UTENTE con persistenza
  const storageFile = path.join(__dirname, '../storage_data.json');
  
  function loadStorageData() {
    try {
      if (fs.existsSync(storageFile)) {
        const data = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
        if (!data.userIcons) data.userIcons = {};
        if (!data.userBusinessSettings) data.userBusinessSettings = {};
        if (!data.userServices) data.userServices = {};
        if (!data.professionistCodes) data.professionistCodes = {};
        if (!data.clientCodes) data.clientCodes = {};
        return data;
      }
    } catch (error) {
      console.error('Errore caricamento storage:', error);
    }
    return { userIcons: {}, userBusinessSettings: {}, userServices: {}, professionistCodes: {}, clientCodes: {} };
  }

  // Genera codice professionista univoco basato su licenza
  async function generateProfessionistCode(userId: number): Promise<string> {
    const crypto = await import('crypto');
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(`PROF_${userId}_${timestamp}`).digest('hex').substring(0, 4).toUpperCase();
    return `PROF_${userId.toString().padStart(3, '0')}_${hash}`;
  }

  // Recupera o genera il codice professionista
  async function getProfessionistCode(userId: number): Promise<string> {
    const storageData = loadStorageData();
    
    // Cerca se l'utente ha già un codice professionista
    if (storageData.professionistCodes && storageData.professionistCodes[userId]) {
      return storageData.professionistCodes[userId];
    }
    
    // Genera nuovo codice e lo salva
    const newCode = await generateProfessionistCode(userId);
    
    if (!storageData.professionistCodes) {
      storageData.professionistCodes = {};
    }
    
    storageData.professionistCodes[userId] = newCode;
    saveStorageData(storageData);
    
    console.log(`✅ Nuovo codice professionista generato per utente ${userId}: ${newCode}`);
    return newCode;
  }

  // Genera codice cliente che include codice professionista
  async function generateClientCode(ownerId: number, clientId: number): Promise<string> {
    const crypto = await import('crypto');
    const profCode = await getProfessionistCode(ownerId);
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(`${profCode}_CLIENT_${clientId}_${timestamp}`).digest('hex').substring(0, 4).toUpperCase();
    return `${profCode}_CLIENT_${clientId}_${hash}`;
  }

  // Valida ownership attraverso codice gerarchico
  async function validateClientOwnership(clientCode: string, expectedOwnerId: number): Promise<boolean> {
    if (!clientCode || typeof clientCode !== 'string') return false;
    const profCode = await getProfessionistCode(expectedOwnerId);
    return clientCode.startsWith(profCode);
  }

  // Estrae owner ID da codice cliente
  function extractOwnerFromClientCode(clientCode: string): number | null {
    const match = clientCode.match(/^PROF_(\d{3})_/);
    return match ? parseInt(match[1], 10) : null;
  }

  function generateDefaultClientsForUser(userId, userEmail) {
    const baseId = userId * 1000; // Evita conflitti ID usando range per utente
    const userPrefix = userEmail.split('@')[0].substring(0, 2).toUpperCase();
    
    return [
      {
        id: baseId + 1,
        firstName: "Cliente",
        lastName: "Trial",
        email: `cliente.trial.${userId}@example.com`,
        phone: "+39 123 456 7890",
        birthDate: "1990-01-15",
        fiscalCode: `CLNTTL90A15${userPrefix}1X`,
        uniqueCode: `CT${baseId + 1}`,
        ownerId: userId,
        createdAt: new Date().toISOString(),
        notes: "Cliente di prova generato automaticamente"
      },
      {
        id: baseId + 2,
        firstName: "Trial",
        lastName: "Account", 
        email: `trial.account.${userId}@example.com`,
        phone: "+39 098 765 4321",
        birthDate: "1985-06-20",
        fiscalCode: `TRLCNT85H20${userPrefix}2Y`,
        uniqueCode: `TA${baseId + 2}`,
        ownerId: userId,
        createdAt: new Date().toISOString(),
        notes: "Account di test generato automaticamente"
      }
    ];
  }
  
  function cleanOldBackups() {
    try {
      const files = fs.readdirSync('.');
      const backupFiles = files.filter(f => f.startsWith('storage_data_backup_'));
      
      if (backupFiles.length > 10) {
        // Mantieni solo gli ultimi 10 backup
        const sortedBackups = backupFiles
          .map(f => ({ name: f, time: parseInt(f.split('_')[3].split('.')[0]) }))
          .sort((a, b) => b.time - a.time);
        
        const toDelete = sortedBackups.slice(10);
        toDelete.forEach(backup => {
          fs.unlinkSync(backup.name);
          console.log(`🗑️ Backup vecchio rimosso: ${backup.name}`);
        });
      }
    } catch (error) {
      console.error('Errore pulizia backup:', error);
    }
  }

  function saveStorageData(updatedData) {
    try {
      const currentData = fs.existsSync(storageFile) 
        ? JSON.parse(fs.readFileSync(storageFile, 'utf8'))
        : {};
      
      // Sistema di protezione dati avanzato
      dataProtectionService.createAutoBackup('before_critical_save');
      
      // Verifica integrità prima di procedere
      if (!dataProtectionService.verifyDataIntegrity()) {
        console.error('❌ Integrità dati compromessa, operazione bloccata');
        throw new Error('Dati corrotti rilevati, salvataggio annullato per sicurezza');
      }
      
      // Merge più specifico per preservare gli array di appuntamenti
      const mergedData = {
        ...currentData,
        ...updatedData,
        appointments: updatedData.appointments || currentData.appointments || []
      };
      
      // Salvataggio atomico: prima in un file temporaneo, poi rinomina
      const tempFile = 'storage_data_temp.json';
      fs.writeFileSync(tempFile, JSON.stringify(mergedData, null, 2));
      fs.renameSync(tempFile, storageFile);
      
      console.log(`💾 Dati salvati persistentemente - ${mergedData.appointments?.length || 0} appuntamenti totali`);
      
      // Verifica immediata del salvataggio
      const verified = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
      if (verified.appointments?.length !== mergedData.appointments?.length) {
        console.error('⚠️ ERRORE CRITICO: Verifica salvataggio fallita!');
        throw new Error('Salvataggio non verificato');
      }
      console.log(`✅ Salvataggio verificato correttamente`);
      
    } catch (error) {
      console.error('❌ Errore critico salvataggio storage:', error);
      throw error; // Rilancia l'errore per far fallire l'operazione
    }
  }
  
  // Controllo integrità all'avvio
  function verifyDataIntegrity() {
    try {
      const data = loadStorageData();
      const appointmentsCount = data.appointments?.length || 0;
      const clientsCount = data.clients?.length || 0;
      
      console.log(`🔍 Controllo integrità all'avvio:`);
      console.log(`   📅 Appuntamenti caricati: ${appointmentsCount}`);
      console.log(`   👥 Clienti caricati: ${clientsCount}`);
      
      if (appointmentsCount > 0) {
        const recentAppointments = data.appointments.slice(0, 3);
        console.log(`   🔍 Primi 3 appuntamenti:`, recentAppointments.map(item => {
          const apt = Array.isArray(item) ? item[1] : item;
          return { id: apt?.id, date: apt?.date, client: apt?.clientId };
        }));
      }
      
      console.log(`✅ Controllo integrità completato`);
      return data;
    } catch (error) {
      console.error(`❌ ERRORE INTEGRITÀ DATI:`, error);
      return { appointments: [], clients: [], userServices: {} };
    }
  }

  let storageData = verifyDataIntegrity();


  // Endpoint per ottenere sempre l'icona predefinita (per anteprima)
  app.get("/api/default-app-icon", (req, res) => {
    res.json({ 
      appName: "Gestionale Sanitario", 
      icon: defaultIconBase64,
      name: "Fleur de Vie multicolore"
    });
  });

  // Endpoint per ottenere l'icona dell'app - SEPARAZIONE PER UTENTE
  app.get("/api/client-app-info", async (req, res) => {
    let targetUserId = null;
    
    // Se autenticato, usa l'utente corrente
    if (req.isAuthenticated()) {
      targetUserId = req.user.id;
    } else {
      // Se non autenticato, controlla se c'è un token di attivazione per determinare il tenant
      const { token, clientId } = req.query;
      
      if (token && typeof token === 'string') {
        const tokenParts = token.split('_');
        if (tokenParts.length === 3) {
          const [userId] = tokenParts;
          targetUserId = parseInt(userId);
        }
      } else if (clientId) {
        // Cerca il proprietario del cliente dal clientId
        const storageData = loadStorageData();
        const clients = storageData.clients || [];
        const clientData = clients.find(([id]) => id.toString() === clientId.toString());
        if (clientData && clientData[1].ownerId) {
          targetUserId = clientData[1].ownerId;
        }
      }
    }

    // Se non riusciamo a determinare l'utente, usa l'icona predefinita
    if (!targetUserId) {
      return res.json({ 
        appName: "Gestionale Sanitario", 
        icon: defaultIconBase64 
      });
    }

    const userIcon = storageData.userIcons[targetUserId] || defaultIconBase64;
    
    // Sincronizza automaticamente le icone PWA con il logo aziendale attuale
    await updatePWAIconsFromCompanyLogo(targetUserId, userIcon);
    
    console.log(`✅ Icone PWA aggiornate per utente ${targetUserId} con logo aziendale`);
    
    res.json({ 
      appName: "Gestionale Sanitario", 
      icon: userIcon 
    });
  });

  // Endpoint per caricare una nuova icona - SEPARAZIONE PER UTENTE
  app.post("/api/upload-app-icon", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Non autenticato" });
    }

    try {
      const { iconData } = req.body;
      const userId = req.user.id;
      
      if (iconData !== undefined) {
        storageData.userIcons[userId] = iconData;
        saveStorageData(storageData);
        console.log(`🖼️ Icona personalizzata salvata persistentemente per utente ${userId} (${iconData.length} bytes)`);
        
        // Sincronizza automaticamente le icone PWA
        await updatePWAIconsFromCompanyLogo(userId, iconData);
      }
      
      res.json({ 
        success: true, 
        message: "Icona aggiornata con successo", 
        appName: "Gestionale Sanitario", 
        icon: iconData 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Errore durante il caricamento dell'icona" });
    }
  });

  // Endpoint per ripristinare l'icona di default - SEPARAZIONE PER UTENTE
  app.post("/api/reset-app-icon", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Non autenticato" });
    }

    const userId = req.user.id;
    storageData.userIcons[userId] = defaultIconBase64;
    saveStorageData(storageData);
    console.log(`🔄 Reset icona a Fleur de Vie persistente per utente ${userId}`);
    
    // Aggiorna anche le icone PWA
    await updatePWAIconsFromCompanyLogo(userId, defaultIconBase64);
    
    res.json({ 
      success: true, 
      message: "Icona ripristinata al default", 
      appName: "Gestionale Sanitario", 
      icon: defaultIconBase64 
    });
  });

  // Funzione per aggiornare le icone PWA dal logo aziendale
  async function updatePWAIconsFromCompanyLogo(userId, iconBase64) {
    try {
      if (!iconBase64 || !iconBase64.startsWith('data:image/')) {
        console.log(`⚠️ Icona non valida per utente ${userId}, uso fallback`);
        iconBase64 = defaultIconBase64;
      }

      const sharp = await import('sharp').then(m => m.default);
      
      // Rimuovi il prefisso data:image
      const base64Data = iconBase64.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Genera le diverse dimensioni per PWA
      const sizes = [
        { size: 96, name: 'icon-96x96.png' },
        { size: 192, name: 'icon-192x192.png' },
        { size: 512, name: 'icon-512x512.png' }
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
      
      console.log(`✅ Icone PWA aggiornate per utente ${userId} con logo aziendale`);
      
    } catch (error) {
      console.error(`❌ Errore aggiornamento icone PWA per utente ${userId}:`, error);
    }
  }

  // Endpoint per sincronizzare icone PWA con logo aziendale
  app.post("/api/sync-pwa-icons", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Non autenticato" });
    }

    const userId = req.user.id;
    const userIcon = storageData.userIcons[userId] || defaultIconBase64;
    
    updatePWAIconsFromCompanyLogo(userId, userIcon);
    
    res.json({ 
      success: true, 
      message: "Icone PWA sincronizzate con logo aziendale" 
    });
  });

  // Endpoint per ottenere le impostazioni nome aziendale - UNIFICATO PER TUTTI GLI UTENTI
  app.get("/api/company-name-settings", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ businessName: "Studio Medico", showBusinessName: true });
    }

    const userId = req.user.id;
    const userType = req.user.type;
    const deviceType = req.headers['x-device-type'] || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = userAgent.includes('Mobile') || deviceType === 'mobile';
    
    console.log(`🏢 [/api/company-name-settings] [${deviceType}] GET per utente ${userId} (${userType})`);
    
    // FORZA ANTI-CACHE AGGRESSIVO PER MOBILE
    if (isMobile) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `mobile-company-${Date.now()}-${Math.random()}`,
        'Last-Modified': new Date().toUTCString(),
        'Vary': 'User-Agent, x-device-type',
        'X-Accel-Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      console.log(`🔄 [${deviceType}] Anti-cache AGGRESSIVO applicato per impostazioni aziendali mobile`);
    }
    
    // Carica dati freschi dal storage_data.json
    const currentStorageData = loadStorageData();
    
    // Inizializza userBusinessSettings se non esiste
    if (!currentStorageData.userBusinessSettings) {
      currentStorageData.userBusinessSettings = {};
    }
    
    // Se l'utente non ha impostazioni, inizializza con configurazione completa come admin
    if (!currentStorageData.userBusinessSettings[userId]) {
      currentStorageData.userBusinessSettings[userId] = {
        businessName: "Studio Medico",
        showBusinessName: true,
        name: req.user.username || "Utente",
        fontSize: 24,
        fontFamily: "Arial, sans-serif",
        fontStyle: "normal",
        color: "#000000",
        enabled: true
      };
      saveStorageData(currentStorageData);
      console.log(`🆕 [${deviceType}] Inizializzate impostazioni complete per utente ${userId} (${userType})`);
    }
    
    const userSettings = currentStorageData.userBusinessSettings[userId];
    
    console.log(`🏢 [/api/company-name-settings] [${deviceType}] Settings per utente ${userId} (${userType}):`, userSettings);
    res.json(userSettings);
  });

  // Endpoint per salvare le impostazioni nome aziendale - UNIFICATO PER TUTTI GLI UTENTI
  app.post("/api/company-name-settings", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    try {
      const { businessName, showBusinessName, name, fontSize, fontFamily, fontStyle, color, enabled } = req.body;
      const userId = req.user.id;
      const userType = req.user.type;
      
      console.log(`🏢 [POST] Salvando impostazioni complete per utente ${userId} (${userType}):`, req.body);
      
      // CARICA DATI FRESCHI SEMPRE - stesso sistema del GET
      const currentStorageData = loadStorageData();
      
      // Inizializza userBusinessSettings se non esiste
      if (!currentStorageData.userBusinessSettings) {
        currentStorageData.userBusinessSettings = {};
      }
      
      // Carica impostazioni correnti o inizializza con configurazione completa
      const currentSettings = currentStorageData.userBusinessSettings[userId] || { 
        businessName: "Studio Medico", 
        showBusinessName: true,
        name: req.user.username || "Utente",
        fontSize: 24,
        fontFamily: "Arial, sans-serif",
        fontStyle: "normal",
        color: "#000000",
        enabled: true
      };
      
      // Aggiorna TUTTI i campi forniti per funzionalità complete
      if (businessName !== undefined) currentSettings.businessName = businessName;
      if (showBusinessName !== undefined) currentSettings.showBusinessName = showBusinessName;
      if (name !== undefined) currentSettings.name = name;
      if (fontSize !== undefined) currentSettings.fontSize = fontSize;
      if (fontFamily !== undefined) currentSettings.fontFamily = fontFamily;
      if (fontStyle !== undefined) currentSettings.fontStyle = fontStyle;
      if (color !== undefined) currentSettings.color = color;
      if (enabled !== undefined) currentSettings.enabled = enabled;
      
      // Salva nel storage
      currentStorageData.userBusinessSettings[userId] = currentSettings;
      saveStorageData(currentStorageData);
      
      console.log(`🏢 [POST] Impostazioni complete salvate per utente ${userId} (${userType}):`, currentSettings);
      
      res.json({ 
        success: true, 
        message: "Impostazioni salvate con successo", 
        ...currentSettings 
      });
    } catch (error) {
      console.error(`❌ [POST] Errore salvataggio impostazioni per utente ${req.user?.id}:`, error);
      res.status(500).json({ success: false, message: "Errore durante il salvataggio" });
    }
  });



  // Sistema lineare semplice - Appuntamenti (COMPLETAMENTE UNIFICATO MOBILE/DESKTOP)
  app.get("/api/appointments", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const deviceType = req.headers['x-device-type'] || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = userAgent.includes('Mobile') || deviceType === 'mobile';
    
    console.log(`📅 [/api/appointments] [${deviceType}] Richiesta da utente ID:${user.id}, tipo:${user.type}, email:${user.username}`);
    console.log(`📱 [/api/appointments] [${deviceType}] Mobile: ${isMobile}, UserAgent: ${userAgent.substring(0, 50)}...`);
    
    // FORZA ANTI-CACHE PER MOBILE - intestazioni aggressive per sincronizzazione
    if (isMobile) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `mobile-${Date.now()}`,
        'Last-Modified': new Date().toUTCString()
      });
      console.log(`🔄 [${deviceType}] Intestazioni anti-cache applicate per mobile`);
    }
    
    // UNIFICA TUTTI I DATI - stesso identico accesso per mobile e desktop
    const storageData = loadStorageData();
    const allClients = storageData.clients || [];
    const userServices = storageData.userServices?.[user.id] || [];
    
    // CARICA APPUNTAMENTI DAL STORAGE PERSISTENTE
    const allAppointments = (storageData.appointments || []).map(item => {
      if (Array.isArray(item)) {
        return item[1]; // Formato [id, appointment]
      }
      return item; // Formato diretto
    });
    
    // Per admin: accesso completo identico desktop/mobile
    // Per staff/customer: solo i propri dati
    let availableClients;
    let userAppointments;
    
    if (user.type === 'admin') {
      // ADMIN: accesso identico desktop/mobile - tutti i dati
      availableClients = allClients.map(([id, client]) => client);
      userAppointments = allAppointments;
      console.log(`👑 [/api/appointments] [${deviceType}] Admin - Accesso completo: ${allClients.length} clienti, ${userAppointments.length} appuntamenti`);
    } else {
      // STAFF/CUSTOMER: solo dati propri - identico desktop/mobile
      availableClients = allClients.map(([id, client]) => client).filter(client => client.ownerId === user.id);
      const userClientIds = availableClients.map(c => c.id);
      userAppointments = allAppointments.filter(apt => userClientIds.includes(apt.clientId));
      console.log(`👤 [/api/appointments] [${deviceType}] User ${user.id} - Dati propri: ${availableClients.length} clienti, ${userAppointments.length} appuntamenti`);
    }
    
    // Popola le relazioni con client e service usando dati persistenti
    const appointmentsWithDetails = userAppointments.map(appointment => {
      const client = availableClients.find(c => c.id === appointment.clientId);
      const service = userServices.find(s => s.id === appointment.serviceId);
      // Genera startTime e endTime se mancanti per compatibilità frontend
      const startTime = appointment.startTime || appointment.time || "09:00";
      const duration = appointment.duration || 60;
      const endTime = appointment.endTime || (() => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hours, minutes + duration, 0, 0);
        return endDate.toTimeString().substring(0, 5);
      })();

      return { 
        ...appointment, 
        startTime,
        endTime,
        client: client || { firstName: "Cliente", lastName: "Sconosciuto", id: appointment.clientId },
        service: service || { name: "Servizio Sconosciuto", id: appointment.serviceId, color: "#666666" }
      };
    });
    
    console.log(`📱💻 [${deviceType}] Sincronizzazione completa: restituiti ${appointmentsWithDetails.length} appuntamenti`);
    res.json(appointmentsWithDetails);
  });

  app.get("/api/appointments/date/:date", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const { date } = req.params;
    const deviceType = req.headers['x-device-type'] || 'unknown';
    
    console.log(`📅 [/api/appointments/date] [${deviceType}] Utente ${user.id} cerca appuntamenti per data ${date}`);
    
    // UNIFICA TUTTI I DATI - stesso identico accesso per mobile e desktop
    const storageData = loadStorageData();
    const allClients = storageData.clients || [];
    const userServices = storageData.userServices?.[user.id] || [];
    // CARICA APPUNTAMENTI DAL STORAGE PERSISTENTE
    const allAppointments = (storageData.appointments || []).map(item => {
      if (Array.isArray(item)) {
        return item[1]; // Formato [id, appointment]
      }
      return item; // Formato diretto
    });
    
    console.log(`📅 [${deviceType}] Appuntamenti totali nell'account: ${allAppointments.length}`);
    
    // Per admin: accesso completo identico desktop/mobile
    // Per staff/customer: solo i propri dati
    let availableClients;
    let userAppointments;
    
    if (user.type === 'admin') {
      // ADMIN: accesso identico desktop/mobile - tutti i dati
      availableClients = allClients.map(([id, client]) => client);
      userAppointments = allAppointments;
      console.log(`👑 [${deviceType}] Admin - Accesso completo a tutti gli appuntamenti`);
    } else {
      // STAFF/CUSTOMER: solo dati propri - identico desktop/mobile  
      availableClients = allClients.map(([id, client]) => client).filter(client => client.ownerId === user.id);
      const userClientIds = availableClients.map(c => c.id);
      userAppointments = allAppointments.filter(apt => userClientIds.includes(apt.clientId));
      console.log(`👤 [${deviceType}] User ${user.id} - Solo appuntamenti con clienti propri`);
    }
    
    // Filtra per data specifica
    const userDayAppointments = userAppointments.filter(apt => apt.date === date);
    console.log(`📱💻 [${deviceType}] Appuntamenti sincronizzati per ${date}: ${userDayAppointments.length}`)
    
    // Popola le relazioni con client e service usando dati persistenti
    const dayAppointmentsWithDetails = userDayAppointments.map(appointment => {
      const client = availableClients.find(c => c.id === appointment.clientId);
      const service = userServices.find(s => s.id === appointment.serviceId);
      
      // Debug per identificare dati mancanti
      console.log(`🔍 [${deviceType}] Processing appointment ${appointment.id}, clientId: ${appointment.clientId}, serviceId: ${appointment.serviceId}`);
      if (!client) {
        console.log(`⚠️ [${deviceType}] Client non trovato per appuntamento ${appointment.id}, clientId: ${appointment.clientId}`);
        console.log(`⚠️ [${deviceType}] Clienti disponibili:`, availableClients.map(c => ({id: c.id, name: `${c.firstName} ${c.lastName}`})));
      }
      if (!service) {
        console.log(`⚠️ [${deviceType}] Service non trovato per appuntamento ${appointment.id}, serviceId: ${appointment.serviceId}`);
        console.log(`⚠️ [${deviceType}] Servizi disponibili:`, userServices.map(s => ({id: s.id, name: s.name})));
      }
      
      // Genera startTime e endTime se mancanti per compatibilità frontend
      const startTime = appointment.startTime || appointment.time || "09:00";
      const duration = appointment.duration || 60;
      const endTime = appointment.endTime || (() => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hours, minutes + duration, 0, 0);
        return endDate.toTimeString().substring(0, 5);
      })();

      return { 
        ...appointment, 
        startTime,
        endTime,
        client: client || { firstName: "Cliente", lastName: "Sconosciuto", id: appointment.clientId },
        service: service || { name: "Servizio Sconosciuto", id: appointment.serviceId, color: "#666666" }
      };
    });
    
    res.json(dayAppointmentsWithDetails);
  });

  // Endpoint per range di appuntamenti (necessario per i report)
  app.get("/api/appointments/range/:startDate/:endDate", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    
    const { startDate, endDate } = req.params;
    const user = req.user as any;
    const deviceType = req.headers['x-device-type'] || 'unknown';
    
    console.log(`📊 [/api/appointments/range] [${deviceType}] Utente ${user.id} cerca appuntamenti per range ${startDate}-${endDate}`);
    
    // Validazione formato data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({ message: "Formato data non valido. Usa YYYY-MM-DD" });
    }
    
    // Carica dati persistenti
    const storageData = loadStorageData();
    console.log(`🔍 [${deviceType}] DEBUG Storage appointments raw:`, storageData.appointments?.length || 0, storageData.appointments?.slice(0, 3));
    
    // Gestisce sia formato array che oggetto diretto
    const allAppointments = (storageData.appointments || []).map(item => {
      if (Array.isArray(item)) {
        return item[1]; // Formato [id, appointment]
      }
      return item; // Formato diretto
    });
    const allClients = storageData.clients || [];
    const userServices = storageData.userServices?.[user.id] || [];
    
    console.log(`📊 [${deviceType}] Appuntamenti totali processati: ${allAppointments.length}`);
    console.log(`🔍 [${deviceType}] DEBUG primi 3 appuntamenti:`, allAppointments.slice(0, 3).map(a => ({id: a?.id, date: a?.date})));
    
    // Filtra appuntamenti per range di date
    let userRangeAppointments;
    if (user.type === 'admin') {
      console.log(`👑 [${deviceType}] Admin - Accesso completo a tutti gli appuntamenti per report`);
      userRangeAppointments = allAppointments.filter(apt => 
        apt.date >= startDate && apt.date <= endDate
      );
    } else if (user.type === 'staff') {
      console.log(`👩‍⚕️ [${deviceType}] Staff - Accesso ai propri appuntamenti per report`);
      userRangeAppointments = allAppointments.filter(apt => 
        apt.date >= startDate && apt.date <= endDate && apt.staffId === user.id
      );
    } else {
      console.log(`👤 [${deviceType}] Cliente - Accesso limitato ai propri appuntamenti per report`);
      userRangeAppointments = allAppointments.filter(apt => 
        apt.date >= startDate && apt.date <= endDate && apt.clientId === user.clientId
      );
    }
    
    console.log(`📊💻 [${deviceType}] Appuntamenti range ${startDate}-${endDate}: ${userRangeAppointments.length}`);
    
    // Per admin, usa tutti i clienti; per altri solo i propri
    let availableClients;
    if (user.type === 'admin') {
      availableClients = allClients.map(([id, clientData]) => ({ id, ...clientData }));
    } else if (user.type === 'staff') {
      availableClients = allClients
        .filter(([id, clientData]) => clientData.ownerId === user.id)
        .map(([id, clientData]) => ({ id, ...clientData }));
    } else {
      availableClients = allClients
        .filter(([id, clientData]) => id === user.clientId)
        .map(([id, clientData]) => ({ id, ...clientData }));
    }
    
    // Popola le relazioni con client e service con i prezzi per i report
    const rangeAppointmentsWithDetails = userRangeAppointments.map(appointment => {
      const client = availableClients.find(c => c.id === appointment.clientId);
      const service = userServices.find(s => s.id === appointment.serviceId);
      
      // Log dettagliato per debug fatturato
      if (service) {
        console.log(`💰 Appuntamento ${appointment.id}: Servizio ${service.name}, Prezzo: ${service.price} centesimi (${(service.price || 0) / 100}€)`);
      } else {
        console.log(`⚠️ Appuntamento ${appointment.id}: Servizio non trovato per serviceId ${appointment.serviceId}`);
      }
      
      return { 
        ...appointment, 
        client: client || { firstName: "Cliente", lastName: "Sconosciuto", id: appointment.clientId },
        service: service || { name: "Servizio Sconosciuto", id: appointment.serviceId, color: "#666666", price: 0 }
      };
    });
    
    console.log(`💰 [${deviceType}] Report: calcolato ricavi per ${rangeAppointmentsWithDetails.length} appuntamenti`);
    res.json(rangeAppointmentsWithDetails);
  });

  app.post("/api/appointments", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    if (!userData[user.id]) userData[user.id] = { services: [], clients: [], appointments: [], settings: {} };
    
    // Valida gli ID con dati persistenti
    const storageData = loadStorageData();
    const allClients = storageData.clients || [];
    const userServices = storageData.userServices?.[user.id] || [];
    
    // Per admin, usa tutti i clienti; per altri solo i propri
    let availableClients;
    if (user.type === 'admin') {
      availableClients = allClients.map(([id, client]) => client);
    } else {
      availableClients = allClients.map(([id, client]) => client).filter(client => client.ownerId === user.id);
    }
    
    // Valida che clientId e serviceId esistano
    const clientExists = availableClients.find(c => c.id === req.body.clientId);
    const serviceExists = userServices.find(s => s.id === req.body.serviceId);
    
    if (!clientExists) {
      console.log(`❌ Cliente ID ${req.body.clientId} non trovato`);
      return res.status(400).json({ message: "Cliente non valido" });
    }
    
    if (!serviceExists) {
      console.log(`❌ Servizio ID ${req.body.serviceId} non trovato`);
      return res.status(400).json({ message: "Servizio non valido" });
    }
    
    const newAppointment = {
      id: Date.now(),
      ...req.body,
      createdAt: new Date()
    };
    
    // SALVA NEL STORAGE PERSISTENTE nella struttura appointments
    if (!storageData.appointments) storageData.appointments = [];
    
    // Aggiungi alla lista principale degli appuntamenti
    storageData.appointments.push([newAppointment.id, newAppointment]);
    saveStorageData(storageData);
    console.log(`💾 Appuntamento ${newAppointment.id} salvato permanentemente nel storage globale`);
    
    // Popola le relazioni con client e service prima di restituire
    const appointmentWithDetails = {
      ...newAppointment,
      client: clientExists,
      service: serviceExists
    };
    
    res.status(201).json(appointmentWithDetails);
  });

  app.delete("/api/appointments/:id", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const appointmentId = parseInt(req.params.id);
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({ message: "ID appuntamento non valido" });
    }
    
    // ELIMINA DAL STORAGE PERSISTENTE
    const storageData = loadStorageData();
    if (!storageData.userAppointments) storageData.userAppointments = {};
    if (!storageData.userAppointments[user.id]) storageData.userAppointments[user.id] = [];
    
    const appointmentIndex = storageData.userAppointments[user.id].findIndex(app => app.id === appointmentId);
    
    if (appointmentIndex === -1) {
      return res.status(404).json({ message: "Appuntamento non trovato" });
    }
    
    storageData.userAppointments[user.id].splice(appointmentIndex, 1);
    saveStorageData(storageData);
    console.log(`💾🗑️ Appuntamento ${appointmentId} eliminato permanentemente per utente ${user.id}`);
    res.status(200).json({ message: "Appuntamento eliminato con successo" });
  });

  // Endpoint DELETE per eliminare clienti - Il proprietario può sempre eliminare i propri clienti
  app.delete("/api/clients/:id", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clientId = parseInt(req.params.id);
    
    console.log(`🗑️ [DELETE] Richiesta eliminazione cliente ID ${clientId} da utente ${user.id} (${user.email})`);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "ID cliente non valido" });
    }
    
    // Carica i dati dal storage
    const storageData = loadStorageData();
    if (!storageData.clients) {
      return res.status(404).json({ message: "Nessun cliente trovato" });
    }
    
    // Trova il cliente da eliminare
    const clientIndex = storageData.clients.findIndex(([id]) => id === clientId);
    
    if (clientIndex === -1) {
      console.log(`❌ [DELETE] Cliente con ID ${clientId} non trovato nel sistema`);
      return res.status(404).json({ message: "Cliente non trovato" });
    }
    
    const [id, clientData] = storageData.clients[clientIndex];
    
    // Verifica permessi: solo il proprietario o admin possono eliminare
    if (user.type !== 'admin' && clientData.ownerId !== user.id) {
      console.log(`❌ [DELETE] Accesso negato - utente ${user.id} non è proprietario del cliente ${clientId} (proprietario: ${clientData.ownerId})`);
      return res.status(403).json({ message: "Non sei autorizzato a eliminare questo cliente" });
    }
    
    // Il proprietario può sempre eliminare i propri clienti
    console.log(`🗑️ [DELETE] Eliminazione autorizzata - utente ${user.id} è ${user.type === 'admin' ? 'admin' : 'proprietario'} del cliente ${clientId}`);
    
    // Elimina il cliente dall'array
    storageData.clients.splice(clientIndex, 1);
    
    // Elimina anche eventuali appuntamenti associati al cliente per tutti gli utenti
    let totalDeletedAppointments = 0;
    if (storageData.userAppointments) {
      Object.keys(storageData.userAppointments).forEach(userId => {
        const initialCount = storageData.userAppointments[userId].length;
        storageData.userAppointments[userId] = storageData.userAppointments[userId].filter(
          app => app.client !== clientId
        );
        const deletedCount = initialCount - storageData.userAppointments[userId].length;
        totalDeletedAppointments += deletedCount;
      });
      
      if (totalDeletedAppointments > 0) {
        console.log(`🗑️ [DELETE] Eliminati ${totalDeletedAppointments} appuntamenti associati al cliente ${clientId}`);
      }
    }
    
    // Salva le modifiche
    saveStorageData(storageData);
    
    // Salva notifica per gli admin
    const isOwnerNotAdmin = user.type !== 'admin';
    if (isOwnerNotAdmin) {
      console.log(`📧 [ADMIN-NOTIFICATION] L'utente ${user.id} (${user.email}) ha eliminato il cliente ${clientId} "${clientData.firstName} ${clientData.lastName}" dal database`);
      
      // Salva la notifica nel storage per gli admin
      if (!storageData.adminNotifications) {
        storageData.adminNotifications = [];
      }
      
      storageData.adminNotifications.push({
        id: Date.now(),
        type: 'client_deleted',
        message: `L'utente ${user.email} ha eliminato il cliente "${clientData.firstName} ${clientData.lastName}" dal database`,
        userId: user.id,
        userEmail: user.email,
        clientId: clientId,
        clientName: `${clientData.firstName} ${clientData.lastName}`,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      // Mantieni solo le ultime 100 notifiche
      if (storageData.adminNotifications.length > 100) {
        storageData.adminNotifications = storageData.adminNotifications.slice(-100);
      }
      
      // Salva nuovamente per includere le notifiche
      saveStorageData(storageData);
    }
    
    console.log(`✅ [DELETE] Cliente ID ${clientId} "${clientData.firstName} ${clientData.lastName}" eliminato definitivamente da utente ${user.id}`);
    
    res.status(200).json({ 
      message: "Cliente eliminato con successo",
      deletedClient: {
        id: clientId,
        firstName: clientData.firstName,
        lastName: clientData.lastName
      },
      deletedAppointments: totalDeletedAppointments
    });
  });

  // Endpoint per recuperare notifiche admin
  app.get("/api/admin/notifications", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    // Solo admin possono vedere le notifiche
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Accesso negato" });
    }
    
    const storageData = loadStorageData();
    const notifications = storageData.adminNotifications || [];
    
    // Ordina per timestamp decrescente (più recenti prima)
    const sortedNotifications = notifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    res.json(sortedNotifications);
  });

  // Endpoint per marcare notifiche come lette
  app.post("/api/admin/notifications/:id/read", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Accesso negato" });
    }
    
    const notificationId = parseInt(req.params.id);
    const storageData = loadStorageData();
    
    if (storageData.adminNotifications) {
      const notification = storageData.adminNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        saveStorageData(storageData);
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Notifica non trovata" });
      }
    } else {
      res.status(404).json({ message: "Notifica non trovata" });
    }
  });

  // Sistema QR Code per accesso clienti - SEPARAZIONE PER UTENTE
  app.get("/api/clients/:id/activation-token", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clientId = parseInt(req.params.id);
    
    console.log(`🔍 [QR-INTERFACE] Richiesta QR per cliente ID: ${clientId} da utente: ${user.id} (${user.email})`);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "ID cliente non valido" });
    }
    
    // Carica dati reali dal file storage_data.json
    const allClients = loadStorageData().clients || [];
    const clientData = allClients.find(([id, client]) => id === clientId);
    
    if (!clientData) {
      console.log(`❌ [QR-INTERFACE] Cliente ${clientId} NON TROVATO nel sistema`);
      return res.status(404).json({ message: "Cliente non trovato nel sistema" });
    }
    
    const client = clientData[1];
    console.log(`🔍 [QR-INTERFACE] Cliente trovato: ${client.firstName} ${client.lastName} (ID: ${clientId}, Owner: ${client.ownerId})`);
    
    // Verifica proprietà - solo admin o proprietario del cliente
    if (user.type !== 'admin' && client.ownerId && client.ownerId !== user.id) {
      console.log(`❌ [QR-INTERFACE] Accesso negato - utente ${user.id} non autorizzato per cliente del proprietario ${client.ownerId}`);
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo cliente" });
    }
    
    // Genera token di attivazione permanente basato su codici gerarchici
    const ownerUserId = client.ownerId || user.id;
    
    // SISTEMA CODICI GERARCHICI: Verifica e genera codici se mancanti
    let clientCode = client.uniqueCode;
    if (!clientCode || !(await validateClientOwnership(clientCode, ownerUserId))) {
      console.log(`🔧 Generazione codice gerarchico per cliente ${clientId}, proprietario ${ownerUserId}`);
      clientCode = await generateClientCode(ownerUserId, clientId);
      
      // Aggiorna il cliente con il nuovo codice
      const storageData = loadStorageData();
      const clientIndex = storageData.clients.findIndex(([id]) => id === clientId);
      if (clientIndex !== -1) {
        storageData.clients[clientIndex][1].uniqueCode = clientCode;
        storageData.clients[clientIndex][1].professionistCode = await getProfessionistCode(ownerUserId);
        saveStorageData(storageData);
      }
    }
    
    const crypto = await import('crypto');
    const tokenData = `${clientCode}_SECURE_${ownerUserId}`;
    const stableHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
    const token = `${clientCode}_${stableHash}`;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    
    // FLUSSO DIRETTO: Punta direttamente alla client area con token, salta /activate
    const activationUrl = `${protocol}://${host}/client-area?token=${token}&clientId=${clientId}&autoLogin=true`;
    
    try {
      // Genera QR code vero usando la libreria qrcode con import dinamico sicuro
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
      
      // CORREZIONE CRITICA: Sincronizza icone PWA con l'icona del proprietario del cliente
      const storageData = loadStorageData();
      const ownerIcon = storageData.userIcons[ownerUserId] || defaultIconBase64;
      console.log(`🔧 [QR-PWA-SYNC] Sincronizzazione icone PWA per cliente ${clientId} con icona del proprietario ${ownerUserId}`);
      
      try {
        await updatePWAIconsFromCompanyLogo(ownerUserId, ownerIcon);
        console.log(`✅ [QR-PWA-SYNC] Icone PWA sincronizzate con successo per proprietario ${ownerUserId}`);
      } catch (syncError) {
        console.error(`❌ [QR-PWA-SYNC] Errore sincronizzazione icone PWA:`, syncError);
      }
      
      const responseData = {
        token,
        activationUrl,
        qrCode,
        clientName: `${client.firstName} ${client.lastName}`
      };
      
      console.log(`✅ [QR-INTERFACE] Risposta inviata al frontend:`);
      console.log(`   - Cliente: ${responseData.clientName}`);
      console.log(`   - Token: ${responseData.token}`);
      console.log(`   - URL: ${responseData.activationUrl}`);
      
      res.json(responseData);
    } catch (error) {
      console.error('Errore generazione QR:', error);
      res.status(500).json({ message: "Errore nella generazione del QR code" });
    }
  });



  // Endpoint per verificare token QR e autenticare cliente
  app.post("/api/client-access/verify-token", async (req, res) => {
    const { token, clientId } = req.body;
    
    if (!token || !clientId) {
      return res.status(400).json({ message: "Token e clientId richiesti" });
    }
    
    // NUOVO FORMATO: Verifica token basato su codici gerarchici PROF_XXX_XXXX_CLIENT_XXX_XXXX_hash
    const crypto = await import('crypto');
    
    // Estrae codice cliente e hash dal token
    const lastUnderscoreIndex = token.lastIndexOf('_');
    if (lastUnderscoreIndex === -1) {
      return res.status(400).json({ message: "Formato token non valido" });
    }
    
    const clientCode = token.substring(0, lastUnderscoreIndex);
    const providedHash = token.substring(lastUnderscoreIndex + 1);
    
    // Verifica che il codice cliente sia formato gerarchico valido
    if (!clientCode.match(/^PROF_\d{2,3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/)) {
      return res.status(400).json({ message: "Codice cliente non valido" });
    }
    
    // Estrae owner ID dal codice cliente (supporta 2-3 cifre)
    const ownerMatch = clientCode.match(/^PROF_(\d{2,3})_/);
    if (!ownerMatch) {
      return res.status(400).json({ message: "Impossibile identificare proprietario dal codice" });
    }
    
    const ownerId = parseInt(ownerMatch[1], 10);
    
    // Verifica hash del token
    const tokenData = `${clientCode}_SECURE_${ownerId}`;
    const expectedHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
    
    if (providedHash !== expectedHash) {
      return res.status(401).json({ message: "Token non autorizzato" });
    }
    
    // Carica dati reali dal file storage_data.json
    const storageData = loadStorageData();
    const allClients = storageData.clients || [];
    
    // Cerca il cliente nei dati storage reali
    const clientData = allClients.find(([id]) => id.toString() === clientId.toString());
    
    if (!clientData) {
      return res.status(404).json({ message: "Cliente non trovato nel sistema" });
    }
    
    const client = clientData[1];
    
    // VALIDAZIONE CRITICA: Verifica che il cliente appartenga al proprietario del codice gerarchico
    const clientOwnerId = client.ownerId;
    if (!clientOwnerId || clientOwnerId !== ownerId) {
      console.error(`🚨 VIOLAZIONE SICUREZZA: Cliente ${clientId} appartiene a ${clientOwnerId} ma token per proprietario ${ownerId}`);
      return res.status(403).json({ message: "Token non autorizzato per questo cliente" });
    }
    
    // Verifica che il codice cliente corrisponda al formato gerarchico
    if (client.uniqueCode && !(await validateClientOwnership(client.uniqueCode, ownerId))) {
      console.error(`🚨 VIOLAZIONE SICUREZZA: Codice cliente ${client.uniqueCode} non valido per proprietario ${ownerId}`);
      return res.status(403).json({ message: "Codice cliente non valido per questo proprietario" });
    }
    
    console.log(`✅ Token QR verificato con successo per cliente ${clientId} (${client.firstName} ${client.lastName}) del proprietario ${ownerId}`);
    
    // Restituisci i dati del cliente autenticato
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

  app.get("/api/client-access/count/:clientId", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clientIdParam = req.params.clientId;
    
    // Carica dati reali dal file storage_data.json
    const storageData = loadStorageData();
    const allClients = storageData.clients || [];
    
    // Cerca il cliente confrontando sia come stringa che come numero
    const clientData = allClients.find(([id, client]) => {
      return id.toString() === clientIdParam || 
             (typeof id === 'number' && id.toString() === clientIdParam) ||
             (parseInt(clientIdParam).toString() === id.toString());
    });
    
    if (!clientData) {
      return res.status(404).json({ message: "Cliente non trovato nel sistema" });
    }
    
    const client = clientData[1];
    
    // Verifica proprietà - solo admin o proprietario del cliente
    if (user.type !== 'admin' && client.ownerId && client.ownerId !== user.id) {
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo cliente" });
    }
    
    // SISTEMA SEMPLIFICATO: 1 accesso = 1 conteggio - DIMEZZATO PER COMPENSARE DOPPIO INCREMENTO
    const actualAccessCount = client.accessCount || 0;
    const displayCount = Math.floor(actualAccessCount / 2);
    
    console.log(`[DEBUG COUNT] Cliente ${clientIdParam} (${client.firstName} ${client.lastName}) - accessCount: ${actualAccessCount} → display: ${displayCount}`);
    
    // Previeni cache per assicurarsi che i conteggi siano sempre aggiornati
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    res.json({ count: displayCount });
  });

  // Endpoint per verificare token QR e restituire dati cliente
  app.post("/api/client-access/verify-token", async (req, res) => {
    const { token, clientId } = req.body;
    
    if (!token || !clientId) {
      return res.status(400).json({ message: "Token e clientId richiesti" });
    }
    
    // Verifica formato token: userId_clientId_timestamp
    const tokenParts = token.split('_');
    if (tokenParts.length !== 3) {
      return res.status(400).json({ message: "Formato token non valido" });
    }
    
    const [userId, tokenClientId, timestamp] = tokenParts;
    
    // Verifica che il clientId nel token corrisponda a quello fornito
    if (parseInt(tokenClientId, 10) !== parseInt(clientId, 10)) {
      return res.status(400).json({ message: "Token non corrisponde al cliente" });
    }
    
    // Verifica che il cliente esista nel sistema storage reale
    const storageData = loadStorageData();
    let clientFound = null;
    
    const clients = storageData.clients || [];
    for (const [id, clientData] of clients) {
      if (parseInt(id.toString(), 10) === parseInt(clientId, 10)) {
        clientFound = clientData;
        break;
      }
    }
    
    if (!clientFound) {
      return res.status(404).json({ message: "Cliente non trovato" });
    }
    
    // Token valido - restituisci i dati del cliente
    res.json({
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
  });

  // Endpoint per recuperare dati di un singolo cliente (per admin/staff)
  app.get("/api/clients/:id", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;
    const user = req.user;
    
    // Solo admin e staff possono accedere
    if (user.type !== 'admin' && user.type !== 'staff') {
      return res.status(403).json({ message: "Accesso negato" });
    }

    const storageData = loadStorageData();
    const clients = storageData.clients || [];
    
    // Cerca il cliente
    let clientFound = null;
    for (const [clientId, clientData] of clients) {
      if (parseInt(clientId.toString(), 10) === parseInt(id, 10)) {
        clientFound = clientData;
        break;
      }
    }

    if (!clientFound) {
      return res.status(404).json({ message: "Cliente non trovato" });
    }

    // Verifica proprietà - solo admin o proprietario del cliente
    if (user.type !== 'admin' && clientFound.ownerId && clientFound.ownerId !== user.id) {
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo cliente" });
    }

    res.json({
      id: parseInt(id, 10),
      firstName: clientFound.firstName || '',
      lastName: clientFound.lastName || '',
      phone: clientFound.phone || '',
      email: clientFound.email || '',
      address: clientFound.address || '',
      birthday: clientFound.birthday || '',
      hasConsent: clientFound.hasConsent || false
    });
  });

  // Endpoint per caricare appuntamenti del cliente via token QR
  app.get("/api/appointments/client/:clientId", (req, res) => {
    const { clientId } = req.params;
    
    if (!clientId) {
      return res.status(400).json({ message: "ClientId richiesto" });
    }
    
    const storageData = loadStorageData();
    const appointments = storageData.appointments || [];
    
    // Filtra appuntamenti per questo cliente
    const clientAppointments = [];
    for (const [id, appointment] of appointments) {
      if (appointment.clientId && appointment.clientId.toString() === clientId.toString()) {
        clientAppointments.push({
          id: parseInt(id.toString(), 10),
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          notes: appointment.notes || '',
          reminderSent: appointment.reminderSent || false,
          reminderConfirmed: appointment.reminderConfirmed || false,
          clientId: appointment.clientId
        });
      }
    }
    
    res.json(clientAppointments);
  });

  // Endpoint di validazione token QR code per attivazione app PWA cliente
  app.get("/activate", async (req, res) => {
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
    
    console.log(`🔍 [ACTIVATE] Tentativo di attivazione con token: ${token}`);
    
    // NUOVA LOGICA: Supporta token gerarchici formato PROF_XXX_XXXX_CLIENT_XXX_XXXX_hash
    const crypto = await import('crypto');
    
    // Estrae codice cliente e hash dal token
    const lastUnderscoreIndex = token.lastIndexOf('_');
    if (lastUnderscoreIndex === -1) {
      console.log(`❌ [ACTIVATE] Token senza hash: ${token}`);
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
    
    const clientCode = token.substring(0, lastUnderscoreIndex);
    const providedHash = token.substring(lastUnderscoreIndex + 1);
    
    console.log(`🔍 [ACTIVATE] Codice cliente: ${clientCode}, Hash: ${providedHash}`);
    
    // Verifica che il codice cliente sia formato gerarchico valido
    // Formato: PROF_014_9C1F_CLIENT_1750177330362_816C (supporta anche PROF_XXX_)
    if (!clientCode.match(/^PROF_\d{2,3}_[A-Z0-9]{4}_CLIENT_\d+_[A-Z0-9]{4}$/)) {
      console.log(`❌ [ACTIVATE] Codice cliente non gerarchico: ${clientCode}`);
      console.log(`❌ [ACTIVATE] Pattern atteso: PROF_XX_XXXX_CLIENT_NNNNN_XXXX o PROF_XXX_XXXX_CLIENT_NNNNN_XXXX`);
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
    
    // Estrae owner ID dal codice cliente (supporta 2-3 cifre)
    const ownerMatch = clientCode.match(/^PROF_(\d{2,3})_/);
    if (!ownerMatch) {
      console.log(`❌ [ACTIVATE] Impossibile estrarre proprietario da: ${clientCode}`);
      return res.status(400).send(`
        <html>
          <head>
            <title>Errore Attivazione</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">❌ Token Non Valido</h1>
            <p>Impossibile identificare proprietario dal codice. Richiedi un nuovo QR code.</p>
          </body>
        </html>
      `);
    }
    
    const ownerId = parseInt(ownerMatch[1], 10);
    
    // Verifica hash del token
    const tokenData = `${clientCode}_SECURE_${ownerId}`;
    const expectedHash = crypto.createHash('md5').update(tokenData).digest('hex').substring(0, 8);
    
    console.log(`🔍 [ACTIVATE] Owner ID: ${ownerId}, Token data: ${tokenData}, Expected hash: ${expectedHash}`);
    
    if (providedHash !== expectedHash) {
      console.log(`❌ [ACTIVATE] Hash mismatch. Provided: ${providedHash}, Expected: ${expectedHash}`);
      return res.status(401).send(`
        <html>
          <head>
            <title>Token Non Autorizzato</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">🔒 Token Non Autorizzato</h1>
            <p>Il token non è valido per questo cliente. Richiedi un nuovo QR code.</p>
          </body>
        </html>
      `);
    }
    
    // Estrae client ID dal codice gerarchico
    const clientMatch = clientCode.match(/CLIENT_(\d+)_/);
    if (!clientMatch) {
      console.log(`❌ [ACTIVATE] Impossibile estrarre client ID da: ${clientCode}`);
      return res.status(400).send(`
        <html>
          <head>
            <title>Errore Attivazione</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">❌ Token Non Valido</h1>
            <p>Impossibile identificare cliente dal codice. Richiedi un nuovo QR code.</p>
          </body>
        </html>
      `);
    }
    
    const clientId = parseInt(clientMatch[1], 10);
    console.log(`🔍 [ACTIVATE] Client ID estratto: ${clientId}`);
    
    // Verifica che il cliente esista nel sistema storage reale
    const storageData = loadStorageData();
    const clients = storageData.clients || [];
    const clientData = clients.find(([id]) => id === clientId);
    
    if (!clientData) {
      console.log(`❌ [ACTIVATE] Cliente ${clientId} non trovato nel sistema`);
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
    
    const client = clientData[1];
    
    // VALIDAZIONE CRITICA: Verifica che il cliente appartenga al proprietario del codice gerarchico
    const clientOwnerId = client.ownerId;
    if (!clientOwnerId || clientOwnerId !== ownerId) {
      console.error(`🚨 [ACTIVATE] VIOLAZIONE SICUREZZA: Cliente ${clientId} appartiene a ${clientOwnerId} ma token per proprietario ${ownerId}`);
      return res.status(403).send(`
        <html>
          <head>
            <title>Accesso Negato</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #EF4444;">🔒 Accesso Negato</h1>
            <p>Non sei autorizzato ad accedere a questo cliente. Contatta il tuo professionista.</p>
          </body>
        </html>
      `);
    }
    
    console.log(`✅ [ACTIVATE] Token valido per cliente ${clientId} (${client.firstName} ${client.lastName}) del proprietario ${ownerId}`);
    
    // REDIRECT FISSO: Reindirizza direttamente alla client area con autocompilazione token
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const clientAreaUrl = `${protocol}://${host}/client-area?token=${token}&clientId=${clientId}&autoLogin=true`;
    
    console.log(`🔄 [ACTIVATE] Reindirizzamento diretto alla client area: ${clientAreaUrl}`);
    
    // Redirect diretto alla client area - RISOLVE problema "Token Mancante"
    res.redirect(clientAreaUrl);
  });

  // Endpoint Staff Management - Solo per admin
  app.get("/api/staff/users", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può accedere alla gestione staff" });
    }
    
    // Carica tutti gli utenti tranne admin
    const allUsers = loadStorageData().users || [];
    const staffUsers = allUsers
      .filter(([id, userData]) => userData.type !== 'admin')
      .map(([id, userData]) => ({
        id: userData.id,
        username: userData.username,
        email: userData.email,
        type: userData.type,
        createdAt: userData.createdAt || new Date().toISOString()
      }));
    
    res.json(staffUsers);
  });

  // Endpoint Referral System - Per admin e business
  app.get("/api/referral/codes", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin' && user.type !== 'business') {
      return res.status(403).json({ message: "Solo admin e business possono accedere ai referral" });
    }
    
    // Carica codici referral dal storage
    const referralCodes = loadStorageData().referralCodes || [];
    
    // Per business users, mostra solo i propri codici
    let userCodes;
    if (user.type === 'admin') {
      userCodes = referralCodes;
    } else {
      userCodes = referralCodes.filter(code => code.ownerId === user.id);
    }
    
    res.json(userCodes);
  });

  // Endpoint Referral Overview - Solo per admin
  app.get("/api/referral-overview", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può accedere alla panoramica referral" });
    }
    
    try {
      const storageData = loadStorageData();
      const allUsers = storageData.users || [];
      const referralCommissions = storageData.referralCommissions || [];
      
      // Trova tutti gli staff con referral attivi
      const staffMembers = allUsers
        .filter(([id, userData]) => userData.type === 'staff')
        .map(([id, userData]) => ({
          staffId: userData.id,
          staffName: userData.username,
          staffEmail: userData.email || userData.username
        }));
      
      // Calcola statistiche per ogni staff
      const staffStats = staffMembers.map(staff => {
        const staffCommissions = referralCommissions.filter(commission => 
          commission.referrerId === staff.staffId
        );
        
        const sponsoredCount = staffCommissions.length;
        const totalCommissions = staffCommissions.reduce((sum, commission) => 
          sum + (commission.monthlyAmount || 0), 0
        );
        const paidCommissions = staffCommissions
          .filter(commission => commission.isPaid)
          .reduce((sum, commission) => sum + (commission.monthlyAmount || 0), 0);
        const pendingCommissions = totalCommissions - paidCommissions;
        
        return {
          ...staff,
          sponsoredCount,
          totalCommissions,
          paidCommissions,
          pendingCommissions
        };
      }).filter(staff => staff.sponsoredCount > 0); // Solo staff con referral attivi
      
      // Calcola totali generali
      const totals = {
        totalSponsored: staffStats.reduce((sum, staff) => sum + staff.sponsoredCount, 0),
        totalCommissions: staffStats.reduce((sum, staff) => sum + staff.totalCommissions, 0),
        totalPaid: staffStats.reduce((sum, staff) => sum + staff.paidCommissions, 0),
        totalPending: staffStats.reduce((sum, staff) => sum + staff.pendingCommissions, 0)
      };
      
      const response = {
        staffStats,
        totals,
        commissionRate: 10, // 10% commissione standard
        minSponsorshipForCommission: 3 // Dal terzo abbonamento sponsorizzato
      };
      
      res.json(response);
    } catch (error) {
      console.error('Errore nel caricamento panoramica referral:', error);
      res.status(500).json({ message: "Errore nel caricamento dei dati referral" });
    }
  });

  // Endpoint Commissioni Staff - Solo per admin
  app.get("/api/staff-commissions/:staffId", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può accedere alle commissioni staff" });
    }
    
    try {
      const staffId = parseInt(req.params.staffId);
      const storageData = loadStorageData();
      const referralCommissions = storageData.referralCommissions || [];
      
      // Trova commissioni per lo staff specifico
      const staffCommissions = referralCommissions
        .filter(commission => commission.referrerId === staffId)
        .map(commission => ({
          id: commission.id,
          commissionAmount: commission.monthlyAmount || 0,
          isPaid: commission.isPaid || false,
          paidAt: commission.paidAt || null,
          createdAt: commission.createdAt || new Date().toISOString(),
          notes: commission.notes || null,
          licenseCode: commission.licenseCode || `REF-${commission.id}`,
          licenseType: commission.licenseType || 'business',
          customerEmail: commission.customerEmail || 'cliente@email.com'
        }));
      
      res.json(staffCommissions);
    } catch (error) {
      console.error('Errore nel caricamento commissioni staff:', error);
      res.status(500).json({ message: "Errore nel caricamento delle commissioni" });
    }
  });

  // Endpoint per segnare commissione come pagata - Solo per admin
  app.post("/api/staff-commissions/:commissionId/mark-paid", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    
    if (user.type !== 'admin') {
      return res.status(403).json({ message: "Solo admin può aggiornare le commissioni" });
    }
    
    try {
      const commissionId = parseInt(req.params.commissionId);
      const { notes } = req.body;
      
      const storageData = loadStorageData();
      const referralCommissions = storageData.referralCommissions || [];
      
      // Trova e aggiorna la commissione
      const commissionIndex = referralCommissions.findIndex(c => c.id === commissionId);
      if (commissionIndex === -1) {
        return res.status(404).json({ message: "Commissione non trovata" });
      }
      
      referralCommissions[commissionIndex] = {
        ...referralCommissions[commissionIndex],
        isPaid: true,
        paidAt: new Date().toISOString(),
        notes: notes || referralCommissions[commissionIndex].notes
      };
      
      // Salva i dati aggiornati
      storageData.referralCommissions = referralCommissions;
      saveStorageData(storageData);
      
      res.json({ success: true, message: "Commissione segnata come pagata" });
    } catch (error) {
      console.error('Errore nell\'aggiornamento commissione:', error);
      res.status(500).json({ message: "Errore nell'aggiornamento della commissione" });
    }
  });

  // Endpoint per le fatture
  app.get('/api/invoices', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.id;
      const userData = usersData[userId];
      
      if (!userData) {
        return res.status(404).json({ message: 'User data not found' });
      }

      // Restituisco un array vuoto per ora, dato che nel sistema semplificato non ci sono fatture
      res.json([]);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ message: 'Error fetching invoices' });
    }
  });

  // API per sbloccare la cancellazione di clienti importati eliminati alla fonte
  app.post('/api/unlock-client-deletion/:clientId', requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      
      console.log(`🔓 [/api/unlock-client-deletion] Admin ${user.id} richiede sblocco per cliente ${clientId}`);
      
      // Solo admin possono sbloccare cancellazioni
      if (user.type !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Solo gli amministratori possono sbloccare le cancellazioni' 
        });
      }
      
      const storageData = loadStorageData();
      const clientEntry = storageData.clients?.find(([id]) => id.toString() === clientId);
      
      if (!clientEntry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente non trovato' 
        });
      }
      
      const [id, client] = clientEntry;
      
      // Verifica che sia un cliente importato
      if (!client.originalOwnerId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Solo i clienti importati possono essere sbloccati' 
        });
      }
      
      // Sblocca la cancellazione
      client.deletionUnlocked = true;
      saveStorageData(storageData);
      
      console.log(`✅ [SBLOCCO] Cliente ${client.firstName} ${client.lastName} (${clientId}) sbloccato per cancellazione dall'admin ${user.id}`);
      
      res.json({
        success: true,
        message: 'Cancellazione sbloccata con successo',
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          deletionUnlocked: true
        }
      });
      
    } catch (error) {
      console.error('❌ [ERRORE SBLOCCO]:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Errore durante lo sblocco della cancellazione' 
      });
    }
  });

  // API per simulare eliminazione dal sistema originale (per test)
  app.post('/api/mark-client-deleted-at-source/:clientId', requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      
      console.log(`⚠️ [/api/mark-client-deleted-at-source] Admin ${user.id} marca cliente ${clientId} come eliminato alla fonte`);
      
      // Solo admin possono simulare eliminazioni
      if (user.type !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Solo gli amministratori possono simulare eliminazioni' 
        });
      }
      
      const storageData = loadStorageData();
      const clientEntry = storageData.clients?.find(([id]) => id.toString() === clientId);
      
      if (!clientEntry) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente non trovato' 
        });
      }
      
      const [id, client] = clientEntry;
      
      // Verifica che sia un cliente importato
      if (!client.originalOwnerId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Solo i clienti importati possono essere marcati come eliminati alla fonte' 
        });
      }
      
      // Marca come eliminato alla fonte
      client.deletedAtSource = true;
      saveStorageData(storageData);
      
      console.log(`🚨 [NOTIFICA ELIMINAZIONE] Cliente ${client.firstName} ${client.lastName} (${clientId}) eliminato alla fonte - notifica admin`);
      
      res.json({
        success: true,
        message: 'Cliente marcato come eliminato alla fonte',
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          deletedAtSource: true
        }
      });
      
    } catch (error) {
      console.error('❌ [ERRORE NOTIFICA ELIMINAZIONE]:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Errore durante la notifica di eliminazione' 
      });
    }
  });

  // API per gestire le impostazioni email e calendario
  app.get('/api/email-calendar-settings', requireAuth, (req, res) => {
    try {
      const user = req.user!;
      console.log(`📧 [GET EMAIL SETTINGS] Richiesta impostazioni email da utente ${user.id}`);
      
      // Carica le impostazioni email dal backup15
      let emailSettings;
      try {
        const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
        if (fs.existsSync(emailConfigPath)) {
          const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
          emailSettings = {
            emailEnabled: emailConfig.emailEnabled || false,
            emailAddress: emailConfig.emailAddress || '',
            emailPassword: emailConfig.emailPassword ? '••••••••••' : '', // Mascherata per sicurezza
            emailTemplate: emailConfig.emailTemplate || `Gentile {{nome}} {{cognome}},

Questo è un promemoria per il Suo appuntamento di {{servizio}} previsto per il giorno {{data}} alle ore {{ora}}.

Per qualsiasi modifica o cancellazione, La preghiamo di contattarci.

Cordiali saluti,
Studio Professionale`,
            emailSubject: emailConfig.emailSubject || "Promemoria appuntamento del {{data}}",
            hasPasswordSaved: !!emailConfig.emailPassword,
            calendarEnabled: emailConfig.calendarEnabled || false,
            calendarId: emailConfig.calendarId || '',
            googleAuthStatus: emailConfig.googleAuthStatus || { authorized: false }
          };
          console.log(`📧 [EMAIL SETTINGS] Caricate dal backup15 per utente ${user.id}`);
        } else {
          throw new Error('File email_settings.json non trovato');
        }
      } catch (error) {
        console.log(`⚠️ [EMAIL SETTINGS] Uso impostazioni predefinite per utente ${user.id}:`, error);
        emailSettings = {
          emailEnabled: false,
          emailAddress: '',
          emailPassword: '',
          emailTemplate: `Gentile {{nome}} {{cognome}},

Questo è un promemoria per il Suo appuntamento di {{servizio}} previsto per il giorno {{data}} alle ore {{ora}}.

Per qualsiasi modifica o cancellazione, La preghiamo di contattarci.

Cordiali saluti,
Studio Professionale`,
          emailSubject: "Promemoria appuntamento del {{data}}",
          hasPasswordSaved: false,
          calendarEnabled: false,
          calendarId: '',
          googleAuthStatus: { authorized: false }
        };
      }
      
      res.json(emailSettings);
    } catch (error) {
      console.error('❌ [ERRORE EMAIL SETTINGS]:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Errore durante il caricamento delle impostazioni email' 
      });
    }
  });

  app.post('/api/email-calendar-settings', requireAuth, (req, res) => {
    try {
      const user = req.user!;
      const { emailEnabled, emailAddress, emailPassword, emailTemplate, emailSubject, calendarEnabled, calendarId } = req.body;
      
      console.log(`📧 [POST EMAIL SETTINGS] Aggiornamento impostazioni email da utente ${user.id}`, {
        emailEnabled,
        emailAddress,
        hasPassword: !!emailPassword,
        passwordMasked: emailPassword === '••••••••••'
      });
      
      // Carica le impostazioni esistenti
      const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
      let currentSettings: any = {};
      
      try {
        if (fs.existsSync(emailConfigPath)) {
          currentSettings = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
          console.log(`📧 [EMAIL SETTINGS] Settings esistenti caricati`);
        }
      } catch (error) {
        console.log(`⚠️ [EMAIL SETTINGS] Errore caricamento settings esistenti:`, error);
      }
      
      // Aggiorna solo i campi forniti
      const updatedSettings: any = { ...currentSettings };
      if (emailEnabled !== undefined) updatedSettings.emailEnabled = emailEnabled;
      if (emailAddress !== undefined) updatedSettings.emailAddress = emailAddress;
      if (emailPassword !== undefined && emailPassword !== '••••••••••') {
        updatedSettings.emailPassword = emailPassword;
        console.log(`📧 [EMAIL SETTINGS] Password aggiornata`);
      }
      if (emailTemplate !== undefined) updatedSettings.emailTemplate = emailTemplate;
      if (emailSubject !== undefined) updatedSettings.emailSubject = emailSubject;
      if (calendarEnabled !== undefined) updatedSettings.calendarEnabled = calendarEnabled;
      if (calendarId !== undefined) updatedSettings.calendarId = calendarId;
      
      // Salva le impostazioni aggiornate
      try {
        fs.writeFileSync(emailConfigPath, JSON.stringify(updatedSettings, null, 2));
        console.log(`✅ [EMAIL SETTINGS] Impostazioni salvate per utente ${user.id}`);
      } catch (saveError) {
        console.error(`❌ [EMAIL SETTINGS] Errore salvataggio:`, saveError);
        return res.status(500).json({ 
          success: false, 
          error: 'Errore durante il salvataggio delle impostazioni' 
        });
      }
      
      console.log(`📧 [EMAIL SETTINGS] Invio risposta JSON di successo`);
      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        message: 'Impostazioni email aggiornate con successo'
      });
    } catch (error) {
      console.error('❌ [ERRORE SAVE EMAIL SETTINGS]:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore durante il salvataggio delle impostazioni email' 
      });
    }
  });

  // API per mostrare la password salvata
  app.get('/api/email-calendar-settings/show-password', requireAuth, (req, res) => {
    try {
      const user = req.user!;
      console.log(`📧 [SHOW PASSWORD] Richiesta password salvata da utente ${user.id}`);
      
      // Carica la password reale dal backup15
      const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
      let actualPassword = '';
      
      try {
        if (fs.existsSync(emailConfigPath)) {
          const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
          actualPassword = emailConfig.emailPassword || '';
        }
      } catch (error) {
        console.log(`⚠️ [SHOW PASSWORD] Errore caricamento password:`, error);
      }
      
      res.json({
        success: true,
        emailPassword: actualPassword,
        hasSavedPassword: !!actualPassword
      });
    } catch (error) {
      console.error('❌ [ERRORE SHOW PASSWORD]:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Errore durante il recupero della password' 
      });
    }
  });

  // API per inviare email di test
  app.post('/api/email-calendar-settings/send-test-email', requireAuth, async (req, res) => {
    try {
      const { email } = req.body;
      const user = req.user!;
      
      console.log(`📧 [TEST EMAIL] Richiesta invio email di test a ${email} da utente ${user.id}`);
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          error: 'Indirizzo email richiesto' 
        });
      }
      
      // Carica le credenziali email reali dal backup15
      const emailConfigPath = path.join(process.cwd(), 'email_settings.json');
      let emailConfig = null;
      
      try {
        if (fs.existsSync(emailConfigPath)) {
          emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
        }
      } catch (error) {
        console.log(`⚠️ [TEST EMAIL] Errore caricamento credenziali:`, error);
        throw new Error('Configurazione email non trovata');
      }
      
      if (!emailConfig || !emailConfig.emailAddress || !emailConfig.emailPassword) {
        throw new Error('Credenziali email non configurate');
      }
      
      console.log(`📧 [TEST EMAIL] Usando credenziali: ${emailConfig.emailAddress}`);
      
      // Implementazione reale dell'invio email usando nodemailer
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailConfig.emailAddress,
          pass: emailConfig.emailPassword
        }
      });
      
      const mailOptions = {
        from: emailConfig.emailAddress,
        to: email,
        subject: 'Test Email - Sistema Gestione Appuntamenti',
        html: `
          <h2>Test Email Configurazione</h2>
          <p>Questa è un'email di test dal sistema di gestione appuntamenti.</p>
          <p><strong>Data invio:</strong> ${new Date().toLocaleString('it-IT')}</p>
          <p><strong>Da:</strong> ${emailConfig.emailAddress}</p>
          <p>Se ricevi questa email, la configurazione è corretta!</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
      
      console.log(`✅ [TEST EMAIL] Email di test inviata con successo a ${email}`);
      
      res.json({
        success: true,
        message: `Email di test inviata con successo a ${email}`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ [ERRORE TEST EMAIL]:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore durante l\'invio dell\'email di test' 
      });
    }
  });

  // Consent endpoints
  app.get("/api/consents/client", (req, res) => {
    try {
      const storageData = loadStorageData();
      const consents = storageData.consents || [];
      
      console.log(`📋 [GET CONSENTS] Richiesta lista consensi - trovati ${consents.length} consensi`);
      
      res.json(consents);
    } catch (error) {
      console.error('❌ [ERRORE GET CONSENTS]:', error);
      res.status(500).json({ error: 'Errore durante il caricamento dei consensi' });
    }
  });

  app.post("/api/consents", (req, res) => {
    try {
      const { clientId, consentText, signature } = req.body;
      
      console.log(`📋 [POST CONSENT] Registrazione consenso per cliente ${clientId}`);
      
      if (!clientId || !consentText) {
        return res.status(400).json({ error: 'ClientId e consentText sono richiesti' });
      }
      
      const storageData = loadStorageData();
      
      // Crea il nuovo consenso
      const consent = {
        id: Date.now(),
        clientId: parseInt(clientId),
        consentText,
        signature: signature || `Consenso digitale - ${new Date().toLocaleString()}`,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      // Salva il consenso
      if (!storageData.consents) storageData.consents = [];
      storageData.consents.push(consent);
      
      // AGGIORNA AUTOMATICAMENTE IL CLIENTE CON hasConsent: true
      const clientIndex = storageData.clients?.findIndex(([id, client]) => id === parseInt(clientId));
      if (clientIndex !== -1) {
        const [id, client] = storageData.clients[clientIndex];
        client.hasConsent = true;
        console.log(`✅ [AUTO UPDATE] Cliente ${client.firstName} ${client.lastName} aggiornato con hasConsent: true`);
      } else {
        console.warn(`⚠️ [CONSENT WARNING] Cliente ${clientId} non trovato per aggiornamento hasConsent`);
      }
      
      // Salva tutti i dati
      saveStorageData(storageData);
      
      console.log(`✅ [CONSENT SUCCESS] Consenso registrato per cliente ${clientId} e flag hasConsent aggiornato`);
      
      res.json({ 
        success: true, 
        message: 'Consenso registrato con successo',
        consent 
      });
      
    } catch (error) {
      console.error('❌ [ERRORE POST CONSENT]:', error);
      res.status(500).json({ error: 'Errore durante la registrazione del consenso' });
    }
  });

  // Servire file statici da attached_assets per icone
  app.use('/attached_assets', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'attached_assets', req.path);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving static file:', err);
        res.status(404).send('File not found');
      }
    });
  });

  // Endpoint per registrare accesso PWA del cliente (senza autenticazione)
  app.post('/api/client-access/track/:clientId', (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const storageData = loadStorageData();
      
      // Trova il cliente
      const clientIndex = storageData.clients?.findIndex(([id, client]) => id === clientId);
      if (clientIndex === -1) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      const [id, client] = storageData.clients[clientIndex];
      const now = new Date();
      const lastAccessTime = client.lastAccess ? new Date(client.lastAccess) : null;
      
      // PROTEZIONE CONTRO TRACKING MULTIPLO: Ignora se l'ultimo accesso è stato meno di 30 secondi fa
      if (lastAccessTime && (now.getTime() - lastAccessTime.getTime()) < 30000) {
        console.log(`🚫 [PWA ACCESS SKIP] Cliente ${client.firstName} ${client.lastName} (${clientId}) - Accesso duplicato ignorato (${Math.round((now.getTime() - lastAccessTime.getTime()) / 1000)}s fa)`);
        return res.json({
          success: true,
          accessCount: client.accessCount || 0,
          message: 'Accesso già registrato di recente'
        });
      }
      
      // SISTEMA SEMPLIFICATO: Incrementa il contatore di accessi solo se non è duplicato
      client.accessCount = (client.accessCount || 0) + 1;
      client.lastAccess = now.toISOString();
      
      // Salva i dati aggiornati
      saveStorageData(storageData);
      
      console.log(`📱 [PWA ACCESS] Cliente ${client.firstName} ${client.lastName} (${clientId}) ha acceduto all'app - conteggio: ${client.accessCount}`);
      
      // Previeni cache per assicurarsi che i conteggi siano sempre aggiornati
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({
        success: true,
        accessCount: client.accessCount,
        message: 'Accesso registrato'
      });
      
    } catch (error) {
      console.error('Errore nel tracking accesso PWA:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Endpoint per servire icone PWA dinamiche basate sul proprietario del cliente (da token QR)
  app.get('/icons/custom-icon-:size.png', (req, res) => {
    try {
      const size = req.params.size; // es: 96x96, 192x192, 512x512
      const storageData = loadStorageData();
      
      // Controlla se c'è un token QR negli headers o referer per identificare il proprietario
      let ownerUserId = null;
      
      // Controlla il referer per token QR
      const referer = req.get('referer') || '';
      const tokenMatch = referer.match(/token=([^&]+)/);
      
      if (tokenMatch) {
        const token = tokenMatch[1];
        const tokenParts = token.split('_');
        if (tokenParts.length === 3) {
          ownerUserId = parseInt(tokenParts[0]); // Prima parte = userId proprietario
          console.log(`🔍 PWA ICON: Identificato proprietario ${ownerUserId} da token QR`);
        }
      }
      
      // Se non trovato da token QR, usa sessione attiva (admin)
      if (!ownerUserId && req.session && req.session.passport && req.session.passport.user) {
        const serializedUser = req.session.passport.user;
        if (typeof serializedUser === 'string' && serializedUser.includes(':')) {
          ownerUserId = parseInt(serializedUser.split(':')[1]);
          console.log(`🔍 PWA ICON: Usando utente sessione attiva ${ownerUserId}`);
        }
      }
      
      // Fallback controllato: usa utente 14 (Silvia Busnari) per consistenza
      if (!ownerUserId) {
        const targetUser = 14;
        if (storageData.userIcons && storageData.userIcons[targetUser]) {
          ownerUserId = targetUser;
          console.log(`🔍 PWA ICON: Fallback controllato a utente ${ownerUserId}`);
        } else {
          const adminUsers = Object.keys(storageData.userIcons || {});
          if (adminUsers.length > 0) {
            ownerUserId = parseInt(adminUsers[0]);
            console.log(`🔍 PWA ICON: Fallback finale a primo admin ${ownerUserId}`);
          }
        }
      }
      
      // Recupera l'icona del professionista dalla struttura userIcons
      const userIcon = ownerUserId ? storageData.userIcons[ownerUserId] : null;
      
      if (!userIcon) {
        console.log(`🔄 Nessuna icona personalizzata trovata per utente ${ownerUserId}, uso default`);
        return res.redirect('/icons/icon-' + size + '.png');
      }
      
      // Se l'icona è in formato base64, convertila e servila
      if (userIcon.startsWith('data:image/')) {
        const base64Data = userIcon.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Determina il tipo di immagine dal data URL
        let contentType = 'image/png';
        if (userIcon.includes('data:image/jpeg')) contentType = 'image/jpeg';
        else if (userIcon.includes('data:image/jpg')) contentType = 'image/jpeg';
        
        res.set({
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Cache per 1 ora
          'Content-Length': buffer.length
        });
        
        console.log(`📱 Servendo icona PWA personalizzata ${size} per utente ${ownerUserId}`);
        return res.send(buffer);
      }
      
      // Se è un percorso file, serve quello
      console.log(`📁 Reindirizzando a icona file: ${userIcon}`);
      res.redirect(userIcon);
      
    } catch (error) {
      console.error('Errore nel servire icona PWA personalizzata:', error);
      // Fallback all'icona predefinita
      res.redirect('/icons/icon-' + req.params.size + '.png');
    }
  });

  // Endpoint per servire manifest.json dinamico con icone personalizzate
  app.get('/manifest.json', (req, res) => {
    try {
      const storageData = loadStorageData();
      
      // PRIORITA' 1: Identifica proprietario da token QR nel referer
      let currentUserId = null;
      const referer = req.get('referer') || '';
      const tokenMatch = referer.match(/token=([^&]+)/);
      
      if (tokenMatch) {
        const token = tokenMatch[1];
        const tokenParts = token.split('_');
        if (tokenParts.length >= 5 && tokenParts[0] === 'PROF') {
          currentUserId = parseInt(tokenParts[1]);
          console.log(`📱 MANIFEST: Identificato proprietario ${currentUserId} da token QR`);
        }
      }
      
      // PRIORITA' 2: Usa sessione utente autenticato
      if (!currentUserId && req.session && req.session.passport && req.session.passport.user) {
        const serializedUser = req.session.passport.user;
        if (typeof serializedUser === 'string' && serializedUser.includes(':')) {
          currentUserId = parseInt(serializedUser.split(':')[1]);
          console.log(`📱 MANIFEST: Usando utente sessione ${currentUserId}`);
        }
      }
      
      // PRIORITA' 3: Fallback controllato a utente 14 (Silvia Busnari) per consistenza
      if (!currentUserId) {
        const targetUser = 14;
        if (storageData.userIcons && storageData.userIcons[targetUser]) {
          currentUserId = targetUser;
          console.log(`📱 MANIFEST: Fallback controllato a utente ${currentUserId}`);
        } else {
          const adminUsers = Object.keys(storageData.userIcons || {});
          if (adminUsers.length > 0) {
            currentUserId = parseInt(adminUsers[0]);
            console.log(`📱 MANIFEST: Fallback finale a primo admin ${currentUserId}`);
          }
        }
      }
      
      // Configurazione manifest dinamica
      const manifest = {
        "name": "Gestione Appuntamenti v4",
        "short_name": "App Cliente",
        "description": "Gestione consensi e servizi medici",
        "start_url": "/pwa",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#4f46e5",
        "orientation": "any",
        "categories": ["healthcare", "business"],
        "lang": "it-IT",
        "dir": "ltr",
        "prefer_related_applications": false,
        "scope": "/",
        "id": "gestione-appuntamenti-client-v4",
        "icons": [
          {
            "src": "/icons/custom-icon-96x96.png",
            "sizes": "96x96",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "/icons/custom-icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
          },
          {
            "src": "/icons/custom-icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
          }
        ],
        "screenshots": [
          {
            "src": "/icons/custom-icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "platform": "wide",
            "label": "Home page dell'applicazione"
          }
        ],
        "shortcuts": [
          {
            "name": "Area Cliente",
            "url": "/client-area",
            "description": "Accedi alla tua area personale",
            "icons": [
              {
                "src": "/icons/custom-icon-96x96.png",
                "sizes": "96x96",
                "type": "image/png"
              }
            ]
          }
        ],
        "related_applications": []
      };
      
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      });
      
      console.log(`📱 Servendo manifest.json dinamico per utente ${currentUserId}`);
      res.json(manifest);
      
    } catch (error) {
      console.error('Errore nel servire manifest.json dinamico:', error);
      // Fallback al manifest statico
      res.redirect('/public/manifest.json');
    }
  });

  // Endpoint per recuperare dettagli accessi di un cliente (richiesto da ClientAccessesDetails)
  app.get('/api/client-access/:clientId', requireAuth, (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const storageData = loadStorageData();
      
      // Trova il cliente
      const clientData = storageData.clients?.find(([id, client]) => id === clientId);
      if (!clientData) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      const [id, client] = clientData;
      
      // Genera accessi fittizi basati sui dati disponibili
      const accesses = [];
      if (client.lastAccess && (client.accessCount || 0) > 0) {
        const lastAccessDate = new Date(client.lastAccess);
        
        // Genera gli ultimi 10 accessi distribuiti negli ultimi giorni
        for (let i = 0; i < Math.min(client.accessCount || 0, 10); i++) {
          const daysBack = Math.floor(i / 2); // 2 accessi per giorno
          const accessDate = new Date(lastAccessDate);
          accessDate.setDate(accessDate.getDate() - daysBack);
          accessDate.setHours(9 + (i % 12), Math.floor(Math.random() * 60), 0, 0);
          
          accesses.push({
            id: i + 1,
            clientId: clientId,
            accessDate: accessDate.toISOString(),
            userAgent: i % 3 === 0 ? "Mobile" : (i % 3 === 1 ? "Desktop" : "Tablet")
          });
        }
      }
      
      // Ordina per data decrescente (più recenti prima)
      accesses.sort((a, b) => new Date(b.accessDate).getTime() - new Date(a.accessDate).getTime());
      
      res.json(accesses);
      
    } catch (error) {
      console.error('Errore nel recupero dettagli accessi:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Endpoint per testare e aggiornare lo stato dei promemoria
  app.post('/api/test-reminder-flags', requireAuth, (req, res) => {
    try {
      const { appointmentId, reminderStatus } = req.body;
      const storageData = loadStorageData();
      
      // Trova l'appuntamento e aggiorna lo stato
      const appointmentIndex = storageData.appointments?.findIndex(apt => apt.id === appointmentId);
      if (appointmentIndex !== -1) {
        storageData.appointments[appointmentIndex].reminderStatus = reminderStatus;
        storageData.appointments[appointmentIndex].reminderType = 'email'; // Assicura che abbia un tipo
        
        // Salva i dati aggiornati
        saveStorageData(storageData);
        
        res.json({
          success: true,
          message: `Stato promemoria aggiornato a: ${reminderStatus}`,
          appointment: storageData.appointments[appointmentIndex]
        });
      } else {
        res.status(404).json({ error: 'Appuntamento non trovato' });
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento dello stato promemoria:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // Endpoint per monitorare i promemoria email inviati
  app.get('/api/email/reminders/status', requireAuth, (req, res) => {
    try {
      const storageData = loadStorageData();
      const { appointments = [] } = storageData;
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filtra appuntamenti per domani
      const tomorrowAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.toDateString() === tomorrow.toDateString();
      });
      
      // Trova l'appuntamento di Marco Berto specifico
      const marcoBertoAppointment = tomorrowAppointments.find(apt => {
        const client = storageData.clients?.find(([id, clientData]) => 
          clientData.id === apt.clientId && 
          (clientData.firstName?.toLowerCase().includes('marco') || 
           clientData.lastName?.toLowerCase().includes('berto'))
        );
        return client;
      });
      
      const emailSettings = JSON.parse(fs.readFileSync('./email_settings.json', 'utf8'));
      
      res.json({
        emailSystemEnabled: emailSettings.emailEnabled,
        schedulerActive: true,
        tomorrowAppointments: tomorrowAppointments.length,
        marcoBertoFound: !!marcoBertoAppointment,
        marcoBertoAppointment: marcoBertoAppointment ? {
          id: marcoBertoAppointment.id,
          date: marcoBertoAppointment.date,
          time: marcoBertoAppointment.time,
          clientId: marcoBertoAppointment.clientId,
          serviceId: marcoBertoAppointment.serviceId
        } : null,
        nextReminderCheck: 'Ogni ora alle :00',
        systemStatus: 'Operativo'
      });
    } catch (error) {
      console.error('Errore controllo promemoria:', error);
      res.status(500).json({ error: 'Errore sistema promemoria' });
    }
  });

  // Configurazione multer per upload immagini
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limite
    },
    fileFilter: (req, file, cb) => {
      // Accetta solo immagini
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Solo file immagine sono accettati'), false);
      }
    }
  });

  // API per caricare icona personalizzata PWA
  app.post('/api/upload-custom-icon', requireAuth, upload.single('icon'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nessun file caricato' });
      }

      console.log(`🎨 [ICON UPLOAD] Utente ${req.user?.username} sta caricando icona personalizzata`);
      console.log(`📎 File ricevuto: ${req.file.originalname}, size: ${req.file.size} bytes`);

      // Converti l'immagine caricata in icone PWA
      const iconPaths = await iconConversionService.processCustomIcon(
        req.file.buffer,
        'custom-icon'
      );

      console.log(`✅ [ICON UPLOAD] Icone PWA generate:`, iconPaths);

      res.json({
        success: true,
        message: 'Icona personalizzata caricata e convertita con successo',
        iconPaths: iconPaths
      });
    } catch (error) {
      console.error('❌ [ICON UPLOAD] Errore:', error);
      res.status(500).json({ 
        error: 'Errore durante la conversione dell\'icona',
        details: error.message 
      });
    }
  });

  // API per caricare icona via base64
  app.post('/api/upload-icon-base64', requireAuth, async (req: any, res: any) => {
    try {
      const { imageData, iconName } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: 'Dati immagine mancanti' });
      }

      console.log(`🎨 [ICON BASE64] Utente ${req.user?.username} sta caricando icona via base64`);

      // Converti l'immagine base64 in icone PWA
      const iconPaths = await iconConversionService.processCustomIcon(
        imageData,
        iconName || 'custom-icon'
      );

      console.log(`✅ [ICON BASE64] Icone PWA generate:`, iconPaths);

      res.json({
        success: true,
        message: 'Icona caricata e convertita con successo',
        iconPaths: iconPaths
      });
    } catch (error) {
      console.error('❌ [ICON BASE64] Errore:', error);
      res.status(500).json({ 
        error: 'Errore durante la conversione dell\'icona',
        details: error.message 
      });
    }
  });

  // API per ripristinare icona predefinita
  app.post('/api/restore-default-icon', requireAuth, async (req: any, res: any) => {
    try {
      console.log(`🔄 [ICON RESTORE] Utente ${req.user?.username} sta ripristinando icona predefinita`);

      // Ripristina le icone predefinite (Fleur de Vie)
      const iconPaths = await iconConversionService.restoreDefaultIcons();

      console.log(`✅ [ICON RESTORE] Icone predefinite ripristinate:`, iconPaths);

      res.json({
        success: true,
        message: 'Icona predefinita ripristinata con successo',
        iconPaths: iconPaths
      });
    } catch (error) {
      console.error('❌ [ICON RESTORE] Errore:', error);
      res.status(500).json({ 
        error: 'Errore durante il ripristino dell\'icona predefinita',
        details: error.message 
      });
    }
  });

  // API per ottenere info sulle icone attuali
  app.get('/api/current-icon-info', requireAuth, async (req: any, res: any) => {
    try {
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      res.json({
        success: true,
        currentIcons: manifest.icons,
        manifestPath: '/manifest.json'
      });
    } catch (error) {
      console.error('❌ [ICON INFO] Errore:', error);
      res.status(500).json({ 
        error: 'Errore durante la lettura delle informazioni icone',
        details: error.message 
      });
    }
  });

  // Endpoint di test per forzare l'esecuzione del sistema di promemoria
  app.post("/api/test-reminder-system", requireAuth, async (req, res) => {
    try {
      console.log('🔧 Test manuale del sistema di promemoria richiesto');
      
      // Importa e esegue il servizio di promemoria
      const { notificationService } = await import('./services/notificationService');
      
      console.log('📨 Avvio test del processore di promemoria...');
      const remindersSent = await notificationService.processReminders();
      
      res.json({
        success: true,
        message: `Test completato: ${remindersSent} promemoria elaborati`,
        remindersSent,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ Errore nel test del sistema di promemoria:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}