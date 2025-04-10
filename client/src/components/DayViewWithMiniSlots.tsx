import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { generateHourlyGroupedTimeSlots, formatDateFull, formatDateForApi } from "@/lib/utils/date";
import { Loader2, ChevronDown, ChevronRight, Plus, Calendar } from "lucide-react";
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
  
  // Stato per tenere traccia se è in modalità selezione
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Gestisce la selezione dell'ora intera
  const handleHourSelection = (hour: string) => {
    // Se non è in modalità selezione, non fare nulla
    if (!isSelectionMode) return;
    
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
    // Se non è in modalità selezione, non fare nulla
    if (!isSelectionMode) return;
    
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
  
  // Nuovo metodo per attivare la modalità selezione
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Reset degli slot selezionati quando si esce dalla modalità selezione
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
    }
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

      {/* Pulsante "Seleziona nuovo appuntamento" */}
      <div className="p-4 flex justify-center">
        <Button
          onClick={toggleSelectionMode}
          className={cn(
            "border-2 font-bold text-lg",
            isSelectionMode 
              ? "bg-blue-100 border-blue-500 text-blue-800" 
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          )}
        >
          <Calendar className="h-5 w-5 mr-2" />
          {t('calendar.selectNewAppointment')}
        </Button>
      </div>
      
      {/* Time slots visualizzati come in tabella */}
      <div className="p-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="mb-4">
              <Skeleton className="h-20 w-full" />
            </div>
          ))
        ) : (
          // Tabella degli slot orari
          <div className="border border-gray-300 rounded overflow-hidden">
            {/* Render dei time slot raggruppati per ora */}
            {groupedTimeSlots.map((hourGroup) => {
              const hasAppointmentsInHour = hourHasAppointments(hourGroup.hour);
              const isHourSelected = selectedSlots[hourGroup.hour]?.hourSelected || false;
              
              // Trova gli appuntamenti in questa ora
              const hourAppointments = appointments.filter(a => 
                a.startTime.startsWith(`${hourGroup.hour}:`) || 
                (a.startTime < `${hourGroup.hour}:00:00` && a.endTime > `${hourGroup.hour}:00:00`)
              );
              
              // Ottieni il colore del servizio per questa ora
              let serviceColor = '';
              if (isHourSelected && hourAppointments.length > 0 && hourAppointments[0].service && hourAppointments[0].service.color) {
                serviceColor = hourAppointments[0].service.color;
              }
              
              return (
                <div 
                  key={hourGroup.hour} 
                  className="flex border-b border-gray-300 last:border-b-0"
                >
                  {/* Colonna dell'ora */}
                  <div 
                    className={cn(
                      "w-24 p-4 font-bold text-gray-700 text-lg border-r border-gray-300 flex items-center justify-center",
                      isHourSelected && serviceColor ? `bg-opacity-25 bg-${serviceColor.replace('#', '')}` : ""
                    )}
                    onClick={() => handleHourSelection(hourGroup.hour)}
                    style={isHourSelected && serviceColor ? { backgroundColor: serviceColor ? `${serviceColor}25` : '' } : {}}
                  >
                    {hourGroup.hour}:00
                  </div>
                  
                  {/* Colonna con i mini-slot */}
                  <div className="flex-grow">
                    {/* 4 Mini-slot con linee orizzontali */}
                    <div className="divide-y divide-gray-300">
                      {hourGroup.slots.map((timeSlot) => {
                        const isSlotSelected = selectedSlots[hourGroup.hour]?.miniSlots[timeSlot] || false;
                        const slotOccupied = isSlotOccupied(timeSlot);
                        const appointmentsInSlot = appointments.filter(a => a.startTime.startsWith(timeSlot));
                        
                        // Ottieni il colore del servizio per lo slot
                        let slotServiceColor = '';
                        if (isSlotSelected && appointmentsInSlot.length > 0 && appointmentsInSlot[0].service && appointmentsInSlot[0].service.color) {
                          slotServiceColor = appointmentsInSlot[0].service.color;
                        }
                        
                        // Controlla se lo slot corrente è il primo slot di un appuntamento multi-slot
                        const isFirstSlotOfAppointment = appointmentsInSlot.length > 0;
                        
                        // Controlla se l'appuntamento in questo slot si estende su più slot
                        // Per farlo verifichiamo se ci sono appuntamenti che iniziano prima ma terminano dopo questo slot
                        const multiSlotAppointments = appointments.filter(a => 
                          a.startTime < timeSlot && 
                          a.endTime > timeSlot
                        );
                        
                        // Determina se questo slot deve mostrare un appuntamento o essere parte di uno già iniziato
                        const hasAppointmentToShow = isFirstSlotOfAppointment || multiSlotAppointments.length > 0;
                        
                        // Determina quale appuntamento mostrare (priorità a quelli che iniziano in questo slot)
                        const appointmentToShow = isFirstSlotOfAppointment 
                          ? appointmentsInSlot[0] 
                          : multiSlotAppointments.length > 0 
                            ? multiSlotAppointments[0] 
                            : null;
                        
                        return (
                          <div 
                            key={timeSlot} 
                            className={cn(
                              "h-12 px-3 py-2 flex items-center",
                              isSlotSelected && slotServiceColor ? `bg-opacity-15` : "",
                              slotOccupied ? "bg-gray-100" : "hover:bg-gray-50"
                            )}
                            onClick={() => handleMiniSlotSelection(hourGroup.hour, timeSlot)}
                            style={isSlotSelected && slotServiceColor ? { backgroundColor: slotServiceColor ? `${slotServiceColor}25` : '' } : {}}
                          >
                            {slotOccupied ? (
                              // Se lo slot è occupato, mostra gli appuntamenti
                              <div className="w-full">
                                {/* Mostra l'appuntamento solo nel primo slot in cui inizia */}
                                {isFirstSlotOfAppointment ? (
                                  <AppointmentCard
                                    key={appointmentToShow?.id}
                                    appointment={appointmentToShow!}
                                    onUpdate={handleAppointmentUpdated}
                                    compact={true}
                                  />
                                ) : multiSlotAppointments.length > 0 ? (
                                  // Se ci sono appuntamenti multi-slot che attraversano questo slot,
                                  // mostriamo un segnalino discreto o nulla per evitare ripetizioni
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-full border-t border-dashed" 
                                         style={{ borderColor: multiSlotAppointments[0].service.color || '#9ca3af' }}></div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 italic">
                                    {t('calendar.slotOccupied')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Se lo slot è libero ed è in modalità selezione
                              isSelectionMode && (
                                <div className="w-full flex justify-between items-center">
                                  {/* Visualizza solo l'ora senza altri elementi (come nell'immagine) */}
                                  <span className="text-sm text-gray-600">{timeSlot}</span>
                                  {isSlotSelected && (
                                    <span className="text-xs text-green-700 font-medium">
                                      {t('calendar.selected')}
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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