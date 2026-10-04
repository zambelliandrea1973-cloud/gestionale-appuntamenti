import { useEffect, useRef, useState } from "react";
import { getISOWeek } from "date-fns";
import { Maximize2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./MobileMonthGrid.css";

interface MobileMonthGridProps {
  weeks: Date[][];
  month: Date;
  isLoading: boolean;
  getAppointments: (date: Date) => any[];
  getColors: (appointment: any) => { band: string; bgSolid: string; isServiceMatch: boolean } | null;
  getEventColor: (appointment: any) => string;
  onDateSelect: (date: Date) => void;
  onNewAppointment: () => void;
  showNewAppointmentAction?: boolean;
}

const dateKey = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

export default function MobileMonthGrid({
  weeks, month, isLoading, getAppointments, getColors, getEventColor, onDateSelect, onNewAppointment, showNewAppointmentAction = true,
}: MobileMonthGridProps) {
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const [availableHeight, setAvailableHeight] = useState<number>();

  // The app's navigation/header height varies between phones and account states.
  useEffect(() => {
    const measure = () => {
      if (rootRef.current) {
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        setAvailableHeight(Math.max(280, viewportHeight - rootRef.current.getBoundingClientRect().top - 8));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.visualViewport?.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    if (rootRef.current?.parentElement) observer.observe(rootRef.current.parentElement);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  const resetZoom = () => {
    zoomRef.current = 1;
    setZoom(1);
    gridRef.current?.style.setProperty("--mobile-zoom", "1");
    if (clipRef.current) {
      clipRef.current.scrollLeft = 0;
      clipRef.current.scrollTop = 0;
    }
  };

  useEffect(() => { resetZoom(); }, [month.getFullYear(), month.getMonth()]);

  // A non-passive listener is needed on iOS Safari to stop the browser page zoom
  // while keeping single-finger panning inside an enlarged calendar.
  useEffect(() => {
    const clip = clipRef.current;
    const grid = gridRef.current;
    if (!clip || !grid) return;
    let pinch: { distance: number; zoom: number } | null = null;
    let pinched = false;
    const distance = (e: TouchEvent) =>
      Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const start = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinch = { distance: distance(e), zoom: zoomRef.current };
        pinched = true;
      }
    };
    const move = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      if (!pinch || pinch.distance === 0) return;
      const next = Math.max(1, Math.min(2.5, pinch.zoom * distance(e) / pinch.distance));
      const previous = zoomRef.current;
      const bounds = clip.getBoundingClientRect();
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - bounds.left;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - bounds.top;
      zoomRef.current = next;
      grid.style.setProperty("--mobile-zoom", String(next));
      clip.scrollLeft = (clip.scrollLeft + centerX) * next / previous - centerX;
      clip.scrollTop = (clip.scrollTop + centerY) * next / previous - centerY;
      setZoom(next);
    };
    const end = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
      // Suppress the click synthesized after a two-finger gesture.
      if (e.touches.length === 0 && pinched) {
        pinched = false;
        clip.dataset.pinched = "true";
        window.setTimeout(() => { delete clip.dataset.pinched; }, 350);
      }
    };
    const preventGesture = (e: Event) => e.preventDefault();
    clip.addEventListener("touchstart", start, { passive: true });
    clip.addEventListener("touchmove", move, { passive: false });
    clip.addEventListener("touchend", end);
    clip.addEventListener("touchcancel", end);
    clip.addEventListener("gesturestart", preventGesture, { passive: false });
    clip.addEventListener("gesturechange", preventGesture, { passive: false });
    return () => {
      clip.removeEventListener("touchstart", start);
      clip.removeEventListener("touchmove", move);
      clip.removeEventListener("touchend", end);
      clip.removeEventListener("touchcancel", end);
      clip.removeEventListener("gesturestart", preventGesture);
      clip.removeEventListener("gesturechange", preventGesture);
    };
  }, []);

  const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return (
    <div ref={rootRef} className="mobile-month" style={availableHeight ? { height: availableHeight } : undefined}>
      <div className="mobile-month-hint">
        <span>{t("calendar.mobileFullMonth", "Il mese completo, senza scorrere")}</span>
        <span>{t("calendar.mobilePinchHint", "Ingrandisci con due dita")} ↗</span>
      </div>
      <div className="mobile-month-weekdays">
        <span />
        {weekdays.map((day, index) =>
          <span key={day} className={index >= 5 ? "weekend" : ""}>{t(`calendar.weekDays.${day}`).slice(0, 3)}</span>
        )}
      </div>
      <div ref={clipRef} className="mobile-month-clip">
        <div ref={gridRef} className="mobile-month-grid" style={{ "--mobile-weeks": weeks.length } as React.CSSProperties}>
          {weeks.flatMap((week, weekIndex) => [
            <span key={`week-${weekIndex}`} className="mobile-month-week-number">{getISOWeek(week[0])}</span>,
            ...week.map((date, dayIndex) => {
              const appointments = date.getMonth() === month.getMonth() ? getAppointments(date) : [];
              const inMonth = date.getMonth() === month.getMonth();
              const isToday = dateKey(date) === dateKey(new Date());
              return (
                <button
                  key={dateKey(date)}
                  type="button"
                  className={`mobile-month-day ${!inMonth ? "outside" : ""} ${dayIndex >= 5 ? "weekend" : ""}`}
                  aria-label={`${date.toLocaleDateString(i18n.language, { day: "numeric", month: "long" })}, ${appointments.length} ${t("calendar.appointments", "appuntamenti")}; ${t("calendar.goToDay", "Vai al giorno")}`}
                  onClick={e => { if (!clipRef.current?.dataset.pinched) onDateSelect(date); }}
                >
                  <span className={`mobile-month-date ${isToday ? "today" : ""}`}>{date.getDate()}</span>
                  {isLoading && inMonth ? <span className="mobile-month-loading" /> : appointments.slice(0, 3).map(apt => {
                    const imported = getColors(apt);
                    const color = imported ? imported.band : getEventColor(apt);
                    const google = apt.importedFromGoogle || apt.isImported || apt.client?.firstName?.startsWith("📅");
                    const label = google
                      ? (apt.googleEventTitle ?? apt.notes ?? apt.service?.name ?? "Google")
                      : `${apt.client?.firstName ?? ""} ${(apt.client?.lastName ?? "").charAt(0)}.`;
                    return <span
                      key={apt.id}
                      className="mobile-month-event"
                      style={{
                        background: imported ? imported.bgSolid : color,
                        color: imported && !imported.isServiceMatch ? "#334155" : "#fff",
                        borderLeft: imported && !imported.isServiceMatch ? `3px solid ${color}` : undefined,
                      }}
                      title={`${apt.startTime?.substring(0, 5) ?? ""} ${label}`}
                    >{label}</span>;
                  })}
                  {appointments.length > 3 && <span className="mobile-month-more">+{appointments.length - 3} {t("calendar.moreEvents", "altri")}</span>}
                </button>
              );
            }),
          ])}
        </div>
      </div>
      {zoom > 1.02 && <button type="button" className="mobile-month-reset" onClick={resetZoom}>
        <Maximize2 size={13} /> {t("calendar.mobileResetZoom", "Mese intero")}
      </button>}
      {showNewAppointmentAction && <button type="button" className="mobile-month-add" aria-label={t("calendar.selectNewAppointment", "Nuovo appuntamento")} onClick={onNewAppointment}>
        <Plus size={25} />
      </button>}
    </div>
  );
}