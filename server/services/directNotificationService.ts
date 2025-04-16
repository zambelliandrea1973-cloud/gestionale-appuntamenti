import { format, addDays } from 'date-fns';
import { Appointment, NotificationSettings } from '@shared/schema';
import { storage } from '../storage';
import { notificationSettingsService } from './notificationSettingsService';
import nodemailer from 'nodemailer';

const messagesPendingDelivery = new Map<string, boolean>();

/**
 * Servizio per l'invio di notifiche e promemoria attraverso metodi diretti
 * senza dipendere da servizi esterni come Twilio
 */
export const directNotificationService = {
  /**
   * Verifica le impostazioni di notifica
   * @returns Le impostazioni di notifica, o null se non sono state configurate
   */
  async getNotificationSettings() {
    try {
      return await notificationSettingsService.getSettings();
    } catch (error) {
      console.error('Errore nel recupero delle impostazioni di notifica:', error);
      return null;
    }
  },

  /**
   * Ottiene il numero di telefono da utilizzare per le notifiche
   * @returns Il numero di telefono da utilizzare per le notifiche, o null se non configurato
   */
  async getNotificationPhone(): Promise<string | null> {
    try {
      const settings = await this.getNotificationSettings();
      
      // Se è configurato per usare un numero di telefono dedicato e questo è impostato
      if (settings && !settings.useContactPhoneForNotifications && settings.notificationPhone) {
        return settings.notificationPhone;
      }
      
      // Altrimenti, recupera il numero di telefono dai contatti in base alla preferenza
      const contactService = await import('./contactService');
      const contactInfo = contactService.contactService.getContactInfo();
      
      // Determina quale numero utilizzare in base alla preferenza
      if (settings?.preferredContactPhone === 'secondary' && contactInfo.phone2) {
        return contactInfo.phone2;
      } else {
        return contactInfo.phone1 || contactInfo.phone2 || null;
      }
    } catch (error) {
      console.error('Errore nel recupero del numero di telefono per notifiche:', error);
      return null;
    }
  },

  /**
   * Genera un link diretto a WhatsApp
   * @param to Numero di telefono del destinatario in formato internazionale (es. +39123456789)
   * @param message Testo del messaggio da inviare
   * @returns URL per aprire WhatsApp con il messaggio precompilato
   */
  generateWhatsAppLink(to: string, message: string): string {
    // Formatta il numero se non inizia con "+"
    const formattedTo = to.startsWith('+') ? to.substring(1) : to;
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    return `https://wa.me/${formattedTo}?text=${encodedMessage}`;
  },

  /**
   * Invia un messaggio email utilizzando SMTP
   * @param to Indirizzo email del destinatario
   * @param subject Oggetto dell'email
   * @param message Testo dell'email
   * @returns Promise che risolve a true se l'invio è riuscito
   * @throws Error se si verifica un problema durante l'invio
   */
  async sendEmail(to: string, subject: string, message: string): Promise<boolean> {
    try {
      const settings = await this.getNotificationSettings();
      
      if (!settings) {
        console.error('Configurazione email non trovata');
        throw new Error('Configurazione email non trovata. Salva prima le impostazioni.');
      }
      
      if (!settings.emailEnabled) {
        console.error('Notifiche email non abilitate');
        throw new Error('Le notifiche email non sono abilitate.');
      }
      
      if (!settings.smtpServer || !settings.smtpUsername || !settings.smtpPassword) {
        console.error('Configurazione SMTP incompleta', {
          server: !!settings.smtpServer, 
          username: !!settings.smtpUsername, 
          password: !!settings.smtpPassword
        });
        throw new Error('Configurazione SMTP incompleta. Verifica tutti i campi obbligatori.');
      }
      
      // Crea trasportatore SMTP con gestione debug
      const transporter = nodemailer.createTransport({
        host: settings.smtpServer,
        port: settings.smtpPort || 587,
        secure: settings.smtpPort === 465, // true per porta 465, false per altre porte
        auth: {
          user: settings.smtpUsername,
          pass: settings.smtpPassword,
        },
        // Attiva debug per dettagli di connessione
        debug: true,
        logger: true
      });
      
      // Verifica la connessione prima di inviare
      try {
        await transporter.verify();
        console.log('Connessione SMTP verificata con successo');
      } catch (verifyError) {
        console.error('Errore nella verifica della connessione SMTP:', verifyError);
        throw verifyError; // Propagare l'errore per gestirlo nell'handler principale
      }
      
      const mailOptions = {
        from: settings.senderEmail || settings.smtpUsername,
        to,
        subject,
        text: message,
        html: message.replace(/\n/g, '<br>'),
      };
      
      console.log(`Tentativo di invio email a ${to} usando ${settings.smtpServer}:${settings.smtpPort}`);
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email inviata con successo: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('Errore nell\'invio dell\'email:', error);
      
      // Propaga l'errore completo per permettere all'endpoint di gestirlo in modo specifico
      throw error;
    }
  },

  /**
   * Aggiunge una notifica al centro notifiche
   * @param clientId ID del cliente
   * @param appointmentId ID dell'appuntamento (opzionale)
   * @param message Testo della notifica
   * @param type Tipo di notifica
   * @returns Promise che risolve a true se la notifica è stata creata
   */
  async addToNotificationCenter(
    clientId: number, 
    message: string, 
    type: string = 'appointment_reminder',
    appointmentId?: number, 
    scheduledFor?: Date
  ): Promise<boolean> {
    try {
      await storage.createNotification({
        clientId,
        appointmentId,
        type,
        message,
        isRead: false,
        channel: 'app',
        scheduledFor: scheduledFor || new Date(),
      });
      
      console.log(`Notifica aggiunta al centro notifiche per il cliente ${clientId}`);
      return true;
    } catch (error) {
      console.error('Errore nell\'aggiunta della notifica al centro notifiche:', error);
      return false;
    }
  },

  /**
   * Invia un promemoria per un appuntamento utilizzando i metodi configurati
   * @param appointment L'appuntamento per cui inviare il promemoria
   * @returns true se il promemoria è stato inviato o aggiunto al centro notifiche
   */
  async sendAppointmentReminder(appointment: Appointment): Promise<boolean> {
    try {
      // Verifica che l'appuntamento abbia un tipo di promemoria specificato e un clientId
      if (!appointment.reminderType || !appointment.clientId) {
        console.error(`Impossibile inviare promemoria: dati mancanti nell'appuntamento`, appointment);
        return false;
      }
      
      // Recupera i dati del cliente
      const client = await storage.getClient(appointment.clientId);
      if (!client) {
        console.error(`Cliente non trovato per l'appuntamento ${appointment.id}`);
        return false;
      }
      
      // Recupera le impostazioni di notifica
      const settings = await this.getNotificationSettings();
      
      // Recupera i dati del servizio
      const service = appointment.serviceId ? await storage.getService(appointment.serviceId) : null;
      
      // Formatta la data e l'ora dell'appuntamento
      const appointmentDate = format(new Date(appointment.date), 'dd/MM/yyyy');
      const startTime = appointment.startTime.substring(0, 5); // Estrae solo HH:MM
      
      // Prova a recuperare un template personalizzato
      let reminderTemplate = null;
      if (appointment.serviceId) {
        // Prima cerca un template specifico per questo servizio
        reminderTemplate = await storage.getReminderTemplateByService(appointment.serviceId);
      }
      
      // Se non trova un template specifico, usa quello predefinito
      if (!reminderTemplate) {
        reminderTemplate = await storage.getDefaultReminderTemplate();
      }
      
      // Prepara il messaggio - se esiste un template lo usa, altrimenti usa un messaggio predefinito
      let message = '';
      if (reminderTemplate) {
        // Sostituisci i placeholder nel template con i dati reali
        message = reminderTemplate.template
          .replace('{{nome}}', client.firstName)
          .replace('{{cognome}}', client.lastName)
          .replace('{{servizio}}', service ? service.name : 'appuntamento')
          .replace('{{data}}', appointmentDate)
          .replace('{{ora}}', startTime);
      } else {
        // Messaggio predefinito con data e ora incluse
        message = `Gentile ${client.firstName}, questo è un promemoria per il suo appuntamento ${service ? `di ${service.name}` : ''} del ${appointmentDate} alle ore ${startTime}. Per modifiche o cancellazioni, la preghiamo di contattarci.`;
      }
      
      // Genera un ID univoco per questo messaggio
      const messageId = `${appointment.id}-${appointment.date}-${appointment.startTime}`;
      
      // Verifica se il messaggio è già in attesa di invio per evitare duplicati
      if (messagesPendingDelivery.get(messageId)) {
        console.log(`Messaggio già in attesa di invio per l'appuntamento ${appointment.id}`);
        return false;
      }
      
      // Imposta il flag per evitare invii duplicati
      messagesPendingDelivery.set(messageId, true);
      
      // Aggiungi sempre la notifica al centro notifiche (se abilitato)
      let successCount = 0;
      
      try {
        // Verifica se il centro notifiche è abilitato (default: true)
        if (!settings || settings.notificationCenterEnabled !== false) {
          const added = await this.addToNotificationCenter(
            client.id, 
            message, 
            'appointment_reminder', 
            appointment.id
          );
          
          if (added) {
            successCount++;
            console.log(`Notifica aggiunta al centro notifiche per l'appuntamento ${appointment.id}`);
          }
        }
        
        // Invia email se abilitato e configurato
        if (settings?.emailEnabled && client.email) {
          const emailSubject = `Promemoria Appuntamento del ${appointmentDate}`;
          const sent = await this.sendEmail(client.email, emailSubject, message);
          if (sent) {
            successCount++;
            console.log(`Email inviata con successo per l'appuntamento ${appointment.id}`);
          }
        }
        
        // Per SMS e WhatsApp, poiché stiamo passando a metodi diretti,
        // generiamo i link e li includiamo nel centro notifiche per il professionista
        
        // Genera link WhatsApp se il cliente ha un numero di telefono e WhatsApp è abilitato
        if (client.phone && settings?.whatsappEnabled) {
          // Ottieni il numero di telefono del mittente (del professionista) dalle impostazioni
          const senderPhone = await this.getNotificationPhone();
          
          if (senderPhone) {
            const whatsappLink = this.generateWhatsAppLink(client.phone, message);
            
            await this.addToNotificationCenter(
              0, // ID speciale per il professionista 
              `📱 Invia promemoria WhatsApp al cliente ${client.firstName} ${client.lastName} per l'appuntamento del ${appointmentDate}. [Apri WhatsApp](${whatsappLink})`,
              'staff_reminder',
              appointment.id
            );
            
            console.log(`Generato link WhatsApp per l'appuntamento ${appointment.id}: ${whatsappLink}`);
            successCount++; // Considera anche questo come un successo
          } else {
            console.error(`Impossibile generare link WhatsApp: numero di telefono per notifiche non configurato`);
          }
        }
        
        // Aggiorna lo stato del promemoria
        if (successCount > 0) {
          await storage.updateAppointment(appointment.id, { reminderStatus: 'sent' });
          console.log(`Promemoria inviato/generato con successo per l'appuntamento ${appointment.id}`);
        } else {
          await storage.updateAppointment(appointment.id, { reminderStatus: 'pending' });
          console.error(`Promemoria in attesa per l'appuntamento ${appointment.id}`);
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
   * Verifica gli appuntamenti per cui è necessario inviare un promemoria
   * @returns Il numero di promemoria inviati con successo
   */
  async processReminders(): Promise<number> {
    try {
      // Tenta di ottenere il fuso orario dalle impostazioni dell'app
      let TIMEZONE_OFFSET_HOURS = 2; // Valore predefinito per l'Italia (CEST, UTC+2)
      let timezoneName = "Europe/Rome";
      
      try {
        // Ottieni le impostazioni del fuso orario dalla configurazione dell'app
        const timezoneSetting = await storage.getSetting('timezone');
        if (timezoneSetting) {
          const timezoneData = JSON.parse(timezoneSetting.value);
          TIMEZONE_OFFSET_HOURS = timezoneData.offset || 2;
          timezoneName = timezoneData.timezone || "Europe/Rome";
          console.log(`Utilizzando fuso orario da configurazione: ${timezoneName} (UTC${TIMEZONE_OFFSET_HOURS >= 0 ? '+' : ''}${TIMEZONE_OFFSET_HOURS})`);
        } else {
          console.log(`Nessuna configurazione di fuso orario trovata, utilizzo predefinito: ${timezoneName} (UTC+${TIMEZONE_OFFSET_HOURS})`);
        }
      } catch (error) {
        console.error('Errore nel recupero delle impostazioni del fuso orario:', error);
        console.log(`Utilizzo fuso orario predefinito: ${timezoneName} (UTC+${TIMEZONE_OFFSET_HOURS})`);
      }
      
      // Ottieni le impostazioni di notifica
      const settings = await this.getNotificationSettings();
      
      // Se impostato, usa il tempo di promemoria personalizzato (in ore prima dell'appuntamento)
      const reminderHoursBefore = settings?.defaultReminderTime || 24;
      
      // Otteniamo la data attuale
      const now = new Date();
      
      // Creazione delle date per il controllo dei promemoria
      const nowPlusReminderHours = new Date(now.getTime() + reminderHoursBefore * 60 * 60 * 1000);
      const reminderWindowStart = reminderHoursBefore - 1; // 1 ora prima del tempo di promemoria
      const reminderWindowEnd = reminderHoursBefore + 1; // 1 ora dopo il tempo di promemoria
      
      // Ottieni le date nel formato yyyy-MM-dd per oggi e domani
      const todayStr = format(now, 'yyyy-MM-dd');
      const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd');
      
      console.log(`Elaborazione promemoria per appuntamenti tra ${now.toISOString()} e ${nowPlusReminderHours.toISOString()}`);
      console.log(`Orario server: ${now.toLocaleTimeString('it-IT')}, Fuso orario server: UTC, Fuso orario utilizzato: ${timezoneName} (UTC${TIMEZONE_OFFSET_HOURS >= 0 ? '+' : ''}${TIMEZONE_OFFSET_HOURS})`);
      
      // Recupera tutti gli appuntamenti di oggi e domani
      let appointments = [];
      
      // Recupera appuntamenti di oggi
      const todayAppointments = await storage.getAppointmentsByDate(todayStr);
      // Recupera appuntamenti di domani
      const tomorrowAppointments = await storage.getAppointmentsByDate(tomorrowStr);
      
      // Combina gli appuntamenti
      appointments = [...todayAppointments, ...tomorrowAppointments];
      
      console.log(`Trovati ${appointments.length} appuntamenti potenziali (${todayAppointments.length} oggi, ${tomorrowAppointments.length} domani)`);
      
      let remindersSent = 0;
      const apptsToRemind = [];
      
      // Filtra gli appuntamenti
      for (const appointment of appointments) {
        // Salta gli appuntamenti senza tipo di promemoria o con promemoria già inviato
        if (!appointment.reminderType || appointment.reminderStatus === 'sent') {
          continue;
        }
        
        // Crea un oggetto Date per l'appuntamento
        const apptDate = new Date(appointment.date + 'T' + appointment.startTime);
        
        // Calcoliamo la differenza oraria considerando il fuso orario
        // Il server è in UTC, dobbiamo applicare l'offset per il fuso orario locale
        const rawHoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const hoursDiff = rawHoursDiff - TIMEZONE_OFFSET_HOURS;
        
        // Logghiamo informazioni utili per il debug
        console.log(`Appuntamento ID ${appointment.id} del ${appointment.date} alle ${appointment.startTime}: ` +
                    `Ore di differenza (raw): ${rawHoursDiff.toFixed(1)}, ` +
                    `Con offset fuso orario ${timezoneName}: ${hoursDiff.toFixed(1)}`);
        
        // Verifica se l'appuntamento è nel periodo di invio promemoria
        // Usiamo reminderWindowStart invece di 24 per dare un po' di margine
        if (hoursDiff >= reminderWindowStart && hoursDiff <= reminderWindowEnd) {
          console.log(`Appuntamento ID ${appointment.id} è tra ${hoursDiff.toFixed(1)} ore (considerando fuso orario ${timezoneName}), invio promemoria...`);
          apptsToRemind.push(appointment);
        }
      }
      
      console.log(`Trovati ${apptsToRemind.length} appuntamenti che necessitano di promemoria nelle prossime ${reminderWindowStart}-${reminderWindowEnd} ore`);
      
      // Invia i promemoria
      for (const appointment of apptsToRemind) {
        const success = await this.sendAppointmentReminder(appointment);
        
        if (success) {
          remindersSent++;
        }
      }
      
      console.log(`Inviati ${remindersSent}/${apptsToRemind.length} promemoria`);
      
      return remindersSent;
    } catch (error) {
      console.error("Errore nell'elaborazione dei promemoria:", error);
      throw error;
    }
  }
};