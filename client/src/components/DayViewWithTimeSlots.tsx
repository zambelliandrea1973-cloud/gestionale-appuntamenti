import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatTime, parseTime, addMinutes } from '@/lib/utils/date';
import AppointmentModal from './AppointmentModal';
import { toast } from '@/hooks/use-toast';
import type { AppointmentWithDetails, Service } from '@/types/api';

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
  const { t, i18n } = useTranslation();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);

  // Generazione degli orari dalle 8:00 alle 22:45 con incrementi di 15 minuti
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    const startHour = 8;
    const endHour = 23;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // Solo aggiungi l'ultimo slot delle 22:45, non le 23:00
        if (hour === 22 && minute > 45) continue;
        
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Reset della selezione quando cambia la data o la modalità di selezione
  useEffect(() => {
    setSelectedSlots([]);
    setSelectedService(null);
  }, [selectedDate, isSelectionMode]);

  // Controlla se uno slot orario è occupato da un appuntamento
  const isSlotOccupied = (slot: string): boolean => {
    const formattedSlot = `${slot}:00`;
    return !!appointments.find(a => {
      const startTime = a.startTime;
      const endTime = a.endTime;
      return startTime <= formattedSlot && endTime > formattedSlot;
    });
  };

  // Controlla se uno slot è valido per la selezione
  const isValidForSelection = (slot: string): boolean => {
    // Se lo slot è occupato, non è valido per la selezione
    if (isSlotOccupied(slot)) return false;
    
    // Altrimenti è valido
    return true;
  };

  // Gestisce la selezione e deselezione degli slot
  const handleSlotSelection = (slot: string) => {
    if (!isSelectionMode || !isValidForSelection(slot)) return;
    
    // Toggle selezione dello slot
    if (selectedSlots.includes(slot)) {
      // Verifica se questo slot è nel mezzo di un intervallo selezionato
      const isMidSelection = selectedSlots.some((selectedSlot, idx) => {
        // Trova il primo e l'ultimo slot della selezione
        const slotTime = parseTime(slot);
        const currentTime = parseTime(selectedSlot);
        
        // Se questo non è il primo o l'ultimo slot, controlla se è "nel mezzo"
        if (idx > 0 && idx < selectedSlots.length - 1) {
          const prevTime = parseTime(selectedSlots[idx - 1]);
          const nextTime = parseTime(selectedSlots[idx + 1]);
          
          return slotTime > prevTime && slotTime < nextTime;
        }
        
        return false;
      });
      
      // Se è nel mezzo, non permettere la deselezione
      if (isMidSelection) {
        toast({
          title: t('calendar.cannotDeselectMiddleSlot'),
          description: t('calendar.pleaseSelectConsecutiveSlots'),
          variant: "destructive"
        });
        return;
      }
      
      // Altrimenti, rimuovi lo slot dalla selezione
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      // Se è il primo slot o è adiacente all'ultimo slot selezionato, aggiungi alla selezione
      if (selectedSlots.length === 0) {
        setSelectedSlots([slot]);
      } else {
        // Ordina gli slot selezionati
        const sortedSlots = [...selectedSlots].sort((a, b) => {
          return parseTime(a).getTime() - parseTime(b).getTime();
        });
        
        const firstSlot = sortedSlots[0];
        const lastSlot = sortedSlots[sortedSlots.length - 1];
        
        // Calcola i tempi
        const firstTime = parseTime(firstSlot);
        const lastTime = parseTime(lastSlot);
        const currentTime = parseTime(slot);
        
        // 15 minuti in millisecondi
        const fifteenMinutes = 15 * 60 * 1000;
        
        // Verifica se lo slot è adiacente all'inizio o alla fine della selezione
        if (currentTime.getTime() === lastTime.getTime() + fifteenMinutes) {
          // Adiacente alla fine
          setSelectedSlots([...sortedSlots, slot]);
        } else if (currentTime.getTime() === firstTime.getTime() - fifteenMinutes) {
          // Adiacente all'inizio
          setSelectedSlots([slot, ...sortedSlots]);
        } else {
          // Non adiacente
          toast({
            title: t('calendar.nonAdjacentSlot'),
            description: t('calendar.pleaseSelectConsecutiveSlots'),
            variant: "destructive"
          });
        }
      }
    }
  };

  // Toggle della modalità di selezione
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedSlots([]);
    setSelectedService(null);
  };

  // Verifica se ci sono slot selezionati
  const hasSelectedSlots = () => {
    return selectedSlots.length > 0;
  };

  // Apre il modal per creare un nuovo appuntamento
  const handleCreateAppointment = () => {
    if (!hasSelectedSlots()) return;
    
    // Ordina gli slot selezionati
    const sortedSlots = [...selectedSlots].sort((a, b) => {
      return parseTime(a).getTime() - parseTime(b).getTime();
    });
    
    // Prendi il primo slot come orario di inizio
    const startSlot = sortedSlots[0];
    setSelectedTimeSlot(startSlot);
    setIsAppointmentFormOpen(true);
  };

  // Calcola l'orario di fine in base all'orario di inizio e alla durata in minuti
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const start = parseTime(startTime);
    const end = addMinutes(start, durationMinutes);
    return formatTime(end);
  };

  // Gestisce la chiusura del form degli appuntamenti
  const handleFormClosed = () => {
    setIsAppointmentFormOpen(false);
    setSelectedAppointment(null);
    setSelectedTimeSlot(null);
    setIsSelectionMode(false);
    setSelectedSlots([]);
    setSelectedService(null);
  };

  // Gestisce l'aggiornamento di un appuntamento
  const handleAppointmentUpdated = () => {
    onAppointmentUpdated();
    handleFormClosed();
  };

  // Elimina un appuntamento
  const deleteAppointment = (id: number) => {
    onAppointmentDeleted(id);
  };

  // Trova l'appuntamento che occupa uno slot
  const findAppointmentAtSlot = (slot: string) => {
    const formattedSlot = `${slot}:00`;
    return appointments.find(a => a.startTime <= formattedSlot && a.endTime > formattedSlot);
  };

  // Controlla se uno slot è l'inizio di un appuntamento
  const isStartOfAppointment = (slot: string) => {
    const formattedSlot = `${slot}:00`;
    return appointments.some(a => a.startTime === formattedSlot);
  };

  // Calcola l'altezza e la posizione di un appuntamento
  const calculateAppointmentPosition = (appointment: AppointmentWithDetails) => {
    // Estrai ora e minuti
    const startParts = appointment.startTime.split(':');
    const startHour = parseInt(startParts[0]);
    const startMinute = parseInt(startParts[1]);
    
    // Calcola la durata in minuti
    const endParts = appointment.endTime.split(':');
    const endHour = parseInt(endParts[0]);
    const endMinute = parseInt(endParts[1]);
    
    const durationHours = endHour - startHour;
    const durationMinutes = endMinute - startMinute;
    const totalMinutes = durationHours * 60 + durationMinutes;
    
    // Calcola l'altezza (ogni slot è 44px)
    const slotCount = totalMinutes / 15;
    const height = slotCount * 44;
    
    // Calcola la posizione dall'inizio del calendario
    const calendarStartHour = 8; // Il calendario inizia alle 8:00
    const hourOffset = startHour - calendarStartHour;
    const slotOffset = (hourOffset * 4) + (startMinute / 15);
    const top = slotOffset * 44;
    
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
      
      {/* Time slots display */}
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
                    {(() => {
                      // Ordina gli slot
                      const sortedSlots = [...selectedSlots].sort((a, b) => {
                        return parseTime(a).getTime() - parseTime(b).getTime();
                      });
                      
                      // Mostra orario inizio e fine
                      if (sortedSlots.length > 0) {
                        const startTime = sortedSlots[0];
                        const endSlot = sortedSlots[sortedSlots.length - 1];
                        const endTime = calculateEndTime(endSlot, 15);
                        
                        return (
                          <span className="ml-2 text-sm bg-gray-200 px-2 py-1 rounded">
                            {startTime} - {endTime}
                          </span>
                        );
                      }
                      
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            )}
            
            {/* Appointments overlay */}
            <div className="relative">
              {appointments.map((appointment) => {
                const { height, top } = calculateAppointmentPosition(appointment);
                
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
                          className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 w-6 h-6 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(t('calendar.confirmDelete'))) {
                              deleteAppointment(appointment.id);
                            }
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            
            {/* Time slots */}
            <div className="divide-y divide-gray-200">
              {timeSlots.map((timeSlot) => {
                const isSelected = selectedSlots.includes(timeSlot);
                const isOccupied = isSlotOccupied(timeSlot);
                const isFirstSlot = timeSlot.endsWith(":00") || timeSlot.endsWith(":30");
                const occupyingAppointment = findAppointmentAtSlot(timeSlot);
                
                return (
                  <div 
                    key={timeSlot}
                    className={cn(
                      "flex border-b border-gray-300 last:border-b-0",
                      isFirstSlot && "border-t-2 border-gray-300" // Bordo più spesso per gli slot delle mezz'ore
                    )}
                  >
                    <div 
                      className={cn(
                        "w-24 py-3 px-3 font-medium border-r border-gray-300 flex items-center justify-center",
                        isFirstSlot && "font-bold" // Testo in grassetto per gli slot delle mezz'ore
                      )}
                    >
                      {timeSlot}
                    </div>
                    <div 
                      className={cn(
                        "flex-grow min-h-[44px] py-2 px-3 relative",
                        isSelectionMode && !isOccupied && "cursor-pointer hover:bg-gray-50",
                        isSelected && "bg-gray-200", // Selezionato (temporaneamente grigio)
                        isOccupied && "bg-gray-50" // Occupato
                      )}
                      onClick={() => handleSlotSelection(timeSlot)}
                      style={isOccupied ? { opacity: 0 } : {}} // Nascondi gli slot occupati
                    >
                      {isStartOfAppointment(timeSlot) && (
                        <div className="absolute left-0 top-0 w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
        selectedSlots={selectedSlots}
      />
    </div>
  );
}