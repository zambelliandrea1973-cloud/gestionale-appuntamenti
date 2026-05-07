import { logger } from '../utils/logger';
import { db } from '../db';
import { appointments, treatmentRooms } from '../../shared/schema';
import { and, eq, gte, lte, or, lt, gt } from 'drizzle-orm';

// Helper: Convert HH:MM time to minutes from midnight
function toMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Convert minutes from midnight to HH:MM format
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
  duration: number; // minutes
  staffId?: number; // NEW: If specified, check availability for this specific professional only
}

interface TimeSlot {
  start: string; // HH:MM
  end: string; // HH:MM
  staffId?: number;
  roomId?: number;
}

/**
 * Calculate available slots for appointment booking
 * Multi-room logic: slot available if concurrent appointments < total rooms
 * Staff preference logic: if staffId specified, verify only that professional's availability
 * @returns Array of max 5 free slots of 15 minutes each
 */
export async function calculateAvailableSlots(
  params: AvailabilityParams
): Promise<TimeSlot[]> {
  const { userId, date, timeStart, timeEnd, duration, staffId } = params;
  
  console.log(`🔍 [AVAILABILITY] Calculating slots for userId=${userId}, date=${date}, range=${timeStart}-${timeEnd}, duration=${duration}min${staffId ? `, staffId=${staffId}` : ''}`);
  
  // Input validation
  if (!timeStart || !timeEnd || !timeStart.match(/^\d{2}:\d{2}$/) || !timeEnd.match(/^\d{2}:\d{2}$/)) {
    console.error(`❌ [AVAILABILITY] Invalid time format: ${timeStart} - ${timeEnd}`);
    return [];
  }
  
  const windowStart = toMinutes(timeStart);
  const windowEnd = toMinutes(timeEnd);
  
  // Verify that the window is sufficient for the service duration
  if (windowEnd - windowStart < duration) {
    console.log(`⚠️ [AVAILABILITY] Window too small: ${windowEnd - windowStart}min < ${duration}min required`);
    return [];
  }
  
  try {
    // Load active rooms to calculate parallel capacity
    const activeRooms = await db
      .select()
      .from(treatmentRooms)
      .where(and(
        eq(treatmentRooms.userId, userId),
        eq(treatmentRooms.isActive, true)
      ));
    
    const totalRooms = activeRooms.length;
    console.log(`🏢 [AVAILABILITY] Found ${totalRooms} active rooms`);
    
    // If no room configured, fallback to simple logic (1 virtual room)
    const roomCapacity = totalRooms > 0 ? totalRooms : 1;
    
    // Retrieve existing appointments for that date and userId
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
            // Appointment starts in the window
            and(gte(appointments.startTime, timeStart), lt(appointments.startTime, timeEnd)),
            // Appointment ends in the window
            and(gt(appointments.endTime, timeStart), lte(appointments.endTime, timeEnd)),
            // Appointment copre l'intera finestra
            and(lte(appointments.startTime, timeStart), gte(appointments.endTime, timeEnd))
          )
        )
      )
      .orderBy(appointments.startTime);
    
    console.log(`📅 [AVAILABILITY] Found ${existingAppointments.length} existing appointments in the window`);
    
    // Generate candidate slots (15-minute increments)
    const candidates: TimeSlot[] = [];
    
    for (let start = windowStart; start + duration <= windowEnd; start += 15) {
      const end = start + duration;
      
      // Filter appointments that overlap with this slot
      const overlappingAppointments = existingAppointments.filter(apt => {
        const aptStart = toMinutes(apt.start);
        const aptEnd = toMinutes(apt.end);
        return aptStart < end && aptEnd > start;
      });
      
      // Calculate how many PHYSICAL rooms are effectively occupied
      // - Appointments with roomId → count towards that specific room
      // - Appointments without roomId → treated as separate rooms (pessimistic approach)
      const occupiedRoomIds = new Set<number>();
      let unassignedRoomCount = 0;
      
      overlappingAppointments.forEach(apt => {
        if (apt.roomId !== null && apt.roomId !== undefined) {
          occupiedRoomIds.add(apt.roomId);
        } else {
          // Legacy appointment without assigned room → counts as virtual room
          unassignedRoomCount++;
        }
      });
      
      const totalOccupiedRooms = occupiedRoomIds.size + unassignedRoomCount;
      const hasRoomCapacity = totalOccupiedRooms < roomCapacity;
      
      let slotAvailable = false;
      
      if (staffId) {
        // STAFF PREFERENCE MODE: verify that the professional is free AND that there is room capacity
        const staffBusy = overlappingAppointments.some(apt => apt.staffId === staffId);
        slotAvailable = !staffBusy && hasRoomCapacity;
        
        if (!staffBusy && !hasRoomCapacity) {
          console.log(`⚠️ [AVAILABILITY] Slot ${toTime(start)}-${toTime(end)}: staff ${staffId} free but all rooms occupied (${totalOccupiedRooms}/${roomCapacity})`);
        } else if (slotAvailable && overlappingAppointments.length > 0) {
          console.log(`✓ [AVAILABILITY] Slot ${toTime(start)}-${toTime(end)}: staff ${staffId} free, ${totalOccupiedRooms}/${roomCapacity} rooms occupied - AVAILABLE`);
        }
      } else {
        // MULTI-ROOM MODE: slot available if occupied rooms < total capacity
        slotAvailable = hasRoomCapacity;
        
        if (slotAvailable && overlappingAppointments.length > 0) {
          console.log(`✓ [AVAILABILITY] Slot ${toTime(start)}-${toTime(end)}: ${totalOccupiedRooms}/${roomCapacity} rooms occupied (${occupiedRoomIds.size} assigned + ${unassignedRoomCount} unassigned) - AVAILABLE`);
        } else if (!slotAvailable) {
          console.log(`❌ [AVAILABILITY] Slot ${toTime(start)}-${toTime(end)}: all rooms occupied (${totalOccupiedRooms}/${roomCapacity})`);
        }
      }
      
      if (slotAvailable) {
        candidates.push({
          start: toTime(start),
          end: toTime(end)
        });
        
        // Limit to 5 slots to avoid overloading the UI
        if (candidates.length === 5) {
          logger.debug(`✅ [AVAILABILITY] Found 5 slots, stopping search`);
          break;
        }
      }
    }
    
    logger.debug(`✅ [AVAILABILITY] ${candidates.length} available slots found`);
    return candidates;
    
  } catch (error) {
    console.error(`❌ [AVAILABILITY] Error calculating slots:`, error);
    return [];
  }
}
