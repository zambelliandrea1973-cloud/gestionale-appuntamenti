// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, X, Clock, User, Briefcase, Users, DoorOpen, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isToday, isCurrentMonth } from "@/lib/utils/date";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppointmentForm from "./AppointmentForm";
import { ErrorBoundary } from "./ErrorBoundary";
import { FloatingActionButton } from "./FloatingActionButton";
import { getISOWeek } from "date-fns";

interface MonthViewProps {
  selectedDate: Date;
  services?: any[];
  collaborators?: any[];
  treatmentRooms?: any[];
  activeFilter?: { type: "staff" | "room"; id: number } | null;
  onRefresh?: () => void;
  onDateSelect: (date: Date) => void;
}

const MAX_VISIBLE = 3;

const EVENT_COLORS = [
  "#4285F4", "#0F9D58", "#DB4437", "#F4B400", "#AB47BC",
  "#00ACC1", "#FF7043", "#9E9D24", "#5C6BC0", "#26A69A",
];

function getEventColor(apt: any): string {
  if (apt.service?.color) return apt.service.color;
  const id = apt.serviceId ?? apt.staffId ?? apt.id ?? 0;
  return EVENT_COLORS[Math.abs(id) % EVENT_COLORS.length];
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith("rgb")) {
    return hex.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r)) return `rgba(66,133,244,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Chip singolo appuntamento ─────────────────────────────────────── */
function EventChip({
  apt,
  onEdit,
  onDeleted,
}: {
  apt: any;
  onEdit: (id: number) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const chipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const color = getEventColor(apt);
  const bg = hexToRgba(color, 0.15);

  const endTime = (() => {
    if (!apt.startTime || !apt.service?.duration) return null;
    const [h, m] = apt.startTime.split(":").map(Number);
    const total = h * 60 + m + (apt.service.duration || 0);
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  })();

  const calcPos = () => {
    if (!chipRef.current) return;
    const r = chipRef.current.getBoundingClientRect();
    const pw = 252, ph = 220;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = r.right + 8;
    if (left + pw > vw - 8) left = r.left - pw - 8;
    if (left < 8) left = 8;
    let top = r.top;
    if (top + ph > vh - 8) top = vh - ph - 8;
    if (top < 8) top = 8;
    setPos({ top, left });
  };

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/appointments/${apt.id}`),
    onSuccess: async () => {
      toast({ title: t("appointment.deleted"), description: t("appointment.deletedDesc") });
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments/range"] });
      setOpen(false);
      onDeleted();
    },
    onError: (e: any) => {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const target = (e as MouseEvent).target as Node;
      if (chipRef.current?.contains(target)) return;
      const pop = document.querySelector("[data-month-popover]");
      if (pop?.contains(target)) return;
      setOpen(false);
      setConfirmDelete(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler as any, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler as any);
    };
  }, [open]);

  const isGoogle = apt.isImported || apt.client?.firstName?.startsWith("📅");

  return (
    <>
      <div
        ref={chipRef}
        className="w-full rounded px-1.5 py-0.5 text-xs cursor-pointer truncate select-none leading-snug"
        style={{ backgroundColor: bg, borderLeft: `3px solid ${color}`, color }}
        onClick={(e) => {
          e.stopPropagation();
          calcPos();
          setOpen((p) => !p);
        }}
        title={`${apt.startTime?.substring(0, 5)} · ${apt.client?.firstName ?? ""} ${apt.client?.lastName ?? ""}`}
      >
        <span className="font-semibold">{apt.startTime?.substring(0, 5)}</span>
        {" "}
        <span className="font-medium">
          {isGoogle
            ? (apt.notes?.substring(0, 20) ?? apt.service?.name ?? "Google")
            : `${apt.client?.firstName ?? ""} ${(apt.client?.lastName ?? "").charAt(0)}.`}
        </span>
      </div>

      {open && (
        <div
          data-month-popover
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl p-3 w-64"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ background: bg, color }}
            >
              {apt.status ?? "scheduled"}
            </div>
            <button
              className="text-gray-400 hover:text-gray-700"
              onClick={() => { setOpen(false); setConfirmDelete(false); }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="font-medium">
                {apt.startTime?.substring(0, 5)}{endTime ? ` – ${endTime}` : ""}
                {apt.service?.duration ? ` (${apt.service.duration} min)` : ""}
              </span>
            </div>
            {!isGoogle && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="font-semibold truncate">
                  {apt.client?.firstName} {apt.client?.lastName}
                </span>
              </div>
            )}
            {apt.service && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{apt.service.name}</span>
              </div>
            )}
            {apt.staff && (
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{apt.staff.firstName} {apt.staff.lastName}</span>
              </div>
            )}
            {apt.room && (
              <div className="flex items-center gap-2">
                <DoorOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{apt.room.name}</span>
              </div>
            )}
            {apt.notes && !isGoogle && (
              <div className="text-xs text-gray-500 mt-1 pt-1 border-t truncate">{apt.notes}</div>
            )}
            {isGoogle && apt.notes && (
              <div className="text-xs text-gray-600 mt-1 pt-1 border-t line-clamp-2">{apt.notes}</div>
            )}
          </div>

          {!confirmDelete ? (
            <div className="flex gap-2 mt-3 pt-2 border-t">
              {!isGoogle && (
                <Button
                  size="sm" variant="outline"
                  className="flex-1 h-7 text-xs"
                  onClick={() => { setOpen(false); onEdit(apt.id); }}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  {t("common.edit", "Modifica")}
                </Button>
              )}
              {!isGoogle && (
                <Button
                  size="sm" variant="outline"
                  className="h-7 text-xs text-red-500 hover:text-red-700 hover:border-red-300"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-3 pt-2 border-t space-y-2">
              <p className="text-xs text-gray-600">{t("appointment.confirmDeleteDescription", "Eliminare questo appuntamento?")}</p>
              <div className="flex gap-2">
                <Button
                  size="sm" variant="outline"
                  className="flex-1 h-7 text-xs"
                  onClick={() => setConfirmDelete(false)}
                >
                  {t("common.cancel", "Annulla")}
                </Button>
                <Button
                  size="sm" variant="destructive"
                  className="flex-1 h-7 text-xs"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {t("common.delete", "Elimina")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ── Popover "più eventi" del giorno ───────────────────────────────── */
function MoreEventsPopover({
  day,
  apts,
  onClose,
  onEdit,
  onDeleted,
}: {
  day: Date;
  apts: any[];
  onClose: () => void;
  onEdit: (id: number) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-4 w-72 max-h-96 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-sm text-gray-700">
            {day.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          {apts.map((apt) => (
            <EventChip key={apt.id} apt={apt} onEdit={(id) => { onClose(); onEdit(id); }} onDeleted={() => { onDeleted(); onClose(); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── MonthView principale ──────────────────────────────────────────── */
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newApptDay, setNewApptDay] = useState<Date | null>(null);
  const [moreDay, setMoreDay] = useState<Date | null>(null);
  const formOpenedAtRef = useRef(0);

  useEffect(() => { setViewDate(selectedDate); }, [selectedDate]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const startDate = fmt(firstDay);
  const endDate = fmt(lastDay);

  const { data: appointments = [], isLoading, refetch } = useQuery<any>({
    queryKey: [`/api/appointments/range/${startDate}/${endDate}`],
  });

  useEffect(() => { refetch(); }, [viewDate, refetch]);

  useEffect(() => {
    const fd = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const ld = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    let dow = fd.getDay();
    dow = dow === 0 ? 6 : dow - 1;
    const daysInMonth = ld.getDate();
    const weeks = Math.ceil((daysInMonth + dow) / 7);
    const cal: Date[][] = [];
    let d = 1 - dow;
    for (let w = 0; w < weeks; w++) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
        d++;
      }
      cal.push(row);
    }
    setCalendar(cal);
  }, [viewDate]);

  const getAptsForDay = (day: Date) => {
    const ds = fmt(day);
    return (appointments as any[])
      .filter((a) => {
        if (a.date !== ds) return false;
        if (activeFilter) {
          if (activeFilter.type === "staff" && a.staffId !== activeFilter.id) return false;
          if (activeFilter.type === "room" && a.roomId !== activeFilter.id) return false;
        }
        return true;
      })
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  };

  const handleRefresh = () => { refetch(); if (onRefresh) onRefresh(); };

  const weekdays = [
    t("calendar.weekDays.mon", "Lun"),
    t("calendar.weekDays.tue", "Mar"),
    t("calendar.weekDays.wed", "Mer"),
    t("calendar.weekDays.thu", "Gio"),
    t("calendar.weekDays.fri", "Ven"),
    t("calendar.weekDays.sat", "Sab"),
    t("calendar.weekDays.sun", "Dom"),
  ];

  const monthLabel = viewDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  const moreDayApts = moreDay ? getAptsForDay(moreDay) : [];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6 flex flex-col">
      {/* ── Header ── */}
      <div className="bg-gray-100 px-4 py-3 border-b flex items-center justify-between shrink-0">
        <h3 className="text-lg font-medium capitalize">{monthLabel}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
            onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
            onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Day-of-week header ── */}
      <div
        className="grid border-b bg-gray-50 shrink-0"
        style={{ gridTemplateColumns: "32px repeat(7, 1fr)" }}
      >
        <div className="border-r" />
        {weekdays.map((d, i) => (
          <div
            key={i}
            className={`text-center py-2 text-xs font-semibold uppercase tracking-wide border-r last:border-r-0
              ${i >= 5 ? "text-blue-400" : "text-gray-500"}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: "calc(100vh - 310px)" }}>
        {calendar.map((week, wi) => (
          <div
            key={wi}
            className="grid border-b last:border-b-0"
            style={{ gridTemplateColumns: "32px repeat(7, 1fr)" }}
          >
            {/* Week number */}
            <div className="border-r bg-gray-50 flex items-start justify-center pt-2">
              <span className="text-[10px] text-gray-400 font-medium">
                {getISOWeek(week[0])}
              </span>
            </div>

            {/* Day cells */}
            {week.map((day, di) => {
              const inMonth = isCurrentMonth(day, viewDate);
              const today = isToday(day);
              const dayApts = getAptsForDay(day);
              const visible = dayApts.slice(0, MAX_VISIBLE);
              const overflow = dayApts.length - MAX_VISIBLE;
              const isWeekend = di >= 5;

              return (
                <div
                  key={di}
                  className={`border-r last:border-r-0 min-h-[90px] sm:min-h-[110px] p-1 cursor-pointer
                    ${inMonth
                      ? isWeekend
                        ? "bg-blue-50/30 hover:bg-blue-50/60"
                        : "bg-white hover:bg-gray-50"
                      : "bg-gray-50/70"
                    }`}
                  onClick={() => {
                    if (!inMonth) return;
                    setNewApptDay(day);
                    formOpenedAtRef.current = Date.now();
                  }}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-0.5">
                    <div
                      className={`
                        w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold select-none
                        ${today
                          ? "bg-blue-600 text-white"
                          : inMonth
                            ? isWeekend ? "text-blue-500" : "text-gray-700"
                            : "text-gray-300"
                        }
                      `}
                      onClick={(e) => { e.stopPropagation(); onDateSelect(day); }}
                      title={t("calendar.goToDay", "Vai al giorno")}
                    >
                      {day.getDate()}
                    </div>
                  </div>

                  {/* Events */}
                  {isLoading && inMonth ? (
                    <div className="space-y-0.5">
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-3/4 rounded" />
                    </div>
                  ) : (
                    <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
                      {visible.map((apt) => (
                        <EventChip
                          key={apt.id}
                          apt={apt}
                          onEdit={(id) => {
                            formOpenedAtRef.current = Date.now();
                            setEditingId(id);
                          }}
                          onDeleted={handleRefresh}
                        />
                      ))}
                      {overflow > 0 && (
                        <button
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium pl-1 leading-tight"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoreDay(day);
                          }}
                        >
                          +{overflow} {t("calendar.moreEvents", "altri")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── More events popover ── */}
      {moreDay && (
        <MoreEventsPopover
          day={moreDay}
          apts={moreDayApts}
          onClose={() => setMoreDay(null)}
          onEdit={(id) => { setEditingId(id); formOpenedAtRef.current = Date.now(); }}
          onDeleted={handleRefresh}
        />
      )}

      {/* ── Edit appointment dialog ── */}
      {editingId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center pt-3 sm:pt-0 z-50 overflow-y-auto"
          onClick={() => { if (Date.now() - formOpenedAtRef.current > 300) setEditingId(null); }}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <ErrorBoundary
              fallback={
                <div className="bg-white rounded-lg shadow-lg p-6 w-[calc(100vw-16px)] sm:w-auto sm:min-w-[380px] flex flex-col gap-4 items-center">
                  <p className="text-sm text-gray-600">{t("appointmentForm.loadError", "Errore nel caricamento.")}</p>
                  <button className="px-4 py-2 bg-primary text-white rounded-md text-sm" onClick={() => setEditingId(null)}>{t("common.close", "Chiudi")}</button>
                </div>
              }
            >
              <AppointmentForm
                appointmentId={editingId}
                onClose={() => { setEditingId(null); handleRefresh(); }}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* ── New appointment dialog ── */}
      {newApptDay && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center pt-3 sm:pt-0 z-50 overflow-y-auto"
          onClick={() => { if (Date.now() - formOpenedAtRef.current > 300) setNewApptDay(null); }}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <AppointmentForm
              onClose={() => { setNewApptDay(null); handleRefresh(); }}
              defaultDate={newApptDay}
              defaultTime="09:00"
            />
          </div>
        </div>
      )}

      {!newApptDay && !editingId && (
        <FloatingActionButton
          onClick={() => {
            setNewApptDay(viewDate);
            formOpenedAtRef.current = Date.now();
          }}
          text={t("calendar.selectNewAppointment", "Nuovo appuntamento")}
          storageKey="fab-month-position"
        />
      )}
    </div>
  );
}
