import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import AppointmentForm from "./AppointmentForm";
import SaveDirectButton from "./SaveDirectButton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppointmentWithDetails } from "@/types/api";
import { parseTime, addMinutes, formatTime, formatDateForApi } from "@/lib/utils/date";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  defaultDate: Date;
  defaultTime: string;
  appointmentId?: number | null;
  selectedSlots?: string[];
}

// Usiamo la funzione formatDateForApi importata da utils/date.ts

export default function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  defaultDate,
  defaultTime,
  appointmentId,
  selectedSlots = []
}: AppointmentModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [calculatedEndTime, setCalculatedEndTime] = useState<string | null>(null);
  
  // Callback per gestire il salvataggio appuntamento
  const handleAppointmentSaved = () => {
    console.log("AppointmentModal: Appointment saved - updating view...");
    
    // Forza invalidazione e refetch immediato
    queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    
    const dateString = formatDateForApi(defaultDate);
    queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${dateString}`] });
    
    // Chiama callback parent se fornito
    if (onSave) {
      onSave();
    }
    
    // Chiudi modal
    onClose();
    
    toast({
      title: t('common.success'),
      description: t('appointmentForm.toast.savedAndCalendarUpdated'),
      duration: 3500,
    });
  };
  
  // Calcola l'ora di fine in base agli slot selezionati
  useEffect(() => {
    if (selectedSlots && selectedSlots.length > 1) {
      // Ordina gli slot selezionati
      const sortedSlots = [...selectedSlots].sort((a, b) => {
        return parseTime(a).getTime() - parseTime(b).getTime();
      });
      
      // Prendi l'ultimo slot e calcola l'orario di fine (15 minuti dopo)
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      const lastTime = parseTime(lastSlot);
      const endTime = formatTime(addMinutes(lastTime, 15));
      setCalculatedEndTime(endTime);
      
      console.log("Selected slots:", sortedSlots);
      console.log("Calculated end time:", endTime);
    } else {
      setCalculatedEndTime(null);
    }
  }, [selectedSlots]);
  
  useEffect(() => {
    // For debugging
    console.log("AppointmentModal - isOpen:", isOpen);
    console.log("AppointmentModal - defaultTime:", defaultTime);
    console.log("AppointmentModal - selectedSlots:", selectedSlots);
  }, [isOpen, defaultTime, selectedSlots]);

  // Quando il componente viene montato, facciamo una richiesta per ottenere tutti i servizi
  // questo ci serve per calcolare correttamente l'endTime in base alla durata del servizio
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await apiRequest("GET", "/api/services");
        const services = await response.json();
        // Salviamo i servizi in una variabile globale per poterli usare in SaveDirectButton
        // @ts-ignore
        window.allServices = services;
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    if (isOpen) {
      fetchServices();
    }
  }, [isOpen]);
  
  // Funzione per gestire il salvataggio diretto
  const handleSaveSuccess = () => {
    console.log("Appointment saved successfully!");
    // Invalidare tutte le query relative agli appuntamenti
    queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    
    // Notificare il genitore del salvataggio
    if (onSave) onSave();
    
    // Chiudere il modale
    onClose();
  };
  
  // Guard: ignora il click sul backdrop se arriva entro 300 ms dall'apertura.
  // useLayoutEffect (non useEffect) garantisce che il ref sia settato PRIMA
  // che il browser possa processare il click sintetico Android post-touch.
  const openedAtRef = useRef<number>(0);
  useLayoutEffect(() => {
    if (isOpen) openedAtRef.current = Date.now();
  }, [isOpen]);

  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center pt-3 sm:pt-0 z-[100]"
      onClick={() => { if (Date.now() - openedAtRef.current > 300) onClose(); }}
    >
      <div 
        className="relative bg-white rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <AppointmentForm 
          onClose={onClose}
          onAppointmentSaved={handleAppointmentSaved}
          defaultDate={defaultDate}
          defaultTime={defaultTime}
          appointmentId={appointmentId ?? undefined}
          selectedSlots={selectedSlots}
        />
        
        {/* Aggiungiamo il pulsante di salvataggio diretto */}
        <SaveDirectButton onSaveSuccess={handleSaveSuccess} />
      </div>
    </div>
  );
}