import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Trash2, Edit, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AppointmentModal from "./AppointmentModal";
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

  // Calcola l'appuntamento che include questo slot
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
    const top = totalStartMinutes / 15 * 40; // 40px per ogni slot da 15 minuti
    const height = durationMinutes / 15 * 40;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor: appointment.service?.color || '#4299e1',
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
      {/* Controlli per la selezione degli slot */}
      <div className="mb-4 flex flex-wrap gap-2">
        {!isSelectionMode ? (
          <Button onClick={startSelectionMode}>{t("appointment.selectTimeSlots")}</Button>
        ) : (
          <>
            <Button onClick={completeSelection}>{t("appointment.confirmAndAssociateClient")}</Button>
            <Button variant="outline" onClick={cancelSelection}>{t("common.cancel")}</Button>
            <div className="ml-auto text-sm text-gray-500">
              {selectedSlots.length > 0 ? (
                <span>
                  {t("appointment.selected")}: {selectedSlots[0]} - 
                  {calculateEndTime(selectedSlots[selectedSlots.length - 1], 15)}
                </span>
              ) : (
                <span>{t("appointment.selectSlots")}</span>
              )}
            </div>
          </>
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
          
          return (
            <div 
              key={appointment.id}
              className="absolute left-20 right-4 rounded shadow-md overflow-hidden z-10"
              style={{
                ...styles,
                borderLeft: `8px solid ${appointment.service?.color || '#4299e1'}`,
                boxShadow: `0 2px 10px rgba(0,0,0,0.1), 0 0 0 1px ${appointment.service?.color || '#4299e1'}30`
              }}
            >
              <div 
                className="p-2 h-full flex flex-col justify-between"
                style={{
                  backgroundColor: `${appointment.service?.color || '#4299e1'}20`,
                }}
              >
                <div className="font-semibold text-sm truncate text-gray-800">
                  {appointment.client?.firstName} {appointment.client?.lastName}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-xs font-medium" style={{ color: appointment.service?.color || '#4299e1' }}>
                    {appointment.startTime.substring(0, 5)} - {appointment.endTime.substring(0, 5)}
                    <span className="ml-2">{appointment.service?.name}</span>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => editAppointment(appointment)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-red-500"
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
    </Card>
  );
}