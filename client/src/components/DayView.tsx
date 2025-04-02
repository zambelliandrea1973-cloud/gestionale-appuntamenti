import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateTimeSlots, formatDateFull, formatDateForApi } from "@/lib/utils/date";
import { Loader2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AppointmentCard from "./AppointmentCard";
import AppointmentForm from "./AppointmentForm";

interface DayViewProps {
  selectedDate: Date;
  onRefresh?: () => void;
}

export default function DayView({ selectedDate, onRefresh }: DayViewProps) {
  const [timeSlots] = useState(() => generateTimeSlots(8, 19));
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
                className="flex items-start px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleTimeSlotClick(timeSlot)}
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
                  ) : timeSlot === "13:00" ? (
                    // Lunch break example
                    <div className="text-sm text-gray-500 italic">Pausa pranzo</div>
                  ) : (
                    // Empty slot - clicking anywhere will already trigger the new appointment dialog
                    <div className="h-3"></div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Form dialog for new appointment */}
      <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
        <DialogTrigger className="hidden">
          <Button>New Appointment</Button>
        </DialogTrigger>
        <AppointmentForm 
          onClose={() => {
            setIsAppointmentFormOpen(false);
            handleAppointmentUpdated();
          }}
          defaultDate={selectedDate}
          defaultTime={selectedTimeSlot || "09:00"}
        />
      </Dialog>
    </div>
  );
}
