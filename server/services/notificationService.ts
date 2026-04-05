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
 * Servizio per l'invio di notifiche e promemoria
 * Ora usa directNotificationService per le operazioni concrete
 */
export const notificationService = {
  /**
   * Genera un link diretto a WhatsApp
   * @param to Numero di telefono del destinatario in formato internazionale (es. +39123456789)
   * @param message Testo del messaggio da inviare
   * @returns URL per aprire WhatsApp con il messaggio precompilato
   */
  generateWhatsAppLink(to: string, message: string): string {
    return directNotificationService.generateWhatsAppLink(to, message);
  },
  
  /**
   * Invia un'email
   * @param to Indirizzo email del destinatario
   * @param subject Oggetto dell'email
   * @param message Testo dell'email
   * @returns Una Promise che risolve a true se l'invio è riuscito
   */
  async sendEmail(to: string, subject: string, message: string): Promise<boolean> {
    return directNotificationService.sendEmail(to, subject, message);
  },

  /**
   * Classifica un errore SMTP come permanente o temporaneo
   * LOGICA: Tutti i 5xx sono PERMANENTI, 4xx e timeout sono TEMPORANEI
   * @param error Errore da Nodemailer
   * @returns Tipo di errore e dettagli
   */
  classifySMTPError(error: any): { type: 'permanent' | 'temporary'; code: string; reason: string } {
    const errorMessage = error.message?.toLowerCase() || '';
    const responseCode = error.responseCode || error.code || '';
    const numericCode = parseInt(responseCode);
    
    // TEMPORANEI: 4xx codes (richiesta client valida ma problema temporaneo)
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
    
    // PERMANENTI: Tutti i 5xx codes (errore definitivo del server/destinatario)
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
      error.code === 'ENOTFOUND' // Dominio non esiste (DNS failure)
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
    
    // Default: errori sconosciuti trattati come PERMANENTI per sicurezza
    // (meglio bloccare un indirizzo sospetto che continuare a inviare inutilmente)
    return { type: 'permanent', code: responseCode.toString(), reason: 'unknown_error' };
  },

  /**
   * Registra un bounce e aggiorna lo stato del cliente
   * LOGICA: Traccia bounce consecutivi PERMANENTI (reset su success/temporary)
   * @param email Email che ha generato bounce
   * @param clientId ID cliente (opzionale)
   * @param ownerId ID proprietario account
   * @param error Errore SMTP
   */
  async registerBounce(email: string, clientId: number | null, ownerId: number, error: any): Promise<void> {
    try {
      const { emailBounces, clients: clientsTable } = await import('../../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      const errorInfo = this.classifySMTPError(error);
      
      // Verifica se esiste già un record bounce per questa email
      const existingBounces = await db
        .select()
        .from(emailBounces)
        .where(and(
          eq(emailBounces.email, email),
          eq(emailBounces.ownerId, ownerId)
        ))
        .limit(1);
      
      if (existingBounces.length > 0) {
        // Aggiorna bounce esistente
        const currentBounce = existingBounces[0];
        const newBounceCount = currentBounce.bounceCount + 1; // Sempre incrementato (storico)
        
        // Gestione bounce CONSECUTIVI permanenti
        let newConsecutivePermanent = currentBounce.consecutivePermanentBounces || 0;
        if (errorInfo.type === 'permanent') {
          // Errore PERMANENTE: incrementa streak
          newConsecutivePermanent++;
        } else {
          // Errore TEMPORANEO: reset streak (interruzione consecutività)
          newConsecutivePermanent = 0;
        }
        
        // Blocco SOLO se abbiamo 3+ bounce PERMANENTI CONSECUTIVI
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
        
        logger.debug(`📧 Bounce #${newBounceCount} registrato per ${email} (tipo: ${errorInfo.type}, consecutivi permanenti: ${newConsecutivePermanent})`);
        
        // Se abbiamo raggiunto 3 bounce PERMANENTI CONSECUTIVI, blocca l'email sul cliente
        if (shouldBlock && clientId) {
          await db.update(clientsTable)
            .set({
              emailBlocked: true,
              emailBlockedReason: errorInfo.reason,
            })
            .where(eq(clientsTable.id, clientId));
          
          console.warn(`⛔ Email ${email} BLOCCATA dopo ${newConsecutivePermanent} bounce permanenti CONSECUTIVI (cliente ID ${clientId})`);
        }
      } else {
        // Crea nuovo record bounce
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
        
        logger.debug(`📧 Primo bounce registrato per ${email} (tipo: ${errorInfo.type})`);
      }
    } catch (err) {
      console.error('❌ Errore registrazione bounce:', err);
    }
  },

  /**
   * Invia un'email utilizzando direttamente la configurazione dal file
   * @param to Indirizzo email del destinatario
   * @param subject Oggetto dell'email
   * @param message Testo dell'email
   * @param emailConfig Configurazione email dal file
   * @param clientId ID cliente (opzionale, per tracciamento bounce)
   * @param ownerId ID proprietario (opzionale, per tracciamento bounce)
   * @returns Una Promise che risolve a true se l'invio è riuscito
   */
  async sendEmailDirect(to: string, subject: string, message: string, emailConfig: any, clientId?: number, ownerId?: number): Promise<boolean> {
    try {
      const nodemailer = await import('nodemailer');
      
      // Crea trasportatore SMTP per Gmail
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: {
          user: emailConfig.emailAddress,
          pass: emailConfig.emailPassword,
        }
      });
      
      // Sostituisce i placeholder nel subject con i dati reali se presente un template
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
      
      console.log(`Invio email promemoria a ${to} con oggetto: ${finalSubject}`);
      
      const info = await transporter.sendMail(mailOptions);
      logger.debug(`✅ Email promemoria inviata con successo: ${info.messageId}`);
      
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
        
        // Sblocca cliente se era bloccato
        await db.update(clientsTable)
          .set({
            emailBlocked: false,
            emailBlockedReason: null,
          })
          .where(eq(clientsTable.id, clientId));
        
        logger.debug(`🔓 Email ${to} sbloccata dopo invio con successo (cliente ID ${clientId}, streak reset)`);
      }
      
      return true;
    } catch (error: any) {
      console.error(`❌ Errore invio email a ${to}:`, error.message);
      
      // Registra bounce se abbiamo i dati del cliente
      if (clientId && ownerId) {
        await this.registerBounce(to, clientId, ownerId, error);
      }
      
      return false;
    }
  },

  /**
   * Invia un'email per fattura con allegato PDF
   * @param to Indirizzo email del destinatario
   * @param subject Oggetto dell'email
   * @param message Testo dell'email
   * @param emailConfig Configurazione email dal file
   * @param pdfBuffer Buffer del PDF da allegare
   * @param filename Nome del file PDF
   * @returns Una Promise che risolve a true se l'invio è riuscito
   */
  async sendInvoiceEmail(to: string, subject: string, message: string, emailConfig: any, pdfBuffer?: Buffer, filename?: string): Promise<boolean> {
    try {
      const nodemailer = await import('nodemailer');
      
      // Crea trasportatore SMTP per Gmail
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
        subject, // Usa l'oggetto esatto passato, senza template dei promemoria
        text: message,
        html: message.replace(/\n/g, '<br>'),
      };

      // Aggiungi allegato PDF se presente
      if (pdfBuffer && filename) {
        mailOptions.attachments = [{
          filename: filename,
          content: pdfBuffer
        }];
      }
      
      console.log(`Invio email fattura a ${to} con oggetto: ${subject}`);
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email fattura inviata con successo: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('Errore nell\'invio dell\'email fattura:', error);
      return false;
    }
  },
  
  /**
   * Invia un messaggio SMS (non implementato - usa link diretti invece)
   * Questa funzione esiste per mantenere la compatibilità con il codice esistente
   * @param to Numero di telefono del destinatario
   * @param message Testo del messaggio
   * @returns Un oggetto di risposta simulato per compatibilità
   */
  async sendSMS(to: string, message: string): Promise<any> {
    console.log(`Generazione link SMS per ${to} (SMS diretto non implementato)`);
    
    // Genera un link SMS (funzionalità limitata, ma funziona su molti dispositivi)
    const smsLink = `sms:${to}?body=${encodeURIComponent(message)}`;
    
    // Aggiunge una notifica al centro notifiche per il professionista
    await directNotificationService.addToNotificationCenter(
      0, // ID speciale per il professionista
      `📱 Invia SMS al cliente con numero ${to}. [Apri app SMS](${smsLink})`,
      'staff_reminder'
    );
    
    // Ritorna un oggetto che simula la risposta di Twilio per compatibilità
    return {
      sid: `direct-sms-${Date.now()}`,
      status: 'queued',
      to,
      body: message
    };
  },
  
  /**
   * Invia un messaggio WhatsApp utilizzando un link diretto
   * @param to Numero di telefono del destinatario
   * @param message Testo del messaggio
   * @returns Un oggetto di risposta simulato per compatibilità
   */
  async sendWhatsApp(to: string, message: string): Promise<any> {
    console.log(`Generazione link WhatsApp per ${to}`);
    
    // Genera un link WhatsApp
    const whatsappLink = this.generateWhatsAppLink(to, message);
    
    // Aggiunge una notifica al centro notifiche per il professionista
    await directNotificationService.addToNotificationCenter(
      0, // ID speciale per il professionista
      `📱 Invia WhatsApp al cliente con numero ${to}. [Apri WhatsApp](${whatsappLink})`,
      'staff_reminder'
    );
    
    // Ritorna un oggetto che simula la risposta di Twilio per compatibilità
    return {
      sid: `direct-whatsapp-${Date.now()}`,
      status: 'queued',
      to,
      body: message
    };
  },
  
  /**
   * Invia un promemoria per un appuntamento
   * 🗄️ SISTEMA POSTGRESQL - Carica dati dal database
   * @param appointment L'appuntamento per cui inviare il promemoria
   * @returns true se il promemoria è stato inviato con successo, false altrimenti
   */
  async sendAppointmentReminder(appointment: Appointment): Promise<boolean> {
    try {
      // Verifica che l'appuntamento abbia un tipo di promemoria specificato e un clientId
      if (!appointment.reminderType || !appointment.clientId) {
        console.error(`❌ [NOTIFICHE PG] Impossibile inviare promemoria: dati mancanti nell'appuntamento`, appointment);
        return false;
      }
      
      // 🗄️ RECUPERA CLIENTE DA POSTGRESQL
      const clientResult = await db.select().from(clients).where(eq(clients.id, appointment.clientId)).limit(1);
      const client = clientResult[0];
      
      if (!client) {
        console.error(`❌ [NOTIFICHE PG] Cliente non trovato per l'appuntamento ${appointment.id}`);
        return false;
      }
      
      // Verifica che il cliente abbia un numero di telefono o email
      if (!client.phone && !client.email) {
        console.error(`❌ [NOTIFICHE PG] Il cliente ${client.id} (${client.firstName} ${client.lastName}) non ha né telefono né email`);
        return false;
      }

      // 🗄️ RECUPERA SERVIZIO DA POSTGRESQL (se presente)
      let service = null;
      if (appointment.serviceId) {
        const serviceResult = await db.select().from(services).where(eq(services.id, appointment.serviceId)).limit(1);
        service = serviceResult[0] || null;
      }
      
      // 🗄️ RECUPERA COLLABORATORE DA POSTGRESQL (se presente)
      let staffMember = null;
      if (appointment.staffId) {
        const staffResult = await db.select().from(staff).where(eq(staff.id, appointment.staffId)).limit(1);
        staffMember = staffResult[0] || null;
      }
      
      // 🗄️ RECUPERA STANZA DA POSTGRESQL (se presente)
      let room = null;
      if (appointment.roomId) {
        const roomResult = await db.select().from(treatmentRooms).where(eq(treatmentRooms.id, appointment.roomId)).limit(1);
        room = roomResult[0] || null;
      }
      
      // Formatta la data e l'ora dell'appuntamento
      const appointmentDate = format(new Date(appointment.date), 'dd/MM/yyyy');
      const startTime = appointment.startTime.substring(0, 5); // Estrae solo HH:MM
      
      // 🗄️ TEMPLATE CON DATI DA POSTGRESQL
      // Messaggio predefinito con tutti i dettagli disponibili
      let appointmentDetails = '';
      if (service) appointmentDetails += `di ${service.name}`;
      if (staffMember) appointmentDetails += ` con ${staffMember.firstName} ${staffMember.lastName}`;
      if (room) appointmentDetails += ` nella ${room.name}`;
      
      const message = `Gentile ${client.firstName}, questo è un promemoria per il suo appuntamento${appointmentDetails ? ` ${appointmentDetails}` : ''} del ${appointmentDate} alle ore ${startTime}. Per modifiche o cancellazioni, la preghiamo di contattarci.`;
      
      // Genera un ID univoco per questo messaggio
      const messageId = `${appointment.id}-${appointment.date}-${appointment.startTime}`;
      
      // Verifica se il messaggio è già in attesa di invio per evitare duplicati
      if (messagesPendingDelivery.get(messageId)) {
        console.log(`Messaggio già in attesa di invio per l'appuntamento ${appointment.id}`);
        return false;
      }
      
      // Imposta il flag per evitare invii duplicati
      messagesPendingDelivery.set(messageId, true);
      
      // Invia il messaggio in base al tipo di promemoria
      // Ora supporta più canali separati da virgola (es. "sms,whatsapp,email")
      const reminderTypes = appointment.reminderType.split(',');
      let successCount = 0;
      let errorCount = 0;
      
      try {
        for (const type of reminderTypes) {
          const trimmedType = type.trim();
          try {
            if (trimmedType === 'sms') {
              const result = await this.sendSMS(client.phone, message);
              console.log(`SMS inviato con successo per l'appuntamento ${appointment.id}`, result.sid);
              successCount++;
            } else if (trimmedType === 'whatsapp') {
              const result = await this.sendWhatsApp(client.phone, message);
              console.log(`WhatsApp inviato con successo per l'appuntamento ${appointment.id}`, result.sid);
              successCount++;
            } else if (trimmedType === 'email' && client.email) {
              // ⛔ VERIFICA BLOCCO EMAIL: Salta invio se email bloccata dopo bounce ripetuti
              if (client.emailBlocked) {
                console.warn(`⛔ Email ${client.email} bloccata per bounce ripetuti (cliente ${client.id}). Motivo: ${client.emailBlockedReason || 'sconosciuto'}. Invio saltato.`);
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
                    `Promemoria appuntamento del ${appointmentDate}`, 
                    message, 
                    emailConfig,
                    client.id,
                    ownerId
                  );
                  if (success) {
                    logger.debug(`✅ Email inviata per appuntamento ${appointment.id} a ${client.email}`);
                    successCount++;
                  } else {
                    console.error(`❌ Errore invio email per appuntamento ${appointment.id}`);
                    errorCount++;
                  }
                } else {
                  console.log(`⚠️ Configurazione email non disponibile per utente ${ownerId}`);
                  errorCount++;
                }
              } catch (error) {
                console.error(`❌ Errore nel caricamento configurazione email:`, error);
                errorCount++;
              }
            } else if (trimmedType !== 'email') {
              console.warn(`Tipo di promemoria non supportato: ${trimmedType}`);
              errorCount++;
            }
          } catch (err) {
            console.error(`Errore nell'invio del promemoria di tipo ${trimmedType}:`, err);
            errorCount++;
          }
        }
        
        // 🔄 AGGIORNA STATO IN POSTGRESQL (non JSON)
        if (successCount > 0) {
          // Aggiorna l'appuntamento in PostgreSQL
          const { db } = await import('../db');
          const { appointments: appointmentsTable } = await import('../../shared/schema');
          const { eq } = await import('drizzle-orm');
          
          await db.update(appointmentsTable)
            .set({ reminderStatus: 'sent' })
            .where(eq(appointmentsTable.id, appointment.id));
            
          logger.debug(`✅ [NOTIFICHE POSTGRESQL] Promemoria inviato con successo per l'appuntamento ${appointment.id}. Canali riusciti: ${successCount}, falliti: ${errorCount}`);
        } else {
          // Aggiorna l'appuntamento in PostgreSQL
          const { db } = await import('../db');
          const { appointments: appointmentsTable } = await import('../../shared/schema');
          const { eq } = await import('drizzle-orm');
          
          await db.update(appointmentsTable)
            .set({ reminderStatus: 'failed' })
            .where(eq(appointmentsTable.id, appointment.id));
            
          console.error(`❌ [NOTIFICHE POSTGRESQL] Tutti i tentativi di invio promemoria per l'appuntamento ${appointment.id} sono falliti`);
        }
      } finally {
        // Rimuovi il flag anche in caso di errore
        messagesPendingDelivery.delete(messageId);
      }
      
      return successCount > 0;
    } catch (error) {
      console.error(`Errore nell'invio del promemoria per l'appuntamento ${appointment.id}:`, error);
      return false;
    }
  },
  
  /**
   * Verifica gli appuntamenti per cui è necessario inviare un promemoria EMAIL
   * 🗄️ SISTEMA POSTGRESQL - Carica dati dal database
   * 🔄 TIMING: Ogni 15 minuti controlla appuntamenti con reminder_time nelle prossime 30 ore
   * 📧 SOLO EMAIL: WhatsApp rimane manuale dal centro notifiche
   * @returns Il numero di promemoria EMAIL inviati con successo
   */
  async processReminders(): Promise<number> {
    try {
      const { appointments: appointmentsTable } = await import('../../shared/schema');
      const { and, gte, lte, not, like } = await import('drizzle-orm');
      
      const now = new Date();
      const next30Hours = new Date(now.getTime() + 30 * 60 * 60 * 1000); // +30 ore
      const past1Hour = new Date(now.getTime() - 1 * 60 * 60 * 1000); // -1 ora (per non perdere quelli appena passati)
      
      const isVerbose = process.env.LOG_SCHEDULER !== 'false';
      if (isVerbose) logger.debug(`⏰ [EMAIL SCHEDULER] Controllo appuntamenti con reminder_time tra ${past1Hour.toISOString()} e ${next30Hours.toISOString()}`);
      
      // Query PostgreSQL: appuntamenti con reminder_time nelle prossime 30 ore
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
            not(like(appointmentsTable.reminderStatus, '%sent%')), // Escludi già inviati
            like(appointmentsTable.reminderType, '%email%') // Solo quelli con email abilitata
          )
        );
      
      if (isVerbose) logger.debug(`📧 [EMAIL SCHEDULER] Trovati ${appointments.length} appuntamenti con email da inviare`);
      
      let remindersSent = 0;
      
      // Invia i promemoria EMAIL
      for (const appointment of appointments) {
        if (isVerbose) logger.debug(`📧 [EMAIL] Appuntamento ID ${appointment.id} del ${appointment.date} alle ${appointment.startTime} - reminder_time: ${appointment.reminderTime?.toISOString()}`);
        
        const success = await this.sendAppointmentReminder(appointment as any);
        
        if (success) {
          remindersSent++;
        }
      }
      
      if (isVerbose || remindersSent > 0) logger.debug(`✅ [EMAIL SCHEDULER] Inviati ${remindersSent}/${appointments.length} promemoria EMAIL`);
      
      return remindersSent;
    } catch (error) {
      console.error("❌ [EMAIL SCHEDULER] Errore nell'elaborazione dei promemoria:", error);
      throw error;
    }
  },

  /**
   * Invia un'email per campagna marketing con supporto allegati
   * @param options Opzioni per l'invio dell'email marketing
   * @returns Una Promise che risolve a true se l'invio è riuscito
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
      
      // Carica configurazione email dal storage
      const storageData = loadStorageData();
      const emailSettings = storageData.emailSettings;
      
      if (!emailSettings?.emailAddress || !emailSettings?.emailPassword) {
        console.error('❌ Configurazione email non trovata');
        return false;
      }
      
      // Crea trasportatore SMTP per Gmail
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

      // Aggiungi allegato se presente
      if (options.attachment) {
        mailOptions.attachments = [{
          filename: options.attachment.filename,
          content: options.attachment.content,
          contentType: options.attachment.contentType
        }];
      }
      
      logger.debug(`📧 Invio email marketing a ${options.to} - Oggetto: ${options.subject}`);
      
      const info = await transporter.sendMail(mailOptions);
      logger.debug(`✅ Email marketing inviata con successo: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('❌ Errore invio email marketing:', error);
      return false;
    }
  }
};