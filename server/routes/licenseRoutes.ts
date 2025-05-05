/**
 * API per la gestione delle licenze
 */
import { Router } from 'express';
import { licenseService } from '../services/licenseService';
import { isAuthenticated } from '../auth';

const router = Router();

// Verifica lo stato della licenza corrente
router.get('/license-info', async (req, res) => {
  try {
    const licenseInfo = await licenseService.getCurrentLicenseInfo();
    res.json(licenseInfo);
  } catch (error) {
    console.error('Errore nel recupero delle informazioni sulla licenza:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle informazioni sulla licenza'
    });
  }
});

// Attiva una licenza con un codice
router.post('/activate-license', isAuthenticated, async (req, res) => {
  try {
    const { activationCode } = req.body;
    
    if (!activationCode) {
      return res.status(400).json({
        success: false,
        message: 'Codice di attivazione mancante'
      });
    }
    
    const result = await licenseService.activateLicense(activationCode);
    res.json(result);
  } catch (error) {
    console.error('Errore nell\'attivazione della licenza:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'attivazione della licenza'
    });
  }
});

// Endpoint per verificare se l'utente ha accesso PRO
router.get('/has-pro-access', async (req, res) => {
  try {
    const hasProAccess = await licenseService.hasProAccess();
    res.json({ hasProAccess });
  } catch (error) {
    console.error('Errore nella verifica dell\'accesso PRO:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella verifica dell\'accesso PRO'
    });
  }
});

// Endpoint per generare un codice (solo per sviluppo/test)
router.post('/generate-code', isAuthenticated, async (req, res) => {
  try {
    const { licenseType } = req.body;
    
    if (!licenseType) {
      return res.status(400).json({
        success: false,
        message: 'Tipo di licenza mancante'
      });
    }
    
    // Verifica che il tipo di licenza sia valido
    if (!['trial', 'base', 'pro'].includes(licenseType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo di licenza non valido'
      });
    }
    
    const activationCode = await licenseService.generateActivationCode(licenseType);
    res.json({
      success: true,
      activationCode
    });
  } catch (error) {
    console.error('Errore nella generazione del codice:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella generazione del codice'
    });
  }
});

// Endpoint per ottenere il titolo dell'applicazione
router.get('/application-title', async (req, res) => {
  try {
    const title = await licenseService.getApplicationTitle();
    res.json({ title });
  } catch (error) {
    console.error('Errore nel recupero del titolo dell\'applicazione:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del titolo dell\'applicazione'
    });
  }
});

export default router;