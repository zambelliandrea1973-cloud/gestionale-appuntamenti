import { useEffect } from "react";
import AppointmentForm from "./AppointmentForm";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  defaultDate: Date;
  defaultTime: string;
}

export default function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  defaultDate,
  defaultTime
}: AppointmentModalProps) {
  
  useEffect(() => {
    // For debugging
    console.log("AppointmentModal - isOpen:", isOpen);
    console.log("AppointmentModal - defaultTime:", defaultTime);
  }, [isOpen, defaultTime]);
  
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
      </div>
    </div>
  );
}