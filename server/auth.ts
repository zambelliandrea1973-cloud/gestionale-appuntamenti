// @ts-nocheck
import { logger } from './utils/logger';
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, ClientAccount, users, userLogins } from "../shared/schema";
import { db } from "./db";
import rateLimit from "express-rate-limit";

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

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
  // Detect if we are on Sliplane or production environment
  const isProduction = process.env.NODE_ENV === 'production';
  const isReplit = process.env.REPL_ID !== undefined;
  const isSliplane = !isReplit && isProduction;
  
  logger.debug(`🔐 [AUTH] Session configuration: production=${isProduction}, replit=${isReplit}, sliplane=${isSliplane}`);
  
  const sessionSettings: session.SessionOptions = {
    secret: (() => {
      if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
      if (isSliplane) {
        console.error('❌ [AUTH] SESSION_SECRET missing in Sliplane production!');
        process.exit(1);
      }
      console.warn('⚠️ [AUTH] SESSION_SECRET not set, using placeholder (NOT SAFE IN PRODUCTION)');
      return "dev-only-placeholder-not-for-production";
    })(),
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    rolling: true,
    proxy: true, // IMPORTANTE: fiducia proxy headers
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: isProduction || isReplit, // true su Replit/Sliplane (HTTPS)
      sameSite: 'none', // 'none' always to allow redirects from PayPal/Stripe
      domain: isSliplane ? undefined : undefined // auto-detect domain
    },
    name: 'session-id',
  };
  
  logger.debug(`🔐 [AUTH] Cookie settings: secure=${sessionSettings.cookie?.secure}, sameSite=${sessionSettings.cookie?.sameSite}`);

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Authentication strategy for professional users (admin/staff/customer)
  passport.use("local-staff", new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false, { message: "Username o password invalid" });
      }
      
      // FIX: Keep the original user type (admin, staff or customer)
      // Use the 'role' field ONLY if the type is not already defined
      let userType = user.type;
      
      // if the type is not defined, determine it from the role
      if (!userType || userType === 'undefined') {
        userType = user.role === 'admin' ? 'admin' : 'staff';
        console.log(`User type not defined for ${username}, set to ${userType} based on role`);
      } else {
        // Debug log removed for performance optimization
      }
      
      return done(null, { 
        ...user, 
        type: userType // maintains original user type
      });
    } catch (err) {
      return done(err);
    }
  }));

  // Authentication strategy for clients
  passport.use("local-client", new LocalStrategy(async (username, password, done) => {
    try {
      const clientAccount = await storage.getClientAccountByUsername(username);
      
      // If the account exists but is not active
      if (clientAccount && !clientAccount.isActive) {
        return done(null, false, { message: "Client account is not active" });
      }
      
      // If the account does not exist or the password does not match
      // NOTE: Adding a backdoor for the development/test environment
      // where the password "password123" works for all accounts
      const isPasswordValid = clientAccount && (
        await comparePasswords(password, clientAccount.password) || 
        (process.env.NODE_ENV !== "production" && password === "password123")
      );
      
      if (!clientAccount || !isPasswordValid) {
        console.log("Login failed for:", username, "password:", password ? "provided" : "missing");
        return done(null, false, { message: "Username o password invalid" });
      }
      
      const client = await storage.getClient(clientAccount.clientId);
      if (!client) {
        return done(null, false, { message: "Invalid client account" });
      }
      
      // Check if the account is associated with a customer (licensed user)
      let userType = "client";
      let userId = clientAccount.id;
      
      // Check if the client email matches a customer account
      if (client.email) {
        try {
          const customerAccount = await storage.getUserByUsername(client.email);
          if (customerAccount && customerAccount.type === 'customer') {
            userType = "customer";
            userId = customerAccount.id; // Use the customer ID, not the clientAccount
            console.log(`client ${client.email} identified as licensed customer, ID: ${userId}`);
          }
        } catch (err) {
          console.error("Error verifying customer:", err);
          // It's not a fatal error, continue with type client
        }
      }
      
      return done(null, { 
        ...clientAccount, 
        client, 
        type: userType,
        id: userId // Usa l'ID corretto in base al tipo
      });
    } catch (err) {
      return done(err);
    }
  }));

  // Serialize the user with a format that allows us to recognize if it is staff or client
  passport.serializeUser((user: any, done) => {
    // User serialization - debug logs removed for performance
    
    const userType = user.type;
    const userId = user.id;
    
    if (!userType || !userId) {
      console.error('Serialization error: type or ID missing', { userType, userId, user });
      return done(new Error('User type or ID missing during serialization'));
    }
    
    // Format: "type:id" for correct deserialization
    done(null, `${userType}:${userId}`);
  });

  // Deserialize the user based on type
  passport.deserializeUser(async (serialized: string, done) => {
    try {
      // User deserialization - debug logs removed for performance
      
      // Check if serialized is a valid string
      if (!serialized || typeof serialized !== 'string') {
        console.error('Deserialization error: invalid serialized data', serialized);
        return done(new Error('Invalid session ID'));
      }
      
      const [type, idStr] = serialized.split(":");
      
      // Check if we have both type and idStr
      if (!type || !idStr) {
        console.error('Deserialization error: invalid ID format', { type, idStr, serialized });
        return done(new Error('Invalid session ID format'));
      }
      
      const id = parseInt(idStr, 10);

      if (type === "staff" || type === "admin" || type === "customer") {
        const user = await storage.getUser(id);
        if (!user) return done(null, false);
        
        // FIX: Keep the original type if present
        let userType = user.type;
        if (!userType || userType === 'undefined') {
          userType = user.role === 'admin' ? 'admin' : (type === 'customer' ? 'customer' : 'staff');
          console.log(`User type not defined for ID ${id}, set to ${userType} based on serialized type`);
        } else {
          // User type maintained - debug log removed for performance
        }
        
        return done(null, { ...user, type: userType });
      } else if (type === "client") {
        const clientAccount = await storage.getClientAccount(id);
        if (!clientAccount || !clientAccount.isActive) return done(null, false);
        
        const client = await storage.getClient(clientAccount.clientId);
        if (!client) return done(null, false);
        
        // Check if the account is associated with a customer (licensed user)
        let userType = "client";
      
        // Check if the client email matches a customer account
        if (client.email) {
          try {
            const customerAccount = await storage.getUserByUsername(client.email);
            if (customerAccount && customerAccount.type === 'customer') {
              userType = "customer";
              console.log(`client ${client.email} identified as licensed customer (deserialize)`);
            }
          } catch (err) {
            console.error("Error verifying customer in deserialize:", err);
            // It's not a fatal error, continue with type client
          }
        }
        
        return done(null, { 
          ...clientAccount, 
          client, 
          type: userType 
        });
      }

      return done(null, false);
    } catch (err: any) {
      // Detailed deserialization error log
      console.error('🔴 [DESERIALIZE ERROR] ==================');
      console.error('🔴 [DESERIALIZE] Serialized value:', serialized);
      console.error('🔴 [DESERIALIZE] Error message:', err?.message);
      if (err?.query) console.error('🔴 [DESERIALIZE] SQL Query:', err.query);
      if (err?.sql) console.error('🔴 [DESERIALIZE] SQL:', err.sql);
      console.error('🔴 [DESERIALIZE] Stack:', err?.stack);
      console.error('🔴 [DESERIALIZE ERROR] ==================');
      return done(err);
    }
  });

  // Authentication routes for professional users
  app.post("/api/staff/login", loginRateLimiter, (req, res, next) => {
    const username = req.body.username;
    const userAgent = req.headers['user-agent']?.substring(0, 100);
    const ip = req.ip || req.connection.remoteAddress;
    
    logger.debug(`🔐 [LOGIN] Staff login request: ${username}`);
    logger.debug(`🔐 [LOGIN] IP: ${ip}, UserAgent: ${userAgent}`);
    logger.debug(`🔐 [LOGIN] Headers: secure=${req.secure}, protocol=${req.protocol}`);
    
    // FORCED SESSION CLEANUP to avoid overlaps between staff users
    req.logout((logoutErr) => {
      if (logoutErr) console.log('⚠️ [LOGIN] Error during preventive logout:', logoutErr);
      
      passport.authenticate("local-staff", (err: any, user: any, info: any) => {
        if (err) {
          console.error('❌ [LOGIN] Error during staff authentication:', err);
          return next(err);
        }
        if (!user) {
          console.log(`❌ [LOGIN] Login failed for: ${username}`);
          return res.status(401).json(info || { message: "Invalid credentials" });
        }
        
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error(`❌ [LOGIN] Error during req.login for ${username}:`, loginErr);
            return next(loginErr);
          }
          
          // Log the session after login
          logger.debug(`✅ [LOGIN] Login completed per: ${user.username} (ID: ${user.id}, type: ${user.type})`);
          logger.debug(`🔐 [LOGIN] Session ID: ${req.sessionID}`);
          logger.debug(`🔐 [LOGIN] Session saved: ${req.session ? 'yes' : 'no'}`);
          
          // Register access in login tracking
          db.insert(userLogins).values({
            userId: user.id,
            ipAddress: ip?.toString(),
            userAgent: userAgent?.toString()
          }).catch(err => console.error('Error registering login:', err));
          
          // Force session save
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error(`❌ [LOGIN] Error saving session:`, saveErr);
            } else {
              logger.debug(`✅ [LOGIN] Session saved successfully for ${user.username}`);
            }
            return res.status(200).json(user);
          });
        });
      })(req, res, next);
    });
  });


  // Authentication routes for end clients
  app.post("/api/client/login", loginRateLimiter, async (req, res, next) => {
    // Extract information from the request
    const { token, clientId, username, password } = req.body;
    
    // Register useful information for debugging
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const isMobileApp = req.headers['x-pwa-app'] === 'true';
    const isDuckDuckGo = userAgent.includes('DuckDuckGo');
    
    console.log(`Login client - UserAgent: ${userAgent}`);
    console.log(`Login client - PWA: ${isMobileApp}, DuckDuckGo: ${isDuckDuckGo}`);
    
    // FIRST PRIORITY: Customer accounts (1973A,B,C,D) as in backups 14-15
    if (username && password) {
      console.log('Standard authentication with username/password');
      
      try {
        const user = await storage.getUserByUsername(username);
        if (user && user.type === 'customer' && (await comparePasswords(password, user.password))) {
          console.log(`Login customer completed successfully per: ${user.username} type: ${user.type}`);
          
          // Register access in login tracking
          const ip = req.ip || req.connection.remoteAddress;
          db.insert(userLogins).values({
            userId: user.id,
            ipAddress: ip?.toString(),
            userAgent: userAgent?.toString()
          }).catch(err => console.error('Error registering customer login:', err));
          
          req.login(user, (err) => {
            if (err) {
              console.error('Error during customer login:', err);
              return next(err);
            }
            return res.status(200).json(user);
          });
          return;
        }
      } catch (error) {
        console.error('Error verifying customer account:', error);
      }
      
      // If it is a customer account, continue with normal logic
      console.log(`Login failed for: ${username} password: ${password ? 'provided' : 'missing'}`);
      return res.status(401).json({ message: "Username o password invalid" });
    }
    
    // Handling for DuckDuckGo
    if (isDuckDuckGo) {
      console.log('Client is using DuckDuckGo browser, special mode activated');
    }
    
    // PATH 1: Authentication with token
    // First verify if there are token and clientId (high priority)
    if (token && clientId) {
      try {
        // Import the service token (import dinamico)
        const tokenServiceModule = await import('./services/tokenService');
        const tokenService = tokenServiceModule.tokenService;
        
        // Verify the token
        const validClientId = await tokenService.verifyActivationToken(token);
        
        // if the token is valid and matches the client
        if (validClientId === Number(clientId)) {
          console.log(`Valid token for clientId: ${clientId}`);
          
          // Caso speciale: DuckDuckGo o altre PWA problematiche
          // If we are in DuckDuckGo or another PWA that sends the token but has credential issues
          // or if explicitly requested by the request with the bypassAuth flag
          if (isDuckDuckGo || req.body.bypassAuth === true || (isMobileApp && (!username || !password))) {
            console.log('Authentication bypass with token only activated');
            
            try {
              // Import dipendenze necessarie (usando import dinamico)
              const dbModule = await import('./db');
              const db = dbModule.db;
              const ormModule = await import('drizzle-orm');
              const { eq } = ormModule;
              const schemaModule = await import('../shared/schema');
              const { users, clients } = schemaModule;
              
              // Retrieve the user associated with this client
              const [user] = await db.select()
                .from(users)
                .where(eq(users.clientId, validClientId))
                .limit(1);
              
              // Retrieve client date
              const [client] = await db.select()
                .from(clients)
                .where(eq(clients.id, validClientId))
                .limit(1);
              
              if (user && client) {
                // Enrich the user object with client data
                user.clientId = client.id;
                
                // Login manuale
                req.login(user, (err: any) => {
                  if (err) {
                    console.error("Error during bypass login:", err);
                    return next(err);
                  }
                  
                  console.log("Login with bypass token completed successfully");
                  // Add flag to indicate that the user was authenticated via token
                  return res.status(200).json({
                    ...user,
                    tokenAuthenticated: true
                  });
                });
                return; // Termina qui l'esecuzione
              } else {
                console.error("User or client not found for tokenId:", validClientId);
              }
            } catch (dbError) {
              console.error("Error retrieving user from DB:", dbError);
            }
          }
          
          // If abbiamo also username e password, continua con l'autenticazione standard
          if (username && password) {
            console.log('Standard token+credentials authentication');
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
          console.log(`Invalid token or does not match clientId (${validClientId} ≠ ${clientId})`);
        }
      } catch (error) {
        console.error("Error verifying token:", error);
      }
    }
    
    // PATH 2: Standard authentication with username and password
    if (username && password) {
      console.log('Standard authentication with username/password');
      passport.authenticate('local-client', async (err: any, user: Express.User | false, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json(info || { message: "Invalid credentials" });
        }
        
        // Before performing login, generate a token for the installed PWA app
        let token = null;
        if (user.clientId) {
          try {
            // Import the service token if needed
            // We use dynamic import instead of require to avoid errors
            const { tokenService } = await import('./services/tokenService');
            // Generate a token for this client
            token = await tokenService.generateActivationToken(user.clientId);
            console.log(`Token generated for PWA access: ${token} (client ${user.clientId})`);
          } catch (error) {
            console.error("Error generating token:", error);
            // It's not a fatal error, continue without token
          }
        }
        
        req.login(user, (err: any) => {
          if (err) {
            return next(err);
          }
          
          // Add the token to the response if it was generated
          const responseUser: any = { ...user };
          if (token) {
            responseUser.token = token;
          }
          
          return res.status(200).json(responseUser);
        });
      })(req, res, next);
      return;
    }
    
    // PATH 3: No valid credentials
    return res.status(401).json({ message: "Missing or invalid credentials" });
  });

  // Registration for staff users (only admin can create other staff)
  app.post("/api/staff/register", async (req, res, next) => {
    try {
      // Verify that the user making the request is an admin
      if (!req.isAuthenticated() || (req.user as any).type !== "admin") {
        return res.status(403).json({ message: "Only administrators can register new staff" });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already in use" });
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

  // Registration for clients (can be done by a staff member)
  app.post("/api/client/register", async (req, res, next) => {
    try {
      // Verify that the user making the request is staff or admin
      if (!req.isAuthenticated() || ((req.user as any).type !== "staff" && (req.user as any).type !== "admin")) {
        return res.status(403).json({ message: "Only staff can register new clients" });
      }

      const { clientId, username, password } = req.body;

      // Verify that the client exists
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Verify that the client does not already have an account
      const existingAccount = await storage.getClientAccountByClientId(clientId);
      if (existingAccount) {
        return res.status(400).json({ message: "Client already has an account" });
      }

      // Verify that the username is not already in use
      const existingUsername = await storage.getClientAccountByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already in use" });
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
    if (req.session) {
      // Make sure the session exists first
      console.log(`Logout attempt for user ${req.user?.username || 'unknown'}, type: ${req.user?.type || 'unspecified'}`);
      
      req.logout((err) => {
        if (err) {
          console.error(`Error during logout:`, err);
          return next(err);
        }
        
        // Completely destroy the session, not just user date
        req.session.destroy((err) => {
          if (err) {
            console.error(`Error destroying session:`, err);
            return next(err);
          }
          
          // Clear the session cookie on the client with the same options as the original cookie
          // This is CRITICAL to ensure the cookie is actually deleted
          const isProduction = process.env.NODE_ENV === 'production';
          const isReplit = process.env.REPL_ID !== undefined;
          const isSliplane = !isReplit && isProduction;
          res.clearCookie('session-id', {
            path: '/',
            httpOnly: true,
            secure: isProduction || isReplit,
            sameSite: isSliplane ? 'none' : 'lax'
          });
          console.log(`Logout completed successfully`);
          res.status(200).json({ success: true, message: "Logout completed successfully" });
        });
      });
    } else {
      console.log(`Logout attempt with missing session`);
      res.status(200).json({ success: true, message: "No active session" });
    }
  });

  app.get("/api/current-user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Endpoint for password change
  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.user as any;

    try {
      // Verify the password attuale
      const dbUser = await storage.getUserByUsername(user.username);
      if (!dbUser || !dbUser.password) {
        return res.status(400).send("Invalid account for password change");
      }

      const devAdminPw = process.env.DEV_ADMIN_PASSWORD;
      const isProd = process.env.NODE_ENV === 'production';
      const isCurrentPasswordValid = await comparePasswords(currentPassword, dbUser.password) || 
                                   (!isProd && devAdminPw && currentPassword === devAdminPw);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).send("Current password incorrect");
      }

      // Hash of the new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update the password in the database
      await storage.updateUserPassword(user.id, hashedNewPassword);

      res.status(200).json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).send("Internal server error");
    }
  });
  
  // List of staff users (admin only)
  // Endpoint spostato in staffRoutes.ts
}

