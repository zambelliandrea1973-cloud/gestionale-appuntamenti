import { format, startOfWeek, endOfWeek, addDays, addMinutes as dateAddMinutes, isSameDay, isSameMonth, parse, getHours, getMinutes, setHours, setMinutes } from "date-fns";
import { it } from "date-fns/locale";

// Format a date as "dd/MM/yyyy"
export const formatDate = (date: Date): string => {
  return format(date, "dd/MM/yyyy", { locale: it });
};

// Format a date as "EEEE, d MMMM yyyy" (e.g., "Lunedì, 1 Gennaio 2023")
export const formatDateFull = (date: Date): string => {
  return format(date, "EEEE, d MMMM yyyy", { locale: it });
};

// Format a date for API calls as "yyyy-MM-dd"
export const formatDateForApi = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

// Format time as "HH:mm" (e.g., "14:30")
export const formatTime = (date: Date): string => {
  return format(date, "HH:mm");
};

// Parse a date string in the format "yyyy-MM-dd"
export const parseDate = (dateString: string): Date => {
  return parse(dateString, "yyyy-MM-dd", new Date());
};

// Parse a time string in the format "HH:mm"
export const parseTime = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  return setMinutes(setHours(date, hours), minutes);
};

// Get the start of the week for a given date
export const getWeekStart = (date: Date): Date => {
  return startOfWeek(date, { locale: it });
};

// Get the end of the week for a given date
export const getWeekEnd = (date: Date): Date => {
  return endOfWeek(date, { locale: it });
};

// Get an array of dates for a week
export const getWeekDays = (date: Date): Date[] => {
  const start = startOfWeek(date, { locale: it });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

// Check if a date is today
export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

// Check if a date is in the current month
export const isCurrentMonth = (date: Date, currentMonth: Date): boolean => {
  return isSameMonth(date, currentMonth);
};

// Format month and year as "MMMM yyyy" (e.g., "Gennaio 2023")
export const formatMonthYear = (date: Date): string => {
  return format(date, "MMMM yyyy", { locale: it });
};

// Get hours and minutes as numbers from a Date
export const getTimeComponents = (date: Date): { hours: number; minutes: number } => {
  return {
    hours: getHours(date),
    minutes: getMinutes(date)
  };
};

// Generate time slots for a day view
export const generateTimeSlots = (
  startHour: number = 8,
  endHour: number = 19,
  intervalMinutes: number = 15 // Cambiato a 15 minuti come default
): string[] => {
  const slots: string[] = [];
  const totalMinutesInDay = (endHour - startHour) * 60;
  const totalSlots = totalMinutesInDay / intervalMinutes;

  for (let i = 0; i <= totalSlots; i++) {
    const minutes = i * intervalMinutes;
    const hours = Math.floor(minutes / 60) + startHour;
    const mins = minutes % 60;
    slots.push(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
  }

  return slots;
};

// Genera slot orari raggruppati per ora, utile per la visualizzazione UI
export const generateHourlyGroupedTimeSlots = (
  startHour: number = 8,
  endHour: number = 19,
  intervalMinutes: number = 15
): { hour: string, slots: string[] }[] => {
  const groupedSlots: { hour: string, slots: string[] }[] = [];
  const slots = generateTimeSlots(startHour, endHour, intervalMinutes);
  
  let currentHour = "";
  let currentHourSlots: string[] = [];
  
  slots.forEach(slot => {
    const hour = slot.substring(0, 2);
    
    if (hour !== currentHour) {
      if (currentHourSlots.length > 0) {
        groupedSlots.push({
          hour: currentHour,
          slots: currentHourSlots
        });
      }
      currentHour = hour;
      currentHourSlots = [slot];
    } else {
      currentHourSlots.push(slot);
    }
  });
  
  // Aggiungi l'ultimo gruppo
  if (currentHourSlots.length > 0) {
    groupedSlots.push({
      hour: currentHour,
      slots: currentHourSlots
    });
  }
  
  return groupedSlots;
};

// Add minutes to a date
export const addMinutes = (date: Date, minutes: number): Date => {
  return dateAddMinutes(date, minutes);
};

// Calculate end time based on start time and duration
export const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const startDate = parseTime(startTime);
  const endDate = addMinutes(startDate, durationMinutes);
  return formatTime(endDate);
};
