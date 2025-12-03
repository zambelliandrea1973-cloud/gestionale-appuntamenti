import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { generateTimeSlots, formatDateFull, formatDateForApi } from "@/lib/utils/date";
import { Loader2, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AppointmentCard from "./AppointmentCard";
import AppointmentModal from "./AppointmentModal";

interface DayViewProps {
  selectedDate: Date;
  onRefresh?: () => void;
}

export default function DayView({ selectedDate, onRefresh }: DayViewProps) {
  const [timeSlots] = useState(() => generateTimeSlots(8, 22));
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  
  const formattedDate = formatDateForApi(selectedDate);
  
  // Fetch appointments for the selected date
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/appointments/date/${formattedDate}`],
  });
  
  // Refresh data when date changes
  useEffect(() => {
    refetch();
  }, [selectedDate, refetch]);
  
  // Logging per debug
  useEffect(() => {
    console.log("DayView rendering with date:", formattedDate);
    console.log("Appuntamenti trovati:", appointments);
  }, [formattedDate, appointments]);
  
  // Handle appointment update
  const handleAppointmentUpdated = () => {
    refetch();
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // Handle time slot click to open new appointment form
  const handleTimeSlotClick = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setIsAppointmentFormOpen(true);
  };
  
  // Handle form closure
  const handleFormClosed = () => {
    console.log("Closing form in DayView");
    setIsAppointmentFormOpen(false);
    handleAppointmentUpdated();
  };
  
  // Debug helper
  useEffect(() => {
    console.log("isAppointmentFormOpen:", isAppointmentFormOpen);
    console.log("selectedTimeSlot:", selectedTimeSlot);
  }, [isAppointmentFormOpen, selectedTimeSlot]);
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Day header */}
      <div className="bg-gray-100 px-4 py-3 border-b">
        <h3 className="text-lg font-medium">{formatDateFull(selectedDate)}</h3>
      </div>
      
      {/* Time slots */}
      <div className="divide-y">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="flex items-start px-4 py-3">
              <div className="w-16">
                <Skeleton className="h-6 w-12" />
              </div>
              <div className="flex-grow">
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ))
        ) : (
          // Render time slots
          timeSlots.map((timeSlot) => {
            // Find appointments for this time slot
            const slotsAppointments = appointments.filter(
              (appointment) => appointment.startTime.startsWith(timeSlot)
            );
            
            return (
              <div 
                key={timeSlot} 
                className="flex items-start px-4 py-3 hover:bg-gray-50"
              >
                <div className="w-16 font-medium text-gray-600">{timeSlot}</div>
                <div className="flex-grow">
                  {slotsAppointments.length > 0 ? (
                    // Show appointments in this slot
                    slotsAppointments.map((appointment) => (
                      <AppointmentCard 
                        key={appointment.id}
                        appointment={appointment}
                        onUpdate={handleAppointmentUpdated}
                      />
                    ))
                  ) : (
                    // Empty slot with add button - simple HTML approach
                    <div className="flex items-center h-12">
                      <a 
                        href="#" 
                        className="flex items-center px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded-md"
                        onClick={(e) => {
                          e.preventDefault();
                          console.log("Pulsante Nuovo Appuntamento ANCHOR cliccato per orario:", timeSlot);
                          handleTimeSlotClick(timeSlot);
                        }}
                      >
                        + Nuovo appuntamento
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Use our new AppointmentModal component */}
      <AppointmentModal
        isOpen={isAppointmentFormOpen}
        onClose={handleFormClosed}
        onSave={handleAppointmentUpdated}
        defaultDate={selectedDate}
        defaultTime={selectedTimeSlot || "09:00"}
      />
    </div>
  );
}
