/**
 * API per la gestione delle licenze
 */
import { Router } from 'express';
import { licenseService } from '../services/licenseService';
import { isAuthenticated } from '../auth';
import { db } from '../db';
import { licenses } from '../../shared/schema';
import { LicenseType } from '../services/licenseService';

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

// Endpoint per verificare se l'utente ha accesso BUSINESS
router.get('/has-business-access', async (req, res) => {
  try {
    const hasBusinessAccess = await licenseService.hasBusinessAccess();
    res.json({ hasBusinessAccess });
  } catch (error) {
    console.error('Errore nella verifica dell\'accesso BUSINESS:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella verifica dell\'accesso BUSINESS'
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
    if (!Object.values(LicenseType).includes(licenseType)) {
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

// Endpoint per creare un codice di attivazione permanente
router.post('/create-permanent-code', isAuthenticated, async (req, res) => {
  try {
    const { code, licenseType, password } = req.body;
    
    // Verifica la password di amministrazione
    if (password !== 'gironico') {
      return res.status(401).json({
        success: false,
        message: 'Password amministratore non valida'
      });
    }
    
    // Verifica del tipo di licenza
    if (!licenseType || !Object.values(LicenseType).includes(licenseType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo di licenza non valido o non specificato'
      });
    }
    
    // Formatta il codice rimuovendo spazi e convertendo in maiuscolo
    const formattedCode = code.replace(/\s/g, '').toUpperCase();
    
    // Controlla se il codice esiste già
    const existingLicense = await db.query.licenses.findFirst({
      where: (licenses, { eq }) => eq(licenses.code, formattedCode)
    });
    
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'Questo codice esiste già nel sistema'
      });
    }
    
    // Inserisci la nuova licenza permanente (senza data di scadenza)
    await db.insert(licenses).values({
      code: formattedCode,
      type: licenseType,
      isActive: true,         // Già attivo
      createdAt: new Date(),
      activatedAt: new Date(), // Già attivato
      expiresAt: null         // Nessuna scadenza (permanente)
    });
    
    // Formatta il codice per la visualizzazione
    const displayCode = `${formattedCode.substring(0, 4)} ${formattedCode.substring(4, 8)} ${formattedCode.substring(8, 12)} ${formattedCode.substring(12, 16)}`;
    
    res.json({
      success: true,
      message: 'Codice di attivazione permanente creato con successo',
      code: displayCode,
      type: licenseType
    });
  } catch (error) {
    console.error('Errore nella creazione del codice permanente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione del codice permanente'
    });
  }
});

// Endpoint specifico per creare il codice passepartout richiesto
router.post('/create-passepartout', isAuthenticated, async (req, res) => {
  try {
    const { password } = req.body;
    
    // Verifica la password di amministrazione
    if (password !== 'gironico') {
      return res.status(401).json({
        success: false,
        message: 'Password amministratore non valida'
      });
    }
    
    // Codice passepartout richiesto (senza spazi)
    const rawCode = '0103197320091979';
    
    // Controlla se il codice esiste già
    const existingLicense = await db.query.licenses.findFirst({
      where: (licenses, { eq }) => eq(licenses.code, rawCode)
    });
    
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'Il codice passepartout esiste già nel sistema'
      });
    }
    
    // Inserisci la nuova licenza passepartout permanente
    await db.insert(licenses).values({
      code: rawCode,
      type: LicenseType.PASSEPARTOUT,  // Licenza con accesso a tutte le funzionalità
      isActive: true,                 // Già attivo
      createdAt: new Date(),
      activatedAt: new Date(),        // Già attivato
      expiresAt: null                 // Nessuna scadenza (permanente)
    });
    
    // Formatta il codice per la visualizzazione
    const displayCode = `${rawCode.substring(0, 4)} ${rawCode.substring(4, 8)} ${rawCode.substring(8, 12)} ${rawCode.substring(12, 16)}`;
    
    res.json({
      success: true,
      message: 'Codice passepartout creato con successo',
      code: displayCode,
      type: LicenseType.PASSEPARTOUT
    });
  } catch (error) {
    console.error('Errore nella creazione del codice passepartout:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione del codice passepartout'
    });
  }
});

export default router;