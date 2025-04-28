import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import fs from "fs";
import path from "path";
import {
  insertClientSchema,
  insertServiceSchema,
  insertAppointmentSchema,
  insertConsentSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertPaymentSchema,
  insertReminderTemplateSchema
} from "@shared/schema";
import { setupAuth, isAdmin, isAuthenticated, isStaff, isClient } from "./auth";
import { tokenService } from "./services/tokenService";
import { qrCodeService } from "./services/qrCodeService";
import { notificationService } from "./services/notificationService";
import { contactService } from "./services/contactService";
import { initializeSchedulers } from "./services/schedulerService";
import { googleCalendarService } from "./services/googleCalendarService";
import { companyNameService } from "./services/companyNameService";
import { directNotificationService } from "./services/directNotificationService";
import { keepAliveService } from './services/keepAliveService';
import { testWhatsApp } from "./api/test-whatsapp";
import { notificationSettingsService } from "./services/notificationSettingsService";
import { smtpDetectionService } from "./services/smtpDetectionService";
import { clientAccessService } from "./services/clientAccessService";
import multer from 'multer';
import sharp from 'sharp';
import betaRoutes from './routes/betaRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { adminRouter } from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import phoneDeviceRoutes, { initializePhoneDeviceSocket } from './routes/phoneDeviceRoutes';
import directPhoneRoutes from './routes/directPhoneRoutes';

