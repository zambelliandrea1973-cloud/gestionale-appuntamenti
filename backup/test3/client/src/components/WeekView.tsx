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
import { ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AppointmentCard from "./AppointmentCard";
import AppointmentForm from "./AppointmentForm";

interface WeekViewProps {
  selectedDate: Date;
  onRefresh?: () => void;
}

export default function WeekView({ selectedDate, onRefresh }: WeekViewProps) {
  const [weekDays] = useState(() => getWeekDays(selectedDate));
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedDayForAppointment, setSelectedDayForAppointment] = useState<Date | null>(null);
  
  const startDate = formatDateForApi(getWeekStart(selectedDate));
  const endDate = formatDateForApi(getWeekEnd(selectedDate));
  
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
  
  // Handle day click to open new appointment form
  const handleDayClick = (day: Date) => {
    setSelectedDayForAppointment(day);
    setIsAppointmentFormOpen(true);
  };
  
  // Get appointments for a specific day
  const getAppointmentsForDay = (day: Date) => {
    const dateStr = formatDateForApi(day);
    return appointments.filter(appointment => appointment.date === dateStr);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Week header */}
      <div className="bg-gray-100 px-4 py-3 border-b">
        <h3 className="text-lg font-medium">
          Settimana {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
        </h3>
      </div>
      
      {/* Week grid */}
      <div className="grid grid-cols-7 divide-x border-b">
        {weekDays.map((day, index) => (
          <div key={index} className="text-center py-2 font-medium text-sm">
            <div className={`${isToday(day) ? 'text-primary' : 'text-gray-700'}`}>
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
      
      {/* Appointments grid */}
      <div className="grid grid-cols-7 divide-x h-[calc(100vh-350px)] min-h-[400px] overflow-y-auto">
        {weekDays.map((day, index) => {
          const dayAppointments = getAppointmentsForDay(day);
          
          return (
            <div 
              key={index} 
              className="p-2 overflow-y-auto"
              onClick={() => handleDayClick(day)}
            >
              {isLoading ? (
                // Loading skeleton
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : dayAppointments.length > 0 ? (
                // Show appointments for this day
                dayAppointments.map((appointment) => (
                  <div className="text-xs" key={appointment.id}>
                    <div className="text-gray-500 mb-1">
                      {appointment.startTime.substring(0, 5)}
                    </div>
                    <AppointmentCard 
                      appointment={appointment}
                      onUpdate={handleAppointmentUpdated}
                    />
                  </div>
                ))
              ) : (
                // Empty day - add appointment button
                <div className="flex h-full items-center justify-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDayClick(day);
                    }}
                  >
                    <span className="sr-only">Aggiungi appuntamento</span>
                    +
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Form dialog for new appointment */}
      {/* Form dialog for new appointment - Custom modal implementation */}
      {isAppointmentFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsAppointmentFormOpen(false)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <AppointmentForm 
              onClose={() => {
                setIsAppointmentFormOpen(false);
                handleAppointmentUpdated();
              }}
              defaultDate={selectedDayForAppointment || selectedDate}
              defaultTime="09:00"
            />
          </div>
        </div>
      )}
    </div>
  );
}
