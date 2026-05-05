import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { consents as consentsTable } from '../../shared/schema';

const router = Router();

router.get("/api/consents/client", async (req, res) => {
  try {
    const allConsents = await db.select().from(consentsTable);
    
    console.log(`📋 [GET CONSENTS DB] Consent list request - found ${allConsents.length} consents`);
    
    res.json(allConsents);
  } catch (error) {
    console.error('❌ [GET CONSENTS ERROR]:', error);
    res.status(500).json({ error: 'Error loading consents' });
  }
});

router.post("/api/consents", async (req, res) => {
  try {
    const { clientId, consentText, consentProvided, signature } = req.body;
    const user = (req as any).user;
    
    console.log(`📋 [POST CONSENT DB] Registering consent for client ${clientId}, user: ${user?.id}`);
    
    if (!clientId) {
      return res.status(400).json({ error: 'ClientId is required' });
    }
    
    const parsedClientId = parseInt(clientId);
    const userId = user?.id || 0;
    
    const newConsent = await storage.createConsent({
      userId,
      clientId: parsedClientId,
      consentText: consentText || 'Consenso digitale GDPR',
      consentProvided: consentProvided !== undefined ? consentProvided : true,
      signature: signature || `Consenso digitale - ${new Date().toLocaleString()}`,
    });
    
    console.log(`✅ [CONSENT DB SUCCESS] Consent ID ${newConsent.id} registered for client ${parsedClientId} and hasConsent updated in database`);
    
    res.json({ 
      success: true, 
      message: 'Consenso registered successfully',
      consent: newConsent
    });
    
  } catch (error: any) {
    console.error('❌ [POST CONSENT ERROR]:', error);
    res.status(500).json({ error: 'Error registering consent' });
  }
});

export default router;
