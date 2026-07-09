// @ts-nocheck
import { Router, Request, Response } from 'express';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';
import { directNotificationService } from '../services/directNotificationService';
import { db } from '../db';
import { appointments, clients, services } from '../../shared/schema';
import { eq, and, gte, lte, or, isNull } from 'drizzle-orm';

// 🔄 MIGRATED TO POSTGRESQL for Replit ↔ Sliplane synchronization

const router = Router();

/**
 * Get all appointments for the current month
 * 🔄 USES POSTGRESQL for Replit ↔ Sliplane synchronization
 */
router.get('/upcoming-appointments', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Calculate last 7 days up to tomorrow (historical + upcoming, NO distant future)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startDate = format(sevenDaysAgo, 'yyyy-MM-dd');
    const endDate = format(tomorrow, 'yyyy-MM-dd');
    
    console.log(`🔍 [NOTIFICATIONS PG] Looking for appointments from last 7 days to tomorrow: ${startDate} - ${endDate}`);
    
    // 🔄 USES POSTGRESQL: Query with JOIN for client and service
    // ✅ MULTI-TENANT: Filter by userId (each staff sees only their own)
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
        // Client date
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        // Service date
        serviceName: services.name,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.userId, userId), // ✅ MULTI-TENANT ISOLATION
          gte(appointments.date, startDate),
          lte(appointments.date, endDate),
          // ✅ EXCLUDE appointments imported from Google Calendar (they are not real clients)
          or(
            eq(appointments.importedFromGoogle, false),
            isNull(appointments.importedFromGoogle)
          )
        )
      );
    
    console.log(`📅 [NOTIFICATIONS PG] Found ${appointmentsData.length} appointments from ${startDate} to ${endDate}`);
    
    // Map results to the format expected by the frontend
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
    
    console.log(`✅ [NOTIFICATIONS PG] Processed ${appointmentsList.length} appointments for WhatsApp notifications`);
    
    res.json({
      success: true,
      appointments: appointmentsList
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS PG] Error retrieving upcoming appointments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Send WhatsApp notifications in batch for selected appointments
 */
router.post('/send-batch', async (req: Request, res: Response) => {
  try {
    const { appointmentIds, type = 'whatsapp' } = req.body;
    
    if (!appointmentIds || !Array.isArray(appointmentIds)) {
      return res.status(400).json({
        success: false,
        error: 'Appointment IDs missing'
      });
    }

    // SIMPLIFIED NOTIFICATION SETTINGS
    const notificationSettings = {
      twilioEnabled: false,
      emailEnabled: false,
      whatsappEnabled: true // Set WhatsApp as always enabled by default
    };
    
    // Optimized system for WhatsApp only
    
    // WhatsApp is the default system for sending notifications
    
    const results = [];
    
    // 🔄 USES POSTGRESQL: Load all appointments in batch with JOIN
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
          // ✅ EXCLUDE appointments imported from Google Calendar
          or(
            eq(appointments.importedFromGoogle, false),
            isNull(appointments.importedFromGoogle)
          )
        )
      );
    
    // Filter only the appointments richiesti
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
            error: 'Appointment not found'
          });
          continue;
        }
        
        if (!appointmentData.clientFirstName) {
          results.push({
            id: appointmentId,
            success: false,
            error: 'Client not found'
          });
          continue;
        }
        
        if (!appointmentData.serviceName) {
          results.push({
            id: appointmentId,
            success: false,
            error: 'Servizio not found'
          });
          continue;
        }
        
        // Usa the data da PostgreSQL
        const appointment = { date: appointmentData.date, startTime: appointmentData.startTime };
        const client = {
          firstName: appointmentData.clientFirstName,
          lastName: appointmentData.clientLastName,
          phone: appointmentData.clientPhone,
          email: appointmentData.clientEmail,
        };
        const service = { name: appointmentData.serviceName };
        
        // Data for the message
        const appointmentDate = format(parseISO(appointment.date), 'dd/MM/yyyy', { locale: it });
        const appointmentTime = appointment.startTime.substring(0, 5);
        const clientName = `${client.firstName} ${client.lastName}`;
        
        // Optimized WhatsApp message
        const message = `Dear ${client.firstName}. This is a reminder for your ${service.name} appointment on ${appointmentDate} at ${appointmentTime}.`
          .replace(/{clientName}/g, clientName)
          .replace(/{serviceName}/g, service.name)
          .replace(/{appointmentDate}/g, appointmentDate)
          .replace(/{appointmentTime}/g, appointmentTime);
        
        // Send logic specific to the notification type
        if (type === 'whatsapp') {
          // Prepare phone number (remove spaces and leading + for WhatsApp)
          const phoneNumber = client.phone.replace(/\s+/g, '').replace(/^\+/, '');
          
          // Generate the WhatsApp URL
          const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
          
          // Add clickable link to the message
          const messageWithLink = `${message}\n\n[Open WhatsApp](${whatsappUrl})`;
          
          // SKIP DATABASE SAVE - Only log the send (avoids PostgreSQL errors with large IDs)
          console.log(`📲 WhatsApp message generated for appointment ${appointmentId} - client: ${client.firstName} ${client.lastName}`);
          
          // SKIP REMINDER STATUS UPDATE - Avoid heavy PostgreSQL operations
          
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
          
        } // OPTIMIZED SYSTEM - WhatsApp only
        else if (type === 'email' && notificationSettings.emailEnabled) {
          // 📧 EMAIL SYSTEM RESTORE - was working before
          try {
            if (!client.email) {
              results.push({
                id: appointmentId,
                success: false,
                error: 'Client email not available'
              });
              continue;
            }

            const emailSubject = `Appointment reminder - ${service.name}`;
            const emailMessage = `Dear ${client.firstName},\n\nThis is a reminder for your ${service.name} appointment on ${appointmentDate} at ${appointmentTime}.\n\nBest regards`;
            
            console.log(`📧 Attempting to send email to ${client.email} for appointment ${appointmentId}`);
            const emailSent = await directNotificationService.sendEmail(client.email, emailSubject, emailMessage);
            
            if (emailSent) {
              console.log(`✅ Email sent per appointment ${appointmentId} - client: ${client.firstName} ${client.lastName}`);
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
                error: 'Error sending email'
              });
            }
          } catch (emailError: any) {
            console.error(`❌ Error sending email for appointment ${appointmentId}:`, emailError);
            results.push({
              id: appointmentId,
              success: false,
              error: `Email error: ${emailError.message}`
            });
          }
        } else {
          results.push({
            id: appointmentId,
            success: false,
            error: 'Notification type not supported'
          });
        }
        
      } catch (appointmentError: any) {
        console.error(`Error for appointment ${appointmentId}:`, appointmentError);
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
    console.error('Error sending batch notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get the history of sent WhatsApp notifications
 */
router.get('/whatsapp-history', async (req: Request, res: Response) => {
  try {
    // Simplified system - returns empty array for time
    res.json({
      success: true,
      notifications: []
    });
  } catch (error: any) {
    console.error('Error retrieving WhatsApp history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Mark an appointment as "WhatsApp message sent"
 * 🔄 USES POSTGRESQL with multi-tenant isolation
 */
router.post('/mark-sent/:appointmentId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { appointmentId } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: 'Appointment ID missing'
      });
    }
    
    // 🔄 USES POSTGRESQL: Find appointment with multi-tenant isolation
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, parseInt(appointmentId)),
          eq(appointments.userId, userId) // ✅ MULTI-TENANT ISOLATION
        )
      )
      .limit(1);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or unauthorized'
      });
    }
    
    // Update reminderStatus and add timestamp
    let reminderStatus = appointment.reminderStatus || '';
    if (!reminderStatus.includes('whatsapp_generated')) {
      reminderStatus = reminderStatus 
        ? `${reminderStatus},whatsapp_generated` 
        : 'whatsapp_generated';
    }
    
    const whatsappSentAt = new Date().toISOString();
    
    // 🔄 UPDATE IN POSTGRESQL
    await db
      .update(appointments)
      .set({
        reminderStatus,
        reminderSent: whatsappSentAt // Use existing field for timestamp
      })
      .where(
        and(
          eq(appointments.id, parseInt(appointmentId)),
          eq(appointments.userId, userId) // ✅ MULTI-TENANT ISOLATION also in update
        )
      );
    
    console.log(`✅ [PG] appointment ${appointmentId} marked as "WhatsApp sent" - timestamp: ${whatsappSentAt}`);
    
    res.json({
      success: true,
      message: 'Appointment marked as "WhatsApp sent"',
      whatsappSentAt
    });
  } catch (error: any) {
    console.error('❌ [PG] Error marking appointment as sent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;