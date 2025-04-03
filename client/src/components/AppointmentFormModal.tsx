import { useState, useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import AppointmentForm from "./AppointmentForm";

interface AppointmentFormModalProps {
  clientId: number;
  onClose: () => void;
}

export default function AppointmentFormModal({ clientId, onClose }: AppointmentFormModalProps) {
  const [appointmentSaved, setAppointmentSaved] = useState(false);

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
      </div>
    </div>
  );
}