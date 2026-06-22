// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { generateHourlyGroupedTimeSlots, formatDateForApi } from "@/lib/utils/date";
import { Skeleton } from "@/components/ui/skeleton";
import AppointmentModal from "./AppointmentModal";
import AppointmentCardSmall from "./AppointmentCardSmall";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AppointmentWithDetails } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest } from "@/lib/queryClient";

interface DayViewProps {
  selectedDate: Date;
  onRefresh?: () => void;
}

export default function DayViewWithMiniSlots({ selectedDate, onRefresh }: DayViewProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const [groupedTimeSlots] = useState(() => generateHourlyGroupedTimeSlots(8, 22, 15));
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<number | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const formattedDate = formatDateForApi(selectedDate);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: appointments = [], isLoading, refetch } = useQuery<AppointmentWithDetails[]>({
    queryKey: [`/api/appointments/date/${formattedDate}`],
    queryFn: getQueryFn({ on401: 'returnNull' })
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/appointments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('calendar.appointmentDeleted'),
        description: t('calendar.appointmentDeletedSuccess'),
      });
      refetch();
      if (onRefresh) onRefresh();
    },
    onError: (error: any) => {
      toast({
        title: t('calendar.error'),
        description: error.message || t('calendar.appointmentDeleteError'),
        variant: 'destructive',
      });
    },
  });

  const confirmDeleteAppointment = (id: number) => {
    setAppointmentToDelete(id);
    setShowDeleteConfirm(true);
  };

  const deleteAppointment = (id: number) => {
    deleteAppointmentMutation.mutate(id);
  };

  const handleAppointmentUpdated = () => {
    refetch();
    if (onRefresh) onRefresh();
  };

  const handleFormClosed = () => {
    setIsAppointmentFormOpen(false);
    setSelectedTimeSlot(null);
    setSelectedAppointment(null);
    handleAppointmentUpdated();
  };

  // Apre il form direttamente allo slot cliccato (se libero)
  const openFormAtSlot = (timeSlot: string) => {
    if (isSlotOccupied(timeSlot)) return;
    setSelectedAppointment(null);
    setSelectedTimeSlot(timeSlot);
    setIsAppointmentFormOpen(true);
  };

  // Apre il form cliccando sull'intestazione ora (usa il primo slot dell'ora)
  const openFormAtHour = (hour: string) => {
    const firstSlot = `${hour}:00`;
    openFormAtSlot(firstSlot);
  };

  const isSlotOccupied = (slot: string): boolean => {
    const slotTime = new Date(`2000-01-01T${slot}`);
    const formattedSlot = `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}:00`;
    return appointments.some(appointment => {
      if (appointment.startTime === formattedSlot) return true;
      return appointment.startTime < formattedSlot && appointment.endTime > formattedSlot;
    });
  };

  const findAppointmentSpanningSlot = (slot: string) => {
    const formattedSlot = `${slot.split(':')[0].padStart(2, '0')}:${slot.split(':')[1].padStart(2, '0')}:00`;
    return appointments.find(a => a.startTime <= formattedSlot && a.endTime > formattedSlot);
  };

  const calculateAppointmentHeightAndPosition = (appointment: AppointmentWithDetails) => {
    const startParts = appointment.startTime.split(':');
    const startHour = parseInt(startParts[0]);
    const startMinute = parseInt(startParts[1]);

    const endParts = appointment.endTime.split(':');
    const endHour = parseInt(endParts[0]);
    const endMinute = parseInt(endParts[1]);

    const totalMinutes = (endHour - startHour) * 60 + (endMinute - startMinute);
    const height = totalMinutes / 15 * 12;

    const calendarStartHour = parseInt(groupedTimeSlots[0].hour);
    const hourOffset = startHour - calendarStartHour;
    const totalOffsetMinutes = (hourOffset * 60) + startMinute;
    const top = (totalOffsetMinutes / 15) * 12;

    return { height, top };
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {selectedDate.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        <span className="text-xs text-gray-500">{t('calendar.clickSlotToCreate', 'Clicca uno slot per aggiungere un appuntamento')}</span>
      </div>

      {/* Time slots */}
      <div className="p-4">
        {isLoading ? (
          Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="mb-4">
              <Skeleton className="h-20 w-full" />
            </div>
          ))
        ) : (
          <div className="border border-gray-300 rounded overflow-hidden">
            {/* Appuntamenti esistenti sovrapposti */}
            <div className="relative">
              {appointments.map((appointment) => {
                const { height, top } = calculateAppointmentHeightAndPosition(appointment);
                return (
                  <div
                    key={`appointment-${appointment.id}`}
                    className="absolute left-24 right-0 z-20"
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <AppointmentCardSmall
                      appointment={appointment}
                      view="week"
                      onEdit={() => {
                        setSelectedTimeSlot(appointment.startTime.substr(0, 5));
                        setSelectedAppointment(appointment);
                        setIsAppointmentFormOpen(true);
                      }}
                      onUpdate={handleAppointmentUpdated}
                    />
                  </div>
                );
              })}
            </div>

            {/* Ore e mini-slot */}
            {groupedTimeSlots.map((hourGroup) => (
              <div
                key={hourGroup.hour}
                className="flex border-b border-gray-300 last:border-b-0"
              >
                {/* Colonna ora — click apre form */}
                <div
                  className="w-24 p-3 font-bold text-gray-700 border-r border-gray-300 flex items-center justify-center cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors select-none"
                  onClick={() => openFormAtHour(hourGroup.hour)}
                  title={t('calendar.clickSlotToCreate', 'Nuovo appuntamento')}
                >
                  {hourGroup.hour}:00
                </div>

                {/* Mini-slot — click apre form */}
                <div className="flex-grow">
                  <div className="divide-y divide-gray-200">
                    {hourGroup.slots.map((timeSlot) => {
                      const isOccupied = isSlotOccupied(timeSlot);
                      const occupyingAppointment = findAppointmentSpanningSlot(timeSlot);

                      if (occupyingAppointment) {
                        return (
                          <div
                            key={timeSlot}
                            className="min-h-12 px-3 py-2 flex items-center"
                            style={{ display: 'none' }}
                          />
                        );
                      }

                      return (
                        <div
                          key={timeSlot}
                          className={cn(
                            "min-h-12 px-3 py-2 flex items-center relative select-none",
                            isOccupied
                              ? "bg-gray-50 cursor-default"
                              : "cursor-pointer hover:bg-blue-50 group"
                          )}
                          onClick={() => openFormAtSlot(timeSlot)}
                        >
                          <span className={cn(
                            "text-sm transition-colors",
                            isOccupied ? "text-gray-400 line-through" : "text-gray-500 group-hover:text-blue-600"
                          )}>
                            {timeSlot}
                          </span>
                          {!isOccupied && (
                            <span className="ml-2 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              + {t('calendar.newAppointment', 'nuovo')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal appuntamento */}
      <AppointmentModal
        isOpen={isAppointmentFormOpen}
        onClose={handleFormClosed}
        onSave={handleAppointmentUpdated}
        defaultDate={selectedDate}
        defaultTime={selectedTimeSlot || "09:00"}
        appointmentId={selectedAppointment?.id ?? null}
      />

      {/* Conferma eliminazione */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-2">{t("appointment.confirmDeleteTitle")}</h3>
            <p className="mb-4">{t("appointment.confirmDelete")}</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => { setShowDeleteConfirm(false); setAppointmentToDelete(null); }}
              >
                {t("common.cancel")}
              </button>
              <button
                className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  if (appointmentToDelete !== null) {
                    deleteAppointment(appointmentToDelete);
                    setShowDeleteConfirm(false);
                    setAppointmentToDelete(null);
                  }
                }}
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
