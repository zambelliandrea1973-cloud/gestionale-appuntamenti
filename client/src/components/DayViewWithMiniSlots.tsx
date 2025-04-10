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
  
  // Stato per tenere traccia se è in modalità selezione
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Stato per tenere traccia del servizio selezionato
  const [selectedService, setSelectedService] = useState<any>(null);
  
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
  
  // Funzione per selezionare un servizio di default
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
  
  // Non usiamo più il cambio automatico di colore dopo un timer
  // Il servizio verrà selezionato solo dopo la conferma dell'appuntamento
  
  // Rimuoviamo anche l'aggiornamento automatico del servizio
  // Il servizio verrà selezionato solo quando è creato un appuntamento
  
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
    
    // Se lo slot è occupato, non permettere la selezione
    if (isSlotOccupied(slot)) return;
    
    const hourState = selectedSlots[hour];
    const updatedMiniSlots = { ...hourState.miniSlots };
    
    // Inverti lo stato del mini-slot selezionato
    updatedMiniSlots[slot] = !updatedMiniSlots[slot];
    
    // Verifica se tutti i mini-slot sono selezionati per questa ora
    const allMiniSlotsSelected = Object.values(updatedMiniSlots).every(selected => selected);
    
    // Aggiorna lo stato solo per l'ora corrente
    setSelectedSlots(prevState => ({
      ...prevState,
      [hour]: {
        hourSelected: allMiniSlotsSelected,
        miniSlots: updatedMiniSlots
      }
    }));
    
    // Se questo slot è stato selezionato (non deselezionato) e non ci sono altri slot selezionati,
    // imposta questo come orario di inizio
    if (updatedMiniSlots[slot]) {
      // Controlla se ci sono altri slot già selezionati
      const hasOtherSelectedSlots = Object.values(selectedSlots).some(h => 
        h.hourSelected || Object.values(h.miniSlots).some(s => s)
      );
      
      // Se questo è il primo slot selezionato o se è cronologicamente prima del primo slot già selezionato
      if (!hasOtherSelectedSlots) {
        setSelectedTimeSlot(slot);
      }
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
    // Prepara lo slot come una data completa per la comparazione
    const slotParts = slot.split(':');
    const hour = slotParts[0].padStart(2, '0');
    const minute = slotParts[1].padStart(2, '0');
    const slotFormatted = `${hour}:${minute}:00`;
    
    return appointments.some(appointment => {
      // Verifica se l'appuntamento inizia esattamente in questo slot
      if (appointment.startTime === slotFormatted) return true;
      
      // Verifica se questo slot è all'interno della durata di un appuntamento
      // (l'appuntamento inizia prima e finisce dopo questo slot)
      return appointment.startTime < slotFormatted && appointment.endTime > slotFormatted;
    });
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
  // Migliorata per evitare duplicazioni tra fasce orarie
  const getConsecutiveSelectedSlots = () => {
    const allSlots: string[] = [];
    
    // Prima raccogliamo tutti gli slot selezionati in un array ordinato
    for (const hourGroup of groupedTimeSlots) {
      const hour = hourGroup.hour;
      
      // Se l'ora è completamente selezionata, aggiungi tutti i suoi slot
      if (selectedSlots[hour]?.hourSelected) {
        allSlots.push(...hourGroup.slots);
      } else {
        // Altrimenti aggiungi solo i mini-slot selezionati
        for (const slot of hourGroup.slots) {
          if (selectedSlots[hour]?.miniSlots[slot]) {
            allSlots.push(slot);
          }
        }
      }
    }
    
    // Ordiniamo gli slot cronologicamente
    allSlots.sort();
    
    // Ora raggruppiamo gli slot consecutivi in batch
    const selectedBatches: { 
      startSlot: string; 
      endSlot: string; 
      slots: string[]; 
      hours: { [hour: string]: string[] }
    }[] = [];
    
    if (allSlots.length === 0) return selectedBatches;
    
    let currentBatch: string[] = [allSlots[0]];
    
    // Troviamo i batch di slot consecutivi
    for (let i = 1; i < allSlots.length; i++) {
      const prevSlot = allSlots[i - 1];
      const currSlot = allSlots[i];
      
      if (isConsecutive(prevSlot, currSlot)) {
        // Se è consecutivo, aggiungilo al batch corrente
        currentBatch.push(currSlot);
      } else {
        // Altrimenti, concludi il batch corrente e iniziane uno nuovo
        
        // Organizza gli slot per ora
        const hours: { [hour: string]: string[] } = {};
        for (const s of currentBatch) {
          const h = s.split(':')[0];
          if (!hours[h]) hours[h] = [];
          hours[h].push(s);
        }
        
        // Aggiungi il batch completato
        selectedBatches.push({
          startSlot: currentBatch[0],
          endSlot: currentBatch[currentBatch.length - 1],
          slots: [...currentBatch],
          hours
        });
        
        // Inizia un nuovo batch
        currentBatch = [currSlot];
      }
    }
    
    // Aggiungi l'ultimo batch se presente
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
      setSelectedService(null);
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
                          
                          // Determina in quale ora inizia il batch
                          const startHour = batch.startSlot.split(':')[0];
                          
                          // Trova l'ora iniziale nei gruppi di ore
                          const startHourGroup = groupedTimeSlots.find(g => g.hour === startHour);
                          
                          // Se non troviamo l'ora, saltiamo (caso improbabile ma gestito per sicurezza)
                          if (!startHourGroup) return null;
                          
                          // Ottieni l'indice dello slot all'interno dell'ora
                          const startSlotTime = batch.startSlot.split(':')[1];
                          
                          // Calcoliamo la posizione dall'alto basata sulla posizione dello slot all'interno dell'ora
                          // Ogni slot da 15 minuti occupa 1/4 dell'altezza totale di un'ora (48px)
                          let topPosition = 0;
                          
                          // Determina la posizione in base ai minuti
                          if (startSlotTime === '00') topPosition = 0;
                          else if (startSlotTime === '15') topPosition = 48 / 4;
                          else if (startSlotTime === '30') topPosition = 48 / 2;
                          else if (startSlotTime === '45') topPosition = (48 / 4) * 3;
                          
                          // Aggiunge l'offset in base all'indice dell'ora nel gruppo di ore
                          const hourIndex = groupedTimeSlots.findIndex(g => g.hour === startHour);
                          topPosition += hourIndex * 48;
                          
                          // Colore di sfondo basato sul servizio selezionato o grigio se stiamo selezionando
                          const serviceColor = selectedService ? selectedService.color : '#777777';
                          
                          // Calcoliamo l'opacità dello sfondo in base al fatto che abbiamo un servizio selezionato o meno
                          const backgroundColor = selectedService 
                                ? `${serviceColor}25` // Colore del servizio con opacità 25%
                                : '#f3f3f3'; // Grigio chiaro per la modalità selezione iniziale
                          
                          // Calcoliamo l'orario di fine (aggiungendo 15 minuti all'ultimo slot)
                          const endTime = calculateEndTime(batch.endSlot, 15);
                          
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
                                <div className="font-medium">
                                  {batch.startSlot} - {endTime}
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
                                         style={{ borderColor: multiSlotAppointments[0].service?.color || '#9ca3af' }}></div>
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