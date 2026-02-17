import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { loadStorageData } from '../utils/jsonStorage';

const router = Router();

/**
 * 📱 GET /api/notification-settings - Carica impostazioni di notifica
 * Fallback JSON quando PostgreSQL non disponibile (Sliplane deployment)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Non autorizzato'
      });
    }

    // Carica dal JSON storage
    const storageData = loadStorageData();
    const notificationSettings = storageData.notificationSettings || {};
    const userSettings = notificationSettings[userId];
    
    if (userSettings) {
      console.log(`✅ [NOTIFICATION SETTINGS] Impostazioni caricate per utente ${userId}`);
      return res.json({
        success: true,
        data: userSettings
      });
    }
    
    // Impostazioni di default se non esistono
    const defaultSettings = {
      id: userId,
      emailEnabled: false,
      smtpServer: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      senderEmail: '',
      emailSignature: 'Con i migliori saluti,',
      notificationCenterEnabled: true,
      defaultReminderTime: 24,
      smsEnabled: false,
      smsGatewayMethod: 'direct',
      whatsappEnabled: false,
      whatsappMethod: 'direct',
      useContactPhoneForNotifications: true,
      preferredContactPhone: 'primary',
      notificationPhone: '',
      twilioEnabled: false
    };
    
    console.log(`📝 [NOTIFICATION SETTINGS] Restituisco impostazioni default per utente ${userId}`);
    
    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICATION SETTINGS] Errore caricamento:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 📱 POST /api/notification-settings - Salva impostazioni di notifica
 * Fallback JSON quando PostgreSQL non disponibile (Sliplane deployment)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Non autorizzato'
      });
    }

    const settingsData = req.body;
    
    // Carica JSON storage
    const storageData = loadStorageData();
    
    // Inizializza notificationSettings se non esiste
    if (!storageData.notificationSettings) {
      storageData.notificationSettings = {};
    }
    
    // Salva impostazioni per questo utente
    storageData.notificationSettings[userId] = {
      ...settingsData,
      id: userId,
      updatedAt: new Date().toISOString()
    };
    
    // Salva su file
    const storagePath = path.join(process.cwd(), 'storage_data.json');
    fs.writeFileSync(storagePath, JSON.stringify(storageData, null, 2));
    
    console.log(`✅ [NOTIFICATION SETTINGS] Impostazioni salvate per utente ${userId}`, {
      whatsappEnabled: settingsData.whatsappEnabled,
      notificationPhone: settingsData.notificationPhone
    });
    
    res.json({
      success: true,
      data: storageData.notificationSettings[userId],
      message: 'Impostazioni salvate con successo'
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICATION SETTINGS] Errore salvataggio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
