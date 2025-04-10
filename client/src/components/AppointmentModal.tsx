import { useEffect, useState } from "react";
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
  appointment?: AppointmentWithDetails | null;
  selectedSlots?: string[];
}

// Usiamo la funzione formatDateForApi importata da utils/date.ts

export default function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  defaultDate,
  defaultTime,
  appointment,
  selectedSlots = []
}: AppointmentModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [calculatedEndTime, setCalculatedEndTime] = useState<string | null>(null);
  
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
      
      console.log("Slots selezionati:", sortedSlots);
      console.log("Ora di fine calcolata:", endTime);
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
        console.error("Errore durante il recupero dei servizi:", error);
      }
    };

    if (isOpen) {
      fetchServices();
    }
  }, [isOpen]);
  
  // Funzione per gestire il salvataggio diretto
  const handleSaveSuccess = () => {
    console.log("Appuntamento salvato con successo!");
    // Invalidare tutte le query relative agli appuntamenti
    queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    
    // Notificare il genitore del salvataggio
    if (onSave) onSave();
    
    // Chiudere il modale
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div 
        className="relative max-h-[90vh] overflow-auto bg-white rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <AppointmentForm 
          onClose={onClose}
          onAppointmentSaved={() => {
            if (onSave) onSave();
            onClose();
          }}
          defaultDate={defaultDate}
          defaultTime={defaultTime}
          appointmentId={appointment?.id}
          clientId={appointment?.clientId}
        />
        
        {/* Aggiungiamo il pulsante di salvataggio diretto */}
        <SaveDirectButton onSaveSuccess={handleSaveSuccess} />
      </div>
    </div>
  );
}