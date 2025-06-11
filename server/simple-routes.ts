import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import path from "path";
import fs from 'fs';
import { fileURLToPath } from 'url';

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
    
    // Carica solo i servizi dell'utente dal file storage_data.json
    const storageData = loadStorageData();
    const userServices = storageData.userServices?.[user.id] || [];
    
    console.log(`🔧 [/api/services] Caricati ${userServices.length} servizi per utente ${user.id}`);
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

  // Sistema lineare semplice - Clienti
  app.get("/api/clients", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const deviceType = req.headers['x-device-type'] || 'unknown';
    
    console.log(`🔍 [/api/clients] [${deviceType}] Richiesta da utente ID:${user.id}, tipo:${user.type}, email:${user.email}`);
    
    // Carica dati reali dal file storage_data.json
    const allClients = loadStorageData().clients || [];
    console.log(`📦 [/api/clients] [${deviceType}] Caricati ${allClients.length} clienti totali dal storage`);
    
    // Per admin, mostra tutti i clienti, per altri utenti solo i propri
    let userClients;
    if (user.type === 'admin') {
      userClients = allClients.map(([id, client]) => client);
      console.log(`👑 [/api/clients] [${deviceType}] Admin - Restituendo tutti i ${userClients.length} clienti`);
    } else {
      userClients = allClients
        .filter(([id, client]) => client.ownerId === user.id)
        .map(([id, client]) => client);
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
    
    // Log totale con uniqueCode per identificare il problema
    const clientsWithCodes = userClients.filter(c => c.uniqueCode);
    console.log(`🏷️ [/api/clients] [${deviceType}] Clienti con uniqueCode: ${clientsWithCodes.length}/${userClients.length}`);
    
    res.json(userClients);
  });

  app.post("/api/clients", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    if (!userData[user.id]) userData[user.id] = { services: [], clients: [], appointments: [], settings: {} };
    
    const newClient = {
      id: Date.now(),
      ...req.body
    };
    userData[user.id].clients.push(newClient);
    res.status(201).json(newClient);
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

  // Utente con licenza
  app.get("/api/user-with-license", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      type: user.type,
      hasActiveLicense: true,
      licenseType: "business"
    });
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
    res.json({ hasLicense: true, type: "business" });
  });

  app.get("/api/license/has-pro-access", (req, res) => {
    res.json(true);
  });

  app.get("/api/license/has-business-access", (req, res) => {
    res.json(true);
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
  
  function saveStorageData(updatedData) {
    try {
      const currentData = fs.existsSync(storageFile) 
        ? JSON.parse(fs.readFileSync(storageFile, 'utf8'))
        : {};
      
      const mergedData = { ...currentData, ...updatedData };
      fs.writeFileSync(storageFile, JSON.stringify(mergedData, null, 2));
      console.log('💾 Dati salvati persistentemente');
    } catch (error) {
      console.error('Errore salvataggio storage:', error);
    }
  }
  
  let storageData = loadStorageData();

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

  // Endpoint per ottenere le impostazioni nome aziendale - SEPARAZIONE PER UTENTE
  app.get("/api/company-name-settings", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ businessName: "Studio Medico", showBusinessName: true });
    }

    const userId = req.user.id;
    console.log(`🏢 [/api/company-name-settings] GET per utente ${userId}`);
    
    // Carica dati freschi dal storage_data.json
    const currentStorageData = loadStorageData();
    const userSettings = currentStorageData.userBusinessSettings?.[userId] || { businessName: "Studio Medico", showBusinessName: true };
    
    console.log(`🏢 [/api/company-name-settings] Settings per utente ${userId}:`, userSettings);
    res.json(userSettings);
  });

  // Endpoint per salvare le impostazioni nome aziendale - SEPARAZIONE PER UTENTE
  app.post("/api/company-name-settings", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    try {
      const { businessName, showBusinessName } = req.body;
      const userId = req.user.id;
      
      const currentSettings = storageData.userBusinessSettings[userId] || { businessName: "Studio Medico", showBusinessName: true };
      
      if (businessName !== undefined) currentSettings.businessName = businessName;
      if (showBusinessName !== undefined) currentSettings.showBusinessName = showBusinessName;
      
      storageData.userBusinessSettings[userId] = currentSettings;
      saveStorageData(storageData);
      console.log(`🏢 Impostazioni nome aziendale aggiornate persistentemente per utente ${userId}:`, currentSettings);
      
      res.json({ success: true, message: "Impostazioni salvate con successo", ...currentSettings });
    } catch (error) {
      console.error('Errore aggiornamento nome aziendale:', error);
      res.status(500).json({ success: false, message: "Errore durante il salvataggio" });
    }
  });

  // Sistema lineare semplice - Appuntamenti (UNIFICATO CON SISTEMA ESISTENTE)
  app.get("/api/appointments", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const appointments = userData[user.id]?.appointments || [];
    const clients = userData[user.id]?.clients || [];
    const services = userData[user.id]?.services || [];
    
    // Popola le relazioni con client e service
    const appointmentsWithDetails = appointments.map(appointment => {
      const client = clients.find(c => c.id === appointment.clientId);
      const service = services.find(s => s.id === appointment.serviceId);
      return { ...appointment, client, service };
    });
    
    res.json(appointmentsWithDetails);
  });

  app.get("/api/appointments/date/:date", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const { date } = req.params;
    const appointments = userData[user.id]?.appointments || [];
    const clients = userData[user.id]?.clients || [];
    const services = userData[user.id]?.services || [];
    
    console.log(`📅 DEBUG - Utente ${user.id} cerca appuntamenti per data ${date}`);
    console.log(`📅 DEBUG - Appuntamenti totali utente: ${appointments.length}`);
    appointments.forEach(apt => console.log(`📅 DEBUG - Appuntamento: ${apt.id}, data: ${apt.date}`));
    
    const dayAppointments = appointments.filter(apt => apt.date === date);
    console.log(`📅 DEBUG - Appuntamenti trovati per ${date}: ${dayAppointments.length}`);
    
    // Popola le relazioni con client e service
    const dayAppointmentsWithDetails = dayAppointments.map(appointment => {
      const client = clients.find(c => c.id === appointment.clientId);
      const service = services.find(s => s.id === appointment.serviceId);
      return { ...appointment, client, service };
    });
    
    res.json(dayAppointmentsWithDetails);
  });

  app.post("/api/appointments", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    if (!userData[user.id]) userData[user.id] = { services: [], clients: [], appointments: [], settings: {} };
    
    const newAppointment = {
      id: Date.now(),
      ...req.body,
      createdAt: new Date()
    };
    userData[user.id].appointments.push(newAppointment);
    console.log(`📅 Appuntamento creato per utente ${user.id}:`, newAppointment.id);
    
    // Popola le relazioni con client e service prima di restituire
    const clients = userData[user.id]?.clients || [];
    const services = userData[user.id]?.services || [];
    
    const client = clients.find(c => c.id === newAppointment.clientId);
    const service = services.find(s => s.id === newAppointment.serviceId);
    const appointmentWithDetails = { ...newAppointment, client, service };
    
    res.status(201).json(appointmentWithDetails);
  });

  // Sistema QR Code per accesso clienti - SEPARAZIONE PER UTENTE
  app.get("/api/clients/:id/activation-token", (req, res) => {
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
    
    // QR code semplice (base64 encoding dell'URL)
    const qrCode = Buffer.from(activationUrl).toString('base64');
    
    console.log(`🔐 Token QR generato per cliente ${clientId} di utente ${user.id}`);
    
    res.json({
      token,
      activationUrl,
      qrCode,
      clientName: `${client.firstName} ${client.lastName}`
    });
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