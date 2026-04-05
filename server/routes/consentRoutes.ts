import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { consents as consentsTable } from '../../shared/schema';

const router = Router();

router.get("/api/consents/client", async (req, res) => {
  try {
    const allConsents = await db.select().from(consentsTable);
    
    console.log(`📋 [GET CONSENTS DB] Richiesta lista consensi - trovati ${allConsents.length} consensi`);
    
    res.json(allConsents);
  } catch (error) {
    console.error('❌ [ERRORE GET CONSENTS]:', error);
    res.status(500).json({ error: 'Errore durante il caricamento dei consensi' });
  }
});

router.post("/api/consents", async (req, res) => {
  try {
    const { clientId, consentText, consentProvided, signature } = req.body;
    const user = (req as any).user;
    
    console.log(`📋 [POST CONSENT DB] Registrazione consenso per cliente ${clientId}, user: ${user?.id}`);
    
    if (!clientId) {
      return res.status(400).json({ error: 'ClientId è richiesto' });
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
    
    console.log(`✅ [CONSENT DB SUCCESS] Consenso ID ${newConsent.id} registrato per cliente ${parsedClientId} e hasConsent aggiornato nel database`);
    
    res.json({ 
      success: true, 
      message: 'Consenso registrato con successo',
      consent: newConsent
    });
    
  } catch (error: any) {
    console.error('❌ [ERRORE POST CONSENT]:', error);
    res.status(500).json({ error: 'Errore durante la registrazione del consenso' });
  }
});

export default router;
