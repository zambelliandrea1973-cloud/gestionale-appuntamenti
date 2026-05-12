// @ts-nocheck
import { useState, useEffect, useRef, Fragment } from "react";
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
import { ErrorBoundary } from "./ErrorBoundary";
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

// Calcola la durata in minuti da startTime e endTime ("HH:MM")
const getDurationMinutes = (appointment: any): number => {
  const start = appointment.startTime ?? "09:00";
  const end = appointment.endTime;
  if (!end) return 60;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : 60;
};

export default function WeekView({ selectedDate, services = [], collaborators = [], treatmentRooms = [], activeFilter = null, onRefresh, onDateSelect }: WeekViewProps) {
  const { t } = useTranslation();
  const [viewDate, setViewDate] = useState(selectedDate);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedDayForAppointment, setSelectedDayForAppointment] = useState<Date | null>(null);
  const [selectedTimeForAppointment, setSelectedTimeForAppointment] = useState<string>("09:00");
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  const timeSlots = generateTimeSlots();

  // Pixel per ora — base del sistema proporzionale
  const CELL_PX = 64;
  
  // Calcola i giorni della settimana basato su viewDate
  const weekDays = getWeekDays(viewDate);
  
  // Utilizziamo un metodo alternativo per formattare le date, per evitare problemi di fuso orario
  // IMPORTANTE: usiamo viewDate (stato interno) e non selectedDate (prop) così quando
  // l'utente naviga tra settimane la query recupera i dati della settimana visualizzata.
  const weekStart = getWeekStart(viewDate);
  const weekEnd = getWeekEnd(viewDate);
  
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
  
  // Apre il form per un nuovo appuntamento quando si clicca su una cella vuota
  const openNewAppointmentAt = (e: React.MouseEvent, day: Date, time: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-appointment-card]') || target.closest('[data-appointment-icons]')) return;
    setSelectedDayForAppointment(day);
    setSelectedTimeForAppointment(time);
    formOpenedAtRef.current = Date.now();
    setIsAppointmentFormOpen(true);
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

        {/* Time slots grid — same column template, no separate overflow.
             gridAutoRows garantisce altezza minima uniforme per ogni riga oraria:
             le righe vuote non collassano a 0 e i bordi restano allineati. */}
        <div className="grid" style={{ gridTemplateColumns: '70px repeat(7, 1fr)', gridAutoRows: 'minmax(64px, auto)' }}>
        {timeSlots.map((timeSlot, timeIndex) => (
          /* Fragment evita display:contents e problemi cross-browser Android */
          <Fragment key={timeIndex}>
            {/* Time label */}
            <div
              className="text-xs font-medium text-gray-500 bg-gray-50 border-r border-b p-2 sticky left-0 z-10 select-none"
            >
              {timeSlot}
            </div>
            
            {/* Day cells — layout proporzionale al tempo:
                 • ogni cella = 1 ora = CELL_PX pixel (minimo garantito da gridAutoRows)
                 • i card sono posizionati in assoluto con top proporzionale ai minuti
                   di inizio e height proporzionale alla durata
                 • più appuntamenti nello stesso slot sono impilati verticalmente
                   senza sovrapposizioni (collision-aware stacking)
                 • la cella cresce se la somma supera CELL_PX */}
            {weekDays.map((day, dayIndex) => {
              const slotAppointments = getAppointmentsForTimeSlot(day, timeSlot);

              // Ordina per ora di inizio e calcola posizioni senza sovrapposizioni
              const sorted = [...slotAppointments].sort((a, b) =>
                (a.startTime || '').localeCompare(b.startTime || '')
              );
              let nextY = 0;
              const positioned = sorted.map((apt) => {
                const startMins = parseInt(apt.startTime?.split(':')[1] || '0');
                const duration = getDurationMinutes(apt);
                const idealTop = Math.round((startMins / 60) * CELL_PX);
                const height = Math.max(Math.round((duration / 60) * CELL_PX), 14);
                const top = Math.max(idealTop, nextY); // mai sovrapposto al precedente
                nextY = top + height;
                return { apt, top, height };
              });

              // Altezza minima della cella = max(CELL_PX, spazio occupato dagli appuntamenti)
              const cellMinH = Math.max(CELL_PX, nextY);

              return (
                <div
                  key={`${timeIndex}-${dayIndex}`}
                  className="border-r border-b cursor-pointer hover:bg-blue-50/30 transition-colors duration-150 relative group min-w-0"
                  style={{ minHeight: `${cellMinH}px` }}
                  onClick={(e) => openNewAppointmentAt(e, day, timeSlot)}
                >
                  {isLoading ? (
                    <Skeleton className="absolute inset-1" />
                  ) : positioned.length === 0 ? (
                    /* Cella vuota: mostra "+" al hover */
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-4 w-4 text-gray-400" />
                    </div>
                  ) : (
                    positioned.map(({ apt, top, height }) => (
                      <div
                        key={apt.id}
                        className="absolute left-0 right-0 overflow-hidden"
                        style={{ top: `${top}px`, height: `${height}px`, padding: '1px' }}
                      >
                        <AppointmentCardSmall
                          appointment={apt}
                          onUpdate={handleAppointmentUpdated}
                          onEdit={(id) => { formOpenedAtRef.current = Date.now(); setEditingAppointmentId(id); }}
                          view="week"
                        />
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </Fragment>
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
            <ErrorBoundary
              fallback={
                <div className="bg-white rounded-lg shadow-lg p-6 w-[calc(100vw-16px)] sm:w-auto sm:min-w-[380px] flex flex-col gap-4 items-center">
                  <p className="text-sm text-gray-600">{t('appointmentForm.loadError', 'Error loading the form. Please try again.')}</p>
                  <button className="px-4 py-2 bg-primary text-white rounded-md text-sm" onClick={() => setEditingAppointmentId(null)}>{t('common.close', 'Close')}</button>
                </div>
              }
            >
              <AppointmentForm
                appointmentId={editingAppointmentId}
                onClose={() => {
                  setEditingAppointmentId(null);
                  handleAppointmentUpdated();
                }}
              />
            </ErrorBoundary>
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
            setSelectedDayForAppointment(viewDate);
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
