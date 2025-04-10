import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { generateHourlyGroupedTimeSlots, formatDateFull, formatDateForApi } from "@/lib/utils/date";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AppointmentCard from "./AppointmentCard";
import AppointmentModal from "./AppointmentModal";
import { useTranslation } from "react-i18next";

interface Appointment {
  id: number;
  startTime: string;
  endTime: string;
  client: {
    firstName: string;
    lastName: string;
  };
  service: {
    name: string;
    color: string;
  };
  [key: string]: any;
}

interface DayViewProps {
  selectedDate: Date;
  onRefresh?: () => void;
}

export default function DayView({ selectedDate, onRefresh }: DayViewProps) {
  const { t, i18n } = useTranslation();
  const [groupedTimeSlots] = useState(() => generateHourlyGroupedTimeSlots(8, 22, 15));
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [expandedHours, setExpandedHours] = useState<Record<string, boolean>>({});

  // All'inizializzazione, espandi solo le ore che hanno appuntamenti o l'ora corrente se è oggi
  useEffect(() => {
    const isToday = new Date().toDateString() === selectedDate.toDateString();
    const currentHour = new Date().getHours().toString().padStart(2, '0');
    
    const initialExpandedState: Record<string, boolean> = {};
    groupedTimeSlots.forEach(group => {
      // Se è oggi, espandi l'ora corrente
      if (isToday && group.hour === currentHour) {
        initialExpandedState[group.hour] = true;
      } else {
        initialExpandedState[group.hour] = false;
      }
    });
    
    setExpandedHours(initialExpandedState);
  }, [groupedTimeSlots, selectedDate]);
  
  // Utilizziamo un metodo alternativo per formattare la data, per evitare problemi di fuso orario
  const formattedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  
  // Fetch appointments for the selected date
  const { data: appointments = [], isLoading, refetch } = useQuery<Appointment[]>({
    queryKey: [`/api/appointments/date/${formattedDate}`],
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
  const handleTimeSlotClick = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setIsAppointmentFormOpen(true);
  };
  
  // Handle form closure
  const handleFormClosed = () => {
    setIsAppointmentFormOpen(false);
    handleAppointmentUpdated();
  };
  
  // Toggling hour expansion
  const toggleHourExpansion = (hour: string) => {
    setExpandedHours(prev => ({
      ...prev,
      [hour]: !prev[hour]
    }));
  };
  
  // Verifica se un'ora ha appuntamenti attivi
  const hourHasAppointments = (hour: string): boolean => {
    return appointments.some(appointment => 
      appointment.startTime.startsWith(hour) || 
      // Verifica anche se l'appuntamento attraversa quest'ora ma è iniziato prima
      (appointment.startTime < `${hour}:00:00` && appointment.endTime > `${hour}:00:00`)
    );
  };
  
  // Espandi automaticamente le ore con appuntamenti
  useEffect(() => {
    if (appointments.length > 0 && !isLoading) {
      const updatedExpandedState = { ...expandedHours };
      
      groupedTimeSlots.forEach(group => {
        if (hourHasAppointments(group.hour)) {
          updatedExpandedState[group.hour] = true;
        }
      });
      
      setExpandedHours(updatedExpandedState);
    }
  }, [appointments, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Day header */}
      <div className="bg-gray-100 px-4 py-3 border-b">
        <h3 className="text-lg font-medium">{selectedDate.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
      </div>
      
      {/* Time slots */}
      <div className="divide-y">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="flex items-start px-4 py-3">
              <div className="w-16">
                <Skeleton className="h-6 w-12" />
              </div>
              <div className="flex-grow">
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ))
        ) : (
          // Render time slots grouped by hour
          groupedTimeSlots.map((hourGroup) => {
            const hasAppointmentsInHour = hourHasAppointments(hourGroup.hour);
            const isExpanded = expandedHours[hourGroup.hour];
            
            return (
              <Collapsible 
                key={hourGroup.hour} 
                open={isExpanded}
                onOpenChange={() => toggleHourExpansion(hourGroup.hour)}
                className={`border-b ${hasAppointmentsInHour ? 'bg-blue-50' : ''}`}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="font-bold text-gray-700 text-lg">
                      {hourGroup.hour}:00
                    </div>
                    {hasAppointmentsInHour && (
                      <div className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {t('calendar.hasAppointments')}
                      </div>
                    )}
                  </div>
                  <div>
                    {isExpanded ? 
                      <ChevronDown className="h-5 w-5 text-gray-500" /> : 
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    }
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="space-y-2 px-4 py-2">
                    {hourGroup.slots.map((timeSlot) => {
                      // Find appointments for this time slot
                      const slotsAppointments = appointments.filter(
                        (appointment) => appointment.startTime.startsWith(timeSlot)
                      );
                      
                      // Also find appointments that span this slot
                      const spanningAppointments = appointments.filter(appointment => {
                        const slotStart = `${timeSlot}:00`;
                        // Verify if this appointment spans the current slot
                        return appointment.startTime < slotStart && 
                               appointment.endTime > slotStart && 
                               !appointment.startTime.startsWith(timeSlot);
                      });
                      
                      const showAddButton = slotsAppointments.length === 0 && spanningAppointments.length === 0;
                      
                      return (
                        <div 
                          key={timeSlot} 
                          className={`flex items-start py-1 ${timeSlot.endsWith('00') ? 'border-t' : ''}`}
                        >
                          <div className="w-16 font-medium text-gray-600 text-sm">
                            {timeSlot}
                          </div>
                          <div className="flex-grow">
                            {slotsAppointments.length > 0 ? (
                              // Show appointments in this slot
                              <div className="space-y-2">
                                {slotsAppointments.map((appointment) => (
                                  <AppointmentCard 
                                    key={appointment.id}
                                    appointment={appointment}
                                    onUpdate={handleAppointmentUpdated}
                                  />
                                ))}
                              </div>
                            ) : spanningAppointments.length > 0 ? (
                              // This slot is occupied by an appointment that started earlier
                              <div className="h-6 flex items-center">
                                <div className="text-xs text-gray-500 italic">
                                  {t('calendar.slotOccupied')}
                                </div>
                              </div>
                            ) : (
                              // Empty slot with add button
                              <div className="flex items-center h-8">
                                <a 
                                  href="#" 
                                  className="flex items-center px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded-md"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleTimeSlotClick(timeSlot);
                                  }}
                                >
                                  + {t('calendar.addAppointment')}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>
      
      {/* Use our new AppointmentModal component */}
      <AppointmentModal
        isOpen={isAppointmentFormOpen}
        onClose={handleFormClosed}
        onSave={handleAppointmentUpdated}
        defaultDate={selectedDate}
        defaultTime={selectedTimeSlot || "09:00"}
      />
    </div>
  );
}
