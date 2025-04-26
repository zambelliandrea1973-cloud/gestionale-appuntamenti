import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { generateHourlyGroupedTimeSlots, formatDateForApi } from "@/lib/utils/date";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import AppointmentCard from "./AppointmentCard";
import AppointmentModal from "./AppointmentModal";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AppointmentWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest } from "@/lib/queryClient";

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
  const { toast } = useToast();
  
  const [groupedTimeSlots] = useState(() => generateHourlyGroupedTimeSlots(8, 22, 15));
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  
  // Stato per tenere traccia degli slot selezionati
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlots>({});
  
  // Stato per tenere traccia se è in modalità selezione
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Stato per tenere traccia del servizio selezionato (utile per il colore)
  const [selectedService, setSelectedService] = useState<any>(null);
  
  // Stati per la gestione della conferma di eliminazione
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<number | null>(null);
  
  // Rileva se siamo su dispositivo mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Formato data per l'API
  const formattedDate = formatDateForApi(selectedDate);
  
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
  
  // Fetch appointments for the selected date
  const { data: appointments = [], isLoading, refetch } = useQuery<AppointmentWithDetails[]>({
    queryKey: [`/api/appointments/date/${formattedDate}`],
    queryFn: getQueryFn({ on401: 'returnNull' })
  });
  
  // Mutation for deleting appointments
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/appointments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('calendar.appointmentDeleted'),
        description: t('calendar.appointmentDeletedSuccess'),
      });
      refetch();
      if (onRefresh) onRefresh();
    },
    onError: (error: any) => {
      toast({
        title: t('calendar.error'),
        description: error.message || t('calendar.appointmentDeleteError'),
        variant: 'destructive',
      });
    },
  });
  
  // Richiedi conferma per eliminare un appuntamento
  const confirmDeleteAppointment = (id: number) => {
    setAppointmentToDelete(id);
    setShowDeleteConfirm(true);
  };
  
  // Elimina un appuntamento dopo la conferma
  const deleteAppointment = (id: number) => {
    deleteAppointmentMutation.mutate(id);
  };
  
  // Refreshes appointments data
  const handleAppointmentUpdated = () => {
    refetch();
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // Initialization of selected slots state
  useEffect(() => {
    const initialSelectedSlots: SelectedSlots = {};
    
    for (const hourGroup of groupedTimeSlots) {
      initialSelectedSlots[hourGroup.hour] = {
        hourSelected: false,
        miniSlots: {}
      };
      
      for (const slot of hourGroup.slots) {
        initialSelectedSlots[hourGroup.hour].miniSlots[slot] = false;
      }
    }
    
    setSelectedSlots(initialSelectedSlots);
  }, [groupedTimeSlots]);
  
  // Toggle selection mode
  const toggleSelectionMode = () => {
    const newMode = !isSelectionMode;
    setIsSelectionMode(newMode);
    
    // Se stiamo uscendo dalla modalità selezione, resettiamo gli slot
    if (!newMode) {
      resetAllSlots();
    }
  };
  
  // Reset all slots to unselected
  const resetAllSlots = () => {
    const resetSlots: SelectedSlots = {};
    for (const hourGroup of groupedTimeSlots) {
      resetSlots[hourGroup.hour] = {
        hourSelected: false,
        miniSlots: {}
      };
      
      for (const slot of hourGroup.slots) {
        resetSlots[hourGroup.hour].miniSlots[slot] = false;
      }
    }
    
    setSelectedSlots(resetSlots);
    setSelectedTimeSlot(null);
    setSelectedService(null);
  };
  
  // Check if a time slot is occupied by an appointment
  const isSlotOccupied = (slot: string): boolean => {
    // Formato completo dello slot (HH:MM:00)
    const slotTime = new Date(`2000-01-01T${slot}`);
    const formattedSlot = `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}:00`;
    
    return appointments.some(appointment => {
      // Verifico se l'appuntamento inizia a questo orario esatto
      if (appointment.startTime === formattedSlot) return true;
      
      // Verifico se l'orario cade all'interno dell'appuntamento
      return appointment.startTime < formattedSlot && appointment.endTime > formattedSlot;
    });
  };
  
  // Handle hour selection/deselection
  const handleHourSelection = (hour: string) => {
    if (!isSelectionMode) return;
    
    // Ottieni lo stato corrente
    const hourData = selectedSlots[hour];
    // Inverti la selezione dell'ora
    const isSelected = !hourData.hourSelected;
    
    // Aggiorna lo stato di tutti i mini-slot di quest'ora, ma solo per quelli non occupati
    const updatedMiniSlots: { [slot: string]: boolean } = {};
    
    for (const slot in hourData.miniSlots) {
      // Seleziona solo se non è occupato
      if (!isSlotOccupied(slot)) {
        updatedMiniSlots[slot] = isSelected;
      } else {
        updatedMiniSlots[slot] = false;  // Non selezionare slot occupati
      }
    }
    
    // Aggiorna lo stato
    setSelectedSlots({
      ...selectedSlots,
      [hour]: {
        hourSelected: isSelected,
        miniSlots: updatedMiniSlots
      }
    });
    
    // Se l'ora è stata selezionata, usa il primo slot come orario di inizio
    if (isSelected) {
      const firstAvailableSlot = Object.keys(updatedMiniSlots).find(slot => updatedMiniSlots[slot]);
      if (firstAvailableSlot) {
        setSelectedTimeSlot(firstAvailableSlot);
      }
    }
  };
  
  // Handle mini-slot selection/deselection
  const handleMiniSlotSelection = (hour: string, slot: string) => {
    if (!isSelectionMode) return;
    
    // Se lo slot è occupato, non selezionarlo
    if (isSlotOccupied(slot)) return;
    
    // Aggiorna lo stato del mini-slot
    const updatedSlots = { ...selectedSlots };
    updatedSlots[hour].miniSlots[slot] = !updatedSlots[hour].miniSlots[slot];
    
    // Verifica se tutti i mini-slot sono selezionati per aggiornare anche lo stato dell'ora
    const allSlotsSelected = Object.values(updatedSlots[hour].miniSlots).every(s => s);
    updatedSlots[hour].hourSelected = allSlotsSelected;
    
    setSelectedSlots(updatedSlots);
    
    // Se è il primo slot selezionato, usalo come orario di inizio
    if (updatedSlots[hour].miniSlots[slot] && !selectedTimeSlot) {
      setSelectedTimeSlot(slot);
    }
  };
  
  // Check if any slots are selected
  const hasSelectedSlots = (): boolean => {
    for (const hour in selectedSlots) {
      if (selectedSlots[hour].hourSelected) return true;
      
      for (const slot in selectedSlots[hour].miniSlots) {
        if (selectedSlots[hour].miniSlots[slot]) return true;
      }
    }
    return false;
  };
  
  // Find all selected slots and group consecutive ones
  const getGroupedSelectedSlots = () => {
    // Step 1: Collect all selected slots
    const allSelectedSlots: string[] = [];
    
    for (const hour in selectedSlots) {
      // If entire hour is selected, add all its mini-slots
      if (selectedSlots[hour].hourSelected) {
        const hourSlots = groupedTimeSlots.find(g => g.hour === hour)?.slots || [];
        allSelectedSlots.push(...hourSlots.filter(slot => !isSlotOccupied(slot)));
      } else {
        // Otherwise add only individually selected mini-slots
        for (const slot in selectedSlots[hour].miniSlots) {
          if (selectedSlots[hour].miniSlots[slot]) {
            allSelectedSlots.push(slot);
          }
        }
      }
    }
    
    // Sort slots chronologically
    allSelectedSlots.sort();
    
    // No slots selected, return empty array
    if (allSelectedSlots.length === 0) return [];
    
    // Step 2: Group consecutive slots
    const groups: {
      startSlot: string;
      endSlot: string;
      slots: string[];
    }[] = [];
    
    let currentGroup: string[] = [allSelectedSlots[0]];
    
    for (let i = 1; i < allSelectedSlots.length; i++) {
      const prevTime = new Date(`2000-01-01T${allSelectedSlots[i-1]}`);
      const currTime = new Date(`2000-01-01T${allSelectedSlots[i]}`);
      
      // Check if slots are consecutive (15 minutes apart)
      const diffMs = currTime.getTime() - prevTime.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      
      if (diffMinutes === 15) {
        // Add to current group
        currentGroup.push(allSelectedSlots[i]);
      } else {
        // Create a new group
        groups.push({
          startSlot: currentGroup[0],
          endSlot: currentGroup[currentGroup.length - 1],
          slots: [...currentGroup]
        });
        currentGroup = [allSelectedSlots[i]];
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      groups.push({
        startSlot: currentGroup[0],
        endSlot: currentGroup[currentGroup.length - 1],
        slots: [...currentGroup]
      });
    }
    
    return groups;
  };
  
  // Open appointment form
  const handleCreateAppointment = () => {
    const groups = getGroupedSelectedSlots();
    if (groups.length > 0) {
      setSelectedTimeSlot(groups[0].startSlot);
      setIsAppointmentFormOpen(true);
    }
  };
  
  // Handle modal close
  const handleFormClosed = () => {
    setIsAppointmentFormOpen(false);
    resetAllSlots();
    handleAppointmentUpdated();
  };
  
  // Calculate end time based on start time and duration
  const calculateEndTime = (timeSlot: string, durationMinutes: number) => {
    const time = new Date(`2000-01-01T${timeSlot}`);
    time.setMinutes(time.getMinutes() + durationMinutes);
    return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
  };
  
  // Find all appointments starting at a specific time slot
  const findAppointmentsAtSlot = (slot: string) => {
    const formattedSlot = `${slot.split(':')[0].padStart(2, '0')}:${slot.split(':')[1].padStart(2, '0')}:00`;
    return appointments.filter(a => a.startTime === formattedSlot);
  };
  
  // Find appointment that spans across a time slot (including start slot)
  const findAppointmentSpanningSlot = (slot: string) => {
    const formattedSlot = `${slot.split(':')[0].padStart(2, '0')}:${slot.split(':')[1].padStart(2, '0')}:00`;
    return appointments.find(a => a.startTime <= formattedSlot && a.endTime > formattedSlot);
  };
  
  // Calculate the total height needed for an appointment based on its duration
  const calculateAppointmentHeightAndPosition = (appointment: AppointmentWithDetails) => {
    // Extract start hour and minute
    const startParts = appointment.startTime.split(':');
    const startHour = parseInt(startParts[0]);
    const startMinute = parseInt(startParts[1]);
    
    // Extract end hour and minute
    const endParts = appointment.endTime.split(':');
    const endHour = parseInt(endParts[0]);
    const endMinute = parseInt(endParts[1]);
    
    // Calculate height in pixels (1 hour = 48px, 15 min = 12px)
    const durationHours = endHour - startHour;
    const durationMinutes = endMinute - startMinute;
    const totalMinutes = durationHours * 60 + durationMinutes;
    const height = totalMinutes / 15 * 12; // Convert to slots and then to pixels
    
    // Ottiene il numero di ore tra l'inizio del calendario e l'orario dell'appuntamento
    // Il calendario inizia alle 8:00, quindi se un appuntamento è alle 13:15,
    // deve essere posizionato 5 ore e 15 minuti dopo l'inizio
    const calendarStartHour = parseInt(groupedTimeSlots[0].hour);
    const hourOffset = startHour - calendarStartHour;
    
    // Calcola la posizione in pixel considerando sia le ore che i minuti
    const totalOffsetMinutes = (hourOffset * 60) + startMinute;
    const top = (totalOffsetMinutes / 15) * 12; // Ogni 15 minuti sono 12px
    
    console.log(`Appuntamento: ${appointment.client?.lastName}, Orario: ${startHour}:${startMinute}, Top: ${top}px`);
    
    return { height, top };
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Header with date */}
      <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {selectedDate.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
      </div>
      
      {/* Selection mode controls */}
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
        
        {/* Confirm button - only visible when in selection mode and slots are selected */}
        {isSelectionMode && hasSelectedSlots() && (
          <Button 
            onClick={handleCreateAppointment}
            className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg"
          >
            {t('calendar.confirmAndAssociateClient')}
          </Button>
        )}
      </div>
      
      {/* Time slots table */}
      <div className="p-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="mb-4">
              <Skeleton className="h-20 w-full" />
            </div>
          ))
        ) : (
          <div className="border border-gray-300 rounded overflow-hidden">
            {/* Info blocco selezionato */}
            {isSelectionMode && hasSelectedSlots() && (
              <div className="p-3 bg-gray-100 border-b border-gray-300">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-700">{t('calendar.selectedSlots')}:</span>
                    {getGroupedSelectedSlots().map((group, idx) => {
                      const endTime = calculateEndTime(group.endSlot, 15);
                      return (
                        <span key={idx} className="ml-2 text-sm bg-gray-200 px-2 py-1 rounded">
                          {group.startSlot} - {endTime}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {/* Visualizza gli appuntamenti esistenti */}
            <div className="relative">
              {appointments.map((appointment, index) => {
                const { height, top } = calculateAppointmentHeightAndPosition(appointment);
                
                return (
                  <div 
                    key={`appointment-${appointment.id}`}
                    className="absolute left-24 right-0 z-20 rounded-sm shadow-md px-3 py-1 cursor-pointer hover:brightness-95 group"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: appointment.service?.color ? `${appointment.service.color}25` : '#f3f3f3',
                      borderLeft: `4px solid ${appointment.service?.color || '#9ca3af'}`,
                      borderBottom: `1px solid ${appointment.service?.color || '#9ca3af'}`,
                      borderRight: `1px solid ${appointment.service?.color || '#9ca3af'}`,
                      borderTop: `1px solid ${appointment.service?.color || '#9ca3af'}`,
                    }}
                    onClick={() => {
                      // Apri il form di modifica per questo appuntamento
                      setSelectedTimeSlot(appointment.startTime.substr(0, 5));
                      setSelectedAppointment(appointment);
                      setIsAppointmentFormOpen(true);
                    }}
                  >
                    <div className="h-full flex flex-col justify-center">
                      <div className="font-medium text-sm">
                        {appointment.client?.firstName} {appointment.client?.lastName}
                      </div>
                      <div className="text-xs">
                        {appointment.service?.name || ''} - {appointment.startTime.substr(0, 5)} - {appointment.endTime.substr(0, 5)}
                      </div>
                      
                      {/* Pulsanti di modifica e cancellazione */}
                      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button 
                          className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600 w-6 h-6 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTimeSlot(appointment.startTime.substr(0, 5));
                            setSelectedAppointment(appointment);
                            setIsAppointmentFormOpen(true);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button 
                          className={`bg-red-500 text-white p-1 rounded-full hover:bg-red-600 ${isMobile ? 'w-9 h-9' : 'w-6 h-6'} flex items-center justify-center`}
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteAppointment(appointment.id);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "18" : "14"} height={isMobile ? "18" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Hours and mini-slots */}
            {groupedTimeSlots.map((hourGroup) => (
              <div 
                key={hourGroup.hour}
                className="flex border-b border-gray-300 last:border-b-0"
              >
                {/* Hour column */}
                <div 
                  className="w-24 p-3 font-bold text-gray-700 border-r border-gray-300 flex items-center justify-center cursor-pointer"
                  onClick={() => handleHourSelection(hourGroup.hour)}
                >
                  {hourGroup.hour}:00
                </div>
                
                {/* Mini-slots column */}
                <div className="flex-grow">
                  <div className="divide-y divide-gray-200">
                    {hourGroup.slots.map((timeSlot) => {
                      const isSlotSelected = selectedSlots[hourGroup.hour]?.miniSlots[timeSlot] || false;
                      const isOccupied = isSlotOccupied(timeSlot);
                      
                      // Verifica se questo slot fa parte di un gruppo selezionato
                      const isPartOfSelectedGroup = getGroupedSelectedSlots().some(group => {
                        // Verifica se questo slot è all'interno del range di un gruppo
                        const slotTime = new Date(`2000-01-01T${timeSlot}`);
                        const startTime = new Date(`2000-01-01T${group.startSlot}`);
                        const endTime = new Date(`2000-01-01T${group.endSlot}`);
                        endTime.setMinutes(endTime.getMinutes() + 15); // Include l'ultimo slot
                        
                        return slotTime >= startTime && slotTime < endTime;
                      });
                      
                      // Trova l'appuntamento che occupa questo slot (se esiste)
                      const slotFormattedTime = `${timeSlot.substring(0, 2)}:${timeSlot.substring(3, 5)}:00`;
                      const occupyingAppointment = findAppointmentSpanningSlot(timeSlot);
                      
                      // Determina se questo è il primo slot di un appuntamento
                      const isFirstSlotOfAppointment = occupyingAppointment && 
                        occupyingAppointment.startTime.startsWith(timeSlot.substring(0, 5));
                      
                      // Style condizionale per gli slot occupati
                      let slotStyle = {};
                      let slotClassName = "";
                      
                      if (occupyingAppointment) {
                        // Per gli slot occupati da appuntamenti, nascondiamo completamente tutti gli slot
                        // per non mostrare nulla sotto gli appuntamenti
                        slotStyle = { display: 'none' }; // Nasconde completamente tutti gli slot occupati
                      }
                      
                      return (
                        <div 
                          key={timeSlot}
                          className={cn(
                            "min-h-12 px-3 py-2 flex items-center relative",
                            isSelectionMode && !isOccupied && "cursor-pointer hover:bg-gray-50",
                            (isSelectionMode && isSlotSelected) || isPartOfSelectedGroup ? "bg-gray-200" : "",
                            occupyingAppointment ? "bg-gray-50" : "", // Sfondo più chiaro per slot occupati
                            slotClassName
                          )}
                          onClick={() => handleMiniSlotSelection(hourGroup.hour, timeSlot)}
                          style={slotStyle}
                        >
                          {/* Mostra sempre l'ora ma con stile diverso in base allo stato */}
                          <span 
                            className={cn(
                              "text-sm",
                              isSelectionMode && !isOccupied && "text-gray-600", 
                              isSelectionMode && isOccupied && "text-gray-400 line-through",
                              !isSelectionMode && "text-gray-500",
                              occupyingAppointment ? "line-through text-gray-400" : ""
                            )}
                          >
                            {timeSlot}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Appointment creation/editing modal */}
      <AppointmentModal
        isOpen={isAppointmentFormOpen}
        onClose={handleFormClosed}
        onSave={handleAppointmentUpdated}
        defaultDate={selectedDate}
        defaultTime={selectedTimeSlot || "09:00"}
        appointment={selectedAppointment}
      />
      
      {/* Dialog di conferma eliminazione */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-2">{t("appointment.confirmDeleteTitle")}</h3>
            <p className="mb-4">{t("appointment.confirmDelete")}</p>
            <div className="flex justify-end gap-2">
              <button 
                className="px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setAppointmentToDelete(null);
                }}
              >
                {t("common.cancel")}
              </button>
              <button 
                className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  if (appointmentToDelete !== null) {
                    deleteAppointment(appointmentToDelete);
                    setShowDeleteConfirm(false);
                    setAppointmentToDelete(null);
                  }
                }}
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}