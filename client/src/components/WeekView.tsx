import { useState, useEffect } from "react";
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

interface WeekViewProps {
  selectedDate: Date;
  services?: any[];
  collaborators?: any[];
  treatmentRooms?: any[];
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

export default function WeekView({ selectedDate, services = [], collaborators = [], treatmentRooms = [], onRefresh, onDateSelect }: WeekViewProps) {
  const [weekDays] = useState(() => getWeekDays(selectedDate));
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedDayForAppointment, setSelectedDayForAppointment] = useState<Date | null>(null);
  const [selectedTimeForAppointment, setSelectedTimeForAppointment] = useState<string>("09:00");
  const timeSlots = generateTimeSlots();
  
  // Utilizziamo un metodo alternativo per formattare le date, per evitare problemi di fuso orario
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  
  const startDate = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
  const endDate = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
  
  // Fetch appointments for the selected week
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/appointments/range/${startDate}/${endDate}`],
  });
  
  // Refresh data when date changes
  useEffect(() => {
    refetch();
  }, [selectedDate, refetch]);
  
  // Handle appointment update
  const handleAppointmentUpdated = () => {
    refetch();
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // Handle time slot click to open new appointment form
  const handleTimeSlotClick = (day: Date, time: string) => {
    setSelectedDayForAppointment(day);
    setSelectedTimeForAppointment(time);
    setIsAppointmentFormOpen(true);
  };
  
  // Get appointments for a specific day and time slot
  const getAppointmentsForTimeSlot = (day: Date, timeSlot: string) => {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const slotHour = parseInt(timeSlot.split(':')[0]);
    
    return appointments.filter(appointment => {
      if (appointment.date !== dateStr) return false;
      const appointmentHour = parseInt(appointment.startTime.split(':')[0]);
      return appointmentHour === slotHour;
    });
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Week header */}
      <div className="bg-gray-100 px-4 py-3 border-b">
        <h3 className="text-lg font-medium">
          Settimana {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
        </h3>
      </div>
      
      {/* Day headers */}
      <div className="grid" style={{ gridTemplateColumns: '70px repeat(7, 1fr)' }}>
        {/* Empty corner for time column */}
        <div className="bg-gray-50 border-r border-b p-2"></div>
        
        {/* Day headers */}
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
      
      {/* Time slots grid */}
      <div className="grid overflow-y-auto max-h-[calc(100vh-350px)] min-h-[400px]" style={{ gridTemplateColumns: '70px repeat(7, 1fr)' }}>
        {timeSlots.map((timeSlot, timeIndex) => (
          <div key={timeIndex} className="contents">
            {/* Time label */}
            <div className="text-xs font-medium text-gray-500 bg-gray-50 border-r border-b p-2 sticky left-0 z-10">
              {timeSlot}
            </div>
            
            {/* Day cells for this time slot */}
            {weekDays.map((day, dayIndex) => {
              const slotAppointments = getAppointmentsForTimeSlot(day, timeSlot);
              const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
              
              return (
                <div 
                  key={`${timeIndex}-${dayIndex}`}
                  className="border-r border-b p-1 min-h-[60px] cursor-pointer hover:bg-blue-50 transition-colors relative group"
                  onClick={() => handleTimeSlotClick(day, timeSlot)}
                >
                  {isLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : slotAppointments.length > 0 ? (
                    // Show appointments for this slot
                    <div className="space-y-1">
                      {slotAppointments.map((appointment) => (
                        <div key={appointment.id} className="text-xs">
                          <AppointmentCardSmall 
                            appointment={appointment}
                            onUpdate={handleAppointmentUpdated}
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
                          handleTimeSlotClick(day, timeSlot);
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
      </div>
      
      {/* Form dialog for new appointment */}
      {isAppointmentFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsAppointmentFormOpen(false)}>
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
      
      {/* Floating Action Button for creating appointments */}
      <FloatingActionButton 
        onClick={() => {
          setSelectedDayForAppointment(selectedDate);
          setSelectedTimeForAppointment("09:00");
          setIsAppointmentFormOpen(true);
        }}
        label="Seleziona orario noappuntamento"
      />
    </div>
  );
}
