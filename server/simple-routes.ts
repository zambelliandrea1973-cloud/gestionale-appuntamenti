import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import path from "path";
import fs from 'fs';
import { fileURLToPath } from 'url';

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
  const iconPath = path.join(__dirname, '../attached_assets/Fleur de Vie multicolore.jpg');
  const iconBuffer = fs.readFileSync(iconPath);
  defaultIconBase64 = `data:image/jpeg;base64,${iconBuffer.toString('base64')}`;
  console.log('✅ Icona Fleur de Vie caricata dal backup15:', iconBuffer.length, 'bytes');
} catch (error) {
  console.log('⚠️ Icona Fleur de Vie non trovata, uso fallback');
  defaultIconBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzQjgyRjYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAySDE0VjRIMTJWMlpNMTIgMThIMTRWMjBIMTJWMThaTTIwIDEwSDE4VjEySDIwVjEwWk02IDEwSDRWMTJINlYxMFpNMTggMTBWMTJIMTZWMTBIMThaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
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
      
      // Crea nuovo cliente con ownership
      const newClient = {
        id: Date.now(),
        ownerId: user.id,
        uniqueCode: `${user.type.substring(0,3).toUpperCase()}${Date.now().toString().slice(-4)}`,
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
        return data;
      }
    } catch (error) {
      console.error('Errore caricamento storage:', error);
    }
    return { userIcons: {}, userBusinessSettings: {}, userServices: {} };
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
      
      // Backup del file esistente prima di salvare
      if (fs.existsSync(storageFile)) {
        const backupName = `storage_data_backup_${Date.now()}.json`;
        fs.copyFileSync(storageFile, backupName);
        console.log(`🔒 Backup automatico creato: ${backupName}`);
        
        // Pulizia backup vecchi
        cleanOldBackups();
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


  // Endpoint per ottenere l'icona dell'app - SEPARAZIONE PER UTENTE
  app.get("/api/client-app-info", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ 
        appName: "Gestionale Sanitario", 
        icon: defaultIconBase64 
      });
    }

    const userId = req.user.id;
    const userIcon = storageData.userIcons[userId] || defaultIconBase64;
    
    res.json({ 
      appName: "Gestionale Sanitario", 
      icon: userIcon 
    });
  });

  // Endpoint per caricare una nuova icona - SEPARAZIONE PER UTENTE
  app.post("/api/upload-app-icon", (req, res) => {
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
  app.post("/api/reset-app-icon", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Non autenticato" });
    }

    const userId = req.user.id;
    storageData.userIcons[userId] = defaultIconBase64;
    saveStorageData(storageData);
    console.log(`🔄 Reset icona a Fleur de Vie persistente per utente ${userId}`);
    
    res.json({ 
      success: true, 
      message: "Icona ripristinata al default", 
      appName: "Gestionale Sanitario", 
      icon: defaultIconBase64 
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

  // Sistema QR Code per accesso clienti - SEPARAZIONE PER UTENTE
  app.get("/api/clients/:id/activation-token", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "ID cliente non valido" });
    }
    
    // Carica dati reali dal file storage_data.json
    const allClients = loadStorageData().clients || [];
    const clientData = allClients.find(([id, client]) => id === clientId);
    
    if (!clientData) {
      return res.status(404).json({ message: "Cliente non trovato nel sistema" });
    }
    
    const client = clientData[1];
    
    // Verifica proprietà - solo admin o proprietario del cliente
    if (user.type !== 'admin' && client.ownerId && client.ownerId !== user.id) {
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo cliente" });
    }
    
    // Genera token di attivazione semplice
    const token = `${user.id}_${clientId}_${Date.now()}`;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const activationUrl = `${protocol}://${host}/activate?token=${token}`;
    
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
      
      console.log(`🔐 Token QR generato per cliente ${clientId} di utente ${user.id}`);
      
      res.json({
        token,
        activationUrl,
        qrCode,
        clientName: `${client.firstName} ${client.lastName}`
      });
    } catch (error) {
      console.error('Errore generazione QR:', error);
      res.status(500).json({ message: "Errore nella generazione del QR code" });
    }
  });

  app.get("/api/client-access/count/:clientId", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clientId = parseInt(req.params.clientId);
    
    // Carica dati reali dal file storage_data.json
    const allClients = loadStorageData().clients || [];
    const clientData = allClients.find(([id, client]) => id === clientId);
    
    if (!clientData) {
      return res.status(404).json({ message: "Cliente non trovato nel sistema" });
    }
    
    const client = clientData[1];
    
    // Verifica proprietà - solo admin o proprietario del cliente
    if (user.type !== 'admin' && client.ownerId && client.ownerId !== user.id) {
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo cliente" });
    }
    
    // Conteggio accessi semplice (simulato)
    const accessCount = Math.floor(Math.random() * 10);
    res.json({ count: accessCount });
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

  const httpServer = createServer(app);
  return httpServer;
}