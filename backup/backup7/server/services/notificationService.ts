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
      const startTime = appointment.startTime;
      
      // Prepara il messaggio
      const message = `Gentile ${client.firstName}, questo è un promemoria per il suo appuntamento ${service ? `di ${service.name}` : ''} del ${appointmentDate} alle ore ${startTime}. Per modifiche o cancellazioni, la preghiamo di contattarci.`;
      
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
      let result;
      try {
        if (appointment.reminderType === 'sms') {
          result = await this.sendSMS(client.phone, message);
        } else if (appointment.reminderType === 'whatsapp') {
          result = await this.sendWhatsApp(client.phone, message);
        } else {
          throw new Error(`Tipo di promemoria non supportato: ${appointment.reminderType}`);
        }
        
        console.log(`Promemoria inviato con successo per l'appuntamento ${appointment.id}`, result.sid);
        
        // Aggiorna il flag dell'appuntamento per indicare che il promemoria è stato inviato
        await storage.updateAppointment(appointment.id, { reminderStatus: 'sent' });
      } finally {
        // Rimuovi il flag anche in caso di errore
        messagesPendingDelivery.delete(messageId);
      }
      
      return true;
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
      // Ottieni la data di domani
      const tomorrow = addDays(new Date(), 1);
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
      
      console.log(`Elaborazione promemoria per gli appuntamenti del ${tomorrowStr}`);
      
      // Recupera tutti gli appuntamenti di domani
      const appointments = await storage.getAppointmentsByDate(tomorrowStr);
      
      console.log(`Trovati ${appointments.length} appuntamenti per domani`);
      
      let remindersSent = 0;
      
      // Per ogni appuntamento, invia un promemoria se necessario
      for (const appointment of appointments) {
        // Salta gli appuntamenti senza tipo di promemoria o con promemoria già inviato
        if (!appointment.reminderType || appointment.reminderStatus === 'sent') {
          continue;
        }
        
        // Invia il promemoria
        const success = await this.sendAppointmentReminder(appointment);
        
        if (success) {
          remindersSent++;
        }
      }
      
      console.log(`Inviati ${remindersSent}/${appointments.length} promemoria`);
      
      return remindersSent;
    } catch (error) {
      console.error("Errore nell'elaborazione dei promemoria:", error);
      throw error;
    }
  }
};