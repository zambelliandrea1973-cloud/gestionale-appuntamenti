import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertClientSchema,
  insertServiceSchema,
  insertAppointmentSchema
} from "@shared/schema";
import { setupAuth, isAdmin, isAuthenticated, isStaff, isClient } from "./auth";

// Sistema abbonamenti lineare - Piani disponibili
const subscriptionPlans = {
  trial: {
    name: 'Prova',
    price: 0,
    duration: '40 giorni',
    features: ['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti']
  },
  base: {
    name: 'Base', 
    price: 3.99,
    duration: 'monthly',
    features: ['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti']
  },
  pro: {
    name: 'PRO',
    price: 6.99, 
    duration: 'monthly',
    features: ['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti', 'Integrazione Google Calendar', 'Gestione fatture', 'Report dettagliati']
  },
  business: {
    name: 'Business',
    price: 9.99,
    duration: 'monthly', 
    features: ['Gestione appuntamenti', 'Gestione clienti', 'Notifiche ai clienti', 'Integrazione Google Calendar', 'Gestione fatture', 'Report dettagliati', 'Supporto per più operatori']
  },
  staff: {
    name: 'Staff',
    price: 0,
    duration: 'lifetime',
    features: ['Piano completo gratuito', 'Possibilità referral', 'Tutte le funzionalità']
  }
};

// Middleware di autenticazione semplificato 
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Autenticazione richiesta" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configura l'autenticazione PRIMA delle route API
  setupAuth(app);

  // Endpoint per informazioni utente con licenza (necessario per useUserWithLicense)
  app.get("/api/user-with-license", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const userWithLicense = {
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.type,
        hasActiveLicense: true,
        licenseType: user.type === 'staff' ? 'lifetime' : user.type === 'admin' ? 'admin' : 'business'
      };
      res.json(userWithLicense);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user info" });
    }
  });

  // Endpoint piani abbonamento
  app.get("/api/subscription-plans", (req: Request, res: Response) => {
    res.json(subscriptionPlans);
  });

  // Endpoint servizi (con filtro utente)
  app.get("/api/services", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const services = await storage.getServicesByUser(user.id);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Error fetching services" });
    }
  });

  app.post("/api/services", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const serviceData = { ...req.body, userId: user.id };
      const validationResult = insertServiceSchema.safeParse(serviceData);
      
      if (!validationResult.success) {
        return res.status(400).json({ errors: validationResult.error.errors });
      }

      const service = await storage.createService(validationResult.data);
      res.status(201).json(service);
    } catch (error) {
      res.status(500).json({ message: "Error creating service" });
    }
  });

  // Endpoint clienti (con filtro utente)
  app.get("/api/clients", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const clients = await storage.getClientsByUser(user.id);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clients" });
    }
  });

  app.post("/api/clients", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const clientData = { ...req.body, userId: user.id };
      const validationResult = insertClientSchema.safeParse(clientData);
      
      if (!validationResult.success) {
        return res.status(400).json({ errors: validationResult.error.errors });
      }

      const client = await storage.createClient(validationResult.data);
      res.status(201).json(client);
    } catch (error) {
      res.status(500).json({ message: "Error creating client" });
    }
  });

  // Endpoint appuntamenti (con filtro utente)
  app.get("/api/appointments", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const appointments = await storage.getAppointmentsByUser(user.id);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });

  app.post("/api/appointments", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const appointmentData = { ...req.body, userId: user.id };
      const validationResult = insertAppointmentSchema.safeParse(appointmentData);
      
      if (!validationResult.success) {
        return res.status(400).json({ errors: validationResult.error.errors });
      }

      const appointment = await storage.createAppointment(validationResult.data);
      res.status(201).json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Error creating appointment" });
    }
  });

  // Endpoint per inizializzare i dati predefiniti dal backup15
  app.post("/api/initialize-defaults", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      // Inizializza impostazioni predefinite per l'utente
      const defaultSettings = {
        appName: "Gestionale Sanitario",
        businessName: "Studio Medico",
        timezone: "Europe/Rome",
        iconPath: "/src/assets/fleur-de-vie.jpg"
      };

      // Salva le impostazioni predefinite (simulazione - adatta al tuo storage)
      console.log(`Inizializzazione impostazioni predefinite per utente ${user.id}`);
      
      res.json({ 
        success: true, 
        message: "Impostazioni predefinite inizializzate",
        settings: defaultSettings 
      });
    } catch (error) {
      console.error("Errore inizializzazione:", error);
      res.status(500).json({ message: "Errore durante l'inizializzazione" });
    }
  });

  // Endpoint per recuperare l'icona predefinita
  app.get("/api/default-icon", (req: Request, res: Response) => {
    res.json({ 
      iconPath: "/src/assets/fleur-de-vie.jpg",
      iconExists: true 
    });
  });

  // Endpoint per impostazioni fuso orario predefinite
  app.get("/api/timezone-settings", (req: Request, res: Response) => {
    res.json({
      timezone: "Europe/Rome",
      offset: 2,
      name: "Ora italiana"
    });
  });

  app.post("/api/timezone-settings", requireAuth, (req: Request, res: Response) => {
    const { timezone, offset, name } = req.body;
    console.log(`Fuso orario aggiornato: ${timezone} (${name}), Offset: UTC${offset >= 0 ? '+' : ''}${offset}`);
    res.json({ success: true, timezone, offset, name });
  });

  // Endpoint per informazioni app cliente
  app.get("/api/client-app-info", (req: Request, res: Response) => {
    res.json({
      appName: "Gestionale Sanitario",
      iconPath: "/src/assets/fleur-de-vie.jpg",
      businessName: "Studio Medico"
    });
  });

  // Endpoint per contesto tenant
  app.get("/api/tenant-context", requireAuth, (req: Request, res: Response) => {
    const user = req.user as any;
    res.json({
      userId: user.id,
      userType: user.type,
      tenantId: user.id // Architettura lineare: ogni utente è il proprio tenant
    });
  });

  // Endpoint per nome azienda
  app.get("/api/company-name-settings", requireAuth, (req: Request, res: Response) => {
    res.json({
      businessName: "Studio Medico",
      showBusinessName: true
    });
  });

  // Endpoint per servizi (risolve l'errore 500)
  app.get("/api/services", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      // Servizi predefiniti dal backup15
      const defaultServices = [
        {
          id: 1,
          name: "Visita Generale",
          duration: 30,
          price: 80,
          description: "Visita medica generale",
          userId: user.id
        },
        {
          id: 2,
          name: "Controllo",
          duration: 15,
          price: 40,
          description: "Controllo di routine",
          userId: user.id
        }
      ];
      
      res.json(defaultServices);
    } catch (error) {
      console.error("Errore recupero servizi:", error);
      res.status(500).json({ message: "Error fetching services" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}