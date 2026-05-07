import { logger } from '../utils/logger';
import { format, addDays } from 'date-fns';
import { Appointment, NotificationSettings } from '../../shared/schema';
import { storage } from '../storage';
import { notificationSettingsService } from './notificationSettingsService';
import nodemailer from 'nodemailer';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';

const messagesPendingDelivery = new Map<string, boolean>();

/**
 * Interface definition for the phoneDeviceService module
 * to avoid circular import problems
 */
interface PhoneDeviceInterface {
  getStatus(): { status: string; deviceId: string | null; phoneNumber: string | null };
  sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Service for sending notifications and reminders via direct methods
 * without depending on external services like Twilio
 */
export const directNotificationService = {
  /**
   * Verify the notification settings
   * @returns The notification settings, or null if they have been configured
   */
  async getNotificationSettings() {
    try {
      return await notificationSettingsService.getSettings();
    } catch (error) {
      console.error('Error retrieving notification settings:', error);
      return null;
    }
  },

  /**
   * Get the phone number to use for notifications
   * @returns The phone number to use for notifications, or null if configured
   */
  async getNotificationPhone(): Promise<string | null> {
    try {
      const settings = await this.getNotificationSettings();
      
      // If it is configured to use a dedicated phone number and it is set
      if (settings && !settings.useContactPhoneForNotifications && settings.notificationPhone) {
        return settings.notificationPhone;
      }
      
      // otherwise, retrieve the phone number from contacts based on preference
      const contactService = await import('./contactService');
      const contactInfo = await contactService.contactService.getContactInfo();
      
      if (settings?.preferredContactPhone === 'secondary' && contactInfo.phone2) {
        return contactInfo.phone2;
      } else {
        return contactInfo.phone1 || contactInfo.phone2 || null;
      }
    } catch (error) {
      console.error('Error retrieving phone number for notifications:', error);
      return null;
    }
  },

  /**
   * Generate a direct link to WhatsApp
   * @param to Recipient phone number in international format (e.g. +39123456789)
   * @param message Message text to send
   * @returns URL to open WhatsApp with the pre-filled message
   */
  generateWhatsAppLink(to: string, message: string): string {
    // Format the number if it starts with "+"
    const formattedTo = to.startsWith('+') ? to.substring(1) : to;
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    return `https://wa.me/${formattedTo}?text=${encodedMessage}`;
  },
  
  /**
   * Generate a WhatsApp link and add a notification to the notification center
   * @param client Client data
   * @param message Message text
   * @param appointmentId Appointment ID
   * @param appointmentDate Formatted appointment date
   * @returns true if the operation succeeded
   */
  async generateWhatsAppLinkAndNotify(
    client: any, 
    message: string, 
    appointmentId: number, 
    appointmentDate: string
  ): Promise<boolean> {
    try {
      if (!client.phone) return false;
      
      const whatsappLink = this.generateWhatsAppLink(client.phone, message);
      
      await this.addToNotificationCenter(
        0, // Special ID for the professional 
        `📱 WhatsApp reminder sent to client ${client.firstName} ${client.lastName} for appointment on ${appointmentDate}. [Open WhatsApp](${whatsappLink})`,
        'staff_reminder',
        appointmentId
      );
      
      console.log(`Generated WhatsApp link for appointment ${appointmentId}: ${whatsappLink}`);
      return true;
    } catch (error) {
      console.error('Error generating WhatsApp link:', error);
      return false;
    }
  },

  /**
   * Send an email message using SMTP
   * @param to Recipient email address
   * @param subject Email subject
   * @param message Email body text
   * @returns Promise that resolves to true if sending succeeded
   * @throws Error If a problem occurs during sending
   */
  async sendEmail(to: string, subject: string, message: string): Promise<boolean> {
    try {
      const settings = await this.getNotificationSettings();
      
      if (!settings) {
        console.error('Email configuration not found');
        throw new Error('Email configuration not found. Save your settings first.');
      }
      
      if (!settings.emailEnabled) {
        console.error('Email notifications not enabled');
        throw new Error('Email notifications are not enabled.');
      }
      
      if (!settings.smtpServer || !settings.smtpUsername || !settings.smtpPassword) {
        console.error('Incomplete SMTP configuration', {
          server: !!settings.smtpServer, 
          username: !!settings.smtpUsername, 
          password: !!settings.smtpPassword
        });
        throw new Error('Incomplete SMTP configuration. Verify all required fields.');
      }
      
      // Create SMTP transporter with debug handling
      const transporter = nodemailer.createTransport({
        host: settings.smtpServer,
        port: settings.smtpPort || 587,
        secure: settings.smtpPort === 465, // true per porta 465, false per altre porte
        auth: {
          user: settings.smtpUsername,
          pass: settings.smtpPassword,
        },
        // Enable debug for connection details
        debug: true,
        logger: true
      });
      
      // Verify the connection before sending
      try {
        await transporter.verify();
        console.log('SMTP connection verified successfully');
      } catch (verifyError) {
        console.error('Error verifying SMTP connection:', verifyError);
        throw verifyError; // Propagate the error to be handled in the main handler
      }
      
      const mailOptions = {
        from: settings.senderEmail || settings.smtpUsername,
        to,
        subject,
        text: message,
        html: message.replace(/\n/g, '<br>'),
      };
      
      console.log(`Attempting to send email to ${to} using ${settings.smtpServer}:${settings.smtpPort}`);
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('Error sending email:', error);
      
      // Propagate the full error to allow the endpoint to handle it specifically
      throw error;
    }
  },

  /**
   * Add a notification to the notification center
   * @param clientId Client ID
   * @param appointmentId Appointment ID (optional)
   * @param message Notification text
   * @param type Notification type
   * @returns Promise that resolves to true if the notification was created
   */
  async addToNotificationCenter(
    clientId: number, 
    message: string, 
    type: string = 'appointment_reminder',
    appointmentId?: number, 
    scheduledFor?: Date
  ): Promise<boolean> {
    try {
      // MIGRATED TO JSON: Save to adminNotifications instead of PostgreSQL
      const storageData = loadStorageData();
      
      if (!storageData.adminNotifications) {
        storageData.adminNotifications = [];
      }
      
      storageData.adminNotifications.push({
        id: Date.now(),
        clientId,
        appointmentId,
        type,
        message,
        timestamp: (scheduledFor || new Date()).toISOString(),
        read: false,
        channel: 'app'
      });
      
      saveStorageData(storageData);
      logger.debug(`✅ Notification added to JSON notification center for client ${clientId}`);
      return true;
    } catch (error) {
      console.error('Error adding notification to notification center:', error);
      return false;
    }
  },

  /**
   * Send a reminder for an appointment using configured methods
   * @param appointment The appointment for which to send the reminder
   * @returns true if the reminder was sent or added to the notification center
   */
  async sendAppointmentReminder(appointment: Appointment): Promise<boolean> {
    try {
      // Verify that the appointment has a specified reminder type and a clientId
      if (!appointment.reminderType || !appointment.clientId) {
        console.error(`Unable to send reminder: missing appointment data`, appointment);
        return false;
      }
      
      // Retrieve client date
      const client = await storage.getClient(appointment.clientId);
      if (!client) {
        console.error(`Client not found for appointment ${appointment.id}`);
        return false;
      }
      
      // Retrieve the notification settings
      const settings = await this.getNotificationSettings();
      
      // Retrieve the data of the service
      const service = appointment.serviceId ? await storage.getService(appointment.serviceId) : null;
      
      // Format the appointment date and time
      const appointmentDate = format(new Date(appointment.date), 'dd/MM/yyyy');
      const startTime = appointment.startTime.substring(0, 5); // Extract HH:MM only
      
      // Try to retrieve a custom template
      let reminderTemplate = null;
      if (appointment.serviceId) {
        // First look for a specific template for this service
        reminderTemplate = await storage.getReminderTemplateByService(appointment.serviceId);
      }
      
      // If a specific template is found, use the default one
      if (!reminderTemplate) {
        reminderTemplate = await storage.getDefaultReminderTemplate();
      }
      
      // Prepare the message - if a template exists use it, otherwise use a default message
      let message = '';
      if (reminderTemplate) {
        // Replace placeholders in the template with actual data
        message = reminderTemplate.template
          .replace('{{nome}}', client.firstName)
          .replace('{{cognome}}', client.lastName)
          .replace('{{servizio}}', service ? service.name : 'appointment')
          .replace('{{data}}', appointmentDate)
          .replace('{{ora}}', startTime);
      } else {
        // Default message with date and time included
        message = `Dear ${client.firstName}, this is a reminder for your appointment${service ? ` for ${service.name}` : ''} on ${appointmentDate} at ${startTime}. For changes or cancellations, please contact us.`;
      }
      
      // Generate a unique ID for this message
      const messageId = `${appointment.id}-${appointment.date}-${appointment.startTime}`;
      
      // Check if the message is already pending sending to avoid duplicates
      if (messagesPendingDelivery.get(messageId)) {
        console.log(`Message already pending for appointment ${appointment.id}`);
        return false;
      }
      
      // Set the flag to avoid duplicate sends
      messagesPendingDelivery.set(messageId, true);
      
      // Always add the notification to the notification center (if enabled)
      let successCount = 0;
      
      try {
        // Check if the notification center is enabled (default: true)
        if (!settings || settings.notificationCenterEnabled !== false) {
          const added = await this.addToNotificationCenter(
            client.id, 
            message, 
            'appointment_reminder', 
            appointment.id
          );
          
          if (added) {
            successCount++;
            console.log(`Notification added to notification center for appointment ${appointment.id}`);
          }
        }
        
        // Send email if enabled and configured
        if (settings?.emailEnabled && client.email) {
          const emailSubject = `Appointment Reminder for ${appointmentDate}`;
          const sent = await this.sendEmail(client.email, emailSubject, message);
          if (sent) {
            successCount++;
            console.log(`Email sent successfully for appointment ${appointment.id}`);
          }
        }
        
        // For SMS and WhatsApp, use phoneDeviceService if available,
        // otherwise generate links as fallback
        
        // Check if the device is paired and connected
        let phoneDevice = null;
        let deviceConnected = false;
        
        try {
          // Dynamic import to avoid circular dependencies
          const phoneDeviceModule = await import('./phoneDeviceService');
          phoneDevice = phoneDeviceModule.phoneDeviceService;
          
          const status = phoneDevice.getStatus();
          deviceConnected = status.status === phoneDeviceModule.DeviceStatus.CONNECTED;
        } catch (error) {
          console.warn('phoneDevice service not available:', error);
        }
        
        // WhatsApp message handling
        if (client.phone && settings?.whatsappEnabled) {
          if (deviceConnected && phoneDevice) {
            try {
              // Send the message directly via the device
              const result = await phoneDevice.sendWhatsAppMessage(client.phone, message);
              
              if (result.success) {
                console.log(`WhatsApp sent automatically for appointment ${appointment.id} via paired device`);
                successCount++;
                
                // Also add a notification to the notification center
                await this.addToNotificationCenter(
                  0, // Special ID for the professional 
                  `✅ WhatsApp reminder automatically sent to client ${client.firstName} ${client.lastName} for appointment on ${appointmentDate}.`,
                  'staff_reminder',
                  appointment.id
                );
              } else {
                console.error(`Error sending automatic WhatsApp: ${result.error}`);
                
                // Fallback: generate traditional WhatsApp link
                this.generateWhatsAppLinkAndNotify(client, message, appointment.id, appointmentDate);
                successCount++;
              }
            } catch (error) {
              console.error(`Error attempting direct WhatsApp send:`, error);
              
              // Fallback: generate traditional WhatsApp link
              this.generateWhatsAppLinkAndNotify(client, message, appointment.id, appointmentDate);
              successCount++;
            }
          } else {
            // Device not available, generate traditional WhatsApp link
            this.generateWhatsAppLinkAndNotify(client, message, appointment.id, appointmentDate);
            successCount++;
          }
        }
        
        // Update the reminder status
        if (successCount > 0) {
          await storage.updateAppointment(appointment.id, { reminderStatus: 'sent' });
          console.log(`Reminder sent/generated successfully for appointment ${appointment.id}`);
        } else {
          await storage.updateAppointment(appointment.id, { reminderStatus: 'pending' });
          console.error(`Reminder pending for appointment ${appointment.id}`);
        }
      } finally {
        // Remove the flag also in case of error
        messagesPendingDelivery.delete(messageId);
      }
      
      return successCount > 0;
    } catch (error) {
      console.error(`Error sending reminder for appointment ${appointment.id}:`, error);
      return false;
    }
  },

  /**
   * Check appointments that need a reminder
   * @returns The number of reminders sent successfully
   */
  async processReminders(): Promise<number> {
    try {
      // Attempt to get the timezone from app settings
      let TIMEZONE_OFFSET_HOURS = 2; // Default value for Italy (CEST, UTC+2)
      let timezoneName = "Europe/Rome";
      
      try {
        // Get the timezone settings from the app configuration
        const timezoneSetting = await storage.getSetting('timezone');
        if (timezoneSetting) {
          const timezoneData = JSON.parse(timezoneSetting.value);
          TIMEZONE_OFFSET_HOURS = timezoneData.offset || 2;
          timezoneName = timezoneData.timezone || "Europe/Rome";
          console.log(`Using timezone from configuration: ${timezoneName} (UTC${TIMEZONE_OFFSET_HOURS >= 0 ? '+' : ''}${TIMEZONE_OFFSET_HOURS})`);
        } else {
          console.log(`No timezone configuration found, using default: ${timezoneName} (UTC+${TIMEZONE_OFFSET_HOURS})`);
        }
      } catch (error) {
        console.error('Error retrieving timezone settings:', error);
        console.log(`Using default timezone: ${timezoneName} (UTC+${TIMEZONE_OFFSET_HOURS})`);
      }
      
      // Get the notification settings
      const settings = await this.getNotificationSettings();
      
      // If set, use the custom reminder time (in hours before the appointment)
      const reminderHoursBefore = settings?.defaultReminderTime || 24;
      
      // Get the current date
      const now = new Date();
      
      // Creating dates for reminder check
      const nowPlusReminderHours = new Date(now.getTime() + reminderHoursBefore * 60 * 60 * 1000);
      const reminderWindowStart = reminderHoursBefore - 1; // 1 hour before the reminder time
      const reminderWindowEnd = reminderHoursBefore + 1; // 1 hour after the reminder time
      
      // Get the date in yyyy-MM-dd format for today and tomorrow
      const todayStr = format(now, 'yyyy-MM-dd');
      const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd');
      
      console.log(`Processing reminders for appointments between ${now.toISOString()} and ${nowPlusReminderHours.toISOString()}`);
      console.log(`Server time: ${now.toLocaleTimeString('it-IT')}, using direct time without offset`);
      
      // Retrieve all appointments for today and tomorrow
      let appointments = [];
      
      // Retrieve today's appointments
      const todayAppointments = await storage.getAppointmentsByDate(todayStr);
      // Retrieve tomorrow's appointments
      const tomorrowAppointments = await storage.getAppointmentsByDate(tomorrowStr);
      
      // Combine the appointments
      appointments = [...todayAppointments, ...tomorrowAppointments];
      
      console.log(`Found ${appointments.length} potential appointments (${todayAppointments.length} today, ${tomorrowAppointments.length} tomorrow)`);
      
      let remindersSent = 0;
      const apptsToRemind = [];
      
      // Filter the appointments
      for (const appointment of appointments) {
        // Skip appointments without reminder type or with reminder already sent
        if (!appointment.reminderType || appointment.reminderStatus === 'sent') {
          continue;
        }
        
        // Create a Date object for the appointment
        const apptDate = new Date(appointment.date + 'T' + appointment.startTime);
        
        // Simply calculate the hourly difference in hours without complicating with offsets
        // We directly use the timestamp as an absolute reference
        const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // Log useful information for debugging
        console.log(`appointment ID ${appointment.id} on ${appointment.date} at ${appointment.startTime}: ` +
                    `Ore di differenza: ${hoursDiff.toFixed(1)} (usando timestamp diretto senza offset)`);
        
        // Check if the appointment is in the reminder sending period
        // Use reminderWindowStart instead of 24 to allow some margin
        if (hoursDiff >= reminderWindowStart && hoursDiff <= reminderWindowEnd) {
          console.log(`Appointment ID ${appointment.id} is in ${hoursDiff.toFixed(1)} hours, sending reminder...`);
          apptsToRemind.push(appointment);
        }
      }
      
      console.log(`Found ${apptsToRemind.length} appointments needing reminders in the next ${reminderWindowStart}-${reminderWindowEnd} hours`);
      
      // Send reminders
      for (const appointment of apptsToRemind) {
        const success = await this.sendAppointmentReminder(appointment);
        
        if (success) {
          remindersSent++;
        }
      }
      
      console.log(`Sent ${remindersSent}/${apptsToRemind.length} reminders`);
      
      return remindersSent;
    } catch (error) {
      console.error("Error processing reminders:", error);
      throw error;
    }
  }
};