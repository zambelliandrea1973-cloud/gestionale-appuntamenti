import express from 'express';
import { contactSettingsService } from '../services/contactSettingsService';
import { insertContactSettingsSchema } from '@shared/schema';
import { z } from 'zod';

const router = express.Router();

// Middleware per verificare autenticazione
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Non autenticato' });
  }
  next();
};

/**
 * GET /api/contact-settings - Recupera le impostazioni di contatto per il tenant corrente
 */
router.get('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    console.log(`📞 GET /api/contact-settings per utente ${userId}`);
    
    const settings = await contactSettingsService.getOrCreateContactSettings(
      userId, 
      '', // defaultPhone vuoto
      '' // defaultEmail vuoto
    );
    
    res.json({
      success: true,
      settings: {
        phone: settings.phone,
        email: settings.email,
        whatsappOptIn: settings.whatsappOptIn,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Errore nel recupero impostazioni contatto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * POST /api/contact-settings - Crea o aggiorna le impostazioni di contatto
 */
router.post('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    console.log(`📞 POST /api/contact-settings per utente ${userId}`, req.body);
    
    // Validazione con schema Zod
    const updateSchema = z.object({
      phone: z.string().min(1, 'Il telefono è obbligatorio'),
      email: z.string().email('Email non valida').optional().or(z.literal('')),
      whatsappOptIn: z.boolean().optional().default(false)
    });
    
    const validatedData = updateSchema.parse(req.body);
    
    // Verifica se esistono già impostazioni
    const existingSettings = await contactSettingsService.getContactSettings(userId);
    
    let settings;
    if (existingSettings) {
      // Aggiorna impostazioni esistenti
      settings = await contactSettingsService.updateContactSettings(userId, {
        phone: validatedData.phone,
        email: validatedData.email || '',
        whatsappOptIn: validatedData.whatsappOptIn
      });
    } else {
      // Crea nuove impostazioni
      settings = await contactSettingsService.createContactSettings(
        userId,
        validatedData.phone,
        validatedData.email || '',
        validatedData.whatsappOptIn
      );
    }
    
    if (!settings) {
      throw new Error('Impossibile salvare le impostazioni');
    }
    
    res.json({
      success: true,
      message: 'Impostazioni salvate con successo',
      settings: {
        phone: settings.phone,
        email: settings.email,
        whatsappOptIn: settings.whatsappOptIn,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Errore nel salvataggio impostazioni contatto:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dati non validi',
        errors: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * PUT /api/contact-settings/whatsapp - Abilita/disabilita WhatsApp
 */
router.put('/whatsapp', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { enabled, phone } = req.body;
    
    console.log(`📞 PUT /api/contact-settings/whatsapp per utente ${userId}`, { enabled, phone });
    
    if (enabled && !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Il numero di telefono è obbligatorio per abilitare WhatsApp'
      });
    }
    
    let settings;
    if (enabled) {
      settings = await contactSettingsService.enableWhatsApp(userId, phone);
    } else {
      settings = await contactSettingsService.disableWhatsApp(userId);
    }
    
    if (!settings) {
      throw new Error('Impossibile aggiornare le impostazioni WhatsApp');
    }
    
    res.json({
      success: true,
      message: enabled ? 'WhatsApp abilitato' : 'WhatsApp disabilitato',
      settings: {
        phone: settings.phone,
        email: settings.email,
        whatsappOptIn: settings.whatsappOptIn,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * GET /api/contact-settings/status - Verifica se WhatsApp è configurato
 */
router.get('/status', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    console.log(`📞 GET /api/contact-settings/status per utente ${userId}`);
    
    const isConfigured = await contactSettingsService.isWhatsAppConfigured(userId);
    const settings = await contactSettingsService.getContactSettings(userId);
    
    res.json({
      success: true,
      whatsappConfigured: isConfigured,
      phoneInfo: settings ? {
        status: isConfigured ? 'configured' : 'not_configured',
        phoneNumber: settings.phone,
        email: settings.email,
        whatsappOptIn: settings.whatsappOptIn,
        lastUpdated: settings.updatedAt
      } : null
    });
  } catch (error) {
    console.error('Errore nella verifica stato contatto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * DELETE /api/contact-settings - Elimina le impostazioni di contatto
 */
router.delete('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    console.log(`📞 DELETE /api/contact-settings per utente ${userId}`);
    
    const deleted = await contactSettingsService.deleteContactSettings(userId);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nessuna impostazione trovata da eliminare'
      });
    }
    
    res.json({
      success: true,
      message: 'Impostazioni eliminate con successo'
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione impostazioni contatto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

export default router;