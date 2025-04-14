import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  formatDateForApi, 
  isToday, 
  isCurrentMonth 
} from "@/lib/utils/date";
import AppointmentCardSmall from "./AppointmentCardSmall";
import AppointmentForm from "./AppointmentForm";

interface MonthViewProps {
  selectedDate: Date;
  onRefresh?: () => void;
  onDateSelect: (date: Date) => void;
}

export default function MonthView({ selectedDate, onRefresh, onDateSelect }: MonthViewProps) {
  const [calendar, setCalendar] = useState<Date[][]>([]);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedDayForAppointment, setSelectedDayForAppointment] = useState<Date | null>(null);
  
  // First day of the month
  const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  
  // Last day of the month
  const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
  
  // Format start and end dates for the API - metodo alternativo per evitare problemi di fuso orario
  const startDate = `${firstDayOfMonth.getFullYear()}-${String(firstDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(firstDayOfMonth.getDate()).padStart(2, '0')}`;
  const endDate = `${lastDayOfMonth.getFullYear()}-${String(lastDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;
  
  // Fetch appointments for the selected month
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/appointments/range/${startDate}/${endDate}`],
  });
  
  // Generate calendar grid with month days
  useEffect(() => {
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    // Get the day of the week of the first day (0 = Sunday, 1 = Monday, etc.)
    let firstDayOfWeek = firstDay.getDay();
    // Adjust for Monday as first day of week
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    const daysInMonth = lastDay.getDate();
    const weeksInMonth = Math.ceil((daysInMonth + firstDayOfWeek) / 7);
    
    const calendarDays: Date[][] = [];
    
    let day = 1 - firstDayOfWeek;
    
    for (let week = 0; week < weeksInMonth; week++) {
      const weekDays: Date[] = [];
      
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
        weekDays.push(currentDate);
        day++;
      }
      
      calendarDays.push(weekDays);
    }
    
    setCalendar(calendarDays);
  }, [selectedDate]);
  
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
  
  // Handle day click for viewing day or creating appointment
  const handleDayClick = (day: Date, createAppointment: boolean = false) => {
    if (createAppointment) {
      setSelectedDayForAppointment(day);
      setIsAppointmentFormOpen(true);
    } else {
      onDateSelect(day);
    }
  };
  
  // Get appointments for a specific day
  const getAppointmentsForDay = (day: Date) => {
    // Utilizziamo un metodo alternativo per formattare la data, per evitare problemi di fuso orario
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return appointments.filter(appointment => appointment.date === dateStr);
  };
  
  // Weekday headers
  const weekdays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Month header */}
      <div className="bg-gray-100 px-4 py-3 border-b">
        <h3 className="text-lg font-medium flex items-center">
          <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-semibold rounded-full h-7 w-7 mr-2">
            {selectedDate.getMonth() + 1}
          </span>
          <span>{selectedDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</span>
        </h3>
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center py-2 border-b text-sm font-medium text-gray-500">
        {weekdays.map((day, i) => (
          <div key={i}>{day}</div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-b">
        {calendar.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const dateKey = `${weekIndex}-${dayIndex}`;
            const isCurrentDay = isToday(day);
            const isMonthDay = isCurrentMonth(day, selectedDate);
            const dayAppointments = getAppointmentsForDay(day);
            
            return (
              <div
                key={dateKey}
                className={`
                  min-h-[100px] p-1 border-t border-r
                  ${isMonthDay ? 'bg-white' : 'bg-gray-50'}
                  ${isCurrentDay ? 'ring-2 ring-inset ring-primary' : ''}
                `}
                onClick={() => handleDayClick(day)}
              >
                <div className="flex justify-between items-start">
                  <div
                    className={`
                      w-6 h-6 flex items-center justify-center rounded-full text-sm
                      ${isCurrentDay ? 'bg-primary text-white' : 'text-gray-700'}
                      ${!isMonthDay ? 'text-gray-400' : ''}
                    `}
                  >
                    {day.getDate()}
                  </div>
                  
                  {isMonthDay && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-gray-400 hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDayClick(day, true);
                      }}
                    >
                      <span className="sr-only">Aggiungi appuntamento</span>
                      +
                    </Button>
                  )}
                </div>
                
                {isMonthDay && !isLoading && (
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
                    {dayAppointments.map((appointment) => (
                      <div key={appointment.id} className="mb-1">
                        <AppointmentCardSmall 
                          appointment={appointment}
                          onUpdate={handleAppointmentUpdated}
                          view="month"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Form dialog for new appointment */}
      <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
        <DialogTrigger className="hidden">
          <Button>New Appointment</Button>
        </DialogTrigger>
        <AppointmentForm 
          onClose={() => {
            setIsAppointmentFormOpen(false);
            handleAppointmentUpdated();
          }}
          defaultDate={selectedDayForAppointment || selectedDate}
          defaultTime="09:00"
        />
      </Dialog>
    </div>
  );
}
