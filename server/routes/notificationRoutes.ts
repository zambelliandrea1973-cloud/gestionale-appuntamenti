import { Router } from 'express';
import { isAuthenticated, isStaff } from '../auth';
import { db } from '../db';
import { eq, and, gte, lte, or, isNull, sql } from 'drizzle-orm';
import { appointments } from '@shared/schema';
import { format, addDays, parseISO } from 'date-fns';

const router = Router();

/**
 * Ottiene tutti gli appuntamenti di domani che necessitano di promemoria
 */
router.get('/api/notifications/upcoming-appointments', isAuthenticated, isStaff, async (req, res) => {
  try {
    // Ottieni la data di oggi e di domani in formato ISO
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    // Ottieni gli appuntamenti di domani che:
    // 1. Hanno reminderType contenente 'whatsapp'
    // 2. Non hanno ancora ricevuto un promemoria (reminderStatus = 'pending' o null)
    // 3. Stato è 'scheduled' (non cancellati)
    const upcomingAppointments = await db.query.appointments.findMany({
      where: and(
        or(
          eq(appointments.date, tomorrowStr),
          eq(appointments.date, todayStr)
        ),
        or(
          eq(appointments.reminderStatus, 'pending'),
          isNull(appointments.reminderStatus)
        ),
        eq(appointments.status, 'scheduled'),
        sql`POSITION('whatsapp' IN ${appointments.reminderType}) > 0`
      ),
      with: {
        client: true,
        service: true
      },
      orderBy: [
        appointments.date,
        appointments.startTime
      ]
    });

    // Raggruppa gli appuntamenti per data
    const groupedAppointments = upcomingAppointments.reduce((acc, appointment) => {
      const date = appointment.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(appointment);
      return acc;
    }, {} as Record<string, any[]>);
    
    res.json({ 
      success: true, 
      appointments: upcomingAppointments,
      groupedAppointments
    });
  } catch (error) {
    console.error('Errore nella ricerca appuntamenti per promemoria:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nella ricerca degli appuntamenti' 
    });
  }
});

/**
 * Invia promemoria per più appuntamenti contemporaneamente
 */
router.post('/api/notifications/send-batch', isAuthenticated, isStaff, async (req, res) => {
  try {
    const { appointmentIds, customMessage } = req.body;
    
    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nessun appuntamento selezionato' 
      });
    }
    
    // Array per tenere traccia dei risultati
    const results = [];
    const errors = [];
    
    // Per ogni ID appuntamento, invia il promemoria individualmente
    // Questo riutilizza la logica esistente per l'invio dei promemoria
    for (const id of appointmentIds) {
      try {
        // Invia il promemoria per l'appuntamento corrente
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/appointments/${id}/send-reminder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': req.headers.cookie || ''
          },
          body: JSON.stringify({ customMessage })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          results.push({ id, success: true, message: data.message });
        } else {
          errors.push({ id, error: data.error || 'Errore sconosciuto' });
        }
      } catch (error: any) {
        errors.push({ id, error: error.message || 'Errore di connessione' });
      }
    }
    
    res.json({
      success: true,
      results,
      errors,
      message: `Inviati ${results.length}/${appointmentIds.length} promemoria`
    });
  } catch (error) {
    console.error('Errore nell\'invio batch dei promemoria:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'invio dei promemoria' 
    });
  }
});

/**
 * Ottiene lo storico delle notifiche WhatsApp inviate
 */
router.get('/api/notifications/history', isAuthenticated, isStaff, async (req, res) => {
  try {
    // Ottiene le notifiche di tipo WhatsApp
    const notifications = await db.query.notifications.findMany({
      where: sql`POSITION('whatsapp' IN message) > 0 OR channel = 'whatsapp'`,
      orderBy: [
        sql`sent_at DESC`
      ],
      limit: 100 // limita a 100 notifiche per performance
    });
    
    res.json({ 
      success: true, 
      notifications 
    });
  } catch (error) {
    console.error('Errore nel recupero dello storico notifiche:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nel recupero delle notifiche' 
    });
  }
});

export default router;