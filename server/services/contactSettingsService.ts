import { storage } from '../storage';
import type { ContactSettings, InsertContactSettings } from '@shared/schema';

export class ContactSettingsService {
  
  /**
   * Recupera le impostazioni di contatto per un tenant (utilizzando tenantId dall'autenticazione)
   */
  async getContactSettings(tenantId: number): Promise<ContactSettings | undefined> {
    console.log(`🔧 ContactSettingsService: Recupero impostazioni per tenant ${tenantId}`);
    return await storage.getContactSettings(tenantId);
  }

  /**
   * Crea nuove impostazioni di contatto per un tenant
   */
  async createContactSettings(tenantId: number, phone: string, email: string, whatsappOptIn: boolean = false): Promise<ContactSettings> {
    console.log(`🔧 ContactSettingsService: Creazione impostazioni per tenant ${tenantId}`, {
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
   * Aggiorna le impostazioni di contatto esistenti
   */
  async updateContactSettings(tenantId: number, updates: Partial<Pick<InsertContactSettings, 'phone' | 'email' | 'whatsappOptIn'>>): Promise<ContactSettings | undefined> {
    console.log(`🔧 ContactSettingsService: Aggiornamento impostazioni per tenant ${tenantId}`, updates);
    return await storage.updateContactSettings(tenantId, updates);
  }

  /**
   * Elimina le impostazioni di contatto per un tenant
   */
  async deleteContactSettings(tenantId: number): Promise<boolean> {
    console.log(`🔧 ContactSettingsService: Eliminazione impostazioni per tenant ${tenantId}`);
    return await storage.deleteContactSettings(tenantId);
  }

  /**
   * Ottiene o crea le impostazioni di contatto per un tenant
   * Se non esistono, le crea con valori di default
   */
  async getOrCreateContactSettings(tenantId: number, defaultPhone?: string, defaultEmail?: string): Promise<ContactSettings> {
    console.log(`🔧 ContactSettingsService: Recupero o creazione impostazioni per tenant ${tenantId}`);
    
    let settings = await this.getContactSettings(tenantId);
    
    if (!settings) {
      console.log(`📞 Impostazioni non trovate per tenant ${tenantId}, creazione con valori default`);
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
   * Verifica se WhatsApp è configurato e attivo per un tenant
   */
  async isWhatsAppConfigured(tenantId: number): Promise<boolean> {
    console.log(`🔧 ContactSettingsService: Verifica configurazione WhatsApp per tenant ${tenantId}`);
    
    const settings = await this.getContactSettings(tenantId);
    
    if (!settings) {
      console.log(`⚠️ Nessuna impostazione trovata per tenant ${tenantId}`);
      return false;
    }

    const isConfigured = settings.whatsappOptIn && settings.phone && settings.phone.trim() !== '';
    console.log(`📱 WhatsApp configurato per tenant ${tenantId}: ${isConfigured}`, {
      phone: settings.phone,
      whatsappOptIn: settings.whatsappOptIn
    });
    
    return isConfigured;
  }

  /**
   * Abilitazione rapida di WhatsApp per un tenant con numero di telefono
   */
  async enableWhatsApp(tenantId: number, phone: string): Promise<ContactSettings | undefined> {
    console.log(`🔧 ContactSettingsService: Abilitazione WhatsApp per tenant ${tenantId} con telefono ${phone}`);
    
    return await this.updateContactSettings(tenantId, {
      phone,
      whatsappOptIn: true
    });
  }

  /**
   * Disabilitazione WhatsApp per un tenant
   */
  async disableWhatsApp(tenantId: number): Promise<ContactSettings | undefined> {
    console.log(`🔧 ContactSettingsService: Disabilitazione WhatsApp per tenant ${tenantId}`);
    
    return await this.updateContactSettings(tenantId, {
      whatsappOptIn: false
    });
  }
}

export const contactSettingsService = new ContactSettingsService();