// Middleware per verificare che l'utente sia un cliente o un membro dello staff
function isClientOrStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Non autenticato" });
  }

  const userType = (req.user as any).type;
  const isOwnResource = req.params.clientId && userType === "client" && (req.user as any).clientId === parseInt(req.params.clientId);
  
  if (userType === "staff" || isOwnResource) {
    return next();
  }
  
  res.status(403).json({ message: "Accesso negato" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configura l'autenticazione
  setupAuth(app);
  
  // Inizializza gli scheduler per i promemoria automatici
  initializeSchedulers();
  
  // Middleware per servire i file statici dalla cartella public
  // Nota: Non utilizziamo app.use(express.static()) qui perché è già gestito da server/vite.ts
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, "public");
  
  // Regola specifica per servire i file HTML statici
  app.get("/:fileName.html", (req: Request, res: Response, next: NextFunction) => {
    try {
      const fileName = req.params.fileName;
      const filePath = path.join(publicDir, `${fileName}.html`);
      
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
      
      // Se il file non esiste, passa al successivo middleware
      next();
    } catch (error) {
      console.error(`Errore nel servire ${req.path}:`, error);
      next(error);
    }
  });
  
  // Middleware specifico per il service worker - assicura che sia servito con il MIME type corretto
  app.get("/service-worker.js", (req: Request, res: Response) => {
    try {
      const filePath = path.join(publicDir, "service-worker.js");
      
      // Verifica che il file esista
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/javascript");
        res.sendFile(filePath);
      } else {
        console.error(`File service-worker.js non trovato in: ${filePath}`);
        res.status(404).send("Service worker not found");
      }
    } catch (error) {
      console.error("Errore durante l'invio del service worker:", error);
      res.status(500).send("Error serving service worker");
    }
  });
  
  // Middleware per servire correttamente i file manifest
  app.get("/manifest.json", (req: Request, res: Response) => {
    try {
      const filePath = path.join(publicDir, "manifest.json");
      
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/manifest+json");
        res.sendFile(filePath);
      } else {
        console.error(`File manifest.json non trovato in: ${filePath}`);
        res.status(404).send("Manifest not found");
      }
    } catch (error) {
      console.error("Errore durante l'invio del manifest:", error);
      res.status(500).send("Error serving manifest");
    }
  });
  
  app.get("/manifest.webmanifest", (req: Request, res: Response) => {
    try {
      const filePath = path.join(publicDir, "manifest.webmanifest");
      
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/manifest+json");
        res.sendFile(filePath);
      } else {
        console.error(`File manifest.webmanifest non trovato in: ${filePath}`);
        res.status(404).send("Manifest not found");
      }
    } catch (error) {
      console.error("Errore durante l'invio del manifest:", error);
      res.status(500).send("Error serving manifest");
    }
  });
  
  // Middleware per servire correttamente le icone dell'app
  app.get("/icons/:fileName", (req: Request, res: Response) => {
    try {
      const fileName = req.params.fileName;
      const filePath = path.join(publicDir, "icons", fileName);
      
      if (fs.existsSync(filePath)) {
        if (fileName.endsWith('.svg')) {
          res.setHeader("Content-Type", "image/svg+xml");
        } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
          res.setHeader("Content-Type", "image/jpeg");
        } else if (fileName.endsWith('.png')) {
          res.setHeader("Content-Type", "image/png");
        }
        
        res.sendFile(filePath);
      } else {
        console.error(`Icona non trovata: ${filePath}`);
        res.status(404).send("Icon not found");
      }
    } catch (error) {
      console.error("Errore durante l'invio dell'icona:", error);
      res.status(500).send("Error serving icon");
    }
  });
  
  // Health check endpoint per mantenere l'applicazione attiva
  app.get("/api/health", (_req: Request, res: Response) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      }
    });
  });
  
  // Client Access API endpoints
  // Endpoint per registrare un nuovo accesso di un cliente
  app.post("/api/client-access/:clientId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID cliente non valido" });
      }
      
      // Ottieni informazioni dal client
      const ipAddress = req.ip || req.socket.remoteAddress || "";
      const userAgent = req.headers["user-agent"] || "";
      
      const access = await clientAccessService.logAccess(clientId, ipAddress, userAgent);
      res.status(201).json(access);
    } catch (error: any) {
      console.error("Errore nella registrazione dell'accesso:", error);
      res.status(500).json({ message: error.message || "Errore nella registrazione dell'accesso" });
    }
  });
  
  // Endpoint per ottenere il conteggio degli accessi per un cliente specifico (endpoint pubblico)
  app.get("/api/client-access/count/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID cliente non valido" });
      }
      
      const count = await clientAccessService.getAccessCountForClient(clientId);
      res.json({ clientId, count });
    } catch (error: any) {
      console.error("Errore nel conteggio degli accessi:", error);
      res.status(500).json({ message: error.message || "Errore nel conteggio degli accessi" });
    }
  });
  
  // Endpoint per ottenere il conteggio degli accessi per tutti i clienti
  app.get("/api/client-access/counts", isStaff, async (_req: Request, res: Response) => {
    try {
      const clientsWithCounts = await clientAccessService.getAccessCountsForAllClients();
      res.json(clientsWithCounts);
    } catch (error: any) {
      console.error("Errore nel recupero dei conteggi di accesso:", error);
      res.status(500).json({ message: error.message || "Errore nel recupero dei conteggi di accesso" });
    }
  });
  
  // Endpoint per ottenere tutti gli accessi di un cliente specifico (endpoint pubblico)
  app.get("/api/client-access/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID cliente non valido" });
      }
      
      const accesses = await clientAccessService.getAccessesForClient(clientId);
      res.json(accesses);
    } catch (error: any) {
      console.error("Errore nel recupero degli accessi:", error);
      res.status(500).json({ message: error.message || "Errore nel recupero degli accessi" });
    }
  });
  
  // Registra le route per il sistema beta, pagamenti, notifiche e funzioni amministrative
  app.use('/api/beta', betaRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/admin', adminRouter);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/phone-device', phoneDeviceRoutes);
  app.use('/api/phone-device', directPhoneRoutes); // Aggiungiamo il nuovo sistema di configurazione del telefono

  const httpServer = createServer(app);
  
  // Inizializza il server WebSocket per la comunicazione con il dispositivo telefonico
  initializePhoneDeviceSocket(httpServer);

  // Client routes
  app.get("/api/clients", async (_req: Request, res: Response) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clients" });
    }
  });

  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Error fetching client" });
    }
  });

  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      const validationResult = insertClientSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid client data",
          errors: validationResult.error.errors
        });
      }

      const client = await storage.createClient(validationResult.data);
      res.status(201).json(client);
    } catch (error) {
      res.status(500).json({ message: "Error creating client" });
    }
  });

  app.put("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const validationResult = insertClientSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid client data",
          errors: validationResult.error.errors
        });
      }

      const updatedClient = await storage.updateClient(id, validationResult.data);
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(updatedClient);
    } catch (error) {
      res.status(500).json({ message: "Error updating client" });
    }
  });

  app.delete("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const success = await storage.deleteClient(id);
      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Error deleting client" });
    }
  });

  app.get("/api/clients/search/:query", async (req: Request, res: Response) => {
    try {
      const query = req.params.query;
      const clients = await storage.searchClients(query);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error searching clients" });
    }
  });

  // Service routes
  app.get("/api/services", async (_req: Request, res: Response) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Error fetching services" });
    }
  });

  app.get("/api/services/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid service ID" });
      }

      const service = await storage.getService(id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Error fetching service" });
    }
  });

  app.post("/api/services", async (req: Request, res: Response) => {
    try {
      const validationResult = insertServiceSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid service data",
          errors: validationResult.error.errors
        });
      }

      const service = await storage.createService(validationResult.data);
      res.status(201).json(service);
    } catch (error) {
      res.status(500).json({ message: "Error creating service" });
    }
  });

  app.put("/api/services/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid service ID" });
      }

      const validationResult = insertServiceSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid service data",
          errors: validationResult.error.errors
        });
      }

      const updatedService = await storage.updateService(id, validationResult.data);
      if (!updatedService) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.json(updatedService);
    } catch (error) {
      res.status(500).json({ message: "Error updating service" });
    }
  });

  app.delete("/api/services/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid service ID" });
      }

      const success = await storage.deleteService(id);
      if (!success) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Error deleting service" });
    }
  });

  // Appointment routes
  app.get("/api/appointments", async (_req: Request, res: Response) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });

  app.get("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }

      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointment" });
    }
  });

  app.get("/api/appointments/date/:date", async (req: Request, res: Response) => {
    try {
      const { date } = req.params;
      console.log(`Ricerca appuntamenti per la data: ${date}`);
      
      // Simple validation for date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        console.error(`Formato data invalido: ${date}`);
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      const appointments = await storage.getAppointmentsByDate(date);
      console.log(`Trovati ${appointments.length} appuntamenti per la data ${date}:`, appointments);
      
      res.json(appointments);
    } catch (error) {
      console.error(`Errore durante la ricerca appuntamenti per la data ${req.params.date}:`, error);
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });

  app.get("/api/appointments/range/:startDate/:endDate", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.params;
      // Simple validation for date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      const appointments = await storage.getAppointmentsByDateRange(startDate, endDate);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });

  app.get("/api/appointments/client/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const appointments = await storage.getAppointmentsByClient(clientId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });

  app.post("/api/appointments", async (req: Request, res: Response) => {
    try {
      console.log("Tentativo di creazione appuntamento con dati:", req.body);
      
      const validationResult = insertAppointmentSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error("Errore validazione:", validationResult.error.errors);
        return res.status(400).json({
          message: "Invalid appointment data",
          errors: validationResult.error.errors
        });
      }

      console.log("Dati validati correttamente, creazione appuntamento...");
      const appointment = await storage.createAppointment(validationResult.data);
      console.log("Appuntamento creato con successo:", appointment);
      
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Errore durante la creazione dell'appuntamento:", error);
      res.status(500).json({ message: "Error creating appointment" });
    }
  });

  app.put("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }

      const validationResult = insertAppointmentSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid appointment data",
          errors: validationResult.error.errors
        });
      }

      const updatedAppointment = await storage.updateAppointment(id, validationResult.data);
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      res.json(updatedAppointment);
    } catch (error) {
      res.status(500).json({ message: "Error updating appointment" });
    }
  });

  app.delete("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }

      const success = await storage.deleteAppointment(id);
      if (!success) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Error deleting appointment" });
    }
  });

  // Consent routes
  app.get("/api/consents/client/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const consent = await storage.getConsentByClient(clientId);
      if (!consent) {
        return res.status(404).json({ message: "Consent not found" });
      }

      res.json(consent);
    } catch (error) {
      res.status(500).json({ message: "Error fetching consent" });
    }
  });

  app.post("/api/consents", async (req: Request, res: Response) => {
    try {
      const validationResult = insertConsentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid consent data",
          errors: validationResult.error.errors
        });
      }
      
      // Salva il consenso
      const consent = await storage.createConsent(validationResult.data);
      
      // Se il consenso è stato fornito, aggiorna anche il flag hasConsent nel cliente
      if (validationResult.data.consentProvided) {
        const client = await storage.getClient(validationResult.data.clientId);
        if (client) {
          await storage.updateClient(validationResult.data.clientId, {
            ...client,
            hasConsent: true
          });
        }
      }
      
      res.status(201).json(consent);
    } catch (error) {
      res.status(500).json({ message: "Error creating consent" });
    }
  });
  
  // Endpoint per ottenere l'utente corrente con i dettagli del cliente se è di tipo client
  app.get("/api/current-user", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    
    try {
      const user = req.user as any;
      
      // Se l'utente è un cliente, carica anche i dati del cliente
      if (user.type === "client" && user.clientId) {
        const client = await storage.getClient(user.clientId);
        if (client) {
          // Aggiungi i dati del cliente all'oggetto utente
          return res.json({
            ...user,
            client
          });
        }
      }
      
      // Altrimenti restituisci solo i dati dell'utente
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Client with appointments route
  app.get("/api/clients/:id/with-appointments", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const clientWithAppointments = await storage.getClientWithAppointments(id);
      if (!clientWithAppointments) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(clientWithAppointments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching client with appointments" });
    }
  });

  // Invoice Routes
  app.get("/api/invoices", async (_req: Request, res: Response) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }

      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invoice" });
    }
  });

  app.get("/api/invoices/client/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const invoices = await storage.getInvoicesByClient(clientId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invoices" });
    }
  });

  app.get("/api/invoices/range/:startDate/:endDate", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.params;
      // Simple validation for date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      const invoices = await storage.getInvoicesByDateRange(startDate, endDate);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invoices" });
    }
  });

  app.get("/api/invoices/status/:status", async (req: Request, res: Response) => {
    try {
      const status = req.params.status;
      const validStatuses = ['unpaid', 'paid', 'overdue', 'cancelled'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status", 
          validValues: validStatuses 
        });
      }

      const invoices = await storage.getInvoicesByStatus(status);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invoices" });
    }
  });

  app.post("/api/invoices", async (req: Request, res: Response) => {
    try {
      const validationResult = insertInvoiceSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid invoice data",
          errors: validationResult.error.errors
        });
      }

      const invoice = await storage.createInvoice(validationResult.data);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Error creating invoice" });
    }
  });

  app.put("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }

      const validationResult = insertInvoiceSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid invoice data",
          errors: validationResult.error.errors
        });
      }

      const updatedInvoice = await storage.updateInvoice(id, validationResult.data);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.json(updatedInvoice);
    } catch (error) {
      res.status(500).json({ message: "Error updating invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }

      const success = await storage.deleteInvoice(id);
      if (!success) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Error deleting invoice" });
    }
  });

  // Invoice Item Routes
  app.get("/api/invoice-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice item ID" });
      }

      const item = await storage.getInvoiceItem(id);
      if (!item) {
        return res.status(404).json({ message: "Invoice item not found" });
      }

      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invoice item" });
    }
  });

  app.get("/api/invoice-items/invoice/:invoiceId", async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }

      const items = await storage.getInvoiceItemsByInvoice(invoiceId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invoice items" });
    }
  });

  app.post("/api/invoice-items", async (req: Request, res: Response) => {
    try {
      const validationResult = insertInvoiceItemSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid invoice item data",
          errors: validationResult.error.errors
        });
      }

      const item = await storage.createInvoiceItem(validationResult.data);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ message: "Error creating invoice item" });
    }
  });

  app.put("/api/invoice-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice item ID" });
      }

      const validationResult = insertInvoiceItemSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid invoice item data",
          errors: validationResult.error.errors
        });
      }

      const updatedItem = await storage.updateInvoiceItem(id, validationResult.data);
      if (!updatedItem) {
        return res.status(404).json({ message: "Invoice item not found" });
      }

      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Error updating invoice item" });
    }
  });

  app.delete("/api/invoice-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice item ID" });
      }

      const success = await storage.deleteInvoiceItem(id);
      if (!success) {
        return res.status(404).json({ message: "Invoice item not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Error deleting invoice item" });
    }
  });

  // Payment Routes
  app.get("/api/payments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }

      const payment = await storage.getPayment(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Error fetching payment" });
    }
  });

  app.get("/api/payments/invoice/:invoiceId", async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }

      const payments = await storage.getPaymentsByInvoice(invoiceId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching payments" });
    }
  });

  app.post("/api/payments", async (req: Request, res: Response) => {
    try {
      const validationResult = insertPaymentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid payment data",
          errors: validationResult.error.errors
        });
      }

      const payment = await storage.createPayment(validationResult.data);
      res.status(201).json(payment);
    } catch (error) {
      res.status(500).json({ message: "Error creating payment" });
    }
  });

  app.put("/api/payments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }

      const validationResult = insertPaymentSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid payment data",
          errors: validationResult.error.errors
        });
      }

      const updatedPayment = await storage.updatePayment(id, validationResult.data);
      if (!updatedPayment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json(updatedPayment);
    } catch (error) {
      res.status(500).json({ message: "Error updating payment" });
    }
  });

  app.delete("/api/payments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }

      const success = await storage.deletePayment(id);
      if (!success) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Error deleting payment" });
    }
  });
  
  // Helper route for generating an invoice number
  app.get("/api/generate-invoice-number", async (_req: Request, res: Response) => {
    try {
      const invoiceNumber = await storage.generateInvoiceNumber();
      res.json({ invoiceNumber });
    } catch (error) {
      res.status(500).json({ message: "Error generating invoice number" });
    }
  });

  // Rotte per il sistema QR code e attivazione account client
  
  // Genera un token di attivazione e un QR code per un cliente specifico
  app.post("/api/clients/:id/generate-activation", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID cliente non valido" });
      }
      
      // Verifica che il cliente esista
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      // Genera un token di attivazione
      const token = await tokenService.generateActivationToken(clientId);
      
      // Costruisci l'URL di base usando l'host dalla richiesta
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      
      console.log('URL base per attivazione:', baseUrl);
      
      // Genera l'URL di attivazione con l'URL di base corretto
      const activationUrl = `${baseUrl}/activate?token=${token}`;
      
      // Genera il QR code
      const qrCode = await qrCodeService.generateQRCode(activationUrl);
      
      res.json({ 
        token, 
        activationUrl,
        qrCode 
      });
    } catch (error) {
      console.error("Errore nella generazione del QR code:", error);
      res.status(500).json({ message: "Errore nella generazione del QR code" });
    }
  });
  
  // Recupera un token di attivazione esistente
  app.get("/api/clients/:id/activation-token", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID cliente non valido" });
      }
      
      // Verifica che il cliente esista
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      // Recupera i token esistenti per questo cliente
      const tokens = await storage.getActivationTokensByClientId(clientId);
      
      // Se non ci sono token, restituisci oggetto vuoto
      if (!tokens || tokens.length === 0) {
        return res.json({});
      }
      
      // Prendi il token più recente (dovrebbero essere ordinati per data di creazione decrescente)
      const latestToken = tokens[0];
      
      // Costruisci l'URL di base usando l'host dalla richiesta
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      
      // Genera l'URL di attivazione
      const activationUrl = `${baseUrl}/activate?token=${latestToken.token}`;
      
      // Rigenera il QR code per il token esistente
      const qrCode = await qrCodeService.generateQRCode(activationUrl);
      
      res.json({
        token: latestToken.token,
        activationUrl,
        qrCode
      });
    } catch (error) {
      console.error("Errore nel recupero del token di attivazione:", error);
      res.status(500).json({ message: "Errore nel recupero del token di attivazione" });
    }
  });
  
  // Attiva un account cliente tramite token
  app.post("/api/activate-account", async (req: Request, res: Response) => {
    try {
      const { token, username, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Dati mancanti. Sono richiesti token e password." });
      }
      
      // Verifica se l'account esiste già
      const clientId = await tokenService.verifyActivationToken(token);
      if (clientId === null) {
        return res.status(400).json({ message: "Token non valido o scaduto" });
      }
      
      const existingAccount = await storage.getClientAccountByClientId(clientId);
      
      // Se è un account esistente, richiediamo solo la password per accedere
      if (existingAccount) {
        console.log("Account esistente, tentativo di aggiornamento della password");
        const success = await tokenService.activateAccount(token, existingAccount.username, password);
        
        if (!success) {
          return res.status(400).json({ message: "Errore nell'aggiornamento dell'account" });
        }
        
        // Login automatico dopo l'attivazione
        // Genera prima il token per l'app PWA - FUORI dalla callback per evitare l'errore con await
        const newToken = await tokenService.generateActivationToken(clientId);
        
        req.login({ 
          id: existingAccount.id, 
          username: existingAccount.username, 
          type: "client",
          clientId: clientId
        }, (err) => {
          if (err) {
            console.error("Errore durante il login automatico:", err);
            return res.status(500).json({ message: "Errore durante il login automatico" });
          }
          
          res.json({ 
            message: "Account aggiornato con successo",
            accountExists: true,
            token: newToken, // Aggiungiamo il token per l'app PWA installata
            user: {
              id: existingAccount.id,
              username: existingAccount.username,
              type: "client",
              clientId: clientId
            }
          });
        });
      } 
      // Se è un nuovo account, richiediamo sia username che password
      else {
        if (!username) {
          return res.status(400).json({ message: "Username mancante. Per attivare un nuovo account è richiesto l'username." });
        }
        
        const success = await tokenService.activateAccount(token, username, password);
        
        if (!success) {
          return res.status(400).json({ message: "Errore nella creazione dell'account" });
        }
        
        // Genera anche un nuovo token per l'app PWA
        const newToken = await tokenService.generateActivationToken(clientId);
        
        // Ottieni l'account appena creato
        const newAccount = await storage.getClientAccountByClientId(clientId);
        
        if (!newAccount) {
          return res.status(500).json({ message: "Errore nel recupero dell'account appena creato" });
        }
        
        res.json({ 
          message: "Account attivato con successo",
          accountExists: false,
          token: newToken, // Aggiungiamo il token per l'app PWA installata
          user: {
            id: newAccount.id,
            username: username,
            type: "client",
            clientId: clientId
          }
        });
      }
    } catch (error) {
      console.error("Errore nell'attivazione dell'account:", error);
      res.status(500).json({ message: "Errore nell'attivazione dell'account" });
    }
  });
  
  // Verifica la validità di un token di attivazione
  app.get("/api/verify-token/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      const clientId = await tokenService.verifyActivationToken(token);
      
      if (clientId === null) {
        return res.status(400).json({ valid: false, message: "Token non valido o scaduto" });
      }
      
      const client = await storage.getClient(clientId);
      
      // Verifica se esiste già un account per questo cliente
      const existingAccount = await storage.getClientAccountByClientId(clientId);
      
      res.json({ 
        valid: true, 
        clientId,
        clientName: client ? `${client.firstName} ${client.lastName}` : 'Cliente sconosciuto',
        username: existingAccount ? existingAccount.username : null,
        accountExists: !!existingAccount
      });
    } catch (error) {
      console.error("Errore nella verifica del token:", error);
      res.status(500).json({ valid: false, message: "Errore durante la verifica del token" });
    }
  });
  
  // Endpoint per verificare e autenticare direttamente con un token (per i link diretti)
  // Nota: abbiamo implementato una soluzione matematica (divisione per 4)
  // quindi non abbiamo più bisogno della cache per evitare registrazioni multiple

  app.post("/api/verify-token", async (req: Request, res: Response) => {
    try {
      const { token, clientId } = req.body;
      
      if (!token || !clientId) {
        return res.status(400).json({ message: "Token o ID cliente mancante" });
      }
      
      // Verifica il token (non lo invalidiamo per consentire accessi multipli)
      const validClientId = await tokenService.verifyActivationToken(token);
      
      if (validClientId === null || validClientId !== Number(clientId)) {
        return res.status(400).json({ message: "Token non valido o non corrisponde al cliente" });
      }
      
      // Recupera dati cliente
      const client = await storage.getClient(validClientId);
      if (!client) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      // Recupera l'utente associato al cliente
      const clientAccount = await storage.getClientAccountByClientId(validClientId);
      if (!clientAccount) {
        return res.status(404).json({ 
          message: "Utente non trovato. Devi prima attivare il tuo account tramite la scansione del QR code." 
        });
      }
      
      // Verifica se il token sta per scadere (24 ore)
      const isExpiringSoon = await tokenService.isTokenExpiringSoon(token, 1);
      
      // Crea un oggetto user conforme all'interfaccia User di Express
      const user = {
        id: clientAccount.id,
        username: clientAccount.username,
        type: "client", // Assegna esplicitamente il tipo
        clientId: validClientId,
        client: client
      };
      
      // Esegui il login dell'utente
      req.login(user, async (err) => {
        if (err) {
          return res.status(500).json({ message: "Errore durante il login automatico" });
        }
        
        // Registra l'accesso del cliente (ogni accesso viene registrato)
        try {
          await clientAccessService.logAccess(validClientId);
          console.log(`Registrato accesso per il cliente ID: ${validClientId}`);
        } catch (accessError) {
          console.error(`Errore nella registrazione dell'accesso per il cliente ID ${validClientId}:`, accessError);
          // Non facciamo fallire l'autenticazione se la registrazione dell'accesso fallisce
        }
        
        return res.status(200).json({ 
          message: "Accesso diretto effettuato con successo",
          user: user,
          client: client,
          tokenInfo: {
            isExpiringSoon,
            token // Includiamo il token per poter mostrare avvisi sulla scadenza
          }
        });
      });
      
    } catch (error: any) {
      console.error("Errore verifica token:", error);
      res.status(500).json({ 
        message: "Errore durante la verifica del token",
        error: error.message
      });
    }
  });

  // Verifica se un token sta per scadere
  app.get("/api/token/:token/expiry-status", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ message: "Token mancante" });
      }
      
      // Trova il token nel database
      const activationToken = await storage.getActivationToken(token);
      
      if (!activationToken) {
        return res.status(404).json({ message: "Token non trovato" });
      }
      
      // Verifica se il token sta per scadere entro 24 ore
      const isExpiringSoon = await tokenService.isTokenExpiringSoon(token, 1);
      
      // Calcola quanti giorni mancano alla scadenza
      const tokenExpiryDate = new Date(activationToken.expiresAt);
      const today = new Date();
      const daysToExpiry = Math.floor((tokenExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      res.json({
        token,
        clientId: activationToken.clientId,
        expiresAt: activationToken.expiresAt,
        isExpiringSoon,
        daysToExpiry
      });
    } catch (error) {
      console.error("Errore nella verifica dello stato di scadenza del token:", error);
      res.status(500).json({ message: "Errore durante la verifica dello stato di scadenza del token" });
    }
  });
  
  // Rigenera un token per un cliente
  app.post("/api/clients/:id/regenerate-token", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID cliente non valido" });
      }
      
      // Verifica che il cliente esista
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }
      
      // Genera un nuovo token
      const newToken = await tokenService.regenerateToken(clientId);
      
      // Costruisci l'URL di base usando l'host dalla richiesta
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      
      // Genera l'URL di attivazione con l'URL di base corretto
      const activationUrl = `${baseUrl}/activate?token=${newToken}`;
      
      // Genera il QR code
      const qrCode = await qrCodeService.generateQRCode(activationUrl);
      
      res.json({ 
        token: newToken, 
        activationUrl,
        qrCode,
        message: "Nuovo token generato con successo"
      });
    } catch (error) {
      console.error("Errore nella rigenerazione del token:", error);
      res.status(500).json({ message: "Errore durante la rigenerazione del token" });
    }
  });

  // API per i promemoria e le notifiche
  
  // Invia manualmente un promemoria per un appuntamento specifico
  app.post("/api/appointments/:id/send-reminder", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID appuntamento non valido" });
      }
      
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appuntamento non trovato" });
      }
      
      // Verifica che l'appuntamento abbia impostato un tipo di promemoria
      if (!appointment.reminderType) {
        return res.status(400).json({ 
          message: "Impossibile inviare promemoria: tipo di promemoria non specificato",
          appointment
        });
      }
      
      // Invia il promemoria
      const success = await notificationService.sendAppointmentReminder(appointment);
      
      if (success) {
        res.json({ message: "Promemoria inviato con successo" });
      } else {
        res.status(500).json({ message: "Errore nell'invio del promemoria" });
      }
    } catch (error) {
      console.error("Errore nell'invio del promemoria:", error);
      res.status(500).json({ message: "Errore nell'invio del promemoria" });
    }
  });
  
  // Elabora manualmente tutti i promemoria per gli appuntamenti di domani
  app.post("/api/process-reminders", async (_req: Request, res: Response) => {
    try {
      const count = await notificationService.processReminders();
      res.json({ 
        message: `Elaborazione promemoria completata`, 
        remindersSent: count 
      });
    } catch (error) {
      console.error("Errore nell'elaborazione dei promemoria:", error);
      res.status(500).json({ message: "Errore nell'elaborazione dei promemoria" });
    }
  });
  
  // Genera un link SMS diretto (non utilizzando servizi esterni)
  app.post("/api/test-sms", async (req: Request, res: Response) => {
    try {
      // Supporta i parametri sia come to/message che come phoneNumber/message per compatibilità
      const to = req.body.to || req.body.phoneNumber;
      const { message } = req.body;
      
      // Pulisce il numero di telefono da eventuali spazi
      const cleanPhoneNumber = to ? to.replace(/\s+/g, '') : null;
      
      if (!cleanPhoneNumber || !message) {
        return res.status(400).json({ 
          message: "Parametri mancanti", 
          required: ["to/phoneNumber", "message"],
          example: { to: "+391234567890", message: "Messaggio di test" }
        });
      }
      
      // Genera un link SMS (funzionalità limitata, ma funziona su molti dispositivi)
      const smsLink = `sms:${cleanPhoneNumber}?body=${encodeURIComponent(message)}`;
      
      console.log(`Generazione link SMS per ${cleanPhoneNumber}: "${message.substring(0, 30)}..."`);
      
      // Aggiungiamo al centro notifiche per avere una "cronologia"
      try {
        // Aggiungi al centro notifiche (opzionale)
        await directNotificationService.addToNotificationCenter(
          0, // ID speciale per il professionista
          `📱 Test SMS per ${cleanPhoneNumber}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}" [Apri SMS](${smsLink})`,
          'staff_reminder'
        );
      } catch (notificationError) {
        console.error("Errore nell'aggiunta al centro notifiche:", notificationError);
        // Continuiamo comunque perché l'errore nel centro notifiche non è critico
      }
      
      // Usa il servizio di notifica per mantenere le log consistenti
      const result = await notificationService.sendSMS(cleanPhoneNumber, message);
      
      console.log("Risposta generazione SMS:", result);
      res.json({ 
        success: true,
        message: "Link SMS generato con successo", 
        details: {
          sid: result.sid,
          status: result.status,
          to: result.to
        },
        smsLink: smsLink,
        instructions: "Clicca sul link per aprire l'app SMS e inviare il messaggio"
      });
    } catch (error: any) {
      console.error("Errore nella generazione del link SMS:", error);
      res.status(500).json({ 
        success: false,
        message: "Errore nella generazione del link SMS", 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
  
  // Genera un link diretto a WhatsApp per inviare un messaggio
  app.post("/api/test-whatsapp", async (req: Request, res: Response) => {
    try {
      // Supporta i parametri sia come to/message che come phoneNumber/message per compatibilità
      const to = req.body.to || req.body.phoneNumber;
      const { message } = req.body;
      
      // Pulisce il numero di telefono da eventuali spazi
      const cleanPhoneNumber = to ? to.replace(/\s+/g, '') : null;
      
      if (!cleanPhoneNumber || !message) {
        return res.status(400).json({ 
          success: false,
          message: "Parametri mancanti", 
          required: ["to/phoneNumber", "message"],
          example: { to: "+391234567890", message: "Messaggio di test" }
        });
      }
      
      // Genera il link WhatsApp diretto utilizzando il servizio senza dipendenze esterne
      const whatsappLink = directNotificationService.generateWhatsAppLink(cleanPhoneNumber, message);
      
      console.log(`Generato link WhatsApp per ${cleanPhoneNumber}: ${whatsappLink}`);
      
      // Aggiungiamo al centro notifiche per avere una "cronologia"
      try {
        // Aggiungi al centro notifiche (opzionale)
        await directNotificationService.addToNotificationCenter(
          0, // ID speciale per il professionista
          `📱 Test WhatsApp per ${cleanPhoneNumber}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}" [Apri WhatsApp](${whatsappLink})`,
          'staff_reminder'
        );
      } catch (notificationError) {
        console.error("Errore nell'aggiunta al centro notifiche:", notificationError);
        // Continuiamo comunque perché l'errore nel centro notifiche non è critico
      }
      
      res.json({ 
        success: true,
        message: "Link WhatsApp generato con successo",
        whatsappLink: whatsappLink,
        instructions: "Clicca sul link per aprire WhatsApp e inviare il messaggio"
      });
    } catch (error: any) {
      console.error("Errore nella generazione del link WhatsApp:", error);
      res.status(500).json({ 
        success: false,
        message: "Errore nella generazione del link WhatsApp", 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
  
  // Endpoint per confermare la ricezione del promemoria
  app.post("/api/appointments/:id/confirm-reminder", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ 
          message: "ID appuntamento non valido" 
        });
      }
      
      // Recupera l'appuntamento
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ 
          message: "Appuntamento non trovato" 
        });
      }
      
      // Controlla che l'utente loggato sia il cliente dell'appuntamento
      // o un membro dello staff
      if (req.isAuthenticated()) {
        const user = req.user as any;
        
        if (user.type === "client" && user.clientId !== appointment.clientId) {
          return res.status(403).json({ 
            message: "Non hai i permessi per confermare questo promemoria" 
          });
        }
      } else {
        return res.status(401).json({ 
          message: "Non autenticato" 
        });
      }
      
      // Aggiorna lo stato del promemoria
      const updatedAppointment = await storage.updateAppointment(appointmentId, {
        ...appointment,
        reminderConfirmed: true,
        reminderConfirmedAt: new Date(),
      });
      
      res.json({ 
        message: "Promemoria confermato con successo", 
        appointment: updatedAppointment 
      });
    } catch (error: any) {
      console.error("Errore nella conferma del promemoria:", error);
      res.status(500).json({ 
        message: "Errore nella conferma del promemoria", 
        error: error.message 
      });
    }
  });

  // Configurazione per l'upload delle immagini
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        const iconDir = path.join(process.cwd(), 'public', 'icons');
        
        // Assicurati che la directory esista
        if (!fs.existsSync(iconDir)) {
          fs.mkdirSync(iconDir, { recursive: true });
        }
        
        cb(null, iconDir);
      },
      filename: (_req, file, cb) => {
        // Utilizza un nome file basato sul tipo di immagine
        let ext = '.jpg';
        if (file.mimetype === 'image/png') {
          ext = '.png';
        } else if (file.mimetype === 'image/svg+xml') {
          ext = '.svg';
        }
        
        cb(null, 'app-icon' + ext);
      },
    }),
    limits: {
      fileSize: 2 * 1024 * 1024, // Limite dimensione file: 2MB
    },
    fileFilter: (_req, file, cb) => {
      // Accetta solo immagini
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Per favore carica solo immagini'));
      }
      
      cb(null, true);
    },
  });

  // Endpoint per caricare l'icona dell'app
  // Endpoint per ottenere le informazioni dell'app
  
  // Endpoint per ottenere le informazioni di contatto
  app.get('/api/contact-info', (_req: Request, res: Response) => {
    try {
      // Ottiene i dati dal servizio dedicato
      const contactInfo = contactService.getContactInfo();
      console.log('Informazioni di contatto recuperate:', contactInfo);
      res.json(contactInfo);
    } catch (error) {
      console.error('Errore nel recupero delle informazioni di contatto:', error);
      res.status(500).json({ error: 'Errore nel recupero delle informazioni di contatto' });
    }
  });
  
  // API per salvare le informazioni di contatto
  app.post('/api/contact-info', (req: Request, res: Response) => {
    try {
      const contactInfo = req.body;
      
      // Verifica che sia un oggetto valido
      if (!contactInfo || typeof contactInfo !== 'object') {
        return res.status(400).json({ error: 'Dati di contatto non validi' });
      }
      
      // Salva i dati usando il servizio
      const success = contactService.saveContactInfo(contactInfo);
      
      if (success) {
        console.log('Informazioni di contatto salvate con successo:', contactInfo);
        res.json({ success: true, message: 'Informazioni di contatto salvate con successo' });
      } else {
        res.status(500).json({ error: 'Errore nel salvataggio delle informazioni di contatto' });
      }
    } catch (error) {
      console.error('Errore nel salvataggio delle informazioni di contatto:', error);
      res.status(500).json({ error: 'Errore nel salvataggio delle informazioni di contatto' });
    }
  });
  
  // Endpoint per verificare lo stato delle notifiche e messaggistica diretta
  app.get('/api/messaging-config-status', async (_req: Request, res: Response) => {
    try {
      // Recupera il numero di telefono del professionista dalle informazioni di contatto
      const contactInfo = contactService.getContactInfo();
      const professionalPhone = contactInfo.phone1 || contactInfo.phone2 || null;
      
      // Recupera le impostazioni di notifica email
      const notificationSettings = await notificationSettingsService.getSettings();
      const emailConfigured = notificationSettings?.emailEnabled && notificationSettings?.smtpServer && notificationSettings?.smtpUsername && notificationSettings?.smtpPassword;
      
      // Invia informazioni sulla configurazione
      res.json({
        success: true,
        config: {
          emailConfigured: !!emailConfigured,
          whatsappConfigured: !!professionalPhone,
          professionalPhone: professionalPhone ? 
            `${professionalPhone.substring(0, 4)}...${professionalPhone.substring(professionalPhone.length - 4)}` : 
            null,
          status: (emailConfigured || professionalPhone) ? 'configurata' : 'incompleta',
          whatsappSetupInstructions: `
Per inviare messaggi WhatsApp tramite metodo diretto:
1. Assicurati di aver inserito almeno un numero di telefono nella pagina "Informazioni di contatto"
2. Quando devi inviare un messaggio, utilizza l'apposita funzione nella dashboard
3. Si aprirà direttamente WhatsApp con il messaggio precompilato
4. I messaggi verranno inviati direttamente dal tuo numero WhatsApp personale
5. Non è necessario alcun abbonamento o configurazione aggiuntiva
`
        }
      });
    } catch (error: any) {
      console.error("Errore nel recupero della configurazione di messaggistica:", error);
      res.status(500).json({
        success: false,
        message: `Errore nel recupero della configurazione: ${error.message || 'Errore sconosciuto'}`
      });
    }
  });
  
  // Google Calendar routes
  app.get('/api/google-calendar/settings', async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getGoogleCalendarSettings();
      // Rimuovere dati sensibili prima di inviare al frontend
      if (settings) {
        const safeSettings = {
          ...settings,
          clientSecret: settings.clientSecret ? '********' : null,
          refreshToken: settings.refreshToken ? '********' : null,
          accessToken: settings.accessToken ? '********' : null
        };
        res.json(safeSettings);
      } else {
        res.json({ enabled: false });
      }
    } catch (error) {
      console.error("Errore durante il recupero delle impostazioni Google Calendar:", error);
      res.status(500).json({ message: "Errore durante il recupero delle impostazioni Google Calendar" });
    }
  });
  
  app.post('/api/google-calendar/settings', async (req: Request, res: Response) => {
    try {
      const settings = req.body;
      const result = await storage.saveGoogleCalendarSettings(settings);
      res.status(200).json(result);
    } catch (error) {
      console.error("Errore durante il salvataggio delle impostazioni Google Calendar:", error);
      res.status(500).json({ message: "Errore durante il salvataggio delle impostazioni Google Calendar" });
    }
  });
  
  app.get('/api/google-calendar/auth-url', async (req: Request, res: Response) => {
    try {
      const { clientId, redirectUri } = req.query;
      
      if (!clientId || !redirectUri) {
        return res.status(400).json({ message: "clientId e redirectUri sono parametri obbligatori" });
      }
      
      const authUrl = googleCalendarService.getAuthUrl(clientId as string, redirectUri as string);
      res.json({ authUrl });
    } catch (error) {
      console.error("Errore durante la generazione dell'URL di autenticazione:", error);
      res.status(500).json({ message: "Errore durante la generazione dell'URL di autenticazione" });
    }
  });
  
  app.post('/api/google-calendar/exchange-code', async (req: Request, res: Response) => {
    try {
      const { code, clientId, clientSecret, redirectUri } = req.body;
      
      if (!code || !clientId || !clientSecret || !redirectUri) {
        return res.status(400).json({ message: "Parametri mancanti" });
      }
      
      const token = await googleCalendarService.exchangeCodeForToken(
        code,
        clientId,
        clientSecret,
        redirectUri
      );
      
      if (!token) {
        return res.status(400).json({ message: "Impossibile ottenere il token" });
      }
      
      // Aggiorna le impostazioni con il token
      const settings = await storage.getGoogleCalendarSettings();
      if (settings) {
        await storage.updateGoogleCalendarSettings(settings.id, {
          refreshToken: token.refresh_token,
          accessToken: token.access_token,
          tokenExpiry: new Date(token.expiry_date)
        });
      } else {
        await storage.saveGoogleCalendarSettings({
          enabled: true,
          clientId,
          clientSecret,
          redirectUri,
          refreshToken: token.refresh_token,
          accessToken: token.access_token,
          tokenExpiry: new Date(token.expiry_date),
          calendarId: 'primary'
        });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Errore durante lo scambio del codice:", error);
      res.status(500).json({ message: "Errore durante lo scambio del codice" });
    }
  });
  
  app.post('/api/google-calendar/sync-appointment/:appointmentId', async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ message: "ID appuntamento non valido" });
      }
      
      // Verifica se è già sincronizzato
      const existingEvent = await storage.getGoogleCalendarEvent(appointmentId);
      if (existingEvent) {
        return res.status(400).json({ message: "Appuntamento già sincronizzato" });
      }
      
      // Sincronizza con Google Calendar
      const googleEventId = await googleCalendarService.addAppointmentToGoogleCalendar(appointmentId);
      
      if (!googleEventId) {
        return res.status(500).json({ message: "Impossibile sincronizzare l'appuntamento" });
      }
      
      // Salva il riferimento all'evento
      const event = await storage.createGoogleCalendarEvent({
        appointmentId,
        googleEventId,
        syncStatus: 'synced',
        lastSyncAt: new Date()
      });
      
      res.status(200).json(event);
    } catch (error) {
      console.error("Errore durante la sincronizzazione dell'appuntamento:", error);
      res.status(500).json({ message: "Errore durante la sincronizzazione dell'appuntamento" });
    }
  });
  
  app.put('/api/google-calendar/sync-appointment/:appointmentId', async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ message: "ID appuntamento non valido" });
      }
      
      // Verifica se esiste l'evento
      const existingEvent = await storage.getGoogleCalendarEvent(appointmentId);
      if (!existingEvent) {
        return res.status(404).json({ message: "Evento non trovato" });
      }
      
      // Aggiorna l'evento su Google Calendar
      const success = await googleCalendarService.updateAppointmentInGoogleCalendar(
        appointmentId,
        existingEvent.googleEventId
      );
      
      if (!success) {
        return res.status(500).json({ message: "Impossibile aggiornare l'evento" });
      }
      
      // Aggiorna lo stato della sincronizzazione
      const event = await storage.updateGoogleCalendarEvent(appointmentId, {
        syncStatus: 'synced',
        lastSyncAt: new Date()
      });
      
      res.status(200).json(event);
    } catch (error) {
      console.error("Errore durante l'aggiornamento dell'evento:", error);
      res.status(500).json({ message: "Errore durante l'aggiornamento dell'evento" });
    }
  });
  
  app.delete('/api/google-calendar/sync-appointment/:appointmentId', async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ message: "ID appuntamento non valido" });
      }
      
      // Verifica se esiste l'evento
      const existingEvent = await storage.getGoogleCalendarEvent(appointmentId);
      if (!existingEvent) {
        return res.status(404).json({ message: "Evento non trovato" });
      }
      
      // Elimina l'evento da Google Calendar
      const success = await googleCalendarService.deleteAppointmentFromGoogleCalendar(existingEvent.googleEventId);
      
      // Elimina il riferimento all'evento nel database
      await storage.deleteGoogleCalendarEvent(appointmentId);
      
      res.status(200).json({ success });
    } catch (error) {
      console.error("Errore durante l'eliminazione dell'evento:", error);
      res.status(500).json({ message: "Errore durante l'eliminazione dell'evento" });
    }
  });
  
  // Endpoint per recuperare tutti gli eventi sincronizzati
  app.get('/api/google-calendar/events', async (req: Request, res: Response) => {
    try {
      const events = await googleCalendarService.getAllEvents();
      res.json(events);
    } catch (error) {
      console.error("Errore durante il recupero degli eventi Google Calendar:", error);
      res.status(500).json({ message: "Errore durante il recupero degli eventi" });
    }
  });
  
  // Endpoint per recuperare la lista dei calendari disponibili
  app.get('/api/google-calendar/calendars', async (req: Request, res: Response) => {
    try {
      const calendars = await googleCalendarService.getAvailableCalendars();
      
      // Formatta i dati per il client
      const formattedCalendars = calendars.map(calendar => ({
        id: calendar.id,
        summary: calendar.summary,
        description: calendar.description,
        primary: calendar.primary,
        // Aggiungi altri campi utili se necessario
      }));
      
      res.json(formattedCalendars);
    } catch (error) {
      console.error("Errore durante il recupero dei calendari disponibili:", error);
      res.status(500).json({ message: "Errore durante il recupero dei calendari disponibili" });
    }
  });

  app.get('/api/client-app-info', (req: Request, res: Response) => {
    try {
      // Controlla diversi formati di icona personalizzata
      // Priorità: JPG, PNG, SVG per mostrare immagini caricate di recente
      const iconFormats = [
        { path: 'app-icon.jpg', mime: 'image/jpeg' },
        { path: 'app-icon.png', mime: 'image/png' },
        { path: 'app-icon.svg', mime: 'image/svg+xml' }
      ];
      
      const defaultIconPath = path.join(process.cwd(), 'public', 'icons', 'default-app-icon.jpg');
      const defaultIconExists = fs.existsSync(defaultIconPath);
      
      let iconInfo = null;
      let customIconFound = false;
      
      // Cerca tra i formati supportati
      for (const format of iconFormats) {
        const iconPath = path.join(process.cwd(), 'public', 'icons', format.path);
        if (fs.existsSync(iconPath)) {
          const stats = fs.statSync(iconPath);
          
          iconInfo = {
            exists: true,
            isCustom: true,
            iconPath: `/icons/${format.path}`,
            mimeType: format.mime,
            lastModified: stats.mtime.toISOString()
          };
          
          customIconFound = true;
          break;
        }
      }
      
      // Se non è stata trovata un'icona personalizzata, usa quella predefinita
      if (!customIconFound && defaultIconExists) {
        const stats = fs.statSync(defaultIconPath);
        
        iconInfo = {
          exists: true,
          isCustom: false,
          iconPath: '/icons/default-app-icon.jpg',
          mimeType: 'image/jpeg',
          lastModified: stats.mtime.toISOString()
        };
      } 
      // Nessuna icona disponibile
      else if (!customIconFound) {
        iconInfo = {
          exists: false
        };
      }
      
      // Lettura delle informazioni dal manifest.json
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      let appName = "App Cliente";
      let appShortName = "App Cliente";
      
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          appName = manifest.name || "App Cliente";
          appShortName = manifest.short_name || "App Cliente";
        } catch (error) {
          console.error('Errore durante la lettura del manifest:', error);
        }
      }
      
      res.json({
        icon: iconInfo,
        appName,
        appShortName
      });
    } catch (error: any) {
      console.error('Errore nel recupero delle informazioni dell\'app:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Endpoint per usare l'icona predefinita
  app.post('/api/use-default-icon', async (req: Request, res: Response) => {
    try {
      const defaultIconPath = path.join(process.cwd(), 'public', 'icons', 'default-app-icon.jpg');
      
      if (!fs.existsSync(defaultIconPath)) {
        return res.status(404).json({ message: 'Icona predefinita non trovata' });
      }
      
      // Elimina eventuali icone personalizzate
      const iconFormats = ['app-icon.jpg', 'app-icon.png', 'app-icon.svg'];
      iconFormats.forEach(format => {
        const iconPath = path.join(process.cwd(), 'public', 'icons', format);
        if (fs.existsSync(iconPath)) {
          try {
            fs.unlinkSync(iconPath);
            console.log(`Rimossa icona personalizzata: ${iconPath}`);
          } catch (err) {
            console.error(`Errore durante la rimozione di ${iconPath}:`, err);
          }
        }
      });
      
      // Aggiorna il manifest.json con l'icona predefinita
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          
          // Imposta l'icona predefinita
          manifest.icons = [{
            src: '/icons/default-app-icon.jpg',
            sizes: 'any',
            type: 'image/jpeg',
            purpose: 'any'
          }];
          
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          
          res.json({ 
            success: true, 
            message: 'Icona predefinita impostata con successo',
            iconPath: '/icons/default-app-icon.jpg'
          });
        } catch (error: any) {
          console.error('Errore durante l\'aggiornamento del manifest:', error);
          res.status(500).json({ message: error.message });
        }
      } else {
        res.status(404).json({ message: 'Manifest.json non trovato' });
      }
    } catch (error: any) {
      console.error('Errore durante l\'impostazione dell\'icona predefinita:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Endpoint per aggiornare le informazioni dell'app
  app.post('/api/update-app-info', async (req: Request, res: Response) => {
    try {
      const { appName, appShortName } = req.body;
      
      if (!appName && !appShortName) {
        return res.status(400).json({ message: 'Nessun dato da aggiornare' });
      }
      
      // Aggiorna il manifest.json
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          
          if (appName) manifest.name = appName;
          if (appShortName) manifest.short_name = appShortName;
          
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          
          res.json({ 
            success: true, 
            message: 'Informazioni dell\'app aggiornate con successo' 
          });
        } catch (error: any) {
          console.error('Errore durante l\'aggiornamento del manifest:', error);
          res.status(500).json({ message: error.message });
        }
      } else {
        res.status(404).json({ message: 'Manifest.json non trovato' });
      }
    } catch (error: any) {
      console.error('Errore durante l\'aggiornamento delle informazioni dell\'app:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Manteniamo anche l'endpoint originale per retrocompatibilità
  app.get('/api/app-icon-info', (req: Request, res: Response) => {
    try {
      const iconPath = path.join(process.cwd(), 'public', 'icons', 'app-icon.svg');
      const iconExists = fs.existsSync(iconPath);

      // Se esiste, invia informazioni sull'icona
      if (iconExists) {
        // Ottieni la data di modifica del file
        const stats = fs.statSync(iconPath);
        const lastModified = stats.mtime;
        
        res.json({
          exists: true,
          iconPath: '/icons/app-icon.svg',
          lastModified: lastModified.toISOString()
        });
      } else {
        res.json({
          exists: false
        });
      }
    } catch (error: any) {
      console.error('Errore nel recupero delle informazioni sull\'icona:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/upload-app-icon', upload.single('icon'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nessun file caricato' });
      }
      
      // Percorso del file caricato
      const filePath = req.file.path;
      
      // Ottimizza l'immagine ma mantieni il formato originale
      try {
        // Determina il nuovo percorso dell'icona in base al tipo di file
        let newIconPath = '';
        let format = '';
        
        if (req.file.mimetype === 'image/jpeg' || req.file.mimetype === 'image/jpg') {
          newIconPath = path.join(process.cwd(), 'public', 'icons', 'app-icon.jpg');
          format = 'jpeg';
        } else if (req.file.mimetype === 'image/png') {
          newIconPath = path.join(process.cwd(), 'public', 'icons', 'app-icon.png');
          format = 'png';
        } else if (req.file.mimetype === 'image/svg+xml') {
          newIconPath = path.join(process.cwd(), 'public', 'icons', 'app-icon.svg');
          // Per SVG facciamo solo copia del file
          fs.copyFileSync(filePath, newIconPath);
          console.log(`SVG copiato in: ${newIconPath}`);
          
          // Aggiorna il manifest.json se esiste
          const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              
              // Imposta l'icona SVG
              const iconSrc = '/icons/app-icon.svg';
              manifest.icons = [{
                src: iconSrc,
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any'
              }];
              
              fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
              
              // Restituisci il percorso dell'icona usato
              res.json({ 
                success: true, 
                message: 'Icona SVG caricata con successo',
                iconPath: iconSrc
              });
            } catch (error) {
              console.error('Errore durante l\'aggiornamento del manifest:', error);
              res.status(500).json({ message: 'Errore durante l\'aggiornamento del manifest' });
            }
          } else {
            res.json({ 
              success: true, 
              message: 'Icona SVG caricata con successo, ma manifest.json non trovato',
              iconPath: '/icons/app-icon.svg'
            });
          }
          
          return; // Esci dalla funzione
        } else {
          // Formato non supportato, usa JPG come default
          newIconPath = path.join(process.cwd(), 'public', 'icons', 'app-icon.jpg');
          format = 'jpeg';
        }
        
        // Ottimizza l'immagine e salvala nel percorso corretto
        await sharp(filePath)
          .resize(512, 512)
          .toFormat(format as keyof sharp.FormatEnum)
          .toFile(newIconPath);
          
        console.log(`Immagine ottimizzata salvata: ${newIconPath}, tipo: ${req.file.mimetype}`);
      } catch (error) {
        console.error('Errore durante l\'ottimizzazione dell\'immagine:', error);
        // Continua comunque, useremo l'immagine originale
      }
      
      // Aggiorna il manifest.json con il nuovo percorso dell'icona
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          
          // Determina l'estensione e il tipo MIME
          let iconSrc = '';
          let mimeType = '';
          
          // Usa il tipo MIME del file caricato per determinare l'estensione
          if (req.file.mimetype === 'image/svg+xml') {
            iconSrc = '/icons/app-icon.svg';
            mimeType = 'image/svg+xml';
          } else if (req.file.mimetype === 'image/png') {
            iconSrc = '/icons/app-icon.png';
            mimeType = 'image/png';
          } else {
            // Assume JPG per default o per immagini JPEG
            iconSrc = '/icons/app-icon.jpg';
            mimeType = 'image/jpeg';
          }
          
          // Aggiorna il manifest
          manifest.icons = [{
            src: iconSrc,
            sizes: 'any',
            type: mimeType,
            purpose: 'any'
          }];
          
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          
          // Restituisci il percorso dell'icona usato
          res.json({ 
            success: true, 
            message: 'Icona caricata con successo',
            iconPath: iconSrc
          });
        } catch (error) {
          console.error('Errore durante l\'aggiornamento del manifest:', error);
          res.status(500).json({ message: 'Errore durante l\'aggiornamento del manifest' });
        }
      } else {
        res.json({ 
          success: true, 
          message: 'Icona caricata con successo, ma manifest.json non trovato',
          iconPath: filePath.replace(process.cwd() + '/public', '')
        });
      }
    } catch (error: any) {
      console.error('Errore durante il caricamento dell\'icona:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // API per le note dei clienti
  app.get('/api/client-notes/:clientId', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const notes = await storage.getClientNotes(parseInt(clientId));
      res.json(notes);
    } catch (error) {
      console.error('Errore durante il recupero delle note del cliente:', error);
      res.status(500).json({ error: 'Errore durante il recupero delle note del cliente' });
    }
  });
  
  app.post('/api/client-notes', async (req: Request, res: Response) => {
    try {
      const { clientId, title, content, category } = req.body;
      
      const note = await storage.createClientNote({
        clientId: parseInt(clientId),
        title,
        content,
        category
      });
      
      res.status(201).json(note);
    } catch (error) {
      console.error('Errore durante la creazione della nota del cliente:', error);
      res.status(500).json({ error: 'Errore durante la creazione della nota del cliente' });
    }
  });
  
  app.put('/api/client-notes/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, content, category } = req.body;
      
      const note = await storage.updateClientNote(parseInt(id), { 
        title, 
        content, 
        category
      });
      
      if (!note) {
        return res.status(404).json({ error: 'Nota non trovata' });
      }
      
      res.json(note);
    } catch (error) {
      console.error('Errore durante l\'aggiornamento della nota del cliente:', error);
      res.status(500).json({ error: 'Errore durante l\'aggiornamento della nota del cliente' });
    }
  });
  
  app.delete('/api/client-notes/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const success = await storage.deleteClientNote(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: 'Nota non trovata' });
      }
      
      res.status(200).json({ message: 'Nota eliminata con successo' });
    } catch (error) {
      console.error('Errore durante l\'eliminazione della nota del cliente:', error);
      res.status(500).json({ error: 'Errore durante l\'eliminazione della nota del cliente' });
    }
  });

  // Endpoint per i modelli di promemoria
  app.get('/api/reminder-templates', async (_req: Request, res: Response) => {
    try {
      const templates = await storage.getReminderTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Errore durante il recupero dei modelli di promemoria:", error);
      res.status(500).json({ message: "Error fetching reminder templates" });
    }
  });

  app.get('/api/reminder-templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      const template = await storage.getReminderTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json(template);
    } catch (error) {
      console.error("Errore durante il recupero del modello di promemoria:", error);
      res.status(500).json({ message: "Error fetching reminder template" });
    }
  });

  app.get('/api/reminder-templates/service/:serviceId', async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      if (isNaN(serviceId)) {
        return res.status(400).json({ message: "Invalid service ID" });
      }

      const template = await storage.getReminderTemplateByServiceId(serviceId);
      if (!template) {
        // Se non c'è un modello specifico per il servizio, restituisci il modello predefinito
        const defaultTemplate = await storage.getDefaultReminderTemplate();
        if (!defaultTemplate) {
          return res.status(404).json({ message: "No template found for service and no default template" });
        }
        return res.json(defaultTemplate);
      }

      res.json(template);
    } catch (error) {
      console.error("Errore durante il recupero del modello di promemoria per servizio:", error);
      res.status(500).json({ message: "Error fetching reminder template for service" });
    }
  });

  app.get('/api/reminder-templates/default', async (_req: Request, res: Response) => {
    try {
      const template = await storage.getDefaultReminderTemplate();
      if (!template) {
        return res.status(404).json({ message: "No default template found" });
      }

      res.json(template);
    } catch (error) {
      console.error("Errore durante il recupero del modello di promemoria predefinito:", error);
      res.status(500).json({ message: "Error fetching default reminder template" });
    }
  });

  app.post('/api/reminder-templates', async (req: Request, res: Response) => {
    try {
      const validationResult = insertReminderTemplateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid template data",
          errors: validationResult.error.errors
        });
      }

      // Se questo modello è impostato come predefinito, rimuovi l'impostazione predefinita dagli altri modelli
      // dello stesso tipo
      if (validationResult.data.isDefault) {
        const existingTemplates = await storage.getReminderTemplates();
        const defaultTemplatesOfSameType = existingTemplates.filter(
          t => t.isDefault && t.type === validationResult.data.type
        );
        
        for (const template of defaultTemplatesOfSameType) {
          await storage.updateReminderTemplate(template.id, { isDefault: false });
        }
      }

      const template = await storage.createReminderTemplate(validationResult.data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Errore durante la creazione del modello di promemoria:", error);
      res.status(500).json({ message: "Error creating reminder template" });
    }
  });

  app.put('/api/reminder-templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      const validationResult = insertReminderTemplateSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid template data",
          errors: validationResult.error.errors
        });
      }

      // Se questo modello è impostato come predefinito, rimuovi l'impostazione predefinita dagli altri modelli
      // dello stesso tipo
      if (validationResult.data.isDefault) {
        const template = await storage.getReminderTemplate(id);
        if (template) {
          const existingTemplates = await storage.getReminderTemplates();
          const defaultTemplatesOfSameType = existingTemplates.filter(
            t => t.id !== id && t.isDefault && t.type === (validationResult.data.type || template.type)
          );
          
          for (const template of defaultTemplatesOfSameType) {
            await storage.updateReminderTemplate(template.id, { isDefault: false });
          }
        }
      }

      const updatedTemplate = await storage.updateReminderTemplate(id, validationResult.data);
      if (!updatedTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json(updatedTemplate);
    } catch (error) {
      console.error("Errore durante l'aggiornamento del modello di promemoria:", error);
      res.status(500).json({ message: "Error updating reminder template" });
    }
  });

  app.delete('/api/reminder-templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      const success = await storage.deleteReminderTemplate(id);
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.status(204).end();
    } catch (error) {
      console.error("Errore durante l'eliminazione del modello di promemoria:", error);
      res.status(500).json({ message: "Error deleting reminder template" });
    }
  });

  // Endpoint per aggiornare i prefissi telefonici dei clienti
  app.post('/api/update-phone-prefixes', isStaff, async (_req: Request, res: Response) => {
    try {
      // Verifichiamo che il metodo getClients esista
      if (typeof storage.getClients !== 'function') {
        console.error("Errore: il metodo getClients non esiste nello storage!");
        return res.status(500).json({ 
          error: "Errore di configurazione: metodo getClients non disponibile" 
        });
      }
      
      // Recupera tutti i clienti dal database
      let allClients;
      try {
        allClients = await storage.getClients();
        console.log(`Trovati ${allClients.length} clienti nel database.`);
      } catch (err) {
        console.error("Errore nel recupero dei clienti:", err);
        return res.status(500).json({ 
          error: "Impossibile recuperare l'elenco dei clienti dal database" 
        });
      }
      
      // Contatori per tenere traccia delle modifiche
      let updatedCount = 0;
      let skippedCount = 0;
      let emptyCount = 0;
      let errors = 0;
      
      // Itera tutti i clienti
      for (const client of allClients) {
        try {
          // Salta i clienti senza numero di telefono
          if (!client.phone || client.phone.trim() === '') {
            console.log(`Cliente ID ${client.id} (${client.firstName} ${client.lastName}): nessun numero di telefono presente.`);
            emptyCount++;
            continue;
          }
          
          // Verifica se il numero inizia già con un prefisso internazionale (+)
          if (client.phone.startsWith('+')) {
            // Correggi il caso specifico di Matteo Somaschini con numero +3920820219
            if (client.id === 8 && client.phone === '+3920820219') {
              const correctedPhone = '+393920820219';
              const updatedClient = await storage.updateClient(client.id, { phone: correctedPhone });
              console.log(`Cliente ID ${client.id} (${client.firstName} ${client.lastName}): corretto da ${client.phone} a ${correctedPhone}`);
              updatedCount++;
              continue;
            }
            
            console.log(`Cliente ID ${client.id} (${client.firstName} ${client.lastName}): il numero ${client.phone} ha già un prefisso internazionale.`);
            skippedCount++;
            continue;
          }
          
          // Pulisci il numero rimuovendo eventuali spazi o caratteri non numerici all'inizio
          let cleanNumber = client.phone.trim().replace(/^[\s\-\(\)]+/, '');
          
          // Rimuovi eventuali zeri iniziali (in Italia il prefisso locale)
          while (cleanNumber.startsWith('0')) {
            cleanNumber = cleanNumber.substring(1);
          }
          
          // Se il numero inizia con "39", potrebbe essere già un prefisso senza il +
          // ma solo se il resto del numero ha una lunghezza compatibile con un numero italiano (8-10 cifre)
          if (cleanNumber.startsWith('39') && cleanNumber.substring(2).length >= 8 && cleanNumber.substring(2).length <= 10) {
            cleanNumber = cleanNumber.substring(2);
          }
          
          // Aggiungi il prefisso italiano
          const updatedPhone = `+39${cleanNumber}`;
          
          // Verifichiamo che il metodo updateClient esista
          if (typeof storage.updateClient !== 'function') {
            throw new Error("Il metodo updateClient non esiste nello storage!");
          }
          
          // Aggiorna il cliente nel database
          const updatedClient = await storage.updateClient(client.id, { phone: updatedPhone });
          
          if (!updatedClient) {
            throw new Error(`Impossibile aggiornare il cliente ID ${client.id}`);
          }
          
          console.log(`Cliente ID ${client.id} (${client.firstName} ${client.lastName}): aggiornato da ${client.phone} a ${updatedPhone}`);
          updatedCount++;
        } catch (err) {
          console.error(`Errore nell'aggiornamento del cliente ID ${client.id}:`, err);
          errors++;
        }
      }
      
      const summary = {
        total: allClients.length,
        updated: updatedCount,
        skipped: skippedCount,
        empty: emptyCount,
        errors
      };
      
      console.log("Riepilogo aggiornamento prefissi:", summary);
      
      res.status(200).json({
        message: "Aggiornamento prefissi telefonici completato",
        summary
      });
    } catch (error) {
      console.error("Si è verificato un errore durante l'aggiornamento dei prefissi:", error);
      res.status(500).json({ 
        error: "Errore durante l'aggiornamento", 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint specifico per la gestione del fuso orario
  app.get('/api/timezone-settings', async (_req: Request, res: Response) => {
    try {
      // Ottieni le impostazioni del fuso orario
      const timezoneSetting = await storage.getSetting('timezone');
      
      // Se non esiste, restituisci il fuso orario di default (Europa/Roma)
      if (!timezoneSetting) {
        return res.json({ 
          timezone: 'Europe/Rome', 
          offset: 2, 
          name: 'Central European Summer Time (CEST)',
          info: 'Questo è il fuso orario predefinito (Italia)'
        });
      }
      
      res.json(JSON.parse(timezoneSetting.value));
    } catch (error) {
      console.error("Errore nel recupero delle impostazioni del fuso orario:", error);
      res.status(500).json({ success: false, message: 'Errore nel recupero delle impostazioni del fuso orario' });
    }
  });
  
  app.post('/api/timezone-settings', async (req: Request, res: Response) => {
    try {
      const { timezone, offset, name } = req.body;
      
      if (!timezone || offset === undefined || !name) {
        return res.status(400).json({ 
          success: false, 
          message: 'I parametri timezone, offset e name sono obbligatori' 
        });
      }
      
      const timezoneData = {
        timezone,
        offset,
        name,
        updatedAt: new Date().toISOString()
      };
      
      // Salva le impostazioni del fuso orario
      const setting = await storage.saveSetting(
        'timezone', 
        JSON.stringify(timezoneData),
        'Impostazioni del fuso orario per l\'applicazione',
        'system'
      );
      
      res.json({ 
        success: true, 
        message: 'Impostazioni del fuso orario salvate con successo',
        data: JSON.parse(setting.value)
      });
    } catch (error) {
      console.error("Errore nel salvataggio delle impostazioni del fuso orario:", error);
      res.status(500).json({ success: false, message: 'Errore nel salvataggio delle impostazioni del fuso orario' });
    }
  });

  // Gestione impostazioni notifiche
  app.get('/api/notification-settings', async (_req: Request, res: Response) => {
    try {
      // Ottieni o crea impostazioni predefinite se non esistono
      const settings = await notificationSettingsService.ensureDefaultSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      console.error("Errore nel recupero delle impostazioni di notifica:", error);
      res.status(500).json({ success: false, message: 'Errore nel recupero delle impostazioni di notifica' });
    }
  });

  app.post('/api/notification-settings', async (req: Request, res: Response) => {
    try {
      const settingsData = req.body;
      
      // Verificare che ci sia un ID nel body per l'aggiornamento
      if (settingsData.id) {
        const updatedSettings = await notificationSettingsService.updateSettings(
          settingsData.id,
          settingsData
        );
        
        if (!updatedSettings) {
          return res.status(404).json({ 
            success: false,
            message: "Impossibile trovare le impostazioni di notifica da aggiornare"
          });
        }
        
        return res.json({ 
          success: true, 
          message: 'Impostazioni di notifica aggiornate con successo',
          data: updatedSettings
        });
      } 
      
      // Altrimenti creiamo nuove impostazioni
      const newSettings = await notificationSettingsService.saveSettings(settingsData);
      res.status(201).json({ 
        success: true, 
        message: 'Impostazioni di notifica create con successo',
        data: newSettings
      });
    } catch (error) {
      console.error("Errore nel salvataggio delle impostazioni di notifica:", error);
      res.status(500).json({ success: false, message: 'Errore nel salvataggio delle impostazioni di notifica' });
    }
  });

  // Rileva configurazioni SMTP in base all'email
  app.post('/api/notification-settings/detect-smtp', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Indirizzo email obbligatorio per il rilevamento SMTP' 
        });
      }
      
      const smtpConfig = smtpDetectionService.detectSmtpConfig(email);
      
      if (smtpConfig) {
        res.json({ 
          success: true, 
          message: 'Configurazione SMTP rilevata con successo',
          data: smtpConfig
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: 'Impossibile rilevare le configurazioni SMTP per questa email'
        });
      }
    } catch (error) {
      console.error("Errore nel rilevamento SMTP:", error);
      res.status(500).json({ success: false, message: 'Errore durante il rilevamento SMTP' });
    }
  });

  // Test delle impostazioni di notifica
  app.post('/api/notification-settings/test-email', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Indirizzo email obbligatorio per il test' 
        });
      }
      
      // Recupera le impostazioni di notifica
      const settings = await notificationSettingsService.getSettings();
      
      // Verifica che tutte le impostazioni necessarie siano presenti
      if (!settings) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nessuna configurazione email trovata. Salva prima le impostazioni.' 
        });
      }
      
      if (!settings.emailEnabled) {
        return res.status(400).json({ 
          success: false, 
          message: 'Le notifiche email non sono abilitate. Attiva prima le notifiche email.' 
        });
      }
      
      if (!settings.smtpServer) {
        return res.status(400).json({ 
          success: false, 
          message: 'Server SMTP non configurato. Usa "Rileva impostazioni" o inseriscilo manualmente.' 
        });
      }
      
      if (!settings.smtpUsername) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username SMTP non configurato. Spesso è il tuo indirizzo email completo.' 
        });
      }
      
      if (!settings.smtpPassword) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password SMTP non configurata. Per Gmail, usa una password per app creata nelle impostazioni di sicurezza Google.' 
        });
      }
      
      // Registriamo le informazioni di invio per debug
      console.log(`Tentativo invio email di test a ${email} usando server ${settings.smtpServer}:${settings.smtpPort}`);
      
      try {
        // Invia email di test
        const success = await directNotificationService.sendEmail(
          email,
          'Email di test da Health Pro',
          'Questo è un messaggio di test dal sistema di notifiche. Se lo ricevi, la configurazione email è funzionante.'
        );
        
        if (success) {
          res.json({ 
            success: true, 
            message: 'Email di test inviata con successo! Controlla la tua casella di posta.' 
          });
        } else {
          // Errore generico nell'invio
          console.error("Invio email di test fallito");
          res.status(500).json({ 
            success: false, 
            message: 'Si è verificato un problema durante l\'invio dell\'email. Per Gmail potrebbero essere necessari: 1) Attivare l\'accesso app meno sicure, o 2) Creare una "password per app" nelle impostazioni di sicurezza.' 
          });
        }
      } catch (emailError: any) {
        // Catturo specificamente l'errore di invio per dare messaggi più informativi
        console.error("Errore nell'invio dell'email di test:", emailError);
        
        let errorMessage = 'Errore durante l\'invio dell\'email di test.';
        
        // Messaggi specifici per errori comuni
        if (emailError.code === 'EAUTH') {
          const isGmail = settings.smtpServer?.includes('gmail');
          
          if (isGmail) {
            errorMessage = 'Errore di autenticazione Gmail. È necessario usare una "password per app" specifica. Vai su https://myaccount.google.com/apppasswords per crearla.';
          } else {
            errorMessage = 'Errore di autenticazione SMTP. Verifica username e password.';
          }
        } else if (emailError.code === 'ESOCKET') {
          errorMessage = 'Errore di connessione al server SMTP. Verifica il server e la porta.';
        } else if (emailError.code === 'ECONNECTION') {
          errorMessage = 'Impossibile connettersi al server SMTP. Verifica l\'indirizzo del server.';
        } else if (emailError.message && emailError.message.includes('Application-specific password required')) {
          // Messaggio specifico per errore password app Gmail
          errorMessage = 'Per Gmail è necessario creare una "password per app" specifica. Vai su https://myaccount.google.com/apppasswords per crearla.';
        } else if (emailError.message) {
          // Includi il messaggio di errore originale se disponibile
          errorMessage = `Errore: ${emailError.message}`;
        }
        
        res.status(500).json({ 
          success: false, 
          message: errorMessage 
        });
      }
    } catch (error: any) {
      console.error("Errore nel test email:", error);
      res.status(500).json({ 
        success: false, 
        message: `Errore durante l'invio dell'email di test: ${error.message || 'errore sconosciuto'}` 
      });
    }
  });

  // Endpoint per inviare/processare i promemoria manualmente
  app.post('/api/process-reminders', async (req: Request, res: Response) => {
    try {
      const remindersSent = await directNotificationService.processReminders();
      res.json({ 
        success: true, 
        message: `${remindersSent} promemoria inviati con successo`
      });
    } catch (error) {
      console.error("Errore nell'elaborazione dei promemoria:", error);
      res.status(500).json({ 
        success: false, 
        message: 'Errore durante l\'elaborazione dei promemoria' 
      });
    }
  });



  // Inizializza il servizio keep-alive per mantenere l'applicazione sempre attiva
  keepAliveService.initialize(httpServer);
  
  return httpServer;
}
