import { notificationSettingsRepository } from '../db';
import { NotificationSettings, InsertNotificationSettings } from '../../shared/schema';

/**
 * Service for managing notification settings
 */
export const notificationSettingsService = {
  /**
   * Get the current notification settings
   * @returns The notification settings or undefined if they exist
   */
  async getSettings(): Promise<NotificationSettings | undefined> {
    try {
      const settings = await notificationSettingsRepository.get();
      return settings || undefined;
    } catch (error) {
      console.error('Error retrieving notification settings:', error);
      return undefined;
    }
  },

  /**
   * Save new notification settings
   * @param settings Notification settings to save
   * @returns The saved notification settings
   */
  async saveSettings(settings: InsertNotificationSettings): Promise<NotificationSettings> {
    try {
      return await notificationSettingsRepository.save(settings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      throw error;
    }
  },

  /**
   * Update existing notification settings
   * @param id ID of the settings to update
   * @param settings Notification settings to update
   * @returns The updated notification settings or undefined if the update fails
   */
  async updateSettings(id: number, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings | undefined> {
    try {
      return await notificationSettingsRepository.update(id, settings);
    } catch (error) {
      console.error(`Error updating notification settings ${id}:`, error);
      return undefined;
    }
  },

  /**
   * Create default notification settings if they exist
   * @returns The notification settings created or existing
   */
  async ensureDefaultSettings(): Promise<NotificationSettings> {
    const existingSettings = await this.getSettings();
    
    if (existingSettings) {
      return existingSettings;
    }
    
    // Create default settings
    const defaultSettings: InsertNotificationSettings = {
      emailEnabled: false,
      smtpServer: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      senderEmail: '',
      emailSignature: 'Best regards,',
      notificationCenterEnabled: true,
      defaultReminderTime: 24, // 24 hours before the appointment
      smsEnabled: false,
      smsGatewayMethod: 'direct',
      whatsappEnabled: false,
      whatsappMethod: 'direct',
      useContactPhoneForNotifications: true,
      preferredContactPhone: 'primary',
      notificationPhone: '',
      twilioEnabled: false
      // createdAt and updatedAt are managed automatically
    };
    
    return await this.saveSettings(defaultSettings);
  }
};