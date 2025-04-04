import { useEffect, useState } from "react";
import AppointmentForm from "./AppointmentForm";
import SaveDirectButton from "./SaveDirectButton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  defaultDate: Date;
  defaultTime: string;
}

// Funzione di utilità per formattare la data per l'API
function formatDateForApi(date: Date): string {
  // Aggiungiamo 12 ore alla data per evitare problemi di fuso orario
  const adjustedDate = new Date(date);
  adjustedDate.setHours(12, 0, 0, 0);
  return adjustedDate.toISOString().split('T')[0];
}

export default function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  defaultDate,
  defaultTime
}: AppointmentModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    // For debugging
    console.log("AppointmentModal - isOpen:", isOpen);
    console.log("AppointmentModal - defaultTime:", defaultTime);
  }, [isOpen, defaultTime]);

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
        />
        
        {/* Aggiungiamo il pulsante di salvataggio diretto */}
        <SaveDirectButton onSaveSuccess={handleSaveSuccess} />
      </div>
    </div>
  );
}