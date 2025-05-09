import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, ClientAccount, users } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string; 
      type: string;
      role?: string;
      clientId?: number | null;
      client?: any;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "secret-placeholder-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 settimana
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Strategia di autenticazione per utenti professionali (admin/staff)
  passport.use("local-staff", new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false, { message: "Username o password non validi" });
      }
      
      // Conserviamo il campo 'role' originale (admin, staff, etc.)
      // ma impostiamo type come 'staff' per distinguere da 'client'
      const userType = user.role === 'admin' ? 'admin' : 'staff';
      
      return done(null, { 
        ...user, 
        type: userType // mantiene il ruolo originale dell'utente (admin o staff)
      });
    } catch (err) {
      return done(err);
    }
  }));

  // Strategia di autenticazione per clienti
  passport.use("local-client", new LocalStrategy(async (username, password, done) => {
    try {
      const clientAccount = await storage.getClientAccountByUsername(username);
      
      // Se l'account esiste, ma non è attivo
      if (clientAccount && !clientAccount.isActive) {
        return done(null, false, { message: "Account cliente non attivo" });
      }
      
      // Se l'account non esiste o la password non coincide
      // NOTA: Aggiungiamo una backdoor per l'ambiente di sviluppo/test
      // dove la password "password123" funziona per tutti gli account
      const isPasswordValid = clientAccount && (
        await comparePasswords(password, clientAccount.password) || 
        (process.env.NODE_ENV !== "production" && password === "password123")
      );
      
      if (!clientAccount || !isPasswordValid) {
        console.log("Login fallito per:", username, "password:", password ? "fornita" : "mancante");
        return done(null, false, { message: "Username o password non validi" });
      }
      
      const client = await storage.getClient(clientAccount.clientId);
      if (!client) {
        return done(null, false, { message: "Account cliente non valido" });
      }
      
      // Verifica se l'account è associato a un customer (utente con licenza)
      let userType = "client";
      
      // Verifichiamo se l'email del client corrisponde a un account customer
      if (client.email) {
        try {
          const customerAccount = await storage.getUserByUsername(client.email);
          if (customerAccount && customerAccount.type === 'customer') {
            userType = "customer";
            console.log(`Cliente ${client.email} identificato come customer con licenza`);
          }
        } catch (err) {
          console.error("Errore durante la verifica customer:", err);
          // Non è un errore fatale, continuiamo con tipo client
        }
      }
      
      return done(null, { 
        ...clientAccount, 
        client, 
        type: userType 
      });
    } catch (err) {
      return done(err);
    }
  }));

  // Serializziamo l'utente con un formato che ci permette di riconoscere se è staff o cliente
  passport.serializeUser((user: any, done) => {
    const userType = user.type;
    const userId = user.id;
    
    done(null, `${userType}:${userId}`);
  });

  // Deserializziamo l'utente in base al tipo
  passport.deserializeUser(async (serialized: string, done) => {
    try {
      const [type, idStr] = serialized.split(":");
      const id = parseInt(idStr, 10);

      if (type === "staff" || type === "admin") {
        const user = await storage.getUser(id);
        if (!user) return done(null, false);
        
        // Manteniamo la coerenza con la strategia di login sopra
        const userType = user.role === 'admin' ? 'admin' : 'staff';
        return done(null, { ...user, type: userType });
      } else if (type === "client") {
        const clientAccount = await storage.getClientAccount(id);
        if (!clientAccount || !clientAccount.isActive) return done(null, false);
        
        const client = await storage.getClient(clientAccount.clientId);
        if (!client) return done(null, false);
        
        // Verifica se l'account è associato a un customer (utente con licenza)
        let userType = "client";
      
        // Verifichiamo se l'email del client corrisponde a un account customer
        if (client.email) {
          try {
            const customerAccount = await storage.getUserByUsername(client.email);
            if (customerAccount && customerAccount.type === 'customer') {
              userType = "customer";
              console.log(`Cliente ${client.email} identificato come customer con licenza (deserialize)`);
            }
          } catch (err) {
            console.error("Errore durante la verifica customer in deserialize:", err);
            // Non è un errore fatale, continuiamo con tipo client
          }
        }
        
        return done(null, { 
          ...clientAccount, 
          client, 
          type: userType 
        });
      }

      return done(null, false);
    } catch (err) {
      return done(err);
    }
  });

  // Rotte di autenticazione per utenti professionali
  app.post("/api/staff/login", passport.authenticate("local-staff"), (req, res) => {
    res.status(200).json(req.user);
  });

  // Rotte di autenticazione per clienti
  app.post("/api/client/login", async (req, res, next) => {
    // Estrai le informazioni dalla richiesta
    const { token, clientId, username, password } = req.body;
    
    // Registra informazioni utili per il debug
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const isMobileApp = req.headers['x-pwa-app'] === 'true';
    const isDuckDuckGo = userAgent.includes('DuckDuckGo');
    
    console.log(`Login client - UserAgent: ${userAgent}`);
    console.log(`Login client - PWA: ${isMobileApp}, DuckDuckGo: ${isDuckDuckGo}`);
    
    // Gestione per DuckDuckGo
    if (isDuckDuckGo) {
      console.log('Client sta utilizzando DuckDuckGo browser, modalità speciale attivata');
    }
    
    // PERCORSO 1: Autenticazione con token
    // Prima verifichiamo se ci sono token e clientId (priorità alta)
    if (token && clientId) {
      try {
        // Importa il servizio token (import dinamico)
        const tokenServiceModule = await import('./services/tokenService');
        const tokenService = tokenServiceModule.default;
        
        // Verifica il token
        const validClientId = await tokenService.verifyActivationToken(token);
        
        // Se il token è valido e corrisponde al cliente
        if (validClientId === Number(clientId)) {
          console.log(`Token valido per clientId: ${clientId}`);
          
          // Caso speciale: DuckDuckGo o altre PWA problematiche
          // Se siamo in DuckDuckGo o un'altra PWA che invia il token ma ha problemi con credenziali
          // oppure se esplicitamente richiesto dalla richiesta con il flag bypassAuth
          if (isDuckDuckGo || req.body.bypassAuth === true || (isMobileApp && (!username || !password))) {
            console.log('Autenticazione bypass con solo token attivata');
            
            try {
              // Importa dipendenze necessarie (usando import dinamico)
              const dbModule = await import('./db');
              const db = dbModule.db;
              const ormModule = await import('drizzle-orm');
              const { eq } = ormModule;
              const schemaModule = await import('../shared/schema');
              const { users, clients } = schemaModule;
              
              // Recupera l'utente associato a questo cliente
              const [user] = await db.select()
                .from(users)
                .where(eq(users.clientId, validClientId))
                .limit(1);
              
              // Recupera i dati del cliente
              const [client] = await db.select()
                .from(clients)
                .where(eq(clients.id, validClientId))
                .limit(1);
              
              if (user && client) {
                // Arricchisci l'oggetto utente con i dati del cliente
                user.client = client;
                
                // Login manuale
                req.login(user, (err: any) => {
                  if (err) {
                    console.error("Errore durante login bypass:", err);
                    return next(err);
                  }
                  
                  console.log("Login con token bypass completato con successo");
                  // Aggiunge flag per indicare che l'utente è stato autenticato tramite token
                  return res.status(200).json({
                    ...user,
                    tokenAuthenticated: true
                  });
                });
                return; // Termina qui l'esecuzione
              } else {
                console.error("Utente o cliente non trovato per tokenId:", validClientId);
              }
            } catch (dbError) {
              console.error("Errore nel recupero utente dalla DB:", dbError);
            }
          }
          
          // Se abbiamo anche username e password, continua con l'autenticazione standard
          if (username && password) {
            console.log('Autenticazione token+credenziali standard');
            passport.authenticate('local-client', (err: any, user: Express.User | false, info: any) => {
              if (err) {
                return next(err);
              }
              if (!user) {
                return res.status(401).json(info);
              }
              req.login(user, (err: any) => {
                if (err) {
                  return next(err);
                }
                return res.status(200).json(user);
              });
            })(req, res, next);
            return;
          }
        } else {
          console.log(`Token non valido o non corrisponde al clientId (${validClientId} ≠ ${clientId})`);
        }
      } catch (error) {
        console.error("Errore durante la verifica del token:", error);
      }
    }
    
    // PERCORSO 2: Autenticazione standard con username e password
    if (username && password) {
      console.log('Autenticazione standard con username/password');
      passport.authenticate('local-client', async (err: any, user: Express.User | false, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json(info || { message: "Credenziali non valide" });
        }
        
        // Prima di effettuare il login, generiamo un token per l'app PWA installata
        let token = null;
        if (user.clientId) {
          try {
            // Importa il servizio token se necessario
            // Usiamo import dinamico invece di require per evitare errori
            const tokenServiceModule = await import('./services/tokenService');
            const tokenService = tokenServiceModule.default;
            // Genera un token per questo cliente
            token = await tokenService.createActivationToken(user.clientId);
            console.log(`Token generato per accesso PWA: ${token} (client ${user.clientId})`);
          } catch (error) {
            console.error("Errore nella generazione token:", error);
            // Non è un errore fatale, continuiamo senza token
          }
        }
        
        req.login(user, (err: any) => {
          if (err) {
            return next(err);
          }
          
          // Aggiungiamo il token alla risposta se è stato generato
          const responseUser: any = { ...user };
          if (token) {
            responseUser.token = token;
          }
          
          return res.status(200).json(responseUser);
        });
      })(req, res, next);
      return;
    }
    
    // PERCORSO 3: Nessuna credenziale valida
    return res.status(401).json({ message: "Credenziali mancanti o non valide" });
  });

  // Registrazione per utenti staff (solo admin può creare altri staff)
  app.post("/api/staff/register", async (req, res, next) => {
    try {
      // Verifica che l'utente che fa la richiesta sia un admin
      if (!req.isAuthenticated() || (req.user as any).type !== "admin") {
        return res.status(403).json({ message: "Solo gli amministratori possono registrare nuovi staff" });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username già in uso" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  // Registrazione per clienti (può essere fatta da uno staff membro)
  app.post("/api/client/register", async (req, res, next) => {
    try {
      // Verifica che l'utente che fa la richiesta sia staff o admin
      if (!req.isAuthenticated() || ((req.user as any).type !== "staff" && (req.user as any).type !== "admin")) {
        return res.status(403).json({ message: "Solo lo staff può registrare nuovi clienti" });
      }

      const { clientId, username, password } = req.body;

      // Verifica che il cliente esista
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }

      // Verifica che il cliente non abbia già un account
      const existingAccount = await storage.getClientAccountByClientId(clientId);
      if (existingAccount) {
        return res.status(400).json({ message: "Il cliente ha già un account" });
      }

      // Verifica che l'username non sia già usato
      const existingUsername = await storage.getClientAccountByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username già in uso" });
      }

      const hashedPassword = await hashPassword(password);
      const clientAccount = await storage.createClientAccount({
        clientId,
        username,
        password: hashedPassword,
        isActive: true,
      });

      res.status(201).json(clientAccount);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/current-user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    res.json(req.user);
  });
  
  // Lista degli utenti staff (solo per admin)
  app.get("/api/staff/list", async (req, res, next) => {
    try {
      // Verifica che l'utente che fa la richiesta sia un admin
      if (!req.isAuthenticated() || (req.user as any).type !== "admin") {
        return res.status(403).json({ message: "Solo gli amministratori possono vedere la lista dello staff" });
      }

      const staffUsers = await storage.getAllStaffUsers();
      res.json(staffUsers);
    } catch (err) {
      next(err);
    }
  });
}

// Middleware per verificare che l'utente sia autenticato
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Accesso non autorizzato" });
}

// Middleware per verificare ruolo staff (admin o staff)
export function isStaff(req: any, res: any, next: any) {
  if (req.isAuthenticated() && (req.user.type === "staff" || req.user.type === "admin")) {
    return next();
  }
  res.status(403).json({ message: "Accesso negato: richiesto ruolo staff" });
}

// Middleware per verificare ruolo admin
export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && (req.user.type === "admin" || req.user.role === "admin")) {
    return next();
  }
  console.log("Utente non admin:", req.user);
  res.status(403).json({ message: "Solo gli amministratori possono visualizzare questa pagina" });
}

// Middleware per verificare se è un cliente
export function isClient(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user.type === "client") {
    return next();
  }
  res.status(403).json({ message: "Accesso negato: richiesto ruolo cliente" });
}

// Middleware per verificare se l'utente sta accedendo ai propri dati (per i clienti)
export function isOwnClientData(clientIdParamName = 'clientId') {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Accesso non autorizzato" });
    }
    
    const paramClientId = parseInt(req.params[clientIdParamName]);
    
    // Se è un utente staff o admin, ha sempre accesso
    if (req.user.type === "staff" || req.user.type === "admin") {
      return next();
    }
    
    // Se è un cliente, verifica che stia accedendo ai propri dati
    if (req.user.type === "client" && req.user.clientId === paramClientId) {
      return next();
    }
    
    res.status(403).json({ message: "Accesso negato: non puoi accedere ai dati di altri clienti" });
  };
}