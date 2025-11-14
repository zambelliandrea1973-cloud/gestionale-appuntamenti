import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import fs from "fs";
import path from "path";
import express from "express";
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
import { setupAuth, isAdmin, isAuthenticated, isStaff, isClient, comparePasswords } from "./auth";
import { tokenService } from "./services/tokenService";
import { qrCodeService } from "./services/qrCodeService";
import { notificationService } from "./services/notificationService";
import { contactService } from "./services/contactService";
import { initializeSchedulers } from "./services/schedulerService";
import { googleCalendarService } from "./services/googleCalendarService";
import { companyNameService } from "./services/companyNameService";
import { directNotificationService } from "./services/directNotificationService";
import { keepAliveService } from './services/keepAliveService';
import { externalPingService } from './services/externalPingService';
import { autoRestartService } from './services/autoRestartService';
import { persistenceService } from './services/persistenceService';
import { pingStatsService } from './services/pingStatsService';
import { testWhatsApp } from "./api/test-whatsapp";
import { notificationSettingsService } from "./services/notificationSettingsService";
import { smtpDetectionService } from "./services/smtpDetectionService";
import { clientAccessService } from "./services/clientAccessService";
import { clientLoginService } from "./services/clientLoginService";
import multer from 'multer';
import sharp from 'sharp';

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

// Configurazione delle rotte per il server Express
export async function registerRoutes(app: Express): Promise<Server> {
  // Configurazioni e middleware vari...

  // ... altre rotte esistenti ...

  // API per autenticazione client tramite credenziali (metodo POST tradizionale)
  app.post("/api/client/login", async (req: Request, res: Response) => {
    try {
      const { username, password, token, clientId, bypassAuth, pwaInstalled, recreateSession } = req.body;
      
      // Log completo della richiesta di login per diagnostica
      console.log("Tentativo login client:", { 
        username, 
        hasPassword: !!password, 
        hasToken: !!token, 
        clientId: clientId ? Number(clientId) : undefined,
        bypassAuth: !!bypassAuth,
        pwaInstalled: !!pwaInstalled,
        recreateSession: !!recreateSession,
        headers: {
          browser: req.headers['user-agent']?.substring(0, 100),
          pwaClient: req.headers['x-pwa-client'],
          bypassAuth: req.headers['x-bypass-auth'],
          retryAttempt: req.headers['x-retry-attempt']
        }
      });
      
      if (!username) {
        return res.status(400).json({ message: "Nome utente richiesto" });
      }
      
      // Usa il servizio di login cliente per verificare le credenziali
      const user = await clientLoginService.verifyCredentials(
        username,
        password,
        token,
        clientId ? Number(clientId) : undefined,
        bypassAuth
      );
      
      if (!user) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }
      
      // Registra l'accesso con informazioni aggiuntive
      const ipAddress = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';
      await clientAccessService.logAccess(user.clientId, ipAddress, userAgent);
      
      // Aggiungi informazioni sul tipo di client
      if (pwaInstalled) {
        user.clientType = "pwa-app";
      } else if (bypassAuth) {
        user.clientType = "token-auth";
      } else {
        user.clientType = "standard";
      }
      
      // Autentica l'utente tramite Passport
      req.login(user, async (err) => {
        if (err) {
          console.error("Errore durante l'autenticazione client:", err);
          return res.status(500).json({ message: "Errore durante l'autenticazione" });
        }
        
        // Log di successo
        console.log(`Login client completato con successo: ${username} (ID: ${user.clientId}), PWA: ${pwaInstalled}`);
        
        res.json(user);
      });
    } catch (error) {
      console.error("Errore durante il login:", error);
      res.status(500).json({ message: "Errore durante l'elaborazione della richiesta di login", error: String(error) });
    }
  });
  
  // Nuovo endpoint: login cliente semplificato tramite GET
  // Questo endpoint consente di autenticare un cliente usando solo parametri URL
  // ed evita completamente l'uso di chiamate POST con corpo JSON
  app.get("/api/client/simple-login", async (req: Request, res: Response) => {
    try {
      // Recupera parametri dalla query URL
      const { username, clientId, token } = req.query;
      const isPwa = req.headers['x-pwa-client'] === 'true' || 
                   req.query.pwa === 'true' ||
                   req.query.isPwa === 'true';
      
      console.log("Tentativo login client con metodo GET:", { 
        username, 
        clientId, 
        hasToken: !!token, 
        isPwa,
        browser: req.headers['user-agent']?.substring(0, 100)
      });
      
      // Valida i parametri richiesti
      if (!username || !clientId || !token) {
        return res.status(400).json({ 
          success: false,
          message: "Parametri mancanti. Richiesti: username, clientId e token" 
        });
      }
      
      // Tenta l'autenticazione tramite il servizio
      const user = await clientLoginService.authenticateViaGet(
        username as string,
        clientId as string,
        token as string,
        isPwa
      );
      
      // Se l'autenticazione fallisce
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: "Autenticazione fallita. Token non valido o scaduto."
        });
      }
      
      // Aggiunge informazioni sul tipo di client
      user.clientType = isPwa ? "pwa-app" : "simple-login";
      
      // Autentica tramite Passport
      req.login(user, async (err) => {
        if (err) {
          console.error("Errore durante l'autenticazione client semplificata:", err);
          return res.status(500).json({ 
            success: false,
            message: "Errore durante l'autenticazione" 
          });
        }
        
        // Log di successo
        console.log(`Login client semplificato completato: ${username} (ID: ${user.clientId}), PWA: ${isPwa}`);
        
        // Restituisci il risultato
        res.json({
          success: true,
          message: "Accesso effettuato con successo",
          user
        });
      });
    } catch (error) {
      console.error("Errore durante login semplificato:", error);
      res.status(500).json({ 
        success: false,
        message: "Errore durante l'elaborazione della richiesta", 
        error: String(error)
      });
    }
  });

  // Il resto delle rotte definite...

  const httpServer = createServer(app);
  return httpServer;
}