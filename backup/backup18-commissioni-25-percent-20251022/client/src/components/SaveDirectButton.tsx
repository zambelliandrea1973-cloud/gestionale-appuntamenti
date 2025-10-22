import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SaveDirectButtonProps {
  onSaveSuccess?: () => void;
}

// Funzione di utilità per formattare la data per l'API
function formatDateForApi(date: Date): string {
  // Aggiungiamo 12 ore alla data per evitare problemi di fuso orario
  // Questo assicura che quando verrà convertita in UTC non cambi il giorno
  const adjustedDate = new Date(date);
  adjustedDate.setHours(12, 0, 0, 0);
  return adjustedDate.toISOString().split('T')[0];
}

export default function SaveDirectButton({ onSaveSuccess }: SaveDirectButtonProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const saveAppointmentDirectly = async () => {
    console.log("=== [DIRECT-BUTTON] INIZIO SALVATAGGIO DIRETTO APPUNTAMENTO ===");
    setIsSaving(true);
    
    try {
      // Otteniamo i valori dell'ultimo form salvato dalla finestra globale
      // @ts-ignore - Accettiamo la proprietà window.lastFormValues
      const formValues = window.lastFormValues;
      
      if (!formValues) {
        throw new Error("Nessun dato di appuntamento disponibile");
      }
      
      console.log("[DIRECT-BUTTON] Dati del form:", formValues);
      
      const { clientId, serviceId, date, startTime, notes } = formValues;
      
      if (!clientId || !serviceId || !date || !startTime) {
        throw new Error("Dati dell'appuntamento incompleti");
      }
      
      // Calcoliamo la durata del servizio (default a 60 min se non disponibile)
      let serviceDuration = 60;
      
      try {
        // @ts-ignore - Accediamo alla variabile globale services se disponibile
        const service = window.allServices?.find((s: any) => s.id === serviceId);
        if (service && service.duration) {
          serviceDuration = service.duration;
        }
      } catch (e) {
        console.warn("[DIRECT-BUTTON] Impossibile determinare la durata del servizio, uso default:", e);
      }
      
      // Calcoliamo l'ora di fine in base alla durata del servizio
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + serviceDuration;
      
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
      
      // Formattazione della data
      const formattedDate = date instanceof Date 
        ? formatDateForApi(date) 
        : formatDateForApi(new Date(date));
      
      // Preparazione dei dati per l'API
      const appointmentData = {
        clientId,
        serviceId,
        date: formattedDate,
        startTime: startTime + (startTime.includes(':00') ? '' : ':00'),
        endTime,
        notes: notes || "",
        status: "scheduled"
      };
      
      console.log("[DIRECT-BUTTON] Dati formattati per API:", appointmentData);
      
      // Invio diretto all'API
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      
      const result = await response.json();
      console.log("[DIRECT-BUTTON] Risposta ricevuta:", result);
      
      // Notifica successo
      toast({
        title: "Appuntamento creato",
        description: "Nuovo appuntamento creato con successo",
      });
      
      // Invalidazione delle query
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Invalidazione specifica per la data dell'appuntamento
      queryClient.invalidateQueries({ 
        queryKey: [`/api/appointments/date/${formattedDate}`] 
      });
      
      // Invalidare query per data range
      queryClient.invalidateQueries({ 
        queryKey: ['/api/appointments/range'] 
      });
      
      // Invalidare query per client
      queryClient.invalidateQueries({ 
        queryKey: [`/api/appointments/client/${clientId}`] 
      });
      
      // Callback di successo
      if (onSaveSuccess) {
        onSaveSuccess();
      }
      
    } catch (error: any) {
      console.error("[DIRECT-BUTTON] ERRORE durante il salvataggio:", error);
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      id="saveAppointmentDirectButton"
      className="hidden"
      onClick={saveAppointmentDirectly}
      disabled={isSaving}
    >
      Salva Direttamente
    </button>
  );
}