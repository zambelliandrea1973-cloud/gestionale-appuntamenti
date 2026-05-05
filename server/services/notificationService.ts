import { logger } from '../utils/logger';
import { format, addDays, isBefore } from 'date-fns';
import { Appointment } from '../../shared/schema';
import { directNotificationService } from './directNotificationService';
import fs from 'fs';
import path from 'path';
import { loadStorageData, saveStorageData, getTomorrowAppointments } from '../utils/jsonStorage';
import { db } from '../db';
import { clients, services, staff, treatmentRooms } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// 📁 FUNZIONI JSON CENTRALIZZATE IN utils/jsonStorage.ts

const messagesPendingDelivery = new Map<string, boolean>();

/**
 * Service for sending notifications and reminders
 * This service uses directNotificationService for concrete operations
 */
export const notificationService = {
  /**
   * Generate a link diretto a WhatsApp
   * @param to Recipient phone number in international format (e.g. +39123456789)
   * @param message Message text to send
   * @returns URL per aprire WhatsApp con the message precompilato
   */
  generateWhatsAppLink(to: string, message: string): string {
    return directNotificationService.generateWhatsAppLink(to, message);
  },
  
  /**
   * Send an email
   * @param to Recipient email address
   * @param subject Email subject
   * @param message Email body text
   * @returns A Promise that resolves to true if sending succeeded
   */
  async sendEmail(to: string, subject: string, message: string): Promise<boolean> {
    return directNotificationService.sendEmail(to, subject, message);
  },

  /**
   * Classify an SMTP error as permanent or temporary
   * LOGIC: All 5xx are PERMANENT, 4xx and timeouts are TEMPORARY
   * @param error Error da Nodemailer
   * @returns Type di error e dettagli
   */
  classifySMTPError(error: any): { type: 'permanent' | 'temporary'; code: string; reason: string } {
    const errorMessage = error.message?.toLowerCase() || '';
    const responseCode = error.responseCode || error.code || '';
    const numericCode = parseInt(responseCode);
    
    // TEMPORANEI: 4xx codes (required client valida ma problema temporaneo)
    if (
      (numericCode >= 400 && numericCode < 500) ||
      responseCode === 421 || // Service not available
      responseCode === 450 || // Mailbox unavailable
      responseCode === 451 || // Local error
      responseCode === 452 || // Insufficient storage
      errorMessage.includes('mailbox full') ||
      errorMessage.includes('quota exceeded') ||
      errorMessage.includes('try again later') ||
      error.code === 'ECONNECTION' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ESOCKET'
    ) {
      return {
        type: 'temporary',
        code: responseCode.toString(),
        reason: errorMessage.includes('mailbox full') ? 'mailbox_full' : 
                errorMessage.includes('quota') ? 'quota_exceeded' : 'temporary_error'
      };
    }
    
    // PERMANENT: All 5xx codes (definitive server/recipient error)
    if (
      (numericCode >= 500 && numericCode < 600) ||
      responseCode === 550 || // User unknown, mailbox not found
      responseCode === 551 || // User not local
      responseCode === 552 || // Exceeded storage allocation
      responseCode === 553 || // Mailbox name not allowed
      responseCode === 554 || // Transaction failed
      errorMessage.includes('user unknown') ||
      errorMessage.includes('address rejected') ||
      errorMessage.includes('recipient not found') ||
      errorMessage.includes('mailbox not found') ||
      errorMessage.includes('invalid recipient') ||
      errorMessage.includes('does not exist') ||
      error.code === 'ENOTFOUND' // Domain does not exist (DNS failure)
    ) {
      return {
        type: 'permanent',
        code: responseCode.toString(),
        reason: errorMessage.includes('user unknown') ? 'user_unknown' : 
                errorMessage.includes('invalid') ? 'invalid_address' : 
                errorMessage.includes('not found') ? 'mailbox_not_found' :
                error.code === 'ENOTFOUND' ? 'domain_not_found' : 'permanent_error'
      };
    }
    
    // Default: errors sconosciuti trattati come PERMANENTI per sicurezza
    // (better to block a suspicious address than to keep sending pointlessly)
    return { type: 'permanent', code: responseCode.toString(), reason: 'unknown_error' };
  },

  /**
   * Register a bounce and update the client status
   * LOGIC: Track consecutive PERMANENT bounces (reset on success/temporary)
   * @param email Email that generated the bounce
   * @param clientId ID client (opzionale)
   * @param ownerId ID proprietario account
   * @param error Error SMTP
   */
  async registerBounce(email: string, clientId: number | null, ownerId: number, error: any): Promise<void> {
    try {
      const { emailBounces, clients: clientsTable } = await import('../../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      const errorInfo = this.classifySMTPError(error);
      
      // Check if a bounce record already exists for this email
      const existingBounces = await db
        .select()
        .from(emailBounces)
        .where(and(
          eq(emailBounces.email, email),
          eq(emailBounces.ownerId, ownerId)
        ))
        .limit(1);
      
      if (existingBounces.length > 0) {
        // Update existing bounce
        const currentBounce = existingBounces[0];
        const newBounceCount = currentBounce.bounceCount + 1; // Sempre incrementato (storico)
        
        // Handling CONSECUTIVE permanent bounces
        let newConsecutivePermanent = currentBounce.consecutivePermanentBounces || 0;
        if (errorInfo.type === 'permanent') {
          // Error PERMANENTE: incrementa streak
          newConsecutivePermanent++;
        } else {
          // TEMPORARY error: reset streak (consecutive interruption)
          newConsecutivePermanent = 0;
        }
        
        // Blocco SOLO If abbiamo 3+ bounce PERMANENTI CONSECUTIVI
        const shouldBlock = newConsecutivePermanent >= 3;
        
        await db.update(emailBounces)
          .set({
            bounceCount: newBounceCount,
            consecutivePermanentBounces: newConsecutivePermanent,
            lastBounceAt: new Date(),
            errorCode: errorInfo.code,
            errorMessage: error.message,
            errorType: errorInfo.type,
            isBlocked: shouldBlock,
          })
          .where(eq(emailBounces.id, currentBounce.id));
        
        logger.debug(`📧 Bounce #${newBounceCount} registered for ${email} (type: ${errorInfo.type}, consecutive permanent: ${newConsecutivePermanent})`);
        
        // If we have reached 3 CONSECUTIVE PERMANENT bounces, block the email on the client
        if (shouldBlock && clientId) {
          await db.update(clientsTable)
            .set({
              emailBlocked: true,
              emailBlockedReason: errorInfo.reason,
            })
            .where(eq(clientsTable.id, clientId));
          
          console.warn(`⛔ Email ${email} BLOCKED after ${newConsecutivePermanent} CONSECUTIVE permanent bounces (client ID ${clientId})`);
        }
      } else {
        // Create new bounce record
        const initialConsecutive = errorInfo.type === 'permanent' ? 1 : 0;
        
        await db.insert(emailBounces).values({
          ownerId,
          clientId: clientId || null,
          email,
          errorCode: errorInfo.code,
          errorMessage: error.message,
          errorType: errorInfo.type,
          bounceCount: 1,
          consecutivePermanentBounces: initialConsecutive,
          isBlocked: false,
        });
        
        logger.debug(`📧 First bounce registered for ${email} (type: ${errorInfo.type})`);
      }
    } catch (err) {
      console.error('❌ Error registering bounce:', err);
    }
  },

  /**
   * Send an email using the configuration file directly
   * @param to Recipient email address
   * @param subject Email subject
   * @param message Email body text
   * @param emailConfig Email configuration from the file
   * @param clientId ID client (opzionale, per tracciamento bounce)
   * @param ownerId ID proprietario (opzionale, per tracciamento bounce)
   * @returns A Promise that resolves to true if sending succeeded
   */
  async sendEmailDirect(to: string, subject: string, message: string, emailConfig: any, clientId?: number, ownerId?: number): Promise<boolean> {
    try {
      const nodemailer = await import('nodemailer');
      
      // Create trasportatore SMTP per Gmail
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: {
          user: emailConfig.emailAddress,
          pass: emailConfig.emailPassword,
        }
      });
      
      // Replace placeholders in the subject with actual data if a template is present
      let finalSubject = subject;
      if (emailConfig.emailSubject) {
        finalSubject = emailConfig.emailSubject.replace(/{{data}}/g, new Date().toLocaleDateString('it-IT'));
      }
      
      const mailOptions = {
        from: emailConfig.emailAddress,
        to,
        subject: finalSubject,
        text: message,
        html: message.replace(/\n/g, '<br>'),
      };
      
      console.log(`Sending reminder email to ${to} with subject: ${finalSubject}`);
      
      const info = await transporter.sendMail(mailOptions);
      logger.debug(`✅ Reminder email sent successfully: ${info.messageId}`);
      
      // Reset bounce streak e sblocco email in caso di successo
      // IMPORTANTE: manteniamo bounceCount per storico, resettiamo SOLO consecutivePermanentBounces
      if (clientId && ownerId) {
        const { emailBounces, clients: clientsTable } = await import('../../shared/schema');
        const { eq, and } = await import('drizzle-orm');
        
        // Reset SOLO streak permanenti (mantiene bounceCount per storico)
        await db.update(emailBounces)
          .set({ 
            consecutivePermanentBounces: 0, // Reset streak permanenti
            isBlocked: false 
          })
          .where(and(
            eq(emailBounces.email, to),
            eq(emailBounces.ownerId, ownerId)
          ));
        
        // Unblock client if it was blocked
        await db.update(clientsTable)
          .set({
            emailBlocked: false,
            emailBlockedReason: null,
          })
          .where(eq(clientsTable.id, clientId));
        
        logger.debug(`🔓 Email ${to} unblocked after successful send (client ID ${clientId}, streak reset)`);
      }
      
      return true;
    } catch (error: any) {
      console.error(`❌ Error sending email to ${to}:`, error.message);
      
      // Register bounce if we have the client data
      if (clientId && ownerId) {
        await this.registerBounce(to, clientId, ownerId, error);
      }
      
      return false;
    }
  },

  /**
   * Send an email for invoice with PDF attachment
   * @param to Recipient email address
   * @param subject Email subject
   * @param message Email body text
   * @param emailConfig Email configuration from the file
   * @param pdfBuffer PDF buffer to attach
   * @param filename PDF filename
   * @returns A Promise that resolves to true if sending succeeded
   */
  async sendInvoiceEmail(to: string, subject: string, message: string, emailConfig: any, pdfBuffer?: Buffer, filename?: string): Promise<boolean> {
    try {
      const nodemailer = await import('nodemailer');
      
      // Create trasportatore SMTP per Gmail
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: {
          user: emailConfig.emailAddress,
          pass: emailConfig.emailPassword,
        }
      });
      
      const mailOptions: any = {
        from: emailConfig.emailAddress,
        to,
        subject, // Use the exact subject passed, without reminder templates
        text: message,
        html: message.replace(/\n/g, '<br>'),
      };

      // Add PDF attachment if present
      if (pdfBuffer && filename) {
        mailOptions.attachments = [{
          filename: filename,
          content: pdfBuffer
        }];
      }
      
      console.log(`Sending invoice email to ${to} con oggetto: ${subject}`);
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`Invoice email sent successfully: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('Error sending invoice email:', error);
      return false;
    }
  },
  
  /**
   * Send an SMS message (not implemented - use direct links instead)
   * This function exists to maintain compatibility with existing code
   * @param to Recipient phone number
   * @param message Message text
   * @returns A simulated response object for compatibility
   */
  async sendSMS(to: string, message: string): Promise<any> {
    console.log(`Generating SMS link for ${to} (direct SMS not implemented)`);
    
    // Generate an SMS link (limited functionality, but works on many devices)
    const smsLink = `sms:${to}?body=${encodeURIComponent(message)}`;
    
    // Add a notification to the notification center for the professional
    await directNotificationService.addToNotificationCenter(
      0, // Special ID for the professional
      `📱 Send SMS to client at ${to}. [Open SMS app](${smsLink})`,
      'staff_reminder'
    );
    
    // Return an object that simulates the Twilio response for compatibility
    return {
      sid: `direct-sms-${Date.now()}`,
      status: 'queued',
      to,
      body: message
    };
  },
  
  /**
   * Send a WhatsApp message using a direct link
   * @param to Recipient phone number
   * @param message Message text
   * @returns A simulated response object for compatibility
   */
  async sendWhatsApp(to: string, message: string): Promise<any> {
    console.log(`Generating WhatsApp link for ${to}`);
    
    // Generate a WhatsApp link
    const whatsappLink = this.generateWhatsAppLink(to, message);
    
    // Add a notification to the notification center for the professional
    await directNotificationService.addToNotificationCenter(
      0, // Special ID for the professional
      `📱 Invia WhatsApp to client con numero ${to}. [Apri WhatsApp](${whatsappLink})`,
      'staff_reminder'
    );
    
    // Return an object that simulates the Twilio response for compatibility
    return {
      sid: `direct-whatsapp-${Date.now()}`,
      status: 'queued',
      to,
      body: message
    };
  },
  
  /**
   * Send a reminder for an appointment
   * 🗄️ POSTGRESQL SYSTEM - Load data from database
   * @param appointment The appointment for which to send the reminder
   * @returns true if the reminder was sent successfully, false otherwise
   */
  async sendAppointmentReminder(appointment: Appointment): Promise<boolean> {
    try {
      // Verify that the appointment has a specified reminder type and a clientId
      if (!appointment.reminderType || !appointment.clientId) {
        console.error(`❌ [NOTIFICATIONS PG] Unable to send reminder: missing appointment data`, appointment);
        return false;
      }
      
      // 🗄️ RETRIEVE CLIENT FROM POSTGRESQL
      const clientResult = await db.select().from(clients).where(eq(clients.id, appointment.clientId)).limit(1);
      const client = clientResult[0];
      
      if (!client) {
        console.error(`❌ [NOTIFICATIONS PG] Client not found for appointment ${appointment.id}`);
        return false;
      }
      
      // Verify that the client has a phone number or email
      if (!client.phone && !client.email) {
        console.error(`❌ [NOTIFICATIONS PG] Client ${client.id} (${client.firstName} ${client.lastName}) has neither phone nor email`);
        return false;
      }

      // 🗄️ RETRIEVE SERVICE FROM POSTGRESQL (if present)
      let service = null;
      if (appointment.serviceId) {
        const serviceResult = await db.select().from(services).where(eq(services.id, appointment.serviceId)).limit(1);
        service = serviceResult[0] || null;
      }
      
      // 🗄️ RETRIEVE COLLABORATOR FROM POSTGRESQL (if present)
      let staffMember = null;
      if (appointment.staffId) {
        const staffResult = await db.select().from(staff).where(eq(staff.id, appointment.staffId)).limit(1);
        staffMember = staffResult[0] || null;
      }
      
      // 🗄️ RECUPERA STANZA DA POSTGRESQL (If presente)
      let room = null;
      if (appointment.roomId) {
        const roomResult = await db.select().from(treatmentRooms).where(eq(treatmentRooms.id, appointment.roomId)).limit(1);
        room = roomResult[0] || null;
      }
      
      // Format the appointment date and time
      const appointmentDate = format(new Date(appointment.date), 'dd/MM/yyyy');
      const startTime = appointment.startTime.substring(0, 5); // Extract HH:MM only
      
      // 🗄️ TEMPLATE CON DATI DA POSTGRESQL
      // Default message with all available details
      let appointmentDetails = '';
      if (service) appointmentDetails += `for ${service.name}`;
      if (staffMember) appointmentDetails += ` with ${staffMember.firstName} ${staffMember.lastName}`;
      if (room) appointmentDetails += ` in ${room.name}`;
      
      const message = `Dear ${client.firstName}, this is a reminder for your appointment${appointmentDetails ? ` ${appointmentDetails}` : ''} on ${appointmentDate} at ${startTime}. For changes or cancellations, please contact us.`;
      
      // Generate a unique ID for this message
      const messageId = `${appointment.id}-${appointment.date}-${appointment.startTime}`;
      
      // Check if the message is already pending sending to avoid duplicates
      if (messagesPendingDelivery.get(messageId)) {
        console.log(`Message already pending for appointment ${appointment.id}`);
        return false;
      }
      
      // Set the flag to avoid duplicate sends
      messagesPendingDelivery.set(messageId, true);
      
      // Send the message in base al type di promemoria
      // Time supports multiple channels separated by comma (e.g. "sms,whatsapp,email")
      const reminderTypes = appointment.reminderType.split(',');
      let successCount = 0;
      let errorCount = 0;
      
      try {
        for (const type of reminderTypes) {
          const trimmedType = type.trim();
          try {
            if (trimmedType === 'sms') {
              const result = await this.sendSMS(client.phone, message);
              console.log(`SMS sent successfully for appointment ${appointment.id}`, result.sid);
              successCount++;
            } else if (trimmedType === 'whatsapp') {
              const result = await this.sendWhatsApp(client.phone, message);
              console.log(`WhatsApp sent successfully for appointment ${appointment.id}`, result.sid);
              successCount++;
            } else if (trimmedType === 'email' && client.email) {
              // ⛔ EMAIL BLOCK CHECK: Skip sending if email blocked after repeated bounces
              if (client.emailBlocked) {
                console.warn(`⛔ Email ${client.email} blocked due to repeated bounces (client ${client.id}). Reason: ${client.emailBlockedReason || 'unknown'}. Send skipped.`);
                errorCount++;
                continue;
              }
              
              try {
                const { getEmailConfig } = await import('../utils/emailConfig');
                const { db } = await import('../db');
                const { clients: clientsTable } = await import('../../shared/schema');
                const { eq } = await import('drizzle-orm');
                
                const [clientData] = await db.select().from(clientsTable).where(eq(clientsTable.id, client.id)).limit(1);
                const ownerId = clientData?.ownerId || client.id;
                
                const emailConfig = await getEmailConfig(ownerId);
                
                if (emailConfig && emailConfig.emailEnabled && emailConfig.emailAddress && emailConfig.emailPassword) {
                  // Passa clientId e ownerId per tracciamento bounce
                  const success = await this.sendEmailDirect(
                    client.email, 
                    `Appointment reminder for ${appointmentDate}`, 
                    message, 
                    emailConfig,
                    client.id,
                    ownerId
                  );
                  if (success) {
                    logger.debug(`✅ Email sent for appointment ${appointment.id} to ${client.email}`);
                    successCount++;
                  } else {
                    console.error(`❌ Error sending email for appointment ${appointment.id}`);
                    errorCount++;
                  }
                } else {
                  console.log(`⚠️ Email configuration not available for user ${ownerId}`);
                  errorCount++;
                }
              } catch (error) {
                console.error(`❌ Error loading email configuration:`, error);
                errorCount++;
              }
            } else if (trimmedType !== 'email') {
              console.warn(`Unsupported reminder type: ${trimmedType}`);
              errorCount++;
            }
          } catch (err) {
            console.error(`Error sending reminder of type ${trimmedType}:`, err);
            errorCount++;
          }
        }
        
        // 🔄 UPDATE STATUS IN POSTGRESQL (not JSON)
        if (successCount > 0) {
          // Update l'appointment in PostgreSQL
          const { db } = await import('../db');
          const { appointments: appointmentsTable } = await import('../../shared/schema');
          const { eq } = await import('drizzle-orm');
          
          await db.update(appointmentsTable)
            .set({ reminderStatus: 'sent' })
            .where(eq(appointmentsTable.id, appointment.id));
            
          logger.debug(`✅ [NOTIFICHE POSTGRESQL] Reminder sent successfully for appointment ${appointment.id}. Successful channels: ${successCount}, failed: ${errorCount}`);
        } else {
          // Update l'appointment in PostgreSQL
          const { db } = await import('../db');
          const { appointments: appointmentsTable } = await import('../../shared/schema');
          const { eq } = await import('drizzle-orm');
          
          await db.update(appointmentsTable)
            .set({ reminderStatus: 'failed' })
            .where(eq(appointmentsTable.id, appointment.id));
            
          console.error(`❌ [NOTIFICHE POSTGRESQL] All reminder send attempts for appointment ${appointment.id} failed`);
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
   * Check appointments that need a reminder EMAIL
   * 🗄️ POSTGRESQL SYSTEM - Load data from database
   * 🔄 TIMING: Every 15 minutes check appointments with reminder_time in the next 30 hours
   * 📧 EMAIL ONLY: WhatsApp remains manual from the notification center
   * @returns Il number di promemoria EMAIL inviati successfully
   */
  async processReminders(): Promise<number> {
    try {
      const { appointments: appointmentsTable } = await import('../../shared/schema');
      const { and, gte, lte, not, like } = await import('drizzle-orm');
      
      const now = new Date();
      const next30Hours = new Date(now.getTime() + 30 * 60 * 60 * 1000); // +30 ore
      const past1Hour = new Date(now.getTime() - 1 * 60 * 60 * 1000); // -1 hour (to not miss recently passed ones)
      
      const isVerbose = process.env.LOG_SCHEDULER !== 'false';
      if (isVerbose) logger.debug(`⏰ [EMAIL SCHEDULER] Checking appointments with reminder_time between ${past1Hour.toISOString()} and ${next30Hours.toISOString()}`);
      
      // PostgreSQL query: appointments with reminder_time in the next 30 hours
      const appointments = await db
        .select({
          id: appointmentsTable.id,
          userId: appointmentsTable.userId,
          clientId: appointmentsTable.clientId,
          serviceId: appointmentsTable.serviceId,
          staffId: appointmentsTable.staffId,
          roomId: appointmentsTable.roomId,
          date: appointmentsTable.date,
          startTime: appointmentsTable.startTime,
          endTime: appointmentsTable.endTime,
          notes: appointmentsTable.notes,
          status: appointmentsTable.status,
          reminderType: appointmentsTable.reminderType,
          reminderStatus: appointmentsTable.reminderStatus,
          reminderTime: appointmentsTable.reminderTime,
          reminderSent: appointmentsTable.reminderSent,
        })
        .from(appointmentsTable)
        .where(
          and(
            gte(appointmentsTable.reminderTime, past1Hour),
            lte(appointmentsTable.reminderTime, next30Hours),
            not(like(appointmentsTable.reminderStatus, '%sent%')), // Exclude already sent
            like(appointmentsTable.reminderType, '%email%') // Only those with email enabled
          )
        );
      
      if (isVerbose) logger.debug(`📧 [EMAIL SCHEDULER] Found ${appointments.length} appointments with email to send`);
      
      let remindersSent = 0;
      
      // Send i promemoria EMAIL
      for (const appointment of appointments) {
        if (isVerbose) logger.debug(`📧 [EMAIL] appointment ID ${appointment.id} on ${appointment.date} at ${appointment.startTime} - reminder_time: ${appointment.reminderTime?.toISOString()}`);
        
        const success = await this.sendAppointmentReminder(appointment as any);
        
        if (success) {
          remindersSent++;
        }
      }
      
      if (isVerbose || remindersSent > 0) logger.debug(`✅ [EMAIL SCHEDULER] Sent ${remindersSent}/${appointments.length} EMAIL reminders`);
      
      return remindersSent;
    } catch (error) {
      console.error("❌ [EMAIL SCHEDULER] Error processing reminders:", error);
      throw error;
    }
  },

  /**
   * Send an email for marketing campaign with attachment support
   * @param options Options for sending marketing email
   * @returns A Promise that resolves to true if sending succeeded
   */
  async sendMarketingEmail(options: {
    to: string;
    subject: string;
    message: string;
    clientName: string;
    attachment?: {
      filename: string;
      content: Buffer;
      contentType: string;
    };
  }): Promise<boolean> {
    try {
      const nodemailer = await import('nodemailer');
      
      // Load email configuration from storage
      const storageData = loadStorageData();
      const emailSettings = storageData.emailSettings;
      
      if (!emailSettings?.emailAddress || !emailSettings?.emailPassword) {
        console.error('❌ Email configuration not found');
        return false;
      }
      
      // Create trasportatore SMTP per Gmail
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: {
          user: emailSettings.emailAddress,
          pass: emailSettings.emailPassword,
        }
      });
      
      const mailOptions: any = {
        from: emailSettings.emailAddress,
        to: options.to,
        subject: options.subject,
        text: options.message,
        html: options.message.replace(/\n/g, '<br>'),
      };

      // Add attachment if present
      if (options.attachment) {
        mailOptions.attachments = [{
          filename: options.attachment.filename,
          content: options.attachment.content,
          contentType: options.attachment.contentType
        }];
      }
      
      logger.debug(`📧 Sending marketing email to ${options.to} - Subject: ${options.subject}`);
      
      const info = await transporter.sendMail(mailOptions);
      logger.debug(`✅ Marketing email sent successfully: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('❌ Error sending marketing email:', error);
      return false;
    }
  }
};