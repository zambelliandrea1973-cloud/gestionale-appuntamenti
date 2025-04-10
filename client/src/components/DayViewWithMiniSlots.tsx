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
  
  // Stato per tenere traccia del servizio selezionato
  const [selectedService, setSelectedService] = useState<any>(null);
  
  // Funzione per selezionare un servizio di default (prima versione semplificata)
  const getDefaultService = () => {
    // Prendi il primo servizio disponibile dalla lista degli appuntamenti
    if (appointments.length > 0 && appointments[0].service) {
      return appointments[0].service;
    }
    // Altrimenti restituisci un servizio predefinito
    return {
      name: 'Servizio Default',
      color: '#3f51b5'
    };
  };

  // Simuliamo la selezione del servizio dopo un po' di selezioni
  useEffect(() => {
    // Verifichiamo se ci sono slot selezionati
    const hasSelectedSlots = Object.values(selectedSlots).some(hourSlots => 
      hourSlots.hourSelected || Object.values(hourSlots.miniSlots).some(isSelected => isSelected)
    );
    
    // Se ci sono slot selezionati ma non ancora un servizio selezionato, impostiamo un timer
    // per simulare il cambiamento del colore dopo un po'
    if (hasSelectedSlots && !selectedService) {
      const timer = setTimeout(() => {
        setSelectedService(getDefaultService());
      }, 2000); // Dopo 2 secondi
      
      return () => clearTimeout(timer);
    }
  }, [selectedSlots, selectedService]);
  
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
  
  // Aggiorna il servizio selezionato quando necessario
  useEffect(() => {
    if (!selectedService && appointments.length > 0) {
      setSelectedService(getDefaultService());
    }
  }, [appointments, selectedService]);
  
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
    
    // Se non abbiamo ancora un servizio selezionato, impostiamone uno predefinito
    if (!selectedService) {
      setSelectedService(getDefaultService());
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
      (appointment.startTime < slot && appointment.endTime > slot)
    );
  };
  
  // Funzione per calcolare l'orario di fine dato un orario di inizio e una durata in minuti
  const calculateEndTime = (timeSlot: string, durationMinutes: number) => {
    const time = new Date(`2000-01-01T${timeSlot}`);
    // Aggiungi la durata
    time.setMinutes(time.getMinutes() + durationMinutes);
    // Formatta come HH:MM
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  // Funzione per ottenere tutti gli slot selezionati consecutivi
  const getConsecutiveSelectedSlots = () => {
    const selectedBatches: { 
      startSlot: string; 
      endSlot: string; 
      slots: string[]; 
      hours: { [hour: string]: string[] }
    }[] = [];
    
    let currentBatch: string[] = [];
    let lastSlot: string | null = null;
    
    // Attraversa tutte le ore e slot in ordine cronologico
    for (const hourGroup of groupedTimeSlots) {
      const hour = hourGroup.hour;
      
      // Se l'ora è completamente selezionata, aggiungi tutti i suoi slot
      if (selectedSlots[hour]?.hourSelected) {
        currentBatch.push(...hourGroup.slots);
        lastSlot = hourGroup.slots[hourGroup.slots.length - 1];
        continue;
      }
      
      // Altrimenti verifica i singoli slot
      for (const slot of hourGroup.slots) {
        if (selectedSlots[hour]?.miniSlots[slot]) {
          // Se questo slot è consecutivo al precedente, aggiungilo al batch corrente
          if (lastSlot && isConsecutive(lastSlot, slot)) {
            currentBatch.push(slot);
          } else {
            // Altrimenti, se c'era già un batch in corso, concludilo
            if (currentBatch.length > 0) {
              // Organizza gli slot per ora
              const hours: { [hour: string]: string[] } = {};
              for (const s of currentBatch) {
                const h = s.split(':')[0];
                if (!hours[h]) hours[h] = [];
                hours[h].push(s);
              }
              
              selectedBatches.push({ 
                startSlot: currentBatch[0], 
                endSlot: currentBatch[currentBatch.length - 1],
                slots: [...currentBatch],
                hours
              });
            }
            // Inizia un nuovo batch
            currentBatch = [slot];
          }
          lastSlot = slot;
        } else {
          // Se lo slot non è selezionato e c'era un batch in corso, concludilo
          if (currentBatch.length > 0) {
            // Organizza gli slot per ora
            const hours: { [hour: string]: string[] } = {};
            for (const s of currentBatch) {
              const h = s.split(':')[0];
              if (!hours[h]) hours[h] = [];
              hours[h].push(s);
            }
            
            selectedBatches.push({ 
              startSlot: currentBatch[0], 
              endSlot: currentBatch[currentBatch.length - 1],
              slots: [...currentBatch],
              hours
            });
            currentBatch = [];
          }
          lastSlot = null;
        }
      }
    }
    
    // Se c'è ancora un batch in corso, concludilo
    if (currentBatch.length > 0) {
      // Organizza gli slot per ora
      const hours: { [hour: string]: string[] } = {};
      for (const s of currentBatch) {
        const h = s.split(':')[0];
        if (!hours[h]) hours[h] = [];
        hours[h].push(s);
      }
      
      selectedBatches.push({ 
        startSlot: currentBatch[0], 
        endSlot: currentBatch[currentBatch.length - 1],
        slots: [...currentBatch],
        hours
      });
    }
    
    return selectedBatches;
  };
  
  // Funzione ausiliaria per determinare se due slot sono consecutivi
  const isConsecutive = (slot1: string, slot2: string) => {
    const time1 = new Date(`2000-01-01T${slot1}`);
    const time2 = new Date(`2000-01-01T${slot2}`);
    
    // Calcola la differenza in minuti
    const diffMs = time2.getTime() - time1.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    
    // Due slot sono consecutivi se la differenza è di 15 minuti
    return diffMinutes === 15;
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

      {/* Pulsanti per la selezione e conferma */}
      <div className="p-4 flex flex-col gap-3 items-center">
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
          {t('calendar.selectTimeNewAppointment')}
        </Button>
        
        {/* Pulsante "Conferma e associa cliente" - visibile solo in modalità selezione e quando ci sono slot selezionati */}
        {isSelectionMode && hasSelectedSlots() && (
          <Button 
            onClick={handleCreateAppointment}
            className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg"
          >
            {t('calendar.confirmAndAssociateClient')}
          </Button>
        )}
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
                    {/* Ottieni tutte le serie di slot consecutivi selezionati */}
                    {isSelectionMode && (
                      <div className="relative">
                        {/* Primo livello: mostra tutti gli slot selezionati uniti visivamente */}
                        {getConsecutiveSelectedSlots().map((batch, batchIndex) => {
                          // Calcola l'altezza in base al numero di slot nel batch
                          const batchHeight = batch.slots.length * 48; // 48px è l'altezza di ogni slot (h-12)
                          
                          // Trova l'indice dello slot iniziale per posizionare il batch correttamente
                          const startHour = batch.startSlot.split(':')[0];
                          const startIndex = groupedTimeSlots.findIndex(g => g.hour === startHour);
                          const startSlotIndex = groupedTimeSlots[startIndex].slots.findIndex(s => s === batch.startSlot);
                          const topPosition = startSlotIndex * 48; // Posizione dall'alto rispetto all'inizio dell'ora
                          
                          // Colore di sfondo basato sul servizio selezionato o grigio se stiamo selezionando
                          const serviceColor = selectedService ? selectedService.color : '#777777';
                          
                          // Calcoliamo l'opacità dello sfondo in base al fatto che abbiamo un servizio selezionato o meno
                          const backgroundColor = selectedService 
                                ? `${serviceColor}25` // Colore del servizio con opacità 25%
                                : '#f3f3f3'; // Grigio chiaro per la modalità selezione iniziale
                          
                          return (
                            <div 
                              key={`batch-${batchIndex}`}
                              className="absolute left-0 right-0 z-10 rounded-md shadow-md border-l-4 px-3 py-2 transition-all duration-300"
                              style={{ 
                                top: `${topPosition}px`, 
                                height: `${batchHeight}px`,
                                borderLeftColor: serviceColor,
                                backgroundColor: backgroundColor,
                              }}
                            >
                              <div className="h-full flex flex-col justify-center">
                                <div className="font-medium text-sm">
                                  {batch.startSlot} - {calculateEndTime(batch.endSlot, 15)}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {t('calendar.selected')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Mini-slot con linee orizzontali */}
                    <div className="divide-y divide-gray-300 relative">
                      {hourGroup.slots.map((timeSlot) => {
                        const isSlotSelected = selectedSlots[hourGroup.hour]?.miniSlots[timeSlot] || false;
                        const slotOccupied = isSlotOccupied(timeSlot);
                        const appointmentsInSlot = appointments.filter(a => a.startTime.startsWith(timeSlot));
                        
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
                              "h-12 px-3 py-2 flex items-center transition-all duration-300",
                              isSlotSelected 
                                ? selectedService 
                                  ? "bg-transparent" // Sarà gestito dal batch per gli slot consecutivi
                                  : "bg-gray-200" // Grigio per slot selezionati quando non c'è ancora un servizio
                                : "",
                              slotOccupied ? "bg-gray-100" : "hover:bg-gray-50"
                            )}
                            onClick={() => handleMiniSlotSelection(hourGroup.hour, timeSlot)}
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
                              isSelectionMode && !isSlotSelected && (
                                <div className="w-full flex justify-between items-center">
                                  {/* Visualizza solo l'ora senza altri elementi (come nell'immagine) */}
                                  <span className="text-sm text-gray-600">{timeSlot}</span>
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