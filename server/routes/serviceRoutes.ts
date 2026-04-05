import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

router.get("/api/services", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const deviceType = req.headers['x-device-type'] || (isMobile ? 'mobile' : 'desktop');
  
  if (isMobile) {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': `mobile-services-${Date.now()}`,
      'Last-Modified': new Date().toUTCString()
    });
    console.log(`🔄 [${deviceType}] Anti-cache applicato per servizi mobile`);
  }
  
  try {
    const userServices = await storage.getServicesForUser(user.id);
    
    console.log(`🔧 [/api/services] [${deviceType}] Caricati ${userServices.length} servizi da PostgreSQL per utente ${user.id}`);
    res.json(userServices);
    
  } catch (error) {
    console.error("❌ [/api/services] Errore caricamento servizi da PostgreSQL:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.post("/api/services", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  
  try {
    const { name, duration, price, color } = req.body;
    const serviceData = {
      userId: user.id,
      name,
      duration: typeof duration === 'string' ? parseInt(duration) : duration,
      price: typeof price === 'string' ? Math.round(parseFloat(price)) : (typeof price === 'number' ? Math.round(price) : 0),
      color: color || '#3f51b5'
    };
    
    const newService = await storage.createService(serviceData);
    
    console.log(`✅ [/api/services] Servizio "${newService.name}" creato in PostgreSQL per utente ${user.id} (ID: ${newService.id})`);
    res.status(201).json(newService);
  } catch (error) {
    console.error(`❌ [/api/services] Errore creazione servizio:`, error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.put("/api/services/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  const serviceId = parseInt(req.params.id);
  
  console.log(`✏️ [/api/services] PUT richiesta per servizio ID ${serviceId} da utente ${user.id}`);
  
  try {
    const updatedService = await storage.updateService(serviceId, req.body);
    
    if (!updatedService) {
      return res.status(404).json({ message: "Servizio non trovato" });
    }
    
    if (updatedService.userId !== user.id) {
      return res.status(403).json({ message: "Accesso negato" });
    }
    
    console.log(`✅ [/api/services] Servizio ID ${serviceId} aggiornato in PostgreSQL per utente ${user.id}`);
    res.json(updatedService);
  } catch (error) {
    console.error(`❌ [/api/services] Errore aggiornamento servizio:`, error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

router.delete("/api/services/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Non autenticato" });
  const user = req.user as any;
  const serviceId = parseInt(req.params.id);
  
  console.log(`🗑️ [DELETE] Tentativo eliminazione servizio ID ${serviceId} per utente ${user.id}`);
  
  try {
    const deleted = await storage.deleteService(serviceId);
    
    if (!deleted) {
      console.log(`❌ [DELETE] Servizio ID ${serviceId} non trovato`);
      return res.status(404).json({ message: "Servizio non trovato" });
    }
    
    console.log(`✅ [DELETE] Servizio ID ${serviceId} eliminato da PostgreSQL per utente ${user.id}`);
    res.json({ success: true, message: "Servizio eliminato con successo" });
  } catch (error) {
    console.error(`❌ [DELETE] Errore eliminazione servizio:`, error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

export default router;
