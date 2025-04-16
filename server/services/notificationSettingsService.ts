import { notificationSettingsRepository } from '../db';
import { NotificationSettings, InsertNotificationSettings } from '@shared/schema';

/**
 * Servizio per la gestione delle impostazioni di notifica
 */
export const notificationSettingsService = {
  /**
   * Ottiene le impostazioni di notifica correnti
   * @returns Le impostazioni di notifica o undefined se non esistono
   */
  async getSettings(): Promise<NotificationSettings | undefined> {
    try {
      const settings = await notificationSettingsRepository.get();
      return settings || undefined;
    } catch (error) {
      console.error('Errore nel recupero delle impostazioni di notifica:', error);
      return undefined;
    }
  },

  /**
   * Salva nuove impostazioni di notifica
   * @param settings Impostazioni di notifica da salvare
   * @returns Le impostazioni di notifica salvate
   */
  async saveSettings(settings: InsertNotificationSettings): Promise<NotificationSettings> {
    try {
      return await notificationSettingsRepository.save(settings);
    } catch (error) {
      console.error('Errore nel salvataggio delle impostazioni di notifica:', error);
      throw error;
    }
  },

  /**
   * Aggiorna le impostazioni di notifica esistenti
   * @param id ID delle impostazioni da aggiornare
   * @param settings Impostazioni di notifica da aggiornare
   * @returns Le impostazioni di notifica aggiornate o undefined se l'aggiornamento fallisce
   */
  async updateSettings(id: number, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings | undefined> {
    try {
      return await notificationSettingsRepository.update(id, settings);
    } catch (error) {
      console.error(`Errore nell'aggiornamento delle impostazioni di notifica ${id}:`, error);
      return undefined;
    }
  },

  /**
   * Crea impostazioni di notifica predefinite se non esistono
   * @returns Le impostazioni di notifica create o esistenti
   */
  async ensureDefaultSettings(): Promise<NotificationSettings> {
    const existingSettings = await this.getSettings();
    
    if (existingSettings) {
      return existingSettings;
    }
    
    // Crea impostazioni predefinite
    const defaultSettings: InsertNotificationSettings = {
      emailEnabled: false,
      smtpServer: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      senderEmail: '',
      emailSignature: 'Con i migliori saluti,',
      notificationCenterEnabled: true,
      defaultReminderTime: 24, // 24 ore prima dell'appuntamento
      smsEnabled: false,
      smsGatewayMethod: 'direct',
      whatsappEnabled: false,
      whatsappMethod: 'direct',
      useContactPhoneForNotifications: true,
      notificationPhone: '',
      twilioEnabled: false
      // createdAt e updatedAt sono gestiti automaticamente
    };
    
    return await this.saveSettings(defaultSettings);
  }
};