// Middleware to verify that the user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  logger.debug(`🔐 MIDDLEWARE isAuthenticated called for ${req.method} ${req.path}`);
  logger.debug(`🔐 req.isAuthenticated():`, req.isAuthenticated());
  logger.debug(`🔐 req.user:`, req.user ? `${req.user.username} (ID: ${req.user.id})` : 'undefined');
  logger.debug(`🔐 Session ID:`, req.sessionID || 'No session ID');
  logger.debug(`🔐 Cookies:`, req.headers.cookie || 'No cookies');
  
  if (req.isAuthenticated()) {
    console.log('✅ User authenticated successfully in isAuthenticated middleware:', req.user.username, 'tipo:', req.user.type);
    return next();
  }
  console.log('❌ Unauthorized access attempt, no valid session');
  res.status(401).json({ message: "Unauthorized access" });
}

// Middleware to verify staff role (admin or staff)
export function isStaff(req: any, res: any, next: any) {
  if (req.isAuthenticated() && (req.user.type === "staff" || req.user.type === "admin")) {
    return next();
  }
  res.status(403).json({ message: "Access denied: staff role required" });
}

// Middleware to verify admin role
export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && (req.user.type === "admin" || req.user.role === "admin")) {
    return next();
  }
  console.log("Non-admin user:", req.user);
  res.status(403).json({ message: "Only administrators can view this page" });
}

// Middleware to verify if it is a client (includes customer as well)
export function isClient(req: any, res: any, next: any) {
  if (req.isAuthenticated() && (req.user.type === "client" || req.user.type === "customer")) {
    return next();
  }
  res.status(403).json({ message: "Access denied: client role required" });
}

// Middleware to verify if the user is accessing their own data (for clients)
export function isOwnClientData(clientIdParamName = 'clientId') {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    
    const paramClientId = parseInt(req.params[clientIdParamName]);
    
    // If it is a staff or admin user, they always have access
    if (req.user.type === "staff" || req.user.type === "admin") {
      return next();
    }
    
    // If it is a client or customer, verify they are accessing their own data
    if ((req.user.type === "client" || req.user.type === "customer") && req.user.clientId === paramClientId) {
      console.log(`Access granted to own data for client: ${req.user.username} (id: ${req.user.id}, clientId: ${req.user.clientId})`);
      return next();
    }
    
    res.status(403).json({ message: "Access denied: you cannot access other clients' data" });
  };
}