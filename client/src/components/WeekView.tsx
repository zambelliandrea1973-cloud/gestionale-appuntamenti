// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  getWeekDays, 
  formatDate, 
  formatDateForApi, 
  isToday, 
  getWeekStart, 
  getWeekEnd 
} from "@/lib/utils/date";
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AppointmentCard from "./AppointmentCard";
import AppointmentCardSmall from "./AppointmentCardSmall";
import AppointmentForm from "./AppointmentForm";
import { FloatingActionButton } from "./FloatingActionButton";
import { addDays, getISOWeek } from "date-fns";

interface WeekViewProps {
  selectedDate: Date;
  services?: any[];
  collaborators?: any[];
  treatmentRooms?: any[];
  activeFilter?: { type: 'staff' | 'room'; id: number } | null;
  onRefresh?: () => void;
  onDateSelect?: (date: Date) => void;
}

// Generiamo gli slot orari dalle 08:00 alle 20:00
const generateTimeSlots = () => {
  const slots = [];
  for (let i = 8; i < 20; i++) {
    slots.push(`${String(i).padStart(2, '0')}:00`);
  }
  return slots;
};

export default function WeekView({ selectedDate, services = [], collaborators = [], treatmentRooms = [], activeFilter = null, onRefresh, onDateSelect }: WeekViewProps) {
  const { t } = useTranslation();
  const [viewDate, setViewDate] = useState(selectedDate);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedDayForAppointment, setSelectedDayForAppointment] = useState<Date | null>(null);
  const [selectedTimeForAppointment, setSelectedTimeForAppointment] = useState<string>("09:00");
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  // Slot attualmente espanso (format "HH:00"); null = tutti collassati
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const timeSlots = generateTimeSlots();
  
  // Calcola i giorni della settimana basato su viewDate
  const weekDays = getWeekDays(viewDate);
  
  // Utilizziamo un metodo alternativo per formattare le date, per evitare problemi di fuso orario
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  
  const startDate = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
  const endDate = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
  
  // Fetch appointments for the selected week
  const { data: appointments = [], isLoading, refetch } = useQuery<any>({
    queryKey: [`/api/appointments/range/${startDate}/${endDate}`],
  });
  
  // Refresh data when date changes
  useEffect(() => {
    refetch();
  }, [viewDate, refetch]);
  
  // Aggiorna viewDate quando selectedDate cambia (se cliccato da altri componenti)
  useEffect(() => {
    setViewDate(selectedDate);
  }, [selectedDate]);
  
  // Funzioni per navigare tra le settimane
  const handlePreviousWeek = () => {
    setViewDate(prev => addDays(prev, -7));
  };
  
  const handleNextWeek = () => {
    setViewDate(prev => addDays(prev, 7));
  };
  
  // Calcola il numero della settimana ISO
  const weekNumber = getISOWeek(viewDate);
  
  // Guard temporale: evita che il click sintetico Android chiuda il form subito dopo l'apertura
  const formOpenedAtRef = useRef(0);

  // Handle appointment update
  const handleAppointmentUpdated = () => {
    refetch();
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // Handle time slot click:
  // - slot già espanso → collassa
  // - slot con appuntamenti → espandi
  // - slot vuoto → apri form nuovo appuntamento
  const handleTimeSlotClick = (e: React.MouseEvent, day: Date, time: string, hasAppointments: boolean) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-appointment-card]') || target.closest('[data-appointment-icons]')) {
      return;
    }
    if (expandedSlot === time) {
      // Secondo click: collassa
      setExpandedSlot(null);
    } else if (hasAppointments) {
      // Ha appuntamenti: espandi la riga
      setExpandedSlot(time);
    } else {
      // Slot vuoto: apri form nuovo appuntamento
      setExpandedSlot(null);
      setSelectedDayForAppointment(day);
      setSelectedTimeForAppointment(time);
      formOpenedAtRef.current = Date.now();
      setIsAppointmentFormOpen(true);
    }
  };
  
  // Get appointments for a specific day and time slot
  const getAppointmentsForTimeSlot = (day: Date, timeSlot: string) => {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const slotHour = parseInt(timeSlot.split(':')[0]);
    
    return appointments.filter((appointment: any) => {
      if (appointment.date !== dateStr) return false;
      const appointmentHour = parseInt(appointment.startTime.split(':')[0]);
      if (appointmentHour !== slotHour) return false;
      if (activeFilter) {
        if (activeFilter.type === 'staff') return appointment.staffId === activeFilter.id;
        if (activeFilter.type === 'room') return appointment.roomId === activeFilter.id;
      }
      return true;
    });
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Week header */}
      <div className="bg-gray-100 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">
              Settimana {weekNumber} - {formatDate(weekDays[0])} to {formatDate(weekDays[6])}
            </h3>
            <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-semibold rounded-full h-6 w-12 text-xs">
              #{weekNumber}
            </span>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handlePreviousWeek}
              className="h-8 w-8 p-0"
              data-testid="button-previous-week"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleNextWeek}
              className="h-8 w-8 p-0"
              data-testid="button-next-week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Scrollable container — header + time slots share the same overflow so the scrollbar
           offset never causes column misalignment */}
      <div className="overflow-y-auto max-h-[calc(100vh-220px)] sm:max-h-[calc(100vh-310px)] md:max-h-[calc(100vh-350px)] min-h-[300px]">

        {/* Day headers — sticky so they stay visible while scrolling */}
        <div className="grid sticky top-0 z-20 bg-gray-50" style={{ gridTemplateColumns: '70px repeat(7, 1fr)' }}>
          {/* Empty corner for time column */}
          <div className="bg-gray-50 border-r border-b p-2"></div>
          
          {weekDays.map((day, index) => (
            <div key={index} className="text-center py-3 font-medium text-sm border-r border-b bg-gray-50">
              <div className={`${isToday(day) ? 'text-primary font-bold' : 'text-gray-700'}`}>
                {new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(day)}
              </div>
              <div className={`
                ${isToday(day) ? 'bg-primary text-white' : 'text-gray-900'} 
                rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1
              `}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots grid — same column template, no separate overflow */}
        <div className="grid" style={{ gridTemplateColumns: '70px repeat(7, 1fr)' }}>
        {timeSlots.map((timeSlot, timeIndex) => (
          <div key={timeIndex} className="contents">
            {/* Time label — si espande automaticamente con la riga */}
            <div
              className="text-xs font-medium text-gray-500 bg-gray-50 border-r border-b p-2 sticky left-0 z-10 cursor-pointer select-none"
              onClick={() => setExpandedSlot(expandedSlot === timeSlot ? null : timeSlot)}
            >
              {timeSlot}
            </div>
            
            {/* Day cells for this time slot */}
            {weekDays.map((day, dayIndex) => {
              const slotAppointments = getAppointmentsForTimeSlot(day, timeSlot);
              const isExpanded = expandedSlot === timeSlot;
              const hasAppointments = slotAppointments.length > 0;
              
              return (
                <div 
                  key={`${timeIndex}-${dayIndex}`}
                  className={`border-r border-b p-0.5 cursor-pointer hover:bg-blue-50 transition-all duration-200 relative group
                    ${isExpanded ? 'min-h-[64px]' : 'h-[64px] overflow-hidden'}`}
                  onClick={(e) => handleTimeSlotClick(e, day, timeSlot, hasAppointments)}
                >
                  {isLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : hasAppointments ? (
                    <div className="space-y-1">
                      {slotAppointments.map((appointment) => (
                        <div key={appointment.id} className="text-xs">
                          <AppointmentCardSmall 
                            appointment={appointment}
                            onUpdate={handleAppointmentUpdated}
                            onEdit={(id) => { formOpenedAtRef.current = Date.now(); setEditingAppointmentId(id); }}
                            view="week"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Empty slot - show add button on hover
                    <div className="flex items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-400 hover:text-primary h-auto p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTimeSlotClick(e, day, timeSlot, false);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        </div>{/* end time slots grid */}
      </div>{/* end scrollable container */}
      
      {/* Form dialog for EDITING existing appointment */}
      {editingAppointmentId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center pt-3 sm:pt-0 z-50 overflow-y-auto"
          onClick={() => {
            if (Date.now() - formOpenedAtRef.current > 300) setEditingAppointmentId(null);
          }}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <AppointmentForm
              appointmentId={editingAppointmentId}
              onClose={() => {
                setEditingAppointmentId(null);
                handleAppointmentUpdated();
              }}
            />
          </div>
        </div>
      )}

      {/* Form dialog for new appointment */}
      {isAppointmentFormOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center pt-3 sm:pt-0 z-50 overflow-y-auto"
          onClick={() => {
            if (Date.now() - formOpenedAtRef.current > 300) setIsAppointmentFormOpen(false);
          }}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <AppointmentForm 
              onClose={() => {
                setIsAppointmentFormOpen(false);
                handleAppointmentUpdated();
              }}
              defaultDate={selectedDayForAppointment || selectedDate}
              defaultTime={selectedTimeForAppointment}
            />
          </div>
        </div>
      )}
      
      {/* Floating Action Button for creating appointments - nascosto quando il form è già aperto */}
      {!isAppointmentFormOpen && (
        <FloatingActionButton 
          onClick={() => {
            setSelectedDayForAppointment(selectedDate);
            setSelectedTimeForAppointment("09:00");
            formOpenedAtRef.current = Date.now();
            setIsAppointmentFormOpen(true);
          }}
          text={t('calendar.selectNewAppointment', 'New appointment')}
          storageKey="fab-week-position"
        />
      )}
    </div>
  );
}
