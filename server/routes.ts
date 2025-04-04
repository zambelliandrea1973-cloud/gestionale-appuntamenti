import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertClientSchema,
  insertServiceSchema,
  insertAppointmentSchema,
  insertConsentSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertPaymentSchema
} from "@shared/schema";
import { setupAuth } from "./auth";
import { tokenService } from "./services/tokenService";
import { qrCodeService } from "./services/qrCodeService";
import { notificationService } from "./services/notificationService";
import { initializeSchedulers } from "./services/schedulerService";

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
  
  const httpServer = createServer(app);

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
      
      if (!token || !username || !password) {
        return res.status(400).json({ message: "Dati mancanti. Sono richiesti token, username e password." });
      }
      
      const success = await tokenService.activateAccount(token, username, password);
      
      if (!success) {
        return res.status(400).json({ message: "Token non valido o account già attivato" });
      }
      
      res.json({ message: "Account attivato con successo" });
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
        accountExists: !!existingAccount
      });
    } catch (error) {
      console.error("Errore nella verifica del token:", error);
      res.status(500).json({ valid: false, message: "Errore durante la verifica del token" });
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
  
  // Invia un SMS di test per verificare la configurazione Twilio
  app.post("/api/test-sms", async (req: Request, res: Response) => {
    try {
      const { to, message } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({ 
          message: "Parametri mancanti", 
          required: ["to", "message"],
          example: { to: "+391234567890", message: "Messaggio di test" }
        });
      }
      
      const result = await notificationService.sendSMS(to, message);
      res.json({ 
        message: "SMS inviato con successo", 
        details: {
          sid: result.sid,
          status: result.status,
          dateCreated: result.dateCreated
        }
      });
    } catch (error: any) {
      console.error("Errore nell'invio del SMS di test:", error);
      res.status(500).json({ 
        message: "Errore nell'invio del SMS", 
        error: error.message 
      });
    }
  });
  
  // Invia un messaggio WhatsApp di test per verificare la configurazione Twilio
  app.post("/api/test-whatsapp", async (req: Request, res: Response) => {
    try {
      const { to, message } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({ 
          message: "Parametri mancanti", 
          required: ["to", "message"],
          example: { to: "+391234567890", message: "Messaggio di test" }
        });
      }
      
      const result = await notificationService.sendWhatsApp(to, message);
      res.json({ 
        message: "Messaggio WhatsApp inviato con successo", 
        details: {
          sid: result.sid,
          status: result.status,
          dateCreated: result.dateCreated
        }
      });
    } catch (error: any) {
      console.error("Errore nell'invio del messaggio WhatsApp di test:", error);
      res.status(500).json({ 
        message: "Errore nell'invio del messaggio WhatsApp", 
        error: error.message 
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

  return httpServer;
}
