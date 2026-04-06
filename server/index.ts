import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import initialSetupService from "./services/initialSetupService";
import { storage } from "./storage";
import path from "path";
import { scalabilityMonitorService } from "./services/scalabilityMonitorService";

// Impedisce al processo di terminare quando Replit invia SIGHUP per la gestione del container
process.on('SIGHUP', () => {
  console.log('🛡️ SIGHUP ricevuto - ignorato per stabilità del server');
});

// In sviluppo, intercetta process.exit(1) causato da errori esbuild/Vite
// quando il processo riceve segnali di sistema
if (process.env.NODE_ENV !== 'production') {
  const _originalExit = process.exit;
  process.exit = ((code?: number | string) => {
    if (code === 1) {
      console.log('🛡️ process.exit(1) intercettato in sviluppo - server continua a girare');
      return undefined as never;
    }
    return _originalExit(code as number);
  }) as typeof process.exit;
}

const app = express();

// Configura Express per fidarsi del proxy (Replit) - necessario per HTTPS corretto
app.set('trust proxy', 1);

// Inizializza storage in app.locals per accesso globale dalle routes
app.locals.storage = storage;
console.log('✅ Storage inizializzato in app.locals:', typeof app.locals.storage, 'metodi disponibili:', Object.keys(app.locals.storage).slice(0, 5).join(', '));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Serve file uploads statici
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // Inizializza il servizio di setup iniziale
  try {
    await initialSetupService.initialize();
  } catch (error) {
    console.error('Errore durante l\'inizializzazione del servizio di setup:', error);
  }

  // Avvia il monitoraggio scalabilità (controlla ogni 120 ore = 5 giorni)
  // NOTA: Da rimuovere dopo implementazione paginazione
  scalabilityMonitorService.startMonitoring(120);
  
  const server = await registerRoutes(app);

  // GLOBAL ERROR HANDLER - Cattura TUTTI gli errori e logga dettagli
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log dettagliato dell'errore per debug
    console.error('🔴 [GLOBAL ERROR HANDLER] ==================');
    console.error(`🔴 [GLOBAL ERROR] ${req.method} ${req.path}`);
    console.error('🔴 [GLOBAL ERROR] Message:', message);
    console.error('🔴 [GLOBAL ERROR] Status:', status);
    if (err.query) console.error('🔴 [GLOBAL ERROR] SQL Query:', err.query);
    if (err.sql) console.error('🔴 [GLOBAL ERROR] SQL:', err.sql);
    if (err.code) console.error('🔴 [GLOBAL ERROR] Code:', err.code);
    console.error('🔴 [GLOBAL ERROR] Stack:', err.stack);
    console.error('🔴 [GLOBAL ERROR] ==================');

    // Sempre restituisci JSON, mai HTML
    if (!res.headersSent) {
      res.status(status).json({ 
        message,
        error: process.env.NODE_ENV !== 'production' ? err.message : 'Server error'
      });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
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
