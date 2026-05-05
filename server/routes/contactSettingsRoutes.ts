import express from 'express';
import { contactSettingsService } from '../services/contactSettingsService';
import { insertContactSettingsSchema } from '../../shared/schema';
import { z } from 'zod';

const router = express.Router();

// Middleware to verify authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  next();
};

/**
 * GET /api/contact-settings - Retrieve contact settings for the current tenant
 */
router.get('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    console.log(`📞 GET /api/contact-settings for user ${userId}`);
    
    const settings = await contactSettingsService.getOrCreateContactSettings(
      userId, 
      '', // empty defaultPhone
      '' // empty defaultEmail
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
    console.error('Error retrieving contact settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/contact-settings - Create or update contact settings
 */
router.post('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    console.log(`📞 POST /api/contact-settings for user ${userId}`, req.body);
    
    // Validazione con schema Zod
    const updateSchema = z.object({
      phone: z.string().min(1, 'Phone is required'),
      email: z.string().email('Email invalid').optional().or(z.literal('')),
      whatsappOptIn: z.boolean().optional().default(false)
    });
    
    const validatedData = updateSchema.parse(req.body);
    
    // Check if esistono already settings
    const existingSettings = await contactSettingsService.getContactSettings(userId);
    
    let settings;
    if (existingSettings) {
      // Update settings esistenti
      settings = await contactSettingsService.updateContactSettings(userId, {
        phone: validatedData.phone,
        email: validatedData.email || '',
        whatsappOptIn: validatedData.whatsappOptIn
      });
    } else {
      // Create new settings
      settings = await contactSettingsService.createContactSettings(
        userId,
        validatedData.phone,
        validatedData.email || '',
        validatedData.whatsappOptIn
      );
    }
    
    if (!settings) {
      throw new Error('Unable to save settings');
    }
    
    res.json({
      success: true,
      message: 'Settings saved successfully',
      settings: {
        phone: settings.phone,
        email: settings.email,
        whatsappOptIn: settings.whatsappOptIn,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error saving contact settings:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid data',
        errors: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/contact-settings/whatsapp - Enable/disabilita WhatsApp
 */
router.put('/whatsapp', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { enabled, phone } = req.body;
    
    console.log(`📞 PUT /api/contact-settings/whatsapp for user ${userId}`, { enabled, phone });
    
    if (enabled && !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number is required to enable WhatsApp'
      });
    }
    
    let settings;
    if (enabled) {
      settings = await contactSettingsService.enableWhatsApp(userId, phone);
    } else {
      settings = await contactSettingsService.disableWhatsApp(userId);
    }
    
    if (!settings) {
      throw new Error('Unable to update WhatsApp settings');
    }
    
    res.json({
      success: true,
      message: enabled ? 'WhatsApp enabled' : 'WhatsApp disabled',
      settings: {
        phone: settings.phone,
        email: settings.email,
        whatsappOptIn: settings.whatsappOptIn,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/contact-settings/status - Check if WhatsApp is configured
 */
router.get('/status', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    console.log(`📞 GET /api/contact-settings/status for user ${userId}`);
    
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
    console.error('Error verifying contact status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/contact-settings - Delete contact settings
 */
router.delete('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    console.log(`📞 DELETE /api/contact-settings for user ${userId}`);
    
    const deleted = await contactSettingsService.deleteContactSettings(userId);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: 'No settings found to delete'
      });
    }
    
    res.json({
      success: true,
      message: 'Settings deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;