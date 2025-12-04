import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupViteMiddleware, setupViteHtmlHandler, serveStatic, log } from "./vite";
import initialSetupService from "./services/initialSetupService";
import { storage } from "./storage";
import path from "path";
import { createServer } from "http";

const app = express();

// Configura Express per fidarsi del proxy (Replit) - necessario per HTTPS corretto
app.set('trust proxy', 1);

// Inizializza storage in app.locals per accesso globale dalle routes
app.locals.storage = storage;
console.log('✅ Storage inizializzato in app.locals:', typeof app.locals.storage, 'metodi disponibili:', Object.keys(app.locals.storage).slice(0, 5).join(', '));
// Aumenta il limite per il caricamento di immagini e video
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: false, limit: '1gb' }));

// Serve file uploads statici
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Crea il server HTTP prima di tutto
  const server = createServer(app);
  
  // Inizializza il servizio di setup iniziale
  try {
    await initialSetupService.initialize();
  } catch (error) {
    console.error('Errore durante l\'inizializzazione del servizio di setup:', error);
  }
  
  // IMPORTANTE: In development, configura Vite PRIMA delle routes
  // Questo permette a Vite di gestire /src/*, /@vite/*, /@react-refresh/* 
  // prima che il trialBlockMiddleware possa intercettarle
  let viteInstance: any = null;
  const expressEnv = app.get("env");
  const nodeEnv = process.env.NODE_ENV;
  console.log(`🔧 Ambiente Express: "${expressEnv}", NODE_ENV: "${nodeEnv}"`);
  
  // In Replit, l'app è sempre in development mode (npm run dev)
  const isDevelopment = expressEnv === "development" || !nodeEnv || nodeEnv === "development";
  
  if (isDevelopment) {
    viteInstance = await setupViteMiddleware(app, server);
    console.log('✅ Vite middleware configurato PRIMA delle routes');
  }
  
  // Ora registra le routes API (incluso trialBlockMiddleware)
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Alla fine, aggiungi il catch-all HTML handler di Vite (o static in production)
  if (isDevelopment && viteInstance) {
    setupViteHtmlHandler(app, viteInstance);
    console.log('✅ Vite HTML handler configurato DOPO le routes');
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
