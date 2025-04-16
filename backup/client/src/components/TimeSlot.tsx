import { Plus } from "lucide-react";

interface TimeSlotProps {
  time: string;
  onAddAppointment: (timeSlot: string) => void;
}

export default function TimeSlot({ time, onAddAppointment }: TimeSlotProps) {
  const handleNewAppointmentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`NEW_TimeSlot - Cliccato per creare appuntamento alle ${time}`);
    onAddAppointment(time);
  };

  return (
    <div className="flex items-center h-12">
      <button 
        type="button"
        className="flex items-center px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded-md"
        onClick={handleNewAppointmentClick}
      >
        <Plus className="h-4 w-4 mr-1" />
        Nuovo appuntamento
      </button>
    </div>
  );
}