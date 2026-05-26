// @ts-nocheck
import { useState, useEffect, useRef, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import {
  isToday,
  isCurrentMonth,
} from "@/lib/utils/date";
import AppointmentCardSmall from "./AppointmentCardSmall";
import AppointmentForm from "./AppointmentForm";
import { ErrorBoundary } from "./ErrorBoundary";
import { FloatingActionButton } from "./FloatingActionButton";

interface MonthViewProps {
  selectedDate: Date;
  services?: any[];
  collaborators?: any[];
  treatmentRooms?: any[];
  activeFilter?: { type: 'staff' | 'room'; id: number } | null;
  onRefresh?: () => void;
  onDateSelect: (date: Date) => void;
}

const CELL_PX = 48;

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
}

function getDurationMinutes(apt: any): number {
  if (!apt.startTime || !apt.endTime) return 60;
  const [sh, sm] = apt.startTime.split(':').map(Number);
  const [eh, em] = apt.endTime.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : 60;
}

function getWeekDays(week: Date[]): Date[] {
  return week;
}

export default function MonthView({
  selectedDate,
  services = [],
  collaborators = [],
  treatmentRooms = [],
  activeFilter = null,
  onRefresh,
  onDateSelect,
}: MonthViewProps) {
  const { t } = useTranslation();
  const [viewDate, setViewDate] = useState(selectedDate);
  const [calendar, setCalendar] = useState<Date[][]>([]);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedDayForAppointment, setSelectedDayForAppointment] = useState<Date | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  const formOpenedAtRef = useRef(0);

  useEffect(() => {
    setViewDate(selectedDate);
  }, [selectedDate]);

  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const startDate = fmt(firstDayOfMonth);
  const endDate = fmt(lastDayOfMonth);

  const { data: appointments = [], isLoading, refetch } = useQuery<any>({
    queryKey: [`/api/appointments/range/${startDate}/${endDate}`],
  });

  useEffect(() => { refetch(); }, [viewDate, refetch]);

  useEffect(() => {
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const daysInMonth = lastDay.getDate();
    const weeksInMonth = Math.ceil((daysInMonth + firstDayOfWeek) / 7);
    const calendarDays: Date[][] = [];
    let day = 1 - firstDayOfWeek;
    for (let w = 0; w < weeksInMonth; w++) {
      const weekDays: Date[] = [];
      for (let i = 0; i < 7; i++) {
        weekDays.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
        day++;
      }
      calendarDays.push(weekDays);
    }
    setCalendar(calendarDays);
  }, [viewDate]);

  const handlePrevMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNextMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleAppointmentUpdated = () => {
    refetch();
    if (onRefresh) onRefresh();
  };

  const getAppointmentsForSlot = (day: Date, slotHour: number) => {
    const dateStr = fmt(day);
    return appointments.filter((apt: any) => {
      if (apt.date !== dateStr) return false;
      const aptHour = parseInt((apt.startTime || '00:00').split(':')[0]);
      if (aptHour !== slotHour) return false;
      if (activeFilter) {
        if (activeFilter.type === 'staff') return apt.staffId === activeFilter.id;
        if (activeFilter.type === 'room') return apt.roomId === activeFilter.id;
      }
      return true;
    });
  };

  const monthLabel = viewDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const weekdays = [
    t('calendar.weekDays.mon', 'Lun'),
    t('calendar.weekDays.tue', 'Mar'),
    t('calendar.weekDays.wed', 'Mer'),
    t('calendar.weekDays.thu', 'Gio'),
    t('calendar.weekDays.fri', 'Ven'),
    t('calendar.weekDays.sat', 'Sab'),
    t('calendar.weekDays.sun', 'Dom'),
  ];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gray-100 px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-lg font-medium capitalize">{monthLabel}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto max-h-[calc(100vh-220px)] sm:max-h-[calc(100vh-310px)] min-h-[300px]">
        {calendar.map((week, weekIndex) => (
          <div key={weekIndex} className="border-b last:border-b-0">
            {/* Week day headers */}
            <div
              className="grid sticky top-0 z-20 bg-gray-50 border-b"
              style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
            >
              <div className="border-r bg-gray-50 p-1" />
              {week.map((day, di) => {
                const inMonth = isCurrentMonth(day, viewDate);
                const today = isToday(day);
                return (
                  <div
                    key={di}
                    className="text-center py-2 border-r last:border-r-0 cursor-pointer hover:bg-blue-50/40"
                    onClick={() => onDateSelect(day)}
                  >
                    <div className={`text-xs font-medium ${inMonth ? 'text-gray-500' : 'text-gray-300'}`}>
                      {weekdays[di]}
                    </div>
                    <div
                      className={`
                        mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold
                        ${today ? 'bg-primary text-white' : inMonth ? 'text-gray-800' : 'text-gray-300'}
                      `}
                    >
                      {day.getDate()}
                    </div>
                    {/* + button */}
                    {inMonth && (
                      <div className="flex justify-center mt-0.5">
                        <button
                          className="text-gray-300 hover:text-primary text-lg leading-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayForAppointment(day);
                            formOpenedAtRef.current = Date.now();
                            setIsAppointmentFormOpen(true);
                          }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time slot rows */}
            <div
              className="grid"
              style={{ gridTemplateColumns: '56px repeat(7, 1fr)', gridAutoRows: `minmax(${CELL_PX}px, auto)` }}
            >
              {TIME_SLOTS.map((slot, slotIdx) => {
                const slotHour = 8 + slotIdx;
                return (
                  <Fragment key={slotIdx}>
                    {/* Time label */}
                    <div className="text-xs font-medium text-gray-400 bg-gray-50 border-r border-b p-1 sticky left-0 z-10 select-none">
                      {slot}
                    </div>
                    {/* Day cells */}
                    {week.map((day, di) => {
                      const inMonth = isCurrentMonth(day, viewDate);
                      const slotApts = getAppointmentsForSlot(day, slotHour);

                      const sorted = [...slotApts].sort((a, b) =>
                        (a.startTime || '').localeCompare(b.startTime || '')
                      );
                      let nextY = 0;
                      const positioned = sorted.map((apt) => {
                        const startMins = parseInt((apt.startTime || `${slotHour}:00`).split(':')[1] || '0');
                        const duration = getDurationMinutes(apt);
                        const idealTop = Math.round((startMins / 60) * CELL_PX);
                        const height = Math.max(Math.round((duration / 60) * CELL_PX), 14);
                        const top = Math.max(idealTop, nextY);
                        nextY = top + height;
                        return { apt, top, height };
                      });

                      const cellMinH = Math.max(CELL_PX, nextY);

                      return (
                        <div
                          key={di}
                          className={`border-r border-b last:border-r-0 relative group min-w-0
                            ${inMonth ? 'bg-white cursor-pointer hover:bg-blue-50/30' : 'bg-gray-50/60'}
                          `}
                          style={{ minHeight: `${cellMinH}px` }}
                          onClick={() => {
                            if (!inMonth) return;
                            setSelectedDayForAppointment(day);
                            formOpenedAtRef.current = Date.now();
                            setIsAppointmentFormOpen(true);
                          }}
                        >
                          {isLoading ? (
                            slotIdx === 0 ? <Skeleton className="absolute inset-1" /> : null
                          ) : positioned.length === 0 && inMonth ? (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-3 w-3 text-gray-300" />
                            </div>
                          ) : (
                            positioned.map(({ apt, top, height }) => (
                              <div
                                key={apt.id}
                                className="absolute left-0 right-0 overflow-hidden"
                                style={{ top: `${top}px`, height: `${height}px`, padding: '1px' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AppointmentCardSmall
                                  appointment={apt}
                                  onUpdate={handleAppointmentUpdated}
                                  onEdit={(id) => {
                                    formOpenedAtRef.current = Date.now();
                                    setEditingAppointmentId(id);
                                  }}
                                  view="month"
                                />
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      {editingAppointmentId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center pt-3 sm:pt-0 z-50 overflow-y-auto"
          onClick={() => {
            if (Date.now() - formOpenedAtRef.current > 300) setEditingAppointmentId(null);
          }}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <ErrorBoundary
              fallback={
                <div className="bg-white rounded-lg shadow-lg p-6 w-[calc(100vw-16px)] sm:w-auto sm:min-w-[380px] flex flex-col gap-4 items-center">
                  <p className="text-sm text-gray-600">{t('appointmentForm.loadError', 'Error loading the form. Please try again.')}</p>
                  <button className="px-4 py-2 bg-primary text-white rounded-md text-sm" onClick={() => setEditingAppointmentId(null)}>{t('common.close', 'Close')}</button>
                </div>
              }
            >
              <AppointmentForm
                appointmentId={editingAppointmentId}
                onClose={() => {
                  setEditingAppointmentId(null);
                  handleAppointmentUpdated();
                }}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* New appointment dialog */}
      {isAppointmentFormOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center pt-3 sm:pt-0 z-50 overflow-y-auto"
          onClick={() => {
            if (Date.now() - formOpenedAtRef.current > 300) setIsAppointmentFormOpen(false);
          }}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <AppointmentForm
              onClose={() => {
                setIsAppointmentFormOpen(false);
                handleAppointmentUpdated();
              }}
              defaultDate={selectedDayForAppointment || viewDate}
              defaultTime="09:00"
            />
          </div>
        </div>
      )}

      {!isAppointmentFormOpen && (
        <FloatingActionButton
          onClick={() => {
            setSelectedDayForAppointment(viewDate);
            formOpenedAtRef.current = Date.now();
            setIsAppointmentFormOpen(true);
          }}
          text={t('calendar.selectNewAppointment', 'New appointment')}
          storageKey="fab-month-position"
        />
      )}
    </div>
  );
}
