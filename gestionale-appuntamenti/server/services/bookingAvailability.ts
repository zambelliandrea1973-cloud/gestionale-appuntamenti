import { db } from '../db';
import { appointments, treatmentRooms } from '../../shared/schema';
import { and, eq, gte, lte, or, lt, gt } from 'drizzle-orm';

// Helper: Converte orario HH:MM in minuti dalla mezzanotte
function toMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Converte minuti dalla mezzanotte in formato HH:MM
function toTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

interface AvailabilityParams {
  userId: number;
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  duration: number; // minuti
  staffId?: number; // NUOVO: Se specificato, verifica solo disponibilità di questo professionista
}

interface TimeSlot {
  start: string; // HH:MM
  end: string; // HH:MM
  staffId?: number;
  roomId?: number;
}

/**
 * Calcola slot disponibili per prenotazione appuntamento
 * Logica multi-stanza: slot disponibile se appuntamenti contemporanei < stanze totali
 * Logica preferenza staff: se staffId specificato, verifica solo disponibilità di quel professionista
 * @returns Array di max 5 slot liberi di 15 minuti ciascuno
 */
export async function calculateAvailableSlots(
  params: AvailabilityParams
): Promise<TimeSlot[]> {
  const { userId, date, timeStart, timeEnd, duration, staffId } = params;
  
  console.log(`🔍 [AVAILABILITY] Calcolo slot per userId=${userId}, data=${date}, fascia=${timeStart}-${timeEnd}, durata=${duration}min${staffId ? `, staffId=${staffId}` : ''}`);
  
  // Validazione input
  if (!timeStart || !timeEnd || !timeStart.match(/^\d{2}:\d{2}$/) || !timeEnd.match(/^\d{2}:\d{2}$/)) {
    console.error(`❌ [AVAILABILITY] Formato orario non valido: ${timeStart} - ${timeEnd}`);
    return [];
  }
  
  const windowStart = toMinutes(timeStart);
  const windowEnd = toMinutes(timeEnd);
  
  // Verifica che la finestra sia sufficiente per la durata del servizio
  if (windowEnd - windowStart < duration) {
    console.log(`⚠️ [AVAILABILITY] Finestra troppo piccola: ${windowEnd - windowStart}min < ${duration}min richiesti`);
    return [];
  }
  
  try {
    // Carica stanze attive per calcolare capacità parallela
    const activeRooms = await db
      .select()
      .from(treatmentRooms)
      .where(and(
        eq(treatmentRooms.userId, userId),
        eq(treatmentRooms.isActive, true)
      ));
    
    const totalRooms = activeRooms.length;
    console.log(`🏢 [AVAILABILITY] Trovate ${totalRooms} stanze attive`);
    
    // Se nessuna stanza configurata, fallback a logica semplice (1 stanza virtuale)
    const roomCapacity = totalRooms > 0 ? totalRooms : 1;
    
    // Recupera appuntamenti esistenti per quella data e userId
    const existingAppointments = await db
      .select({
        start: appointments.startTime,
        end: appointments.endTime,
        staffId: appointments.staffId,
        roomId: appointments.roomId
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          eq(appointments.date, date),
          or(
            // Appuntamento inizia nella finestra
            and(gte(appointments.startTime, timeStart), lt(appointments.startTime, timeEnd)),
            // Appuntamento finisce nella finestra
            and(gt(appointments.endTime, timeStart), lte(appointments.endTime, timeEnd)),
            // Appuntamento copre l'intera finestra
            and(lte(appointments.startTime, timeStart), gte(appointments.endTime, timeEnd))
          )
        )
      )
      .orderBy(appointments.startTime);
    
    console.log(`📅 [AVAILABILITY] Trovati ${existingAppointments.length} appuntamenti esistenti nella finestra`);
    
    // Genera candidati slot (incrementi di 15 minuti)
    const candidates: TimeSlot[] = [];
    
    for (let start = windowStart; start + duration <= windowEnd; start += 15) {
      const end = start + duration;
      
      // Filtra appuntamenti che si sovrappongono con questo slot
      const overlappingAppointments = existingAppointments.filter(apt => {
        const aptStart = toMinutes(apt.start);
        const aptEnd = toMinutes(apt.end);
        return aptStart < end && aptEnd > start;
      });
      
      // Calcola quante stanze FISICHE sono effettivamente occupate
      // - Appuntamenti con roomId → contano verso quella stanza specifica
      // - Appuntamenti senza roomId → considerati come stanze separate (pessimistic approach)
      const occupiedRoomIds = new Set<number>();
      let unassignedRoomCount = 0;
      
      overlappingAppointments.forEach(apt => {
        if (apt.roomId !== null && apt.roomId !== undefined) {
          occupiedRoomIds.add(apt.roomId);
        } else {
          // Appuntamento legacy senza stanza assegnata → conta come stanza virtuale
          unassignedRoomCount++;
        }
      });
      
      const totalOccupiedRooms = occupiedRoomIds.size + unassignedRoomCount;
      const hasRoomCapacity = totalOccupiedRooms < roomCapacity;
      
      let slotAvailable = false;
      
      if (staffId) {
        // MODALITÀ PREFERENZA STAFF: verifica che il professionista sia libero E che ci sia capacità stanze
        const staffBusy = overlappingAppointments.some(apt => apt.staffId === staffId);
        slotAvailable = !staffBusy && hasRoomCapacity;
        
        if (!staffBusy && !hasRoomCapacity) {
          console.log(`⚠️ [AVAILABILITY] Slot ${toTime(start)}-${toTime(end)}: staff ${staffId} libero ma tutte le stanze occupate (${totalOccupiedRooms}/${roomCapacity})`);
        } else if (slotAvailable && overlappingAppointments.length > 0) {
          console.log(`✓ [AVAILABILITY] Slot ${toTime(start)}-${toTime(end)}: staff ${staffId} libero, ${totalOccupiedRooms}/${roomCapacity} stanze occupate - DISPONIBILE`);
        }
      } else {
        // MODALITÀ MULTI-STANZA: slot disponibile se stanze occupate < capacità totale
        slotAvailable = hasRoomCapacity;
        
        if (slotAvailable && overlappingAppointments.length > 0) {
          console.log(`✓ [AVAILABILITY] Slot ${toTime(start)}-${toTime(end)}: ${totalOccupiedRooms}/${roomCapacity} stanze occupate (${occupiedRoomIds.size} assegnate + ${unassignedRoomCount} non assegnate) - DISPONIBILE`);
        } else if (!slotAvailable) {
          console.log(`❌ [AVAILABILITY] Slot ${toTime(start)}-${toTime(end)}: tutte le stanze occupate (${totalOccupiedRooms}/${roomCapacity})`);
        }
      }
      
      if (slotAvailable) {
        candidates.push({
          start: toTime(start),
          end: toTime(end)
        });
        
        // Limita a 5 slot per non sovraccaricare la UI
        if (candidates.length === 5) {
          console.log(`✅ [AVAILABILITY] Trovati 5 slot, fermata ricerca`);
          break;
        }
      }
    }
    
    console.log(`✅ [AVAILABILITY] ${candidates.length} slot disponibili trovati`);
    return candidates;
    
  } catch (error) {
    console.error(`❌ [AVAILABILITY] Errore nel calcolo slot:`, error);
    return [];
  }
}
