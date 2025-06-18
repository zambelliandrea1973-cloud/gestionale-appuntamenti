import { registerSimpleRoutes } from "./simple-routes";
import type { Express } from "express";
import { createServer, type Server } from "http";
import fs from 'fs';
import path from 'path';

// Caricamento dati storage per validazione QR code
function loadStorageData() {
  const storageFile = path.join(process.cwd(), 'storage_data.json');
  try {
    if (fs.existsSync(storageFile)) {
      const data = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Errore caricamento storage per QR:', error);
  }
  return { clients: [] };
}

export function registerRoutes(app: Express): Server {
  // PRIORITA ASSOLUTA: Manifest dinamico prima di tutto
  app.get('/manifest.json', (req, res) => {
    console.log('🔍 ROUTES MANIFEST: Handler dinamico chiamato');
    console.log('🔍 ROUTES MANIFEST: URL:', req.url);
    console.log('🔍 ROUTES MANIFEST: Query:', req.query);
    
    try {
      const { serveDynamicManifest } = require('./dynamic-manifest');
      serveDynamicManifest(req, res);
    } catch (error) {
      console.error('Errore manifest dinamico in routes.ts:', error);
      res.status(500).json({ error: 'Manifest non disponibile' });
    }
  });

  return registerSimpleRoutes(app);
}