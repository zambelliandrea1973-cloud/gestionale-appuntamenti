import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";

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
      { id: 4, firstName: "Cristina", lastName: "Valetti", phone: "+393337124083", email: "" },
      { id: 5, firstName: "Matteo", lastName: "Somaschini", phone: "+393920820219", email: "" },
      { id: 6, firstName: "Leila", lastName: "Baldovin", phone: "+393312936414", email: "leila.baldovin22@gmail.com" },
      { id: 7, firstName: "Rosa", lastName: "Nappi", phone: "+393479687939", email: "" },
      { id: 8, firstName: "Giovanna", lastName: "Spano", phone: "+393666249288", email: "" },
      { id: 9, firstName: "Giulio", lastName: "Carimati", phone: "+393396253936", email: "" },
      { id: 10, firstName: "Daniela", lastName: "Biglione", phone: "+393392327893", email: "" },
      { id: 11, firstName: "Roberto", lastName: "Mascheroni", phone: "+393357004464", email: "" },
      { id: 12, firstName: "Valeria", lastName: "Benvenuto", phone: "+393348006444", email: "" }
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

  // Sistema lineare semplice - Servizi
  app.get("/api/services", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const services = userData[user.id]?.services || [];
    res.json(services);
  });

  app.post("/api/services", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    if (!userData[user.id]) userData[user.id] = { services: [], clients: [], appointments: [], settings: {} };
    
    const newService = {
      id: Date.now(),
      ...req.body
    };
    userData[user.id].services.push(newService);
    res.status(201).json(newService);
  });

  // Sistema lineare semplice - Clienti
  app.get("/api/clients", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const clients = userData[user.id]?.clients || [];
    res.json(clients);
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
  app.get("/api/appointments", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const appointments = userData[user.id]?.appointments || [];
    res.json(appointments);
  });

  app.post("/api/appointments", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    if (!userData[user.id]) userData[user.id] = { services: [], clients: [], appointments: [], settings: {} };
    
    const newAppointment = {
      id: Date.now(),
      ...req.body
    };
    userData[user.id].appointments.push(newAppointment);
    res.status(201).json(newAppointment);
  });

  // Impostazioni azienda - Sistema semplice
  app.get("/api/company-name-settings", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    const settings = userData[user.id]?.settings || { businessName: "Studio Medico", showBusinessName: true };
    res.json(settings);
  });

  app.post("/api/company-name-settings", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
    const user = req.user as any;
    if (!userData[user.id]) userData[user.id] = { services: [], clients: [], appointments: [], settings: {} };
    
    userData[user.id].settings = { ...userData[user.id].settings, ...req.body };
    res.json(userData[user.id].settings);
  });

  // Informazioni di contatto
  app.get("/api/contact-info", (req, res) => {
    res.json({
      email: "info@studiomedico.it",
      phone: "+39 123 456 7890"
    });
  });

  // Info applicazione
  app.get("/api/client-app-info", (req, res) => {
    res.json({
      appName: "Gestionale Sanitario",
      icon: "/app-icon.jpg"
    });
  });

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

  const httpServer = createServer(app);
  return httpServer;
}