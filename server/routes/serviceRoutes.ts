import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

router.get("/api/services", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
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
    console.log(`🔄 [${deviceType}] Anti-cache applied for mobile services`);
  }
  
  try {
    let userServices: Array<Awaited<ReturnType<typeof storage.getServicesForUser>>[number] & { isDefault?: boolean }> =
      await storage.getServicesForUser(user.id);
    
    if (userServices.length === 0) {
      const defaultService = await storage.createService({
        userId: user.id,
        name: "Consultation",
        duration: 30,
        price: 0,
        color: "#9e9e9e"
      });
      console.log(`🆕 [/api/services] default service "Consultation" created for new user ${user.id}`);
      userServices = [{ ...defaultService, isDefault: true }];
    }
    
    console.log(`🔧 [/api/services] [${deviceType}] Loaded ${userServices.length} services from PostgreSQL for user ${user.id}`);
    res.json(userServices);
    
  } catch (error) {
    console.error("❌ [/api/services] Error loading services from PostgreSQL:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/services", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;
  
  try {
    const { name, duration, price, color } = req.body;
    const serviceData: any = {
      userId: user.id,
      name,
      duration: typeof duration === 'string' ? parseInt(duration) : duration,
      price: typeof price === 'string' ? Math.round(parseFloat(price)) : (typeof price === 'number' ? Math.round(price) : 0),
      color: color || '#3f51b5',
      // isDemo deliberately omitted: DB DEFAULT false handles it,
      // and this avoids errors on DBs where is_demo column doesn't exist yet
    };
    
    const newService = await storage.createService(serviceData);

    // Auto-cleanup: remove demo services if the user just created a real one
    if (newService && !newService.isDemo) {
      try {
        const { cleanupDemoDataIfNeeded } = await import('../services/onboardingDemoService');
        await cleanupDemoDataIfNeeded(user.id, 'services');
      } catch (cleanupErr) {
        console.error(`⚠️ [/api/services] Error cleaning up demo:`, cleanupErr);
      }
    }
    
    console.log(`✅ [/api/services] service "${newService.name}" created in PostgreSQL for user ${user.id} (ID: ${newService.id})`);
    res.status(201).json(newService);
  } catch (error) {
    console.error(`❌ [/api/services] Error creating service:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/api/services/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;
  const serviceId = parseInt(req.params.id);
  
  console.log(`✏️ [/api/services] PUT request for service ID ${serviceId} from user ${user.id}`);
  
  try {
    const updatedService = await storage.updateService(serviceId, req.body);
    
    if (!updatedService) {
      return res.status(404).json({ message: "Service not found" });
    }
    
    if (updatedService.userId !== user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    console.log(`✅ [/api/services] service ID ${serviceId} updated in PostgreSQL for user ${user.id}`);
    res.json(updatedService);
  } catch (error) {
    console.error(`❌ [/api/services] Error updating service:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/api/services/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const user = req.user as any;
  const serviceId = parseInt(req.params.id);
  
  console.log(`🗑️ [DELETE] Attempting to delete service ID ${serviceId} for user ${user.id}`);
  
  try {
    const deleted = await storage.deleteService(serviceId);
    
    if (!deleted) {
      console.log(`❌ [DELETE] Service ID ${serviceId} not found`);
      return res.status(404).json({ message: "Service not found" });
    }
    
    console.log(`✅ [DELETE] service ID ${serviceId} deleted from PostgreSQL for user ${user.id}`);
    res.json({ success: true, message: "Service deleted successfully" });
  } catch (error) {
    console.error(`❌ [DELETE] Error deleting service:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
