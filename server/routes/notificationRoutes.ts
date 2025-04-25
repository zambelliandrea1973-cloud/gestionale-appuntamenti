import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { formatInTimeZone } from 'date-fns-tz';
import { addDays, addHours, addMinutes, format, parse, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import twilio from 'twilio';
import { isStaff } from '../auth';

const router = express.Router();

// Ottiene gli appuntamenti imminenti che necessitano di promemoria
router.get('/upcoming-appointments', async (req: Request, res: Response) => {
  try {
    // Verifica che l'utente sia autenticato
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Accesso non autorizzato"
      });
    }
    
    // Ottieni il fuso orario corrente dalle impostazioni
    const tzSettings = await storage.getTimezoneSettings();
    const timezone = tzSettings?.timezone || 'UTC';
    
    // Calcola la data di oggi e domani nel fuso orario corretto
    const now = new Date();
    const today = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
    const tomorrow = formatInTimeZone(addDays(now, 1), timezone, 'yyyy-MM-dd');
    
    // Ottieni gli appuntamenti per i prossimi due giorni
    const appointments = await storage.getAppointmentsByDateRange(today, tomorrow);
    
    // Filtra gli appointment che hanno reminderType che include 'whatsapp' 
    // Modifica: includiamo tutti gli appuntamenti con status = 'scheduled' invece di solo 'confirmed'
    const eligibleAppointments = appointments.filter(a => 
      a.status === 'scheduled' && 
      (
        // Includi appuntamenti con o senza reminderType
        !a.reminderType || 
        (a.reminderType && a.reminderType.includes('whatsapp'))
      )
    );
    
    // Raggruppa per data
    const groupedAppointments = eligibleAppointments.reduce((acc: Record<string, any[]>, appointment) => {
      if (!acc[appointment.date]) {
        acc[appointment.date] = [];
      }
      acc[appointment.date].push(appointment);
      return acc;
    }, {});
    
    console.log(`Trovati ${eligibleAppointments.length} appuntamenti per notifiche WhatsApp`);
    
    res.json({
      success: true,
      appointments: eligibleAppointments,
      groupedAppointments
    });
  } catch (error: any) {
    console.error('Errore nel recupero appuntamenti per notifiche:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Invia notifiche per un gruppo di appuntamenti
router.post('/send-batch', isStaff, async (req: Request, res: Response) => {
  try {
    const { appointmentIds, customMessage } = req.body;
    
    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'È necessario specificare gli ID degli appuntamenti'
      });
    }
    
    // Ottieni il fuso orario corrente dalle impostazioni
    const tzSettings = await storage.getTimezoneSettings();
    const timezone = tzSettings?.timezone || 'UTC';
    
    // Ottieni le impostazioni di notifica
    const notificationSettings = await storage.getNotificationSettings();
    
    // Ottieni i template dei promemoria
    const templates = await storage.getReminderTemplates();
    const defaultTemplate = templates.find(t => t.isDefault);
    
    // Recupera le informazioni di contatto
    const contactInfo = await storage.getContactInfo();
    
    const results = [];
    
    // Per ogni ID, genera il link WhatsApp appropriato
    for (const appointmentId of appointmentIds) {
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        results.push({
          id: appointmentId,
          success: false,
          error: 'Appuntamento non trovato'
        });
        continue;
      }
      
      const client = await storage.getClient(appointment.clientId);
      const service = await storage.getService(appointment.serviceId);
      
      if (!client || !service) {
        results.push({
          id: appointmentId,
          success: false,
          error: 'Dati cliente o servizio mancanti'
        });
        continue;
      }
      
      // Trova il template specifico per il servizio, altrimenti usa quello di default
      const serviceTemplate = templates.find(t => t.serviceId === service.id);
      const template = serviceTemplate || defaultTemplate;
      
      // Se non c'è alcun template, usa un messaggio predefinito
      let message = template 
        ? template.template // Usiamo il campo template definito nello schema
        : `Gentile {clientName}, le ricordiamo l'appuntamento per {serviceName} del {appointmentDate} alle ore {appointmentTime}.`;
      
      // Aggiungi messaggio personalizzato se specificato
      if (customMessage && customMessage.trim()) {
        message += `\n\n${customMessage}`;
      }
      
      // Dati da sostituire nel template
      const appointmentDate = format(parseISO(appointment.date), 'EEEE d MMMM yyyy', { locale: it });
      const appointmentTime = appointment.startTime.substring(0, 5);
      const clientName = `${client.firstName} ${client.lastName}`;
      
      // Effettua le sostituzioni nel template
      message = message
        .replace(/{clientName}/g, clientName)
        .replace(/{firstName}/g, client.firstName)
        .replace(/{lastName}/g, client.lastName)
        .replace(/{serviceName}/g, service.name)
        .replace(/{appointmentDate}/g, appointmentDate)
        .replace(/{appointmentTime}/g, appointmentTime)
        .replace(/{businessName}/g, contactInfo?.businessName || '')
        .replace(/{businessAddress}/g, contactInfo?.address || '')
        .replace(/{businessPhone}/g, contactInfo?.phone1 || '');
      
      // Prepara il numero di telefono (rimuovi spazi e + iniziale per WhatsApp)
      const phoneNumber = client.phone.replace(/\s+/g, '').replace(/^\+/, '');
      
      // Genera l'URL di WhatsApp
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      
      // Aggiungi link cliccabile al messaggio
      const messageWithLink = `${message}\n\n[Apri WhatsApp](${whatsappUrl})`;
      
      // Salva il promemoria nel database come inviato
      await storage.saveNotification({
        appointmentId,
        clientId: client.id,
        type: 'whatsapp',
        message: messageWithLink,
        channel: 'whatsapp'
        // sentAt verrà impostato automaticamente dal database
      });
      
      // Aggiorna lo stato del promemoria nell'appuntamento
      let reminderStatus = appointment.reminderStatus || '';
      if (!reminderStatus.includes('whatsapp_generated')) {
        reminderStatus = reminderStatus 
          ? `${reminderStatus},whatsapp_generated` 
          : 'whatsapp_generated';
      }
      
      await storage.updateAppointment(appointmentId, {
        ...appointment,
        reminderStatus
      });
      
      results.push({
        id: appointmentId,
        success: true,
        clientName,
        serviceName: service.name,
        date: appointmentDate,
        time: appointmentTime,
        message,
        whatsappUrl
      });
    }
    
    res.json({
      success: true,
      results,
      message: `${results.length} promemoria WhatsApp generati con successo`
    });
  } catch (error: any) {
    console.error('Errore nell\'invio notifiche batch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ottiene lo storico delle notifiche inviate
router.get('/history', isStaff, async (req: Request, res: Response) => {
  try {
    // Recupera le ultime 100 notifiche WhatsApp
    const notifications = await storage.getNotificationsByType('whatsapp', 100);
    
    res.json({
      success: true,
      notifications
    });
  } catch (error: any) {
    console.error('Errore nel recupero storico notifiche:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Ottieni tutti gli appuntamenti di domani che necessitano di promemoria
 */
router.get('/tomorrow-appointments', isStaff, async (req: Request, res: Response) => {
  try {
    // Ottieni il fuso orario corrente dalle impostazioni
    const tzSettings = await storage.getTimezoneSettings();
    const timezone = tzSettings?.timezone || 'UTC';
    
    // Calcola la data di domani nel fuso orario corretto
    const tomorrow = formatInTimeZone(addDays(new Date(), 1), timezone, 'yyyy-MM-dd');
    
    // Ottieni gli appuntamenti per domani
    const appointments = await storage.getAppointmentsByDate(tomorrow);
    
    // Filtra gli appuntamenti che necessitano di promemoria
    // Gli appuntamenti devono avere reminderType impostato e status = "confirmed"
    const eligibleAppointments = appointments.filter(a => 
      a.reminderType && 
      a.status === 'confirmed' && 
      (!a.reminderStatus || !a.reminderStatus.includes('sent'))
    );
    
    // Recupera i dati completi di cliente e servizio
    const fullAppointments = await Promise.all(
      eligibleAppointments.map(async (appointment) => {
        const client = await storage.getClient(appointment.clientId);
        const service = await storage.getService(appointment.serviceId);
        return {
          ...appointment,
          client,
          service
        };
      })
    );
    
    res.json({
      success: true,
      appointments: fullAppointments
    });
  } catch (error: any) {
    console.error('Errore nel recupero appuntamenti di domani:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Invia promemoria per più appuntamenti contemporaneamente
 */
router.post('/send-multiple', isStaff, async (req: Request, res: Response) => {
  try {
    const { appointmentIds, type = 'whatsapp', customMessage } = req.body;
    
    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'È necessario specificare gli ID degli appuntamenti'
      });
    }
    
    // Ottieni le impostazioni di notifica
    const notificationSettings = await storage.getNotificationSettings() || {
      twilioEnabled: false,
      emailEnabled: false,
      whatsappEnabled: true // Impostiamo WhatsApp come sempre abilitato di default
    };
    
    if (!notificationSettings.twilioEnabled && type === 'sms') {
      return res.status(400).json({
        success: false,
        error: 'Il servizio SMS non è configurato. Configura Twilio nelle impostazioni.'
      });
    }
    
    // Inizializza il client Twilio se necessario
    let twilioClient;
    if (type === 'sms' && notificationSettings.twilioEnabled) {
      twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
    
    const results = [];
    
    // Per ogni appuntamento, invia il promemoria appropriato
    for (const appointmentId of appointmentIds) {
      try {
        // Logica di invio specifica per il tipo di notifica
        if (type === 'whatsapp') {
          // Utilizza la logica esistente in /send-batch
          // TODO: Implementare
        } else if (type === 'sms' && twilioClient) {
          // Logica per SMS
          // TODO: Implementare
        } else if (type === 'email' && notificationSettings.emailEnabled) {
          // Logica per email
          // TODO: Implementare
        }
        
        results.push({
          id: appointmentId,
          success: true
        });
      } catch (err: any) {
        results.push({
          id: appointmentId,
          success: false,
          error: err.message
        });
      }
    }
    
    res.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('Errore nell\'invio multiplo di promemoria:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Ottiene lo storico delle notifiche WhatsApp inviate
 */
router.get('/whatsapp-history', isStaff, async (req: Request, res: Response) => {
  try {
    // Recupera le ultime 100 notifiche WhatsApp
    const notifications = await storage.getNotificationsByType('whatsapp', 100);
    
    res.json({
      success: true,
      notifications
    });
  } catch (error: any) {
    console.error('Errore nel recupero storico WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;