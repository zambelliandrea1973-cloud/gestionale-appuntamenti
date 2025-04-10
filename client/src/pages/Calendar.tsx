import { useState, useEffect } from "react";
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
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { 
  formatMonthYear, 
  formatDateForApi
} from "@/lib/utils/date";
import DayView from "@/components/DayView";
import DayViewWithMiniSlots from "@/components/DayViewWithMiniSlots";
import WeekView from "@/components/WeekView";
import MonthView from "@/components/MonthView";
import AppointmentForm from "@/components/AppointmentForm";

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [searchQuery, setSearchQuery] = useState("");
  
  // For search functionality
  const { data: appointments = [], refetch: refetchAppointments } = useQuery({
    queryKey: ['/api/appointments'],
  });
  
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
  });
  
  // Importiamo il queryClient per le invalidazioni
  const queryClient = useQueryClient();
  
  // Filter appointments based on search query
  const filteredAppointments = searchQuery
    ? appointments.filter(appointment => {
        const clientName = `${appointment.client.firstName} ${appointment.client.lastName}`.toLowerCase();
        const serviceName = appointment.service.name.toLowerCase();
        const dateStr = appointment.date;
        const query = searchQuery.toLowerCase();
        
        return clientName.includes(query) || 
               serviceName.includes(query) || 
               dateStr.includes(query);
      })
    : [];
  
  // Navigate to today
  const goToToday = () => {
    setSelectedDate(new Date());
  };
  
  // Navigate to previous period (day, week, month)
  const goToPrevious = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      
      if (view === "day") {
        newDate.setDate(newDate.getDate() - 1);
      } else if (view === "week") {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setMonth(newDate.getMonth() - 1);
      }
      
      return newDate;
    });
  };
  
  // Navigate to next period (day, week, month)
  const goToNext = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      
      if (view === "day") {
        newDate.setDate(newDate.getDate() + 1);
      } else if (view === "week") {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      
      return newDate;
    });
  };
  
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
  
  return (
    <div className="space-y-6">
      {/* Header with navigation and controls */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-primary">
              {view === "month" 
                ? formatMonthYear(selectedDate) 
                : selectedDate.toLocaleDateString('it-IT', { 
                    month: 'long', 
                    year: 'numeric' 
                  })
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
              className="ml-2"
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
        
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Bottoni di visualizzazione - modificati per essere responsivi su dispositivi mobili */}
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
          
          <div className="text-sm text-gray-500 w-full sm:w-auto text-center sm:text-right">
            {view === "day" && `${selectedDate.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}`}
            {view === "week" && t('calendar.weekView')}
            {view === "month" && t('calendar.monthView')}
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
              {filteredAppointments.map(appointment => (
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
                      {appointment.client.firstName} {appointment.client.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {appointment.service.name} - {new Date(appointment.date).toLocaleDateString(i18n.language)} {appointment.startTime.substring(0, 5)}
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
            <DayViewWithMiniSlots 
              selectedDate={selectedDate}
              onRefresh={handleRefresh}
            />
          )}
          
          {view === "week" && (
            <WeekView
              selectedDate={selectedDate}
              onRefresh={handleRefresh}
            />
          )}
          
          {view === "month" && (
            <MonthView
              selectedDate={selectedDate}
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
