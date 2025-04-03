import { useState, useEffect, useRef } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppointmentForm from "./AppointmentForm";

interface AppointmentFormModalProps {
  clientId: number;
  onClose: () => void;
}

// Funzione di utilità per formattare la data per l'API
function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function AppointmentFormModal({ clientId, onClose }: AppointmentFormModalProps) {
  const { toast } = useToast();
  const [appointmentSaved, setAppointmentSaved] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  
  // Monitoriamo lo stato di salvataggio dell'appuntamento
  useEffect(() => {
    if (appointmentSaved) {
      console.log("Appuntamento salvato, chiusura modale in corso...");
      
      // Invalidazione forzata di tutte le query relative agli appuntamenti
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Ottimizzazione: invalidare anche le query specifiche per data
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const formattedDate = date.toISOString().split('T')[0];
        queryClient.invalidateQueries({ 
          queryKey: [`/api/appointments/date/${formattedDate}`] 
        });
      }
      
      // Invalidare query per data range
      queryClient.invalidateQueries({ 
        queryKey: ['/api/appointments/range'] 
      });
      
      // Invalidare query per client
      queryClient.invalidateQueries({ 
        queryKey: [`/api/appointments/client/${clientId}`] 
      });
      
      // Chiusura effettiva della modale dopo aver dato tempo al sistema di processare
      setTimeout(() => {
        onClose();
      }, 800);
    }
  }, [appointmentSaved, clientId, onClose]);

  // Funzione direttamente nel modale per salvare l'appuntamento 
  // Questa verrà passata all'AppointmentForm per essere richiamata da un pulsante personalizzato
  const saveAppointmentDirectly = async (formData: any) => {
    console.log("=== [MODAL] INIZIO SALVATAGGIO DIRETTO APPUNTAMENTO ===");
    console.log("[MODAL] Dati del form:", formData);
    
    try {
      const today = new Date();
      const date = formData.date || today;
      const startTime = formData.startTime || "09:00";
      const serviceId = formData.serviceId || 1; // Default al primo servizio se non specificato
      const notes = formData.notes || "";
      
      // Composizione dell'orario di fine calcolato sulla durata del servizio (ipotizziamo 60 min)
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + 60; // Default a 60 minuti
      
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
      
      // Preparazione dei dati
      const appointmentData = {
        clientId: clientId,
        serviceId: serviceId,
        date: formatDateForApi(date),
        startTime: startTime + ":00",
        endTime: endTime,
        notes: notes,
        status: "scheduled"
      };
      
      console.log("[MODAL] Dati formattati per API:", appointmentData);
      
      // Invio diretto all'API
      console.log("[MODAL] Invio diretto a /api/appointments");
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      
      const result = await response.json();
      console.log("[MODAL] Risposta ricevuta:", result);
      
      // Notifica successo
      toast({
        title: "Appuntamento creato",
        description: "Nuovo appuntamento creato con successo",
      });
      
      // Notifica al sistema che l'appuntamento è stato salvato
      setAppointmentSaved(true);
    } catch (error: any) {
      console.error("[MODAL] ERRORE durante la richiesta:", error);
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Ottiene i valori dai campi del form
  const collectFormData = () => {
    // Ottieni gli elementi dal DOM
    const dateElement = document.querySelector('button[aria-haspopup="dialog"]');
    const dateText = dateElement?.textContent?.trim();
    let date = new Date();
    
    console.log("[MODAL] Testo data trovato:", dateText);
    
    if (dateText && dateText !== "Seleziona data") {
      // Tenta di estrarre la data in formato italiano
      const parts = dateText.split(' ');
      console.log("[MODAL] Parti della data:", parts);
      
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        let month = 0;
        switch (parts[1].toLowerCase()) {
          case 'gennaio': month = 0; break;
          case 'febbraio': month = 1; break;
          case 'marzo': month = 2; break;
          case 'aprile': month = 3; break;
          case 'maggio': month = 4; break;
          case 'giugno': month = 5; break;
          case 'luglio': month = 6; break;
          case 'agosto': month = 7; break;
          case 'settembre': month = 8; break;
          case 'ottobre': month = 9; break;
          case 'novembre': month = 10; break;
          case 'dicembre': month = 11; break;
        }
        
        const year = parseInt(parts[2]);
        console.log("[MODAL] Data estratta:", day, month, year);
        
        if (!isNaN(day) && !isNaN(year)) {
          date = new Date(year, month, day);
          console.log("[MODAL] Data convertita:", date);
        }
      }
    }
    
    // Ora otteniamo l'orario di inizio
    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
    const startTime = timeInput?.value || "09:00";
    
    // Per il servizio, cerchiamo nella selezione
    const serviceSelect = document.querySelector('[aria-label="Seleziona servizio"]') as HTMLButtonElement;
    let serviceId = 1; // Default al primo servizio
    
    if (serviceSelect) {
      // Tento di estrarre l'ID dal testo
      const serviceText = serviceSelect.textContent;
      if (serviceText && serviceText.includes('Test Diacom')) {
        serviceId = 1;
      } else if (serviceText && serviceText.includes('Terapia Bicom')) {
        serviceId = 2;
      } else if (serviceText && serviceText.includes('Terapia Zapter')) {
        serviceId = 3;
      } else if (serviceText && serviceText.includes('Detox')) {
        serviceId = 4;
      }
    }
    
    // Note
    const notesTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
    const notes = notesTextarea?.value || "";
    
    return {
      date,
      startTime,
      serviceId,
      notes
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <AppointmentForm 
          clientId={clientId}
          defaultDate={new Date()}
          defaultTime="09:00"
          onClose={() => {
            console.log("Richiesta chiusura AppointmentForm (callback onClose)");
            setAppointmentSaved(true);
          }}
          onAppointmentSaved={() => {
            console.log("Callback onAppointmentSaved chiamata");
            setAppointmentSaved(true);
          }}
        />
        
        {/* Aggiungiamo un pulsante di salvataggio diretto nascosto dal layout */}
        <div className="hidden">
          <button
            id="saveAppointmentDirectButton"
            onClick={() => {
              // Questo verrà chiamato manualmente
              console.log("[MODAL] Pulsante di salvataggio diretto cliccato");
              
              try {
                // Raccogliamo i dati direttamente da elementi DOM
                const formData = collectFormData();
                console.log("[MODAL] Dati raccolti dal DOM:", formData);
                saveAppointmentDirectly(formData);
              } catch (error) {
                console.error("[MODAL] Errore durante la raccolta dei dati:", error);
                
                // Fallback con dati di default
                saveAppointmentDirectly({
                  date: new Date(),
                  startTime: "09:00",
                  serviceId: 1,
                  notes: "Appuntamento creato con salvataggio diretto"
                });
              }
            }}
          >
            Salva Direttamente
          </button>
        </div>
      </div>
    </div>
  );
}