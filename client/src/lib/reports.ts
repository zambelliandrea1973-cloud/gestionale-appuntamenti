import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { getDateLocale } from "@/lib/utils/date";

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
export function buildPeriodBuckets(reportType: string, selectedDate: Date, lang: string = 'it'): PeriodBucket[] {
  const locale = getDateLocale(lang);
  
  if (reportType === "weekly") {
    // Genera buckets per ogni giorno della settimana
    const weekStart = startOfWeek(selectedDate, { locale });
    const weekEnd = endOfWeek(selectedDate, { locale });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return weekDays.map(day => ({
      key: format(day, 'yyyy-MM-dd'),
      label: format(day, 'EEEE', { locale }),
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
      label: format(day, 'd', { locale }),
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
        label: format(monthDate, 'MMM', { locale }),
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
    // Trova gli appuntamenti che cadono in questo bucket
    const appointmentsInBucket = appointments.filter(a => {
      const appointmentDate = new Date(a.date);
      // Per il confronto, usiamo solo la data (non l'ora)
      const appointmentKey = format(appointmentDate, 'yyyy-MM-dd');
      
      if (bucket.key.length === 10) {
        // Daily bucket (yyyy-MM-dd)
        return appointmentKey === bucket.key;
      } else {
        // Monthly bucket (yyyy-MM)
        return appointmentKey.startsWith(bucket.key);
      }
    });
    
    return {
      name: bucket.label,
      count: appointmentsInBucket.length,
      revenue: calculateRevenue(appointmentsInBucket, services),
      date: bucket.start
    };
  });
}
