import { format, addDays, isBefore } from 'date-fns';
import { Appointment } from '@shared/schema';
import { directNotificationService } from './directNotificationService';
import fs from 'fs';
import path from 'path';
import { loadStorageData, saveStorageData } from '../utils/jsonStorage';

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
   * 📁 SISTEMA SOLO JSON - Rimosso PostgreSQL completamente
   * @param appointment L'appuntamento per cui inviare il promemoria
   * @returns true se il promemoria è stato inviato con successo, false altrimenti
   */
  async sendAppointmentReminder(appointment: Appointment): Promise<boolean> {
    try {
      // Verifica che l'appuntamento abbia un tipo di promemoria specificato e un clientId
      if (!appointment.reminderType || !appointment.clientId) {
        console.error(`❌ [NOTIFICHE JSON] Impossibile inviare promemoria: dati mancanti nell'appuntamento`, appointment);
        return false;
      }
      
      // 📁 RECUPERA DATI DAL JSON (non PostgreSQL)
      const storageData = loadStorageData();
      const allClients = storageData.clients || [];
      
      // Trova il cliente dal JSON
      const client = allClients.find(([id, c]) => c.id === appointment.clientId)?.[1];
      if (!client) {
        console.error(`❌ [NOTIFICHE JSON] Cliente non trovato per l'appuntamento ${appointment.id}`);
        return false;
      }
      
      // Verifica che il cliente abbia un numero di telefono
      if (!client.phone) {
        console.error(`❌ [NOTIFICHE JSON] Il cliente ${client.id} (${client.firstName} ${client.lastName}) non ha un numero di telefono`);
        return false;
      }

      // 📁 RECUPERA SERVIZIO DAL JSON (trova owner tramite cliente)
      const userServices = storageData.userServices?.[client.ownerId] || [];
      const service = appointment.serviceId ? userServices.find(s => s.id === appointment.serviceId) : null;
      
      // 📁 RECUPERA COLLABORATORE DAL JSON (se presente)
      const allCollaborators = storageData.collaborators || [];
      const staff = appointment.staffId ? allCollaborators.find(([id, c]) => c.id === appointment.staffId)?.[1] : null;
      
      // 📁 RECUPERA STANZA DAL JSON (se presente)
      const allRooms = storageData.treatmentRooms || [];
      const room = appointment.roomId ? allRooms.find(([id, r]) => r.id === appointment.roomId)?.[1] : null;
      
      // Formatta la data e l'ora dell'appuntamento
      const appointmentDate = format(new Date(appointment.date), 'dd/MM/yyyy');
      const startTime = appointment.startTime.substring(0, 5); // Estrae solo HH:MM
      
      // 📁 TEMPLATE SEMPLIFICATO (niente PostgreSQL)
      // Messaggio predefinito con tutti i dettagli disponibili
      let appointmentDetails = '';
      if (service) appointmentDetails += `di ${service.name}`;
      if (staff) appointmentDetails += ` con ${staff.firstName} ${staff.lastName}`;
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
              // Carica la configurazione email dal file separato
              const fs = await import('fs');
              const path = await import('path');
              const emailConfigPath = 'email_settings.json';
              
              try {
                const emailConfigData = fs.readFileSync(emailConfigPath, 'utf8');
                const emailConfig = JSON.parse(emailConfigData);
                
                if (emailConfig.emailEnabled && emailConfig.emailAddress && emailConfig.emailPassword) {
                  const success = await this.sendEmailDirect(client.email, `Promemoria appuntamento del ${appointmentDate}`, message, emailConfig);
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
        
        // 📁 AGGIORNA STATO NEL JSON (non PostgreSQL)
        if (successCount > 0) {
          // Trova e aggiorna l'appuntamento nel JSON
          const updatedStorageData = loadStorageData();
          const appointmentIndex = updatedStorageData.appointments.findIndex(([id, app]) => app.id === appointment.id);
          if (appointmentIndex !== -1) {
            updatedStorageData.appointments[appointmentIndex][1].reminderStatus = 'sent';
            saveStorageData(updatedStorageData);
          }
          console.log(`✅ [NOTIFICHE JSON] Promemoria inviato con successo per l'appuntamento ${appointment.id}. Canali riusciti: ${successCount}, falliti: ${errorCount}`);
        } else {
          // Trova e aggiorna l'appuntamento nel JSON
          const updatedStorageData = loadStorageData();
          const appointmentIndex = updatedStorageData.appointments.findIndex(([id, app]) => app.id === appointment.id);
          if (appointmentIndex !== -1) {
            updatedStorageData.appointments[appointmentIndex][1].reminderStatus = 'failed';
            saveStorageData(updatedStorageData);
          }
          console.error(`❌ [NOTIFICHE JSON] Tutti i tentativi di invio promemoria per l'appuntamento ${appointment.id} sono falliti`);
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
   * 📁 SISTEMA SOLO JSON - Rimosso PostgreSQL completamente
   * @returns Il numero di promemoria inviati con successo
   */
  async processReminders(): Promise<number> {
    try {
      // 📁 FUSO ORARIO FISSO (niente PostgreSQL)
      let TIMEZONE_OFFSET_HOURS = 2; // Valore predefinito per l'Italia (CEST, UTC+2)
      let timezoneName = "Europe/Rome";
      
      console.log(`✅ [NOTIFICHE JSON] Utilizzo fuso orario predefinito: ${timezoneName} (UTC+${TIMEZONE_OFFSET_HOURS})`);
      
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
      
      // 📁 RECUPERA APPUNTAMENTI DAL JSON (non PostgreSQL)
      let appointments = [];
      
      try {
        const storageData = loadStorageData();
        const allAppointments = storageData.appointments || [];
        
        console.log(`🔍 [NOTIFICHE JSON] Recupero appuntamenti dal JSON per il range: ${todayStr} - ${tomorrowStr}`);
        
        // Filtra appuntamenti per oggi e domani
        appointments = allAppointments
          .map(([id, appointment]) => appointment)
          .filter((appointment: any) => {
            return appointment.date === todayStr || appointment.date === tomorrowStr;
          });
        
      } catch (error) {
        console.error('❌ [NOTIFICHE JSON] Errore nel recupero appuntamenti per promemoria:', error);
        appointments = [];
      }
      
      console.log(`Trovati ${appointments.length} appuntamenti potenziali per il range ${todayStr} - ${tomorrowStr}`);
      
      let remindersSent = 0;
      const apptsToRemind = [];
      
      // Filtra gli appuntamenti per trovare quelli nelle prossime 24-25 ore
      for (const appointment of appointments) {
        // Salta gli appuntamenti con promemoria già inviato
        if (appointment.reminderStatus === 'sent') {
          continue;
        }
        
        // Se l'appuntamento ha un tipo di promemoria specifico, lo rispettiamo
        // Altrimenti, verifichiamo se l'utente ha WhatsApp abilitato nelle impostazioni
        let shouldSendReminder = false;
        
        if (appointment.reminderType) {
          // L'appuntamento ha un tipo di promemoria specifico
          shouldSendReminder = true;
        } else {
          // 📁 CONTROLLO IMPOSTAZIONI DAL JSON (non PostgreSQL)
          try {
            const reminderStorageData = loadStorageData();
            const allClients = reminderStorageData.clients || [];
            
            // Trova il cliente dal JSON
            const client = allClients.find(([id, c]) => c.id === appointment.clientId)?.[1];
            if (client && client.ownerId) {
              // 📧 SISTEMA AUTOMATICO: Email automatiche + WhatsApp manuali
              // Per i promemoria automatici, impostiamo email (automatica) + whatsapp (manuale nel centro)
              appointment.reminderType = 'email,whatsapp';
              shouldSendReminder = true;
              console.log(`✅ [NOTIFICHE JSON] Appuntamento ID ${appointment.id}: impostato automaticamente reminderType=email,whatsapp per utente ${client.ownerId}`);
            }
          } catch (error) {
            console.log(`❌ [NOTIFICHE JSON] Errore nel recupero impostazioni per appuntamento ${appointment.id}:`, error);
          }
        }
        
        if (!shouldSendReminder) {
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
        
        // Verifica se l'appuntamento è tra 22 e 26 ore nel futuro
        // Range ampliato per catturare tutti gli appuntamenti della giornata successiva
        if (hoursDiff >= 22 && hoursDiff <= 26) {
          console.log(`Appuntamento ID ${appointment.id} è tra ${hoursDiff.toFixed(1)} ore, invio promemoria...`);
          apptsToRemind.push(appointment);
        }
      }
      
      console.log(`Trovati ${apptsToRemind.length} appuntamenti che necessitano di promemoria nelle prossime 22-26 ore`);
      
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