import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { it } from "date-fns/locale";

export interface PeriodBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

export interface AggregatedData {
  name: string;
  count: number;
  revenue: number;
  date: Date;
}

/**
 * 🗓️ GENERATORE BUCKETS UNIFICATO
 * Crea i "contenitori" di tempo per tutti i tipi di report (settimanale, mensile, annuale)
 */
export function buildPeriodBuckets(reportType: string, selectedDate: Date): PeriodBucket[] {
  if (reportType === "weekly") {
    // Genera buckets per ogni giorno della settimana
    const weekStart = startOfWeek(selectedDate, { locale: it });
    const weekEnd = endOfWeek(selectedDate, { locale: it });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return weekDays.map(day => ({
      key: format(day, 'yyyy-MM-dd'),
      label: format(day, 'EEEE', { locale: it }),
      start: day,
      end: day
    }));
  } else if (reportType === "monthly") {
    // Genera buckets per ogni giorno del mese
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return daysInMonth.map(day => ({
      key: format(day, 'yyyy-MM-dd'),
      label: format(day, 'd', { locale: it }),
      start: day,
      end: day
    }));
  } else {
    // Annuale: genera buckets per ogni mese dell'anno
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthDate = new Date(selectedDate.getFullYear(), monthIndex, 1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      return {
        key: format(monthDate, 'yyyy-MM'),
        label: format(monthDate, 'MMM', { locale: it }),
        start: monthStart,
        end: monthEnd
      };
    });
  }
}

/**
 * 💰 CALCOLATORE REVENUE CONDIVISO
 * Logica unificata per calcolare i ricavi da una lista di appuntamenti
 */
export function calculateRevenue(appointments: any[], services: any[]): number {
  return appointments.reduce((sum, a) => {
    let price = 0;
    
    // Try to get price from service object first
    if (a.service && typeof a.service.price === 'number') {
      price = a.service.price;
    } else {
      // If service price is not available, use the service directly from services array
      const serviceData = services.find(s => s.id === a.serviceId);
      if (serviceData && typeof serviceData.price === 'number') {
        price = serviceData.price;
      }
    }
    
    // Auto-detect format: if price > 1000, assume it's in cents, otherwise euros
    const priceInEuros = price > 1000 ? (price / 100) : price;
    
    return sum + priceInEuros;
  }, 0);
}

/**
 * 📊 AGGREGATORE UNIFICATO
 * Applica la logica di aggregazione dati per qualsiasi tipo di report usando i buckets
 */
export function aggregateAppointments(
  buckets: PeriodBucket[], 
  appointments: any[], 
  services: any[]
): AggregatedData[] {
  return buckets.map(bucket => {
    // Filtra appuntamenti che cadono in questo bucket
    const bucketAppointments = appointments.filter(appointment => {
      const appointmentDate = appointment.date;
      
      if (bucket.start.getTime() === bucket.end.getTime()) {
        // Bucket giornaliero: confronto esatto per data
        return appointmentDate === bucket.key;
      } else {
        // Bucket mensile: tutti gli appuntamenti che iniziano con YYYY-MM
        return appointmentDate.startsWith(bucket.key);
      }
    });
    
    return {
      name: bucket.label,
      count: bucketAppointments.length,
      revenue: calculateRevenue(bucketAppointments, services),
      date: bucket.start
    };
  });
}