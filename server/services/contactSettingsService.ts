import { logger } from '../utils/logger';
import { storage } from '../storage';
import type { ContactSettings, InsertContactSettings } from '../../shared/schema';

export class ContactSettingsService {
  
  /**
   * Retrieve contact settings for a tenant (using tenantId from authentication)
   */
  async getContactSettings(tenantId: number): Promise<ContactSettings | undefined> {
    logger.debug(`🔧 ContactSettingsService: Retrieving settings for tenant ${tenantId}`);
    return await storage.getContactSettings(tenantId);
  }

  /**
   * Create new contact settings for a tenant
   */
  async createContactSettings(tenantId: number, phone: string, email: string, whatsappOptIn: boolean = false): Promise<ContactSettings> {
    logger.debug(`🔧 ContactSettingsService: Creating settings for tenant ${tenantId}`, {
      phone,
      email,
      whatsappOptIn
    });

    const settings: InsertContactSettings = {
      tenantId,
      phone,
      email,
      whatsappOptIn
    };

    return await storage.createContactSettings(settings);
  }

  /**
   * Update existing contact settings
   */
  async updateContactSettings(tenantId: number, updates: Partial<Pick<InsertContactSettings, 'phone' | 'email' | 'whatsappOptIn'>>): Promise<ContactSettings | undefined> {
    logger.debug(`🔧 ContactSettingsService: Updating settings for tenant ${tenantId}`, updates);
    return await storage.updateContactSettings(tenantId, updates);
  }

  /**
   * Delete contact settings for a tenant
   */
  async deleteContactSettings(tenantId: number): Promise<boolean> {
    logger.debug(`🔧 ContactSettingsService: Deleting settings for tenant ${tenantId}`);
    return await storage.deleteContactSettings(tenantId);
  }

  /**
   * Get or create contact settings for a tenant
   * If they exist, create them with default values
   */
  async getOrCreateContactSettings(tenantId: number, defaultPhone?: string, defaultEmail?: string): Promise<ContactSettings> {
    logger.debug(`🔧 ContactSettingsService: Retrieving or creating settings for tenant ${tenantId}`);
    
    let settings = await this.getContactSettings(tenantId);
    
    if (!settings) {
      logger.debug(`📞 Settings not found for tenant ${tenantId}, creating with default values`);
      settings = await this.createContactSettings(
        tenantId,
        defaultPhone || '',
        defaultEmail || '',
        false
      );
    }
    
    return settings;
  }

  /**
   * Check if WhatsApp is configured and active for a tenant
   */
  async isWhatsAppConfigured(tenantId: number): Promise<boolean> {
    logger.debug(`🔧 ContactSettingsService: Verify WhatsApp configuration for tenant ${tenantId}`);
    
    const settings = await this.getContactSettings(tenantId);
    
    if (!settings) {
      console.log(`⚠️ No settings found for tenant ${tenantId}`);
      return false;
    }

    const isConfigured = !!(settings.whatsappOptIn && settings.phone && settings.phone.trim() !== '');
    logger.debug(`📱 WhatsApp configured for tenant ${tenantId}: ${isConfigured}`, {
      phone: settings.phone,
      whatsappOptIn: settings.whatsappOptIn
    });
    
    return isConfigured;
  }

  /**
   * Quick WhatsApp activation for a tenant with a phone number
   */
  async enableWhatsApp(tenantId: number, phone: string): Promise<ContactSettings | undefined> {
    logger.debug(`🔧 ContactSettingsService: Enabling WhatsApp for tenant ${tenantId} with phone ${phone}`);
    
    return await this.updateContactSettings(tenantId, {
      phone,
      whatsappOptIn: true
    });
  }

  /**
   * WhatsApp deactivation for a tenant
   */
  async disableWhatsApp(tenantId: number): Promise<ContactSettings | undefined> {
    logger.debug(`🔧 ContactSettingsService: Disabling WhatsApp for tenant ${tenantId}`);
    
    return await this.updateContactSettings(tenantId, {
      whatsappOptIn: false
    });
  }
}

export const contactSettingsService = new ContactSettingsService();