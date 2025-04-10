import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { generateHourlyGroupedTimeSlots, formatDateFull, formatDateForApi } from "@/lib/utils/date";
import { Loader2, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import AppointmentCard from "./AppointmentCard";
import AppointmentModal from "./AppointmentModal";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AppointmentWithDetails } from "@shared/schema";

interface DayViewProps {
  selectedDate: Date;
  onRefresh?: () => void;
}

// Tipo per tenere traccia degli slot selezionati
interface SelectedSlots {
  [hour: string]: {
    hourSelected: boolean;
    miniSlots: {
      [slot: string]: boolean;
    };
  };
}

export default function DayViewWithMiniSlots({ selectedDate, onRefresh }: DayViewProps) {
  const { t, i18n } = useTranslation();
  const [groupedTimeSlots] = useState(() => generateHourlyGroupedTimeSlots(8, 22, 15));
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [expandedHours, setExpandedHours] = useState<Record<string, boolean>>({});
  
  // Stato per tenere traccia degli slot selezionati
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlots>({});
  
  // Utilizziamo un metodo alternativo per formattare la data
  const formattedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  
  // Fetch appointments for the selected date
  const { data: appointments = [], isLoading, refetch } = useQuery<AppointmentWithDetails[]>({
    queryKey: [`/api/appointments/date/${formattedDate}`],
  });
  
  // Refresh data when date changes
  useEffect(() => {
    refetch();
  }, [selectedDate, refetch]);
  
  // All'inizializzazione, espandi solo le ore che hanno appuntamenti o l'ora corrente se è oggi
  useEffect(() => {
    const isToday = new Date().toDateString() === selectedDate.toDateString();
    const currentHour = new Date().getHours().toString().padStart(2, '0');
    
    const initialExpandedState: Record<string, boolean> = {};
    const initialSelectedSlots: SelectedSlots = {};
    
    groupedTimeSlots.forEach(group => {
      // Se è oggi, espandi l'ora corrente
      if (isToday && group.hour === currentHour) {
        initialExpandedState[group.hour] = true;
      } else {
        initialExpandedState[group.hour] = false;
      }
      
      // Inizializza lo stato di selezione per ogni ora e i suoi mini-slot
      initialSelectedSlots[group.hour] = {
        hourSelected: false,
        miniSlots: {}
      };
      
      // Inizializza lo stato per ogni mini-slot
      group.slots.forEach(slot => {
        initialSelectedSlots[group.hour].miniSlots[slot] = false;
      });
    });
    
    setExpandedHours(initialExpandedState);
    setSelectedSlots(initialSelectedSlots);
  }, [selectedDate, groupedTimeSlots]);
  
  // Funzione per cambiare lo stato di espansione di un'ora
  const toggleHourExpansion = (hour: string) => {
    setExpandedHours(prev => ({
      ...prev,
      [hour]: !prev[hour]
    }));
  };
  
  // Verifica se un'ora ha appuntamenti
  const hourHasAppointments = (hour: string): boolean => {
    return appointments.some(appointment => 
      appointment.startTime.startsWith(hour) || 
      // Verifica anche se l'appuntamento attraversa quest'ora ma è iniziato prima
      (appointment.startTime < `${hour}:00:00` && appointment.endTime > `${hour}:00:00`)
    );
  };
  
  // Handle appointment update
  const handleAppointmentUpdated = () => {
    refetch();
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // Gestisce la selezione dell'ora intera
  const handleHourSelection = (hour: string) => {
    const hourState = selectedSlots[hour];
    const newHourSelected = !hourState.hourSelected;
    
    const updatedMiniSlots = { ...hourState.miniSlots };
    // Se selezioniamo l'ora intera, tutti i mini-slot diventano selezionati
    Object.keys(updatedMiniSlots).forEach(slot => {
      updatedMiniSlots[slot] = newHourSelected;
    });
    
    setSelectedSlots({
      ...selectedSlots,
      [hour]: {
        hourSelected: newHourSelected,
        miniSlots: updatedMiniSlots
      }
    });
    
    // Se l'ora è stata selezionata, imposta il primo slot come orario di inizio
    if (newHourSelected) {
      const firstSlot = groupedTimeSlots.find(g => g.hour === hour)?.slots[0] || `${hour}:00`;
      setSelectedTimeSlot(firstSlot);
    }
  };
  
  // Gestisce la selezione di un mini-slot
  const handleMiniSlotSelection = (hour: string, slot: string) => {
    const hourState = selectedSlots[hour];
    const updatedMiniSlots = { ...hourState.miniSlots };
    updatedMiniSlots[slot] = !updatedMiniSlots[slot];
    
    // Verifica se tutti i mini-slot sono selezionati
    const allMiniSlotsSelected = Object.values(updatedMiniSlots).every(selected => selected);
    
    setSelectedSlots({
      ...selectedSlots,
      [hour]: {
        hourSelected: allMiniSlotsSelected,
        miniSlots: updatedMiniSlots
      }
    });
    
    // Se questo è il primo slot selezionato, impostalo come orario di inizio
    if (updatedMiniSlots[slot] && !Object.values(updatedMiniSlots).some(s => s && s !== updatedMiniSlots[slot])) {
      setSelectedTimeSlot(slot);
    }
  };
  
  // Apre il form per creare l'appuntamento con gli slot selezionati
  const handleCreateAppointment = () => {
    // Trova il primo slot selezionato per usarlo come orario di inizio
    let startSlot = "";
    
    outerLoop:
    for (const hour in selectedSlots) {
      if (selectedSlots[hour].hourSelected) {
        const firstSlot = groupedTimeSlots.find(g => g.hour === hour)?.slots[0];
        if (firstSlot) {
          startSlot = firstSlot;
          break;
        }
      } else {
        for (const slot in selectedSlots[hour].miniSlots) {
          if (selectedSlots[hour].miniSlots[slot]) {
            startSlot = slot;
            break outerLoop;
          }
        }
      }
    }
    
    if (startSlot) {
      setSelectedTimeSlot(startSlot);
      setIsAppointmentFormOpen(true);
    }
  };
  
  // Handle form closure
  const handleFormClosed = () => {
    setIsAppointmentFormOpen(false);
    
    // Reset degli slot selezionati
    const resetSlots: SelectedSlots = {};
    for (const hour in selectedSlots) {
      resetSlots[hour] = {
        hourSelected: false,
        miniSlots: {}
      };
      
      for (const slot in selectedSlots[hour].miniSlots) {
        resetSlots[hour].miniSlots[slot] = false;
      }
    }
    
    setSelectedSlots(resetSlots);
    handleAppointmentUpdated();
  };
  
  // Controlla se ci sono slot selezionati
  const hasSelectedSlots = (): boolean => {
    for (const hour in selectedSlots) {
      if (selectedSlots[hour].hourSelected) return true;
      for (const slot in selectedSlots[hour].miniSlots) {
        if (selectedSlots[hour].miniSlots[slot]) return true;
      }
    }
    return false;
  };
  
  // Verifica se un mini-slot è occupato da un appuntamento
  const isSlotOccupied = (slot: string): boolean => {
    return appointments.some(appointment => 
      appointment.startTime.startsWith(slot) ||
      (appointment.startTime < `${slot}:00` && appointment.endTime > `${slot}:00`)
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Day header */}
      <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {selectedDate.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        
        {/* Pulsante per creare l'appuntamento con gli slot selezionati */}
        {hasSelectedSlots() && (
          <Button 
            size="sm"
            onClick={handleCreateAppointment}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {t('calendar.addAppointment')}
          </Button>
        )}
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
            const isHourSelected = selectedSlots[hourGroup.hour]?.hourSelected || false;
            
            return (
              <div 
                key={hourGroup.hour} 
                className={cn(
                  "border-b",
                  hasAppointmentsInHour ? "bg-blue-50" : "",
                  isHourSelected ? "bg-green-50" : ""
                )}
              >
                {/* Intestazione dell'ora con pulsante per selezionare l'ora intera */}
                <div className="flex items-center px-4 py-2">
                  {/* Pulsante per espandere/collassare */}
                  <button
                    onClick={() => toggleHourExpansion(hourGroup.hour)}
                    className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-gray-700"
                  >
                    {expandedHours[hourGroup.hour] ? 
                      <ChevronDown className="h-5 w-5" /> : 
                      <ChevronRight className="h-5 w-5" />
                    }
                  </button>
                  
                  {/* Pulsante per selezionare l'ora intera */}
                  <button 
                    className={cn(
                      "flex-grow py-2 px-4 font-bold text-gray-700 text-lg rounded-l transition-colors",
                      isHourSelected ? "bg-green-200" : "hover:bg-gray-100"
                    )}
                    onClick={() => handleHourSelection(hourGroup.hour)}
                  >
                    {hourGroup.hour}:00
                  </button>
                </div>
                
                {/* Mini-slots da 15 minuti */}
                {expandedHours[hourGroup.hour] && (
                  <div className="px-4 py-2">
                    <div className="border rounded overflow-hidden">
                      {/* 4 Mini-slot separati da 3 linee orizzontali */}
                      <div className="divide-y">
                        {hourGroup.slots.map((timeSlot) => {
                          const isSlotSelected = selectedSlots[hourGroup.hour]?.miniSlots[timeSlot] || false;
                          const slotOccupied = isSlotOccupied(timeSlot);
                          const appointmentsInSlot = appointments.filter(a => a.startTime.startsWith(timeSlot));
                          
                          return (
                            <div key={timeSlot} className="px-2">
                              {slotOccupied ? (
                                // Se lo slot è occupato, mostra gli appuntamenti
                                <div className="py-1">
                                  <div className="flex items-center">
                                    <div className="w-16 text-xs font-medium text-gray-600">{timeSlot}</div>
                                    <div className="flex-grow">
                                      {appointmentsInSlot.map(appointment => (
                                        <AppointmentCard
                                          key={appointment.id}
                                          appointment={appointment}
                                          onUpdate={handleAppointmentUpdated}
                                          compact={true}
                                        />
                                      ))}
                                      {appointmentsInSlot.length === 0 && (
                                        <div className="text-xs text-gray-500 italic py-1">
                                          {t('calendar.slotOccupied')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                // Se lo slot è libero, mostra il pulsante per selezionarlo
                                <button
                                  className={cn(
                                    "w-full py-2 flex items-center text-left transition-colors",
                                    isSlotSelected ? "bg-green-100" : "hover:bg-gray-50"
                                  )}
                                  onClick={() => handleMiniSlotSelection(hourGroup.hour, timeSlot)}
                                >
                                  <div className="w-16 text-xs font-medium text-gray-600">{timeSlot}</div>
                                  <div className="flex-grow">
                                    {isSlotSelected ? (
                                      <div className="text-xs text-green-700 font-medium">{t('calendar.selected')}</div>
                                    ) : (
                                      <div className="text-xs text-blue-600">
                                        <Plus className="h-3 w-3 inline mr-1" />
                                        {t('calendar.select')}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Modal for creating appointments */}
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