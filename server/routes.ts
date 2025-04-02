import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertClientSchema,
  insertServiceSchema,
  insertAppointmentSchema,
  insertConsentSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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

      const consent = await storage.createConsent(validationResult.data);
      res.status(201).json(consent);
    } catch (error) {
      res.status(500).json({ message: "Error creating consent" });
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

  return httpServer;
}
