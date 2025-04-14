import twilio from 'twilio';
import { format, addDays, isBefore } from 'date-fns';
import { Appointment } from '@shared/schema';
import { storage } from '../storage';

// Configura il client Twilio utilizzando le variabili d'ambiente
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const messagesPendingDelivery = new Map<string, boolean>();

/**
 * Servizio per l'invio di notifiche e promemoria
 */
export const notificationService = {
  /**
   * Invia un messaggio SMS utilizzando Twilio
   * @param to Numero di telefono del destinatario in formato internazionale (es. +39123456789)
   * @param message Testo del messaggio da inviare
   * @returns Una Promise che risolve nei dettagli del messaggio inviato
   */
  async sendSMS(to: string, message: string): Promise<any> {
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      throw new Error('Mancano le credenziali Twilio nelle variabili d\'ambiente');
    }
    
    // Inizializza il client Twilio
    const client = twilio(accountSid, authToken);
    
    // Formatta il numero se non inizia con "+"
    const formattedTo = to.startsWith('+') ? to : `+${to}`;
    
    console.log(`Invio SMS a ${formattedTo}: ${message}`);
    
    // Invia il messaggio
    const sentMessage = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedTo
    });
    
    console.log(`SMS inviato con successo, SID: ${sentMessage.sid}`);
    
    return sentMessage;
  },
  
  /**
   * Invia un messaggio WhatsApp utilizzando Twilio
   * @param to Numero di telefono del destinatario in formato internazionale (es. +39123456789)
   * @param message Testo del messaggio da inviare
   * @returns Una Promise che risolve nei dettagli del messaggio inviato
   */
  async sendWhatsApp(to: string, message: string): Promise<any> {
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      throw new Error('Mancano le credenziali Twilio nelle variabili d\'ambiente');
    }
    
    // Inizializza il client Twilio
    const client = twilio(accountSid, authToken);
    
    // Formatta il numero se non inizia con "+"
    const formattedTo = to.startsWith('+') ? to : `+${to}`;
    
    console.log(`Invio WhatsApp a ${formattedTo}: ${message}`);
    
    // Invia il messaggio WhatsApp
    // Nota: per WhatsApp, il "from" deve essere nel formato "whatsapp:+1234567890"
    const sentMessage = await client.messages.create({
      body: message,
      from: `whatsapp:${twilioPhoneNumber}`,
      to: `whatsapp:${formattedTo}`
    });
    
    console.log(`WhatsApp inviato con successo, SID: ${sentMessage.sid}`);
    
    return sentMessage;
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
              // Per ora registriamo solo l'intenzione di inviare email, da implementare
              console.log(`Email non implementata per il cliente ${client.id} all'indirizzo ${client.email}`);
              // In futuro, implementare l'invio effettivo di email
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
      const now = new Date();
      const nowPlus24Hours = addDays(now, 1);
      const nowPlus25Hours = new Date(nowPlus24Hours.getTime() + 60 * 60 * 1000); // +1 ora
      
      // Ottieni le date nel formato yyyy-MM-dd per oggi e domani
      const todayStr = format(now, 'yyyy-MM-dd');
      const tomorrowStr = format(nowPlus24Hours, 'yyyy-MM-dd');
      
      console.log(`Elaborazione promemoria per appuntamenti tra ${now.toISOString()} e ${nowPlus25Hours.toISOString()}`);
      
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
      
      // Filtra gli appuntamenti per trovare quelli nelle prossime 24-25 ore
      for (const appointment of appointments) {
        // Salta gli appuntamenti senza tipo di promemoria o con promemoria già inviato
        if (!appointment.reminderType || appointment.reminderStatus === 'sent') {
          continue;
        }
        
        // Crea un oggetto Date per l'appuntamento
        const apptDate = new Date(appointment.date + 'T' + appointment.startTime);
        
        // Calcola la differenza in ore tra l'appuntamento e ora
        const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
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