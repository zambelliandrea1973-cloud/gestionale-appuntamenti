import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Trash2, Edit, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AppointmentModal from "./AppointmentModal";
import { FloatingActionButton } from "./FloatingActionButton";
import { AppointmentWithDetails, Service } from "../types/api";
import { formatDateForApi, formatTime, calculateEndTime, addMinutes } from "@/lib/utils/date";

interface DayViewWithTimeSlotsProps {
  selectedDate: Date;
  isLoading: boolean;
  appointments: AppointmentWithDetails[];
  services: Service[];
  onAppointmentUpdated: () => void;
  onAppointmentDeleted: (id: number) => void;
}

export default function DayViewWithTimeSlots({
  selectedDate,
  isLoading,
  appointments,
  services,
  onAppointmentUpdated,
  onAppointmentDeleted
}: DayViewWithTimeSlotsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [expandedAppointment, setExpandedAppointment] = useState<number | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null); // Aggiungiamo un ref per il timer
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Rileva se siamo su mobile
  
  // Gestione del cambio di dimensione della finestra
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Gestione dell'appuntamento espanso e timer di chiusura automatica
  useEffect(() => {
    // Se non c'è un appuntamento espanso, non facciamo nulla
    if (expandedAppointment === null) {
      // Se non c'è un appuntamento espanso ma esiste un timer, cancelliamolo
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      return;
    }
    
    // Cancella il timer precedente se esistente
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    
    // Timer per chiudere automaticamente l'appuntamento espanso dopo 5 secondi (solo mobile)
    // Lo manteniamo come backup, ma la chiusura principale avverrà tramite un secondo tocco
    if (isMobile) {
      console.log("Mobile: impostato timer di 5 secondi per chiusura automatica appuntamento"); // Debug
      autoCloseTimerRef.current = setTimeout(() => {
        console.log("Mobile: chiusura automatica appuntamento dopo 5 secondi"); // Debug
        setExpandedAppointment(null);
      }, 5000); // 5 secondi invece di 2 per dare più tempo all'utente
    }
    
    // Funzione per gestire il click fuori dall'appuntamento espanso (solo mobile)
    const handleClickOutside = (event: MouseEvent) => {
      // Ignora se non siamo su mobile
      if (!isMobile) return;
      
      const target = event.target as HTMLElement;
      
      // Se è un clic sui pulsanti dentro l'appuntamento, non chiudiamo
      if (target.closest('button')) {
        return;
      }
      
      // Controlla se il click è stato fatto al di fuori di un elemento con classe .absolute
      if (!target.closest('.absolute')) {
        setExpandedAppointment(null);
      }
    };
    
    // Aggiungiamo l'event listener
    document.addEventListener('click', handleClickOutside);
    
    // Pulizia
    return () => {
      document.removeEventListener('click', handleClickOutside);
      // Cancella il timer se esiste
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [expandedAppointment]);

  // Generazione degli orari dal 08:00 alle 22:45 con incrementi di 15 minuti
  const timeSlots: string[] = [];
  let currentTime = new Date(selectedDate);
  currentTime.setHours(8, 0, 0, 0);

  // Crea 60 slot da 15 minuti ciascuno (dalle 8:00 alle 22:45)
  for (let i = 0; i < 60; i++) {
    timeSlots.push(formatTime(currentTime));
    currentTime = addMinutes(currentTime, 15);
  }

  // Controlla se uno slot è occupato da un appuntamento
  const isSlotOccupied = (slotTime: string): AppointmentWithDetails | undefined => {
    return appointments.find(appointment => {
      const appointmentStart = appointment.startTime.substring(0, 5);
      const appointmentEnd = appointment.endTime.substring(0, 5);
      
      // Controlla se lo slot è all'interno dell'intervallo di tempo dell'appuntamento
      if (slotTime >= appointmentStart && slotTime < appointmentEnd) {
        return true;
      }
      return false;
    });
  };

  // Controlla se uno slot è l'inizio di un appuntamento
  const isAppointmentStart = (slotTime: string): boolean => {
    return appointments.some(appointment => {
      return appointment.startTime.substring(0, 5) === slotTime;
    });
  };

  // Ottiene l'appuntamento che inizia a un orario specifico
  const getAppointmentAtTime = (slotTime: string): AppointmentWithDetails | undefined => {
    return appointments.find(appointment => {
      return appointment.startTime.substring(0, 5) === slotTime;
    });
  };

  // Controlla se uno slot è selezionato
  const isSlotSelected = (slotTime: string): boolean => {
    return selectedSlots.includes(slotTime);
  };

  // Calcola la posizione e l'offset dell'appuntamento per evitare sovrapposizioni
  const calculateAppointmentPosition = (appointment: AppointmentWithDetails) => {
    const startTime = appointment.startTime.substring(0, 5);
    const endTime = appointment.endTime.substring(0, 5);
    
    // Calcola i minuti dall'inizio del giorno (8:00)
    const startHours = parseInt(startTime.split(':')[0]);
    const startMinutes = parseInt(startTime.split(':')[1]);
    const totalStartMinutes = (startHours - 8) * 60 + startMinutes;
    
    // Calcola i minuti totali della durata
    const endHours = parseInt(endTime.split(':')[0]);
    const endMinutes = parseInt(endTime.split(':')[1]);
    const totalEndMinutes = (endHours - 8) * 60 + endMinutes;
    const durationMinutes = totalEndMinutes - totalStartMinutes;
    
    // Converti in unità relative alla griglia
    // 40px per ogni slot da 15 minuti, -1px per migliorare la centratura
    const top = (totalStartMinutes / 15 * 40) - 1; 
    const height = (durationMinutes / 15 * 40) + 2; // +2px per evitare spazi vuoti
    
    // Verifica se ci sono altri appuntamenti che si sovrappongono
    const overlappingAppointments = appointments.filter(app => {
      if (app.id === appointment.id) return false;
      
      const appStart = app.startTime.substring(0, 5);
      const appEnd = app.endTime.substring(0, 5);
      
      // Controlla sovrapposizione
      return (
        (startTime >= appStart && startTime < appEnd) || // L'inizio dell'appuntamento è all'interno di un altro
        (endTime > appStart && endTime <= appEnd) || // La fine dell'appuntamento è all'interno di un altro
        (startTime <= appStart && endTime >= appEnd) // L'appuntamento copre completamente un altro
      );
    });
    
    // Raggruppa appuntamenti che si sovrappongono nello stesso orario
    const sameTimeAppointments = appointments.filter(app => 
      app.id !== appointment.id && 
      app.startTime.substring(0, 5) === startTime
    );
    
    // Calcola l'indice di questo appuntamento
    const appointmentIndex = sameTimeAppointments.length > 0 
      ? [...sameTimeAppointments, appointment]
        .sort((a, b) => a.id - b.id)
        .findIndex(app => app.id === appointment.id)
      : 0;
    
    // Calcola il numero totale di appuntamenti allo stesso orario
    const totalSameTime = sameTimeAppointments.length + 1;
    
    // Imposta l'offset e la larghezza in base alla presenza di sovrapposizioni
    let leftPosition = 70; // Inizia dopo i numeri degli orari (~ 70px)
    let widthValue = 'calc(100% - 76px)'; // Larghezza predefinita
    
    // Versione migliorata: usiamo offset e larghezza fissa in pixel
    if (totalSameTime > 1) {
      // Calcola la larghezza totale disponibile
      const totalWidth = 350; // Larghezza totale stimata del contenitore escludendo gli orari
      
      // Aumentiamo la larghezza minima degli appuntamenti per garantire leggibilità
      const minSlotWidth = 115; // Larghezza minima per slot
      const maxSlots = Math.floor((totalWidth - 20) / minSlotWidth); // Massimo numero di slot visibili contemporaneamente
      
      // Se ci sono più appuntamenti del massimo, mostriamo solo quelli che ci stanno
      const visibleSlots = Math.min(totalSameTime, maxSlots);
      
      // Calcoliamo la larghezza effettiva per ogni appuntamento
      const slotWidth = Math.floor((totalWidth - 20) / visibleSlots); // 20px di margine totale
      
      // Imposta l'offset per ogni appuntamento
      const baseOffset = 70; // Larghezza della colonna degli orari
      leftPosition = baseOffset + (appointmentIndex * slotWidth);
      
      // Imposta una larghezza fissa in pixel
      widthValue = `${slotWidth}px`;
    }
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      width: widthValue,
      left: `${leftPosition}px`, // Torniamo a usare px per maggiore precisione
      zIndex: 10 + appointmentIndex,
    };
  };

  // Mutation per eliminare un appuntamento
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/appointments/${id}`);
      return id;
    },
    onSuccess: (id) => {
      toast({
        title: t("appointment.deletedSuccess"),
        description: t("appointment.deletedSuccessDescription"),
      });
      onAppointmentDeleted(id);
    },
    onError: (error) => {
      toast({
        title: t("appointment.deletedError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Gestione della selezione di uno slot
  const handleSlotClick = (slotTime: string) => {
    if (!isSelectionMode) return;
    
    // Se lo slot è occupato, non permettere la selezione
    if (isSlotOccupied(slotTime)) return;

    // Aggiorna la lista degli slot selezionati
    setSelectedSlots(prev => {
      if (prev.includes(slotTime)) {
        return prev.filter(slot => slot !== slotTime);
      } else {
        return [...prev, slotTime].sort();
      }
    });
  };

  // Avvia la modalità di selezione
  const startSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedSlots([]);
  };

  // Completa la modalità di selezione e apri il modal per creare l'appuntamento
  const completeSelection = () => {
    if (selectedSlots.length === 0) {
      toast({
        title: t("appointment.noSlotsSelected"),
        description: t("appointment.pleaseSelectSlots"),
        variant: "destructive",
      });
      return;
    }

    // Ordina gli slot selezionati
    const sortedSlots = [...selectedSlots].sort();
    
    // Calcola l'ora di inizio e fine dell'appuntamento
    const startTime = sortedSlots[0];
    const lastSlotTime = sortedSlots[sortedSlots.length - 1];
    
    // Calcola l'ora di fine aggiungendo 15 minuti all'ultimo slot
    const endTimeDate = new Date(selectedDate);
    const [hours, minutes] = lastSlotTime.split(':').map(Number);
    endTimeDate.setHours(hours, minutes + 15, 0, 0);
    const endTime = formatTime(endTimeDate);

    // Apri il modal dell'appuntamento
    setIsAppointmentModalOpen(true);
    setSelectedAppointment({
      id: 0,
      clientId: 0,
      serviceId: 0,
      date: formatDateForApi(selectedDate),
      startTime: startTime + ":00",
      endTime: endTime + ":00",
      notes: "",
      status: "scheduled",
      reminderType: null,
      reminderStatus: "pending",
      reminderSent: false,
      reminderConfirmed: false,
    } as AppointmentWithDetails);
  };

  // Cancella la selezione
  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedSlots([]);
  };

  // Gestisce la chiusura del modal dell'appuntamento
  const handleModalClose = () => {
    setIsAppointmentModalOpen(false);
    setSelectedAppointment(null);
    setIsSelectionMode(false);
    setSelectedSlots([]);
  };

  // Gestisce il completamento dell'appuntamento
  const handleAppointmentSaved = () => {
    setIsAppointmentModalOpen(false);
    setSelectedAppointment(null);
    setIsSelectionMode(false);
    setSelectedSlots([]);
    onAppointmentUpdated();
  };

  // Apre il modal per modificare un appuntamento esistente
  const editAppointment = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  // Elimina un appuntamento
  const deleteAppointment = (id: number) => {
    if (window.confirm(t("appointment.confirmDelete"))) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="p-4">
      {/* Informazioni sulla selezione degli slot */}
      <div className="mb-4 flex flex-wrap gap-2">
        {isSelectionMode && (
          <div className="w-full text-sm text-green-600 font-semibold text-center">
            {selectedSlots.length > 0 ? (
              <span>
                {t("calendar.selected")}: {selectedSlots[0]} - 
                {calculateEndTime(selectedSlots[selectedSlots.length - 1], 15)}
              </span>
            ) : (
              <span>{t("calendar.select")}</span>
            )}
          </div>
        )}
      </div>
      
      {/* Griglia degli slot orari */}
      <div className="relative grid grid-cols-1 gap-0 mt-4">
        {timeSlots.map((slotTime, index) => {
          const occupied = isSlotOccupied(slotTime);
          const isStart = isAppointmentStart(slotTime);
          const appointment = isStart ? getAppointmentAtTime(slotTime) : null;
          const selected = isSlotSelected(slotTime);
          
          // Mostra l'ora completa solo agli inizi di ogni ora
          const showFullTime = slotTime.endsWith('00');
          // Mostra una linea di separazione più marcata tra le ore
          const hourSeparator = showFullTime && index > 0;
          
          return (
            <div key={slotTime}>
              {hourSeparator && <div className="h-[1px] bg-gray-300 w-full mb-1" />}
              
              <div 
                className={`
                  flex items-center h-10 border-t border-gray-200 px-2 py-1 
                  ${occupied ? 'opacity-30' : 'cursor-pointer hover:bg-gray-50'} 
                  ${selected ? 'bg-gray-300' : ''}
                `}
                onClick={() => handleSlotClick(slotTime)}
              >
                <div className="w-16 text-sm font-medium">
                  {showFullTime ? slotTime : <span className="text-xs text-gray-500">{slotTime.substring(3)}</span>}
                </div>
                
                <div className="flex-grow">
                  {!occupied && !selected && isSelectionMode && (
                    <div className="h-full w-full bg-gray-50 hover:bg-gray-100 rounded border border-dashed border-gray-300"></div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Appuntamenti visualizzati sovrapposti agli slot */}
        {appointments.map(appointment => {
          const styles = calculateAppointmentPosition(appointment);
          const isExpanded = expandedAppointment === appointment.id;
          
          // Calcolo stili di espansione
          let expandedStyles = {};
          if (isExpanded) {
            // Quando è espanso, aumenta la larghezza e l'indice z per sovrapporsi agli altri appuntamenti
            expandedStyles = {
              width: 'calc(100% - 76px)', // Larghezza massima (escludendo la colonna orari)
              zIndex: 1000, // Valore molto elevato per sovrapporsi a TUTTI gli altri elementi
              left: '70px', // Fissato all'inizio della griglia (dopo la colonna orari)
              transition: 'all 0.25s ease-in-out',
              boxShadow: `0 6px 24px rgba(0,0,0,0.25), 0 0 0 2px ${appointment.service?.color || '#4299e1'}70 !important`, // Ombra più marcata per evidenziare l'elemento espanso
              borderWidth: '1px',
              borderLeftWidth: '12px', // Mantiene il bordo sinistro colorato
              backgroundColor: '#ffffff', // Sfondo completamente opaco (bianco)
              maxHeight: 'none', // Permettiamo l'espansione in altezza se necessario
              padding: '2px' // Piccolo padding aggiuntivo
            };
          }
          
          return (
            <div 
              key={appointment.id}
              className={`absolute rounded shadow-md overflow-hidden ${isExpanded ? 'z-50' : 'z-10'}`}
              style={{
                ...styles,
                ...expandedStyles,
                border: `1px solid ${appointment.service?.color || '#4299e1'}`,
                borderLeft: `12px solid ${appointment.service?.color || '#4299e1'}`,
                boxShadow: `0 2px 10px rgba(0,0,0,0.08), 0 0 0 1px ${appointment.service?.color || '#4299e1'}60`,
                transition: 'width 0.2s ease-in-out, left 0.2s ease-in-out',
                backgroundColor: isExpanded ? '#ffffff' : '#ffffff'
              }}
              // Su desktop usiamo hover (mouse enter/leave)
              onMouseEnter={() => {
                // Solo su desktop (non mobile)
                if (!isMobile) {
                  setExpandedAppointment(appointment.id);
                }
              }}
              onMouseLeave={() => {
                // Solo su desktop (non mobile)
                if (!isMobile) {
                  setExpandedAppointment(null);
                }
              }}
              // Su mobile usiamo il tocco (touch)
              onTouchStart={(e) => {
                // Su mobile, al tocco espandiamo l'appuntamento
                if (isMobile) {
                  // Previeni altri eventi (come click)
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Cancella un eventuale timer esistente
                  if (autoCloseTimerRef.current) {
                    clearTimeout(autoCloseTimerRef.current);
                    autoCloseTimerRef.current = null;
                  }
                  
                  // Se stiamo cliccando lo stesso appuntamento già espanso, lo chiudiamo
                  if (expandedAppointment === appointment.id) {
                    console.log("Mobile: Chiusura appuntamento al secondo tocco, ID:", appointment.id);
                    setExpandedAppointment(null);
                  } else {
                    // Altrimenti espandiamo questo appuntamento
                    console.log("Mobile: Appuntamento espanso al primo tocco, ID:", appointment.id);
                    
                    // Aggiunge un indicatore visivo all'appuntamento espanso
                    // per suggerire all'utente di toccare nuovamente per chiudere
                    setExpandedAppointment(appointment.id);
                  }
                }
              }}
            >
              <div 
                className="p-1 sm:p-2 h-full flex flex-col justify-between relative"
                style={{
                  backgroundColor: isExpanded 
                    ? '#ffffff' // Sfondo completamente bianco quando espanso
                    : `${appointment.service?.color || '#4299e1'}10`, // Sfondo trasparente quando normale
                }}
              >
                {/* Pulsante di chiusura X visibile solo quando l'appuntamento è espanso */}
                {isExpanded && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Previene la propagazione dell'evento
                      setExpandedAppointment(null);
                    }}
                    className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full"
                    title="Chiudi"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
                
                <div className="font-semibold text-xs sm:text-sm truncate text-gray-800 flex items-center">
                  {appointment.client?.firstName} {appointment.client?.lastName}
                  {/* Aggiunge un indicatore di tocco quando l'appuntamento è espanso su mobile */}
                  {isExpanded && isMobile && (
                    <span className="ml-1 text-[9px] text-gray-500 bg-gray-100 px-1 rounded-full">
                      Tocca per chiudere
                    </span>
                  )}
                </div>
                
                <div className={`flex ${isExpanded ? 'flex-row' : 'flex-col sm:flex-row'} justify-between items-start ${isExpanded ? 'items-center' : 'sm:items-center'}`}>
                  <div className="text-[10px] sm:text-xs font-medium flex flex-col" style={{ color: appointment.service?.color || '#4299e1' }}>
                    <span>{appointment.startTime.substring(0, 5)} - {appointment.endTime.substring(0, 5)}</span>
                    <span className={`text-gray-600 ${isExpanded ? '' : 'truncate'}`}>{appointment.service?.name}</span>
                    
                    {/* Mostra le note solo quando l'appuntamento è espanso */}
                    {isExpanded && appointment.notes && (
                      <span className="text-gray-500 text-[9px] sm:text-xs mt-1 block max-w-xs">
                        {appointment.notes}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-1 mt-1 sm:mt-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                      onClick={() => editAppointment(appointment)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-red-500"
                      onClick={() => deleteAppointment(appointment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal per la creazione/modifica degli appuntamenti */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={handleModalClose}
        onSave={handleAppointmentSaved}
        defaultDate={selectedDate}
        defaultTime={selectedSlots[0] || "08:00"}
        appointment={selectedAppointment}
        selectedSlots={selectedSlots}
      />

      {/* Pulsanti flottanti per la gestione della selezione */}
      {isSelectionMode ? (
        <>
          {/* Pulsante Conferma (in basso a destra) */}
          <FloatingActionButton 
            onClick={completeSelection} 
            text={t('calendar.confirmAndAssociateClient')}
            position="bottom-right"
          />
          
          {/* Pulsante Annulla (in basso a sinistra) */}
          <FloatingActionButton
            onClick={cancelSelection}
            text={t('common.cancel')}
            variant="secondary"
            position="bottom-left"
          />
        </>
      ) : (
        <FloatingActionButton 
          onClick={startSelectionMode} 
          text={t('calendar.selectTimeNewAppointment')}
          position="bottom-right"
        />
      )}
    </Card>
  );
}