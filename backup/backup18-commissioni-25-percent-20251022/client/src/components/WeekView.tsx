import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  getWeekDays, 
  formatDate, 
  formatDateForApi, 
  isToday, 
  getWeekStart, 
  getWeekEnd 
} from "@/lib/utils/date";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AppointmentCard from "./AppointmentCard";
import AppointmentCardSmall from "./AppointmentCardSmall";
import AppointmentForm from "./AppointmentForm";

interface WeekViewProps {
  selectedDate: Date;
  onRefresh?: () => void;
}

export default function WeekView({ selectedDate, onRefresh }: WeekViewProps) {
  const [weekDays] = useState(() => getWeekDays(selectedDate));
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedDayForAppointment, setSelectedDayForAppointment] = useState<Date | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  
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
  
  // Handle day click to open new appointment form
  const handleDayClick = (day: Date) => {
    setSelectedDayForAppointment(day);
    setIsAppointmentFormOpen(true);
  };
  
  // Get appointments for a specific day
  const getAppointmentsForDay = (day: Date) => {
    // Utilizziamo un metodo alternativo per formattare la data, per evitare problemi di fuso orario
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return appointments.filter(appointment => appointment.date === dateStr);
  };

  // Toggle day expansion
  const toggleDayExpansion = (dayStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayStr]: !prev[dayStr]
    }));
  };

  // Get limited appointments for collapsed view
  const getLimitedAppointments = (dayAppointments: any[], dayStr: string, maxVisible = 2) => {
    const isExpanded = expandedDays[dayStr];
    if (isExpanded || dayAppointments.length <= maxVisible) {
      return dayAppointments;
    }
    return dayAppointments.slice(0, maxVisible);
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
          const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          const isExpanded = expandedDays[dayStr];
          const limitedAppointments = getLimitedAppointments(dayAppointments, dayStr);
          const hasMoreAppointments = dayAppointments.length > 2;
          
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
                // Show appointments for this day with collapsible functionality
                <div>
                  {limitedAppointments.map((appointment) => (
                    <div className="text-xs mb-2" key={appointment.id}>
                      <div className="text-gray-500 mb-1">
                        {appointment.startTime.substring(0, 5)}
                      </div>
                      <AppointmentCardSmall 
                        appointment={appointment}
                        onUpdate={handleAppointmentUpdated}
                        view="week"
                      />
                    </div>
                  ))}
                  
                  {hasMoreAppointments && (
                    <Collapsible open={isExpanded} onOpenChange={() => toggleDayExpansion(dayStr)}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full h-6 text-xs text-gray-500 hover:text-primary p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Mostra meno
                            </>
                          ) : (
                            <>
                              <MoreHorizontal className="h-3 w-3 mr-1" />
                              +{dayAppointments.length - 2} altri
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        {dayAppointments.slice(2).map((appointment) => (
                          <div className="text-xs mb-2" key={appointment.id}>
                            <div className="text-gray-500 mb-1">
                              {appointment.startTime.substring(0, 5)}
                            </div>
                            <AppointmentCardSmall 
                              appointment={appointment}
                              onUpdate={handleAppointmentUpdated}
                              view="week"
                            />
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
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
