import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import initialSetupService from "./services/initialSetupService";
import { storage, ensureSessionTable } from "./storage";
import path from "path";
import { scalabilityMonitorService } from "./services/scalabilityMonitorService";

// Prevents the process from terminating when Replit sends SIGHUP for container management
process.on('SIGHUP', () => {
  console.log('🛡️ SIGHUP received - ignored for server stability');
});

// In sviluppo, intercetta process.exit(1) causato da errors esbuild/Vite
// when the process receives system signals
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

// Configure Express to trust the proxy (Replit) - required for correct HTTPS
app.set('trust proxy', 1);

// Initialize storage in app.locals for global access from routes
app.locals.storage = storage;
console.log('✅ Storage initialized in app.locals:', typeof app.locals.storage, 'available methods:', Object.keys(app.locals.storage).slice(0, 5).join(', '));

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
  // Ensures the user_sessions table exists in the DB before any required operation
  await ensureSessionTable();

  // Initialize the service di setup iniziale
  try {
    await initialSetupService.initialize();
  } catch (error) {
    console.error('Error during setup service initialization:', error);
  }

  // Start scalability monitoring (checks every 120 hours = 5 days)
  // NOTE: To be removed after pagination implementation
  scalabilityMonitorService.startMonitoring(120);
  
  const server = await registerRoutes(app);

  // GLOBAL ERROR HANDLER - Captures ALL errors and logs details
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log dettagliato of the error per debug
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
    // Prevent the browser from caching index.html, the service worker, and
    // the PWA manifest so that every deploy is picked up immediately without
    // a manual hard-refresh.
    // This covers:
    //   - Explicit index.html requests (/ and /index.html)
    //   - All SPA deep-link routes (/dashboard, /orders/123, etc.) which also
    //     receive index.html content via the catch-all in serveStatic
    //   - The service worker file
    //   - PWA manifest files (manifest.json / manifest.webmanifest)
    // Static assets (JS/CSS bundles, images, fonts) keep their normal caching.
    app.use((req, res, next) => {
      const p = req.path;
      const isServiceWorker = p.endsWith("service-worker.js");
      const isManifest = p.endsWith("manifest.json") || p.endsWith("manifest.webmanifest");
      // Paths without a file extension are SPA routes served with index.html.
      // Also catch explicit /index.html requests.
      const isSpaShell = !p.includes(".") || p === "/index.html";
      // PWA icon paths: dynamic per-owner icons and static fallback icons must
      // always be fresh so that icon or theme-color changes are visible immediately
      // after a deploy without waiting for browser cache to expire.
      const isPwaIcon = p.startsWith("/pwa-icon/") || p.startsWith("/icons/");
      if (isServiceWorker || isManifest || isSpaShell || isPwaIcon) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
      next();
    });
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
