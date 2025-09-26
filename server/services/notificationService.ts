import { format, addDays, isBefore } from 'date-fns';
import { Appointment } from '@shared/schema';
import { storage } from '../storage';
import { directNotificationService } from './directNotificationService';

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
   * Invia un'email utilizzando direttamente la configurazione dal file
   * @param to Indirizzo email del destinatario
   * @param subject Oggetto dell'email
   * @param message Testo dell'email
   * @param emailConfig Configurazione email dal file
   * @returns Una Promise che risolve a true se l'invio è riuscito
   */
  async sendEmailDirect(to: string, subject: string, message: string, emailConfig: any): Promise<boolean> {
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
      console.log(`Email promemoria inviata con successo: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('Errore nell\'invio dell\'email promemoria:', error);
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
   * @param appointment L'appuntamento per cui inviare il promemoria
   * @returns true se il promemoria è stato inviato con successo, false altrimenti
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
      
      // Verifica che il cliente abbia un numero di telefono
      if (!client.phone) {
        console.error(`Il cliente ${client.id} (${client.firstName} ${client.lastName}) non ha un numero di telefono`);
        return false;
      }

      // Recupera i dati del servizio
      const service = appointment.serviceId ? await storage.getService(appointment.serviceId) : null;
      
      // Recupera i dati del collaboratore se presente
      const staff = appointment.staffId ? await storage.getCollaborator(appointment.staffId) : null;
      
      // Recupera i dati della stanza se presente
      const room = appointment.roomId ? await storage.getTreatmentRoom(appointment.roomId) : null;
      
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
          .replace('{{ora}}', startTime)
          .replace('{{collaboratore}}', staff ? `${staff.firstName} ${staff.lastName}` : '')
          .replace('{{stanza}}', room ? room.name : '');
      } else {
        // Messaggio predefinito con data e ora incluse
        let appointmentDetails = '';
        if (service) appointmentDetails += `di ${service.name}`;
        if (staff) appointmentDetails += ` con ${staff.firstName} ${staff.lastName}`;
        if (room) appointmentDetails += ` nella ${room.name}`;
        
        message = `Gentile ${client.firstName}, questo è un promemoria per il suo appuntamento${appointmentDetails ? ` ${appointmentDetails}` : ''} del ${appointmentDate} alle ore ${startTime}. Per modifiche o cancellazioni, la preghiamo di contattarci.`;
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
              // Carica la configurazione email dal file separato
              const fs = await import('fs');
              const path = await import('path');
              const emailConfigPath = 'email_settings.json';
              
              try {
                const emailConfigData = fs.readFileSync(emailConfigPath, 'utf8');
                const emailConfig = JSON.parse(emailConfigData);
                
                if (emailConfig.emailEnabled && emailConfig.emailAddress && emailConfig.emailPassword) {
                  const success = await this.sendEmailDirect(client.email, reminderTemplate?.subject || `Promemoria appuntamento del ${appointmentDate}`, message, emailConfig);
                  if (success) {
                    console.log(`Email inviata con successo per l'appuntamento ${appointment.id} a ${client.email}`);
                    successCount++;
                  } else {
                    console.error(`Errore nell'invio email per l'appuntamento ${appointment.id}`);
                    errorCount++;
                  }
                } else {
                  console.log(`Configurazione email non completa - Email abilitata: ${emailConfig.emailEnabled}, Indirizzo configurato: ${!!emailConfig.emailAddress}, Password configurata: ${!!emailConfig.emailPassword}`);
                  errorCount++;
                }
              } catch (error) {
                console.error(`Errore nel caricamento della configurazione email:`, error);
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
        
        // Aggiorna lo stato del promemoria
        if (successCount > 0) {
          await storage.updateAppointment(appointment.id, { reminderStatus: 'sent' });
          console.log(`Promemoria inviato con successo per l'appuntamento ${appointment.id}. Canali riusciti: ${successCount}, falliti: ${errorCount}`);
        } else {
          await storage.updateAppointment(appointment.id, { reminderStatus: 'failed' });
          console.error(`Tutti i tentativi di invio promemoria per l'appuntamento ${appointment.id} sono falliti`);
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
      
      // Otteniamo la data attuale
      const now = new Date();
      
      // Creazione delle date per il controllo dei promemoria
      const nowPlus24Hours = addDays(now, 1);
      const nowPlus25Hours = new Date(nowPlus24Hours.getTime() + 60 * 60 * 1000); // +1 ora
      
      // Ottieni le date nel formato yyyy-MM-dd per oggi e domani
      const todayStr = format(now, 'yyyy-MM-dd');
      const tomorrowStr = format(nowPlus24Hours, 'yyyy-MM-dd');
      
      console.log(`Elaborazione promemoria per appuntamenti tra ${now.toISOString()} e ${nowPlus25Hours.toISOString()}`);
      console.log(`Orario server: ${now.toLocaleTimeString('it-IT')}, utilizzo orario diretto senza applicazione dell'offset`);
      
      // FIXME: Il sistema di promemoria deve recuperare appuntamenti da TUTTI gli utenti
      // Per ora raccogliamo gli appuntamenti di tutti gli utenti attivi
      // In futuro si potrebbe configurare per utente specifico
      let appointments = [];
      
      try {
        // Usa getAppointmentsByDateRange che è più sicura e non ha problemi multi-tenant
        const startDate = todayStr;
        const endDate = tomorrowStr;
        
        console.log(`Recupero appuntamenti dal database per il range: ${startDate} - ${endDate}`);
        appointments = await storage.getAppointmentsByDateRange(startDate, endDate);
        
      } catch (error) {
        console.error('Errore nel recupero appuntamenti per promemoria:', error);
        appointments = [];
      }
      
      console.log(`Trovati ${appointments.length} appuntamenti potenziali per il range ${todayStr} - ${tomorrowStr}`);
      
      let remindersSent = 0;
      const apptsToRemind = [];
      
      // Filtra gli appuntamenti per trovare quelli nelle prossime 24-25 ore
      for (const appointment of appointments) {
        // Salta gli appuntamenti senza tipo di promemoria o con promemoria già inviato
        if (!appointment.reminderType || appointment.reminderStatus === 'sent') {
          continue;
        }
        
        // Crea un oggetto Date per l'appuntamento
        const apptDate = new Date(appointment.date + 'T' + appointment.startTime);
        
        // Calcoliamo semplicemente la differenza oraria in ore senza complicare con offset
        // Utilizziamo direttamente il timestamp come riferimento assoluto
        const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // Logghiamo informazioni utili per il debug
        console.log(`Appuntamento ID ${appointment.id} del ${appointment.date} alle ${appointment.startTime}: ` +
                    `Ore di differenza: ${hoursDiff.toFixed(1)} (usando timestamp diretto senza offset)`);
        
        // Verifica se l'appuntamento è tra 23 e 25 ore nel futuro
        // Usiamo 23 invece di 24 per dare un po' di margine e non perderci promemoria
        if (hoursDiff >= 23 && hoursDiff <= 25) {
          console.log(`Appuntamento ID ${appointment.id} è tra ${hoursDiff.toFixed(1)} ore, invio promemoria...`);
          apptsToRemind.push(appointment);
        }
      }
      
      console.log(`Trovati ${apptsToRemind.length} appuntamenti che necessitano di promemoria nelle prossime 24-25 ore`);
      
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