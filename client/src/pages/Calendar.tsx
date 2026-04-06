// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Search,
  Clock,
  Calendar as CalendarIcon,
  LayoutGrid,
  Plus,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { 
  formatMonthYear, 
  formatDateForApi,
  getBrowserLocale
} from "@/lib/utils/date";
import DayViewWithTimeSlots from "@/components/DayViewWithTimeSlots";
import WeekView from "@/components/WeekView";
import MonthView from "@/components/MonthView";
import AppointmentForm from "@/components/AppointmentForm";
import { SyncGoogleButton } from "@/components/SyncGoogleButton";

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [searchQuery, setSearchQuery] = useState("");
  const [timezoneInfo, setTimezoneInfo] = useState<{
    timezone: string;
    offset: number;
    name: string;
  } | null>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  
  // 🔄 AUTO-SYNC: Sincronizzazione automatica OGNI volta che si apre la pagina calendario
  useEffect(() => {
    let cancelled = false;
    
    const autoSync = async () => {
      console.log('🔄 [AUTO-SYNC] Pagina calendario aperta, avvio sincronizzazione...');
      try {
        // Verifica se Google Calendar è abilitato
        const statusRes = await fetch('/api/google-auth/status', { credentials: 'include' });
        if (!statusRes.ok || cancelled) {
          console.log('🔄 [AUTO-SYNC] Status check fallito o cancellato');
          return;
        }
        
        const status = await statusRes.json();
        console.log('🔄 [AUTO-SYNC] Status:', status);
        if (!status.authorized || !status.calendarEnabled || cancelled) {
          console.log('🔄 [AUTO-SYNC] Google Calendar non autorizzato o non abilitato');
          return;
        }
        
        console.log('🔄 [AUTO-SYNC] Esecuzione sincronizzazione...');
        // Esegui la sincronizzazione direttamente (stesso endpoint del pulsante)
        const syncRes = await fetch('/api/google-calendar/sync-now', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (syncRes.ok && !cancelled) {
          console.log('🔄 [AUTO-SYNC] Sincronizzazione completata con successo!');
          // Aggiorna la cache degli appuntamenti
          queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
        } else {
          console.log('🔄 [AUTO-SYNC] Sincronizzazione fallita:', syncRes.status);
        }
      } catch (e) {
        console.log('🔄 [AUTO-SYNC] Errore:', e);
      }
    };
    
    // Esegui subito dopo il mount
    autoSync();
    
    // Cleanup se il componente viene smontato prima del completamento
    return () => { cancelled = true; };
  }, [queryClient]);
  
  // Recupera le informazioni sul fuso orario
  useEffect(() => {
    const fetchTimezoneInfo = async () => {
      try {
        const response = await fetch('/api/timezone-settings');
        if (response.ok) {
          const data = await response.json();
          setTimezoneInfo(data);
        }
      } catch (error) {
        console.error('Errore nel recupero delle informazioni sul fuso orario:', error);
      }
    };
    
    fetchTimezoneInfo();
  }, []);
  
  useEffect(() => {
    const updateClock = () => {
      if (clockRef.current) {
        clockRef.current.textContent = new Date().toLocaleTimeString();
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Per la ricerca di tutti gli appuntamenti
  const { data: allAppointments = [], refetch: refetchAppointments } = useQuery<any>({
    queryKey: ['/api/appointments'],
  });
  
  // Per la vista giornaliera - appuntamenti di un giorno specifico
  const { data: dayAppointments = [], isLoading: isLoadingAppointments, refetch: refetchDayAppointments } = useQuery<any>({
    queryKey: [`/api/appointments/date/${formatDateForApi(selectedDate)}`],
    enabled: view === "day",
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Forza sempre il refetch per i dati più aggiornati
  });
  
  // Servizi per colorare gli appuntamenti
  const { data: services = [], isLoading: isLoadingServices } = useQuery<any>({
    queryKey: ['/api/services'],
  });

  // Collaboratori per mostrare i nomi negli appuntamenti
  const { data: collaborators = [] } = useQuery<any[]>({
    queryKey: ['/api/collaborators'],
  });

  // Stanze per mostrare i colori negli appuntamenti
  const { data: treatmentRooms = [] } = useQuery<any[]>({
    queryKey: ['/api/treatment-rooms'],
  });
  
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
  });
  
  // Filter appointments based on search query
  const filteredAppointments = searchQuery && Array.isArray(allAppointments)
    ? allAppointments.filter((appointment: any) => {
        const clientName = `${appointment.client?.firstName || ''} ${appointment.client?.lastName || ''}`.toLowerCase();
        const serviceName = appointment.service?.name?.toLowerCase() || '';
        const dateStr = appointment.date || '';
        const query = searchQuery.toLowerCase();
        
        return clientName.includes(query) || 
               serviceName.includes(query) || 
               dateStr.includes(query);
      })
    : [];
  
  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);
  
  const goToPrevious = useCallback(() => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate.getTime());
      if (view === "day") {
        newDate.setDate(newDate.getDate() - 1);
      } else if (view === "week") {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setMonth(newDate.getMonth() - 1);
      }
      return newDate;
    });
  }, [view]);
  
  const goToNext = useCallback(() => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate.getTime());
      if (view === "day") {
        newDate.setDate(newDate.getDate() + 1);
      } else if (view === "week") {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  }, [view]);
  
  // Handle refresh of data
  const handleRefresh = () => {
    console.log("Refreshing calendar data...");
    // Refresh appointments list
    refetchAppointments();
    
    // Refresh also date-specific appointments for current view
    if (view === "day") {
      // Solo giorno corrente
      const dateString = formatDateForApi(selectedDate);
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${dateString}`] });
      refetchDayAppointments(); // Forza il refetch immediato
    } else if (view === "week") {
      // Intera settimana
      for (let i = 0; i < 7; i++) {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + i);
        const dateString = formatDateForApi(date);
        queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${dateString}`] });
      }
    }
    
    // Refresh also ranges
    queryClient.invalidateQueries({ queryKey: ['/api/appointments/range'] });
  };

  // Callback specifico per quando viene salvato un appuntamento
  const handleAppointmentSaved = async () => {
    console.log("Appuntamento salvato - aggiornamento calendario...");
    
    try {
      // Invalida tutto il cache degli appuntamenti
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Invalida specificamente la data corrente
      const dateString = formatDateForApi(selectedDate);
      await queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${dateString}`] });
      
      // Invalida tutte le date vicine per sicurezza
      for (let i = -3; i <= 3; i++) {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + i);
        const ds = formatDateForApi(date);
        await queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${ds}`] });
      }
      
      // Aspetta un momento per assicurarsi che le invalidazioni siano complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Forza il refetch di tutti i dati
      await queryClient.refetchQueries({ 
        queryKey: ['/api/appointments'],
        type: 'active'
      });
      
      if (view === "day") {
        await queryClient.refetchQueries({ 
          queryKey: [`/api/appointments/date/${dateString}`],
          type: 'active'
        });
      }
      
      // Trigger manuale del refetch delle funzioni hook
      await refetchAppointments();
      if (view === "day") {
        await refetchDayAppointments();
      }
      
      console.log("Calendario aggiornato dopo salvataggio appuntamento");
    } catch (error) {
      console.error("Errore durante l'aggiornamento del calendario:", error);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header with navigation and controls */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-primary min-w-[200px]">
              {view === "month" 
                ? `${selectedDate.getDate()} ${formatMonthYear(selectedDate, i18n.language)}`
                : `${selectedDate.getDate()} ${selectedDate.toLocaleDateString(getBrowserLocale(i18n.language), { 
                    month: 'long', 
                    year: 'numeric' 
                  })}`
              }
            </h2>
            <div className="flex space-x-1 ml-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={goToPrevious}
                className="rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={goToNext}
                className="rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToToday}
              className="ml-4"
            >
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
                placeholder={t('common.search') + " " + t('calendar.title').toLowerCase() + "..."}
                className="pl-10 w-full md:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Rimosso il pulsante "Nuovo Appuntamento" come richiesto */}
          </div>
        </div>
        
        {/* Indicatore del fuso orario */}
        <div className="mt-2 flex items-center justify-center px-3 py-1.5 bg-green-50 border border-green-200 rounded-md shadow-sm">
          <Globe className="h-4 w-4 text-primary mr-2" />
          <span className="text-sm font-medium flex items-center">
            <span ref={clockRef} className="text-green-700 font-mono"></span>
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

        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Bottoni di visualizzazione */}
          <div className="flex flex-wrap rounded-md overflow-hidden shadow-sm border w-full sm:w-auto">
            <Button
              variant={view === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("day")}
              className={`rounded-none px-3 sm:px-4 flex-1 sm:flex-initial ${view === "day" ? "bg-primary text-white" : ""}`}
            >
              <Clock className="h-4 w-4 mr-1 sm:mr-2" />
              {t('calendar.daily')}
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("week")}
              className={`rounded-none px-3 sm:px-4 flex-1 sm:flex-initial ${view === "week" ? "bg-primary text-white" : ""}`}
            >
              <CalendarDays className="h-4 w-4 mr-1 sm:mr-2" />
              {t('calendar.weekly')}
            </Button>
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
              className={`rounded-none px-3 sm:px-4 flex-1 sm:flex-initial ${view === "month" ? "bg-primary text-white" : ""}`}
            >
              <LayoutGrid className="h-4 w-4 mr-1 sm:mr-2" />
              {t('calendar.monthly')}
            </Button>
          </div>

          {/* Google Calendar Sync Button */}
          <div className="w-full sm:w-auto flex gap-2">
            <SyncGoogleButton size="sm" variant="outline" showLabel={true} />
          </div>
          
          <div className="text-sm text-gray-500 w-full sm:w-auto text-center sm:text-right">
            {/* Mostriamo la data attuale con numero e giorno in tutte le viste */}
            {view === "day" ? (
              <div className="text-green-600 font-semibold">
                {selectedDate.toLocaleDateString(getBrowserLocale(i18n.language), { 
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric' 
                })}
              </div>
            ) : (
              <>
                {view === "week" && t('calendar.weekView')}
                {view === "month" && t('calendar.monthView')}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Search results */}
      {searchQuery && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-lg font-medium mb-4">{t('calendar.searchResults')}: {filteredAppointments.length}</h3>
          
          {filteredAppointments.length === 0 ? (
            <p className="text-gray-500">{t('calendar.noAppointmentsFound')} "{searchQuery}"</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {filteredAppointments.map((appointment: any) => (
                <div 
                  key={appointment.id} 
                  className="p-3 border rounded-md flex justify-between hover:bg-gray-50"
                  onClick={() => {
                    // Convert to Date object and navigate to that day
                    const appointmentDate = new Date(appointment.date);
                    setSelectedDate(appointmentDate);
                    setView("day");
                    setSearchQuery("");
                  }}
                >
                  <div>
                    <div className="font-medium">
                      {appointment.client?.firstName || ''} {appointment.client?.lastName || ''}
                    </div>
                    <div className="text-sm text-gray-600">
                      {appointment.service?.name || ''} - {new Date(appointment.date).toLocaleDateString(i18n.language)} {appointment.startTime?.substring(0, 5) || ''}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const appointmentDate = new Date(appointment.date);
                      setSelectedDate(appointmentDate);
                      setView("day");
                      setSearchQuery("");
                    }}
                  >
                    {t('calendar.goToDay')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Calendar views */}
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
              onAppointmentUpdated={handleAppointmentSaved}
              onAppointmentDeleted={(id) => {
                // Invalidate queries after deletion
                queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
                queryClient.invalidateQueries({ 
                  queryKey: [`/api/appointments/date/${formatDateForApi(selectedDate)}`] 
                });
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
              onRefresh={handleRefresh}
            />
          )}
          
          {view === "month" && (
            <MonthView
              selectedDate={selectedDate}
              services={services as any[]}
              collaborators={collaborators as any[]}
              treatmentRooms={treatmentRooms as any[]}
              onRefresh={handleRefresh}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setView("day");
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
