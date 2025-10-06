import { Router, Request, Response } from 'express';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';
import { loadStorageData } from '../utils/jsonStorage';
import { directNotificationService } from '../services/directNotificationService';

// 📁 Usa funzioni JSON centralizzate da utils/jsonStorage.ts

const router = Router();

/**
 * Ottiene tutti gli appuntamenti del mese corrente
 * 🔧 RIPRISTINO JSON: usa il JSON come tutti gli altri endpoint funzionanti
 */
router.get('/upcoming-appointments', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Non autorizzato'
      });
    }

    // Calcola inizio e fine del mese corrente
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const startDate = format(startOfMonth, 'yyyy-MM-dd');
    const endDate = format(endOfMonth, 'yyyy-MM-dd');
    
    console.log(`🔍 [NOTIFICHE JSON] Cercando appuntamenti del mese: ${startDate} - ${endDate}`);
    
    // 📁 USA JSON come tutti gli altri endpoint che funzionano
    const storageData = loadStorageData();
    const allAppointments = storageData.appointments || [];
    const allClients = storageData.clients || [];
    const userServices = storageData.userServices?.[userId] || [];
    
    // Filtra appuntamenti per tutto il mese + utente owner
    const appointmentsFromJson = allAppointments
      .map(([id, appointment]) => appointment)
      .filter((appointment: any) => {
        // Filtra per date del mese corrente
        if (appointment.date < startDate || appointment.date > endDate) return false;
        
        // Filtra per ownership usando clienti dell'utente
        const client = allClients.find(([cId, c]) => c.id === appointment.clientId)?.[1];
        if (!client) return false;
        
        // Usa ownerId o originalOwnerId per consistenza
        const clientOwnerId = client.ownerId || client.originalOwnerId;
        
        // Permetti accesso solo al proprietario del cliente
        // Admin vede solo i suoi clienti, non quelli di altri
        const user = req.user as any;
        if (clientOwnerId === userId) {
          return true;
        }
        
        return false;
      });
    
    console.log(`📅 [NOTIFICHE JSON] Trovati ${appointmentsFromJson.length} appuntamenti per il mese ${startDate} - ${endDate}`);
    
    // Mappa i risultati nel formato atteso dal frontend con tutti i dati
    const appointments = appointmentsFromJson.map((appointment: any) => {
      const client = allClients.find(([cId, c]) => c.id === appointment.clientId)?.[1];
      const service = userServices.find(s => s.id === appointment.serviceId);
      
      return {
        ...appointment,
        client: client ? {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phone,
          email: client.email
        } : null,
        service: service ? {
          id: service.id,
          name: service.name
        } : null
      };
    });
    
    console.log(`✅ [NOTIFICHE JSON] Processati ${appointments.length} appuntamenti per notifiche WhatsApp`);
    
    res.json({
      success: true,
      appointments
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICHE JSON] Errore nel recupero appuntamenti imminenti:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Invia notifiche WhatsApp in batch per gli appuntamenti selezionati
 */
router.post('/send-batch', async (req: Request, res: Response) => {
  try {
    const { appointmentIds, type = 'whatsapp' } = req.body;
    
    if (!appointmentIds || !Array.isArray(appointmentIds)) {
      return res.status(400).json({
        success: false,
        error: 'IDs appuntamenti mancanti'
      });
    }

    // SIMPLIFIED NOTIFICATION SETTINGS
    const notificationSettings = {
      twilioEnabled: false,
      emailEnabled: false,
      whatsappEnabled: true // Impostiamo WhatsApp come sempre abilitato di default
    };
    
    // Sistema ottimizzato per WhatsApp only
    
    // WhatsApp è ora il sistema predefinito per l'invio di notifiche
    
    const results = [];
    
    for (const appointmentId of appointmentIds) {
      try {
        // 📁 USA JSON COME TUTTI GLI ALTRI ENDPOINT
        const storageData = loadStorageData();
        const allAppointments = storageData.appointments || [];
        const allClients = storageData.clients || [];
        
        // Trova appuntamento dal JSON
        const appointment = allAppointments.find(([id, app]) => app.id === appointmentId)?.[1];
        
        if (!appointment) {
          results.push({
            id: appointmentId,
            success: false,
            error: 'Appuntamento non trovato'
          });
          continue;
        }
        
        // 📁 Trova cliente dal JSON
        const client = allClients.find(([id, c]) => c.id === appointment.clientId)?.[1];
        
        if (!client) {
          results.push({
            id: appointmentId,
            success: false,
            error: 'Cliente non trovato'
          });
          continue;
        }
        
        // 📁 Trova servizio dal JSON
        const userServices = storageData.userServices?.[client.ownerId] || [];
        const service = userServices.find(s => s.id === appointment.serviceId);
        
        if (!service) {
          results.push({
            id: appointmentId,
            success: false,
            error: 'Servizio non trovato'
          });
          continue;
        }
        
        // Dati per il messaggio
        const appointmentDate = format(parseISO(appointment.date), 'dd/MM/yyyy', { locale: it });
        const appointmentTime = appointment.startTime.substring(0, 5);
        const clientName = `${client.firstName} ${client.lastName}`;
        
        // Messaggio WhatsApp ottimizzato
        const message = `Gentile ${client.firstName}. Le ricordiamo il Suo appuntamento di ${service.name} per ${appointmentDate} alle ore ${appointmentTime}.`
          .replace(/{clientName}/g, clientName)
          .replace(/{serviceName}/g, service.name)
          .replace(/{appointmentDate}/g, appointmentDate)
          .replace(/{appointmentTime}/g, appointmentTime);
        
        // Logica di invio specifica per il tipo di notifica
        if (type === 'whatsapp') {
          // Prepara il numero di telefono (rimuovi spazi e + iniziale per WhatsApp)
          const phoneNumber = client.phone.replace(/\s+/g, '').replace(/^\+/, '');
          
          // Genera l'URL di WhatsApp
          const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
          
          // Aggiungi link cliccabile al messaggio
          const messageWithLink = `${message}\n\n[Apri WhatsApp](${whatsappUrl})`;
          
          // SKIP DATABASE SAVE - Solo logga l'invio (evita errori PostgreSQL con ID grandi)
          console.log(`📲 WhatsApp generato per appuntamento ${appointmentId} - Cliente: ${client.firstName} ${client.lastName}`);
          
          // SKIP REMINDER STATUS UPDATE - Evita operazioni PostgreSQL pesanti
          
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
          
        } // SISTEMA OTTIMIZZATO - Solo WhatsApp
        else if (type === 'email' && notificationSettings.emailEnabled) {
          // 📧 RIPRISTINO SISTEMA EMAIL - era funzionante prima
          try {
            if (!client.email) {
              results.push({
                id: appointmentId,
                success: false,
                error: 'Email cliente non disponibile'
              });
              continue;
            }

            const emailSubject = `Promemoria appuntamento - ${service.name}`;
            const emailMessage = `Gentile ${client.firstName},\n\nLe ricordiamo il Suo appuntamento di ${service.name} per il giorno ${appointmentDate} alle ore ${appointmentTime}.\n\nCordiali saluti`;
            
            console.log(`📧 Tentativo invio email a ${client.email} per appuntamento ${appointmentId}`);
            const emailSent = await directNotificationService.sendEmail(client.email, emailSubject, emailMessage);
            
            if (emailSent) {
              console.log(`✅ Email inviata per appuntamento ${appointmentId} - Cliente: ${client.firstName} ${client.lastName}`);
              results.push({
                id: appointmentId,
                success: true,
                clientName,
                serviceName: service.name,
                date: appointmentDate,
                time: appointmentTime,
                message: emailMessage,
                method: 'email'
              });
            } else {
              results.push({
                id: appointmentId,
                success: false,
                error: 'Errore invio email'
              });
            }
          } catch (emailError: any) {
            console.error(`❌ Errore email per appuntamento ${appointmentId}:`, emailError);
            results.push({
              id: appointmentId,
              success: false,
              error: `Errore email: ${emailError.message}`
            });
          }
        } else {
          results.push({
            id: appointmentId,
            success: false,
            error: 'Tipo di notifica non supportato'
          });
        }
        
      } catch (appointmentError: any) {
        console.error(`Errore per appuntamento ${appointmentId}:`, appointmentError);
        results.push({
          id: appointmentId,
          success: false,
          error: appointmentError.message
        });
      }
    }
    
    res.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('Errore nell\'invio notifiche batch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Ottiene lo storico delle notifiche WhatsApp inviate
 */
router.get('/whatsapp-history', async (req: Request, res: Response) => {
  try {
    // Sistema semplificato - restituisce array vuoto per ora
    res.json({
      success: true,
      notifications: []
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
 * Marca un appuntamento come "messaggio WhatsApp inviato"
 * Salva timestamp per cancellazione automatica dopo 30 giorni
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
    
    // Carica dati dal JSON
    const storageData = loadStorageData();
    const allAppointments = storageData.appointments || [];
    
    // Trova l'appuntamento
    const appointmentIndex = allAppointments.findIndex(([id, app]) => app.id === parseInt(appointmentId));
    
    if (appointmentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Appuntamento non trovato'
      });
    }
    
    const [id, appointment] = allAppointments[appointmentIndex];
    
    // Aggiorna reminderStatus e aggiungi timestamp
    let reminderStatus = appointment.reminderStatus || '';
    if (!reminderStatus.includes('whatsapp_generated')) {
      reminderStatus = reminderStatus 
        ? `${reminderStatus},whatsapp_generated` 
        : 'whatsapp_generated';
    }
    
    const updatedAppointment = {
      ...appointment,
      reminderStatus,
      whatsappSentAt: new Date().toISOString() // Timestamp per cancellazione dopo 30 giorni
    };
    
    allAppointments[appointmentIndex] = [id, updatedAppointment];
    storageData.appointments = allAppointments;
    
    // Salva nel JSON (stesso percorso di loadStorageData)
    const storagePath = path.join(process.cwd(), 'storage_data.json');
    fs.writeFileSync(storagePath, JSON.stringify(storageData, null, 2));
    
    console.log(`✅ Appuntamento ${appointmentId} marcato come "WhatsApp inviato" - timestamp: ${updatedAppointment.whatsappSentAt}`);
    
    res.json({
      success: true,
      message: 'Appuntamento marcato come "WhatsApp inviato"',
      whatsappSentAt: updatedAppointment.whatsappSentAt
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