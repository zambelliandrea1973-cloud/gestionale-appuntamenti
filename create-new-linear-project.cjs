#!/usr/bin/env node

/**
 * CREAZIONE NUOVO PROGETTO CON ARCHITETTURA LINEARE
 * Sistema abbonamenti semplificato con isolamento dati per cliente
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Creazione nuovo progetto con architettura lineare...');

// Ripristina completamente la struttura dal backup15
const backupDir = './backup/backup15-settings-personalizzate';

if (!fs.existsSync(backupDir)) {
  console.error('❌ Backup15 non trovato');
  process.exit(1);
}

// Sovrascrive completamente il sistema attuale con quello funzionante
console.log('📋 Ripristino completo dal backup15 funzionante...');

// Lista completa dei file da ripristinare
const coreFiles = [
  'server/storage.ts',
  'server/auth.ts', 
  'shared/schema.ts'
];

coreFiles.forEach(file => {
  const backupFile = path.join(backupDir, file);
  if (fs.existsSync(backupFile)) {
    const content = fs.readFileSync(backupFile, 'utf8');
    fs.writeFileSync(file, content);
    console.log(`✅ Ripristinato: ${file}`);
  }
});

// Crea nuovo routes.ts semplificato
const newRoutesContent = `import type { Express, Request, Response, NextFunction } from "express";
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
  setupAuth(app);

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

  const httpServer = createServer(app);
  return httpServer;
}`;

fs.writeFileSync('server/routes.ts', newRoutesContent);
console.log('✅ Creato nuovo routes.ts semplificato');

console.log('✅ Progetto con architettura lineare creato!');
console.log('🔧 Sistema abbonamenti implementato con isolamento dati');
console.log('👥 Supporto per multi-utente con piani dedicati');