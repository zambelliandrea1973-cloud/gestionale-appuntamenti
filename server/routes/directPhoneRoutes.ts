/**
 * API per la gestione diretta dei telefoni
 */

import { Router } from 'express';
import { directPhoneService } from '../services/directPhoneService';
import { isAuthenticated, isStaff } from '../auth';

const router = Router();

/**
 * Ottiene lo stato del telefono configurato
 * Nota: Questo endpoint è pubblico per consentire la configurazione anche senza autenticazione
 */
router.get('/direct-status', async (req, res) => {
  try {
    const phoneInfo = directPhoneService.getPhoneInfo();
    
    res.json({
      success: true,
      phoneInfo
    });
  } catch (error: any) {
    console.error('Errore nel recupero dello stato del telefono:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Errore nel recupero dello stato del telefono'
    });
  }
});

/**
 * Registra un nuovo numero di telefono
 * Nota: Questo endpoint è pubblico per consentire la configurazione anche senza autenticazione
 */
router.post('/register-direct', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Numero di telefono non specificato'
      });
    }
    
    await directPhoneService.registerPhone(phoneNumber);
    
    res.json({
      success: true,
      message: 'Telefono registrato con successo'
    });
  } catch (error: any) {
    console.error('Errore nella registrazione del telefono:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Errore nella registrazione del telefono'
    });
  }
});

/**
 * Verifica un codice ricevuto via SMS
 * Nota: Questo endpoint è pubblico per consentire la configurazione anche senza autenticazione
 */
router.post('/verify-direct', async (req, res) => {
  try {
    const { phoneNumber, verificationCode } = req.body;
    
    if (!phoneNumber || !verificationCode) {
      return res.status(400).json({
        success: false,
        error: 'Numero di telefono o codice di verifica non specificato'
      });
    }
    
    await directPhoneService.verifyPhone(phoneNumber, verificationCode);
    
    res.json({
      success: true,
      message: 'Telefono verificato con successo'
    });
  } catch (error: any) {
    console.error('Errore nella verifica del telefono:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Errore nella verifica del telefono'
    });
  }
});

/**
 * Disconnette un telefono
 */
router.post('/disconnect-direct', isAuthenticated, isStaff, async (req, res) => {
  try {
    await directPhoneService.disconnectPhone();
    
    res.json({
      success: true,
      message: 'Telefono disconnesso con successo'
    });
  } catch (error: any) {
    console.error('Errore nella disconnessione del telefono:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Errore nella disconnessione del telefono'
    });
  }
});

/**
 * Invia un SMS di test
 */
router.post('/send-test-direct', isAuthenticated, isStaff, async (req, res) => {
  try {
    await directPhoneService.sendTestSms();
    
    res.json({
      success: true,
      message: 'SMS di test inviato con successo'
    });
  } catch (error: any) {
    console.error('Errore nell\'invio dell\'SMS di test:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Errore nell\'invio dell\'SMS di test'
    });
  }
});

export default router;