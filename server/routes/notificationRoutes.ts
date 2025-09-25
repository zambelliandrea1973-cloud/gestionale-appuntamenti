import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { formatInTimeZone } from 'date-fns-tz';
import { addDays, addHours, addMinutes, format, parse, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
// Per requisito esplicito, rimosso il controllo isStaff
// import { isStaff } from '../auth';

const router = express.Router();

// Ottiene gli appuntamenti imminenti che necessitano di promemoria
router.get('/upcoming-appointments', async (req: Request, res: Response) => {
  try {
    // Ottieni userId dalla sessione di autenticazione
    const userId = (req as any).user?.id;
    const userType = (req as any).user?.type || 'staff';
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }
    
    // Utilizziamo un approccio più semplice per generare le date di oggi e domani
    const now = new Date();
    // Converti le date in formato stringa YYYY-MM-DD
    const today = format(now, 'yyyy-MM-dd');
    const tomorrow = format(addDays(now, 1), 'yyyy-MM-dd');
    
    console.log(`Cercando appuntamenti per le date: ${today} e ${tomorrow}`);
    
    // CORRETTO: Ottieni solo gli appuntamenti dell'utente autenticato con filtro diretto nel database
    const todayAppointments = await storage.getAppointmentsByDateForUser(today, userId, userType);
    const tomorrowAppointments = await storage.getAppointmentsByDateForUser(tomorrow, userId, userType);
    
    // Già filtrati dal database per l'utente corrente
    const appointments = [...todayAppointments, ...tomorrowAppointments];
    
    // Filtra gli appuntamenti includendo sia quelli 'scheduled' che 'confirmed'
    const eligibleAppointments = appointments.filter(a => 
      (a.status === 'scheduled' || a.status === 'confirmed')
    );
    
    // Aggiungiamo log per debug
    console.log(`Trovati ${appointments.length} appuntamenti totali per date ${today} - ${tomorrow}`);
    console.log(`Filtrati ${eligibleAppointments.length} appuntamenti per notifiche WhatsApp`);
    
    // Raggruppa per data
    const groupedAppointments = eligibleAppointments.reduce((acc: Record<string, any[]>, appointment) => {
      if (!acc[appointment.date]) {
        acc[appointment.date] = [];
      }
      acc[appointment.date].push(appointment);
      return acc;
    }, {});
    
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
// Per requisito esplicito, rimosso il controllo staff per consentire a chiunque abbia accesso
// all'applicazione di inviare promemoria
router.post('/send-batch', async (req: Request, res: Response) => {
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
      
      // Trova il template specifico per il servizio che supporti sia WhatsApp che email (unificato)
      const unifiedTemplate = templates.find(t => 
        t.serviceId === service.id && 
        t.type && 
        t.type.includes('whatsapp') && 
        t.type.includes('email')
      );
      
      // Se non c'è un template unificato, cerca uno che supporti almeno WhatsApp
      const whatsappTemplate = unifiedTemplate || templates.find(t => 
        t.serviceId === service.id && 
        t.type && 
        t.type.includes('whatsapp')
      );
      
      // Usa template unificato, WhatsApp specifico, o default
      const template = unifiedTemplate || whatsappTemplate || defaultTemplate;
      
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
// Per requisito esplicito, rimosso il controllo staff per consentire a chiunque abbia accesso
// all'applicazione di visualizzare lo storico delle notifiche
router.get('/history', async (req: Request, res: Response) => {
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
// Per requisito esplicito, rimosso il controllo staff per consentire a chiunque abbia accesso
// all'applicazione di visualizzare gli appuntamenti di domani
router.get('/tomorrow-appointments', async (req: Request, res: Response) => {
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
// Per requisito esplicito, rimosso il controllo staff per consentire a chiunque abbia accesso
// all'applicazione di inviare promemoria contemporaneamente
router.post('/send-multiple', async (req: Request, res: Response) => {
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
    
    // WhatsApp è ora il sistema predefinito per l'invio di notifiche
    
    const results = [];
    
    // Ottieni i template dei promemoria
    const templates = await storage.getReminderTemplates();
    const defaultTemplate = templates.find(t => t.isDefault);
    
    // Recupera le informazioni di contatto
    const contactInfo = await storage.getContactInfo();
    
    // Ottieni il fuso orario corrente dalle impostazioni
    const tzSettings = await storage.getTimezoneSettings();
    const timezone = tzSettings?.timezone || 'UTC';
    
    // Per ogni appuntamento, invia il promemoria appropriato
    for (const appointmentId of appointmentIds) {
      try {
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
        
        // Trova il template unificato che supporti sia WhatsApp che email
        const unifiedTemplate = templates.find(t => 
          t.serviceId === service.id && 
          t.type && 
          t.type.includes('whatsapp') && 
          t.type.includes('email')
        );
        
        // Se non c'è template unificato, cerca uno specifico per il tipo richiesto
        const typeSpecificTemplate = unifiedTemplate || templates.find(t => 
          t.serviceId === service.id && 
          t.type && 
          t.type.includes(type)
        );
        
        // Usa template unificato, specifico per tipo, o default
        const template = unifiedTemplate || typeSpecificTemplate || defaultTemplate;
        
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
        
        // Logica di invio specifica per il tipo di notifica
        if (type === 'whatsapp') {
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
          
        } else if (type === 'sms' && twilioClient) {
          // Prepara il numero di telefono per SMS (assicurati che inizi con + per formato E.164)
          let phoneNumber = client.phone.replace(/\s+/g, '');
          if (!phoneNumber.startsWith('+')) {
            phoneNumber = '+' + phoneNumber;
          }
          
          try {
            // Invia SMS tramite Twilio
            const smsResult = await twilioClient.messages.create({
              body: message,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: phoneNumber
            });
            
            // Salva la notifica nel database
            await storage.saveNotification({
              appointmentId,
              clientId: client.id,
              type: 'sms',
              message: message,
              channel: 'sms',
              metadata: JSON.stringify({
                sid: smsResult.sid,
                status: smsResult.status
              })
            });
            
            // Aggiorna lo stato del promemoria nell'appuntamento
            let reminderStatus = appointment.reminderStatus || '';
            if (!reminderStatus.includes('sms_sent')) {
              reminderStatus = reminderStatus 
                ? `${reminderStatus},sms_sent` 
                : 'sms_sent';
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
              smsStatus: smsResult.status,
              smsSid: smsResult.sid
            });
          } catch (smsError: any) {
            // Gestione degli errori Twilio
            console.error(`Errore nell'invio SMS a ${phoneNumber}:`, smsError);
            results.push({
              id: appointmentId,
              success: false,
              clientName,
              error: `Errore SMS: ${smsError.message}`
            });
          }
        } else if (type === 'email' && notificationSettings.emailEnabled) {
          // Logica per email - per future implementazioni
          results.push({
            id: appointmentId,
            success: false,
            error: 'Invio email non ancora implementato'
          });
        } else {
          results.push({
            id: appointmentId,
            success: false,
            error: `Tipo di notifica "${type}" non supportato o configurazione incompleta`
          });
        }
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
// Rimosso il controllo isStaff per consentire a chiunque abbia accesso all'app di visualizzare lo storico
router.get('/whatsapp-history', async (req: Request, res: Response) => {
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

/**
 * Ottiene lo storico degli SMS inviati
 */
router.get('/sms-history', async (req: Request, res: Response) => {
  try {
    // Recupera le ultime 100 notifiche SMS
    const notifications = await storage.getNotificationsByType('sms', 100);
    
    res.json({
      success: true,
      notifications
    });
  } catch (error: any) {
    console.error('Errore nel recupero storico SMS:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Invia SMS in batch a tutti gli appuntamenti selezionati
 */
router.post('/send-sms-batch', async (req: Request, res: Response) => {
  try {
    const { appointmentIds, message: customMessage } = req.body;
    
    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'È necessario specificare gli ID degli appuntamenti'
      });
    }
    
    // Verifica se Twilio è configurato
    const notificationSettings = await storage.getNotificationSettings();
    const twilioClient = getTwilioClient();
    
    if (!twilioClient) {
      return res.status(400).json({
        success: false,
        error: 'Twilio non è configurato correttamente. Verifica le credenziali nelle variabili di ambiente.'
      });
    }
    
    // Verifica se l'account è in modalità trial
    const isTrial = await isTwilioTrialAccount();
    
    // Ottieni i template dei promemoria
    const templates = await storage.getReminderTemplates();
    const defaultTemplate = templates.find(t => t.isDefault);
    
    // Recupera le informazioni di contatto
    const contactInfo = await storage.getContactInfo();
    
    // Ottieni il fuso orario corrente dalle impostazioni
    const tzSettings = await storage.getTimezoneSettings();
    const timezone = tzSettings?.timezone || 'UTC';
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    console.log(`Elaborazione invio SMS per ${appointmentIds.length} appuntamenti - Account Trial: ${isTrial ? 'Sì' : 'No'}`);
    
    // Per ogni appuntamento, invia SMS
    for (const appointmentId of appointmentIds) {
      try {
        const appointment = await storage.getAppointment(appointmentId);
        
        if (!appointment) {
          console.warn(`Appuntamento ID ${appointmentId} non trovato`);
          results.push({
            id: appointmentId,
            success: false,
            error: 'Appuntamento non trovato'
          });
          errorCount++;
          continue;
        }
        
        const client = await storage.getClient(appointment.clientId);
        const service = await storage.getService(appointment.serviceId);
        
        if (!client || !service) {
          console.warn(`Dati mancanti per appuntamento ID ${appointmentId}: client=${!!client}, service=${!!service}`);
          results.push({
            id: appointmentId,
            success: false,
            error: 'Dati cliente o servizio mancanti'
          });
          errorCount++;
          continue;
        }
        
        // Verifica che il cliente abbia un numero di telefono
        if (!client.phone || client.phone.trim() === '') {
          console.warn(`Il cliente ${client.firstName} ${client.lastName} (ID: ${client.id}) non ha un numero di telefono`);
          results.push({
            id: appointmentId,
            success: false,
            clientName: `${client.firstName} ${client.lastName}`,
            error: 'Il cliente non ha un numero di telefono'
          });
          errorCount++;
          continue;
        }
        
        // Trova il template specifico per il servizio, altrimenti usa quello di default
        const serviceTemplate = templates.find(t => t.serviceId === service.id);
        const template = serviceTemplate || defaultTemplate;
        
        // Se non c'è alcun template, usa un messaggio predefinito
        let message = template 
          ? template.template // Usiamo il campo template definito nello schema
          : `Gentile {clientName}, le ricordiamo l'appuntamento per {serviceName} del {appointmentDate} alle ore {appointmentTime}.`;
        
        // Usa il messaggio personalizzato se specificato
        if (customMessage && customMessage.trim()) {
          message = customMessage; // Sostituisci completamente il messaggio con quello personalizzato
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
        
        // Prepara il numero di telefono per SMS (assicurati che inizi con + per formato E.164)
        let phoneNumber = client.phone.replace(/\s+/g, '');
        if (!phoneNumber.startsWith('+')) {
          // Aggiunge il prefisso +39 solo se non c'è già un prefisso internazionale
          if (!phoneNumber.match(/^\d{1,3}/)) {
            phoneNumber = '+39' + phoneNumber;
          } else {
            phoneNumber = '+' + phoneNumber;
          }
        }
        
        console.log(`Invio SMS a ${phoneNumber} per cliente ${clientName} (ID: ${client.id}), appuntamento ${appointmentId}`);
        
        try {
          // Se l'account è in modalità trial, avvisa del possibile problema
          if (isTrial) {
            console.warn(`ATTENZIONE: Account Twilio in modalità trial. L'SMS potrebbe non essere consegnato a ${phoneNumber} a meno che non sia un numero verificato nell'account Twilio.`);
          }
          
          // Invia SMS tramite Twilio
          const smsResult = await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
          });
          
          console.log(`SMS inviato con successo a ${phoneNumber}, SID: ${smsResult.sid}, stato: ${smsResult.status}`);
          
          // Salva la notifica nel database
          await storage.saveNotification({
            appointmentId,
            clientId: client.id,
            type: 'sms',
            message: message,
            channel: 'sms',
            metadata: JSON.stringify({
              sid: smsResult.sid,
              status: smsResult.status,
              isTrial
            })
          });
          
          // Aggiorna lo stato del promemoria nell'appuntamento
          let reminderStatus = appointment.reminderStatus || '';
          if (!reminderStatus.includes('sms_sent')) {
            reminderStatus = reminderStatus 
              ? `${reminderStatus},sms_sent` 
              : 'sms_sent';
          }
          
          await storage.updateAppointment(appointmentId, {
            ...appointment,
            reminderStatus
          });
          
          const result = {
            id: appointmentId,
            success: true,
            clientName,
            serviceName: service.name,
            date: appointmentDate,
            time: appointmentTime,
            message,
            smsStatus: smsResult.status,
            smsSid: smsResult.sid
          };
          
          // Se è un account trial, aggiungiamo un avviso nel risultato
          if (isTrial) {
            Object.assign(result, {
              trialAccount: true,
              trialWarning: 'Account Twilio in modalità trial: l\'SMS sarà consegnato solo a numeri verificati nell\'account Twilio.'
            });
          }
          
          results.push(result);
          successCount++;
        } catch (smsError: any) {
          // Gestione dettagliata degli errori Twilio
          let errorMessage = `Errore SMS: ${smsError.message}`;
          let errorCode = smsError.code || 'unknown';
          
          console.error(`Errore nell'invio SMS a ${phoneNumber}:`, smsError);
          
          // Gestione specifica di errori comuni
          if (errorCode === 21608) {
            errorMessage = `Il numero ${phoneNumber} non è verificato. Questo è un limite tipico degli account Twilio in modalità trial.`;
          } else if (errorCode === 21211) {
            errorMessage = `Il numero ${phoneNumber} non è valido. Verifica che sia in formato E.164 (es. +393471234567).`;
          } else if (errorCode === 21612) {
            errorMessage = `Il numero ${phoneNumber} non può ricevere SMS. Potrebbe essere un telefono fisso.`;
          } else if (errorCode === 21610) {
            errorMessage = `Il numero Twilio ${process.env.TWILIO_PHONE_NUMBER} non è autorizzato a inviare SMS a ${phoneNumber}.`;
          } else if (errorCode === 21408) {
            errorMessage = `Il servizio SMS non è abilitato per la regione del numero ${phoneNumber}. È necessario attivare il servizio nel dashboard Twilio.`;
          }
          
          results.push({
            id: appointmentId,
            success: false,
            clientName,
            error: errorMessage,
            errorCode,
            isTrial
          });
          
          errorCount++;
        }
      } catch (err: any) {
        console.error(`Errore generico per appuntamento ID ${appointmentId}:`, err);
        results.push({
          id: appointmentId,
          success: false,
          error: err.message
        });
        errorCount++;
      }
    }
    
    console.log(`Elaborazione invio SMS completata: ${successCount} successi, ${errorCount} errori`);
    
    // Aggiungiamo informazioni generali sulla modalità trial
    const response = {
      success: true,
      results,
      stats: {
        total: appointmentIds.length,
        success: successCount,
        error: errorCount
      }
    };
    
    if (isTrial) {
      Object.assign(response, {
        trialAccount: true,
        trialWarning: 'IMPORTANTE: Stai usando un account Twilio in modalità trial. Gli SMS saranno consegnati SOLO a numeri di telefono verificati nell\'account Twilio. Per inviare SMS a qualsiasi numero, è necessario aggiornare l\'account Twilio a un account pagante.'
      });
    }
    
    res.json(response);
  } catch (error: any) {
    console.error('Errore nell\'invio SMS batch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Marca un appuntamento come "messaggio WhatsApp inviato"
 * Questo endpoint viene chiamato quando un utente clicca il pulsante "Invia" nella pagina WhatsApp
 */
router.post('/mark-sent/:appointmentId', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: 'ID appuntamento mancante'
      });
    }
    
    // Recupera l'appuntamento
    const appointment = await storage.getAppointment(parseInt(appointmentId));
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appuntamento non trovato'
      });
    }
    
    // Aggiorna lo stato del promemoria nell'appuntamento
    let reminderStatus = appointment.reminderStatus || '';
    if (!reminderStatus.includes('whatsapp_generated')) {
      reminderStatus = reminderStatus 
        ? `${reminderStatus},whatsapp_generated` 
        : 'whatsapp_generated';
    }
    
    // Aggiorna l'appuntamento
    await storage.updateAppointment(parseInt(appointmentId), {
      ...appointment,
      reminderStatus
    });
    
    console.log(`Appuntamento ${appointmentId} marcato come "WhatsApp inviato"`);
    
    res.json({
      success: true,
      message: 'Appuntamento marcato come "WhatsApp inviato"'
    });
  } catch (error: any) {
    console.error('Errore nel marcare appuntamento come inviato:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;