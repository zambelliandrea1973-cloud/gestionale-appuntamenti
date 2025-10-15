import { Router, Request, Response } from 'express';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';
import { directNotificationService } from '../services/directNotificationService';
import { db } from '../db';
import { appointments, clients, services } from '../../shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

// 🔄 MIGRATO A POSTGRESQL per sincronizzazione Replit ↔ Sliplane

const router = Router();

/**
 * Ottiene tutti gli appuntamenti del mese corrente
 * 🔄 USA POSTGRESQL per sincronizzazione Replit ↔ Sliplane
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

    // Calcola ultimi 10 giorni fino a domani (storico + imminenti, NO futuro lontano)
    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startDate = format(tenDaysAgo, 'yyyy-MM-dd');
    const endDate = format(tomorrow, 'yyyy-MM-dd');
    
    console.log(`🔍 [NOTIFICHE PG] Cercando appuntamenti da ultimi 10gg a domani: ${startDate} - ${endDate}`);
    
    // 🔄 USA POSTGRESQL: Query con JOIN per client e service
    // ✅ MULTI-TENANT: Filtra per userId (ogni staff vede solo i suoi)
    const appointmentsData = await db
      .select({
        id: appointments.id,
        clientId: appointments.clientId,
        serviceId: appointments.serviceId,
        staffId: appointments.staffId,
        roomId: appointments.roomId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        notes: appointments.notes,
        status: appointments.status,
        reminderType: appointments.reminderType,
        reminderStatus: appointments.reminderStatus,
        reminderSent: appointments.reminderSent,
        createdAt: appointments.createdAt,
        // Client data
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        // Service data
        serviceName: services.name,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.userId, userId), // ✅ MULTI-TENANT ISOLATION
          gte(appointments.date, startDate),
          lte(appointments.date, endDate)
        )
      );
    
    console.log(`📅 [NOTIFICHE PG] Trovati ${appointmentsData.length} appuntamenti da ${startDate} a ${endDate}`);
    
    // Mappa i risultati nel formato atteso dal frontend
    const appointmentsList = appointmentsData.map((row) => ({
      id: row.id,
      clientId: row.clientId,
      serviceId: row.serviceId,
      staffId: row.staffId,
      roomId: row.roomId,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      notes: row.notes,
      status: row.status,
      reminderType: row.reminderType,
      reminderStatus: row.reminderStatus,
      reminderSent: row.reminderSent,
      createdAt: row.createdAt,
      client: {
        id: row.clientId,
        firstName: row.clientFirstName,
        lastName: row.clientLastName,
        phone: row.clientPhone,
        email: row.clientEmail,
      },
      service: row.serviceName ? {
        id: row.serviceId,
        name: row.serviceName,
      } : null,
    }));
    
    console.log(`✅ [NOTIFICHE PG] Processati ${appointmentsList.length} appuntamenti per notifiche WhatsApp`);
    
    res.json({
      success: true,
      appointments: appointmentsList
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICHE PG] Errore nel recupero appuntamenti imminenti:', error);
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
    
    // 🔄 USA POSTGRESQL: Carica tutti gli appointments in batch con JOIN
    const appointmentsData = await db
      .select({
        id: appointments.id,
        clientId: appointments.clientId,
        serviceId: appointments.serviceId,
        date: appointments.date,
        startTime: appointments.startTime,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        serviceName: services.name,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.userId, (req as any).user?.id), // ✅ MULTI-TENANT
          // Filtra solo gli ID richiesti (usando OR)
        )
      );
    
    // Filtra solo gli appointments richiesti
    const appointmentsMap = new Map(
      appointmentsData
        .filter(appt => appointmentIds.includes(appt.id))
        .map(appt => [appt.id, appt])
    );
    
    for (const appointmentId of appointmentIds) {
      try {
        const appointmentData = appointmentsMap.get(appointmentId);
        
        if (!appointmentData) {
          results.push({
            id: appointmentId,
            success: false,
            error: 'Appuntamento non trovato'
          });
          continue;
        }
        
        if (!appointmentData.clientFirstName) {
          results.push({
            id: appointmentId,
            success: false,
            error: 'Cliente non trovato'
          });
          continue;
        }
        
        if (!appointmentData.serviceName) {
          results.push({
            id: appointmentId,
            success: false,
            error: 'Servizio non trovato'
          });
          continue;
        }
        
        // Usa i dati da PostgreSQL
        const appointment = { date: appointmentData.date, startTime: appointmentData.startTime };
        const client = {
          firstName: appointmentData.clientFirstName,
          lastName: appointmentData.clientLastName,
          phone: appointmentData.clientPhone,
          email: appointmentData.clientEmail,
        };
        const service = { name: appointmentData.serviceName };
        
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