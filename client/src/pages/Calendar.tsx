// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, ChevronRight, CalendarDays, Search, Clock,
  Calendar as CalendarIcon, LayoutGrid, Globe, Filter, LayoutDashboard, X,
  AlertTriangle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { formatMonthYear, formatDateForApi, getBrowserLocale, getWeekStart, getWeekEnd } from "@/lib/utils/date";
import { getISOWeek } from "date-fns";
import DayViewWithTimeSlots from "@/components/DayViewWithTimeSlots";
import WeekView from "@/components/WeekView";
import MonthView from "@/components/MonthView";
import AppointmentForm from "@/components/AppointmentForm";
import { SyncGoogleButton } from "@/components/SyncGoogleButton";

const STORAGE_KEY_MODE = 'calendar-mode-v1';

const STAFF_PALETTE = ['#4a7c59','#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#f97316','#ec4899'];
const getStaffColor = (id: number) => STAFF_PALETTE[Math.abs(id) % STAFF_PALETTE.length];

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [searchQuery, setSearchQuery] = useState("");
  const [timezoneInfo, setTimezoneInfo] = useState<{
    timezone: string; offset: number; name: string;
  } | null>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleNeedsReauth, setGoogleNeedsReauth] = useState(false);
  const [googleNotConnected, setGoogleNotConnected] = useState(false);
  const [googleStatusChecked, setGoogleStatusChecked] = useState(false);

  // ── Modalità calendario ────────────────────────────────────────────────────
  const [calendarMode, setCalendarMode] = useState<'global'|'filter'|'columns'>(() => {
    const s = localStorage.getItem(STORAGE_KEY_MODE);
    return (s === 'global' || s === 'filter' || s === 'columns') ? s : 'global';
  });
  const [activeFilter, setActiveFilter] = useState<{ type: 'staff'|'room'; id: number } | null>(null);

  const updateCalendarMode = (mode: 'global'|'filter'|'columns') => {
    setCalendarMode(mode);
    localStorage.setItem(STORAGE_KEY_MODE, mode);
    if (mode !== 'filter') setActiveFilter(null);
  };

  const handleFilterChip = (type: 'staff'|'room', id: number) => {
    setActiveFilter(prev => (prev?.type === type && prev?.id === id) ? null : { type, id });
  };

  // ── Auto-sync silenzioso all'apertura del calendario ─────────────────────────
  // Allinea gli appuntamenti con Google Calendar senza mostrare errori all'utente.
  // Errori OAuth (token scaduto, ecc.) vengono gestiti silenziosamente.
  useEffect(() => {
    let cancelled = false;
    const autoSync = async () => {
      try {
        const statusRes = await fetch('/api/google-auth/status', { credentials: 'include' });
        if (!statusRes.ok || cancelled) return;
        const status = await statusRes.json();
        if (!cancelled) setGoogleStatusChecked(true);
        const disabledByUser = Boolean(status.disabledByUser);
        if (status.needsReauth && !disabledByUser) {
          if (!cancelled) {
            setGoogleNeedsReauth(true);
            setGoogleNotConnected(false);
            setGoogleEnabled(false);
          }
          return;
        }
        if (cancelled) {
          return;
        }
        if (disabledByUser) {
          setGoogleNeedsReauth(false);
          setGoogleNotConnected(true);
          setGoogleEnabled(false);
          return;
        }
        if (!status.authorized || !status.calendarEnabled) {
          if (!cancelled) {
            setGoogleNeedsReauth(false);
            setGoogleNotConnected(true);
            setGoogleEnabled(false);
          }
          return;
        }
        if (!cancelled) setGoogleNeedsReauth(false);
        if (!cancelled) setGoogleNotConnected(false);
        if (!cancelled) setGoogleEnabled(true);
        if (!cancelled) setIsAutoSyncing(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 130_000);
        try {
          const syncResponse = await fetch('/api/google-calendar/sync-now', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forceFullSync: false }),
            credentials: 'include',
            signal: controller.signal,
          });
          const syncData = await syncResponse.json().catch(() => null);
          if (syncData?.needsReauth && !cancelled) {
            setGoogleNeedsReauth(true);
            setGoogleEnabled(false);
            return;
          }
          // Aggiorna gli appuntamenti silenziosamente dopo la sync
          if (syncResponse.ok && syncData?.success && !cancelled) {
            queryClient.invalidateQueries({ queryKey: ["/api/appointments"], refetchType: 'all' });
          }
        } catch {
          // Errori silenziosi — non mostrano toast all'utente
        } finally {
          clearTimeout(timeoutId);
          if (!cancelled) setIsAutoSyncing(false);
        }
      } catch {
        if (!cancelled) setIsAutoSyncing(false);
      }
    };
    autoSync();
    return () => { cancelled = true; };
  }, [queryClient]);

  // Keep the warning current even when a background/webhook sync detects a
  // broken OAuth connection after the calendar page has already loaded.
  useEffect(() => {
    let cancelled = false;

    const refreshGoogleConnectionStatus = async () => {
      try {
        const response = await fetch('/api/google-auth/status', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!response.ok || cancelled) return;
        const status = await response.json();
        setGoogleStatusChecked(true);
        const reauthRequired = Boolean(status.needsReauth && !status.disabledByUser);
        const notConnected = Boolean(
          !reauthRequired &&
          (status.disabledByUser || !status.authorized || !status.calendarEnabled)
        );
        setGoogleNeedsReauth(reauthRequired);
        setGoogleNotConnected(notConnected);
        if (reauthRequired || notConnected) setGoogleEnabled(false);
      } catch {
        // A network failure is not proof that OAuth is broken.
      }
    };

    const handleReauthRequired = () => {
      if (!cancelled) {
        setGoogleNeedsReauth(true);
        setGoogleNotConnected(false);
        setGoogleEnabled(false);
      }
    };

    window.addEventListener('google-calendar-reauth-required', handleReauthRequired);
    const intervalId = window.setInterval(refreshGoogleConnectionStatus, 6 * 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('google-calendar-reauth-required', handleReauthRequired);
    };
  }, []);

  // ── Auto-refresh silenzioso ogni 60s quando Google Calendar è attivo ────────
  // Dopo che il webhook riceve una notifica da Google e importa nuovi eventi,
  // il frontend si aggiorna automaticamente entro max 60 secondi senza intervento utente.
  useEffect(() => {
    if (!googleEnabled) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'], refetchType: 'active' });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = String(query.queryKey[0]);
          return key.startsWith('/api/appointments/date/') || key.startsWith('/api/appointments/range');
        },
        refetchType: 'active',
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [googleEnabled, queryClient]);

  // Fuso orario
  useEffect(() => {
    fetch('/api/timezone-settings').then(r => r.ok ? r.json() : null).then(d => d && setTimezoneInfo(d)).catch(() => {});
  }, []);

  // Orologio
  useEffect(() => {
    const upd = () => { if (clockRef.current) clockRef.current.textContent = new Date().toLocaleTimeString(); };
    upd();
    const t = setInterval(upd, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: allAppointments = [], refetch: refetchAppointments } = useQuery<any>({ queryKey: ['/api/appointments'] });
  const { data: dayAppointments = [], isLoading: isLoadingAppointments, refetch: refetchDayAppointments } = useQuery<any>({
    queryKey: [`/api/appointments/date/${formatDateForApi(selectedDate)}`],
    enabled: view === "day",
    refetchOnWindowFocus: true, refetchOnMount: true, staleTime: 0,
  });
  const { data: services = [], isLoading: isLoadingServices } = useQuery<any>({ queryKey: ['/api/services'] });
  const { data: collaborators = [] } = useQuery<any[]>({ queryKey: ['/api/collaborators'] });
  const { data: treatmentRooms = [] } = useQuery<any[]>({ queryKey: ['/api/treatment-rooms'] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ['/api/clients'] });

  // ── Ricerca ────────────────────────────────────────────────────────────────
  const filteredAppointments = searchQuery && Array.isArray(allAppointments)
    ? allAppointments.filter((a: any) => {
        const name = `${a.client?.firstName||''} ${a.client?.lastName||''}`.toLowerCase();
        const svc = a.service?.name?.toLowerCase() || '';
        const q = searchQuery.toLowerCase();
        return name.includes(q) || svc.includes(q) || (a.date||'').includes(q);
      })
    : [];

  // ── Navigazione ────────────────────────────────────────────────────────────
  const goToToday = useCallback(() => setSelectedDate(new Date()), []);
  const goToPrevious = useCallback(() => {
    setSelectedDate(prev => {
      const d = new Date(prev); 
      if (view==='day') d.setDate(d.getDate()-1);
      else if (view==='week') d.setDate(d.getDate()-7);
      else d.setMonth(d.getMonth()-1);
      return d;
    });
  }, [view]);
  const goToNext = useCallback(() => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      if (view==='day') d.setDate(d.getDate()+1);
      else if (view==='week') d.setDate(d.getDate()+7);
      else d.setMonth(d.getMonth()+1);
      return d;
    });
  }, [view]);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const handleRefresh = () => {
    refetchAppointments();
    if (view === "day") {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${formatDateForApi(selectedDate)}`] });
      refetchDayAppointments();
    } else if (view === "week") {
      for (let i = 0; i < 7; i++) {
        const d = new Date(selectedDate); d.setDate(d.getDate()+i);
        queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${formatDateForApi(d)}`] });
      }
    }
    queryClient.invalidateQueries({
      predicate: (query) => String(query.queryKey[0]).startsWith('/api/appointments/range'),
    });
  };

  const handleAppointmentSaved = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    const ds = formatDateForApi(selectedDate);
    await queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${ds}`] });
    for (let i = -3; i <= 3; i++) {
      const d = new Date(selectedDate); d.setDate(d.getDate()+i);
      await queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${formatDateForApi(d)}`] });
    }
    // Invalida le query range usate da WeekView e MonthView
    await queryClient.invalidateQueries({
      predicate: (query) => String(query.queryKey[0]).startsWith('/api/appointments/range'),
    });
    await new Promise(r => setTimeout(r, 100));
    await queryClient.refetchQueries({ queryKey: ['/api/appointments'], type: 'active' });
    if (view==='day') await queryClient.refetchQueries({ queryKey: [`/api/appointments/date/${ds}`], type: 'active' });
    await refetchAppointments();
    if (view==='day') await refetchDayAppointments();
  };

  // ── Chip chips colore collaboratore ───────────────────────────────────────
  const activeCollaborators = (collaborators as any[]).filter(c => c.isActive !== false);
  const hasCollaboratorsOrRooms = activeCollaborators.length > 0 || (treatmentRooms as any[]).length > 0;
  const columnModeAvailable = calendarMode === 'columns' && view === 'day' && activeCollaborators.length > 0;

  return (
    <div className="space-y-6">
      {(googleNeedsReauth || googleNotConnected) && (
        <Alert
          variant="destructive"
          className={
            googleNeedsReauth
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }
        >
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>
            {googleNeedsReauth
              ? t('calendar.googleConnectionLostTitle', 'Connessione Google Calendar interrotta')
              : t('googleCalendar.setup.reconnectNeeded', 'Google Calendar non attivo')}
          </AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p>
              {googleNeedsReauth
                ? t(
                    'calendar.googleConnectionLostDescription',
                    'Ricollega il tuo account Google per riprendere la sincronizzazione bidirezionale.'
                  )
                : t(
                    'googleCalendar.setup.reconnectDesc',
                    'Ricollega il tuo account Google per riattivare la sincronizzazione.'
                  )}
            </p>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="shrink-0"
              onClick={() => { window.location.href = '/google-calendar'; }}
            >
              {t('googleCalendar.setup.reconnectButton', 'Riconnetti Google')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        
        {/* Riga 1: data + ricerca */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-primary min-w-[200px]">
              {view === "month"
                ? formatMonthYear(selectedDate, i18n.language)
                : view === "week"
                  ? (() => {
                      const ws = getWeekStart(selectedDate);
                      const we = getWeekEnd(selectedDate);
                      const wn = getISOWeek(selectedDate);
                      const p = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                      const pe = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                      return `Sett. ${wn} · ${p(ws)} – ${pe(we)}`;
                    })()
                  : `${selectedDate.getDate()} ${selectedDate.toLocaleDateString(getBrowserLocale(i18n.language), { month: 'long', year: 'numeric' })}`
              }
            </h2>
            <div className="flex space-x-1 ml-2">
              <Button variant="outline" size="icon" onClick={goToPrevious} className="rounded-full">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext} className="rounded-full">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday} className="ml-4">
              {t('calendar.today')}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
              <Input
                type="text"
                placeholder={`${t('common.search')} ${t('calendar.title').toLowerCase()}...`}
                className="pl-10 w-full md:w-[250px]"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Riga 2: fuso orario */}
        <div className="mt-2 flex items-center justify-center px-3 py-1.5 bg-green-50 border border-green-200 rounded-md shadow-sm">
          <Globe className="h-4 w-4 text-primary mr-2" />
          <span className="text-sm font-medium flex items-center">
            <span ref={clockRef} className="text-green-700 font-mono" />
            <span className="mx-1 text-gray-400">|</span>
            <span className="text-gray-700">
              {timezoneInfo?.name || 'UTC'}
              {timezoneInfo?.offset !== undefined && (
                <span className="text-gray-500 ml-1">
                  (UTC{timezoneInfo.offset > 0 ? '+' : ''}{timezoneInfo.offset})
                </span>
              )}
            </span>
          </span>
        </div>

        {/* Riga 3: bottoni vista + modalità + sync */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Vista giorno/settimana/mese */}
          <div className="flex flex-wrap rounded-md overflow-hidden shadow-sm border w-full sm:w-auto">
            <Button
              variant={view==="day" ? "default" : "ghost"} size="sm"
              onClick={() => setView("day")}
              className={`rounded-none px-3 sm:px-4 flex-1 sm:flex-initial ${view==="day" ? "bg-primary text-white" : ""}`}
            >
              <Clock className="h-4 w-4 mr-1 sm:mr-2" />{t('calendar.daily')}
            </Button>
            <Button
              variant={view==="week" ? "default" : "ghost"} size="sm"
              onClick={() => setView("week")}
              className={`rounded-none px-3 sm:px-4 flex-1 sm:flex-initial ${view==="week" ? "bg-primary text-white" : ""}`}
            >
              <CalendarDays className="h-4 w-4 mr-1 sm:mr-2" />{t('calendar.weekly')}
            </Button>
            <Button
              variant={view==="month" ? "default" : "ghost"} size="sm"
              onClick={() => setView("month")}
              className={`rounded-none px-3 sm:px-4 flex-1 sm:flex-initial ${view==="month" ? "bg-primary text-white" : ""}`}
            >
              <LayoutGrid className="h-4 w-4 mr-1 sm:mr-2" />{t('calendar.monthly')}
            </Button>
          </div>

          {/* Modalità calendario */}
          <div className="flex rounded-md overflow-hidden shadow-sm border w-full sm:w-auto shrink-0">
            <Button
              variant={calendarMode==='global' ? "default" : "ghost"} size="sm"
              onClick={() => updateCalendarMode('global')}
              className={`rounded-none px-3 flex-1 sm:flex-initial gap-1.5 ${calendarMode==='global' ? 'bg-primary text-white' : ''}`}
              title={t('calendar.modeGlobal')}
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{t('calendar.modeGlobal')}</span>
            </Button>
            <Button
              variant={calendarMode==='filter' ? "default" : "ghost"} size="sm"
              onClick={() => updateCalendarMode('filter')}
              className={`rounded-none px-3 flex-1 sm:flex-initial gap-1.5 ${calendarMode==='filter' ? 'bg-primary text-white' : ''}`}
              title={t('calendar.modeFilter')}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">{t('calendar.modeFilter')}</span>
            </Button>
            <Button
              variant={calendarMode==='columns' ? "default" : "ghost"} size="sm"
              onClick={() => updateCalendarMode('columns')}
              className={`rounded-none px-3 flex-1 sm:flex-initial gap-1.5 ${calendarMode==='columns' ? 'bg-primary text-white' : ''}`}
              title={t('calendar.modeColumns')}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">{t('calendar.modeColumns')}</span>
            </Button>
          </div>

          {/* Google sync + data */}
          <div className="w-full sm:w-auto flex gap-2 items-center">
            {googleStatusChecked && (
              googleEnabled && !googleNeedsReauth && !googleNotConnected ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('googleCalendar.setup.syncEnabled', 'Sincronizzazione attiva')}
                  </span>
                  <SyncGoogleButton size="sm" variant="outline" showLabel={true} isExternalLoading={isAutoSyncing} />
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  {t('googleCalendar.setup.syncDisabled', 'Sincronizzazione disattivata')}
                </span>
              )
            )}
            <div className="text-sm text-gray-500 hidden sm:block text-right">
              {view==="day" ? (
                <div className="text-green-600 font-semibold">
                  {selectedDate.toLocaleDateString(getBrowserLocale(i18n.language), {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </div>
              ) : (
                <>
                  {view==="week" && t('calendar.weekView')}
                  {view==="month" && t('calendar.monthView')}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Riga 4: chip filtro (solo se modalità = filter) */}
        {calendarMode === 'filter' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {!hasCollaboratorsOrRooms ? (
              <p className="text-sm text-muted-foreground text-center py-1">
                {t('calendar.noCollaboratorsForFilter', 'Add collaborators or rooms in settings to use the filter.')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 items-center">
                {/* Chip "Tutti" */}
                <button
                  onClick={() => setActiveFilter(null)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    !activeFilter
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
                  }`}
                >
                  {t('calendar.filterAll', 'Tutti')}
                </button>

                {/* Collaboratori */}
                {activeCollaborators.map((c: any) => {
                  const isActive = activeFilter?.type === 'staff' && activeFilter?.id === c.id;
                  const color = getStaffColor(c.id);
                  return (
                    <button
                      key={`staff-${c.id}`}
                      onClick={() => handleFilterChip('staff', c.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                        isActive
                          ? 'text-white border-transparent'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
                      }`}
                      style={isActive ? { backgroundColor: color, borderColor: color } : {}}
                    >
                      <span
                        className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : color }}
                      >
                        {`${c.firstName?.[0]??''}${c.lastName?.[0]??''}`.toUpperCase()}
                      </span>
                      {c.firstName} {c.lastName}
                    </button>
                  );
                })}

                {/* Stanze */}
                {(treatmentRooms as any[]).map((r: any) => {
                  const isActive = activeFilter?.type === 'room' && activeFilter?.id === r.id;
                  return (
                    <button
                      key={`room-${r.id}`}
                      onClick={() => handleFilterChip('room', r.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                        isActive
                          ? 'text-white border-transparent'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
                      }`}
                      style={isActive ? { backgroundColor: r.color||'#3f51b5', borderColor: r.color||'#3f51b5' } : {}}
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: r.color || '#3f51b5' }}
                      />
                      {r.name}
                    </button>
                  );
                })}

                {/* Mostra il filtro attivo */}
                {activeFilter && (
                  <button
                    onClick={() => setActiveFilter(null)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 ml-1"
                  >
                    <X className="h-3 w-3" />
                    {t('common.reset', 'Reset')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Avviso vista colonne in week/month */}
        {calendarMode === 'columns' && view !== 'day' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-amber-600 text-center py-1 bg-amber-50 rounded-md px-3">
              {t('calendar.columnsOnlyInDayView', 'Column view is only available in Day view.')}
            </p>
          </div>
        )}

        {/* Avviso colonne senza collaboratori */}
        {calendarMode === 'columns' && view === 'day' && activeCollaborators.length === 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-muted-foreground text-center py-1">
              {t('calendar.noCollaboratorsForColumns', 'Add collaborators in settings to use the column view.')}
            </p>
          </div>
        )}
      </div>

      {/* ── Risultati ricerca ──────────────────────────────────────────────── */}
      {searchQuery && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-lg font-medium mb-4">{t('calendar.searchResults')}: {filteredAppointments.length}</h3>
          {filteredAppointments.length === 0 ? (
            <p className="text-gray-500">{t('calendar.noAppointmentsFound')} "{searchQuery}"</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {filteredAppointments.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3 border rounded-md flex justify-between hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedDate(new Date(a.date));
                    setView("day"); setSearchQuery("");
                  }}
                >
                  <div>
                    <div className="font-medium">{a.client?.firstName||''} {a.client?.lastName||''}</div>
                    <div className="text-sm text-gray-600">
                      {a.service?.name||''} — {new Date(a.date).toLocaleDateString(i18n.language)} {a.startTime?.substring(0,5)||''}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={e => {
                    e.stopPropagation();
                    setSelectedDate(new Date(a.date)); setView("day"); setSearchQuery("");
                  }}>
                    {t('calendar.goToDay')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Viste calendario ───────────────────────────────────────────────── */}
      {!searchQuery && (
        <>
          {view === "day" && (
            <DayViewWithTimeSlots
              selectedDate={selectedDate}
              isLoading={isLoadingAppointments || isLoadingServices}
              appointments={dayAppointments as any[]}
              services={services as any[]}
              collaborators={collaborators as any[]}
              treatmentRooms={treatmentRooms as any[]}
              calendarMode={calendarMode}
              activeFilter={activeFilter}
              onAppointmentUpdated={handleAppointmentSaved}
              onAppointmentDeleted={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
                queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${formatDateForApi(selectedDate)}`] });
                handleAppointmentSaved();
              }}
            />
          )}

          {view === "week" && (
            <WeekView
              selectedDate={selectedDate}
              services={services as any[]}
              collaborators={collaborators as any[]}
              treatmentRooms={treatmentRooms as any[]}
              activeFilter={calendarMode === 'filter' ? activeFilter : null}
              onRefresh={handleRefresh}
            />
          )}

          {view === "month" && (
            <MonthView
              selectedDate={selectedDate}
              services={services as any[]}
              collaborators={collaborators as any[]}
              treatmentRooms={treatmentRooms as any[]}
              activeFilter={calendarMode === 'filter' ? activeFilter : null}
              onRefresh={handleRefresh}
              onDateSelect={date => { setSelectedDate(date); setView("day"); }}
            />
          )}
        </>
      )}
    </div>
  );
}
